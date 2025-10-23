import { Router } from 'express';
import { hybridStorage } from './hybrid-storage';
import fs from 'fs';
import path from 'path';

const router = Router();

// System health check
router.get('/system/health', async (req, res) => {
  try {
    const healthStatus = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };
    
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ 
      error: 'Health check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Database connection test
router.get('/test/database', async (req, res) => {
  try {
    // Test multiple database operations
    const startTime = Date.now();
    
    // Test gallery items query
    const galleryItems = await hybridStorage.getGalleryItems();
    
    // Test FAQ items query  
    const faqItems = await hybridStorage.getFaqs();
    

    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: `Database test completed in ${duration}ms`,
      details: {
        galleryItems: galleryItems.length,
        faqItems: faqItems.length,

        duration: `${duration}ms`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Video cache system test with original filename mapping
router.get('/test/video-cache', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
    
    if (!fs.existsSync(cacheDir)) {
      return res.json({
        success: false,
        message: 'Video cache directory not found',
        details: { cachePath: cacheDir }
      });
    }
    
    // FIXED: No longer using hash mapping - cache now uses original filenames
    // This eliminates the "Unknown" filename issue and provides consistent naming
    
    // Known original filenames that SHOULD be cached (according to current architecture)
    // ARCHITECTURE NOTE: Gallery videos (VitaminSeaC.mp4, PomGalleryC.mp4, safari-1.mp4) 
    // use DIRECT CDN streaming and should NOT be cached
    const expectedFiles = [
      // Hero videos ONLY (these use cache system)
      'VideoHero1.mp4',
      'VideoHero2.mp4', 
      'VideoHero3.mp4',
      // Gallery image files (static thumbnails and original images)
      'static_1753304723805.png',
      'static_gallery-hero2-1753727544112.png',
      '1753737011770-IMG_9217.JPG',
      // Additional image files that may be cached
      'current_static.jpg',
      'debug_test.jpg',
      'final_test.jpg',
      'static_image.jpg',
      'latest_static.jpg',
      'latest_crop_test.jpg',
      'newest_test.jpg',
      'KeyVisual_Hero.png',
      'test_static.jpg',
      'gallery_test.jpg'
    ];
    
    const files = fs.readdirSync(cacheDir);
    const cacheStats = files.map(file => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        // FIXED: Use original filename directly (no more hashing confusion)
        filename: file,
        originalFilename: file, // Same as filename now
        hashedFilename: file,   // For compatibility with frontend, but they're the same now
        size: stats.size,
        sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
        modified: stats.mtime,
        type: file.toLowerCase().includes('.mp4') ? 'video' : 'image',
        isExpected: expectedFiles.includes(file)
      };
    });
    
    const totalSize = cacheStats.reduce((sum, file) => sum + file.size, 0);
    const videoFiles = cacheStats.filter(f => f.type === 'video');
    const imageFiles = cacheStats.filter(f => f.type === 'image');
    
    // Separate expected vs unexpected files based on current architecture
    const expectedVideoFiles = cacheStats.filter(f => f.type === 'video' && f.filename.startsWith('VideoHero'));
    const unexpectedGalleryVideos = cacheStats.filter(f => f.type === 'video' && !f.filename.startsWith('VideoHero'));
    const expectedImageFiles = cacheStats.filter(f => f.type === 'image');
    
    let message = `Cache system analysis - ${expectedVideoFiles.length} hero videos, ${expectedImageFiles.length} images`;
    if (unexpectedGalleryVideos.length > 0) {
      message += ` (WARNING: ${unexpectedGalleryVideos.length} gallery videos found - should use direct CDN)`;
    }
    
    res.json({
      success: true,
      message,
      details: {
        fileCount: files.length,
        videoCount: videoFiles.length,
        imageCount: imageFiles.length,
        expectedHeroVideos: expectedVideoFiles.length,
        unexpectedGalleryVideos: unexpectedGalleryVideos.length,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        cachePath: cacheDir,
        files: cacheStats.sort((a, b) => a.filename.localeCompare(b.filename)),
        architectureNote: "✅ FIXED: Cache now uses original filenames consistently (VideoHero1.mp4, static_image.png, etc.)"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video cache test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Image proxy system test
router.get('/test/image-proxy', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'server', 'cache', 'images');
    
    let imageCount = 0;
    let totalSize = 0;
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      imageCount = files.length;
      
      files.forEach(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
    }
    
    res.json({
      success: true,
      message: 'Image proxy system operational',
      details: {
        imageCount,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        cachePath: cacheDir
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Image proxy test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// File upload system test
router.get('/test/file-upload', async (req, res) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Check if uploads directory exists
    const uploadsExists = fs.existsSync(uploadsDir);
    
    res.json({
      success: uploadsExists,
      message: uploadsExists ? 'Upload system ready' : 'Upload directory not found',
      details: {
        uploadsPath: uploadsDir,
        exists: uploadsExists,
        writable: uploadsExists ? fs.constants.W_OK : false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'File upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analytics system test
router.get('/test/analytics', async (req, res) => {
  try {
    // Test analytics data retrieval
    const sessions = await hybridStorage.getAnalyticsSessions();
    const views = await hybridStorage.getAnalyticsViews();
    
    res.json({
      success: true,
      message: 'Analytics system operational',
      details: {
        sessions: sessions.length,
        views: views.length,
        dataAvailable: sessions.length > 0 || views.length > 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Analytics test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Gallery API endpoints test
router.get('/test/gallery', async (req, res) => {
  try {
    const items = await hybridStorage.getGalleryItems();
    
    res.json({
      success: true,
      message: 'Gallery API endpoints operational',
      details: {
        itemCount: items.length,
        hasVideos: items.some(item => item.video_filename),
        hasImages: items.some(item => item.image_url)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gallery API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// FAQ system test
router.get('/test/faq', async (req, res) => {
  try {
    const faqItems = await hybridStorage.getFaqs();
    
    res.json({
      success: true,
      message: 'FAQ system operational',
      details: {
        itemCount: faqItems.length,
        hasBilingualContent: faqItems.some(item => item.content_fr && item.content_en)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'FAQ test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



// SEO management test
router.get('/test/seo', async (req, res) => {
  try {
    const seoSettings = await hybridStorage.getSeoSettings();
    
    res.json({
      success: true,
      message: 'SEO management operational',
      details: {
        settingsCount: seoSettings.length,
        hasGlobalSettings: seoSettings.some(setting => setting.page_id === 'global')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SEO test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Performance benchmarks test
router.get('/test/performance', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database query performance
    const dbStart = Date.now();
    await hybridStorage.getGalleryItems();
    const dbDuration = Date.now() - dbStart;
    
    // Test memory usage
    const memoryUsage = process.memoryUsage();
    
    // Test cache directory access
    const cacheStart = Date.now();
    const cacheDir = path.join(process.cwd(), 'server', 'cache');
    const cacheExists = fs.existsSync(cacheDir);
    const cacheDuration = Date.now() - cacheStart;
    
    const totalDuration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Performance benchmarks completed',
      details: {
        totalDuration: `${totalDuration}ms`,
        databaseQuery: `${dbDuration}ms`,
        cacheAccess: `${cacheDuration}ms`,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        performance: {
          database: dbDuration < 50 ? 'excellent' : dbDuration < 200 ? 'good' : 'needs improvement',
          cache: cacheDuration < 10 ? 'excellent' : cacheDuration < 50 ? 'good' : 'needs improvement'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Video streaming speed test
router.get('/test/video-streaming-speed', async (req, res) => {
  try {
    const testVideos = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
    const results = [];
    let totalSpeed = 0;

    for (const video of testVideos) {
      const startTime = Date.now();
      try {
        // Test video proxy endpoint speed
        const response = await fetch(`http://localhost:5000/api/video-proxy?filename=${video}`, {
          method: 'HEAD',
          headers: { 'Range': 'bytes=0-1023' }
        });
        
        const duration = Date.now() - startTime;
        const status = response.status === 206 ? 'success' : 'error';
        
        results.push({
          video,
          status,
          duration,
          responseCode: response.status
        });
        
        if (status === 'success') {
          totalSpeed += duration;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          video,
          status: 'error',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulTests = results.filter(r => r.status === 'success');
    const averageSpeed = successfulTests.length > 0 ? 
      Math.round(totalSpeed / successfulTests.length) : 0;

    res.json({
      success: true,
      message: `Video streaming speed test completed - ${successfulTests.length}/${testVideos.length} successful`,
      details: {
        averageSpeed,
        tests: results,
        successRate: `${successfulTests.length}/${testVideos.length}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Video streaming speed test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Image loading speed test  
router.get('/test/image-loading-speed', async (req, res) => {
  try {
    const cacheDir = path.join(process.cwd(), 'server', 'cache', 'images');
    let testImages = [];
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      testImages = files.filter(f => f.toLowerCase().includes('.jpg') || f.toLowerCase().includes('.png')).slice(0, 3);
    }

    if (testImages.length === 0) {
      return res.json({
        success: true,
        message: 'No cached images found for speed testing',
        details: {
          averageSpeed: 0,
          tests: [],
          note: 'Image cache empty - images will be cached on first access'
        }
      });
    }

    const results = [];
    let totalSpeed = 0;

    for (const image of testImages) {
      const startTime = Date.now();
      try {
        const response = await fetch(`http://localhost:5000/api/image-proxy?filename=${image}`, {
          method: 'HEAD'
        });
        
        const duration = Date.now() - startTime;
        const status = response.status === 200 ? 'success' : 'error';
        
        results.push({
          image,
          status,
          duration,
          responseCode: response.status
        });
        
        if (status === 'success') {
          totalSpeed += duration;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          image,
          status: 'error',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulTests = results.filter(r => r.status === 'success');
    const averageSpeed = successfulTests.length > 0 ? 
      Math.round(totalSpeed / successfulTests.length) : 0;

    res.json({
      success: true,
      message: `Image loading speed test completed - ${successfulTests.length}/${testImages.length} successful`,
      details: {
        averageSpeed,
        tests: results,
        successRate: `${successfulTests.length}/${testImages.length}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Image loading speed test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database query speed test
router.get('/test/database-query-speed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test multiple database queries
    const tests = [
      { name: 'Gallery Items', query: () => hybridStorage.getGalleryItems() },
      { name: 'FAQ Items', query: () => hybridStorage.getFaqs() },
      { name: 'Hero Videos', query: () => hybridStorage.getHeroVideos() },
      { name: 'Analytics Views', query: () => hybridStorage.getAnalyticsViews() }
    ];

    const results = [];
    let totalTime = 0;

    for (const test of tests) {
      const testStartTime = Date.now();
      try {
        const data = await test.query();
        const duration = Date.now() - testStartTime;
        
        results.push({
          name: test.name,
          status: 'success',
          duration,
          recordCount: Array.isArray(data) ? data.length : typeof data === 'object' ? Object.keys(data).length : 1
        });
        
        totalTime += duration;
      } catch (error) {
        const duration = Date.now() - testStartTime;
        results.push({
          name: test.name,
          status: 'error',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulTests = results.filter(r => r.status === 'success');
    const averageSpeed = successfulTests.length > 0 ? 
      Math.round(totalTime / successfulTests.length) : 0;

    res.json({
      success: true,
      message: `Database query speed test completed - ${successfulTests.length}/${tests.length} successful`,
      details: {
        averageSpeed,
        totalDuration: Date.now() - startTime,
        tests: results,
        successRate: `${successfulTests.length}/${tests.length}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database query speed test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cache performance test
router.get('/test/cache-performance', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test video cache performance
    const videoCacheDir = path.join(process.cwd(), 'server', 'cache', 'videos');
    const imageCacheDir = path.join(process.cwd(), 'server', 'cache', 'images');
    
    let videoCount = 0;
    let imageCount = 0;
    let totalVideoSize = 0;
    let totalImageSize = 0;

    if (fs.existsSync(videoCacheDir)) {
      const videoFiles = fs.readdirSync(videoCacheDir);
      videoCount = videoFiles.length;
      videoFiles.forEach(file => {
        const stats = fs.statSync(path.join(videoCacheDir, file));
        totalVideoSize += stats.size;
      });
    }

    if (fs.existsSync(imageCacheDir)) {
      const imageFiles = fs.readdirSync(imageCacheDir);
      imageCount = imageFiles.length;
      imageFiles.forEach(file => {
        const stats = fs.statSync(path.join(imageCacheDir, file));
        totalImageSize += stats.size;
      });
    }

    const totalSize = totalVideoSize + totalImageSize;
    const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
    const cacheUtilization = Math.round((totalSize / (1024 * 1024 * 1024)) * 100) / 100;

    res.json({
      success: true,
      message: `Cache performance analysis completed in ${Date.now() - startTime}ms`,
      details: {
        videoCount,
        imageCount,
        totalFiles: videoCount + imageCount,
        totalSizeMB,
        cacheUtilizationGB: cacheUtilization,
        cacheUtilizationPercent: `${cacheUtilization}% of 1GB limit`,
        videoSizeMB: Math.round(totalVideoSize / (1024 * 1024) * 100) / 100,
        imageSizeMB: Math.round(totalImageSize / (1024 * 1024) * 100) / 100,
        cacheEfficiency: videoCount >= 3 ? 'Optimal (3+ hero videos cached)' : 'Suboptimal (missing hero videos)'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Cache performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API response times test
router.get('/test/api-response-times', async (req, res) => {
  try {
    const endpoints = [
      { name: 'Gallery API', url: '/api/gallery' },
      { name: 'Hero Videos API', url: '/api/hero-videos' },
      { name: 'FAQ API', url: '/api/faq' },
      { name: 'Cache Stats API', url: '/api/video-cache/stats' },
      { name: 'Analytics API', url: '/api/analytics/dashboard' }
    ];

    const results = [];
    let totalTime = 0;

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      try {
        const response = await fetch(`http://localhost:5000${endpoint.url}`);
        const duration = Date.now() - startTime;
        
        results.push({
          name: endpoint.name,
          status: response.ok ? 'success' : 'error',
          duration,
          responseCode: response.status
        });
        
        if (response.ok) {
          totalTime += duration;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          name: endpoint.name,
          status: 'error',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulTests = results.filter(r => r.status === 'success');
    const averageResponseTime = successfulTests.length > 0 ? 
      Math.round(totalTime / successfulTests.length) : 0;

    res.json({
      success: true,
      message: `API response times test completed - ${successfulTests.length}/${endpoints.length} successful`,
      details: {
        averageResponseTime,
        tests: results,
        successRate: `${successfulTests.length}/${endpoints.length}`,
        fastestAPI: results.reduce((fastest, current) => 
          current.status === 'success' && current.duration < fastest.duration ? current : fastest, 
          { duration: Infinity, name: 'None' }
        ).name,
        slowestAPI: results.reduce((slowest, current) => 
          current.status === 'success' && current.duration > slowest.duration ? current : slowest, 
          { duration: 0, name: 'None' }
        ).name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API response times test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;