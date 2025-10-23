// Test URL length theory - run in production browser console
console.log("🧪 URL LENGTH TEST");

const shortUrl = "/api/video-proxy?filename=VideoHero1.mp4";
const longUrl = "/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4";

console.log("Short URL length:", shortUrl.length, "characters");
console.log("Long URL length:", longUrl.length, "characters");

// Test 1: Short URL with video element
console.log("🧪 Testing SHORT URL with video element...");
const videoShort = document.createElement('video');
videoShort.onloadstart = () => console.log("✅ Short URL video element - SUCCESS");
videoShort.onerror = () => console.error("❌ Short URL video element - FAILED");
videoShort.src = shortUrl;
document.body.appendChild(videoShort);

// Test 2: Long URL with video element  
console.log("🧪 Testing LONG URL with video element...");
const videoLong = document.createElement('video');
videoLong.onloadstart = () => console.log("✅ Long URL video element - SUCCESS");
videoLong.onerror = () => console.error("❌ Long URL video element - FAILED (this proves URL length issue)");
videoLong.src = longUrl;
document.body.appendChild(videoLong);

// Clean up after 5 seconds
setTimeout(() => {
  console.log("🧹 Cleaning up test video elements");
  document.body.removeChild(videoShort);
  document.body.removeChild(videoLong);
}, 5000);