import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { eq, and, desc, asc, sql, gte } from 'drizzle-orm';
import { ctaSettings, heroTextSettings, analyticsViews, analyticsSessions, whyMemopykCards } from '../shared/schema';
const countries = require('i18n-iso-countries');
const en = require('i18n-iso-countries/langs/en.json');
countries.registerLocale(en);

export interface HybridStorageInterface {
  // Hero videos
  getHeroVideos(): Promise<any[]>;
  createHeroVideo(videoData: any): Promise<any>;
  updateHeroVideo(videoId: number, updates: any): Promise<any>;
  deleteHeroVideo(videoId: number): Promise<any>;
  
  // Hero text settings  
  getHeroTextSettings(language?: string): Promise<any[]>;
  createHeroText(text: any): Promise<any>;
  updateHeroText(textId: string, updates: any): Promise<any>;
  deleteHeroText(textId: string): Promise<any>;
  deactivateAllHeroTexts(): Promise<void>;
  
  // Gallery items
  getGalleryItems(): Promise<any[]>;
  
  // FAQ sections and FAQs
  getFaqSections(language?: string): Promise<any[]>;
  getFaqs(sectionId?: string): Promise<any[]>;
  
  // FAQ section CRUD operations
  createFAQSection(sectionData: any): Promise<any>;
  updateFAQSection(sectionId: string | number, updates: any): Promise<any>;
  deleteFAQSection(sectionId: string | number): Promise<void>;
  
  // FAQ CRUD operations  
  createFAQ(faqData: any): Promise<any>;
  updateFAQ(faqId: number, updates: any): Promise<any>;
  deleteFAQ(faqId: number): Promise<void>;
  
  // Contacts
  getContacts(): Promise<any[]>;
  createContact(contact: any): Promise<any>;
  
  // Legal documents
  getLegalDocuments(language?: string): Promise<any[]>;
  
  // CTA settings
  getCtaSettings(language?: string): Promise<any[]>;
  createCtaSettings(ctaData: any): Promise<any>;
  updateCtaSettings(ctaId: string, updates: any): Promise<any>;
  deleteCtaSettings(ctaId: string): Promise<any>;
  
  // Why MEMOPYK cards
  getWhyMemopykCards(): Promise<any[]>;
  createWhyMemopykCard(cardData: any): Promise<any>;
  updateWhyMemopykCard(cardId: string, updates: any): Promise<any>;
  deleteWhyMemopykCard(cardId: string): Promise<any>;
  
  // Partners (approved partners for directory map)
  getPartners(filters?: any): Promise<any[]>;
  getPartnerById(partnerId: number): Promise<any>;
  createPartner(partnerData: any): Promise<any>;
  updatePartner(partnerId: number, updates: any): Promise<any>;
  deletePartner(partnerId: number): Promise<any>;
  
  // SEO settings - comprehensive management
  getSeoSettings(page?: string, language?: string): Promise<any[]>;
  createSeoSettings(seoData: any): Promise<any>;
  updateSeoSettings(pageId: string, updates: any): Promise<any>;
  deleteSeoSettings(pageId: string): Promise<any>;
  
  // SEO redirects management
  getSeoRedirects(isActive?: boolean): Promise<any[]>;
  createSeoRedirect(redirectData: any): Promise<any>;
  updateSeoRedirect(redirectId: number, updates: any): Promise<any>;
  deleteSeoRedirect(redirectId: number): Promise<any>;
  incrementRedirectHit(redirectId: number): Promise<any>;
  
  // SEO audit logs
  getSeoAuditLogs(pageId?: string, limit?: number): Promise<any[]>;
  createSeoAuditLog(auditData: any): Promise<any>;
  
  // SEO image metadata
  getSeoImageMeta(imageUrl?: string): Promise<any[]>;
  createSeoImageMeta(imageData: any): Promise<any>;
  updateSeoImageMeta(imageId: number, updates: any): Promise<any>;
  deleteSeoImageMeta(imageId: number): Promise<any>;
  
  // SEO global settings
  getSeoGlobalSettings(): Promise<any>;
  updateSeoGlobalSettings(settings: any): Promise<any>;
  generateSitemap(): Promise<string>;
  generateRobotsTxt(): Promise<string>;
  
  // SEO analytics and scoring
  calculateSeoScore(pageId: string): Promise<number>;
  getSeoPerformanceReport(): Promise<any>;
  validateMetaTags(pageData: any): Promise<{ score: number; issues: string[] }>;
  
  // Analytics methods
  getAnalyticsSessions(dateFrom?: string, dateTo?: string, language?: string, includeProduction?: boolean, country?: string): Promise<any[]>;
  getAnalyticsViews(options?: { dateFrom?: string, dateTo?: string, videoId?: string, session_id?: string }): Promise<any[]>;
  getAnalyticsSettings(): Promise<any>;
  createAnalyticsSession(sessionData: any): Promise<any>;
  createAnalyticsView(viewData: any): Promise<any>;
  updateAnalyticsSettings(settings: any): Promise<any>;
  resetAnalyticsData(): Promise<void>;
  clearAnalyticsSessions(): Promise<void>;
  clearAnalyticsViews(): Promise<void>;
  clearRealtimeVisitors(): Promise<void>;
  clearPerformanceMetrics(): Promise<void>;
  clearEngagementHeatmap(): Promise<void>;
  clearConversionFunnel(): Promise<void>;
  clearAllAnalyticsData(): Promise<void>;
  getAnalyticsDashboard(dateFrom?: string, dateTo?: string): Promise<any>;
  
  // IP Management methods  
  getActiveViewerIps(): Promise<any[]>;

  // Historical Threshold Recalculation
  recalculateHistoricalCompletions(newThreshold: number): Promise<{ updated: number; total: number }>;

  // Enhanced Video Analytics
  getVideoEngagementMetrics(videoId?: string, dateFrom?: string, dateTo?: string): Promise<any>;
  getUniqueVideoViews(dateFrom?: string, dateTo?: string): Promise<any[]>;
  getVideoReEngagementAnalytics(dateFrom?: string, dateTo?: string): Promise<any[]>;

  // Time-series Analytics
  getTimeSeriesData(dateFrom?: string, dateTo?: string): Promise<any[]>;

  // Real-time Analytics methods
  getRealtimeVisitors(): Promise<any[]>;
  updateVisitorActivity(sessionId: string, currentPage: string): Promise<any>;
  deactivateVisitor(sessionId: string): Promise<void>;
  createRealtimeVisitor(visitorData: any): Promise<any>;

  // Performance Monitoring methods
  recordPerformanceMetric(metricData: any): Promise<any>;
  getPerformanceMetrics(metricType?: string, timeRange?: { from: string; to: string }): Promise<any[]>;
  getSystemHealth(): Promise<any>;

  // Engagement Heatmap methods
  recordEngagementEvent(eventData: any): Promise<any>;
  getEngagementHeatmap(pageUrl: string, timeRange?: { from: string; to: string }): Promise<any[]>;

  // Conversion Funnel methods
  recordConversionStep(stepData: any): Promise<any>;
  getConversionFunnel(timeRange?: { from: string; to: string }): Promise<any>;
  getFunnelAnalytics(timeRange?: { from: string; to: string }): Promise<any>;
  
  // Blog Analytics methods
  createBlogPostView(viewData: any): Promise<any>;
  getBlogPostViews(options?: { dateFrom?: string, dateTo?: string, postSlug?: string }): Promise<any[]>;
  getPopularBlogPosts(dateFrom?: string, dateTo?: string): Promise<any[]>;
}

export class HybridStorage implements HybridStorageInterface {
  private dataPath: string;
  private supabase: any;
  private db: any;

  constructor() {
    this.dataPath = join(process.cwd(), 'server/data');
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.db = db;
    console.log("✅ Hybrid storage initialized with JSON fallback system and Supabase integration");
  }

  private loadJsonFile(filename: string): any[] {
    try {
      const filePath = join(this.dataPath, filename);
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.warn(`⚠️ Could not load ${filename}:`, error);
      return [];
    }
  }

