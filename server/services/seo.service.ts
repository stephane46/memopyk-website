/**
 * SEO Service
 *
 * Provides SEO settings management, head preview generation,
 * history tracking, and head preview generation.
 *
 * Stub implementation — flesh out as the SEO admin panel is built.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

type Lang = "fr-FR" | "en-US";

async function getSeoSettings(lang?: Lang) {
  const rows = await db.select().from(schema.seoSettings);
  return rows;
}

async function saveSeoSettings(
  data: Record<string, unknown>,
  adminUser?: string,
  changeReason?: string,
) {
  // Upsert: if an id is provided, update; otherwise insert
  if (data.id) {
    const rows = await db
      .update(schema.seoSettings)
      .set(data as any)
      .where(eq(schema.seoSettings.id, data.id as string))
      .returning();
    return rows[0];
  }
  const rows = await db.insert(schema.seoSettings).values(data as any).returning();
  return rows[0];
}

async function generateHeadPreview(lang: Lang) {
  const settings = await getSeoSettings(lang);
  return { settings, preview: `<head><!-- preview for ${lang} --></head>` };
}

async function getSeoHistory(_lang?: Lang) {
  return db.select().from(schema.seoAuditLogs);
}

async function createBackup(
  data: unknown,
  adminUser?: string,
) {
  await db.insert(schema.seoAuditLogs).values({
    action: "backup",
    adminUser: adminUser ?? "system",
    newValue: JSON.stringify(data),
  } as any);
  return { ok: true };
}

export const seoService = {
  getSeoSettings,
  saveSeoSettings,
  generateHeadPreview,
  getSeoHistory,
  createBackup,
};

/** Stub for SEO timeout testing. */
export async function testSeoTimeout() {
  return { success: true, databaseTimeoutMs: 0, message: "SEO timeout test (stub)" };
}
