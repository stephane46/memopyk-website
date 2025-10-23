#!/usr/bin/env node

/**
 * Production Build Verification Script v1.0.17
 * Verifies enhanced stream error detection deployment readiness
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 PRODUCTION BUILD VERIFICATION v1.0.17 - STREAM DEBUG DEPLOYMENT');
console.log('=' .repeat(80));

// Check version consistency
try {
  const version = fs.readFileSync('VERSION', 'utf8').trim();
  console.log(`✅ Version file: ${version}`);
  
  if (version !== 'v1.0.17-stream-debug') {
    console.error('❌ Version mismatch - expected v1.0.17-stream-debug');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ VERSION file missing or unreadable');
  process.exit(1);
}

// Verify enhanced stream error detection in routes.ts
try {
  const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
  
  const checks = [
    { pattern: /PRODUCTION BULLETPROOF v1\.0\.17 - ENHANCED STREAM ERROR DETECTION/, name: 'Version header updated' },
    { pattern: /❌ PRODUCTION RANGE STREAM ERROR/, name: 'Range stream error detection' },
    { pattern: /❌ PRODUCTION FULL STREAM ERROR/, name: 'Full stream error detection' },
    { pattern: /Error type: \$\{error\.constructor\.name\}/, name: 'Error type classification' },
    { pattern: /Error code: \$\{error\.code\}/, name: 'Error code logging' },
    { pattern: /Accept header: \$\{req\.headers\.accept\}/, name: 'Accept header logging' },
    { pattern: /Connection header: \$\{req\.headers\.connection\}/, name: 'Connection header logging' }
  ];
  
  let passed = 0;
  checks.forEach(check => {
    if (check.pattern.test(routesContent)) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
    }
  });
  
  console.log(`\n📊 Enhanced debugging checks: ${passed}/${checks.length} passed`);
  
  if (passed < checks.length) {
    console.error('❌ Not all enhanced debugging features are present');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Cannot verify routes.ts enhanced debugging:', error.message);
  process.exit(1);
}

// Check critical file existence
const criticalFiles = [
  'server/routes.ts',
  'server/video-cache.ts', 
  'client/src/components/gallery/VideoOverlay.tsx',
  'client/src/components/sections/HeroVideoSection.tsx',
  'server/hybrid-storage.ts',
  'package.json'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Critical file: ${file}`);
  } else {
    console.error(`❌ Missing critical file: ${file}`);
    process.exit(1);
  }
});

// Verify TypeScript compilation
try {
  console.log('\n🔨 TypeScript compilation check...');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Production build test
try {
  console.log('\n🏗️ Production build test...');
  const buildOutput = execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Production build successful');
  
  // Check dist directory
  if (fs.existsSync('dist')) {
    const distFiles = fs.readdirSync('dist');
    console.log(`✅ Build output: ${distFiles.length} files in dist/`);
  } else {
    console.error('❌ No dist/ directory created');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Production build failed');
  console.error(error.stdout?.toString() || error.message);
  process.exit(1);
}

console.log('\n🚀 DEPLOYMENT VERIFICATION COMPLETE v1.0.17');
console.log('=' .repeat(80));
console.log('✅ Enhanced stream error detection ready for virgin server deployment');
console.log('✅ All critical files present and compilation successful');
console.log('✅ Production build generates clean dist/ output');
console.log('\n📋 DEPLOYMENT FOCUS:');
console.log('   - Enhanced logging will capture exact gallery video failure reasons');
console.log('   - Stream error classification (error.constructor.name, error.code)');
console.log('   - Comprehensive debugging for Range vs Full file serving');
console.log('   - Ready to identify why hero videos work but gallery videos fail');
console.log('\n🎯 Deploy with: npm run build → Deploy to virgin server → Monitor logs');