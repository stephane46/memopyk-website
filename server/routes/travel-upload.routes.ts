/**
 * Travel Upload Portal Routes
 *
 * Client-facing form for travel agency clients to register and receive
 * a Nextcloud upload link. Also includes admin endpoints for managing
 * submissions and agency codes.
 *
 * Public Routes:
 * - POST   /api/travel-upload/submit              - Client form submission
 * - GET    /api/travel-agency-codes/validate/:code - Validate agency code
 *
 * Admin Routes:
 * - GET    /api/travel-upload/submissions          - List all submissions
 * - DELETE /api/travel-upload/submissions/:id      - Delete submission
 * - POST   /api/travel-upload/submissions/:id/resend-email - Resend confirmation
 * - GET    /api/travel-upload/submissions/:id/folder-stats - Get folder stats
 * - POST   /api/travel-upload/bulk-folder-stats    - Bulk folder stats
 * - GET    /api/travel-agency-codes                - List agency codes
 * - GET    /api/travel-agency-codes/:id            - Get single code
 * - POST   /api/travel-agency-codes                - Create code
 * - PATCH  /api/travel-agency-codes/:id            - Update code
 * - DELETE /api/travel-agency-codes/:id            - Delete code
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import * as travelService from '../services/travel.service';
import { emailService } from '../services/email.service';

const router = Router();

// =============================================================================
// Helper Functions
// =============================================================================

function sanitizeEmailForFolder(email: string): string {
  let sanitized = email.toLowerCase().trim();
  sanitized = sanitized.replace('@', '_at_');
  sanitized = sanitized.replace(/[^a-z0-9._-]/g, '');
  return sanitized.substring(0, 60);
}

function slugify(s: string, maxLen: number): string {
  let result = s.trim();
  // Normalize accented characters (é → e, ç → c, etc.)
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  result = result.replace(/[^a-zA-Z0-9\s-]/g, '');
  result = result.replace(/\s+/g, '-');
  result = result.replace(/-+/g, '-');
  result = result.replace(/^-|-$/g, '');
  return result.substring(0, maxLen);
}

function generateFolderName(firstName: string, lastName: string, agency: string): string {
  const namePart = slugify(`${firstName} ${lastName}`, 30);
  const agencyPart = slugify(agency, 30);
  const randomSuffix = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  return `${namePart}_${agencyPart}_${randomSuffix}`.toUpperCase();
}

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

router.post('/api/travel-upload/submit', async (req, res) => {
    try {
      const { firstName, lastName, email, phone, agencyCode, language, submittedAt } = req.body;
      
      // Validation with bilingual error messages
      const isFrench = language === 'fr-FR';
      
      if (!firstName || firstName.length < 1 || firstName.length > 50) {
        return res.status(400).json({ 
          error: isFrench 
            ? 'Le prénom est requis (1-50 caractères)' 
            : 'First name is required (1-50 characters)' 
        });
      }
      if (!lastName || lastName.length < 1 || lastName.length > 50) {
        return res.status(400).json({ 
          error: isFrench 
            ? 'Le nom est requis (1-50 caractères)' 
            : 'Last name is required (1-50 characters)' 
        });
      }
      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ 
          error: isFrench 
            ? 'Une adresse email valide est requise (ex: nom@exemple.com)' 
            : 'Valid email is required (e.g., name@example.com)' 
        });
      }
      if (!phone || phone.trim().length < 5) {
        return res.status(400).json({ 
          error: isFrench 
            ? 'Le numéro de téléphone est requis' 
            : 'Phone number is required' 
        });
      }
      if (!agencyCode || agencyCode.length < 2) {
        return res.status(400).json({ 
          error: isFrench 
            ? 'Le code agence est requis' 
            : 'Agency code is required' 
        });
      }

      // Check for duplicate email registration - MANDATORY check, fail if database unavailable
      try {
        const existingSubmissions = await travelService.getTravelUploadSubmissions({ search: email });
        const existingEmail = existingSubmissions.find((s: any) => 
          s.email?.toLowerCase() === email.toLowerCase()
        );
        if (existingEmail) {
          console.log(`⚠️ Duplicate email registration attempt: ${email}, existing folder: ${existingEmail.folder_url}`);
          return res.status(409).json({ 
            error: language === 'fr-FR' 
              ? 'Cette adresse email est déjà enregistrée. Contactez-nous si vous avez besoin d\'aide.'
              : 'This email address is already registered. Contact us if you need assistance.',
            existingFolderUrl: existingEmail.folder_url
          });
        }
        console.log(`✅ Email duplicate check passed: ${email}`);
      } catch (dupCheckError) {
        console.error('❌ Duplicate check failed - blocking submission for safety:', dupCheckError);
        return res.status(503).json({ 
          error: language === 'fr-FR' 
            ? 'Service temporairement indisponible. Veuillez réessayer dans quelques minutes.'
            : 'Service temporarily unavailable. Please try again in a few minutes.'
        });
      }

      // Get Nextcloud config from environment (validate early but don't block response)
      const NC_BASE = process.env.NC_BASE;
      const NC_USER = process.env.NC_USER;
      const NC_PASS = process.env.NC_PASS;
      const NC_FOLDER = process.env.NC_FOLDER;
      const MAIL_TO_NGOC = process.env.MAIL_TO_NGOC;
      const MAIL_FROM = process.env.MAIL_FROM;
      const NC_ADMIN_USER = process.env.NC_ADMIN_USER;
      const NC_ADMIN_PASS = process.env.NC_ADMIN_PASS;

      // Check required env vars before responding
      if (!NC_BASE || !NC_USER || !NC_PASS || !NC_FOLDER || !NC_ADMIN_USER || !NC_ADMIN_PASS) {
        console.error('❌ Missing Nextcloud configuration');
        return res.status(500).json({ 
          error: isFrench 
            ? 'Erreur de configuration du serveur. Veuillez réessayer plus tard.' 
            : 'Server configuration error. Please try again later.' 
        });
      }

      // Wait for Nextcloud folder creation to return share URL to user
      console.log(`📁 Creating Nextcloud folder for ${firstName} ${lastName} (${email})...`);

      // Generate folder name (using agencyCode instead of agency name)
      const folderName = generateFolderName(firstName, lastName, agencyCode);
      const folderPath = `/${NC_FOLDER}/${folderName}`;
      
      // 1) CREATE FOLDER (WebDAV MKCOL) - Use ADMIN credentials since folder is owned by admin
      const mkcolUrl = `${NC_BASE.replace(/\/$/, '')}/remote.php/dav/files/${NC_ADMIN_USER}${folderPath}`;
      const authHeader = 'Basic ' + Buffer.from(`${NC_ADMIN_USER}:${NC_ADMIN_PASS}`).toString('base64');
      
      console.log(`📁 Creating Nextcloud folder: ${folderPath} (using admin credentials)`);
      
      const mkcolResponse = await fetch(mkcolUrl, {
        method: 'MKCOL',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/xml'
        }
      });

      if (mkcolResponse.status !== 201 && mkcolResponse.status !== 405) {
        const errorText = await mkcolResponse.text();
        console.error(`❌ Failed to create folder: ${mkcolResponse.status} - ${errorText}`);
        console.error(`❌ MKCOL URL: ${mkcolUrl}`);
        console.error(`❌ NC_USER: ${NC_USER}, NC_BASE: ${NC_BASE}, NC_FOLDER: ${NC_FOLDER}`);
        return res.status(500).json({ 
          error: isFrench 
            ? 'Erreur lors de la création du dossier. Veuillez réessayer.' 
            : 'Error creating folder. Please try again.' 
        });
      }

      console.log(`✅ Folder created via MKCOL: ${folderPath}`);

      // 1b) PROPFIND to force filecache sync - Nextcloud OCS API uses filecache, not filesystem
      // Without this, the share creation may fail because the folder isn't in filecache yet
      console.log(`🔄 Syncing Nextcloud filecache via PROPFIND...`);
      
      const propfindResponse = await fetch(mkcolUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Depth': '0',
          'Content-Type': 'application/xml'
        }
      });

      if (propfindResponse.status !== 207 && propfindResponse.status !== 200) {
        console.warn(`⚠️ PROPFIND returned ${propfindResponse.status} - filecache may not be synced`);
      } else {
        console.log(`✅ Filecache synced - folder confirmed in Nextcloud index`);
      }

      // PROPFIND is sufficient - removed artificial 500ms delay for faster response

      // 2) CREATE SHARE LINK (OCS API) - MUST authenticate as folder OWNER (admin) to avoid re-share
      // If authenticated as user with share access (memopyk-bot), Nextcloud creates a re-share with parent != NULL
      // which causes "page not found" errors and folder upload failures
      const ocsUrl = `${NC_BASE.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`;
      const adminAuthHeader = 'Basic ' + Buffer.from(`${NC_ADMIN_USER}:${NC_ADMIN_PASS}`).toString('base64');
      
      // DO NOT use publicUpload parameter - it's a legacy flag that overrides permissions!
      // Just set permissions=15 directly for editable public shares
      const shareParams = new URLSearchParams({
        path: folderPath,
        shareType: '3',  // public link
        permissions: '15' // read(1) + update(2) + create(4) + delete(8) = 15 (editable public folder)
      });

      console.log(`🔗 Creating share link for: ${folderPath} (authenticated as admin: ${NC_ADMIN_USER})`);

      const ocsResponse = await fetch(ocsUrl, {
        method: 'POST',
        headers: {
          'Authorization': adminAuthHeader,
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: shareParams.toString()
      });

      const ocsData = await ocsResponse.json();
      console.log(`📋 OCS Response status: ${ocsResponse.status}`);
      console.log(`📋 OCS Response data:`, JSON.stringify(ocsData, null, 2));
      
      const shareUrl = ocsData?.ocs?.data?.url;
      const shareId = ocsData?.ocs?.data?.id;
      const shareToken = ocsData?.ocs?.data?.token;
      const initialPermissions = ocsData?.ocs?.data?.permissions;

      if (!shareUrl || !shareId) {
        console.error(`❌ Failed to create share link:`, ocsData);
        return res.status(500).json({ 
          error: isFrench 
            ? 'Erreur lors de la création du lien de partage. Veuillez réessayer.' 
            : 'Error creating share link. Please try again.' 
        });
      }

      console.log(`✅ Share link created: ${shareUrl} (token: ${shareToken}, id: ${shareId}, initial permissions: ${initialPermissions})`);

      // 2b) UPDATE SHARE PERMISSIONS (Nextcloud ignores permissions during POST, must use PUT)
      // This is a known Nextcloud API issue - permissions must be set via PUT after share creation
      const updateUrl = `${NC_BASE.replace(/\/$/, '')}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}?format=json`;
      
      // DO NOT use publicUpload - it's a legacy flag that overrides permissions!
      const updateParams = new URLSearchParams({
        permissions: '15' // read(1) + update(2) + create(4) + delete(8) = 15 (editable public folder)
      });

      console.log(`🔧 Updating share ${shareId} permissions to 15 (editable public folder) as admin...`);

      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': adminAuthHeader,
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: updateParams.toString()
      });

      const updateData = await updateResponse.json();
      const finalPermissions = updateData?.ocs?.data?.permissions;
      console.log(`📋 Update Response status: ${updateResponse.status}`);
      console.log(`📋 Final permissions: ${finalPermissions}`);
      
      if (finalPermissions !== 15) {
        console.warn(`⚠️ Permissions not set correctly. Expected 15, got ${finalPermissions}`);
      } else {
        console.log(`✅ Share permissions updated to 15 (editable public folder)`);
      }

      // RESPOND WITH SHARE URL - user can now access their Nextcloud folder
      console.log(`✅ Responding with shareUrl for ${firstName} ${lastName}`);
      res.json({ 
        success: true, 
        shareUrl,
        message: language === 'fr-FR'
          ? 'Votre espace de téléversement est prêt !'
          : 'Your upload space is ready!'
      });

      // BACKGROUND: Send emails and save to database
      setImmediate(async () => {
        try {
      // 3) PREPARE EMAIL CONTENT (fast, no network)
      const safeFirstName = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeLastName = lastName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeAgencyCode = agencyCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safePhone = phone ? phone.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
      const safeEmail = email.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Get agency name from validated code
      let agencyName = '';
      try {
        const agencyData = await travelService.getTravelAgencyCodeByCode(agencyCode);
        agencyName = agencyData?.agency_name || '';
      } catch (e) {
        console.warn('Could not fetch agency name for email:', e);
      }
      const safeAgencyName = agencyName.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const subjectAgency = language === 'fr-FR' 
        ? 'Votre lien de téléversement sécurisé MEMOPYK'
        : 'Your MEMOPYK secure upload link';
      
      // Professional email template with MEMOPYK branding
      const bodyAgency = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;background-color:#F2EBDC;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2EBDC;padding:20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color:#2A4759;background:linear-gradient(135deg,#2A4759 0%,#011526 100%);padding:20px 30px;text-align:center;">
                      <h1 style="color:#ffffff;font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:700;margin:0;letter-spacing:2px;">MEMOPYK</h1>
                      <p style="color:#89BAD9;margin:10px 0 0;font-size:14px;font-weight:300;font-style:italic;">
                        ${language === 'fr-FR' ? 'Le voyage continue, même après votre retour.' : 'The journey continues, even after your return.'}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main content -->
                  <tr>
                    <td style="padding:40px 30px;">
                      <p style="color:#2A4759;font-size:18px;margin:0 0 20px;">
                        ${language === 'fr-FR' ? 'Bonjour' : 'Hello'} <strong>${safeFirstName}</strong>,
                      </p>
                      
                      ${language === 'fr-FR' 
                        ? `<p style="color:#333;font-size:16px;margin:0 0 25px;"><strong>Votre espace de téléversement sécurisé est maintenant prêt.</strong></p>`
                        : `<p style="color:#333;font-size:16px;margin:0 0 25px;"><strong>Your secure upload space is now ready.</strong></p>`
                      }
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                        <tr>
                          <td align="center">
                            <a href="${shareUrl}" style="display:inline-block;background-color:#D67C4A;color:#ffffff;padding:18px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(214,124,74,0.4);">
                              ${language === 'fr-FR' ? 'Accéder à mon espace' : 'Access my space'}
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Copyable URL -->
                      <p style="color:#666;font-size:12px;margin:0 0 30px;text-align:center;">
                        ${language === 'fr-FR' ? 'Ou copiez ce lien' : 'Or copy this link'}:<br>
                        <a href="${shareUrl}" style="color:#D67C4A;word-break:break-all;font-size:13px;">${shareUrl}</a>
                      </p>
                      
                      <!-- Separator -->
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      ${language === 'fr-FR' 
                        ? `<!-- Section: Pour déposer vos photos et vidéos -->
                           <h3 style="color:#2A4759;font-size:16px;margin:0 0 15px;font-weight:600;">Pour déposer vos photos et vidéos</h3>
                           <ol style="color:#333;font-size:14px;margin:0 0 25px;padding-left:20px;line-height:1.8;">
                             <li style="margin-bottom:8px;">Ouvrez le lien ci-dessus : votre espace personnel s'ouvre dans votre navigateur.</li>
                             <li style="margin-bottom:8px;">En haut de la page, cliquez sur <strong>« + »</strong> ou <strong>« Téléverser »</strong> pour ajouter des fichiers.</li>
                             <li style="margin-bottom:8px;">Sélectionnez vos photos et vidéos depuis votre ordinateur ou votre téléphone.</li>
                             <li style="margin-bottom:8px;">Patientez pendant le transfert jusqu'à ce que tout soit terminé.</li>
                           </ol>
                           
                           <!-- Separator -->
                           <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                           
                           <!-- SPECIAL OPTIONAL SECTION: Tips Box -->
                           <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:12px;border:1px dashed #D67C4A;margin:0 0 25px;">
                             <tr>
                               <td style="padding:20px 25px;">
                                 <p style="color:#D67C4A;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">💡 Astuce – créer des dossiers dans votre espace</p>
                                 <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">Dans votre espace de dépôt, vous pouvez créer vos propres dossiers, comme sur votre ordinateur.</p>
                                 <p style="color:#333;font-size:14px;margin:0 0 10px;">Pour en créer un :</p>
                                 <ul style="color:#555;font-size:13px;margin:0 0 15px;padding-left:18px;line-height:1.7;">
                                   <li style="margin-bottom:5px;">cliquez sur <strong>« Nouveau »</strong> en haut,</li>
                                   <li style="margin-bottom:5px;">puis choisissez <strong>« Nouveau dossier »</strong>,</li>
                                   <li style="margin-bottom:5px;">donnez-lui un nom et validez.</li>
                                 </ul>
                                 <p style="color:#666;font-size:13px;margin:0 0 15px;font-style:italic;">Vous pourrez renommer ou déplacer vos dossiers plus tard, à tout moment.</p>
                                 
                                 <p style="color:#2A4759;font-size:14px;margin:15px 0 10px;font-weight:600;">Idées pour organiser les photos et vidéos de votre voyage :</p>
                                 <ul style="color:#555;font-size:13px;margin:0;padding-left:18px;line-height:1.7;">
                                   <li style="margin-bottom:5px;">créer un dossier par ville ou par étape,</li>
                                   <li style="margin-bottom:5px;">créer un dossier par escale (pour une croisière),</li>
                                   <li style="margin-bottom:5px;">regrouper les moments importants (excursions, hôtels, paysages, etc.).</li>
                                 </ul>
                                 <p style="color:#888;font-size:12px;margin:12px 0 0;font-style:italic;">Il n'y a pas de règle : choisissez ce qui vous aide le mieux à raconter votre voyage.</p>
                               </td>
                             </tr>
                           </table>
                           
                           <!-- Separator -->
                           <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                           
                           <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">Vous pouvez commencer par quelques fichiers de test si vous le souhaitez.<br>Le lien restera actif pour vous permettre d'ajouter des fichiers à tout moment.</p>
                           <p style="color:#333;font-size:14px;margin:0 0 10px;font-style:italic;">Si vous rencontrez la moindre difficulté, nous restons bien sûr à votre disposition pour vous aider :</p>
                           <p style="color:#2A4759;font-size:14px;margin:0 0 25px;">
                             <a href="mailto:contact@memopyk.com" style="color:#D67C4A;text-decoration:none;">contact@memopyk.com</a><br>
                             <a href="tel:+33745843821" style="color:#D67C4A;text-decoration:none;">(+33) 07 45 84 38 21</a>
                           </p>`
                        : `<!-- Section: To upload your photos and videos -->
                           <h3 style="color:#2A4759;font-size:16px;margin:0 0 15px;font-weight:600;">To upload your photos and videos</h3>
                           <ol style="color:#333;font-size:14px;margin:0 0 25px;padding-left:20px;line-height:1.8;">
                             <li style="margin-bottom:8px;">Open the link above: your personal space opens in your browser.</li>
                             <li style="margin-bottom:8px;">At the top of the page, click on <strong>"+"</strong> or <strong>"Upload"</strong> to add files.</li>
                             <li style="margin-bottom:8px;">Select your photos and videos from your computer or phone.</li>
                             <li style="margin-bottom:8px;">Wait during the transfer until everything is complete.</li>
                           </ol>
                           
                           <!-- Separator -->
                           <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                           
                           <!-- SPECIAL OPTIONAL SECTION: Tips Box -->
                           <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:12px;border:1px dashed #D67C4A;margin:0 0 25px;">
                             <tr>
                               <td style="padding:20px 25px;">
                                 <p style="color:#D67C4A;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">💡 Tip – create folders in your space</p>
                                 <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">In your upload space, you can create your own folders, just like on your computer.</p>
                                 <p style="color:#333;font-size:14px;margin:0 0 10px;">To create one:</p>
                                 <ul style="color:#555;font-size:13px;margin:0 0 15px;padding-left:18px;line-height:1.7;">
                                   <li style="margin-bottom:5px;">click on <strong>"New"</strong> at the top,</li>
                                   <li style="margin-bottom:5px;">then choose <strong>"New folder"</strong>,</li>
                                   <li style="margin-bottom:5px;">give it a name and confirm.</li>
                                 </ul>
                                 <p style="color:#666;font-size:13px;margin:0 0 15px;font-style:italic;">You can rename or move your folders later, at any time.</p>
                                 
                                 <p style="color:#2A4759;font-size:14px;margin:15px 0 10px;font-weight:600;">Ideas for organizing your travel photos and videos:</p>
                                 <ul style="color:#555;font-size:13px;margin:0;padding-left:18px;line-height:1.7;">
                                   <li style="margin-bottom:5px;">create a folder per city or stage,</li>
                                   <li style="margin-bottom:5px;">create a folder per port of call (for a cruise),</li>
                                   <li style="margin-bottom:5px;">group important moments (excursions, hotels, landscapes, etc.).</li>
                                 </ul>
                                 <p style="color:#888;font-size:12px;margin:12px 0 0;font-style:italic;">There are no rules: choose what helps you best tell your travel story.</p>
                               </td>
                             </tr>
                           </table>
                           
                           <!-- Separator -->
                           <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                           
                           <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">You can start with a few test files if you wish.<br>The link will remain active so you can add files at any time.</p>
                           <p style="color:#333;font-size:14px;margin:0 0 10px;font-style:italic;">If you encounter any difficulty, we are of course available to help you:</p>
                           <p style="color:#2A4759;font-size:14px;margin:0 0 25px;">
                             <a href="mailto:contact@memopyk.com" style="color:#D67C4A;text-decoration:none;">contact@memopyk.com</a><br>
                             <a href="tel:+33745843821" style="color:#D67C4A;text-decoration:none;">(+33) 07 45 84 38 21</a>
                           </p>`
                      }
                      
                      <!-- Separator -->
                      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                      
                      <!-- Agency info box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;border-left:4px solid #D67C4A;margin:0;">
                        <tr>
                          <td style="padding:15px 20px;">
                            <p style="color:#2A4759;font-size:14px;margin:0 0 8px;">
                              <strong>${language === 'fr-FR' ? 'Votre Agence de Voyage' : 'Your Travel Agency'}:</strong> ${safeAgencyName || safeAgencyCode}
                            </p>
                            <p style="color:#2A4759;font-size:14px;margin:0;">
                              <strong>${language === 'fr-FR' ? 'Votre Code MEMOPYK' : 'Your MEMOPYK Code'}:</strong> ${safeAgencyCode}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#2A4759;padding:25px 30px;text-align:center;">
                      <p style="color:#89BAD9;font-size:12px;margin:0;">
                        ${language === 'fr-FR' 
                          ? 'Si vous n\'avez pas demandé ce lien, vous pouvez ignorer cet email.'
                          : 'If you did not request this link, you can ignore this email.'}
                      </p>
                      <p style="color:#F2EBDC;font-size:11px;margin:15px 0 0;">
                        © ${new Date().getFullYear()} MEMOPYK - ${language === 'fr-FR' ? 'Tous droits réservés' : 'All rights reserved'}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const bodyNgoc = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;line-height:1.6;background:#f5f5f5;padding:20px;">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#2A4759 0%,#011526 100%);padding:20px;text-align:center;">
                <h2 style="color:#F2EBDC;margin:0;font-size:18px;">📁 New Travel Upload Request</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:25px;">
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;">
                  <tr><td style="color:#666;width:120px;">Client:</td><td style="color:#333;font-weight:600;">${safeFirstName} ${safeLastName}</td></tr>
                  <tr><td style="color:#666;">Email:</td><td><a href="mailto:${safeEmail}" style="color:#D67C4A;">${safeEmail}</a></td></tr>
                  <tr><td style="color:#666;">Phone:</td><td style="color:#333;">${safePhone || 'Not provided'}</td></tr>
                  <tr><td style="color:#666;">Agency:</td><td style="color:#333;font-weight:600;">${safeAgencyName || safeAgencyCode}${safeAgencyName ? ` (${safeAgencyCode})` : ''}</td></tr>
                  <tr><td style="color:#666;">Folder:</td><td style="color:#333;font-family:monospace;font-size:12px;">${folderPath}</td></tr>
                  <tr><td style="color:#666;">Share URL:</td><td><a href="${shareUrl}" style="color:#D67C4A;word-break:break-all;">${shareUrl}</a></td></tr>
                  <tr><td style="color:#666;">Share ID:</td><td style="color:#999;font-family:monospace;">${shareId}</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // 4) SEND EMAILS AND SAVE TO DATABASE (response already sent at start)
        let agencyEmailSent = false;
        let ngocEmailSent = false;

        // Send emails in parallel
        if (emailService && MAIL_FROM) {
          const emailPromises: Promise<void>[] = [];

          // Agency email
          emailPromises.push(
            emailService.send({
              from: `MEMOPYK <${MAIL_FROM}>`,
              to: email,
              bcc: MAIL_TO_NGOC || undefined,
              subject: subjectAgency,
              html: bodyAgency
            }).then(() => {
              agencyEmailSent = true;
              console.log(`✅ Email sent to agency: ${email}`);
            }).catch((err: any) => {
              console.error('❌ Failed to send agency email:', err);
            })
          );

          // Ngoc notification email
          if (MAIL_TO_NGOC) {
            emailPromises.push(
              emailService.send({
                from: `MEMOPYK <${MAIL_FROM}>`,
                to: MAIL_TO_NGOC,
                subject: 'New Travel Agency upload link created',
                html: bodyNgoc
              }).then(() => {
                ngocEmailSent = true;
                console.log(`✅ Notification sent to Ngoc`);
              }).catch((err: any) => {
                console.error('❌ Failed to send notification to Ngoc:', err);
              })
            );
          }

          await Promise.all(emailPromises);
        } else {
          console.log('⚠️ Resend not configured - skipping email notifications');
        }

        // Save to database
        try {
          const submissionData = {
            first_name: firstName,
            last_name: lastName,
            email,
            phone: phone || '',
            agency_code: agencyCode,
            agency_name: agencyName || '',
            language,
            folder_path: folderPath,
            share_url: shareUrl,
            share_id: shareId,
            share_token: shareUrl?.split('/').pop() || '',
            status: 'success',
            agency_email_sent: agencyEmailSent,
            ngoc_email_sent: ngocEmailSent
          };
          
          const savedSubmission = await travelService.createTravelUploadSubmission(submissionData);
          console.log(`✅ Submission saved to hybrid storage: ${savedSubmission.id}`);
        } catch (dbError) {
          console.error('❌ Failed to save submission to database:', dbError);
        }
        } catch (bgError) {
          console.error('❌ Background processing error:', bgError);
        }
      });
    } catch (error) {
      console.error('❌ Error in travel upload submission:', error);
      res.status(500).json({ error: 'Failed to process submission' });
    }
  });

  // Test Nextcloud connection (admin debug endpoint)
  router.get('/api/travel-upload/test-connection', async (req, res) => {
    try {
      const NC_BASE = process.env.NC_BASE;
      const NC_USER = process.env.NC_USER;
      const NC_PASS = process.env.NC_PASS;
      const NC_FOLDER = process.env.NC_FOLDER;

      if (!NC_BASE || !NC_USER || !NC_PASS || !NC_FOLDER) {
        return res.status(500).json({ 
          error: 'Missing config',
          hasBase: !!NC_BASE,
          hasUser: !!NC_USER,
          hasPass: !!NC_PASS,
          hasFolder: !!NC_FOLDER
        });
      }

      const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');

      // Test WebDAV access
      const propfindUrl = `${NC_BASE.replace(/\/$/, '')}/remote.php/dav/files/${NC_USER}/${NC_FOLDER}/`;
      const propfindResponse = await fetch(propfindUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Depth': '0'
        }
      });

      const propfindText = await propfindResponse.text();

      res.json({
        success: propfindResponse.status === 207,
        webdav_status: propfindResponse.status,
        base_url: NC_BASE,
        user: NC_USER,
        folder: NC_FOLDER,
        folder_exists: propfindResponse.status === 207,
        response_preview: propfindText.substring(0, 200)
      });
    } catch (error) {
      console.error('❌ Nextcloud test failed:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== TRAVEL UPLOAD ADMIN ENDPOINTS ====================

  // Get all travel upload submissions (for admin use) - uses hybrid storage
  router.get('/api/travel-upload/submissions', requireAdmin, async (req, res) => {
    try {
      console.log('🔍 [Travel] GET /api/travel-upload/submissions - Starting request');
      const { agencyCode, startDate, endDate, search } = req.query;

      const filters: any = {};
      if (agencyCode) filters.agencyCode = agencyCode as string;
      if (startDate) filters.startDate = startDate as string;
      if (endDate) filters.endDate = endDate as string;
      if (search) filters.search = search as string;

      console.log('🔍 [Travel] Calling travelService.getTravelUploadSubmissions with filters:', filters);
      const submissions = await travelService.getTravelUploadSubmissions(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      console.log(`✅ [Travel] Retrieved ${Array.isArray(submissions) ? submissions.length : 0} submissions`);

      res.json(submissions);
    } catch (error) {
      console.error('❌ [Travel] Error reading travel upload submissions:', error);
      res.status(500).json({ error: 'Failed to read submissions' });
    }
  });

  // Delete a travel upload submission (from database only, NOT Nextcloud)
  router.delete('/api/travel-upload/submissions/:id', requireAdmin, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
      }
      
      // Get submission details before deletion for the warning
      const submission = await travelService.getTravelUploadSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      
      await travelService.deleteTravelUploadSubmission(submissionId);
      
      res.json({ 
        success: true, 
        message: 'Submission deleted from database. Note: The Nextcloud folder still exists and must be deleted manually if needed.',
        folderPath: submission.folder_path
      });
    } catch (error) {
      console.error('Error deleting travel upload submission:', error);
      res.status(500).json({ error: 'Failed to delete submission' });
    }
  });

  // Resend confirmation email
  router.post('/api/travel-upload/submissions/:id/resend-email', requireAdmin, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
      }
      
      const submission = await travelService.getTravelUploadSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      
      if (!emailService) {
        return res.status(500).json({ error: 'Email service not configured' });
      }
      
      const isFrench = submission.language?.startsWith('fr');
      const MAIL_FROM = process.env.MAIL_FROM || 'contact@memopyk.com';
      
      const subjectAgency = isFrench
        ? 'MEMOPYK : Votre lien de dépôt de souvenirs'
        : 'MEMOPYK: Your memories deposit link';
      
      const bodyAgency = isFrench
        ? `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;background-color:#F2EBDC;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2EBDC;padding:20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color:#2A4759;background:linear-gradient(135deg,#2A4759 0%,#011526 100%);padding:20px 30px;text-align:center;">
                      <h1 style="color:#ffffff;font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:700;margin:0;letter-spacing:2px;">MEMOPYK</h1>
                      <p style="color:#89BAD9;margin:10px 0 0;font-size:14px;font-weight:300;font-style:italic;">Le voyage continue, même après votre retour.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 30px;">
                      <p style="color:#2A4759;font-size:18px;margin:0 0 20px;">Bonjour <strong>${submission.first_name}</strong>,</p>
                      <p style="color:#333;font-size:16px;margin:0 0 25px;"><strong>Votre espace de téléversement sécurisé est maintenant prêt.</strong></p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                        <tr>
                          <td align="center">
                            <a href="${submission.share_url}" style="display:inline-block;background-color:#D67C4A;color:#ffffff;padding:18px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(214,124,74,0.4);">Accéder à mon espace</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color:#666;font-size:12px;margin:0 0 30px;text-align:center;">Ou copiez ce lien :<br><a href="${submission.share_url}" style="color:#D67C4A;word-break:break-all;font-size:13px;">${submission.share_url}</a></p>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <h3 style="color:#2A4759;font-size:16px;margin:0 0 15px;font-weight:600;">Pour déposer vos photos et vidéos</h3>
                      <ol style="color:#333;font-size:14px;margin:0 0 25px;padding-left:20px;line-height:1.8;">
                        <li style="margin-bottom:8px;">Ouvrez le lien ci-dessus : votre espace personnel s'ouvre dans votre navigateur.</li>
                        <li style="margin-bottom:8px;">En haut de la page, cliquez sur <strong>« + »</strong> ou <strong>« Téléverser »</strong> pour ajouter des fichiers.</li>
                        <li style="margin-bottom:8px;">Sélectionnez vos photos et vidéos depuis votre ordinateur ou votre téléphone.</li>
                        <li style="margin-bottom:8px;">Patientez pendant le transfert jusqu'à ce que tout soit terminé.</li>
                      </ol>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <!-- Tips Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:12px;border:1px dashed #D67C4A;margin:0 0 25px;">
                        <tr>
                          <td style="padding:20px 25px;">
                            <p style="color:#D67C4A;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">💡 Astuce – créer des dossiers dans votre espace</p>
                            <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">Dans votre espace de dépôt, vous pouvez créer vos propres dossiers, comme sur votre ordinateur.</p>
                            <p style="color:#333;font-size:14px;margin:0 0 10px;">Pour en créer un :</p>
                            <ul style="color:#555;font-size:13px;margin:0 0 15px;padding-left:18px;line-height:1.7;">
                              <li style="margin-bottom:5px;">cliquez sur <strong>« Nouveau »</strong> en haut,</li>
                              <li style="margin-bottom:5px;">puis choisissez <strong>« Nouveau dossier »</strong>,</li>
                              <li style="margin-bottom:5px;">donnez-lui un nom et validez.</li>
                            </ul>
                            <p style="color:#666;font-size:13px;margin:0 0 15px;font-style:italic;">Vous pourrez renommer ou déplacer vos dossiers plus tard, à tout moment.</p>
                            <p style="color:#2A4759;font-size:14px;margin:15px 0 10px;font-weight:600;">Idées pour organiser les photos et vidéos de votre voyage :</p>
                            <ul style="color:#555;font-size:13px;margin:0;padding-left:18px;line-height:1.7;">
                              <li style="margin-bottom:5px;">créer un dossier par ville ou par étape,</li>
                              <li style="margin-bottom:5px;">créer un dossier par escale (pour une croisière),</li>
                              <li style="margin-bottom:5px;">regrouper les moments importants (excursions, hôtels, paysages, etc.).</li>
                            </ul>
                            <p style="color:#888;font-size:12px;margin:12px 0 0;font-style:italic;">Il n'y a pas de règle : choisissez ce qui vous aide le mieux à raconter votre voyage.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">Vous pouvez commencer par quelques fichiers de test si vous le souhaitez.<br>Le lien restera actif pour vous permettre d'ajouter des fichiers à tout moment.</p>
                      <p style="color:#333;font-size:14px;margin:0 0 10px;font-style:italic;">Si vous rencontrez la moindre difficulté, nous restons bien sûr à votre disposition pour vous aider :</p>
                      <p style="color:#2A4759;font-size:14px;margin:0 0 25px;">
                        <a href="mailto:contact@memopyk.com" style="color:#D67C4A;text-decoration:none;">contact@memopyk.com</a><br>
                        <a href="tel:+33745843821" style="color:#D67C4A;text-decoration:none;">(+33) 07 45 84 38 21</a>
                      </p>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;border-left:4px solid #D67C4A;margin:0;">
                        <tr>
                          <td style="padding:15px 20px;">
                            <p style="color:#2A4759;font-size:14px;margin:0 0 8px;"><strong>Votre Agence de Voyage:</strong> ${submission.agency_name || submission.agency_code}</p>
                            <p style="color:#2A4759;font-size:14px;margin:0;"><strong>Votre Code MEMOPYK:</strong> ${submission.agency_code}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#2A4759;padding:25px 30px;text-align:center;">
                      <p style="color:#89BAD9;font-size:12px;margin:0;">Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.</p>
                      <p style="color:#F2EBDC;font-size:11px;margin:15px 0 0;">© ${new Date().getFullYear()} MEMOPYK - Tous droits réservés</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>`
        : `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;background-color:#F2EBDC;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2EBDC;padding:20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color:#2A4759;background:linear-gradient(135deg,#2A4759 0%,#011526 100%);padding:20px 30px;text-align:center;">
                      <h1 style="color:#ffffff;font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:700;margin:0;letter-spacing:2px;">MEMOPYK</h1>
                      <p style="color:#89BAD9;margin:10px 0 0;font-size:14px;font-weight:300;font-style:italic;">The journey continues, even after your return.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 30px;">
                      <p style="color:#2A4759;font-size:18px;margin:0 0 20px;">Hello <strong>${submission.first_name}</strong>,</p>
                      <p style="color:#333;font-size:16px;margin:0 0 25px;"><strong>Your secure upload space is now ready.</strong></p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                        <tr>
                          <td align="center">
                            <a href="${submission.share_url}" style="display:inline-block;background-color:#D67C4A;color:#ffffff;padding:18px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(214,124,74,0.4);">Access my space</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color:#666;font-size:12px;margin:0 0 30px;text-align:center;">Or copy this link:<br><a href="${submission.share_url}" style="color:#D67C4A;word-break:break-all;font-size:13px;">${submission.share_url}</a></p>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <h3 style="color:#2A4759;font-size:16px;margin:0 0 15px;font-weight:600;">To upload your photos and videos</h3>
                      <ol style="color:#333;font-size:14px;margin:0 0 25px;padding-left:20px;line-height:1.8;">
                        <li style="margin-bottom:8px;">Open the link above: your personal space opens in your browser.</li>
                        <li style="margin-bottom:8px;">At the top of the page, click on <strong>"+"</strong> or <strong>"Upload"</strong> to add files.</li>
                        <li style="margin-bottom:8px;">Select your photos and videos from your computer or phone.</li>
                        <li style="margin-bottom:8px;">Wait during the transfer until everything is complete.</li>
                      </ol>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <!-- Tips Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%);border-radius:12px;border:1px dashed #D67C4A;margin:0 0 25px;">
                        <tr>
                          <td style="padding:20px 25px;">
                            <p style="color:#D67C4A;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">💡 Tip – create folders in your space</p>
                            <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">In your upload space, you can create your own folders, just like on your computer.</p>
                            <p style="color:#333;font-size:14px;margin:0 0 10px;">To create one:</p>
                            <ul style="color:#555;font-size:13px;margin:0 0 15px;padding-left:18px;line-height:1.7;">
                              <li style="margin-bottom:5px;">click on <strong>"New"</strong> at the top,</li>
                              <li style="margin-bottom:5px;">then choose <strong>"New folder"</strong>,</li>
                              <li style="margin-bottom:5px;">give it a name and confirm.</li>
                            </ul>
                            <p style="color:#666;font-size:13px;margin:0 0 15px;font-style:italic;">You can rename or move your folders later, at any time.</p>
                            <p style="color:#2A4759;font-size:14px;margin:15px 0 10px;font-weight:600;">Ideas for organizing your travel photos and videos:</p>
                            <ul style="color:#555;font-size:13px;margin:0;padding-left:18px;line-height:1.7;">
                              <li style="margin-bottom:5px;">create a folder per city or stage,</li>
                              <li style="margin-bottom:5px;">create a folder per port of call (for a cruise),</li>
                              <li style="margin-bottom:5px;">group important moments (excursions, hotels, landscapes, etc.).</li>
                            </ul>
                            <p style="color:#888;font-size:12px;margin:12px 0 0;font-style:italic;">There are no rules: choose what helps you best tell your travel story.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:25px 0;">
                      
                      <p style="color:#333;font-size:14px;margin:0 0 15px;line-height:1.6;">You can start with a few test files if you wish.<br>The link will remain active so you can add files at any time.</p>
                      <p style="color:#333;font-size:14px;margin:0 0 10px;font-style:italic;">If you encounter any difficulty, we are of course available to help you:</p>
                      <p style="color:#2A4759;font-size:14px;margin:0 0 25px;">
                        <a href="mailto:contact@memopyk.com" style="color:#D67C4A;text-decoration:none;">contact@memopyk.com</a><br>
                        <a href="tel:+33745843821" style="color:#D67C4A;text-decoration:none;">(+33) 07 45 84 38 21</a>
                      </p>
                      
                      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                      
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;border-left:4px solid #D67C4A;margin:0;">
                        <tr>
                          <td style="padding:15px 20px;">
                            <p style="color:#2A4759;font-size:14px;margin:0 0 8px;"><strong>Your Travel Agency:</strong> ${submission.agency_name || submission.agency_code}</p>
                            <p style="color:#2A4759;font-size:14px;margin:0;"><strong>Your MEMOPYK Code:</strong> ${submission.agency_code}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#2A4759;padding:25px 30px;text-align:center;">
                      <p style="color:#89BAD9;font-size:12px;margin:0;">If you did not request this link, you can ignore this email.</p>
                      <p style="color:#F2EBDC;font-size:11px;margin:15px 0 0;">© ${new Date().getFullYear()} MEMOPYK - All rights reserved</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>`;
      
      await emailService.send({
        from: `MEMOPYK <${MAIL_FROM}>`,
        to: submission.email,
        subject: subjectAgency,
        html: bodyAgency
      });
      
      // Update submission to track resend
      await travelService.updateTravelUploadSubmission(submissionId, {
        agency_email_sent: true
      });
      
      console.log(`✅ Confirmation email resent to: ${submission.email}`);
      res.json({ success: true, message: 'Email resent successfully' });
    } catch (error) {
      console.error('Error resending email:', error);
      res.status(500).json({ error: 'Failed to resend email' });
    }
  });

  // Get Nextcloud folder statistics for a submission
  router.get('/api/travel-upload/submissions/:id/folder-stats', requireAdmin, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.id);
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
      }
      
      const submission = await travelService.getTravelUploadSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      
      const NC_BASE = process.env.NC_BASE;
      const NC_USER = process.env.NC_USER;
      const NC_PASS = process.env.NC_PASS;
      
      if (!NC_BASE || !NC_USER || !NC_PASS) {
        return res.status(500).json({ error: 'Nextcloud not configured' });
      }
      
      const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
      const folderUrl = `${NC_BASE.replace(/\/$/, '')}/remote.php/dav/files/${NC_USER}${submission.folder_path}/`;
      
      // PROPFIND with Depth: infinity to get all files recursively
      const propfindResponse = await fetch(folderUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Depth': 'infinity',
          'Content-Type': 'application/xml'
        },
        body: `<?xml version="1.0" encoding="UTF-8"?>
          <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
            <d:prop>
              <d:getcontentlength/>
              <d:getlastmodified/>
              <d:resourcetype/>
              <d:getcontenttype/>
            </d:prop>
          </d:propfind>`
      });
      
      if (propfindResponse.status === 404) {
        return res.json({
          exists: false,
          totalFolders: 0,
          totalFiles: 0,
          totalSize: 0,
          totalSizeMB: '0.00',
          lastUpload: null
        });
      }
      
      if (propfindResponse.status !== 207) {
        return res.status(500).json({ error: `Nextcloud returned status ${propfindResponse.status}` });
      }
      
      const xmlText = await propfindResponse.text();
      
      // Parse XML to count files and folders, calculate total size, find last modified
      let totalFiles = 0;
      let totalFolders = 0;
      let totalSize = 0;
      let lastModified: Date | null = null;
      
      // Simple XML parsing for our needs
      const responses = xmlText.split('<d:response>').slice(1);
      
      for (const response of responses) {
        const isCollection = response.includes('<d:collection');
        const sizeMatch = response.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/);
        const modifiedMatch = response.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/);
        
        if (isCollection) {
          totalFolders++;
        } else if (sizeMatch) {
          totalFiles++;
          totalSize += parseInt(sizeMatch[1], 10);
        }
        
        if (modifiedMatch) {
          const modified = new Date(modifiedMatch[1]);
          if (!lastModified || modified > lastModified) {
            lastModified = modified;
          }
        }
      }
      
      // Subtract 1 from folders to exclude the root folder itself
      totalFolders = Math.max(0, totalFolders - 1);
      
      res.json({
        exists: true,
        totalFolders,
        totalFiles,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        lastUpload: lastModified ? lastModified.toISOString() : null
      });
    } catch (error) {
      console.error('Error getting folder stats:', error);
      res.status(500).json({ error: 'Failed to get folder statistics' });
    }
  });

  // Bulk get folder stats for multiple submissions
  router.post('/api/travel-upload/bulk-folder-stats', requireAdmin, async (req, res) => {
    try {
      const { submissionIds } = req.body;
      
      if (!Array.isArray(submissionIds)) {
        return res.status(400).json({ error: 'submissionIds must be an array' });
      }
      
      const NC_BASE = process.env.NC_BASE;
      const NC_USER = process.env.NC_USER;
      const NC_PASS = process.env.NC_PASS;
      
      if (!NC_BASE || !NC_USER || !NC_PASS) {
        return res.status(500).json({ error: 'Nextcloud not configured' });
      }
      
      const authHeader = 'Basic ' + Buffer.from(`${NC_USER}:${NC_PASS}`).toString('base64');
      const results: Record<number, any> = {};
      
      for (const id of submissionIds) {
        try {
          const submission = await travelService.getTravelUploadSubmissionById(id);
          if (!submission) {
            results[id] = { error: 'Submission not found' };
            continue;
          }
          
          const folderUrl = `${NC_BASE.replace(/\/$/, '')}/remote.php/dav/files/${NC_USER}${submission.folder_path}/`;
          
          const propfindResponse = await fetch(folderUrl, {
            method: 'PROPFIND',
            headers: {
              'Authorization': authHeader,
              'Depth': 'infinity',
              'Content-Type': 'application/xml'
            },
            body: `<?xml version="1.0" encoding="UTF-8"?>
              <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
                <d:prop>
                  <d:getcontentlength/>
                  <d:getlastmodified/>
                  <d:resourcetype/>
                </d:prop>
              </d:propfind>`
          });
          
          if (propfindResponse.status === 404) {
            results[id] = { exists: false, totalFolders: 0, totalFiles: 0, totalSize: 0, totalSizeMB: '0.00', lastUpload: null };
            continue;
          }
          
          if (propfindResponse.status !== 207) {
            results[id] = { error: `Status ${propfindResponse.status}` };
            continue;
          }
          
          const xmlText = await propfindResponse.text();
          let totalFiles = 0, totalFolders = 0, totalSize = 0;
          let lastModified: Date | null = null;
          
          const responses = xmlText.split('<d:response>').slice(1);
          for (const response of responses) {
            const isCollection = response.includes('<d:collection');
            const sizeMatch = response.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/);
            const modifiedMatch = response.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/);
            
            if (isCollection) {
              totalFolders++;
            } else if (sizeMatch) {
              totalFiles++;
              totalSize += parseInt(sizeMatch[1], 10);
            }
            
            if (modifiedMatch) {
              const modified = new Date(modifiedMatch[1]);
              if (!lastModified || modified > lastModified) {
                lastModified = modified;
              }
            }
          }
          
          totalFolders = Math.max(0, totalFolders - 1);
          results[id] = {
            exists: true,
            totalFolders,
            totalFiles,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            lastUpload: lastModified ? lastModified.toISOString() : null
          };
        } catch (err) {
          results[id] = { error: (err as Error).message };
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error getting bulk folder stats:', error);
      res.status(500).json({ error: 'Failed to get folder statistics' });
    }
  });

  // ==================== TRAVEL AGENCY CODES ADMIN ENDPOINTS ====================

  // Get all agency codes
  router.get('/api/travel-agency-codes', requireAdmin, async (req, res) => {
    try {
      console.log('🔍 [Travel] GET /api/travel-agency-codes - Starting request');
      const { isActive, search } = req.query;
      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search as string;

      console.log('🔍 [Travel] Calling travelService.getTravelAgencyCodes with filters:', filters);
      const codes = await travelService.getTravelAgencyCodes(filters);
      console.log(`✅ [Travel] Retrieved ${Array.isArray(codes) ? codes.length : 0} agency codes`);
      res.json(codes);
    } catch (error) {
      console.error('❌ [Travel] Error getting agency codes:', error);
      res.status(500).json({ error: 'Failed to get agency codes' });
    }
  });

  // Validate agency code (public endpoint for form validation - case-insensitive)
  router.get('/api/travel-agency-codes/validate/:code', async (req, res) => {
    try {
      const code = req.params.code;
      const agency = await travelService.getTravelAgencyCodeByCode(code);
      
      if (agency) {
        res.json({ valid: true, agencyName: agency.agency_name });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      console.error('Error validating agency code:', error);
      res.status(500).json({ error: 'Failed to validate code' });
    }
  });

  // Get single agency code
  router.get('/api/travel-agency-codes/:id', requireAdmin, async (req, res) => {
    try {
      const codeId = parseInt(req.params.id);
      if (isNaN(codeId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const code = await travelService.getTravelAgencyCodeById(codeId);
      if (!code) {
        return res.status(404).json({ error: 'Agency code not found' });
      }
      
      res.json(code);
    } catch (error) {
      console.error('Error getting agency code:', error);
      res.status(500).json({ error: 'Failed to get agency code' });
    }
  });

  // Create agency code
  router.post('/api/travel-agency-codes', requireAdmin, async (req, res) => {
    try {
      const { agencyName, agencyCode, contactEmail, contactPhone, notes, isActive } = req.body;
      
      if (!agencyName || !agencyCode) {
        return res.status(400).json({ error: 'Agency name and code are required' });
      }
      
      // Check if code already exists (case-insensitive)
      const existing = await travelService.getTravelAgencyCodeByCode(agencyCode);
      if (existing) {
        return res.status(409).json({ error: 'Agency code already exists' });
      }
      
      const newCode = await travelService.createTravelAgencyCode({
        agency_name: agencyName,
        agency_code: agencyCode,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        notes: notes || null,
        is_active: isActive !== false
      });
      
      res.status(201).json(newCode);
    } catch (error) {
      console.error('Error creating agency code:', error);
      res.status(500).json({ error: 'Failed to create agency code' });
    }
  });

  // Update agency code
  router.patch('/api/travel-agency-codes/:id', requireAdmin, async (req, res) => {
    try {
      const codeId = parseInt(req.params.id);
      if (isNaN(codeId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const { agencyName, agencyCode, contactEmail, contactPhone, notes, isActive } = req.body;
      
      const updates: any = {};
      if (agencyName !== undefined) updates.agency_name = agencyName;
      if (agencyCode !== undefined) updates.agency_code = agencyCode;
      if (contactEmail !== undefined) updates.contact_email = contactEmail;
      if (contactPhone !== undefined) updates.contact_phone = contactPhone;
      if (notes !== undefined) updates.notes = notes;
      if (isActive !== undefined) updates.is_active = isActive;
      
      const updated = await travelService.updateTravelAgencyCode(codeId, updates);
      res.json(updated);
    } catch (error) {
      console.error('Error updating agency code:', error);
      res.status(500).json({ error: 'Failed to update agency code' });
    }
  });

  // Delete agency code
  router.delete('/api/travel-agency-codes/:id', requireAdmin, async (req, res) => {
    try {
      const codeId = parseInt(req.params.id);
      if (isNaN(codeId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      await travelService.deleteTravelAgencyCode(codeId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting agency code:', error);
      res.status(500).json({ error: 'Failed to delete agency code' });
    }
  });

// =============================================================================
// Export Router
// =============================================================================

export default router;
