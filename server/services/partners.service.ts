/**
 * Partners Service
 *
 * CRUD operations for partner directory management.
 * Uses Drizzle ORM for type-safe database queries.
 */

import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

/**
 * Get all partners with optional filters
 */
export async function getPartners(filters?: {
  status?: string;
  isActive?: boolean;
  showOnMap?: boolean;
  search?: string;
}) {
  console.log('🔍 [Partners Service] getPartners called with filters:', filters);

  let query = db.select().from(schema.partners);

  // Build WHERE conditions
  const conditions = [];

  if (filters) {
    if (filters.status) {
      conditions.push(eq(schema.partners.status, filters.status));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(schema.partners.isActive, filters.isActive));
    }
    if (filters.showOnMap !== undefined) {
      conditions.push(eq(schema.partners.showOnMap, filters.showOnMap));
    }
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.partners.partnerName, searchTerm),
          ilike(schema.partners.city, searchTerm),
          ilike(schema.partners.country, searchTerm),
          ilike(schema.partners.email, searchTerm)
        )!
      );
    }
  }

  // Apply WHERE conditions if any
  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  // Order by partner name
  query = query.orderBy(desc(schema.partners.timestamp)) as any;

  const partners = await query;
  console.log(`✅ [Partners Service] Query returned ${partners.length} partners`);
  return partners;
}

/**
 * Get a single partner by ID
 */
