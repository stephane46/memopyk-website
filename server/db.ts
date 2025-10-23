import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use DATABASE_URL for direct localhost connection (post-nginx fix)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set for direct database connection.",
  );
}

// Skip SSH tunnel logic unless SSH credentials are set (empty = no tunnel)
if (process.env.SSH_PASSWORD || process.env.SSH_PRIVATE_KEY) {
  console.log('🔒 SSH keys available but using direct database connection (no tunneling)');
} else {
  console.log('🔗 Direct database connection - no SSH tunnel needed');
}

console.log('🔄 Using DATABASE_URL for direct localhost connection...');

const connectionString = process.env.DATABASE_URL;

console.log('🔗 Connecting to PostgreSQL via direct localhost connection (post-nginx fix)');

export const pool = postgres(connectionString);
export const db = drizzle(pool, { schema });