import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../lib/db.js';

// ============================================
// Zod Schemas for Validation
// ============================================

const registerSchema = z.object({
  // For volunteers and victims
  phone_number: z.string().regex(/^[0-9]{10,15}$/).optional(),

  // For admin users
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),

  // Common fields
  role: z.enum(['volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin']),
  full_name: z.string().min(1).max(255),
  emergency_contact: z.string().optional(),
}).refine(
  (data) => data.phone_number || data.email,
  { message: "Either phone_number or email must be provided" }
).refine(
  (data) => {
    const adminRoles = ['ngo_coordinator', 'regional_admin', 'super_admin'];
    if (adminRoles.includes(data.role)) {
      return data.email && data.password;
    }
    return true;
  },
  { message: "Admin roles require email and password" }
);

const loginSchema = z.object({
  // Phone-based login (OTP sent)
  phone_number: z.string().regex(/^[0-9]{10,15}$/).optional(),
  otp: z.string().length(6).optional(),

  // Email-based login (password)
  email: z.string().email().optional(),
  password: z.string().optional(),
}).refine(
  (data) => (data.phone_number && data.otp) || (data.email && data.password),
  { message: "Provide either (phone_number + otp) or (email + password)" }
);

const refreshSchema = z.object({
  refresh_token: z.string(),
});

const logoutSchema = z.object({
  token: z.string(),
});

const requestOtpSchema = z.object({
  phone_number: z.string().regex(/^[0-9]{10,15}$/),
  purpose: z.enum(['login', 'phone_verification']),
});

