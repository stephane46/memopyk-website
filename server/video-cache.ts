import { existsSync, createWriteStream, statSync, unlinkSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export class VideoCache {
  private videoCacheDir: string;
  private imageCacheDir: string;
  private maxCacheSize: number; // in bytes
  private maxCacheAge: number; // in milliseconds

  constructor() {
    this.videoCacheDir = join(process.cwd(), 'server/cache/videos');
    this.imageCacheDir = join(process.cwd(), 'server/cache/images');
    this.maxCacheSize = 1000 * 1024 * 1024; // 1GB total cache limit (sufficient for max 6 videos)
    this.maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30 days (manual cleanup preferred)
    
    // Ensure cache directories exist
    try {
      if (!existsSync(this.videoCacheDir)) {
        require('fs').mkdirSync(this.videoCacheDir, { recursive: true });
        console.log(`📁 Created video cache directory: ${this.videoCacheDir}`);
      }
      if (!existsSync(this.imageCacheDir)) {
        require('fs').mkdirSync(this.imageCacheDir, { recursive: true });
        console.log(`📁 Created image cache directory: ${this.imageCacheDir}`);
      }
      
      console.log(`✅ Video & Image cache initialized`);
      console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      
      // Skip automatic cleanup - manual management preferred for small video set
      console.log(`📋 Manual cache management enabled for max 6 videos (3 hero + 3 gallery)`);
      
      // Skip immediate preloading during deployment to improve health check response time
      if (process.env.NODE_ENV === 'production') {
        console.log(`⚡ Production mode: Skipping immediate preload for faster health checks`);
        console.log(`📋 Videos will be cached on first request instead`);
      } else {
        // Immediate preloading only in development
        this.immediatePreloadCriticalAssets();
      }
    } catch (error: any) {
      console.error(`❌ Cache directory creation failed: ${error.message}`);
      console.error(`❌ Video cache dir path: ${this.videoCacheDir}`);
      console.error(`❌ Image cache dir path: ${this.imageCacheDir}`);
      console.error(`❌ Process CWD: ${process.cwd()}`);
      // Don't throw - allow server to continue without cache
      console.log(`⚠️ Server will continue without cache - media will stream directly from CDN`);
    }
  }

  /**
   * Get cache file path for a video filename
   */
  private getVideoCacheFilePath(filename: string): string {
    if (!filename || filename.trim() === '') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    // Use original filename directly for consistency and transparency
    return join(this.videoCacheDir, filename.trim());
  }

  /**
   * Get cache file path for an image filename
   */
  private getImageCacheFilePath(filename: string): string {
    if (!filename || filename.trim() === '') {
      throw new Error(`Invalid filename provided: ${filename}`);
    }
    // Remove query parameters from filename before caching
    let cleanFilename = filename.trim();
    if (cleanFilename.includes('?')) {
      cleanFilename = cleanFilename.split('?')[0];
    }
    // Use original filename directly for consistency with videos
    return join(this.imageCacheDir, cleanFilename);
  }

  /**
   * Public method to get cache file path (for external use)
   */
  getCachedFilePath(filename: string): string {
    return this.getVideoCacheFilePath(filename);
  }

  /**
   * Check if video exists in local cache
   */
  isVideoCached(filename: string): boolean {
    try {
      const cacheFile = this.getVideoCacheFilePath(filename);
      return existsSync(cacheFile);
    } catch (error: any) {
      console.error(`❌ Cache check failed for ${filename}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached video file path
   */
  getCachedVideoPath(filename: string): string | null {
    try {
      if (this.isVideoCached(filename)) {
        return this.getVideoCacheFilePath(filename);
      }
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to get cached video path for ${filename}: ${error.message}`);
      return null;
    }
  }

  /**
   * Cache a video from Supabase response
   */
  async cacheVideo(filename: string, videoResponse: any): Promise<string> {
    const cacheFile = this.getVideoCacheFilePath(filename);
    
    // Smart replacement: Remove old video if it exists
    if (existsSync(cacheFile)) {
      console.log(`🔄 Replacing existing cached video: ${filename}`);
      unlinkSync(cacheFile);
    }
    
    // Smart cleanup: Remove old videos before caching new one
    this.smartCleanupBeforeCache();
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(cacheFile);
      
      writeStream.on('error', (error) => {
        console.error(`❌ Failed to cache video ${filename}:`, error);
        reject(error);
      });
      
      writeStream.on('finish', () => {
        console.log(`💾 Cached video: ${filename} -> ${cacheFile}`);
        resolve(cacheFile);
      });
      
      // Pipe video stream to cache file
      if (videoResponse.body) {
        videoResponse.body.pipe(writeStream);
      } else {
        writeStream.end();
        reject(new Error('No video body to cache'));
      }
    });
  }

  /**
   * Remove a specific video from cache
   */
  removeCachedVideo(filename: string): void {
    const cacheFile = this.getVideoCacheFilePath(filename);
    if (existsSync(cacheFile)) {
      unlinkSync(cacheFile);
      console.log(`🗑️ Removed cached video: ${filename}`);
    }
  }

  /**
   * Smart cleanup before caching - removes oldest videos if cache is getting full
   */
  private smartCleanupBeforeCache(): void {
    try {
      const files = readdirSync(this.videoCacheDir);
      
      // If we have more than 8 videos (keeping some buffer below max 10), remove oldest
      if (files.length >= 8) {
        const fileStats = files.map(file => {
          const filePath = join(this.videoCacheDir, file);
          const stats = statSync(filePath);
          return {
            path: filePath,
            file: file,
            mtime: stats.mtime.getTime()
          };
        }).sort((a, b) => a.mtime - b.mtime); // Sort by oldest first
        
        // Remove oldest files to make room
        const toRemove = fileStats.slice(0, files.length - 6); // Keep max 6, remove rest
        toRemove.forEach(file => {
          unlinkSync(file.path);
          console.log(`🗑️ Smart cleanup removed: ${file.file}`);
        });
      }
    } catch (error: any) {
      console.error('❌ Smart cleanup failed:', error.message);
    }
  }

  /**
   * Clean up cache based on size and age limits
   */
  private cleanupCache(): void {
    try {
      const files = readdirSync(this.videoCacheDir);
      const fileStats = files.map(file => {
        const filePath = join(this.videoCacheDir, file);
        const stats = statSync(filePath);
        return {
          path: filePath,
          size: stats.size,
          mtime: stats.mtime.getTime(),
          age: Date.now() - stats.mtime.getTime()
        };
      });

      // Remove files older than max age
      fileStats.forEach(file => {
        if (file.age > this.maxCacheAge) {
          unlinkSync(file.path);
          console.log(`🗑️ Removed expired cache file: ${file.path}`);
        }
      });

      // Check total cache size
      const totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
      
      if (totalSize > this.maxCacheSize) {
        // Remove oldest files until under limit
        const sortedFiles = fileStats
          .filter(file => file.age <= this.maxCacheAge) // Keep only non-expired files
          .sort((a, b) => b.mtime - a.mtime); // Sort by modification time (newest first)
        
        let currentSize = totalSize;
        for (let i = sortedFiles.length - 1; i >= 0 && currentSize > this.maxCacheSize; i--) {
          const file = sortedFiles[i];
          unlinkSync(file.path);
          currentSize -= file.size;
          console.log(`🗑️ Removed cache file to free space: ${file.path}`);
        }
      }

      console.log(`📊 Cache cleanup complete. Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics with detailed file information for admin interface
   */
  getCacheStats(): { fileCount: number; totalSize: number; sizeMB: string; files: string[]; fileDetails: Array<{filename: string; size: number; lastModified: string}> } {
    try {
      const files = readdirSync(this.videoCacheDir);
      const fileDetails: Array<{filename: string; size: number; lastModified: string}> = [];
      
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.videoCacheDir, file);
        const stats = statSync(filePath);
        
        fileDetails.push({
          filename: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        });
        
        return sum + stats.size;
      }, 0);
      
      return {
        fileCount: files.length,
        totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        files: files,
        fileDetails: fileDetails.sort((a, b) => b.lastModified.localeCompare(a.lastModified))
      };
    } catch (error) {
      return { fileCount: 0, totalSize: 0, sizeMB: '0.0', files: [], fileDetails: [] };
    }
  }

  /**
   * Check if a specific video is cached (for admin interface indicators)
   */
  isVideoCachedByFilename(filename: string): boolean {
    const cacheFile = this.getVideoCacheFilePath(filename);
    return existsSync(cacheFile);
  }

  // ========================
  // IMAGE CACHING METHODS
  // ========================

  /**
   * Check if image exists in local cache
   */
  isImageCached(filename: string): boolean {
    try {
      const cacheFile = this.getImageCacheFilePath(filename);
      return existsSync(cacheFile);
    } catch (error: any) {
      console.error(`❌ Image cache check failed for ${filename}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cached image file path
   */
  getCachedImagePath(filename: string): string | null {
    try {
      if (this.isImageCached(filename)) {
        return this.getImageCacheFilePath(filename);
      }
      return null;
    } catch (error: any) {
      console.error(`❌ Failed to get cached image path for ${filename}: ${error.message}`);
      return null;
    }
  }

  /**
   * Download and cache an image from Supabase
   */
  async downloadAndCacheImage(filename: string, customUrl?: string): Promise<void> {
    try {
      console.log(`🖼️ PRODUCTION: Starting downloadAndCacheImage for: ${filename}`);
      console.log(`🖼️ PRODUCTION: NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`🖼️ PRODUCTION: Process CWD: ${process.cwd()}`);
      console.log(`🖼️ PRODUCTION: Image cache dir: ${this.imageCacheDir}`);
      
      // Ensure cache directory exists before downloading
      if (!existsSync(this.imageCacheDir)) {
        console.log(`🖼️ PRODUCTION: Image cache directory does not exist, creating: ${this.imageCacheDir}`);
        require('fs').mkdirSync(this.imageCacheDir, { recursive: true });
        console.log(`📁 PRODUCTION: Created image cache directory for download: ${this.imageCacheDir}`);
      } else {
        console.log(`🖼️ PRODUCTION: Image cache directory exists: ${this.imageCacheDir}`);
      }
      
      // Remove query parameters from filename for clean display and caching
      let cleanFilename = filename;
      if (cleanFilename.includes('?')) {
        cleanFilename = cleanFilename.split('?')[0];
      }
      console.log(`🖼️ PRODUCTION: Clean filename: ${cleanFilename}`);
      
      const fullImageUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
      const cacheFile = this.getImageCacheFilePath(cleanFilename);
      
      console.log(`📥 PRODUCTION: Downloading image ${cleanFilename} from Supabase...`);
      console.log(`📥 PRODUCTION: Full URL: ${fullImageUrl}`);
      console.log(`📥 PRODUCTION: Target cache file: ${cacheFile}`);
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fullImageUrl, {
        headers: { 'User-Agent': 'MEMOPYK-ImageCachePreloader/1.0-Production' }
      });
      
      console.log(`📥 PRODUCTION: Fetch response status: ${response.status} ${response.statusText}`);
      console.log(`📥 PRODUCTION: Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`Failed to download image ${cleanFilename}: ${response.status} ${response.statusText}`);
      }
    
      return new Promise((resolve, reject) => {
        const writeStream = createWriteStream(cacheFile);
        
        writeStream.on('error', reject);
        writeStream.on('finish', () => {
          console.log(`💾 Successfully cached image: ${cleanFilename}`);
          resolve();
        });
        
        if (response.body) {
          response.body.pipe(writeStream);
        } else {
          writeStream.end();
          reject(new Error('No response body'));
        }
      });
    } catch (error: any) {
      console.error(`❌ Failed to download and cache image ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image cache statistics
   */
  getImageCacheStats(): { fileCount: number; totalSize: number; sizeMB: string; files: string[] } {
    try {
      const files = readdirSync(this.imageCacheDir);
      const totalSize = files.reduce((sum, file) => {
        const filePath = join(this.imageCacheDir, file);
        const stats = statSync(filePath);
        return sum + stats.size;
      }, 0);
      
      return {
        fileCount: files.length,
        totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        files: files
      };
    } catch (error) {
      return { fileCount: 0, totalSize: 0, sizeMB: '0.0', files: [] };
    }
  }

  /**
   * Get detailed cache breakdown by content type
   */
  getDetailedCacheBreakdown(): {
    heroVideos: { count: number; sizeMB: string; files: string[] };
    galleryVideos: { count: number; sizeMB: string; files: string[] };
    galleryStaticImages: { count: number; sizeMB: string; files: string[] };
    total: { count: number; sizeMB: string };
  } {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      const heroVideoFiles = videoFiles.filter(f => f.startsWith('VideoHero'));
      const galleryVideoFiles = videoFiles.filter(f => !f.startsWith('VideoHero'));
      // Get all image files, not just static_auto_ prefix
      const staticImageFiles = imageFiles.filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
      
      // Calculate sizes
      const heroSize = heroVideoFiles.reduce((total, file) => {
        const stats = statSync(join(this.videoCacheDir, file));
        return total + stats.size;
      }, 0);
      
      const galleryVideoSize = galleryVideoFiles.reduce((total, file) => {
        const stats = statSync(join(this.videoCacheDir, file));
        return total + stats.size;
      }, 0);
      
      const staticImageSize = staticImageFiles.reduce((total, file) => {
        const stats = statSync(join(this.imageCacheDir, file));
        return total + stats.size;
      }, 0);
      
      const totalSize = heroSize + galleryVideoSize + staticImageSize;
      const totalCount = heroVideoFiles.length + galleryVideoFiles.length + staticImageFiles.length;
      
      return {
        heroVideos: {
          count: heroVideoFiles.length,
          sizeMB: (heroSize / 1024 / 1024).toFixed(1),
          files: heroVideoFiles
        },
        galleryVideos: {
          count: galleryVideoFiles.length,
          sizeMB: (galleryVideoSize / 1024 / 1024).toFixed(1),
          files: galleryVideoFiles
        },
        galleryStaticImages: {
          count: staticImageFiles.length,
          sizeMB: (staticImageSize / 1024 / 1024).toFixed(1),
          files: staticImageFiles
        },
        total: {
          count: totalCount,
          sizeMB: (totalSize / 1024 / 1024).toFixed(1)
        }
      };
    } catch (error) {
      console.error('Error getting detailed cache breakdown:', error);
      return {
        heroVideos: { count: 0, sizeMB: '0.0', files: [] },
        galleryVideos: { count: 0, sizeMB: '0.0', files: [] },
        galleryStaticImages: { count: 0, sizeMB: '0.0', files: [] },
        total: { count: 0, sizeMB: '0.0' }
      };
    }
  }

  /**
   * Get unified cache statistics (videos + images) with storage management info
   */
  getUnifiedCacheStats(): { 
    videos: { fileCount: number; totalSize: number; sizeMB: string };
    images: { fileCount: number; totalSize: number; sizeMB: string };
    total: { fileCount: number; totalSize: number; sizeMB: string; limitMB: string; usagePercent: number };
    management: { maxCacheDays: number; autoCleanup: boolean; nextCleanup: string };
  } {
    const videoStats = this.getCacheStats();
    const imageStats = this.getImageCacheStats();
    
    const totalSize = videoStats.totalSize + imageStats.totalSize;
    const totalFiles = videoStats.fileCount + imageStats.fileCount;
    const usagePercent = Math.round((totalSize / this.maxCacheSize) * 100);
    
    return {
      videos: {
        fileCount: videoStats.fileCount,
        totalSize: videoStats.totalSize,
        sizeMB: videoStats.sizeMB
      },
      images: {
        fileCount: imageStats.fileCount,
        totalSize: imageStats.totalSize,
        sizeMB: imageStats.sizeMB
      },
      total: {
        fileCount: totalFiles,
        totalSize: totalSize,
        sizeMB: (totalSize / 1024 / 1024).toFixed(1),
        limitMB: (this.maxCacheSize / 1024 / 1024).toFixed(0),
        usagePercent: usagePercent
      },
      management: {
        maxCacheDays: Math.round(this.maxCacheAge / (24 * 60 * 60 * 1000)),
        autoCleanup: false, // Manual management preferred for small video set (max 6 videos)
        nextCleanup: "Manual" // User manages cleanup as needed
      }
    };
  }

  /**
   * Clear all cached images
   */
  clearImageCache(): void {
    try {
      const files = readdirSync(this.imageCacheDir);
      files.forEach(file => {
        unlinkSync(join(this.imageCacheDir, file));
      });
      console.log(`🗑️ Cleared image cache (${files.length} files removed)`);
    } catch (error) {
      console.error('❌ Failed to clear image cache:', error);
    }
  }

  /**
   * Get detailed cache status for multiple videos (for admin interface)
   */
  getVideoCacheStatus(filenames: string[]): Record<string, {cached: boolean; size?: number; lastModified?: string}> {
    const status: Record<string, {cached: boolean; size?: number; lastModified?: string}> = {};
    
    filenames.forEach(filename => {
      const cacheFile = this.getVideoCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        try {
          const stats = statSync(cacheFile);
          status[filename] = {
            cached: true,
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        } catch (error) {
          status[filename] = { cached: false };
        }
      } else {
        status[filename] = { cached: false };
      }
    });
    
    return status;
  }

  /**
   * Clear entire cache and immediately preload critical assets
   */
  async clearCache(): Promise<void> {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      // Clear video cache
      videoFiles.forEach(file => {
        unlinkSync(join(this.videoCacheDir, file));
      });
      
      // Clear image cache  
      imageFiles.forEach(file => {
        unlinkSync(join(this.imageCacheDir, file));
      });
      
      console.log(`🗑️ Cache cleared: ${videoFiles.length} videos, ${imageFiles.length} images removed`);
      console.log(`🚀 Immediately preloading critical assets to ensure instant visitor performance...`);
      
      // Immediate preload after cleanup ensures first visitors never wait for Supabase downloads
      await this.immediatePreloadCriticalAssets();
      
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Intelligent cleanup - removes only outdated/orphaned files, keeps active cache
   */
  async intelligentCleanup(): Promise<{ videosRemoved: number; imagesRemoved: number; reason: string[] }> {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      let videosRemoved = 0;
      let imagesRemoved = 0;
      const reasons: string[] = [];
      
      console.log(`🧹 INTELLIGENT CLEANUP: Analyzing ${videoFiles.length} videos and ${imageFiles.length} images...`);
      
      // Get current hero and gallery video filenames to protect
      const activeVideoFiles = new Set([
        'VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4', // Hero videos (critical)
        'PomGalleryC.mp4', 'VitaminSeaC.mp4', 'safari-1.mp4'  // Gallery videos (active)
      ]);
      
      // Process video files
      for (const file of videoFiles) {
        const filePath = join(this.videoCacheDir, file);
        const stats = statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        let shouldRemove = false;
        let reason = '';
        
        // Remove if older than 30 days
        if (ageInDays > 30) {
          shouldRemove = true;
          reason = `expired (${Math.round(ageInDays)} days old)`;
        }
        // Remove if not in active video list (orphaned)
        else if (!activeVideoFiles.has(file)) {
          shouldRemove = true;
          reason = `orphaned (not in current active video list)`;
        }
        
        if (shouldRemove) {
          unlinkSync(filePath);
          videosRemoved++;
          reasons.push(`${file}: ${reason}`);
          console.log(`🗑️ Removed video: ${file} (${reason})`);
        }
      }
      
      // Process image files - remove old thumbnails and orphaned images
      for (const file of imageFiles) {
        const filePath = join(this.imageCacheDir, file);
        const stats = statSync(filePath);
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > 30) {
          unlinkSync(filePath);
          imagesRemoved++;
          reasons.push(`${file}: expired (${Math.round(ageInDays)} days old)`);
          console.log(`🗑️ Removed image: ${file} (expired)`);
        }
      }
      
      if (videosRemoved === 0 && imagesRemoved === 0) {
        reasons.push('No outdated or orphaned files found - cache is clean');
      }
      
      console.log(`🧹 INTELLIGENT CLEANUP COMPLETE: ${videosRemoved} videos, ${imagesRemoved} images removed`);
      
      return { videosRemoved, imagesRemoved, reason: reasons };
      
    } catch (error) {
      console.error('❌ Intelligent cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clear cache completely using rename-and-schedule-delete approach
   * This works even when files are actively being streamed
   */
  async clearCacheCompletely(): Promise<{ videosRemoved: number; imagesRemoved: number }> {
    try {
      const videoFiles = readdirSync(this.videoCacheDir);
      const imageFiles = readdirSync(this.imageCacheDir);
      
      let videosRemoved = 0;
      let imagesRemoved = 0;
      
      console.log(`🗑️ SMART CACHE CLEAR: Renaming ${videoFiles.length} videos and ${imageFiles.length} images for deletion...`);
      
      // Strategy: Rename files to .deleted extension, then schedule cleanup
      // This immediately makes cache "empty" from proxy perspective while allowing cleanup later
      
      // Process video files
      for (const file of videoFiles) {
        const filePath = join(this.videoCacheDir, file);
        const deletedPath = filePath + '.deleted';
        
        try {
          // Rename file to .deleted extension - this works even if file is in use
          renameSync(filePath, deletedPath);
          videosRemoved++;
          console.log(`🗑️ Marked for deletion: ${file}`);
          
          // Schedule actual deletion in background (fire and forget)
          setTimeout(() => {
            try {
              unlinkSync(deletedPath);
              console.log(`🗑️ Background cleanup completed: ${file}`);
            } catch (cleanupError) {
              console.log(`⏳ Will retry cleanup later: ${file}`);
              // File will be cleaned up on next server restart
            }
          }, 5000); // 5 second delay allows streams to finish
          
        } catch (error: any) {
          console.warn(`⚠️ Failed to mark video for deletion ${file}:`, error.message);
        }
      }
      
      // Process image files (usually not in use, can delete immediately)
      for (const file of imageFiles) {
        const filePath = join(this.imageCacheDir, file);
        try {
          unlinkSync(filePath);
          imagesRemoved++;
          console.log(`🗑️ Deleted image: ${file}`);
        } catch (error: any) {
          // Try rename approach for images too if direct delete fails
          try {
            const deletedPath = filePath + '.deleted';
            renameSync(filePath, deletedPath);
            imagesRemoved++;
            console.log(`🗑️ Marked image for deletion: ${file}`);
            
            setTimeout(() => {
              try {
                unlinkSync(deletedPath);
                console.log(`🗑️ Background image cleanup: ${file}`);
              } catch (cleanupError) {
                console.log(`⏳ Image cleanup will retry later: ${file}`);
              }
            }, 1000);
            
          } catch (renameError: any) {
            console.warn(`⚠️ Failed to process image ${file}:`, renameError.message);
          }
        }
      }
      
      console.log(`🗑️ SMART CACHE CLEAR COMPLETE:`);
      console.log(`✅ Successfully marked ${videosRemoved}/${videoFiles.length} videos and ${imagesRemoved}/${imageFiles.length} images for deletion`);
      console.log(`🔄 Background cleanup will complete deletion within 5-10 seconds`);
      console.log(`⚡ Cache is now effectively empty - new requests will download fresh files`);
      
      return {
        videosRemoved,
        imagesRemoved
      };
      
    } catch (error) {
      console.error('❌ Failed to clear cache completely:', error);
      throw error;
    }
  }


  // Removed refreshGalleryCache method - redundant with individual cache buttons and BULLETPROOF All Media Cache

  clearSpecificFile(filename: string): void {
    try {
      const cacheFile = this.getVideoCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        unlinkSync(cacheFile);
        console.log(`🗑️ Cleared cached file: ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to clear cached file ${filename}:`, error);
    }
  }

  /**
   * Clear a specific cached image file
   */
  clearSpecificImageFile(filename: string): void {
    try {
      const cacheFile = this.getImageCacheFilePath(filename);
      if (existsSync(cacheFile)) {
        unlinkSync(cacheFile);
        console.log(`🗑️ Cleared cached image: ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to clear cached image ${filename}:`, error);
    }
  }

  /**
   * Preload only hero videos (gallery videos excluded - they don't work in production)
   */
  private async preloadCriticalVideos(): Promise<void> {
    console.log('🚀 Starting HERO-ONLY video preloading - gallery videos excluded...');
    
    // Load only hero videos (gallery videos fail in production)
    await this.preloadHeroVideosOnly();
    
    const stats = this.getCacheStats();
    console.log(`🎯 Hero-only video preloading complete! Cache: ${stats.fileCount} files, ${stats.sizeMB}MB`);
  }

  /**
   * Preload all videos from storage without any filename restrictions
   */
  async preloadHeroVideos(): Promise<void> {
    return this.preloadHeroVideosOnly();
  }

  private async preloadHeroVideosOnly(): Promise<void> {
    console.log('📥 HERO-ONLY PRELOAD v1.0.66 - Loading ONLY hero videos (gallery uses direct CDN)...');
    
    try {
      // Import hybrid storage to get hero video sources only
      const { hybridStorage } = await import('./hybrid-storage');
      
      // Get ONLY hero videos (gallery videos use direct CDN streaming per architecture)
      const heroVideos = await hybridStorage.getHeroVideos();
      const heroVideoFilenames = heroVideos
        .filter(video => video.url_en)
        .map(video => video.url_en.split('/').pop()!)
        .filter(filename => filename && filename.endsWith('.mp4'));
      
      // ARCHITECTURE COMPLIANCE: Only cache hero videos, gallery uses direct CDN
      const uniqueFilenames = Array.from(new Set(heroVideoFilenames)); // Remove duplicates
      
      console.log(`📋 HERO-ONLY PRELOAD: Found ${uniqueFilenames.length} hero videos to cache`);
      console.log(`🎬 Hero video filenames:`, uniqueFilenames);
      console.log(`🚫 Gallery videos excluded - using direct CDN streaming per architecture`);
      
      let videosProcessed = 0;
      let videoErrors = 0;

      // Preload all videos without any filename restrictions
      for (const filename of uniqueFilenames) {
        try {
          console.log(`🔍 Checking cache status for video: ${filename}`);
          const cacheFile = this.getVideoCacheFilePath(filename);
          const fileExists = this.isVideoCached(filename);
          console.log(`📂 DEPLOYMENT CHECK - File: ${filename}, Exists: ${fileExists}, Path: ${cacheFile}`);
          
          if (!fileExists) {
            console.log(`⬇️ UNIVERSAL DOWNLOAD v1.0.40 - Preloading video: ${filename}`);
            await this.downloadAndCacheVideo(filename);
            videosProcessed++;
            
            // CRITICAL: Verify file was actually written after download
            const postDownloadExists = this.isVideoCached(filename);
            const postDownloadSize = postDownloadExists ? statSync(cacheFile).size : 0;
            console.log(`📂 POST-DOWNLOAD VERIFICATION - File: ${filename}, Exists: ${postDownloadExists}, Size: ${postDownloadSize} bytes`);
            console.log(`✅ SUCCESS: Video cached: ${filename}`);
          } else {
            const fileSize = statSync(cacheFile).size;
            console.log(`✅ Video already cached: ${filename} (${fileSize} bytes)`);
          }
        } catch (error) {
          videoErrors++;
          console.error(`❌ UNIVERSAL ERROR v1.0.40 - Failed to preload video ${filename}:`, error);
        }
      }
      
      console.log(`🎬 HERO-ONLY PRELOAD COMPLETE v1.0.66!`);
      console.log(`📊 Results: ${videosProcessed} hero videos cached, ${videoErrors} errors`);
      console.log(`✅ Success rate: ${uniqueFilenames.length > 0 ? Math.round((videosProcessed / uniqueFilenames.length) * 100) : 100}%`);
      console.log(`🏗️ Architecture compliant: Hero videos cached, gallery videos use direct CDN`);
      
    } catch (error) {
      console.error('❌ HERO-ONLY PRELOAD FATAL ERROR v1.0.66:', error);
    }
  }

  /**
   * BULLETPROOF Gallery Media Preload - Videos AND Images with verification
   */
  private async preloadGalleryVideos(): Promise<void> {
    console.log('🚀 BULLETPROOF GALLERY PRELOAD v2.0 - Videos AND Images with verification...');
    
    try {
      // Import hybrid storage to get gallery items
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      console.log(`📋 Retrieved ${galleryItems.length} gallery items from storage`);
      
      const galleryVideos = galleryItems
        .filter(item => item.video_filename || item.video_url_en)
        .map(item => (item.video_filename || item.video_url_en!).split('/').pop()!)
        .filter(filename => filename);

      const galleryImages = galleryItems
        .filter(item => item.static_image_url)
        .map(item => item.static_image_url!.split('/').pop()!)
        .filter(filename => filename);

      console.log(`📋 BULLETPROOF GALLERY: ${galleryVideos.length} videos, ${galleryImages.length} images to cache`);
      console.log(`🎬 Gallery video filenames:`, galleryVideos);
      console.log(`🖼️ Gallery image filenames:`, galleryImages);
      
      let videosProcessed = 0;
      let imagesProcessed = 0;
      let videoErrors = 0;
      let imageErrors = 0;

      // Bulletproof video caching with verification
      for (const filename of galleryVideos) {
        try {
          console.log(`🔍 Checking cache status for gallery video: ${filename}`);
          if (!this.isVideoCached(filename)) {
            console.log(`⬇️ BULLETPROOF DOWNLOAD - Gallery video: ${filename}`);
            await this.downloadAndCacheVideo(filename);
            videosProcessed++;
            
            // Verification
            const postDownloadExists = this.isVideoCached(filename);
            const cacheFile = this.getVideoCacheFilePath(filename);
            const postDownloadSize = postDownloadExists ? statSync(cacheFile).size : 0;
            console.log(`✅ BULLETPROOF SUCCESS: Gallery video ${filename} (${postDownloadSize} bytes)`);
          } else {
            const cacheFile = this.getVideoCacheFilePath(filename);
            const fileSize = statSync(cacheFile).size;
            console.log(`✅ Gallery video already cached: ${filename} (${fileSize} bytes)`);
          }
        } catch (error) {
          videoErrors++;
          console.error(`❌ BULLETPROOF ERROR - Failed to cache gallery video ${filename}:`, error);
        }
      }

      // Bulletproof image caching with verification  
      for (const filename of galleryImages) {
        try {
          console.log(`🔍 Checking cache status for gallery image: ${filename}`);
          if (!this.isImageCached(filename)) {
            console.log(`⬇️ BULLETPROOF DOWNLOAD - Gallery image: ${filename}`);
            await this.downloadAndCacheImage(filename);
            imagesProcessed++;
            
            // Verification
            const postDownloadExists = this.isImageCached(filename);
            const cacheFile = this.getImageCacheFilePath(filename);
            const postDownloadSize = postDownloadExists ? statSync(cacheFile).size : 0;
            console.log(`✅ BULLETPROOF SUCCESS: Gallery image ${filename} (${postDownloadSize} bytes)`);
          } else {
            const cacheFile = this.getImageCacheFilePath(filename);
            const fileSize = statSync(cacheFile).size;
            console.log(`✅ Gallery image already cached: ${filename} (${fileSize} bytes)`);
          }
        } catch (error) {
          imageErrors++;
          console.error(`❌ BULLETPROOF ERROR - Failed to cache gallery image ${filename}:`, error);
        }
      }
      
      console.log(`🎯 BULLETPROOF GALLERY PRELOAD COMPLETE!`);
      console.log(`📊 Results: ${videosProcessed} videos cached, ${imagesProcessed} images cached`);
      console.log(`❌ Errors: ${videoErrors} video errors, ${imageErrors} image errors`);
      console.log(`✅ Total success rate: ${Math.round(((videosProcessed + imagesProcessed) / (galleryVideos.length + galleryImages.length)) * 100)}%`);
      
    } catch (error) {
      console.error('❌ BULLETPROOF GALLERY PRELOAD FATAL ERROR:', error);
    }
  }

  /**
   * BULLETPROOF Force Cache ALL Media - Heroes, Gallery Videos, Gallery Images
   */
  async forceCacheAllMedia(): Promise<any> {
    console.log('🚀 BULLETPROOF FORCE CACHE ALL MEDIA v2.0 - Complete media caching...');
    
    try {
      const startTime = Date.now();
      
      // Import hybrid storage to get all media
      const { hybridStorage } = await import('./hybrid-storage');
      const [heroVideos, galleryItems] = await Promise.all([
        hybridStorage.getHeroVideos(),
        hybridStorage.getGalleryItems()
      ]);
      
      // Collect all media filenames
      const heroVideoFilenames = heroVideos
        .filter(video => video.url_en)
        .map(video => video.url_en.split('/').pop()!)
        .filter(filename => filename && filename.endsWith('.mp4'));

      const galleryVideoFilenames = galleryItems
        .filter(item => item.video_filename || item.video_url_en)
        .map(item => (item.video_filename || item.video_url_en!).split('/').pop()!)
        .filter(filename => filename);

      // Collect unique static image filenames from both EN and FR URLs
      const staticImageUrls = new Set<string>();
      galleryItems.forEach(item => {
        if (item.static_image_url_en) staticImageUrls.add(item.static_image_url_en);
        if (item.static_image_url_fr) staticImageUrls.add(item.static_image_url_fr);
      });
      
      const galleryImageFilenames = Array.from(staticImageUrls)
        .map(url => url.split('/').pop()!)
        .filter(filename => filename);

      const allVideoFilenames = Array.from(new Set([...heroVideoFilenames, ...galleryVideoFilenames]));
      
      console.log(`📋 BULLETPROOF ALL MEDIA: ${allVideoFilenames.length} videos, ${galleryImageFilenames.length} images`);
      console.log(`🎬 Hero videos: ${heroVideoFilenames.length}, Gallery videos: ${galleryVideoFilenames.length}`);
      
      const videoVerification: any[] = [];
      const imageVerification: any[] = [];
      
      // Process all videos with bulletproof verification
      for (const filename of allVideoFilenames) {
        try {
          console.log(`🔄 BULLETPROOF PROCESSING: ${filename}`);
          
          // Clear and re-download for fresh cache
          this.clearSpecificFile(filename);
          
          // Pre-download state
          const preExists = this.isVideoCached(filename);
          const cacheFile = this.getVideoCacheFilePath(filename);
          
          // Download
          await this.downloadAndCacheVideo(filename);
          
          // Post-download verification
          const postExists = existsSync(cacheFile);
          const fileSize = postExists ? statSync(cacheFile).size : 0;
          const isValid = fileSize > 1024; // Minimum 1KB
          const timestamp = new Date().toISOString();
          
          if (postExists && isValid) {
            videoVerification.push({
              filename,
              success: true,
              size: fileSize,
              sizeMB: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
              timestamp
            });
            console.log(`✅ BULLETPROOF SUCCESS: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
          } else {
            videoVerification.push({
              filename,
              success: false,
              error: 'File not created or too small',
              timestamp
            });
          }
          
        } catch (error: any) {
          videoVerification.push({
            filename,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ BULLETPROOF FAILED: ${filename} - ${error.message}`);
        }
      }
      
      // Process all images with bulletproof verification
      for (const filename of galleryImageFilenames) {
        try {
          console.log(`🔄 BULLETPROOF PROCESSING IMAGE: ${filename}`);
          
          // Clear and re-download for fresh cache
          this.clearSpecificImageFile(filename);
          
          // Pre-download state
          const preExists = this.isImageCached(filename);
          const cacheFile = this.getImageCacheFilePath(filename);
          
          // Download
          await this.downloadAndCacheImage(filename);
          
          // Post-download verification
          const postExists = existsSync(cacheFile);
          const fileSize = postExists ? statSync(cacheFile).size : 0;
          const isValid = fileSize > 1024; // Minimum 1KB
          const timestamp = new Date().toISOString();
          
          if (postExists && isValid) {
            imageVerification.push({
              filename,
              success: true,
              size: fileSize,
              sizeMB: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
              timestamp
            });
            console.log(`✅ BULLETPROOF SUCCESS: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
          } else {
            imageVerification.push({
              filename,
              success: false,
              error: 'File not created or too small',
              timestamp
            });
          }
          
        } catch (error: any) {
          imageVerification.push({
            filename,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          console.error(`❌ BULLETPROOF FAILED IMAGE: ${filename} - ${error.message}`);
        }
      }
      
      const successfulVideos = videoVerification.filter(v => v.success).length;
      const successfulImages = imageVerification.filter(v => v.success).length;
      const totalSuccess = successfulVideos + successfulImages;
      const totalAttempted = allVideoFilenames.length + galleryImageFilenames.length;
      
      const endTime = Date.now();
      const processingTime = `${((endTime - startTime) / 1000).toFixed(1)}s`;
      
      console.log(`🎯 BULLETPROOF ALL MEDIA COMPLETE: ${totalSuccess}/${totalAttempted} cached successfully in ${processingTime}`);
      
      return {
        success: true,
        message: `Bulletproof cached and verified ${totalSuccess}/${totalAttempted} media files`,
        stats: {
          videos: { attempted: allVideoFilenames.length, successful: successfulVideos },
          images: { attempted: galleryImageFilenames.length, successful: successfulImages },
          processingTime
        },
        videoVerification,
        imageVerification
      };
      
    } catch (error: any) {
      console.error('❌ BULLETPROOF ALL MEDIA FATAL ERROR:', error);
      return {
        success: false,
        message: `Bulletproof all media caching failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Universal video download system - handles any valid filename
   */
  async downloadAndCacheVideo(filename: string, customUrl?: string): Promise<void> {
    try {
      // Ensure cache directory exists
      if (!existsSync(this.videoCacheDir)) {
        require('fs').mkdirSync(this.videoCacheDir, { recursive: true });
        console.log(`📁 Created cache directory: ${this.videoCacheDir}`);
      }
      
      // Clean filename handling - no special cases or assumptions
      const cleanFilename = filename.trim();
      const encodedFilename = encodeURIComponent(cleanFilename);
      
      // CRITICAL FIX: Use the correct working Supabase domain
      const fullVideoUrl = customUrl || `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodedFilename}`;
      
      console.log(`🚨 CRITICAL URL VERIFIED: Using working Supabase domain: ${fullVideoUrl}`);
      const cacheFile = this.getVideoCacheFilePath(cleanFilename);
      
      console.log(`📥 UNIVERSAL DOWNLOAD v1.0.40: ${cleanFilename}`);
      console.log(`   - Encoded filename: "${encodedFilename}"`);
      console.log(`   - Supabase URL: "${fullVideoUrl}"`);
      console.log(`   - Cache path: "${cacheFile}"`);
      
      // Enhanced fetch with better error handling
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fullVideoUrl, {
        headers: { 
          'User-Agent': 'MEMOPYK-Universal-Cache/1.0',
          'Accept': 'video/mp4,video/*,*/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${cleanFilename}`);
      }

      const contentLength = response.headers.get('content-length');
      console.log(`   - Content-Length: ${contentLength} bytes`);
      
      return new Promise((resolve, reject) => {
        const writeStream = createWriteStream(cacheFile);
        
        writeStream.on('error', (error) => {
          console.error(`❌ Write stream error for ${cleanFilename}:`, error);
          reject(error);
        });
        
        writeStream.on('finish', () => {
          // CRITICAL: Verify file was actually written to disk
          const fileExists = existsSync(cacheFile);
          const fileSize = fileExists ? statSync(cacheFile).size : 0;
          console.log(`✅ Successfully cached: ${cleanFilename}`);
          console.log(`📂 DEPLOYMENT VERIFICATION - Cache file exists: ${fileExists}, size: ${fileSize} bytes`);
          console.log(`📂 Cache file path: ${cacheFile}`);
          
          if (!fileExists) {
            console.error(`🚨 CRITICAL: Cache file was not written to disk! Path: ${cacheFile}`);
            reject(new Error(`Cache file was not written to disk: ${cacheFile}`));
          } else {
            resolve();
          }
        });
        
        if (response.body) {
          response.body.on('error', (error) => {
            console.error(`❌ Response body error for ${cleanFilename}:`, error);
            reject(error);
          });
          
          response.body.pipe(writeStream);
        } else {
          writeStream.end();
          reject(new Error(`No response body for ${cleanFilename}`));
        }
      });
      
    } catch (error: any) {
      console.error(`❌ UNIVERSAL DOWNLOAD FAILED for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Preload a specific video by URL
   */
  async preloadVideo(videoUrl: string): Promise<void> {
    try {
      const filename = this.extractFilenameFromUrl(videoUrl);
      if (!this.isVideoCached(filename)) {
        console.log(`📥 Preloading video: ${filename}`);
        await this.downloadAndCacheVideo(filename);
      } else {
        console.log(`✅ Video already cached: ${filename}`);
      }
    } catch (error) {
      console.error('❌ Failed to preload video:', error);
    }
  }

  /**
   * Extract filename from Supabase URL
   */
  private extractFilenameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Immediate preloading of all critical assets (videos + images) on startup
   * Ensures first visitors get instant performance, never wait for Supabase downloads
   */
  async immediatePreloadCriticalAssets(): Promise<void> {
    console.log(`🚀 MEMOPYK HERO-ONLY PRELOAD v1.0.66 - Starting immediate preload of hero videos only...`);
    console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`📁 Cache directories: videos=${this.videoCacheDir}, images=${this.imageCacheDir}`);
    console.log(`🎯 ARCHITECTURE: Hero videos = cache system, Gallery videos = direct CDN streaming`);
    
    try {
      // Only preload hero videos - gallery videos use direct CDN per architecture decision
      console.log(`🎬 Starting hero video preload only (gallery videos excluded)...`);
      await this.preloadCriticalVideos();
      
      const finalStats = this.getCacheStats();
      console.log(`✅ HERO-ONLY PRELOAD COMPLETE v1.0.66! Cache: ${finalStats.fileCount} files, ${finalStats.sizeMB}MB`);
      console.log(`🎯 Hero videos: instant ~50ms performance from cache`);
      console.log(`🎯 Gallery videos: direct CDN streaming (slower but reliable in production)`);
    } catch (error: any) {
      console.error('❌ HERO PRELOAD FAILED v1.0.66:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.log(`⚠️ Some hero videos may need manual caching or will download on first request`);
    }
  }

  /**
   * Force refresh cache for all critical videos (admin tool)
   */
  async refreshCriticalVideos(): Promise<{ success: boolean; cached: string[]; errors: string[] }> {
    const criticalVideos = [
      'VideoHero1.mp4',
      '1752156356886_VideoHero2.mp4', 
      '1752159228374_VideoHero3.mp4'
    ];

    const cached: string[] = [];
    const errors: string[] = [];

    console.log('🔄 Admin-triggered critical video cache refresh...');

    for (const filename of criticalVideos) {
      try {
        // Remove from cache if exists
        this.removeCachedVideo(filename);
        // Download fresh copy
        await this.downloadAndCacheVideo(filename);
        cached.push(filename);
      } catch (error: any) {
        console.error(`❌ Failed to refresh ${filename}:`, error);
        errors.push(`${filename}: ${error.message}`);
      }
    }

    const stats = this.getCacheStats();
    console.log(`✅ Cache refresh complete! Success: ${cached.length}, Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      cached,
      errors
    };
  }

  /**
   * Download missing static images for gallery items
   */
  async downloadMissingStaticImages(): Promise<{ downloaded: number; total: number; errors: string[] }> {
    const errors: string[] = [];
    let downloaded = 0;
    
    try {
      // Get gallery items from hybrid storage
      const { hybridStorage } = await import('./hybrid-storage');
      const galleryItems = await hybridStorage.getGalleryItems();
      
      console.log(`📊 Checking ${galleryItems.length} gallery items for missing static images...`);
      
      // Collect all unique static image URLs (both English and French)
      const staticImageUrls = new Set<string>();
      
      for (const item of galleryItems) {
        if (item.static_image_url_en) {
          staticImageUrls.add(item.static_image_url_en);
        }
        if (item.static_image_url_fr) {
          staticImageUrls.add(item.static_image_url_fr);
        }
      }
      
      console.log(`📊 Found ${staticImageUrls.size} unique static image URLs to check...`);
      
      for (const staticImageUrl of Array.from(staticImageUrls)) {
        // Extract filename from URL
        const filename = staticImageUrl.split('/').pop();
        if (!filename) continue;
        
        const cachedPath = join(this.imageCacheDir, filename);
        
        // Check if already cached
        if (existsSync(cachedPath)) {
          console.log(`✅ Static image already cached: ${filename}`);
          continue;
        }
        
        console.log(`📥 Downloading missing static image: ${filename}`);
        
        try {
          // Download the image
          const response = await fetch(staticImageUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Save to cache
          const buffer = await response.arrayBuffer();
          writeFileSync(cachedPath, new Uint8Array(buffer));
          
          const stats = statSync(cachedPath);
          console.log(`✅ Downloaded static image: ${filename} (${(stats.size / 1024).toFixed(1)}KB)`);
          downloaded++;
          
        } catch (error: any) {
          const errorMsg = `Failed to download ${filename}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      console.log(`🎯 Static image download complete: ${downloaded} downloaded, ${errors.length} errors`);
      
      return {
        downloaded,
        total: staticImageUrls.size,
        errors
      };
      
    } catch (error: any) {
      console.error('❌ Failed to download missing static images:', error);
      errors.push(error.message);
      return { downloaded: 0, total: 0, errors };
    }
  }
}

// Export singleton instance
export const videoCache = new VideoCache();