// scripts/setup-country-names.js
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupCountryNames() {
  console.log("🌍 Setting up country_names table and loading French data...");
  
  try {
    // Create the table with language-specific columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_names (
        iso3 varchar(3) PRIMARY KEY,
        display_name text,
        display_name_en text,
        display_name_fr text,
        created_at timestamp DEFAULT NOW(),
        updated_at timestamp DEFAULT NOW()
      );
    `);
    console.log("✅ Country names table created/verified");

    // Check if we have both CSV files
    const csvPathFr = "country_names_fr.csv";
    const csvPathEn = "country_names_en.csv";
    if (!fs.existsSync(csvPathFr)) {
      console.error("❌ country_names_fr.csv not found. Please run the export script first.");
      process.exit(1);
    }
    if (!fs.existsSync(csvPathEn)) {
      console.error("❌ country_names_en.csv not found. Please run the export script first.");
      process.exit(1);
    }

    // Read and parse the French CSV
    const csvContentFr = fs.readFileSync(csvPathFr, "utf-8");
    const linesFr = csvContentFr.trim().split("\n");
    const dataLinesFr = linesFr.slice(1);
    
    // Read and parse the English CSV
    const csvContentEn = fs.readFileSync(csvPathEn, "utf-8");
    const linesEn = csvContentEn.trim().split("\n");
    const dataLinesEn = linesEn.slice(1);
    
    console.log(`📋 Loading ${dataLinesFr.length} French and ${dataLinesEn.length} English countries from CSV...`);

    // Create temporary tables
    await pool.query(`
      CREATE TEMP TABLE tmp_country_names_fr (
        iso3 varchar(3) PRIMARY KEY,
        display_name_fr text NOT NULL
      );
    `);
    
    await pool.query(`
      CREATE TEMP TABLE tmp_country_names_en (
        iso3 varchar(3) PRIMARY KEY,
        display_name_en text NOT NULL
      );
    `);

    // Insert French data into temp table
    for (const line of dataLinesFr) {
      const [iso3, nameFr] = line.split(",");
      if (iso3 && nameFr) {
        await pool.query(
          "INSERT INTO tmp_country_names_fr (iso3, display_name_fr) VALUES ($1, $2) ON CONFLICT (iso3) DO NOTHING",
          [iso3.trim(), nameFr.trim()]
        );
      }
    }

    // Insert English data into temp table  
    for (const line of dataLinesEn) {
      const [iso3, nameEn] = line.split(",");
      if (iso3 && nameEn) {
        // Remove quotes from CSV value if present
        const cleanNameEn = nameEn.replace(/^"(.*)"$/, '$1');
        await pool.query(
          "INSERT INTO tmp_country_names_en (iso3, display_name_en) VALUES ($1, $2) ON CONFLICT (iso3) DO NOTHING",
          [iso3.trim(), cleanNameEn.trim()]
        );
      }
    }

    // Merge both French and English data into main table
    await pool.query(`
      INSERT INTO country_names (iso3, display_name_fr, display_name_en)
      SELECT 
        COALESCE(fr.iso3, en.iso3) as iso3,
        fr.display_name_fr,
        en.display_name_en
      FROM tmp_country_names_fr fr
      FULL OUTER JOIN tmp_country_names_en en ON fr.iso3 = en.iso3
      ON CONFLICT (iso3) DO UPDATE SET
        display_name_fr = COALESCE(EXCLUDED.display_name_fr, country_names.display_name_fr),
        display_name_en = COALESCE(EXCLUDED.display_name_en, country_names.display_name_en),
        updated_at = NOW();
    `);

    // Get count of inserted/updated records
    const resultFr = await pool.query("SELECT COUNT(*) FROM country_names WHERE display_name_fr IS NOT NULL");
    const resultEn = await pool.query("SELECT COUNT(*) FROM country_names WHERE display_name_en IS NOT NULL");
    console.log(`✅ Loaded French names for ${resultFr.rows[0].count} countries`);
    console.log(`✅ Loaded English names for ${resultEn.rows[0].count} countries`);

    // Create the view for easy querying
    await pool.query(`
      CREATE OR REPLACE VIEW v_country_names AS
      SELECT
        iso3,
        COALESCE(display_name_en, display_name_fr, display_name) AS name_en,
        COALESCE(display_name_fr, display_name_en, display_name) AS name_fr
      FROM country_names;
    `);
    console.log("✅ Created v_country_names view");

    console.log("🎉 Country names setup complete!");
    
  } catch (error) {
    console.error("❌ Error setting up country names:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupCountryNames();