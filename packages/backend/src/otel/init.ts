/**
 * OpenTelemetry Initialization Module
 *
 * This module initializes OpenTelemetry SDK with auto-instrumentations
 * for Fastify, HTTP, and PostgreSQL. It supports both console and OTLP
 * exporters based on environment configuration.
 *
 * IMPORTANT: This must be imported BEFORE any other application code
 * to ensure instrumentation works correctly.
 *
 * Environment variables:
 * - OTEL_ENABLED: Enable/disable OTel (default: true)
 * - OTEL_SERVICE_NAME: Service name (default: shovel-heroes-api)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint (optional, uses console if not set)
 * - NODE_ENV: Environment (development/production/test)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

// State management
let sdk: NodeSDK | null = null;
let initialized = false;

/**
 * Get service name from environment or use default
 */
export function getServiceName(): string {
  return process.env.OTEL_SERVICE_NAME || 'shovel-heroes-api';
}

/**
 * Get exporter type based on configuration
 */
export function getExporterType(): 'console' | 'otlp' {
  return process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? 'otlp' : 'console';
}

/**
 * Get resource attributes for the service
 */
export function getResourceAttributes(): Record<string, string> {
  const packageJson = { version: '0.1.0' }; // TODO: Read from package.json

  return {
    [SEMRESATTRS_SERVICE_NAME]: getServiceName(),
    [SEMRESATTRS_SERVICE_VERSION]: packageJson.version,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  };
}

/**
 * Get instrumentation configuration
 * Enables auto-instrumentation for HTTP, Fastify, and PostgreSQL
 */
export function getInstrumentationConfig(): Record<string, any> {
  return {
    '@opentelemetry/instrumentation-http': {
      enabled: true,
      ignoreIncomingPaths: ['/healthz', '/ping'], // Don't trace health checks
    },
    '@opentelemetry/instrumentation-fastify': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-pg': {
      enabled: true,
      enhancedDatabaseReporting: true,
    },
  };
}

/**
 * Create the appropriate trace exporter based on configuration
 */
function createTraceExporter() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (endpoint) {
    console.log(`✓ OpenTelemetry: Using OTLP exporter (${endpoint})`);
    return new OTLPTraceExporter({
      url: endpoint,
    });
  }

  console.log('✓ OpenTelemetry: Using console exporter (no OTLP endpoint configured)');
  return new ConsoleSpanExporter();
}

/**
 * Initialize OpenTelemetry SDK
 *
 * This function sets up:
 * - Resource attributes (service name, version, environment)
 * - Auto-instrumentations for Fastify, HTTP, PostgreSQL
 * - Trace exporter (console or OTLP)
 *
 * @returns NodeSDK instance or null if disabled/failed
 */
export async function initializeOTel(): Promise<NodeSDK | null> {
  // Check if OTel is enabled
  const enabled = process.env.OTEL_ENABLED !== 'false';
  if (!enabled) {
    console.log('⊘ OpenTelemetry: Disabled via OTEL_ENABLED=false');
    return null;
  }

  // Already initialized
  if (initialized && sdk) {
    console.log('⚠ OpenTelemetry: Already initialized');
    return sdk;
  }

  try {
    // Create trace exporter
    const traceExporter = createTraceExporter();

    // Create Resource with proper attributes using factory function
    const resource = resourceFromAttributes(getResourceAttributes());

    // Create SDK with auto-instrumentations
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations(getInstrumentationConfig()),
      ],
    });

    // Start the SDK
    await sdk.start();
    initialized = true;

    console.log(`✓ OpenTelemetry: Initialized successfully`);
    console.log(`  Service: ${getServiceName()}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Exporter: ${getExporterType()}`);

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('OpenTelemetry: Shutting down...');
      await shutdownOTel();
    });

    return sdk;
  } catch (error) {
    console.error('✗ OpenTelemetry: Initialization failed', error);
    initialized = false;
    sdk = null;

    // Don't throw - allow application to continue without telemetry
    return null;
  }
}

/**
 * Check if OpenTelemetry is initialized
 */
export function isOTelInitialized(): boolean {
  return initialized;
}

/**
 * Shutdown OpenTelemetry SDK gracefully
 */
export async function shutdownOTel(): Promise<void> {
  if (!sdk || !initialized) {
    return;
  }

  try {
    await sdk.shutdown();
    console.log('✓ OpenTelemetry: Shutdown complete');
    initialized = false;
    sdk = null;
  } catch (error) {
    console.error('✗ OpenTelemetry: Shutdown failed', error);
  }
}

/**
 * Get the SDK instance (for advanced usage)
 */
export function getSDK(): NodeSDK | null {
  return sdk;
}
