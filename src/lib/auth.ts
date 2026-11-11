import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { query } from './db';

export type UserRole = 'ADMIN' | 'STUDENT';

export interface DbUserRow {
  id: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SafeUser {
  id: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export const SESSION_COOKIE_NAME = 'math_tutor_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Hash raw token with SHA-256 for secure database lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new cryptographically secure session for a user in PostgreSQL.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

/**
 * Verify a session token against the database and return safe user details.
 * Ensures the session has not expired and user account is active.
 */
export async function verifySessionToken(token: string): Promise<SafeUser | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const tokenHash = hashToken(token);

  try {
    const res = await query<DbUserRow>(
      `SELECT u.id, u.student_name, u.class_name, u.section, u.username, u.role, u.is_active, u.created_at, u.updated_at
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND u.is_active = TRUE
       LIMIT 1`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      student_name: row.student_name,
      class_name: row.class_name,
      section: row.section,
      username: row.username,
      role: row.role,
      is_active: row.is_active,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  } catch (err) {
    console.error('Error verifying session token in database:', err);
    return null;
  }
}

/**
 * Invalidate a single session (e.g., on logout).
 */
export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  try {
    await query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
  } catch (err) {
    console.error('Error invalidating session:', err);
  }
}

/**
 * Revoke all sessions for a specific user (e.g. upon deactivation or password reset).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId]);
  } catch (err) {
    console.error('Error revoking user sessions:', err);
  }
}

/**
 * Retrieves the current authenticated user from session cookies in Server Components / Route Handlers.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return await verifySessionToken(token);
  } catch (err) {
    // If cookies() is called outside of request context
    return null;
  }
}

/**
 * Require any authenticated user. Redirects to /login if unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Require an authenticated ADMIN. Redirects to /login if unauthenticated or /student/dashboard if not an admin.
 */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'ADMIN') {
    redirect('/student/dashboard');
  }
  return user;
}

/**
 * Require an authenticated STUDENT. Redirects to /login if unauthenticated or /admin/dashboard if not a student.
 */
export async function requireStudent(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'STUDENT') {
    redirect('/admin/dashboard');
  }
  return user;
}
