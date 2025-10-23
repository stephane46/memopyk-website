import { Router } from "express";
import { PartnerIntakeSchema } from "../../shared/partnerSchema";
import { verifyCaptcha, verifyCsrf, rateLimit } from "../utils/security";
import { randomId } from "../zoho/zohoClient";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { hybridStorage } from "../hybrid-storage";

const router = Router();
const EXCEL_FILE = path.join(process.cwd(), "partner-submissions.xlsx");

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

router.post("/api/partners/intake", rateLimit(30), async (req, res) => {
  const reqId = randomId();
  
  try {
    if (!verifyCsrf(req)) {
      return res.status(400).json({ ok: false, error: "bad_csrf", reqId });
    }
    
    const parsed = PartnerIntakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: "invalid_payload", 
        details: parsed.error.format(), 
        reqId 
      });
    }
    
    const data = parsed.data;
    
    if (!(await verifyCaptcha("stub"))) {
      return res.status(400).json({ ok: false, error: "captcha_failed", reqId });
    }

    // Save to Supabase via hybrid storage (with JSON fallback)
    const partnerData = {
      timestamp: new Date().toISOString(),
      partner_type: data.partner_type || 'digitization',
      partner_name: data.partner_name,
      email: data.email,
      email_public: Boolean(data.email_public),
      phone: data.phone || '',
      phone_public: false, // Phone is never public by default (not collected in intake form)
      website: data.website || '',
      address: data.address?.street || '',
      address_line2: data.address?.line2 || '',
      city: data.address?.city || '',
      postal_code: data.address?.postal_code || '',
      country: data.address?.country || '',
      photo_formats: Array.isArray(data.photo_formats) ? data.photo_formats.join(', ') : data.photo_formats || '',
      other_photo: data.other_photo_formats || '',
      film_formats: Array.isArray(data.film_formats) ? data.film_formats.join(', ') : data.film_formats || '',
      other_film: data.other_film_formats || '',
      video_cassettes: Array.isArray(data.video_formats) ? data.video_formats.join(', ') : data.video_formats || '',
      other_video: data.other_video_formats || '',
      delivery: Array.isArray(data.delivery) ? data.delivery.join(', ') : data.delivery || '',
      other_delivery: data.other_delivery || '',
      public_description: data.public_description || '',
      consent: true,
      status: 'Pending',
      is_active: false,
      show_on_map: false,
      lat: null,
      lng: null,
      slug: ''
    };

    const partner = await hybridStorage.createPartner(partnerData);
    console.log(`✅ Partner intake saved to Supabase: ${partner.partner_name} (ID: ${partner.id})`);
    
    // Send email notification
    try {
      await sendPartnerNotification(data);
      console.log(`✅ Email notification sent to ngoc@memopyk.com for partner: ${data.partner_name}`);
    } catch (emailError: any) {
      console.error(`⚠️ Email notification failed:`, emailError.message);
      // Don't fail the request if email fails
    }

    return res.json({ ok: true, saved: "supabase", partnerId: partner.id, reqId });
  } catch (e: any) {
    console.error("INTAKE_ERR", reqId, e?.message || e);
    return res.status(500).json({ ok: false, error: "server_error", reqId });
  }
});

