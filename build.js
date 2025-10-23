#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting MEMOPYK production build...');

try {
  // Step 1: Build the frontend with Vite
  console.log('📦 Building frontend with Vite (production mode)...');
  process.env.NODE_ENV = 'production';
  execSync('npx vite build --mode production', { stdio: 'inherit' });
  
  // Step 2: Move Vite build output from dist/public to dist
  console.log('📁 Moving build output to correct location...');
  if (fs.existsSync('dist/public')) {
    // Copy everything from dist/public/* to dist/
    execSync('cp -r dist/public/* dist/ 2>/dev/null || true', { stdio: 'pipe' });
    // Remove the now-empty dist/public directory
    execSync('rm -rf dist/public', { stdio: 'pipe' });
    console.log('   ✅ Vite build output moved to dist/');
  }
  
  // Step 3: Copy public assets to dist (but preserve built index.html)
  console.log('📁 Copying public assets...');
  if (fs.existsSync('public')) {
    // Backup the built index.html
    if (fs.existsSync('dist/index.html')) {
      execSync('cp dist/index.html dist/index.built.html', { stdio: 'pipe' });
    }
    execSync('cp -r public/* dist/ 2>/dev/null || true', { stdio: 'pipe' });
    // Restore the built index.html (it has correct asset references)
    if (fs.existsSync('dist/index.built.html')) {
      execSync('mv dist/index.built.html dist/index.html', { stdio: 'pipe' });
      console.log('   ✅ Built index.html preserved');
    }
  }
  
  // Step 4: Ensure cache directories exist
  console.log('📋 Setting up cache directories...');
  fs.mkdirSync('server/cache/videos', { recursive: true });
  fs.mkdirSync('server/cache/images', { recursive: true });
  
  // Copy existing cache if available
  if (fs.existsSync('server/cache/videos') && fs.readdirSync('server/cache/videos').length > 0) {
    console.log('   ✅ Video cache preserved');
  }
  if (fs.existsSync('server/cache/images') && fs.readdirSync('server/cache/images').length > 0) {
    console.log('   ✅ Image cache preserved');
  }
  
  console.log('✅ Build completed successfully!');
  console.log('📁 Production ready:');
  console.log('   - Frontend: dist/');
  console.log('   - Backend: server/index.ts');
  console.log('   - Start: npm start');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}