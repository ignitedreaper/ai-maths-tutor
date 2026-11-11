import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword } from './password';

export interface LocalUser {
  id: string;
  student_name: string | null;
  class_name: string | null;
  section: string | null;
  username: string;
  password_hash: string;
  role: 'ADMIN' | 'STUDENT';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface LocalChatSession {
  id: string;
  page_title: string | null;
  user_id: string | null;
  created_at: string;
}

export interface LocalChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_id: string | null;
  latency_ms: number | null;
  created_at: string;
}

interface LocalDatabase {
  users: LocalUser[];
  sessions: LocalSession[];
  chat_sessions: LocalChatSession[];
  chat_messages: LocalChatMessage[];
}

const STORE_PATH = path.resolve(process.cwd(), 'db', 'local_store.json');

let inMemoryDb: LocalDatabase | null = null;
let initPromise: Promise<void> | null = null;

async function initializeDefaultData(): Promise<LocalDatabase> {
  const adminHash = await hashPassword('Admin@123');
  const studentHash = await hashPassword('Student@123');

  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'admin-0000-0000-0000-000000000001',
        student_name: 'System Administrator',
        class_name: null,
        section: null,
        username: 'admin',
        password_hash: adminHash,
        role: 'ADMIN',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'student-0000-0000-0000-000000000001',
        student_name: 'Manoj Kumar',
        class_name: 'Class 10',
        section: 'A',
        username: 'manoj',
        password_hash: studentHash,
        role: 'STUDENT',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'student-0000-0000-0000-000000000002',
        student_name: 'Priya Sharma',
        class_name: 'Class 10',
        section: 'B',
        username: 'priya',
        password_hash: studentHash,
        role: 'STUDENT',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'student-0000-0000-0000-000000000003',
        student_name: 'Rahul Verma',
        class_name: 'Class 10',
        section: 'A',
        username: 'rahul',
        password_hash: studentHash,
        role: 'STUDENT',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'student-0000-0000-0000-000000000004',
        student_name: 'Ananya Patel',
        class_name: 'Class 10',
        section: 'C',
        username: 'ananya',
        password_hash: studentHash,
        role: 'STUDENT',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    sessions: [],
    chat_sessions: [],
    chat_messages: [],
  };
}

export async function getLocalDb(): Promise<LocalDatabase> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      if (!data.users) data.users = [];
      if (!data.sessions) data.sessions = [];
      if (!data.chat_sessions) data.chat_sessions = [];
      if (!data.chat_messages) data.chat_messages = [];
      return data;
    }
  } catch (err) {
    console.warn('Could not read existing local store:', err);
  }

  const initial = await initializeDefaultData();
  saveLocalDb(initial);
  return initial;
}

export function saveLocalDb(db: LocalDatabase): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local database store:', err);
  }
}

/**
 * Executes a simulated query against the local persistent store.
 */
