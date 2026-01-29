/**
 * Video & Image Cache Service
 *
 * Local file cache for media served from Supabase Storage.
 * Avoids repeated CDN fetches — cached files are served directly from disk.
 *
 * Architecture (Coolify — single server):
 *   - NO hybrid-storage dependency
 *   - NO dev/prod sync logic
 *   - Routes call preload/download with explicit filenames
 */

import { existsSync, mkdirSync, createWriteStream, statSync, unlinkSync, readdirSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

/** Base URL for Supabase public storage bucket */
const SUPABASE_STORAGE_BASE =
  "https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos";

export class VideoCache {
  private videoCacheDir: string;
  private imageCacheDir: string;
  private maxCacheSize: number;  // bytes
  private maxCacheAge: number;   // ms

  constructor(cacheRoot = join(process.cwd(), "server/cache")) {
    this.videoCacheDir = join(cacheRoot, "videos");
    this.imageCacheDir = join(cacheRoot, "images");
    this.maxCacheSize = 1_000 * 1024 * 1024; // 1 GB
    this.maxCacheAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    this.ensureDir(this.videoCacheDir);
    this.ensureDir(this.imageCacheDir);
  }

  // ---------------------------------------------------------------------------
  // Video helpers
  // ---------------------------------------------------------------------------

  isVideoCached(filename: string): boolean {
    return existsSync(this.videoPath(filename));
  }

  getCachedVideoPath(filename: string): string | null {
    const p = this.videoPath(filename);
    return existsSync(p) ? p : null;
  }

  /** Pipe an already-fetched response body into the cache. */
  async cacheVideoStream(filename: string, body: NodeJS.ReadableStream): Promise<string> {
    const dest = this.videoPath(filename);
    if (existsSync(dest)) unlinkSync(dest);
    this.evictOldestVideos();

    return new Promise((resolve, reject) => {
      const ws = createWriteStream(dest);
      ws.on("error", reject);
      ws.on("finish", () => resolve(dest));
      body.pipe(ws);
    });
  }

  /** Download a video from Supabase Storage and cache it locally. */
  async downloadAndCacheVideo(filename: string, customUrl?: string): Promise<void> {
    this.ensureDir(this.videoCacheDir);
    const clean = filename.trim();
    const url = customUrl ?? `${SUPABASE_STORAGE_BASE}/${encodeURIComponent(clean)}`;

    const fetch = (await import("node-fetch")).default;
    const res = await fetch(url, {
      headers: { Accept: "video/mp4,video/*,*/*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${clean}`);
    if (!res.body) throw new Error(`Empty body for ${clean}`);

    await this.cacheVideoStream(clean, res.body as unknown as NodeJS.ReadableStream);
  }

  removeVideo(filename: string): void {
    const p = this.videoPath(filename);
    if (existsSync(p)) unlinkSync(p);
  }

  /** Preload a single video by its full Supabase URL. */
  async preloadVideo(videoUrl: string): Promise<void> {
    const filename = videoUrl.split("/").pop()!;
    if (!this.isVideoCached(filename)) {
      await this.downloadAndCacheVideo(filename, videoUrl);
    }
  }

  // ---------------------------------------------------------------------------
  // Image helpers
  // ---------------------------------------------------------------------------

  isImageCached(filename: string): boolean {
    return existsSync(this.imagePath(filename));
  }

  getCachedImagePath(filename: string): string | null {
    const p = this.imagePath(filename);
    return existsSync(p) ? p : null;
  }

  async downloadAndCacheImage(filename: string, customUrl?: string): Promise<void> {
    this.ensureDir(this.imageCacheDir);
    const clean = this.stripQuery(filename.trim());
    const url = customUrl ?? `${SUPABASE_STORAGE_BASE}/${encodeURIComponent(clean)}`;

    const fetch = (await import("node-fetch")).default;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${clean}`);

    const buf = await res.arrayBuffer();
    writeFileSync(this.imagePath(clean), new Uint8Array(buf));
  }

  removeImage(filename: string): void {
    const p = this.imagePath(this.stripQuery(filename));
    if (existsSync(p)) unlinkSync(p);
  }

  // ---------------------------------------------------------------------------
  // Cache management
  // ---------------------------------------------------------------------------

  /** Remove all cached videos and images. */
  clearAll(): { videosRemoved: number; imagesRemoved: number } {
    const v = this.clearDir(this.videoCacheDir);
    const i = this.clearDir(this.imageCacheDir);
    return { videosRemoved: v, imagesRemoved: i };
  }

  clearVideos(): number {
    return this.clearDir(this.videoCacheDir);
  }

  clearImages(): number {
    return this.clearDir(this.imageCacheDir);
  }

  /**
   * Safe clear that renames files before deleting,
   * so in-progress streams are not interrupted.
   */
  async clearAllSafe(): Promise<{ videosRemoved: number; imagesRemoved: number }> {
    const v = await this.safeClearDir(this.videoCacheDir);
    const i = await this.safeClearDir(this.imageCacheDir);
    return { videosRemoved: v, imagesRemoved: i };
  }

  /** Remove files older than maxCacheAge and enforce maxCacheSize. */
  cleanup(): void {
    this.cleanupDir(this.videoCacheDir);
  }

  // ---------------------------------------------------------------------------
  // Stats (for admin routes)
  // ---------------------------------------------------------------------------

  getVideoStats(): CacheStats {
    return this.dirStats(this.videoCacheDir);
  }

  getImageStats(): CacheStats {
    return this.dirStats(this.imageCacheDir);
  }

  getUnifiedStats(): UnifiedCacheStats {
    const v = this.getVideoStats();
    const i = this.getImageStats();
    const totalSize = v.totalSize + i.totalSize;
    return {
      videos: v,
      images: i,
      total: {
        fileCount: v.fileCount + i.fileCount,
        totalSize,
        sizeMB: mb(totalSize),
        limitMB: mb(this.maxCacheSize),
        usagePercent: Math.round((totalSize / this.maxCacheSize) * 100),
      },
    };
  }

  /** Per-file cache status for a list of video filenames. */
  getVideoCacheStatus(filenames: string[]): Record<string, FileStatus> {
    const out: Record<string, FileStatus> = {};
    for (const f of filenames) {
      const p = this.videoPath(f);
      if (existsSync(p)) {
        const s = statSync(p);
        out[f] = { cached: true, size: s.size, lastModified: s.mtime.toISOString() };
      } else {
        out[f] = { cached: false };
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Compatibility methods (for legacy media.routes.ts calls)
  // ---------------------------------------------------------------------------

  /** Legacy alias for downloadAndCacheVideo - caches a video from a Response object */
  async cacheVideo(filename: string, _response?: any): Promise<void> {
    // The old code passed a Response, but we just re-download from Supabase
    await this.downloadAndCacheVideo(filename);
  }

  /** Legacy alias for removeVideo */
  clearSpecificFile(filename: string): void {
    this.removeVideo(filename);
  }

  /** Legacy alias for getUnifiedStats */
  getCacheStats(): UnifiedCacheStats & { totalSize: number } {
    const stats = this.getUnifiedStats();
    return {
      ...stats,
      totalSize: stats.total.totalSize
    };
  }

  /** Legacy alias for getUnifiedStats */
  getDetailedCacheBreakdown(): UnifiedCacheStats {
    return this.getUnifiedStats();
  }

  /** Legacy alias for clearAll */
  async clearCacheCompletely(): Promise<{ videosRemoved: number; imagesRemoved: number }> {
    return this.clearAll();
  }

  /** Preload all hero videos and gallery videos (not yet implemented) */
  async forceCacheAllMedia(): Promise<{ success: boolean; message: string; cached: number }> {
    console.log('🎬 forceCacheAllMedia: Preloading hero videos...');
    const heroVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
    let cached = 0;

    for (const filename of heroVideos) {
      try {
        if (!this.isVideoCached(filename)) {
          await this.downloadAndCacheVideo(filename);
          cached++;
          console.log(`✅ Cached: ${filename}`);
        } else {
          console.log(`⏭️ Already cached: ${filename}`);
        }
      } catch (err) {
        console.error(`❌ Failed to cache ${filename}:`, err);
      }
    }

    return {
      success: true,
      message: `Cached ${cached} hero videos`,
      cached
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private videoPath(filename: string): string {
    return join(this.videoCacheDir, filename.trim());
  }

  private imagePath(filename: string): string {
    return join(this.imageCacheDir, this.stripQuery(filename.trim()));
  }

  private stripQuery(f: string): string {
    const idx = f.indexOf("?");
    return idx >= 0 ? f.slice(0, idx) : f;
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /** Evict oldest videos when count exceeds 8, keeping at most 6. */
  private evictOldestVideos(): void {
    try {
      const files = readdirSync(this.videoCacheDir);
      if (files.length < 8) return;

      const sorted = files
        .map((f) => ({ path: join(this.videoCacheDir, f), mtime: statSync(join(this.videoCacheDir, f)).mtime.getTime() }))
        .sort((a, b) => a.mtime - b.mtime);

      for (const f of sorted.slice(0, files.length - 6)) {
        unlinkSync(f.path);
      }
    } catch { /* best-effort */ }
  }

  private cleanupDir(dir: string): void {
    try {
      const files = readdirSync(dir);
      const entries = files.map((f) => {
        const p = join(dir, f);
        const s = statSync(p);
        return { path: p, size: s.size, age: Date.now() - s.mtime.getTime(), mtime: s.mtime.getTime() };
      });

      // Remove expired files
      for (const e of entries) {
        if (e.age > this.maxCacheAge) unlinkSync(e.path);
      }

      // Enforce size limit (remove oldest first)
      const remaining = entries.filter((e) => e.age <= this.maxCacheAge).sort((a, b) => b.mtime - a.mtime);
      let total = remaining.reduce((s, e) => s + e.size, 0);
      for (let i = remaining.length - 1; i >= 0 && total > this.maxCacheSize; i--) {
        unlinkSync(remaining[i].path);
        total -= remaining[i].size;
      }
    } catch { /* best-effort */ }
  }

  private clearDir(dir: string): number {
    try {
      const files = readdirSync(dir);
      for (const f of files) unlinkSync(join(dir, f));
      return files.length;
    } catch { return 0; }
  }

  /** Rename-then-delete approach for files that may be streamed. */
  private async safeClearDir(dir: string): Promise<number> {
    try {
      const files = readdirSync(dir);
      let count = 0;
      for (const f of files) {
        const src = join(dir, f);
        const tmp = src + ".deleted";
        try {
          renameSync(src, tmp);
          count++;
          setTimeout(() => { try { unlinkSync(tmp); } catch { /* retry on next restart */ } }, 5000);
        } catch {
          try { unlinkSync(src); count++; } catch { /* skip */ }
        }
      }
      return count;
    } catch { return 0; }
  }

  private dirStats(dir: string): CacheStats {
    try {
      const files = readdirSync(dir);
      const details: FileDetail[] = [];
      let totalSize = 0;

      for (const f of files) {
        const s = statSync(join(dir, f));
        totalSize += s.size;
        details.push({ filename: f, size: s.size, lastModified: s.mtime.toISOString() });
      }
      details.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

      return { fileCount: files.length, totalSize, sizeMB: mb(totalSize), files: files, fileDetails: details };
    } catch {
      return { fileCount: 0, totalSize: 0, sizeMB: "0.0", files: [], fileDetails: [] };
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileDetail {
  filename: string;
  size: number;
  lastModified: string;
}

export interface FileStatus {
  cached: boolean;
  size?: number;
  lastModified?: string;
}

export interface CacheStats {
  fileCount: number;
  totalSize: number;
  sizeMB: string;
  files: string[];
  fileDetails: FileDetail[];
}

export interface UnifiedCacheStats {
  videos: CacheStats;
  images: CacheStats;
  total: {
    fileCount: number;
    totalSize: number;
    sizeMB: string;
    limitMB: string;
    usagePercent: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const videoCache = new VideoCache();
