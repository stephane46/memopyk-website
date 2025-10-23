#!/usr/bin/env node

console.log("🧪 PRODUCTION vs DEVELOPMENT GALLERY VIDEO TEST");
console.log("================================================");

const testUrls = [
  {
    name: "🔴 PROD VideoHero1.mp4 (Browser reports working)",
    url: "https://memopyk.replit.app/api/video-proxy?filename=VideoHero1.mp4"
  },
  {
    name: "🔴 PROD VideoHero2.mp4 (Browser reports working)",
    url: "https://memopyk.replit.app/api/video-proxy?filename=VideoHero2.mp4"
  },
  {
    name: "🔴 PROD VideoHero3.mp4 (Browser reports working)", 
    url: "https://memopyk.replit.app/api/video-proxy?filename=VideoHero3.mp4"
  },
  {
    name: "🔴 PROD Gallery Video 1 (User reports 500)",
    url: "https://memopyk.replit.app/api/video-proxy?filename=1753736019450-VitaminSeaC.mp4"
  },
  {
    name: "🔴 PROD Gallery Video 2 (User reports 500)",
    url: "https://memopyk.replit.app/api/video-proxy?filename=1753736667497-PomGalleryC.mp4"
  }
];

async function testVideo(name, url) {
  try {
    console.log(`\n🎬 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-1023',
        'User-Agent': 'Mozilla/5.0 (Test)'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    console.log(`   Content-Range: ${response.headers.get('content-range')}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200 || response.status === 206) {
      console.log(`   ✅ SUCCESS`);
    } else {
      console.log(`   ❌ FAILED`);
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
  }
}

async function runTests() {
  for (const test of testUrls) {
    await testVideo(test.name, test.url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log("\n📊 CONCLUSION:");
  console.log("If production gallery videos return 500 but hero videos return 206,");
  console.log("then the cache is missing for gallery videos in production.");
  console.log("Solution: Use 'Force Cache Gallery Videos' button in admin panel.");
}

runTests();