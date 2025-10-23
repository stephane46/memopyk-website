import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";
import { Pool } from "pg";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json" assert { type: "json" };
import fr from "i18n-iso-countries/langs/fr.json" assert { type: "json" };

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

countries.registerLocale(en);
countries.registerLocale(fr);

// TODO: replace with your real auth/ACL check
function assertAdmin(req: Request) {
  // Example: if you already have req.user.role
  // if (req.user?.role !== "admin") throw new Error("forbidden");
  return true;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

router.post(
  "/api/admin/country-names/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      assertAdmin(req);

      const lang = String(req.query.lang || "").toLowerCase();
      if (lang !== "en" && lang !== "fr") {
        return res.status(400).json({ error: "Query param ?lang=en|fr is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required (form field name: file)" });
      }

      // Parse CSV (expects headers: iso3,display_name)
      const csv = req.file.buffer.toString("utf8");
      const records: { iso3: string; display_name: string }[] = await new Promise((resolve, reject) => {
        parse(csv, { columns: true, skip_empty_lines: true, trim: true }, (err, recs) => {
          if (err) return reject(err);
          resolve(recs as { iso3: string; display_name: string }[]);
        });
      });

      // Basic validation
      const badHeaders =
        !records.length ||
        !("iso3" in records[0]) ||
        !("display_name" in records[0]);
      if (badHeaders) {
        return res.status(400).json({ error: "CSV must have headers: iso3,display_name" });
      }

      // Normalize and validate ISO-3
      const clean = records
        .map((r) => ({
          iso3: (r.iso3 || "").toUpperCase().trim(),
          display_name: (r.display_name || "").trim(),
        }))
        .filter((r) => r.iso3 && r.display_name);

      const invalid = clean.filter((r) => !/^[A-Z]{3}$/.test(r.iso3));
      if (invalid.length) {
        return res.status(400).json({
          error: "Invalid ISO-3 codes found",
          examples: invalid.slice(0, 5),
        });
      }

      // Upsert in a single transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Ensure table has en/fr columns (as per earlier step)
        await client.query(`
          alter table if exists country_names
            add column if not exists display_name_en text,
            add column if not exists display_name_fr text
        `);

        let inserted = 0;
        let updated = 0;

        for (const row of clean) {
          const col = lang === "fr" ? "display_name_fr" : "display_name_en";
          const q = `
            insert into country_names (iso3, ${col})
            values ($1, $2)
            on conflict (iso3) do update set ${col} = excluded.${col}
            returning (xmax = 0) as inserted
          `;
          const { rows } = await client.query(q, [row.iso3, row.display_name]);
          if (rows[0]?.inserted) inserted++;
          else updated++;
        }

        await client.query("COMMIT");
        return res.json({
          ok: true,
          lang,
          processed: clean.length,
          inserted,
          updated,
        });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("[admin country-names upload] error:", err);
      return res.status(500).json({ error: err.message || "Upload failed" });
    }
  }
);

router.get("/api/admin/country-names/download", async (req, res) => {
  try {
    assertAdmin(req); // keep your auth check

    const lang = String(req.query.lang || "en").toLowerCase();
    if (lang !== "en" && lang !== "fr") {
      return res.status(400).json({ error: "Query param ?lang=en|fr is required" });
    }

    const col = lang === "fr" ? "display_name_fr" : "display_name_en";
    const { rows } = await pool.query(
      `select iso3, ${col} as display_name
         from country_names
        where ${col} is not null
        order by iso3 asc`
    );

    const csv = stringify(rows, { header: true, columns: ["iso3", "display_name"] });
    const filename = `country_names_${lang}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    console.error("[admin country-names download] error:", err);
    return res.status(500).json({ error: err.message || "Download failed" });
  }
});

router.post("/api/admin/country-names/sync-from-library", async (req, res) => {
  try {
    assertAdmin(req); // keep your auth check

    const enMap = countries.getNames("en");
    const frMap = countries.getNames("fr");

    console.log(`[admin country-names sync] Processing ${Object.keys(enMap).length} countries from library`);

    let inserted = 0, updatedEn = 0, updatedFr = 0;
    let processed = 0;

    for (const [iso2, nameEn] of Object.entries(enMap)) {
      const iso3 = countries.alpha2ToAlpha3(iso2);
      if (!iso3) continue;

      try {
        // First upsert with EN name
        const qEn = `
          INSERT INTO country_names (iso3, display_name, display_name_en, created_at, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (iso3) DO UPDATE SET 
            display_name_en = EXCLUDED.display_name_en,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) as inserted
        `;
        const { rows: rEn } = await pool.query(qEn, [iso3, nameEn, nameEn]);
        if (rEn[0]?.inserted) inserted++; else updatedEn++;

        // Then update with FR name
        const nameFr = frMap[iso2] || nameEn;
        const qFr = `
          UPDATE country_names
          SET display_name_fr = $2, updated_at = CURRENT_TIMESTAMP
          WHERE iso3 = $1
        `;
        await pool.query(qFr, [iso3, nameFr]);
        updatedFr++;
        processed++;

        // Log progress every 50 countries
        if (processed % 50 === 0) {
          console.log(`[admin country-names sync] Processed ${processed} countries so far...`);
        }

      } catch (error) {
        console.error(`[admin country-names sync] Error processing ${iso3}:`, error);
      }
    }

    console.log(`[admin country-names sync] Successfully synced: ${inserted} inserted, ${updatedEn} updated (EN), ${updatedFr} updated (FR)`);

    return res.json({
      ok: true,
      processed,
      inserted,
      updated_en: updatedEn,
      updated_fr: updatedFr,
    });
  } catch (err: any) {
    console.error("[admin country-names sync] error:", err);
    return res.status(500).json({ error: err.message || "Sync failed" });
  }
});

export default router;