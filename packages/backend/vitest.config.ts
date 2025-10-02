import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    environment: 'node',
    reporters: ['default'],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    globals: true,
    setupFiles: [],
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially for database consistency
      },
    },
  },
});
