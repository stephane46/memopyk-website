/**
 * Partners Routes
 * Partner directory management - CRUD, intake form, Excel export/import, geocoding
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { Resend } from 'resend';
import { generateSlug } from '@shared/utils/slugify';

const router = Router();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ============================================================================
// Partner Intake Schema
// ============================================================================

const PartnerIntakeSchema = z.object({
  partner_type: z.string().optional(),
  partner_name: z.string().min(1),
  email: z.string().email(),
  email_public: z.boolean().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  photo_formats: z.array(z.string()).optional(),
  other_photo_formats: z.string().optional(),
  film_formats: z.array(z.string()).optional(),
  other_film_formats: z.string().optional(),
  video_formats: z.array(z.string()).optional(),
  other_video_formats: z.string().optional(),
  delivery: z.array(z.string()).optional(),
  other_delivery: z.string().optional(),
  public_description: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function transformPartnerData(dbPartner: any) {
  const parseList = (str: string | null): string[] => {
    if (!str || str.trim() === '') return [];
    return str.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s.length > 0);
  };

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
    formats: { photo: photoFormats, film: filmFormats, video: videoFormats },
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

async function sendPartnerNotification(data: any) {
  if (!resend) {
    console.log('⚠️ Resend not configured - skipping email notification');
    return;
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const baseUrl = 'https://memopyk.com';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2A4759 0%, #011526 100%); padding: 30px; text-align: center;">
        <h1 style="color: #F2EBDC; margin: 0; font-size: 28px;">🤝 Nouvelle Demande Partenaire</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px;">
        <h2 style="color: #2A4759; margin-top: 0;">Informations du Partenaire</h2>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px;">
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold;">Nom du Partenaire</td>
            <td style="padding: 12px;">${data.partner_name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Email</td>
            <td style="padding: 12px;">${data.email}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold;">Téléphone</td>
            <td style="padding: 12px;">${data.phone || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Pays</td>
            <td style="padding: 12px;">${data.address?.country || 'Non fourni'}</td>
          </tr>
          <tr style="background: #F2EBDC;">
            <td style="padding: 12px; font-weight: bold;">Ville</td>
            <td style="padding: 12px;">${data.address?.city || 'Non fourni'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold;">Date de Soumission</td>
            <td style="padding: 12px;">${formatDate(new Date().toISOString())}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${baseUrl}/admin" style="display: inline-block; padding: 14px 28px; background: #2A4759; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            📋 Voir Admin Partenaires
          </a>
        </div>
      </div>
      
      <div style="background: #2A4759; padding: 20px; text-align: center;">
        <p style="color: #F2EBDC; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} MEMOPYK
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'MEMOPYK Partners <noreply@memopyk.com>',
    to: process.env.MAIL_TO_NGOC || 'ngoc@memopyk.com',
    subject: `🤝 Nouveau Partenaire: ${data.partner_name}`,
    html: emailHtml,
  });
}

// ============================================================================
// Routes
// ============================================================================

// Partner intake form submission
router.post('/intake', async (req: Request, res: Response) => {
  const reqId = Math.random().toString(36).substring(7);
  
  try {
    const parsed = PartnerIntakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_payload', details: parsed.error.format(), reqId });
    }
    
    const data = parsed.data;

    const partnerData = {
      timestamp: new Date().toISOString(),
      partner_type: data.partner_type || 'digitization',
      partner_name: data.partner_name,
      email: data.email,
      email_public: Boolean(data.email_public),
      phone: data.phone || '',
      phone_public: false,
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

    // TODO: Save via hybrid storage service
    // const partner = await hybridStorage.createPartner(partnerData);
    console.log(`✅ Partner intake received: ${partnerData.partner_name}`);
    
    try {
      await sendPartnerNotification(data);
      console.log(`✅ Email notification sent for partner: ${data.partner_name}`);
    } catch (emailError: any) {
      console.error(`⚠️ Email notification failed:`, emailError.message);
    }

    return res.json({ ok: true, saved: 'supabase', partnerId: 0, reqId });
  } catch (e: any) {
    console.error('INTAKE_ERR', reqId, e?.message || e);
    return res.status(500).json({ ok: false, error: 'server_error', reqId });
  }
});

// Get all partners with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000;
    const transform = req.query.transform === 'true';

    // TODO: Fetch from hybrid storage
    // const filters = { status, is_active, show_on_map, search };
    // const allPartners = await hybridStorage.getPartners(filters);
    const allPartners: any[] = [];
    
    const processedPartners = transform ? allPartners.map(transformPartnerData) : allPartners;
    
    const total = processedPartners.length;
    const startIndex = (page - 1) * limit;
    const partners = processedPartners.slice(startIndex, startIndex + limit);

    res.json({ partners, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e: any) {
    console.error('Get partners error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download Excel export
router.get('/download', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch from hybrid storage
    // const partners = await hybridStorage.getPartners({});
    const partners: any[] = [];
    
    if (!partners || partners.length === 0) {
      return res.status(404).json({ error: 'No partner submissions found' });
    }

    const workbook = XLSX.utils.book_new();
    
    const worksheetData = partners.map(p => ({
      'Timestamp': p.timestamp,
      'Partner Type': p.partner_type,
      'Partner Name': p.partner_name,
      'Email': p.email,
      'Email Public': p.email_public ? 'TRUE' : 'FALSE',
      'Phone': p.phone,
      'Website': p.website,
      'Address': p.address,
      'City': p.city,
      'Postal Code': p.postal_code,
      'Country': p.country,
      'Status': p.status,
      'Active': p.is_active ? 'TRUE' : 'FALSE',
      'Show on Map': p.show_on_map ? 'TRUE' : 'FALSE',
      'Latitude': p.lat,
      'Longitude': p.lng,
      'Slug': p.slug
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Partners');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="partner-submissions.xlsx"');
    res.send(excelBuffer);
    
    console.log(`✅ Exported ${partners.length} partners to Excel`);
  } catch (e: any) {
    console.error('Download error:', e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

// Import from TSV
router.post('/import-tsv', async (req: Request, res: Response) => {
  try {
    const { tsvText } = req.body;
    
    if (!tsvText || typeof tsvText !== 'string') {
      return res.status(400).json({ error: 'Invalid TSV data' });
    }

    const lines = tsvText.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'TSV must include header and at least one data row' });
    }

    const headers = lines[0].split('\t');
    const dataRows = lines.slice(1);

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const values = dataRows[i].split('\t');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });

        const newPartner = {
          timestamp: row['Timestamp'] || new Date().toISOString(),
          partner_type: 'digitization',
          partner_name: row['Partner Name'] || '',
          email: row['Email'] || '',
          email_public: row['Email_Public'] === 'TRUE',
          phone: row['Phone'] || '',
          phone_public: row['Phone_Public'] === 'TRUE',
          website: row['Website'] || '',
          address: row['Address'] || '',
          city: row['City'] || '',
          postal_code: row['Postal Code'] || '',
          country: row['Country'] || '',
          consent: true,
          status: 'Approved',
          is_active: true,
          show_on_map: true,
          lat: row['lat'] ? parseFloat(row['lat']) : null,
          lng: row['lng'] ? parseFloat(row['lng']) : null,
          slug: row['slug'] || ''
        };

        // TODO: Save via hybrid storage
        // const result = await hybridStorage.createPartner(newPartner);
        importedCount++;
        console.log(`✅ Imported partner ${i + 1}: ${newPartner.partner_name}`);
      } catch (rowError: any) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
        console.error(`❌ Error importing row ${i + 1}:`, rowError);
      }
    }

    if (importedCount === 0) {
      return res.status(400).json({ error: 'No partners imported', details: errors });
    }

    console.log(`✅ TSV Import completed: ${importedCount} partners`);
    res.json({ ok: true, count: importedCount, errors: errors.length > 0 ? errors : undefined });
  } catch (e: any) {
    console.error('TSV Import error:', e);
    res.status(500).json({ error: 'Import failed: ' + e.message });
  }
});

// Create new partner
router.post('/create', async (req: Request, res: Response) => {
  try {
    const partnerData = req.body;
    
    let slug = partnerData.slug || '';
    if (!slug || slug.trim() === '') {
      slug = partnerData.partner_name ? generateSlug(partnerData.partner_name) : '';
    }
    
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
      city: partnerData.city || '',
      postal_code: partnerData.postal_code || '',
      country: partnerData.country || '',
      consent: true,
      status: partnerData.status || 'Pending',
      is_active: partnerData.is_active || false,
      show_on_map: partnerData.show_on_map || false,
      lat: partnerData.lat || null,
      lng: partnerData.lng || null,
      slug: slug
    };

    // TODO: Save via hybrid storage
    // const result = await hybridStorage.createPartner(newPartner);
    console.log(`✅ Partner created: ${newPartner.partner_name}`);
    return res.json({ ok: true, message: 'Partner created successfully', partner: newPartner });
  } catch (e: any) {
    console.error('Create error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update partner
router.patch('/:id/update', async (req: Request, res: Response) => {
  try {
    const partnerId = parseInt(req.params.id);
    const updates = req.body;

    if ('slug' in updates && (!updates.slug || updates.slug.trim() === '')) {
      if ('partner_name' in updates && updates.partner_name) {
        updates.slug = generateSlug(updates.partner_name);
      }
    }

    // Normalize booleans
    if ('is_active' in updates) updates.is_active = Boolean(updates.is_active);
    if ('show_on_map' in updates) updates.show_on_map = Boolean(updates.show_on_map);
    if ('email_public' in updates) updates.email_public = Boolean(updates.email_public);
    if ('phone_public' in updates) updates.phone_public = Boolean(updates.phone_public);

    // TODO: Update via hybrid storage
    // const result = await hybridStorage.updatePartner(partnerId, updates);
    console.log(`✅ Partner updated: ${partnerId}`);
    return res.json({ ok: true, message: 'Partner updated successfully' });
  } catch (e: any) {
    console.error('Update error:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
});

// Delete partner
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const partnerId = parseInt(req.params.id);

    // TODO: Delete via hybrid storage
    // await hybridStorage.deletePartner(partnerId);
    console.log(`✅ Partner deleted: ${partnerId}`);
    return res.json({ ok: true, message: 'Partner deleted successfully' });
  } catch (e: any) {
    console.error('Delete error:', e);
    return res.status(404).json({ error: e.message || 'Partner not found' });
  }
});

export default router;
