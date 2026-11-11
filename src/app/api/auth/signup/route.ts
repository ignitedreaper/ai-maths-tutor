import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateCheck = checkRateLimit(`signup:${ip}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { studentName, className, section, username, password, confirmPassword } = body;

    // 1. Validation
    if (!studentName || typeof studentName !== 'string' || studentName.trim().length < 2) {
      return NextResponse.json({ error: 'Please enter a valid student full name (at least 2 characters).' }, { status: 400 });
    }

    if (!className || typeof className !== 'string' || className.trim().length === 0) {
      return NextResponse.json({ error: 'Please specify the class (e.g., Class 10).' }, { status: 400 });
    }

    if (!section || typeof section !== 'string' || section.trim().length === 0) {
      return NextResponse.json({ error: 'Please specify the section (e.g., A).' }, { status: 400 });
    }

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid username.' }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(normalizedUsername)) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match. Please re-enter your password.' },
        { status: 400 }
      );
    }

    // 2. Check for duplicate username
    const existing = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [normalizedUsername]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another username.' },
        { status: 409 }
      );
    }

    // 3. Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // 4. Insert student into database (Always assign STUDENT role, never allow privilege escalation)
    await query(
      `INSERT INTO users (student_name, class_name, section, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'STUDENT', TRUE)`,
      [
        studentName.trim(),
        className.trim(),
        section.trim().toUpperCase(),
        normalizedUsername,
        passwordHash,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! You can now log in with your credentials.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API Error:', error);
    if (error.code === '23505') {
      // Postgres unique_violation
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another username.' },
        { status: 409 }
      );
    }
    const isDbMissing = error?.message?.includes('DATABASE_URL') || !process.env.DATABASE_URL;
    return NextResponse.json(
      {
        error: isDbMissing
          ? 'Database connection not configured. Please set DATABASE_URL in .env.local to enable registration.'
          : 'Registration failed due to a server error. Please try again.',
      },
      { status: 500 }
    );
  }
}
