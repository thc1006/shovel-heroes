import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    // Use 'node' for backend API tests, 'happy-dom' for React component tests
    environment: 'happy-dom',

    // Global test utilities available in all test files
    globals: true,

    // Setup files to run before each test file
    setupFiles: ['./tests/setup.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/dist/**',
        '**/build/**',
        '**/.{idea,git,cache,output,temp}/**',
        'packages/shared-types/**', // Generated types
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },

    // Test file patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'build',
    ],

    // Test timeout (milliseconds)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Parallel execution
    threads: true,

    // Reporter options
    reporters: ['verbose'],
  },

  // Path resolution (match vite.config.js)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
})
