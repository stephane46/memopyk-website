import type { Express } from "express";
import { createServer, type Server } from "http";
import { DateTime } from "luxon";
import { hybridStorage } from "./hybrid-storage";
import { pool } from "./db";
import { z } from "zod";
import { videoCache } from "./video-cache";
import PDFDocument from "pdfkit";
import fs, { createReadStream, existsSync, statSync, mkdirSync, openSync, closeSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import testRoutes from './test-routes';
import adminCountryNames from './routes/adminCountryNames';
import { setCacheAndOriginHeaders } from './cache-origin-headers';
import { createCacheHitHeaders, createCacheMissHeaders, getUpstreamSource, getCacheAge } from './cache-delivery-headers';
import { analyticsCleanupRoutes } from './routes-analytics-cache-cleanup';
import { LocationService } from './location-service';
import { EnrichmentManager } from './services/location-enrichment';
import {
  qSessions,
  qPlays,
  qCompletes,
  qWatchTimeTotal,
  qAverageSessionDuration,
  qTopLanguages,
  qTopReferrers,
  qSiteLanguageChoice,
  qTotalUsers,
  qReturningUsers,
  qPlaysByVideo,
  qWatchTimeByVideo,
  qProgressByVideo,
  qVideoFunnel,
  qTrend,
  qSessionsTrend,
  qSessionsTrendWithComparison,
  qTrendDaily,
  qRealtime,
  qTopCountries,
  getTopVideosTable,
  client as ga4Client,
  PROPERTY as GA4_PROPERTY
} from './ga4-service';
import { getCache, setCache, k, getDbCache, setDbCache } from './cache';
import { geoResolver } from './geoResolver';
import ga4MpRouter from './routes/ga4Mp';
import { getRealtimeTopVideos, getRealtimeVideoProgress } from './routes/ga4Realtime';
import partnersRoute from './routes/partners';
import analyticsEventsRouter from './routes/analytics-events';
import crypto from 'crypto';
import { sameLang, toBase } from './helpers/lang';

// Paris timezone window computation function
const PARIS_ZONE = "Europe/Paris";

function parisDay(d = DateTime.now().setZone(PARIS_ZONE)) { 
  return d.setZone(PARIS_ZONE).startOf("day"); 
}

function computeParisWindow(query: any) {
  const today = parisDay();
  let start = today;
  let end = today;

  if (query.preset === "yesterday") { 
    start = today.minus({ days: 1 });
    end = today; // End of yesterday = start of today (exclusive)
  } else if (query.preset === "today") {
    start = today;
    end = today.plus({ days: 1 }); // End of today = start of tomorrow (exclusive)
  } else if (query.preset === "7d") { 
    start = today.minus({ days: 6 }); 
    end = today;
  } else if (query.preset === "30d") { 
    start = today.minus({ days: 29 }); 
    end = today;
  } else if (query.preset === "90d") { 
    start = today.minus({ days: 89 }); 
    end = today;
  } else if (query.start && query.end) {
    start = DateTime.fromISO(query.start, { zone: PARIS_ZONE }).startOf("day");
    end = DateTime.fromISO(query.end, { zone: PARIS_ZONE }).startOf("day");
  } else if (query.startDate && query.endDate) {
    start = DateTime.fromISO(query.startDate, { zone: PARIS_ZONE }).startOf("day");
    end = DateTime.fromISO(query.endDate, { zone: PARIS_ZONE }).startOf("day");
  }

  // Apply Since filter if provided
  const since = query.since ? DateTime.fromISO(query.since, { zone: PARIS_ZONE }).startOf("day") : null;
  const effStart = since ? DateTime.max(start, since) : start;

  return {
    startStr: start.toFormat("yyyy-LL-dd"),
    endStr: end.toFormat("yyyy-LL-dd"),
    effStartStr: effStart.toFormat("yyyy-LL-dd"),
    effEndStr: end.toFormat("yyyy-LL-dd"),
    // NEW: ISO timestamps for exclusive filtering
    startIso: start.toUTC().toISO(),
    endIso: end.toUTC().toISO(),
    effStartIso: effStart.toUTC().toISO(),
    effEndIso: end.toUTC().toISO(),
    timezone: PARIS_ZONE
  };
}

function setParisTimezoneHeaders(res: any, query: any) {
  const window = computeParisWindow(query);
  res.set({
    "X-Timezone": window.timezone,
    "X-Window-Start": window.startStr,
    "X-Window-End": window.endStr,
    "X-Effective-Start": window.effStartStr,
    "X-Effective-End": window.effEndStr,
  });
  return window;
}

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  package: z.string().min(1, "Please select a package"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Generate signed upload URL for direct Supabase uploads
async function generateSignedUploadUrl(filename: string, bucket: string): Promise<{ signedUrl: string; publicUrl: string }> {
  try {
    // Keep original filename - no timestamp prefix for gallery uploads
    const uniqueFilename = filename;
    console.log(`📁 SIGNED UPLOAD URL - Using original filename: ${uniqueFilename}`);
    
    // Create signed URL for upload (expires in 1 hour)
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFilename, {
        upsert: true, // Allow overwriting existing files
        expiresIn: 3600 // 1 hour expiration
      });

    if (signedError) {
      console.error('❌ Failed to generate signed URL:', signedError);
      throw new Error(`Failed to generate signed URL: ${signedError.message}`);
    }

    // Get public URL for the file
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFilename);

    console.log(`✅ Generated signed upload URL for: ${uniqueFilename}`);
    
    return {
      signedUrl: signedUrlData.signedUrl,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error('❌ Error generating signed upload URL:', error);
    throw error;
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Upload directory ready: ${uploadsDir}`);
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}

// Configure disk storage for videos (safer for large files)
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename - no timestamp prefix for gallery videos
    const originalName = file.originalname;
    console.log(`📁 GALLERY VIDEO UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

// Configure multer for file uploads
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 5000 * 1024 * 1024, // 5000MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    console.log(`📁 ENHANCED FILE DETECTION v2.0 - File upload attempt:`);
    console.log(`   - Filename: ${file.originalname}`);
    console.log(`   - MIME type: ${file.mimetype}`);
    console.log(`   - Size: ${(file.size || 0)} bytes (${((file.size || 0) / 1024 / 1024).toFixed(2)}MB)`);
    
    // Check both MIME type and file extension for better compatibility
    const isVideoMimeType = file.mimetype.startsWith('video/');
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv', '.wmv'];
    const hasVideoExtension = videoExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    console.log(`🔍 VALIDATION CHECKS:`);
    console.log(`   - MIME type check (${file.mimetype}): ${isVideoMimeType}`);
    console.log(`   - Extension check (${file.originalname}): ${hasVideoExtension}`);
    console.log(`   - File size under 5000MB: ${((file.size || 0) / 1024 / 1024) < 5000}`);
    
    if (isVideoMimeType || hasVideoExtension) {
      console.log(`✅ VIDEO FILE ACCEPTED: ${file.originalname} (Enhanced detection v2.0 - ${isVideoMimeType ? 'MIME' : 'EXTENSION'} match)`);
      cb(null, true);
    } else {
      console.log(`❌ FILE REJECTED - NOT A VIDEO: ${file.originalname}`);
      console.log(`   - MIME type: ${file.mimetype} (expected: video/*)`);
      console.log(`   - Extension: ${file.originalname.split('.').pop()} (expected: ${videoExtensions.join(', ')})`);
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Configure disk storage for images  
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename - no timestamp prefix for gallery images
    const originalName = file.originalname;
    console.log(`📁 GALLERY IMAGE UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5000 * 1024 * 1024, // 5000MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize location service
const locationService = new LocationService(hybridStorage);

// Initialize enrichment manager
const enrichmentManager = EnrichmentManager.getInstance(hybridStorage, locationService);

export async function registerRoutes(app: Express): Promise<void> {
  // GA4 Measurement Protocol Relay (ad-blocker bypass)
  app.use("/api", ga4MpRouter);
  
  // GA4 Realtime API endpoints for instant verification
  app.get("/api/ga4/realtime/topVideos", getRealtimeTopVideos);
  app.get("/api/ga4/realtime/videoProgress", getRealtimeVideoProgress);
  
  // CSRF token endpoint for partner intake forms
  app.get("/api/csrf", (req, res) => {
    const token = crypto.randomBytes(16).toString("hex");
    res.cookie("csrfToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.json({ token });
  });
  
  // Partner intake route
  app.use(partnersRoute);
  
  // Analytics events route
  app.use('/api/analytics', analyticsEventsRouter);
  
  // MEMOPYK Platform Content API Routes
  
  // Hero Videos - Video carousel content
  app.get("/api/hero-videos", async (req, res) => {
    try {
      const videos = await hybridStorage.getHeroVideos();
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero videos" });
    }
  });

  // Create new hero video entry
  app.post("/api/hero-videos", async (req, res) => {
    try {
      const { title_en, title_fr, url_en, url_fr, use_same_video, is_active, order_index } = req.body;
      
      // Validate required fields
      if (!title_en || !title_fr || !url_en) {
        return res.status(400).json({ error: "Missing required fields: title_en, title_fr, url_en" });
      }

      // Create new hero video
      const newVideo = await hybridStorage.createHeroVideo({
        title_en,
        title_fr,
        url_en,
        url_fr: url_fr || url_en,
        use_same_video: use_same_video || true,
        is_active: is_active || false,
        order_index: order_index || 1
      });

      res.json(newVideo);
    } catch (error) {
      console.error('Create hero video error:', error);
      res.status(500).json({ error: "Failed to create hero video" });
    }
  });

  // Update hero video order
  app.patch("/api/hero-videos/:id/reorder", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { order_index } = req.body;
      
      if (!order_index || order_index < 1) {
        return res.status(400).json({ error: "Valid order_index is required" });
      }
      
      const result = await hybridStorage.updateHeroVideoOrder(videoId, order_index);
      res.json({ success: true, video: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to update video order" });
    }
  });

  // Hero video PATCH endpoint - update video metadata
  // Add toggle endpoint for active/inactive status
  app.patch("/api/hero-videos/:id/toggle", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { is_active } = req.body;
      
      const result = await hybridStorage.updateHeroVideo(videoId, {
        is_active,
        updated_at: new Date().toISOString()
      });
      
      res.json(result);
    } catch (error) {
      console.error('Hero video toggle error:', error);
      res.status(500).json({ error: "Failed to toggle hero video status" });
    }
  });

  app.patch("/api/hero-videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { title_en, title_fr, is_active, order_index, url_en, url_fr, use_same_video } = req.body;
      
      const result = await hybridStorage.updateHeroVideo(videoId, {
        title_en,
        title_fr,
        is_active,
        order_index,
        url_en,
        url_fr,
        use_same_video,
        updated_at: new Date().toISOString()
      });
      
      res.json(result);
    } catch (error) {
      console.error('Hero video update error:', error);
      res.status(500).json({ error: "Failed to update hero video" });
    }
  });

  // Hero video DELETE endpoint
  app.delete("/api/hero-videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      console.log(`🗑️ Deleting hero video with ID: ${videoId}`);
      
      const result = await hybridStorage.deleteHeroVideo(videoId);
      res.json({ success: true, deletedVideo: result });
    } catch (error: any) {
      console.error('Hero video delete error:', error);
      if (error.message === 'Video not found') {
        res.status(404).json({ error: "Video not found" });
      } else {
        res.status(500).json({ error: "Failed to delete hero video" });
      }
    }
  });

  // Gallery Items - CRUD operations with file upload support
  let galleryCache: { data: any[], timestamp: number } | null = null;
  const GALLERY_CACHE_TTL = 30000; // 30 seconds cache
  
  app.get("/api/gallery", async (req, res) => {
    try {
      const now = Date.now();
      const bypassCache = req.headers['x-test-bypass-cache'] === '1';
      
      // Check if cache is valid and not bypassing
      if (!bypassCache && galleryCache && (now - galleryCache.timestamp) < GALLERY_CACHE_TTL) {
        console.log(`📋 Gallery data served from cache (${Math.round((now - galleryCache.timestamp) / 1000)}s old)`);
        
        // Set cache headers for performance testing
        const deliveryHeaders = createCacheHitHeaders('local');
        res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
        res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
        res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
        res.setHeader('X-Content-Bytes', String(JSON.stringify(galleryCache.data).length));
        
        return res.json(galleryCache.data);
      }
      
      // Cache miss or expired - fetch fresh data
      const items = await hybridStorage.getGalleryItems();
      galleryCache = { data: items, timestamp: now };
      console.log(`🔄 Gallery data fetched from database and cached`);
      
      // Set cache headers for performance testing
      const deliveryHeaders = createCacheMissHeaders('local');
      res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
      res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
      res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
      res.setHeader('X-Content-Bytes', String(JSON.stringify(items).length));
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const item = await hybridStorage.createGalleryItem(req.body);
      // Clear gallery cache on creates
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to creation');
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create gallery item" });
    }
  });

  // Admin Gallery endpoint - for admin interface with cache bypass
  app.get("/api/admin/gallery", async (req, res) => {
    try {
      // Always bypass cache for admin to get fresh data
      const items = await hybridStorage.getGalleryItems();
      console.log(`🔄 Admin gallery data fetched directly (bypassing cache)`);
      res.json(items);
    } catch (error) {
      console.error('Admin gallery fetch error:', error);
      res.status(500).json({ error: "Failed to get admin gallery items" });
    }
  });

  // DIAGNOSTIC ENDPOINT: Investigate locale values in GA4 data
  app.get("/api/ga4/locales-debug", async (req, res) => {
    try {
      const { startDate = '2025-09-07', endDate = '2025-09-13' } = req.query;
      console.log(`🔍 LOCALE DEBUG REQUEST: ${startDate} to ${endDate}`);
      
      const { qAllLocales } = await import('./ga4-service.js');
      const locales = await qAllLocales(String(startDate), String(endDate));
      
      console.log(`🌍 LOCALE DEBUG RESULT: Found ${locales.length} unique locale values`);
      res.json({ 
        dateRange: { startDate, endDate },
        locales,
        summary: {
          totalLocales: locales.length,
          totalSessions: locales.reduce((sum, l) => sum + l.sessions, 0)
        }
      });
    } catch (error) {
      console.error('❌ Locale debug error:', error);
      res.status(500).json({ error: "Failed to debug locales" });
    }
  });

  app.patch("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      const updates = req.body;
      
      console.log('🚨 SERVER DEBUG - Gallery update received:', {
        itemId: itemId,
        video_filename: updates.video_filename,
        video_url_en: updates.video_url_en,
        title_en: updates.title_en,
        cropSettings: updates.cropSettings,
        fullUpdates: updates
      });
      console.log('🔍 CROP SETTINGS SERVER PATCH:', JSON.stringify(updates.cropSettings, null, 2));
      
      if (!itemId) {
        return res.status(400).json({ error: "Gallery item ID is required" });
      }
      
      const item = await hybridStorage.updateGalleryItem(itemId, updates);
      
      console.log('🚨 SERVER DEBUG - Gallery update completed:', {
        updated_video_filename: item.video_filename,
        updated_video_url_en: item.video_url_en
      });
      
      // CROSS-ENVIRONMENT SYNC: Notify other environments about the change
      console.log('🌍 CROSS-ENVIRONMENT: Gallery item updated in database - other environments will see changes after F5 refresh');
      
      // Clear gallery cache on updates
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to update');
      
      res.json(item);
    } catch (error: any) {
      console.error('Gallery update error:', error);
      res.status(500).json({ error: `Failed to update gallery item: ${error.message}` });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const itemId = req.params.id;
      console.log(`🗑️ Deleting gallery item with ID: ${itemId}`);
      
      if (!itemId || itemId.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const deletedItem = await hybridStorage.deleteGalleryItem(itemId);
      console.log(`✅ Successfully deleted gallery item: ${deletedItem.title_en || 'Untitled'}`);
      
      res.json({ success: true, deleted: deletedItem });
    } catch (error: any) {
      console.error('Gallery deletion error:', error);
      
      // Special handling for "item not found" - this is actually success for deletion
      if (error.message === 'Gallery item not found') {
        console.log(`✅ Item ${req.params.id} already deleted or never existed - treating as successful deletion`);
        return res.json({ 
          success: true, 
          message: 'Item was already deleted or does not exist',
          alreadyDeleted: true 
        });
      }
      
      res.status(500).json({ error: `Failed to delete gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id/reorder", async (req, res) => {
    try {
      const itemId = req.params.id;
      const { order_index } = req.body;
      
      console.log(`🔄 Reordering gallery item ${itemId} to position ${order_index}`);
      
      if (!itemId || itemId.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item ID" });
      }
      
      const item = await hybridStorage.updateGalleryItemOrder(itemId, order_index);
      console.log(`✅ Successfully reordered gallery item ${itemId}`);
      
      // Clear gallery cache after successful reorder
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to reorder');
      
      res.json(item);
    } catch (error: any) {
      console.error('Gallery reorder error:', error);
      res.status(500).json({ error: `Failed to reorder gallery item: ${error.message}` });
    }
  });

  app.patch("/api/gallery/:id1/swap/:id2", async (req, res) => {
    try {
      const itemId1 = req.params.id1;
      const itemId2 = req.params.id2;
      
      console.log(`🔄 Swapping gallery items ${itemId1} ↔ ${itemId2}`);
      
      if (!itemId1 || !itemId2 || itemId1.trim() === '' || itemId2.trim() === '') {
        return res.status(400).json({ error: "Invalid gallery item IDs" });
      }
      
      const result = await hybridStorage.swapGalleryItemOrder(itemId1, itemId2);
      console.log(`✅ Successfully swapped gallery items`);
      
      // CRITICAL FIX: Clear gallery cache after successful swap
      galleryCache = null;
      console.log('🗑️ Gallery cache cleared due to successful swap - UI will show fresh order immediately');
      
      res.json(result);
    } catch (error: any) {
      console.error('Gallery swap error:', error);
      res.status(500).json({ error: `Failed to swap gallery items: ${error.message}` });
    }
  });

  // Generate signed upload URL for direct Supabase uploads (bypasses Replit infrastructure limit)
  app.post("/api/upload/generate-signed-url", async (req, res) => {
    try {
      console.log("🔍 SIGNED URL REQUEST RECEIVED:", {
        body: req.body,
        headers: req.headers['content-type'],
        method: req.method
      });
      
      const { filename, fileType, bucket } = req.body;
      
      if (!filename || !bucket) {
        console.error("❌ Missing required fields:", { filename, fileType, bucket });
        return res.status(400).json({ error: "Filename and bucket are required" });
      }

      // Validate bucket name
      const allowedBuckets = ['memopyk-videos']; // Unified bucket for all media
      if (!allowedBuckets.includes(bucket)) {
        console.error("❌ Invalid bucket:", bucket);
        return res.status(400).json({ error: "Invalid bucket name" });
      }

      console.log(`🎬 GENERATING SIGNED URL for direct upload:`);
      console.log(`   - Original filename: ${filename}`);
      console.log(`   - File type: ${fileType}`);
      console.log(`   - Target bucket: ${bucket}`);

      const { signedUrl, publicUrl } = await generateSignedUploadUrl(filename, bucket);
      
      // Extract the actual filename from the public URL
      const actualFilename = publicUrl.split('/').pop();
      
      console.log("✅ Signed URL generated successfully:", actualFilename);
      
      res.json({
        success: true,
        signedUrl,
        publicUrl,
        filename: actualFilename
      });

    } catch (error) {
      console.error('❌ Failed to generate signed upload URL:', error);
      console.error('❌ Error details:', (error as any).message, (error as any).stack);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Server-side upload fallback for when direct upload fails
  app.post('/api/upload/server-side-upload', uploadImage.single('file'), async (req, res) => {
    try {
      console.log('🔄 SERVER-SIDE UPLOAD FALLBACK initiated');
      
      const file = req.file;
      const { bucket, filename } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!bucket || !filename) {
        return res.status(400).json({ error: 'Missing bucket or filename' });
      }

      console.log(`📁 Server uploading: ${filename} (${file.size} bytes) to bucket: ${bucket}`);

      // Upload file to Supabase storage from server
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, readFileSync(file.path), {
          contentType: file.mimetype,
          upsert: true
        });

      // Clean up temporary file
      try {
        unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up temporary file:', cleanupError);
      }

      if (error) {
        console.error('❌ Server-side upload failed:', error);
        return res.status(500).json({ error: `Upload failed: ${error.message}` });
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      console.log('✅ Server-side upload successful:', filename);

      res.json({
        success: true,
        filename,
        publicUrl: publicUrlData.publicUrl,
        uploadPath: data.path
      });

    } catch (error) {
      console.error('❌ Server-side upload error:', error);
      res.status(500).json({ 
        error: 'Server-side upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle completion of direct upload (for caching and database updates)
  app.post("/api/upload/complete-direct-upload", async (req, res) => {
    try {
      const { publicUrl, filename, bucket, fileType } = req.body;
      
      if (!publicUrl || !filename) {
        return res.status(400).json({ error: "Public URL and filename are required" });
      }

      console.log(`✅ COMPLETING DIRECT UPLOAD:`);
      console.log(`   - Public URL: ${publicUrl}`);
      console.log(`   - Filename: ${filename}`);
      console.log(`   - Bucket: ${bucket}`);

      // If it's a video, cache it immediately for better performance
      if (fileType?.startsWith('video/') || filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v)$/)) {
        try {
          console.log(`🎬 Auto-caching directly uploaded video: ${filename}`);
          const response = await fetch(publicUrl);
          if (response.ok) {
            await videoCache.cacheVideo(filename, response);
            console.log(`✅ Direct upload video cached successfully: ${filename}`);
          }
        } catch (cacheError) {
          console.error(`⚠️ Failed to cache direct upload video ${filename}:`, cacheError);
          // Don't fail the completion if caching fails
        }
      }

      // AUTO-GENERATE STATIC 300x200 THUMBNAIL for direct uploaded images
      let staticImageUrl = null;
      let autoCropSettings = null;
      
      if (fileType?.startsWith('image/') || filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        console.log(`🔍 STARTING DIRECT UPLOAD AUTO-THUMBNAIL PROCESS for: ${filename}`);
        
        try {
          console.log(`🤖 AUTO-GENERATING smart high-quality thumbnail for direct uploaded image: ${filename}`);
          
          // Download the image to process with Sharp
          const imageResponse = await fetch(publicUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
          }
          
          const imageBuffer = await imageResponse.arrayBuffer();
          const sharp = require('sharp');
          
          // Get image metadata to check if cropping is actually needed
          const metadata = await sharp(Buffer.from(imageBuffer)).metadata();
          const originalAspectRatio = metadata.width! / metadata.height!;
          const targetAspectRatio = 300 / 200; // 1.5 (3:2 ratio)
          const aspectRatioTolerance = 0.01; // Small tolerance for floating point comparison
          
          const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;
          
          // WEB-OPTIMIZED THUMBNAIL - balance quality with reasonable file sizes
          const thumbnailWidth = 800;  // Reasonable web resolution
          const thumbnailHeight = 533;  // 1.5 aspect ratio (800/533 ≈ 1.5)
          
          console.log(`🎯 WEB-OPTIMIZED SERVER CROP: Original ${metadata.width}x${metadata.height} → Thumbnail ${thumbnailWidth}x${thumbnailHeight}`);
          
          // Create high-quality thumbnail using smart dimensions
          const thumbnailBuffer = await sharp(Buffer.from(imageBuffer))
            .resize(thumbnailWidth, thumbnailHeight, {
              fit: needsCropping ? 'cover' : 'fill',  // Only crop if aspect ratio is different
              position: 'center'
            })
            .flatten({ background: { r: 255, g: 255, b: 255 } })  // White background for transparency
            .jpeg({ quality: 70, progressive: true, mozjpeg: true })  // Web-optimized quality
            .toBuffer();
          
          // Upload auto-generated thumbnail
          const staticFilename = `static_auto_${Date.now()}.jpg`;
          const { data: staticUploadData, error: staticUploadError } = await supabase.storage
            .from('memopyk-videos')
            .upload(staticFilename, thumbnailBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '300',
              upsert: true
            });

          if (!staticUploadError) {
            staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${staticFilename}`;
            
            // Only create cropSettings if actual cropping was performed
            if (needsCropping) {
              autoCropSettings = {
                method: 'sharp-auto-thumbnail',
                type: 'automatic',
                fit: 'cover',
                position: 'center',
                dimensions: { width: thumbnailWidth, height: thumbnailHeight },
                aspectRatio: { original: originalAspectRatio, target: targetAspectRatio },
                cropped: true,
                timestamp: new Date().toISOString()
              };
              console.log(`✅ Direct upload auto-cropped and generated static thumbnail: ${staticImageUrl}`);
            } else {
              // No cropSettings for images that didn't need cropping (already 3:2 ratio)
              autoCropSettings = null;
              console.log(`✅ Direct upload auto-resized static thumbnail (no cropping needed): ${staticImageUrl}`);
            }
          } else {
            console.warn(`⚠️ Failed to upload direct upload auto-generated thumbnail: ${staticUploadError.message}`);
          }
        } catch (autoGenError) {
          console.error(`❌ DIRECT UPLOAD AUTO-THUMBNAIL ERROR:`, autoGenError);
          console.error(`❌ Sharp processing failed for direct upload:`, (autoGenError as any).message, (autoGenError as any).stack);
        }
      }

      res.json({ 
        success: true,
        message: "Upload completed successfully",
        url: publicUrl,
        filename: filename,
        // Include auto-generated thumbnail info for images
        static_image_url: staticImageUrl,
        auto_crop_settings: autoCropSettings
      });

    } catch (error) {
      console.error('❌ Failed to complete direct upload:', error);
      res.status(500).json({ error: "Failed to complete upload" });
    }
  });

  // Upload gallery video endpoint with enhanced error handling (LEGACY - for files under 10MB)
  app.post("/api/gallery/upload-video", (req, res, next) => {
    uploadVideo.single('video')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            error: "File too large. Maximum size is 5000MB",
            code: "FILE_TOO_LARGE" 
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            error: "Unexpected file field. Use 'video' field",
            code: "INVALID_FIELD" 
          });
        }
        return res.status(400).json({ 
          error: err.message || "Upload failed",
          code: "UPLOAD_ERROR" 
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Use original filename - clean but preserve structure
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `gallery_${originalName}`;

      console.log(`📤 Uploading gallery video: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Clear cache if file exists (for overwrite scenario)
      videoCache.clearSpecificFile(filename);

      // Read file from disk and upload to Supabase storage (gallery bucket) with overwrite enabled
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const videoUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // Immediately cache the newly uploaded gallery video
      try {
        console.log(`🎬 Auto-caching uploaded gallery video: ${filename}`);
        const response = await fetch(videoUrl);
        if (response.ok) {
          await videoCache.cacheVideo(filename, response);
          console.log(`✅ Gallery video cached successfully: ${filename}`);
        }
      } catch (cacheError) {
        console.error(`⚠️ Failed to cache gallery video ${filename}:`, cacheError);
        // Don't fail the upload if caching fails
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }

      res.json({ 
        success: true, 
        url: videoUrl,
        filename: filename 
      });

    } catch (error) {
      console.error('Gallery video upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload gallery video" });
    }
  });

  // Generic image upload endpoint for cropped images
  app.post("/api/upload/image", uploadImage.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Keep original filename for cropped images
      const filename = req.file.originalname;

      console.log(`🚀 OPTIMIZED UPLOAD: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Buffer processing`);

      // 🚀 PERFORMANCE OPTIMIZATION: Use buffer instead of stream for Supabase compatibility
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('🚨 CROPPED IMAGE UPLOAD ERROR:', uploadError);
        console.error('🚨 ERROR DETAILS:', JSON.stringify(uploadError, null, 2));
        console.error('🚨 FILE INFO:', { filename, size: req.file.size, mimetype: req.file.mimetype });
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      console.log(`✅ CROPPED IMAGE UPLOADED SUCCESSFULLY: ${filename}`);
      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // Immediate cleanup and response (non-blocking)
      setImmediate(() => {
        try {
          require('fs').unlinkSync(req.file?.path);
          console.log(`🧹 Cleaned up temporary file: ${req.file?.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${cleanupError}`);
        }
      });
      
      res.json({ 
        success: true, 
        url: imageUrl,
        filename: filename,
        optimized: true
      });

    } catch (error) {
      console.error('Cropped image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload cropped image" });
    }
  });

  // Upload gallery image/thumbnail endpoint  
  app.post("/api/gallery/upload-image", uploadImage.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Keep original filename without transformation for consistency with video uploads
      const filename = req.file.originalname;

      console.log(`📤 Uploading gallery image: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

      // Read file from disk and upload to Supabase storage (gallery bucket) with overwrite enabled
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: true  // Enable overwrite if file exists
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
      }

      const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      // AUTO-GENERATE STATIC 300x200 THUMBNAIL for new images
      let staticImageUrl = null;
      let autoCropSettings = null;
      
      console.log(`🔍 STARTING AUTO-THUMBNAIL PROCESS for: ${filename}`);
      console.log(`🔍 File path exists: ${require('fs').existsSync(req.file.path)}`);
      console.log(`🔍 File size: ${req.file.size} bytes`);
      
      try {
        console.log(`🤖 AUTO-GENERATING 300x200 thumbnail for new image: ${filename}`);
        const sharp = require('sharp');
        
        // Get image metadata to check if cropping is actually needed
        const metadata = await sharp(req.file.path).metadata();
        const originalAspectRatio = metadata.width! / metadata.height!;
        const targetAspectRatio = 300 / 200; // 1.5 (3:2 ratio)
        const aspectRatioTolerance = 0.01; // Small tolerance for floating point comparison
        
        const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;
        
        // Create automatic 300x200 thumbnail
        const thumbnailBuffer = await sharp(req.file.path)
          .resize(300, 200, {
            fit: needsCropping ? 'cover' : 'fill',  // Only crop if aspect ratio is different
            position: 'center'
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })  // White background for transparency
          .jpeg({ quality: 85, progressive: true, mozjpeg: true })  // Higher quality to target 30-50KB like good examples
          .toBuffer();
        
        // Upload auto-generated thumbnail
        const staticFilename = `static_auto_${Date.now()}.jpg`;
        const { data: staticUploadData, error: staticUploadError } = await supabase.storage
          .from('memopyk-videos')
          .upload(staticFilename, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '300',
            upsert: true
          });

        if (!staticUploadError) {
          staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${staticFilename}`;
          
          // Only create cropSettings if actual cropping was performed
          if (needsCropping) {
            autoCropSettings = {
              method: 'sharp-auto-thumbnail',
              type: 'automatic',
              fit: 'cover',
              position: 'center',
              dimensions: { width: 300, height: 200 },
              aspectRatio: { original: originalAspectRatio, target: targetAspectRatio },
              cropped: true,
              timestamp: new Date().toISOString()
            };
            console.log(`✅ Auto-cropped and generated static thumbnail: ${staticImageUrl}`);
          } else {
            // No cropSettings for images that didn't need cropping (already 3:2 ratio)
            autoCropSettings = null;
            console.log(`✅ Auto-resized static thumbnail (no cropping needed): ${staticImageUrl}`);
          }
        } else {
          console.warn(`⚠️ Failed to upload auto-generated thumbnail: ${staticUploadError.message}`);
        }
      } catch (autoGenError) {
        console.error(`❌ AUTO-THUMBNAIL ERROR:`, autoGenError);
        console.error(`❌ Sharp processing failed:`, (autoGenError as any).message, (autoGenError as any).stack);
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
      
      res.json({ 
        success: true, 
        url: imageUrl,
        filename: filename,
        width: req.body.width || null,
        height: req.body.height || null,
        // Include auto-generated thumbnail info
        static_image_url: staticImageUrl,
        auto_crop_settings: autoCropSettings
      });

    } catch (error) {
      console.error('Gallery image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload gallery image" });
    }
  });

  // Upload static cropped image endpoint (300x200 JPEG)
  app.post("/api/gallery/upload-static-image", uploadImage.single('image'), async (req, res) => {
    console.log(`🚀 STATIC IMAGE UPLOAD ROUTE HIT!`);
    console.log(`   - Request method: ${req.method}`);
    console.log(`   - Request path: ${req.path}`);
    console.log(`   - File received: ${req.file ? 'YES' : 'NO'}`);
    console.log(`   - Request body:`, req.body);
    
    try {
      if (!req.file) {
        console.log(`❌ No file provided in request`);
        return res.status(400).json({ error: "No static image file provided" });
      }

      const itemId = req.body.item_id;
      const cropSettings = req.body.crop_settings ? JSON.parse(req.body.crop_settings) : null;
      
      console.log(`📋 Processing static image upload:`);
      console.log(`   - Item ID: ${itemId} (type: ${typeof itemId})`);
      console.log(`   - Crop settings: ${cropSettings ? 'Provided' : 'None'}`);
      console.log(`   - File info: ${req.file.originalname}, ${req.file.size} bytes`);
      
      if (!itemId) {
        return res.status(400).json({ error: "Gallery item ID required" });
      }

      // CACHE-BUSTING FILENAME: Extract original filename and add "-C" suffix
      const language = req.body.language || 'en';
      const originalFilename = req.body.original_filename || 'image';
      
      // Extract just the filename from URL if it's a full URL
      let baseFilename = originalFilename;
      if (originalFilename.includes('/')) {
        baseFilename = originalFilename.split('/').pop() || 'image';
      }
      
      // Remove extension and add "-C" suffix for cropped version
      const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
      const filename = `${nameWithoutExt}-C.jpg`;
      
      console.log(`🔄 CROPPED IMAGE NAMING: ${baseFilename} → ${filename} (with -C suffix)`);

      // Always delete any existing cropped version to force cache refresh
      const { error: deleteError } = await supabase.storage
        .from('memopyk-videos')
        .remove([filename]);
      
      if (deleteError && deleteError.message !== 'The resource was not found') {
        console.log(`⚠️ Could not delete old cropped image: ${deleteError.message}`);
      } else {
        console.log(`🗑️ Deleted old cropped image: ${filename} (fresh cache)`);
      }

      console.log(`📤 Uploading static image: ${filename} (300x200 PNG) - Fresh upload`);

      // Read file from disk and upload to Supabase storage (gallery bucket) 
      const fileBuffer = require('fs').readFileSync(req.file.path);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(filename, fileBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '300', // Shorter cache for thumbnails (5 minutes)
          upsert: true  // Allow overwrite
        });

      if (uploadError) {
        console.error('Supabase static image upload error:', uploadError);
        return res.status(500).json({ error: `Static image upload failed: ${uploadError.message}` });
      }

      // Create clean public URL
      const staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      
      console.log(`✅ Static image uploaded successfully: ${staticImageUrl}`);
      
      // FORCE DATABASE UPDATE - multiple approaches
      console.log(`🔄 FORCING DATABASE UPDATE for item ${itemId}`);
      
      try {
        // Method 1: Direct file system update
        console.log(`📝 Method 1: Direct JSON file update`);
        const fs = require('fs');
        const path = require('path');
        const jsonPath = path.join(__dirname, 'storage', 'gallery-items.json');
        
        console.log(`📂 Reading file: ${jsonPath}`);
        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const items = JSON.parse(rawData);
        console.log(`📊 Found ${items.length} items in database`);
        
        const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
        console.log(`🔍 Item ${itemId} found at index: ${itemIndex}`);
        
        if (itemIndex !== -1) {
          const language = req.body.language || 'en'; // Get language from request body
          const useSameVideo = items[itemIndex].use_same_video;
          
          console.log(`🔍 STATIC IMAGE UPDATE - use_same_video: ${useSameVideo}, language: ${language}`);
          
          if (useSameVideo) {
            // When use_same_video is true, update BOTH language fields to use the same static image
            console.log(`📝 Before update (shared): EN=${items[itemIndex].static_image_url_en}, FR=${items[itemIndex].static_image_url_fr}`);
            items[itemIndex].static_image_url_en = staticImageUrl;
            items[itemIndex].static_image_url_fr = staticImageUrl;
            console.log(`📝 After update (shared): Both EN and FR set to: ${staticImageUrl}`);
          } else {
            // When use_same_video is false, only update the specific language field
            const staticField = language === 'fr' ? 'static_image_url_fr' : 'static_image_url_en';
            console.log(`📝 Before update (${language}): ${items[itemIndex][staticField]}`);
            items[itemIndex][staticField] = staticImageUrl;
            console.log(`📝 After update (${language}): ${items[itemIndex][staticField]}`);
          }
          
          items[itemIndex].cropSettings = cropSettings;
          items[itemIndex].updated_at = new Date().toISOString();
          
          fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2));
          console.log(`✅ File written successfully`);
          
          // Verify the write
          const verifyData = fs.readFileSync(jsonPath, 'utf8');
          const verifyItems = JSON.parse(verifyData);
          const verifyItem = verifyItems.find((item: any) => item.id.toString() === itemId.toString());
          const staticField = language === 'fr' ? 'static_image_url_fr' : 'static_image_url_en';
          console.log(`🔍 Verification - Updated URL (${language}): ${verifyItem?.[staticField]}`);
        } else {
          console.error(`❌ Item ${itemId} not found in ${items.length} items`);
          console.error(`❌ Available IDs:`, items.map((i: any) => i.id));
        }
      } catch (error) {
        console.error('❌ DIRECT UPDATE ERROR:', error);
      }
      
      // Method 2: Try hybrid storage as backup
      try {
        console.log(`🔄 Method 2: Hybrid storage backup`);
        const language = req.body.language || 'en';
        
        // Get current item to check use_same_video flag  
        const jsonPath2 = path.join(__dirname, 'storage', 'gallery-items.json');
        const data = fs.readFileSync(jsonPath2, 'utf8');
        const items = JSON.parse(data);
        const currentItem = items.find((item: any) => item.id.toString() === itemId.toString());
        const useSameVideo = currentItem?.use_same_video;
        
        let updateData;
        if (useSameVideo) {
          // When use_same_video is true, update BOTH language fields
          updateData = { 
            static_image_url_en: staticImageUrl, 
            static_image_url_fr: staticImageUrl, 
            cropSettings: cropSettings 
          };
          console.log(`🔗 Hybrid storage: Setting both EN and FR to same URL (use_same_video: true)`);
        } else {
          // When use_same_video is false, only update the specific language field
          updateData = language === 'fr' 
            ? { static_image_url_fr: staticImageUrl, cropSettings: cropSettings }
            : { static_image_url_en: staticImageUrl, cropSettings: cropSettings };
          console.log(`🎯 Hybrid storage: Setting only ${language} field (use_same_video: false)`);
        }
        
        await hybridStorage.updateGalleryItem(itemId, updateData);
        console.log(`✅ Hybrid storage update completed`);
        
        // CRITICAL: Clear backend gallery cache to force immediate refresh
        galleryCache = null;
        console.log(`🗑️ Gallery cache cleared - fresh data will be served on next request`);
      } catch (hybridError) {
        console.error('❌ Hybrid storage failed:', hybridError);
      }
      
      // Clean up temporary file
      try {
        require('fs').unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }

      res.json({ 
        success: true, 
        url: staticImageUrl,
        filename: filename,
        crop_settings: cropSettings,
        width: 300,
        height: 200
      });

    } catch (error) {
      console.error('Static image upload error:', error);
      
      // Clean up temporary file on error
      if (req.file && req.file.path) {
        try {
          require('fs').unlinkSync(req.file.path);
          console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
        }
      }
      
      res.status(500).json({ error: "Failed to upload static image" });
    }
  });

  // Hero Text Settings
  app.get("/api/hero-text", async (req, res) => {
    try {
      const language = req.query.lang as string;
      const heroText = await hybridStorage.getHeroTextSettings(language);
      res.json(heroText);
    } catch (error) {
      res.status(500).json({ error: "Failed to get hero text" });
    }
  });

  // Create new hero text
  app.post("/api/hero-text", async (req, res) => {
    try {
      const { 
        title_mobile_fr,
        title_mobile_en,
        title_desktop_fr,
        title_desktop_en,
        font_size_desktop,
        font_size_tablet,
        font_size_mobile
      } = req.body;
      
      if (!title_desktop_fr || !title_desktop_en || !title_mobile_fr || !title_mobile_en) {
        return res.status(400).json({ error: "Desktop and mobile titles are required in both languages" });
      }
      
      const newText = await hybridStorage.createHeroText({
        title_fr: title_desktop_fr, // Use desktop French as main title
        title_en: title_desktop_en, // Use desktop English as main title
        subtitle_fr: '',
        subtitle_en: '',
        title_mobile_fr,
        title_mobile_en,
        title_desktop_fr,
        title_desktop_en,
        font_size: font_size_desktop || 48,
        font_size_desktop: font_size_desktop || 60,
        font_size_tablet: font_size_tablet || 45,
        font_size_mobile: font_size_mobile || 32,
        is_active: false
      });
      
      res.status(201).json({ success: true, text: newText });
    } catch (error) {
      console.error('Create hero text error:', error);
      res.status(500).json({ error: "Failed to create hero text" });
    }
  });

  // Update hero text
  app.patch("/api/hero-text/:id", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedText = await hybridStorage.updateHeroText(String(textId), updateData);
      res.json({ success: true, text: updatedText });
    } catch (error) {
      console.error('Update hero text error:', error);
      res.status(500).json({ error: "Failed to update hero text" });
    }
  });

  // Apply hero text to site (set as active)
  app.patch("/api/hero-text/:id/apply", async (req, res) => {
    try {
      const textId = req.params.id;
      const { font_size, font_size_desktop, font_size_tablet, font_size_mobile } = req.body;
      
      await hybridStorage.deactivateAllHeroTexts();
      
      const updateData: any = {
        is_active: true,
        font_size: font_size || font_size_desktop || 48
      };
      
      // Add responsive font sizes if provided
      if (font_size_desktop) updateData.font_size_desktop = Number(font_size_desktop);
      if (font_size_tablet) updateData.font_size_tablet = Number(font_size_tablet);
      if (font_size_mobile) updateData.font_size_mobile = Number(font_size_mobile);
      
      const appliedText = await hybridStorage.updateHeroText(textId, updateData);
      
      res.json({ success: true, text: appliedText });
    } catch (error) {
      console.error('Apply hero text error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: "Failed to apply hero text", details: message });
    }
  });

  // Delete hero text
  app.delete("/api/hero-text/:id", async (req, res) => {
    try {
      const textId = parseInt(req.params.id);
      
      await hybridStorage.deleteHeroText(String(textId));
      res.json({ success: true, message: "Hero text deleted successfully" });
    } catch (error) {
      console.error('Delete hero text error:', error);
      res.status(500).json({ error: "Failed to delete hero text" });
    }
  });

  // DUPLICATE ROUTES REMOVED - Using only the ones above

  // DUPLICATE FAQ ROUTES REMOVED - Using complete FAQ routes further down in file

  // Gallery Items - Gallery content  
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await hybridStorage.getGalleryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to get gallery items" });
    }
  });

  // FAQ Content - Frequently asked questions
  app.get("/api/faq", async (req, res) => {
    try {
      const faqs = await hybridStorage.getFaqs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ content" });
    }
  });

  // Contact Information - Contact details and form submissions
  app.get("/api/contact", async (req, res) => {
    try {
      const contact = await hybridStorage.getContacts();
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contact info" });
    }
  });

  // Contact form submission
  app.post("/api/contacts", async (req, res) => {
    try {
      const result = contactFormSchema.parse(req.body);
      console.log("📧 Contact form submission:", result);
      
      // Store contact in hybrid storage
      const contact = await hybridStorage.createContact(result);
      
      res.json({ success: true, message: "Message sent successfully", contact });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Invalid form data" });
      }
      console.error('Contact form error:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get all contacts (admin only)
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await hybridStorage.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  // Update contact status (admin only)
  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = req.params.id;
      const { status } = req.body;
      
      if (!['new', 'responded', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Use: new, responded, or closed" });
      }
      
      const contact = await hybridStorage.updateContactStatus(contactId, status);
      res.json({ success: true, contact });
    } catch (error) {
      console.error('Update contact status error:', error);
      res.status(500).json({ error: "Failed to update contact status" });
    }
  });

  // Delete contact (admin only)
  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = req.params.id;
      const deletedContact = await hybridStorage.deleteContact(contactId);
      res.json({ success: true, deleted: deletedContact });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // CTA Content - Call-to-action content
  app.get("/api/cta", async (req, res) => {
    try {
      const cta = await hybridStorage.getCtaSettings();
      res.json(cta);
    } catch (error) {
      res.status(500).json({ error: "Failed to get CTA content" });
    }
  });

  // Create new CTA setting
  app.post("/api/cta", async (req, res) => {
    try {
      const { id, buttonTextFr, buttonTextEn, buttonUrlEn, buttonUrlFr, isActive } = req.body;
      
      if (!id || !buttonTextFr || !buttonTextEn || !buttonUrlEn || !buttonUrlFr) {
        return res.status(400).json({ error: "All fields required" });
      }

      const newCta = await hybridStorage.createCtaSettings({
        id,
        buttonTextFr,
        buttonTextEn,
        buttonUrlEn,
        buttonUrlFr,
        isActive: isActive || false
      });
      
      res.json(newCta);
    } catch (error) {
      console.error('Create CTA error:', error);
      res.status(500).json({ error: "Failed to create CTA setting" });
    }
  });

  // Update CTA setting
  app.patch("/api/cta/:id", async (req, res) => {
    try {
      const ctaId = req.params.id;
      const updates = req.body;
      
      const updatedCta = await hybridStorage.updateCtaSettings(ctaId, updates);
      
      if (!updatedCta) {
        return res.status(404).json({ error: "CTA setting not found" });
      }
      
      res.json(updatedCta);
    } catch (error) {
      console.error('Update CTA error:', error);
      res.status(500).json({ error: "Failed to update CTA setting" });
    }
  });

  // Delete CTA setting
  app.delete("/api/cta/:id", async (req, res) => {
    try {
      const ctaId = req.params.id;
      
      const deleted = await hybridStorage.deleteCtaSettings(ctaId);
      
      if (!deleted) {
        return res.status(404).json({ error: "CTA setting not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete CTA error:', error);
      res.status(500).json({ error: "Failed to delete CTA setting" });
    }
  });

  // Why MEMOPYK cards routes
  app.get("/api/why-memopyk-cards", async (req, res) => {
    try {
      const cards = await hybridStorage.getWhyMemopykCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ error: "Failed to get Why MEMOPYK cards" });
    }
  });

  // Create new Why MEMOPYK card
  app.post("/api/why-memopyk-cards", async (req, res) => {
    try {
      const { id, titleEn, titleFr, descriptionEn, descriptionFr, iconName, gradient, orderIndex, isActive } = req.body;
      
      if (!id || !titleEn || !titleFr || !descriptionEn || !descriptionFr || !iconName || !gradient) {
        return res.status(400).json({ error: "All fields required" });
      }

      const newCard = await hybridStorage.createWhyMemopykCard({
        id,
        titleEn,
        titleFr,
        descriptionEn,
        descriptionFr,
        iconName,
        gradient,
        orderIndex: orderIndex || 0,
        isActive: isActive !== false
      });
      
      res.json(newCard);
    } catch (error) {
      console.error('Create Why MEMOPYK card error:', error);
      res.status(500).json({ error: "Failed to create Why MEMOPYK card" });
    }
  });

  // Update Why MEMOPYK card
  app.patch("/api/why-memopyk-cards/:id", async (req, res) => {
    try {
      const cardId = req.params.id;
      const updates = req.body;
      
      const updatedCard = await hybridStorage.updateWhyMemopykCard(cardId, updates);
      
      if (!updatedCard) {
        return res.status(404).json({ error: "Why MEMOPYK card not found" });
      }
      
      res.json(updatedCard);
    } catch (error) {
      console.error('Update Why MEMOPYK card error:', error);
      res.status(500).json({ error: "Failed to update Why MEMOPYK card" });
    }
  });

  // Delete Why MEMOPYK card
  app.delete("/api/why-memopyk-cards/:id", async (req, res) => {
    try {
      const cardId = req.params.id;
      
      const deleted = await hybridStorage.deleteWhyMemopykCard(cardId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Why MEMOPYK card not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete Why MEMOPYK card error:', error);
      res.status(500).json({ error: "Failed to delete Why MEMOPYK card" });
    }
  });

  // Legal Documents - Terms, privacy policy, etc.
  app.get("/api/legal", async (req, res) => {
    try {
      const legal = await hybridStorage.getLegalDocuments();
      res.json(legal);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal documents" });
    }
  });

  app.get("/api/legal/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const legal = await hybridStorage.getLegalDocuments();
      const document = legal.find(doc => doc.type === type);
      if (!document) {
        return res.status(404).json({ error: "Legal document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to get legal document" });
    }
  });

  // Create legal document (admin only)
  app.post("/api/legal", async (req, res) => {
    try {
      const document = req.body;
      
      if (!document.type || !document.title_en || !document.title_fr || !document.content_en || !document.content_fr) {
        return res.status(400).json({ error: "Type, title, and content in both languages are required" });
      }
      
      const newDocument = await hybridStorage.createLegalDocument(document);
      res.json({ success: true, document: newDocument });
    } catch (error) {
      console.error('Create legal document error:', error);
      res.status(500).json({ error: "Failed to create legal document" });
    }
  });

  // Update legal document (admin only)
  app.patch("/api/legal/:id", async (req, res) => {
    try {
      const docId = req.params.id;
      const updates = req.body;
      
      const updatedDocument = await hybridStorage.updateLegalDocument(docId, updates);
      res.json({ success: true, document: updatedDocument });
    } catch (error) {
      console.error('Update legal document error:', error);
      res.status(500).json({ error: "Failed to update legal document" });
    }
  });

  // Delete legal document (admin only)
  app.delete("/api/legal/:id", async (req, res) => {
    try {
      const docId = req.params.id;
      const deletedDocument = await hybridStorage.deleteLegalDocument(docId);
      res.json({ success: true, deleted: deletedDocument });
    } catch (error) {
      console.error('Delete legal document error:', error);
      res.status(500).json({ error: "Failed to delete legal document" });
    }
  });

  // SEO Settings - Meta tags and SEO configuration
  app.get("/api/seo", async (req, res) => {
    try {
      const seo = await hybridStorage.getSeoSettings();
      res.json(seo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get SEO settings" });
    }
  });

  // Create SEO settings
  app.post("/api/seo", async (req, res) => {
    try {
      const seoData = req.body;
      const newSeo = await hybridStorage.createSeoSettings(seoData);
      res.status(201).json(newSeo);
    } catch (error) {
      console.error('Create SEO settings error:', error);
      res.status(500).json({ error: "Failed to create SEO settings" });
    }
  });

  // Update SEO settings
  app.patch("/api/seo/:id", async (req, res) => {
    try {
      const seoId = req.params.id;
      const updates = req.body;
      const updatedSeo = await hybridStorage.updateSeoSettings(seoId, updates);
      if (!updatedSeo) {
        return res.status(404).json({ error: "SEO settings not found" });
      }
      res.json(updatedSeo);
    } catch (error) {
      console.error('Update SEO settings error:', error);
      res.status(500).json({ error: "Failed to update SEO settings" });
    }
  });

  // Public SEO Config endpoint - uses SeoService with timeout and fallback
  app.get("/api/seo-config", async (req, res) => {
    try {
      const lang = (req.query.lang as 'fr-FR' | 'en-US') || 'en-US';
      
      if (!['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid lang parameter. Use fr-FR or en-US' });
      }

      // Lazy load seoService to avoid circular dependencies
      const { seoService } = await import('./seo-service');
      const seoData = await seoService.getSeoSettings(lang);
      
      res.json(seoData || {});
    } catch (error) {
      console.error('Error fetching SEO config:', error);
      res.status(500).json({ error: "Failed to get SEO configuration" });
    }
  });

  // FAQ Sections - GET all sections (KEEP ONLY THIS ONE)
  app.get("/api/faq-sections", async (req, res) => {
    try {
      const sections = await hybridStorage.getFaqSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQ sections" });
    }
  });

  // FAQ Sections - POST create section (KEEP ONLY THIS ONE)
  app.post("/api/faq-sections", async (req, res) => {
    try {
      const { title_fr, title_en, order_index } = req.body;
      
      if (!title_fr || !title_en) {
        return res.status(400).json({ error: "French and English titles are required" });
      }
      
      const newSection = await hybridStorage.createFAQSection({
        title_fr,
        title_en,
        order_index: order_index || 0
      });
      
      res.status(201).json({ success: true, section: newSection });
    } catch (error) {
      console.error('Create FAQ section error:', error);
      res.status(500).json({ error: "Failed to create FAQ section" });
    }
  });

  // FAQ Sections - PATCH update section (KEEP ONLY THIS ONE)
  app.patch("/api/faq-sections/:id", async (req, res) => {
    try {
      const section = await hybridStorage.updateFAQSection(req.params.id, req.body); // Keep as string
      res.json(section);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ section" });
    }
  });

  // FAQ Sections - DELETE remove section (KEEP ONLY THIS ONE)
  app.delete("/api/faq-sections/:id", async (req, res) => {
    try {
      await hybridStorage.deleteFAQSection(req.params.id); // Keep as string
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ section" });
    }
  });

  // FAQ Sections - PATCH reorder section
  app.patch("/api/faq-sections/:id/reorder", async (req, res) => {
    try {
      const sectionId = req.params.id; // Keep as string since FAQ sections use string IDs
      const { order_index } = req.body;
      
      if (typeof order_index !== 'number') {
        return res.status(400).json({ error: "order_index must be a number" });
      }
      
      console.log(`🔄 Reordering FAQ section: ${sectionId} to order ${order_index}`);
      const updatedSection = await hybridStorage.updateFAQSection(sectionId, { order_index });
      res.json({ success: true, section: updatedSection });
    } catch (error) {
      console.error('Reorder FAQ section error:', error);
      res.status(500).json({ error: "Failed to reorder FAQ section" });
    }
  });

  // FAQs - GET all FAQs
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await hybridStorage.getFaqs();
      res.json(faqs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // FAQs - POST create FAQ
  app.post("/api/faqs", async (req, res) => {
    try {
      const { section_id, question_en, question_fr, answer_en, answer_fr, order_index, is_active } = req.body;
      
      if (!section_id || !question_en || !question_fr || !answer_en || !answer_fr) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const newFaq = await hybridStorage.createFAQ({
        section_id,
        question_en,
        question_fr,
        answer_en,
        answer_fr,
        order_index: order_index || 0,
        is_active: is_active !== undefined ? is_active : true
      });
      
      res.status(201).json({ success: true, faq: newFaq });
    } catch (error) {
      console.error('Create FAQ error:', error);
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  });

  // FAQs - PATCH update FAQ
  app.patch("/api/faqs/:id", async (req, res) => {
    try {
      console.log('🔧 ===== FAQ PATCH ENDPOINT HIT =====');
      console.log('🔧 PATCH /api/faqs/:id - ID:', req.params.id);
      console.log('🔧 PATCH /api/faqs/:id - Body:', req.body);
      console.log('🔧 CRITICAL: This should UPDATE the FAQ, NOT delete it!');
      console.log('🔧 SERVER FIX ACTIVE: Duplicate routes removed!');
      
      const faq = await hybridStorage.updateFAQ(req.params.id, req.body);
      
      console.log('✅ FAQ update completed successfully:', faq);
      console.log('✅ ===== FAQ PATCH ENDPOINT COMPLETE =====');
      res.json(faq);
    } catch (error) {
      console.error('❌ Update FAQ error:', error);
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  });

  // FAQs - DELETE remove FAQ
  app.delete("/api/faqs/:id", async (req, res) => {
    try {
      console.log('🗑️ DELETE /api/faqs/:id - ID:', req.params.id);
      console.log('🗑️ WARNING: This DELETES the FAQ permanently!');
      
      await hybridStorage.deleteFAQ(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete FAQ error:', error);
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  });

  // FAQs - PATCH reorder FAQ
  app.patch("/api/faqs/:id/reorder", async (req, res) => {
    try {
      const faqId = req.params.id;
      const { order_index } = req.body;
      
      if (typeof order_index !== 'number') {
        return res.status(400).json({ error: "order_index must be a number" });
      }
      
      console.log(`🔄 Reordering FAQ: ${faqId} to order ${order_index}`);
      const updatedFaq = await hybridStorage.updateFAQ(faqId, { order_index });
      res.json({ success: true, faq: updatedFaq });
    } catch (error) {
      console.error('Reorder FAQ error:', error);
      res.status(500).json({ error: "Failed to reorder FAQ" });
    }
  });

  // DUPLICATE FAQ ROUTES REMOVED - Using detailed routes above

  // Analytics Dashboard - GET analytics data
  app.get("/api/analytics", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics request:', { dateFrom, dateTo });
      
      const analytics = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string, 
        dateTo as string
      );
      
      console.log('✅ Analytics data retrieved successfully');
      res.json(analytics);
    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({ error: "Failed to get analytics data" });
    }
  });

  // Phase 2 - Analytics New: Realtime GA4 Data Endpoints
  
  // GA4 Realtime Analytics - Cache for 10s
  let ga4RealtimeCache: { data: any; timestamp: number } | null = null;
  const GA4_REALTIME_CACHE_TTL = 10000; // 10 seconds
  
  app.get("/api/ga4/realtime", async (req, res) => {
    try {
      const now = Date.now();
      
      // Check if cache is valid
      if (ga4RealtimeCache && (now - ga4RealtimeCache.timestamp) < GA4_REALTIME_CACHE_TTL) {
        console.log(`📊 GA4 Realtime served from cache (${Math.round((now - ga4RealtimeCache.timestamp) / 1000)}s old)`);
        return res.json(ga4RealtimeCache.data);
      }
      
      // Use existing GA4 Realtime API integration
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
      
      // Initialize GA4 client with service account credentials
      const client = new BetaAnalyticsDataClient({
        credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY!)
      });
      
      const property = `properties/${process.env.GA4_PROPERTY_ID}`;
      
      // Get active users from GA4 Realtime API
      const [activeUsersResponse] = await client.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }]
      });
      
      // Get active users by country
      const [countryResponse] = await client.runRealtimeReport({
        property,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 5
      });
      
      // Get active users by device category
      const [deviceResponse] = await client.runRealtimeReport({
        property,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }]
      });
      
      const activeUsers = Number(activeUsersResponse.rows?.[0]?.metricValues?.[0]?.value || 0);
      
      const byCountry = (countryResponse.rows || []).map(row => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        users: Number(row.metricValues?.[0]?.value || 0)
      }));
      
      const byDevice = (deviceResponse.rows || []).map(row => ({
        device: row.dimensionValues?.[0]?.value || 'Unknown',
        users: Number(row.metricValues?.[0]?.value || 0)
      }));
      
      const realData = {
        activeUsers,
        byCountry,
        byDevice,
        timestamp: new Date().toISOString(),
        cached: false
      };
      
      // Cache the data
      ga4RealtimeCache = { data: { ...realData, cached: true }, timestamp: now };
      console.log(`✅ GA4 Realtime using REAL GA4 API: ${activeUsers} active users`);
      
      res.json(realData);
    } catch (error: any) {
      console.error('❌ GA4 Realtime error:', error);
      
      // ✅ CRITICAL FIX: Handle GA4 quota exhausted errors gracefully
      if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('🚫 GA4 Quota exhausted - serving cached/stubbed data');
        
        // Return cached data if available
        if (ga4RealtimeCache) {
          console.log('📊 Using cached realtime data due to quota exhaustion');
          return res.json({ ...ga4RealtimeCache.data, quotaExhausted: true });
        }
        
        // Return stubbed data if no cache available
        const stubbedData = {
          activeUsers: 0,
          byCountry: [],
          byDevice: [],
          timestamp: new Date().toISOString(),
          cached: false,
          quotaExhausted: true,
          note: 'GA4 quota exhausted - showing stubbed data'
        };
        
        console.log('📊 Using stubbed realtime data due to quota exhaustion');
        return res.status(200).json(stubbedData);
      }
      
      // Other errors still return 500
      res.status(500).json({ error: "Failed to get GA4 realtime data" });
    }
  });

  // Tracker Heartbeat System - 15s interval, 120s TTL
  const activeHeartbeats = new Map<string, { lastSeen: number; sessionData: any }>();
  const HEARTBEAT_TTL = 120000; // 120 seconds
  
  // Clear old duplicate sessions immediately on server restart
  activeHeartbeats.clear();
  
  app.post("/api/tracker/heartbeat", async (req, res) => {
    try {
      const { sessionId, videoId, progressPct, progress, currentTime, videoTitle, device, country, ts } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }
      
      // Normalize progress percentage - accept both progressPct and progress
      const pct = Number.isFinite(progressPct) ? progressPct
                : Number.isFinite(progress) ? progress
                : 0;
      
      const now = Date.now();
      const existingSession = activeHeartbeats.get(sessionId);
      
      // Each video session should track its own progress independently
      // Only prevent backwards progress for the SAME video session
      const finalProgress = (existingSession?.sessionData?.videoId === videoId && existingSession?.sessionData?.progress) 
        ? Math.max(existingSession.sessionData.progress, pct)
        : pct;
      
      // Extract client IP using geo resolver
      const clientIP = geoResolver.extractClientIP(req);
      
      // Get geo data only if session doesn't have it yet (first heartbeat)
      let geoData = existingSession?.sessionData?.geoData || null;
      if (!geoData && clientIP) {
        geoData = await geoResolver.get(clientIP);
        if (geoData) {
          console.log(`🌍 Heartbeat geo enrichment: ${clientIP} → ${geoData.city}, ${geoData.country}`);
        }
      }
      
      const sessionData = {
        videoId: videoId || null,
        videoTitle: videoTitle || videoId,
        progress: finalProgress,
        currentTime: currentTime || 0,
        device: device || (/Mobi|Android/i.test(req.get('User-Agent') || '') ? 'Mobile' : 'Desktop'),
        country: geoData?.country || country || null,
        countryCode: geoData?.countryCode || null,
        city: geoData?.city || null,
        region: geoData?.region || null,
        regionCode: geoData?.regionCode || null,
        geoData: geoData, // Store full geo data for reuse
        userAgent: req.get('User-Agent') || 'Unknown',
        ip: clientIP || req.ip || '127.0.0.1',
        timestamp: new Date().toISOString(),
        clientTimestamp: ts || now
      };
      
      // Update heartbeat
      activeHeartbeats.set(sessionId, {
        lastSeen: now,
        sessionData
      });
      
      // Clean up expired sessions (TTL > 120s)
      for (const [id, data] of Array.from(activeHeartbeats.entries())) {
        if (now - data.lastSeen > HEARTBEAT_TTL) {
          activeHeartbeats.delete(id);
        }
      }
      
      console.log(`💓 Heartbeat received from session ${sessionId}, active sessions: ${activeHeartbeats.size}`);
      
      res.json({ 
        success: true, 
        activeSessions: activeHeartbeats.size,
        ttl: HEARTBEAT_TTL / 1000 // seconds
      });
    } catch (error) {
      console.error('❌ Tracker heartbeat error:', error);
      res.status(500).json({ error: "Failed to process heartbeat" });
    }
  });

  // Currently Watching - List active sessions
  app.get("/api/tracker/currently-watching", async (req, res) => {
    try {
      const now = Date.now();
      const currentSessions = [];
      
      // Clean up expired sessions and build response
      for (const [sessionId, data] of Array.from(activeHeartbeats.entries())) {
        if (now - data.lastSeen > HEARTBEAT_TTL) {
          activeHeartbeats.delete(sessionId);
        } else {
          currentSessions.push({
            sessionId: sessionId.substring(0, 8) + '...', // Truncate for privacy
            videoId: data.sessionData.videoId,
            videoTitle: data.sessionData.videoTitle,
            progress: data.sessionData.progress,
            currentTime: data.sessionData.currentTime,
            duration: Math.floor((now - data.lastSeen) / 1000), // seconds ago
            location: data.sessionData.country || 'Unknown',
            country: data.sessionData.country || null,
            countryCode: data.sessionData.countryCode || null,
            city: data.sessionData.city || null,
            region: data.sessionData.region || null,
            regionCode: data.sessionData.regionCode || null,
            device: data.sessionData.device || (data.sessionData.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'),
            clarityUrl: `https://clarity.microsoft.com/projects/t3uv5yndxl/sessions/${sessionId}` // Mock Clarity URL
          });
        }
      }
      
      // Sort by most recent activity and limit to 20 for display
      currentSessions.sort((a, b) => a.duration - b.duration);
      const displaySessions = currentSessions.slice(0, 20);
      
      console.log(`👀 Currently watching: ${currentSessions.length} active sessions (showing ${displaySessions.length})`);
      
      res.json({
        totalActive: currentSessions.length,
        sessions: displaySessions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Currently watching error:', error);
      res.status(500).json({ error: "Failed to get currently watching data" });
    }
  });

  // Missing cache management endpoints for production
  app.get("/api/cache/breakdown", (req, res) => {
    try {
      const breakdown = videoCache.getDetailedCacheBreakdown();
      res.json(breakdown);
    } catch (error) {
      console.error('❌ Cache breakdown error:', error);
      res.status(500).json({ error: "Failed to get cache breakdown" });
    }
  });

  app.get("/api/unified-cache/stats", (req, res) => {
    try {
      const videoStats = videoCache.getCacheStats();
      const stats = {
        video: videoStats,
        image: videoCache.getImageCacheStats(),
        total: videoStats.totalSize,
        timestamp: new Date().toISOString()
      };
      res.json(stats);
    } catch (error) {
      console.error('❌ Unified cache stats error:', error);
      res.status(500).json({ error: "Failed to get cache stats" });
    }
  });

  app.get("/api/video-cache/status", (req, res) => {
    try {
      const cacheStats = videoCache.getCacheStats();
      const status = {
        cacheStats: cacheStats,
        cacheSize: cacheStats.totalSize,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };
      res.json(status);
    } catch (error) {
      console.error('❌ Video cache status error:', error);
      res.status(500).json({ error: "Failed to get video cache status" });
    }
  });

  // Individual Video Cache Status Check - POST check specific videos
  app.post("/api/video-cache/status", (req, res) => {
    try {
      const { videos } = req.body;
      console.log('🔍 Individual video cache status check:', videos);
      
      if (!Array.isArray(videos)) {
        return res.status(400).json({ error: "Videos array is required" });
      }

      const results = videos.map(video => {
        const isCached = videoCache.isVideoCached(video.filename);
        const estimatedLoadTime = isCached ? 50 : 1500; // Cached vs CDN
        
        return {
          filename: video.filename,
          cached: isCached,
          loadTime: estimatedLoadTime,
          type: video.type || 'unknown'
        };
      });

      console.log('🎯 Cache status results:', results);
      res.json({ videos: results, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('❌ Individual video cache status error:', error);
      res.status(500).json({ error: "Failed to check individual video cache status" });
    }
  });

  app.get("/api/video-cache/stats", (req, res) => {
    try {
      const stats = videoCache.getCacheStats();
      res.json(stats);
    } catch (error) {
      console.error('❌ Video cache stats error:', error);
      res.status(500).json({ error: "Failed to get video cache stats" });
    }
  });

  app.post("/api/video-cache/force", async (req, res) => {
    try {
      const { filename } = req.body;
      console.log(`🚀 Force cache individual video: ${filename}`);
      
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }
      
      // Force cache the specific video
      await videoCache.downloadAndCacheVideo(filename);
      const isCached = videoCache.isVideoCached(filename);
      
      res.json({ 
        success: true, 
        filename,
        cached: isCached,
        message: `Video ${filename} ${isCached ? 'cached successfully' : 'cache attempt completed'}`
      });
    } catch (error) {
      console.error('❌ Force cache individual video error:', error);
      res.status(500).json({ error: "Failed to force cache video" });
    }
  });

  app.post("/api/video-cache/force-all-media", async (req, res) => {
    try {
      console.log('🚀 Force cache all media request received');
      const result = await videoCache.forceCacheAllMedia();
      res.json(result);
    } catch (error) {
      console.error('❌ Force cache all media error:', error);
      res.status(500).json({ error: "Failed to force cache all media" });
    }
  });

  app.post("/api/analytics/video-view", async (req, res) => {
    try {
      // VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
      if (process.env.VIDEO_ANALYTICS_ENABLED === 'false' || !process.env.VIDEO_ANALYTICS_ENABLED) {
        console.log('📊 VIDEO ANALYTICS DISABLED: Custom video tracking paused, switching to GA4-only');
        return res.status(204).send(); // Silent ignore
      }
      
      const { video_id, filename, duration_watched, completed, language, session_id, watch_time, completion_rate } = req.body;
      console.log('📊 Video view tracking - Full request body:', req.body);
      console.log('📊 Video view tracking - Extracted fields:', { video_id, filename, duration_watched, completed, language });
      
      // Use video_id from frontend (new format) or fallback to filename (legacy format)
      const videoIdentifier = video_id || filename;
      
      const viewData = {
        video_id: videoIdentifier,
        video_filename: videoIdentifier, // Store filename for better matching
        video_type: 'gallery',
        video_title: '', // Will be populated later from gallery data
        session_id: session_id || `session_${Date.now()}`,
        watch_time: duration_watched || watch_time || 0,
        completion_rate: completed ? 100 : (completion_rate || 0),
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('User-Agent') || '',
        language: language || req.get('Accept-Language')?.split(',')[0] || 'en-US'
      };
      
      // CRITICAL FIX: Actually save to database using hybridStorage
      const result = await hybridStorage.createAnalyticsView(viewData);
      console.log('📊 Video view tracked and saved to database:', result);
      res.json({ success: true, view: result });
    } catch (error) {
      console.error('❌ Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  // Analytics Session Tracking - POST create session
  // CRITICAL FIX: Analytics session endpoint with correct URL pattern
  app.post("/api/analytics/session", async (req, res) => {
    try {
      // ENHANCED IP DETECTION v1.0.158 - Fix for Australian IP not registering
      let clientIp = '0.0.0.0';
      
      // Check X-Forwarded-For first (for proxies/load balancers like Replit)
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        // Take the FIRST IP (original client) from comma-separated list
        const ips = forwardedFor.toString().split(',').map(ip => ip.trim());
        clientIp = ips[0]; // This should be the real client IP (e.g., 109.17.150.48)
        console.log('🌍 X-Forwarded-For found:', ips, 'Using first IP:', clientIp);
      } else if (req.ip) {
        clientIp = req.ip;
        console.log('🌍 Using req.ip:', clientIp);
      } else if (req.connection?.remoteAddress) {
        clientIp = req.connection.remoteAddress;
        console.log('🌍 Using connection.remoteAddress:', clientIp);
      } else if (req.socket?.remoteAddress) {
        clientIp = req.socket.remoteAddress;
        console.log('🌍 Using socket.remoteAddress:', clientIp);
      }
      
      // Clean up IPv6 mapped IPv4 addresses
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
        console.log('🌍 Cleaned IPv6 mapped address to:', clientIp);
      }
      
      console.log('🌍 FINAL CLIENT IP DETECTED:', clientIp);

      // ENHANCED LANGUAGE DETECTION v1.0.158 - Fix French/English showing both
      const acceptLanguage = req.headers['accept-language'] || '';
      let detectedLanguage = 'en-US'; // Default
      
      console.log('🌍 RAW Accept-Language header:', acceptLanguage);
      
      // Parse Accept-Language more precisely - take FIRST preference only
      if (acceptLanguage) {
        const primaryLanguage = acceptLanguage.split(',')[0].trim().toLowerCase();
        console.log('🌍 Primary language preference:', primaryLanguage);
        
        if (primaryLanguage.startsWith('fr')) {
          detectedLanguage = 'fr-FR';
          console.log('🌍 DETECTED: French browser');
        } else if (primaryLanguage.startsWith('en')) {
          detectedLanguage = 'en-US';
          console.log('🌍 DETECTED: English browser');
        } else {
          // For other languages, default to English
          detectedLanguage = 'en-US';
          console.log('🌍 DETECTED: Other language, defaulting to English');
        }
      }
      
      console.log('🌍 FINAL LANGUAGE DETECTED:', detectedLanguage);

      // SESSION DEDUPLICATION: Prevent multiple sessions from same IP within 30 seconds
      const finalIp = req.body.ip_address || clientIp;
      const recentSessions = await (hybridStorage as any).getRecentAnalyticsSessions();
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30000);
      
      // Check for duplicate sessions from same IP in last 30 seconds
      const duplicateSession = recentSessions.find((session: any) => 
        session.ip_address === finalIp && 
        new Date(session.created_at) > thirtySecondsAgo &&
        !session.is_test_data
      );
      
      if (duplicateSession) {
        console.log(`🚫 DUPLICATE SESSION BLOCKED: IP ${finalIp} already has session from ${new Date(duplicateSession.created_at).toISOString()}`);
        return res.json({ success: true, session: duplicateSession, deduplicated: true });
      }

      console.log('📊 Analytics session creation:', {
        ...req.body,
        server_detected_ip: clientIp,
        server_detected_language: detectedLanguage
      });

      // Enhanced session data with server-side detection
      const sessionData = {
        ...req.body,
        ip_address: finalIp,
        language: req.body.language || detectedLanguage, // Prioritize client-provided language for testing
        user_agent: req.headers['user-agent'] || req.body.user_agent || '',
        session_id: req.body.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const session = await hybridStorage.createAnalyticsSession(sessionData);
      console.log(`✅ NEW SESSION CREATED: ${session.session_id} for IP ${finalIp}`);
      
      // GEOLOCATION ENRICHMENT: Add location data after session creation
      if (finalIp && finalIp !== '127.0.0.1' && finalIp !== '::1') {
        console.log(`🌍 LOCATION ENRICHMENT: Starting for IP ${finalIp}...`);
        try {
          const locationService = new LocationService(hybridStorage);
          const locationData = await locationService.getLocationData(finalIp);
          if (locationData) {
            await hybridStorage.updateSessionLocation(finalIp, {
              country: locationData.country,
              region: locationData.region,
              city: locationData.city
            });
            console.log(`✅ LOCATION ENRICHED: ${locationData.city}, ${locationData.country} for IP ${finalIp}`);
          } else {
            console.log(`⚠️ LOCATION ENRICHMENT: No data found for IP ${finalIp}`);
          }
        } catch (error) {
          console.error(`❌ LOCATION ENRICHMENT: Failed for IP ${finalIp}:`, error);
        }
      }
      
      res.json({ success: true, session });
    } catch (error) {
      console.error('❌ Analytics session error:', error);
      res.status(500).json({ error: "Failed to create analytics session" });
    }
  });

  // Analytics Dashboard Data - GET analytics dashboard overview
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics dashboard request:', { dateFrom, dateTo });
      
      const dashboard = await hybridStorage.getAnalyticsDashboard(
        dateFrom as string, 
        dateTo as string
      );
      res.json(dashboard);
    } catch (error) {
      console.error('❌ Analytics dashboard error:', error);
      res.status(500).json({ error: "Failed to get analytics dashboard" });
    }
  });


  // Analytics Time Series - GET time series data
  app.get("/api/analytics/time-series", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('📊 Analytics time series request:', { dateFrom, dateTo });
      
      const timeSeries = await hybridStorage.getTimeSeriesData(
        dateFrom as string, 
        dateTo as string
      );
      res.json(timeSeries);
    } catch (error) {
      console.error('❌ Analytics time series error:', error);
      res.status(500).json({ error: "Failed to get time series data" });
    }
  });

  // Analytics Settings - GET analytics settings
  app.get("/api/analytics/settings", async (req, res) => {
    try {
      const settings = await hybridStorage.getAnalyticsSettings();
      res.json(settings);
    } catch (error) {
      console.error('❌ Analytics settings error:', error);
      
      // Provide fallback response with settings structure (IP exclusions handled separately)
      res.json({
        trackingEnabled: true,
        retentionDays: 30,
        anonymizeIPs: true,
        trackVideoViews: true,
        trackPageViews: true,
        trackFormSubmissions: true,
        excludeBots: true,
        languages: ["fr", "en"]
      });
    }
  });

  // Analytics Settings - PUT update analytics settings
  app.put("/api/analytics/settings", async (req, res) => {
    try {
      const settings = await hybridStorage.updateAnalyticsSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('❌ Analytics settings update error:', error);
      res.status(500).json({ error: "Failed to update analytics settings" });
    }
  });

  // Helper function to extract client IP
  const getClientIP = (req: any): string | null => {
    // Priority order for IP extraction
    const headers = [
      'x-forwarded-for',
      'cf-connecting-ip', 
      'x-real-ip'
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        // Handle comma-separated IPs (take first one)
        const ip = Array.isArray(value) ? value[0] : value.toString();
        const firstIP = ip.split(',')[0].trim();
        if (firstIP && isValidIP(firstIP)) {
          return firstIP;
        }
      }
    }

    // Fallback to req.ip
    if (req.ip && isValidIP(req.ip)) {
      return req.ip;
    }

    return null;
  };

  // Basic IP validation helper
  const isValidIP = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  // Current IP Detection - GET current admin IP address
  app.get("/api/analytics/current-ip", async (req, res) => {
    try {
      // Simplified IP detection using the same logic as session tracking
      const finalIP = getClientIP(req);
      console.log('🌍 [CURRENT-IP] DETECTED IP:', finalIP);
      res.json(finalIP);
    } catch (error) {
      console.error('❌ Current IP detection error:', error);
      res.status(500).json({ error: "Failed to detect current IP" });
    }
  });

  // Active Viewer IPs - GET active viewer IP addresses
  app.get("/api/analytics/active-ips", async (req, res) => {
    try {
      const activeIps = await hybridStorage.getActiveViewerIps();
      res.json(activeIps);
    } catch (error) {
      console.error('❌ Active viewer IPs error:', error);
      res.status(500).json({ error: "Failed to get active viewer IPs" });
    }
  });

  // IP Exclusions Management - Admin endpoints
  
  // GET all IP exclusions
  app.get("/api/admin/analytics/exclusions", async (req, res) => {
    try {
      const exclusions = await hybridStorage.getIpExclusions();
      res.json(exclusions);
    } catch (error) {
      console.error('❌ Get IP exclusions error:', error);
      res.status(500).json({ error: "Failed to get IP exclusions" });
    }
  });

  // POST create new IP exclusion
  app.post("/api/admin/analytics/exclusions", async (req, res) => {
    try {
      const { ip_cidr, label, user_agent, active = true } = req.body;
      
      if (!ip_cidr || !label) {
        return res.status(400).json({ error: "IP/CIDR and label are required" });
      }
      
      const exclusion = await hybridStorage.createIpExclusion({
        ip_cidr: ip_cidr.trim(),
        label: label.trim(),
        user_agent: user_agent?.trim() || null,
        active
      });
      
      // 🔧 CRITICAL FIX: Clear ALL cache systems when IP exclusions change
      console.log('🗑️ STARTING COMPREHENSIVE CACHE CLEAR...');
      
      // Clear all cache systems for immediate analytics refresh
      ga4ReportCache.flushAll();
      console.log('✅ NodeCache (ga4ReportCache) cleared');
      
      const { clearMemoryCache, clearDbCacheByPrefix } = await import('./cache');
      clearMemoryCache(); // Clear entire cache
      console.log('✅ Memory cache (Map store) cleared completely');
      
      try {
        await clearDbCacheByPrefix("ga4:");
        console.log('✅ Database cache cleared');
      } catch (error) {
        console.log('⚠️ Database cache clear failed (expected if table missing)');
      }
      
      console.log('🗑️ COMPREHENSIVE CACHE CLEAR COMPLETED - analytics will refresh immediately');
      
      res.json(exclusion);
    } catch (error) {
      console.error('❌ Create IP exclusion error:', error);
      res.status(500).json({ error: "Failed to create IP exclusion" });
    }
  });

  // PUT update IP exclusion
  app.put("/api/admin/analytics/exclusions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const exclusion = await hybridStorage.updateIpExclusion(id, updates);
      
      // 🔧 CRITICAL FIX: Clear ALL cache systems when IP exclusions change
      console.log('🗑️ STARTING COMPREHENSIVE CACHE CLEAR...');
      
      // 1. Clear NodeCache (ga4ReportCache) - handles /api/ga4/report
      ga4ReportCache.flushAll();
      console.log('✅ NodeCache (ga4ReportCache) cleared');
      
      // 2. Clear ALL memory cache (Map store) - handles /api/ga4/kpis
      const { clearMemoryCache, clearMemoryCacheByPrefix, clearDbCacheByPrefix } = await import('./cache');
      clearMemoryCache(); // Clear entire cache to be thorough
      console.log('✅ Memory cache (Map store) cleared completely');
      
      // 3. Clear database cache (backup)
      try {
        await clearDbCacheByPrefix("ga4:");
        console.log('✅ Database cache cleared');
      } catch (error) {
        console.log('⚠️ Database cache clear failed (expected if table missing)');
      }
      
      console.log('🗑️ COMPREHENSIVE CACHE CLEAR COMPLETED - analytics will refresh immediately');
      
      res.json(exclusion);
    } catch (error) {
      console.error('❌ Update IP exclusion error:', error);
      res.status(500).json({ error: "Failed to update IP exclusion" });
    }
  });

  // DELETE IP exclusion
  app.delete("/api/admin/analytics/exclusions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await hybridStorage.deleteIpExclusion(id);
      
      // 🔧 CRITICAL FIX: Clear ALL cache systems when IP exclusions change
      console.log('🗑️ STARTING COMPREHENSIVE CACHE CLEAR...');
      
      // Clear all cache systems for immediate analytics refresh
      ga4ReportCache.flushAll();
      console.log('✅ NodeCache (ga4ReportCache) cleared');
      
      const { clearMemoryCache, clearDbCacheByPrefix } = await import('./cache');
      clearMemoryCache(); // Clear entire cache
      console.log('✅ Memory cache (Map store) cleared completely');
      
      try {
        await clearDbCacheByPrefix("ga4:");
        console.log('✅ Database cache cleared');
      } catch (error) {
        console.log('⚠️ Database cache clear failed (expected if table missing)');
      }
      
      console.log('🗑️ COMPREHENSIVE CACHE CLEAR COMPLETED - analytics will refresh immediately');
      
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Delete IP exclusion error:', error);
      res.status(500).json({ error: "Failed to delete IP exclusion" });
    }
  });

  // Missing Analytics Endpoints - Fixing 404s
  app.get("/api/analytics/video-engagement", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Video engagement error:', error);
      res.status(500).json({ error: "Failed to get video engagement data" });
    }
  });

  app.get("/api/analytics/unique-views", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Unique views error:', error);
      res.status(500).json({ error: "Failed to get unique views data" });
    }
  });

  app.get("/api/analytics/re-engagement", async (req, res) => {
    try {
      // Return empty array for now to prevent 404s
      res.json([]);
    } catch (error) {
      console.error('❌ Re-engagement error:', error);
      res.status(500).json({ error: "Failed to get re-engagement data" });
    }
  });

  // Helper function to build visitor list from sessions
  function buildVisitorList(sessions: any[], dateFrom?: string, dateTo?: string) {
    // Helper function to normalize visitor duration from available timestamps
    const normalizeVisitorDuration = (session: any): number => {
      // CRITICAL FIX: Check explicit duration fields but reject impossible values
      const MAX_REASONABLE_DURATION = 2 * 60 * 60; // 2 hours in seconds
      const explicitDuration = session.duration || session.session_duration;
      if (explicitDuration && explicitDuration > 0) {
        // Reject impossible durations (> 2 hours)
        if (explicitDuration > MAX_REASONABLE_DURATION) {
          console.warn(`🚫 REJECTED impossible stored duration: ${explicitDuration}s (${Math.round(explicitDuration/3600)}h) for IP ${session.ip_address}`);
          return 0; // Return 0 for impossible stored durations
        }
        return explicitDuration;
      }
      
      // Calculate from timestamps - priority: ended_at > updated_at
      if (session.created_at) {
        const startTime = new Date(session.created_at).getTime();
        let endTime: number;
        
        if (session.ended_at) {
          // Use ended_at if available (session properly closed)
          endTime = new Date(session.ended_at).getTime();
        } else if (session.updated_at) {
          // Use updated_at as proxy for last activity
          endTime = new Date(session.updated_at).getTime();
        } else {
          // CRITICAL FIX: For sessions without ended_at or updated_at, 
          // only use current time if session is very recent (< 1 hour old)
          // Otherwise return 0 to avoid impossible durations for old unclosed sessions
          const sessionAge = (Date.now() - startTime) / 1000; // Age in seconds
          if (sessionAge < 3600) {
            // Session is less than 1 hour old - likely active, use current time
            endTime = Date.now();
          } else {
            // Session is old without closure - duration unknown, return 0
            return 0;
          }
        }
        
        const calculatedDuration = Math.round((endTime - startTime) / 1000); // Convert to seconds
        
        // Double-check calculated duration is reasonable
        if (calculatedDuration > MAX_REASONABLE_DURATION) {
          console.warn(`🚫 REJECTED impossible calculated duration: ${calculatedDuration}s for IP ${session.ip_address}`);
          return 0;
        }
        
        return Math.max(calculatedDuration, 0); // Ensure non-negative
      }
      
      return 0; // No usable timestamp data
    };

    console.log(`🔍 VISITOR BUILD v2: Starting with ${sessions.length} input sessions`);
    if (sessions.length > 0) {
      console.log(`🔍 VISITOR BUILD v2: Sample session keys:`, Object.keys(sessions[0]));
      console.log(`🔍 VISITOR BUILD v2: Sample session:`, {
        ip_address: sessions[0].ip_address,
        created_at: sessions[0].created_at,
        country: sessions[0].country
      });
    }
    
    // Get unique visitors with their latest session info, visit count, session duration, and previous visit
    const visitorMap = new Map();
    const visitorSessions = new Map(); // Track all sessions per visitor for previous visit calculation
    
    // First pass: collect all sessions per visitor
    sessions.forEach(session => {
      // **CRITICAL FIX**: Normalize field names for different data sources
      const ip = session.ip_address || session.ipAddress || session.ip;
      const createdAt = session.created_at || session.createdAt;
      
      if (!ip) {
        console.log(`🚫 VISITOR BUILD v2: Skipping session with no IP - fields:`, Object.keys(session));
        return;
      }
      
      if (!visitorSessions.has(ip)) {
        visitorSessions.set(ip, []);
      }
      
      // Store normalized session data
      visitorSessions.get(ip).push({
        ...session,
        ip_address: ip, // normalized
        created_at: createdAt // normalized
      });
    });
    
    console.log(`🔍 VISITOR BUILD v2: Collected sessions for ${visitorSessions.size} unique IPs`);
    
    // Second pass: build visitor info with previous visit data (only from sessions within date range)
    visitorSessions.forEach((sessions, ip) => {
      // Sort sessions by date (newest first) - these are already filtered by date range
      sessions.sort((a: any, b: any) => {
        const aTime = new Date(a.created_at || a.createdAt).getTime();
        const bTime = new Date(b.created_at || b.createdAt).getTime();
        return bTime - aTime;
      });
      
      // Use the most recent session WITHIN the date range (not globally latest)
      const latestSession = sessions[0];
      const previousSession = sessions[1]; // Second most recent session WITHIN the date range
      
      visitorMap.set(ip, {
        ip_address: ip,
        country: latestSession.country || 'Unknown',
        region: latestSession.region || 'Unknown',
        city: latestSession.city || 'Unknown',
        language: latestSession.language || 'Unknown', 
        last_visit: latestSession.created_at || latestSession.createdAt,
        user_agent: latestSession.user_agent ? latestSession.user_agent.substring(0, 50) + '...' : 'Unknown',
        visit_count: sessions.length,
        session_duration: normalizeVisitorDuration(latestSession),
        previous_visit: previousSession ? (previousSession.created_at || previousSession.createdAt) : null
      });
    });
    
    console.log(`🔍 VISITOR BUILD v2: Built ${visitorMap.size} visitor objects`);
    
    // Convert to array, apply date filtering, and sort by most recent
    let recentVisitors = Array.from(visitorMap.values());
    console.log(`🔍 VISITOR BUILD v2: Array conversion complete - ${recentVisitors.length} visitors before date filtering`);
    
    // Apply date filtering on visitors if date parameters provided
    if (dateFrom || dateTo) {
      console.log(`🔍 VISITOR BUILD v2: Applying date filter - dateFrom: ${dateFrom}, dateTo: ${dateTo}`);
      const beforeFilter = recentVisitors.length;
      
      recentVisitors = recentVisitors.filter(visitor => {
        const visitDate = new Date(visitor.last_visit);
        console.log(`🔍 VISITOR BUILD v2: Checking visitor ${visitor.ip_address} - visit: ${visitor.last_visit}, parsed: ${visitDate.toISOString()}`);
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom as string);
          fromDate.setHours(0, 0, 0, 0); // Start of day
          console.log(`🔍 VISITOR BUILD v2: Date filter - fromDate: ${fromDate.toISOString()}, visitDate: ${visitDate.toISOString()}, passed: ${visitDate >= fromDate}`);
          if (visitDate < fromDate) return false;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo as string);
          toDate.setHours(23, 59, 59, 999); // **CRITICAL FIX**: End of day instead of start of day
          console.log(`🔍 VISITOR BUILD v2: Date filter - toDate: ${toDate.toISOString()}, visitDate: ${visitDate.toISOString()}, passed: ${visitDate <= toDate}`);
          if (visitDate > toDate) return false;
        }
        
        return true;
      });
      
      console.log(`🔍 VISITOR BUILD v2: Date filtering complete - ${beforeFilter} → ${recentVisitors.length} visitors`);
    }
    
    return recentVisitors
      .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
      .slice(0, 100); // Take last 100 visitors for extended history
  }

  // Recent Visitors - GET visitor details filtered by date range (for Analytics New eye icons)
  app.get("/api/analytics/recent-visitors", async (req, res) => {
    try {
      const { dateFrom, dateTo, skipEnrichment, datePreset, country } = req.query;
      
      console.log(`🔍 Recent Visitors Request: datePreset=${datePreset}, dateFrom=${dateFrom}, dateTo=${dateTo}, country=${country}`);
      
      // Handle datePreset parameter for Analytics New consistency
      let startDate = dateFrom;
      let endDate = dateTo;
      
      if (datePreset && !dateFrom && !dateTo) {
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(
          datePreset as string
        );
        startDate = calcStart;
        endDate = calcEnd;
        console.log(`📅 Date preset '${datePreset}' resolved to: ${startDate} to ${endDate}`);
      }
      
      // **CRITICAL FIX**: Apply same date conversion logic as /api/analytics/sessions
      let finalStartDate = startDate as string;
      let finalEndDate = endDate as string;
      
      // Same-day date conversion for timezone accuracy
      if (startDate === endDate) {
        console.log('🔧 RECENT VISITORS: Converting same-day range to full 24-hour Paris window');
        const { DateTime } = await import('luxon');
        const start = DateTime.fromISO(startDate as string, { zone: 'Europe/Paris' }).startOf('day');
        const end = start.plus({ days: 1 }); // Next day start (exclusive)
        finalStartDate = start.toUTC().toISO()!;
        finalEndDate = end.toUTC().toISO()!;
        console.log(`📅 RECENT VISITORS RANGE: ${finalStartDate} to ${finalEndDate} (Paris day: ${startDate})`);
      }
      
      // Get sessions with proper date filtering and production inclusion
      const sessions = await hybridStorage.getAnalyticsSessions(
        finalStartDate,
        finalEndDate,
        undefined, // language
        true, // **CRITICAL FIX**: Include production data like main analytics endpoint
        country as string // Add country filtering support
      );
      
      // Apply same filtering logic as main analytics dashboard
      console.log(`🔍 RECENT VISITORS: Processing ${sessions.length} raw sessions`);
      const realSessions = sessions.filter(session => {
        const isValid = !session.is_test_data &&  // Same as main dashboard 
               session.ip_address && 
               session.ip_address !== '0.0.0.0' &&
               session.ip_address !== '127.0.0.1' &&  // Exclude localhost like main dashboard
               session.ip_address !== null &&
               !session.session_id?.includes('anonymous');
        if (!isValid) {
          console.log(`🚫 FILTERED OUT: ${session.ip_address} - test:${session.is_test_data}, sessionId:${session.session_id}`);
        }
        return isValid;
      });
      console.log(`✅ RECENT VISITORS: After filtering: ${realSessions.length} valid sessions`);
      
      // **CRITICAL FIX**: Build visitor list BEFORE fast mode - core session processing should always happen
      const recentVisitors = buildVisitorList(realSessions, dateFrom, dateTo);
      console.log(`🔍 RECENT VISITORS: Built ${recentVisitors.length} visitors from ${realSessions.length} sessions`);

      // FAST MODE: Always return immediately with best available data - never wait for external APIs
      console.log(`⚡ Recent Visitors: Using fast response mode - no blocking external API calls`);
      
      // Enhanced JSON fallback that actually works - read the enriched cache data
      const enrichedVisitors = recentVisitors.map(visitor => {
        try {
          // Check if we already have good location data from database
          if (visitor.country && visitor.country !== 'Unknown' && visitor.city && visitor.city !== 'Unknown') {
            return visitor;
          }
          
          // Try to get enriched location data from JSON cache
          const fs = require('fs');
          const path = require('path');
          const jsonPath = path.join(process.cwd(), 'server/data/analytics-sessions.json');
          if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const matchingSession = jsonData.find((s: any) => s.ip_address === visitor.ip_address || s.server_detected_ip === visitor.ip_address);
            if (matchingSession && matchingSession.country && matchingSession.country !== 'Unknown') {
              console.log(`📄 Using JSON cache location for IP ${visitor.ip_address}: ${matchingSession.city}, ${matchingSession.country}`);
              return {
                ...visitor,
                country: matchingSession.country,
                region: matchingSession.region || visitor.region,
                city: matchingSession.city,
                country_code: matchingSession.country_code || null
              };
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not read JSON cache for IP ${visitor.ip_address}:`, error.message);
        }
        
        // Return visitor with whatever data we have (might be Unknown, but that's okay)
        return visitor;
      });
      
      // Background enrichment: Start location enrichment in background for Unknown locations (non-blocking)
      const unknownIPs = enrichedVisitors
        .filter(v => !v.country || v.country === 'Unknown')
        .map(v => v.ip_address)
        .slice(0, 5); // Limit to 5 to avoid rate limits
      
      if (unknownIPs.length > 0 && !skipEnrichment) {
        console.log(`🔄 Background enrichment: Starting for ${unknownIPs.length} unknown IPs`);
        // Fire and forget - don't wait for this
        setImmediate(async () => {
          try {
            await Promise.all(unknownIPs.map(async (ip) => {
              const locationData = await locationService.getLocationData(ip);
              if (locationData) {
                await hybridStorage.updateSessionLocation(ip, {
                  country: locationData.country,
                  region: locationData.region,
                  city: locationData.city
                });
                console.log(`🌍 Background: Updated location for IP ${ip}: ${locationData.city}, ${locationData.country}`);
              }
            }));
          } catch (error) {
            console.log(`⚠️ Background enrichment failed:`, error.message);
          }
        });
      }
      
      // DEBUG: Log IP addresses and their enrichment status
      console.log('🔍 RECENT VISITORS DEBUG:');
      enrichedVisitors.forEach(visitor => {
        const enriched = visitor.country !== 'Unknown' && visitor.city !== 'Unknown';
        console.log(`  IP: ${visitor.ip_address} | ${enriched ? '✅' : '🏴‍☠️'} | ${visitor.city}, ${visitor.country}`);
      });
      
      console.log(`✅ Recent Visitors: Found ${enrichedVisitors.length} unique visitors ${skipEnrichment === 'true' ? '(fast mode - no enrichment)' : '(enriched with location data)'}`);
      res.json(enrichedVisitors);
    } catch (error) {
      console.error('❌ Recent Visitors: Error fetching visitor details:', error);
      res.status(500).json({ error: 'Failed to load recent visitors' });
    }
  });

  // Returning Visitors Details - GET returning visitor details for modal
  app.get("/api/analytics/returning-visitors", async (req, res) => {
    try {
      console.log('👥 Returning Visitors: Fetching returning visitor details');
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        undefined, // dateFrom
        undefined, // dateTo  
        undefined,
        shouldIncludeProduction
      );
      
      // Filter out test data and invalid sessions
      const realSessions = sessions.filter(session => {
        return !session.is_test_data && 
               session.ip_address && 
               session.ip_address !== '0.0.0.0' &&
               session.ip_address !== null &&
               !session.session_id?.includes('anonymous');
      });
      
      // Get unique returning visitors (those with more than 1 visit)
      const visitorMap = new Map();
      const visitorSessions = new Map(); // Track all sessions per visitor
      
      // First pass: collect all sessions per visitor
      realSessions.forEach(session => {
        const ip = session.ip_address;
        if (!visitorSessions.has(ip)) {
          visitorSessions.set(ip, []);
        }
        visitorSessions.get(ip).push(session);
      });
      
      // Second pass: filter for returning visitors only (visit count > 1)
      visitorSessions.forEach((sessions, ip) => {
        if (sessions.length > 1) { // Only returning visitors
          // Sort sessions by date (newest first)
          sessions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const latestSession = sessions[0];
          const previousSession = sessions[1]; // Second most recent session
          
          visitorMap.set(ip, {
            ip_address: ip,
            country: latestSession.country || 'Unknown',
            region: latestSession.region || 'Unknown',
            city: latestSession.city || 'Unknown',
            language: latestSession.language || 'Unknown', 
            last_visit: latestSession.created_at,
            user_agent: latestSession.user_agent ? latestSession.user_agent.substring(0, 50) + '...' : 'Unknown',
            visit_count: sessions.length,
            session_duration: normalizeVisitorDuration(latestSession),
            previous_visit: previousSession ? previousSession.created_at : null
          });
        }
      });
      
      // Convert to array and sort by most recent
      let returningVisitors = Array.from(visitorMap.values())
        .sort((a, b) => new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime())
        .slice(0, 50); // Take last 50 returning visitors
      
      // Apply location enrichment (same as recent visitors - use JSON cache)
      console.log('⚡ Returning Visitors: Using fast response mode - no blocking external API calls');
      console.log('🔧 ENRICHMENT DEBUG: About to start enrichment for', returningVisitors.length, 'visitors');
      const fs = require('fs');
      const path = require('path');
      
      const enrichedReturningVisitors = returningVisitors.map((visitor) => {
        try {
          // Check JSON file for cached location data (same as recent visitors)
          const jsonPath = path.join(process.cwd(), 'server/data/analytics-sessions.json');
          console.log(`🔧 ENRICHMENT DEBUG: Checking ${jsonPath} for IP ${visitor.ip_address}`);
          if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const matchingSession = jsonData.find((s: any) => s.ip_address === visitor.ip_address || s.server_detected_ip === visitor.ip_address);
            if (matchingSession && matchingSession.country && matchingSession.country !== 'Unknown') {
              console.log(`📄 Using JSON cache location for IP ${visitor.ip_address}: ${matchingSession.city}, ${matchingSession.country}`);
              return {
                ...visitor,
                country: matchingSession.country,
                region: matchingSession.region || visitor.region,
                city: matchingSession.city,
                country_code: matchingSession.country_code || visitor.country_code
              };
            } else {
              console.log(`🔧 ENRICHMENT DEBUG: No match found for IP ${visitor.ip_address} in JSON cache`);
            }
          } else {
            console.log(`🔧 ENRICHMENT DEBUG: JSON file does not exist at ${jsonPath}`);
          }
        } catch (error) {
          console.log(`🔧 ENRICHMENT DEBUG: Error processing IP ${visitor.ip_address}:`, error);
        }
        return visitor;
      });
      
      returningVisitors = enrichedReturningVisitors;
      
      // DEBUG: Log IP addresses and their enrichment status  
      console.log('🔍 RETURNING VISITORS DEBUG:');
      returningVisitors.forEach(visitor => {
        const enriched = visitor.country !== 'Unknown' && visitor.city !== 'Unknown';
        console.log(`  IP: ${visitor.ip_address} | ${enriched ? '✅' : '🏴‍☠️'} | ${visitor.city}, ${visitor.country}`);
      });
      
      console.log(`✅ Returning Visitors: Found ${returningVisitors.length} returning visitors`);
      res.json(returningVisitors);
      
    } catch (error) {
      console.error('❌ Returning visitors fetch error:', error);
      res.status(500).json({ error: "Failed to get returning visitors data" });
    }
  });

  // MISSING ANALYTICS ENDPOINTS - CRITICAL FOR DASHBOARD

  // IP Exclusion Management - POST exclude IP address (modern system)
  app.post("/api/analytics/exclude-ip", async (req, res) => {
    try {
      const { ipAddress, comment } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`🚫 Excluding IP address: ${ipAddress} with comment: ${comment || 'No comment'}`);
      
      const exclusionData = {
        ip_cidr: ipAddress,
        label: comment || 'Manual exclusion',
        active: true
      };
      
      const newExclusion = await hybridStorage.createIpExclusion(exclusionData);
      const allExclusions = await hybridStorage.getIpExclusions();
      
      res.json({ 
        success: true, 
        message: `IP ${ipAddress} excluded successfully`,
        excludedIps: allExclusions
      });
    } catch (error) {
      console.error('❌ IP exclusion error:', error);
      res.status(500).json({ error: "Failed to exclude IP address" });
    }
  });

  // IP Exclusion Management - PATCH update comment for excluded IP (modern system)
  app.patch("/api/analytics/exclude-ip/:ipAddress/comment", async (req, res) => {
    try {
      const { ipAddress } = req.params;
      const { comment } = req.body;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`📝 Updating comment for IP: ${ipAddress} to: ${comment || 'No comment'}`);
      
      // Find the exclusion by IP and update it
      const exclusions = await hybridStorage.getIpExclusions();
      const exclusion = exclusions.find(e => e.ip_cidr === ipAddress);
      
      if (!exclusion) {
        return res.status(404).json({ error: "IP exclusion not found" });
      }
      
      const updatedExclusion = await hybridStorage.updateIpExclusion(exclusion.id, {
        label: comment || 'Updated comment'
      });
      
      const allExclusions = await hybridStorage.getIpExclusions();
      
      res.json({ 
        success: true, 
        message: `Comment updated for IP ${ipAddress}`,
        excludedIps: allExclusions
      });
    } catch (error) {
      console.error('❌ IP comment update error:', error);
      res.status(500).json({ error: "Failed to update IP comment" });
    }
  });

  // IP Exclusion Management - DELETE remove excluded IP (modern system)
  app.delete("/api/analytics/exclude-ip/:ipAddress", async (req, res) => {
    try {
      const { ipAddress } = req.params;
      
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      console.log(`✅ Removing excluded IP: ${ipAddress}`);
      
      // Find the exclusion by IP and delete it
      const exclusions = await hybridStorage.getIpExclusions();
      const exclusion = exclusions.find(e => e.ip_cidr === ipAddress);
      
      if (!exclusion) {
        return res.status(404).json({ error: "IP exclusion not found" });
      }
      
      await hybridStorage.deleteIpExclusion(exclusion.id);
      const allExclusions = await hybridStorage.getIpExclusions();
      
      res.json({ 
        success: true, 
        message: `IP ${ipAddress} removed from exclusion list`,
        excludedIps: allExclusions
      });
    } catch (error) {
      console.error('❌ IP removal error:', error);
      res.status(500).json({ error: "Failed to remove excluded IP" });
    }
  });

  // IP Exclusion Management - GET list of excluded IPs (modern system)
  app.get("/api/analytics/exclude-ip", async (req, res) => {
    try {
      const exclusions = await hybridStorage.getIpExclusions();
      res.json({ 
        excludedIps: exclusions || [] 
      });
    } catch (error) {
      console.error('❌ Get excluded IPs error:', error);
      res.status(500).json({ error: "Failed to get excluded IPs" });
    }
  });

  // Analytics Reset - POST reset all analytics data
  app.post("/api/analytics/reset", async (req, res) => {
    try {
      await hybridStorage.resetAnalyticsData();
      res.json({ success: true, message: "All analytics data has been reset" });
    } catch (error) {
      console.error('❌ Analytics reset error:', error);
      res.status(500).json({ error: "Failed to reset analytics data" });
    }
  });

  // Session Duration Update - POST update session duration
  app.post("/api/analytics/session-update", async (req, res) => {
    try {
      const { duration, sessionId: clientSessionId } = req.body;
      
      // FIXED: Use client-provided session ID or create IP-based session ID
      const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
                       req.connection.remoteAddress || 
                       req.socket.remoteAddress || 
                       'unknown';
      const sessionId = clientSessionId || `ip_session_${clientIp?.replace(/\./g, '_')}` || 'anonymous';
      
      console.log(`📊 SESSION UPDATE: Duration ${duration}s for session ${sessionId} (IP: ${clientIp})`);
      
      if (!duration || duration < 0) {
        return res.status(400).json({ error: "Valid duration required" });
      }
      
      // FIXED: Find or create session for this specific IP
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        undefined,
        undefined, 
        undefined,
        shouldIncludeProduction
      );
      const ipSession = sessions.find((s: any) => 
        s.ip_address === clientIp && 
        !s.is_test_data
      );
      
      let finalSessionId = sessionId;
      if (ipSession) {
        finalSessionId = ipSession.session_id;
        console.log(`📊 SESSION UPDATE: Using existing session ${finalSessionId} for IP ${clientIp}`);
      } else {
        // FIXED: Prevent anonymous accumulation - skip if no valid session found
        if (!clientSessionId && finalSessionId.includes('anonymous')) {
          console.log(`🚫 SESSION UPDATE: Skipping anonymous session without client ID to prevent accumulation`);
          return res.json({ 
            success: false,
            message: "No valid session found - anonymous accumulation prevented" 
          });
        }
      }
      
      // Update session duration in storage
      await hybridStorage.updateSessionDuration(finalSessionId, duration);
      
      res.json({ 
        success: true, 
        sessionId: finalSessionId,
        duration,
        message: "Session duration updated successfully" 
      });
    } catch (error) {
      console.error('❌ Session update error:', error);
      res.status(500).json({ error: "Failed to update session duration" });
    }
  });

  // Location Enrichment Status - GET enrichment job status
  app.get("/api/analytics/enrich-locations/status", async (req, res) => {
    try {
      const { dateFrom, dateTo, language, includeProduction } = req.query;
      
      const params = {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        language: language as string,
        includeProduction: includeProduction === 'true'
      };

      const status = enrichmentManager.getJobStatus(params);
      const stats = enrichmentManager.getStats();

      if (status) {
        res.json({ ...status, stats });
      } else {
        res.json({ 
          state: 'idle', 
          progress: 0, 
          startedAt: 0, 
          ttl: 0, 
          jobId: null,
          stats
        });
      }
    } catch (error) {
      console.error('❌ Enrichment status error:', error);
      res.status(500).json({ error: 'Failed to get enrichment status' });
    }
  });

  // Location Enrichment - POST manually enrich visitor locations
  app.post("/api/analytics/enrich-locations", async (req, res) => {
    try {
      console.log('🌍 Location Enrichment: Starting managed enrichment...');
      
      // Extract parameters from request body or query
      const { dateFrom, dateTo, language } = req.body || req.query;
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const params = {
        dateFrom,
        dateTo,
        language,
        includeProduction: shouldIncludeProduction
      };

      // Start enrichment job (or return existing job status)
      const jobStatus = await enrichmentManager.startEnrichment(params);
      
      // Return status based on job state
      if (jobStatus.state === 'degraded') {
        res.status(503).json({
          success: false,
          ...jobStatus,
          message: 'Service temporarily unavailable due to repeated failures'
        });
      } else if (jobStatus.state === 'running' || jobStatus.state === 'queued') {
        res.status(202).json({
          success: true,
          ...jobStatus,
          message: 'Enrichment job started or already in progress'
        });
      } else if (jobStatus.state === 'success') {
        res.json({
          success: true,
          ...jobStatus,
          message: 'Enrichment completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          ...jobStatus,
          message: 'Enrichment job failed'
        });
      }
    } catch (error) {
      console.error('❌ Location Enrichment error:', error);
      res.status(500).json({ error: 'Failed to start enrichment' });
    }
  });

  // Analytics Test Data Status - GET test data status
  app.get("/api/analytics/test-data/status", async (req, res) => {
    try {
      // Return test data status - implementation depends on hybridStorage
      res.json({ testDataPresent: false, message: "No test data functionality implemented" });
    } catch (error) {
      console.error('❌ Test data status error:', error);
      res.status(500).json({ error: "Failed to get test data status" });
    }
  });

  // Analytics Clear Sessions - POST clear sessions data
  app.post("/api/analytics/clear/sessions", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsSessions();
      res.json({ success: true, message: "Sessions data cleared" });
    } catch (error) {
      console.error('❌ Clear sessions error:', error);
      res.status(500).json({ error: "Failed to clear sessions" });
    }
  });

  // Analytics Clear Views - POST clear views data
  app.post("/api/analytics/clear/views", async (req, res) => {
    try {
      await hybridStorage.clearAnalyticsViews();
      res.json({ success: true, message: "Views data cleared" });
    } catch (error) {
      console.error('❌ Clear views error:', error);
      res.status(500).json({ error: "Failed to clear views" });
    }
  });

  // Analytics Clear All - POST clear all analytics data
  app.post("/api/analytics/clear/all", async (req, res) => {
    try {
      await hybridStorage.clearAllAnalyticsData();
      res.json({ success: true, message: "All analytics data cleared" });
    } catch (error) {
      console.error('❌ Clear all analytics error:', error);
      res.status(500).json({ error: "Failed to clear all analytics data" });
    }
  });

  // MISSING VIDEO CACHE ENDPOINTS - CRITICAL FOR CACHE MANAGEMENT

  // Video Cache Force All (alternative endpoint name)
  app.post("/api/video-cache/force-all", async (req, res) => {
    try {
      console.log('🚀 Force cache all videos (alternative endpoint)');
      const result = await videoCache.forceCacheAllMedia();
      res.json(result);
    } catch (error) {
      console.error('❌ Force cache all error:', error);
      res.status(500).json({ error: "Failed to force cache all videos" });
    }
  });

  // Video Cache Clear - POST clear cache
  app.post("/api/video-cache/clear", async (req, res) => {
    try {
      console.log('🧹 Clear video cache request');
      const result = await videoCache.clearCacheCompletely();
      res.json({ success: true, message: "Cache cleared", result });
    } catch (error) {
      console.error('❌ Clear cache error:', error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Video Cache Refresh - POST refresh cache status  
  app.post("/api/video-cache/refresh", async (req, res) => {
    try {
      console.log('🔄 Refresh video cache status');
      const stats = videoCache.getCacheStats();
      
      // Also check individual hero video cache status for refresh
      const heroVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
      const heroStatus = heroVideos.map(filename => ({
        filename,
        cached: videoCache.isVideoCached(filename),
        loadTime: videoCache.isVideoCached(filename) ? 50 : 1500
      }));

      res.json({ 
        success: true, 
        stats, 
        heroVideos: heroStatus,
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('❌ Cache refresh error:', error);
      res.status(500).json({ error: "Failed to refresh cache" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post("/api/analytics-session", async (req, res) => {
    try {
      console.log('📊 Analytics session creation (legacy):', req.body);
      const session = await hybridStorage.createAnalyticsSession(req.body);
      res.json({ success: true, session });
    } catch (error) {
      console.error('❌ Analytics session error (legacy):', error);
      res.status(500).json({ error: "Failed to create analytics session" });
    }
  });

  // Analytics View Tracking - POST create view
  app.post("/api/analytics-view", async (req, res) => {
    try {
      console.log('📊 Analytics view creation:', req.body);
      const view = await hybridStorage.createAnalyticsView(req.body);
      res.json({ success: true, view });
    } catch (error) {
      console.error('❌ Analytics view error:', error);
      res.status(500).json({ error: "Failed to create analytics view" });
    }
  });

  // Blog Analytics - POST track blog post view
  app.post("/api/analytics/blog/view", async (req, res) => {
    try {
      const { post_slug, post_title, language, session_id } = req.body;
      const ip_address = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
      
      console.log(`📊 Blog post view: ${post_slug} (${language}) from IP ${ip_address}`);
      
      // Check if this IP is in the exclusion list
      const exclusions = await hybridStorage.getIpExclusions();
      const isExcluded = exclusions.some((excl: any) => 
        excl.is_active && excl.ip_address === ip_address
      );
      
      if (isExcluded) {
        console.log(`⏭️ Skipping blog view tracking - IP ${ip_address} is excluded`);
        res.json({ success: true, excluded: true, message: "View not tracked - IP excluded" });
        return;
      }
      
      const viewData = {
        post_slug,
        post_title,
        language,
        session_id,
        ip_address
      };
      
      const view = await hybridStorage.createBlogPostView(viewData);
      res.json({ success: true, view });
    } catch (error) {
      console.error('❌ Blog post view tracking error:', error);
      res.status(500).json({ error: "Failed to track blog post view" });
    }
  });

  // Blog Analytics - GET popular blog posts
  app.get("/api/analytics/blog/popular", async (req, res) => {
    try {
      const { days } = req.query;
      const daysNum = parseInt(days as string || '30');
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysNum);
      const dateFromStr = dateFrom.toISOString();
      
      console.log(`📊 Fetching popular blog posts for last ${daysNum} days`);
      
      const popularPosts = await hybridStorage.getPopularBlogPosts(dateFromStr);
      res.json(popularPosts);
    } catch (error) {
      console.error('❌ Popular blog posts error:', error);
      res.status(500).json({ error: "Failed to get popular blog posts" });
    }
  });

  // Blog Analytics - GET blog view trends over time
  app.get("/api/analytics/blog/trends", async (req, res) => {
    try {
      const { days } = req.query;
      const daysNum = parseInt(days as string || '30');
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysNum);
      const dateFromStr = dateFrom.toISOString();
      
      console.log(`📊 Fetching blog view trends for last ${daysNum} days`);
      
      const trends = await hybridStorage.getBlogViewTrends(dateFromStr);
      res.json(trends);
    } catch (error) {
      console.error('❌ Blog view trends error:', error);
      res.status(500).json({ error: "Failed to get blog view trends" });
    }
  });

  // Video Performance Analytics - GET comprehensive video engagement with milestones
  app.get("/api/analytics/video-performance", async (req, res) => {
    try {
      const { days, from, to, lang, source, device } = req.query;
      const daysNum = parseInt(days as string || '30');
      console.log(`📊 Video performance analytics request for ${daysNum} days with filters:`, { from, to, lang, source, device });
      
      // Query real video performance data from Supabase VPS
      try {
        const { data: videoViews, error } = await hybridStorage.supabase
          .from('analytics_views')
          .select('*')
          .not('video_id', 'is', null);

        if (error) {
          console.warn('⚠️ Video performance: Supabase query failed, using empty data:', error);
          res.json([]);
          return;
        }

        // Process video performance data (real data from your Supabase VPS)
        const videoPerformance = videoViews?.reduce((acc: any, view: any) => {
          const videoId = view.video_id;
          if (!acc[videoId]) {
            acc[videoId] = {
              video_id: videoId,
              video_title: videoId.replace('.mp4', '').replace('Gallery', ' Gallery'),
              starts: 0,
              completed_90: 0,
              total_watch_time: 0,
              view_count: 0
            };
          }
          acc[videoId].starts++;
          acc[videoId].view_count++;
          const watchTime = parseInt(view.watch_time || view.duration_watched || '0');
          acc[videoId].total_watch_time += watchTime;
          if (watchTime >= (view.video_duration || 60) * 0.9) {
            acc[videoId].completed_90++;
          }
          return acc;
        }, {});

        const realData = Object.values(videoPerformance || {}).map((video: any) => ({
          ...video,
          avg_watch_time: video.view_count > 0 ? video.total_watch_time / video.view_count : 0,
          completion_rate: video.starts > 0 ? (video.completed_90 / video.starts * 100) : 0
        }));

        console.log(`✅ Video performance: Retrieved ${realData.length} videos from Supabase VPS`);
        res.json(realData);
      } catch (error) {
        console.warn('⚠️ Video performance: Database query failed, returning empty data:', error);
        res.json([]);
      }
    } catch (error) {
      console.error('❌ Video performance analytics error:', error);
      res.status(500).json({ error: "Failed to get video performance data" });
    }
  });

  // CTA Performance Analytics - GET clicks by CTA ID and CTR per page
  app.get("/api/analytics/cta-performance", async (req, res) => {
    try {
      const { from, to, lang, source, device } = req.query;
      console.log('📊 CTA performance analytics request with filters:', { from, to, lang, source, device });
      
      // Query real CTA performance data from Supabase VPS
      try {
        const { data: ctaClicks, error } = await hybridStorage.supabase
          .from('analytics_views')
          .select('*')
          .eq('page_url', 'contact');

        if (error) {
          console.warn('⚠️ CTA performance: Supabase query failed, using empty data:', error);
          res.json({ summary: [], by_page: [] });
          return;
        }

        // Process CTA performance data (real data from your Supabase VPS)
        const ctaSummary = ctaClicks?.reduce((acc: any, click: any) => {
          const ctaId = click.page_url || 'contact-form';
          if (!acc[ctaId]) {
            acc[ctaId] = { cta_id: ctaId, total_clicks: 0, unique_users: new Set() };
          }
          acc[ctaId].total_clicks++;
          if (click.session_id) {
            acc[ctaId].unique_users.add(click.session_id);
          }
          return acc;
        }, {});

        const summaryData = Object.values(ctaSummary || {}).map((cta: any) => ({
          cta_id: cta.cta_id,
          total_clicks: cta.total_clicks,
          unique_users: cta.unique_users.size
        }));

        console.log(`✅ CTA performance: Retrieved ${summaryData.length} CTAs from Supabase VPS`);
        res.json({ 
          summary: summaryData,
          by_page: [] // Could be enhanced later if needed
        });
      } catch (error) {
        console.warn('⚠️ CTA performance: Database query failed, returning empty data:', error);
        res.json({ summary: [], by_page: [] });
      }
    } catch (error) {
      console.error('❌ CTA performance analytics error:', error);
      res.status(500).json({ error: "Failed to get CTA performance data" });
    }
  });

  // Geo Distribution Analytics - Using hybrid storage instead of direct DB queries
  app.get("/api/analytics/geo", async (req, res) => {
    try {
      console.log('🌍 Geo analytics request:', req.query);
      
      // Get sessions from hybrid storage (works with Supabase VPS + JSON fallback)
      const sessions = await hybridStorage.getAnalyticsSessions(
        req.query.from as string,
        req.query.to as string,
        req.query.lang as string
      );
      
      if (!sessions || sessions.length === 0) {
        console.log('🌍 No sessions found for geo analysis');
        return res.json({ countries: [], cities: [] });
      }

      // Process sessions data for geo distribution
      const countryMap = new Map();
      const cityMap = new Map();
      
      sessions.forEach(session => {
        const country = session.country || 'Unknown';
        const city = session.city || 'Unknown';
        const sessionId = session.session_id;
        const ipAddress = session.ip_address;
        
        // Count countries
        if (!countryMap.has(country)) {
          countryMap.set(country, { 
            country: country,
            sessions: new Set(),
            visitors: new Set()
          });
        }
        countryMap.get(country).sessions.add(sessionId);
        countryMap.get(country).visitors.add(ipAddress);
        
        // Count cities  
        const cityKey = `${country}||${city}`;
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            country: country,
            city: city, 
            sessions: new Set(),
            visitors: new Set()
          });
        }
        cityMap.get(cityKey).sessions.add(sessionId);
        cityMap.get(cityKey).visitors.add(ipAddress);
      });

      // Convert to arrays and sort by session count
      const countries = Array.from(countryMap.values())
        .map(item => ({
          country: item.country,
          sessions: item.sessions.size,
          visitors: item.visitors.size
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 50);

      const cities = Array.from(cityMap.values())
        .map(item => ({
          country: item.country,
          city: item.city,
          sessions: item.sessions.size,
          visitors: item.visitors.size
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 50);

      console.log(`✅ Geo analytics: ${countries.length} countries, ${cities.length} cities from ${sessions.length} sessions`);
      res.json({ countries, cities });
    } catch (error) {
      console.error('❌ Geo analytics error:', error);
      res.status(500).json({ error: "Failed to get geo analytics data" });
    }
  });

  // Analytics Daily Overview - GET daily overview data for charts - FIXED to use hybrid storage  
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      console.log('📊 Analytics daily overview request with filters:', req.query);
      
      const { days, from, to, lang, source, device } = req.query;
      
      // Calculate date range based on days parameter if from/to not provided
      let dateFrom = from as string;
      let dateTo = to as string;
      
      if (!dateFrom && !dateTo && days) {
        const daysNum = parseInt(days as string) || 30;
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - daysNum);
        
        dateFrom = startDate.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        
        console.log(`📊 Calculated date range from days=${daysNum}: ${dateFrom} to ${dateTo}`);
      }
      
      // Use hybrid storage pattern like other working endpoints
      const sessions = await hybridStorage.getAnalyticsSessions(dateFrom, dateTo, lang as string);
      
      // Filter sessions based on parameters
      let filteredSessions = sessions.filter(session => !session.is_test_data);
      
      if (source) {
        filteredSessions = filteredSessions.filter(s => 
          s.referrer && s.referrer.toLowerCase().includes((source as string).toLowerCase())
        );
      }
      
      if (device) {
        filteredSessions = filteredSessions.filter(s => 
          s.user_agent && s.user_agent.toLowerCase().includes((device as string).toLowerCase())
        );
      }
      
      // Group by day and aggregate metrics
      const dailyData = new Map();
      
      filteredSessions.forEach(session => {
        const day = session.created_at.split('T')[0]; // Extract date part
        
        if (!dailyData.has(day)) {
          dailyData.set(day, {
            day,
            sessions: new Set(),
            unique_visitors: new Set(),
            returning_visitors: new Set(),
            session_durations: []
          });
        }
        
        const dayData = dailyData.get(day);
        dayData.sessions.add(session.session_id);
        dayData.unique_visitors.add(session.ip_address);
        
        if (session.is_returning) {
          dayData.returning_visitors.add(session.ip_address);
        }
        
        if (session.session_duration) {
          dayData.session_durations.push(session.session_duration);
        }
      });
      
      // Convert to final format
      const result = Array.from(dailyData.values()).map(day => ({
        day: day.day,
        sessions: day.sessions.size,
        unique_visitors: day.unique_visitors.size,
        returning_visitors: day.returning_visitors.size,
        avg_session_duration: day.session_durations.length > 0 
          ? Math.round(day.session_durations.reduce((a, b) => a + b, 0) / day.session_durations.length)
          : 0
      })).sort((a, b) => a.day.localeCompare(b.day));
      
      console.log(`✅ Daily overview: ${result.length} days with ${filteredSessions.length} sessions`);
      res.json(result);
    } catch (error) {
      console.error('❌ Daily overview error:', error);
      res.status(500).json({ error: "Failed to get daily overview data" });
    }
  });


  // NUCLEAR CACHE-BUSTING VIDEO ANALYTICS - v1.0.187
  app.get("/api/analytics/fresh-video-data", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      console.log('🚨 NUCLEAR CACHE BYPASS REQUEST - FRESH VIDEO DATA v1.0.187 with date filters:', { dateFrom, dateTo });
      
      // Set aggressive no-cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `fresh-${Date.now()}`);
      
      // Get all gallery videos first
      const galleryItems = await hybridStorage.getGalleryItems();
      console.log(`🚨 FRESH: Found ${galleryItems.length} gallery items in database`);
      
      // Get all video views from analytics with date filters
      const views = await hybridStorage.getAnalyticsViews(
        dateFrom as string, 
        dateTo as string
      );
      console.log(`🚨 FRESH: Found ${views.length} total analytics views`);
      
      // Create video filename mapping for better data integrity
      const videoMapping: any = {};
      const videoStats: any = {};
      
      // FIXED: Improved video name extraction and mapping
      galleryItems.forEach((item: any, index: number) => {
        let videoFilename = null;
        let displayName = null;
        
        // Extract actual video filename - prioritize video_filename and URLs
        if (item.video_filename && item.video_filename.trim()) {
          videoFilename = item.video_filename.includes('/') 
            ? item.video_filename.split('/').pop() 
            : item.video_filename;
        } else if (item.video_url_en && item.video_url_en.includes('.mp4')) {
          videoFilename = item.video_url_en.split('/').pop();
        } else if (item.video_url_fr && item.video_url_fr.includes('.mp4')) {
          videoFilename = item.video_url_fr.split('/').pop();
        } else if (item.filename && item.filename.includes('.mp4')) {
          videoFilename = item.filename.includes('/') 
            ? item.filename.split('/').pop() 
            : item.filename;
        }
        
        // Create display name from title for better user experience
        displayName = item.title_en || item.title_fr || videoFilename || `Gallery Video ${index + 1}`;
        
        // Skip entries without actual video files
        if (!videoFilename || !videoFilename.includes('.mp4')) {
          console.log(`🚨 FRESH: Skipping item ${index + 1}: No video file found (${displayName})`);
          return;
        }
        
        // Store mapping between different possible video identifiers
        videoMapping[videoFilename] = displayName;
        if (item.video_url_en) videoMapping[item.video_url_en.split('/').pop()] = displayName;
        if (item.video_url_fr) videoMapping[item.video_url_fr.split('/').pop()] = displayName;
        
        // Initialize stats with proper display name
        videoStats[videoFilename] = {
          video_id: displayName, // Use friendly display name
          total_views: 0,
          unique_viewers: new Set(),
          total_watch_time: 0,
          last_viewed: null // Use null instead of 1970 epoch for never-viewed videos
        };
        
        console.log(`🚨 FRESH: Initialized: ${videoFilename} → "${displayName}"`);
      });
      
      // Process all view events and calculate stats
      views.forEach((view: any) => {
        let matchedVideoId = null;
        
        // Try to match view to video using different potential identifiers
        const potentialIds = [
          view.video_id,
          view.video_filename,
          view.filename,
          typeof view.video_id === 'string' ? view.video_id.split('/').pop() : null,
          typeof view.video_filename === 'string' ? view.video_filename.split('/').pop() : null
        ].filter(Boolean);
        
        for (const id of potentialIds) {
          if (videoStats[id]) {
            matchedVideoId = id;
            break;
          }
        }
        
        if (!matchedVideoId) {
          console.log(`🚨 FRESH: Skipping unmatched view:`, Object.keys(view));
          return;
        }
        
        const stats = videoStats[matchedVideoId];
        stats.total_views += 1;
        stats.total_watch_time += Math.max(0, view.watch_time || 0); // Ensure non-negative
        stats.unique_viewers.add(view.ip_address || view.session_id || 'anonymous');
        
        // Update most recent view timestamp
        if (view.created_at && new Date(view.created_at) > new Date(stats.last_viewed)) {
          stats.last_viewed = view.created_at;
        }
      });
      
      // FIXED: Better final data preparation with accurate calculations
      const performanceData = Object.values(videoStats)
        .map((stats: any) => ({
          video_id: stats.video_id, // Friendly display name
          total_views: stats.total_views,
          unique_viewers: stats.unique_viewers.size,
          total_watch_time: Math.max(0, Math.round(stats.total_watch_time)),
          average_watch_time: stats.total_views > 0 
            ? Math.max(0, Math.round(stats.total_watch_time / stats.total_views)) 
            : 0,
          last_viewed: stats.last_viewed
        }))
        .sort((a, b) => {
          // Sort by total views, then by name for consistency
          if (a.total_views !== b.total_views) {
            return b.total_views - a.total_views;
          }
          return a.video_id.localeCompare(b.video_id);
        });
      
      console.log(`🚨 FRESH: Video performance: Processed ${performanceData.length} videos with clean data`);
      console.log('🚨 FRESH: Video display names:', performanceData.map(v => `"${v.video_id}": ${v.total_views} views`));
      res.json(performanceData);
    } catch (error) {
      console.error('❌ Fresh video data error:', error);
      res.status(500).json({ error: "Failed to get fresh video data" });
    }
  });

  // Video View Tracking - POST track video view
  app.post("/api/track-video-view", async (req, res) => {
    try {
      const { filename, session_id, watch_time, completion_rate } = req.body;
      console.log('📊 Video view tracking:', { filename, session_id, watch_time, completion_rate });
      
      const viewData = {
        video_id: filename,
        video_type: 'gallery',
        session_id: session_id || `session_${Date.now()}`,
        watch_time: watch_time || 0,
        completion_rate: completion_rate || 0,
        ip_address: req.ip || '0.0.0.0',
        user_agent: req.get('User-Agent') || '',
        language: req.get('Accept-Language')?.split(',')[0] || 'en-US'
      };
      
      const view = await hybridStorage.createAnalyticsView(viewData);
      res.json({ success: true, view });
    } catch (error) {
      console.error('❌ Video view tracking error:', error);
      res.status(500).json({ error: "Failed to track video view" });
    }
  });

  // SHORT URL ALIAS SYSTEM - v1.0.20 INFRASTRUCTURE WORKAROUND
  app.all("/api/v/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      console.log(`🎯 SHORT URL ALIAS REQUEST: /api/v/${videoId}`);
      
      // Map short IDs to actual filenames - expandable for all videos
      const videoMap: Record<string, string> = {
        // Gallery videos
        'g1': 'gallery_Our_vitamin_sea_rework_2_compressed.mp4',
        // Hero videos
        'h1': 'VideoHero1.mp4',
        'h2': 'VideoHero2.mp4', 
        'h3': 'VideoHero3.mp4',
        // Future videos can be added as: 'g2', 'g3', 'h4', etc.
      };
      
      const filename = videoMap[videoId];
      if (!filename) {
        console.log(`❌ Unknown video ID: ${videoId}`);
        return res.status(404).json({ error: "Video not found" });
      }
      
      console.log(`🔄 REDIRECTING ${videoId} → ${filename}`);
      
      // Use simple redirect to gallery video proxy - this bypasses internal forwarding issues
      const targetUrl = `/api/gallery-video-proxy?filename=${encodeURIComponent(filename)}`;
      console.log(`📍 Redirecting to: ${targetUrl}`);
      return res.redirect(302, targetUrl);
      
    } catch (error) {
      console.error('❌ Short URL alias error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Short URL alias failed", details: errorMessage });
    }
  });

  // Production Error Logging System - ENHANCED v1.0.45
  const productionErrorLog: any[] = [];
  const maxLogEntries = 50;

  function logProductionError(error: any, context: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace',
        code: error.code || 'unknown'
      },
      context,
      version: 'v1.0.50-route-entry-debug'
    };
    
    productionErrorLog.unshift(logEntry);
    if (productionErrorLog.length > maxLogEntries) {
      productionErrorLog.pop();
    }
    
    console.error('🚨 PRODUCTION ERROR LOGGED:', logEntry);
  }

  // API to retrieve production error logs
  app.get("/api/debug/production-errors", (req, res) => {
    console.log("🔍 PRODUCTION ERROR LOG REQUEST");
    res.json({
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      totalErrors: productionErrorLog.length,
      errors: productionErrorLog.slice(0, 10), // Return last 10 errors
      serverInfo: {
        workingDirectory: process.cwd(),
        dirname: __dirname,
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // VIDEO DIAGNOSTIC ENDPOINT - v1.0.46
  app.get("/api/video-debug", async (req, res) => {
    const filename = req.query.filename as string;
    
    console.log(`🔍 VIDEO DIAGNOSTIC REQUEST: ${filename}`);
    
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    const diagnosticReport: any = {
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString(),
      requestedFilename: filename,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        workingDirectory: process.cwd(),
        dirname: __dirname
      }
    };

    try {
      // Run the same logic as video proxy
      const decodedFilename = filename;
      const encodedFilename = encodeURIComponent(decodedFilename);
      const sanitizedFilename = decodedFilename.replace(/[()]/g, '_');
      
      diagnosticReport.filenames = {
        original: decodedFilename,
        encoded: encodedFilename,
        sanitized: sanitizedFilename
      };

      // Check cache status
      let videoFilename = decodedFilename;
      let cacheCheckResults: any = {};
      
      try {
        cacheCheckResults.decodedExists = videoCache.isVideoCached(decodedFilename);
        cacheCheckResults.encodedExists = videoCache.isVideoCached(encodedFilename);
        cacheCheckResults.sanitizedExists = videoCache.isVideoCached(sanitizedFilename);
        
        if (cacheCheckResults.decodedExists) {
          videoFilename = decodedFilename;
        } else if (cacheCheckResults.encodedExists) {
          videoFilename = encodedFilename;
        } else if (cacheCheckResults.sanitizedExists) {
          videoFilename = sanitizedFilename;
        }
      } catch (cacheError: any) {
        cacheCheckResults.error = cacheError.message;
      }
      
      diagnosticReport.cacheCheck = cacheCheckResults;
      diagnosticReport.selectedFilename = videoFilename;

      // Get cache path
      const cachedVideo = videoCache.getCachedVideoPath(videoFilename);
      diagnosticReport.cachePath = cachedVideo;

      // File existence and stats
      if (cachedVideo) {
        const fileExists = existsSync(cachedVideo);
        diagnosticReport.fileExists = fileExists;
        
        if (fileExists) {
          try {
            const stats = statSync(cachedVideo);
            diagnosticReport.fileStats = {
              size: stats.size,
              mode: stats.mode,
              uid: stats.uid,
              gid: stats.gid,
              atime: stats.atime,
              mtime: stats.mtime,
              ctime: stats.ctime,
              permissions: (stats.mode & parseInt('777', 8)).toString(8)
            };
            
            // Test read permissions
            try {
              const fd = openSync(cachedVideo, 'r');
              closeSync(fd);
              diagnosticReport.readable = true;
            } catch (readError: any) {
              diagnosticReport.readable = false;
              diagnosticReport.readError = {
                code: readError.code,
                message: readError.message
              };
            }
            
            // Test createReadStream
            try {
              const testStream = createReadStream(cachedVideo, { start: 0, end: 100 });
              testStream.destroy();
              diagnosticReport.streamCreation = { success: true };
            } catch (streamError: any) {
              diagnosticReport.streamCreation = {
                success: false,
                error: {
                  code: streamError.code,
                  message: streamError.message,
                  stack: streamError.stack
                }
              };
            }
          } catch (statError: any) {
            diagnosticReport.statError = {
              code: statError.code,
              message: statError.message
            };
          }
        }
      } else {
        diagnosticReport.cachePath = null;
        diagnosticReport.fileExists = false;
      }

      console.log(`✅ VIDEO DIAGNOSTIC COMPLETE: ${filename}`);
      res.json(diagnosticReport);
      
    } catch (error: any) {
      console.error(`❌ VIDEO DIAGNOSTIC ERROR: ${filename}`, error);
      diagnosticReport.criticalError = {
        message: error.message,
        stack: error.stack,
        code: error.code
      };
      res.status(500).json(diagnosticReport);
    }
  });

  // CRITICAL ROUTING TEST - v1.0.50
  app.get("/api/test-routing", (req, res) => {
    console.log("🔥 ROUTING TEST HIT - v1.0.50");
    res.json({ 
      message: "Routing works",
      version: "v1.0.50-route-entry-debug",
      timestamp: new Date().toISOString()
    });
  });

  // EMERGENCY GALLERY VIDEO DEBUG ROUTE - v1.0.45
  app.get("/api/debug-gallery-video", (req, res) => {
    console.log("🔍 EMERGENCY DEBUG ROUTE HIT - v1.0.45");
    console.log("   - Current version should be v1.0.45");
    console.log("   - Gallery video proxy route should work");
    res.json({ 
      version: "v1.0.45-final-stage-logging",
      message: "Debug route working",
      timestamp: new Date().toISOString(),
      videoProxyRouteExists: true,
      environment: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      dirname: __dirname
    });
  });

  // SIMPLIFIED VIDEO PROXY - Same logic for ALL videos v1.0.1754929638.HEAD_SUPPORT
  // Handle both GET and HEAD requests
  // Add HEAD support for browser video loading and enhanced production logging
  app.head("/api/video-proxy", async (req, res) => {
    // Production optimized - debug logging disabled
    await handleVideoProxy(req, res);
  });

  app.get("/api/video-proxy", async (req, res) => {
    // Production optimized - debug logging disabled
    await handleVideoProxy(req, res);
  });
  

  
  async function handleVideoProxy(req: any, res: any) {
    const VERSION = "v1.0.1754932191.ULTRA_DETAILED_LOGGING";
    const filename = req.query.filename as string;
    
    // Production optimized video classification
    const isHeroVideo = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(filename);
    const isGalleryVideo = !isHeroVideo && filename && filename.endsWith('.mp4');
    
    // Gallery videos bypass cache and stream from CDN
    if (isGalleryVideo) {
      await streamFromCDN(filename, req, res, VERSION);
      return;
    }
    
    // Production optimized - debug logging removed for performance
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      // Efficient cache check without extensive logging
      let cachedVideo = videoCache.getCachedVideoPath(filename);
      const fileExists = cachedVideo ? existsSync(cachedVideo) : false;
      
      if (cachedVideo && fileExists) {
        try {
          serveVideoFromCache(cachedVideo, req, res);
          return;
        } catch (cacheError: any) {
          // Continue to CDN fallback on cache error
        }
      }
      
      // Fallback to CDN streaming
      const encodedFilename = encodeURIComponent(filename);
      const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(supabaseUrl, {
        headers: {
          'Range': req.headers.range || 'bytes=0-',
          'User-Agent': 'MEMOPYK-VideoProxy/1.0'
        }
      });
      
      if (!response.ok) {
        return res.status(500).json({ 
          error: "Video not available",
          filename,
          status: response.status,
          statusText: response.statusText
        });
      }
      
      // Forward response headers
      const contentRange = response.headers.get('content-range');
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');
      
      const headers: any = {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'range, content-type',
        'Cache-Control': 'public, max-age=3600',
        'X-Video-Source': 'CDN'
      };
      
      if (contentRange) headers['Content-Range'] = contentRange;
      if (contentLength) headers['Content-Length'] = contentLength;
      if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
      
      const statusCode = response.status === 206 ? 206 : 200;
      res.writeHead(statusCode, headers);
      
      console.error(`📋 CDN STREAMING FOR ${filename}:`);
      console.error(`   - Response body exists: ${!!response.body}`);
      console.error(`   - About to stream to client...`);
      
      if (response.body) {
        // Stream the response body directly to the client
        response.body.pipe(res);
        console.error(`   - Stream piped successfully`);
        console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CDN SUCCESS) - ${filename} 🚨🚨🚨`);
      } else {
        console.error(`   - No response body, ending response`);
        res.end();
        console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (NO BODY) - ${filename} 🚨🚨🚨`);
      }
      
    } catch (error: any) {
      console.error(`🚨🚨🚨 CRITICAL ERROR IN VIDEO PROXY - ${filename} 🚨🚨🚨`);
      console.error(`❌ VIDEO PROXY ${VERSION} - CRITICAL ERROR for ${filename}:`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Error stack: ${error.stack}`);
      console.error(`❌ Error type: ${error.constructor.name}`);
      console.error(`❌ Request URL: ${req.url}`);
      console.error(`❌ Request method: ${req.method}`);
      console.error(`❌ Request headers:`, req.headers);
      console.error(`❌ Filename: ${filename}`);
      console.error(`❌ Range header: ${req.headers.range}`);
      console.error(`❌ User agent: ${req.headers['user-agent']}`);
      console.error(`❌ NODE_ENV: ${process.env.NODE_ENV}`);
      console.error(`❌ Working directory: ${process.cwd()}`);
      console.error(`❌ Full error object:`, error);
      console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (ERROR) - ${filename} 🚨🚨🚨`);
      
      res.status(500).json({ 
        error: "Video proxy failed",
        filename,
        message: error.message,
        version: VERSION,
        stack: error.stack,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        requestUrl: req.url,
        range: req.headers.range,
        userAgent: req.headers['user-agent']
      });
    }
  }
  
  // Helper function to stream gallery videos directly from CDN (bypassing cache)
  async function streamFromCDN(filename: string, req: any, res: any, version: string) {
    console.error(`🌐 STREAMING FROM CDN: ${filename}`);
    const encodedFilename = encodeURIComponent(filename);
    
    // CRITICAL FIX: Use the working Supabase domain  
    const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
    console.error(`   - CDN URL (VERIFIED): ${supabaseUrl}`);
    console.error(`   - Range header: ${req.headers.range || 'NONE'}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(supabaseUrl, {
      headers: {
        'Range': req.headers.range || 'bytes=0-',
        'User-Agent': 'MEMOPYK-GalleryProxy/1.0'
      }
    });
    
    console.error(`   - CDN response status: ${response.status}`);
    console.error(`   - CDN response ok: ${response.ok}`);
    
    if (!response.ok) {
      console.error(`❌ CDN STREAM FAILED: ${response.status} ${response.statusText}`);
      console.error(`🚨🚨🚨 ULTRA DETAILED VIDEO PROXY LOG END (CDN FAILED) - ${filename} 🚨🚨🚨`);
      return res.status(500).json({ 
        error: "Gallery video not available",
        filename,
        status: response.status,
        statusText: response.statusText,
        type: 'GALLERY_CDN_ERROR'
      });
    }
    
    // Forward response headers
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    
    const headers: any = {
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'range, content-type',
      'Cache-Control': 'public, max-age=3600',
      'X-Video-Source': 'GALLERY_CDN'
    };
    
    if (contentRange) headers['Content-Range'] = contentRange;
    if (contentLength) headers['Content-Length'] = contentLength;
    if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;
    
    const statusCode = response.status === 206 ? 206 : 200;
    res.writeHead(statusCode, headers);
    
    // Stream response
    response.body!.pipe(res);
    
    response.body!.on('end', () => {
      // Stream complete - production optimized logging
    });
  }
  
  // Helper function to serve video from cache
  function serveVideoFromCache(cachedVideo: string, req: any, res: any) {
    // Production optimized - debug logging removed for performance
    try {
      const stat = statSync(cachedVideo);
      const fileSize = stat.size;
      const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      let end = fileSize - 1;
      
      if (parts[1] && parts[1].trim()) {
        const parsedEnd = parseInt(parts[1], 10);
        if (!isNaN(parsedEnd)) {
          end = parsedEnd;
        }
      }
      
      const chunksize = (end - start) + 1;
      const stream = createReadStream(cachedVideo, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Video-Source': 'CACHE'
      });
      
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'X-Video-Source': 'CACHE'
      });
      
      const stream = createReadStream(cachedVideo);
      stream.pipe(res);
    }
    
    } catch (cacheError: any) {
      console.error(`❌ SERVE VIDEO FROM CACHE ERROR - DEBUG v1.0.1754928116:`);
      console.error(`   - Cache path: ${cachedVideo}`);
      console.error(`   - Error message: ${cacheError.message}`);
      console.error(`   - Error stack: ${cacheError.stack}`);
      console.error(`   - Error type: ${cacheError.constructor.name}`);
      console.error(`   - Range header: ${req.headers.range}`);
      console.error(`   - Full error object:`, cacheError);
      throw cacheError; // Re-throw to be caught by main try-catch
    }
  }

  // Image serving endpoint for cached images with Supabase fallback
  app.get("/api/image-proxy", async (req, res) => {
    const filename = req.query.filename as string;
    
    if (!filename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      const imagePath = path.join(process.cwd(), 'server', 'cache', 'images', filename);
      
      // Try cache first
      if (existsSync(imagePath)) {
        const stat = statSync(imagePath);
        const fileSize = stat.size;
        const contentType = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
        
        console.log(`📦 Serving image from cache: ${filename}`);
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': fileSize,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-Image-Source': 'CACHE'
        });
        
        const stream = createReadStream(imagePath);
        stream.pipe(res);
        return;
      }
      
      // Fallback to Supabase CDN
      console.log(`🌐 Image cache miss, streaming from Supabase: ${filename}`);
      
      const supabaseUrl = `https://dcrfcrjjuynwtdwjglhm.supabase.co/storage/v1/object/public/memopyk-videos/${filename}`;
      
      const response = await fetch(supabaseUrl);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
          'X-Image-Source': 'CDN'
        });
        
        if (response.body) {
          // Use Node.js Readable stream conversion for better compatibility
          const stream = require('stream');
          const readable = stream.Readable.fromWeb(response.body);
          readable.pipe(res);
        } else {
          res.end();
        }
      } else {
        console.error(`Image not found in cache or CDN: ${filename}`);
        res.status(404).json({ error: 'Image not found' });
      }
      
    } catch (error: any) {
      console.error(`Image proxy error for ${filename}:`, error);
      res.status(500).json({ error: 'Failed to serve image' });
    }
  });

  // Simplified gallery video proxy endpoint for /gv testing
  app.get("/api/gallery-video-proxy", async (req, res) => {
    const videoFilename = req.query.filename as string;
    const startTime = Date.now();
    
    if (!videoFilename) {
      return res.status(400).json({ error: "filename parameter is required" });
    }

    try {
      console.log(`🔍 [GALLERY-PROXY] Request for video: ${videoFilename}`);
      
      // Try local cache first
      const cachedVideo = path.join(process.cwd(), 'uploads', 'videos', videoFilename);
      
      if (existsSync(cachedVideo)) {
        const serveTime = Date.now() - startTime;
        console.log(`✅ [GALLERY-PROXY] CACHE HIT - Serving from local cache: ${videoFilename} (${serveTime}ms)`);
        
        const stat = statSync(cachedVideo);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
            'X-Video-Source': 'LOCAL_CACHE',
            'X-Serve-Time': `${serveTime}ms`
          });
          
          const stream = createReadStream(cachedVideo, { start, end });
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
            'X-Video-Source': 'LOCAL_CACHE',
            'X-Serve-Time': `${serveTime}ms`
          });
          
          const stream = createReadStream(cachedVideo);
          stream.pipe(res);
        }
      } else {
        // Fall back to direct Supabase CDN streaming
        console.log(`⚠️ [GALLERY-PROXY] CACHE MISS - Streaming from Supabase CDN: ${videoFilename}`);
        
        const supabaseUrl = `https://dcrfcrjjuynwtdwjglhm.supabase.co/storage/v1/object/public/memopyk-videos/${videoFilename}`;
        
        const response = await fetch(supabaseUrl, {
          headers: {
            'Range': req.headers.range || ''
          }
        });
        
        const serveTime = Date.now() - startTime;
        
        if (!response.ok) {
          console.log(`❌ [GALLERY-PROXY] CDN MISS - Video not found: ${videoFilename} (${serveTime}ms)`);
          return res.status(404).json({ error: 'Video not found in CDN' });
        }
        
        console.log(`🌐 [GALLERY-PROXY] CDN HIT - Streaming from Supabase: ${videoFilename} (${serveTime}ms)`);
        
        // Copy headers from Supabase response
        res.writeHead(response.status, {
          'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
          'Content-Length': response.headers.get('Content-Length') || '',
          'Content-Range': response.headers.get('Content-Range') || '',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
          'X-Video-Source': 'SUPABASE_CDN',
          'X-Serve-Time': `${serveTime}ms`
        });
        
        // Stream the response body
        if (response.body) {
          const reader = response.body.getReader();
          
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            } catch (error) {
              console.error(`❌ [GALLERY-PROXY] Stream error for ${videoFilename}:`, error);
              res.end();
            }
          };
          
          pump();
        } else {
          res.end();
        }
      }
    } catch (error: any) {
      const serveTime = Date.now() - startTime;
      console.error(`❌ [GALLERY-PROXY] Error serving ${videoFilename} (${serveTime}ms):`, error);
      res.status(500).json({ error: 'Failed to serve video', source: 'PROXY_ERROR', serveTime: `${serveTime}ms` });
    }
  });

  // Deployment Marker API Endpoints
  
  // Get deployment markers
  app.get("/api/deployment/markers", async (req, res) => {
    try {
      const markersDir = path.join(process.cwd());
      const markerFiles = readdirSync(markersDir)
        .filter(file => file.startsWith('DEPLOYMENT_MARKER') && file.endsWith('.json'))
        .map(file => {
          try {
            const fullPath = path.join(markersDir, file);
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const stats = statSync(fullPath);
            return {
              filename: file,
              description: content.fix || content.description || 'No description',
              timestamp: content.timestamp || stats.mtime.toISOString(),
              version: content.version || '1.0.0'
            };
          } catch (error) {
            console.error(`Error reading deployment marker ${file}:`, error);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      res.json(markerFiles);
    } catch (error) {
      console.error('Error loading deployment markers:', error);
      res.status(500).json({ error: 'Failed to load deployment markers' });
    }
  });

  // Create deployment marker - FIXED TO USE ENHANCED SCRIPT
  app.post("/api/deployment/create-marker", async (req, res) => {
    const { description, keep } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    console.log(`🚀 ADMIN: Creating enhanced deployment marker for: ${description}`);
    
    try {
      // Call the ENHANCED deployment marker script (the one from the troubleshooting guide)
      const { spawn } = require('child_process');
      const scriptPath = path.join(process.cwd(), 'scripts', 'enhanced-deployment-marker.js');
      
      const args = [
        `--description=${description}`,
        `--keep=${keep || 10}`,
        '--aggressive'  // Use aggressive cache-busting for admin-created markers
      ];
      
      const child = spawn('node', [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      let responseHandled = false;
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (responseHandled) return; // Prevent double response
        responseHandled = true;
        
        if (code === 0) {
          console.log(`✅ Enhanced deployment marker created successfully`);
          console.log(stdout);
          
          // Extract filename from stdout
          const filenameMatch = stdout.match(/Created enhanced force clean marker: (.+)/);
          const markerFilename = filenameMatch ? filenameMatch[1] : 'ENHANCED_DEPLOYMENT_MARKER.txt';
          
          res.json({ 
            success: true, 
            filename: markerFilename,
            message: 'Enhanced deployment marker created with aggressive cache-busting',
            output: stdout
          });
        } else {
          console.error(`❌ Enhanced deployment marker script failed with code ${code}`);
          console.error('STDERR:', stderr);
          res.status(500).json({ 
            error: 'Failed to create enhanced deployment marker',
            details: stderr || 'Script execution failed'
          });
        }
      });
      
      child.on('error', (error) => {
        if (responseHandled) return; // Prevent double response
        responseHandled = true;
        
        console.error(`❌ Failed to spawn enhanced deployment marker script:`, error);
        res.status(500).json({ 
          error: 'Failed to execute enhanced deployment marker script',
          details: error.message
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to create enhanced deployment marker:', error);
      res.status(500).json({ 
        error: 'Failed to create enhanced deployment marker',
        details: error.message 
      });
    }
  });

  // Delete deployment marker
  app.delete("/api/deployment/markers/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      if (!filename.startsWith('DEPLOYMENT_MARKER') || !filename.endsWith('.json')) {
        return res.status(400).json({ error: 'Invalid marker filename' });
      }

      const filePath = path.join(process.cwd(), filename);
      
      if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Marker not found' });
      }

      unlinkSync(filePath);
      console.log(`🗑️ Deleted deployment marker: ${filename}`);
      
      res.json({ success: true, message: `Marker ${filename} deleted successfully` });
    } catch (error) {
      console.error('Error deleting deployment marker:', error);
      res.status(500).json({ error: 'Failed to delete deployment marker' });
    }
  });

  // ========== GA4 ANALYTICS ENDPOINTS ==========
  let ga4Service: any = null;
  
  // Phase 3 - Import node-cache for 60s caching
  const NodeCache = require('node-cache');
  const ga4ReportCache = new NodeCache({ stdTTL: 60 }); // 60 second TTL

  // Initialize GA4 service function
  const initGA4 = () => {
    if (!ga4Service) {
      try {
        ga4Service = {}; // Service now uses direct query functions
        console.log('✅ GA4 Analytics service initialized');
      } catch (error) {
        console.error('⚠️ GA4 initialization failed, using fallback mode:', (error as Error).message);
        // Create a fallback service that returns mock data
        ga4Service = {
          getKPIs: async (startDate: string, endDate: string, locale: string = 'all') => ({
            range: { start: startDate, end: endDate, locale },
            kpis: {
              plays_unique_viewers: Math.floor(Math.random() * 1000) + 500,
              avg_watch_time_sec: Math.floor(Math.random() * 120) + 60,
              completion_rate: Math.random() * 0.3 + 0.4,
              plays_by_locale: [
                { locale: 'fr-FR', users: Math.floor(Math.random() * 300) + 200 },
                { locale: 'en-US', users: Math.floor(Math.random() * 200) + 150 },
              ],
            },
            cached: false,
            note: 'Demo mode - GA4 service account needs configuration'
          }),
          getTopVideos: async (startDate: string, endDate: string, locale: string = 'all', limit: number = 10) => ({
            rows: Array.from({ length: Math.min(limit, 8) }, (_, i) => ({
              video_id: `video_${i + 1}_gallery.mp4`,
              plays: Math.floor(Math.random() * 200) + 50,
              avg_watch_time_sec: Math.floor(Math.random() * 90) + 30,
              reach50_pct: Math.random() * 0.4 + 0.3,
              complete100_pct: Math.random() * 0.3 + 0.2,
            })),
            cached: false
          }),
          getFunnelData: async (startDate: string, endDate: string, locale: string = 'all') => ({
            rows: [
              { video_id: 'all', percent: 25, count: Math.floor(Math.random() * 400) + 600 },
              { video_id: 'all', percent: 50, count: Math.floor(Math.random() * 300) + 400 },
              { video_id: 'all', percent: 75, count: Math.floor(Math.random() * 200) + 250 },
              { video_id: 'all', percent: 100, count: Math.floor(Math.random() * 150) + 100 },
            ],
            cached: false
          }),
          getTrendData: async (startDate: string, endDate: string, locale: string = 'all') => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              days.push({
                date: d.toISOString().split('T')[0],
                plays: Math.floor(Math.random() * 100) + 20,
                avg_watch_time_sec: Math.floor(Math.random() * 60) + 40,
              });
            }
            return { days, cached: false };
          },
          getRealtimeData: async () => ({
            active: Math.floor(Math.random() * 10) + 1,
            recent: Array.from({ length: 5 }, (_, i) => ({
              ts: new Date(Date.now() - i * 60000).toISOString(),
              event: 'video_play',
              video_id: `gallery_video_${Math.floor(Math.random() * 6) + 1}.mp4`,
              locale: Math.random() > 0.5 ? 'fr-FR' : 'en-US',
              percent: Math.floor(Math.random() * 100),
            })),
            cached: false
          })
        };
      }
    }
    return ga4Service;
  };

  // ========== PHASE 3 GA4 REPORT ENDPOINT ==========
  
  // Import utilities
  const { resolveDates } = await import('./utils/resolveDates');
  const { dateRangeFromQuery } = await import('./utils/dateRangeFromQuery');

  // ========== GA4 QUERY HELPERS ==========
  
  // GA4 dimension filter helpers
  function dimEquals(name: string, value: string) {
    return {
      filter: { fieldName: name, stringFilter: { matchType: "EXACT", value } }
    };
  }

  function andExpr(...expressions: any[]) {
    return { andGroup: { expressions } };
  }

  function orExpr(...expressions: any[]) {
    return { orGroup: { expressions } };
  }

  // Optional geo/language filters (skip if not registered)
  function maybeGeoLangFilter({ lang, country }: {lang?: string; country?: string}) {
    const expr: any[] = [];
    // Skip geo/lang filters for now - can add when dimensions are registered
    // if (lang)    expr.push(dimEquals("language", lang));
    // if (country) expr.push(dimEquals("country", country));
    if (!expr.length) return undefined;
    return andExpr(...expr);
  }

  // Import new GA4 client
  const { runGa4Report } = await import('./services/ga4Client');

  // ========== GA4 QUERY FUNCTIONS ==========

  // KPIs: Sessions + Engagement by date
  async function qKpisSessionsAndEngagement(opts: any) {
    const { dateRange, lang, country } = opts;
    const dimensionFilter = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "userEngagementDuration" }
      ],
      ...(dimensionFilter ? { dimensionFilter } : {}),
    };

    return runGa4Report(payload);
  }

  // KPIs: Plays (video_start) by date  
  async function qKpisStartsByDate(opts: any) {
    const { dateRange, lang, country } = opts;
    const geoLang = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: andExpr(
        dimEquals("eventName", "video_start"),
        ...(geoLang ? [geoLang] : [])
      ),
    };

    return runGa4Report(payload);
  }

  // KPIs: Completions (progress_percent=90) by date
  async function qKpisCompletionsByDate(opts: any) {
    const { dateRange, lang, country } = opts;
    const geoLang = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: andExpr(
        dimEquals("eventName", "video_progress"),
        dimEquals("customEvent:progress_percent", "90"),
        ...(geoLang ? [geoLang] : [])
      ),
    };

    return runGa4Report(payload);
  }

  // Top Videos: Starts by video
  async function qTopVideosStarts(opts: any) {
    const { dateRange, lang, country } = opts;
    const geoLang = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: andExpr(
        dimEquals("eventName", "video_start"),
        ...(geoLang ? [geoLang] : [])
      ),
      orderBys: [{ desc: true, metric: { metricName: "eventCount" } }],
      limit: 5000
    };

    return runGa4Report(payload);
  }

  // Top Videos: Completions by video
  async function qTopVideosCompletions(opts: any) {
    const { dateRange, lang, country } = opts;
    const geoLang = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [
        { name: "customEvent:video_id" },
        { name: "customEvent:video_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: andExpr(
        dimEquals("eventName", "video_progress"),
        dimEquals("customEvent:progress_percent", "90"),
        ...(geoLang ? [geoLang] : [])
      ),
      limit: 5000
    };

    return runGa4Report(payload);
  }

  // Video Funnel: Progress buckets for single video
  async function qVideoFunnelByBuckets(opts: any) {
    const { dateRange, videoId, lang, country } = opts;
    const geoLang = maybeGeoLangFilter({ lang, country });

    const payload = {
      dateRanges: [dateRange],
      dimensions: [{ name: "customEvent:progress_percent" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: andExpr(
        dimEquals("eventName", "video_progress"),
        dimEquals("customEvent:video_id", videoId),
        ...(geoLang ? [geoLang] : [])
      ),
      orderBys: [{ dimension: { dimensionName: "customEvent:progress_percent" } }],
    };

    return runGa4Report(payload);
  }

  // ========== RESPONSE MAPPERS ==========

  function mapKpis(sessionsRows: any[], startsRows: any[], completesRows: any[], engagementRows: any[]) {
    // Helper
    const sum = (arr: number[]) => arr.reduce((a,b) => a+b, 0);

    const sessionsTrend = sessionsRows.map((r: any) => ({
      date: r.dimensionValues[0].value,
      value: Number(r.metricValues[0].value)
    }));
    
    const engagementTrend = engagementRows.map((r: any) => ({
      date: r.dimensionValues[0].value,
      value: Number(r.metricValues[1].value) // sessions, userEngagementDuration
    }));

    const startsTrend = startsRows.map((r: any) => ({
      date: r.dimensionValues[0].value,
      value: Number(r.metricValues[0].value)
    }));
    
    const completesTrend = completesRows.map((r: any) => ({
      date: r.dimensionValues[0].value,
      value: Number(r.metricValues[0].value)
    }));

    return {
      kpis: {
        sessions: { value: sum(sessionsTrend.map(d=>d.value)), trend: sessionsTrend },
        plays: { value: sum(startsTrend.map(d=>d.value)), trend: startsTrend },
        completions: { value: sum(completesTrend.map(d=>d.value)), trend: completesTrend },
        avgWatch: { value: Math.round(sum(engagementTrend.map(d=>d.value)) / (engagementTrend.length || 1)), trend: engagementTrend }
      },
      timestamp: new Date().toISOString(),
      cached: false
    };
  }

  async function mapTopVideos(startsRows: any[], completesRows: any[]) {
    const startsMap = new Map<string, { title: string; plays: number }>();
    for (const r of startsRows) {
      const vid = r.dimensionValues[0].value;
      const title = r.dimensionValues[1].value;
      const plays = Number(r.metricValues[0].value);
      startsMap.set(vid, { title, plays });
    }

    // Create enhanced title fallback function
    const getVideoTitle = async (videoId: string, gaTitle: string): Promise<string> => {
      // If GA4 has a real title (not "(not set)"), use it
      if (gaTitle && gaTitle !== '(not set)') {
        return gaTitle;
      }
      
      // Fallback: try to get title from gallery data
      try {
        const galleryItems = await hybridStorage.getGalleryItems();
        const galleryItem = galleryItems.find(item => 
          item.video_filename === videoId || 
          item.video_url_en?.includes(videoId) ||
          item.video_url_fr?.includes(videoId)
        );
        
        if (galleryItem) {
          // Use English title if available, fallback to French, then video ID
          return galleryItem.title_en || galleryItem.title_fr || videoId;
        }
      } catch (error) {
        console.warn('Failed to fetch gallery titles for fallback:', error);
      }
      
      // Final fallback: clean up the video filename for display
      return videoId.replace(/\.(mp4|mov|avi)$/i, '').replace(/[_-]/g, ' ');
    };

    const rows: { videoId: string; title: string; plays: number; completions: number; completionRate: number }[] = [];

    // Process completions with enhanced titles
    for (const r of completesRows) {
      const vid = r.dimensionValues[0].value;
      const title = r.dimensionValues[1].value;
      const completions = Number(r.metricValues[0].value);
      const base = startsMap.get(vid) || { title, plays: 0 };
      const rate = base.plays ? (completions / base.plays) : 0;
      
      const enhancedTitle = await getVideoTitle(vid, base.title);
      rows.push({ videoId: vid, title: enhancedTitle, plays: base.plays, completions, completionRate: rate });
      startsMap.delete(vid);
    }

    // Videos that have starts but zero completions
    for (const [vid, { title, plays }] of startsMap.entries()) {
      const enhancedTitle = await getVideoTitle(vid, title);
      rows.push({ videoId: vid, title: enhancedTitle, plays, completions: 0, completionRate: 0 });
    }

    // Guard: warn if all completion rates are 1.0 (suspicious)
    const allPerfectRates = rows.length > 0 && rows.every(r => r.completionRate === 1 && r.plays > 0);
    if (allPerfectRates) {
      console.warn('🚨 GA4 Data Warning: All videos have 100% completion rate - this looks like mock data patterns');
    }

    return { 
      topVideos: rows.sort((a,b) => b.plays - a.plays),
      timestamp: new Date().toISOString(),
      cached: false
    };
  }

  function mapVideoFunnel(rows: any[]) {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const bucket = r.dimensionValues[0].value; // "10","25","50","75","90"
      const count = Number(r.metricValues[0].value);
      buckets.set(bucket, count);
    }
    const ensure = (k: string) => buckets.get(k) ?? 0;

    return {
      funnel: [
        { bucket: 10, count: ensure("10") },
        { bucket: 25, count: ensure("25") },
        { bucket: 50, count: ensure("50") },
        { bucket: 75, count: ensure("75") },
        { bucket: 90, count: ensure("90") }
      ],
      timestamp: new Date().toISOString(),
      cached: false
    };
  }




  // Import middleware
  const { parseGa4Query } = await import('./middleware/parseGa4Query');

  // Phase 3 GA4 Report Endpoint with centralized query parsing
  app.get('/api/ga4/report', parseGa4Query, async (req, res) => {
    try {
      const ga4 = res.locals.ga4!;
      console.log('🎯 GA4 API REQUEST INTERCEPTED: GET /api/ga4/report');
      console.log('📊 GA4 Report requested:', ga4);

      const cacheKey = JSON.stringify(ga4);
      const cached = ga4ReportCache.get(cacheKey);
      if (cached) {
        console.log('✅ GA4 Report returned from cache');
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Data-Source', process.env.GA4_MOCK === 'true' ? 'mock' : 'live');
        res.setHeader('X-GA4-Property', process.env.GA4_PROPERTY_ID || 'unknown');
        
        // Add comprehensive Paris timezone headers for cached responses too
        setParisTimezoneHeaders(res, req.query);
        
        return res.json(cached);
      }

      let result;
      const { dateRange, lang, country } = ga4;

      switch (ga4.report) {
        case 'kpis': {
          const [sess, starts, comps] = await Promise.all([
            qKpisSessionsAndEngagement({ dateRange, lang, country }),
            qKpisStartsByDate({ dateRange, lang, country }),
            qKpisCompletionsByDate({ dateRange, lang, country }),
          ]);
          result = mapKpis(sess.rows ?? [], starts.rows ?? [], comps.rows ?? [], sess.rows ?? []);
          break;
        }
        case 'topVideos': {
          const [starts, comps] = await Promise.all([
            qTopVideosStarts({ dateRange, lang, country }),
            qTopVideosCompletions({ dateRange, lang, country }),
          ]);
          result = await mapTopVideos(starts.rows ?? [], comps.rows ?? []);
          break;
        }
        case 'videoFunnel': {
          const vf = await qVideoFunnelByBuckets({ dateRange, lang, country, videoId: ga4.videoId! });
          result = mapVideoFunnel(vf.rows ?? []);
          break;
        }
      }

      ga4ReportCache.set(cacheKey, result);
      console.log(`✅ GA4 Report completed: ${ga4.report}`);
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Data-Source', process.env.GA4_MOCK === 'true' ? 'mock' : 'live');
      res.setHeader('X-GA4-Property', process.env.GA4_PROPERTY_ID || 'unknown');
      
      // Add comprehensive Paris timezone headers
      setParisTimezoneHeaders(res, req.query);
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ GA4 report error:', error);
      
      // Handle missing custom dimensions with helpful error messages
      if (error.code === 'MISSING_CUSTOM_DIMENSION') {
        return res.status(400).json({
          error: 'Missing GA4 Custom Dimension',
          message: error.message,
          missingDimensions: error.missingDimensions,
          instructions: 'Create the missing custom dimensions in GA4 Admin → Custom definitions → Create custom dimension (Event scope)'
        });
      }
      
      // Handle GA4 INVALID_ARGUMENT errors with detailed information
      if (error.code === 3 || (error.originalError && error.originalError.code === 3)) {
        return res.status(400).json({
          error: 'GA4 Invalid Argument',
          message: error.message,
          ga4Code: error.code,
          details: 'This usually indicates missing custom dimensions or invalid query parameters',
          instructions: 'Check that video_id, video_title, and progress_bucket custom dimensions exist in GA4 Admin'
        });
      }
      
      // Default error handling with enhanced details
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        error: statusCode === 500 ? 'Internal server error' : 'GA4 API Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        ga4Code: error.code || undefined
      });
    }
  });

  // GA4 Custom Dimensions Check endpoint
  app.get('/api/ga4/check-dimensions', async (req, res) => {
    try {
      const { checkGa4CustomDimensions } = await import('./services/ga4Client');
      const dimensions = await checkGa4CustomDimensions();
      
      const missing = Object.entries(dimensions)
        .filter(([_, exists]) => !exists)
        .map(([name, _]) => name);
      
      res.json({
        success: true,
        dimensions,
        allPresent: missing.length === 0,
        missing,
        instructions: missing.length > 0 
          ? `Create missing custom dimensions in GA4 Admin → Custom definitions: ${missing.join(', ')}`
          : 'All required custom dimensions are present'
      });
    } catch (error) {
      console.error('❌ GA4 dimensions check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GA4 Debug endpoint for watch time investigation
  app.get('/api/ga4/debug-watch-time', async (req, res) => {
    try {
      const startDate = '2024-08-01';
      const endDate = '2025-12-31';
      
      console.log('🔍 GA4 WATCH TIME DEBUG - Investigating all event types with custom metrics');
      
      // Query all events with custom metric watch_time_seconds - no event filter
      const request = {
        property: GA4_PROPERTY,
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: "eventName" },
          { name: "customEvent:video_id" },
          { name: "customEvent:video_title" }
        ],
        metrics: [
          { name: "eventCount" },
          { name: "customEvent:watch_time_seconds" }
        ],
        orderBys: [
          { metric: { metricName: "eventCount" }, desc: true }
        ],
        limit: 50
      };

      const [response] = await ga4Client.runReport(request);
      
      console.log('🔍 GA4 DEBUG RAW RESPONSE:', JSON.stringify(response.rows?.slice(0, 10), null, 2));
      
      const debugData = response.rows?.map(row => ({
        eventName: row.dimensionValues?.[0]?.value || 'unknown',
        video_id: row.dimensionValues?.[1]?.value || '(not set)',
        video_title: row.dimensionValues?.[2]?.value || '(not set)',
        eventCount: parseInt(row.metricValues?.[0]?.value || '0'),
        watchTimeSeconds: parseInt(row.metricValues?.[1]?.value || '0')
      })) || [];
      
      res.json({
        success: true,
        totalEvents: debugData.length,
        debugData: debugData.slice(0, 20),
        summary: {
          totalWatchTimeAcrossAllEvents: debugData.reduce((sum, event) => sum + event.watchTimeSeconds, 0),
          eventsWithWatchTime: debugData.filter(e => e.watchTimeSeconds > 0).length,
          eventsWithVideoId: debugData.filter(e => e.video_id !== '(not set)').length
        }
      });
      
    } catch (error) {
      console.error('❌ GA4 Debug error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GA4 Connection Test endpoint - tests basic GA4 query functionality
  app.get("/api/ga4/test", async (req, res) => {
    try {
      console.log('🔍 GA4 connection test requested');
      
      // Test basic query function with yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const testDate = yesterday.toISOString().split('T')[0];
      
      console.log(`Testing qPlays function with date: ${testDate}`);
      const plays = await qPlays(testDate, testDate, 'all');
      console.log(`qPlays result: ${plays}`);
      
      // Test simple qCompletes with just video_complete events
      console.log('Testing simple qCompletes...');
      const [simpleRes] = await ga4Service.client.runReport({
        property: "properties/501023254",
        dateRanges: [{ startDate: testDate, endDate: testDate }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "video_complete" } }
        }
      });
      const simpleCompletes = Number(simpleRes.rows?.[0]?.metricValues?.[0]?.value ?? 0);
      console.log(`Simple completes result: ${simpleCompletes}`);
      
      console.log('✅ GA4 connection test successful');
      res.json({
        success: true,
        testDate,
        testPlays: plays,
        simpleCompletes,
        message: "GA4 query functions working correctly"
      });
    } catch (error) {
      console.error('❌ GA4 connection test failed:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'GA4 connection test failed',
        success: false,
        fullError: JSON.stringify(error, null, 2)
      });
    }
  });

  // GA4 Custom Parameters Test endpoint - finds correct dimension/metric names
  app.get("/api/ga4/test-params", async (req, res) => {
    try {
      console.log('🔍 GA4 custom parameters test requested');
      const service = initGA4();
      const result = await service.testCustomParams();
      
      console.log('✅ GA4 custom parameters test completed');
      res.json(result);
    } catch (error) {
      console.error('❌ GA4 custom parameters test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'GA4 custom parameters test failed',
        success: false 
      });
    }
  });

  // Test individual GA4 queries to isolate the issue
  app.get("/api/ga4/test-individual", async (req, res) => {
    try {
      console.log('🔍 Testing individual GA4 queries');
      const service = initGA4();
      
      const results: any = {};
      
      try {
        console.log('Testing getPlays...');
        results.plays = await service.getPlays('7daysAgo', 'today', 'all');
        console.log('✅ getPlays works:', results.plays);
      } catch (error: any) {
        results.playsError = error.message;
        console.log('❌ getPlays failed:', error.message);
      }
      
      try {
        console.log('Testing getCompletes...');
        results.completes = await service.getCompletes('7daysAgo', 'today', 'all');
        console.log('✅ getCompletes works:', results.completes);
      } catch (error: any) {
        results.completesError = error.message;
        console.log('❌ getCompletes failed:', error.message);
      }

      try {
        console.log('Testing getWatchTime...');
        results.watchTime = await service.getWatchTime('7daysAgo', 'today', 'all');
        console.log('✅ getWatchTime works:', results.watchTime);
      } catch (error: any) {
        results.watchTimeError = error.message;
        console.log('❌ getWatchTime failed:', error.message);
      }

      try {
        console.log('Testing getTopLocale...');
        results.topLocale = await service.getTopLocale('7daysAgo', 'today');
        console.log('✅ getTopLocale works:', results.topLocale);
      } catch (error: any) {
        results.topLocaleError = error.message;
        console.log('❌ getTopLocale failed:', error.message);
      }
      
      res.json(results);
    } catch (error) {
      console.error('❌ Individual test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Individual test failed',
        success: false 
      });
    }
  });

  // NEW CLEAN GA4 API ENDPOINTS using your exact drop-in queries
  
  // Function to parse parameters (from your spec) - handles both startDate/endDate and start/end formats
  function getParams(req: any) {
    const startDate = String(req.query.startDate || req.query.start || '');
    const endDate = String(req.query.endDate || req.query.end || '');
    const locale = req.query.locale ? String(req.query.locale) : "all";
    const country = req.query.country ? String(req.query.country) : "all";
    
    // 🔍 CRITICAL DEBUG: Track server-side locale parameter reception
    console.log('🟡 SERVER GETPARAMS DEBUG:', {
      'req.query.locale': req.query.locale,
      'processed_locale': locale,
      'full_query': req.query,
      'url': req.url
    });
    const nocache = req.query.nocache === "1" || req.query.nocache === "true";
    const sinceDate = req.query.since ? String(req.query.since) : req.query.sinceDate ? String(req.query.sinceDate) : undefined;
    
    if (!startDate || startDate === 'undefined' || !endDate || endDate === 'undefined') {
      throw new Error("startDate/start and endDate/end are required (YYYY-MM-DD)");
    }
    
    return { startDate, endDate, locale, country, nocache, sinceDate };
  }

  // Debug endpoint to list all available events in GA4
  app.get("/api/ga4/debug-events", async (req, res) => {
    try {
      console.log('🔍 GA4 debug events requested');
      const { startDate = '2025-08-27', endDate = '2025-09-02' } = req.query;
      
      const { qAllEvents } = await import('./ga4-service');
      const result = await qAllEvents(startDate as string, endDate as string);
      
      res.json({
        success: true,
        dateRange: { startDate, endDate },
        ...result
      });
    } catch (error) {
      console.error('❌ GA4 debug events failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Debug events failed',
        success: false 
      });
    }
  });


  // Private Log Visitor Details endpoint - for Analytics New diagnostics (IP-aware)
  app.get("/api/private-log/visitor-details", async (req, res) => {
    try {
      const { startDate, endDate, datePreset } = req.query;
      
      console.log(`🔍 Private Log Visitor Details Request: datePreset=${datePreset}, startDate=${startDate}, endDate=${endDate}`);
      
      // Handle datePreset parameter for consistency with GA4 endpoints OR explicit dates
      let calcStartDate = startDate;
      let calcEndDate = endDate;
      
      if (!startDate || !endDate) {
        if (datePreset) {
          const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(
            datePreset as string
          );
          calcStartDate = calcStart;
          calcEndDate = calcEnd;
          console.log(`📅 Private Log Date preset '${datePreset}' resolved to: ${calcStartDate} to ${calcEndDate}`);
        } else {
          // Default to last 7 days if no dates or preset provided
          const { startDate: calcStart, endDate: calcEnd } = calculateDateRange("7d");
          calcStartDate = calcStart;
          calcEndDate = calcEnd;
          console.log(`📅 Private Log Default to 7d: ${calcStartDate} to ${calcEndDate}`);
        }
      } else {
        console.log(`📅 Private Log Using explicit dates: ${calcStartDate} to ${calcEndDate}`);
      }
      
      // Get analytics sessions from private log (Supabase) with IP exclusion filtering
      const sessions = await hybridStorage.getAnalyticsSessions(
        calcStartDate as string,
        calcEndDate as string,
        undefined // no language filter
      );
      
      console.log(`🔍 Private Log: Found ${sessions.length} sessions after IP exclusion filtering`);
      
      // Transform sessions into visitor details format with IP masking
      const visitorDetails = sessions.map((session, index) => {
        return {
          id: session.session_id || `session_${index}`,
          ip_address: session.ip_address || 'Unknown',
          country: session.country || 'Unknown',
          region: session.region || 'Unknown', 
          city: session.city || 'Unknown',
          language: session.language || 'Unknown',
          last_visit: session.created_at,
          user_agent: session.user_agent ? session.user_agent.substring(0, 80) + '...' : 'Unknown',
          visit_count: 1, // Event-based, not deduplicated
          session_duration: session.session_duration || 0,
          previous_visit: null, // Not tracking in this minimal implementation
          source: 'private_log' // Clear data source labeling
        };
      });
      
      console.log(`✅ Private Log Visitor Details: Returning ${visitorDetails.length} masked visitor records`);
      res.json(visitorDetails);
      
    } catch (error) {
      console.error('❌ Private Log visitor details error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Private log visitor details failed',
        source: 'private_log'
      });
    }
  });

  // GA4 Geographic Data endpoint - consistent with Analytics New GA4-only approach
  app.get("/api/ga4/geo", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      const key = k(`geo:${startDate}:${endDate}:${locale}`);

      console.log(`🌍 GA4 GEO REQUEST: ${startDate} to ${endDate}, locale: ${locale}`);

      // Try cache first
      const cached = getCache<any>(key);
      if (cached) {
        console.log(`✅ CACHE HIT: Returning cached geo data for ${key}`);
        return res.json(cached);
      }

      // Fetch GA4 geographic data using the existing qTopCountries function
      const countries = await qTopCountries(startDate, endDate);
      
      // Transform to match expected format
      const data = {
        countries: countries.map(c => ({
          country: c.country,
          sessions: c.visitors, // GA4 provides visitors, map to sessions for consistency
          visitors: c.visitors
        })),
        cities: [], // GA4 doesn't provide city data in basic version
        timestamp: new Date().toISOString(),
        cached: false
      };

      console.log(`🌍 GA4 GEO RESULT: ${countries.length} countries from GA4`);
      console.log(`🌍 GA4 GEO SAMPLE:`, countries.slice(0, 3));

      // Cache the result
      setCache(key, data, 300);
      await setDbCache(key, data, 300);

      res.json(data);
    } catch (error) {
      console.error('❌ GA4 geo error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'GA4 geo failed',
        countries: [],
        cities: []
      });
    }
  });

  // GA4 KPIs endpoint - using consistent date handling like Geo API
  app.get("/api/ga4/kpis", async (req, res, next) => {
    try {
      let startDate, endDate, locale, nocache, sinceDate, country;
      
      // Handle both preset and direct date parameters
      if (req.query.preset) {
        // Use server-side preset calculation for consistency
        const preset = String(req.query.preset);
        const window = computeParisWindow({ preset, since: req.query.since || req.query.sinceDate });
        startDate = window.effStartStr;
        endDate = window.effEndStr;
        console.log(`📅 PRESET: ${preset} calculated as ${startDate} to ${endDate}${sinceDate ? ` (filtered since ${sinceDate})` : ''}`);
        locale = req.query.locale ? String(req.query.locale) : "all";
        country = req.query.country ? String(req.query.country) : "all";
        nocache = req.query.nocache === "1" || req.query.nocache === "true";
        // ✅ CRITICAL FIX: Accept both 'since' and 'sinceDate' for robust parameter handling
        sinceDate = req.query.since ? String(req.query.since) : req.query.sinceDate ? String(req.query.sinceDate) : undefined;
      } else {
        // Direct date parameters - use getParams for consistency with Geo API
        ({ startDate, endDate, locale, nocache, sinceDate } = getParams(req));
        country = req.query.country ? String(req.query.country) : "all";
        console.log(`📅 DIRECT DATES: Using direct dates: ${startDate} to ${endDate}`);
      }

      // ✅ FIXED: Exclusion filter already applied in computeParisWindow, no need to reapply
      // Include since and country parameters in cache key to prevent cache collision
      const key = k(`kpis:${startDate}:${endDate}:${locale}:${country}:${sinceDate || 'none'}`);

      console.log(`🔍 GA4 KPIs REQUEST: ${startDate} to ${endDate}, locale: ${locale}, cache key: ${key}`);

      // Simple cache check without timeout (faster and more stable)
      if (!nocache) {
        console.log(`🔍 Checking cache for key: ${key}`);
        
        // Try memory cache first (faster)
        const memoryCached = getCache<any>(key);
        if (memoryCached) {
          console.log(`✅ CACHE HIT (MEMORY): Returning cached data for ${key}`);
          
          // ✅ CRITICAL FIX: Add cache debugging headers to identify locale collision issue
          res.setHeader('X-Cache-Key', key);
          res.setHeader('X-Locale', locale);
          res.setHeader('X-Country', country);
          res.setHeader('X-Since-Date', sinceDate || 'none');
          res.setHeader('X-Date-Range', `${startDate} to ${endDate}`);
          res.setHeader('X-Cache-Status', 'HIT-MEMORY');
          console.log(`🔍 CACHE DEBUG HEADERS ADDED (HIT): locale=${locale}, country=${country}, key=${key}`);
          
          return res.json(memoryCached);
        }
        
        console.log(`❌ CACHE MISS: No cached data found for ${key}`);
      } else {
        console.log(`🚫 CACHE BYPASSED for ${key}`);
      }

      console.log(`📊 GA4 KPIs request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);      
      
      // Add 2-second timeout wrapper for GA4 API calls
      const timeoutPromise = (name: string) => new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`GA4 API timeout: ${name} took longer than 2 seconds`)), 2000)
      );

      // Test each query individually to identify which is failing
      let plays = 0, completes = 0, totalWatch = 0, topLocale = { locale: "n/a", plays: 0 };
      let totalUsers = 0, returningUsers = 0, sessions = 0;

      try {
        console.log('Testing qPlays...');
        // Add timeout to prevent hanging - this is the root cause of frontend timeouts
        const playsPromise = qPlays(startDate, endDate, locale, country);
        const playsTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('qPlays timeout after 5 seconds')), 5000)
        );
        plays = await Promise.race([playsPromise, playsTimeout]);
        console.log(`✅ qPlays: ${plays}`);
      } catch (e) {
        console.error('❌ qPlays failed:', (e as Error).message);
        throw new Error(`qPlays failed: ${(e as Error).message}`);
      }

      try {
        console.log('Testing qCompletes...');
        completes = await qCompletes(startDate, endDate, locale, country);
        console.log(`✅ qCompletes: ${completes}`);
      } catch (e) {
        console.error('❌ qCompletes failed:', (e as Error).message);
        throw new Error(`qCompletes failed: ${(e as Error).message}`);
      }

      try {
        console.log('Testing qWatchTimeTotal...');
        // Pass the already-retrieved plays and completes data to avoid re-fetching
        totalWatch = await Promise.race([qWatchTimeTotal(startDate, endDate, locale, country, plays, completes), timeoutPromise('qWatchTimeTotal')]);
        console.log(`✅ qWatchTimeTotal: ${totalWatch}`);
      } catch (e) {
        console.error('❌ qWatchTimeTotal failed:', (e as Error).message);
        // CRITICAL FIX: Use ONLY authentic GA4 data - NO fallback calculations or estimations
        console.log('🚨 AUTHENTIC GA4 DATA ONLY: No fallback calculations allowed');
        totalWatch = 0; // If no authentic GA4 data available, return 0 - never generate fake data
        console.log(`✅ qWatchTimeTotal AUTHENTIC GA4 ONLY: ${totalWatch}`);
      }

      try {
        console.log('Testing qTopLanguages...');
        topLocale = await Promise.race([qTopLanguages(startDate, endDate), timeoutPromise('qTopLanguages')]);
        console.log(`✅ qTopLanguages:`, topLocale);
      } catch (e) {
        console.error('❌ qTopLanguages failed:', (e as Error).message);
        throw new Error(`qTopLanguages failed: ${(e as Error).message}`);
      }

      // ==========================================================================
      // 🚨 CRITICAL GA4 DIAGNOSTIC LOGGING - INVESTIGATING DATA INFLATION ISSUE
      // Expected values for Sept 7-10: 40 sessions, 16 users
      // Dashboard showing: 133 sessions, 77 users (232-381% inflation)
      // ==========================================================================
      
      console.log("\n" + "=".repeat(80));
      console.log("🚨 GA4 INFLATION DIAGNOSTICS - RAW API RESPONSE ANALYSIS");
      console.log("=".repeat(80));
      console.log(`📊 Query Parameters:`);
      console.log(`   Date Range: ${startDate} to ${endDate}`);
      console.log(`   Locale Filter: ${locale}`);
      console.log(`   Expected Sessions: 40 (from direct GA4 API)`);
      console.log(`   Expected Users: 16 (from direct GA4 API)`);
      console.log(`   Cache Bypassed: ${nocache}`);
      console.log(`   Current User IP: ${req.ip || req.connection?.remoteAddress || 'Unknown'}`);
      console.log(`   Request Headers X-Forwarded-For: ${req.headers['x-forwarded-for'] || 'None'}`);
      console.log(`   Request Headers X-Real-IP: ${req.headers['x-real-ip'] || 'None'}`);
      
      // Check if IP exclusions are being applied
      console.log(`🚫 IP EXCLUSION CHECK:`);
      console.log(`   Known Excluded IP: 109.17.150.48 (Capdenac home network)`);
      console.log(`   ⚠️  NOTE: GA4 API queries should exclude this IP if implemented properly`);
      
      // Check date filtering implementation
      console.log(`📅 DATE FILTERING CHECK:`);
      console.log(`   Raw Query Params:`, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        preset: req.query.preset,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        sinceDate: req.query.sinceDate
      });
      console.log("");

      // Fetch visitor metrics for Analytics New
      try {
        console.log('🔍 Testing qSessions() - CAPTURING RAW RESPONSE...');
        sessions = await Promise.race([qSessions(startDate, endDate, locale, country), timeoutPromise('qSessions')]);
        
        console.log("📋 qSessions RAW RESULT ANALYSIS:");
        console.log(`   ✅ Sessions Returned: ${sessions}`);
        console.log(`   🎯 Expected: 40 sessions`);
        console.log(`   📊 Inflation Factor: ${sessions > 0 ? (sessions / 40).toFixed(2) + 'x' : 'N/A'}`);
        console.log(`   🚨 Status: ${sessions === 40 ? 'CORRECT' : 'INFLATED BY ' + Math.round(((sessions - 40) / 40) * 100) + '%'}`);
        
      } catch (e) {
        console.error('❌ qSessions failed:', (e as Error).message);
        sessions = plays; // Fallback to plays count
        console.log(`⚠️ qSessions fallback: using plays count ${sessions}`);
      }

      try {
        console.log('\n🔍 Testing qTotalUsers() - CAPTURING RAW RESPONSE...');
        totalUsers = await Promise.race([qTotalUsers(startDate, endDate, locale, country), timeoutPromise('qTotalUsers')]);
        
        console.log("📋 qTotalUsers RAW RESULT ANALYSIS:");
        console.log(`   ✅ Users Returned: ${totalUsers}`);
        console.log(`   🎯 Expected: 16 users`);
        console.log(`   📊 Inflation Factor: ${totalUsers > 0 ? (totalUsers / 16).toFixed(2) + 'x' : 'N/A'}`);
        console.log(`   🚨 Status: ${totalUsers === 16 ? 'CORRECT' : 'INFLATED BY ' + Math.round(((totalUsers - 16) / 16) * 100) + '%'}`);
        
      } catch (e) {
        console.error('❌ qTotalUsers failed:', (e as Error).message);
        totalUsers = 0; // No fallback - use authentic GA4 data only
        console.log(`⚠️ qTotalUsers fallback: ${totalUsers}`);
      }

      try {
        console.log('Testing qReturningUsers...');
        returningUsers = await Promise.race([qReturningUsers(startDate, endDate, locale, country), timeoutPromise('qReturningUsers')]);
        console.log(`✅ qReturningUsers: ${returningUsers}`);
      } catch (e) {
        console.error('❌ qReturningUsers failed:', (e as Error).message);
        returningUsers = 0; // No fallback - use authentic GA4 data only
        console.log(`⚠️ qReturningUsers fallback: ${returningUsers}`);
      }

      // CRITICAL FIX: Use ONLY authentic GA4 totalWatch data - NO estimations or calculations
      const avgWatchSeconds = (totalWatch > 0 && plays > 0) ? Math.round(totalWatch / plays) : 0;
      const completionRate = plays > 0 ? (completes / plays) * 100 : 0;

      // Calculate previous period for comparison - ONLY calculate comparison period, NOT current period
      let prevSessions = 0, prevTotalUsers = 0, prevReturningUsers = 0, prevPlays = 0, prevCompletes = 0, prevTotalWatch = 0;
      
      try {
        // ✅ CRITICAL FIX: Use Paris timezone for comparison period (matching calculateDateRange logic)
        const { formatInTimeZone } = require('date-fns-tz');
        const TZ = 'Europe/Paris';
        
        const startDateObj = new Date(startDate + 'T00:00:00.000Z');
        const endDateObj = new Date(endDate + 'T00:00:00.000Z');
        const rangeDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const compareEndDate = new Date(startDateObj.getTime() - (1000 * 60 * 60 * 24));
        const compareStartDate = new Date(compareEndDate.getTime() - ((rangeDays - 1) * 1000 * 60 * 60 * 24));
        
        const compareStartDateStr = formatInTimeZone(compareStartDate, TZ, 'yyyy-MM-dd');
        const compareEndDateStr = formatInTimeZone(compareEndDate, TZ, 'yyyy-MM-dd');
        
        console.log(`📊 Fetching previous period data: ${compareStartDateStr} to ${compareEndDateStr}`);
        
        // Fetch previous period data
        const [prevSessionsData, prevTotalUsersData, prevReturningUsersData, prevPlaysData, prevCompletesData, prevTotalWatchData] = await Promise.all([
          qSessions(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qSessions failed:', e.message); return 0; }),
          qTotalUsers(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qTotalUsers failed:', e.message); return 0; }),
          qReturningUsers(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qReturningUsers failed:', e.message); return 0; }),
          qPlays(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qPlays failed:', e.message); return 0; }),
          qCompletes(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qCompletes failed:', e.message); return 0; }),
          qWatchTimeTotal(compareStartDateStr, compareEndDateStr, locale, country).catch(e => { console.error('❌ Previous qWatchTimeTotal failed:', e.message); return 0; })
        ]);
        
        prevSessions = prevSessionsData;
        prevTotalUsers = prevTotalUsersData;
        prevReturningUsers = prevReturningUsersData;
        prevPlays = prevPlaysData;
        prevCompletes = prevCompletesData;
        prevTotalWatch = prevTotalWatchData;
        
        console.log(`📊 Previous period data: Sessions ${prevSessions}, Users ${prevTotalUsers}, Returning ${prevReturningUsers}, Plays ${prevPlays}`);
      } catch (e) {
        console.error('❌ Failed to fetch previous period data:', e);
      }
      
      // Calculate percentage changes
      const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };
      
      const totalViewsChange = calculatePercentageChange(sessions, prevSessions);
      const uniqueVisitorsChange = calculatePercentageChange(totalUsers, prevTotalUsers);
      const returnVisitorsChange = calculatePercentageChange(returningUsers, prevReturningUsers);
      const playsChange = calculatePercentageChange(plays, prevPlays);
      const completionsChange = calculatePercentageChange(completes, prevCompletes);
      const avgWatchChange = calculatePercentageChange(avgWatchSeconds, prevTotalWatch > 0 && prevPlays > 0 ? Math.round(prevTotalWatch / prevPlays) : 0);
      
      console.log(`🔍 CHANGE CALCULATIONS: Views ${totalViewsChange}%, Visitors ${uniqueVisitorsChange}%, Returns ${returnVisitorsChange}%, Plays ${playsChange}%`);

      // Transform into the expected KpisResponse format for frontend
      const data = {
        kpis: {
          // Existing technical metrics (Row 2)
          sessions: { value: sessions, trend: [], change: calculatePercentageChange(sessions, prevSessions) },
          plays: { value: plays, trend: [], change: playsChange },
          completions: { value: completes, trend: [], change: completionsChange },
          avgWatch: { value: avgWatchSeconds, trend: [], change: avgWatchChange },
          // New visitor-focused metrics (Row 1) - FIXED: Ensure logical consistency
          totalViews: { value: sessions, trend: [], change: totalViewsChange }, // Total Views = GA4 sessions
          uniqueVisitors: { value: Math.min(totalUsers, sessions), trend: [], change: uniqueVisitorsChange }, // FIXED: Unique visitors cannot exceed total views
          returnVisitors: { value: Math.min(returningUsers, sessions), trend: [], change: returnVisitorsChange } // FIXED: Return visitors cannot exceed total views
        },
        timestamp: new Date().toISOString(),
        cached: false
      };

      // ==========================================================================
      // 🚨 COMPREHENSIVE DATA INFLATION ANALYSIS SUMMARY
      // ==========================================================================
      console.log("\n" + "=".repeat(80));
      console.log("🚨 FINAL DATA INFLATION ANALYSIS SUMMARY");
      console.log("=".repeat(80));
      console.log("📊 RAW GA4 API RESULTS vs EXPECTED:");
      console.log(`   Sessions: ${sessions} (Expected: 40) - ${sessions === 40 ? '✅ CORRECT' : '🚨 INFLATED BY ' + Math.round(((sessions - 40) / 40) * 100) + '%'}`);
      console.log(`   Users: ${totalUsers} (Expected: 16) - ${totalUsers === 16 ? '✅ CORRECT' : '🚨 INFLATED BY ' + Math.round(((totalUsers - 16) / 16) * 100) + '%'}`);
      console.log(`   Returning Users: ${returningUsers}`);
      console.log("");
      console.log("📊 PROCESSED DASHBOARD VALUES:");
      console.log(`   Total Views: ${data.kpis.totalViews.value} (Change: ${data.kpis.totalViews.change}%)`);
      console.log(`   Unique Visitors: ${data.kpis.uniqueVisitors.value} (Change: ${data.kpis.uniqueVisitors.change}%)`);
      console.log(`   Return Visitors: ${data.kpis.returnVisitors.value} (Change: ${data.kpis.returnVisitors.change}%)`);
      console.log("");
      console.log("🎯 ROOT CAUSE INVESTIGATION:");
      console.log(`   ❓ Is qSessions() returning inflated data from GA4 API?`);
      console.log(`   ❓ Is date filtering working (should be Sept 7-10 only)?`);
      console.log(`   ❓ Are IP exclusions properly applied to GA4 queries?`);
      console.log(`   ❓ Is there post-processing inflation happening?`);
      console.log("=".repeat(80));
      
      console.log(`📊 FULL KPIs DATA STRUCTURE for ${key}:`, JSON.stringify(data, null, 2));

      // Store in both persistent and memory cache
      console.log(`💾 Storing in cache with key: ${key}`);
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      console.log(`✅ Data stored in cache for key: ${key}`);
      
      // ✅ CRITICAL FIX: Add cache debugging headers to identify locale collision issue
      res.setHeader('X-Cache-Key', key);
      res.setHeader('X-Locale', locale);
      res.setHeader('X-Country', country);
      res.setHeader('X-Since-Date', sinceDate || 'none');
      res.setHeader('X-Date-Range', `${startDate} to ${endDate}`);
      res.setHeader('X-Cache-Status', 'MISS-STORED');
      console.log(`🔍 CACHE DEBUG HEADERS ADDED: locale=${locale}, country=${country}, key=${key}`);
      
      // Add comprehensive Paris timezone headers
      setParisTimezoneHeaders(res, req.query);
      
      res.json(data);
    } catch (e) { 
      console.error('❌ GA4 KPIs error:', e);
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // Helper function to calculate date ranges from presets using Europe/Paris timezone
  function calculateDateRange(preset: string, dateFrom?: string, dateTo?: string, sinceDate?: string): { startDate: string; endDate: string; compareStartDate: string; compareEndDate: string } {
    const { formatInTimeZone } = require('date-fns-tz');
    const TZ = 'Europe/Paris';
    let startDate: string;
    let endDate: string;
    let compareStartDate: string;
    let compareEndDate: string;

    if (preset === 'custom' && dateFrom && dateTo) {
      startDate = dateFrom;
      endDate = dateTo;
      
      // Calculate previous period of same length for comparison
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const comparisonEnd = new Date(start);
      comparisonEnd.setDate(comparisonEnd.getDate() - 1);
      const comparisonStart = new Date(comparisonEnd);
      comparisonStart.setDate(comparisonStart.getDate() - (days - 1));
      
      compareStartDate = formatInTimeZone(comparisonStart, TZ, 'yyyy-MM-dd');
      compareEndDate = formatInTimeZone(comparisonEnd, TZ, 'yyyy-MM-dd');
    } else {
      // Handle preset ranges using Europe/Paris timezone
      if (preset === 'today') {
        // Today: 00:00 to 24:00 Paris time
        const nowLocal = new Date();
        const todayLocal = formatInTimeZone(nowLocal, TZ, 'yyyy-MM-dd');
        startDate = todayLocal;
        endDate = todayLocal;
        
        // Comparison: yesterday
        const yesterdayLocal = new Date(nowLocal);
        yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
        const yesterdayStr = formatInTimeZone(yesterdayLocal, TZ, 'yyyy-MM-dd');
        compareStartDate = yesterdayStr;
        compareEndDate = yesterdayStr;
      } else if (preset === 'yesterday') {
        // Yesterday: the previous Paris day
        const nowLocal = new Date();
        const yesterdayLocal = new Date(nowLocal);
        yesterdayLocal.setDate(yesterdayLocal.getDate() - 1);
        const yesterdayStr = formatInTimeZone(yesterdayLocal, TZ, 'yyyy-MM-dd');
        startDate = yesterdayStr;
        endDate = yesterdayStr;
        
        // Comparison: day before yesterday
        const dayBeforeLocal = new Date(nowLocal);
        dayBeforeLocal.setDate(dayBeforeLocal.getDate() - 2);
        const dayBeforeStr = formatInTimeZone(dayBeforeLocal, TZ, 'yyyy-MM-dd');
        compareStartDate = dayBeforeStr;
        compareEndDate = dayBeforeStr;
      } else {
        // Handle day-based presets (7d, 30d, 90d)
        let days: number;
        switch (preset) {
          case '30d':
            days = 30;
            break;
          case '90d':
            days = 90;
            break;
          case '7d':
          default:
            days = 7;
            break;
        }
      
      // Get current time in Europe/Paris timezone
      const nowLocal = new Date();
      
      // ✅ CRITICAL FIX: End date = TODAY (not yesterday) to match computeParisWindow
      const endLocal = new Date(nowLocal);
      endDate = formatInTimeZone(endLocal, TZ, 'yyyy-MM-dd');
      
      // Start date = today minus (days - 1) in Europe/Paris timezone
      const startLocal = new Date(endLocal);
      startLocal.setDate(startLocal.getDate() - (days - 1));
      startDate = formatInTimeZone(startLocal, TZ, 'yyyy-MM-dd');
      
      // Previous period of same length
      const compareEndLocal = new Date(startLocal);
      compareEndLocal.setDate(compareEndLocal.getDate() - 1);
      compareEndDate = formatInTimeZone(compareEndLocal, TZ, 'yyyy-MM-dd');
      
        const compareStartLocal = new Date(compareEndLocal);
        compareStartLocal.setDate(compareStartLocal.getDate() - (days - 1));
        compareStartDate = formatInTimeZone(compareStartLocal, TZ, 'yyyy-MM-dd');
      }
    }

    // Apply sinceDate filtering if provided
    if (sinceDate && sinceDate > startDate) {
      console.log(`📅 SINCE DATE FILTER: Adjusting start date from ${startDate} to ${sinceDate}`);
      startDate = sinceDate;
      
      // For comparison, also adjust if the sinceDate affects the comparison period
      if (sinceDate > compareStartDate) {
        compareStartDate = sinceDate;
      }
    }

    console.log(`🇫🇷 TIMEZONE-ALIGNED DATES (Europe/Paris):`);
    console.log(`   Current: ${startDate} to ${endDate}`);
    console.log(`   Compare: ${compareStartDate} to ${compareEndDate}`);
    console.log(`   Since Filter: ${sinceDate || 'none'}`);
    console.log(`   Timezone: ${TZ}`);

    return { startDate, endDate, compareStartDate, compareEndDate };
  }

  // Helper function to generate daily sparkline data
  async function generateSparklineData(startDate: string, endDate: string, compareStartDate: string, compareEndDate: string, locale?: string) {
    console.log(`🔍 Generating sparkline data from ${startDate} to ${endDate}, compare: ${compareStartDate} to ${compareEndDate}`);
    
    try {
      // Get daily trend data for current period
      const currentTrend = await qTrendDaily(startDate, endDate, locale);
      console.log(`✅ Current trend data: ${currentTrend.length} days`);
      
      // Get daily trend data for comparison period
      const compareTrend = await qTrendDaily(compareStartDate, compareEndDate, locale);
      console.log(`✅ Compare trend data: ${compareTrend.length} days`);
      
      // Process current period data
      const sessions = currentTrend.map(day => day.plays || 0);
      const plays = currentTrend.map(day => day.plays || 0);
      const avgWatchTimeSec = currentTrend.map(day => Math.round(day.avgWatch || 0));
      
      // Calculate completion rates (simplified - we'll use the overall completion rate for each day)
      const totalPlays = await qPlays(startDate, endDate, locale);
      const totalCompletes = await qCompletes(startDate, endDate, locale);
      const overallCompletionRate = totalPlays > 0 ? (totalCompletes / totalPlays) * 100 : 0;
      const completionRatePct = currentTrend.map(() => Math.round(overallCompletionRate));
      
      return {
        current: {
          sessions,
          plays,
          avgWatchTimeSec,
          completionRatePct
        },
        previous: {
          sessions: compareTrend.map(day => day.plays || 0),
          plays: compareTrend.map(day => day.plays || 0),
          avgWatchTimeSec: compareTrend.map(day => Math.round(day.avgWatch || 0)),
          completionRatePct: compareTrend.map(() => Math.round(overallCompletionRate))
        }
      };
    } catch (error) {
      console.error('❌ Sparkline generation error:', error);
      // Return empty arrays as fallback
      return {
        current: {
          sessions: [],
          plays: [],
          avgWatchTimeSec: [],
          completionRatePct: []
        },
        previous: {
          sessions: [],
          plays: [],
          avgWatchTimeSec: [],
          completionRatePct: []
        }
      };
    }
  }

  // NEW GA4 Report endpoint for Analytics New dashboard
  app.post("/api/ga4/report", async (req, res) => {
    try {
      const { preset = '7d', dateFrom, dateTo, sinceDate } = req.body;
      console.log(`🎯 GA4 Report request: preset=${preset}, dateFrom=${dateFrom}, dateTo=${dateTo}, sinceDate=${sinceDate}`);
      
      // Calculate date ranges including comparison period
      const { startDate, endDate, compareStartDate, compareEndDate } = calculateDateRange(preset, dateFrom, dateTo, sinceDate);
      console.log(`📅 Calculated ranges: Current (${startDate} to ${endDate}), Compare (${compareStartDate} to ${compareEndDate})`);
      
      // Check cache first (60s TTL as specified)
      const cacheKey = `ga4-report:${preset}:${startDate}:${endDate}${sinceDate ? `:since-${sinceDate}` : ''}`;
      const cached = getCache<any>(cacheKey);
      if (cached) {
        console.log(`✅ GA4 Report cache hit for ${cacheKey}`);
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Data-Source', process.env.GA4_MOCK === 'true' ? 'mock' : 'live');
        res.setHeader('X-GA4-Property', process.env.GA4_PROPERTY_ID || 'unknown');
        return res.json(cached);
      }
      
      console.log(`🔄 GA4 Report generating fresh data for ${cacheKey}`);
      
      // Fetch current period KPIs
      console.log('📊 Fetching current period KPIs...');
      const [currentSessions, currentPlays, currentCompletes, currentWatchTime, currentSessionDuration] = await Promise.all([
        qSessions(startDate, endDate), // FIXED: Using unfiltered sessions
        qPlays(startDate, endDate),
        qCompletes(startDate, endDate),
        qWatchTimeTotal(startDate, endDate),
        qAverageSessionDuration(startDate, endDate)
      ]);
      
      console.log(`✅ Current period: sessions=${currentSessions}, plays=${currentPlays}, completes=${currentCompletes}, watchTime=${currentWatchTime}s, sessionDuration=${currentSessionDuration}s`);
      
      // Fetch comparison period KPIs
      console.log('📊 Fetching comparison period KPIs...');
      const [compareSessions, comparePlays, compareCompletes, compareWatchTime, compareSessionDuration] = await Promise.all([
        qSessions(compareStartDate, compareEndDate), // FIXED: Using unfiltered sessions
        qPlays(compareStartDate, compareEndDate),
        qCompletes(compareStartDate, compareEndDate),
        qWatchTimeTotal(compareStartDate, compareEndDate),
        qAverageSessionDuration(compareStartDate, compareEndDate)
      ]);
      
      console.log(`✅ Compare period: sessions=${compareSessions}, plays=${comparePlays}, completes=${compareCompletes}, watchTime=${compareWatchTime}s, sessionDuration=${compareSessionDuration}s`);
      
      // Calculate robust avgWatchTimeSec with proper zero-handling
      let avgWatchTimeSec: number;
      let avgWatchTimeSource: 'custom' | 'sessionDuration' | 'zero';
      
      // CRITICAL FIX: Only show avgWatchTime when there are actual sessions/plays
      if (currentSessions === 0 && currentPlays === 0) {
        avgWatchTimeSec = 0;
        avgWatchTimeSource = 'zero';
        console.log(`📊 ZERO SESSIONS/PLAYS: avgWatchTimeSec = 0s (no activity in period)`);
      } else if (currentWatchTime > 0 && currentPlays > 0) {
        avgWatchTimeSec = Math.round(currentWatchTime / currentPlays);
        avgWatchTimeSource = 'custom';
        console.log(`📊 Using custom watch_time_seconds: ${avgWatchTimeSec}s (${currentWatchTime}s total / ${currentPlays} plays)`);
      } else if (currentSessions > 0 || currentPlays > 0) {
        // Only use sessionDuration fallback if there's actual activity
        avgWatchTimeSec = currentSessionDuration;
        avgWatchTimeSource = 'sessionDuration';
        console.log(`📊 Fallback to averageSessionDuration: ${avgWatchTimeSec}s (custom metric returned 0 but activity exists)`);
      } else {
        // Fallback for edge cases
        avgWatchTimeSec = 0;
        avgWatchTimeSource = 'zero';
        console.log(`📊 FALLBACK TO ZERO: No sessions, no plays, avgWatchTimeSec = 0s`);
      }
      
      console.log(`📊 Final avgWatchTimeSec = ${avgWatchTimeSec}s [source=${avgWatchTimeSource}]`);
      
      // Same logic for comparison period with proper zero-handling
      let compareAvgWatchTimeSec: number;
      let compareAvgWatchTimeSource: 'custom' | 'sessionDuration' | 'zero';
      
      // CRITICAL FIX: Only show avgWatchTime when there are actual sessions/plays
      if (compareSessions === 0 && comparePlays === 0) {
        compareAvgWatchTimeSec = 0;
        compareAvgWatchTimeSource = 'zero';
      } else if (compareWatchTime > 0 && comparePlays > 0) {
        compareAvgWatchTimeSec = Math.round(compareWatchTime / comparePlays);
        compareAvgWatchTimeSource = 'custom';
      } else if (compareSessions > 0 || comparePlays > 0) {
        // Only use sessionDuration fallback if there's actual activity
        compareAvgWatchTimeSec = compareSessionDuration;
        compareAvgWatchTimeSource = 'sessionDuration';
      } else {
        // Fallback for edge cases
        compareAvgWatchTimeSec = 0;
        compareAvgWatchTimeSource = 'zero';
      }
      
      console.log(`📊 Final compareAvgWatchTimeSec = ${compareAvgWatchTimeSec}s [source=${compareAvgWatchTimeSource}]`);
      
      const completionRatePct = currentPlays > 0 ? Math.round((currentCompletes / currentPlays) * 100) : 0;
      const compareCompletionRatePct = comparePlays > 0 ? Math.round((compareCompletes / comparePlays) * 100) : 0;
      
      // Generate sparkline data
      console.log('📈 Generating sparkline data...');
      const sparklineData = await generateSparklineData(startDate, endDate, compareStartDate, compareEndDate);
      
      // Build response according to specification
      const response = {
        kpis: {
          sessions: currentSessions,
          plays: currentPlays,
          avgWatchTimeSec,
          completionRatePct
        },
        sparklines: sparklineData.current,
        previousPeriod: {
          kpis: {
            sessions: compareSessions,
            plays: comparePlays,
            avgWatchTimeSec: compareAvgWatchTimeSec,
            completionRatePct: compareCompletionRatePct
          },
          sparklines: sparklineData.previous
        },
        dateRange: {
          current: { from: startDate, to: endDate },
          previous: { from: compareStartDate, to: compareEndDate }
        },
        avgWatchTimeSource,
        compareAvgWatchTimeSource,
        cached: false,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ GA4 Report generated successfully for ${cacheKey}`);
      console.log(`📊 Final KPIs: sessions=${currentSessions}, plays=${currentPlays}, avgWatch=${avgWatchTimeSec}s, completion=${completionRatePct}%`);
      console.log(`📊 avgWatchTimeSource: ${avgWatchTimeSource}, compareAvgWatchTimeSource: ${compareAvgWatchTimeSource}`);
      
      // Cache for 60 seconds
      setCache(cacheKey, { ...response, cached: true }, 60);
      
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Data-Source', process.env.GA4_MOCK === 'true' ? 'mock' : 'live');
      res.setHeader('X-GA4-Property', process.env.GA4_PROPERTY_ID || 'unknown');
      res.json(response);
      
    } catch (error) {
      console.error('❌ GA4 Report error:', error);
      res.status(500).json({ 
        error: 'Failed to generate GA4 report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Phase 3: Duplicate endpoint removed - using new centralized middleware approach

  // GA4 Schema diagnostic endpoint to understand available custom events
  app.get("/api/ga4/debug-schema", async (req, res) => {
    try {
      const { startDate = '2025-08-10', endDate = '2025-08-16' } = req.query;
      
      // Import the client directly
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
      const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
      const client = new BetaAnalyticsDataClient(
        SA_KEY ? { credentials: JSON.parse(SA_KEY) } : {}
      );
      
      // Get all custom events for debugging
      const [eventsRes] = await client.runReport({
        property: `properties/${process.env.GA4_PROPERTY_ID || "501023254"}`,
        dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        limit: 100
      });

      const events = (eventsRes.rows ?? []).map(r => ({
        eventName: r.dimensionValues?.[0]?.value ?? "",
        count: Number(r.metricValues?.[0]?.value ?? 0)
      }));

      // Try to get custom parameters for video events
      let customParameters = [];
      try {
        const [paramsRes] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID || "501023254"}`,
          dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          dimensions: [
            { name: "eventName" },
            { name: "customEvent:video_id" },
            { name: "customEvent:locale" }
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: { fieldName: "eventName", stringFilter: { matchType: "CONTAINS", value: "video" } }
          },
          limit: 50
        });

        customParameters = (paramsRes.rows ?? []).map(r => ({
          eventName: r.dimensionValues?.[0]?.value ?? "",
          videoId: r.dimensionValues?.[1]?.value ?? "",
          locale: r.dimensionValues?.[2]?.value ?? "",
          count: Number(r.metricValues?.[0]?.value ?? 0)
        }));
      } catch (paramError) {
        console.error('Error getting custom parameters:', paramError);
      }

      res.json({
        events,
        customParameters,
        dateRange: { startDate, endDate },
        propertyId: process.env.GA4_PROPERTY_ID || "501023254"
      });
    } catch (error) {
      console.error('GA4 schema debug error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Test just the qPlaysByVideo function to isolate the issue
  app.get("/api/ga4/test-plays-by-video", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qPlaysByVideo: ${startDate} to ${endDate}, locale: ${locale}`);
      
      const plays = await qPlaysByVideo(startDate, endDate, locale);
      console.log(`✅ qPlaysByVideo result:`, plays);
      
      res.json(plays);
    } catch (e) {
      console.error('❌ qPlaysByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Test the qWatchTimeByVideo function
  app.get("/api/ga4/test-watch-time-by-video", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qWatchTimeByVideo: ${startDate} to ${endDate}, locale: ${locale}`);
      
      const watchTime = await qWatchTimeByVideo(startDate, endDate, locale);
      console.log(`✅ qWatchTimeByVideo result:`, watchTime);
      
      res.json(watchTime);
    } catch (e) {
      console.error('❌ qWatchTimeByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Test the ACTUAL GA4 watch time function with real seconds
  app.get("/api/ga4/test-actual-watch-time", async (req, res) => {
    try {
      const { startDate, endDate, locale } = getParams(req);
      console.log(`📊 Testing qActualWatchTimeByVideo (REAL GA4 SECONDS): ${startDate} to ${endDate}, locale: ${locale}`);
      
      const { qActualWatchTimeByVideo } = await import('./ga4-service.js');
      const watchTime = await qActualWatchTimeByVideo(startDate, endDate, locale);
      console.log(`✅ qActualWatchTimeByVideo result:`, watchTime);
      
      res.json(watchTime);
    } catch (e) {
      console.error('❌ qActualWatchTimeByVideo test failed:', e);
      res.status(500).json({ 
        error: (e as Error).message,
        stack: (e as Error).stack 
      });
    }
  });

  // Simple GA4 custom metric test endpoint
  app.get("/api/ga4/debug-custom-metric", async (req, res) => {
    try {
      const { startDate, endDate } = getParams(req);
      
      console.log("🔍 GA4 CUSTOM METRIC DIAGNOSTIC - Testing custom metric access");
      
      const { client, PROPERTY } = await import('./ga4-service.js');
      
      // Test 1: Basic connectivity test with standard dimensions
      console.log("🔍 Test 1: Basic GA4 connectivity test");
      try {
        const [response1] = await client.runReport({
          property: PROPERTY,
          dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          limit: 5
        });
        
        console.log("✅ Basic connectivity SUCCESS");
        console.log("📊 Response rows:", response1.rows?.length || 0);
        console.log("📊 Available events:", response1.rows?.map(r => r.dimensionValues?.[0]?.value).slice(0, 5));
        
        // Test 2: Try different custom metric naming conventions
        console.log("🔍 Test 2: Testing different custom metric naming conventions");
        
        const customMetricTests = [
          { name: "Direct name", metricName: "watch_time_seconds" },
          { name: "With custom prefix", metricName: "customMetrics/watch_time_seconds" },
          { name: "With custom metrics namespace", metricName: "custom/watch_time_seconds" },
          { name: "Event-based metric", metricName: "customEvent:watch_time_seconds" }
        ];
        
        for (const test of customMetricTests) {
          console.log(`🔍 Testing custom metric format: ${test.name} (${test.metricName})`);
          try {
            const [response2] = await client.runReport({
              property: PROPERTY,
              dateRanges: [{ startDate: String(startDate), endDate: String(endDate) }],
              dimensions: [
                { name: "customEvent:video_id" },
                { name: "customEvent:video_title" }
              ],
              metrics: [
                { name: "eventCount" },
                { name: test.metricName }
              ],
              limit: 3
            });
          
            console.log(`✅ Custom metric SUCCESS with format: ${test.name}`);
            res.json({
              success: true,
              approach: "custom_metric_found",
              workingFormat: { name: test.name, metricName: test.metricName },
              basicConnectivity: { rowCount: response1.rows?.length || 0 },
              customMetric: { rowCount: response2.rows?.length || 0, firstRow: response2.rows?.[0] || null },
              message: `GA4 custom metric works with format: ${test.name}`
            });
            return;
          
          } catch (testError: any) {
            console.log(`❌ Format '${test.name}' failed: ${testError.message}`);
          }
        }
        
        // If all custom metric formats failed
        console.log("❌ All custom metric formats failed but basic connectivity works");
        res.json({
          success: true,
          approach: "basic_only", 
          basicConnectivity: { rowCount: response1.rows?.length || 0, events: response1.rows?.map(r => r.dimensionValues?.[0]?.value).slice(0, 5) },
          customMetricTests: customMetricTests.map(t => t.name),
          message: "Basic GA4 works but none of the custom metric formats worked"
        });
        return;
        
      } catch (error1: any) {
        console.log("❌ Even basic connectivity FAILED:", error1.message);
        
        res.json({
          success: false,
          basic_connectivity_failed: true,
          error: { message: error1.message, code: error1.code },
          message: "GA4 basic connectivity failed - check credentials and property ID"
        });
      }
      
    } catch (error) {
      console.error("GA4 diagnostic error:", error);
      res.status(500).json({ error: "Failed to run GA4 diagnostic" });
    }
  });



  // Comprehensive Supabase VPS Analytics endpoint (consistent with recent visitors)
  app.get("/api/ga4/clean-comprehensive", async (req, res) => {
    try {
      const range = req.query.range as string || '7d';
      
      console.log('📊 GA4 Clean Comprehensive request with range:', range);
      
      // Calculate date range from range parameter
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      
      if (range.endsWith('d')) {
        const days = parseInt(range.replace('d', '')) || 7;
        const now = new Date();
        const startDate = new Date();
        startDate.setDate(now.getDate() - days);
        
        dateFrom = startDate.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
        
        console.log(`📊 GA4 Calculated date range from ${range}: ${dateFrom} to ${dateTo}`);
      }
      
      // Get visitor data from Supabase VPS with proper date filtering
      const sessions = await hybridStorage.getAnalyticsSessions(
        dateFrom, // Now properly calculated from range
        dateTo,   // Now properly calculated from range  
        undefined, // filterLang
        false      // includeProduction
      );

      // Count unique visitors from Supabase VPS (same source as recent visitors modal)
      const uniqueVisitors = new Set(sessions.map((s: any) => s.ip_address || s.server_detected_ip)).size;
      const totalViews = sessions.length;
      
      console.log(`✅ Clean GA4 Analytics: Using Supabase VPS data - ${uniqueVisitors} unique visitors from ${totalViews} sessions`);

      // Return consistent data structure
      res.json({
        totalViews,
        uniqueVisitors,
        returnVisitors: sessions.filter((s: any) => s.is_returning).length,
        averageSessionDuration: sessions.reduce((acc: number, s: any) => acc + (s.session_duration || 0), 0) / sessions.length || 0,
        activeVisitors: sessions.filter((s: any) => {
          const lastSeen = new Date(s.last_seen_at || s.updated_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return lastSeen > fiveMinutesAgo;
        }).length,
        totalVideoStarts: 0, // Could be enhanced from video analytics
        totalCompletions: 0,
        uniqueVisitorsChange: 0, // Placeholder for now
        totalViewsChange: 0
      });
      return;
    } catch (error) {
      console.error('❌ Clean GA4 Analytics error:', error);
      // Fallback
    }

    // Original GA4 code (fallback)
    // Initialize variables at function scope
    let currentGA4Users = 0;
    let currentGA4PageViews = 0;
    let prevGA4Users = 0;
    let prevGA4PageViews = 0;

    try {
      const range = req.query.range as string || '7d';
      const locale = req.query.locale as string || 'all';
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      console.log(`🔍 COMPREHENSIVE ANALYTICS: ${range}, locale: ${locale}`);
      if (customStartDate && customEndDate) {
        console.log(`🔍 CUSTOM DATE RANGE: ${customStartDate} to ${customEndDate}`);
      }

      // Temporarily disable cache to test real data connection
      console.log('🔍 COMPREHENSIVE: Cache disabled - fetching fresh data from PostgreSQL');

      let startDate: string, endDate: string, prevStartDate: string, prevEndDate: string;

      if (customStartDate && customEndDate) {
        // Use custom date range
        startDate = customStartDate;
        endDate = customEndDate;
        
        // Calculate previous period with same length
        const startDateObj = new Date(customStartDate);
        const endDateObj = new Date(customEndDate);
        const rangeDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        const prevStartDateObj = new Date(startDateObj);
        prevStartDateObj.setDate(prevStartDateObj.getDate() - rangeDays);
        const prevEndDateObj = new Date(endDateObj);
        prevEndDateObj.setDate(prevEndDateObj.getDate() - rangeDays);
        
        prevStartDate = prevStartDateObj.toISOString().split('T')[0];
        prevEndDate = prevEndDateObj.toISOString().split('T')[0];
      } else {
        // Use predefined range
        const rangeDays = parseInt(range.replace('d', ''));
        
        // Current period: Start from beginning of the day X days ago
        const startOfRangeDay = new Date();
        startOfRangeDay.setDate(startOfRangeDay.getDate() - rangeDays);
        startOfRangeDay.setHours(0, 0, 0, 0); // Start of day
        const dateFrom = startOfRangeDay.toISOString();
        
        // End at the end of today
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999); // End of day
        const dateTo = endOfToday.toISOString();
        
        // Previous period: Same length, ending just before current period starts
        const prevStartOfRangeDay = new Date();
        prevStartOfRangeDay.setDate(prevStartOfRangeDay.getDate() - (rangeDays * 2));
        prevStartOfRangeDay.setHours(0, 0, 0, 0);
        const prevDateFrom = prevStartOfRangeDay.toISOString();
        
        const prevEndOfRangeDay = new Date();
        prevEndOfRangeDay.setDate(prevEndOfRangeDay.getDate() - rangeDays - 1);
        prevEndOfRangeDay.setHours(23, 59, 59, 999);
        const prevDateTo = prevEndOfRangeDay.toISOString();
        
        // Convert to GA4 date format (YYYY-MM-DD) for all functions
        startDate = dateFrom.split('T')[0];
        endDate = dateTo.split('T')[0];
        prevStartDate = prevDateFrom.split('T')[0];
        prevEndDate = prevDateTo.split('T')[0];
      }
      
      console.log(`🔍 PERIOD COMPARISON: Current ${startDate} to ${endDate}, Previous ${prevStartDate} to ${prevEndDate}`);

      // Helper function to calculate percentage change
      const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // FIXED: Use Supabase VPS database directly instead of broken GA4 API calls
      console.log('🔗 CONNECTING TO SUPABASE VPS DATABASE...');
      
      // Get REAL analytics data from YOUR Supabase VPS database
      let dashboardData = {};
      let activityData = { activities: [] };
      let dashboardJson: any = { overview: {}, topCountries: [], languageBreakdown: [], topReferrers: [] };
      let prevDashboardJson: any = { overview: {}, topCountries: [], languageBreakdown: [], topReferrers: [] };
      
      try {
        console.log(`🔍 COMPREHENSIVE: Getting REAL data from Supabase VPS for ${startDate} to ${endDate}`);
        
        // Convert dates to ISO format for database queries
        const dateFromISO = startDate + 'T00:00:00.000Z';
        const dateToISO = endDate + 'T23:59:59.999Z';
        const prevDateFromISO = prevStartDate + 'T00:00:00.000Z';
        const prevDateToISO = prevEndDate + 'T23:59:59.999Z';
        
        console.log(`🔍 DATABASE QUERY: Current period ${dateFromISO} to ${dateToISO}`);
        console.log(`🔍 DATABASE QUERY: Previous period ${prevDateFromISO} to ${prevDateToISO}`);
        
        // Get current period data from YOUR working /api/analytics/dashboard endpoint
        const dashboardResponse = await fetch(`http://localhost:5000/api/analytics/dashboard?dateFrom=${dateFromISO}&dateTo=${dateToISO}`);
        dashboardJson = await dashboardResponse.json();
        
        // Get previous period data for comparison
        const prevDashboardResponse = await fetch(`http://localhost:5000/api/analytics/dashboard?dateFrom=${prevDateFromISO}&dateTo=${prevDateToISO}`);
        prevDashboardJson = await prevDashboardResponse.json();
        
        console.log('✅ SUPABASE VPS DATA RETRIEVED:', { 
          current: {
            totalViews: dashboardJson.overview?.totalViews || 0,
            uniqueVisitors: dashboardJson.overview?.uniqueVisitors || 0,
            countries: dashboardJson.topCountries?.length || 0
          },
          previous: {
            totalViews: prevDashboardJson.overview?.totalViews || 0,
            uniqueVisitors: prevDashboardJson.overview?.uniqueVisitors || 0
          }
        });
        
        // Assign to function-scoped variables (REAL data from Supabase VPS)
        currentGA4Users = dashboardJson.overview?.uniqueVisitors || 0;
        currentGA4PageViews = dashboardJson.overview?.totalViews || 0;
        prevGA4Users = prevDashboardJson.overview?.uniqueVisitors || 0;
        prevGA4PageViews = prevDashboardJson.overview?.totalViews || 0;
        
        // Use YOUR Supabase VPS data
        dashboardData = {
          overview: {
            totalViews: currentGA4PageViews,
            uniqueVisitors: currentGA4Users,
            returningVisitors: dashboardJson.overview?.returningVisitors || 0,
            averageSessionDuration: dashboardJson.overview?.averageSessionDuration || 0
          },
          topCountries: dashboardJson.topCountries || [],
          languageBreakdown: dashboardJson.languageBreakdown || [],
          topReferrers: dashboardJson.topReferrers || []
        };
        
        console.log('✅ COMPREHENSIVE: Supabase VPS countries data:', JSON.stringify(dashboardData.topCountries?.slice(0, 2), null, 2));
        
        // Activity data from your real-time visitors system
        activityData = {
          activities: dashboardJson.activities || []
        };

        console.log('✅ COMPREHENSIVE: Got REAL dashboard data from Supabase VPS:', {
          totalViews: dashboardData.overview?.totalViews || dashboardData.totalViews,
          uniqueVisitors: dashboardData.overview?.uniqueVisitors || dashboardData.uniqueVisitors,  
          countries: dashboardData.topCountries?.length || 0,
          languages: Array.isArray(dashboardData.languageBreakdown) ? dashboardData.languageBreakdown.length : Object.keys(dashboardData.languageBreakdown || {}).length,
          referrers: dashboardData.topReferrers?.length || 0,
          structure: Object.keys(dashboardData)
        });
        
        console.log('✅ COMPREHENSIVE: Got REAL activity data from Supabase VPS:', activityData.activities?.length || 0, 'recent activities');
        
      } catch (error: any) {
        console.error('❌ COMPREHENSIVE: Failed to get real analytics data:', error.message);
        console.error('❌ COMPREHENSIVE: Full error stack:', error);
        // Use basic fallback data structure instead of empty object
        dashboardData = {
          overview: {
            totalViews: 0,
            uniqueVisitors: 0,
            returningVisitors: 0,
            averageSessionDuration: 0
          },
          topCountries: [],
          languageBreakdown: [],
          topReferrers: []
        };
        activityData = { activities: [] };
      }

      // Use the same date variables from above (already defined in try block)
      // const endDate and startDate already defined above

      // FIXED: Get video metrics from Supabase VPS database instead of broken GA4 API
      console.log('🔍 GETTING VIDEO METRICS FROM SUPABASE VPS...');
      
      // Calculate video metrics from your Supabase VPS data
      const plays = dashboardJson.videoPlays || 0;
      const completions = dashboardJson.videoCompletions || 0; 
      const watchTimeSeconds = dashboardJson.totalWatchTime || 0;
      const topVideos = dashboardJson.topVideos || {};
      const browserLanguageData = dashboardJson.languageBreakdown || [];
      const siteLanguageData = dashboardJson.siteLanguageChoice || [];
      const ga4ReturningUsers = dashboardJson.overview?.returningVisitors || 0;
      
      // Previous period video metrics from Supabase VPS
      const prevPlays = prevDashboardJson.videoPlays || 0;
      const prevCompletions = prevDashboardJson.videoCompletions || 0;
      const prevWatchTimeSeconds = prevDashboardJson.totalWatchTime || 0;
      const prevGA4ReturningUsers = prevDashboardJson.overview?.returningVisitors || 0;
      
      console.log('✅ VIDEO METRICS FROM SUPABASE VPS:', {
        currentPlays: plays,
        currentCompletions: completions,
        currentWatchTime: watchTimeSeconds,
        returningUsers: ga4ReturningUsers
      });

      // Process visitor analytics - handle nested data structure  
      // CONSISTENCY FIX: Use Supabase VPS data for all visitor metrics
      const totalViews = currentGA4PageViews || dashboardData.overview?.totalViews || dashboardData.totalViews || 0;
      const uniqueVisitors = currentGA4Users || dashboardData.overview?.uniqueVisitors || dashboardData.uniqueVisitors || 0;  
      const returnVisitors = ga4ReturningUsers || 0;
      
      // LOGIC VALIDATION: If we have return visitors, we must have at least that many unique visitors
      const correctedUniqueVisitors = Math.max(uniqueVisitors, returnVisitors);
      const correctedTotalViews = Math.max(totalViews, correctedUniqueVisitors);
      const averageSessionDuration = dashboardData.overview?.averageSessionDuration || dashboardData.averageSessionDuration || 0;
      const activeVisitors = activityData.activities?.filter(a => Date.now() - new Date(a.lastActivity).getTime() < 5 * 60 * 1000).length || 0;

      // Process geographic data from dashboard  
      console.log('🔍 COUNTRIES DEBUG: dashboardData.topCountries:', JSON.stringify(dashboardData.topCountries, null, 2));
      const topCountries = (dashboardData.topCountries || []).slice(0, 8).map((country: any) => ({
        country: country.country,
        visitors: country.visitors || country.sessions || 0, // GA4 uses 'visitors', fallback to 'sessions' 
        flag: country.flag || '🌍'
      }));
      console.log('🔍 COUNTRIES DEBUG: Processed topCountries:', JSON.stringify(topCountries, null, 2));

      // Process language breakdown - use GA4 browser language data
      const languageBreakdown = [];
      
      console.log('🔍 LANGUAGE DEBUG: browserLanguageData:', JSON.stringify(browserLanguageData, null, 2));
      
      if (browserLanguageData && Array.isArray(browserLanguageData)) {
        const totalLanguageVisitors = browserLanguageData.reduce((sum, lang) => sum + lang.visitors, 0);
        console.log('🔍 LANGUAGE DEBUG: totalLanguageVisitors:', totalLanguageVisitors);
        
        for (const lang of browserLanguageData) {
          if (lang.language && lang.visitors > 0) {
            const langItem = {
              language: lang.language,
              visitors: lang.visitors,
              percentage: totalLanguageVisitors > 0 ? Math.round((lang.visitors / totalLanguageVisitors) * 100) : 0
            };
            languageBreakdown.push(langItem);
            console.log('🔍 LANGUAGE DEBUG: Added language:', langItem);
          }
        }
      } else {
        console.log('🔍 LANGUAGE DEBUG: browserLanguageData is not valid array:', typeof browserLanguageData, browserLanguageData);
      }

      // Process site language choice - URL path-based tracking (should total 100%)
      const siteLanguageChoice = Array.isArray(siteLanguageData) ? siteLanguageData : [];

      // Process top referrers
      console.log('🔍 REFERRERS DEBUG: dashboardData.topReferrers:', JSON.stringify(dashboardData.topReferrers, null, 2));
      const topReferrers = (dashboardData.topReferrers || []).slice(0, 5).map((ref: any) => ({
        referrer: ref.referrer === '(direct)' ? null : ref.referrer,
        visitors: ref.count || ref.visitors || 0
      }));
      console.log('🔍 REFERRERS DEBUG: Processed topReferrers:', JSON.stringify(topReferrers, null, 2));

      // Calculate GA4 video metrics
      const completionRate = plays > 0 ? completions / plays : 0;
      const averageWatchTimeSeconds = plays > 0 ? watchTimeSeconds / plays : 0;

      // Format top videos (limit to top 5)
      const topVideosFormatted = Object.entries(topVideos || {})
        .map(([videoId, data]: [string, any]) => ({
          videoId,
          videoTitle: data.title || videoId,
          plays: data.plays || 0,
          completions: data.completions || 0
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Calculate period-over-period comparisons using corrected values
      const totalViewsChange = calculatePercentageChange(correctedTotalViews, prevGA4PageViews || 0);
      const uniqueVisitorsChange = calculatePercentageChange(correctedUniqueVisitors, prevGA4Users || 0);
      const returnVisitorsChange = calculatePercentageChange(returnVisitors, prevGA4ReturningUsers || 0);
      const videoStartsChange = calculatePercentageChange(plays || 0, prevPlays || 0);
      
      console.log(`🔍 PERIOD COMPARISONS: Views ${totalViewsChange}%, Visitors ${uniqueVisitorsChange}%, Returns ${returnVisitorsChange}%, Videos ${videoStartsChange}%`);

      const result = {
        // Visitor Analytics (from PostgreSQL - your trusted system!)
        totalViews: correctedTotalViews,
        uniqueVisitors: correctedUniqueVisitors,
        returnVisitors,
        averageSessionDuration: Math.round(averageSessionDuration || 0),
        activeVisitors,
        // Period-over-period comparisons
        totalViewsChange,
        uniqueVisitorsChange,
        returnVisitorsChange,
        videoStartsChange,
        // Geographic & Demographic Data
        topCountries,
        languageBreakdown, // Browser language preferences (GA4 language dimension)
        siteLanguageChoice, // Site language choice (URL path-based: /fr/ vs /en-US/)
        topReferrers,
        // Video Analytics (from GA4)
        totalVideoStarts: plays || 0,
        totalCompletions: completions || 0,
        totalWatchTimeSeconds: watchTimeSeconds || 0,
        averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds || 0),
        completionRate: Math.round(completionRate * 100) / 100,
        topVideos: topVideosFormatted,
      };

      console.log('✅ COMPREHENSIVE RESULT:', {
        totalViews: result.totalViews,
        uniqueVisitors: result.uniqueVisitors,
        activeVisitors: result.activeVisitors,
        videoPlays: result.totalVideoStarts,
        countries: result.topCountries.length,
        languages: result.languageBreakdown.length
      });
      
      // Cache disabled for testing real data connection
      
      res.json(result);
    } catch (error) {
      console.error('❌ COMPREHENSIVE ANALYTICS ERROR:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive analytics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Clean GA4 metrics endpoint - simple, reliable GA4 data
  app.get("/api/ga4/clean-metrics", async (req, res) => {
    try {
      const range = req.query.range as string || '7d';
      const locale = req.query.locale as string || 'all';
      const country = req.query.country as string || 'all';
      
      // Convert range to date strings
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (parseInt(range.replace('d', '')) * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];

      console.log(`🔍 CLEAN GA4 METRICS: ${startDate} to ${endDate}, locale: ${locale}, country: ${country}`);

      // Simple cache key
      const cacheKey = k(`clean:${startDate}:${endDate}:${locale}:${country}`);
      
      // Check cache first
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('✅ CLEAN GA4: Using cached data');
        return res.json(cached);
      }

      // Fetch core metrics using existing GA4 functions
      const [plays, completions, watchTimeSeconds, topVideos] = await Promise.all([
        qPlays(startDate, endDate, locale, country),
        qCompletes(startDate, endDate, locale, country), 
        qWatchTimeTotal(startDate, endDate, locale, country),
        qPlaysByVideo(startDate, endDate, locale, country)
      ]);

      // Get locale breakdown
      const languageData = await qTopLanguages(startDate, endDate);

      // Calculate completion rate and average watch time
      const completionRate = plays > 0 ? completions / plays : 0;
      const averageWatchTimeSeconds = plays > 0 ? watchTimeSeconds / plays : 0;

      // Format top videos (limit to top 5)
      const topVideosFormatted = Object.entries(topVideos || {})
        .map(([videoId, data]: [string, any]) => ({
          videoId,
          videoTitle: data.title || videoId,
          plays: data.plays || 0,
          completions: data.completions || 0
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Format locale breakdown
      const localeBreakdown = [
        { locale: 'fr-FR', plays: localeData?.locale === 'fr-FR' ? localeData.plays : 0 },
        { locale: 'en-US', plays: localeData?.locale === 'en-US' ? localeData.plays : 0 }
      ].filter(item => item.plays > 0);

      const result = {
        totalVideoStarts: plays || 0,
        totalCompletions: completions || 0,
        totalWatchTimeSeconds: watchTimeSeconds || 0,
        averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds || 0),
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        topVideos: topVideosFormatted,
        localeBreakdown
      };

      console.log('✅ CLEAN GA4 RESULT:', JSON.stringify(result, null, 2));
      
      // Cache for 5 minutes
      await setCache(cacheKey, result, 300);
      
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('X-Cache', 'MISS');
      res.json(result);
    } catch (error) {
      console.error('❌ CLEAN GA4 ERROR:', error);
      res.status(500).json({ 
        error: 'Failed to fetch GA4 metrics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Top videos table endpoint - using your exact clean API structure
  app.get("/api/ga4/top-videos", async (req, res, next) => {
    try {
      let startDate, endDate, locale, nocache;
      
      // Check if this is a preset request
      if (req.query.preset) {
        const preset = String(req.query.preset);
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(preset);
        startDate = calcStart;
        endDate = calcEnd;
        locale = req.query.locale ? String(req.query.locale) : "all";
        nocache = req.query.nocache === "1" || req.query.nocache === "true";
      } else {
        ({ startDate, endDate, locale, nocache } = getParams(req));
      }
      const key = k(`top:${startDate}:${endDate}:${locale}`);

      // Check cache with timeout to prevent hanging
      if (!nocache) {
        try {
          const cacheTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache timeout')), 500)
          );
          
          const memoryCached = getCache<any>(key);
          if (memoryCached) return res.json(memoryCached);
          
          const dbCached = await Promise.race([
            getDbCache<any>(key),
            cacheTimeout
          ]);
          
          if (dbCached) return res.json(dbCached);
        } catch (error) {
          console.log(`⚠️ Top videos cache failed, proceeding:`, error.message);
        }
      }

      console.log(`📊 GA4 Top Videos request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);      
      
      // Add 2-second timeout for GA4 API calls
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('GA4 API timeout: getTopVideosTable took longer than 2 seconds')), 2000)
      );

      const data = await Promise.race([getTopVideosTable(startDate, endDate, locale), timeoutPromise]);
      
      // Store in both persistent and memory cache
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      
      // Add comprehensive Paris timezone headers
      setParisTimezoneHeaders(res, req.query);
      
      res.json(data);
    } catch (e) { 
      console.error('❌ GA4 Top Videos error:', e);
      res.status(500).json({ message: (e as Error).message });
    }
  });

  // Funnel endpoint - using your exact clean API structure with graceful fallback
  app.get("/api/ga4/funnel", async (req, res) => {
    const { videoId, preset, start, end, since, locale, nocache } = req.query as any;
    
    // Compute Paris timezone window
    const w = computeParisWindow({ preset, start, end, since });
    
    // Set comprehensive Paris timezone headers
    res.set({
      "X-Timezone": "Europe/Paris",
      "X-Window-Start": w.startStr,
      "X-Window-End": w.endStr,
      "X-Effective-Start": w.effStartStr,
      "X-Effective-End": w.effEndStr,
    });
    
    const WANT = [10, 25, 50, 75, 90];
    const zero = WANT.map(b => ({ bucket: b, count: 0 }));
    
    try {
      if (!videoId) {
        return res.status(400).json({ error: "Missing videoId" });
      }
      
      const localeFilter = locale && locale !== "all" ? locale : undefined;
      const key = k(`funnel:${w.effStartStr}:${w.effEndStr}:${localeFilter || 'all'}:${videoId}`);
      
      // Check cache unless bypassed
      if (!nocache) {
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);
        
        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }
      
      console.log(`📊 GA4 Funnel request: ${w.effStartStr} to ${w.effEndStr}, locale: ${localeFilter || 'all'}, videoId: ${videoId}${nocache ? ' (cache bypassed)' : ''}`);
      
      const rows = await qVideoFunnel(w.effStartStr, w.effEndStr, videoId, localeFilter);
      
      const map = new Map(rows.map(r => [Number(r.bucket), Number(r.count) || 0]));
      const funnel = WANT.map(b => ({ bucket: b, count: map.get(b) ?? 0 }));
      
      const data = {
        funnel,
        timestamp: new Date().toISOString(),
        cached: false
      };
      
      // Store in both persistent and memory cache
      await setDbCache(key, data, 300);
      setCache(key, data, 300);
      
      return res.json(data);
    } catch (e: any) {
      console.error('❌ GA4 Funnel error:', e);
      // Graceful fallback, never 500 for "no data" cases
      return res.json({
        funnel: zero,
        timestamp: new Date().toISOString(),
        cached: false,
        note: "fallback: empty window or GA4 error",
      });
    }
  });

  // Trend endpoint - daily plays and avg watch time
  app.get("/api/ga4/trend", async (req, res) => {
    try {
      let startDate, endDate, locale, nocache, sinceDate;
      
      // Check if this is a preset request
      if (req.query.preset) {
        const preset = String(req.query.preset);
        const { startDate: calcStart, endDate: calcEnd } = calculateDateRange(preset);
        startDate = calcStart;
        endDate = calcEnd;
        locale = req.query.locale ? String(req.query.locale) : "all";
        nocache = req.query.nocache === "1" || req.query.nocache === "true";
        sinceDate = req.query.sinceDate ? String(req.query.sinceDate) : undefined;
      } else {
        ({ startDate, endDate, locale, nocache, sinceDate } = getParams(req));
      }

      // APPLY START DATE FILTER from Exclusions tab
      if (sinceDate && sinceDate > startDate) {
        console.log(`📅 START DATE FILTER: Adjusting ${startDate} to ${sinceDate} (from Exclusions)`);
        startDate = sinceDate;
      }

      const key = k(`trend:${startDate}:${endDate}:${locale}`);

      // Check cache unless bypassed
      if (!nocache) {
        // Try persistent cache first, then memory cache
        const dbCached = await getDbCache<any>(key);
        if (dbCached) return res.json(dbCached);

        const memoryCached = getCache<any>(key);
        if (memoryCached) return res.json(memoryCached);
      }

      console.log(`📊 GA4 Trend request: ${startDate} to ${endDate}, locale: ${locale}${nocache ? ' (cache bypassed)' : ''}`);

      // GET EXCLUDED IP RANGES for filtering (modern system)
      let excludedIpRanges: string[] = [];
      try {
        const exclusions = await hybridStorage.getIpExclusions();
        excludedIpRanges = exclusions
          .filter((exclusion: any) => exclusion.active)
          .map((exclusion: any) => exclusion.ip_cidr);
        console.log(`🚫 IP EXCLUSION: Loaded ${excludedIpRanges.length} excluded IP ranges for trends filtering`);
      } catch (error) {
        console.warn('⚠️ IP EXCLUSION: Failed to load excluded IP ranges for trends:', error);
      }

      // FIXED: Use website sessions trend instead of video plays trend
      console.log(`📊 TRENDS: Switching from video plays to website sessions for service business analytics`);
      // RE-ENABLE comparison with dotted lines
      const data = await qSessionsTrendWithComparison(startDate, endDate, locale);
      
      // Store in both persistent and memory cache (600s for trend - heavier query)
      await setDbCache(key, data, 600);
      setCache(key, data, 600);
      
      // Add comprehensive Paris timezone headers
      setParisTimezoneHeaders(res, req.query);
      
      res.json(data);
    } catch (e) {
      console.error('❌ GA4 Trend error:', e);
      res.status(500).json({ error: String(e) });
    }
  });

  // CTA Analytics Endpoint
  app.get("/api/ga4/cta", async (req, res) => {
    try {
      const { startDate, endDate, locale, country, nocache, sinceDate } = getParams(req);
      
      console.log(`🎯 CTA ANALYTICS REQUEST: ${startDate} to ${endDate}, locale: ${locale}, country: ${country}`);
      
      // ✅ FIX: Include country in cache key for proper cache isolation
      const cacheKey = `ga4-cta-${startDate}-${endDate}-${locale}-${country}-${sinceDate || 'none'}`;
      if (!nocache) {
        const cached = await getCache(cacheKey);
        if (cached) {
          console.log(`✅ CTA Analytics served from cache`);
          return res.json({ ...cached, cached: true });
        }
      }

      // ✅ FIX: Use EXACT pattern from working qPlaysByVideo query - no country filter for now
      const localeExpr = locale && locale !== "all" 
        ? [{ filter: { fieldName: "customEvent:locale", stringFilter: { value: locale } } }] 
        : [];
      
      // Apply since date filter if provided
      if (sinceDate) {
        console.log(`🔍 CTA Analytics: Applying exclusion filter - data since ${sinceDate}`);
      }
      
      // ✅ FIX: Use super minimal approach - just test if cta_click events exist
      console.log(`🔍 CTA Analytics: Testing ultra-minimal GA4 query for cta_click events...`);
      
      const [ctaResponse] = await ga4Client.runReport({
        property: GA4_PROPERTY,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: { fieldName: "eventName", stringFilter: { value: "cta_click" } }
        },
        orderBys: [{ dimension: { dimensionName: "date" } }]
      });
      
      console.log(`🔍 CTA Analytics: Testing basic cta_click event query (locale: ${locale}, country: ${country}, sinceDate: ${sinceDate || 'none'})`);

      // Process raw GA4 data into structured CTA analytics
      const processedData = {
        totalClicks: 0,
        timeRange: { start: startDate, end: endDate },
        ctas: {
          book_call: {
            ctaId: "book_call",
            ctaName: "Free Consultation",
            totalClicks: 0,
            languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
            sectionBreakdown: {},
            dailyTrend: []
          },
          quick_quote: {
            ctaId: "quick_quote", 
            ctaName: "Free Quote",
            totalClicks: 0,
            languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
            sectionBreakdown: {},
            dailyTrend: []
          }
        },
        languageTotals: { 'fr-FR': 0, 'en-US': 0 },
        dailyTotals: [],
        topSections: []
      };

      // Process GA4 rows
      const dailyData = new Map();
      const sectionData = new Map();

      ctaResponse.rows?.forEach(row => {
        const date = row.dimensionValues?.[0]?.value || '';
        const ctaId = row.dimensionValues?.[1]?.value || '';
        const language = row.dimensionValues?.[2]?.value || 'en-US';
        const pageLocation = row.dimensionValues?.[3]?.value || '';
        const clicks = Number(row.metricValues?.[0]?.value || 0);
        
        // ✅ FIX: Apply sinceDate exclusion filter during processing if provided
        if (sinceDate && date < sinceDate) {
          return; // Skip data before exclusion date
        }

        if (!ctaId || (ctaId !== 'book_call' && ctaId !== 'quick_quote')) return;

        processedData.totalClicks += clicks;
        
        // Update CTA totals
        if (processedData.ctas[ctaId as keyof typeof processedData.ctas]) {
          processedData.ctas[ctaId as keyof typeof processedData.ctas].totalClicks += clicks;
          
          // Language breakdown
          const lang = language.includes('fr') ? 'fr-FR' : 'en-US';
          processedData.ctas[ctaId as keyof typeof processedData.ctas].languageBreakdown[lang] += clicks;
          processedData.languageTotals[lang] += clicks;
          
          // ✅ FIX: Section breakdown using pageLocation (captures hash fragments)
          const pageLocation = row.dimensionValues?.[3]?.value || '';
          const section = pageLocation.includes('#') ? pageLocation.split('#')[1] : 'main';
          if (!processedData.ctas[ctaId as keyof typeof processedData.ctas].sectionBreakdown[section]) {
            processedData.ctas[ctaId as keyof typeof processedData.ctas].sectionBreakdown[section] = 0;
          }
          processedData.ctas[ctaId as keyof typeof processedData.ctas].sectionBreakdown[section] += clicks;
          
          // Track section totals
          if (!sectionData.has(section)) sectionData.set(section, 0);
          sectionData.set(section, sectionData.get(section) + clicks);
        }

        // Daily aggregation
        if (!dailyData.has(date)) {
          dailyData.set(date, { book_call: 0, quick_quote: 0, total: 0 });
        }
        const day = dailyData.get(date);
        day[ctaId as 'book_call' | 'quick_quote'] += clicks;
        day.total += clicks;
      });

      // Convert daily data to arrays
      processedData.dailyTotals = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Top sections
      processedData.topSections = Array.from(sectionData.entries())
        .map(([sectionName, clicks]) => ({
          sectionName,
          clicks,
          percentage: processedData.totalClicks > 0 ? Math.round((clicks / processedData.totalClicks) * 100) : 0
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      // Cache the result
      await setCache(cacheKey, { ctaData: processedData }, 300); // 5 min cache
      
      console.log(`✅ CTA Analytics processed: ${processedData.totalClicks} total clicks`);
      res.json({ ctaData: processedData, timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error('❌ CTA Analytics error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'CTA analytics failed',
        ctaData: {
          totalClicks: 0,
          timeRange: { start: '', end: '' },
          ctas: { book_call: null, quick_quote: null },
          languageTotals: { 'fr-FR': 0, 'en-US': 0 },
          dailyTotals: [],
          topSections: []
        }
      });
    }
  });

  app.get("/api/ga4/realtime", async (req, res) => {
    try {
      const nocache = req.query.nocache === "1" || req.query.nocache === "true";
      const key = k('realtime');

      // Check cache with timeout to prevent hanging
      if (!nocache) {
        try {
          const cacheTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cache timeout')), 500)
          );
          
          const memoryCached = getCache<any>(key);
          if (memoryCached) return res.json(memoryCached);
          
          const dbCached = await Promise.race([
            getDbCache<any>(key),
            cacheTimeout
          ]);
          
          if (dbCached) return res.json(dbCached);
        } catch (error) {
          console.log(`⚠️ Realtime cache failed, proceeding:`, error.message);
        }
      }

      console.log(`📊 GA4 Realtime request${nocache ? ' (cache bypassed)' : ''}`);
      
      // Add 2-second timeout for GA4 API calls
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('GA4 API timeout: qRealtime took longer than 2 seconds')), 2000)
      );

      const data = await Promise.race([qRealtime(), timeoutPromise]);
      
      // Store in both persistent and memory cache (30s for realtime)
      try {
        await setDbCache(key, data, 30);
        setCache(key, data, 30);
      } catch (error) {
        console.log(`⚠️ Failed to cache realtime data:`, error.message);
      }
      
      // Add comprehensive Paris timezone headers (realtime uses current time)
      setParisTimezoneHeaders(res, { preset: 'today' });
      
      res.json(data);
    } catch (error: any) {
      console.error("GA4 realtime error:", error);
      
      // ✅ CRITICAL FIX: Handle GA4 quota exhausted errors gracefully
      if (error?.code === 8 || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log('🚫 GA4 Quota exhausted - serving stubbed realtime data');
        const stubbedData = {
          activeUsers: 0,
          timestamp: new Date().toISOString(),
          quotaExhausted: true,
          note: 'GA4 quota exhausted - showing stubbed data'
        };
        return res.status(200).json(stubbedData);
      }
      
      // Other errors still return 500
      res.status(500).json({ error: error.message || "Failed to fetch realtime data" });
    }
  });

  // Recent Activity endpoint for realtime visitor tracking
  app.get("/api/analytics/recent-activity", async (req, res) => {
    try {
      console.log('🎯 RECENT ACTIVITY REQUEST: Fetching recent visitor activity');
      
      // Get recent sessions from the last 10 minutes (more realistic for "active" users)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      // Get recent sessions with video views
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const recentSessions = await hybridStorage.getAnalyticsSessions(
        tenMinutesAgo.toISOString(),
        new Date().toISOString(),
        undefined,
        shouldIncludeProduction
      );
      
      console.log(`📊 RECENT ACTIVITY: Found ${recentSessions.length} recent sessions`);
      
      // CRITICAL FIX: Fetch video views for each session and link them
      const activities = await Promise.all(recentSessions.map(async session => {
        const now = Date.now();
        const createdTime = new Date(session.created_at).getTime();
        const timeSinceCreation = now - createdTime;
        const minutesAgo = Math.floor(timeSinceCreation / (60 * 1000));
        const isActive = timeSinceCreation < 10 * 60 * 1000; // 10 minutes (consider active for longer)
        
        // Fetch video views for this session
        let videoViews = [];
        try {
          // Get all analytics views for this session ID from the last 10 minutes
          const views = await hybridStorage.getAnalyticsViews({
            session_id: session.session_id,
            dateFrom: tenMinutesAgo.toISOString(),
            dateTo: new Date().toISOString()
          });
          
          videoViews = views.map(view => ({
            video_id: view.video_id,
            video_filename: view.video_filename || view.video_id,
            video_type: view.video_type || 'gallery',
            watch_time: view.watch_time || 0,
            completion_rate: view.completion_rate || 0,
            timestamp: view.created_at
          }));
          
          console.log(`📹 SESSION ${session.session_id}: Found ${videoViews.length} video views`);
        } catch (error) {
          console.log(`⚠️ SESSION ${session.session_id}: No video views found (${error.message})`);
        }
        
        return {
          id: session.session_id,
          timestamp: session.created_at,
          ip: session.ip_address,
          country: session.country,
          city: session.city,
          language: session.language,
          page_url: session.page_url,
          duration: session.duration || 0,
          video_views: videoViews,
          user_agent: session.user_agent?.substring(0, 100) + '...',
          is_active: isActive
        };
      }));
      
      // Sort by most recent first
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const videoWatchersCount = activities.filter(activity => activity.is_active && activity.video_views.length > 0).length;
      console.log(`🎯 RECENT ACTIVITY: Returning ${activities.length} activities, ${videoWatchersCount} active video watchers`);
      
      res.json({
        activities,
        total: activities.length,
        video_watchers: videoWatchersCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ RECENT ACTIVITY ERROR:', error);
      res.status(500).json({ 
        error: "Failed to fetch recent activity", 
        message: error.message,
        activities: [],
        total: 0
      });
    }
  });

  // Live Tracking endpoint - Private system replacement for GA4 Realtime
  app.get("/api/analytics/live-tracking", async (req, res) => {
    try {
      console.log('🎯 LIVE TRACKING REQUEST: Fetching private system realtime data');
      
      // Get sessions from the last 30 minutes for "active" users
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      // **REPLIT PREVIEW PRODUCTION ANALYTICS**
      const shouldIncludeProduction = process.env.NODE_ENV === 'production' || req.headers.host?.includes('replit');
      
      const recentSessions = await hybridStorage.getAnalyticsSessions(
        thirtyMinutesAgo.toISOString(),
        new Date().toISOString(),
        undefined,
        shouldIncludeProduction
      );
      
      // Filter out test data and admin IPs (like the rest of the private system)
      const realSessions = recentSessions.filter(session => {
        return !session.is_test_data && 
               session.ip_address && 
               session.ip_address !== '0.0.0.0' &&
               session.ip_address !== '127.0.0.1' &&
               session.ip_address !== null &&
               !session.session_id?.includes('anonymous');
      });
      
      // Get unique active users (by IP) with cached location enrichment (same as Recent Visitors)
      const activeUserMap = new Map();
      for (const session of realSessions) {
        const ip = session.ip_address;
        if (!activeUserMap.has(ip)) {
          // Use cached JSON location data first (same strategy as Recent Visitors)
          let enrichedCountry = session.country || 'Unknown';
          let enrichedCity = session.city || 'Unknown';
          
          // Try to get location from JSON cache (same approach as Recent Visitors)
          try {
            const fs = require('fs');
            const path = require('path');
            const jsonPath = path.join(process.cwd(), 'server/data/analytics-sessions.json');
            if (fs.existsSync(jsonPath)) {
              const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
              const matchingSession = jsonData.find((s: any) => s.ip_address === ip || s.server_detected_ip === ip);
              if (matchingSession && matchingSession.country && matchingSession.country !== 'Unknown') {
                console.log(`📄 LIVE TRACKING: Using JSON cache location for IP ${ip}: ${matchingSession.city}, ${matchingSession.country}`);
                enrichedCountry = matchingSession.country;
                enrichedCity = matchingSession.city;
              }
            }
          } catch (error) {
            console.log(`⚠️ LIVE TRACKING: Could not read JSON cache for IP ${ip}:`, error.message);
          }
          
          activeUserMap.set(ip, {
            ip_address: ip,
            country: enrichedCountry,
            city: enrichedCity,
            user_agent: session.user_agent || '',
            language: session.language || 'Unknown', 
            created_at: session.created_at
          });
        }
      }
      
      const activeUsers = Array.from(activeUserMap.values());
      
      // Aggregate by country
      const countryMap = new Map();
      activeUsers.forEach(user => {
        const country = user.country || 'Unknown';
        const current = countryMap.get(country) || 0;
        countryMap.set(country, current + 1);
      });
      
      const byCountry = Array.from(countryMap.entries())
        .map(([country, users]) => ({ country, users }))
        .sort((a, b) => b.users - a.users) // Sort by user count descending
        .slice(0, 10); // Top 10 countries
      
      // Aggregate by device (using user agent)
      const deviceMap = new Map();
      activeUsers.forEach(user => {
        const userAgent = user.user_agent || '';
        let device = 'Desktop';
        
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
          if (/iPad|Tablet/i.test(userAgent)) {
            device = 'Tablet';
          } else {
            device = 'Mobile';
          }
        }
        
        const current = deviceMap.get(device) || 0;
        deviceMap.set(device, current + 1);
      });
      
      const byDevice = Array.from(deviceMap.entries())
        .map(([device, users]) => ({ device, users }))
        .sort((a, b) => b.users - a.users); // Sort by user count descending
      
      console.log(`📊 LIVE TRACKING: Found ${activeUsers.length} active users`);
      console.log(`🌍 Countries: ${byCountry.map(c => `${c.country}(${c.users})`).join(', ')}`);
      console.log(`📱 Devices: ${byDevice.map(d => `${d.device}(${d.users})`).join(', ')}`);
      
      const response = {
        activeUsers: activeUsers.length,
        byCountry,
        byDevice,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ LIVE TRACKING ERROR:', error);
      res.status(500).json({ 
        error: "Failed to fetch live tracking data", 
        message: error.message,
        activeUsers: 0,
        byCountry: [],
        byDevice: [],
        timestamp: new Date().toISOString()
      });
    }
  });

  // Analytics Sessions endpoint - GET analytics sessions  
  app.get("/api/analytics/sessions", async (req, res) => {
    try {
      const { dateFrom, dateTo, language, includeProduction } = req.query;
      console.log('📊 Analytics sessions request:', { dateFrom, dateTo, language, includeProduction });
      
      // **CRITICAL FIX**: Use computeParisWindow for proper exclusive date filtering
      let finalDateFrom = dateFrom as string;
      let finalDateTo = dateTo as string;
      
      // If we detect preset-style parameters or same-day requests, use proper Paris timezone conversion
      if (req.query.preset) {
        console.log('🔧 PRESET DATE RANGE: Using computeParisWindow for preset filtering');
        const window = computeParisWindow(req.query);
        finalDateFrom = window.effStartIso!;
        finalDateTo = window.effEndIso!;
        console.log(`📅 PRESET RANGE: ${finalDateFrom} to ${finalDateTo} (preset: ${req.query.preset})`);
        setParisTimezoneHeaders(res, req.query);
      } else if (dateFrom === dateTo) {
        console.log('🔧 SAME-DAY DATE RANGE: Converting to full 24-hour Paris day window');
        // Convert same-day request to full 24-hour window in Paris timezone
        const { DateTime } = await import('luxon');
        const start = DateTime.fromISO(dateFrom as string, { zone: 'Europe/Paris' }).startOf('day');
        const end = start.plus({ days: 1 }); // Next day start (exclusive)
        finalDateFrom = start.toUTC().toISO()!;
        finalDateTo = end.toUTC().toISO()!;
        console.log(`📅 SAME-DAY RANGE: ${finalDateFrom} to ${finalDateTo} (Paris day: ${dateFrom})`);
      }
      
      // **CRITICAL FIX**: Default includeProduction to true to show real visitor traffic
      // Only exclude production if explicitly set to false in query
      const shouldIncludeProduction = includeProduction === 'false' ? false : true;
      
      console.log(`🌍 PRODUCTION FILTER: includeProduction=${shouldIncludeProduction} (from query: ${includeProduction})`);
      
      const sessions = await hybridStorage.getAnalyticsSessions(
        finalDateFrom,
        finalDateTo, 
        language as string,
        shouldIncludeProduction
      );
      
      console.log(`✅ SESSIONS RESULT: Found ${sessions?.length || 0} detailed records for range ${finalDateFrom} to ${finalDateTo}`);
      res.json(sessions);
    } catch (error) {
      console.error('❌ Analytics sessions error:', error);
      
      // Check if this is a data source availability error
      if (error.message && error.message.includes('Analytics data unavailable')) {
        res.status(503).json({ 
          error: "Analytics service temporarily unavailable", 
          details: "Database connection failed",
          retry: true 
        });
      } else {
        res.status(500).json({ error: "Failed to get analytics sessions" });
      }
    }
  });





  // Analytics Cache Cleanup Routes
  app.use(analyticsCleanupRoutes);

  // Cache Status and Environment Info Endpoint
  app.get("/api/cache/status", async (req, res) => {
    try {
      const { getCacheEnvironmentInfo, getPgClient } = await import("./cache");
      const envInfo = getCacheEnvironmentInfo();
      
      // Test cache connectivity and get detailed stats
      let cacheStatus = 'unknown';
      let cacheStats = {
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0
      };
      
      try {
        if (envInfo.environment === 'development') {
          const pg = getPgClient();
          if (pg) {
            const result = await pg`
              SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
                COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
              FROM ga4_cache
            `;
            
            cacheStats = {
              totalEntries: parseInt(result[0].total),
              activeEntries: parseInt(result[0].active),
              expiredEntries: parseInt(result[0].expired)
            };
            cacheStatus = 'connected';
          }
        } else {
          cacheStatus = 'production-ready';
        }
      } catch (error) {
        cacheStatus = 'error';
      }

      res.json({
        ...envInfo,
        cacheStatus,
        ...cacheStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Manual Cache Cleanup Endpoint (admin only)
  app.post("/api/cache/cleanup", async (req, res) => {
    try {
      const { manualCacheCleanup } = await import("./cache");
      const result = await manualCacheCleanup();
      
      if (result.error) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        message: `Cache cleanup completed`,
        deletedEntries: result.deleted,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Clear All Cache Endpoint (admin only)
  app.delete("/api/ga4/cache", async (req, res) => {
    try {
      const { getPgClient, getCacheEnvironmentInfo } = await import("./cache");
      const envInfo = getCacheEnvironmentInfo();
      const isDev = envInfo.environment === 'development';
      
      if (isDev) {
        const pg = getPgClient();
        if (!pg) {
          return res.status(500).json({ ok: false, error: "PostgreSQL client not available" });
        }
        
        const result = await pg`DELETE FROM ga4_cache RETURNING *`;
        res.json({ 
          ok: true, 
          message: "Cache cleared", 
          deletedEntries: result.length,
          timestamp: new Date().toISOString()
        });
      } else {
        // Production Supabase implementation
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        );
        
        const { data, error } = await supabase
          .from("ga4_cache")
          .delete()
          .neq("key", "")  // Delete all entries
          .select();
        
        if (error) {
          return res.status(500).json({ ok: false, error: error.message });
        }
        
        res.json({ 
          ok: true, 
          message: "Cache cleared", 
          deletedEntries: data?.length || 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Debug endpoint for upload issues
  app.post("/api/debug-upload", async (req, res) => {
    try {
      console.log("🔍 DEBUG UPLOAD TEST");
      console.log("🔍 Supabase URL:", process.env.SUPABASE_URL ? "Set" : "Missing");
      console.log("🔍 Supabase Key:", process.env.SUPABASE_SERVICE_KEY ? "Set" : "Missing");
      
      // Test Supabase connection
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("❌ Supabase connection error:", error);
        return res.status(500).json({ 
          error: "Supabase connection failed", 
          details: error.message 
        });
      }
      
      console.log("✅ Supabase connected, buckets:", data?.map(b => b.name));
      res.json({ 
        success: true, 
        buckets: data?.map(b => b.name),
        message: "Supabase connection working"
      });
      
    } catch (error) {
      console.error("❌ Debug upload error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // SEO Management API - Admin Authentication Required
  const { seoService } = await import('./seo-service');
  
  // Simple admin authentication middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    // For now, simple token check - can be enhanced later
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Simple check - in production this would validate against database
    const token = authHeader.replace('Bearer ', '');
    if (token !== 'admin-token-temp') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    req.adminUser = 'admin'; // Set admin user identifier
    next();
  };

  // Test endpoint for SEO timeout functionality
  app.get("/api/seo/test-timeout", async (req, res) => {
    try {
      console.log('🧪 Testing SEO timeout functionality...');
      const { testSeoTimeout } = await import('./seo-service');
      const result = await testSeoTimeout();
      console.log('🧪 SEO timeout test result:', result);
      res.json({
        ...result,
        message: result.success 
          ? `✅ Timeout functionality working correctly. Database operation completed in ${result.databaseTimeoutMs}ms` 
          : `❌ Timeout test failed. Operation took ${result.databaseTimeoutMs}ms (expected < ${8000 + 1000}ms)`
      });
    } catch (error) {
      console.error('❌ SEO timeout test error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'SEO timeout test failed'
      });
    }
  });

  // GET /api/admin/seo?lang=fr-FR|en-US → returns current SEO object
  app.get("/api/admin/seo", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const seoData = await seoService.getSeoSettings(lang);
      res.json(seoData || {});
      
    } catch (error) {
      console.error('Error fetching SEO settings:', error);
      res.status(500).json({ error: 'Failed to fetch SEO settings' });
    }
  });

  // POST /api/admin/seo → accepts SEO data and saves with validation
  app.post("/api/admin/seo", requireAdmin, async (req, res) => {
    try {
      const { lang, changeReason, ...seoData } = req.body;
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const dataToSave = { lang, ...seoData };
      await seoService.saveSeoSettings(dataToSave, req.adminUser, changeReason);
      
      res.json({ 
        success: true, 
        message: 'SEO settings saved successfully',
        lang,
        savedBy: req.adminUser
      });
      
    } catch (error: any) {
      console.error('Error saving SEO settings:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to save SEO settings' 
      });
    }
  });

  // GET /api/admin/seo/preview?lang= → returns the raw head snippet as the server will inject it
  app.get("/api/admin/seo/preview", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const headHtml = await seoService.generateHeadPreview(lang);
      
      res.json({
        lang,
        headHtml,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating SEO preview:', error);
      res.status(500).json({ error: 'Failed to generate SEO preview' });
    }
  });

  // GET /api/admin/seo/history?lang= → returns version history
  app.get("/api/admin/seo/history", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      const history = await seoService.getSeoHistory(lang);
      
      res.json({
        lang,
        history,
        count: history.length
      });
      
    } catch (error) {
      console.error('Error fetching SEO history:', error);
      res.status(500).json({ error: 'Failed to fetch SEO history' });
    }
  });

  // POST /api/admin/seo/rollback → rollback to previous version
  app.post("/api/admin/seo/rollback", requireAdmin, async (req, res) => {
    try {
      const { lang, version } = req.body;
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      if (!version || typeof version !== 'number') {
        return res.status(400).json({ error: 'Invalid or missing version number' });
      }

      await seoService.rollbackToVersion(lang, version, req.adminUser);
      
      res.json({ 
        success: true, 
        message: `Rolled back to version ${version}`,
        lang,
        version,
        rolledBackBy: req.adminUser
      });
      
    } catch (error: any) {
      console.error('Error rolling back SEO settings:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to rollback SEO settings' 
      });
    }
  });

  // POST /api/admin/seo/publish?lang= → optional: generate/flush server template for that locale
  app.post("/api/admin/seo/publish", requireAdmin, async (req, res) => {
    try {
      const lang = req.query.lang as 'fr-FR' | 'en-US';
      
      if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
        return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
      }

      // Generate preview to validate current settings
      const headHtml = await seoService.generateHeadPreview(lang);
      
      // Create backup
      const seoData = await seoService.getSeoSettings(lang);
      if (seoData) {
        await seoService.createBackup(seoData, req.adminUser);
      }
      
      res.json({ 
        success: true, 
        message: 'SEO settings published successfully',
        lang,
        headHtml,
        publishedBy: req.adminUser,
        publishedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error publishing SEO settings:', error);
      res.status(500).json({ error: 'Failed to publish SEO settings' });
    }
  });

  // SYNC ENDPOINTS - Transfer JSON data to Supabase for cross-environment sync
  app.post('/api/sync/hero-text', async (req, res) => {
    try {
      console.log('🔄 SYNC: Starting hero text sync from JSON to Supabase...');
      
      // Load current JSON data
      const jsonData = hybridStorage.loadJsonFile('hero-text.json');
      console.log(`📄 Found ${jsonData.length} hero text items in JSON`);
      
      // Insert each item into database
      let synced = 0;
      for (const item of jsonData) {
        try {
          await hybridStorage.createHeroText({
            title_fr: item.title_fr,
            title_en: item.title_en,
            title_mobile_fr: item.title_mobile_fr,
            title_mobile_en: item.title_mobile_en,
            title_desktop_fr: item.title_desktop_fr,
            title_desktop_en: item.title_desktop_en,
            subtitle_fr: item.subtitle_fr || '',
            subtitle_en: item.subtitle_en || '',
            font_size: item.font_size || 60,
            font_size_desktop: item.font_size_desktop || 40,
            font_size_tablet: item.font_size_tablet || 45,
            font_size_mobile: item.font_size_mobile || 18,
            is_active: item.is_active || false
          });
          synced++;
          console.log(`✅ Synced hero text: ${item.id}`);
        } catch (error) {
          console.warn(`⚠️ Skipped duplicate hero text: ${item.id}`);
        }
      }
      
      console.log(`🎉 SYNC COMPLETE: ${synced}/${jsonData.length} hero texts synced to Supabase`);
      res.json({ success: true, synced, total: jsonData.length });
    } catch (error) {
      console.error('❌ Hero text sync failed:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.post('/api/sync/why-memopyk-cards', async (req, res) => {
    try {
      console.log('🔄 SYNC: Starting Why MEMOPYK cards sync from JSON to Supabase...');
      
      // Load current JSON data  
      const jsonData = hybridStorage.loadJsonFile('why-memopyk-cards.json');
      console.log(`📄 Found ${jsonData.length} Why MEMOPYK cards in JSON`);
      
      // Insert each item into database
      let synced = 0;
      for (const item of jsonData) {
        try {
          await hybridStorage.createWhyMemopykCard({
            id: item.id,
            title_en: item.title_en,
            title_fr: item.title_fr,
            description_en: item.description_en,
            description_fr: item.description_fr,
            icon_name: item.icon_name,
            gradient: item.gradient,
            order_index: item.order_index || 0,
            is_active: item.is_active !== false
          });
          synced++;
          console.log(`✅ Synced Why MEMOPYK card: ${item.id}`);
        } catch (error) {
          console.warn(`⚠️ Skipped duplicate card: ${item.id}`);
        }
      }
      
      console.log(`🎉 SYNC COMPLETE: ${synced}/${jsonData.length} Why MEMOPYK cards synced to Supabase`);
      res.json({ success: true, synced, total: jsonData.length });
    } catch (error) {
      console.error('❌ Why MEMOPYK cards sync failed:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  // Analytics cleanup API route
  app.post('/api/analytics/cleanup', async (req, res) => {
    try {
      const { months } = req.body;
      
      if (!months || isNaN(months) || months < 1) {
        return res.status(400).json({ error: "Invalid 'months' parameter. Must be a positive number." });
      }

      console.log(`🧹 ANALYTICS CLEANUP: Starting cleanup for data older than ${months} months`);
      
      // Call the PostgreSQL function to cleanup old analytics data
      const { error } = await supabase.rpc('cleanup_old_analytics_data', { months });

      if (error) {
        console.error('🧹 ANALYTICS CLEANUP: RPC error:', error);
        return res.status(500).json({ 
          error: "Cleanup RPC failed", 
          details: error.message 
        });
      }

      console.log(`🧹 ANALYTICS CLEANUP: Successfully cleaned data older than ${months} months`);
      return res.status(200).json({ 
        success: true, 
        message: `Analytics cleanup completed for data older than ${months} months.` 
      });
    } catch (err: any) {
      console.error('🧹 ANALYTICS CLEANUP: Exception:', err);
      return res.status(500).json({ 
        error: "Unexpected server error", 
        details: err.message 
      });
    }
  });

  // Get last cleanup status from maintenance log
  app.get('/api/analytics/cleanup/status', async (req, res) => {
    try {
      console.log('🧹 ANALYTICS CLEANUP: Fetching last cleanup status');
      
      // Query the maintenance log for the last cleanup
      const { data, error } = await supabase
        .from('analytics_maintenance_log')
        .select('*')
        .eq('operation_type', 'cleanup')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('🧹 ANALYTICS CLEANUP: Error fetching status:', error);
        return res.status(500).json({ 
          error: "Failed to fetch cleanup status", 
          details: error.message 
        });
      }

      const lastCleanup = data && data.length > 0 ? data[0] : null;
      
      return res.status(200).json({ 
        success: true, 
        lastCleanup 
      });
    } catch (err: any) {
      console.error('🧹 ANALYTICS CLEANUP: Exception fetching status:', err);
      return res.status(500).json({ 
        error: "Unexpected server error", 
        details: err.message 
      });
    }
  });

  // ---------- CSV helper function ----------
  function sendCsv(res: any, filename: string, rows: any[]) {
    if (!rows || rows.length === 0) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send("no_data\n");
    }
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const lines = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
    ];
    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ---------- GET /api/analytics/export/csv ----------
  app.get("/api/analytics/export/csv", async (req, res) => {
    try {
      const { report = "overview", from, to, lang, source, device, countryIso3 } = req.query as Record<string, string | undefined>;
      console.log('📊 CSV export request with filters:', { report, from, to, lang, source, device, countryIso3 });
      
      let mockData: any[] = [];
      let filename = `analytics_${report}.csv`;
      
      // Mock data structure that simulates filtered database queries
      // In production, these would be replaced with actual database queries using buildWhere()
      
      switch (report) {
        case "overview": {
          // Simulated: SELECT DATE_TRUNC('day', s.first_seen_at)::date AS day, COUNT(DISTINCT s.session_id) AS sessions, COUNT(DISTINCT s.ip_address) AS unique_visitors, AVG(COALESCE(s.session_duration,0)) AS avg_session_duration FROM analytics_sessions s WHERE ... GROUP BY 1 ORDER BY 1 ASC
          mockData = [
            { day: "2025-08-01", sessions: 150, unique_visitors: 120, avg_session_duration: 180 },
            { day: "2025-08-02", sessions: 175, unique_visitors: 140, avg_session_duration: 195 },
            { day: "2025-08-03", sessions: 200, unique_visitors: 160, avg_session_duration: 210 }
          ];
          break;
        }
        case "video": {
          // Simulated: SELECT * FROM analytics_video_performance v WHERE ... ORDER BY starts DESC
          mockData = [
            { video_id: "PomGalleryC.mp4", video_title: "Pom Gallery Video", starts: 45, completed_90: 32, avg_watch_time: 85, median_watch_time: 78 },
            { video_id: "VitaminSeaC.mp4", video_title: "VitaminSea Video", starts: 38, completed_90: 25, avg_watch_time: 72, median_watch_time: 65 },
            { video_id: "safari-1.mp4", video_title: "Safari Video", starts: 22, completed_90: 15, avg_watch_time: 58, median_watch_time: 52 }
          ];
          break;
        }
        case "cta": {
          // Simulated: SELECT cta_id, COUNT(*) AS total_clicks, COUNT(DISTINCT session_id) AS unique_users FROM analytics_cta_clicks c WHERE ... GROUP BY cta_id ORDER BY total_clicks DESC
          mockData = [
            { cta_id: "contact", total_clicks: 85, unique_users: 72 },
            { cta_id: "book_call", total_clicks: 64, unique_users: 58 },
            { cta_id: "hero_cta", total_clicks: 45, unique_users: 42 },
            { cta_id: "gallery_cta", total_clicks: 38, unique_users: 35 }
          ];
          break;
        }
        case "geo": {
          // Simulated: SELECT s.country_iso3 AS iso3, MAX(s.country) AS country, COUNT(DISTINCT s.session_id) AS sessions, COUNT(DISTINCT s.ip_address) AS visitors FROM analytics_sessions s WHERE ... AND s.country_iso3 = $n GROUP BY s.country_iso3 ORDER BY sessions DESC
          mockData = [
            { iso3: "FRA", country: "France", sessions: 245, visitors: 198 },
            { iso3: "BEL", country: "Belgium", sessions: 85, visitors: 72 },
            { iso3: "CHE", country: "Switzerland", sessions: 42, visitors: 38 },
            { iso3: "CAN", country: "Canada", sessions: 35, visitors: 32 }
          ];
          break;
        }
        default:
          return res.status(400).json({ error: "Unknown report param" });
      }

      /*
      // Real database queries would be:
      switch (report) {
        case "overview": {
          const w = buildWhere(req, { alias: "s", dateCol: "first_seen_at", localeCol: "language", refCol: "referrer", deviceCol: "device_category" }, true);
          const sql = `SELECT DATE_TRUNC('day', s.first_seen_at)::date AS day, COUNT(DISTINCT s.session_id) AS sessions, COUNT(DISTINCT s.ip_address) AS unique_visitors, AVG(COALESCE(s.session_duration,0)) AS avg_session_duration FROM analytics_sessions s ${w.sql} GROUP BY 1 ORDER BY 1 ASC`;
          const { rows } = await pool.query(sql, w.params);
          mockData = rows;
          break;
        }
        case "video": {
          const w = buildWhere(req, { alias: "v", dateCol: "event_timestamp", localeCol: "locale" }, true);
          const sql = `SELECT * FROM analytics_video_performance v ${w.sql} ORDER BY starts DESC`;
          const { rows } = await pool.query(sql, w.params);
          mockData = rows;
          break;
        }
        case "cta": {
          const w = buildWhere(req, { alias: "c", dateCol: "event_timestamp", localeCol: "locale" }, true);
          const sql = `SELECT cta_id, COUNT(*) AS total_clicks, COUNT(DISTINCT session_id) AS unique_users FROM analytics_cta_clicks c ${w.sql} GROUP BY cta_id ORDER BY total_clicks DESC`;
          const { rows } = await pool.query(sql, w.params);
          mockData = rows;
          break;
        }
        case "geo": {
          const w = buildWhere(req, { alias: "s", dateCol: "first_seen_at", localeCol: "language", refCol: "referrer", deviceCol: "device_category" }, true);
          // Add ISO-3 country filter if provided
          let sql = `SELECT s.country_iso3 AS iso3, MAX(s.country) AS country, COUNT(DISTINCT s.session_id) AS sessions, COUNT(DISTINCT s.ip_address) AS visitors FROM analytics_sessions s ${w.sql}`;
          let params = [...w.params];
          if (countryIso3) {
            const glue = w.sql ? " AND " : " WHERE ";
            params.push(countryIso3.toUpperCase());
            sql += `${glue}s.country_iso3 = $${params.length}`;
          }
          sql += ` GROUP BY s.country_iso3 HAVING s.country_iso3 IS NOT NULL ORDER BY sessions DESC`;
          const { rows } = await pool.query(sql, params);
          mockData = rows;
          break;
        }
      }
      */

      sendCsv(res, filename, mockData);
    } catch (err: any) {
      console.error("[export/csv] error:", err);
      res.status(500).json({ error: "CSV export failed", details: err.message });
    }
  });

  // ---- Shared WHERE builder (returns SQL and params for a given table alias/columns)
  type WhereSpec = {
    alias: string;
    dateCol: string;     // e.g. "event_timestamp" or "first_seen_at"
    localeCol?: string;  // e.g. "locale" or "language"
    refCol?: string;     // e.g. "referrer"
    deviceCol?: string;  // e.g. "device_category" or "device_type"
  };

  function buildWhere(
    req: Request,
    spec: WhereSpec,
    addInitialWhere = false
  ): { sql: string; params: any[] } {
    const { from, to, lang, source, device } = req.query as Record<string, string | undefined>;
    const clauses: string[] = [];
    const params: any[] = [];

    if (from) { params.push(from); clauses.push(`${spec.alias}.${spec.dateCol}::date >= $${params.length}`); }
    if (to)   { params.push(to);   clauses.push(`${spec.alias}.${spec.dateCol}::date <= $${params.length}`); }

    if (lang && spec.localeCol)   { params.push(lang);   clauses.push(`${spec.alias}.${spec.localeCol} = $${params.length}`); }
    if (source && spec.refCol)    { params.push(`%${source}%`); clauses.push(`${spec.alias}.${spec.refCol} ILIKE $${params.length}`); }
    if (device && spec.deviceCol) { params.push(device); clauses.push(`${spec.alias}.${spec.deviceCol} = $${params.length}`); }

    if (!clauses.length) return { sql: "", params };
    return { sql: `${addInitialWhere ? "WHERE" : "AND"} ${clauses.join(" AND ")}`, params };
  }

  // ---------- GET /api/analytics/export/pdf ----------
  app.get("/api/analytics/export/pdf", async (req, res) => {
    try {
      const { from, to, lang, source, device } = req.query as Record<string, string | undefined>;
      console.log('📊 PDF export request with filters:', { from, to, lang, source, device });

      // Mock data structure that simulates filtered database queries
      // In production, these would be replaced with actual database queries using buildWhere()
      
      // OVERVIEW (daily): simulated analytics_sessions query
      const mockOverviewData = [
        { day: "2025-08-25", sessions: 180, unique_visitors: 145, avg_session_duration: 195 },
        { day: "2025-08-26", sessions: 165, unique_visitors: 132, avg_session_duration: 178 },
        { day: "2025-08-27", sessions: 220, unique_visitors: 175, avg_session_duration: 215 }
      ];
      
      // VIDEO (top): simulated analytics_video_events query  
      const mockVideoData = [
        { video_id: "PomGalleryC.mp4", video_title: "Pom Gallery Video", starts: 45, completed_90: 32, avg_watch_time: 85, median_watch_time: 78 },
        { video_id: "VitaminSeaC.mp4", video_title: "VitaminSea Video", starts: 38, completed_90: 25, avg_watch_time: 72, median_watch_time: 65 },
        { video_id: "safari-1.mp4", video_title: "Safari Video", starts: 22, completed_90: 15, avg_watch_time: 58, median_watch_time: 52 }
      ];
      
      // CTA (top): simulated analytics_cta_clicks query
      const mockCtaData = [
        { cta_id: "contact", total_clicks: 85, unique_users: 72 },
        { cta_id: "book_call", total_clicks: 64, unique_users: 58 },
        { cta_id: "hero_cta", total_clicks: 45, unique_users: 42 }
      ];
      
      // GEO (countries): simulated analytics_sessions query  
      const mockGeoData = [
        { country: "France", sessions: 245, visitors: 198 },
        { country: "Belgium", sessions: 85, visitors: 72 },
        { country: "Switzerland", sessions: 42, visitors: 38 }
      ];

      /* 
      // Real database queries would be:
      const ovWhere = buildWhere(req, { alias: "s", dateCol: "first_seen_at", localeCol: "language", refCol: "referrer", deviceCol: "device_category" }, true);
      const ovSql = `SELECT DATE_TRUNC('day', s.first_seen_at)::date AS day, COUNT(DISTINCT s.session_id) AS sessions, COUNT(DISTINCT s.ip_address) AS unique_visitors, AVG(COALESCE(s.session_duration, 0)) AS avg_session_duration FROM analytics_sessions s ${ovWhere.sql} GROUP BY 1 ORDER BY 1 ASC`;
      const ov = await pool.query(ovSql, ovWhere.params);
      */

      // Stream the PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="analytics_report.pdf"`);

      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res);

      const title = "MEMOPYK Analytics Report";
      doc.fontSize(18).text(title, { align: "center" });

      // Show applied filters at top
      const rangeText = (from || to) ? `Range: ${from ?? "…"} → ${to ?? "…"} (UTC)` : "Range: full dataset";
      const langText = lang ? ` | Lang: ${lang}` : "";
      const srcText  = source ? ` | Source: ${source}` : "";
      const devText  = device ? ` | Device: ${device}` : "";
      doc.moveDown(0.5).fontSize(10).fillColor("#666").text(rangeText + langText + srcText + devText, { align: "center" });
      doc.fillColor("#000").moveDown();

      // Overview
      doc.fontSize(14).text("Daily Overview", { underline: true });
      doc.moveDown(0.5).fontSize(10);
      mockOverviewData.slice(-14).forEach((r: any) => {
        doc.text(`${r.day}: sessions=${r.sessions}, visitors=${r.unique_visitors}, avg_session=${Math.round(r.avg_session_duration ?? 0)}s`);
      });
      doc.moveDown();

      // Videos
      doc.fontSize(14).text("Top Videos (starts)", { underline: true });
      doc.moveDown(0.5).fontSize(10);
      mockVideoData.slice(0, 10).forEach((v: any) => {
        doc.text(`${v.video_title || v.video_id}: starts=${v.starts}, completed_90=${v.completed_90}, avg=${Math.round(v.avg_watch_time ?? 0)}s, median=${Math.round(v.median_watch_time ?? 0)}s`);
      });
      doc.moveDown();

      // CTAs
      doc.fontSize(14).text("Top CTAs (clicks)", { underline: true });
      doc.moveDown(0.5).fontSize(10);
      mockCtaData.slice(0, 10).forEach((c: any) => {
        doc.text(`${c.cta_id}: clicks=${c.total_clicks}, unique_users=${c.unique_users}`);
      });
      doc.moveDown();

      // Geo
      doc.fontSize(14).text("Top Countries (sessions)", { underline: true });
      doc.moveDown(0.5).fontSize(10);
      mockGeoData.forEach((g: any) => {
        doc.text(`${g.country || "—"}: sessions=${g.sessions}, visitors=${g.visitors}`);
      });

      doc.end();
    } catch (err: any) {
      console.error("[export/pdf] error:", err);
      res.status(500).json({ error: "PDF export failed", details: err.message });
    }
  });

  // ---------- GET /api/analytics/export/sql ----------
  app.get("/api/analytics/export/sql", async (req, res) => {
    try {
      console.log('📊 SQL export requested for analytics migration');
      
      // Load analytics sessions from JSON cache
      const jsonCacheFile = '/home/runner/workspace/server/data/analytics-sessions.json';
      
      console.log('📊 Looking for analytics file at:', jsonCacheFile);
      console.log('📊 File exists check:', fs.existsSync(jsonCacheFile));
      
      if (!fs.existsSync(jsonCacheFile)) {
        console.log('📊 File not found, listing directory contents:');
        try {
          const dirContents = fs.readdirSync(path.join(process.cwd(), 'server', 'data'));
          console.log('📊 Directory contents:', dirContents);
        } catch (e) {
          console.log('📊 Directory read error:', e);
        }
        return res.status(404).json({ error: 'No analytics data found for export' });
      }
      
      const sessionsData = JSON.parse(fs.readFileSync(jsonCacheFile, 'utf8'));
      console.log(`📊 Found ${sessionsData.length} sessions to export`);
      
      // Generate SQL INSERT statements
      let sqlStatements = [];
      
      // Add header comment
      sqlStatements.push('-- MEMOPYK Analytics Data Migration SQL Export');
      sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
      sqlStatements.push(`-- Total sessions: ${sessionsData.length}`);
      sqlStatements.push('-- Tables: analytics_sessions, analytics_views');
      sqlStatements.push('');
      
      // Analytics Sessions INSERT statements
      sqlStatements.push('-- Analytics Sessions Data');
      sqlStatements.push('INSERT INTO analytics_sessions (session_id, ip_address, user_agent, language, referrer, country_code, country_name, device_category, screen_resolution, timezone, first_seen_at, last_seen_at, session_duration, page_count, is_bounce, is_returning, is_test_data, created_at, updated_at) VALUES');
      
      const sessionInserts = [];
      for (const session of sessionsData) {
        const sessionId = session.session_id || session.sessionId;
        const ipAddress = session.ip_address || session.clientIp || session.server_detected_ip;
        const userAgent = session.user_agent || session.userAgent;
        const language = session.language || session.server_detected_language;
        const referrer = session.referrer || '';
        const countryCode = session.country_code || session.countryCode || null;
        const countryName = session.country_name || session.countryName || null;
        const deviceCategory = session.device_category || session.deviceCategory || 'desktop';
        const screenResolution = session.screen_resolution || session.screenResolution || '';
        const timezone = session.timezone || 'UTC';
        const firstSeenAt = session.first_seen_at || session.firstSeenAt || session.created_at || new Date().toISOString();
        const lastSeenAt = session.last_seen_at || session.lastSeenAt || session.updated_at || firstSeenAt;
        const sessionDuration = session.session_duration || session.sessionDuration || 0;
        const pageCount = session.page_count || session.pageCount || 1;
        const isBounce = session.is_bounce || session.isBounce || false;
        const isReturning = session.is_returning || session.isReturning || false;
        const isTestData = session.is_test_data || false;
        const createdAt = session.created_at || firstSeenAt;
        const updatedAt = session.updated_at || lastSeenAt;
        
        // Escape single quotes in strings
        const escapeString = (str: any) => {
          if (str === null || str === undefined) return 'NULL';
          return "'" + String(str).replace(/'/g, "''") + "'";
        };
        
        sessionInserts.push(
          `(${escapeString(sessionId)}, ${escapeString(ipAddress)}, ${escapeString(userAgent)}, ${escapeString(language)}, ${escapeString(referrer)}, ${escapeString(countryCode)}, ${escapeString(countryName)}, ${escapeString(deviceCategory)}, ${escapeString(screenResolution)}, ${escapeString(timezone)}, ${escapeString(firstSeenAt)}, ${escapeString(lastSeenAt)}, ${sessionDuration}, ${pageCount}, ${isBounce}, ${isReturning}, ${isTestData}, ${escapeString(createdAt)}, ${escapeString(updatedAt)})`
        );
      }
      
      // Join all session inserts
      sqlStatements.push(sessionInserts.join(',\n'));
      sqlStatements.push('ON CONFLICT (session_id) DO NOTHING;');
      sqlStatements.push('');
      
      // Analytics Views (derived from sessions)
      sqlStatements.push('-- Analytics Views Data');
      sqlStatements.push('INSERT INTO analytics_views (view_id, session_id, page_url, page_title, view_timestamp, time_on_page, is_bounce_view, referrer, language, created_at) VALUES');
      
      const viewInserts = [];
      for (const session of sessionsData) {
        const sessionId = session.session_id || session.sessionId;
        const pageUrl = session.page_url || 'https://memopyk.com';
        const viewTimestamp = session.first_seen_at || session.firstSeenAt || session.created_at || new Date().toISOString();
        const timeOnPage = session.session_duration || session.sessionDuration || 0;
        const isBounceView = session.is_bounce || session.isBounce || false;
        const referrer = session.referrer || '';
        const language = session.language || session.server_detected_language;
        const createdAt = session.created_at || viewTimestamp;
        
        // Generate view_id from session_id
        const viewId = sessionId + '_view_1';
        
        const escapeString = (str: any) => {
          if (str === null || str === undefined) return 'NULL';
          return "'" + String(str).replace(/'/g, "''") + "'";
        };
        
        viewInserts.push(
          `(${escapeString(viewId)}, ${escapeString(sessionId)}, ${escapeString(pageUrl)}, 'MEMOPYK - Memory Films', ${escapeString(viewTimestamp)}, ${timeOnPage}, ${isBounceView}, ${escapeString(referrer)}, ${escapeString(language)}, ${escapeString(createdAt)})`
        );
      }
      
      sqlStatements.push(viewInserts.join(',\n'));
      sqlStatements.push('ON CONFLICT (view_id) DO NOTHING;');
      sqlStatements.push('');
      sqlStatements.push('-- Migration completed');
      
      // Send as downloadable SQL file
      const sqlContent = sqlStatements.join('\n');
      
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="memopyk_analytics_migration_${new Date().toISOString().split('T')[0]}.sql"`);
      res.send(sqlContent);
      
      console.log(`✅ SQL export completed: ${sessionsData.length} sessions exported as SQL INSERT statements`);
      
    } catch (error: any) {
      console.error('❌ SQL export failed:', error);
      res.status(500).json({ error: 'SQL export failed', details: error.message });
    }
  });

  // ========== IP EXCLUSIONS ADMIN ENDPOINTS ==========
  
  // Get all IP exclusions
  app.get("/api/admin/ip-exclusions", requireAdmin, async (req, res) => {
    try {
      console.log('🔍 Fetching IP exclusions from database...');
      
      // Try to fetch from Supabase first
      try {
        const { data, error } = await supabase
          .from('analytics_exclusions')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        console.log(`✅ IP exclusions retrieved from Supabase: ${data.length} items`);
        res.json(data);
        return;
      } catch (supabaseError) {
        console.warn('⚠️ Supabase IP exclusions query failed, using JSON fallback:', supabaseError);
        
        // JSON fallback for IP exclusions
        const fallbackData = [];
        res.json(fallbackData);
      }
    } catch (error) {
      console.error('❌ Error fetching IP exclusions:', error);
      res.status(500).json({ error: 'Failed to fetch IP exclusions' });
    }
  });
  
  // Create new IP exclusion  
  app.post("/api/admin/ip-exclusions", requireAdmin, async (req, res) => {
    try {
      const { ipCidr, label, active = true } = req.body;
      
      if (!ipCidr || !label) {
        return res.status(400).json({ error: 'IP CIDR and label are required' });
      }
      
      console.log('📝 Creating IP exclusion:', { ipCidr, label, active });
      
      // Try to save to Supabase first
      try {
        const { data, error } = await supabase
          .from('analytics_exclusions')
          .insert([{
            ip_cidr: ipCidr,
            label,
            active,
            applies_from: new Date().toISOString()
          }])
          .select()
          .single();
          
        if (error) throw error;
        
        console.log('✅ IP exclusion created in Supabase:', data.id);
        res.json(data);
        return;
      } catch (supabaseError) {
        console.warn('⚠️ Supabase IP exclusion creation failed:', supabaseError);
        res.status(500).json({ error: 'Failed to create IP exclusion' });
      }
    } catch (error) {
      console.error('❌ Error creating IP exclusion:', error);
      res.status(500).json({ error: 'Failed to create IP exclusion' });
    }
  });
  
  // Update IP exclusion
  app.patch("/api/admin/ip-exclusions/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('📝 Updating IP exclusion:', id, updates);
      
      // Try to update in Supabase first
      try {
        const { data, error } = await supabase
          .from('analytics_exclusions')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        
        console.log('✅ IP exclusion updated in Supabase:', id);
        res.json(data);
        return;
      } catch (supabaseError) {
        console.warn('⚠️ Supabase IP exclusion update failed:', supabaseError);
        res.status(500).json({ error: 'Failed to update IP exclusion' });
      }
    } catch (error) {
      console.error('❌ Error updating IP exclusion:', error);
      res.status(500).json({ error: 'Failed to update IP exclusion' });
    }
  });
  
  // Delete IP exclusion
  app.delete("/api/admin/ip-exclusions/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('🗑️ Deleting IP exclusion:', id);
      
      // Try to delete from Supabase first
      try {
        const { error } = await supabase
          .from('analytics_exclusions')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        console.log('✅ IP exclusion deleted from Supabase:', id);
        res.json({ success: true });
        return;
      } catch (supabaseError) {
        console.warn('⚠️ Supabase IP exclusion deletion failed:', supabaseError);
        res.status(500).json({ error: 'Failed to delete IP exclusion' });
      }
    } catch (error) {
      console.error('❌ Error deleting IP exclusion:', error);
      res.status(500).json({ error: 'Failed to delete IP exclusion' });
    }
  });
  
  // Get current user's IP (for testing/whitelisting)
  app.get("/api/whoami", async (req, res) => {
    try {
      const clientIp = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection.remoteAddress ||
                      req.socket.remoteAddress ||
                      req.ip ||
                      'unknown';
                      
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      console.log('🔍 Whoami request:', { clientIp, userAgent });
      
      res.json({
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error in whoami endpoint:', error);
      res.status(500).json({ error: 'Failed to get client info' });
    }
  });

  // ========== DIRECTUS MEDIA UPLOAD ENDPOINTS ==========
  
  // Multer configuration for Directus media uploads
  const directusUploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'temp_uploads');
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  });

  const directusUpload = multer({
    storage: directusUploadStorage,
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB max
    },
    fileFilter: (req, file, cb) => {
      // Allowed MIME types
      const allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const allowedVideos = ['video/mp4', 'video/webm', 'video/quicktime'];
      const allowed = [...allowedImages, ...allowedVideos];
      
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: images (jpeg, png, webp, gif) and videos (mp4, webm, mov)`));
      }
    }
  });

  // Helper to get Directus token
  function getDirectusToken() {
    const token = process.env.DIRECTUS_TOKEN;
    if (!token) {
      throw new Error('DIRECTUS_TOKEN environment variable not set');
    }
    return token;
  }

  // Helper to validate file size limits
  function validateFileSize(fileSizeMB: number, mimetype: string): { valid: boolean; error?: string } {
    const isImage = mimetype.startsWith('image/');
    const isVideo = mimetype.startsWith('video/');
    
    if (isImage && fileSizeMB > 8) {
      return { valid: false, error: `Image too large: ${fileSizeMB.toFixed(2)}MB. Maximum: 8MB` };
    }
    if (isVideo && fileSizeMB > 100) {
      return { valid: false, error: `Video too large: ${fileSizeMB.toFixed(2)}MB. Maximum: 100MB` };
    }
    return { valid: true };
  }

  // Helper to convert numeric/hex IP to dotted notation
  function normalizeIPv4(input: string): string | null {
    // Already in dotted notation
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) {
      return input;
    }
    
    // Check for decimal IP (e.g., 2130706433 for 127.0.0.1)
    if (/^\d+$/.test(input)) {
      const num = parseInt(input, 10);
      if (num >= 0 && num <= 0xFFFFFFFF) {
        const a = (num >> 24) & 0xFF;
        const b = (num >> 16) & 0xFF;
        const c = (num >> 8) & 0xFF;
        const d = num & 0xFF;
        return `${a}.${b}.${c}.${d}`;
      }
    }
    
    // Check for hex IP (e.g., 0x7f000001 for 127.0.0.1)
    if (/^0x[0-9a-fA-F]+$/.test(input)) {
      const num = parseInt(input, 16);
      if (num >= 0 && num <= 0xFFFFFFFF) {
        const a = (num >> 24) & 0xFF;
        const b = (num >> 16) & 0xFF;
        const c = (num >> 8) & 0xFF;
        const d = num & 0xFF;
        return `${a}.${b}.${c}.${d}`;
      }
    }
    
    // Check for octal (browsers/curl support this)
    if (/^0[0-7]+$/.test(input)) {
      const num = parseInt(input, 8);
      if (num >= 0 && num <= 0xFFFFFFFF) {
        const a = (num >> 24) & 0xFF;
        const b = (num >> 16) & 0xFF;
        const c = (num >> 8) & 0xFF;
        const d = num & 0xFF;
        return `${a}.${b}.${c}.${d}`;
      }
    }
    
    return null;
  }

  // Helper to check if an IP address is private/reserved
  function isPrivateOrReservedIP(ip: string): boolean {
    // Try to normalize if it's a numeric IPv4
    const normalized = normalizeIPv4(ip);
    const checkIP = normalized || ip;
    
    // Check IPv4 private/reserved ranges
    const ipv4Octets = checkIP.split('.').map(Number);
    if (ipv4Octets.length === 4 && ipv4Octets.every(o => o >= 0 && o <= 255)) {
      const [a, b, c, d] = ipv4Octets;
      
      // Loopback: 127.0.0.0/8
      if (a === 127) return true;
      
      // Private Class A: 10.0.0.0/8
      if (a === 10) return true;
      
      // Private Class B: 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;
      
      // Private Class C: 192.168.0.0/16
      if (a === 192 && b === 168) return true;
      
      // Link-local: 169.254.0.0/16
      if (a === 169 && b === 254) return true;
      
      // Broadcast: 255.255.255.255
      if (a === 255 && b === 255 && c === 255 && d === 255) return true;
      
      // This host: 0.0.0.0/8
      if (a === 0) return true;
    }
    
    // Check IPv6 private/reserved ranges
    const ipLower = checkIP.toLowerCase();
    
    // Loopback: ::1
    if (ipLower === '::1' || ipLower === '0:0:0:0:0:0:0:1') return true;
    
    // Link-local: fe80::/10
    if (ipLower.startsWith('fe80:')) return true;
    
    // Unique local: fc00::/7 and fd00::/8
    if (ipLower.startsWith('fc') || ipLower.startsWith('fd')) return true;
    
    // Unspecified: ::
    if (ipLower === '::' || ipLower === '0:0:0:0:0:0:0:0') return true;
    
    return false;
  }

  // Helper to check if URL is safe (prevent SSRF) with DNS resolution
  async function isSafeUrl(urlString: string): Promise<boolean> {
    try {
      const url = new URL(urlString);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      
      const hostname = url.hostname.toLowerCase();
      
      // Block localhost by name
      if (hostname === 'localhost') {
        return false;
      }
      
      // If hostname is already an IP address, validate it directly
      if (hostname.match(/^[\d.:]+$/)) {
        return !isPrivateOrReservedIP(hostname);
      }
      
      // Resolve hostname to IP addresses
      try {
        const { lookup } = await import('dns/promises');
        const resolved = await lookup(hostname, { all: true });
        
        // Check if any resolved IP is private/reserved
        for (const record of resolved) {
          if (isPrivateOrReservedIP(record.address)) {
            console.warn(`⚠️ SSRF blocked: ${hostname} resolves to private IP ${record.address}`);
            return false;
          }
        }
        
        return true;
      } catch (dnsError) {
        console.warn(`⚠️ DNS resolution failed for ${hostname}:`, dnsError);
        return false;
      }
    } catch {
      return false;
    }
  }

  // POST /api/admin/upload - Upload file to Directus
  app.post("/api/admin/upload", requireAdmin, directusUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const fileSizeMB = req.file.size / (1024 * 1024);
      const sizeCheck = validateFileSize(fileSizeMB, req.file.mimetype);
      
      if (!sizeCheck.valid) {
        // Clean up temp file
        unlinkSync(req.file.path);
        return res.status(400).json({ error: sizeCheck.error });
      }

      console.log(`📤 Uploading to Directus: ${req.file.originalname} (${fileSizeMB.toFixed(2)}MB, ${req.file.mimetype})`);

      const token = getDirectusToken();
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      
      // Read file and append as buffer with proper options
      const fileBuffer = readFileSync(req.file.path);
      formData.append('file', fileBuffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      
      // Add optional metadata
      if (req.body.title) {
        formData.append('title', req.body.title);
      }
      if (req.body.description) {
        formData.append('description', req.body.description);
      }

      // Upload using form-data's submit method (more reliable than fetch)
      const uploadPromise = new Promise<{ fileId: string; assetUrl: string }>((resolve, reject) => {
        formData.submit({
          host: 'cms.memopyk.com',
          path: '/files',
          method: 'POST',
          protocol: 'https:',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (err, response) => {
          if (err) {
            return reject(err);
          }

          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            if (response.statusCode !== 200 && response.statusCode !== 201) {
              return reject(new Error(`Directus returned ${response.statusCode}: ${data}`));
            }
            
            try {
              const result = JSON.parse(data);
              const fileId = result.data.id;
              const assetUrl = `https://cms.memopyk.com/assets/${fileId}`;
              resolve({ fileId, assetUrl });
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        });
      });

      const { fileId, assetUrl } = await uploadPromise;
      
      // Clean up temp file
      unlinkSync(req.file.path);
      
      console.log(`✅ File uploaded to Directus: ${fileId}`);

      res.json({
        success: true,
        id: fileId,
        url: assetUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

    } catch (error) {
      // Clean up temp file if it exists
      if (req.file?.path && existsSync(req.file.path)) {
        unlinkSync(req.file.path);
      }
      
      console.error('❌ Upload error:', error);
      res.status(500).json({ 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/admin/fetch-external - Import external file URL to Directus
  app.post("/api/admin/fetch-external", requireAdmin, async (req, res) => {
    try {
      const { url, title } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Validate URL safety (SSRF prevention with DNS resolution)
      if (!(await isSafeUrl(url))) {
        return res.status(400).json({ error: 'Invalid or unsafe URL - blocked due to security restrictions' });
      }

      console.log(`🌐 Fetching external file: ${url}`);

      // Download file with timeout and size limit
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'MEMOPYK-CMS/1.0'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(400).json({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` });
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
      
      const isAllowedType = allowedTypes.some(type => contentType.includes(type));
      if (!isAllowedType) {
        return res.status(400).json({ error: `Invalid content type: ${contentType}. Allowed: images and videos only` });
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024);
        const sizeCheck = validateFileSize(sizeMB, contentType);
        if (!sizeCheck.valid) {
          return res.status(400).json({ error: sizeCheck.error });
        }
      }

      // Download to temp file
      const buffer = Buffer.from(await response.arrayBuffer());
      const fileSizeMB = buffer.length / (1024 * 1024);
      
      // Validate downloaded size
      const sizeCheck = validateFileSize(fileSizeMB, contentType);
      if (!sizeCheck.valid) {
        return res.status(400).json({ error: sizeCheck.error });
      }

      // Extract filename from URL or generate one
      let filename = url.split('/').pop()?.split('?')[0] || `download-${Date.now()}`;
      if (!filename.includes('.')) {
        const ext = contentType.split('/')[1]?.split('+')[0] || 'bin';
        filename = `${filename}.${ext}`;
      }

      console.log(`📥 Downloaded ${filename} (${fileSizeMB.toFixed(2)}MB)`);

      // Upload to Directus
      const token = getDirectusToken();
      const formData = new (await import('form-data')).default();
      
      formData.append('file', buffer, {
        filename,
        contentType
      });
      
      if (title) {
        formData.append('title', title);
      }

      const directusResponse = await fetch('https://cms.memopyk.com/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        },
        body: formData as any // form-data package is compatible with fetch
      });

      if (!directusResponse.ok) {
        const errorText = await directusResponse.text();
        console.error('❌ Directus upload error:', directusResponse.status, errorText);
        return res.status(directusResponse.status).json({ 
          error: 'Directus upload failed',
          details: errorText
        });
      }

      const result = await directusResponse.json();
      const fileId = result.data.id;
      const assetUrl = `https://cms.memopyk.com/assets/${fileId}`;

      console.log(`✅ External file imported to Directus: ${fileId}`);

      res.json({
        success: true,
        id: fileId,
        url: assetUrl,
        filename,
        size: buffer.length,
        mimetype: contentType,
        originalUrl: url
      });

    } catch (error) {
      console.error('❌ Fetch external error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return res.status(408).json({ error: 'Request timeout - file download took too long' });
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch external file',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // PUBLIC BLOG ROUTES (Supabase-native)
  // ============================================================================

  // Get published blog posts (public list)
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const { language, limit = 24, offset = 0 } = req.query;
      
      // Validate language parameter
      if (!language || (language !== 'en-US' && language !== 'fr-FR')) {
        return res.status(400).json({ error: 'Invalid or missing language parameter. Must be en-US or fr-FR' });
      }
      
      console.log(`🔍 Fetching blog posts for ${language}`);
      
      // Query published posts only
      const { data: posts, error, count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .eq('language', language)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('featured_order', { ascending: true, nullsFirst: false })
        .order('published_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
      
      if (error) {
        console.error('❌ Error fetching posts:', error);
        throw error;
      }
      
      // Transform database fields to match frontend expectations
      const transformedPosts = (posts || []).map(post => ({
        ...post,
        publish_date: post.published_at || post.created_at, // Frontend expects publish_date
        featured_image_url: post.hero_url, // Frontend expects featured_image_url
        excerpt: post.description // Frontend may use excerpt
      }));
      
      console.log(`✅ Blog posts fetched: ${transformedPosts.length} posts`);
      
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        success: true,
        data: transformedPosts,
        total: count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error('❌ Error fetching blog posts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch blog posts' });
    }
  });

  // ===== Phase 2 Endpoints: All specific routes MUST be before :slug =====
  
  // Full-text search for blog posts
  app.get('/api/blog/posts/search', async (req, res) => {
    try {
      const { q, language = 'en-US', limit = 10, offset = 0 } = req.query;
      
      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query (q) is required' });
      }
      
      const searchTerm = `%${q}%`;
      
      // Search across title, description, and content_html using ILIKE (case-insensitive)
      const { data: posts, error, count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .eq('language', language)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},content_html.ilike.${searchTerm}`)
        .order('published_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: posts,
        total: count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error('Error searching posts:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get related posts based on shared tags
  app.get('/api/blog/posts/:slug/related', async (req, res) => {
    try {
      const { slug } = req.params;
      const limit = parseInt(req.query.limit as string) || 3;
      
      // First, get the current post
      const { data: currentPost, error: postError } = await supabase
        .from('blog_posts')
        .select('id, language')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      if (postError || !currentPost) {
        return res.json({ success: true, data: [], total: 0 });
      }
      
      // Get tags for this post
      const { data: currentTags, error: tagsError } = await supabase
        .from('blog_post_tags')
        .select('tag_id')
        .eq('post_id', currentPost.id);
      
      if (tagsError || !currentTags || currentTags.length === 0) {
        return res.json({ success: true, data: [], total: 0 });
      }
      
      const tagIds = currentTags.map(t => t.tag_id);
      
      // Find other posts with same tags
      const { data: relatedPostTags, error: relatedError } = await supabase
        .from('blog_post_tags')
        .select('post_id, blog_posts(*)')
        .in('tag_id', tagIds)
        .neq('post_id', currentPost.id);
      
      if (relatedError) throw relatedError;
      
      // Group by post and count shared tags
      const postScores: { [key: string]: { post: any; score: number } } = {};
      
      relatedPostTags?.forEach(item => {
        const post = item.blog_posts;
        if (post && post.status === 'published' && post.language === currentPost.language) {
          if (!postScores[post.id]) {
            postScores[post.id] = { post, score: 0 };
          }
          postScores[post.id].score++;
        }
      });
      
      // Sort by score and take top N
      const relatedPosts = Object.values(postScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => ({
          ...item.post,
          featured_image_url: item.post.hero_url,
          publish_date: item.post.published_at
        }));
      
      res.json({
        success: true,
        data: relatedPosts,
        total: relatedPosts.length
      });
    } catch (error) {
      console.error('Error fetching related posts:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get post galleries (STUB - requires galleries junction table)
  app.get('/api/blog/posts/:slug/gallery', async (req, res) => {
    try {
      // TODO: Implement after creating blog_galleries and blog_gallery_images tables
      res.json({
        success: true,
        data: [],
        total: 0
      });
    } catch (error) {
      console.error('Error fetching galleries:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get all public blog tags with post counts
  app.get('/api/blog/tags', async (req, res) => {
    try {
      // Get all tags
      const { data: tags, error: tagsError } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name', { ascending: true });
      
      if (tagsError) throw tagsError;
      
      // Get post counts for each tag
      const { data: tagCounts, error: countsError } = await supabase
        .from('blog_post_tags')
        .select('tag_id, blog_posts!inner(status)');
      
      if (countsError) throw countsError;
      
      // Calculate published post count per tag
      const counts: { [key: string]: number } = {};
      tagCounts?.forEach(item => {
        if (item.blog_posts.status === 'published') {
          counts[item.tag_id] = (counts[item.tag_id] || 0) + 1;
        }
      });
      
      // Add counts to tags
      const tagsWithCounts = tags?.map(tag => ({
        ...tag,
        post_count: counts[tag.id] || 0
      })) || [];
      
      res.json({
        success: true,
        data: tagsWithCounts,
        total: tagsWithCounts.length
      });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get single published blog post by slug (public detail page)
  app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const { language } = req.query;
      
      console.log(`🔍 Fetching blog post: ${slug} (language: ${language})`);
      
      // Query for published post with matching slug
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      // Optionally filter by language if provided
      if (language) {
        query = query.eq('language', language);
      }
      
      const { data: post, error } = await query;
      
      if (error || !post) {
        console.log(`❌ Blog post not found: ${slug}`);
        return res.status(404).json({ 
          success: false, 
          error: 'Post not found or not published' 
        });
      }
      
      // Transform database fields to match frontend expectations
      const transformedPost = {
        ...post,
        publish_date: post.published_at || post.created_at, // Frontend expects publish_date
        featured_image_url: post.hero_url, // Frontend expects featured_image_url
        content: post.content_html // Frontend expects content
      };
      
      console.log(`✅ Blog post found: ${post.title}`);
      res.json(transformedPost);
    } catch (error) {
      console.error('❌ Error fetching blog post:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch blog post' });
    }
  });

  // ============================================================================
  // ADMIN BLOG ROUTES (Supabase-native CRUD)
  // ============================================================================

  // Create blog post from AI-generated JSON
  app.post('/api/admin/blog/create-from-ai', async (req, res) => {
    try {
      const { title, slug, description, content, hero_url, language, is_featured, meta_title, meta_description, status, published_at } = req.body;
      
      // Validate required fields
      if (!title || !slug || !content || !language) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: title, slug, content, language' 
        });
      }
      
      // Build SEO object
      const seo = {
        title: meta_title || title,
        description: meta_description || description || ''
      };
      
      // Create post with provided status or default to 'draft'
      const { data: post, error } = await supabase
        .from('blog_posts')
        .insert({
          title,
          slug,
          description: description || '',
          content_html: content,
          hero_url: hero_url || null,
          language,
          status: status || 'draft',
          published_at: published_at || null,
          is_featured: is_featured || false,
          seo
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error creating blog post:', error);
        throw error;
      }
      
      console.log(`✅ Blog post created: ${post.id} - ${post.title}`);
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('❌ Error creating blog post from AI:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create blog post' 
      });
    }
  });

  // Translate/duplicate blog post to other language
  app.post('/api/admin/blog/posts/:id/translate', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the source post
      const { data: sourcePost, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !sourcePost) {
        return res.status(404).json({ 
          success: false, 
          error: 'Source post not found' 
        });
      }
      
      // Determine target language (opposite of source)
      const targetLanguage = sourcePost.language === 'en-US' ? 'fr-FR' : 'en-US';
      const languageSuffix = targetLanguage === 'en-US' ? '-en' : '-fr';
      
      // Create new slug with language suffix (remove existing suffix if present)
      let newSlug = sourcePost.slug.replace(/-(en|fr)$/, '') + languageSuffix;
      
      // Check if slug already exists, if so append timestamp
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', newSlug)
        .single();
      
      if (existingPost) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      // Create translated post as draft
      const { data: translatedPost, error: createError } = await supabase
        .from('blog_posts')
        .insert({
          title: `[TRANSLATE] ${sourcePost.title}`,
          slug: newSlug,
          description: sourcePost.description,
          content_html: sourcePost.content_html,
          hero_url: sourcePost.hero_url,
          language: targetLanguage,
          status: 'draft',
          is_featured: false,
          seo: sourcePost.seo
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating translated post:', createError);
        throw createError;
      }
      
      console.log(`✅ Post translated: ${sourcePost.language} → ${targetLanguage} (ID: ${translatedPost.id})`);
      
      res.json({
        success: true,
        data: translatedPost
      });
    } catch (error) {
      console.error('❌ Error translating post:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to translate post' 
      });
    }
  });

  // Get all blog posts (admin view - includes drafts)
  app.get('/api/admin/blog/posts', async (req, res) => {
    try {
      const { language, status, limit = 50, offset = 0 } = req.query;
      
      let query = supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (language) {
        query = query.eq('language', language);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: posts, error, count } = await query
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: posts,
        total: count || 0
      });
    } catch (error) {
      console.error('Error fetching admin posts:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get single blog post by ID (admin)
  app.get('/api/admin/blog/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: post, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Update blog post
  app.put('/api/admin/blog/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // If publishing, set published_at
      if (updates.status === 'published' && !updates.published_at) {
        updates.published_at = new Date().toISOString();
      }
      
      const { data: post, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Blog post updated: ${id}`);
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Delete blog post
  app.delete('/api/admin/blog/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log(`✅ Blog post deleted: ${id}`);
      
      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ========== BLOG TAG MANAGEMENT ==========

  // Get all tags (admin)
  app.get('/api/admin/blog/tags', async (req, res) => {
    try {
      const { data: tags, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: tags || [],
        total: tags?.length || 0
      });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Create new tag (admin)
  app.post('/api/admin/blog/tags', async (req, res) => {
    try {
      const { name, color, icon } = req.body;
      
      // Generate slug from name
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const { data: tag, error } = await supabase
        .from('blog_tags')
        .insert({ name, slug, color, icon })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Tag created: ${name}`);
      
      res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Update tag (admin)
  app.put('/api/admin/blog/tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, icon } = req.body;
      
      const updates: any = {};
      if (name !== undefined) {
        updates.name = name;
        updates.slug = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      
      const { data: tag, error } = await supabase
        .from('blog_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Delete tag (admin)
  app.delete('/api/admin/blog/tags/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('blog_tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log(`✅ Tag deleted: ${id}`);
      
      res.json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Assign tags to post (admin)
  app.post('/api/admin/blog/posts/:id/tags', async (req, res) => {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;
      
      // First, delete existing tag associations
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', id);
      
      // Then insert new associations
      if (tagIds && tagIds.length > 0) {
        const associations = tagIds.map((tagId: string) => ({
          post_id: id,
          tag_id: tagId
        }));
        
        const { error } = await supabase
          .from('blog_post_tags')
          .insert(associations);
        
        if (error) throw error;
      }
      
      res.json({
        success: true,
        message: 'Tags updated successfully'
      });
    } catch (error) {
      console.error('Error updating post tags:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Get tags for a post (admin)
  app.get('/api/admin/blog/posts/:id/tags', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: postTags, error } = await supabase
        .from('blog_post_tags')
        .select('tag_id, blog_tags(*)')
        .eq('post_id', id);
      
      if (error) throw error;
      
      const tags = postTags?.map(pt => pt.blog_tags).filter(Boolean) || [];
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error fetching post tags:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Admin Routes
  app.use(adminCountryNames);
  
  // Test Routes
  app.use('/test', testRoutes);
}

export default registerRoutes;
