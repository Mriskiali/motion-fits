import { createClient, Client } from '@libsql/client/web';

const url = process.env.EXPO_PUBLIC_TURSO_DATABASE_URL;
const authToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

let clientInstance: Client | null = null;

let hasWarnedExpired = false;

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    let binary = '';
    if (typeof atob === 'function') {
      binary = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      binary = Buffer.from(base64, 'base64').toString('binary');
    }

    if (!binary) return false;
    const json = JSON.parse(binary);
    if (typeof json.exp === 'number') {
      const expired = Date.now() / 1000 > json.exp;
      if (expired && !hasWarnedExpired) {
        hasWarnedExpired = true;
        console.warn(
          `[Turso] Token autentikasi kedaluwarsa sejak ${new Date(json.exp * 1000).toLocaleString()}. Cloud sync dinonaktifkan sementara. Silakan buat token baru di dashboard Turso (tanpa masa kedaluwarsa) dan perbarui EXPO_PUBLIC_TURSO_AUTH_TOKEN di .env.local.`
        );
      }
      return expired;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks whether Turso database URL and Auth Token are provided and valid
 */
export const isTursoConfigured = (): boolean => {
  if (
    !url ||
    !authToken ||
    (!url.startsWith('libsql://') && !url.startsWith('https://')) ||
    url.includes('[your-db-name]') ||
    authToken.includes('[your-')
  ) {
    return false;
  }

  // If token is expired, treat as not configured so it gracefully falls back to local storage
  if (isTokenExpired(authToken)) {
    // Drop any cached client so a refreshed token gets a fresh instance next time
    clientInstance = null;
    return false;
  }

  return true;
};

/**
 * Returns singleton instance of Turso libSQL web client
 */
export const getTursoClient = (): Client | null => {
  if (!isTursoConfigured()) {
    // Token/url invalid/expired: reset singleton so it can be re-created later
    if (clientInstance) {
      clientInstance = null;
    }
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient({
      url: url!,
      authToken: authToken!,
    });
  }
  return clientInstance;
};

export const resetTursoClient = (): void => {
  clientInstance = null;
};

/**
 * In-place schema migrations. Key = target version.
 * Each migration runs once (idempotent where possible).
 */
const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
  ],
};

const CURRENT_SCHEMA_VERSION = 1;

const applyMigrations = async (client: Client): Promise<void> => {
  // Ensure migration table exists
  try {
    await client.batch(MIGRATIONS[1] || [], 'write');
  } catch {
    // table may already exist or client may not be writable yet; ignore
  }

  // Read current applied version
  let currentDbVersion = 0;
  try {
    const res = await client.execute({
      sql: `SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations;`,
      args: [],
    });
    if (res.rows?.length) {
      currentDbVersion = Number(res.rows[0].v) || 0;
    }
  } catch {
    currentDbVersion = 0;
  }

  // Apply pending migrations in order
  for (let v = currentDbVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts || stmts.length === 0) continue;
    try {
      await client.batch(stmts, 'write');
      await client.execute({
        sql: `INSERT OR REPLACE INTO schema_migrations (version) VALUES (?);`,
        args: [v],
      });
      console.log(`[Turso] Applied schema migration v${v}.`);
    } catch (err: any) {
      console.error(`[Turso] Migration v${v} failed:`, err?.message || err);
    }
  }
};

/**
 * Initializes database schema on Turso cloud
 */
export const initTursoTables = async (): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) {
    return false;
  }

  try {
    await client.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          name TEXT,
          weekly_goal INTEGER DEFAULT 3,
          theme TEXT DEFAULT 'system',
          language TEXT DEFAULT 'id',
          streak INTEGER DEFAULT 0,
          last_workout_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          duration INTEGER NOT NULL,
          exercises TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );`,
        `CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);`,
        `CREATE TABLE IF NOT EXISTS workout_templates (
          id TEXT NOT NULL,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          category TEXT,
          exercises TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME,
          PRIMARY KEY (user_id, id)
        );`,
        `CREATE INDEX IF NOT EXISTS idx_templates_user_id ON workout_templates(user_id);`,
        `CREATE TABLE IF NOT EXISTS step_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          steps INTEGER NOT NULL DEFAULT 0,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS idx_step_history_user_date ON step_history(user_id, date);`,
      ],
      'write'
    );

    // Run versioned migrations after base schema is in place
    await applyMigrations(client);

    console.log('[Turso] Database tables initialized & migrations checked.');
    return true;
  } catch (error: any) {
    if (error?.message?.includes('401')) {
      console.warn('[Turso] Autentikasi ditolak (401). Mohon perbarui EXPO_PUBLIC_TURSO_AUTH_TOKEN di .env.local.');
    } else {
      console.error('[Turso] Failed to initialize tables:', error);
    }
    return false;
  }
};
