/**
 * node-pg-migrate configuration
 * This file configures the database migration tool
 */

require('dotenv/config');

module.exports = {
  // Database connection
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes',

  // Migration directory
  dir: 'migrations',

  // Migration table name
  migrationsTable: 'pgmigrations',

  // Migration file naming
  migrationFileLanguage: 'js',

  // TypeScript support (we'll use .js in migrations dir)
  tsconfig: false,

  // Direction: up or down
  direction: 'up',

  // Count: number of migrations to run
  count: Infinity,

  // Create schema if it doesn't exist
  createSchema: true,

  // Create migrations table if it doesn't exist
  createMigrationsSchema: false,

  // Check order of migrations
  checkOrder: true,

  // Verbose output
  verbose: true,

  // Use single transaction per migration
  singleTransaction: true,

  // Disable locking (set to true if using multiple migration runners)
  noLock: false,

  // Reject migrations on failure
  decamelize: false,

  // Template for new migrations
  'migration-file-language': 'js',
  'template-file-name': undefined,
};