export async function executeLocalQuery(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  const db = await getLocalDb();
  const trimmed = text.trim();

  // 1. SELECT user by username
  if (/FROM\s+users\s+WHERE\s+username\s*=\s*\$1/i.test(trimmed)) {
    const username = String(params[0] || '').trim().toLowerCase();
    const user = db.users.find((u) => u.username.toLowerCase() === username);
    return { rows: user ? [{ ...user }] : [] };
  }

  // 2. SELECT user by ID
  if (/FROM\s+users\s+WHERE\s+id\s*=\s*\$1/i.test(trimmed)) {
    const id = String(params[0]);
    const user = db.users.find((u) => u.id === id);
    return { rows: user ? [{ ...user }] : [] };
  }

  // 3. SELECT count other active admins
  if (/COUNT\(\*\)::int\s+AS\s+count\s+FROM\s+users\s+WHERE\s+role\s*=\s*'ADMIN'/i.test(trimmed)) {
    const excludeId = params[0];
    const count = db.users.filter((u) => u.role === 'ADMIN' && u.is_active && u.id !== excludeId).length;
    return { rows: [{ count }] };
  }

  // 4. INSERT INTO users
  if (/INSERT\s+INTO\s+users/i.test(trimmed)) {
    const [name, className, section, username, passwordHash] = params;
    const now = new Date().toISOString();
    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      student_name: name || null,
      class_name: className || 'Class 10',
      section: section || 'A',
      username: String(username).trim().toLowerCase(),
      password_hash: passwordHash,
      role: 'STUDENT',
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    db.users.push(newUser);
    saveLocalDb(db);
    return { rows: [{ ...newUser }] };
  }

  // 5. UPDATE users
  if (/UPDATE\s+users\s+SET/i.test(trimmed)) {
    const targetId = params[params.length - 1];
    const user = db.users.find((u) => u.id === targetId);
    if (!user) {
      return { rows: [] };
    }

    // Inspect updates
    let pIdx = 0;
    if (trimmed.includes('student_name = $')) {
      user.student_name = params[pIdx++];
    }
    if (trimmed.includes('class_name = $')) {
      user.class_name = params[pIdx++];
    }
    if (trimmed.includes('section = $')) {
      user.section = params[pIdx++];
    }
    if (trimmed.includes('is_active = $')) {
      user.is_active = Boolean(params[pIdx++]);
    }
    user.updated_at = new Date().toISOString();

    saveLocalDb(db);
    return { rows: [{ ...user }] };
  }

  // 6. INSERT INTO user_sessions
  if (/INSERT\s+INTO\s+user_sessions/i.test(trimmed)) {
    const [userId, tokenHash, expiresAt] = params;
    const newSession: LocalSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAt).toISOString(),
      created_at: new Date().toISOString(),
    };
    db.sessions.push(newSession);
    saveLocalDb(db);
    return { rows: [{ ...newSession }] };
  }

  // 7. Verify session token (JOIN user_sessions and users)
  if (
    trimmed.includes('user_sessions') &&
    (trimmed.includes('JOIN users') || trimmed.includes('users u')) &&
    trimmed.includes('token_hash')
  ) {
    const tokenHash = params[0];
    const now = Date.now();
    const session = db.sessions.find(
      (s) => s.token_hash === tokenHash && new Date(s.expires_at).getTime() > now
    );
    if (!session) {
      return { rows: [] };
    }
    const user = db.users.find((u) => u.id === session.user_id && Boolean(u.is_active));
    if (!user) {
      return { rows: [] };
    }
    return {
      rows: [
        {
          id: user.id,
          student_name: user.student_name,
          class_name: user.class_name,
          section: user.section,
          username: user.username,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      ],
    };
  }

  // 8. DELETE FROM user_sessions WHERE token_hash
  if (/DELETE\s+FROM\s+user_sessions\s+WHERE\s+token_hash\s*=\s*\$1/i.test(trimmed)) {
    const tokenHash = params[0];
    db.sessions = db.sessions.filter((s) => s.token_hash !== tokenHash);
    saveLocalDb(db);
    return { rows: [] };
  }

  // 9. DELETE FROM user_sessions WHERE user_id
  if (/DELETE\s+FROM\s+user_sessions\s+WHERE\s+user_id\s*=\s*\$1/i.test(trimmed)) {
    const userId = params[0];
    db.sessions = db.sessions.filter((s) => s.user_id !== userId);
    saveLocalDb(db);
    return { rows: [] };
  }

  // 10. Admin Stats: aggregate queries
  if (/SELECT\s+COUNT\(\*\)::int\s+AS\s+total_accounts/i.test(trimmed)) {
    const total_accounts = db.users.length;
    const total_students = db.users.filter((u) => u.role === 'STUDENT').length;
    const total_admins = db.users.filter((u) => u.role === 'ADMIN').length;
    const active_students = db.users.filter((u) => u.role === 'STUDENT' && u.is_active).length;
    const inactive_students = db.users.filter((u) => u.role === 'STUDENT' && !u.is_active).length;

    return {
      rows: [
        {
          total_accounts,
          total_students,
          total_admins,
          active_students,
          inactive_students,
        },
      ],
    };
  }

  // 11. Distinct classes
  if (/SELECT\s+DISTINCT\s+class_name\s+FROM\s+users/i.test(trimmed)) {
    const classes = Array.from(
      new Set(
        db.users
          .filter((u) => u.role === 'STUDENT' && u.class_name)
          .map((u) => u.class_name!)
      )
    ).sort();
    return { rows: classes.map((c) => ({ class_name: c })) };
  }

  // 12. Distinct sections
  if (/SELECT\s+DISTINCT\s+section\s+FROM\s+users/i.test(trimmed)) {
    const sections = Array.from(
      new Set(
        db.users
          .filter((u) => u.role === 'STUDENT' && u.section)
          .map((u) => u.section!)
      )
    ).sort();
    return { rows: sections.map((s) => ({ section: s })) };
  }

  // 13. Student listing & count queries
  if (/FROM\s+users/i.test(trimmed)) {
    // Filter students
    let filtered = db.users.filter((u) => u.role === 'STUDENT');

    // Parse filters
    params.forEach((p) => {
      if (typeof p === 'string' && p.startsWith('%') && p.endsWith('%')) {
        const query = p.slice(1, -1).toLowerCase();
        filtered = filtered.filter(
          (u) =>
            (u.student_name && u.student_name.toLowerCase().includes(query)) ||
            u.username.toLowerCase().includes(query)
        );
      }
    });

    if (trimmed.includes('is_active = TRUE')) {
      filtered = filtered.filter((u) => u.is_active === true);
    } else if (trimmed.includes('is_active = FALSE')) {
      filtered = filtered.filter((u) => u.is_active === false);
    }

    // Check count query
    if (/SELECT\s+COUNT\(\*\)::int\s+AS\s+total/i.test(trimmed)) {
      return { rows: [{ total: filtered.length }] };
    }

    // Check sort
    if (/ORDER\s+BY\s+student_name/i.test(trimmed)) {
      filtered.sort((a, b) =>
        trimmed.includes('DESC')
          ? (b.student_name || '').localeCompare(a.student_name || '')
          : (a.student_name || '').localeCompare(b.student_name || '')
      );
    } else {
      // Default created_at sort
      filtered.sort((a, b) =>
        trimmed.includes('ASC')
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Pagination LIMIT & OFFSET
    const limit = params[params.length - 2] || 10;
    const offset = params[params.length - 1] || 0;
    const pageRows = filtered.slice(offset, offset + limit);

    return { rows: pageRows.map((u) => ({ ...u })) };
  }

  return { rows: [] };
}
