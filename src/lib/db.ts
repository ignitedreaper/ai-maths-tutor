import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 3,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

export interface SaveExchangeParams {
  sessionId?: string | null;
  pageTitle?: string | null;
  userText: string;
  replyText: string;
  modelId?: string | null;
  latencyMs?: number | null;
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
}: SaveExchangeParams): Promise<void> {
  // If DATABASE_URL is unset or sessionId is missing, silently skip persistence
  if (!process.env.DATABASE_URL || !sessionId) {
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

      // Upsert the session
      const upsertSessionQuery = `
        INSERT INTO chat_sessions (id, page_title)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE
        SET page_title = COALESCE(EXCLUDED.page_title, chat_sessions.page_title);
      `;
      await client.query(upsertSessionQuery, [sessionId, pageTitle ?? null]);

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
