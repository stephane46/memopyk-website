import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const EXCEL_FILE = path.join(process.cwd(), "partner-submissions.xlsx");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePartnersToDatabase() {
  console.log("🚀 Starting migration of partners from Excel to database...");

  if (!fs.existsSync(EXCEL_FILE)) {
    console.log("❌ No Excel file found at:", EXCEL_FILE);
    return;
  }

  // Read Excel file
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`📊 Found ${data.length} partners in Excel file`);

  let imported = 0;
  let skipped = 0;

  for (const row of data as any[]) {
    try {
      const partnerData = {
        partner_type: row["Partner Type"] || "digitization",
        partner_name: row["Partner Name"] || "",
        contact_name: row["Contact Name"] || "",
        email: row["Email"] || "",
        email_public: row["Email_Public"] === "TRUE",
        phone: row["Phone"] || null,
        phone_public: row["Phone_Public"] === "TRUE",
        website: row["Website"] || null,
        address: row["Address"] || null,
        address_line2: row["Address Line 2"] || null,
        city: row["City"] || "",
        postal_code: row["Postal Code"] || null,
        country: row["Country"] || "",
        lat: row["lat"] ? parseFloat(row["lat"]) : null,
        lng: row["lng"] ? parseFloat(row["lng"]) : null,
        photo_formats: row["Photo Formats"] || null,
        film_formats: row["Film Formats"] || null,
        video_cassettes: row["Video Cassettes"] || null,
        public_description: row["Public Description"] || null,
        slug: row["slug"] || `partner-${Date.now()}-${imported}`,
        status: row["Status"] || "Pending",
        is_active: row["Is_Active"] === "TRUE",
        show_on_map: row["Show_On_Map"] === "TRUE",
        specialties: row["Specialties"] || null,
        years_experience: row["Years Experience"] ? parseInt(row["Years Experience"]) : null,
        notes: row["Notes"] || null,
        submitted_at: row["Submitted"] ? new Date(row["Submitted"]) : new Date(),
      };

      // Check if partner already exists by email
      const { data: existing } = await supabase
        .from("partner_submissions")
        .select("id")
        .eq("email", partnerData.email)
        .single();

      if (existing) {
        console.log(`⏭️  Skipping duplicate: ${partnerData.partner_name} (${partnerData.email})`);
        skipped++;
        continue;
      }

      // Insert into database
      const { error } = await supabase
        .from("partner_submissions")
        .insert(partnerData);

      if (error) {
        console.error(`❌ Error importing ${partnerData.partner_name}:`, error.message);
        skipped++;
      } else {
        console.log(`✅ Imported: ${partnerData.partner_name}`);
        imported++;
      }
    } catch (err: any) {
      console.error(`❌ Error processing row:`, err.message);
      skipped++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`📊 Imported: ${imported} partners`);
  console.log(`⏭️  Skipped: ${skipped} partners`);
  console.log("=".repeat(50));
}

// Run migration
migratePartnersToDatabase().catch(console.error);
