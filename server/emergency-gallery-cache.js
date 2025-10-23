// EMERGENCY GALLERY VIDEO CACHE FIX v1.0.40
// Force cache the specific gallery videos that are failing in production

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const videoCacheDir = path.join(__dirname, 'cache/videos');

// Ensure cache directory exists
if (!fs.existsSync(videoCacheDir)) {
  fs.mkdirSync(videoCacheDir, { recursive: true });
  console.log(`📁 Created video cache directory: ${videoCacheDir}`);
}

// Gallery videos that need to be cached
const galleryVideos = [
  'VitaminSeaC.mp4',
  'PomGalleryC.mp4', 
  'safari-1.mp4'
];

// Create cache file path for filename (matches VideoCache logic)
function getVideoCacheFilePath(filename) {
  const hash = crypto.createHash('md5').update(filename.trim()).digest('hex');
  const extension = filename.split('.').pop() || 'mp4';
  return path.join(videoCacheDir, `${hash}.${extension}`);
}

// Download and cache a video
async function cacheVideo(filename) {
  try {
    console.log(`🔄 EMERGENCY CACHE: Starting ${filename}...`);
    
    const cacheFile = getVideoCacheFilePath(filename);
    
    // Check if already cached
    if (fs.existsSync(cacheFile)) {
      console.log(`✅ Already cached: ${filename}`);
      return;
    }
    
    // Download from Supabase
    const { data, error } = await supabase.storage
      .from('memopyk-videos')
      .download(filename);
      
    if (error) {
      console.error(`❌ Failed to download ${filename}:`, error);
      return;
    }
    
    // Write to cache
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(cacheFile, buffer);
    
    console.log(`✅ EMERGENCY CACHE SUCCESS: ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    
  } catch (error) {
    console.error(`❌ EMERGENCY CACHE FAILED: ${filename}:`, error);
  }
}

// Cache all gallery videos
async function emergencyCacheAll() {
  console.log(`🚨 EMERGENCY GALLERY VIDEO CACHE v1.0.40 - Starting...`);
  console.log(`📊 Videos to cache: ${galleryVideos.length}`);
  
  for (const filename of galleryVideos) {
    await cacheVideo(filename);
  }
  
  console.log(`🎯 EMERGENCY CACHE COMPLETE! Gallery videos should now work in production.`);
}

// Run if called directly
if (require.main === module) {
  emergencyCacheAll().catch(console.error);
}

module.exports = { emergencyCacheAll };