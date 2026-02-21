/**
 * Media Routes
 *
 * Handles file uploads, video/image caching, proxy/streaming,
 * and cache management operations.
 *
 * UPLOAD Endpoints:
 * - POST /api/upload/generate-signed-url    - Generate signed Supabase upload URL
 * - POST /api/upload/server-side-upload     - Server-side upload fallback
 * - POST /api/upload/complete-direct-upload - Complete direct upload (cache + thumbnail)
 * - POST /api/gallery/upload-video          - Upload gallery video (legacy <10MB)
 * - POST /api/upload/image                  - Upload cropped image
 * - POST /api/gallery/upload-image          - Upload gallery image with auto-thumbnail
 * - POST /api/gallery/upload-static-image   - Upload cropped 300x200 thumbnail
 *
 * VIDEO-CACHE Endpoints:
 * - GET  /api/video-cache/status            - Get video cache status
 * - POST /api/video-cache/status            - Check specific videos cache status
 * - GET  /api/video-cache/stats             - Get cache stats
 * - POST /api/video-cache/force             - Force cache individual video
 * - POST /api/video-cache/force-all-media   - Force cache all media
 * - POST /api/video-cache/force-all         - Force cache all (alternative)
 * - POST /api/video-cache/clear             - Clear video cache
 * - POST /api/video-cache/refresh           - Refresh cache status
 *
 * PROXY/STREAMING Endpoints:
 * - GET  /api/video-debug                   - Video diagnostic endpoint
 * - HEAD /api/video-proxy                   - Video proxy HEAD support
 * - GET  /api/video-proxy                   - Video proxy with cache + CDN fallback
 * - GET  /api/image-proxy                   - Image proxy with cache + CDN fallback
 * - GET  /api/gallery-video-proxy           - Gallery video proxy endpoint
 *
 * CACHE MANAGEMENT Endpoints:
 * - GET  /api/cache/breakdown               - Detailed cache breakdown
 * - GET  /api/cache/status                  - Cache status and environment info
 * - POST /api/cache/cleanup                 - Manual cache cleanup
 */

import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createReadStream, existsSync, statSync, mkdirSync, openSync, closeSync, readFileSync, unlinkSync } from 'fs';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createClient } from '@supabase/supabase-js';
import { videoCache } from '../services/media/video-cache.service';

const router = Router();

/** Extract filename from a full Supabase URL or return as-is if already a filename. */
function extractFilename(url: string): string {
  if (!url.includes('/')) return url;
  try { return decodeURIComponent(url.split('/').pop()!); }
  catch { return url.split('/').pop()!; }
}

/** Build the media file lists from hero videos and gallery items for caching. */
async function collectAllMediaFiles(): Promise<{
  videoFilenames: string[];
  videoUrls: Map<string, string>;
  imageFilenames: string[];
  imageUrls: Map<string, string>;
}> {
  const { storage } = await import('../services/storage.service');
  const heroVideos = await storage.getHeroVideos();
  const galleryItems = await storage.getGalleryItems();

  const videoFilenames: string[] = [];
  const videoUrls = new Map<string, string>();
  const imageFilenames: string[] = [];
  const imageUrls = new Map<string, string>();

  // Hero videos (stored as filenames, not full URLs)
  for (const hv of heroVideos) {
    if (hv.urlEn && !videoFilenames.includes(hv.urlEn)) {
      videoFilenames.push(hv.urlEn);
    }
    if (!hv.useSameVideo && hv.urlFr && hv.urlFr !== hv.urlEn && !videoFilenames.includes(hv.urlFr)) {
      videoFilenames.push(hv.urlFr);
    }
  }

  // Gallery videos (stored as full URLs)
  for (const gi of galleryItems) {
    if (gi.videoUrlEn) {
      const fn = extractFilename(gi.videoUrlEn);
      if (!videoFilenames.includes(fn)) {
        videoFilenames.push(fn);
        videoUrls.set(fn, gi.videoUrlEn);
      }
    }
    if (!gi.useSameVideo && gi.videoUrlFr && gi.videoUrlFr !== gi.videoUrlEn) {
      const fn = extractFilename(gi.videoUrlFr);
      if (!videoFilenames.includes(fn)) {
        videoFilenames.push(fn);
        videoUrls.set(fn, gi.videoUrlFr);
      }
    }
  }

  // Gallery static images (thumbnails)
  for (const gi of galleryItems) {
    if (gi.staticImageUrlEn) {
      const fn = extractFilename(gi.staticImageUrlEn);
      if (!imageFilenames.includes(fn)) {
        imageFilenames.push(fn);
        imageUrls.set(fn, gi.staticImageUrlEn);
      }
    }
    if (gi.staticImageUrlFr && gi.staticImageUrlFr !== gi.staticImageUrlEn) {
      const fn = extractFilename(gi.staticImageUrlFr);
      if (!imageFilenames.includes(fn)) {
        imageFilenames.push(fn);
        imageUrls.set(fn, gi.staticImageUrlFr);
      }
    }
  }

  return { videoFilenames, videoUrls, imageFilenames, imageUrls };
}

