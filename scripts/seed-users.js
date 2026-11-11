/**
 * Seed Script: Admin and Sample Students
 * Provisions the administrator and sample student accounts into PostgreSQL.
 *
 * Usage:
 *   npm run seed:users
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables
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
async function hashUserPassword(password) {
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

const accountsToSeed = [
  // Administrator
  {
    role: 'ADMIN',
    name: 'System Administrator',
    className: null,
    section: null,
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
  // Sample Students
  {
    role: 'STUDENT',
    name: 'Manoj Kumar',
    className: 'Class 10',
    section: 'A',
    username: 'manoj',
    password: 'Student@123',
  },
  {
    role: 'STUDENT',
    name: 'Priya Sharma',
    className: 'Class 10',
    section: 'B',
    username: 'priya',
    password: 'Student@123',
  },
  {
    role: 'STUDENT',
    name: 'Rahul Verma',
    className: 'Class 10',
    section: 'A',
    username: 'rahul',
    password: 'Student@123',
  },
  {
    role: 'STUDENT',
    name: 'Ananya Patel',
    className: 'Class 10',
    section: 'C',
    username: 'ananya',
    password: 'Student@123',
  },
];

async function seed() {
  loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('ℹ️  DATABASE_URL is not set in .env.local.');
    console.log('🚀 Seeding accounts directly into local development store (db/local_store.json)...\n');

    const storePath = path.resolve(__dirname, '..', 'db', 'local_store.json');
    let localDb = { users: [], sessions: [], chat_sessions: [], chat_messages: [] };
    if (fs.existsSync(storePath)) {
      try {
        localDb = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      } catch {}
    }

    const now = new Date().toISOString();
    for (const acc of accountsToSeed) {
      const hash = await hashUserPassword(acc.password);
      const existing = localDb.users.find((u) => u.username.toLowerCase() === acc.username.toLowerCase());
      if (existing) {
        existing.student_name = acc.name;
        existing.class_name = acc.className;
        existing.section = acc.section;
        existing.password_hash = hash;
        existing.role = acc.role;
        existing.is_active = true;
        existing.updated_at = now;
        console.log(`  Updated: [${acc.role}] ${acc.username} (${acc.name})`);
      } else {
        localDb.users.push({
          id: `${acc.role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          student_name: acc.name,
          class_name: acc.className,
          section: acc.section,
          username: acc.username,
          password_hash: hash,
          role: acc.role,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        console.log(`  Created: [${acc.role}] ${acc.username} (${acc.name})`);
      }
    }

    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(localDb, null, 2), 'utf8');

    console.log('\n============================================================');
    console.log('  LOCAL ACCOUNTS READY (ZERO DATABASE CONFIGURATION NEEDED)');
    console.log('============================================================');
    accountsToSeed.forEach((acc) => {
      console.log(`  • [${acc.role}] Username: ${acc.username.padEnd(8)} | Password: ${acc.password} | Name: ${acc.name}`);
    });
    console.log('============================================================');
    console.log('You can now log in at /login with any of these accounts!\n');
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
      // Ensure users table exists
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

      console.log('🚀 Seeding users into PostgreSQL...\n');

      for (const acc of accountsToSeed) {
        const hash = await hashUserPassword(acc.password);
        const existing = await client.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [acc.username]);

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE users 
             SET student_name = $1, class_name = $2, section = $3, password_hash = $4, role = $5, is_active = TRUE, updated_at = NOW()
             WHERE username = $6`,
            [acc.name, acc.className, acc.section, hash, acc.role, acc.username]
          );
          console.log(`  Updated: [${acc.role}] ${acc.username} (${acc.name})`);
        } else {
          await client.query(
            `INSERT INTO users (student_name, class_name, section, username, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
            [acc.name, acc.className, acc.section, acc.username, hash, acc.role]
          );
          console.log(`  Created: [${acc.role}] ${acc.username} (${acc.name})`);
        }
      }

      console.log('\n============================================================');
      console.log('  ACCOUNTS SEEDED SUCCESSFULLY');
      console.log('============================================================');
      accountsToSeed.forEach((acc) => {
        console.log(`  • Role: ${acc.role.padEnd(8)} | Username: ${acc.username.padEnd(8)} | Password: ${acc.password} | Name: ${acc.name}`);
      });
      console.log('============================================================');
      console.log('You can now log in at /login with any of these accounts.\n');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Failed to seed accounts:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
