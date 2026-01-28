/**
 * Newsletter Routes
 * Email subscription handling via Resend
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Resend } from 'resend';

const router = Router();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const NewsletterSubscriptionSchema = z.object({
  email: z.string().email(),
  language: z.enum(['en-US', 'fr-FR'])
});

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const parsed = NewsletterSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }
    
    const { email, language } = parsed.data;
    
    if (!resend) {
      console.error('❌ Resend API key not configured');
      return res.status(500).json({ ok: false, error: 'email_service_unavailable' });
    }

    const isFrench = language === 'fr-FR';
    const timestamp = new Date().toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const emailHtml = `
    <div style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #F2EBDC;">
      <div style="background: linear-gradient(135deg, #2A4759 0%, #1a2d38 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #F2EBDC; font-size: 32px; margin: 0 0 10px 0; font-weight: 700;">
          📧 ${isFrench ? 'Nouvelle inscription Newsletter' : 'New Newsletter Subscription'}
        </h1>
        <p style="color: #89BAD9; margin: 0; font-size: 16px;">${timestamp}</p>
      </div>
      
      <div style="background: white; padding: 40px 30px;">
        <div style="background: linear-gradient(135deg, #D67C4A 0%, #c56a3a 100%); padding: 20px; border-radius: 12px; margin-bottom: 30px;">
          <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">
            👤 ${isFrench ? "Informations de l'abonné" : 'Subscriber Information'}
          </h2>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="padding: 16px; background: #F2EBDC; border-bottom: 2px solid #D67C4A; font-weight: bold; color: #2A4759; width: 40%;">
              📧 Email
            </td>
            <td style="padding: 16px; background: white; border-bottom: 2px solid #D67C4A; color: #2A4759;">
              <a href="mailto:${email}" style="color: #D67C4A; text-decoration: none; font-weight: 600;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px; background: #F2EBDC; border-bottom: 1px solid #e5e5e5; font-weight: bold; color: #2A4759;">
              🌍 ${isFrench ? 'Langue préférée' : 'Preferred Language'}
            </td>
            <td style="padding: 16px; background: white; border-bottom: 1px solid #e5e5e5; color: #2A4759;">
              ${isFrench ? '🇫🇷 Français' : '🇬🇧 English'}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px; background: #F2EBDC; font-weight: bold; color: #2A4759;">
              📅 ${isFrench ? "Date d'inscription" : 'Subscription Date'}
            </td>
            <td style="padding: 16px; background: white; color: #2A4759;">${timestamp}</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #2A4759; padding: 20px; text-align: center;">
        <p style="color: #F2EBDC; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} MEMOPYK - ${isFrench ? 'Transformez vos souvenirs en films cinématographiques' : 'Transform your memories into cinematic films'}
        </p>
      </div>
    </div>
    `;

    await resend.emails.send({
      from: 'MEMOPYK Newsletter <noreply@memopyk.com>',
      to: process.env.MAIL_TO_NGOC || 'ngoc@memopyk.com',
      subject: `📧 ${isFrench ? 'Nouvelle inscription' : 'New Subscription'}: ${email}`,
      html: emailHtml,
    });

    console.log(`✅ Newsletter subscription email sent for: ${email}`);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

export default router;