// hybridStorage is deprecated - Supabase is the single source of truth
// This stub prevents errors if any legacy code still references it
const hybridStorage = {
  updateGalleryItem: async (id: any, data: any) => {
    console.warn('⚠️ hybridStorage.updateGalleryItem called but hybridStorage is deprecated');
    return null;
  }
};

// Gallery cache for performance
let galleryCache: { data: any[], timestamp: number } | null = null;

// Lazy Supabase client (created on first use, not at import time)
let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}
// Keep `supabase` as a const proxy so existing code doesn't need to change call sites
const supabase: any = new Proxy({} as any, {
  get(_t, prop, recv) { return Reflect.get(getSupabase(), prop, recv); },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Upload directory ready: ${uploadsDir}`);
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}

// Configure disk storage for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    console.log(`📁 GALLERY VIDEO UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

// Configure multer for video uploads
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 5000 * 1024 * 1024 }, // 5000MB
  fileFilter: (req, file, cb) => {
    console.log(`📁 ENHANCED FILE DETECTION v2.0 - File upload attempt:`);
    console.log(`   - Filename: ${file.originalname}`);
    console.log(`   - MIME type: ${file.mimetype}`);
    console.log(`   - Size: ${(file.size || 0)} bytes (${((file.size || 0) / 1024 / 1024).toFixed(2)}MB)`);

    const isVideoMimeType = file.mimetype.startsWith('video/');
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp', '.flv', '.wmv'];
    const hasVideoExtension = videoExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (isVideoMimeType || hasVideoExtension) {
      console.log(`✅ VIDEO FILE ACCEPTED: ${file.originalname} (Enhanced detection v2.0 - ${isVideoMimeType ? 'MIME' : 'EXTENSION'} match)`);
      cb(null, true);
    } else {
      console.log(`❌ FILE REJECTED - NOT A VIDEO: ${file.originalname}`);
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Configure disk storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    console.log(`📁 GALLERY IMAGE UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5000 * 1024 * 1024 }, // 5000MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Generate signed upload URL for direct Supabase uploads
async function generateSignedUploadUrl(filename: string, bucket: string): Promise<{ signedUrl: string; publicUrl: string }> {
  try {
    const uniqueFilename = filename;
    console.log(`📁 SIGNED UPLOAD URL - Using original filename: ${uniqueFilename}`);

    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFilename, {
        upsert: true,
      } as any);

    if (signedError) {
      console.error('❌ Failed to generate signed URL:', signedError);
      throw new Error(`Failed to generate signed URL: ${signedError.message}`);
    }

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

// ============================================================
// UPLOAD ENDPOINTS
// ============================================================

// Generate signed upload URL for direct Supabase uploads (bypasses Replit infrastructure limit)
router.post("/api/upload/generate-signed-url", async (req: Request, res: Response) => {
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
    const allowedBuckets = ['memopyk-videos', 'memopyk-blog'];
    if (!allowedBuckets.includes(bucket)) {
      console.error("❌ Invalid bucket:", bucket);
      return res.status(400).json({ error: "Invalid bucket name" });
    }

    console.log(`🎬 GENERATING SIGNED URL for direct upload:`);
    console.log(`   - Original filename: ${filename}`);
    console.log(`   - File type: ${fileType}`);
    console.log(`   - Target bucket: ${bucket}`);

    const { signedUrl, publicUrl } = await generateSignedUploadUrl(filename, bucket);

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
router.post('/api/upload/server-side-upload', uploadImage.single('file'), async (req: Request, res: Response) => {
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
router.post("/api/upload/complete-direct-upload", async (req: Request, res: Response) => {
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
      }
    }

    // AUTO-GENERATE STATIC 300x200 THUMBNAIL for direct uploaded images
    let staticImageUrl = null;
    let autoCropSettings = null;

    if (fileType?.startsWith('image/') || filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      console.log(`🔍 STARTING DIRECT UPLOAD AUTO-THUMBNAIL PROCESS for: ${filename}`);

      try {
        console.log(`🤖 AUTO-GENERATING smart high-quality thumbnail for direct uploaded image: ${filename}`);

        const imageResponse = await fetch(publicUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        // Get image metadata to check if cropping is actually needed
        const metadata = await sharp(Buffer.from(imageBuffer)).metadata();
        const originalAspectRatio = metadata.width! / metadata.height!;
        const targetAspectRatio = 300 / 200; // 1.5 (3:2 ratio)
        const aspectRatioTolerance = 0.01;

        const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;

        // WEB-OPTIMIZED THUMBNAIL
        const thumbnailWidth = 800;
        const thumbnailHeight = 533;

        console.log(`🎯 WEB-OPTIMIZED SERVER CROP: Original ${metadata.width}x${metadata.height} → Thumbnail ${thumbnailWidth}x${thumbnailHeight}`);

        const thumbnailBuffer = await sharp(Buffer.from(imageBuffer))
          .resize(thumbnailWidth, thumbnailHeight, {
            fit: needsCropping ? 'cover' : 'fill',
            position: 'center'
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 70, progressive: true, mozjpeg: true })
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
      static_image_url: staticImageUrl,
      auto_crop_settings: autoCropSettings
    });

  } catch (error) {
    console.error('❌ Failed to complete direct upload:', error);
    res.status(500).json({ error: "Failed to complete upload" });
  }
});

// Upload gallery video endpoint with enhanced error handling (LEGACY - for files under 10MB)
router.post("/api/gallery/upload-video", (req: Request, res: Response, next: NextFunction) => {
  uploadVideo.single('video')(req, res, (err: any) => {
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
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }

    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `gallery_${originalName}`;

    console.log(`📤 Uploading gallery video: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

    // Clear cache if file exists (for overwrite scenario)
    videoCache.clearSpecificFile(filename);

    const fileBuffer = fs.readFileSync(req.file.path);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, fileBuffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
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
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(req.file.path);
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

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
    }

    res.status(500).json({ error: "Failed to upload gallery video" });
  }
});

