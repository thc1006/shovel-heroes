import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app.js';

describe('Debug Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Build the app normally (will respect current NODE_ENV from test environment)
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /debug/email-status', () => {
    it('should return email configuration status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/debug/email-status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('configured');
      expect(body).toHaveProperty('message');
      expect(typeof body.configured).toBe('boolean');
    });
  });

  describe('POST /debug/send-mail', () => {
    it('should validate email address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'invalid-email',
          type: 'welcome',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body).toHaveProperty('issues');
    });

    it('should accept valid welcome email request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'test@example.com',
          type: 'welcome',
          name: 'Test User',
        },
      });

      // May succeed or fail depending on MailHog availability
      expect([200, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should accept valid password-reset email request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'test@example.com',
          type: 'password-reset',
        },
      });

      // May succeed or fail depending on MailHog availability
      expect([200, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should accept valid grid-notification email request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'volunteer@example.com',
          type: 'grid-notification',
          message: 'Test grid notification message',
        },
      });

      // May succeed or fail depending on MailHog availability
      expect([200, 500]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success');
    });

    it('should use default values when optional fields are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'test@example.com',
          // type defaults to 'welcome'
          // name defaults to 'Test User'
        },
      });

      // May succeed or fail depending on MailHog availability
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should provide helpful error message when SMTP fails', async () => {
      // This test assumes MailHog is not running
      const response = await app.inject({
        method: 'POST',
        url: '/debug/send-mail',
        payload: {
          to: 'test@example.com',
          type: 'welcome',
        },
      });

      const body = JSON.parse(response.body);

      if (!body.success) {
        expect(response.statusCode).toBe(500);
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('hint');
        expect(body.hint).toContain('MailHog');
      }
    });
  });

  describe('GET /debug/mailhog', () => {
    it('should redirect to MailHog web interface', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/debug/mailhog',
        followRedirect: false,
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('http://localhost:8025');
    });
  });
});

// Note: Testing production mode behavior would require a separate test file
// that runs with NODE_ENV=production set before any modules are loaded.
