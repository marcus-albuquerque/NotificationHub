#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Simple migration system for NotificationHub that executes SQL files in order.
 * 
 * Usage:
 *   node migrate.js migrate         # Run all pending migrations
 *   node migrate.js migrate --seed  # Run migrations and seed data
 *   node migrate.js rollback        # Rollback last migration (not implemented)
 *   node migrate.js status          # Show migration status
 * 
 * Environment Variables:
 *   DATABASE_URL: PostgreSQL connection string (e.g., postgres://user:pass@localhost:5432/notificationhub)
 *   Or individual connection params:
 *     DB_HOST: default 'localhost'
 *     DB_PORT: default 5432
 *     DB_NAME: default 'notificationhub'
 *     DB_USER: default 'postgres'
 *     DB_PASSWORD: default ''
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get database connection parameters
function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'notificationhub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

// Create migrations tracking table if it doesn't exist
async function createMigrationsTable(client) {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await client.query(query);
    console.log('✓ Migrations tracking table created/verified');
  } catch (err) {
    console.error('✗ Failed to create migrations table:', err.message);
    throw err;
  }
}

// Get list of executed migrations
async function getExecutedMigrations(client) {
  try {
    const result = await client.query(
      'SELECT name FROM schema_migrations ORDER BY executed_at ASC'
    );
    return result.rows.map(row => row.name);
  } catch (err) {
    console.error('✗ Failed to get executed migrations:', err.message);
    throw err;
  }
}

// Get list of migration files
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('✗ Migrations directory not found:', migrationsDir);
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

// Execute a migration file
async function executeMigration(client, filePath, fileName) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    await client.query('BEGIN');
    
    // Split SQL into individual statements and execute
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (!statement.startsWith('--')) {
        await client.query(statement);
      }
    }

    // Record migration as executed
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      [fileName]
    );

    await client.query('COMMIT');
    console.log(`✓ Migration executed: ${fileName}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed: ${fileName}`);
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// Run migrations
async function runMigrations(seedData = false) {
  const config = getConnectionConfig();
  const pool = new Pool(config);

  try {
    const client = await pool.connect();

    try {
      console.log('\n📦 NotificationHub Database Migration System');
      console.log('─'.repeat(50));

      // Create migrations table
      await createMigrationsTable(client);

      // Get executed and available migrations
      const executed = await getExecutedMigrations(client);
      const available = getMigrationFiles();

      // Find pending migrations
      const pending = available.filter(file => !executed.includes(file));

      if (pending.length === 0) {
        console.log('✓ All migrations are up to date');
      } else {
        console.log(`\nRunning ${pending.length} pending migration(s):\n`);

        for (const migrationFile of pending) {
          const filePath = path.join(__dirname, 'migrations', migrationFile);
          await executeMigration(client, filePath, migrationFile);
        }

        console.log('\n✓ All migrations completed successfully');
      }

      // Run seed data if requested
      if (seedData) {
        console.log('\n🌱 Loading seed data...\n');

        const seedDir = path.join(__dirname, 'seeds');
        if (fs.existsSync(seedDir)) {
          const seedFiles = fs
            .readdirSync(seedDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

          for (const seedFile of seedFiles) {
            const seedPath = path.join(seedDir, seedFile);
            try {
              const sql = fs.readFileSync(seedPath, 'utf8');
              
              const statements = sql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

              for (const statement of statements) {
                await client.query(statement);
              }

              console.log(`✓ Seed loaded: ${seedFile}`);
            } catch (err) {
              console.error(`✗ Seed failed: ${seedFile}`);
              console.error(`  Error: ${err.message}`);
            }
          }

          console.log('\n✓ Seed data loaded successfully');
        } else {
          console.log('✗ Seeds directory not found');
        }
      }

      console.log('\n' + '─'.repeat(50));
      console.log('✓ Database migration completed\n');

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n✗ Database migration failed');
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Show migration status
async function showStatus() {
  const config = getConnectionConfig();
  const pool = new Pool(config);

  try {
    const client = await pool.connect();

    try {
      console.log('\n📦 NotificationHub Database Migration Status');
      console.log('─'.repeat(50));

      await createMigrationsTable(client);

      const executed = await getExecutedMigrations(client);
      const available = getMigrationFiles();
      const pending = available.filter(file => !executed.includes(file));

      console.log(`\nTotal migrations: ${available.length}`);
      console.log(`Executed: ${executed.length}`);
      console.log(`Pending: ${pending.length}\n`);

      if (executed.length > 0) {
        console.log('Executed migrations:');
        executed.forEach(name => console.log(`  ✓ ${name}`));
      }

      if (pending.length > 0) {
        console.log('\nPending migrations:');
        pending.forEach(name => console.log(`  ○ ${name}`));
      }

      console.log('\n' + '─'.repeat(50) + '\n');

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n✗ Failed to get migration status');
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main CLI
const command = process.argv[2] || 'migrate';
const seedFlag = process.argv.includes('--seed');

switch (command) {
  case 'migrate':
    runMigrations(seedFlag).catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
    break;

  case 'status':
    showStatus().catch(err => {
      console.error('Status check failed:', err);
      process.exit(1);
    });
    break;

  default:
    console.log('Usage: node migrate.js [command] [options]');
    console.log('\nCommands:');
    console.log('  migrate     - Run pending migrations (default)');
    console.log('  status      - Show migration status');
    console.log('\nOptions:');
    console.log('  --seed      - Load seed data after migrations');
    console.log('\nEnvironment Variables:');
    console.log('  DATABASE_URL - PostgreSQL connection string');
    console.log('  DB_HOST      - Database host (default: localhost)');
    console.log('  DB_PORT      - Database port (default: 5432)');
    console.log('  DB_NAME      - Database name (default: notificationhub)');
    console.log('  DB_USER      - Database user (default: postgres)');
    console.log('  DB_PASSWORD  - Database password (default: empty)');
    process.exit(0);
}
