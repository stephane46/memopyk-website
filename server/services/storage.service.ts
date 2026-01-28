/**
 * Storage Service
 *
 * Unified CRUD interface for all content tables via Drizzle.
 * Replaces the Replit-era "hybridStorage" pattern — Supabase is the single
 * source of truth; there are no JSON fallbacks.
 *
 * Methods follow the naming convention used by route files:
 *   hybridStorage.getXxx()        → SELECT
 *   hybridStorage.createXxx(data) → INSERT … RETURNING
 *   hybridStorage.updateXxx(id, data) → UPDATE … RETURNING
 *   hybridStorage.deleteXxx(id)   → DELETE
 */

import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

// ---------------------------------------------------------------------------
// Hero Videos
// ---------------------------------------------------------------------------

async function getHeroVideos() {
  return db.select().from(schema.heroVideos).orderBy(asc(schema.heroVideos.orderIndex));
}

async function createHeroVideo(data: Record<string, unknown>) {
  const rows = await db.insert(schema.heroVideos).values(data as any).returning();
  return rows[0];
}

async function updateHeroVideo(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.heroVideos).set(data as any).where(eq(schema.heroVideos.id, id)).returning();
  return rows[0];
}

async function updateHeroVideoOrder(id: string, orderIndex: number) {
  return updateHeroVideo(id, { orderIndex });
}

