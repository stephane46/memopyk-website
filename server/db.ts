import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from "@shared/schema";

// ---------------------------------------------------------------------------
// Lazy-initialised DB connection
// ---------------------------------------------------------------------------
// The connection is created on first access so the server can boot and serve
// health-check endpoints even when DATABASE_URL is not yet configured.
// ---------------------------------------------------------------------------

let _pool: Sql | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function init() {
  if (_db) return;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set (points to Supabase PostgreSQL)");
  }

  console.log('🔗 Connecting to Supabase PostgreSQL...');
  _pool = postgres(url);
  _db = drizzle(_pool, { schema });
  console.log('✅ Database connection established');
}

/** Lazily-initialised postgres.js SQL client. */
export const pool: Sql = new Proxy({} as Sql, {
  get(_target, prop, receiver) {
    init();
    return Reflect.get(_pool!, prop, receiver);
  },
});

/** Lazily-initialised Drizzle ORM instance. */
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      init();
      return Reflect.get(_db!, prop, receiver);
    },
  },
);
