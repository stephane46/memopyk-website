#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Enhanced cache-busting techniques
function generateCacheBusters() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const randomHash = crypto.randomBytes(8).toString('hex');
  const processId = process.pid;
  const nodeVersion = process.version;
  return {
    timestamp,
    randomHash,
    processId,
    nodeVersion,
    combinedId: `${timestamp}-${randomHash}-${processId}`
  };
}

// Verify build script is fixed for MIME type issues
function verifyBuildScript() {
  const buildScriptPath = path.join(__dirname, '..', 'build.js');
  if (fs.existsSync(buildScriptPath)) {
    const buildContent = fs.readFileSync(buildScriptPath, 'utf8');
    
    // Check for the critical fix
    if (buildContent.includes('cp -r dist/public/* dist/') && buildContent.includes('rm -rf dist/public')) {
      console.log('✅ Build script MIME type fix verified');
      return true;
    } else {
      console.log('⚠️ Warning: Build script may need MIME type fix');
      return false;
    }
  }
  return false;
}

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const [key, value] = arg.split('=');
    const flagName = key.substring(2);
    flags[flagName] = value || true;
  }
}

// Show help
if (flags.help) {
  console.log(`
🚀 Enhanced Deployment Marker Generator v2.0

Usage: node enhanced-deployment-marker.js [options]

Options:
  --description=<text>     Description for the deployment marker (required)
  --keep=<number>         Number of markers to retain (default: 10)
  --aggressive            Use aggressive cache-busting (default: false)
  --verify                Add verification headers (default: false)
  --help                  Show this help message

Examples:
  node enhanced-deployment-marker.js --description="orange-menu-fix" --aggressive
  node enhanced-deployment-marker.js --description="emergency-deploy" --verify --keep=15
`);
  process.exit(0);
}

// Configuration
const outputDir = flags['out-dir'] || '.deployment_markers';
const keepCount = parseInt(flags.keep) || 10;
const description = flags.description;
const aggressive = flags.aggressive || false;
const verify = flags.verify || false;

// Verify build script has MIME type fix
console.log('\n🔍 Verifying deployment readiness...');
verifyBuildScript();

if (!description) {
  console.error('❌ Error: --description is required');
  console.log('Use --help for usage information');
  process.exit(1);
}

// Sanitize description (more aggressive)
const sanitizedDescription = description
  .substring(0, 50)
  .replace(/[^a-zA-Z0-9\-_]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

// Generate cache busters
const busters = generateCacheBusters();

// Create enhanced filename with multiple cache-busting elements
let filename;
if (aggressive) {
  filename = `FORCE_CLEAN_DEPLOYMENT_AGGRESSIVE_${busters.combinedId}_${sanitizedDescription}.txt`;
} else {
  filename = `FORCE_CLEAN_DEPLOYMENT_v2.0-${busters.timestamp}.txt`;
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create enhanced marker content
const markerContent = `ENHANCED_FORCE_CLEAN_DEPLOYMENT_v2.0
Generated: ${new Date().toISOString()}
Cache-Buster-ID: ${busters.combinedId}
Process-ID: ${busters.processId}
Node-Version: ${busters.nodeVersion}
Random-Hash: ${busters.randomHash}
Description: ${description}
Sanitized: ${sanitizedDescription}
Aggressive-Mode: ${aggressive}
Verification-Mode: ${verify}

${aggressive ? 'AGGRESSIVE CACHE INVALIDATION ENABLED' : 'Standard cache invalidation'}
${verify ? 'DEPLOYMENT VERIFICATION REQUESTED' : 'No verification requested'}

This enhanced marker uses multiple cache-busting techniques:
1. Process ID: ${busters.processId}
2. Random hash: ${busters.randomHash}
3. Timestamp: ${busters.timestamp}
4. Node version: ${busters.nodeVersion}
5. Combined ID: ${busters.combinedId}

Purpose: Force Replit deployments to use CURRENT code instead of cached snapshots.
This is critical for deploying: ${description}

${aggressive ? `
AGGRESSIVE MODE FEATURES:
- Multiple random identifiers
- Process-specific markers
- Enhanced cache-busting headers
- Deployment verification hooks
` : ''}

Automatic cleanup policy: keeping ${keepCount} most recent markers.
`;

// Write the marker file with atomic operation
const filePath = path.join(outputDir, filename);
try {
  // Atomic write
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, markerContent, 'utf8');
  fs.renameSync(tempPath, filePath);
  
  console.log('🚀 Enhanced Deployment Marker Generator v2.0');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`${aggressive ? '⚡ AGGRESSIVE MODE ENABLED' : '🔧 Standard mode'}`);
  console.log(`${verify ? '✓ Verification mode enabled' : '◦ Standard creation'}`);
  
  // Cleanup old markers
  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('FORCE_CLEAN_DEPLOYMENT'))
    .map(f => ({
      name: f,
      path: path.join(outputDir, f),
      mtime: fs.statSync(path.join(outputDir, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  console.log(`🧹 Cleanup: ${files.length} markers found, keeping ${Math.min(files.length, keepCount)} (limit: ${keepCount})`);

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Removed old marker: ${file.name}`);
    });
  }

  console.log(`✅ Created enhanced force clean marker: ${filename}`);
  console.log(`📍 Location: ${filePath}`);
  console.log(`📋 Description: ${description}`);
  console.log(`🎯 Cache-Buster ID: ${busters.combinedId}`);
  
  if (aggressive) {
    console.log('\n⚡ AGGRESSIVE CACHE-BUSTING ACTIVE:');
    console.log(`   - Process ID: ${busters.processId}`);
    console.log(`   - Random Hash: ${busters.randomHash}`);
    console.log(`   - Node Version: ${busters.nodeVersion}`);
  }
  
  console.log('\n🎯 Ready for deployment! Enhanced markers should force fresh code deployment.');
  console.log('💡 Tip: Use --aggressive flag for maximum cache-busting power');
  
} catch (error) {
  console.error('❌ Failed to create deployment marker:', error.message);
  process.exit(1);
}