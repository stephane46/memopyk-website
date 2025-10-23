import { 
  users, heroVideos, heroTextSettings, galleryItems, faqSections, faqs, contacts, legalDocuments, ctaSettings, seoSettings, deploymentHistory,
  type User, type InsertUser,
  type HeroVideo, type InsertHeroVideo,
  type HeroTextSettings, type InsertHeroTextSettings,
  type GalleryItem, type InsertGalleryItem,
  type FaqSection, type InsertFaqSection,
  type Faq, type InsertFaq,
  type Contact, type InsertContact,
  type LegalDocument, type InsertLegalDocument,
  type CtaSettings, type InsertCtaSettings,
  type SeoSettings, type InsertSeoSettings,
  type DeploymentHistory, type InsertDeploymentHistory
} from "@shared/schema";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Hero videos operations
  getHeroVideos(): Promise<HeroVideo[]>;
  getHeroVideo(id: number): Promise<HeroVideo | undefined>;
  createHeroVideo(video: InsertHeroVideo): Promise<HeroVideo>;
  updateHeroVideo(id: number, updates: Partial<InsertHeroVideo>): Promise<HeroVideo | undefined>;
  deleteHeroVideo(id: number): Promise<boolean>;
  
  // Hero text settings operations
  getHeroTextSettings(language?: string): Promise<HeroTextSettings[]>;
  createHeroText(text: InsertHeroTextSettings): Promise<HeroTextSettings>;
  updateHeroText(id: string, updates: Partial<InsertHeroTextSettings>): Promise<HeroTextSettings | undefined>;
  updateHeroTextSettings(id: number, updates: Partial<InsertHeroTextSettings>): Promise<HeroTextSettings | undefined>;
  deleteHeroText(id: string): Promise<boolean>;
  deactivateAllHeroTexts(): Promise<void>;
  
  // Gallery operations
  getGalleryItems(): Promise<GalleryItem[]>;
  getGalleryItem(id: number): Promise<GalleryItem | undefined>;
  createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem>;
  updateGalleryItem(id: number, updates: Partial<InsertGalleryItem>): Promise<GalleryItem | undefined>;
  deleteGalleryItem(id: number): Promise<boolean>;
  
  // FAQ operations
  getFaqSections(language?: string): Promise<FaqSection[]>;
  getFaqs(sectionId?: number): Promise<Faq[]>;
  createFaqSection(section: InsertFaqSection): Promise<FaqSection>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaqSection(id: number, updates: Partial<InsertFaqSection>): Promise<FaqSection | undefined>;
  updateFaq(id: number, updates: Partial<InsertFaq>): Promise<Faq | undefined>;
  deleteFaqSection(id: number): Promise<boolean>;
  deleteFaq(id: number): Promise<boolean>;
  
  // Contact operations
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  
  // Legal documents operations
  getLegalDocuments(language?: string): Promise<LegalDocument[]>;
  getLegalDocument(id: number): Promise<LegalDocument | undefined>;
  createLegalDocument(doc: InsertLegalDocument): Promise<LegalDocument>;
  updateLegalDocument(id: number, updates: Partial<InsertLegalDocument>): Promise<LegalDocument | undefined>;
  deleteLegalDocument(id: number): Promise<boolean>;
  
  // CTA settings operations
  getCtaSettings(language?: string): Promise<CtaSettings[]>;
  updateCtaSettings(id: number, updates: Partial<InsertCtaSettings>): Promise<CtaSettings | undefined>;
  
  // SEO settings operations
  getSeoSettings(page?: string, language?: string): Promise<SeoSettings[]>;
  updateSeoSettings(id: number, updates: Partial<InsertSeoSettings>): Promise<SeoSettings | undefined>;
  
  // Deployment history operations
  getDeploymentHistory(): Promise<DeploymentHistory[]>;
  createDeploymentHistory(deployment: InsertDeploymentHistory): Promise<DeploymentHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private heroVideos: Map<number, any>;
  private heroTextSettings: Map<number, any>;
  private galleryItems: Map<number, any>;
  private faqSections: Map<number, any>;
  private faqs: Map<number, any>;
  private contacts: Map<number, Contact>;
  private legalDocuments: Map<number, any>;
  private ctaSettings: Map<number, any>;
  private seoSettings: Map<number, any>;
  private deploymentHistory: Map<number, DeploymentHistory>;
  private currentIds: {
    users: number;
    heroVideos: number;
    heroTextSettings: number;
    galleryItems: number;
    faqSections: number;
    faqs: number;
    contacts: number;
    legalDocuments: number;
    ctaSettings: number;
    seoSettings: number;
    deploymentHistory: number;
  };

  constructor() {
    this.users = new Map();
    this.heroVideos = new Map();
    this.heroTextSettings = new Map();
    this.galleryItems = new Map();
    this.faqSections = new Map();
    this.faqs = new Map();
    this.contacts = new Map();
    this.legalDocuments = new Map();
    this.ctaSettings = new Map();
    this.seoSettings = new Map();
    this.deploymentHistory = new Map();
    this.currentIds = {
      users: 1,
      heroVideos: 1,
      heroTextSettings: 1,
      galleryItems: 1,
      faqSections: 1,
      faqs: 1,
      contacts: 1,
      legalDocuments: 1,
      ctaSettings: 1,
      seoSettings: 1,
      deploymentHistory: 1
    };
    
    // Load data from JSON files with fallback
    this.loadDataFromFiles();
  }

  private loadDataFromFiles() {
    try {
      // Load hero videos
      const heroVideosData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/hero-videos.json'), 'utf-8'));
      heroVideosData.forEach((video: any) => this.heroVideos.set(video.id, video));

      // Load hero text settings
      const heroTextData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/hero-text.json'), 'utf-8'));
      heroTextData.forEach((text: any) => this.heroTextSettings.set(text.id, text));

      // Load gallery items
      const galleryData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/gallery-items.json'), 'utf-8'));
      galleryData.forEach((item: any) => this.galleryItems.set(item.id, item));

      // Load FAQ sections
      const faqSectionsData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/faq-sections.json'), 'utf-8'));
      faqSectionsData.forEach((section: any) => this.faqSections.set(section.id, section));

      // Load FAQs
      const faqsData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/faqs.json'), 'utf-8'));
      faqsData.forEach((faq: any) => this.faqs.set(faq.id, faq));

      // Load contacts
      const contactsData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/contacts.json'), 'utf-8'));
      contactsData.forEach((contact: any) => this.contacts.set(contact.id, contact));

      // Load legal documents
      const legalData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/legal-documents.json'), 'utf-8'));
      legalData.forEach((doc: any) => this.legalDocuments.set(doc.id, doc));

      // Load CTA settings
      const ctaData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/cta-settings.json'), 'utf-8'));
      ctaData.forEach((cta: any) => this.ctaSettings.set(cta.id, cta));

      // Load SEO settings
      const seoData = JSON.parse(readFileSync(join(process.cwd(), 'server/data/seo-settings.json'), 'utf-8'));
      seoData.forEach((seo: any) => this.seoSettings.set(seo.id, seo));

      console.log("✅ JSON data loaded successfully from fallback files");
    } catch (error) {
      console.log("⚠️ Could not load JSON files, using empty data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser: User = {
      id,
      username: user.username,
      password: user.password
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...updates
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Hero videos operations
  async getHeroVideos(): Promise<HeroVideo[]> {
    return Array.from(this.heroVideos.values()).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  async getHeroVideo(id: number): Promise<HeroVideo | undefined> {
    return this.heroVideos.get(id);
  }

  async createHeroVideo(video: InsertHeroVideo): Promise<HeroVideo> {
    const id = this.currentIds.heroVideos++;
    const newVideo: any = {
      id,
      ...video,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.heroVideos.set(id, newVideo);
    return newVideo;
  }

  async updateHeroVideo(id: number, updates: Partial<InsertHeroVideo>): Promise<HeroVideo | undefined> {
    const video = this.heroVideos.get(id);
    if (!video) return undefined;

    const updatedVideo: any = {
      ...video,
      ...updates,
      updated_at: new Date()
    };
    this.heroVideos.set(id, updatedVideo);
    return updatedVideo;
  }

  async deleteHeroVideo(id: number): Promise<boolean> {
    return this.heroVideos.delete(id);
  }

  // Hero text settings operations
  async getHeroTextSettings(language?: string): Promise<HeroTextSettings[]> {
    const settings = Array.from(this.heroTextSettings.values());
    return language ? settings.filter(s => s.language === language) : settings;
  }

  async createHeroText(text: InsertHeroTextSettings): Promise<HeroTextSettings> {
    const id = Math.max(0, ...Array.from(this.heroTextSettings.keys())) + 1;
    const newText: HeroTextSettings = {
      id,
      ...text,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.heroTextSettings.set(id, newText);
    return newText;
  }

  async updateHeroText(id: string, updates: Partial<InsertHeroTextSettings>): Promise<HeroTextSettings | undefined> {
    const numId = parseInt(id);
    const text = this.heroTextSettings.get(numId);
    if (!text) return undefined;

    const updatedText: HeroTextSettings = {
      ...text,
      ...updates,
      updatedAt: new Date()
    };
    this.heroTextSettings.set(numId, updatedText);
    return updatedText;
  }

  async deleteHeroText(id: string): Promise<boolean> {
    const numId = parseInt(id);
    return this.heroTextSettings.delete(numId);
  }

  async deactivateAllHeroTexts(): Promise<void> {
    for (const [id, text] of this.heroTextSettings) {
      this.heroTextSettings.set(id, {
        ...text,
        is_active: false,
        updatedAt: new Date()
      });
    }
  }

  async updateHeroTextSettings(id: number, updates: Partial<InsertHeroTextSettings>): Promise<HeroTextSettings | undefined> {
    const settings = this.heroTextSettings.get(id);
    if (!settings) return undefined;

    const updatedSettings: HeroTextSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date()
    };
    this.heroTextSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Gallery operations
  async getGalleryItems(): Promise<GalleryItem[]> {
    return Array.from(this.galleryItems.values())
      .filter(item => item.isVisible)
      .sort((a, b) => a.order - b.order);
  }

  async getGalleryItem(id: number): Promise<GalleryItem | undefined> {
    return this.galleryItems.get(id);
  }

  async createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem> {
    const id = this.currentIds.galleryItems++;
    const newItem: any = {
      id,
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.galleryItems.set(id, newItem);
    return newItem;
  }

  async updateGalleryItem(id: number, updates: Partial<InsertGalleryItem>): Promise<GalleryItem | undefined> {
    const item = this.galleryItems.get(id);
    if (!item) return undefined;

    const updatedItem: GalleryItem = {
      ...item,
      ...updates,
      updatedAt: new Date()
    };
    this.galleryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteGalleryItem(id: number): Promise<boolean> {
    return this.galleryItems.delete(id);
  }

  // FAQ operations
  async getFaqSections(language?: string): Promise<FaqSection[]> {
    const sections = Array.from(this.faqSections.values())
      .filter(section => section.isVisible);
    return language ? sections.filter(s => s.language === language) : sections;
  }

  async getFaqs(sectionId?: number): Promise<Faq[]> {
    const faqs = Array.from(this.faqs.values())
      .filter(faq => faq.isVisible);
    return sectionId ? faqs.filter(f => f.sectionId === sectionId) : faqs;
  }

  async createFaqSection(section: InsertFaqSection): Promise<FaqSection> {
    const id = this.currentIds.faqSections++;
    const newSection: any = {
      id,
      ...section,
      isActive: section.isActive ?? true,
      orderIndex: section.orderIndex ?? 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.faqSections.set(id, newSection);
    return newSection;
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const id = this.currentIds.faqs++;
    const newFaq: Faq = {
      id,
      ...faq,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.faqs.set(id, newFaq);
    return newFaq;
  }

  async updateFaqSection(id: number, updates: Partial<InsertFaqSection>): Promise<FaqSection | undefined> {
    const section = this.faqSections.get(id);
    if (!section) return undefined;

    const updatedSection: FaqSection = {
      ...section,
      ...updates,
      updatedAt: new Date()
    };
    this.faqSections.set(id, updatedSection);
    return updatedSection;
  }

  async updateFaq(id: number, updates: Partial<InsertFaq>): Promise<Faq | undefined> {
    const faq = this.faqs.get(id);
    if (!faq) return undefined;

    const updatedFaq: Faq = {
      ...faq,
      ...updates,
      updatedAt: new Date()
    };
    this.faqs.set(id, updatedFaq);
    return updatedFaq;
  }

  async deleteFaqSection(id: number): Promise<boolean> {
    return this.faqSections.delete(id);
  }

  async deleteFaq(id: number): Promise<boolean> {
    return this.faqs.delete(id);
  }

  // Contact operations
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentIds.contacts++;
    const newContact: any = {
      id,
      ...contact,
      createdAt: new Date()
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;

    const updatedContact: Contact = {
      ...contact,
      ...updates
    };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Legal documents operations
  async getLegalDocuments(language?: string): Promise<LegalDocument[]> {
    const docs = Array.from(this.legalDocuments.values())
      .filter(doc => doc.isActive);
    return language ? docs.filter(d => d.language === language) : docs;
  }

  async getLegalDocument(id: number): Promise<LegalDocument | undefined> {
    return this.legalDocuments.get(id);
  }

  async createLegalDocument(doc: InsertLegalDocument): Promise<LegalDocument> {
    const id = this.currentIds.legalDocuments++;
    const newDoc: LegalDocument = {
      id,
      ...doc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.legalDocuments.set(id, newDoc);
    return newDoc;
  }

  async updateLegalDocument(id: number, updates: Partial<InsertLegalDocument>): Promise<LegalDocument | undefined> {
    const doc = this.legalDocuments.get(id);
    if (!doc) return undefined;

    const updatedDoc: LegalDocument = {
      ...doc,
      ...updates,
      updatedAt: new Date()
    };
    this.legalDocuments.set(id, updatedDoc);
    return updatedDoc;
  }

  async deleteLegalDocument(id: number): Promise<boolean> {
    return this.legalDocuments.delete(id);
  }

  // CTA settings operations
  async getCtaSettings(language?: string): Promise<CtaSettings[]> {
    const settings = Array.from(this.ctaSettings.values())
      .filter(setting => setting.isActive);
    return language ? settings.filter(s => s.language === language) : settings;
  }

  async updateCtaSettings(id: number, updates: Partial<InsertCtaSettings>): Promise<CtaSettings | undefined> {
    const settings = this.ctaSettings.get(id);
    if (!settings) return undefined;

    const updatedSettings: CtaSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date()
    };
    this.ctaSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // SEO settings operations
  async getSeoSettings(page?: string, language?: string): Promise<SeoSettings[]> {
    let settings = Array.from(this.seoSettings.values());
    if (page) settings = settings.filter(s => s.page === page);
    if (language) settings = settings.filter(s => s.language === language);
    return settings;
  }

  async updateSeoSettings(id: number, updates: Partial<InsertSeoSettings>): Promise<SeoSettings | undefined> {
    const settings = this.seoSettings.get(id);
    if (!settings) return undefined;

    const updatedSettings: SeoSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date()
    };
    this.seoSettings.set(id, updatedSettings);
    return updatedSettings;
  }

  // Deployment history operations
  async getDeploymentHistory(): Promise<DeploymentHistory[]> {
    return Array.from(this.deploymentHistory.values());
  }

  async createDeploymentHistory(deployment: InsertDeploymentHistory): Promise<DeploymentHistory> {
    const id = this.currentIds.deploymentHistory++;
    const newDeployment: DeploymentHistory = {
      id,
      ...deployment,
      deployedAt: new Date()
    };
    this.deploymentHistory.set(id, newDeployment);
    return newDeployment;
  }
}

// Create a singleton instance
export const storage = new MemStorage();

// Export hybrid storage for platform content
export { hybridStorage } from './hybrid-storage';