  private saveJsonFile(filename: string, data: any[]): void {
    try {
      const filePath = join(this.dataPath, filename);
      writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Could not save ${filename}:`, error);
    }
  }

  // Hero videos operations
  async getHeroVideos(): Promise<any[]> {
    const data = this.loadJsonFile('hero-videos.json');
    return data; // Return all videos for admin management
  }

  async createHeroVideo(videoData: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    
    // Get next ID
    const nextId = videos.length > 0 ? Math.max(...videos.map(v => v.id)) + 1 : 1;
    
    const newVideo = {
      id: nextId,
      title_en: videoData.title_en,
      title_fr: videoData.title_fr,
      url_en: videoData.url_en,
      url_fr: videoData.url_fr || videoData.url_en,
      use_same_video: videoData.use_same_video || true,
      is_active: videoData.is_active || false,
      order_index: videoData.order_index || videos.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    videos.push(newVideo);
    this.saveJsonFile('hero-videos.json', videos);
    
    return newVideo;
  }

  async updateHeroVideoOrder(videoId: number, newOrder: number): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    const targetVideo = videos[videoIndex];
    const oldOrder = targetVideo.order_index;
    
    // Update other videos' order indices to make room
    videos.forEach((video: any) => {
      if (video.id === videoId) return; // Skip the target video
      
      if (newOrder < oldOrder) {
        // Moving up: increment order of videos in between
        if (video.order_index >= newOrder && video.order_index < oldOrder) {
          video.order_index += 1;
        }
      } else if (newOrder > oldOrder) {
        // Moving down: decrement order of videos in between
        if (video.order_index > oldOrder && video.order_index <= newOrder) {
          video.order_index -= 1;
        }
      }
    });
    
    // Update target video's order
    targetVideo.order_index = newOrder;
    targetVideo.updated_at = new Date().toISOString();
    
    this.saveJsonFile('hero-videos.json', videos);
    
    return targetVideo;
  }

  async updateHeroVideoStatus(videoId: number, isActive: boolean): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    videos[videoIndex].is_active = isActive;
    this.saveJsonFile('hero-videos.json', videos);
    
    return videos[videoIndex];
  }

  async updateHeroVideo(videoId: number, updates: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    // Complete field mapping for Hero Videos
    const updatedVideo = {
      ...videos[videoIndex],
      title_en: updates.title_en || videos[videoIndex].title_en,
      title_fr: updates.title_fr || videos[videoIndex].title_fr,
      url_en: updates.url_en || videos[videoIndex].url_en,
      url_fr: updates.url_fr || videos[videoIndex].url_fr,
      use_same_video: updates.use_same_video !== undefined ? updates.use_same_video : videos[videoIndex].use_same_video,
      order_index: updates.order_index !== undefined ? updates.order_index : videos[videoIndex].order_index,
      is_active: updates.is_active !== undefined ? updates.is_active : videos[videoIndex].is_active,
      updated_at: new Date().toISOString()
    };
    
    videos[videoIndex] = updatedVideo;
    this.saveJsonFile('hero-videos.json', videos);
    
    return updatedVideo;
  }

  async addHeroVideo(video: any): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const newVideo = {
      id: Date.now(), // Simple ID generation
      ...video,
      created_at: new Date().toISOString()
    };
    videos.push(newVideo);
    this.saveJsonFile('hero-videos.json', videos);
    return newVideo;
  }

  async deleteHeroVideo(videoId: number): Promise<any> {
    const videos = this.loadJsonFile('hero-videos.json');
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error('Video not found');
    }
    
    const deletedVideo = videos[videoIndex];
    
    // Clean up video files before removing from JSON
    await this.cleanupVideoFiles(deletedVideo, 'hero');
    
    videos.splice(videoIndex, 1);
    this.saveJsonFile('hero-videos.json', videos);
    
    return deletedVideo;
  }

  // Hero text settings operations - TRUE HYBRID STORAGE
  async getHeroTextSettings(language?: string): Promise<any[]> {
    try {
      console.log('🔍 Hero Text: Fetching from Supabase database...');
      const { data: result, error } = await this.supabase
        .from('hero_text_settings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('⚠️ Hero Text: Supabase query error:', error);
        console.log('⚠️ Hero Text: Database error, using JSON fallback...');
      } else if (result && result.length > 0) {
        console.log(`✅ Hero Text: Found ${result.length} texts in Supabase - DATABASE PRIORITY`);
        
        // Convert snake_case to camelCase and add responsive font sizes
        const formattedResult = result.map((item: any) => ({
          id: item.id,
          title_fr: item.title_fr,
          title_en: item.title_en,
          title_mobile_fr: item.title_mobile_fr,
          title_mobile_en: item.title_mobile_en,
          title_desktop_fr: item.title_desktop_fr,
          title_desktop_en: item.title_desktop_en,
          subtitle_fr: item.subtitle_fr,
          subtitle_en: item.subtitle_en,
          font_size: item.font_size, // Legacy field for backward compatibility
          font_size_desktop: item.font_size_desktop || item.font_size || 60,
          font_size_tablet: item.font_size_tablet || Math.round((item.font_size || 60) * 0.75),
          font_size_mobile: item.font_size_mobile || Math.round((item.font_size || 60) * 0.53),
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
        
        // **CRITICAL FIX: Only save to JSON if we got fresh data from database**
        console.log('💾 Hero Text: Updating JSON backup with fresh database data');
        this.saveJsonFile('hero-text.json', formattedResult);
        return formattedResult;
      } else {
        console.log('⚠️ Hero Text: Database empty (not error), checking JSON fallback...');
      }
    } catch (error) {
      console.warn('⚠️ Hero Text: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only when database fails or is empty
    console.log('📄 Hero Text: Loading from JSON fallback');
    const data = this.loadJsonFile('hero-text.json');
    return data; // Return all texts for admin management
  }

  async createHeroText(text: any): Promise<any> {
    try {
      console.log('🔍 Hero Text: Creating in Supabase database...');
      const { data, error } = await this.supabase
        .from('hero_text_settings')
        .insert({
          id: String(Date.now()), // Generate string ID for varchar field
          title_fr: text.title_fr,
          title_en: text.title_en,
          subtitle_fr: text.subtitle_fr || '',
          subtitle_en: text.subtitle_en || '',
          font_size: text.font_size || 48,
          font_size_desktop: text.font_size_desktop || text.font_size || 60,
          font_size_tablet: text.font_size_tablet || Math.round((text.font_size || 60) * 0.75),
          font_size_mobile: text.font_size_mobile || Math.round((text.font_size || 60) * 0.53),
          is_active: text.is_active || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('⚠️ Hero Text: Supabase create error:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Hero Text: Created in Supabase successfully');
        
        // Update JSON backup
        const texts = this.loadJsonFile('hero-text.json');
        texts.push(data);
        this.saveJsonFile('hero-text.json', texts);
        
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Hero Text: Supabase connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const texts = this.loadJsonFile('hero-text.json');
    const newText = {
      id: Date.now(), // Simple ID generation
      ...text,
      created_at: new Date().toISOString()
    };
    texts.push(newText);
    this.saveJsonFile('hero-text.json', texts);
    return newText;
  }

  async updateHeroText(textId: string, updateData: any): Promise<any> {
    try {
      console.log(`🔍 Hero Text: Updating ID ${textId} in Supabase database...`);
      const { data, error } = await this.supabase
        .from('hero_text_settings')
        .update({
          title_fr: updateData.title_fr,
          title_en: updateData.title_en, 
          subtitle_fr: updateData.subtitle_fr,
          subtitle_en: updateData.subtitle_en,
          font_size: updateData.font_size || updateData.font_size_desktop || 60, // Use desktop size as legacy fallback
          // Skip responsive font size columns for now (database schema mismatch)
          is_active: updateData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', textId)
        .select()
        .single();
      
      if (error) {
        console.error('⚠️ Hero Text: Supabase update error:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Hero Text: Updated in Supabase successfully');
        
        // Update JSON backup
        const texts = this.loadJsonFile('hero-text.json');
        const textIndex = texts.findIndex((t: any) => t.id == textId); // Use == for type coercion (string vs number)
        if (textIndex !== -1) {
          texts[textIndex] = data;
          this.saveJsonFile('hero-text.json', texts);
        }
        
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Hero Text: Supabase connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const texts = this.loadJsonFile('hero-text.json');
    const textIndex = texts.findIndex((t: any) => t.id == textId); // Use == for type coercion (string vs number)
    
    if (textIndex === -1) {
      throw new Error('Hero text not found');
    }
    
    const updatedText = { ...texts[textIndex], ...updateData };
    texts[textIndex] = updatedText;
    this.saveJsonFile('hero-text.json', texts);
    
    return updatedText;
  }

  async deactivateAllHeroTexts(): Promise<void> {
    try {
      console.log('🔍 Hero Text: Deactivating all texts in Supabase database...');
      const { error } = await this.supabase
        .from('hero_text_settings')
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .neq('id', ''); // Update all records
      
      if (error) {
        console.error('⚠️ Hero Text: Supabase deactivate error:', error);
        throw error;
      }
      
      console.log('✅ Hero Text: All texts deactivated in Supabase successfully');
      
      // Update JSON backup
      const texts = this.loadJsonFile('hero-text.json');
      const updatedTexts = texts.map((text: any) => ({ ...text, is_active: false }));
      this.saveJsonFile('hero-text.json', updatedTexts);
      return;
    } catch (error) {
      console.warn('⚠️ Hero Text: Supabase connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const texts = this.loadJsonFile('hero-text.json');
    const updatedTexts = texts.map((text: any) => ({ ...text, is_active: false }));
    this.saveJsonFile('hero-text.json', updatedTexts);
  }

  async deleteHeroText(textId: string): Promise<any> {
    try {
      console.log(`🔍 Hero Text: Deleting ID ${textId} from Supabase database...`);
      const { data, error } = await this.supabase
        .from('hero_text_settings')
        .delete()
        .eq('id', textId)
        .select()
        .single();
      
      if (error) {
        console.error('⚠️ Hero Text: Supabase delete error:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Hero Text: Deleted from Supabase successfully');
        
        // Update JSON backup
        const texts = this.loadJsonFile('hero-text.json');
        const textIndex = texts.findIndex((t: any) => t.id == textId); // Use == for type coercion (string vs number)
        if (textIndex !== -1) {
          texts.splice(textIndex, 1);
          this.saveJsonFile('hero-text.json', texts);
        }
        
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Hero Text: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const texts = this.loadJsonFile('hero-text.json');
    const textIndex = texts.findIndex((t: any) => t.id == textId); // Use == for type coercion (string vs number)
    
    if (textIndex === -1) {
      throw new Error('Hero text not found');
    }
    
    const deletedText = texts[textIndex];
    texts.splice(textIndex, 1);
    this.saveJsonFile('hero-text.json', texts);
    
    return deletedText;
  }

  // Gallery operations - PRIMARY DATABASE ACCESS WITH EMERGENCY JSON FALLBACK
  async getGalleryItems(): Promise<any[]> {
    console.log(`🎬 GALLERY: Fetching items directly from development database (emergency JSON fallback available)`);
    
    try {
      // Import database connection
      const { pool } = await import('./db');
      
      // Query gallery items directly from development database using SQL with timeout handling
      const dbItems = await Promise.race([
        pool`SELECT * FROM gallery_items ORDER BY order_index ASC`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]) as any[];
      
      console.log(`✅ GALLERY: Retrieved ${dbItems.length} items from development database`);
      
      // Sync to JSON backup when database is available
      if (dbItems.length > 0) {
        const backupData = dbItems.map(item => ({
          // Convert your actual database fields to expected format
          id: item.id,
          title_en: item.title_en,
          title_fr: item.title_fr,
          price_en: item.price_en,
          price_fr: item.price_fr,
          source_en: item.source_en,
          source_fr: item.source_fr,
          duration_en: item.duration_en || "A 3-minute film", // Read actual duration from database
          duration_fr: item.duration_fr || "Un film de 3 minutes", // Read actual duration from database
          situation_en: item.situation_en,
          situation_fr: item.situation_fr,
          story_en: item.story_en,
          story_fr: item.story_fr,
          sorry_message_en: item.sorry_message_en || "Sorry, this video is not available at the moment.",
          sorry_message_fr: item.sorry_message_fr || "Désolé, cette vidéo n'est pas disponible pour le moment.",
          format_platform_en: item.format_platform_en || "Instagram",
          format_platform_fr: item.format_platform_fr || "Instagram",
          format_type_en: item.format_type_en || "Vertical",
          format_type_fr: item.format_type_fr || "Vertical",
          video_url_en: item.video_url_en,
          video_url_fr: item.video_url_fr,
          video_filename: item.video_url_en?.split('/').pop() || '',
          use_same_video: item.use_same_video,
          video_width: item.video_width,
          video_height: item.video_height,
          video_orientation: item.video_orientation,
          image_url_en: item.image_url_en,
          image_url_fr: item.image_url_fr,
          static_image_url: item.static_image_url,
          static_image_url_en: item.static_image_url_en,
          static_image_url_fr: item.static_image_url_fr,
          order_index: item.order_index,
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at,
          cropSettings: item.crop_settings
        }));
        
        // Save to JSON backup for emergency fallback
        try {
          this.saveJsonFile('gallery.json', backupData);
          console.log(`💾 GALLERY: Synced ${backupData.length} items to JSON backup`);
        } catch (syncError) {
          console.warn(`⚠️ GALLERY: Failed to sync JSON backup:`, syncError);
        }
        
        return backupData;
      }
      
      return [];
    } catch (error: any) {
      console.error(`❌ GALLERY: Supabase VPS database connection failed:`, error?.message || error);
      console.warn(`🚨 GALLERY: EMERGENCY - Using JSON fallback due to database connection failure`);
      
      // EMERGENCY FALLBACK: Use JSON backup
      try {
        const fallbackItems = this.loadJsonFile('gallery.json');
        console.log(`🚨 GALLERY EMERGENCY FALLBACK: Retrieved ${fallbackItems.length} items from JSON backup`);
        return fallbackItems.filter((item: any) => item.is_active === true);
      } catch (fallbackError) {
        console.error(`❌ GALLERY EMERGENCY FALLBACK FAILED:`, fallbackError);
        return [];
      }
    }
  }

  async getGalleryItemById(itemId: string | number): Promise<any> {
    console.log(`🎬 GALLERY: Fetching item ${itemId} directly from Supabase database`);
    
    try {
      const { galleryItems } = await import('../shared/schema');
      const [dbItem] = await db.select().from(galleryItems).where(eq(galleryItems.id, String(itemId)));
      
      if (!dbItem) {
        return null;
      }
      
      return {
        id: dbItem.id,
        title_en: dbItem.titleEn,
        title_fr: dbItem.titleFr,
        price_en: dbItem.priceEn,
        price_fr: dbItem.priceFr,
        source_en: dbItem.sourceEn,
        source_fr: dbItem.sourceFr,
        duration_en: dbItem.durationEn,
        duration_fr: dbItem.durationFr,
        situation_en: dbItem.situationEn,
        situation_fr: dbItem.situationFr,
        story_en: dbItem.storyEn,
        story_fr: dbItem.storyFr,
        sorry_message_en: dbItem.sorryMessageEn,
        sorry_message_fr: dbItem.sorryMessageFr,
        format_platform_en: dbItem.formatPlatformEn,
        format_platform_fr: dbItem.formatPlatformFr,
        format_type_en: dbItem.formatTypeEn,
        format_type_fr: dbItem.formatTypeFr,
        video_url_en: dbItem.videoUrlEn,
        video_url_fr: dbItem.videoUrlFr,
        video_filename: dbItem.videoFilename,
        use_same_video: dbItem.useSameVideo,
        video_width: dbItem.videoWidth,
        video_height: dbItem.videoHeight,
        video_orientation: dbItem.videoOrientation,
        image_url_en: dbItem.imageUrlEn,
        image_url_fr: dbItem.imageUrlFr,
        static_image_url: dbItem.staticImageUrl,
        static_image_url_en: dbItem.staticImageUrlEn,
        static_image_url_fr: dbItem.staticImageUrlFr,
        order_index: dbItem.orderIndex,
        is_active: dbItem.isActive,
        created_at: dbItem.createdAt,
        updated_at: dbItem.updatedAt,
        cropSettings: dbItem.cropSettings
      };
    } catch (error: any) {
      console.error(`❌ GALLERY: Failed to fetch item ${itemId}:`, error?.message || error);
      throw new Error('Gallery item unavailable - database connection required');
    }
  }

  async createGalleryItem(item: any): Promise<any> {
    console.log('🆕 HYBRID STORAGE: Creating new gallery item:', item.title_en);
    
    // First, create in database with UUID
    let newItemId: string;
    let dbNewItem: any;
    
    try {
      const { galleryItems } = await import('../shared/schema');
      const { db } = await import('./db');
      
      // Convert to database format with UUID
      const dbInsertData = {
        titleEn: item.title_en || 'Untitled',
        titleFr: item.title_fr || 'Sans titre',
        priceEn: item.price_en || '',
        priceFr: item.price_fr || '',
        sourceEn: item.source_en || '',
        sourceFr: item.source_fr || '',
        durationEn: item.duration_en || '',
        durationFr: item.duration_fr || '',
        situationEn: item.situation_en || '',
        situationFr: item.situation_fr || '',
        storyEn: item.story_en || '',
        storyFr: item.story_fr || '',
        sorryMessageEn: item.sorry_message_en || 'Sorry, we cannot show you the video at this stage',
        sorryMessageFr: item.sorry_message_fr || 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        formatPlatformEn: item.format_platform_en || 'Professional',
        formatPlatformFr: item.format_platform_fr || 'Professionnel',
        formatTypeEn: item.format_type_en || 'TV & Desktop',
        formatTypeFr: item.format_type_fr || 'TV & Bureau',
        videoUrlEn: item.video_url_en || '',
        videoUrlFr: item.video_url_fr || item.video_url_en || '',
        videoFilename: item.video_filename || item.video_url_en || '',
        useSameVideo: item.use_same_video !== undefined ? item.use_same_video : true,
        videoWidth: item.video_width || 1920,
        videoHeight: item.video_height || 1080,
        videoOrientation: item.video_orientation || 'landscape',
        imageUrlEn: item.image_url_en || '',
        imageUrlFr: item.image_url_fr || item.image_url_en || '',
        staticImageUrl: item.static_image_url || '',
        staticImageUrlEn: item.static_image_url_en || '',
        staticImageUrlFr: item.static_image_url_fr || '',
        altTextEn: item.alt_text_en || item.title_en || 'Gallery item',
        altTextFr: item.alt_text_fr || item.title_fr || 'Élément de la galerie',
        orderIndex: item.order_index || 1,
        isActive: item.is_active !== undefined ? item.is_active : true,
        cropSettings: item.crop_settings || null
      };
      
      console.log('💾 DATABASE INSERT: Creating gallery item with data:', {
        titleEn: dbInsertData.titleEn,
        videoFilename: dbInsertData.videoFilename,
        isActive: dbInsertData.isActive
      });
      
      const dbResult = await db.insert(galleryItems)
        .values(dbInsertData)
        .returning();
        
      if (dbResult.length > 0) {
        dbNewItem = dbResult[0];
        newItemId = dbNewItem.id;
        console.log(`✅ DATABASE INSERT SUCCESS: Created item with ID ${newItemId}`);
      } else {
        throw new Error('Database insert returned no results');
      }
      
    } catch (error) {
      console.error('❌ DATABASE INSERT FAILED:', error);
      // Fall back to timestamp ID for JSON-only mode
      newItemId = Date.now().toString();
      console.log(`⚠️ Using fallback timestamp ID: ${newItemId}`);
    }
    
    // Create JSON item (using UUID from database or timestamp fallback)
    const newItem = {
      id: newItemId,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add to JSON file for backup/fallback
    const items = this.loadJsonFile('gallery.json');
    items.push(newItem);
    this.saveJsonFile('gallery.json', items);
    
    console.log(`🎯 HYBRID STORAGE SUCCESS: Created gallery item "${item.title_en}" with ID ${newItemId}`);
    return newItem;
  }

  async updateGalleryItem(itemId: string | number, updateData: any): Promise<any> {
    console.log(`🔍 CROSS-ENVIRONMENT SYNC - updateGalleryItem - is_active: ${updateData.is_active}`);
    console.log(`🌍 ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    
    let dbUpdateSuccessful = false;
    let updatedDbItem: any = null;
    
    // CRITICAL: Update database first for cross-environment synchronization
    try {
      const { galleryItems } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      // Convert to database format - COMPLETE FIELD MAPPING
      const dbUpdateData: any = {};
      if (updateData.title_en !== undefined) dbUpdateData.titleEn = updateData.title_en;
      if (updateData.title_fr !== undefined) dbUpdateData.titleFr = updateData.title_fr;
      if (updateData.price_en !== undefined) dbUpdateData.priceEn = updateData.price_en;
      if (updateData.price_fr !== undefined) dbUpdateData.priceFr = updateData.price_fr;
      if (updateData.source_en !== undefined) dbUpdateData.sourceEn = updateData.source_en;
      if (updateData.source_fr !== undefined) dbUpdateData.sourceFr = updateData.source_fr;
      if (updateData.duration_en !== undefined) dbUpdateData.durationEn = updateData.duration_en;
      if (updateData.duration_fr !== undefined) dbUpdateData.durationFr = updateData.duration_fr;
      if (updateData.situation_en !== undefined) dbUpdateData.situationEn = updateData.situation_en;
      if (updateData.situation_fr !== undefined) dbUpdateData.situationFr = updateData.situation_fr;
      if (updateData.story_en !== undefined) dbUpdateData.storyEn = updateData.story_en;
      if (updateData.story_fr !== undefined) dbUpdateData.storyFr = updateData.story_fr;
      if (updateData.sorry_message_en !== undefined) dbUpdateData.sorryMessageEn = updateData.sorry_message_en;
      if (updateData.sorry_message_fr !== undefined) dbUpdateData.sorryMessageFr = updateData.sorry_message_fr;
      if (updateData.format_platform_en !== undefined) dbUpdateData.formatPlatformEn = updateData.format_platform_en;
      if (updateData.format_platform_fr !== undefined) dbUpdateData.formatPlatformFr = updateData.format_platform_fr;
      if (updateData.format_type_en !== undefined) dbUpdateData.formatTypeEn = updateData.format_type_en;
      if (updateData.format_type_fr !== undefined) dbUpdateData.formatTypeFr = updateData.format_type_fr;
      if (updateData.video_url_en !== undefined) dbUpdateData.videoUrlEn = updateData.video_url_en;
      if (updateData.video_url_fr !== undefined) dbUpdateData.videoUrlFr = updateData.video_url_fr;
      if (updateData.video_filename !== undefined) dbUpdateData.videoFilename = updateData.video_filename;
      if (updateData.use_same_video !== undefined) dbUpdateData.useSameVideo = updateData.use_same_video;
      if (updateData.video_width !== undefined) dbUpdateData.videoWidth = updateData.video_width;
      if (updateData.video_height !== undefined) dbUpdateData.videoHeight = updateData.video_height;
      if (updateData.video_orientation !== undefined) dbUpdateData.videoOrientation = updateData.video_orientation;
      if (updateData.image_url_en !== undefined) dbUpdateData.imageUrlEn = updateData.image_url_en;
      if (updateData.image_url_fr !== undefined) dbUpdateData.imageUrlFr = updateData.image_url_fr;
      if (updateData.static_image_url !== undefined) dbUpdateData.staticImageUrl = updateData.static_image_url;
      if (updateData.static_image_url_en !== undefined) dbUpdateData.staticImageUrlEn = updateData.static_image_url_en;
      if (updateData.static_image_url_fr !== undefined) dbUpdateData.staticImageUrlFr = updateData.static_image_url_fr;
      if (updateData.cropSettings !== undefined) dbUpdateData.cropSettings = updateData.cropSettings;
      if (updateData.order_index !== undefined) dbUpdateData.orderIndex = updateData.order_index;
      if (updateData.is_active !== undefined) dbUpdateData.isActive = updateData.is_active;
      dbUpdateData.updatedAt = new Date();
      
      console.log(`🔍 DATABASE UPDATE - Converting is_active ${updateData.is_active} to isActive ${dbUpdateData.isActive}`);
      
      const dbResult = await db.update(galleryItems)
        .set(dbUpdateData)
        .where(eq(galleryItems.id, itemId.toString()))
        .returning();
        
      console.log(`✅ DATABASE UPDATE SUCCESS - Updated ${dbResult.length} rows`);
      if (dbResult.length > 0) {
        updatedDbItem = dbResult[0];
        dbUpdateSuccessful = true;
        console.log(`✅ Database confirms is_active = ${dbResult[0].isActive}`);
        console.log(`🌍 CROSS-ENVIRONMENT: Database updated successfully! This change should be visible in both dev and production after F5.`);
      }
    } catch (error) {
      console.error(`❌ DATABASE UPDATE FAILED:`, error);
      console.log(`⚠️ FALLBACK: Updating JSON only - changes will NOT sync between environments`);
      // Continue with JSON fallback - don't throw error here
    }

    // Update JSON file as backup/fallback
    const items = this.loadJsonFile('gallery.json');
    
    const itemIndex = items.findIndex((item: any) => {
      return item.id.toString() === itemId.toString();
    });
    
    if (itemIndex === -1) {
      // If database update was successful but JSON doesn't have the item, create a minimal entry
      if (dbUpdateSuccessful && updatedDbItem) {
        console.log('🔄 Item not in JSON but database update succeeded - returning database result only');
        return {
          id: updatedDbItem.id,
          title_en: updatedDbItem.titleEn,
          title_fr: updatedDbItem.titleFr,
          price_en: updatedDbItem.priceEn,
          price_fr: updatedDbItem.priceFr,
          source_en: updatedDbItem.sourceEn,
          source_fr: updatedDbItem.sourceFr,
          duration_en: updatedDbItem.durationEn,
          duration_fr: updatedDbItem.durationFr,
          situation_en: updatedDbItem.situationEn,
          situation_fr: updatedDbItem.situationFr,
          story_en: updatedDbItem.storyEn,
          story_fr: updatedDbItem.storyFr,
          sorry_message_en: updatedDbItem.sorryMessageEn,
          sorry_message_fr: updatedDbItem.sorryMessageFr,
          format_platform_en: updatedDbItem.formatPlatformEn,
          format_platform_fr: updatedDbItem.formatPlatformFr,
          format_type_en: updatedDbItem.formatTypeEn,
          format_type_fr: updatedDbItem.formatTypeFr,
          video_url_en: updatedDbItem.videoUrlEn,
          video_url_fr: updatedDbItem.videoUrlFr,
          video_filename: updatedDbItem.videoFilename,
          use_same_video: updatedDbItem.useSameVideo,
          video_width: updatedDbItem.videoWidth,
          video_height: updatedDbItem.videoHeight,
          video_orientation: updatedDbItem.videoOrientation,
          image_url_en: updatedDbItem.imageUrlEn,
          image_url_fr: updatedDbItem.imageUrlFr,
          static_image_url: updatedDbItem.staticImageUrl,
          static_image_url_en: updatedDbItem.staticImageUrlEn,
          static_image_url_fr: updatedDbItem.staticImageUrlFr,
          order_index: updatedDbItem.orderIndex,
          is_active: updatedDbItem.isActive,
          created_at: updatedDbItem.createdAt,
          updated_at: updatedDbItem.updatedAt,
          cropSettings: updatedDbItem.cropSettings
        };
      }
      throw new Error(`Gallery item not found: ${itemId}`);
    }
    
    const updatedItem = { 
      ...items[itemIndex], 
      ...updateData, 
      updated_at: new Date().toISOString() 
    };
    items[itemIndex] = updatedItem;
    
    console.log(`🔍 JSON UPDATE - is_active: ${updatedItem.is_active}`);
    
    // 🚨 CRITICAL CACHE SYNC: Always update JSON, but handle differently based on database success
    if (!dbUpdateSuccessful) {
      console.log('⚠️ Database failed, updating JSON as primary storage');
      this.saveJsonFile('gallery.json', items);
      console.log(`✅ JSON FALLBACK SUCCESS: Updated gallery item "${updatedItem.title_en || 'Unknown'}" with ID ${itemId}`);
    } else {
      console.log('✅ Database update successful, updating JSON as backup');
      this.saveJsonFile('gallery.json', items);
    }
    
    // CRITICAL: Return database result if successful for consistency across environments
    if (dbUpdateSuccessful && updatedDbItem) {
      console.log(`🌍 RETURNING DATABASE RESULT for cross-environment consistency`);
      return {
        // Convert database fields back to expected format - COMPLETE MAPPING
        id: updatedDbItem.id,
        title_en: updatedDbItem.titleEn,
        title_fr: updatedDbItem.titleFr,
        price_en: updatedDbItem.priceEn,
        price_fr: updatedDbItem.priceFr,
        source_en: updatedDbItem.sourceEn,
        source_fr: updatedDbItem.sourceFr,
        duration_en: updatedDbItem.durationEn,
        duration_fr: updatedDbItem.durationFr,
        situation_en: updatedDbItem.situationEn,
        situation_fr: updatedDbItem.situationFr,
        story_en: updatedDbItem.storyEn,
        story_fr: updatedDbItem.storyFr,
        sorry_message_en: updatedDbItem.sorryMessageEn,
        sorry_message_fr: updatedDbItem.sorryMessageFr,
        format_platform_en: updatedDbItem.formatPlatformEn,
        format_platform_fr: updatedDbItem.formatPlatformFr,
        format_type_en: updatedDbItem.formatTypeEn,
        format_type_fr: updatedDbItem.formatTypeFr,
        video_url_en: updatedDbItem.videoUrlEn,
        video_url_fr: updatedDbItem.videoUrlFr,
        video_filename: updatedDbItem.videoFilename,
        use_same_video: updatedDbItem.useSameVideo,
        video_width: updatedDbItem.videoWidth,
        video_height: updatedDbItem.videoHeight,
        video_orientation: updatedDbItem.videoOrientation,
        image_url_en: updatedDbItem.imageUrlEn,
        image_url_fr: updatedDbItem.imageUrlFr,
        static_image_url: updatedDbItem.staticImageUrl,
        static_image_url_en: updatedDbItem.staticImageUrlEn,
        static_image_url_fr: updatedDbItem.staticImageUrlFr,
        cropSettings: updatedDbItem.cropSettings,
        order_index: updatedDbItem.orderIndex,
        is_active: updatedDbItem.isActive,
        created_at: updatedDbItem.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: updatedDbItem.updatedAt?.toISOString() || new Date().toISOString()
      };
    }
    
    // If database failed, return JSON result
    console.log(`📋 RETURNING JSON FALLBACK RESULT: Updated gallery item "${updatedItem.title_en || 'Unknown'}" with ID ${itemId}`);
    return updatedItem;
  }

  async updateGalleryItemOrder(itemId: string | number, newOrder: number): Promise<any> {
    console.log(`🔄 HYBRID ORDER UPDATE: ${itemId} → ${newOrder}`);
    
    // First update database for cross-environment sync
    let dbUpdateSuccessful = false;
    let updatedDbItem: any = null;
    
    try {
      const { galleryItems } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      console.log(`💾 DATABASE UPDATE: Setting order_index to ${newOrder} for item ${itemId}`);
      
      const dbResult = await db.update(galleryItems)
        .set({ 
          orderIndex: newOrder,
          updatedAt: new Date()
        })
        .where(eq(galleryItems.id, itemId.toString()))
        .returning();
        
      if (dbResult.length > 0) {
        updatedDbItem = dbResult[0];
        dbUpdateSuccessful = true;
        console.log(`✅ DATABASE UPDATE SUCCESS: ${updatedDbItem.titleEn} now at order ${newOrder}`);
      }
    } catch (error) {
      console.error('❌ DATABASE UPDATE FAILED:', error);
    }
    
    // Update JSON file as backup/fallback
    try {
      const items = this.loadJsonFile('gallery.json');
      const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
      
      if (itemIndex !== -1) {
        const item = items[itemIndex];
        console.log(`📝 JSON UPDATE: ${item.title_en} from order ${item.order_index} to ${newOrder}`);
        
        item.order_index = newOrder;
        item.updated_at = new Date().toISOString();
        
        this.saveJsonFile('gallery.json', items);
        console.log(`✅ JSON UPDATE SUCCESS: ${item.title_en} now at position ${newOrder}`);
        
        // Return updated item (prefer database result if available)
        return updatedDbItem || item;
      } else {
        console.log('⚠️ Item not found in JSON file - this is expected in database-first mode');
        if (dbUpdateSuccessful) {
          // Convert database item to expected format
          return {
            id: updatedDbItem.id,
            title_en: updatedDbItem.titleEn,
            title_fr: updatedDbItem.titleFr,
            order_index: updatedDbItem.orderIndex,
            updated_at: updatedDbItem.updatedAt
          };
        } else {
          throw new Error('Gallery item not found in both database and JSON');
        }
      }
    } catch (error) {
      if (!dbUpdateSuccessful) {
        console.error('❌ Both database and JSON updates failed:', error);
        throw error;
      }
      console.log('⚠️ JSON update failed but database update succeeded - continuing');
      return {
        id: updatedDbItem.id,
        title_en: updatedDbItem.titleEn,
        title_fr: updatedDbItem.titleFr,
        order_index: updatedDbItem.orderIndex,
        updated_at: updatedDbItem.updatedAt
      };
    }
  }

  async swapGalleryItemOrder(itemId1: string | number, itemId2: string | number): Promise<any> {
    console.log(`🔄 SWAP operation: ${itemId1} ↔ ${itemId2}`);
    
    // First update database to ensure cross-environment sync
    let dbSwapSuccessful = false;
    try {
      const { galleryItems } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      
      // Get current orders from database
      const dbItem1 = await db.select().from(galleryItems).where(eq(galleryItems.id, itemId1.toString()));
      const dbItem2 = await db.select().from(galleryItems).where(eq(galleryItems.id, itemId2.toString()));
      
      if (dbItem1.length === 1 && dbItem2.length === 1) {
        const item1 = dbItem1[0];
        const item2 = dbItem2[0];
        
        console.log(`💾 DATABASE SWAP: ${item1.titleEn} (${item1.orderIndex}) ↔ ${item2.titleEn} (${item2.orderIndex})`);
        
        // Perform database swap
        await db.update(galleryItems)
          .set({ orderIndex: item2.orderIndex, updatedAt: new Date() })
          .where(eq(galleryItems.id, itemId1.toString()));
          
        await db.update(galleryItems)
          .set({ orderIndex: item1.orderIndex, updatedAt: new Date() })
          .where(eq(galleryItems.id, itemId2.toString()));
          
        console.log(`✅ DATABASE SWAP SUCCESS`);
        dbSwapSuccessful = true;
      }
    } catch (error) {
      console.error('❌ DATABASE SWAP FAILED:', error);
    }
    
    // Update JSON file as backup/fallback - BUT only if database failed
    let jsonSwapSuccessful = false;
    try {
      const items = this.loadJsonFile('gallery.json');
      const item1Index = items.findIndex((item: any) => item.id.toString() === itemId1.toString());
      const item2Index = items.findIndex((item: any) => item.id.toString() === itemId2.toString());
      
      if (item1Index === -1 || item2Index === -1) {
        console.log('⚠️ Items not found in JSON file - this is expected if using database-first mode');
        if (dbSwapSuccessful) {
          console.log('✅ Database swap succeeded, JSON sync not required');
          return { dbSwapSuccessful, jsonSwapSuccessful: true, message: 'Database swap completed successfully' };
        } else {
          throw new Error('One or both gallery items not found in JSON and database swap failed');
        }
      }
    
      const item1 = items[item1Index];
      const item2 = items[item2Index];
      
      const order1 = item1.order_index;
      const order2 = item2.order_index;
      
      console.log(`📝 JSON SWAP: ${item1.title_en} (${order1}) ↔ ${item2.title_en} (${order2})`);
      
      // Swap the order indexes in JSON
      item1.order_index = order2;
      item2.order_index = order1;
      
      // Update timestamps
      const now = new Date().toISOString();
      item1.updated_at = now;
      item2.updated_at = now;
      
      this.saveJsonFile('gallery.json', items);
      jsonSwapSuccessful = true;
      
      console.log(`✅ HYBRID SWAP COMPLETE: ${item1.title_en} now at ${order2}, ${item2.title_en} now at ${order1}`);
    } catch (error) {
      console.error('❌ JSON SWAP FAILED:', error);
      if (!dbSwapSuccessful) {
        throw error;
      }
      console.log('⚠️ JSON swap failed but database swap succeeded - continuing');
    }
    
    console.log(`📊 Final results: Database=${dbSwapSuccessful ? 'SUCCESS' : 'FAILED'}, JSON=${jsonSwapSuccessful ? 'SUCCESS' : 'FAILED'}`);
    
    return { dbSwapSuccessful, jsonSwapSuccessful };
  }

  async deleteGalleryItem(itemId: string | number): Promise<any> {
    const items = this.loadJsonFile('gallery.json');
    const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
    
    if (itemIndex === -1) {
      throw new Error('Gallery item not found');
    }
    
    const deletedItem = items[itemIndex];
    
    // Clean up media files before removing from JSON
    await this.cleanupVideoFiles(deletedItem, 'gallery');
    
    items.splice(itemIndex, 1);
    this.saveJsonFile('gallery.json', items);
    
    return deletedItem;
  }

  // FAQ operations - TRUE HYBRID STORAGE
  async getFaqSections(language?: string): Promise<any[]> {
    try {
      console.log('🔍 FAQ Sections: Fetching from Supabase database...');
      const { data, error } = await this.supabase
        .from('faq_sections')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (!error && data) {
        console.log(`✅ FAQ Sections: Found ${data.length} sections in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((section: any) => ({
          id: parseInt(section.id) || section.id,
          title_en: section.name_en,
          title_fr: section.name_fr,
          order_index: section.order_index,
          is_active: section.is_active
        }));
        
        // Save to JSON as backup
        this.saveJsonFile('faq-sections.json', converted);
        return converted;
      } else {
        console.warn('⚠️ FAQ Sections: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Sections: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('faq-sections.json');
    return data.filter(section => section.is_active);
  }

  async getFaqs(sectionId?: string): Promise<any[]> {
    try {
      console.log('🔍 FAQs: Fetching from Supabase database...');
      let query = this.supabase
        .from('faqs')
        .select('*')
        .order('order_index');
      
      if (sectionId) {
        query = query.eq('section_id', sectionId);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        console.log(`✅ FAQs: Found ${data.length} FAQs in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((faq: any) => ({
          id: faq.id,
          section_id: faq.section_id,
          question_en: faq.question_en,
          question_fr: faq.question_fr,
          answer_en: faq.answer_en,
          answer_fr: faq.answer_fr,
          order_index: faq.order_index,
          is_active: faq.is_active
        }));
        
        // Save to JSON as backup
        this.saveJsonFile('faqs.json', converted);
        return converted;
      } else {
        console.warn('⚠️ FAQs: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQs: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('faqs.json');
    return sectionId ? data.filter(f => f.section_id === sectionId) : data;
  }

  // Contact operations
  async getContacts(): Promise<any[]> {
    return this.loadJsonFile('contacts.json');
  }

  async createContact(contact: any): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const newContact = {
      id: Date.now(), // Simple ID generation
      ...contact,
      created_at: new Date().toISOString(),
      status: 'new'
    };
    contacts.push(newContact);
    this.saveJsonFile('contacts.json', contacts);
    return newContact;
  }

  async updateContactStatus(contactId: string, status: string): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const contactIndex = contacts.findIndex((c: any) => c.id.toString() === contactId);
    
    if (contactIndex === -1) {
      throw new Error('Contact not found');
    }
    
    contacts[contactIndex].status = status;
    contacts[contactIndex].updated_at = new Date().toISOString();
    
    this.saveJsonFile('contacts.json', contacts);
    return contacts[contactIndex];
  }

  async deleteContact(contactId: string): Promise<any> {
    const contacts = this.loadJsonFile('contacts.json');
    const contactIndex = contacts.findIndex((c: any) => c.id.toString() === contactId);
    
    if (contactIndex === -1) {
      throw new Error('Contact not found');
    }
    
    const deletedContact = contacts.splice(contactIndex, 1)[0];
    this.saveJsonFile('contacts.json', contacts);
    return deletedContact;
  }

  // Legal documents operations
  async getLegalDocuments(language?: string): Promise<any[]> {
    // Define the correct order per user requirements:
    // 1. Mentions légales (legal-notice)
    // 2. Conditions générales d'utilisation (terms) 
    // 3. Conditions générales de vente (terms-sale)
    // 4. Politique de confidentialité (privacy)
    // 5. Politique des cookies (cookies)
    const documentOrder = ['legal-notice', 'terms', 'terms-sale', 'privacy', 'cookies'];
    
    // Try Supabase first
    try {
      const { data, error } = await this.supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        console.log(`✅ Legal Documents: Found ${data.length} documents in Supabase`);
        // Convert database format to JSON format for compatibility
        const converted = data.map((doc: any) => ({
          id: doc.id,
          type: doc.type,
          title_en: doc.title_en,
          title_fr: doc.title_fr,
          content_en: doc.content_en,
          content_fr: doc.content_fr,
          is_active: doc.is_active,
          updated_at: doc.updated_at
        }));
        
        // Sort by the correct order defined above
        const sorted = converted.sort((a: any, b: any) => {
          const indexA = documentOrder.indexOf(a.type);
          const indexB = documentOrder.indexOf(b.type);
          // Put documents not in the order array at the end
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        
        console.log(`📋 Legal Documents ordered: ${sorted.map((d: any) => d.type).join(' → ')}`);
        
        // Save to JSON as backup
        this.saveJsonFile('legal-documents.json', sorted);
        return sorted;
      } else {
        console.warn('⚠️ Legal Documents: Supabase error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Documents: Database connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON with same ordering
    const data = this.loadJsonFile('legal-documents.json');
    const active = data.filter(doc => doc.is_active);
    
    return active.sort((a: any, b: any) => {
      const indexA = documentOrder.indexOf(a.type);
      const indexB = documentOrder.indexOf(b.type);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  async createLegalDocument(document: any): Promise<any> {
    // Try Supabase first
    try {
      const docData = {
        type: document.type,
        title_en: document.title_en,
        title_fr: document.title_fr,
        content_en: document.content_en,
        content_fr: document.content_fr,
        is_active: document.is_active ?? true
      };

      const { data, error } = await this.supabase
        .from('legal_documents')
        .insert([docData])
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document created in Supabase:`, data.type);
        
        // Update JSON backup
        const docs = this.loadJsonFile('legal-documents.json');
        const newDoc = {
          id: data.id,
          type: data.type,
          title_en: data.title_en,
          title_fr: data.title_fr,
          content_en: data.content_en,
          content_fr: data.content_fr,
          is_active: data.is_active,
          updated_at: data.updated_at
        };
        docs.push(newDoc);
        this.saveJsonFile('legal-documents.json', docs);
        
        return newDoc;
      } else {
        console.warn('⚠️ Legal Document: Supabase create error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    const docs = this.loadJsonFile('legal-documents.json');
    const newDoc = {
      id: crypto.randomUUID(),
      ...document,
      updated_at: new Date().toISOString(),
      is_active: document.is_active ?? true
    };
    docs.push(newDoc);
    this.saveJsonFile('legal-documents.json', docs);
    return newDoc;
  }

  async updateLegalDocument(docId: string, updates: any): Promise<any> {
    // Try Supabase first
    try {
      // Complete field mapping for Legal Documents
      const updateData = {
        type: updates.type,
        title_en: updates.title_en,
        title_fr: updates.title_fr,
        content_en: updates.content_en,
        content_fr: updates.content_fr,
        is_active: updates.is_active !== undefined ? updates.is_active : true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('legal_documents')
        .update(updateData)
        .eq('id', docId)
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document updated in Supabase:`, docId);
        
        // Update JSON backup with complete field mapping
        const docs = this.loadJsonFile('legal-documents.json');
        const docIndex = docs.findIndex((d: any) => d.id === docId);
        if (docIndex !== -1) {
          docs[docIndex] = {
            id: data.id,
            type: data.type,
            title_en: data.title_en,
            title_fr: data.title_fr,
            content_en: data.content_en,
            content_fr: data.content_fr,
            is_active: data.is_active,
            updated_at: data.updated_at
          };
          this.saveJsonFile('legal-documents.json', docs);
        }
        
        return data;
      } else {
        console.warn('⚠️ Legal Document: Supabase update error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON with complete field mapping
    const docs = this.loadJsonFile('legal-documents.json');
    const docIndex = docs.findIndex((d: any) => d.id === docId);
    
    if (docIndex === -1) {
      throw new Error('Legal document not found');
    }
    
    const updatedDoc = {
      ...docs[docIndex],
      type: updates.type || docs[docIndex].type,
      title_en: updates.title_en || docs[docIndex].title_en,
      title_fr: updates.title_fr || docs[docIndex].title_fr,
      content_en: updates.content_en || docs[docIndex].content_en,
      content_fr: updates.content_fr || docs[docIndex].content_fr,
      is_active: updates.is_active !== undefined ? updates.is_active : docs[docIndex].is_active,
      updated_at: new Date().toISOString()
    };
    
    docs[docIndex] = updatedDoc;
    this.saveJsonFile('legal-documents.json', docs);
    return updatedDoc;
  }

  async deleteLegalDocument(docId: string): Promise<any> {
    // Try Supabase first
    try {
      const { data, error } = await this.supabase
        .from('legal_documents')
        .delete()
        .eq('id', docId)
        .select()
        .single();

      if (!error && data) {
        console.log(`✅ Legal Document deleted from Supabase:`, docId);
        
        // Update JSON backup
        const docs = this.loadJsonFile('legal-documents.json');
        const filteredDocs = docs.filter((d: any) => d.id !== docId);
        this.saveJsonFile('legal-documents.json', filteredDocs);
        
        return data;
      } else {
        console.warn('⚠️ Legal Document: Supabase delete error, falling back to JSON:', error);
      }
    } catch (error) {
      console.warn('⚠️ Legal Document: Database connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    const docs = this.loadJsonFile('legal-documents.json');
    const docIndex = docs.findIndex((d: any) => d.id === docId);
    
    if (docIndex === -1) {
      throw new Error('Legal document not found');
    }
    
    const deletedDoc = docs.splice(docIndex, 1)[0];
    this.saveJsonFile('legal-documents.json', docs);
    return deletedDoc;
  }

  // CTA settings operations
  async getCtaSettings(language?: string): Promise<any[]> {
    try {
      console.log('🔍 CTA Settings: Querying Supabase database...');
      const { data, error } = await this.supabase
        .from('cta_settings')
        .select('*')
        .order('created_at');
      
      if (error) {
        console.error('⚠️ CTA Settings: Supabase query error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('✅ CTA Settings retrieved from Supabase:', data.length, 'items');
        
        // Convert snake_case to camelCase for frontend
        const converted = data.map((item: any) => ({
          id: item.id,
          titleFr: item.title_fr,
          titleEn: item.title_en,
          buttonTextFr: item.button_text_fr,
          buttonTextEn: item.button_text_en,
          buttonUrlEn: item.button_url_en,
          buttonUrlFr: item.button_url_fr,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        return converted;
      } else {
        console.warn('⚠️ Supabase CTA query returned no data');
      }
    } catch (error) {
      console.warn('⚠️ CTA Settings: Supabase connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON - return ALL settings for admin
    const data = this.loadJsonFile('cta-settings.json');
    return data; // Return all, not just active ones
  }

  async createCtaSettings(ctaData: any): Promise<any> {
    try {
      console.log('🆕 Creating CTA setting:', ctaData);
      
      // Try database first
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('cta_settings')
          .insert({
            id: ctaData.id,
            button_text_fr: ctaData.buttonTextFr,
            button_text_en: ctaData.buttonTextEn,
            button_url_en: ctaData.buttonUrlEn,
            button_url_fr: ctaData.buttonUrlFr,
            is_active: ctaData.isActive
          })
          .select()
          .single();
        
        if (!error && data) {
          console.log('✅ CTA setting created in Supabase:', data);
          
          // Convert back and update JSON backup
          const converted = {
            id: data.id,
            button_text_fr: data.button_text_fr,
            button_text_en: data.button_text_en,
            button_url_en: data.button_url_en,
            button_url_fr: data.button_url_fr,
            is_active: data.is_active,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
          
          // Update JSON backup
          const settings = this.loadJsonFile('cta-settings.json');
          settings.push(converted);
          this.saveJsonFile('cta-settings.json', settings);
          
          return converted;
        }
      }
    } catch (error) {
      console.warn('⚠️ Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const settings = this.loadJsonFile('cta-settings.json');
    const newSetting = {
      id: ctaData.id,
      button_text_fr: ctaData.buttonTextFr,
      button_text_en: ctaData.buttonTextEn,
      button_url_en: ctaData.buttonUrlEn,
      button_url_fr: ctaData.buttonUrlFr,
      is_active: ctaData.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    settings.push(newSetting);
    this.saveJsonFile('cta-settings.json', settings);
    return newSetting;
  }

  async updateCtaSettings(ctaId: string, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating CTA setting in Supabase:', ctaId, updates);
      
      // Convert camelCase to snake_case for Supabase
      const dbUpdates: any = {};
      if (updates.titleFr !== undefined) dbUpdates.title_fr = updates.titleFr;
      if (updates.titleEn !== undefined) dbUpdates.title_en = updates.titleEn;
      if (updates.buttonTextFr !== undefined) dbUpdates.button_text_fr = updates.buttonTextFr;
      if (updates.buttonTextEn !== undefined) dbUpdates.button_text_en = updates.buttonTextEn;
      if (updates.buttonUrlEn !== undefined) dbUpdates.button_url_en = updates.buttonUrlEn;
      if (updates.buttonUrlFr !== undefined) dbUpdates.button_url_fr = updates.buttonUrlFr;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      dbUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('cta_settings')
        .update(dbUpdates)
        .eq('id', ctaId)
        .select()
        .single();
      
      if (error) {
        console.error('⚠️ CTA Settings: Supabase update error:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ CTA setting updated in Supabase:', data);
        
        // Convert snake_case back to camelCase for frontend
        const converted = {
          id: data.id,
          titleFr: data.title_fr,
          titleEn: data.title_en,
          buttonTextFr: data.button_text_fr,
          buttonTextEn: data.button_text_en,
          buttonUrlEn: data.button_url_en,
          buttonUrlFr: data.button_url_fr,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        
        return converted;
      } else {
        console.warn('⚠️ Supabase update returned no record');
      }
    } catch (error) {
      console.warn('⚠️ CTA Settings: Supabase update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const settings = this.loadJsonFile('cta-settings.json');
    const index = settings.findIndex((setting: any) => setting.id === ctaId);
    if (index === -1) return null;
    
    settings[index] = { 
      ...settings[index], 
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveJsonFile('cta-settings.json', settings);
    return settings[index];
  }

  async deleteCtaSettings(ctaId: string): Promise<any> {
    try {
      console.log('🗑️ Deleting CTA setting:', ctaId);
      
      // Try database first
      if (this.supabase) {
        const { error } = await this.supabase
          .from('cta_settings')
          .delete()
          .eq('id', ctaId);
        
        if (!error) {
          console.log('✅ CTA setting deleted from Supabase');
        } else {
          console.warn('⚠️ Database delete error, continuing with JSON cleanup:', error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup regardless
    const settings = this.loadJsonFile('cta-settings.json');
    const index = settings.findIndex((setting: any) => setting.id === ctaId);
    if (index === -1) return false;
    
    settings.splice(index, 1);
    this.saveJsonFile('cta-settings.json', settings);
    return true;
  }

  // Why MEMOPYK cards methods
  async getWhyMemopykCards(): Promise<any[]> {
    try {
      console.log('🔍 Why MEMOPYK Cards: Querying Supabase database...');
      const { data, error } = await this.supabase
        .from('why_memopyk_cards')
        .select('*')
        .order('order_index');
      
      if (error) {
        console.error('⚠️ Why MEMOPYK Cards: Supabase query error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('✅ Why MEMOPYK Cards retrieved from Supabase:', data.length, 'items');
        
        // Convert snake_case to camelCase for frontend
        const converted = data.map((item: any) => ({
          id: item.id,
          titleEn: item.title_en,
          titleFr: item.title_fr,
          descriptionEn: item.description_en,
          descriptionFr: item.description_fr,
          iconName: item.icon_name,
          gradient: item.gradient,
          orderIndex: item.order_index,
          isActive: item.is_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        return converted;
      } else {
        console.log('⚠️ Why MEMOPYK Cards: Supabase query returned no data');
      }
    } catch (error) {
      console.warn('⚠️ Why MEMOPYK Cards: Supabase connection failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    console.log('📄 Why MEMOPYK Cards: Loading from JSON fallback');
    const cards = this.loadJsonFile('why-memopyk-cards.json');
    
    // Handle both camelCase (production format) and snake_case (internal format)
    const convertedCards = cards.map((card: any) => ({
      id: card.id,
      titleEn: card.titleEn || card.title_en,
      titleFr: card.titleFr || card.title_fr,
      descriptionEn: card.descriptionEn || card.description_en,
      descriptionFr: card.descriptionFr || card.description_fr,
      iconName: card.iconName || card.icon_name,
      gradient: card.gradient,
      orderIndex: card.orderIndex !== undefined ? card.orderIndex : card.order_index,
      isActive: card.isActive !== undefined ? card.isActive : card.is_active,
      createdAt: card.createdAt || card.created_at,
      updatedAt: card.updatedAt || card.updated_at
    }));
    
    // Initialize with default data if empty
    if (convertedCards.length === 0) {
      const defaultCards = [
        {
          id: "simplicity",
          title_en: "Simplicity",
          title_fr: "Simplicité",
          description_en: "All formats accepted, with technical details handled professionally. Just send your photos and videos—no need to sort or organize files; everything is made easy for you.",
          description_fr: "Tous formats acceptés, détails techniques pris en charge professionnellement. Envoyez simplement vos photos et vidéos, inutile de trier ni d'organiser les fichiers : tout est simple pour vous.",
          icon_name: "Zap",
          gradient: "from-memopyk-dark-blue/20 to-memopyk-navy/10",
          order_index: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "time-saving",
          title_en: "Time Saving",
          title_fr: "Gain de Temps",
          description_en: "Our dedicated team handles everything with a clear process and predictable deadlines. You save precious hours while your memories are brought to life effortlessly.",
          description_fr: "Notre équipe dédiée prend tout en main avec un processus clair et des délais prévisibles. Vous gagnez des heures précieuses pendant que vos souvenirs se transforment sans effort.",
          icon_name: "Clock",
          gradient: "from-memopyk-sky-blue/20 to-memopyk-blue-gray/10",
          order_index: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "personalization",
          title_en: "Personalization",
          title_fr: "Personnalisation",
          description_en: "Every souvenir film is designed to be truly unique. We listen to all your wishes and specific instructions in a spirit of collaboration.",
          description_fr: "Chaque film souvenir est pensé pour être vraiment unique. Nous sommes à l'écoute de toutes vos envies et consignes spécifiques dans un esprit de collaboration.",
          icon_name: "Settings",
          gradient: "from-memopyk-cream/40 to-memopyk-sky-blue/20",
          order_index: 2,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "expertise",
          title_en: "Expertise",
          title_fr: "Expertise",
          description_en: "An efficient process ensures clear advice and attentive follow-up at each step. The result: memorable films with genuine added value.",
          description_fr: "Un processus efficace assure des conseils clairs et un suivi attentif à chaque étape. Le résultat : des films mémorables avec une véritable valeur ajoutée.",
          icon_name: "Users",
          gradient: "from-memopyk-orange/20 to-memopyk-cream/30",
          order_index: 3,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "security",
          title_en: "Security",
          title_fr: "Sécurité",
          description_en: "Your personal data is fully protected. Secure storage, encrypted transfers, and deletion after delivery guarantee absolute confidentiality of your memories.",
          description_fr: "Vos données personnelles sont entièrement protégées. Stockage sécurisé, transferts chiffrés et suppression après livraison garantissent la confidentialité absolue de vos souvenirs.",
          icon_name: "Shield",
          gradient: "from-memopyk-navy/30 to-memopyk-dark-blue/20",
          order_index: 4,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      this.saveJsonFile('why-memopyk-cards.json', defaultCards);
      return defaultCards.map(card => ({
        id: card.id,
        titleEn: card.title_en,
        titleFr: card.title_fr,
        descriptionEn: card.description_en,
        descriptionFr: card.description_fr,
        iconName: card.icon_name,
        gradient: card.gradient,
        orderIndex: card.order_index,
        isActive: card.is_active,
        createdAt: card.created_at,
        updatedAt: card.updated_at
      }));
    }
    
    // Return the properly converted cards (sorted by orderIndex)
    return convertedCards.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async createWhyMemopykCard(cardData: any): Promise<any> {
    try {
      console.log('🆕 Creating Why MEMOPYK card:', cardData);
      
      // Try database first
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('why_memopyk_cards')
          .insert({
            id: cardData.id,
            title_en: cardData.titleEn,
            title_fr: cardData.titleFr,
            description_en: cardData.descriptionEn,
            description_fr: cardData.descriptionFr,
            icon_name: cardData.iconName,
            gradient: cardData.gradient,
            order_index: cardData.orderIndex,
            is_active: cardData.isActive
          })
          .select()
          .single();
        
        if (!error && data) {
          console.log('✅ Why MEMOPYK card created in Supabase:', data);
          
          // Convert back and update JSON backup
          const converted = {
            id: data.id,
            title_en: data.title_en,
            title_fr: data.title_fr,
            description_en: data.description_en,
            description_fr: data.description_fr,
            icon_name: data.icon_name,
            gradient: data.gradient,
            order_index: data.order_index,
            is_active: data.is_active,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
          
          // Update JSON backup
          const cards = this.loadJsonFile('why-memopyk-cards.json');
          cards.push(converted);
          this.saveJsonFile('why-memopyk-cards.json', cards);
          
          return converted;
        }
      }
    } catch (error) {
      console.warn('⚠️ Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const cards = this.loadJsonFile('why-memopyk-cards.json');
    const newCard = {
      id: cardData.id,
      title_en: cardData.titleEn,
      title_fr: cardData.titleFr,
      description_en: cardData.descriptionEn,
      description_fr: cardData.descriptionFr,
      icon_name: cardData.iconName,
      gradient: cardData.gradient,
      order_index: cardData.orderIndex,
      is_active: cardData.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    cards.push(newCard);
    this.saveJsonFile('why-memopyk-cards.json', cards);
    
    return newCard;
  }

  async updateWhyMemopykCard(cardId: string, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating Why MEMOPYK card:', cardId, updates);
      
      // Try database first
      if (this.supabase) {
        const updateData: any = {};
        if (updates.titleEn !== undefined) updateData.title_en = updates.titleEn;
        if (updates.titleFr !== undefined) updateData.title_fr = updates.titleFr;
        if (updates.descriptionEn !== undefined) updateData.description_en = updates.descriptionEn;
        if (updates.descriptionFr !== undefined) updateData.description_fr = updates.descriptionFr;
        if (updates.iconName !== undefined) updateData.icon_name = updates.iconName;
        if (updates.gradient !== undefined) updateData.gradient = updates.gradient;
        if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        
        const { data, error } = await this.supabase
          .from('why_memopyk_cards')
          .update(updateData)
          .eq('id', cardId)
          .select()
          .single();
        
        if (!error && data) {
          console.log('✅ Why MEMOPYK card updated in Supabase:', data);
          
          // Update JSON backup
          const cards = this.loadJsonFile('why-memopyk-cards.json');
          const index = cards.findIndex((card: any) => card.id === cardId);
          if (index !== -1) {
            cards[index] = {
              ...cards[index],
              title_en: data.title_en,
              title_fr: data.title_fr,
              description_en: data.description_en,
              description_fr: data.description_fr,
              icon_name: data.icon_name,
              gradient: data.gradient,
              order_index: data.order_index,
              is_active: data.is_active,
              updated_at: data.updated_at
            };
            this.saveJsonFile('why-memopyk-cards.json', cards);
          }
          
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const cards = this.loadJsonFile('why-memopyk-cards.json');
    const index = cards.findIndex((card: any) => card.id === cardId);
    
    if (index === -1) {
      return null;
    }
    
    // Update fields
    const updateData: any = {};
    if (updates.titleEn !== undefined) updateData.title_en = updates.titleEn;
    if (updates.titleFr !== undefined) updateData.title_fr = updates.titleFr;
    if (updates.descriptionEn !== undefined) updateData.description_en = updates.descriptionEn;
    if (updates.descriptionFr !== undefined) updateData.description_fr = updates.descriptionFr;
    if (updates.iconName !== undefined) updateData.icon_name = updates.iconName;
    if (updates.gradient !== undefined) updateData.gradient = updates.gradient;
    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    
    cards[index] = {
      ...cards[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    this.saveJsonFile('why-memopyk-cards.json', cards);
    
    return cards[index];
  }

  async deleteWhyMemopykCard(cardId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting Why MEMOPYK card:', cardId);
      
      // Try database first
      if (this.supabase) {
        const { error } = await this.supabase
          .from('why_memopyk_cards')
          .delete()
          .eq('id', cardId);
        
        if (!error) {
          console.log('✅ Why MEMOPYK card deleted from Supabase');
          
          // Update JSON backup
          const cards = this.loadJsonFile('why-memopyk-cards.json');
          const filteredCards = cards.filter((card: any) => card.id !== cardId);
          this.saveJsonFile('why-memopyk-cards.json', filteredCards);
          
          return true;
        }
      }
    } catch (error) {
      console.warn('⚠️ Database delete failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const cards = this.loadJsonFile('why-memopyk-cards.json');
    const filteredCards = cards.filter((card: any) => card.id !== cardId);
    
    if (filteredCards.length === cards.length) {
      return false; // Not found
    }
    
    this.saveJsonFile('why-memopyk-cards.json', filteredCards);
    return true;
  }

  // ==================== PARTNERS OPERATIONS ====================
  
  async getPartners(filters?: any): Promise<any[]> {
    try {
      console.log('🔍 Partners: Querying Supabase database...');
      
      if (this.supabase) {
        let query = this.supabase.from('partners').select('*');
        
        // Apply filters if provided
        if (filters) {
          if (filters.status) {
            query = query.eq('status', filters.status);
          }
          if (filters.is_active !== undefined) {
            query = query.eq('is_active', filters.is_active);
          }
          if (filters.show_on_map !== undefined) {
            query = query.eq('show_on_map', filters.show_on_map);
          }
          if (filters.search) {
            query = query.or(`partner_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
          }
        }
        
        query = query.order('id', { ascending: false });
        
        const { data, error } = await query;
        
        if (!error && data) {
          console.log(`✅ Partners: Retrieved ${data.length} items from Supabase`);
          
          // Sync to JSON backup
          this.saveJsonFile('partners.json', data);
          
          return data;
        }
        
        console.warn('⚠️ Partners: Supabase query failed:', error);
      }
    } catch (error) {
      console.warn('⚠️ Partners: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    let data = this.loadJsonFile('partners.json');
    
    // Apply filters to JSON data
    if (filters) {
      if (filters.status) {
        data = data.filter((p: any) => p.status === filters.status);
      }
      if (filters.is_active !== undefined) {
        data = data.filter((p: any) => p.is_active === filters.is_active);
      }
      if (filters.show_on_map !== undefined) {
        data = data.filter((p: any) => p.show_on_map === filters.show_on_map);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        data = data.filter((p: any) => 
          p.partner_name?.toLowerCase().includes(searchLower) ||
          p.city?.toLowerCase().includes(searchLower)
        );
      }
    }
    
    return data;
  }

  async getPartnerById(partnerId: number): Promise<any> {
    try {
      console.log(`🔍 Partners: Fetching partner ${partnerId} from Supabase`);
      
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('partners')
          .select('*')
          .eq('id', partnerId)
          .single();
        
        if (!error && data) {
          console.log('✅ Partner retrieved from Supabase');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ Partner fetch failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const partners = this.loadJsonFile('partners.json');
    return partners.find((p: any) => p.id === partnerId) || null;
  }

  async createPartner(partnerData: any): Promise<any> {
    try {
      console.log('🆕 Creating partner in Supabase:', partnerData.partner_name);
      
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('partners')
          .insert([partnerData])
          .select()
          .single();
        
        if (!error && data) {
          console.log('✅ Partner created in Supabase:', data.id);
          
          // Update JSON backup
          const partners = this.loadJsonFile('partners.json');
          partners.push(data);
          this.saveJsonFile('partners.json', partners);
          
          return data;
        }
        
        console.warn('⚠️ Supabase insert failed:', error);
      }
    } catch (error) {
      console.warn('⚠️ Partner creation failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const partners = this.loadJsonFile('partners.json');
    const newId = partners.length > 0 ? Math.max(...partners.map((p: any) => p.id || 0)) + 1 : 1;
    const newPartner = {
      ...partnerData,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    partners.push(newPartner);
    this.saveJsonFile('partners.json', partners);
    
    return newPartner;
  }

  async updatePartner(partnerId: number, updates: any): Promise<any> {
    try {
      console.log(`🔄 Updating partner ${partnerId} in Supabase`);
      
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('partners')
          .update(updates)
          .eq('id', partnerId)
          .select()
          .single();
        
        if (!error && data) {
          console.log('✅ Partner updated in Supabase');
          
          // Update JSON backup
          const partners = this.loadJsonFile('partners.json');
          const index = partners.findIndex((p: any) => p.id === partnerId);
          if (index !== -1) {
            partners[index] = data;
            this.saveJsonFile('partners.json', partners);
          }
          
          return data;
        }
        
        console.warn('⚠️ Supabase update failed:', error);
      }
    } catch (error) {
      console.warn('⚠️ Partner update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const partners = this.loadJsonFile('partners.json');
    const index = partners.findIndex((p: any) => p.id === partnerId);
    
    if (index === -1) {
      throw new Error('Partner not found');
    }
    
    partners[index] = {
      ...partners[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.saveJsonFile('partners.json', partners);
    
    return partners[index];
  }

  async deletePartner(partnerId: number): Promise<any> {
    try {
      console.log(`🗑️ Deleting partner ${partnerId} from Supabase`);
      
      if (this.supabase) {
        const { error } = await this.supabase
          .from('partners')
          .delete()
          .eq('id', partnerId);
        
        if (!error) {
          console.log('✅ Partner deleted from Supabase');
          
          // Update JSON backup
          const partners = this.loadJsonFile('partners.json');
          const filteredPartners = partners.filter((p: any) => p.id !== partnerId);
          this.saveJsonFile('partners.json', filteredPartners);
          
          return true;
        }
      }
    } catch (error) {
      console.warn('⚠️ Partner deletion failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const partners = this.loadJsonFile('partners.json');
    const filteredPartners = partners.filter((p: any) => p.id !== partnerId);
    
    if (filteredPartners.length === partners.length) {
      throw new Error('Partner not found');
    }
    
    this.saveJsonFile('partners.json', filteredPartners);
    return true;
  }

  // SEO settings operations
  // ==================== SEO SETTINGS OPERATIONS ====================
  
  async getSeoSettings(page?: string, language?: string): Promise<any[]> {
    try {
      console.log('🔍 SEO Settings: Querying database...');
      
      if (this.db) {
        const { seoSettings } = await import('../shared/schema');
        let query = this.db.select().from(seoSettings);
        
        if (page) {
          query = query.where(eq(seoSettings.page, page));
        }
        
        const data = await query;
        
        if (data && data.length > 0) {
          console.log('✅ SEO Settings retrieved from database:', data.length, 'items');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Settings: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('seo-settings.json');
    return page ? data.filter((s: any) => s.page === page) : data;
  }

  async createSeoSettings(seoData: any): Promise<any> {
    try {
      console.log('🆕 Creating SEO Settings in database:', seoData);
      
      if (this.db) {
        const { seoSettings } = await import('../shared/schema');
        
        const [newRecord] = await this.db
          .insert(seoSettings)
          .values({
            page: seoData.page,
            urlSlugEn: seoData.urlSlugEn,
            urlSlugFr: seoData.urlSlugFr,
            metaTitleEn: seoData.metaTitleEn,
            metaTitleFr: seoData.metaTitleFr,
            metaDescriptionEn: seoData.metaDescriptionEn,
            metaDescriptionFr: seoData.metaDescriptionFr,
            metaKeywordsEn: seoData.metaKeywordsEn,
            metaKeywordsFr: seoData.metaKeywordsFr,
            ogTitleEn: seoData.ogTitleEn,
            ogTitleFr: seoData.ogTitleFr,
            ogDescriptionEn: seoData.ogDescriptionEn,
            ogDescriptionFr: seoData.ogDescriptionFr,
            ogImageUrl: seoData.ogImageUrl,
            ogType: seoData.ogType || 'website',
            twitterCard: seoData.twitterCard || 'summary_large_image',
            twitterTitleEn: seoData.twitterTitleEn,
            twitterTitleFr: seoData.twitterTitleFr,
            twitterDescriptionEn: seoData.twitterDescriptionEn,
            twitterDescriptionFr: seoData.twitterDescriptionFr,
            twitterImageUrl: seoData.twitterImageUrl,
            canonicalUrl: seoData.canonicalUrl,
            robotsIndex: seoData.robotsIndex !== false,
            robotsFollow: seoData.robotsFollow !== false,
            robotsNoArchive: seoData.robotsNoArchive || false,
            robotsNoSnippet: seoData.robotsNoSnippet || false,
            customMetaTags: seoData.customMetaTags || null,
            structuredData: seoData.structuredData || null,
            priority: seoData.priority || "0.5",
            changeFreq: seoData.changeFreq || "monthly",
            isActive: seoData.isActive !== false
          })
          .returning();
        
        if (newRecord) {
          console.log('✅ SEO Settings created in database:', newRecord);
          
          // Update JSON backup
          const settings = this.loadJsonFile('seo-settings.json');
          settings.push(newRecord);
          this.saveJsonFile('seo-settings.json', settings);
          
          // Create audit log
          await this.createSeoAuditLog({
            pageId: newRecord.id,
            action: 'created',
            field: 'all',
            newValue: 'SEO settings created',
            adminUser: 'system',
            changeReason: 'New SEO page created'
          });
          
          return newRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Settings: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const settings = this.loadJsonFile('seo-settings.json');
    const newSetting = {
      id: Date.now().toString(),
      ...seoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    settings.push(newSetting);
    this.saveJsonFile('seo-settings.json', settings);
    return newSetting;
  }

  async updateSeoSettings(pageId: string, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating SEO Settings:', pageId, updates);
      
      if (this.db) {
        const { seoSettings } = await import('../shared/schema');
        
        const [updatedRecord] = await this.db
          .update(seoSettings)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(seoSettings.id, pageId))
          .returning();
        
        if (updatedRecord) {
          console.log('✅ SEO Settings updated in database');
          
          // Update JSON backup
          const settings = this.loadJsonFile('seo-settings.json');
          const index = settings.findIndex((s: any) => s.id === pageId);
          if (index !== -1) {
            settings[index] = { ...settings[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveJsonFile('seo-settings.json', settings);
          }
          
          // Create audit log for each changed field
          for (const [field, value] of Object.entries(updates)) {
            await this.createSeoAuditLog({
              pageId: pageId,
              action: 'updated',
              field: field,
              newValue: String(value),
              adminUser: 'admin',
              changeReason: 'SEO optimization update'
            });
          }
          
          return updatedRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Settings: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const settings = this.loadJsonFile('seo-settings.json');
    const index = settings.findIndex((s: any) => s.id === pageId);
    if (index !== -1) {
      settings[index] = { ...settings[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveJsonFile('seo-settings.json', settings);
      return settings[index];
    }
    return null;
  }

  async deleteSeoSettings(pageId: string): Promise<any> {
    try {
      console.log('🗑️ Deleting SEO Settings:', pageId);
      
      if (this.db) {
        const { seoSettings } = await import('../shared/schema');
        
        const [deletedRecord] = await this.db
          .delete(seoSettings)
          .where(eq(seoSettings.id, pageId))
          .returning();
        
        if (deletedRecord) {
          console.log('✅ SEO Settings deleted from database');
          
          // Create audit log
          await this.createSeoAuditLog({
            pageId: pageId,
            action: 'deleted',
            field: 'all',
            oldValue: 'SEO settings existed',
            adminUser: 'admin',
            changeReason: 'Page SEO removed'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Settings: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup
    const settings = this.loadJsonFile('seo-settings.json');
    const filtered = settings.filter((s: any) => s.id !== pageId);
    this.saveJsonFile('seo-settings.json', filtered);
    return true;
  }

  // ==================== SEO REDIRECTS OPERATIONS ====================
  
  async getSeoRedirects(isActive?: boolean): Promise<any[]> {
    try {
      console.log('🔍 SEO Redirects: Querying database...');
      
      if (this.db) {
        const { seoRedirects } = await import('../shared/schema');
        let query = this.db.select().from(seoRedirects).orderBy(desc(seoRedirects.createdAt));
        
        if (isActive !== undefined) {
          query = query.where(eq(seoRedirects.isActive, isActive));
        }
        
        const data = await query;
        
        if (data) {
          console.log('✅ SEO Redirects retrieved from database:', data.length, 'items');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Redirects: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('seo-redirects.json');
    return isActive !== undefined ? data.filter((r: any) => r.isActive === isActive) : data;
  }

  async createSeoRedirect(redirectData: any): Promise<any> {
    try {
      console.log('🆕 Creating SEO Redirect:', redirectData);
      
      if (this.db) {
        const { seoRedirects } = await import('../shared/schema');
        
        const [newRecord] = await this.db
          .insert(seoRedirects)
          .values({
            fromPath: redirectData.fromPath,
            toPath: redirectData.toPath,
            redirectType: redirectData.redirectType || 301,
            isActive: redirectData.isActive !== false,
            description: redirectData.description || '',
            hitCount: 0
          })
          .returning();
        
        if (newRecord) {
          console.log('✅ SEO Redirect created in database:', newRecord);
          
          // Update JSON backup
          const redirects = this.loadJsonFile('seo-redirects.json');
          redirects.push(newRecord);
          this.saveJsonFile('seo-redirects.json', redirects);
          
          return newRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Redirects: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const redirects = this.loadJsonFile('seo-redirects.json');
    const newRedirect = {
      id: Date.now(),
      ...redirectData,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    redirects.push(newRedirect);
    this.saveJsonFile('seo-redirects.json', redirects);
    return newRedirect;
  }

  async updateSeoRedirect(redirectId: number, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating SEO Redirect:', redirectId, updates);
      
      if (this.db) {
        const { seoRedirects } = await import('../shared/schema');
        
        const [updatedRecord] = await this.db
          .update(seoRedirects)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(seoRedirects.id, redirectId))
          .returning();
        
        if (updatedRecord) {
          console.log('✅ SEO Redirect updated in database');
          
          // Update JSON backup
          const redirects = this.loadJsonFile('seo-redirects.json');
          const index = redirects.findIndex((r: any) => r.id === redirectId);
          if (index !== -1) {
            redirects[index] = { ...redirects[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveJsonFile('seo-redirects.json', redirects);
          }
          
          return updatedRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Redirects: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const redirects = this.loadJsonFile('seo-redirects.json');
    const index = redirects.findIndex((r: any) => r.id === redirectId);
    if (index !== -1) {
      redirects[index] = { ...redirects[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveJsonFile('seo-redirects.json', redirects);
      return redirects[index];
    }
    return null;
  }

  async deleteSeoRedirect(redirectId: number): Promise<any> {
    try {
      console.log('🗑️ Deleting SEO Redirect:', redirectId);
      
      if (this.db) {
        const { seoRedirects } = await import('../shared/schema');
        
        await this.db
          .delete(seoRedirects)
          .where(eq(seoRedirects.id, redirectId));
        
        console.log('✅ SEO Redirect deleted from database');
      }
    } catch (error) {
      console.warn('⚠️ SEO Redirects: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup
    const redirects = this.loadJsonFile('seo-redirects.json');
    const filtered = redirects.filter((r: any) => r.id !== redirectId);
    this.saveJsonFile('seo-redirects.json', filtered);
    return true;
  }

  async incrementRedirectHit(redirectId: number): Promise<any> {
    try {
      if (this.db) {
        const { seoRedirects } = await import('../shared/schema');
        
        const [updatedRecord] = await this.db
          .update(seoRedirects)
          .set({
            hitCount: sql`${seoRedirects.hitCount} + 1`,
            lastHit: new Date()
          })
          .where(eq(seoRedirects.id, redirectId))
          .returning();
        
        if (updatedRecord) {
          // Update JSON backup
          const redirects = this.loadJsonFile('seo-redirects.json');
          const index = redirects.findIndex((r: any) => r.id === redirectId);
          if (index !== -1) {
            redirects[index].hitCount = (redirects[index].hitCount || 0) + 1;
            redirects[index].lastHit = new Date().toISOString();
            this.saveJsonFile('seo-redirects.json', redirects);
          }
          
          return updatedRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Redirects: Hit count update failed:', error);
    }
    
    // Fallback to JSON
    const redirects = this.loadJsonFile('seo-redirects.json');
    const index = redirects.findIndex((r: any) => r.id === redirectId);
    if (index !== -1) {
      redirects[index].hitCount = (redirects[index].hitCount || 0) + 1;
      redirects[index].lastHit = new Date().toISOString();
      this.saveJsonFile('seo-redirects.json', redirects);
      return redirects[index];
    }
    return null;
  }

  // ==================== SEO AUDIT LOGS OPERATIONS ====================
  
  async getSeoAuditLogs(pageId?: string, limit?: number): Promise<any[]> {
    try {
      console.log('🔍 SEO Audit Logs: Querying database...');
      
      if (this.db) {
        const { seoAuditLogs } = await import('../shared/schema');
        let query = this.db.select().from(seoAuditLogs).orderBy(desc(seoAuditLogs.createdAt));
        
        if (pageId) {
          query = query.where(eq(seoAuditLogs.pageId, pageId));
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const data = await query;
        
        if (data) {
          console.log('✅ SEO Audit Logs retrieved from database:', data.length, 'items');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Audit Logs: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    let data = this.loadJsonFile('seo-audit-logs.json');
    if (pageId) {
      data = data.filter((log: any) => log.pageId === pageId);
    }
    if (limit) {
      data = data.slice(0, limit);
    }
    return data;
  }

  async createSeoAuditLog(auditData: any): Promise<any> {
    try {
      if (this.db) {
        const { seoAuditLogs } = await import('../shared/schema');
        
        const [newRecord] = await this.db
          .insert(seoAuditLogs)
          .values({
            pageId: auditData.pageId,
            action: auditData.action,
            field: auditData.field,
            oldValue: auditData.oldValue,
            newValue: auditData.newValue,
            adminUser: auditData.adminUser || 'system',
            changeReason: auditData.changeReason
          })
          .returning();
        
        if (newRecord) {
          // Update JSON backup
          const logs = this.loadJsonFile('seo-audit-logs.json');
          logs.push(newRecord);
          this.saveJsonFile('seo-audit-logs.json', logs);
          
          return newRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Audit Logs: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const logs = this.loadJsonFile('seo-audit-logs.json');
    const newLog = {
      id: Date.now(),
      ...auditData,
      createdAt: new Date().toISOString()
    };
    logs.push(newLog);
    this.saveJsonFile('seo-audit-logs.json', logs);
    return newLog;
  }

  // ==================== SEO IMAGE METADATA OPERATIONS ====================
  
  async getSeoImageMeta(imageUrl?: string): Promise<any[]> {
    try {
      console.log('🔍 SEO Image Meta: Querying database...');
      
      if (this.db) {
        const { seoImageMeta } = await import('../shared/schema');
        let query = this.db.select().from(seoImageMeta).orderBy(desc(seoImageMeta.createdAt));
        
        if (imageUrl) {
          query = query.where(eq(seoImageMeta.imageUrl, imageUrl));
        }
        
        const data = await query;
        
        if (data) {
          console.log('✅ SEO Image Meta retrieved from database:', data.length, 'items');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Image Meta: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const data = this.loadJsonFile('seo-image-meta.json');
    return imageUrl ? data.filter((img: any) => img.imageUrl === imageUrl) : data;
  }

  async createSeoImageMeta(imageData: any): Promise<any> {
    try {
      console.log('🆕 Creating SEO Image Meta:', imageData);
      
      if (this.db) {
        const { seoImageMeta } = await import('../shared/schema');
        
        const [newRecord] = await this.db
          .insert(seoImageMeta)
          .values({
            imageUrl: imageData.imageUrl,
            altTextEn: imageData.altTextEn,
            altTextFr: imageData.altTextFr,
            titleEn: imageData.titleEn,
            titleFr: imageData.titleFr,
            caption: imageData.caption,
            isLazyLoaded: imageData.isLazyLoaded !== false,
            compressionLevel: imageData.compressionLevel || 80,
            width: imageData.width,
            height: imageData.height,
            fileSize: imageData.fileSize,
            format: imageData.format,
            seoFriendlyName: imageData.seoFriendlyName
          })
          .returning();
        
        if (newRecord) {
          console.log('✅ SEO Image Meta created in database:', newRecord);
          
          // Update JSON backup
          const images = this.loadJsonFile('seo-image-meta.json');
          images.push(newRecord);
          this.saveJsonFile('seo-image-meta.json', images);
          
          return newRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Image Meta: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const images = this.loadJsonFile('seo-image-meta.json');
    const newImage = {
      id: Date.now(),
      ...imageData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    images.push(newImage);
    this.saveJsonFile('seo-image-meta.json', images);
    return newImage;
  }

  async updateSeoImageMeta(imageId: number, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating SEO Image Meta:', imageId, updates);
      
      if (this.db) {
        const { seoImageMeta } = await import('../shared/schema');
        
        const [updatedRecord] = await this.db
          .update(seoImageMeta)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(seoImageMeta.id, imageId))
          .returning();
        
        if (updatedRecord) {
          console.log('✅ SEO Image Meta updated in database');
          
          // Update JSON backup
          const images = this.loadJsonFile('seo-image-meta.json');
          const index = images.findIndex((img: any) => img.id === imageId);
          if (index !== -1) {
            images[index] = { ...images[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveJsonFile('seo-image-meta.json', images);
          }
          
          return updatedRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Image Meta: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const images = this.loadJsonFile('seo-image-meta.json');
    const index = images.findIndex((img: any) => img.id === imageId);
    if (index !== -1) {
      images[index] = { ...images[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveJsonFile('seo-image-meta.json', images);
      return images[index];
    }
    return null;
  }

  async deleteSeoImageMeta(imageId: number): Promise<any> {
    try {
      console.log('🗑️ Deleting SEO Image Meta:', imageId);
      
      if (this.db) {
        const { seoImageMeta } = await import('../shared/schema');
        
        await this.db
          .delete(seoImageMeta)
          .where(eq(seoImageMeta.id, imageId));
        
        console.log('✅ SEO Image Meta deleted from database');
      }
    } catch (error) {
      console.warn('⚠️ SEO Image Meta: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup
    const images = this.loadJsonFile('seo-image-meta.json');
    const filtered = images.filter((img: any) => img.id !== imageId);
    this.saveJsonFile('seo-image-meta.json', filtered);
    return true;
  }

  // ==================== SEO GLOBAL SETTINGS OPERATIONS ====================
  
  async getSeoGlobalSettings(): Promise<any> {
    try {
      console.log('🔍 SEO Global Settings: Querying database...');
      
      if (this.db) {
        const { seoGlobalSettings } = await import('../shared/schema');
        
        const [data] = await this.db
          .select()
          .from(seoGlobalSettings)
          .limit(1);
        
        if (data) {
          console.log('✅ SEO Global Settings retrieved from database');
          return data;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Global Settings: Database query failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const settings = this.loadJsonFile('seo-global-settings.json');
    return settings[0] || this.createDefaultGlobalSettings();
  }

  async updateSeoGlobalSettings(settings: any): Promise<any> {
    try {
      console.log('🔄 Updating SEO Global Settings:', settings);
      
      if (this.db) {
        const { seoGlobalSettings } = await import('../shared/schema');
        
        // Check if settings exist
        const [existing] = await this.db
          .select()
          .from(seoGlobalSettings)
          .limit(1);
        
        let updatedRecord;
        
        if (existing) {
          // Update existing settings
          [updatedRecord] = await this.db
            .update(seoGlobalSettings)
            .set({
              ...settings,
              updatedAt: new Date()
            })
            .where(eq(seoGlobalSettings.id, existing.id))
            .returning();
        } else {
          // Create new settings
          [updatedRecord] = await this.db
            .insert(seoGlobalSettings)
            .values({
              ...settings,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
        }
        
        if (updatedRecord) {
          console.log('✅ SEO Global Settings updated in database');
          
          // Update JSON backup
          const globalSettings = this.loadJsonFile('seo-global-settings.json');
          if (globalSettings.length > 0) {
            globalSettings[0] = updatedRecord;
          } else {
            globalSettings.push(updatedRecord);
          }
          this.saveJsonFile('seo-global-settings.json', globalSettings);
          
          return updatedRecord;
        }
      }
    } catch (error) {
      console.warn('⚠️ SEO Global Settings: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON
    const globalSettings = this.loadJsonFile('seo-global-settings.json');
    if (globalSettings.length > 0) {
      globalSettings[0] = { ...globalSettings[0], ...settings, updatedAt: new Date().toISOString() };
    } else {
      globalSettings.push({ id: 1, ...settings, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveJsonFile('seo-global-settings.json', globalSettings);
    return globalSettings[0];
  }

  createDefaultGlobalSettings(): any {
    return {
      id: 1,
      robotsTxt: `User-agent: *
Allow: /
Sitemap: https://memopyk.com/sitemap.xml`,
      sitemapEnabled: true,
      sitemapFrequency: "daily",
      defaultMetaTitle: "MEMOPYK - Premium Memory Films & Wedding Videos",
      defaultMetaDescription: "Transform your precious memories into cinematic masterpieces with MEMOPYK's professional video creation services.",
      isMaintenanceMode: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async generateSitemap(): Promise<string> {
    try {
      const seoSettings = await this.getSeoSettings();
      const baseUrl = "https://memopyk.com";
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

      // Add homepage English version
      sitemap += `
  <url>
    <loc>${baseUrl}/en-US</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="${baseUrl}/fr-FR"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="${baseUrl}/en-US"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en-US"/>
  </url>`;

      // Add homepage French version
      sitemap += `
  <url>
    <loc>${baseUrl}/fr-FR</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="${baseUrl}/fr-FR"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="${baseUrl}/en-US"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en-US"/>
  </url>`;

      // Add pages from SEO settings
      for (const page of seoSettings) {
        if (page.isActive) {
          const englishUrl = page.urlSlugEn ? `${baseUrl}/en-US/${page.urlSlugEn}` : `${baseUrl}/en-US/${page.page}`;
          const frenchUrl = page.urlSlugFr ? `${baseUrl}/fr-FR/${page.urlSlugFr}` : `${baseUrl}/fr-FR/${page.page}`;
          
          // English page with hreflang alternates
          sitemap += `
  <url>
    <loc>${englishUrl}</loc>
    <lastmod>${page.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changeFreq || 'monthly'}</changefreq>
    <priority>${page.priority || '0.5'}</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="${frenchUrl}"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="${englishUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${englishUrl}"/>
  </url>`;
  
          // French page with hreflang alternates
          sitemap += `
  <url>
    <loc>${frenchUrl}</loc>
    <lastmod>${page.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changeFreq || 'monthly'}</changefreq>
    <priority>${page.priority || '0.5'}</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href="${frenchUrl}"/>
    <xhtml:link rel="alternate" hreflang="en-US" href="${englishUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${englishUrl}"/>
  </url>`;
        }
      }

      sitemap += `
</urlset>`;

      console.log('✅ Sitemap generated successfully with hreflang alternates');
      return sitemap;
    } catch (error) {
      console.error('❌ Sitemap generation failed:', error);
      throw error;
    }
  }

  async generateRobotsTxt(): Promise<string> {
    try {
      const globalSettings = await this.getSeoGlobalSettings();
      
      if (globalSettings.robotsTxt) {
        return globalSettings.robotsTxt;
      }
      
      // Default robots.txt
      return `User-agent: *
Allow: /
Sitemap: https://memopyk.com/sitemap.xml

# Block admin areas
Disallow: /admin
Disallow: /api

# Allow important directories
Allow: /gallery
Allow: /contact`;
    } catch (error) {
      console.error('❌ Robots.txt generation failed:', error);
      throw error;
    }
  }

  // ==================== SEO ANALYTICS AND SCORING ====================
  
  async calculateSeoScore(pageId: string): Promise<number> {
    try {
      const seoSettings = await this.getSeoSettings();
      const page = seoSettings.find((s: any) => s.id === pageId);
      
      if (!page) {
        return 0;
      }
      
      let score = 0;
      const maxScore = 100;
      
      // Meta title (20 points)
      if (page.metaTitleEn && page.metaTitleFr) {
        if (page.metaTitleEn.length >= 30 && page.metaTitleEn.length <= 60) score += 10;
        if (page.metaTitleFr.length >= 30 && page.metaTitleFr.length <= 60) score += 10;
      }
      
      // Meta description (20 points)
      if (page.metaDescriptionEn && page.metaDescriptionFr) {
        if (page.metaDescriptionEn.length >= 120 && page.metaDescriptionEn.length <= 160) score += 10;
        if (page.metaDescriptionFr.length >= 120 && page.metaDescriptionFr.length <= 160) score += 10;
      }
      
      // Keywords (15 points)
      if (page.metaKeywordsEn && page.metaKeywordsFr) {
        const enKeywords = page.metaKeywordsEn.split(',').length;
        const frKeywords = page.metaKeywordsFr.split(',').length;
        if (enKeywords >= 3 && enKeywords <= 10) score += 7;
        if (frKeywords >= 3 && frKeywords <= 10) score += 8;
      }
      
      // Open Graph (15 points)
      if (page.ogTitleEn && page.ogTitleFr) score += 5;
      if (page.ogDescriptionEn && page.ogDescriptionFr) score += 5;
      if (page.ogImageUrl) score += 5;
      
      // Twitter Cards (10 points)
      if (page.twitterTitleEn && page.twitterTitleFr) score += 5;
      if (page.twitterImageUrl) score += 5;
      
      // Technical SEO (10 points)
      if (page.canonicalUrl) score += 3;
      if (page.robotsIndex && page.robotsFollow) score += 4;
      if (page.structuredData) score += 3;
      
      // URL Structure (10 points)
      if (page.urlSlugEn && page.urlSlugFr) {
        const enSlugValid = page.urlSlugEn.length <= 60 && !page.urlSlugEn.includes(' ');
        const frSlugValid = page.urlSlugFr.length <= 60 && !page.urlSlugFr.includes(' ');
        if (enSlugValid) score += 5;
        if (frSlugValid) score += 5;
      }
      
      // Update score in database
      await this.updateSeoSettings(pageId, { seoScore: score });
      
      console.log(`✅ SEO Score calculated for page ${pageId}: ${score}/${maxScore}`);
      return score;
    } catch (error) {
      console.error('❌ SEO Score calculation failed:', error);
      return 0;
    }
  }

  async getSeoPerformanceReport(): Promise<any> {
    try {
      const seoSettings = await this.getSeoSettings();
      const redirects = await this.getSeoRedirects();
      const auditLogs = await this.getSeoAuditLogs(undefined, 50);
      
      // Calculate overall scores
      let totalScore = 0;
      let validPages = 0;
      
      for (const page of seoSettings) {
        if (page.isActive) {
          const score = await this.calculateSeoScore(page.id);
          totalScore += score;
          validPages++;
        }
      }
      
      const averageScore = validPages > 0 ? Math.round(totalScore / validPages) : 0;
      
      // Analyze redirects
      const activeRedirects = redirects.filter((r: any) => r.isActive);
      const totalRedirectHits = redirects.reduce((sum: number, r: any) => sum + (r.hitCount || 0), 0);
      
      // Recent activity
      const recentActivity = auditLogs.slice(0, 10);
      
      const report = {
        overview: {
          totalPages: seoSettings.length,
          activePages: seoSettings.filter((s: any) => s.isActive).length,
          averageSeoScore: averageScore,
          totalRedirects: redirects.length,
          activeRedirects: activeRedirects.length,
          totalRedirectHits: totalRedirectHits
        },
        pageScores: seoSettings.map((page: any) => ({
          id: page.id,
          page: page.page,
          score: page.seoScore || 0,
          isActive: page.isActive,
          lastUpdated: page.updatedAt
        })),
        topRedirects: redirects
          .sort((a: any, b: any) => (b.hitCount || 0) - (a.hitCount || 0))
          .slice(0, 5)
          .map((r: any) => ({
            fromPath: r.fromPath,
            toPath: r.toPath,
            hits: r.hitCount || 0,
            lastHit: r.lastHit
          })),
        recentActivity: recentActivity.map((log: any) => ({
          action: log.action,
          field: log.field,
          page: log.pageId,
          timestamp: log.createdAt,
          user: log.adminUser
        })),
        recommendations: this.generateSeoRecommendations(averageScore, seoSettings, redirects)
      };
      
      console.log('✅ SEO Performance Report generated');
      return report;
    } catch (error) {
      console.error('❌ SEO Performance Report generation failed:', error);
      throw error;
    }
  }

  generateSeoRecommendations(averageScore: number, pages: any[], redirects: any[]): string[] {
    const recommendations = [];
    
    if (averageScore < 70) {
      recommendations.push("Improve meta titles and descriptions across pages for better search visibility");
    }
    
    if (averageScore < 50) {
      recommendations.push("Add Open Graph and Twitter Card metadata for social media optimization");
    }
    
    const pagesWithoutKeywords = pages.filter((p: any) => !p.metaKeywordsEn || !p.metaKeywordsFr);
    if (pagesWithoutKeywords.length > 0) {
      recommendations.push(`Add meta keywords to ${pagesWithoutKeywords.length} pages for better targeting`);
    }
    
    const inactiveRedirects = redirects.filter((r: any) => !r.isActive);
    if (inactiveRedirects.length > 5) {
      recommendations.push("Review and clean up inactive redirects to improve site performance");
    }
    
    const pagesWithoutStructuredData = pages.filter((p: any) => !p.structuredData);
    if (pagesWithoutStructuredData.length > 0) {
      recommendations.push("Add structured data (JSON-LD) to improve rich snippet appearance");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Great job! Your SEO setup is well-optimized. Consider regular content updates.");
    }
    
    return recommendations;
  }

  async validateMetaTags(pageData: any): Promise<{ score: number; issues: string[] }> {
    const issues = [];
    let score = 100;
    
    // Title validation
    if (!pageData.metaTitleEn || !pageData.metaTitleFr) {
      issues.push("Missing meta titles for one or both languages");
      score -= 20;
    } else {
      if (pageData.metaTitleEn.length < 30 || pageData.metaTitleEn.length > 60) {
        issues.push("English meta title should be 30-60 characters");
        score -= 10;
      }
      if (pageData.metaTitleFr.length < 30 || pageData.metaTitleFr.length > 60) {
        issues.push("French meta title should be 30-60 characters");
        score -= 10;
      }
    }
    
    // Description validation
    if (!pageData.metaDescriptionEn || !pageData.metaDescriptionFr) {
      issues.push("Missing meta descriptions for one or both languages");
      score -= 20;
    } else {
      if (pageData.metaDescriptionEn.length < 120 || pageData.metaDescriptionEn.length > 160) {
        issues.push("English meta description should be 120-160 characters");
        score -= 10;
      }
      if (pageData.metaDescriptionFr.length < 120 || pageData.metaDescriptionFr.length > 160) {
        issues.push("French meta description should be 120-160 characters");
        score -= 10;
      }
    }
    
    // URL slug validation
    if (pageData.urlSlugEn && pageData.urlSlugEn.includes(' ')) {
      issues.push("English URL slug should not contain spaces");
      score -= 5;
    }
    if (pageData.urlSlugFr && pageData.urlSlugFr.includes(' ')) {
      issues.push("French URL slug should not contain spaces");
      score -= 5;
    }
    
    // Open Graph validation
    if (!pageData.ogImageUrl) {
      issues.push("Missing Open Graph image for social sharing");
      score -= 10;
    }
    
    return { score: Math.max(0, score), issues };
  }

  /**
   * Clean up video files from Supabase storage and local cache
   * Works for both hero videos and gallery items
   */
  private async cleanupVideoFiles(item: any, type: 'hero' | 'gallery'): Promise<void> {
    try {
      console.log(`🗑️ Starting file cleanup for ${type} item:`, item.id);
      
      const filesToDelete: string[] = [];
      
      if (type === 'hero') {
        // Hero videos can have separate English/French files
        if (item.url_en) filesToDelete.push(item.url_en);
        if (item.url_fr && item.url_fr !== item.url_en) {
          filesToDelete.push(item.url_fr);
        }
      } else if (type === 'gallery') {
        // Gallery items can have video and/or image
        if (item.video_url) filesToDelete.push(item.video_url);
        if (item.image_url) filesToDelete.push(item.image_url);
      }

      // Remove files from Supabase storage
      for (const filename of filesToDelete) {
        if (filename) {
          await this.deleteFromSupabaseStorage(filename, type);
          await this.deleteFromLocalCache(filename);
        }
      }

      console.log(`✅ File cleanup completed for ${type} item ${item.id}`);
    } catch (error) {
      console.error(`❌ Error during file cleanup for ${type} item ${item.id}:`, error);
      // Don't throw here - we still want to delete the metadata even if file cleanup fails
    }
  }

  /**
   * Delete file from Supabase storage bucket
   */
  private async deleteFromSupabaseStorage(filename: string, type: 'hero' | 'gallery'): Promise<void> {
    try {
      const bucketName = 'memopyk-videos'; // Unified bucket for all media types
      
      console.log(`🗑️ Deleting ${filename} from Supabase bucket: ${bucketName}`);
      
      const { error } = await this.supabase.storage
        .from(bucketName)
        .remove([filename]);

      if (error) {
        console.error(`❌ Supabase deletion error for ${filename}:`, error);
      } else {
        console.log(`✅ Successfully deleted ${filename} from Supabase storage`);
      }
    } catch (error) {
      console.error(`❌ Exception during Supabase deletion of ${filename}:`, error);
    }
  }

  /**
   * Delete file from local video cache
   */
  private async deleteFromLocalCache(filename: string): Promise<void> {
    try {
      const cacheDir = join(process.cwd(), 'server/cache/videos');
      
      // Generate the same hash-based filename used by video-cache.ts
      const { createHash } = require('crypto');
      const hash = createHash('md5').update(filename).digest('hex');
      const extension = filename.split('.').pop() || 'mp4';
      const cacheFilePath = join(cacheDir, `${hash}.${extension}`);

      if (existsSync(cacheFilePath)) {
        unlinkSync(cacheFilePath);
        console.log(`✅ Successfully deleted cached file: ${filename}`);
      } else {
        console.log(`ℹ️ Cache file not found (already cleaned): ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting cached file ${filename}:`, error);
    }
  }



  async createFAQSection(sectionData: any): Promise<any> {
    try {
      console.log('🆕 Creating FAQ Section in Supabase:', sectionData);
      const { data, error } = await this.supabase
        .from('faq_sections')
        .insert({
          id: `section_${Date.now()}`, // Generate unique string ID
          key: `section_${Date.now()}`,
          name_en: sectionData.title_en,
          name_fr: sectionData.title_fr,
          order_index: sectionData.order_index || 0,
          is_active: true
        })
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ Section created in Supabase:', data);
        
        // Convert for JSON compatibility and save backup
        const converted = {
          id: parseInt(data.id.replace('section_', '')) || data.id,
          title_en: data.name_en,
          title_fr: data.name_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup
        const sections = this.loadJsonFile('faq-sections.json');
        sections.push(converted);
        this.saveJsonFile('faq-sections.json', sections);
        
        return converted;
      } else {
        console.warn('⚠️ FAQ Section: Supabase create error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const sections = this.loadJsonFile('faq-sections.json');
    const maxId = sections.length > 0 ? Math.max(...sections.map((s: any) => s.id)) : 0;
    const newSection = {
      id: maxId + 1,
      ...sectionData
    };
    sections.push(newSection);
    this.saveJsonFile('faq-sections.json', sections);
    return newSection;
  }

  async updateFAQSection(sectionId: string | number, updates: any): Promise<any> {
    try {
      console.log('🔄 Updating FAQ Section in Supabase:', sectionId, updates);
      
      // Convert JSON format to database format
      const dbUpdates: any = {};
      if (updates.title_en) dbUpdates.name_en = updates.title_en;
      if (updates.title_fr) dbUpdates.name_fr = updates.title_fr;
      if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      
      const { data, error } = await this.supabase
        .from('faq_sections')
        .update(dbUpdates)
        .eq('id', typeof sectionId === 'string' ? sectionId : `section_${sectionId}`)
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ Section updated in Supabase:', data);
        
        // Convert back and update JSON backup
        const converted = {
          id: parseInt(data.id.replace('section_', '')) || data.id,
          title_en: data.name_en,
          title_fr: data.name_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup with the same order swapping logic
        const sections = this.loadJsonFile('faq-sections.json');
        const index = sections.findIndex((section: any) => section.id === sectionId);
        if (index !== -1) {
          if (updates.order_index !== undefined) {
            const currentSection = sections[index];
            const targetOrderIndex = updates.order_index;
            const currentOrderIndex = currentSection.order_index;
            
            const targetSection = sections.find((section: any) => section.order_index === targetOrderIndex);
            
            if (targetSection && targetSection.id !== sectionId) {
              console.log(`🔄 Swapping FAQ section orders: ${sectionId} (${currentOrderIndex}) ↔ ${targetSection.id} (${targetOrderIndex})`);
              targetSection.order_index = currentOrderIndex;
            }
            
            currentSection.order_index = targetOrderIndex;
            Object.assign(currentSection, updates);
          } else {
            sections[index] = { ...sections[index], ...updates };
          }
          
          this.saveJsonFile('faq-sections.json', sections);
        }
        
        return converted;
      } else {
        console.warn('⚠️ FAQ Section: Supabase update error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const sections = this.loadJsonFile('faq-sections.json');
    const index = sections.findIndex((section: any) => section.id === sectionId);
    if (index === -1) throw new Error('FAQ section not found');
    
    // Implement same order swapping logic for fallback
    if (updates.order_index !== undefined) {
      const currentSection = sections[index];
      const targetOrderIndex = updates.order_index;
      const currentOrderIndex = currentSection.order_index;
      
      const targetSection = sections.find((section: any) => section.order_index === targetOrderIndex);
      
      if (targetSection && targetSection.id !== sectionId) {
        console.log(`🔄 Swapping FAQ section orders: ${sectionId} (${currentOrderIndex}) ↔ ${targetSection.id} (${targetOrderIndex})`);
        targetSection.order_index = currentOrderIndex;
      }
      
      currentSection.order_index = targetOrderIndex;
      Object.assign(currentSection, updates);
    } else {
      sections[index] = { ...sections[index], ...updates };
    }
    
    this.saveJsonFile('faq-sections.json', sections);
    return sections[index];
  }

  async deleteFAQSection(sectionId: string | number): Promise<void> {
    try {
      console.log('🗑️ Deleting FAQ Section from Supabase:', sectionId);
      const { error } = await this.supabase
        .from('faq_sections')
        .delete()
        .eq('id', typeof sectionId === 'string' ? sectionId : `section_${sectionId}`);
      
      if (!error) {
        console.log('✅ FAQ Section deleted from Supabase');
      } else {
        console.warn('⚠️ FAQ Section: Supabase delete error, continuing with JSON cleanup:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ Section: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup regardless
    const sections = this.loadJsonFile('faq-sections.json');
    const filtered = sections.filter((section: any) => section.id !== sectionId);
    this.saveJsonFile('faq-sections.json', filtered);
  }



  async createFAQ(faqData: any): Promise<any> {
    try {
      console.log('🆕 Creating FAQ in Supabase:', faqData);
      const { data, error } = await this.supabase
        .from('faqs')
        .insert({
          section_name_en: '', // Not used in current interface but required by schema
          section_name_fr: '', // Not used in current interface but required by schema
          section_order: 0,
          section_id: faqData.section_id?.toString() || '0',
          question_en: faqData.question_en,
          question_fr: faqData.question_fr,
          answer_en: faqData.answer_en,
          answer_fr: faqData.answer_fr,
          order_index: faqData.order_index || 0,
          is_active: faqData.is_active !== false
        })
        .select()
        .single();
      
      if (!error && data) {
        console.log('✅ FAQ created in Supabase:', data);
        
        // Convert for JSON compatibility and save backup
        const converted = {
          id: data.id,
          section_id: data.section_id,
          question_en: data.question_en,
          question_fr: data.question_fr,
          answer_en: data.answer_en,
          answer_fr: data.answer_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        // Update JSON backup
        const faqs = this.loadJsonFile('faqs.json');
        faqs.push(converted);
        this.saveJsonFile('faqs.json', faqs);
        
        return converted;
      } else {
        console.warn('⚠️ FAQ: Supabase create error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database create failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const faqs = this.loadJsonFile('faqs.json');
    const maxId = faqs.length > 0 ? Math.max(...faqs.map((f: any) => f.id)) : 0;
    const newFAQ = {
      id: maxId + 1,
      ...faqData
    };
    faqs.push(newFAQ);
    this.saveJsonFile('faqs.json', faqs);
    return newFAQ;
  }

  async updateFAQ(faqId: string | number, updates: any): Promise<any> {
    try {
      console.log('🔄 ===== FAQ UPDATE START =====');
      console.log('🔄 Updating FAQ in Supabase:', faqId, updates);
      console.log('🔄 FAQ ID type:', typeof faqId);
      console.log('🔄 Updates object:', JSON.stringify(updates, null, 2));
      
      // Convert JSON format to database format if needed
      const dbUpdates: any = {};
      if (updates.question_en) dbUpdates.question_en = updates.question_en;
      if (updates.question_fr) dbUpdates.question_fr = updates.question_fr;
      if (updates.answer_en) dbUpdates.answer_en = updates.answer_en;
      if (updates.answer_fr) dbUpdates.answer_fr = updates.answer_fr;
      if (updates.order_index !== undefined) dbUpdates.order_index = updates.order_index;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.section_id !== undefined) dbUpdates.section_id = updates.section_id.toString();
      
      console.log('🔄 Database updates to apply:', JSON.stringify(dbUpdates, null, 2));
      
      const { data, error } = await this.supabase
        .from('faqs')
        .update(dbUpdates)
        .eq('id', faqId)
        .select()
        .single();
      
      console.log('🔄 Supabase response - Data:', data);
      console.log('🔄 Supabase response - Error:', error);
      
      if (!error && data) {
        console.log('✅ FAQ updated in Supabase successfully!');
        console.log('✅ Updated FAQ data:', JSON.stringify(data, null, 2));
        
        // Convert back for JSON format
        const converted = {
          id: data.id,
          section_id: data.section_id,
          question_en: data.question_en,
          question_fr: data.question_fr,
          answer_en: data.answer_en,
          answer_fr: data.answer_fr,
          order_index: data.order_index,
          is_active: data.is_active
        };
        
        console.log('✅ Converted FAQ for return:', JSON.stringify(converted, null, 2));
        
        // Update JSON backup with same order swapping logic
        const faqs = this.loadJsonFile('faqs.json');
        const index = faqs.findIndex((faq: any) => faq.id === faqId);
        console.log('✅ JSON backup - FAQ index found:', index, 'out of', faqs.length, 'FAQs');
        
        if (index !== -1) {
          if (updates.order_index !== undefined) {
            const currentFaq = faqs[index];
            const targetOrderIndex = updates.order_index;
            const currentOrderIndex = currentFaq.order_index;
            const sectionId = currentFaq.section_id;
            
            const targetFaq = faqs.find((faq: any) => 
              faq.section_id === sectionId && 
              faq.order_index === targetOrderIndex &&
              faq.id !== faqId
            );
            
            if (targetFaq) {
              console.log(`🔄 Swapping FAQ orders in section ${sectionId}: ${faqId} (${currentOrderIndex}) ↔ ${targetFaq.id} (${targetOrderIndex})`);
              targetFaq.order_index = currentOrderIndex;
            }
            
            currentFaq.order_index = targetOrderIndex;
            Object.assign(currentFaq, updates);
          } else {
            console.log('✅ Updating FAQ in JSON backup - simple update');
            faqs[index] = { ...faqs[index], ...updates };
          }
          
          this.saveJsonFile('faqs.json', faqs);
          console.log('✅ JSON backup updated successfully');
        } else {
          console.log('⚠️ FAQ not found in JSON backup for ID:', faqId);
        }
        
        console.log('✅ ===== FAQ UPDATE COMPLETE - SUCCESS =====');
        return converted;
      } else {
        console.warn('⚠️ FAQ: Supabase update error, using JSON fallback:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database update failed, using JSON fallback:', error);
    }
    
    // Fallback to JSON only
    const faqs = this.loadJsonFile('faqs.json');
    const index = faqs.findIndex((faq: any) => faq.id === faqId);
    if (index === -1) throw new Error('FAQ not found');
    
    // Same order swapping logic for fallback
    if (updates.order_index !== undefined) {
      const currentFaq = faqs[index];
      const targetOrderIndex = updates.order_index;
      const currentOrderIndex = currentFaq.order_index;
      const sectionId = currentFaq.section_id;
      
      const targetFaq = faqs.find((faq: any) => 
        faq.section_id === sectionId && 
        faq.order_index === targetOrderIndex &&
        faq.id !== faqId
      );
      
      if (targetFaq) {
        console.log(`🔄 Swapping FAQ orders in section ${sectionId}: ${faqId} (${currentOrderIndex}) ↔ ${targetFaq.id} (${targetOrderIndex})`);
        targetFaq.order_index = currentOrderIndex;
      }
      
      currentFaq.order_index = targetOrderIndex;
      Object.assign(currentFaq, updates);
    } else {
      faqs[index] = { ...faqs[index], ...updates };
    }
    
    this.saveJsonFile('faqs.json', faqs);
    return faqs[index];
  }

  async deleteFAQ(faqId: string | number): Promise<void> {
    try {
      console.log('🗑️ Deleting FAQ from Supabase:', faqId);
      const { error } = await this.supabase
        .from('faqs')
        .delete()
        .eq('id', faqId);
      
      if (!error) {
        console.log('✅ FAQ deleted from Supabase');
      } else {
        console.warn('⚠️ FAQ: Supabase delete error, continuing with JSON cleanup:', error);
      }
    } catch (error) {
      console.warn('⚠️ FAQ: Database delete failed, continuing with JSON cleanup:', error);
    }
    
    // Update JSON backup regardless
    const faqs = this.loadJsonFile('faqs.json');
    const filtered = faqs.filter((faq: any) => faq.id !== faqId);
    this.saveJsonFile('faqs.json', filtered);
  }

  // Analytics methods implementation
  // **SHARED JSON FALLBACK LOADER**
  private loadAnalyticsSessionsFromJson(dateFrom?: string, dateTo?: string, language?: string, includeProduction?: boolean, excludedIpRanges: string[] = [], country?: string): any[] {
    console.log('📄 JSON CACHE FALLBACK: Loading analytics sessions from JSON');
    const sessions = this.loadJsonFile('analytics-sessions.json');
    
    // Apply includeProduction filter
    let filtered = sessions.filter((session: any) => includeProduction ? true : !session.is_test_data);
    console.log(`📄 JSON: Loaded ${sessions.length} sessions, ${filtered.length} after production filter (includeProduction=${includeProduction})`);

    // Apply IP exclusion filter
    if (excludedIpRanges.length > 0) {
      const beforeFiltering = filtered.length;
      filtered = filtered.filter((session: any) => {
        const sessionIp = session.ip_address;
        // Skip filtering if IP is null/undefined/empty - keep the session
        if (!sessionIp || typeof sessionIp !== 'string' || sessionIp.trim() === '') {
          return true;
        }
        return !excludedIpRanges.some(cidr => this.isIPInCIDR(sessionIp, cidr));
      });
      console.log(`🚫 IP FILTER (JSON): Excluded ${beforeFiltering - filtered.length} sessions from ${excludedIpRanges.length} IP ranges`);
    }

    // Apply date filters
    if (dateFrom) {
      filtered = filtered.filter((session: any) => session.created_at >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((session: any) => session.created_at <= dateTo);
    }
    
    // Apply language filter  
    if (language) {
      filtered = filtered.filter((session: any) => session.language === language);
    }

    // Apply country filter
    if (country && country !== 'all') {
      filtered = filtered.filter((session: any) => session.country === country);
      console.log(`🌍 COUNTRY FILTER (JSON): Filtering by country = "${country}"`);
    }

    console.log(`✅ JSON CACHE FALLBACK: Found ${filtered.length} sessions for range ${dateFrom} to ${dateTo}`);
    return filtered;
  }

  async getAnalyticsSessions(dateFrom?: string, dateTo?: string, language?: string, includeProduction?: boolean, country?: string, bypassIpFilter?: boolean): Promise<any[]> {
    console.log(`📊 Analytics Sessions: ${dateFrom} to ${dateTo}, language: ${language}, includeProduction: ${includeProduction}, country: ${country}, bypassIpFilter: ${bypassIpFilter}`);
    
    // Use date ranges as provided by computeParisWindow - they are already correct
    let finalDateFrom = dateFrom;
    let finalDateTo = dateTo;
    
    // Load excluded IP ranges for filtering (modern system only) - SKIP if bypassIpFilter is true
    let excludedIpRanges: string[] = [];
    if (!bypassIpFilter) {
      try {
        const exclusions = await this.getIpExclusions();
        excludedIpRanges = exclusions
          .filter((exclusion: any) => exclusion.active)
          .map((exclusion: any) => exclusion.ip_cidr);
        console.log(`🚫 IP FILTER: Loaded ${excludedIpRanges.length} excluded IP ranges for filtering`);
      } catch (error) {
        console.warn('⚠️ IP FILTER: Failed to load excluded IPs, continuing without filtering:', error);
      }
    } else {
      console.log(`⚠️ IP FILTER BYPASS: Skipping IP exclusion filtering per bypassIpFilter=true`);
    }

    // SMART 7-DAY ROLLING CACHE STRATEGY
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isRecentQuery = !finalDateFrom || new Date(finalDateFrom) >= sevenDaysAgo;

    // For recent data (last 7 days), use JSON cache for speed
    if (isRecentQuery && !finalDateFrom?.startsWith('2024-')) { // Exclude obvious historical queries
      console.log('📊 ANALYTICS SESSIONS: Using Supabase for recent data (includes new sessions)');
      try {
        // Get sessions from Supabase database - RESPECT USER'S DATE FILTER
        const fromDate = finalDateFrom ? new Date(finalDateFrom).toISOString() : sevenDaysAgo.toISOString();
        let query = this.supabase
          .from('analytics_sessions')
          .select('*')
          .gte('created_at', fromDate)
          .order('created_at', { ascending: false });
        
        // Add dateTo filter to the database query if provided
        if (finalDateTo) {
          const dateToEndOfDay = finalDateTo.includes('T') ? finalDateTo : finalDateTo + 'T23:59:59.999Z';
          query = query.lte('created_at', dateToEndOfDay);
        }

        // Add country filter to the database query if provided
        if (country && country !== 'all') {
          query = query.eq('country', country);
          console.log(`🌍 COUNTRY FILTER (SUPABASE): Filtering by country = "${country}"`);
        }

        const { data: dbSessions, error } = await query;
        
        if (error) {
          throw new Error(`Supabase query error: ${error.message}`);
        }

        if (dbSessions && dbSessions.length > 0) {
          // **REPLIT PREVIEW PRODUCTION ANALYTICS**
          // Include both development and production data when includeProduction is true
          let filtered = dbSessions
            .filter((session: any) => includeProduction ? true : !session.is_test_data)
            .map((session: any) => ({
              id: session.id,
              session_id: session.session_id,
              user_id: session.user_id,
              ip_address: session.ip_address,
              user_agent: session.user_agent,
              referrer: session.referrer,
              language: session.language,
              country: session.country,
              city: session.city,
              created_at: session.created_at,
              ended_at: session.ended_at,
              duration: session.duration,
              page_views: session.page_views,
              is_bot: session.is_bot,
              is_test_data: session.is_test_data
            }));

          // **IP EXCLUSION FILTER - RETROACTIVE HISTORICAL DATA FILTERING**
          if (excludedIpRanges.length > 0) {
            const beforeFiltering = filtered.length;
            filtered = filtered.filter((session: any) => {
              const sessionIp = session.ip_address;
              return !excludedIpRanges.some(cidr => this.isIPInCIDR(sessionIp, cidr));
            });
            console.log(`🚫 IP FILTER: Excluded ${beforeFiltering - filtered.length} sessions from ${excludedIpRanges.length} IP ranges`);
          }

          if (language) {
            filtered = filtered.filter((session: any) => session.language === language);
          }

          console.log(`✅ SUPABASE: Found ${filtered.length} recent sessions`);
          return filtered;
        } else {
          // **CRITICAL FIX**: Supabase returned no data, try JSON fallback
          console.log('📊 SUPABASE EMPTY: No recent data found, trying JSON fallback');
          return this.loadAnalyticsSessionsFromJson(finalDateFrom, finalDateTo, language, includeProduction, excludedIpRanges, country);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Analytics Sessions: Supabase failed, trying JSON fallback:', supabaseError);
        
        // Use shared JSON loader for consistent fallback
        try {
          return this.loadAnalyticsSessionsFromJson(finalDateFrom, finalDateTo, language, includeProduction, excludedIpRanges, country);
        } catch (jsonError) {
          console.error('❌ Analytics Sessions: Both Supabase and JSON cache failed');
          throw new Error(`Analytics data unavailable: Supabase (${(supabaseError as Error).message}), JSON fallback (${(jsonError as Error).message})`);
        }
      }
    }

    // For historical data (older than 7 days), query Supabase directly
    console.log('📊 ANALYTICS SESSIONS: Querying Supabase for historical data');
    try {
      let query = this.supabase
        .from('analytics_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      // Only filter test data when not including production data
      if (!includeProduction) {
        query = query.eq('is_test_data', false);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
      if (language) {
        query = query.eq('language', language);
      }

      const { data, error } = await query;

      if (error) {
        console.error('⚠️ Analytics Sessions: Supabase query error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // **IP EXCLUSION FILTER - RETROACTIVE HISTORICAL DATA FILTERING**
        let filtered = data;
        if (excludedIpRanges.length > 0) {
          const beforeFiltering = filtered.length;
          filtered = data.filter((session: any) => {
            const sessionIp = session.ip_address;
            return !excludedIpRanges.some(cidr => this.isIPInCIDR(sessionIp, cidr));
          });
          console.log(`🚫 IP FILTER (SUPABASE): Excluded ${beforeFiltering - filtered.length} sessions from ${excludedIpRanges.length} IP ranges`);
        }
        
        console.log(`✅ SUPABASE: Found ${filtered.length} historical sessions`);
        return filtered;
      } else {
        // **CRITICAL FIX**: Supabase returned no historical data, try JSON fallback
        console.log('📊 SUPABASE EMPTY: No historical data found, trying JSON fallback');
        try {
          return this.loadAnalyticsSessionsFromJson(dateFrom, dateTo, language, includeProduction, excludedIpRanges, country);
        } catch (jsonError) {
          console.error('❌ Analytics Sessions: Historical data unavailable in both Supabase and JSON');
          throw new Error(`Analytics data unavailable: Supabase empty, JSON fallback (${(jsonError as Error).message})`);
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Analytics Sessions: Supabase connection failed for historical data:', supabaseError);
      // **CRITICAL FIX**: Use shared JSON loader instead of broken method call
      try {
        return this.loadAnalyticsSessionsFromJson(dateFrom, dateTo, language, includeProduction, excludedIpRanges, country);
      } catch (jsonError) {
        console.error('❌ Analytics Sessions: Both Supabase and JSON cache failed for historical data');
        throw new Error(`Analytics data unavailable: Supabase (${(supabaseError as Error).message}), JSON fallback (${(jsonError as Error).message})`);
      }
    }
  }

  async getAnalyticsViews(options?: { dateFrom?: string, dateTo?: string, videoId?: string, session_id?: string }): Promise<any[]> {
    // Support both old function signature and new options object
    const { dateFrom, dateTo, videoId, session_id } = options || {};
    // SMART 7-DAY ROLLING CACHE STRATEGY
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const isRecentQuery = !dateFrom || new Date(dateFrom) >= sevenDaysAgo;

    // For recent data (last 7 days), use JSON cache for speed
    if (isRecentQuery && !dateFrom?.startsWith('2024-')) {
      console.log('📊 ANALYTICS VIEWS: Using JSON cache for recent data (last 7 days)');
      const recentViews = this.getRecentAnalyticsViews(dateFrom, dateTo, videoId, session_id);
      if (recentViews.length > 0) {
        console.log(`✅ JSON CACHE: Found ${recentViews.length} recent video views`);
        return recentViews;
      }
    }

    // For historical data (older than 7 days), query Supabase directly
    console.log('📊 ANALYTICS VIEWS: Querying Supabase for historical data');
    try {
      let query = this.supabase
        .from('analytics_views')
        .select('*')
        .eq('is_test_data', false)
        .not('video_filename', 'in', '("VideoHero1.mp4","VideoHero2.mp4","VideoHero3.mp4")')
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        // Add end-of-day time to dateTo to include all records from that day
        const dateToEndOfDay = dateTo.includes('T') ? dateTo : dateTo + 'T23:59:59.999Z';
        query = query.lte('created_at', dateToEndOfDay);
      }
      if (videoId) {
        query = query.eq('video_id', videoId);
      }
      if (session_id) {
        query = query.eq('session_id', session_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('⚠️ Analytics Views: Supabase query error:', error);
        // Don't throw error, fallback to JSON cache
        console.log('📊 FALLBACK: Using JSON cache due to Supabase error');
        return this.getRecentAnalyticsViews(dateFrom, dateTo, videoId, session_id);
      }

      if (data && data.length > 0) {
        console.log(`✅ SUPABASE: Found ${data.length} historical video views`);
        return data;
      } else {
        console.log('⚠️ Analytics Views: No historical data found in Supabase');
        return [];
      }
    } catch (error) {
      console.warn('⚠️ Analytics Views: Supabase connection failed for historical data:', error);
      // Fallback to JSON cache when Supabase fails
      console.log('📊 FALLBACK: Using JSON cache due to Supabase connection failure');
      return this.getRecentAnalyticsViews(dateFrom, dateTo, videoId, session_id);
    }
  }

  // Private method for recent sessions from JSON cache
  private getRecentAnalyticsSessions(dateFrom?: string, dateTo?: string, language?: string): any[] {
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      let filtered = sessions
        .filter((session: any) => !session.is_test_data);

      if (dateFrom) {
        filtered = filtered.filter((session: any) => session.created_at >= dateFrom);
      }
      if (dateTo) {
        // Add end-of-day time to dateTo to include all records from that day
        const dateToEndOfDay = dateTo.includes('T') ? dateTo : dateTo + 'T23:59:59.999Z';
        filtered = filtered.filter((session: any) => session.created_at <= dateToEndOfDay);
      }
      if (language) {
        filtered = filtered.filter((session: any) => session.language === language);
      }

      return filtered;
    } catch (error) {
      console.error('Error getting recent analytics sessions from JSON:', error);
      return [];
    }
  }

  // Private method for recent video views from JSON cache
  private getRecentAnalyticsViews(dateFrom?: string, dateTo?: string, videoId?: string, session_id?: string): any[] {
    try {
      const views = this.loadJsonFile('analytics-views.json');
      console.log(`🔍 RECENT VIEWS DEBUG: Loaded ${views.length} total views from JSON`);
      if (session_id) {
        console.log(`🔍 RECENT VIEWS DEBUG: Filtering for session_id: ${session_id}`);
      }
      console.log(`🔍 BEFORE FILTERING: ${views.length} total views`);
      
      let filtered = views.filter((view: any) => !view.is_test_data);
      console.log(`🔍 AFTER is_test_data filter: ${filtered.length} views (removed ${views.length - filtered.length} test views)`);
      
      filtered = filtered.filter((view: any) => !['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(view.video_filename));
      console.log(`🔍 AFTER hero video filter: ${filtered.length} views (removed ${views.length - filtered.length} hero views)`);
      console.log(`🔍 FINAL NON-TEST NON-HERO VIEWS: ${filtered.length}`);

      if (dateFrom) {
        console.log(`🔍 DATE FILTER: dateFrom = ${dateFrom}`);
        const beforeDateFilter = filtered.length;
        filtered = filtered.filter((view: any) => view.created_at >= dateFrom);
        console.log(`🔍 DATE FILTER: ${beforeDateFilter} -> ${filtered.length} views (removed ${beforeDateFilter - filtered.length} views older than ${dateFrom})`);
        if (filtered.length === 0 && beforeDateFilter > 0) {
          console.log(`🔍 DATE FILTER: ALL VIEWS ELIMINATED! Check if dateFrom is too recent`);
          console.log(`🔍 DATE FILTER: Sample view dates:`, views.slice(-3).map((v: any) => ({id: v.id, created_at: v.created_at})));
        }
      }
      if (dateTo) {
        // Add end-of-day time to dateTo to include all records from that day
        const dateToEndOfDay = dateTo.includes('T') ? dateTo : dateTo + 'T23:59:59.999Z';
        console.log(`🔍 DATE_TO FILTER: dateTo = ${dateTo} -> ${dateToEndOfDay}`);
        const beforeDateToFilter = filtered.length;
        filtered = filtered.filter((view: any) => view.created_at <= dateToEndOfDay);
        console.log(`🔍 DATE_TO FILTER: ${beforeDateToFilter} -> ${filtered.length} views`);
      }
      if (videoId) {
        console.log(`🔍 VIDEO_ID FILTER: videoId = ${videoId}`);
        const beforeVideoIdFilter = filtered.length;
        filtered = filtered.filter((view: any) => view.video_id === videoId);
        console.log(`🔍 VIDEO_ID FILTER: ${beforeVideoIdFilter} -> ${filtered.length} views`);
      }
      console.log(`🔍 DEBUG AFTER FILTERS: ${filtered.length} views remaining`);
      console.log(`🔍 DEBUG SESSION IDs:`, filtered.map((v: any) => v.session_id));

      if (session_id) {
        const beforeSessionFilter = filtered.length;
        filtered = filtered.filter((view: any) => view.session_id === session_id);
        console.log(`🔍 SESSION FILTER: ${beforeSessionFilter} -> ${filtered.length} views`);
        console.log(`🔍 RECENT VIEWS DEBUG: Found ${filtered.length} views for session ${session_id}`);
        if (filtered.length > 0) {
          console.log(`🔍 MATCHING VIEWS:`, filtered.map((v: any) => ({id: v.id, session_id: v.session_id, video_id: v.video_id})));
        }
      }
      
      console.log(`🔍 RECENT VIEWS DEBUG: Returning ${filtered.length} filtered views`);
      return filtered;
    } catch (error) {
      console.error('Error getting recent analytics views from JSON:', error);
      return [];
    }
  }

  async getAnalyticsSettings(): Promise<any> {
    try {
      console.log('🔍 Analytics Settings: Querying Supabase database...');
      
      const { data, error } = await this.supabase
        .from('analytics_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('⚠️ Analytics Settings: Supabase query error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Analytics Settings: Found settings in Supabase');
        return data;
      } else {
        console.log('⚠️ Analytics Settings: No data in Supabase, checking JSON fallback...');
      }
    } catch (error) {
      console.warn('⚠️ Analytics Settings: Supabase connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    try {
      const settings = this.loadJsonFile('analytics-settings.json');
      return Array.isArray(settings) ? settings[0] || {} : settings;
    } catch (error) {
      console.error('Error getting analytics settings from JSON:', error);
      return {
        excludedIps: ["127.0.0.1", "::1"],
        completionThreshold: 50, // Updated to 50%
        trackingEnabled: true,
        dataRetentionDays: 90
      };
    }
  }

  // Helper function to check if visitor is returning using Supabase
  async checkReturningVisitorSupabase(ipAddress: string): Promise<boolean> {
    if (!ipAddress || ipAddress === '0.0.0.0') return false;
    
    try {
      // Check Supabase for recent sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: existingSessions, error } = await this.supabase
        .from('analytics_sessions')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .limit(1);
      
      if (error) {
        console.warn('⚠️ Supabase check for returning visitor failed:', error);
        return false;
      }
      
      if (existingSessions && existingSessions.length > 0) {
        console.log(`🔄 Returning visitor detected (Supabase): IP ${ipAddress} has previous sessions`);
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Supabase check for returning visitor failed:', error);
    }
    
    console.log(`👤 New visitor (Supabase): IP ${ipAddress} has no previous sessions`);
    return false;
  }

  // Helper function to check if visitor is returning based on IP history
  async checkReturningVisitor(ipAddress: string): Promise<boolean> {
    if (!ipAddress || ipAddress === '0.0.0.0') return false;
    
    try {
      // Check PostgreSQL first for recent sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const existingSessions = await this.db
        .select()
        .from(analyticsSessions)
        .where(eq(analyticsSessions.ipAddress, ipAddress))
        .where(gte(analyticsSessions.createdAt, thirtyDaysAgo))
        .limit(1);
      
      if (existingSessions.length > 0) {
        console.log(`🔄 Returning visitor detected: IP ${ipAddress} has previous sessions`);
        return true;
      }
    } catch (error) {
      console.warn('⚠️ PostgreSQL check for returning visitor failed, checking JSON fallback:', error);
    }
    
    // Fallback to JSON data
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const hasRecentSession = sessions.some((session: any) => {
        if (session.ip_address !== ipAddress) return false;
        const sessionDate = new Date(session.created_at);
        return sessionDate >= thirtyDaysAgo;
      });
      
      if (hasRecentSession) {
        console.log(`🔄 Returning visitor detected (JSON fallback): IP ${ipAddress} has previous sessions`);
        return true;
      }
    } catch (error) {
      console.warn('⚠️ JSON fallback check for returning visitor failed:', error);
    }
    
    console.log(`👤 New visitor: IP ${ipAddress} has no previous sessions`);
    return false;
  }

  async createAnalyticsSession(sessionData: any): Promise<any> {
    // Helper function to determine if this is test data
    const isTestData = (data: any): boolean => {
      const ip = data.ip_address || '0.0.0.0';
      const pageUrl = data.page_url || '';
      const referrer = data.referrer || '';
      const userAgent = (data.user_agent || '').toLowerCase();
      const country = data.country || 'Unknown';
      const sessionId = data.session_id || '';
      const screenRes = data.screen_resolution || '';

      // More intelligent test data detection
      // Don't flag real production traffic as test data
      const isRealProduction = (
        // Has real production domain patterns
        (pageUrl.includes('replit.dev') && !pageUrl.includes('localhost')) ||
        pageUrl.includes('replit.app') ||
        // Has real browser user agent (not headless/bot)
        (userAgent.includes('chrome') || userAgent.includes('firefox') || userAgent.includes('safari') || userAgent.includes('edge')) &&
        !userAgent.includes('headless') &&
        // Has realistic screen resolution
        screenRes && screenRes !== '1280x720' && !screenRes.includes('x0')
      );

      // If it looks like real production traffic, don't flag as test
      if (isRealProduction) {
        return false;
      }

      return (
        // Clear development indicators
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        pageUrl.includes('localhost') ||
        // Development/test referrers
        referrer.includes('workspace_iframe') ||
        // Admin page exclusion - automatically exclude admin visits
        pageUrl.includes('/admin') ||
        pageUrl.endsWith('/admin') ||
        // Automated/bot traffic
        userAgent.includes('headless') ||
        userAgent.includes('bot') ||
        userAgent.includes('crawler') ||
        userAgent.includes('spider') ||
        userAgent.includes('automated') ||
        // Explicit test identifiers
        sessionId.startsWith('TEST_') ||
        sessionId.startsWith('DEV_') ||
        sessionId === 'test_session' ||
        country === 'Test' ||
        userAgent.includes('test')
      );
    };

    // Country aliases for better matching
    const COUNTRY_ALIASES = new Map([
      ["usa", "United States"], ["u.s.a.", "United States"], ["us", "United States"],
      ["uk", "United Kingdom"], ["u.k.", "United Kingdom"],
      ["south korea", "Korea, Republic of"], ["north korea", "Korea, Democratic People's Republic of"],
      ["russia", "Russian Federation"], ["vietnam", "Viet Nam"], ["iran", "Iran, Islamic Republic of"],
      ["czech republic", "Czechia"], ["macedonia", "North Macedonia"]
    ]);
    
    const resolveCountryCodes = (countryName: string) => {
      if (!countryName) return { iso2: null, iso3: null };
      const normalized = COUNTRY_ALIASES.get(countryName.toLowerCase()) || countryName;
      
      let iso2 = countries.getAlpha2Code(normalized, "en");
      if (!iso2) {
        // Try loose match
        const candidates = countries.getNames("en");
        const target = normalized.toLowerCase();
        for (const [code2, label] of Object.entries(candidates)) {
          if ((label as string).toLowerCase() === target) { 
            iso2 = code2; 
            break; 
          }
        }
      }
      if (!iso2) {
        if (countryName && countryName !== "Unknown") {
          console.warn("[geo] Unresolved country:", countryName);
        }
        return { iso2: null, iso3: null };
      }
      const iso3 = countries.alpha2ToAlpha3(iso2) || null;
      return { iso2, iso3 };
    };

    // Resolve ISO codes for the country
    const countryName = sessionData.country || 'Unknown';
    const { iso2, iso3 } = resolveCountryCodes(countryName);

    // Generate session data (move outside try block so it's accessible in JSON fallback)
    const sessionWithId = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: sessionData.session_id || `session_${Date.now()}`,
      country: countryName,
      country_iso2: iso2,  // NEW: ISO2 code
      country_iso3: iso3,  // NEW: ISO3 code
      region: sessionData.region || 'Unknown', 
      city: sessionData.city || 'Unknown',
      language: sessionData.language || 'en-US',
      user_agent: sessionData.user_agent || '',
      screen_resolution: sessionData.screen_resolution || '',
      page_url: sessionData.page_url || '',
      referrer: sessionData.referrer || '',
      ip_address: sessionData.ip_address || '0.0.0.0',
      is_test_data: isTestData(sessionData), // Automatically flag test data
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Use Supabase client (same pattern as working gallery endpoints)
      console.log('🔍 Analytics Session: Creating in Supabase database...');
      
      // Helper function to detect device category from user agent
      const detectDeviceCategory = (userAgent: string): string => {
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
          return 'mobile';
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
          return 'tablet';
        }
        return 'desktop';
      };

      // Check if this is a returning visitor using Supabase
      const isReturningVisitor = await this.checkReturningVisitorSupabase(sessionData.ip_address || '0.0.0.0');

      const sessionToInsert = {
        session_id: sessionData.session_id || `session_${Date.now()}`,
        user_id: sessionData.user_id || null,
        ip_address: sessionData.ip_address || '0.0.0.0',
        user_agent: sessionData.user_agent || '',
        referrer: sessionData.referrer || '',
        language: sessionData.language || 'en-US',
        // New schema fields populated from GA4 data sources
        country_iso2: iso2,    // NEW: ISO2 code from geolocation
        country_name: countryName,  // NEW: Country name from geolocation
        device_category: detectDeviceCategory(sessionData.user_agent || ''), // NEW: Detected from user agent
        screen_resolution: sessionData.screen_resolution || '', // NEW: From frontend data
        timezone: sessionData.timezone || 'UTC', // NEW: From frontend data
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        session_duration: 0, // NEW: Will be updated as session progresses
        page_count: 1, // NEW: Starts at 1, incremented on page views
        is_bounce: false, // NEW: Will be determined based on page count and duration
        is_returning: isReturningVisitor, // NEW: Calculated from historical data
        // Legacy fields for backward compatibility
        country: countryName,
        country_iso3: iso3,    // OLD: ISO3 code
        city: sessionData.city || 'Unknown',
        page_views: sessionData.page_views || 0,
        is_bot: sessionData.is_bot || false,
        is_test_data: sessionWithId.is_test_data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertedSession, error } = await this.supabase
        .from('analytics_sessions')
        .insert(sessionToInsert)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
      }

      if (insertedSession) {
        console.log('✅ Analytics Session: Created in Supabase successfully');
        
        // Create compatible session object for JSON backup
        const sessionForJson = {
          id: insertedSession.id,
          session_id: insertedSession.sessionId,
          user_id: insertedSession.userId,
          ip_address: insertedSession.ipAddress,
          user_agent: insertedSession.userAgent,
          referrer: insertedSession.referrer,
          language: insertedSession.language,
          country: insertedSession.country,
          city: insertedSession.city,
          page_views: insertedSession.pageViews,
          is_bot: insertedSession.isBot,
          is_test_data: insertedSession.isTestData,
          created_at: insertedSession.createdAt?.toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Update JSON backup
        const sessions = this.loadJsonFile('analytics-sessions.json');
        sessions.push(sessionForJson);
        this.saveJsonFile('analytics-sessions.json', sessions);
        
        return sessionForJson;
      }
    } catch (error) {
      console.warn('⚠️ Analytics Session: Supabase connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      sessions.push(sessionWithId);
      this.saveJsonFile('analytics-sessions.json', sessions);
      
      console.log('✅ Analytics Session: Created in JSON fallback successfully');
      return sessionWithId;
    } catch (error) {
      console.error('Error creating analytics session in JSON:', error);
      throw error;
    }
  }

  async updateSessionDuration(sessionId: string, duration: number): Promise<any> {
    console.log(`📊 SESSION DURATION UPDATE: ${sessionId} → ${duration}s`);
    
    try {
      // Update in Supabase first
      const { data: updatedSession, error } = await this.supabase
        .from('analytics_sessions')
        .update({
          session_duration: duration, // NEW: Use session_duration field
          last_seen_at: new Date().toISOString(), // NEW: Update last seen timestamp
          duration: duration, // Legacy field for backward compatibility
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }

      if (updatedSession) {
        console.log('✅ Session duration updated in Supabase');
        
        // Update JSON backup
        const sessions = this.loadJsonFile('analytics-sessions.json');
        const sessionIndex = sessions.findIndex((s: any) => s.session_id === sessionId);
        if (sessionIndex !== -1) {
          sessions[sessionIndex].duration = duration;
          sessions[sessionIndex].updated_at = new Date().toISOString();
          this.saveJsonFile('analytics-sessions.json', sessions);
          console.log('✅ Session duration updated in JSON backup');
        }
        
        // Return compatible format
        return {
          id: updatedSession.id,
          session_id: updatedSession.sessionId,
          duration: updatedSession.duration,
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('⚠️ Session duration: Supabase update failed, using JSON fallback:', error);
    }

    // Fallback to JSON only
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      const sessionIndex = sessions.findIndex((s: any) => s.session_id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].duration = duration;
        sessions[sessionIndex].updated_at = new Date().toISOString();
        this.saveJsonFile('analytics-sessions.json', sessions);
        
        console.log('✅ Session duration updated in JSON fallback');
        return sessions[sessionIndex];
      } else {
        console.log('⚠️ Session not found, creating new entry with duration');
        const newSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id: sessionId,
          duration: duration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_test_data: false
        };
        sessions.push(newSession);
        this.saveJsonFile('analytics-sessions.json', sessions);
        return newSession;
      }
    } catch (error) {
      console.error('Error updating session duration in JSON:', error);
      throw error;
    }
  }

  async updateSessionLocation(ipAddress: string, locationData: { country: string, region: string, city: string }): Promise<any> {
    console.log(`🌍 SESSION LOCATION UPDATE: IP ${ipAddress} → ${locationData.city}, ${locationData.country}`);
    
    try {
      // Update all sessions for this IP address in PostgreSQL
      const updatedSessions = await this.db
        .update(analyticsSessions)
        .set({ 
          country: locationData.country,
          region: locationData.region,
          city: locationData.city
        })
        .where(eq(analyticsSessions.ipAddress, ipAddress))
        .returning();

      if (updatedSessions.length > 0) {
        console.log(`✅ Updated ${updatedSessions.length} session(s) in PostgreSQL for IP ${ipAddress}`);
        
        // Update JSON backup
        const sessions = this.loadJsonFile('analytics-sessions.json');
        let updatedCount = 0;
        
        sessions.forEach((session: any) => {
          if (session.ip_address === ipAddress) {
            session.country = locationData.country;
            session.region = locationData.region;
            session.city = locationData.city;
            session.updated_at = new Date().toISOString();
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          this.saveJsonFile('analytics-sessions.json', sessions);
          console.log(`✅ Updated ${updatedCount} session(s) in JSON backup for IP ${ipAddress}`);
        }
        
        return { updated: updatedSessions.length, ip: ipAddress };
      }
    } catch (error) {
      console.warn('⚠️ Session location: PostgreSQL update failed, using JSON fallback:', error);
    }

    // Fallback to JSON only
    try {
      const sessions = this.loadJsonFile('analytics-sessions.json');
      let updatedCount = 0;
      
      sessions.forEach((session: any) => {
        if (session.ip_address === ipAddress) {
          session.country = locationData.country;
          session.region = locationData.region;
          session.city = locationData.city;
          session.updated_at = new Date().toISOString();
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        this.saveJsonFile('analytics-sessions.json', sessions);
        console.log(`✅ Updated ${updatedCount} session(s) in JSON fallback for IP ${ipAddress}`);
        return { updated: updatedCount, ip: ipAddress };
      } else {
        // No existing sessions, but SAVE location data for future lookups
        console.log(`ℹ️ No sessions found for IP ${ipAddress}, creating location cache entry`);
        
        // Create a minimal location cache entry for future API calls
        const locationCacheEntry = {
          id: `location_cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ip_address: ipAddress,
          server_detected_ip: ipAddress,
          country: locationData.country,
          region: locationData.region,
          city: locationData.city,
          country_code: null, // Will be enriched later if available
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_location_cache: true // Flag to identify cache entries
        };
        
        sessions.push(locationCacheEntry);
        this.saveJsonFile('analytics-sessions.json', sessions);
        console.log(`💾 Created location cache entry for IP ${ipAddress}: ${locationData.city}, ${locationData.country}`);
        return { updated: 1, ip: ipAddress, cached: true };
      }
    } catch (error) {
      console.error(`❌ Session location: JSON fallback failed:`, error);
      throw error;
    }
  }

  async createAnalyticsView(viewData: any): Promise<any> {
    // Helper function to determine if this is test data (same logic as sessions)
    const isTestData = (data: any): boolean => {
      const ip = data.ip_address || '0.0.0.0';
      const sessionId = data.session_id || '';
      
      return (
        ip === '0.0.0.0' || 
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        sessionId.startsWith('TEST_') ||
        sessionId.startsWith('DEV_')
      );
    };

    // Generate view data (move outside try block so it's accessible in JSON fallback)
    const viewWithId = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      video_id: viewData.video_id,
      video_filename: viewData.video_filename || viewData.video_id, // Store filename for better matching
      video_type: viewData.video_type || 'gallery', // Focus on gallery videos
      video_title: viewData.video_title || '',
      session_id: viewData.session_id,
      language: viewData.language || 'en-US',
      watch_time: viewData.watch_time || 0,
      completion_rate: viewData.completion_rate || 0,
      ip_address: viewData.ip_address || '0.0.0.0',
      user_agent: viewData.user_agent || '',
      is_test_data: isTestData(viewData), // Automatically flag test data
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Use PostgreSQL via Drizzle ORM first
      console.log('🔍 Analytics View: Creating in PostgreSQL database...');
      
      const viewToInsert = {
        viewId: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // NEW: Unique view ID
        sessionId: viewData.session_id,
        videoId: viewData.video_id || null, // NEW: Made nullable to match migration
        videoTitle: viewData.video_title || '',
        pageUrl: viewData.page_url || '', // NEW: Page URL field
        pageTitle: viewData.page_title || '', // NEW: Page title field
        viewTimestamp: new Date(), // NEW: View timestamp
        timeOnPage: viewData.time_on_page || 0, // NEW: Time on page
        isBounceView: false, // NEW: Bounce view flag
        referrer: viewData.referrer || '', // NEW: Referrer field
        language: viewData.language || 'en-US', // NEW: Language field
        // Legacy fields for backward compatibility
        viewDuration: viewData.watch_time || 0,
        completionPercentage: viewData.completion_rate ? viewData.completion_rate.toString() : '0',
        watchedToEnd: (viewData.completion_rate || 0) >= 80,
        ipAddress: viewData.ip_address || '0.0.0.0',
        userAgent: viewData.user_agent || '',
        isTestData: isTestData(viewData)
      };
      
      const [insertedView] = await this.db
        .insert(analyticsViews)
        .values(viewToInsert)
        .returning();

      if (insertedView) {
        console.log('✅ Analytics View: Created in PostgreSQL successfully');
        
        // Create compatible view object for JSON backup
        const viewForJson = {
          id: insertedView.id,
          view_id: insertedView.viewId,
          session_id: insertedView.sessionId,
          video_id: insertedView.videoId,
          video_title: insertedView.videoTitle,
          watch_time: insertedView.viewDuration,
          completion_rate: parseFloat(insertedView.completionPercentage || '0'),
          ip_address: insertedView.ipAddress,
          user_agent: insertedView.userAgent,
          language: insertedView.language,
          is_test_data: insertedView.isTestData,
          created_at: insertedView.createdAt?.toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Update JSON backup
        const views = this.loadJsonFile('analytics-views.json');
        views.push(viewForJson);
        this.saveJsonFile('analytics-views.json', views);
        
        return viewForJson;
      }
    } catch (error) {
      console.warn('⚠️ Analytics View: PostgreSQL connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    try {
      const views = this.loadJsonFile('analytics-views.json');
      views.push(viewWithId);
      this.saveJsonFile('analytics-views.json', views);
      
      console.log('✅ Analytics View: Created in JSON fallback successfully');
      return viewWithId;
    } catch (error) {
      console.error('Error creating analytics view in JSON:', error);
      throw error;
    }
  }

  async updateAnalyticsSettings(settings: any): Promise<any> {
    try {
      console.log('🔍 Analytics Settings: Updating in Supabase database...');
      
      const updatedData = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      // Try Supabase first - upsert operation
      const { data, error } = await this.supabase
        .from('analytics_settings')
        .upsert(updatedData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('⚠️ Analytics Settings: Supabase update error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Analytics Settings: Updated in Supabase successfully');
        
        // Update JSON backup
        this.saveJsonFile('analytics-settings.json', data);
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Analytics Settings: Supabase connection failed, using JSON fallback:', error);
    }

    // Fallback to JSON
    try {
      const currentSettings = await this.getAnalyticsSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updated_at: new Date().toISOString()
      };

      this.saveJsonFile('analytics-settings.json', updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating analytics settings in JSON:', error);
      throw error;
    }
  }



  async resetAnalyticsData(): Promise<void> {
    try {
      this.saveJsonFile('analytics-sessions.json', []);
      this.saveJsonFile('analytics-views.json', []);
      console.log('✅ Analytics data reset successfully');
    } catch (error) {
      console.error('Error resetting analytics data:', error);
      throw error;
    }
  }

  async clearAnalyticsSessions(): Promise<void> {
    try {
      this.saveJsonFile('analytics-sessions.json', []);
      console.log('✅ Analytics sessions cleared successfully');
    } catch (error) {
      console.error('Error clearing analytics sessions:', error);
      throw error;
    }
  }

  async clearAnalyticsViews(): Promise<void> {
    try {
      this.saveJsonFile('analytics-views.json', []);
      console.log('✅ Analytics views cleared successfully');
    } catch (error) {
      console.error('Error clearing analytics views:', error);
      throw error;
    }
  }

  async clearRealtimeVisitors(): Promise<void> {
    try {
      this.saveJsonFile('realtime-visitors.json', []);
      console.log('✅ Real-time visitors cleared successfully');
    } catch (error) {
      console.error('Error clearing real-time visitors:', error);
      throw error;
    }
  }

  async clearPerformanceMetrics(): Promise<void> {
    try {
      this.saveJsonFile('performance-metrics.json', []);
      console.log('✅ Performance metrics cleared successfully');
    } catch (error) {
      console.error('Error clearing performance metrics:', error);
      throw error;
    }
  }

  async clearEngagementHeatmap(): Promise<void> {
    try {
      this.saveJsonFile('engagement-heatmap.json', []);
      console.log('✅ Engagement heatmap cleared successfully');
    } catch (error) {
      console.error('Error clearing engagement heatmap:', error);
      throw error;
    }
  }

  async clearConversionFunnel(): Promise<void> {
    try {
      this.saveJsonFile('conversion-funnel.json', []);
      console.log('✅ Conversion funnel data cleared successfully');
    } catch (error) {
      console.error('Error clearing conversion funnel:', error);
      throw error;
    }
  }

  async clearAllAnalyticsData(): Promise<void> {
    try {
      console.log('🗑️ Starting complete analytics data deletion...');
      
      // Step 1: Clear Supabase PostgreSQL database tables (the primary database on VPS)
      try {
        console.log('🗑️ Deleting from Supabase PostgreSQL tables...');
        
        // Delete from Supabase (primary database)
        const { error: sessionsError } = await this.supabase
          .from('analytics_sessions')
          .delete()
          .neq('id', ''); // Delete all records
        
        const { error: viewsError } = await this.supabase
          .from('analytics_views')
          .delete()
          .neq('id', ''); // Delete all records
          
        if (sessionsError) {
          console.error('⚠️ Supabase sessions deletion error:', sessionsError);
        }
        if (viewsError) {
          console.error('⚠️ Supabase views deletion error:', viewsError);
        }
        
        if (!sessionsError && !viewsError) {
          console.log('✅ Supabase PostgreSQL analytics data deleted successfully');
        }
        
        // Also clear from development database (Neon) in case there's orphaned data
        try {
          const deletedSessions = await this.db.delete(analyticsSessions);
          const deletedViews = await this.db.delete(analyticsViews);
          console.log(`✅ Development database cleanup: ${deletedSessions.rowCount || 0} sessions, ${deletedViews.rowCount || 0} views removed`);
        } catch (devDbError) {
          console.warn('⚠️ Development database cleanup failed (this is normal):', devDbError);
        }
        
      } catch (dbError) {
        console.warn('⚠️ Database deletion failed, continuing with JSON cleanup:', dbError);
      }
      
      // Step 2: Clear all analytics-related JSON files
      console.log('🗑️ Clearing JSON backup files...');
      this.saveJsonFile('analytics-sessions.json', []);
      this.saveJsonFile('analytics-views.json', []);
      this.saveJsonFile('realtime-visitors.json', []);
      this.saveJsonFile('performance-metrics.json', []);
      this.saveJsonFile('engagement-heatmap.json', []);
      this.saveJsonFile('conversion-funnel.json', []);
      
      // Step 3: Reset analytics settings to defaults
      const defaultSettings = {
        excludedIps: [],
        completionThreshold: 75,
        trackingEnabled: true,
        dataRetentionDays: 90
      };
      this.saveJsonFile('analytics-settings.json', [defaultSettings]);
      
      console.log('✅ ALL ANALYTICS DATA CLEARED SUCCESSFULLY (PostgreSQL + JSON)');
    } catch (error) {
      console.error('❌ Error clearing all analytics data:', error);
      throw error;
    }
  }

  async getAnalyticsDashboard(dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      const sessions = await this.getAnalyticsSessions(dateFrom, dateTo);
      // Use filtered analytics views (excludes test data and hero videos automatically)
      const views = await this.getAnalyticsViews({ dateFrom, dateTo });
      
      // Calculate overview metrics - only count views that can be matched to videos
      const galleryViews = views.filter((view: any) => 
        view.video_type === 'gallery' && 
        view.video_id && 
        String(view.video_id).trim() !== ''
      );
      const totalViews = galleryViews.length;
      const uniqueVisitors = new Set(sessions.map((s: any) => s.ip_address)).size;
      const totalWatchTime = galleryViews.reduce((sum: number, view: any) => 
        sum + (parseInt(view.watch_time || view.duration_watched || view.view_duration || '0')), 0);
      const averageSessionDuration = sessions.length > 0 
        ? sessions.reduce((sum: number, session: any) => sum + (session.duration || 0), 0) / sessions.length
        : 0;

      // Top countries (with normalization)
      const countryMap = new Map();
      sessions.forEach((session: any) => {
        let country = session.country || 'Unknown';
        
        // Normalize country names to avoid duplicates
        if (country === 'USA' || country === 'United States') {
          country = 'United States';
        }
        if (country === 'UK' || country === 'United Kingdom') {
          country = 'United Kingdom';
        }
        
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const topCountries = Array.from(countryMap.entries())
        .map(([country, sessions]) => ({ country, sessions }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5);

      // Language breakdown
      const languageMap = new Map();
      sessions.forEach((session: any) => {
        const language = session.language || 'Unknown';
        languageMap.set(language, (languageMap.get(language) || 0) + 1);
      });
      const languageBreakdown = Array.from(languageMap.entries())
        .map(([language, sessions]) => ({ language, sessions }))
        .sort((a, b) => b.sessions - a.sessions);

      // Video performance (Gallery videos only - test data already filtered out)
      const filteredGalleryViews = views.filter((view: any) => 
        view.video_type === 'gallery'
      );
      const videoMap = new Map();
      filteredGalleryViews.forEach((view: any) => {
        const videoId = view.video_id;
        if (!videoMap.has(videoId)) {
          videoMap.set(videoId, {
            video_id: videoId,
            video_title: view.video_title,
            views: 0,
            total_watch_time: 0,
            average_completion_rate: 0
          });
        }
        const video = videoMap.get(videoId);
        video.views += 1;
        video.total_watch_time += parseInt(view.watch_time || view.duration_watched || view.view_duration || '0');
        video.average_completion_rate = ((video.average_completion_rate * (video.views - 1)) + 
          parseFloat(view.completion_rate || view.completion_percentage || '0')) / video.views;
      });
      
      const videoPerformance = Array.from(videoMap.values())
        .sort((a, b) => b.views - a.views);

      return {
        overview: {
          totalViews,
          uniqueVisitors,
          totalWatchTime,
          averageSessionDuration
        },
        topCountries,
        languageBreakdown,
        videoPerformance,
        dateRange: {
          from: dateFrom || 'all time',
          to: dateTo || 'now'
        }
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  // IP Management Methods
  async getActiveViewerIps(): Promise<any[]> {
    try {
      // Get filtered session data (excludes test data) to analyze IP addresses
      const sessions = await this.getAnalyticsSessions();
      const ipMap = new Map();

      sessions.forEach((session: any) => {
        const ip = session.ip_address;
        if (!ip) return;

        if (ipMap.has(ip)) {
          const existing = ipMap.get(ip);
          existing.session_count++;
          existing.last_activity = session.timestamp > existing.last_activity ? session.timestamp : existing.last_activity;
        } else {
          ipMap.set(ip, {
            ip_address: ip,
            country: session.country || 'Unknown',
            city: session.city || 'Unknown',
            first_seen: session.timestamp,
            last_activity: session.timestamp,
            session_count: 1
          });
        }
      });

      return Array.from(ipMap.values()).sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );
    } catch (error) {
      console.error('Error getting active viewer IPs:', error);
      return [];
    }
  }




  // Test Data Generation Methods
  async generateTestAnalyticsData(): Promise<any> {
    try {
      console.log('🧪 Generating test analytics data...');
      
      // Generate smaller incremental amounts for additive behavior
      const sessionCount = Math.floor(Math.random() * 20) + 10; // 10-30 sessions
      const viewCount = Math.floor(Math.random() * 30) + 15; // 15-45 views  
      const metricCount = Math.floor(Math.random() * 40) + 20; // 20-60 metrics
      const visitorCount = Math.floor(Math.random() * 10) + 5; // 5-15 visitors
      
      // Get existing data (keep all existing data including test data)
      const existingSessions = this.loadJsonFile('analytics-sessions.json');
      const existingViews = this.loadJsonFile('analytics-views.json');
      const existingMetrics = this.loadJsonFile('performance-metrics.json');
      const existingVisitors = this.loadJsonFile('realtime-visitors.json');
      
      // Generate new test data with unique IDs based on existing count
      const existingTestSessions = existingSessions.filter((s: any) => s.test_data);
      const existingTestViews = existingViews.filter((v: any) => v.test_data);
      const existingTestMetrics = existingMetrics.filter((m: any) => m.test_data);
      const existingTestVisitors = existingVisitors.filter((v: any) => v.test_data);
      
      const testSessions = this.generateTestSessions(sessionCount, existingTestSessions.length);
      const testViews = this.generateTestViews(viewCount, existingTestViews.length);
      const testMetrics = this.generateTestPerformanceMetrics(metricCount, existingTestMetrics.length);
      const testVisitors = this.generateTestRealtimeVisitors(visitorCount, existingTestVisitors.length);
      
      // Add new test data to existing data (additive)
      const combinedSessions = [...existingSessions, ...testSessions];
      const combinedViews = [...existingViews, ...testViews];
      const combinedMetrics = [...existingMetrics, ...testMetrics];
      const combinedVisitors = [...existingVisitors, ...testVisitors];
      
      // Save updated data
      this.saveJsonFile('analytics-sessions.json', combinedSessions);
      this.saveJsonFile('analytics-views.json', combinedViews);
      this.saveJsonFile('performance-metrics.json', combinedMetrics);
      this.saveJsonFile('realtime-visitors.json', combinedVisitors);
      
      console.log('✅ Test analytics data generated successfully');
      return {
        sessions: sessionCount,
        views: viewCount,
        metrics: metricCount,
        visitors: visitorCount,
        message: `Added ${sessionCount + viewCount + metricCount + visitorCount} new test records`
      };
      
    } catch (error) {
      console.error('Error generating test data:', error);
      throw error;
    }
  }

  private generateTestSessions(count: number, startOffset: number = 0): any[] {
    const sessions = [];
    const countries = ['France', 'Canada', 'Belgium', 'Switzerland', 'Germany', 'Spain', 'Italy'];
    const cities = ['Paris', 'Montreal', 'Brussels', 'Geneva', 'Berlin', 'Madrid', 'Rome'];
    const languages = ['fr', 'en'];
    
    for (let i = 0; i < count; i++) {
      const countryIndex = Math.floor(Math.random() * countries.length);
      // Generate dates only within the last 7 days from today (current August dates)
      const daysBack = Math.random() * 7; // 0-7 days back from now
      const sessionDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      sessions.push({
        id: `TEST_session_${(startOffset + i).toString().padStart(3, '0')}`,
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: 'TEST_Mozilla/5.0 (Test Browser) TEST_DATA',
        country: countries[countryIndex],
        city: cities[countryIndex],
        language: languages[Math.floor(Math.random() * languages.length)],
        timestamp: sessionDate.toISOString(),
        duration: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
        pages_visited: Math.floor(Math.random() * 8) + 1,
        test_data: true,
        test_generated_at: new Date().toISOString()
      });
    }
    
    return sessions;
  }

  private generateTestViews(count: number, startOffset: number = 0): any[] {
    const views = [];
    const videoFiles = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4', 'gallery_test_video.mp4'];
    
    for (let i = 0; i < count; i++) {
      // Generate dates only within the last 7 days from today (current August dates)
      const daysBack = Math.random() * 7; // 0-7 days back from now
      const viewDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      views.push({
        id: `TEST_view_${(startOffset + i).toString().padStart(3, '0')}`,
        session_id: `TEST_session_${Math.floor(Math.random() * 75).toString().padStart(3, '0')}`,
        video_filename: videoFiles[Math.floor(Math.random() * videoFiles.length)],
        video_url: `test_video_${Math.floor(Math.random() * 10)}.mp4`,
        timestamp: viewDate.toISOString(),
        duration_watched: Math.floor(Math.random() * 180) + 5, // 5-185 seconds
        completion_percentage: Math.floor(Math.random() * 100),
        user_agent: 'TEST_Mozilla/5.0 (Test Browser) TEST_DATA',
        test_data: true,
        test_generated_at: new Date().toISOString()
      });
    }
    
    return views;
  }

  private generateTestPerformanceMetrics(count: number, startOffset: number = 0): any[] {
    const metrics = [];
    const metricTypes = ['page_load', 'api_response', 'video_load', 'server_health'];
    
    for (let i = 0; i < count; i++) {
      // Generate dates only within the last 7 days from today (current August dates)
      const daysBack = Math.random() * 7; // 0-7 days back from now
      const metricDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const metricType = metricTypes[Math.floor(Math.random() * metricTypes.length)];
      
      let value;
      switch (metricType) {
        case 'page_load':
          value = (Math.random() * 3000 + 500).toFixed(0); // 500-3500ms
          break;
        case 'api_response':
          value = (Math.random() * 1000 + 50).toFixed(0); // 50-1050ms
          break;
        case 'video_load':
          value = (Math.random() * 2000 + 100).toFixed(0); // 100-2100ms
          break;
        case 'server_health':
          value = (Math.random() * 100).toFixed(1); // 0-100%
          break;
        default:
          value = (Math.random() * 1000).toFixed(0);
      }
      
      metrics.push({
        id: `TEST_metric_${(startOffset + i).toString().padStart(3, '0')}`,
        sessionId: `TEST_session_${Math.floor(Math.random() * 75).toString().padStart(3, '0')}`,
        metricType,
        value: value,
        unit: metricType === 'server_health' ? '%' : 'ms',
        createdAt: metricDate.toISOString(),
        test_data: true,
        test_generated_at: new Date().toISOString()
      });
    }
    
    return metrics;
  }

  private generateTestRealtimeVisitors(count: number, startOffset: number = 0): any[] {
    const visitors = [];
    const countries = ['France', 'Canada', 'Belgium', 'Switzerland'];
    const cities = ['Paris', 'Montreal', 'Brussels', 'Geneva'];
    const pages = ['/', '/gallery', '/contact', '/legal/privacy'];
    
    for (let i = 0; i < count; i++) {
      const countryIndex = Math.floor(Math.random() * countries.length);
      const lastActivity = new Date(Date.now() - Math.random() * 60 * 60 * 1000); // Within last hour
      
      visitors.push({
        id: `TEST_visitor_${(startOffset + i).toString().padStart(3, '0')}`,
        sessionId: `TEST_session_${Math.floor(Math.random() * 75).toString().padStart(3, '0')}`,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: countries[countryIndex],
        city: cities[countryIndex],
        currentPage: pages[Math.floor(Math.random() * pages.length)],
        lastActivity: lastActivity.toISOString(),
        isActive: Math.random() > 0.3, // 70% active
        test_data: true,
        test_generated_at: new Date().toISOString()
      });
    }
    
    return visitors;
  }

  async clearTestDataOnly(): Promise<any> {
    try {
      console.log('🧹 Clearing test data only (preserving real data)...');
      
      // Clear test sessions
      const sessions = this.loadJsonFile('analytics-sessions.json');
      const realSessions = sessions.filter((session: any) => !session.test_data);
      this.saveJsonFile('analytics-sessions.json', realSessions);
      
      // Clear test views
      const views = this.loadJsonFile('analytics-views.json');
      const realViews = views.filter((view: any) => !view.test_data);
      this.saveJsonFile('analytics-views.json', realViews);
      
      // Clear test metrics
      const metrics = this.loadJsonFile('performance-metrics.json');
      const realMetrics = metrics.filter((metric: any) => !metric.test_data);
      this.saveJsonFile('performance-metrics.json', realMetrics);
      
      // Clear test visitors
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const realVisitors = visitors.filter((visitor: any) => !visitor.test_data);
      this.saveJsonFile('realtime-visitors.json', realVisitors);
      
      console.log('✅ Test data cleared successfully, real data preserved');
      return {
        sessionsRemoved: sessions.length - realSessions.length,
        viewsRemoved: views.length - realViews.length,
        metricsRemoved: metrics.length - realMetrics.length,
        visitorsRemoved: visitors.length - realVisitors.length,
        message: 'Only test data removed, real analytics data preserved'
      };
      
    } catch (error) {
      console.error('Error clearing test data:', error);
      throw error;
    }
  }

  async getTestDataStatus(): Promise<any> {
    try {
      // Count test data across all files
      const sessions = this.loadJsonFile('analytics-sessions.json');
      const testSessions = sessions.filter((session: any) => session.test_data);
      
      const views = this.loadJsonFile('analytics-views.json');
      const testViews = views.filter((view: any) => view.test_data);
      
      const metrics = this.loadJsonFile('performance-metrics.json');
      const testMetrics = metrics.filter((metric: any) => metric.test_data);
      
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const testVisitors = visitors.filter((visitor: any) => visitor.test_data);
      
      const hasTestData = testSessions.length > 0 || testViews.length > 0 || 
                         testMetrics.length > 0 || testVisitors.length > 0;
      
      return {
        hasTestData,
        counts: {
          sessions: testSessions.length,
          views: testViews.length,
          metrics: testMetrics.length,
          visitors: testVisitors.length,
          total: testSessions.length + testViews.length + testMetrics.length + testVisitors.length
        },
        lastGenerated: testSessions.length > 0 ? testSessions[0].test_generated_at : null
      };
      
    } catch (error) {
      console.error('Error getting test data status:', error);
      return {
        hasTestData: false,
        counts: { sessions: 0, views: 0, metrics: 0, visitors: 0, total: 0 },
        lastGenerated: null
      };
    }
  }

  // Real-time Analytics Methods
  async getRealtimeVisitors(): Promise<any[]> {
    try {
      // Try database first
      const { data: visitors } = await this.supabase
        .from('realtime_visitors')
        .select('*')
        .eq('isActive', true)
        .eq('is_test_data', false) // Filter out test data
        .order('lastSeen', { ascending: false });

      if (visitors && visitors.length > 0) {
        return visitors;
      }

      // Fallback to JSON file
      const visitorData = this.loadJsonFile('realtime-visitors.json');
      return visitorData.filter((v: any) => v.isActive && !v.is_test_data);
    } catch (error) {
      console.warn('Database error, using JSON fallback for realtime visitors:', error);
      const visitorData = this.loadJsonFile('realtime-visitors.json');
      return visitorData.filter((v: any) => v.isActive && !v.is_test_data);
    }
  }

  async updateVisitorActivity(sessionId: string, currentPage: string): Promise<any> {
    try {
      const updateData = {
        currentPage,
        lastSeen: new Date().toISOString(),
        isActive: true
      };

      // Update in database
      const { data: updatedVisitor } = await this.supabase
        .from('realtime_visitors')
        .update(updateData)
        .eq('sessionId', sessionId)
        .select()
        .single();

      if (updatedVisitor) {
        return updatedVisitor;
      }

      // Fallback to JSON update
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const visitorIndex = visitors.findIndex((v: any) => v.sessionId === sessionId);
      
      if (visitorIndex >= 0) {
        visitors[visitorIndex] = { ...visitors[visitorIndex], ...updateData };
        this.saveJsonFile('realtime-visitors.json', visitors);
        return visitors[visitorIndex];
      }

      return null;
    } catch (error) {
      console.error('Error updating visitor activity:', error);
      throw error;
    }
  }

  async deactivateVisitor(sessionId: string): Promise<void> {
    try {
      // Update in database
      await this.supabase
        .from('realtime_visitors')
        .update({ isActive: false })
        .eq('sessionId', sessionId);

      // Update JSON fallback
      const visitors = this.loadJsonFile('realtime-visitors.json');
      const visitorIndex = visitors.findIndex((v: any) => v.sessionId === sessionId);
      
      if (visitorIndex >= 0) {
        visitors[visitorIndex].isActive = false;
        this.saveJsonFile('realtime-visitors.json', visitors);
      }
    } catch (error) {
      console.error('Error deactivating visitor:', error);
    }
  }

  async createRealtimeVisitor(visitorData: any): Promise<any> {
    // Helper function to determine if this is test data
    const isTestData = (data: any): boolean => {
      const ip = data.ipAddress || '0.0.0.0';
      const sessionId = data.sessionId || '';
      const userAgent = (data.userAgent || '').toLowerCase();
      
      return (
        ip === '0.0.0.0' || 
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        sessionId.startsWith('TEST_') ||
        sessionId.startsWith('DEV_') ||
        userAgent.includes('test')
      );
    };

    try {
      const newVisitor = {
        sessionId: visitorData.sessionId,
        ipAddress: visitorData.ipAddress,
        currentPage: visitorData.currentPage,
        userAgent: visitorData.userAgent,
        country: visitorData.country || null,
        city: visitorData.city || null,
        isActive: true,
        is_test_data: isTestData(visitorData), // Flag test data
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdVisitor } = await this.supabase
        .from('realtime_visitors')
        .insert(newVisitor)
        .select()
        .single();

      if (createdVisitor) {
        return createdVisitor;
      }

      // Fallback to JSON
      const visitors = this.loadJsonFile('realtime-visitors.json');
      visitors.push(newVisitor);
      this.saveJsonFile('realtime-visitors.json', visitors);
      
      return newVisitor;
    } catch (error) {
      console.error('Error creating realtime visitor:', error);
      throw error;
    }
  }

  // Performance Monitoring Methods
  async recordPerformanceMetric(metricData: any): Promise<any> {
    // Helper function to determine if this is test data
    const isTestData = (data: any): boolean => {
      const ip = data.ipAddress || '0.0.0.0';
      const sessionId = data.sessionId || '';
      const userAgent = (data.userAgent || '').toLowerCase();
      
      return (
        ip === '0.0.0.0' || 
        ip.startsWith('127.') ||
        ip.startsWith('192.168.') ||
        sessionId.startsWith('TEST_') ||
        sessionId.startsWith('DEV_') ||
        userAgent.includes('test')
      );
    };

    try {
      const newMetric = {
        metricType: metricData.metricType,
        metricName: metricData.metricName,
        value: metricData.value,
        unit: metricData.unit || 'ms',
        sessionId: metricData.sessionId || null,
        ipAddress: metricData.ipAddress || null,
        userAgent: metricData.userAgent || null,
        metadata: metricData.metadata || {},
        is_test_data: isTestData(metricData), // Flag test data
        createdAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdMetric } = await this.supabase
        .from('performance_metrics')
        .insert(newMetric)
        .select()
        .single();

      if (createdMetric) {
        return createdMetric;
      }

      // Fallback to JSON
      const metrics = this.loadJsonFile('performance-metrics.json');
      metrics.push(newMetric);
      this.saveJsonFile('performance-metrics.json', metrics);
      
      return newMetric;
    } catch (error) {
      console.error('Error recording performance metric:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(metricType?: string, timeRange?: { from: string; to: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('is_test_data', false) // Filter out test data
        .order('createdAt', { ascending: false });

      if (metricType) {
        query = query.eq('metricType', metricType);
      }

      if (timeRange) {
        query = query.gte('createdAt', timeRange.from).lte('createdAt', timeRange.to);
      }

      const { data: metrics } = await query;

      if (metrics && metrics.length > 0) {
        return metrics;
      }

      // Fallback to JSON
      const metricsData = this.loadJsonFile('performance-metrics.json');
      let filteredMetrics = metricsData.filter((m: any) => !m.is_test_data); // Filter out test data

      if (metricType) {
        filteredMetrics = filteredMetrics.filter((m: any) => m.metricType === metricType);
      }

      if (timeRange) {
        filteredMetrics = filteredMetrics.filter((m: any) => 
          new Date(m.createdAt) >= new Date(timeRange.from) && 
          new Date(m.createdAt) <= new Date(timeRange.to)
        );
      }

      return filteredMetrics;
    } catch (error) {
      console.warn('Database error, using JSON fallback for performance metrics:', error);
      const metricsData = this.loadJsonFile('performance-metrics.json');
      return metricsData.filter((m: any) => !m.is_test_data); // Filter out test data
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent performance metrics
      const metrics = await this.getPerformanceMetrics(undefined, {
        from: oneHourAgo.toISOString(),
        to: now.toISOString()
      });

      // Calculate system health statistics
      const serverHealthMetrics = metrics.filter(m => m.metricType === 'server_health');
      const pageLoadMetrics = metrics.filter(m => m.metricType === 'page_load');
      const videoLoadMetrics = metrics.filter(m => m.metricType === 'video_load');
      const apiResponseMetrics = metrics.filter(m => m.metricType === 'api_response');

      const calculateStats = (metricArray: any[]) => {
        if (metricArray.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
        
        const values = metricArray.map(m => parseFloat(m.value));
        return {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      };

      return {
        serverHealth: calculateStats(serverHealthMetrics),
        pageLoad: calculateStats(pageLoadMetrics),
        videoLoad: calculateStats(videoLoadMetrics),
        apiResponse: calculateStats(apiResponseMetrics),
        totalMetrics: metrics.length,
        timeRange: {
          from: oneHourAgo.toISOString(),
          to: now.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        serverHealth: { avg: 0, min: 0, max: 0, count: 0 },
        pageLoad: { avg: 0, min: 0, max: 0, count: 0 },
        videoLoad: { avg: 0, min: 0, max: 0, count: 0 },
        apiResponse: { avg: 0, min: 0, max: 0, count: 0 },
        totalMetrics: 0,
        error: 'Unable to retrieve system health data'
      };
    }
  }

  // Engagement Heatmap Methods
  async recordEngagementEvent(eventData: any): Promise<any> {
    try {
      const newEvent = {
        sessionId: eventData.sessionId,
        pageUrl: eventData.pageUrl,
        elementId: eventData.elementId || null,
        eventType: eventData.eventType,
        xPosition: eventData.xPosition || null,
        yPosition: eventData.yPosition || null,
        viewportWidth: eventData.viewportWidth || null,
        viewportHeight: eventData.viewportHeight || null,
        duration: eventData.duration || null,
        timestamp: new Date().toISOString()
      };

      // Try database first
      const { data: createdEvent } = await this.supabase
        .from('engagement_heatmap')
        .insert(newEvent)
        .select()
        .single();

      if (createdEvent) {
        return createdEvent;
      }

      // Fallback to JSON
      const events = this.loadJsonFile('engagement-heatmap.json');
      events.push(newEvent);
      this.saveJsonFile('engagement-heatmap.json', events);
      
      return newEvent;
    } catch (error) {
      console.error('Error recording engagement event:', error);
      throw error;
    }
  }

  async getEngagementHeatmap(pageUrl: string, timeRange?: { from: string; to: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('engagement_heatmap')
        .select('*')
        .eq('pageUrl', pageUrl)
        .order('timestamp', { ascending: false });

      if (timeRange) {
        query = query.gte('timestamp', timeRange.from).lte('timestamp', timeRange.to);
      }

      const { data: events } = await query;

      if (events && events.length > 0) {
        return events;
      }

      // Fallback to JSON
      const heatmapData = this.loadJsonFile('engagement-heatmap.json');
      let filteredEvents = heatmapData.filter((e: any) => e.pageUrl === pageUrl);

      if (timeRange) {
        filteredEvents = filteredEvents.filter((e: any) => 
          new Date(e.timestamp) >= new Date(timeRange.from) && 
          new Date(e.timestamp) <= new Date(timeRange.to)
        );
      }

      return filteredEvents;
    } catch (error) {
      console.warn('Database error, using JSON fallback for engagement heatmap:', error);
      const heatmapData = this.loadJsonFile('engagement-heatmap.json');
      return heatmapData.filter((e: any) => e.pageUrl === pageUrl);
    }
  }

  // Conversion Funnel Methods
  async recordConversionStep(stepData: any): Promise<any> {
    try {
      const newStep = {
        sessionId: stepData.sessionId,
        funnelStep: stepData.funnelStep,
        stepOrder: stepData.stepOrder,
        metadata: stepData.metadata || {},
        completedAt: new Date().toISOString()
      };

      // Try database first
      const { data: createdStep } = await this.supabase
        .from('conversion_funnel')
        .insert(newStep)
        .select()
        .single();

      if (createdStep) {
        return createdStep;
      }

      // Fallback to JSON
      const steps = this.loadJsonFile('conversion-funnel.json');
      steps.push(newStep);
      this.saveJsonFile('conversion-funnel.json', steps);
      
      return newStep;
    } catch (error) {
      console.error('Error recording conversion step:', error);
      throw error;
    }
  }

  async getConversionFunnel(timeRange?: { from: string; to: string }): Promise<any> {
    try {
      let query = this.supabase
        .from('conversion_funnel')
        .select('*')
        .order('completedAt', { ascending: false });

      if (timeRange) {
        query = query.gte('completedAt', timeRange.from).lte('completedAt', timeRange.to);
      }

      const { data: steps } = await query;

      if (steps && steps.length > 0) {
        return this.processFunnelData(steps);
      }

      // Fallback to JSON
      const funnelData = this.loadJsonFile('conversion-funnel.json');
      let filteredSteps = funnelData;

      if (timeRange) {
        filteredSteps = filteredSteps.filter((s: any) => 
          new Date(s.completedAt) >= new Date(timeRange.from) && 
          new Date(s.completedAt) <= new Date(timeRange.to)
        );
      }

      return this.processFunnelData(filteredSteps);
    } catch (error) {
      console.warn('Database error, using JSON fallback for conversion funnel:', error);
      const funnelData = this.loadJsonFile('conversion-funnel.json');
      return this.processFunnelData(funnelData);
    }
  }

  async getFunnelAnalytics(timeRange?: { from: string; to: string }): Promise<any> {
    try {
      const funnelData = await this.getConversionFunnel(timeRange);
      
      return {
        totalSessions: funnelData.uniqueSessions,
        conversionRates: funnelData.conversionRates,
        dropOffPoints: funnelData.dropOffAnalysis,
        timeToConvert: funnelData.timeAnalysis,
        funnelSteps: funnelData.stepDetails
      };
    } catch (error) {
      console.error('Error getting funnel analytics:', error);
      return {
        totalSessions: 0,
        conversionRates: {},
        dropOffPoints: [],
        timeToConvert: {},
        funnelSteps: []
      };
    }
  }

  private processFunnelData(steps: any[]): any {
    // Group by session
    const sessionGroups = steps.reduce((acc: any, step: any) => {
      if (!acc[step.sessionId]) {
        acc[step.sessionId] = [];
      }
      acc[step.sessionId].push(step);
      return acc;
    }, {});

    // Analyze conversion paths
    const stepCounts: { [key: string]: number } = {};
    const conversionRates: { [key: string]: number } = {};
    
    const funnelSteps = ['visit_home', 'view_gallery', 'view_video', 'contact_form', 'form_submit'];
    
    funnelSteps.forEach(step => {
      stepCounts[step] = 0;
    });

    Object.values(sessionGroups).forEach((sessionSteps: any) => {
      const completedSteps = new Set(sessionSteps.map((s: any) => s.funnelStep));
      
      funnelSteps.forEach(step => {
        if (completedSteps.has(step)) {
          stepCounts[step]++;
        }
      });
    });

    // Calculate conversion rates
    const totalSessions = Object.keys(sessionGroups).length;
    funnelSteps.forEach(step => {
      conversionRates[step] = totalSessions > 0 ? (stepCounts[step] / totalSessions) * 100 : 0;
    });

    return {
      uniqueSessions: totalSessions,
      stepCounts,
      conversionRates,
      stepDetails: funnelSteps.map(step => ({
        step,
        count: stepCounts[step],
        conversionRate: conversionRates[step]
      })),
      dropOffAnalysis: this.calculateDropOff(stepCounts, funnelSteps),
      timeAnalysis: this.calculateTimeToConvert(sessionGroups)
    };
  }

  private calculateDropOff(stepCounts: { [key: string]: number }, funnelSteps: string[]): any[] {
    const dropOff = [];
    
    for (let i = 1; i < funnelSteps.length; i++) {
      const currentStep = funnelSteps[i];
      const previousStep = funnelSteps[i - 1];
      
      const currentCount = stepCounts[currentStep];
      const previousCount = stepCounts[previousStep];
      
      if (previousCount > 0) {
        const dropOffRate = ((previousCount - currentCount) / previousCount) * 100;
        dropOff.push({
          fromStep: previousStep,
          toStep: currentStep,
          dropOffCount: previousCount - currentCount,
          dropOffRate: dropOffRate
        });
      }
    }
    
    return dropOff;
  }

  private calculateTimeToConvert(sessionGroups: any): any {
    const conversionTimes: number[] = [];
    
    Object.values(sessionGroups).forEach((sessionSteps: any) => {
      if (sessionSteps.length > 1) {
        const sortedSteps = sessionSteps.sort((a: any, b: any) => 
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        );
        
        const firstStep = new Date(sortedSteps[0].completedAt);
        const lastStep = new Date(sortedSteps[sortedSteps.length - 1].completedAt);
        const timeDiff = (lastStep.getTime() - firstStep.getTime()) / 1000; // in seconds
        
        conversionTimes.push(timeDiff);
      }
    });
    
    if (conversionTimes.length === 0) {
      return { avg: 0, min: 0, max: 0, median: 0 };
    }
    
    conversionTimes.sort((a, b) => a - b);
    
    return {
      avg: conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length,
      min: conversionTimes[0],
      max: conversionTimes[conversionTimes.length - 1],
      median: conversionTimes[Math.floor(conversionTimes.length / 2)]
    };
  }

  // Historical Threshold Recalculation Implementation
  async recalculateHistoricalCompletions(newThreshold: number): Promise<{ updated: number; total: number }> {
    try {
      console.log(`🔄 Recalculating historical completions with ${newThreshold}% threshold...`);
      
      // Primary: Use Supabase database
      try {
        console.log('🔍 Recalculation: Querying Supabase for analytics views...');
        const { data: views, error } = await this.supabase
          .from('analytics_views')
          .select('*');
        
        if (error) {
          console.error('⚠️ Recalculation: Supabase query error:', error);
          throw error;
        }
        
        let updated = 0;
        const total = views?.length || 0;
        
        if (views) {
          console.log(`🔍 Processing ${total} analytics views for recalculation...`);
          
          for (const view of views) {
            const completionPercentage = parseFloat(view.completion_percentage || '0');
            const newWatchedToEnd = completionPercentage >= newThreshold;
            
            // Only update if the completion status would change
            if (view.watched_to_end !== newWatchedToEnd) {
              const { error: updateError } = await this.supabase
                .from('analytics_views')
                .update({ watched_to_end: newWatchedToEnd })
                .eq('id', view.id);
              
              if (!updateError) {
                updated++;
              } else {
                console.error(`⚠️ Failed to update view ${view.id}:`, updateError);
              }
            }
          }
        }
        
        console.log(`✅ Updated ${updated} out of ${total} historical video views in Supabase`);
        return { updated, total };
      } catch (supabaseError) {
        console.warn('⚠️ Recalculation: Supabase connection failed, using JSON fallback:', supabaseError);
      }
      
      // Fallback: Use JSON storage
      const filePath = join(process.cwd(), 'server/data/analytics-views.json');
      let views = [];
      let updated = 0;
      
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf8');
        views = JSON.parse(data);
        
        for (const view of views) {
          const completionPercentage = parseFloat(view.completion_percentage || '0');
          const newWatchedToEnd = completionPercentage >= newThreshold;
          
          // Only update if the completion status would change
          if (view.watched_to_end !== newWatchedToEnd) {
            view.watched_to_end = newWatchedToEnd;
            updated++;
          }
        }
        
        // Write updated data back to file
        writeFileSync(filePath, JSON.stringify(views, null, 2));
      }
      
      const total = views.length;
      console.log(`✅ Updated ${updated} out of ${total} historical video views in JSON fallback`);
      return { updated, total };
    } catch (error) {
      console.error('❌ Error recalculating historical completions:', error);
      throw error;
    }
  }

  // Enhanced Video Analytics Implementation
  async getVideoEngagementMetrics(videoId?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    try {
      console.log(`📊 Getting video engagement metrics for ${videoId || 'gallery videos only'}`);
      
      if (this.supabase) {
        try {
          // Database implementation
          let query = this.supabase
            .from('analytics_views')
            .select('*')
            // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
            .not('video_filename', 'in', '("VideoHero1.mp4","VideoHero2.mp4","VideoHero3.mp4")');
          
          if (videoId) {
            query = query.eq('video_id', videoId);
          }
          if (dateFrom) {
            query = query.gte('created_at', dateFrom);
          }
          if (dateTo) {
            query = query.lte('created_at', dateTo);
          }
          
          const { data: views, error } = await query;
          if (error) throw error;
          
          return this.calculateEngagementMetrics(views || []);
        } catch (dbError) {
          console.log('📊 Database error, falling back to JSON:', dbError);
          // Fall through to JSON implementation
        }
      }
      
      // JSON fallback implementation
      const filePath = join(process.cwd(), 'server/data/analytics-views.json');
      let views = [];
      
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf8');
        views = JSON.parse(data)
          // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
          .filter((view: any) => !['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(view.video_filename));
        
        // Apply filters
        if (videoId) {
          views = views.filter((view: any) => 
            view.video_id === videoId || view.video_filename === videoId
          );
        }
        if (dateFrom) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) >= dateFrom
          );
        }
        if (dateTo) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) <= dateTo
          );
        }
      }
      
      return this.calculateEngagementMetrics(views);
    } catch (error) {
      console.error('❌ Error getting video engagement metrics:', error);
      return {
        totalViews: 0,
        uniqueViews: 0,
        reWatchViews: 0,
        avgCompletionRate: 0,
        bestCompletionRate: 0,
        totalWatchTime: 0,
        avgWatchTime: 0,
        engagementScore: 0
      };
    }
  }

  async getUniqueVideoViews(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      console.log('📊 Getting unique gallery video views analytics');
      
      if (this.supabase) {
        try {
          // Database implementation
          let query = this.supabase
            .from('analytics_views')
            .select('*')
            // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
            .not('video_filename', 'in', '("VideoHero1.mp4","VideoHero2.mp4","VideoHero3.mp4")');
          
          if (dateFrom) {
            query = query.gte('created_at', dateFrom);
          }
          if (dateTo) {
            query = query.lte('created_at', dateTo);
          }
          
          const { data: views, error } = await query;
          if (error) throw error;
          
          return this.groupUniqueViews(views || []);
        } catch (dbError) {
          console.log('📊 Database error, falling back to JSON:', dbError);
          // Fall through to JSON implementation
        }
      }
      
      // JSON fallback implementation
      const filePath = join(process.cwd(), 'server/data/analytics-views.json');
      let views = [];
      
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf8');
        views = JSON.parse(data)
          // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
          .filter((view: any) => !['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(view.video_filename));
        
        // Apply filters
        if (dateFrom) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) >= dateFrom
          );
        }
        if (dateTo) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) <= dateTo
          );
        }
      }
      
      return this.groupUniqueViews(views);
    } catch (error) {
      console.error('❌ Error getting unique video views:', error);
      return [];
    }
  }

  async getVideoReEngagementAnalytics(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      console.log('📊 Getting gallery video re-engagement analytics');
      
      if (this.supabase) {
        try {
          // Database implementation
          let query = this.supabase
            .from('analytics_views')
            .select('*')
            // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
            .not('video_filename', 'in', '("VideoHero1.mp4","VideoHero2.mp4","VideoHero3.mp4")');
          
          if (dateFrom) {
            query = query.gte('created_at', dateFrom);
          }
          if (dateTo) {
            query = query.lte('created_at', dateTo);
          }
          
          const { data: views, error } = await query;
          if (error) throw error;
          
          return this.analyzeReEngagement(views || []);
        } catch (dbError) {
          console.log('📊 Database error, falling back to JSON:', dbError);
          // Fall through to JSON implementation
        }
      }
      
      // JSON fallback implementation
      const filePath = join(process.cwd(), 'server/data/analytics-views.json');
      let views = [];
      
      if (existsSync(filePath)) {
        const data = readFileSync(filePath, 'utf8');
        views = JSON.parse(data)
          // Exclude hero videos from analytics (auto-play videos don't provide meaningful engagement data)
          .filter((view: any) => !['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(view.video_filename));
        
        // Apply filters
        if (dateFrom) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) >= dateFrom
          );
        }
        if (dateTo) {
          views = views.filter((view: any) => 
            (view.created_at || view.timestamp) <= dateTo
          );
        }
      }
      
      return this.analyzeReEngagement(views);
    } catch (error) {
      console.error('❌ Error getting re-engagement analytics:', error);
      return [];
    }
  }

  private calculateEngagementMetrics(views: any[]): any {
    if (views.length === 0) {
      return {
        totalViews: 0,
        uniqueViews: 0,
        reWatchViews: 0,
        avgCompletionRate: 0,
        bestCompletionRate: 0,
        totalWatchTime: 0,
        avgWatchTime: 0,
        engagementScore: 0
      };
    }

    // Group by session + video to identify unique views vs re-watches
    const sessionVideoGroups = new Map();
    
    views.forEach((view: any) => {
      const key = `${view.session_id || view.sessionId}_${view.video_id || view.video_filename}`;
      
      if (!sessionVideoGroups.has(key)) {
        sessionVideoGroups.set(key, []);
      }
      sessionVideoGroups.get(key).push(view);
    });

    const uniqueViews = sessionVideoGroups.size;
    const reWatchViews = views.length - uniqueViews;
    
    // Calculate best completion rate per unique view
    const completionRates: number[] = [];
    const watchTimes: number[] = [];
    
    sessionVideoGroups.forEach((viewGroup: any[]) => {
      // Find highest completion percentage for this session+video combination
      const bestCompletion = Math.max(
        ...viewGroup.map(v => parseFloat(v.completion_percentage || v.completionRate || '0'))
      );
      
      // Sum total watch time for this session+video combination
      const totalWatchTime = viewGroup.reduce((sum, v) => 
        sum + (parseInt(v.view_duration || v.duration_watched || v.watch_time || '0')), 0
      );
      
      completionRates.push(bestCompletion);
      watchTimes.push(totalWatchTime);
    });

    const avgCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
    const bestCompletionRate = Math.max(...completionRates);
    const totalWatchTime = watchTimes.reduce((a, b) => a + b, 0);
    const avgWatchTime = totalWatchTime / uniqueViews;
    
    // Calculate engagement score (0-100) based on completion rate and re-watch behavior
    const reWatchRatio = reWatchViews / views.length;
    const engagementScore = Math.round(
      (avgCompletionRate * 0.7) + (reWatchRatio * 100 * 0.3)
    );

    return {
      totalViews: views.length,
      uniqueViews,
      reWatchViews,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      bestCompletionRate: Math.round(bestCompletionRate * 100) / 100,
      totalWatchTime,
      avgWatchTime: Math.round(avgWatchTime),
      engagementScore: Math.min(100, engagementScore)
    };
  }

  private groupUniqueViews(views: any[]): any[] {
    const sessionVideoGroups = new Map();
    
    views.forEach((view: any) => {
      const videoId = view.video_id || view.video_filename;
      const sessionId = view.session_id || view.sessionId;
      const key = `${sessionId}_${videoId}`;
      
      if (!sessionVideoGroups.has(key)) {
        sessionVideoGroups.set(key, {
          videoId,
          sessionId,
          views: [],
          bestCompletion: 0,
          totalWatchTime: 0,
          viewCount: 0,
          firstViewAt: null,
          lastViewAt: null
        });
      }
      
      const group = sessionVideoGroups.get(key);
      group.views.push(view);
      group.viewCount++;
      
      const completion = parseFloat(view.completion_percentage || view.completionRate || '0');
      const watchTime = parseInt(view.view_duration || view.duration_watched || view.watch_time || '0');
      const viewTime = view.created_at || view.timestamp;
      
      group.bestCompletion = Math.max(group.bestCompletion, completion);
      group.totalWatchTime += watchTime;
      
      if (!group.firstViewAt || viewTime < group.firstViewAt) {
        group.firstViewAt = viewTime;
      }
      if (!group.lastViewAt || viewTime > group.lastViewAt) {
        group.lastViewAt = viewTime;
      }
    });

    return Array.from(sessionVideoGroups.values()).map(group => ({
      videoId: group.videoId,
      sessionId: group.sessionId,
      isUniqueView: group.viewCount === 1,
      isReWatch: group.viewCount > 1,
      reWatchCount: group.viewCount - 1,
      bestCompletionRate: group.bestCompletion,
      totalWatchTime: group.totalWatchTime,
      avgWatchTime: group.totalWatchTime / group.viewCount,
      firstViewAt: group.firstViewAt,
      lastViewAt: group.lastViewAt,
      engagementLevel: group.viewCount > 1 ? 'high' : 
                      group.bestCompletion >= 80 ? 'medium' : 'low'
    }));
  }

  private analyzeReEngagement(views: any[]): any[] {
    const videoAnalytics = new Map();
    
    // Group all views by video
    views.forEach((view: any) => {
      const videoId = view.video_id || view.video_filename;
      
      if (!videoAnalytics.has(videoId)) {
        videoAnalytics.set(videoId, {
          videoId,
          totalViews: 0,
          uniqueViewers: new Set(),
          reWatchingSessions: new Set(),
          sessionViews: new Map()
        });
      }
      
      const analytics = videoAnalytics.get(videoId);
      const sessionId = view.session_id || view.sessionId;
      
      analytics.totalViews++;
      analytics.uniqueViewers.add(sessionId);
      
      if (!analytics.sessionViews.has(sessionId)) {
        analytics.sessionViews.set(sessionId, []);
      }
      analytics.sessionViews.get(sessionId).push(view);
      
      // Mark as re-watching session if more than 1 view
      if (analytics.sessionViews.get(sessionId).length > 1) {
        analytics.reWatchingSessions.add(sessionId);
      }
    });

    return Array.from(videoAnalytics.values()).map(analytics => {
      const uniqueViewers = analytics.uniqueViewers.size;
      const reWatchingSessions = analytics.reWatchingSessions.size;
      const reWatchRate = (reWatchingSessions / uniqueViewers) * 100;
      
      // Calculate average views per session for re-watchers
      let totalReWatchViews = 0;
      analytics.reWatchingSessions.forEach((sessionId: string) => {
        totalReWatchViews += analytics.sessionViews.get(sessionId).length;
      });
      
      const avgViewsPerReWatcher = reWatchingSessions > 0 ? 
        totalReWatchViews / reWatchingSessions : 0;

      return {
        videoId: analytics.videoId,
        totalViews: analytics.totalViews,
        uniqueViewers,
        reWatchingSessions,
        reWatchRate: Math.round(reWatchRate * 100) / 100,
        avgViewsPerReWatcher: Math.round(avgViewsPerReWatcher * 100) / 100,
        engagementLevel: reWatchRate >= 30 ? 'high' : 
                        reWatchRate >= 15 ? 'medium' : 'low',
        businessInsight: reWatchRate >= 25 ? 
          'Highly engaging content - consider promoting' :
          reWatchRate >= 10 ? 
          'Moderately engaging - test with different audiences' :
          'Low re-engagement - review content effectiveness'
      };
    });
  }

  // Time-series Analytics Implementation
  async getTimeSeriesData(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      console.log(`📈 Getting time-series analytics data from ${dateFrom || 'beginning'} to ${dateTo || 'now'}`);
      
      // Use filtered analytics methods to exclude test data
      const sessions = await this.getAnalyticsSessions(dateFrom, dateTo);
      const views = await this.getAnalyticsViews({ dateFrom, dateTo });
      
      console.log(`📊 Filtered data results: sessions=${sessions?.length || 0}, views=${views?.length || 0}`);
      
      return this.aggregateTimeSeriesData(sessions, views);
    } catch (error) {
      console.error('❌ Error fetching time-series data:', error);
      return [];
    }
  }

  private aggregateTimeSeriesData(sessions: any[], views: any[]): any[] {
    const dailyData = new Map();
    console.log(`🔍 Aggregating: ${sessions.length} sessions, ${views.length} views`);

    // Process sessions for daily visitor counts
    sessions.forEach((session: any) => {
      const date = new Date(session.created_at || session.timestamp);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, {
          date: dayKey,
          visitors: new Set(),
          totalViews: 0,
          uniqueViews: new Set(),
          countries: new Set(),
          avgSessionDuration: 0,
          sessionsCount: 0
        });
      }
      
      const dayStats = dailyData.get(dayKey);
      dayStats.visitors.add(session.session_id || session.sessionId);
      dayStats.sessionsCount++;
      
      if (session.country) {
        dayStats.countries.add(session.country);
      }
    });

    // Process views for daily view counts
    views.forEach((view: any) => {
      const date = new Date(view.created_at || view.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      
      if (!dailyData.has(dayKey)) {
        dailyData.set(dayKey, {
          date: dayKey,
          visitors: new Set(),
          totalViews: 0,
          uniqueViews: new Set(),
          countries: new Set(),
          avgSessionDuration: 0,
          sessionsCount: 0
        });
      }
      
      const dayStats = dailyData.get(dayKey);
      dayStats.totalViews++;
      
      const uniqueKey = `${view.session_id || view.sessionId}_${view.video_id || view.video_filename}`;
      dayStats.uniqueViews.add(uniqueKey);
    });

    // Convert to array and calculate final metrics
    const timeSeriesData = Array.from(dailyData.entries())
      .map(([date, stats]: [string, any]) => ({
        date,
        visitors: stats.visitors.size,
        totalViews: stats.totalViews,
        uniqueViews: stats.uniqueViews.size,
        countries: stats.countries.size,
        sessions: stats.sessionsCount,
        // Calculate average views per visitor
        viewsPerVisitor: stats.visitors.size > 0 ? 
          Math.round((stats.totalViews / stats.visitors.size) * 100) / 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`📊 Generated time-series data for ${timeSeriesData.length} days`);
    return timeSeriesData;
  }

  // Check if an IP address is excluded from analytics tracking
  async checkIPExclusion(ipAddress: string | null, userAgent: string = ''): Promise<boolean> {
    if (!ipAddress) {
      return false;
    }

    // TEMPORARY FIX: Skip database query until table is created
    // Check if it's your admin IP and exclude it
    if (ipAddress === '109.17.150.48') {
      console.log(`🚫 IP EXCLUDED: ${ipAddress} (admin IP - hardcoded exclusion)`);
      return true;
    }
    return false;

    /* DISABLED UNTIL TABLE EXISTS */
    /*
    try {
      // First check database for active exclusions
      const { data: exclusions, error } = await this.supabase
        .from('analytics_exclusions')
        .select('ip_cidr, label, user_agent')
        .eq('active', true);

      if (error) {
        console.warn('⚠️ IP Exclusions: Database query failed:', error);
        return false;
      }

      if (exclusions && exclusions.length > 0) {
        for (const exclusion of exclusions) {
          // Check IP CIDR match
          if (this.isIPInCIDR(ipAddress, exclusion.ip_cidr)) {
            console.log(`🚫 IP EXCLUDED: ${ipAddress} matches ${exclusion.ip_cidr} (${exclusion.label})`);
            return true;
          }
          
          // Check user agent match if specified
          if (exclusion.user_agent && userAgent.includes(exclusion.user_agent)) {
            console.log(`🚫 USER AGENT EXCLUDED: ${userAgent} matches ${exclusion.user_agent} (${exclusion.label})`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn('⚠️ IP Exclusions: Database check failed:', error);
      return false;
    }
    */
  }

  // Helper function to check if an IP is within a CIDR range
  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      // If CIDR is just an IP without mask, do exact match
      if (!cidr.includes('/')) {
        return ip === cidr;
      }

      const [network, maskBits] = cidr.split('/');
      const mask = parseInt(maskBits, 10);
      
      if (mask < 0 || mask > 32) {
        return false;
      }

      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
      
      return (ipNum & maskNum) === (networkNum & maskNum);
    } catch (error) {
      console.warn(`⚠️ CIDR check failed for ${ip} in ${cidr}:`, error);
      return false;
    }
  }

  // Convert IP address to 32-bit number
  private ipToNumber(ip: string): number {
    if (!ip || typeof ip !== 'string') {
      throw new Error(`Invalid IP address: ${ip}`);
    }
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  // IP Exclusions Management Methods
  async getIpExclusions(): Promise<any[]> {
    try {
      console.log('🔍 IP Exclusions: Temporarily using JSON fallback only (database table missing)');
      
      // TEMPORARY FIX: Skip database query until table is created
      return this.loadJsonFile('ip-exclusions.json') || [];
    } catch (error) {
      console.warn('⚠️ IP Exclusions: JSON fallback failed:', error);
      return [];
    }
  }

  async createIpExclusion(exclusionData: any): Promise<any> {
    try {
      console.log('🔍 Creating IP Exclusion in Supabase database...');
      
      const newExclusion = {
        ...exclusionData,
        id: `exclusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('analytics_exclusions')
        .insert([newExclusion])
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Create IP Exclusion: Database insert failed, using JSON fallback:', error);
        throw error;
      }

      if (data) {
        console.log('✅ IP Exclusion created in Supabase');
        return data;
      }
      
      return newExclusion;
    } catch (error) {
      console.warn('⚠️ Create IP Exclusion: Supabase connection failed, using JSON fallback:', error);
      
      // Fallback to JSON
      try {
        const exclusions = this.loadJsonFile('ip-exclusions.json') || [];
        const newExclusion = {
          ...exclusionData,
          id: `exclusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        exclusions.push(newExclusion);
        this.saveJsonFile('ip-exclusions.json', exclusions);
        
        return newExclusion;
      } catch (jsonError) {
        console.error('Error creating IP exclusion in JSON:', jsonError);
        throw jsonError;
      }
    }
  }

  async updateIpExclusion(id: string, updates: any): Promise<any> {
    try {
      console.log(`🔍 Updating IP Exclusion ${id} in Supabase database...`);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('analytics_exclusions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Update IP Exclusion: Database update failed, using JSON fallback:', error);
        throw error;
      }

      if (data) {
        console.log('✅ IP Exclusion updated in Supabase');
        return data;
      }
      
      return { id, ...updateData };
    } catch (error) {
      console.warn('⚠️ Update IP Exclusion: Supabase connection failed, using JSON fallback:', error);
      
      // Fallback to JSON
      try {
        const exclusions = this.loadJsonFile('ip-exclusions.json') || [];
        const index = exclusions.findIndex((item: any) => item.id === id);
        
        if (index === -1) {
          throw new Error('IP exclusion not found');
        }
        
        exclusions[index] = {
          ...exclusions[index],
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        this.saveJsonFile('ip-exclusions.json', exclusions);
        
        return exclusions[index];
      } catch (jsonError) {
        console.error('Error updating IP exclusion in JSON:', jsonError);
        throw jsonError;
      }
    }
  }

  async deleteIpExclusion(id: string): Promise<void> {
    try {
      console.log(`🔍 Deleting IP Exclusion ${id} from Supabase database...`);
      
      const { error } = await this.supabase
        .from('analytics_exclusions')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('⚠️ Delete IP Exclusion: Database delete failed, using JSON fallback:', error);
        throw error;
      }

      console.log('✅ IP Exclusion deleted from Supabase');
    } catch (error) {
      console.warn('⚠️ Delete IP Exclusion: Supabase connection failed, using JSON fallback:', error);
      
      // Fallback to JSON
      try {
        const exclusions = this.loadJsonFile('ip-exclusions.json') || [];
        const filteredExclusions = exclusions.filter((item: any) => item.id !== id);
        
        if (filteredExclusions.length === exclusions.length) {
          throw new Error('IP exclusion not found');
        }
        
        this.saveJsonFile('ip-exclusions.json', filteredExclusions);
      } catch (jsonError) {
        console.error('Error deleting IP exclusion from JSON:', jsonError);
        throw jsonError;
      }
    }
  }

  async createBlogPostView(viewData: any): Promise<any> {
    try {
      console.log(`📊 Creating blog post view: ${viewData.post_slug}`);
      
      const newView = {
        id: `blog_view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        post_slug: viewData.post_slug,
        post_title: viewData.post_title,
        language: viewData.language,
        session_id: viewData.session_id,
        ip_address: viewData.ip_address,
        created_at: new Date().toISOString()
      };

      // Try Supabase first
      const { data, error } = await this.supabase
        .from('blog_post_views')
        .insert([newView])
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Blog Post View: Database insert failed, using JSON fallback:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Blog post view created in Supabase');
        return data;
      }
      
      return newView;
    } catch (error) {
      console.warn('⚠️ Blog Post View: Supabase connection failed, using JSON fallback:', error);
      
      // Fallback to JSON
      try {
        const views = this.loadJsonFile('blog-post-views.json') || [];
        const newView = {
          id: `blog_view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          post_slug: viewData.post_slug,
          post_title: viewData.post_title,
          language: viewData.language,
          session_id: viewData.session_id,
          ip_address: viewData.ip_address,
          created_at: new Date().toISOString()
        };
        
        views.push(newView);
        this.saveJsonFile('blog-post-views.json', views);
        
        console.log('✅ Blog post view created in JSON');
        return newView;
      } catch (jsonError) {
        console.error('Error creating blog post view in JSON:', jsonError);
        throw jsonError;
      }
    }
  }

  async getBlogPostViews(options?: { dateFrom?: string, dateTo?: string, postSlug?: string }): Promise<any[]> {
    const { dateFrom, dateTo, postSlug } = options || {};
    
    try {
      console.log(`📊 Fetching blog post views from Supabase...`);
      
      let query = this.supabase
        .from('blog_post_views')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        const dateToEndOfDay = dateTo.includes('T') ? dateTo : dateTo + 'T23:59:59.999Z';
        query = query.lte('created_at', dateToEndOfDay);
      }
      if (postSlug) {
        query = query.eq('post_slug', postSlug);
      }

      const { data, error } = await query;

      if (error) {
        console.error('⚠️ Blog Post Views: Supabase query error:', error);
        throw error;
      }

      if (data) {
        console.log(`✅ Retrieved ${data.length} blog post views from Supabase`);
        return data;
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Blog Post Views: Supabase connection failed, using JSON fallback:', error);
      
      // Fallback to JSON
      try {
        let views = this.loadJsonFile('blog-post-views.json') || [];
        
        if (dateFrom) {
          views = views.filter((view: any) => view.created_at >= dateFrom);
        }
        if (dateTo) {
          const dateToEndOfDay = dateTo.includes('T') ? dateTo : dateTo + 'T23:59:59.999Z';
          views = views.filter((view: any) => view.created_at <= dateToEndOfDay);
        }
        if (postSlug) {
          views = views.filter((view: any) => view.post_slug === postSlug);
        }
        
        console.log(`✅ Retrieved ${views.length} blog post views from JSON`);
        return views;
      } catch (jsonError) {
        console.error('Error getting blog post views from JSON:', jsonError);
        return [];
      }
    }
  }

  async getPopularBlogPosts(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      console.log(`📊 Fetching popular blog posts...`);
      
      const views = await this.getBlogPostViews({ dateFrom, dateTo });
      
      // Group by post slug and count views
      const postStats = new Map();
      
      views.forEach((view: any) => {
        const slug = view.post_slug;
        
        if (!postStats.has(slug)) {
          postStats.set(slug, {
            post_slug: slug,
            post_title: view.post_title,
            language: view.language,
            view_count: 0,
            last_viewed: view.created_at
          });
        }
        
        const stats = postStats.get(slug);
        stats.view_count++;
        
        // Track most recent view
        if (view.created_at > stats.last_viewed) {
          stats.last_viewed = view.created_at;
        }
      });
      
      // Convert to array and sort by view count
      const popularPosts = Array.from(postStats.values())
        .sort((a, b) => b.view_count - a.view_count);
      
      console.log(`✅ Found ${popularPosts.length} unique blog posts`);
      return popularPosts;
    } catch (error) {
      console.error('Error getting popular blog posts:', error);
      return [];
    }
  }

  async getBlogViewTrends(dateFrom?: string, dateTo?: string): Promise<any[]> {
    try {
      console.log(`📊 Fetching blog view trends...`);
      
      const views = await this.getBlogPostViews({ dateFrom, dateTo });
      
      // Group by date and count views
      const dateStats = new Map<string, number>();
      
      views.forEach((view: any) => {
        const date = new Date(view.created_at);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        dateStats.set(dateKey, (dateStats.get(dateKey) || 0) + 1);
      });
      
      // Convert to array and sort by date
      const trends = Array.from(dateStats.entries())
        .map(([date, views]) => ({ date, views }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      console.log(`✅ Found ${trends.length} days of blog view data`);
      return trends;
    } catch (error) {
      console.error('Error getting blog view trends:', error);
      return [];
    }
  }
}

// Create singleton instance
export const hybridStorage = new HybridStorage();