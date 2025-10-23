// Direct test of gallery video that should be cached
// Filename: gallery_Our_vitamin_sea_rework_2_compressed.mp4
// Expected cache file: 3e7492d4b8856615fee4558d24278c8a.mp4 (78MB)

console.log("🎬 Testing gallery video that should be cached...");
console.log("Expected filename: gallery_Our_vitamin_sea_rework_2_compressed.mp4");
console.log("Expected cache hash: 3e7492d4b8856615fee4558d24278c8a");

fetch("/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4", {
  method: 'GET',
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': 'video/mp4',
    'User-Agent': 'DirectTest/1.0'
  }
})
.then(response => {
  console.log("✅ Response status:", response.status);
  console.log("✅ Response headers:", [...response.headers.entries()]);
  
  if (response.status === 206) {
    console.log("🎉 SUCCESS: Gallery video working!");
    return response.arrayBuffer();
  } else if (response.status === 500) {
    console.log("❌ 500 ERROR: Server error");
    return response.text();
  } else {
    console.log("❌ UNEXPECTED STATUS:", response.status);
    return response.text();
  }
})
.then(data => {
  if (data instanceof ArrayBuffer) {
    console.log("📦 Received video data:", data.byteLength, "bytes");
    console.log("🎯 Should see server logs with 'EMERGENCY REQUEST LOG' for gallery video");
  } else {
    console.log("📄 Error response:", data);
  }
})
.catch(error => {
  console.error("🚨 Request failed:", error.message);
});