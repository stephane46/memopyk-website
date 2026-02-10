/**
 * Admin Routes
 * - Country names management (localization)
 * - Analytics IP exclusions management
 * - Cache statistics
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { Pool } from 'pg';
import countries from 'i18n-iso-countries';
import ipExclusionService from '../services/analytics/ip-exclusion.service';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Load locales dynamically to work with ESM + esbuild bundling
Promise.all([
  import('i18n-iso-countries/langs/en.json', { with: { type: 'json' } }),
  import('i18n-iso-countries/langs/fr.json', { with: { type: 'json' } })
]).then(([enModule, frModule]) => {
  countries.registerLocale(enModule.default);
  countries.registerLocale(frModule.default);
}).catch(err => {
  console.error('Failed to load country locales:', err);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// ============================================================================
// Country Names Management
// ============================================================================

router.post(
  '/country-names/upload',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {

      const lang = String(req.query.lang || '').toLowerCase();
      if (lang !== 'en' && lang !== 'fr') {
        return res.status(400).json({ error: 'Query param ?lang=en|fr is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required (form field name: file)' });
      }

      // Parse CSV (expects headers: iso3,display_name)
      const csv = req.file.buffer.toString('utf8');
      const records: { iso3: string; display_name: string }[] = await new Promise((resolve, reject) => {
        parse(csv, { columns: true, skip_empty_lines: true, trim: true }, (err, recs) => {
          if (err) return reject(err);
          resolve(recs as { iso3: string; display_name: string }[]);
        });
      });

      const badHeaders = !records.length || !('iso3' in records[0]) || !('display_name' in records[0]);
      if (badHeaders) {
        return res.status(400).json({ error: 'CSV must have headers: iso3,display_name' });
      }

      const clean = records
        .map(r => ({
          iso3: (r.iso3 || '').toUpperCase().trim(),
          display_name: (r.display_name || '').trim(),
        }))
        .filter(r => r.iso3 && r.display_name);

      const invalid = clean.filter(r => !/^[A-Z]{3}$/.test(r.iso3));
      if (invalid.length) {
        return res.status(400).json({ error: 'Invalid ISO-3 codes found', examples: invalid.slice(0, 5) });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(`
          ALTER TABLE IF EXISTS country_names
            ADD COLUMN IF NOT EXISTS display_name_en text,
            ADD COLUMN IF NOT EXISTS display_name_fr text
        `);

        let inserted = 0;
        let updated = 0;

        for (const row of clean) {
          const col = lang === 'fr' ? 'display_name_fr' : 'display_name_en';
          const q = `
            INSERT INTO country_names (iso3, ${col})
            VALUES ($1, $2)
            ON CONFLICT (iso3) DO UPDATE SET ${col} = excluded.${col}
            RETURNING (xmax = 0) as inserted
          `;
          const { rows } = await client.query(q, [row.iso3, row.display_name]);
          if (rows[0]?.inserted) inserted++;
          else updated++;
        }

        await client.query('COMMIT');
        return res.json({ ok: true, lang, processed: clean.length, inserted, updated });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('[admin country-names upload] error:', err);
      return res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }
);

router.get('/country-names/download', requireAdmin, async (req: Request, res: Response) => {
  try {

    const lang = String(req.query.lang || 'en').toLowerCase();
    if (lang !== 'en' && lang !== 'fr') {
      return res.status(400).json({ error: 'Query param ?lang=en|fr is required' });
    }

    const col = lang === 'fr' ? 'display_name_fr' : 'display_name_en';
    const { rows } = await pool.query(
      `SELECT iso3, ${col} as display_name
       FROM country_names
       WHERE ${col} IS NOT NULL
       ORDER BY iso3 ASC`
    );

    const csv = stringify(rows, { header: true, columns: ['iso3', 'display_name'] });
    const filename = `country_names_${lang}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    console.error('[admin country-names download] error:', err);
    return res.status(500).json({ error: err.message || 'Download failed' });
  }
});

router.post('/country-names/sync-from-library', requireAdmin, async (req: Request, res: Response) => {
  try {

    const enMap = countries.getNames('en');
    const frMap = countries.getNames('fr');

    console.log(`[admin country-names sync] Processing ${Object.keys(enMap).length} countries`);

    let inserted = 0, updatedEn = 0, updatedFr = 0, processed = 0;

    for (const [iso2, nameEn] of Object.entries(enMap)) {
      const iso3 = countries.alpha2ToAlpha3(iso2);
      if (!iso3) continue;

      try {
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

        const nameFr = frMap[iso2] || nameEn;
        await pool.query(
          `UPDATE country_names SET display_name_fr = $2, updated_at = CURRENT_TIMESTAMP WHERE iso3 = $1`,
          [iso3, nameFr]
        );
        updatedFr++;
        processed++;

        if (processed % 50 === 0) {
          console.log(`[admin country-names sync] Processed ${processed} countries...`);
        }
      } catch (error) {
        console.error(`[admin country-names sync] Error processing ${iso3}:`, error);
      }
    }

    console.log(`[admin country-names sync] Synced: ${inserted} inserted, ${updatedEn} EN, ${updatedFr} FR`);
    return res.json({ ok: true, processed, inserted, updated_en: updatedEn, updated_fr: updatedFr });
  } catch (err: any) {
    console.error('[admin country-names sync] error:', err);
    return res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// ============================================================================
// Analytics IP Exclusions Management
// ============================================================================

// GET all IP exclusions
router.get('/analytics/exclusions', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const exclusions = await ipExclusionService.getAllExclusions();
    res.json(exclusions);
  } catch (error: any) {
    console.error('❌ Get IP exclusions error:', error);
    res.status(500).json({ error: 'Failed to get IP exclusions' });
  }
});

// POST create new IP exclusion
router.post('/analytics/exclusions', requireAdmin, express.json(), async (req: Request, res: Response) => {
  try {
    const { ip_cidr, label, active = true } = req.body;

    if (!ip_cidr || !label) {
      return res.status(400).json({ error: 'IP/CIDR and label are required' });
    }

    const exclusion = await ipExclusionService.addExclusion(
      ip_cidr.trim(),
      label.trim()
    );

    console.log(`✅ IP exclusion created: ${ip_cidr} (${label})`);
    res.json(exclusion);
  } catch (error: any) {
    console.error('❌ Create IP exclusion error:', error);
    res.status(500).json({ error: 'Failed to create IP exclusion' });
  }
});

// PUT update IP exclusion
router.put('/analytics/exclusions/:id', requireAdmin, express.json(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, active, ip_cidr } = req.body;

    // Get existing exclusion first
    const exclusions = await ipExclusionService.getAllExclusions();
    const existing = exclusions.find(e => String(e.id) === id);

    if (!existing) {
      return res.status(404).json({ error: 'IP exclusion not found' });
    }

    // Update by ID — supports label, active, and ip_cidr fields
    const updated = await ipExclusionService.updateExclusionById(id, {
      label: label !== undefined ? label : undefined,
      active: active !== undefined ? active : undefined,
      ipCidr: ip_cidr !== undefined ? ip_cidr : undefined,
    });

    if (updated) {
      console.log(`✅ IP exclusion updated: ${existing.ipCidr} (active=${updated.active})`);
      return res.json(updated);
    }

    res.json(existing);
  } catch (error: any) {
    console.error('❌ Update IP exclusion error:', error);
    res.status(500).json({ error: 'Failed to update IP exclusion' });
  }
});

// DELETE IP exclusion
router.delete('/analytics/exclusions/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get existing exclusion first
    const exclusions = await ipExclusionService.getAllExclusions();
    const existing = exclusions.find(e => String(e.id) === id);

    if (!existing) {
      return res.status(404).json({ error: 'IP exclusion not found' });
    }

    const success = await ipExclusionService.removeExclusion(existing.ipCidr);
    if (success) {
      console.log(`✅ IP exclusion deleted: ${existing.ipCidr}`);
      return res.json({ success: true });
    }

    res.status(500).json({ error: 'Failed to delete IP exclusion' });
  } catch (error: any) {
    console.error('❌ Delete IP exclusion error:', error);
    res.status(500).json({ error: 'Failed to delete IP exclusion' });
  }
});

export default router;
