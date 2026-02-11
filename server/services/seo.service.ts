/**
 * SEO Service
 *
 * Provides SEO settings management, head preview generation,
 * and history tracking for the admin SEO panel.
 *
 * The DB stores bilingual columns (_en / _fr) in seo_settings.
 * The admin UI works with a single language at a time, so this service
 * maps between the two representations using the `lang` parameter.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

type Lang = "fr-FR" | "en-US";

/** The column suffix for a given lang */
function langSuffix(lang: Lang): "En" | "Fr" {
  return lang === "en-US" ? "En" : "Fr";
}

/**
 * Get or create the canonical homepage settings row.
 * We use the most recently updated row with page='homepage'.
 */
async function getSettingsRow() {
  const rows = await db
    .select()
    .from(schema.seoSettings)
    .where(eq(schema.seoSettings.page, "homepage"))
    .orderBy(desc(schema.seoSettings.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Map a DB row + lang into the flat shape the admin UI expects.
 */
function rowToUiShape(row: schema.SeoSettings, lang: Lang) {
  const s = langSuffix(lang);
  return {
    id: row.id,
    page: row.page,
    lang,
    title: (row as any)[`metaTitle${s}`] ?? "",
    description: (row as any)[`metaDescription${s}`] ?? "",
    keywords: (row as any)[`metaKeywords${s}`] ?? "",
    canonical: row.canonicalUrl ?? "",
    robotsIndex: row.robotsIndex ?? true,
    robotsFollow: row.robotsFollow ?? true,
    robotsNoArchive: row.robotsNoArchive ?? false,
    robotsNoSnippet: row.robotsNoSnippet ?? false,
    jsonLd: row.jsonLd ? JSON.stringify(row.jsonLd, null, 2) : "",
    openGraph: {
      title: (row as any)[`ogTitle${s}`] ?? "",
      description: (row as any)[`ogDescription${s}`] ?? "",
      image: row.ogImageUrl ?? "",
      type: row.ogType ?? "website",
      url: row.canonicalUrl ?? "",
    },
    twitter: {
      card: row.twitterCard ?? "summary_large_image",
      title: (row as any)[`twitterTitle${s}`] ?? "",
      description: (row as any)[`twitterDescription${s}`] ?? "",
      image: row.twitterImageUrl ?? "",
    },
    hreflang: (row.customMetaTags as any)?.hreflang ?? [],
    extras: (row.customMetaTags as any)?.extras ?? [],
  };
}

/**
 * GET /admin/seo?lang=fr-FR
 * Returns a single settings object shaped for the UI.
 */
async function getSeoSettings(lang?: Lang) {
  const effectiveLang = lang ?? "fr-FR";
  const row = await getSettingsRow();
  if (!row) return null;
  return rowToUiShape(row, effectiveLang);
}

/**
 * POST /admin/seo
 * Upsert settings for a given lang. The UI sends flat fields + nested openGraph/twitter.
 * We map them back to the bilingual DB columns.
 */
async function saveSeoSettings(
  data: Record<string, unknown>,
  adminUser?: string,
  changeReason?: string,
) {
  const lang = (data.lang as Lang) ?? "fr-FR";
  const s = langSuffix(lang);

  // Build the DB update payload from the UI fields
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Map flat fields to lang-suffixed columns
  if (data.title !== undefined)
    updatePayload[`metaTitle${s}`] = data.title || null;
  if (data.description !== undefined)
    updatePayload[`metaDescription${s}`] = data.description || null;
  if (data.keywords !== undefined)
    updatePayload[`metaKeywords${s}`] = data.keywords || null;

  // Non-lang-specific fields
  if (data.canonical !== undefined)
    updatePayload.canonicalUrl = data.canonical || null;
  if (data.robotsIndex !== undefined)
    updatePayload.robotsIndex = data.robotsIndex;
  if (data.robotsFollow !== undefined)
    updatePayload.robotsFollow = data.robotsFollow;
  if (data.robotsNoArchive !== undefined)
    updatePayload.robotsNoArchive = data.robotsNoArchive;
  if (data.robotsNoSnippet !== undefined)
    updatePayload.robotsNoSnippet = data.robotsNoSnippet;

  // JSON-LD
  if (data.jsonLd !== undefined) {
    try {
      updatePayload.jsonLd =
        typeof data.jsonLd === "string" && data.jsonLd
          ? JSON.parse(data.jsonLd as string)
          : data.jsonLd || null;
    } catch {
      updatePayload.jsonLd = null;
    }
  }

  // OpenGraph nested object
  const og = data.openGraph as Record<string, string> | undefined;
  if (og) {
    if (og.title !== undefined) updatePayload[`ogTitle${s}`] = og.title || null;
    if (og.description !== undefined)
      updatePayload[`ogDescription${s}`] = og.description || null;
    if (og.image !== undefined) updatePayload.ogImageUrl = og.image || null;
    if (og.type !== undefined) updatePayload.ogType = og.type || "website";
  }

  // Twitter nested object
  const tw = data.twitter as Record<string, string> | undefined;
  if (tw) {
    if (tw.title !== undefined)
      updatePayload[`twitterTitle${s}`] = tw.title || null;
    if (tw.description !== undefined)
      updatePayload[`twitterDescription${s}`] = tw.description || null;
    if (tw.image !== undefined) updatePayload.twitterImageUrl = tw.image || null;
    if (tw.card !== undefined)
      updatePayload.twitterCard = tw.card || "summary_large_image";
  }

  // Store hreflang and extras in customMetaTags jsonb
  const hreflang = data.hreflang ?? [];
  const extras = data.extras ?? [];
  updatePayload.customMetaTags = { hreflang, extras };

  // Upsert: find existing row or create new one
  let row = await getSettingsRow();
  if (row) {
    const updated = await db
      .update(schema.seoSettings)
      .set(updatePayload as any)
      .where(eq(schema.seoSettings.id, row.id))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(schema.seoSettings)
      .values({
        page: "homepage",
        ...updatePayload,
      } as any)
      .returning();
    row = inserted[0];
  }

  // Insert audit log
  await db.insert(schema.seoAuditLogs).values({
    pageId: row.id,
    action: "save",
    field: "all",
    oldValue: null,
    newValue: JSON.stringify(data),
    adminUser: adminUser ?? "system",
    changeReason: changeReason ?? `Updated SEO settings for ${lang}`,
  });

  return row;
}

/**
 * GET /admin/seo/preview?lang=fr-FR
 * Generates a real HTML head snippet from current settings.
 */
async function generateHeadPreview(lang: Lang) {
  const settings = await getSeoSettings(lang);
  if (!settings) return "<head><!-- No SEO settings configured --></head>";

  const lines: string[] = [];

  // Title
  if (settings.title) lines.push(`<title>${esc(settings.title)}</title>`);

  // Meta description
  if (settings.description)
    lines.push(
      `<meta name="description" content="${esc(settings.description)}" />`,
    );

  // Meta keywords
  if (settings.keywords)
    lines.push(
      `<meta name="keywords" content="${esc(settings.keywords)}" />`,
    );

  // Robots
  const robotsParts: string[] = [];
  robotsParts.push(settings.robotsIndex ? "index" : "noindex");
  robotsParts.push(settings.robotsFollow ? "follow" : "nofollow");
  if (settings.robotsNoArchive) robotsParts.push("noarchive");
  if (settings.robotsNoSnippet) robotsParts.push("nosnippet");
  lines.push(`<meta name="robots" content="${robotsParts.join(", ")}" />`);

  // Canonical
  if (settings.canonical)
    lines.push(`<link rel="canonical" href="${esc(settings.canonical)}" />`);

  // Open Graph
  if (settings.openGraph.title)
    lines.push(
      `<meta property="og:title" content="${esc(settings.openGraph.title)}" />`,
    );
  if (settings.openGraph.description)
    lines.push(
      `<meta property="og:description" content="${esc(settings.openGraph.description)}" />`,
    );
  if (settings.openGraph.image)
    lines.push(
      `<meta property="og:image" content="${esc(settings.openGraph.image)}" />`,
    );
  if (settings.openGraph.type)
    lines.push(
      `<meta property="og:type" content="${esc(settings.openGraph.type)}" />`,
    );
  if (settings.openGraph.url)
    lines.push(
      `<meta property="og:url" content="${esc(settings.openGraph.url)}" />`,
    );

  // Twitter
  if (settings.twitter.card)
    lines.push(
      `<meta name="twitter:card" content="${esc(settings.twitter.card)}" />`,
    );
  if (settings.twitter.title)
    lines.push(
      `<meta name="twitter:title" content="${esc(settings.twitter.title)}" />`,
    );
  if (settings.twitter.description)
    lines.push(
      `<meta name="twitter:description" content="${esc(settings.twitter.description)}" />`,
    );
  if (settings.twitter.image)
    lines.push(
      `<meta name="twitter:image" content="${esc(settings.twitter.image)}" />`,
    );

  // Hreflang
  if (settings.hreflang?.length) {
    for (const h of settings.hreflang) {
      if (h.lang && h.href)
        lines.push(
          `<link rel="alternate" hreflang="${esc(h.lang)}" href="${esc(h.href)}" />`,
        );
    }
  }

  // JSON-LD
  if (settings.jsonLd) {
    lines.push(
      `<script type="application/ld+json">${settings.jsonLd}</script>`,
    );
  }

  // Extra meta tags
  if (settings.extras?.length) {
    for (const e of settings.extras) {
      if (e.name && e.content)
        lines.push(`<meta name="${esc(e.name)}" content="${esc(e.content)}" />`);
    }
  }

  return lines.join("\n");
}

/**
 * GET /admin/seo/history?lang=fr-FR
 * Returns audit log entries, most recent first.
 */
async function getSeoHistory(lang?: Lang) {
  // Get the canonical row id to filter audit logs
  const row = await getSettingsRow();
  const pageId = row?.id ?? "homepage";

  const logs = await db
    .select()
    .from(schema.seoAuditLogs)
    .where(eq(schema.seoAuditLogs.pageId, pageId))
    .orderBy(desc(schema.seoAuditLogs.createdAt))
    .limit(50);

  // Map to the shape the UI expects (with version numbers)
  return logs.map((log, index) => ({
    version: logs.length - index,
    createdAt: log.createdAt,
    createdBy: log.adminUser,
    changeReason: log.changeReason,
    action: log.action,
    field: log.field,
  }));
}

/**
 * POST /admin/seo/publish
 * Records a publish event in the audit log.
 */
async function createBackup(data: unknown, adminUser?: string) {
  const row = await getSettingsRow();
  await db.insert(schema.seoAuditLogs).values({
    pageId: row?.id ?? "homepage",
    action: "publish",
    field: "all",
    oldValue: null,
    newValue: JSON.stringify(data),
    adminUser: adminUser ?? "system",
    changeReason: "Published SEO settings",
  });
  return { ok: true };
}

/** HTML-escape for attribute values */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  return {
    success: true,
    databaseTimeoutMs: 0,
    message: "SEO timeout test (stub)",
  };
}