// Download Excel file - Generate from Supabase database
router.get("/api/partners/download", async (req, res) => {
  try {
    // Fetch all partners from Supabase
    const partners = await hybridStorage.getPartners({});
    
    if (!partners || partners.length === 0) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert partners to worksheet data
    const worksheetData = partners.map(p => ({
      'Timestamp': p.timestamp,
      'Partner Type': p.partner_type,
      'Partner Name': p.partner_name,
      'Contact Name': p.contact_name,
      'Email': p.email,
      'Email Public': p.email_public ? 'TRUE' : 'FALSE',
      'Phone': p.phone,
      'Phone Public': p.phone_public ? 'TRUE' : 'FALSE',
      'Website': p.website,
      'Address': p.address,
      'Address Line 2': p.address_line2,
      'City': p.city,
      'Postal Code': p.postal_code,
      'Country': p.country,
      'Photo Formats': p.photo_formats,
      'Other Photo': p.other_photo,
      'Film Formats': p.film_formats,
      'Other Film': p.other_film,
      'Video Cassettes': p.video_cassettes,
      'Other Video': p.other_video,
      'Delivery': p.delivery,
      'Other Delivery': p.other_delivery,
      'Public Description': p.public_description,
      'Status': p.status,
      'Active': p.is_active ? 'TRUE' : 'FALSE',
      'Show on Map': p.show_on_map ? 'TRUE' : 'FALSE',
      'Latitude': p.lat,
      'Longitude': p.lng,
      'Slug': p.slug
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Partners");
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="partner-submissions.xlsx"');
    res.send(excelBuffer);
    
    console.log(`✅ Exported ${partners.length} partners to Excel`);
  } catch (e: any) {
    console.error("Download error:", e);
    res.status(500).json({ error: "Server error: " + e.message });
  }
});

// Import partners from TSV
router.post("/api/partners/import-tsv", async (req, res) => {
  try {
    const { tsvText } = req.body;
    
    if (!tsvText || typeof tsvText !== 'string') {
      return res.status(400).json({ error: "Invalid TSV data" });
    }

    // Parse TSV data
    const lines = tsvText.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: "TSV must include header and at least one data row" });
    }

    // Extract headers and data rows
    const headers = lines[0].split('\t');
    const dataRows = lines.slice(1);

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const values = dataRows[i].split('\t');
        const row: any = {};
        
        // Map values to headers
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });

        // Create partner object for Supabase (boolean values, not strings)
        const newPartner = {
          timestamp: row['Timestamp'] || new Date().toISOString(),
          partner_type: 'digitization',
          partner_name: row['Partner Name'] || '',
          email: row['Email'] || '',
          email_public: row['Email_Public'] === 'TRUE' || row['Email_Public'] === true,
          phone: row['Phone'] || '',
          phone_public: row['Phone_Public'] === 'TRUE' || row['Phone_Public'] === true || (row['Email_Public'] === 'TRUE' || row['Email_Public'] === true),
          website: row['Website'] || '',
          address: row['Address'] || '',
          address_line2: row['Complément d\'adresse'] || row['Address Line 2'] || '',
          city: row['City'] || '',
          postal_code: row['Postal Code'] || '',
          country: row['Country'] || '',
          photo_formats: row['Photo Formats'] || '',
          other_photo: row['Other Photo'] || '',
          film_formats: row['Film Formats'] || '',
          other_film: row['Other Film'] || '',
          video_cassettes: row['Video Cassettes'] || '',
          other_video: row['Other Video'] || '',
          delivery: row['Delivery'] || '',
          other_delivery: row['Other Delivery'] || '',
          public_description: row['Public Description'] || '',
          consent: true,
          status: 'Approved', // Auto-approve TSV imports
          is_active: true,
          show_on_map: true,
          lat: row['lat'] ? parseFloat(row['lat']) : null,
          lng: row['lng'] ? parseFloat(row['lng']) : null,
          slug: row['slug'] || ''
        };

        const result = await hybridStorage.createPartner(newPartner);
        if (result) {
          importedCount++;
          console.log(`✅ Imported partner ${i + 1}: ${newPartner.partner_name} (ID: ${result.id})`);
        } else {
          errors.push(`Row ${i + 1}: Failed to create partner`);
        }
      } catch (rowError: any) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
        console.error(`❌ Error importing row ${i + 1}:`, rowError);
      }
    }

    if (importedCount === 0) {
      return res.status(400).json({ 
        error: "No partners imported", 
        details: errors 
      });
    }

    console.log(`✅ TSV Import completed: ${importedCount} partners imported`);
    res.json({ 
      ok: true, 
      count: importedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e: any) {
    console.error("TSV Import error:", e);
    res.status(500).json({ error: "Import failed: " + e.message });
  }
});

