# Email Notification Service Setup

## Overview

The email notification service integrates with **MailHog** for development and testing. All email functionality includes graceful fallback if SMTP is not configured.

## Features

- ✅ Welcome emails for new users
- ✅ Password reset emails with tokens
- ✅ Grid notifications for volunteers
- ✅ Graceful error handling
- ✅ Development-only debug endpoints
- ✅ Full test coverage

## Environment Variables

Add these to your `/packages/backend/.env` file:

```bash
# Email Configuration (MailHog defaults)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=noreply@shovelheroes.local

# Optional authentication (not needed for MailHog)
# SMTP_USER=
# SMTP_PASS=
```

## Setup MailHog

### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name mailhog \
  -p 1025:1025 \
  -p 8025:8025 \
  mailhog/mailhog
```

### Option 2: Binary Installation

```bash
# macOS
brew install mailhog
mailhog

# Linux
go install github.com/mailhog/MailHog@latest
~/go/bin/MailHog
```

### Access MailHog Web UI

Open [http://localhost:8025](http://localhost:8025) to view all sent emails.

## Debug Endpoints (Development Only)

These endpoints are **only available** when `NODE_ENV !== 'production'`:

### Check Email Configuration

```bash
GET /debug/email-status

# Response
{
  "configured": true,
  "message": "Email is configured and ready"
}
```

### Send Test Email

```bash
POST /debug/send-mail
Content-Type: application/json

{
  "to": "test@example.com",
  "type": "welcome",           // "welcome" | "password-reset" | "grid-notification"
  "name": "John Doe",          // optional, defaults to "Test User"
  "message": "Custom message"  // optional, for grid-notification type
}

# Response (success)
{
  "success": true,
  "messageId": "<unique-id>",
  "type": "welcome",
  "to": "test@example.com",
  "message": "Test welcome email sent successfully. Check MailHog at http://localhost:8025"
}

# Response (failure)
{
  "success": false,
  "error": "Connection refused",
  "message": "Failed to send test email",
  "hint": "Make sure MailHog is running: docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog"
}
```

### Quick Access to MailHog

```bash
GET /debug/mailhog
# Redirects to http://localhost:8025
```

## Usage in Code

### Import Email Service

```typescript
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendGridNotification,
  isEmailConfigured
} from '../lib/email.js';
```

### Send Welcome Email

```typescript
const result = await sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Failed to send email:', result.error);
}
```

### Send Password Reset

```typescript
const resetToken = generateSecureToken(); // your token generation
const result = await sendPasswordResetEmail(
  'user@example.com',
  resetToken
);
```

### Send Grid Notification

```typescript
const result = await sendGridNotification(
  'volunteer@example.com',
  'Emergency: Grid A-123',
  'Urgent help needed in Grid A-123 after heavy snowfall'
);
```

### Check if Email is Configured

```typescript
if (isEmailConfigured()) {
  await sendWelcomeEmail(user.email, user.name);
} else {
  logger.warn('Email not configured, skipping notification');
}
```

## Testing

### Run Email Service Tests

```bash
npm test -- tests/lib/email.test.ts
```

### Run Debug Route Tests

```bash
npm test -- tests/routes/debug.test.ts
```

### Manual Testing with cURL

```bash
# Start the backend server
npm run dev

# Check email status
curl http://localhost:8787/debug/email-status

# Send test welcome email
curl -X POST http://localhost:8787/debug/send-mail \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "type": "welcome",
    "name": "Test User"
  }'

# Send test password reset
curl -X POST http://localhost:8787/debug/send-mail \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "type": "password-reset"
  }'

# Send test grid notification
curl -X POST http://localhost:8787/debug/send-mail \
  -H "Content-Type: application/json" \
  -d '{
    "to": "volunteer@example.com",
    "type": "grid-notification",
    "message": "New snow clearing task in your area"
  }'

# Open MailHog (redirects)
curl -L http://localhost:8787/debug/mailhog
```

## Email Templates

### Welcome Email

- Subject: "Welcome to Shovel Heroes!"
- Includes: User name, getting started checklist
- Call-to-action: Complete profile, browse grids

### Password Reset Email

- Subject: "Password Reset Request - Shovel Heroes"
- Includes: Reset link with token, expiry warning (1 hour)
- Security: Includes notice if user didn't request reset

### Grid Notification

- Subject: "[Shovel Heroes] {custom subject}"
- Includes: Custom message about grid status/tasks
- Flexible format for various notification types

## Production Configuration

For production, update environment variables:

```bash
# Production SMTP (example with Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@yourdomain.com
```

**Important**: Debug routes are automatically disabled in production (`NODE_ENV=production`).

## Troubleshooting

### "Email not configured" Error

1. Check that MailHog is running: `docker ps | grep mailhog`
2. Verify SMTP_HOST and SMTP_PORT in `.env`
3. Test connection: `curl http://localhost:8787/debug/email-status`

### Emails Not Appearing in MailHog

1. Check MailHog web UI is accessible: [http://localhost:8025](http://localhost:8025)
2. Verify email was sent successfully (check API response)
3. Check MailHog logs: `docker logs mailhog`

### Connection Refused

```bash
# Restart MailHog
docker restart mailhog

# Or start if not running
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

## Implementation Files

- **Email Service**: `/packages/backend/src/lib/email.ts`
- **Debug Routes**: `/packages/backend/src/routes/debug.ts`
- **Environment Config**: `/packages/backend/src/lib/env.ts`
- **Email Tests**: `/packages/backend/tests/lib/email.test.ts`
- **Debug Tests**: `/packages/backend/tests/routes/debug.test.ts`

## Next Steps

Phase 4.2 ✅ Complete! Next implementations:

1. **Integrate with User Registration**: Send welcome email on signup
2. **Password Reset Flow**: Implement token generation and validation
3. **Grid Notifications**: Add subscription and notification triggers
4. **Email Queue**: Consider adding Bull/BullMQ for background processing
5. **Email Analytics**: Track open rates, click-through rates (future)

## Security Notes

- All emails use secure templates (no user input in HTML without escaping)
- Password reset tokens should be cryptographically secure
- SMTP credentials stored in `.env` (never committed)
- Debug endpoints automatically disabled in production
- Rate limiting applied to all endpoints (including debug)

---

**Last Updated**: 2025-10-03
**Phase**: 4.2 - MailHog SMTP Integration
**Status**: ✅ Complete