export async function getPartnerById(id: number) {
  console.log(`🔍 [Partners Service] getPartnerById: ${id}`);
  const result = await db
    .select()
    .from(schema.partners)
    .where(eq(schema.partners.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Create a new partner
 */
export async function createPartner(data: any) {
  console.log(`✅ [Partners Service] Creating partner: ${data.partner_name || data.partnerName}`);

  // Normalize field names (handle both snake_case and camelCase)
  const partnerData = {
    timestamp: data.timestamp || new Date(),
    partnerType: data.partnerType || data.partner_type || 'digitization',
    partnerName: data.partnerName || data.partner_name || '',
    email: data.email || '',
    emailPublic: data.emailPublic ?? data.email_public ?? true,
    phone: data.phone || '',
    phonePublic: data.phonePublic ?? data.phone_public ?? false,
    website: data.website || '',
    address: data.address || '',
    addressLine2: data.addressLine2 || data.address_line2 || '',
    city: data.city || '',
    postalCode: data.postalCode || data.postal_code || '',
    country: data.country || '',
    photoFormats: data.photoFormats || data.photo_formats || '',
    otherPhoto: data.otherPhoto || data.other_photo || '',
    filmFormats: data.filmFormats || data.film_formats || '',
    otherFilm: data.otherFilm || data.other_film || '',
    videoCassettes: data.videoCassettes || data.video_cassettes || '',
    otherVideo: data.otherVideo || data.other_video || '',
    delivery: data.delivery || '',
    otherDelivery: data.otherDelivery || data.other_delivery || '',
    publicDescription: data.publicDescription || data.public_description || '',
    consent: data.consent ?? true,
    status: data.status || 'Pending',
    isActive: data.isActive ?? data.is_active ?? false,
    showOnMap: data.showOnMap ?? data.show_on_map ?? false,
    lat: data.lat || null,
    lng: data.lng || null,
    slug: data.slug || '',
  };

  const rows = await db.insert(schema.partners).values(partnerData as any).returning();
  console.log(`✅ [Partners Service] Partner created with ID: ${rows[0].id}`);
  return rows[0];
}

/**
 * Update an existing partner
 */
export async function updatePartner(id: number, updates: any) {
  console.log(`🔄 [Partners Service] Updating partner ID: ${id}`);

  // Normalize field names and filter out undefined values
  const updateData: any = {};

  if (updates.partnerType !== undefined) updateData.partnerType = updates.partnerType;
  if (updates.partner_type !== undefined) updateData.partnerType = updates.partner_type;
  if (updates.partnerName !== undefined) updateData.partnerName = updates.partnerName;
  if (updates.partner_name !== undefined) updateData.partnerName = updates.partner_name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.emailPublic !== undefined) updateData.emailPublic = updates.emailPublic;
  if (updates.email_public !== undefined) updateData.emailPublic = updates.email_public;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.phonePublic !== undefined) updateData.phonePublic = updates.phonePublic;
  if (updates.phone_public !== undefined) updateData.phonePublic = updates.phone_public;
  if (updates.website !== undefined) updateData.website = updates.website;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.addressLine2 !== undefined) updateData.addressLine2 = updates.addressLine2;
  if (updates.address_line2 !== undefined) updateData.addressLine2 = updates.address_line2;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.postalCode !== undefined) updateData.postalCode = updates.postalCode;
  if (updates.postal_code !== undefined) updateData.postalCode = updates.postal_code;
  if (updates.country !== undefined) updateData.country = updates.country;
  if (updates.photoFormats !== undefined) updateData.photoFormats = updates.photoFormats;
  if (updates.photo_formats !== undefined) updateData.photoFormats = updates.photo_formats;
  if (updates.otherPhoto !== undefined) updateData.otherPhoto = updates.otherPhoto;
  if (updates.other_photo !== undefined) updateData.otherPhoto = updates.other_photo;
  if (updates.filmFormats !== undefined) updateData.filmFormats = updates.filmFormats;
  if (updates.film_formats !== undefined) updateData.filmFormats = updates.film_formats;
  if (updates.otherFilm !== undefined) updateData.otherFilm = updates.otherFilm;
  if (updates.other_film !== undefined) updateData.otherFilm = updates.other_film;
  if (updates.videoCassettes !== undefined) updateData.videoCassettes = updates.videoCassettes;
  if (updates.video_cassettes !== undefined) updateData.videoCassettes = updates.video_cassettes;
  if (updates.otherVideo !== undefined) updateData.otherVideo = updates.otherVideo;
  if (updates.other_video !== undefined) updateData.otherVideo = updates.other_video;
  if (updates.delivery !== undefined) updateData.delivery = updates.delivery;
  if (updates.otherDelivery !== undefined) updateData.otherDelivery = updates.otherDelivery;
  if (updates.other_delivery !== undefined) updateData.otherDelivery = updates.other_delivery;
  if (updates.publicDescription !== undefined) updateData.publicDescription = updates.publicDescription;
  if (updates.public_description !== undefined) updateData.publicDescription = updates.public_description;
  if (updates.consent !== undefined) updateData.consent = updates.consent;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.is_active !== undefined) updateData.isActive = updates.is_active;
  if (updates.showOnMap !== undefined) updateData.showOnMap = updates.showOnMap;
  if (updates.show_on_map !== undefined) updateData.showOnMap = updates.show_on_map;
  if (updates.lat !== undefined) updateData.lat = updates.lat;
  if (updates.lng !== undefined) updateData.lng = updates.lng;
  if (updates.slug !== undefined) updateData.slug = updates.slug;

  // Always update timestamp
  updateData.updatedAt = new Date();

  const rows = await db
    .update(schema.partners)
    .set(updateData)
    .where(eq(schema.partners.id, id))
    .returning();

  if (rows.length === 0) {
    throw new Error('Partner not found');
  }

  console.log(`✅ [Partners Service] Partner updated: ${id}`);
  return rows[0];
}

/**
 * Delete a partner
 */
export async function deletePartner(id: number) {
  console.log(`🗑️ [Partners Service] Deleting partner ID: ${id}`);

  const rows = await db
    .delete(schema.partners)
    .where(eq(schema.partners.id, id))
    .returning();

  if (rows.length === 0) {
    throw new Error('Partner not found');
  }

  console.log(`✅ [Partners Service] Partner deleted: ${id}`);
  return { success: true };
}
