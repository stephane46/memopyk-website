import { z } from "zod";

export const PartnerIntakeSchema = z.object({
  partnerType: z.string().optional().default("digitization"),
  partnerName: z.string().min(2).max(120),
  email: z.string().min(1, "E-mail requis"),
  emailPublic: z.boolean().optional().default(true),
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
    postalCode: z.string().optional().default(""),
    country: z.string().min(2).max(2), // ISO-2
  }),
  services: z.array(z.enum(["Photo", "Film"])).min(1, "Sélectionnez au moins un type de service"),
  photoFormats: z.array(z.string()).optional().default([]),
  videoFormats: z.array(z.string()).optional().default([]),
  filmFormats: z.array(z.string()).optional().default([]),
  audioFormats: z.array(z.string()).optional().default([]),
  videoCassettes: z.array(z.string()).optional().default([]),
  otherPhotoFormats: z.string().max(120).optional().default(""),
  otherFilmFormats: z.string().max(120).optional().default(""),
  otherVideoFormats: z.string().max(120).optional().default(""),
  delivery: z.array(z.string()).optional().default([]),
  otherDelivery: z.string().max(120).optional().default(""),
  output: z.array(z.string()).optional().default([]),
  turnaround: z.string().optional().default(""),
  rush: z.boolean().optional().default(false),
  languages: z.array(z.string()).optional().default([]),
  consentListed: z.boolean(),
  publicDescription: z.string().optional().default(""),
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
    (data.photoFormats && data.photoFormats.length > 0) ||
    (data.filmFormats && data.filmFormats.length > 0) ||
    (data.videoCassettes && data.videoCassettes.length > 0);
  return hasFormats;
}, (data) => ({
  message: data.locale === "fr" 
    ? "Au moins un format doit être sélectionné (photo, film, ou cassette vidéo)"
    : "At least one format must be selected (photo, film, or video cassette)",
  path: ["photoFormats"],
})).refine((data) => {
  return data.consentListed === true;
}, (data) => ({
  message: data.locale === "fr"
    ? "Veuillez accepter d'être répertorié dans l'annuaire pour soumettre le formulaire"
    : "Please agree to be listed in the directory to submit the form",
  path: ["consentListed"],
}));

export type PartnerIntake = z.infer<typeof PartnerIntakeSchema>;