async function deleteHeroVideo(id: string) {
  const rows = await db.delete(schema.heroVideos).where(eq(schema.heroVideos.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Hero Text Settings
// ---------------------------------------------------------------------------

async function getHeroTextSettings(_language?: string) {
  return db.select().from(schema.heroTextSettings);
}

async function createHeroText(data: Record<string, unknown>) {
  const rows = await db.insert(schema.heroTextSettings).values(data as any).returning();
  return rows[0];
}

async function updateHeroText(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.heroTextSettings).set(data as any).where(eq(schema.heroTextSettings.id, id)).returning();
  return rows[0];
}

async function deactivateAllHeroTexts() {
  await db.update(schema.heroTextSettings).set({ isActive: false } as any);
}

async function deleteHeroText(id: string) {
  const rows = await db.delete(schema.heroTextSettings).where(eq(schema.heroTextSettings.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Gallery Items
// ---------------------------------------------------------------------------

async function getGalleryItems() {
  return db.select().from(schema.galleryItems).orderBy(asc(schema.galleryItems.orderIndex));
}

async function createGalleryItem(data: Record<string, unknown>) {
  const rows = await db.insert(schema.galleryItems).values(data as any).returning();
  return rows[0];
}

async function updateGalleryItem(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.galleryItems).set(data as any).where(eq(schema.galleryItems.id, id)).returning();
  return rows[0];
}

async function updateGalleryItemOrder(id: string, orderIndex: number) {
  return updateGalleryItem(id, { orderIndex });
}

async function swapGalleryItemOrder(id1: string, id2: string) {
  const items = await db.select().from(schema.galleryItems);
  const a = items.find((i) => i.id === id1);
  const b = items.find((i) => i.id === id2);
  if (!a || !b) return;
  await updateGalleryItem(id1, { orderIndex: b.orderIndex });
  await updateGalleryItem(id2, { orderIndex: a.orderIndex });
}

async function deleteGalleryItem(id: string) {
  const rows = await db.delete(schema.galleryItems).where(eq(schema.galleryItems.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// FAQ Sections
// ---------------------------------------------------------------------------

async function getFaqSections() {
  return db.select().from(schema.faqSections).orderBy(asc(schema.faqSections.orderIndex));
}

async function createFAQSection(data: Record<string, unknown>) {
  const rows = await db.insert(schema.faqSections).values(data as any).returning();
  return rows[0];
}

async function updateFAQSection(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.faqSections).set(data as any).where(eq(schema.faqSections.id, id)).returning();
  return rows[0];
}

async function deleteFAQSection(id: string) {
  const rows = await db.delete(schema.faqSections).where(eq(schema.faqSections.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

async function getFaqs() {
  return db.select().from(schema.faqs).orderBy(asc(schema.faqs.orderIndex));
}

async function createFAQ(data: Record<string, unknown>) {
  const rows = await db.insert(schema.faqs).values(data as any).returning();
  return rows[0];
}

async function updateFAQ(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.faqs).set(data as any).where(eq(schema.faqs.id, id)).returning();
  return rows[0];
}

async function deleteFAQ(id: string) {
  const rows = await db.delete(schema.faqs).where(eq(schema.faqs.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

async function getContacts() {
  return db.select().from(schema.contacts);
}

async function createContact(data: Record<string, unknown>) {
  const rows = await db.insert(schema.contacts).values(data as any).returning();
  return rows[0];
}

async function updateContactStatus(id: string, status: string) {
  const rows = await db.update(schema.contacts).set({ status } as any).where(eq(schema.contacts.id, id)).returning();
  return rows[0];
}

async function deleteContact(id: string) {
  const rows = await db.delete(schema.contacts).where(eq(schema.contacts.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Legal Documents
// ---------------------------------------------------------------------------

async function getLegalDocuments() {
  return db.select().from(schema.legalDocuments);
}

async function createLegalDocument(data: Record<string, unknown>) {
  const rows = await db.insert(schema.legalDocuments).values(data as any).returning();
  return rows[0];
}

async function updateLegalDocument(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.legalDocuments).set(data as any).where(eq(schema.legalDocuments.id, id)).returning();
  return rows[0];
}

async function deleteLegalDocument(id: string) {
  const rows = await db.delete(schema.legalDocuments).where(eq(schema.legalDocuments.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// CTA Settings
// ---------------------------------------------------------------------------

async function getCtaSettings() {
  return db.select().from(schema.ctaSettings);
}

async function createCtaSettings(data: Record<string, unknown>) {
  const rows = await db.insert(schema.ctaSettings).values(data as any).returning();
  return rows[0];
}

async function updateCtaSettings(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.ctaSettings).set(data as any).where(eq(schema.ctaSettings.id, id)).returning();
  return rows[0];
}

async function deleteCtaSettings(id: string) {
  const rows = await db.delete(schema.ctaSettings).where(eq(schema.ctaSettings.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Why MEMOPYK Cards
// ---------------------------------------------------------------------------

async function getWhyMemopykCards() {
  return db.select().from(schema.whyMemopykCards).orderBy(asc(schema.whyMemopykCards.orderIndex));
}

async function createWhyMemopykCard(data: Record<string, unknown>) {
  const rows = await db.insert(schema.whyMemopykCards).values(data as any).returning();
  return rows[0];
}

async function updateWhyMemopykCard(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.whyMemopykCards).set(data as any).where(eq(schema.whyMemopykCards.id, id)).returning();
  return rows[0];
}

async function deleteWhyMemopykCard(id: string) {
  const rows = await db.delete(schema.whyMemopykCards).where(eq(schema.whyMemopykCards.id, id)).returning();
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// SEO Settings
// ---------------------------------------------------------------------------

async function getSeoSettings() {
  return db.select().from(schema.seoSettings);
}

async function createSeoSettings(data: Record<string, unknown>) {
  const rows = await db.insert(schema.seoSettings).values(data as any).returning();
  return rows[0];
}

async function updateSeoSettings(id: string, data: Record<string, unknown>) {
  const rows = await db.update(schema.seoSettings).set(data as any).where(eq(schema.seoSettings.id, id)).returning();
  return rows[0];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const hybridStorage = {
  // Hero
  getHeroVideos,
  createHeroVideo,
  updateHeroVideo,
  updateHeroVideoOrder,
  deleteHeroVideo,
  getHeroTextSettings,
  createHeroText,
  updateHeroText,
  deactivateAllHeroTexts,
  deleteHeroText,
  // Gallery
  getGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  updateGalleryItemOrder,
  swapGalleryItemOrder,
  deleteGalleryItem,
  // FAQ
  getFaqSections,
  createFAQSection,
  updateFAQSection,
  deleteFAQSection,
  getFaqs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  // Contacts
  getContacts,
  createContact,
  updateContactStatus,
  deleteContact,
  // Legal
  getLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  deleteLegalDocument,
  // CTA
  getCtaSettings,
  createCtaSettings,
  updateCtaSettings,
  deleteCtaSettings,
  getWhyMemopykCards,
  createWhyMemopykCard,
  updateWhyMemopykCard,
  deleteWhyMemopykCard,
  // SEO
  getSeoSettings,
  createSeoSettings,
  updateSeoSettings,
};
