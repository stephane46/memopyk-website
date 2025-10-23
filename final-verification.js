#!/usr/bin/env node

// Final verification - test all gallery videos
const http = require('http');

console.log('🎯 FINAL VERIFICATION - Testing all gallery videos\n');

async function getGalleryVideos() {
  return new Promise((resolve) => {
    const req = http.request('http://localhost:5000/api/gallery', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const gallery = JSON.parse(data);
          const videos = gallery
            .filter(item => item.video_url_en)
            .map(item => {
              const url = item.video_url_en;
              return url.split('/').pop();
            })
            .filter(filename => filename);
          resolve(videos);
        } catch (error) {
          console.error('Error parsing gallery:', error);
          resolve([]);
        }
      });
    });
    req.end();
  });
}

async function testVideo(filename) {
  return new Promise((resolve) => {
    const encodedFilename = encodeURIComponent(filename);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/video-proxy?filename=${encodedFilename}`,
      method: 'HEAD' // Just test headers
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode === 200 || res.statusCode === 206;
      console.log(`${success ? '✅' : '❌'} ${filename}: ${res.statusCode}`);
      resolve(success);
    });

    req.on('error', () => {
      console.log(`❌ ${filename}: ERROR`);
      resolve(false);
    });

    req.end();
  });
}

async function runFinalVerification() {
  const videos = await getGalleryVideos();
  console.log(`Found ${videos.length} gallery videos to test:\n`);
  
  let passed = 0;
  for (const video of videos) {
    const success = await testVideo(video);
    if (success) passed++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎯 FINAL RESULTS: ${passed}/${videos.length} videos working`);
  console.log(`🚀 SUCCESS RATE: ${Math.round((passed/videos.length)*100)}%`);
  
  if (passed === videos.length) {
    console.log('\n✅ ALL GALLERY VIDEOS VERIFIED - DEPLOYMENT APPROVED');
  } else {
    console.log('\n❌ Some videos failed - Review required');
  }
}

runFinalVerification();