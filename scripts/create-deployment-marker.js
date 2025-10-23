#!/usr/bin/env node

/**
 * Enhanced Force Clean Deployment Marker Generator
 * 
 * Creates deployment markers to prevent Replit cache/snapshot inconsistencies
 * with robust file management, cleanup policies, and human-readable naming.
 * 
 * Usage Examples:
 *   node scripts/create-deployment-marker.js --description="gallery-sync-fix"
 *   node scripts/create-deployment-marker.js --cleanup
 *   node scripts/create-deployment-marker.js --description="admin-menu-update" --keep=5
 */

const fs = require('fs');
const path = require('path');

// Configuration defaults
const DEFAULT_CONFIG = {
  outDir: '.deployment_markers',
  keep: 10,
  description: 'force-clean-deployment',
  cleanup: false
};

/**
 * Parse command line arguments into configuration object
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--description=')) {
      config.description = arg.split('=')[1];
    } else if (arg.startsWith('--out-dir=')) {
      config.outDir = arg.split('=')[1];
    } else if (arg.startsWith('--keep=')) {
      config.keep = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--cleanup') {
      config.cleanup = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`❌ Unknown argument: ${arg}`);
      console.error('Use --help for usage information');
      process.exit(1);
    }
  }
  
  return config;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Enhanced Force Clean Deployment Marker Generator

USAGE:
  node scripts/create-deployment-marker.js [OPTIONS]

OPTIONS:
  --description=TEXT    Description for the deployment marker (default: "force-clean-deployment")
  --out-dir=PATH       Directory to store markers (default: ".deployment_markers")
  --keep=N             Number of old markers to keep (default: 10)
  --cleanup            Only perform cleanup, don't create new marker
  --help, -h           Show this help message

EXAMPLES:
  # Create marker with custom description
  node scripts/create-deployment-marker.js --description="gallery-sync-fix"
  
  # Create marker in custom directory, keep only 5 old ones
  node scripts/create-deployment-marker.js --description="admin-update" --out-dir="deploy" --keep=5
  
  # Only cleanup old markers
  node scripts/create-deployment-marker.js --cleanup

PURPOSE:
  This script creates marker files that force Replit deployments to use fresh code
  instead of potentially stale cached snapshots, preventing deployment regressions.
`);
}

/**
 * Sanitize user input for safe filename usage
 */
function sanitizeDescription(description) {
  if (!description || typeof description !== 'string') {
    return 'force-clean-deployment';
  }
  
  // Limit length and sanitize characters
  return description
    .slice(0, 50) // Max 50 characters
    .replace(/[^a-zA-Z0-9\-_]/g, '-') // Replace unsafe chars with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate ISO timestamp for human-readable filenames
 */
function generateTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '').replace('T', 'T').slice(0, -4) + 'Z';
}

/**
 * Ensure output directory exists
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Atomic file write using temporary file and rename
 */
function writeFileAtomic(filePath, content) {
  const tempPath = `${filePath}.tmp`;
  
  try {
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (error) {
    // Cleanup temp file if it exists
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

/**
 * Get list of existing marker files with timestamps
 */
function getExistingMarkers(outDir) {
  if (!fs.existsSync(outDir)) {
    return [];
  }
  
  const files = fs.readdirSync(outDir);
  const markers = files
    .filter(file => file.startsWith('FORCE_CLEAN_DEPLOYMENT_') && file.endsWith('.txt'))
    .map(file => {
      const stat = fs.statSync(path.join(outDir, file));
      return {
        filename: file,
        path: path.join(outDir, file),
        mtime: stat.mtime
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // Newest first
  
  return markers;
}

/**
 * Cleanup old marker files based on retention policy
 */
function cleanupOldMarkers(outDir, keepCount) {
  const markers = getExistingMarkers(outDir);
  
  if (markers.length <= keepCount) {
    console.log(`🧹 Cleanup: ${markers.length} markers found, keeping all (limit: ${keepCount})`);
    return;
  }
  
  const toDelete = markers.slice(keepCount);
  let deletedCount = 0;
  
  for (const marker of toDelete) {
    try {
      fs.unlinkSync(marker.path);
      deletedCount++;
      console.log(`🗑️  Deleted old marker: ${marker.filename}`);
    } catch (error) {
      console.warn(`⚠️  Failed to delete ${marker.filename}: ${error.message}`);
    }
  }
  
  console.log(`🧹 Cleanup complete: deleted ${deletedCount}/${toDelete.length} old markers`);
}

/**
 * Create deployment marker file
 */
function createMarker(config) {
  const timestamp = generateTimestamp();
  const sanitizedDescription = sanitizeDescription(config.description);
  const version = `v1.0-${timestamp}`;
  const filename = `FORCE_CLEAN_DEPLOYMENT_${version}.txt`;
  const filePath = path.join(config.outDir, filename);
  
  const markerContent = `FORCE_CLEAN_DEPLOYMENT_${timestamp}
Generated: ${new Date().toISOString()}
Description: ${config.description}
Sanitized: ${sanitizedDescription}
Purpose: Prevent Replit from packaging cached/inconsistent code snapshots
Version: ${version}

This marker file forces Replit deployments to use fresh code instead of
potentially stale cached snapshots, preventing deployment regressions where
production deploys older code than what's currently in development.

Automatic cleanup policy: keeping ${config.keep} most recent markers.
`;

  try {
    writeFileAtomic(filePath, markerContent);
    console.log(`✅ Created force clean marker: ${filename}`);
    console.log(`📍 Location: ${filePath}`);
    console.log(`📋 Description: ${config.description}`);
    return filePath;
  } catch (error) {
    console.error(`❌ Failed to create marker: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution function
 */
function main() {
  try {
    const config = parseArgs();
    
    console.log(`🚀 Enhanced Deployment Marker Generator`);
    console.log(`📁 Output directory: ${config.outDir}`);
    
    // Ensure output directory exists
    ensureDirectory(config.outDir);
    
    // Perform cleanup first
    if (config.keep > 0) {
      cleanupOldMarkers(config.outDir, config.keep);
    }
    
    // Create new marker unless this is cleanup-only mode
    if (!config.cleanup) {
      const markerPath = createMarker(config);
      console.log(`\n🎯 Ready for deployment! The marker file will ensure fresh code is deployed.`);
      console.log(`💡 Tip: Use 'git add ${config.outDir}' to include markers in version control`);
    } else {
      console.log(`\n🧹 Cleanup complete!`);
    }
    
  } catch (error) {
    console.error(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  sanitizeDescription,
  generateTimestamp,
  createMarker,
  cleanupOldMarkers,
  getExistingMarkers
};