/**
 * Generate a URL-friendly slug from a string
 * Example: "Le Labo Vidéo" → "le-labo-video"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace accented characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces and special chars with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensure a partner has a slug, generating one from name if missing
 */
export function ensurePartnerSlug(partner: { slug?: string | null; name: string }): string {
  return partner.slug && partner.slug.trim() !== '' 
    ? partner.slug 
    : generateSlug(partner.name);
}

/**
 * Generate unique slugs for an array of partners, ensuring no duplicates
 * Partners with empty slugs get auto-generated ones with numeric suffixes if needed
 */
export function ensureUniquePartnerSlugs<T extends { slug?: string | null; name: string; id?: number }>(
  partners: T[]
): (T & { slug: string })[] {
  const slugCounts = new Map<string, number>();
  const usedSlugs = new Set<string>();
  
  return partners.map(partner => {
    // If partner already has a valid slug, use it
    if (partner.slug && partner.slug.trim() !== '') {
      usedSlugs.add(partner.slug);
      return { ...partner, slug: partner.slug };
    }
    
    // Generate base slug from name
    const baseSlug = generateSlug(partner.name);
    let finalSlug = baseSlug;
    let counter = 1;
    
    // If slug is already used, append numbers until we find a unique one
    while (usedSlugs.has(finalSlug)) {
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }
    
    usedSlugs.add(finalSlug);
    return { ...partner, slug: finalSlug };
  });
}
