# Email Service Integration Example

## Example: Send Welcome Email on User Registration

```typescript
// In packages/backend/src/routes/users.ts

import { sendWelcomeEmail } from '../lib/email.js';

// After successful user creation
app.post('/api/users/register', async (request, reply) => {
  // ... validate and create user ...
  
  const newUser = await db.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [email, name, passwordHash]
  );

  // Send welcome email (non-blocking)
  sendWelcomeEmail(newUser.email, newUser.name)
    .then(result => {
      if (result.success) {
        logger.info({ userId: newUser.id, messageId: result.messageId }, 'Welcome email sent');
      } else {
        logger.error({ userId: newUser.id, error: result.error }, 'Failed to send welcome email');
      }
    })
    .catch(err => {
      logger.error({ userId: newUser.id, err }, 'Unexpected error sending welcome email');
    });

  // Return immediately without waiting for email
  return reply.code(201).send({ 
    id: newUser.id,
    email: newUser.email,
    name: newUser.name
  });
});
```

## Example: Password Reset Flow

```typescript
// Generate reset token and send email
app.post('/api/auth/forgot-password', async (request, reply) => {
  const { email } = request.body;

  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) {
    // Don't reveal if email exists (security best practice)
    return reply.send({ message: 'If the email exists, a reset link has been sent' });
  }

  // Generate secure token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  // Store token in database
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.rows[0].id, resetToken, expiresAt]
  );

  // Send reset email
  const result = await sendPasswordResetEmail(user.rows[0].email, resetToken);

  if (!result.success) {
    logger.error({ error: result.error }, 'Failed to send password reset email');
    // Still return success to user (don't leak email existence)
  }

  return reply.send({ message: 'If the email exists, a reset link has been sent' });
});
```

## Example: Grid Notification to Volunteers

```typescript
// Notify volunteers when grid needs help
app.post('/api/grids/:id/request-help', async (request, reply) => {
  const gridId = request.params.id;
  const { urgency, message } = request.body;

  // Get grid details
  const grid = await db.query('SELECT * FROM grids WHERE id = $1', [gridId]);
  if (!grid.rows[0]) {
    return reply.code(404).send({ error: 'Grid not found' });
  }

  // Get nearby volunteers
  const volunteers = await db.query(`
    SELECT email, name FROM volunteers 
    WHERE ST_DWithin(location, $1::geography, 5000)
    AND notifications_enabled = true
  `, [grid.rows[0].center_point]);

  // Send notifications to all volunteers
  const notifications = volunteers.rows.map(volunteer =>
    sendGridNotification(
      volunteer.email,
      `${urgency === 'high' ? 'URGENT: ' : ''}Grid ${grid.rows[0].grid_id} Needs Help`,
      `Hi ${volunteer.name},\n\n${message}\n\nGrid: ${grid.rows[0].grid_id}\nLocation: ${grid.rows[0].address}`
    )
  );

  // Wait for all emails (or use background queue in production)
  const results = await Promise.allSettled(notifications);

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

  logger.info({ gridId, volunteersNotified: successCount }, 'Grid notification sent');

  return reply.send({
    message: 'Notifications sent',
    volunteersNotified: successCount,
    totalVolunteers: volunteers.rows.length
  });
});
```

## Testing the Integration

```bash
# 1. Start MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# 2. Start backend
npm run dev

# 3. Test welcome email via debug endpoint
curl -X POST http://localhost:8787/debug/send-mail \
  -H "Content-Type: application/json" \
  -d '{"to": "newuser@example.com", "type": "welcome", "name": "John Doe"}'

# 4. Check MailHog
open http://localhost:8025

# 5. Test in actual registration (when implemented)
curl -X POST http://localhost:8787/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "Jane Smith",
    "password": "SecurePass123!"
  }'
```
