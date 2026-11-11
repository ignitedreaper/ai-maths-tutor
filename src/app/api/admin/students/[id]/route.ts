import { NextResponse } from 'next/server';
import { getCurrentUser, revokeAllUserSessions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await context.params;

    const res = await query(
      `SELECT id, student_name, class_name, section, username, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const r = res.rows[0];
    const student = {
      id: r.id,
      student_name: r.student_name,
      class_name: r.class_name,
      section: r.section,
      username: r.username,
      role: r.role,
      is_active: r.is_active,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    };

    return NextResponse.json({ student });
  } catch (error: any) {
    console.error('Admin Student Detail GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve student profile.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Check if target user exists
    const targetRes = await query(
      `SELECT id, role, is_active FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (targetRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetUser = targetRes.rows[0];

    // Check for disallowed fields to prevent privilege escalation
    if ('role' in body || 'password' in body || 'password_hash' in body || 'username' in body) {
      return NextResponse.json(
        { error: 'Modifying role, username, or credentials is strictly prohibited.' },
        { status: 400 }
      );
    }

    // Safety: If deactivating an ADMIN, ensure at least one other active admin remains
    if (body.is_active === false && targetUser.role === 'ADMIN') {
      const adminCountRes = await query(
        `SELECT COUNT(*)::int AS count FROM users WHERE role = 'ADMIN' AND is_active = TRUE AND id != $1`,
        [id]
      );
      const remainingAdmins = adminCountRes.rows[0]?.count || 0;
      if (remainingAdmins < 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last active administrator account.' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (typeof body.student_name === 'string') {
      values.push(body.student_name.trim());
      updates.push(`student_name = $${values.length}`);
    }

    if (typeof body.class_name === 'string') {
      values.push(body.class_name.trim());
      updates.push(`class_name = $${values.length}`);
    }

    if (typeof body.section === 'string') {
      values.push(body.section.trim().toUpperCase());
      updates.push(`section = $${values.length}`);
    }

    if (typeof body.is_active === 'boolean') {
      values.push(body.is_active);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update.' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateSql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, student_name, class_name, section, username, role, is_active, created_at, updated_at;
    `;

    const updateRes = await query(updateSql, values);
    const updated = updateRes.rows[0];

    // If account was deactivated, revoke all active sessions immediately
    if (body.is_active === false) {
      await revokeAllUserSessions(id);
    }

    return NextResponse.json({
      success: true,
      message: 'Account details updated successfully.',
      student: {
        id: updated.id,
        student_name: updated.student_name,
        class_name: updated.class_name,
        section: updated.section,
        username: updated.username,
        role: updated.role,
        is_active: updated.is_active,
        created_at: new Date(updated.created_at).toISOString(),
        updated_at: new Date(updated.updated_at).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin Student Detail PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update student profile.' }, { status: 500 });
  }
}
