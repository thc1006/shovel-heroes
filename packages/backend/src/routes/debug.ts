import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isProduction } from '../lib/env.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendGridNotification, isEmailConfigured } from '../lib/email.js';

/**
 * Request schema for test email endpoint
 */
const sendMailSchema = z.object({
  to: z.string().email('Invalid email address'),
  type: z.enum(['welcome', 'password-reset', 'grid-notification']).default('welcome'),
  name: z.string().optional().default('Test User'),
  message: z.string().optional(),
});

type SendMailRequest = z.infer<typeof sendMailSchema>;

/**
 * Register debug routes (non-production only)
 * These endpoints are only available when NODE_ENV !== 'production'
 */
export function registerDebugRoutes(app: FastifyInstance): void {
  // Only register debug routes in non-production environments (development and test)
  if (isProduction()) {
    app.log.info('Debug routes disabled (production mode)');
    return;
  }

  app.log.info('Registering debug routes');

  /**
   * GET /debug/email-status
   * Check email configuration status
   */
  app.get('/debug/email-status', async (request, reply) => {
    const configured = isEmailConfigured();

    return reply.send({
      configured,
      message: configured
        ? 'Email is configured and ready'
        : 'Email is not configured - check SMTP environment variables',
    });
  });

  /**
   * POST /debug/send-mail
   * Send test email through MailHog
   *
   * Request body:
   * {
   *   "to": "test@example.com",
   *   "type": "welcome" | "password-reset" | "grid-notification",
   *   "name": "Test User" (optional),
   *   "message": "Custom message" (optional, for grid notifications)
   * }
   */
  app.post<{ Body: SendMailRequest }>('/debug/send-mail', async (request, reply) => {
    try {
      // Validate request body
      const validated = sendMailSchema.parse(request.body);

      let result;

      switch (validated.type) {
        case 'welcome':
          result = await sendWelcomeEmail(validated.to, validated.name);
          break;

        case 'password-reset':
          // Generate a fake reset token for testing
          const resetToken = `test-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          result = await sendPasswordResetEmail(validated.to, resetToken);
          break;

        case 'grid-notification':
          result = await sendGridNotification(
            validated.to,
            'Test Grid Notification',
            validated.message || 'This is a test grid notification from the debug endpoint.'
          );
          break;

        default:
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid email type',
          });
      }

      if (result.success) {
        return reply.send({
          success: true,
          messageId: result.messageId,
          type: validated.type,
          to: validated.to,
          message: `Test ${validated.type} email sent successfully. Check MailHog at http://localhost:8025`,
        });
      } else {
        return reply.code(500).send({
          success: false,
          error: result.error,
          message: 'Failed to send test email',
          hint: 'Make sure MailHog is running: docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid request body',
          issues: error.errors,
        });
      }

      request.log.error({ err: error }, 'Error in debug send-mail endpoint');

      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /debug/mailhog
   * Redirect to MailHog web interface
   */
  app.get('/debug/mailhog', async (request, reply) => {
    return reply.redirect('http://localhost:8025');
  });

  app.log.info('Debug routes registered successfully');
}
