import { z } from "zod";

export const PartnerIntakeSchema = z.object({
  partner_type: z.string().optional().default("digitization"),
  partner_name: z.string().min(2).max(120),
  email: z.string().min(1, "E-mail requis"),
  email_public: z.boolean().optional().default(true),
  phone: z.string().min(1, "Téléphone requis"),
  website: z.string()
    .min(1, "Site web requis")
    .refine((url) => {
      // Accept URLs with or without protocol
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      }
      // Accept domain-like strings (www.example.com or example.com)
      return /^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}/.test(url);
    }, "URL invalide"),
  address: z.object({
    street: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    postal_code: z.string().optional().default(""),
    country: z.string().min(2).max(2), // ISO-2
  }),
  services: z.array(z.enum(["Photo", "Film"])).min(1, "Sélectionnez au moins un type de service"),
  photo_formats: z.array(z.string()).optional().default([]),
  video_formats: z.array(z.string()).optional().default([]),
  film_formats: z.array(z.string()).optional().default([]),
  audio_formats: z.array(z.string()).optional().default([]),
  video_cassettes: z.array(z.string()).optional().default([]),
  other_photo_formats: z.string().max(120).optional().default(""),
  other_film_formats: z.string().max(120).optional().default(""),
  other_video_formats: z.string().max(120).optional().default(""),
  delivery: z.array(z.string()).optional().default([]),
  other_delivery: z.string().max(120).optional().default(""),
  output: z.array(z.string()).optional().default([]),
  turnaround: z.string().optional().default(""),
  rush: z.boolean().optional().default(false),
  languages: z.array(z.string()).optional().default([]),
  consent_listed: z.boolean(),
  public_description: z.string().optional().default(""),
  locale: z.enum(["fr", "en"]).default("fr"),
  csrfToken: z.string().min(8),
}).refine((data) => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(data.email);
}, (data) => ({
  message: data.locale === "fr"
    ? "Veuillez entrer une adresse e-mail valide"
    : "Please enter a valid email address",
  path: ["email"],
})).refine((data) => {
  const hasFormats = 
    (data.photo_formats && data.photo_formats.length > 0) ||
    (data.film_formats && data.film_formats.length > 0) ||
    (data.video_cassettes && data.video_cassettes.length > 0);
  return hasFormats;
}, (data) => ({
  message: data.locale === "fr" 
    ? "Au moins un format doit être sélectionné (photo, film, ou cassette vidéo)"
    : "At least one format must be selected (photo, film, or video cassette)",
  path: ["photo_formats"],
})).refine((data) => {
  return data.consent_listed === true;
}, (data) => ({
  message: data.locale === "fr"
    ? "Veuillez accepter d'être répertorié dans l'annuaire pour soumettre le formulaire"
    : "Please agree to be listed in the directory to submit the form",
  path: ["consent_listed"],
}));

export type PartnerIntake = z.infer<typeof PartnerIntakeSchema>;
