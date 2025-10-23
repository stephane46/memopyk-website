// Quick test to verify auto-crop badge system
// This will help us understand what's happening with the badge detection

console.log('🧪 AUTO-CROP BADGE TEST');
console.log('='.repeat(50));

// Test data that simulates what should happen with auto-crop
const testItem = {
  static_image_url_en: 'https://example.com/static.jpg',
  image_url_en: 'https://example.com/original.jpg',
  cropSettings: {
    method: 'sharp-auto-thumbnail',
    cropped: true,
    type: 'automatic'
  }
};

const testFormData = {
  use_same_video: true
};

// Simulate the badge logic
console.log('📊 Test Item Data:');
console.log('  - static_image_url_en:', testItem.static_image_url_en);
console.log('  - image_url_en:', testItem.image_url_en);
console.log('  - cropSettings.method:', testItem.cropSettings.method);
console.log('  - cropSettings.cropped:', testItem.cropSettings.cropped);
console.log('  - use_same_video:', testFormData.use_same_video);

// Badge condition test
const hasStaticImage = testItem.static_image_url_en;
const imagesDifferent = testItem.static_image_url_en !== testItem.image_url_en;
const shouldShowBadge = hasStaticImage && imagesDifferent;

console.log('\n🔍 Badge Logic Test:');
console.log('  - Has static image:', !!hasStaticImage);
console.log('  - Images different:', imagesDifferent);
console.log('  - Should show badge:', shouldShowBadge);

if (shouldShowBadge) {
  const isAutoMethod = testItem.cropSettings?.method === 'sharp-auto-thumbnail';
  const isCropped = testItem.cropSettings?.cropped === true;
  const isSharedMode = testFormData.use_same_video;
  
  console.log('  - Is auto method:', isAutoMethod);
  console.log('  - Is cropped:', isCropped);
  console.log('  - Is shared mode:', isSharedMode);
  
  if (isAutoMethod && isCropped) {
    const expectedBadge = isSharedMode ? '✂️ Auto EN/FR' : '✂️ Auto EN';
    console.log('  ✅ Expected badge:', expectedBadge);
  } else {
    console.log('  ❌ Would show manual crop badge instead');
  }
} else {
  console.log('  ❌ No badge would be shown');
}

console.log('\n🎯 To test properly:');
console.log('1. Go to admin panel');
console.log('2. Create new gallery item OR select existing item');
console.log('3. Enable "Use same video/image for both languages"');
console.log('4. Upload NEW image (not 3:2 ratio - like square or portrait)');
console.log('5. Save the item');
console.log('6. Check if badge shows "✂️ Auto EN/FR"');
console.log('\nCurrent test item was manually cropped, so it shows "✂️ Recadré EN/FR"');