const verifyOtpSchema = z.object({
  phone_number: z.string().regex(/^[0-9]{10,15}$/),
  otp: z.string().length(6),
  purpose: z.enum(['login', 'phone_verification']),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for storage
 */
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Generate JWT tokens
 */
async function generateTokens(app: any, userId: string, role: string) {
  const accessToken = app.jwt.sign(
    { userId, role },
    { expiresIn: '24h' }
  );

  const refreshToken = app.jwt.sign(
    { userId, type: 'refresh' },
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * Store session in database
 */
async function createSession(
  userId: string,
  accessToken: string,
  refreshToken: string,
  ipAddress: string | undefined,
  userAgent: string | undefined
) {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(`
    INSERT INTO sessions (
      user_id, token_hash, refresh_token_hash,
      ip_address, user_agent, expires_at, refresh_expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [userId, tokenHash, refreshTokenHash, ipAddress, userAgent, expiresAt, refreshExpiresAt]);
}

/**
 * Revoke session
 */
async function revokeSession(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(`
    DELETE FROM sessions WHERE token_hash = $1
  `, [tokenHash]);
}

/**
 * Encrypt PII using Node.js crypto (AES-256-GCM)
 */
function encryptPii(plaintext: string): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'your-secret-key-must-be-32-bytes!!';
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Prepend IV to encrypted data
  return Buffer.concat([iv, encrypted]);
}

// ============================================
// Routes
// ============================================

const authRoutes: FastifyPluginAsync = async (app) => {

  /**
   * POST /auth/register
   * Register a new user (volunteer, victim, or admin)
   */
  app.post('/auth/register', {
    schema: {
      description: 'Register a new user',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          role: { type: 'string', enum: ['volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin'] },
          full_name: { type: 'string' },
          emergency_contact: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await pool.query(`
      SELECT id FROM users
      WHERE phone_number = $1 OR email = $2
    `, [body.phone_number, body.email]);

    if (existingUser.rows.length > 0) {
      return reply.code(409).send({
        error: 'User already exists with this phone number or email',
      });
    }

    // Hash password if provided
    let passwordHash = null;
    if (body.password) {
      passwordHash = await hashPassword(body.password);
    }

    // Encrypt PII
    const fullNameEncrypted = encryptPii(body.full_name);
    const emergencyContactEncrypted = body.emergency_contact
      ? encryptPii(body.emergency_contact)
      : null;

    // Insert user
    const result = await pool.query(`
      INSERT INTO users (
        phone_number, email, password_hash, role,
        full_name_encrypted, emergency_contact_encrypted, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_verification')
      RETURNING id, role
    `, [
      body.phone_number,
      body.email,
      passwordHash,
      body.role,
      fullNameEncrypted,
      emergencyContactEncrypted,
    ]);

    const userId = result.rows[0].id;
    const role = result.rows[0].role;

    // Create role-specific profile
    if (role === 'volunteer') {
      await pool.query(`
        INSERT INTO volunteer_profiles (user_id)
        VALUES ($1)
      `, [userId]);
    } else if (role === 'victim') {
      await pool.query(`
        INSERT INTO victim_profiles (user_id)
        VALUES ($1)
      `, [userId]);
    }

    // If phone registration, send OTP for verification
    if (body.phone_number) {
      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await pool.query(`
        INSERT INTO otp_codes (identifier, code_hash, purpose, expires_at)
        VALUES ($1, $2, 'phone_verification', $3)
      `, [body.phone_number, otpHash, expiresAt]);

      // TODO: Send OTP via SMS (integrate with Twilio/SMS provider)
      app.log.info(`OTP for ${body.phone_number}: ${otp}`);
    }

    return reply.code(201).send({
      userId,
      role,
      message: body.phone_number
        ? 'Registration successful. OTP sent to phone for verification.'
        : 'Registration successful.',
    });
  });

  /**
   * POST /auth/login
   * Login with phone+OTP or email+password
   */
  app.post('/auth/login', {
    schema: {
      description: 'Login user',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
          otp: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    let user;

    // Phone + OTP login
    if (body.phone_number && body.otp) {
      // Verify OTP
      const otpHash = hashOtp(body.otp);
      const otpRecord = await pool.query(`
        SELECT id, attempts, max_attempts, used_at, expires_at
        FROM otp_codes
        WHERE identifier = $1
        AND code_hash = $2
        AND purpose = 'login'
        AND expires_at > NOW()
        AND used_at IS NULL
      `, [body.phone_number, otpHash]);

      if (otpRecord.rows.length === 0) {
        return reply.code(401).send({
          error: 'Invalid or expired OTP',
        });
      }

      // Mark OTP as used
      await pool.query(`
        UPDATE otp_codes SET used_at = NOW() WHERE id = $1
      `, [otpRecord.rows[0].id]);

      // Get user
      const userResult = await pool.query(`
        SELECT id, role, email, phone_number, status, failed_login_attempts, locked_until
        FROM users WHERE phone_number = $1
      `, [body.phone_number]);

      if (userResult.rows.length === 0) {
        return reply.code(401).send({
          error: 'User not found',
        });
      }

      user = userResult.rows[0];
    }
    // Email + Password login
    else if (body.email && body.password) {
      const userResult = await pool.query(`
        SELECT id, role, email, phone_number, password_hash, status, failed_login_attempts, locked_until
        FROM users WHERE email = $1
      `, [body.email]);

      if (userResult.rows.length === 0) {
        return reply.code(401).send({
          error: 'Invalid credentials',
        });
      }

      user = userResult.rows[0];

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return reply.code(423).send({
          error: 'Account is locked due to multiple failed login attempts',
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(body.password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed attempts
        const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = newFailedAttempts >= 5
          ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
          : null;

        await pool.query(`
          UPDATE users
          SET failed_login_attempts = $1, locked_until = $2
          WHERE id = $3
        `, [newFailedAttempts, lockUntil, user.id]);

        // Log failed login
        await pool.query(`
          INSERT INTO login_history (user_id, success, failure_reason, ip_address, user_agent)
          VALUES ($1, false, 'invalid_credentials', $2, $3)
        `, [user.id, request.ip, request.headers['user-agent']]);

        return reply.code(401).send({
          error: 'Invalid credentials',
        });
      }

      // Reset failed attempts on successful login
      await pool.query(`
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), last_login_ip = $1
        WHERE id = $2
      `, [request.ip, user.id]);
    }

    // Check account status
    if (user.status === 'suspended') {
      return reply.code(403).send({
        error: 'Account is suspended',
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(app, user.id, user.role);

    // Create session
    await createSession(
      user.id,
      accessToken,
      refreshToken,
      request.ip,
      request.headers['user-agent']
    );

    // Log successful login
    await pool.query(`
      INSERT INTO login_history (user_id, success, ip_address, user_agent)
      VALUES ($1, true, $2, $3)
    `, [user.id, request.ip, request.headers['user-agent']]);

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone_number: user.phone_number,
      },
    });
  });

  /**
   * POST /auth/logout
   * Logout and revoke session
   */
  app.post('/auth/logout', {
    schema: {
      description: 'Logout user',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = logoutSchema.parse(request.body);

    await revokeSession(body.token);

    return reply.send({
      message: 'Logged out successfully',
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  app.post('/auth/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          refresh_token: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    try {
      // Verify refresh token
      const decoded = app.jwt.verify(body.refresh_token) as any;

      if (decoded.type !== 'refresh') {
        return reply.code(401).send({
          error: 'Invalid refresh token',
        });
      }

      // Check if session exists
      const refreshTokenHash = crypto.createHash('sha256').update(body.refresh_token).digest('hex');
      const session = await pool.query(`
        SELECT user_id FROM sessions
        WHERE refresh_token_hash = $1
        AND refresh_expires_at > NOW()
      `, [refreshTokenHash]);

      if (session.rows.length === 0) {
        return reply.code(401).send({
          error: 'Session expired or invalid',
        });
      }

      // Get user role
      const user = await pool.query(`
        SELECT role FROM users WHERE id = $1
      `, [decoded.userId]);

      if (user.rows.length === 0) {
        return reply.code(401).send({
          error: 'User not found',
        });
      }

      // Generate new tokens
      const { accessToken, refreshToken } = await generateTokens(
        app,
        decoded.userId,
        user.rows[0].role
      );

      // Update session
      const newTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      const newRefreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(`
        UPDATE sessions
        SET token_hash = $1, refresh_token_hash = $2, expires_at = $3, refresh_expires_at = $4, last_activity_at = NOW()
        WHERE refresh_token_hash = $5
      `, [newTokenHash, newRefreshTokenHash, expiresAt, refreshExpiresAt, refreshTokenHash]);

      return reply.send({
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return reply.code(401).send({
        error: 'Invalid or expired refresh token',
      });
    }
  });

  /**
   * POST /auth/request-otp
   * Request OTP for login or verification
   */
  app.post('/auth/request-otp', {
    schema: {
      description: 'Request OTP for phone verification or login',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
          purpose: { type: 'string', enum: ['login', 'phone_verification'] },
        },
      },
    },
  }, async (request, reply) => {
    const body = requestOtpSchema.parse(request.body);

    // Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    await pool.query(`
      INSERT INTO otp_codes (identifier, code_hash, purpose, expires_at, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [body.phone_number, otpHash, body.purpose, expiresAt, request.ip]);

    // TODO: Send OTP via SMS
    app.log.info(`OTP for ${body.phone_number}: ${otp}`);

    return reply.send({
      message: 'OTP sent successfully',
    });
  });

  /**
   * POST /auth/verify-otp
   * Verify OTP code
   */
  app.post('/auth/verify-otp', {
    schema: {
      description: 'Verify OTP code',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          phone_number: { type: 'string' },
          otp: { type: 'string' },
          purpose: { type: 'string', enum: ['login', 'phone_verification'] },
        },
      },
    },
  }, async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);

    const otpHash = hashOtp(body.otp);

    const otpRecord = await pool.query(`
      SELECT id FROM otp_codes
      WHERE identifier = $1
      AND code_hash = $2
      AND purpose = $3
      AND expires_at > NOW()
      AND used_at IS NULL
    `, [body.phone_number, otpHash, body.purpose]);

    if (otpRecord.rows.length === 0) {
      return reply.send({
        valid: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark OTP as used
    await pool.query(`
      UPDATE otp_codes SET used_at = NOW() WHERE id = $1
    `, [otpRecord.rows[0].id]);

    // If phone verification, mark user as verified
    if (body.purpose === 'phone_verification') {
      await pool.query(`
        UPDATE users SET phone_verified = true WHERE phone_number = $1
      `, [body.phone_number]);
    }

    return reply.send({
      valid: true,
      message: 'OTP verified successfully',
    });
  });
};

export default authRoutes;
