/**
 * Email Service
 *
 * Consolidates Resend email sending into a single service.
 * Routes build their own HTML templates; this handles delivery.
 *
 * Usage:
 *   import { emailService } from '../services/email.service';
 *
 *   await emailService.send({
 *     to: 'client@example.com',
 *     subject: 'Your upload link',
 *     html: '<h1>Hello</h1>',
 *   });
 */

import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RESEND_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = process.env.MAIL_FROM
  ? `MEMOPYK <${process.env.MAIL_FROM}>`
  : "MEMOPYK <noreply@memopyk.com>";
const ADMIN_EMAIL = process.env.MAIL_TO_NGOC || "ngoc@memopyk.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  bcc?: string | string[];
  replyTo?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class EmailService {
  private resend: Resend | null;

  constructor() {
    this.resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;
  }

  /** Whether the Resend client is available (API key configured). */
  get isAvailable(): boolean {
    return this.resend !== null;
  }

  /** The default admin notification recipient. */
  get adminEmail(): string {
    return ADMIN_EMAIL;
  }

  /** Send an email via Resend. Returns structured result (never throws). */
  async send(opts: SendEmailOptions): Promise<SendResult> {
    if (!this.resend) {
      console.warn("[Email] Resend not configured — skipping email");
      return { success: false, error: "email_service_unavailable" };
    }

    try {
      const result = await this.resend.emails.send({
        from: opts.from ?? DEFAULT_FROM,
        to: opts.to,
        bcc: opts.bcc,
        replyTo: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
      });

      const id = (result as any)?.data?.id ?? (result as any)?.id;
      return { success: true, messageId: id };
    } catch (err: any) {
      console.error("[Email] Send failed:", err?.message ?? err);
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Send an admin notification (to MAIL_TO_NGOC).
   * Convenience wrapper around `send()`.
   */
  async notifyAdmin(subject: string, html: string): Promise<SendResult> {
    return this.send({ to: ADMIN_EMAIL, subject, html });
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const emailService = new EmailService();
export { EmailService };
