// Test the exact gallery video request that's failing in production
console.log("🎬 Testing gallery video that fails in production...");

const testUrl = "/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4";

fetch(testUrl, {
  method: 'GET',
  headers: {
    'Range': 'bytes=0-1023',
    'Accept': '*/*',
    'User-Agent': 'ProductionTest/1.0'
  }
})
.then(response => {
  console.log("✅ Response status:", response.status);
  console.log("✅ Response headers:", [...response.headers.entries()]);
  if (response.status === 206) {
    console.log("🎉 SUCCESS: Gallery video working!");
    return response.arrayBuffer();
  } else {
    console.log("❌ FAILED: Gallery video returned", response.status);
    return response.text();
  }
})
.then(data => {
  if (data instanceof ArrayBuffer) {
    console.log("📦 Received video data:", data.byteLength, "bytes");
  } else {
    console.log("📄 Error response:", data);
  }
})
.catch(error => {
  console.error("🚨 Request failed:", error.message);
});