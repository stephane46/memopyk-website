/**
 * Database Service
 *
 * Thin CRUD helpers around Drizzle.
 * Supabase is the single source of truth — no JSON fallbacks, no sync.
 * Use these for simple operations; use `db` directly for complex queries.
 */

import { eq, type SQL } from "drizzle-orm";
import type { PgTable, TableConfig } from "drizzle-orm/pg-core";
import { db } from "../db";

// Re-export for convenience — routes can import db from here
export { db };

/** Select all rows from a table. */
export async function findAll<T extends PgTable<TableConfig>>(table: T) {
  return db.select().from(table as any);
}

/** Select a single row by id (uuid, varchar, or serial). */
export async function findById<T extends PgTable<TableConfig>>(
  table: T,
  id: string | number,
) {
  const rows = await db
    .select()
    .from(table as any)
    .where(eq((table as any).id, id));
  return rows[0];
}

/** Select rows matching an arbitrary WHERE clause. */
export async function findWhere<T extends PgTable<TableConfig>>(
  table: T,
  condition: SQL,
) {
  return db.select().from(table as any).where(condition);
}

/** Insert a row and return it. */
export async function create<T extends PgTable<TableConfig>>(
  table: T,
  data: Record<string, unknown>,
) {
  const rows = await db.insert(table).values(data as any).returning();
  return rows[0];
}

/** Update a row by id and return it. */
export async function update<T extends PgTable<TableConfig>>(
  table: T,
  id: string | number,
  data: Record<string, unknown>,
) {
  const rows = await db
    .update(table)
    .set(data as any)
    .where(eq((table as any).id, id))
    .returning();
  return rows[0];
}

/** Delete a row by id. Returns true if a row was removed. */
export async function remove<T extends PgTable<TableConfig>>(
  table: T,
  id: string | number,
): Promise<boolean> {
  const rows = await db
    .delete(table)
    .where(eq((table as any).id, id))
    .returning();
  return rows.length > 0;
}
