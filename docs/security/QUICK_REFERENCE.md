# Security Configuration Quick Reference

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Generate secure JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Edit other variables
nano .env
```

### 2. Required Environment Variables

```bash
# REQUIRED
DATABASE_URL=postgres://user:pass@host:port/db
JWT_SECRET=<32+ character secure random string>

# RECOMMENDED
NODE_ENV=production
CORS_ALLOWLIST=https://yourdomain.com,https://admin.yourdomain.com
LOG_LEVEL=info
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/packages/backend/src/lib/env.ts` | Environment validation |
| `/packages/backend/src/lib/logger.ts` | Structured logging |
| `/packages/backend/src/lib/db.ts` | Database helpers |
| `/packages/backend/src/index.ts` | Main server + security |
| `/packages/backend/.migration.config.cjs` | Migration config |
| `/.env.example` | Environment template |

## 🔐 Security Layers

1. **Environment Validation** - Zod schema validation
2. **HTTP Security Headers** - Helmet (HSTS, CSP, etc.)
3. **CORS Protection** - Strict allowlist
4. **Rate Limiting** - 300 req/min per IP (configurable)
5. **JWT Authentication** - 24h expiry, secure secret
6. **Database RLS** - Row-Level Security with `app.user_id`
7. **Error Sanitization** - No internal details in production
8. **Graceful Shutdown** - Clean resource cleanup

## 🛠️ Common Commands

```bash
# Development
npm run dev

# Type checking
npm run lint

# Code formatting
npm run format

# Testing
npm test
npm run test:coverage
npm run test:watch

# Database migrations
npm run migrate:up
npm run migrate:down
npm run migrate:create my_migration
```

## 🔍 Environment Variables Reference

### Application
- `NODE_ENV` - development|production|test (default: development)
- `PORT` - Server port (default: 8787)

### Database
- `DATABASE_URL` - PostgreSQL connection string (REQUIRED)

### Security
- `JWT_SECRET` - JWT signing secret (REQUIRED, min 32 chars)
- `CORS_ALLOWLIST` - Comma-separated allowed origins

### Logging
- `LOG_LEVEL` - trace|debug|info|warn|error|fatal (default: info)

### Rate Limiting
- `RATE_LIMIT_MAX` - Max requests per window (default: 300)
- `RATE_LIMIT_WINDOW` - Time window (default: "1 minute")

### Email (Optional)
- `SMTP_HOST` - SMTP server (default: localhost)
- `SMTP_PORT` - SMTP port (default: 1025)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From email address

## 🚨 Security Events

The following events are logged for monitoring:

| Event | Description | Action |
|-------|-------------|--------|
| `cors_rejection` | CORS policy violation | Review allowlist |
| `rate_limit_warning` | Approaching rate limit | Monitor traffic |
| `rate_limit_exceeded` | Rate limit exceeded | Possible attack |
| `jwt_verification_failed` | Auth failure | Check tokens |

## ✅ Production Deployment Checklist

```bash
# Environment
[ ] NODE_ENV=production
[ ] JWT_SECRET generated with: openssl rand -base64 32
[ ] CORS_ALLOWLIST configured with exact domains
[ ] DATABASE_URL with secure credentials
[ ] LOG_LEVEL=info or LOG_LEVEL=warn

# Infrastructure
[ ] HTTPS enabled at reverse proxy
[ ] Database backups configured
[ ] Log aggregation set up
[ ] Monitoring and alerting configured

# Database
[ ] Run migrations: npm run migrate:up
[ ] RLS policies enabled and tested
[ ] Connection pool limits reviewed

# Testing
[ ] All tests passing: npm test
[ ] Type checking: npm run lint
[ ] Security audit: npm audit
```

## 🔧 Helper Functions

### Logging
```typescript
import { logger, logSecurityEvent, logPerformance } from './lib/logger.js';

// General logging
logger.info('Message', { context: 'data' });

// Security events
logSecurityEvent('event_name', { ip, url, details });

// Performance tracking
logPerformance('operation_name', durationMs, metadata);
```

### Database
```typescript
import { pool, withConn, query, closePool } from './lib/db.js';

// With RLS context
await withConn(async (client) => {
  const result = await client.query('SELECT * FROM table');
}, userId);

// Direct query
const { rows } = await query('SELECT * FROM table WHERE id = $1', [id]);

// Shutdown
await closePool();
```

### Environment
```typescript
import { env, isProduction, isDevelopment, isTest } from './lib/env.js';

// Type-safe access
const port = env.PORT;
const secret = env.JWT_SECRET;

// Environment checks
if (isProduction()) {
  // Production-only code
}
```

## 📊 Monitoring Queries

### Log Analysis (if using structured JSON logs)

```bash
# Failed auth attempts
grep '"event":"jwt_verification_failed"' logs.json | jq

# Rate limit violations
grep '"event":"rate_limit_exceeded"' logs.json | jq

# Error rates
grep '"level":"error"' logs.json | jq
```

## 🐛 Troubleshooting

### Environment validation fails on startup
- Check all required variables are set
- Run `validateEnv()` manually to see detailed errors
- Compare with `.env.example`

### CORS errors in browser
- Add your origin to `CORS_ALLOWLIST`
- Check if `NODE_ENV` is production (strict mode)
- Verify origin header matches exactly (including protocol)

### Rate limit too aggressive
- Increase `RATE_LIMIT_MAX`
- Adjust `RATE_LIMIT_WINDOW`
- Consider implementing per-user limits instead of per-IP

### JWT errors
- Check `JWT_SECRET` is set and at least 32 characters
- Verify token hasn't expired (24h default)
- Check clock sync on server

### Database connection issues
- Verify `DATABASE_URL` format
- Check network connectivity
- Review connection pool settings
- Check database logs

## 📖 Additional Documentation

- [Full Security Configuration Guide](/home/thc1006/dev/shovel-heroes/docs/security/SECURITY_CONFIGURATION.md)
- [Implementation Summary](/home/thc1006/dev/shovel-heroes/docs/security/IMPLEMENTATION_SUMMARY.md)
- [Project README](/home/thc1006/dev/shovel-heroes/README.md)
- [CLAUDE.md](/home/thc1006/dev/shovel-heroes/CLAUDE.md)

## 🔗 External References

- [Fastify Security Best Practices](https://www.fastify.io/docs/latest/Reference/Security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Pino Logger Documentation](https://getpino.io/)
