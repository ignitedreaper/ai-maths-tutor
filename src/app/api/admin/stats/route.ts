import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    // Run real database aggregate metrics
    const statsRes = await query(`
      SELECT 
        COUNT(*)::int AS total_accounts,
        COUNT(*) FILTER (WHERE role = 'STUDENT')::int AS total_students,
        COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS total_admins,
        COUNT(*) FILTER (WHERE role = 'STUDENT' AND is_active = true)::int AS active_students,
        COUNT(*) FILTER (WHERE role = 'STUDENT' AND is_active = false)::int AS inactive_students
      FROM users;
    `);

    // Fetch distinct classes & sections for filter controls
    const classesRes = await query(`
      SELECT DISTINCT class_name 
      FROM users 
      WHERE class_name IS NOT NULL AND role = 'STUDENT'
      ORDER BY class_name ASC;
    `);

    const sectionsRes = await query(`
      SELECT DISTINCT section 
      FROM users 
      WHERE section IS NOT NULL AND role = 'STUDENT'
      ORDER BY section ASC;
    `);

    const stats = statsRes.rows[0] || {
      total_accounts: 0,
      total_students: 0,
      total_admins: 0,
      active_students: 0,
      inactive_students: 0,
    };

    return NextResponse.json({
      stats,
      availableClasses: classesRes.rows.map((r) => r.class_name),
      availableSections: sectionsRes.rows.map((r) => r.section),
    });
  } catch (error: any) {
    console.error('Admin Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve administrative statistics.' },
      { status: 500 }
    );
  }
}
