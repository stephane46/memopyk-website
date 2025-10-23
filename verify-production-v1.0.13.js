#!/usr/bin/env node
/**
 * MEMOPYK Production Verification Script v1.0.13
 * Tests whether production deployment is running the correct code version
 */

console.log("🔍 MEMOPYK Production Verification v1.0.13");
console.log("=".repeat(50));

// Get the base URL from command line argument or default to production
const baseUrl = process.argv[2] || 'https://your-production-url.replit.app';

console.log(`🌐 Testing production URL: ${baseUrl}`);
console.log("");

// Test 1: Emergency debug route (should return v1.0.13)
console.log("TEST 1: Emergency Debug Route");
console.log(`GET ${baseUrl}/api/debug-gallery-video`);

// Test 2: Gallery video proxy (the failing route)
console.log("\nTEST 2: Gallery Video Proxy");
console.log(`GET ${baseUrl}/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4`);

// Test 3: Hero video proxy (working route for comparison)
console.log("\nTEST 3: Hero Video Proxy (Working)");
console.log(`GET ${baseUrl}/api/video-proxy?filename=VideoHero1.mp4`);

console.log("\n" + "=".repeat(50));
console.log("MANUAL TESTING INSTRUCTIONS:");
console.log("1. Deploy this code to production");
console.log("2. Open browser to your production URL");
console.log("3. Test each URL above in browser dev tools:");
console.log("");
console.log("   Expected Results:");
console.log("   ✅ Debug route: JSON response with version v1.0.13");
console.log("   ✅ Gallery video: 206 response or proper video data");
console.log("   ✅ Hero video: 206 response (comparison test)");
console.log("");
console.log("   If debug route fails: Production not running v1.0.13");
console.log("   If debug works but gallery fails: Route-specific issue");
console.log("   If all fail: Server not responding");

// Instructions for browser testing
console.log("\n📋 BROWSER CONSOLE TEST CODE:");
console.log('```javascript');
console.log('// Copy and paste this into browser console on production site:');
console.log('');
console.log('// Test 1: Debug route');
console.log('fetch("/api/debug-gallery-video").then(r => r.json()).then(console.log);');
console.log('');
console.log('// Test 2: Gallery video (should NOT return 500)');
console.log('fetch("/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4", {');
console.log('  headers: { "Range": "bytes=0-1023" }');
console.log('}).then(r => console.log(`Status: ${r.status}, Size: ${r.headers.get("content-length")}b`));');
console.log('```');