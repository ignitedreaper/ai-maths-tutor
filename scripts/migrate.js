/**
 * Database Migration Script
 * Runs incremental migrations safely against PostgreSQL.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

async function runMigration() {
  loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️  DATABASE_URL environment variable is not set. Skipping migration.');
    console.warn('   To run migrations, set DATABASE_URL in .env.local');
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    try {
      const migrationFile = path.resolve(__dirname, '..', 'db', 'migrations', '001_auth_tables.sql');
      const sql = fs.readFileSync(migrationFile, 'utf8');

      console.log('🚀 Running migration: 001_auth_tables.sql...');
      await client.query(sql);
      console.log('✅ Migration executed successfully! Users and User Sessions tables are ready.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
