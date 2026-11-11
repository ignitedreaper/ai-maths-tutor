import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession, getSessionCookieOptions, SafeUser } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please enter both username and password.' },
        { status: 400 }
      );
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const rateLimitKey = `login:${ip}:${normalizedUsername}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again in ${rateCheck.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Lookup user in PostgreSQL
    const res = await query(
      `SELECT id, student_name, class_name, section, username, password_hash, role, is_active, created_at
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [normalizedUsername]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const user = res.rows[0];

    // Check account status
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your school administrator.' },
        { status: 403 }
      );
    }

    // Verify password against stored hash
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateLimitKey);

    // Create session in PostgreSQL
    const { token } = await createSession(user.id);

    const safeUser: SafeUser = {
      id: user.id,
      student_name: user.student_name,
      class_name: user.class_name,
      section: user.section,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: new Date(user.created_at).toISOString(),
    };

    const redirectUrl = user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard';

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      redirectUrl,
    });

    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Login API Error:', error);
    const isDbMissing = error?.message?.includes('DATABASE_URL') || !process.env.DATABASE_URL;
    return NextResponse.json(
      {
        error: isDbMissing
          ? 'Database connection not configured. Please set DATABASE_URL in .env.local to enable login.'
          : 'Authentication failed due to a server error. Please try again.',
      },
      { status: 500 }
    );
  }
}
