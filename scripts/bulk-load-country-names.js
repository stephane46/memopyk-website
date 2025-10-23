// scripts/bulk-load-country-names.js
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function bulkLoadCountryNames() {
  console.log("🌍 Bulk loading English country names...");
  
  try {
    // Check if we have the English CSV file
    const csvPathEn = "country_names_en.csv";
    if (!fs.existsSync(csvPathEn)) {
      console.error("❌ country_names_en.csv not found. Please run the export script first.");
      process.exit(1);
    }

    // Read and parse the English CSV
    const csvContentEn = fs.readFileSync(csvPathEn, "utf-8");
    const linesEn = csvContentEn.trim().split("\n");
    const dataLinesEn = linesEn.slice(1);
    
    console.log(`📋 Processing ${dataLinesEn.length} English countries from CSV...`);

    // Build bulk update query
    const updateCases = [];
    const isoParams = [];
    
    for (const line of dataLinesEn) {
      const [iso3, nameEn] = line.split(",");
      if (iso3 && nameEn) {
        // Remove quotes from CSV value if present
        const cleanNameEn = nameEn.replace(/^"(.*)"$/, '$1');
        updateCases.push(`WHEN '${iso3.trim()}' THEN '${cleanNameEn.trim().replace(/'/g, "''")}'`);
        isoParams.push(`'${iso3.trim()}'`);
      }
    }

    // Execute bulk update
    const bulkUpdateQuery = `
      UPDATE country_names 
      SET display_name_en = CASE iso3
        ${updateCases.join('\n        ')}
      END,
      updated_at = NOW()
      WHERE iso3 IN (${isoParams.join(', ')});
    `;

    const result = await pool.query(bulkUpdateQuery);
    console.log(`✅ Updated ${result.rowCount} countries with English names`);

    // Verify the update
    const verifyResult = await pool.query("SELECT COUNT(*) FROM country_names WHERE display_name_en IS NOT NULL");
    console.log(`✅ Total countries with English names: ${verifyResult.rows[0].count}`);

    console.log("🎉 Bulk loading complete!");
    
  } catch (error) {
    console.error("❌ Error during bulk loading:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

bulkLoadCountryNames();