// Generic image upload endpoint for cropped images
router.post("/api/upload/image", uploadImage.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const filename = req.file.originalname;

    console.log(`🚀 OPTIMIZED UPLOAD: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Buffer processing`);

    const fileBuffer = fs.readFileSync(req.file.path);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, fileBuffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('🚨 CROPPED IMAGE UPLOAD ERROR:', uploadError);
      console.error('🚨 ERROR DETAILS:', JSON.stringify(uploadError, null, 2));
      console.error('🚨 FILE INFO:', { filename, size: req.file.size, mimetype: req.file.mimetype });
      return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
    }

    console.log(`✅ CROPPED IMAGE UPLOADED SUCCESSFULLY: ${filename}`);
    const imageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;

    // Immediate cleanup (non-blocking)
    setImmediate(() => {
      try {
        fs.unlinkSync(req.file?.path!);
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

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
    }

    res.status(500).json({ error: "Failed to upload cropped image" });
  }
});

// Upload gallery image/thumbnail endpoint
router.post("/api/gallery/upload-image", uploadImage.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const filename = req.file.originalname;

    console.log(`📤 Uploading gallery image: ${filename} (${(req.file.size / 1024 / 1024).toFixed(2)}MB) - Overwrite mode`);

    const fileBuffer = fs.readFileSync(req.file.path);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, fileBuffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
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
    console.log(`🔍 File path exists: ${fs.existsSync(req.file.path)}`);
    console.log(`🔍 File size: ${req.file.size} bytes`);

    try {
      console.log(`🤖 AUTO-GENERATING 300x200 thumbnail for new image: ${filename}`);

      // Get image metadata to check if cropping is actually needed
      const metadata = await sharp(req.file.path).metadata();
      const originalAspectRatio = metadata.width! / metadata.height!;
      const targetAspectRatio = 300 / 200;
      const aspectRatioTolerance = 0.01;

      const needsCropping = Math.abs(originalAspectRatio - targetAspectRatio) > aspectRatioTolerance;

      const thumbnailBuffer = await sharp(req.file.path)
        .resize(300, 200, {
          fit: needsCropping ? 'cover' : 'fill',
          position: 'center'
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85, progressive: true, mozjpeg: true })
        .toBuffer();

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
      fs.unlinkSync(req.file.path);
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
      static_image_url: staticImageUrl,
      auto_crop_settings: autoCropSettings
    });

  } catch (error) {
    console.error('Gallery image upload error:', error);

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
    }

    res.status(500).json({ error: "Failed to upload gallery image" });
  }
});

