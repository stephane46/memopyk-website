// Test short URL alias system - run in browser console
console.log("🧪 SHORT URL ALIAS TEST");

const shortUrl = "/api/v/g1";
console.log("Testing short URL:", shortUrl);

// Test 1: Fetch request
fetch(shortUrl, {
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': '*/*'
  }
})
.then(response => {
  console.log("✅ Short URL fetch:", response.status);
  if (response.ok) {
    console.log("🎉 SUCCESS: Short URL works with fetch!");
  }
})
.catch(err => console.error("❌ Short URL fetch error:", err));

// Test 2: Video element (the critical test)
console.log("🧪 Testing short URL with video element...");
const video = document.createElement('video');
video.onloadstart = () => console.log("🎉 SUCCESS: Short URL works with video element!");
video.onerror = (e) => console.error("❌ Short URL video element error:", e);
video.src = shortUrl;
document.body.appendChild(video);

setTimeout(() => {
  console.log("🧹 Cleaning up test video");
  document.body.removeChild(video);
}, 5000);