# Security Configuration Guide

## Overview

This document describes the security architecture and configuration for the Shovel Heroes backend API.

## Environment Variables

All security-critical configuration is managed through environment variables validated at startup using Zod schemas.

### Required Variables

```bash
# Security
JWT_SECRET=<32+ character random string>

# Database
DATABASE_URL=postgres://user:password@host:port/database

# Application
NODE_ENV=production|development|test
PORT=8787
```

### Optional Variables

```bash
# CORS (comma-separated origins)
CORS_ALLOWLIST=https://app.example.com,https://admin.example.com

# Logging
LOG_LEVEL=info|warn|error|debug|trace

# Rate Limiting
RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW=1 minute

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com
```

## Security Layers

### 1. Environment Validation (`/home/thc1006/dev/shovel-heroes/packages/backend/src/lib/env.ts`)

- **Zod Schema Validation**: All environment variables are validated at startup
- **Type Safety**: Runtime validation ensures type correctness
- **Early Failure**: Application exits immediately if validation fails
- **Production Checks**: JWT_SECRET must not contain 'dev_secret' in production

### 2. Helmet Security Headers

```typescript
helmet({
  contentSecurityPolicy: production ? undefined : false,
  hsts: production ? { maxAge: 31536000, includeSubDomains: true } : false,
})
```

- **HSTS**: HTTP Strict Transport Security (production only)
- **CSP**: Content Security Policy (production only)
- **XSS Protection**: X-XSS-Protection headers
- **Frame Options**: X-Frame-Options to prevent clickjacking

### 3. CORS Policy

**Development Mode**:
- Empty allowlist → allow all origins
- Useful for local development

**Production Mode**:
- Strict allowlist enforcement
- Comma-separated list of allowed origins
- Same-origin requests always allowed
- Rejected requests logged for security monitoring

### 4. Rate Limiting

**Default Configuration**:
- 300 requests per minute per IP
- Configurable via environment variables
- Blocks at application layer before reaching business logic

**Features**:
- Warning events logged when approaching limit
- Exceeded events logged for security analysis
- Custom error messages to clients
- Works with reverse proxy (trust proxy enabled in production)

### 5. JWT Authentication

**Configuration**:
- Secret key validated at startup (minimum 32 characters)
- 24-hour token expiry
- Automatic token verification via decorator

**Usage**:
```typescript
app.get('/protected', { onRequest: [app.auth] }, async (req, reply) => {
  // req.user contains JWT payload
});
```

### 6. Row-Level Security (RLS)

**Database Configuration**:
- PostgreSQL RLS policies enforced
- `app.user_id` session variable set automatically
- `withConn()` helper manages RLS context

```typescript
await withConn(async (client) => {
  // Queries here run with RLS context
}, userId);
```

### 7. Error Handling

**Production Mode**:
- Internal errors (5xx) sanitized
- No stack traces exposed
- Generic "Internal server error" message

**Development Mode**:
- Full error details for debugging
- Stack traces included

**All Modes**:
- All errors logged with context
- Security events logged separately
- Request ID tracking for correlation

## Logging

**Structured Logging** (`/home/thc1006/dev/shovel-heroes/packages/backend/src/lib/logger.ts`):

- **Development**: Pretty-printed with pino-pretty
- **Production**: Structured JSON logs
- **Redaction**: Sensitive fields automatically redacted
- **Serializers**: Request/response/error serialization

**Redacted Fields**:
- Authorization headers
- Cookie headers
- password fields
- token fields
- secret fields
- API keys

## Database Security

**Connection Pool** (`/home/thc1006/dev/shovel-heroes/packages/backend/src/lib/db.ts`):

```typescript
pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                          // Maximum connections
  idleTimeoutMillis: 30000,         // Close idle connections
  connectionTimeoutMillis: 2000,    // Connection timeout
});
```

**Query Logging**:
- Enabled in development mode
- Disabled in production for performance
- All queries logged via `logQuery()` helper

## Security Event Monitoring

All security events are logged with `logSecurityEvent()`:

```typescript
logSecurityEvent('event_name', {
  ip: request.ip,
  url: request.url,
  ...details
});
```

**Monitored Events**:
- `cors_rejection`: CORS policy violations
- `rate_limit_warning`: Approaching rate limit
- `rate_limit_exceeded`: Rate limit exceeded
- `jwt_verification_failed`: Authentication failures

## Graceful Shutdown

**Signal Handling**:
- SIGINT (Ctrl+C)
- SIGTERM (kill command)

**Shutdown Process**:
1. Stop accepting new connections
2. Complete in-flight requests
3. Close database pool
4. Exit cleanly

**Error Handling**:
- `uncaughtException`: Logs and exits
- `unhandledRejection`: Logs and exits

## Migration Security

**Database Migrations** (`.migration.config.cjs`):

- Single transaction per migration
- Migration order checking enabled
- Verbose logging
- No concurrent migration runners (locking enabled)

## Deployment Checklist

Before deploying to production:

- [ ] Generate secure JWT_SECRET: `openssl rand -base64 32`
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ALLOWLIST with exact domains
- [ ] Set DATABASE_URL with secure credentials
- [ ] Configure SMTP settings for email
- [ ] Review LOG_LEVEL (info or warn recommended)
- [ ] Enable HTTPS/TLS at reverse proxy layer
- [ ] Configure rate limits based on expected traffic
- [ ] Set up log aggregation (e.g., ELK, Datadog)
- [ ] Configure database backup strategy
- [ ] Set up monitoring and alerting
- [ ] Run database migrations: `npm run migrate:up`
- [ ] Verify RLS policies are active

## Security Headers

### Response Headers (via Helmet)

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains (production)
```

## Testing Security

Run security-focused tests:

```bash
# Unit tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Security Best Practices

1. **Never commit secrets** - use .env files (gitignored)
2. **Rotate JWT_SECRET periodically** - invalidates all tokens
3. **Use parameterized queries** - prevents SQL injection
4. **Validate all input** - use Zod schemas
5. **Monitor security events** - set up alerts
6. **Keep dependencies updated** - `npm audit` regularly
7. **Use HTTPS in production** - configure at reverse proxy
8. **Implement request size limits** - prevent DoS
9. **Use prepared statements** - for database queries
10. **Regular security audits** - review logs and metrics

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Fastify Security](https://www.fastify.io/docs/latest/Reference/Security/)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
