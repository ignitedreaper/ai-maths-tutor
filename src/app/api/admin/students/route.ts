import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const className = searchParams.get('class')?.trim() || '';
    const section = searchParams.get('section')?.trim() || '';
    const status = searchParams.get('status')?.trim().toLowerCase() || 'all'; // all, active, inactive
    const sortByParam = searchParams.get('sortBy')?.trim().toLowerCase() || 'created_at';
    const sortOrderParam = searchParams.get('sortOrder')?.trim().toUpperCase() || 'DESC';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    // Build parameterized conditions
    const conditions: string[] = ["role = 'STUDENT'"];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(student_name ILIKE $${params.length} OR username ILIKE $${params.length})`);
    }

    if (className) {
      params.push(className);
      conditions.push(`class_name = $${params.length}`);
    }

    if (section) {
      params.push(section);
      conditions.push(`section = $${params.length}`);
    }

    if (status === 'active') {
      conditions.push(`is_active = TRUE`);
    } else if (status === 'inactive') {
      conditions.push(`is_active = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Safe Sort Field mapping
    const sortField = sortByParam === 'name' ? 'student_name' : 'created_at';
    const sortOrder = sortOrderParam === 'ASC' ? 'ASC' : 'DESC';

    // 1. Get total count
    const countSql = `SELECT COUNT(*)::int AS total FROM users ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // 2. Get paginated results
    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT id, student_name, class_name, section, username, role, is_active, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder} NULLS LAST
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;

    const dataRes = await query(dataSql, dataParams);

    const students = dataRes.rows.map((r) => ({
      id: r.id,
      student_name: r.student_name,
      class_name: r.class_name,
      section: r.section,
      username: r.username,
      role: r.role,
      is_active: r.is_active,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      students,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error: any) {
    console.error('Admin Students API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve students list.' },
      { status: 500 }
    );
  }
}
