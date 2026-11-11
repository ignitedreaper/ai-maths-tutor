/**
 * Secure Administrator Initialization Script
 * Provisions or rotates the primary administrator account in PostgreSQL.
 *
 * Usage:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=YourSecurePassword123! npm run seed:admin
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
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

// 2. Hash password using Argon2id or bcrypt
async function hashAdminPassword(password) {
  try {
    const argon2 = require('@node-rs/argon2');
    return await argon2.hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  } catch (e) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, 12);
  }
}

async function seedAdmin() {
  loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set. Please specify DATABASE_URL in .env.local');
    process.exit(1);
  }

  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'System Administrator';

  if (password.length < 8) {
    console.error('❌ Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔄 Connecting to PostgreSQL database...');
    const client = await pool.connect();

    try {
      // Ensure users table exists first
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            student_name TEXT,
            class_name TEXT,
            section TEXT,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STUDENT')),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      console.log('🔐 Hashing administrator password with Argon2id...');
      const passwordHash = await hashAdminPassword(password);

      // Check if admin already exists
      const existing = await client.query(
        'SELECT id, role, is_active FROM users WHERE username = $1 LIMIT 1',
        [username]
      );

      if (existing.rows.length > 0) {
        console.log(`ℹ️  Admin username "${username}" already exists. Updating credentials & ensuring active status...`);
        await client.query(
          `UPDATE users 
           SET password_hash = $1, role = 'ADMIN', is_active = TRUE, student_name = $2, updated_at = NOW()
           WHERE username = $3`,
          [passwordHash, name, username]
        );
        console.log(`✅ Administrator "${username}" updated and activated successfully!`);
      } else {
        console.log(`🚀 Creating new administrator account "${username}"...`);
        await client.query(
          `INSERT INTO users (student_name, username, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'ADMIN', TRUE)`,
          [name, username, passwordHash]
        );
        console.log(`✅ Administrator "${username}" provisioned successfully!`);
      }

      console.log('------------------------------------------------------------');
      console.log(`  Role:     ADMIN`);
      console.log(`  Username: ${username}`);
      console.log(`  Password: [PROTECTED - Not displayed in logs]`);
      console.log('------------------------------------------------------------');
      console.log('You can now log in at /login with these credentials.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Failed to seed administrator:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