// Upload static cropped image endpoint (300x200 JPEG)
router.post("/api/gallery/upload-static-image", uploadImage.single('image'), async (req: Request, res: Response) => {
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

    let baseFilename = originalFilename;
    if (originalFilename.includes('/')) {
      baseFilename = originalFilename.split('/').pop() || 'image';
    }

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

    const fileBuffer = fs.readFileSync(req.file.path);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '300',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase static image upload error:', uploadError);
      return res.status(500).json({ error: `Static image upload failed: ${uploadError.message}` });
    }

    const staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;

    console.log(`✅ Static image uploaded successfully: ${staticImageUrl}`);

    // FORCE DATABASE UPDATE - multiple approaches
    console.log(`🔄 FORCING DATABASE UPDATE for item ${itemId}`);

    try {
      // Method 1: Direct file system update
      console.log(`📝 Method 1: Direct JSON file update`);
      const jsonPath = path.join(__dirname, '..', 'storage', 'gallery-items.json');

      console.log(`📂 Reading file: ${jsonPath}`);
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const items = JSON.parse(rawData);
      console.log(`📊 Found ${items.length} items in database`);

      const itemIndex = items.findIndex((item: any) => item.id.toString() === itemId.toString());
      console.log(`🔍 Item ${itemId} found at index: ${itemIndex}`);

      if (itemIndex !== -1) {
        const useSameVideo = items[itemIndex].use_same_video;

        console.log(`🔍 STATIC IMAGE UPDATE - use_same_video: ${useSameVideo}, language: ${language}`);

        if (useSameVideo) {
          console.log(`📝 Before update (shared): EN=${items[itemIndex].static_image_url_en}, FR=${items[itemIndex].static_image_url_fr}`);
          items[itemIndex].static_image_url_en = staticImageUrl;
          items[itemIndex].static_image_url_fr = staticImageUrl;
          console.log(`📝 After update (shared): Both EN and FR set to: ${staticImageUrl}`);
        } else {
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

      const jsonPath2 = path.join(__dirname, '..', 'storage', 'gallery-items.json');
      const data = fs.readFileSync(jsonPath2, 'utf8');
      const items = JSON.parse(data);
      const currentItem = items.find((item: any) => item.id.toString() === itemId.toString());
      const useSameVideo = currentItem?.use_same_video;

      let updateData;
      if (useSameVideo) {
        updateData = {
          static_image_url_en: staticImageUrl,
          static_image_url_fr: staticImageUrl,
          cropSettings: cropSettings
        };
        console.log(`🔗 Hybrid storage: Setting both EN and FR to same URL (use_same_video: true)`);
      } else {
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
      fs.unlinkSync(req.file.path);
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

    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup temp file: ${(cleanupError as any).message}`);
      }
    }

    res.status(500).json({ error: "Failed to upload static image" });
  }
});

// ============================================================
// VIDEO-CACHE ENDPOINTS
// ============================================================

// Cache breakdown
router.get("/api/cache/breakdown", (req: Request, res: Response) => {
  try {
    const breakdown = videoCache.getDetailedCacheBreakdown();
    res.json(breakdown);
  } catch (error) {
    console.error('❌ Cache breakdown error:', error);
    res.status(500).json({ error: "Failed to get cache breakdown" });
  }
});

// Video cache status - GET overall status
router.get("/api/video-cache/status", (req: Request, res: Response) => {
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
router.post("/api/video-cache/status", (req: Request, res: Response) => {
  try {
    const { videos } = req.body;
    console.log('🔍 Individual video cache status check:', videos);

    if (!Array.isArray(videos)) {
      return res.status(400).json({ error: "Videos array is required" });
    }

    const results = videos.map((video: any) => {
      const isCached = videoCache.isVideoCached(video.filename);
      const estimatedLoadTime = isCached ? 50 : 1500;

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

// Video cache stats
router.get("/api/video-cache/stats", (req: Request, res: Response) => {
  try {
    const stats = videoCache.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Video cache stats error:', error);
    res.status(500).json({ error: "Failed to get video cache stats" });
  }
});

// Force cache individual video
router.post("/api/video-cache/force", async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    console.log(`🚀 Force cache individual video: ${filename}`);

    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

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

// Force cache all media (hero videos + gallery videos + gallery images from DB)
router.post("/api/video-cache/force-all-media", async (req: Request, res: Response) => {
  try {
    console.log('🚀 Force cache all media — fetching file lists from database');
    const media = await collectAllMediaFiles();
    console.log(`   Videos: ${media.videoFilenames.join(', ')}`);
    console.log(`   Images: ${media.imageFilenames.join(', ')}`);
    const result = await videoCache.forceCacheAllMedia(media);
    res.json(result);
  } catch (error) {
    console.error('❌ Force cache all media error:', error);
    res.status(500).json({ error: "Failed to force cache all media" });
  }
});

// Video Cache Force All (alternative endpoint — same logic)
router.post("/api/video-cache/force-all", async (req: Request, res: Response) => {
  try {
    console.log('🚀 Force cache all videos (alternative endpoint)');
    const media = await collectAllMediaFiles();
    const result = await videoCache.forceCacheAllMedia(media);
    res.json(result);
  } catch (error) {
    console.error('❌ Force cache all error:', error);
    res.status(500).json({ error: "Failed to force cache all videos" });
  }
});

// Video Cache Clear
router.post("/api/video-cache/clear", async (req: Request, res: Response) => {
  try {
    console.log('🧹 Clear video cache request');
    const result = await videoCache.clearCacheCompletely();
    res.json({ success: true, message: "Cache cleared", result });
  } catch (error) {
    console.error('❌ Clear cache error:', error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Smart cleanup — removes only files older than 30 days + enforces size limit
router.post("/api/video-cache/smart-cleanup", (req: Request, res: Response) => {
  try {
    console.log('🧹 Smart cleanup request — removing expired files only');
    const result = videoCache.smartCleanup();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Smart cleanup error:', error);
    res.status(500).json({ error: "Failed to run smart cleanup" });
  }
});

// Video Cache Refresh — dynamic from DB
router.post("/api/video-cache/refresh", async (req: Request, res: Response) => {
  try {
    console.log('🔄 Refresh video cache status');
    const stats = videoCache.getCacheStats();
    const media = await collectAllMediaFiles();

    const videoStatus = media.videoFilenames.map(filename => ({
      filename,
      cached: videoCache.isVideoCached(filename),
      loadTime: videoCache.isVideoCached(filename) ? 50 : 1500
    }));

    res.json({
      success: true,
      stats,
      heroVideos: videoStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cache refresh error:', error);
    res.status(500).json({ error: "Failed to refresh cache" });
  }
});

// Cleanup orphaned static images — removes cached images not referenced by any gallery item
router.post("/api/cache/cleanup-orphaned-static-images", async (req: Request, res: Response) => {
  try {
    const { storage } = await import('../services/storage.service');
    const galleryItems = await storage.getGalleryItems();

    const referenced = new Set<string>();
    for (const gi of galleryItems) {
      if (gi.staticImageUrlEn) referenced.add(extractFilename(gi.staticImageUrlEn));
      if (gi.staticImageUrlFr) referenced.add(extractFilename(gi.staticImageUrlFr));
    }

    const result = videoCache.cleanupOrphanedImages(referenced);
    res.json({
      cleaned: result.cleaned,
      orphanedFiles: result.orphanedFiles,
      referencedImages: Array.from(referenced),
    });
  } catch (error) {
    console.error('❌ Cleanup orphaned images error:', error);
    res.status(500).json({ error: "Failed to cleanup orphaned images" });
  }
});

// ============================================================
// PROXY / STREAMING ENDPOINTS
// ============================================================

// Helper function to stream gallery videos directly from CDN (bypassing cache)
async function streamFromCDN(filename: string, req: any, res: any, version: string) {
  console.error(`🌐 STREAMING FROM CDN: ${filename}`);
  const encodedFilename = encodeURIComponent(filename);

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
    return res.status(500).json({
      error: "Gallery video not available",
      filename,
      status: response.status,
      statusText: response.statusText,
      type: 'GALLERY_CDN_ERROR'
    });
  }

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

  response.body!.pipe(res);

  response.body!.on('end', () => {
    // Stream complete - production optimized logging
  });
}

// Helper function to serve video from cache
function serveVideoFromCache(cachedVideo: string, req: any, res: any) {
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
    console.error(`❌ SERVE VIDEO FROM CACHE ERROR:`);
    console.error(`   - Cache path: ${cachedVideo}`);
    console.error(`   - Error message: ${cacheError.message}`);
    console.error(`   - Error stack: ${cacheError.stack}`);
    throw cacheError;
  }
}

// Video proxy handler
async function handleVideoProxy(req: any, res: any) {
  const VERSION = "v1.1.cache-first";
  const filename = req.query.filename as string;

  if (!filename) {
    return res.status(400).json({ error: "filename parameter is required" });
  }

  try {
    // Cache-first: serve any cached video from disk (hero or gallery)
    const cachedVideo = videoCache.getCachedVideoPath(filename);
    if (cachedVideo && existsSync(cachedVideo)) {
      try {
        serveVideoFromCache(cachedVideo, req, res);
        return;
      } catch (cacheError: any) {
        // Continue to CDN fallback on cache error
      }
    }

    // CDN fallback for uncached videos
    const encodedFilename = encodeURIComponent(filename);
    const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;

    const nodeFetch = (await import('node-fetch')).default;
    const response = await nodeFetch(supabaseUrl, {
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

    if (response.body) {
      response.body.pipe(res);
    } else {
      res.end();
    }

  } catch (error: any) {
    console.error(`❌ VIDEO PROXY ${VERSION} - CRITICAL ERROR for ${filename}:`);
    console.error(`❌ Error message: ${error.message}`);
    console.error(`❌ Error stack: ${error.stack}`);

    res.status(500).json({
      error: "Video proxy failed",
      filename,
      message: error.message,
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  }
}

// VIDEO DIAGNOSTIC ENDPOINT
router.get("/api/video-debug", async (req: Request, res: Response) => {
  const filename = req.query.filename as string;

  console.log(`🔍 VIDEO DIAGNOSTIC REQUEST: ${filename}`);

  if (!filename) {
    return res.status(400).json({ error: "filename parameter is required" });
  }

  const diagnosticReport: any = {
    version: "v1.0-media-routes",
    timestamp: new Date().toISOString(),
    requestedFilename: filename,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      dirname: __dirname
    }
  };

  try {
    const decodedFilename = filename;
    const encodedFilename = encodeURIComponent(decodedFilename);
    const sanitizedFilename = decodedFilename.replace(/[()]/g, '_');

    diagnosticReport.filenames = {
      original: decodedFilename,
      encoded: encodedFilename,
      sanitized: sanitizedFilename
    };

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

    const cachedVideo = videoCache.getCachedVideoPath(videoFilename);
    diagnosticReport.cachePath = cachedVideo;

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

// Video proxy HEAD support
router.head("/api/video-proxy", async (req: Request, res: Response) => {
  await handleVideoProxy(req, res);
});

// Video proxy GET
router.get("/api/video-proxy", async (req: Request, res: Response) => {
  await handleVideoProxy(req, res);
});

// Image proxy with cache + Supabase fallback
router.get("/api/image-proxy", async (req: Request, res: Response) => {
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

// Gallery video proxy endpoint
router.get("/api/gallery-video-proxy", async (req: Request, res: Response) => {
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

// ============================================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================================

// Cache Status and Environment Info Endpoint
router.get("/api/cache/status", async (req: Request, res: Response) => {
  try {
    const { getCacheEnvironmentInfo, getPgClient } = await import("../cache");
    const envInfo = getCacheEnvironmentInfo();

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
router.post("/api/cache/cleanup", async (req: Request, res: Response) => {
  try {
    const { manualCacheCleanup } = await import("../cache");
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

export default router;