// Create new partner (manual entry)
router.post("/api/partners/create", async (req, res) => {
  try {
    const partnerData = req.body;
    
    // Prepare partner data for Supabase (snake_case, boolean values)
    const newPartner = {
      timestamp: new Date().toISOString(),
      partner_type: partnerData.partner_type || 'digitization',
      partner_name: partnerData.partner_name || '',
      email: partnerData.email || '',
      email_public: partnerData.email_public || false,
      phone: partnerData.phone || '',
      phone_public: partnerData.phone_public || false,
      website: partnerData.website || '',
      address: partnerData.address || '',
      address_line2: partnerData.address_line2 || '',
      city: partnerData.city || '',
      postal_code: partnerData.postal_code || '',
      country: partnerData.country || '',
      photo_formats: partnerData.photo_formats || '',
      other_photo: partnerData.other_photo || '',
      film_formats: partnerData.film_formats || '',
      other_film: partnerData.other_film || '',
      video_cassettes: partnerData.video_cassettes || '',
      other_video: partnerData.other_video || '',
      delivery: partnerData.delivery || '',
      other_delivery: partnerData.other_delivery || '',
      public_description: partnerData.public_description || '',
      consent: true,
      status: partnerData.status || 'Pending',
      is_active: partnerData.is_active || false,
      show_on_map: partnerData.show_on_map || false,
      lat: partnerData.lat || null,
      lng: partnerData.lng || null,
      slug: partnerData.slug || ''
    };

    const result = await hybridStorage.createPartner(newPartner);
    
    if (!result) {
      return res.status(500).json({ error: "Failed to create partner" });
    }

    console.log(`✅ Partner created: ${result.partner_name} (ID: ${result.id})`);
    return res.json({ ok: true, message: "Partner created successfully", partner: result });
  } catch (e: any) {
    console.error("Create error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Helper: Transform Supabase partner data to frontend format
function transformPartnerData(dbPartner: any) {
  // Parse comma-separated strings into arrays, removing extra quotes
  const parseList = (str: string | null): string[] => {
    if (!str || str.trim() === '') return [];
    return str
      .split(',')
      .map(s => s.trim())
      .map(s => s.replace(/^["']|["']$/g, '')) // Remove leading/trailing quotes
      .filter(s => s.length > 0);
  };

  // Determine services based on which format fields have values
  const services: string[] = [];
  const photoFormats = parseList(dbPartner.photo_formats);
  const filmFormats = parseList(dbPartner.film_formats);
  const videoFormats = parseList(dbPartner.video_cassettes);
  
  if (photoFormats.length > 0 || dbPartner.other_photo) services.push('Photo');
  if (filmFormats.length > 0 || dbPartner.other_film) services.push('Film');
  if (videoFormats.length > 0 || dbPartner.other_video) services.push('Video');

  return {
    id: dbPartner.id,
    name: dbPartner.partner_name,
    city: dbPartner.city || '',
    country: dbPartner.country || '',
    lat: dbPartner.lat,
    lng: dbPartner.lng,
    services,
    formats: {
      photo: photoFormats,
      film: filmFormats,
      video: videoFormats
    },
    website: dbPartner.website || '',
    phone: dbPartner.phone || '',
    phone_public: dbPartner.phone_public || false,
    email: dbPartner.email || '',
    email_public: dbPartner.email_public || false,
    public_description: dbPartner.public_description || '',
    slug: dbPartner.slug || '',
    address: dbPartner.address || '',
    address_line2: dbPartner.address_line2 || '',
    postal_code: dbPartner.postal_code || '',
    delivery: parseList(dbPartner.delivery),
    other_photo: dbPartner.other_photo || '',
    other_film: dbPartner.other_film || '',
    other_video: dbPartner.other_video || '',
    other_delivery: dbPartner.other_delivery || '',
    status: dbPartner.status,
    is_active: dbPartner.is_active,
    show_on_map: dbPartner.show_on_map
  };
}

// Enhanced: Get all partners with pagination and filters
router.get("/api/partners", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000; // Higher limit for directory map
    const search = req.query.search as string;
    const status = req.query.status as string;
    const is_active = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;
    const show_on_map = req.query.show_on_map === 'true' ? true : req.query.show_on_map === 'false' ? false : undefined;
    const transform = req.query.transform === 'true'; // Only transform for directory pages

    // Fetch from hybrid storage (Supabase primary + JSON fallback)
    const filters: any = {};
    if (status) filters.status = status;
    if (is_active !== undefined) filters.is_active = is_active;
    if (show_on_map !== undefined) filters.show_on_map = show_on_map;
    if (search) filters.search = search;

    const allPartners = await hybridStorage.getPartners(filters);
    
    // Transform data ONLY if requested (for directory pages)
    // Admin panel needs raw Supabase format
    const processedPartners = transform 
      ? allPartners.map(transformPartnerData)
      : allPartners;
    
    // Client-side pagination for compatibility
    const total = processedPartners.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const partners = processedPartners.slice(startIndex, endIndex);

    res.json({ 
      partners, 
      total, 
      page, 
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (e: any) {
    console.error("Get partners error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get partner summary (for admin display) - backwards compatibility
router.get("/api/partners/summary", async (req, res) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.json({ partners: [], count: 0 });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Import i18n-iso-countries for country name conversion
    const countries = require("i18n-iso-countries");
    const frLocale = require("i18n-iso-countries/langs/fr.json");
    countries.registerLocale(frLocale);

    // Format for display (last 10 submissions) with FULL data for editing
    const allPartners = data.map((row: any, index: number) => {
      const countryCode = row["Country"] || "";
      const countryName = countryCode ? countries.getName(countryCode, "fr") || countryCode : "";
      
      return {
        id: index,
        name: row["Partner Name"] || "",
        email: row["Email"] || "",
        phone: row["Phone"] || "",
        city: row["City"] || "",
        country: countryName,
        submitted: row["Timestamp"] || "",
        // Additional fields for editing
        status: row["Status"] || "Pending",
        is_active: row["Is_Active"] || "FALSE",
        show_on_map: row["Show_On_Map"] || "FALSE",
        lat: row["lat"] || "",
        lng: row["lng"] || "",
        address: row["Address"] || "",
        address_line2: row["Complément d'adresse"] || "",
        postal_code: row["Postal Code"] || "",
        website: row["Website"] || ""
      };
    });

    const partners = allPartners.slice(-10).reverse();

    res.json({ partners, count: data.length });
  } catch (e: any) {
    console.error("Summary error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Update partner details (Status, Is_Active, Show_On_Map, lat, lng)
router.patch("/api/partners/:id/update", async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);
    const updates = req.body;

    // Normalize boolean values for Supabase (true/false instead of "TRUE"/"FALSE")
    const normalizedUpdates = { ...updates };
    if ('is_active' in normalizedUpdates) {
      normalizedUpdates.is_active = Boolean(normalizedUpdates.is_active);
    }
    if ('show_on_map' in normalizedUpdates) {
      normalizedUpdates.show_on_map = Boolean(normalizedUpdates.show_on_map);
    }
    if ('email_public' in normalizedUpdates) {
      normalizedUpdates.email_public = Boolean(normalizedUpdates.email_public);
    }
    if ('phone_public' in normalizedUpdates) {
      normalizedUpdates.phone_public = Boolean(normalizedUpdates.phone_public);
    }

    const result = await hybridStorage.updatePartner(partnerId, normalizedUpdates);
    
    if (!result) {
      return res.status(404).json({ error: "Partner not found" });
    }

    console.log(`✅ Partner updated: ${partnerId}`);
    return res.json({ ok: true, message: "Partner updated successfully", partner: result });
  } catch (e: any) {
    console.error("Update error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// Legacy update using Excel directly (backup)
router.patch("/api/partners/:id/update-legacy", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);
    const { status, is_active, show_on_map, lat, lng } = req.body;
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (rowId < 0 || rowId >= data.length) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Update the row
    const row = data[rowId] as any;
    if (status !== undefined) row["Status"] = status;
    if (is_active !== undefined) row["Is_Active"] = is_active;
    if (show_on_map !== undefined) row["Show_On_Map"] = show_on_map;
    if (lat !== undefined) row["lat"] = lat;
    if (lng !== undefined) row["lng"] = lng;

    // Recreate the Excel file with updated data
    const newWorkbook = XLSX.utils.book_new();
    const headers = [
      ["Timestamp", "Partner Name", "Email", "Email_Public", "Phone", "Website", 
       "Address", "Complément d'adresse", "City", "Postal Code", "Country", "Photo Formats", "Other Photo", 
       "Film Formats", "Other Film", "Video Cassettes", "Other Video", "Delivery", "Other Delivery", "Public Description", "Consent",
       "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"]
    ];
    
    const rows = data.map((r: any) => [
      r["Timestamp"],
      r["Partner Name"],
      r["Email"],
      r["Email_Public"],
      r["Phone"],
      r["Website"],
      r["Address"],
      r["Complément d'adresse"],
      r["City"],
      r["Postal Code"],
      r["Country"],
      r["Photo Formats"],
      r["Other Photo"],
      r["Film Formats"],
      r["Other Film"],
      r["Video Cassettes"],
      r["Other Video"],
      r["Delivery"],
      r["Other Delivery"],
      r["Public Description"],
      r["Consent"],
      r["Status"] || "Pending",
      r["Is_Active"] || "FALSE",
      r["Show_On_Map"] || "FALSE",
      r["lat"] || "",
      r["lng"] || "",
      r["slug"] || ""
    ]);

    const newWorksheet = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Partners");
    XLSX.writeFile(newWorkbook, EXCEL_FILE);

    console.log(`✅ Partner updated: ${row["Partner Name"]}`);
    res.json({ ok: true, message: "Partner updated successfully" });
  } catch (e: any) {
    console.error("Update error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a partner submission
router.delete("/api/partners/:id", async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);

    await hybridStorage.deletePartner(partnerId);
    
    console.log(`✅ Partner deleted: ${partnerId}`);
    return res.json({ ok: true, message: "Partner deleted successfully" });
  } catch (e: any) {
    console.error("Delete error:", e);
    return res.status(404).json({ error: e.message || "Partner not found" });
  }
});

// Legacy delete using Excel directly (backup)
router.delete("/api/partners/:id/legacy", async (req, res) => {
  try {
    const rowId = parseInt(req.params.id);
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return res.status(404).json({ error: "No partner submissions found" });
    }

    const workbook = XLSX.readFile(EXCEL_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (rowId < 0 || rowId >= data.length) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Remove the row at the specified index
    data.splice(rowId, 1);

    // Recreate the Excel file with remaining data
    const newWorkbook = XLSX.utils.book_new();
    const headers = [
      ["Timestamp", "Partner Name", "Email", "Email_Public", "Phone", "Website", 
       "Address", "Complément d'adresse", "City", "Postal Code", "Country", "Photo Formats", "Other Photo", 
       "Film Formats", "Other Film", "Video Cassettes", "Other Video", "Delivery", "Other Delivery", "Public Description", "Consent",
       "Status", "Is_Active", "Show_On_Map", "lat", "lng", "slug"]
    ];
    
    const rows = data.map((row: any) => [
      row["Timestamp"],
      row["Partner Name"],
      row["Email"],
      row["Email_Public"],
      row["Phone"],
      row["Website"],
      row["Address"],
      row["Complément d'adresse"],
      row["City"],
      row["Postal Code"],
      row["Country"],
      row["Photo Formats"],
      row["Other Photo"],
      row["Film Formats"],
      row["Other Film"],
      row["Video Cassettes"],
      row["Other Video"],
      row["Delivery"],
      row["Other Delivery"],
      row["Public Description"],
      row["Consent"],
      row["Status"] || "Pending",
      row["Is_Active"] || "FALSE",
      row["Show_On_Map"] || "FALSE",
      row["lat"] || "",
      row["lng"] || "",
      row["slug"] || ""
    ]);

    const newWorksheet = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Partners");
    XLSX.writeFile(newWorkbook, EXCEL_FILE);

    console.log(`✅ Partner submission deleted: row ${rowId}`);
    res.json({ ok: true, message: "Partner deleted successfully" });
  } catch (e: any) {
    console.error("Delete error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

async function sendPartnerNotification(data: any) {
  if (!resend) {
    console.log("⚠️ Resend not configured - skipping email notification");
    return;
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Get base URL - use production domain in deployed environment
  const baseUrl = 'https://memopyk.com';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2A4759 0%, #011526 100%); padding: 30px; text-align: center;">
        <h1 style="color: #F2EBDC; margin: 0; font-size: 28px;">🤝 Nouvelle Demande Partenaire</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px;">
        <h2 style="color: #2A4759; margin-top: 0;">Informations du Partenaire</h2>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Nom du Partenaire</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.partner_name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Email</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.email}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Téléphone</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.phone || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Site Web</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.website || 'Non fourni'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Pays</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.address?.country || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Ville</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.address?.city || 'Non fourni'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Formats Photos</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.photo_formats?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_photo_formats ? `<tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Photos</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_photo_formats}</td>
          </tr>` : ''}
          <tr${data.other_photo_formats ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Formats Film</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.film_formats?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_film_formats ? `<tr${!data.other_photo_formats ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Film</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_film_formats}</td>
          </tr>` : ''}
          <tr${((data.other_photo_formats && !data.other_film_formats) || (!data.other_photo_formats && data.other_film_formats)) ? ' style="background: #F2EBDC;"' : ''}>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Cassettes Vidéo</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.video_cassettes?.join(', ') || 'Non spécifié'}</td>
          </tr>
          ${data.other_video_formats ? `<tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Autres Formats Vidéo</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.other_video_formats}</td>
          </tr>` : ''}
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Livraison</td>
            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${data.delivery?.join(', ') || 'Non spécifié'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Date de Soumission</td>
            <td style="padding: 12px;">${formatDate(new Date().toISOString())}</td>
          </tr>
        </table>

        ${data.public_description ? `
          <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #D67C4A;">
            <h3 style="color: #2A4759; margin-top: 0;">Description Publique</h3>
            <p style="color: #333; margin: 0;">${data.public_description}</p>
          </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #2A4759; font-weight: bold; margin-bottom: 20px;">Actions Rapides</p>
          
          <table style="width: 100%; border-spacing: 10px;">
            <tr>
              <td style="text-align: center;">
                <a href="${baseUrl}/admin" 
                   style="display: inline-block; padding: 14px 28px; background: #2A4759; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  📋 Voir Admin Partenaires
                </a>
              </td>
              <td style="text-align: center;">
                <a href="${baseUrl}/api/partners/download" 
                   style="display: inline-block; padding: 14px 28px; background: #D67C4A; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  📥 Télécharger Excel
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
      
      <div style="background: #2A4759; padding: 20px; text-align: center;">
        <p style="color: #F2EBDC; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} MEMOPYK - Transformez vos souvenirs en films cinématographiques
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'MEMOPYK Partners <noreply@memopyk.com>',
    to: 'ngoc@memopyk.com',
    subject: `🤝 Nouveau Partenaire: ${data.partner_name}`,
    html: emailHtml,
  });
}

export default router;

// Zoho integration helpers (disabled - using Excel fallback)
// TODO: Re-enable when Zoho credentials are configured
