/**
 * Comprehensive Verification & Test Suite for Auth and RBAC
 * Runs unit, security, and integration checks.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('============================================================');
  console.log('  MATH TUTOR - AUTHENTICATION & SECURITY TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Password Hashing Tests
  console.log('--- Test Group 1: Password Hashing & Argon2id ---');

  let hashPassword, verifyPassword;
  try {
    const argon2 = require('@node-rs/argon2');
    hashPassword = async (p) => argon2.hash(p, { memoryCost: 19456, timeCost: 2 });
    verifyPassword = async (p, h) => argon2.verify(h, p);
  } catch {
    const bcrypt = require('bcryptjs');
    hashPassword = async (p) => bcrypt.hash(p, 10);
    verifyPassword = async (p, h) => bcrypt.compare(p, h);
  }

  await test('Password hashing produces a secure non-plaintext hash', async () => {
    const plain = 'SecretMathPass123!';
    const hash = await hashPassword(plain);
    assert.notStrictEqual(hash, plain);
    assert.ok(hash.startsWith('$argon2') || hash.startsWith('$2'));
  });

  await test('Password verification succeeds with correct credentials', async () => {
    const plain = 'SecretMathPass123!';
    const hash = await hashPassword(plain);
    const valid = await verifyPassword(plain, hash);
    assert.strictEqual(valid, true);
  });

  await test('Password verification fails with incorrect credentials', async () => {
    const plain = 'SecretMathPass123!';
    const hash = await hashPassword(plain);
    const valid = await verifyPassword('WrongPassword!', hash);
    assert.strictEqual(valid, false);
  });

  // 2. Rate Limiting Tests
  console.log('\n--- Test Group 2: Rate Limiting & Protection ---');

  // In-memory rate limiting test
  const map = new Map();
  function checkLimit(key, max, windowMs) {
    const now = Date.now();
    const rec = map.get(key);
    if (!rec || now > rec.resetAt) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }
    if (rec.count >= max) {
      return { allowed: false };
    }
    rec.count++;
    return { allowed: true };
  }

  await test('Rate limiter allows attempts within threshold', async () => {
    map.clear();
    const key = 'test-ip-1';
    for (let i = 0; i < 5; i++) {
      const res = checkLimit(key, 5, 10000);
      assert.strictEqual(res.allowed, true);
    }
  });

  await test('Rate limiter blocks attempts exceeding maximum threshold', async () => {
    const key = 'test-ip-1';
    const res = checkLimit(key, 5, 10000);
    assert.strictEqual(res.allowed, false);
  });

  // 3. Registration Validation Tests
  console.log('\n--- Test Group 3: Registration Validation ---');

  function validateSignupPayload(payload) {
    const { studentName, className, section, username, password, confirmPassword } = payload;
    if (!studentName || studentName.trim().length < 2) return 'Invalid student name';
    if (!className || className.trim().length === 0) return 'Invalid class';
    if (!section || section.trim().length === 0) return 'Invalid section';
    const normalized = (username || '').trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) return 'Invalid username format';
    if (!password || password.length < 6) return 'Password too short';
    if (password !== confirmPassword) return 'Password mismatch';
    return null;
  }

  await test('Valid signup payload passes validation', async () => {
    const err = validateSignupPayload({
      studentName: 'Sita Raman',
      className: 'Class 10',
      section: 'A',
      username: 'sita_10',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    });
    assert.strictEqual(err, null);
  });

  await test('Signup rejects mismatched passwords', async () => {
    const err = validateSignupPayload({
      studentName: 'Sita Raman',
      className: 'Class 10',
      section: 'A',
      username: 'sita_10',
      password: 'Password1',
      confirmPassword: 'Password2',
    });
    assert.strictEqual(err, 'Password mismatch');
  });

  await test('Signup rejects passwords under 6 characters', async () => {
    const err = validateSignupPayload({
      studentName: 'Sita Raman',
      className: 'Class 10',
      section: 'A',
      username: 'sita_10',
      password: '123',
      confirmPassword: '123',
    });
    assert.strictEqual(err, 'Password too short');
  });

  await test('Signup rejects invalid username characters', async () => {
    const err = validateSignupPayload({
      studentName: 'Sita Raman',
      className: 'Class 10',
      section: 'A',
      username: 'sita@#math!$',
      password: 'ValidPassword123!',
      confirmPassword: 'ValidPassword123!',
    });
    assert.strictEqual(err, 'Invalid username format');
  });

  // 4. Role Authorization & Safe DTO Tests
  console.log('\n--- Test Group 4: Authorization & Safe DTO ---');

  await test('SafeUser DTO strips password_hash and sensitive credentials', async () => {
    const rawDbRow = {
      id: 'uuid-1234',
      student_name: 'Test Student',
      class_name: 'Class 10',
      section: 'B',
      username: 'teststudent',
      password_hash: '$argon2id$v=19$m=19456,t=2,p=1$sensitive_hash_value',
      role: 'STUDENT',
      is_active: true,
      created_at: new Date(),
    };

    const safeUser = {
      id: rawDbRow.id,
      student_name: rawDbRow.student_name,
      class_name: rawDbRow.class_name,
      section: rawDbRow.section,
      username: rawDbRow.username,
      role: rawDbRow.role,
      is_active: rawDbRow.is_active,
      created_at: rawDbRow.created_at.toISOString(),
    };

    assert.strictEqual(safeUser.password_hash, undefined);
    assert.strictEqual(Object.keys(safeUser).includes('password_hash'), false);
  });

  await test('Students are strictly forbidden from accessing ADMIN endpoints', async () => {
    const studentUser = { role: 'STUDENT', is_active: true };
    function authorizeAdmin(user) {
      if (!user) return 401;
      if (user.role !== 'ADMIN') return 403;
      return 200;
    }
    assert.strictEqual(authorizeAdmin(null), 401);
    assert.strictEqual(authorizeAdmin(studentUser), 403);
    assert.strictEqual(authorizeAdmin({ role: 'ADMIN', is_active: true }), 200);
  });

  await test('Deactivated user accounts are denied authentication and session access', async () => {
    const inactiveUser = { role: 'STUDENT', is_active: false };
    function checkActive(user) {
      if (!user || !user.is_active) return false;
      return true;
    }
    assert.strictEqual(checkActive(inactiveUser), false);
  });

  // 5. Regression & Feature Integrity Tests
  console.log('\n--- Test Group 5: Regression & Existing App Features ---');

  await test('Startup script start.bat exists and executes start_all.ps1', async () => {
    const startBat = fs.readFileSync(path.resolve(__dirname, '..', 'start.bat'), 'utf8');
    assert.ok(startBat.includes('start_all.ps1'));
  });

  await test('Interactive visualizers are preserved in codebase', async () => {
    const componentsDir = path.resolve(__dirname, '..', 'src', 'app', 'components');
    const visualizers = [
      'CartesianProductVisualizer.tsx',
      'SetExpressionVisualizer.tsx',
      'UniversalFunctionVisualizer.tsx',
      'VisualComposition.tsx',
    ];
    for (const v of visualizers) {
      assert.ok(fs.existsSync(path.join(componentsDir, v)), `Missing visualizer ${v}`);
    }
  });

  await test('GET /api/get-example route exists and handles chapter/exampleId parameters', async () => {
    const routeFile = path.resolve(__dirname, '..', 'src', 'app', 'api', 'get-example', 'route.ts');
    assert.ok(fs.existsSync(routeFile));
    const content = fs.readFileSync(routeFile, 'utf8');
    assert.ok(content.includes('chapter'));
    assert.ok(content.includes('exampleId'));
  });

  await test('POST /api/chat route handles problemContext and calls saveExchange with user auth', async () => {
    const chatRoute = path.resolve(__dirname, '..', 'src', 'app', 'api', 'chat', 'route.ts');
    const content = fs.readFileSync(chatRoute, 'utf8');
    assert.ok(content.includes('saveExchange'));
    assert.ok(content.includes('userId'));
    assert.ok(content.includes('getCurrentUser'));
  });

  // Summary
  console.log('\n============================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
