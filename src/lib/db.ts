import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;
let tablesInitialized = false;

export function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client pool:', err);
    });
  }

  return pool;
}

/**
 * Execute a parameterized query with connection pooling and automatic release.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPool();
  if (!p) {
    const { executeLocalQuery } = await import('./local-store');
    const localRes = await executeLocalQuery(text, params);
    return localRes as unknown as QueryResult<T>;
  }

  // Auto-verify/ensure tables on first query
  if (!tablesInitialized) {
    await ensureAuthTables();
    tablesInitialized = true;
  }

  const client = await p.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

/**
 * Ensures required authentication and session tables exist in PostgreSQL.
 * Safe and non-destructive.
 */
export async function ensureAuthTables(): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    const client = await p.connect();
    try {
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

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_users_class_section ON users(class_name, section);

        CREATE TABLE IF NOT EXISTS user_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY,
            page_title TEXT,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

        CREATE TABLE IF NOT EXISTS chat_messages (
            id BIGSERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            model_id TEXT,
            latency_ms INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_id ON chat_messages(session_id, id);
      `);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error ensuring auth tables exist (will retry):', err);
  }
}

export interface SaveExchangeParams {
  sessionId?: string | null;
  pageTitle?: string | null;
  userText: string;
  replyText: string;
  modelId?: string | null;
  latencyMs?: number | null;
  userId?: string | null;
}

/**
 * Persists a user message and assistant reply exchange to PostgreSQL.
 * Silently skips if DATABASE_URL is unset. Never throws errors.
 */
export async function saveExchange({
  sessionId,
  pageTitle,
  userText,
  replyText,
  modelId,
  latencyMs,
  userId,
}: SaveExchangeParams): Promise<void> {
  if (!sessionId) {
    return;
  }

  // If DATABASE_URL is unset, persist exchange to local store
  if (!process.env.DATABASE_URL) {
    try {
      const { getLocalDb, saveLocalDb } = await import('./local-store');
      const db = await getLocalDb();
      const existingSession = db.chat_sessions.find((s) => s.id === sessionId);
      if (existingSession) {
        if (pageTitle) existingSession.page_title = pageTitle;
        if (userId) existingSession.user_id = userId;
      } else {
        db.chat_sessions.push({
          id: sessionId,
          page_title: pageTitle ?? null,
          user_id: userId ?? null,
          created_at: new Date().toISOString(),
        });
      }

      db.chat_messages.push({
        id: db.chat_messages.length + 1,
        session_id: sessionId,
        role: 'user',
        content: userText,
        model_id: modelId ?? null,
        latency_ms: null,
        created_at: new Date().toISOString(),
      });

      db.chat_messages.push({
        id: db.chat_messages.length + 1,
        session_id: sessionId,
        role: 'assistant',
        content: replyText,
        model_id: modelId ?? null,
        latency_ms: latencyMs != null ? Math.round(latencyMs) : null,
        created_at: new Date().toISOString(),
      });

      saveLocalDb(db);
    } catch {}
    return;
  }

  try {
    const clientPool = getPool();
    if (!clientPool) {
      return;
    }

    const client = await clientPool.connect();
    try {
      await client.query('BEGIN');

      // Upsert the session, preserving/updating user_id if supplied
      const upsertSessionQuery = `
        INSERT INTO chat_sessions (id, page_title, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
        SET page_title = COALESCE(EXCLUDED.page_title, chat_sessions.page_title),
            user_id = COALESCE(EXCLUDED.user_id, chat_sessions.user_id);
      `;
      await client.query(upsertSessionQuery, [sessionId, pageTitle ?? null, userId ?? null]);

      // Insert user message
      const insertUserQuery = `
        INSERT INTO chat_messages (session_id, role, content, model_id, latency_ms)
        VALUES ($1, 'user', $2, $3, NULL);
      `;
      await client.query(insertUserQuery, [sessionId, userText, modelId ?? null]);

      // Insert assistant message
      const insertAssistantQuery = `
        INSERT INTO chat_messages (session_id, role, content, model_id, latency_ms)
        VALUES ($1, 'assistant', $2, $3, $4);
      `;
      await client.query(insertAssistantQuery, [
        sessionId,
        replyText,
        modelId ?? null,
        latencyMs != null ? Math.round(latencyMs) : null,
      ]);

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    // Catch and log error; NEVER throw
    console.error('Database saveExchange error (chat flow unaffected):', error);
  }
}
