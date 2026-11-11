import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { invalidateSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await invalidateSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout API Error:', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
