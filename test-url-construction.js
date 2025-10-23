#!/usr/bin/env node

// Test the exact URL construction logic used in both places

const problemFilename = '1753390495474-Pom Gallery (RAV AAA_001) compressed.mp4';

console.log('🧪 Testing URL construction for problematic filename...\n');

// Method 1: video-cache.ts downloadAndCacheVideo (line 655-656)
const encodedFilename1 = encodeURIComponent(problemFilename);
const fullVideoUrl1 = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodedFilename1}`;

console.log('Method 1 - video-cache.ts downloadAndCacheVideo:');
console.log(`  Original: ${problemFilename}`);
console.log(`  Encoded: ${encodedFilename1}`);
console.log(`  URL: ${fullVideoUrl1}`);
console.log();

// Method 2: routes.ts video proxy fallback (line 1295-1296)
const decodedFilename = problemFilename;
const encodedForDownload = encodeURIComponent(decodedFilename);
const supabaseUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/${encodedForDownload}`;

console.log('Method 2 - routes.ts video proxy fallback:');
console.log(`  Decoded: ${decodedFilename}`);
console.log(`  Encoded: ${encodedForDownload}`);
console.log(`  URL: ${supabaseUrl}`);
console.log();

console.log('✅ Both methods produce identical URLs:', fullVideoUrl1 === supabaseUrl);
console.log();

// Test the curl command equivalents
console.log('Test commands:');
console.log('Working (200):', `curl -I "${fullVideoUrl1}"`);
console.log('Broken (400): ', `curl -I "https://supabase.memopyk.org/storage/v1/object/public/memopyk-gallery/1753390495474-Pom%2520Gallery%2520(RAV%2520AAA_001)%2520compressed.mp4"`);