import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * OpenTelemetry Initialization Tests
 *
 * Tests follow TDD principles:
 * 1. Verify OTel SDK is properly initialized
 * 2. Test that instrumentation is configured
 * 3. Ensure traces can be generated
 * 4. Verify it works in different environments
 */

describe('OpenTelemetry Initialization', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear any cached modules
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should initialize OTel SDK when OTEL_ENABLED is true', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_SERVICE_NAME = 'test-service';
    process.env.NODE_ENV = 'development';

    const { initializeOTel, isOTelInitialized } = await import('../../src/otel/init.js');

    const sdk = await initializeOTel();

    expect(sdk).toBeDefined();
    expect(isOTelInitialized()).toBe(true);
  });

  it('should skip initialization when OTEL_ENABLED is false', async () => {
    process.env.OTEL_ENABLED = 'false';
    process.env.NODE_ENV = 'development';

    const { initializeOTel, isOTelInitialized } = await import('../../src/otel/init.js');

    const sdk = await initializeOTel();

    expect(sdk).toBeNull();
    expect(isOTelInitialized()).toBe(false);
  });

  it('should use correct service name from environment', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_SERVICE_NAME = 'custom-service';
    process.env.NODE_ENV = 'development';

    const { getServiceName } = await import('../../src/otel/init.js');

    const serviceName = getServiceName();

    expect(serviceName).toBe('custom-service');
  });

  it('should default to shovel-heroes-api service name', async () => {
    process.env.OTEL_ENABLED = 'true';
    delete process.env.OTEL_SERVICE_NAME;
    process.env.NODE_ENV = 'development';

    const { getServiceName } = await import('../../src/otel/init.js');

    const serviceName = getServiceName();

    expect(serviceName).toBe('shovel-heroes-api');
  });

  it('should use console exporter when no OTLP endpoint is configured', async () => {
    process.env.OTEL_ENABLED = 'true';
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.NODE_ENV = 'development';

    const { getExporterType } = await import('../../src/otel/init.js');

    const exporterType = getExporterType();

    expect(exporterType).toBe('console');
  });

  it('should use OTLP exporter when endpoint is configured', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.NODE_ENV = 'development';

    const { getExporterType } = await import('../../src/otel/init.js');

    const exporterType = getExporterType();

    expect(exporterType).toBe('otlp');
  });

  it('should include required resource attributes', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_SERVICE_NAME = 'test-service';
    process.env.NODE_ENV = 'production';

    const { getResourceAttributes } = await import('../../src/otel/init.js');

    const attributes = getResourceAttributes();

    // Check that required attributes exist (keys match semantic conventions)
    expect(Object.keys(attributes).length).toBeGreaterThan(0);
    expect(Object.values(attributes)).toContain('test-service');
    expect(Object.values(attributes)).toContain('production');
  });

  it('should handle initialization errors gracefully', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'invalid://endpoint';
    process.env.NODE_ENV = 'development';

    const { initializeOTel } = await import('../../src/otel/init.js');

    // Should not throw, but log error and continue
    await expect(initializeOTel()).resolves.toBeDefined();
  });

  it('should enable auto-instrumentation for Fastify', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.NODE_ENV = 'development';

    const { getInstrumentationConfig } = await import('../../src/otel/init.js');

    const config = getInstrumentationConfig();

    expect(config).toBeDefined();
    expect(config).toHaveProperty('@opentelemetry/instrumentation-http');
    expect(config).toHaveProperty('@opentelemetry/instrumentation-fastify');
  });

  it('should enable auto-instrumentation for PostgreSQL', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.NODE_ENV = 'development';

    const { getInstrumentationConfig } = await import('../../src/otel/init.js');

    const config = getInstrumentationConfig();

    expect(config).toBeDefined();
    expect(config).toHaveProperty('@opentelemetry/instrumentation-pg');
  });

  it('should shutdown gracefully', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.NODE_ENV = 'development';

    const { initializeOTel, shutdownOTel, isOTelInitialized } = await import('../../src/otel/init.js');

    await initializeOTel();
    expect(isOTelInitialized()).toBe(true);

    await shutdownOTel();
    expect(isOTelInitialized()).toBe(false);
  });
});
