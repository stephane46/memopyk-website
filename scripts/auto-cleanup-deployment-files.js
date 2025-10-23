#!/usr/bin/env node

/**
 * Automatic Deployment File Cleanup System v1.0
 * 
 * Keeps only the 10 most recent deployment-related files to prevent
 * directory clutter that causes Replit deployment hanging issues.
 * 
 * This script runs automatically when creating deployment markers
 * and can also be run manually for maintenance.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const KEEP_COUNT = 10;
const ROOT_DIR = process.cwd();

// Patterns for deployment-related files to manage
const DEPLOYMENT_PATTERNS = [
  /^DEPLOYMENT.*\.(md|txt|json)$/i,
  /^deployment.*\.(md|txt|js)$/i,
  /^PRODUCTION.*\.(md|txt|js)$/i,
  /^.*deployment.*\.(md|txt|js)$/i,
  /^.*debug.*\.(md|txt|js)$/i,
  /^.*cache.*\.(md|txt|js)$/i,
  /^.*force.*\.(md|txt|js)$/i,
  /^FORCE_CLEAN.*\.(md|txt)$/i,
  /^.*test.*production.*\.(js|md|txt)$/i,
  /^verify.*production.*\.(js|md|txt)$/i
];

/**
 * Check if a filename matches deployment patterns
 */
function isDeploymentFile(filename) {
  return DEPLOYMENT_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * Get all deployment files with their metadata
 */
function getDeploymentFiles() {
  try {
    const files = fs.readdirSync(ROOT_DIR);
    const deploymentFiles = [];

    for (const file of files) {
      if (isDeploymentFile(file)) {
        const filePath = path.join(ROOT_DIR, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          deploymentFiles.push({
            filename: file,
            path: filePath,
            mtime: stat.mtime,
            size: stat.size
          });
        }
      }
    }

    // Sort by modification time (newest first)
    return deploymentFiles.sort((a, b) => b.mtime - a.mtime);
  } catch (error) {
    console.error(`❌ Error reading deployment files: ${error.message}`);
    return [];
  }
}

/**
 * Clean up old deployment files
 */
function cleanupDeploymentFiles(dryRun = false) {
  const deploymentFiles = getDeploymentFiles();
  
  console.log(`🔍 Found ${deploymentFiles.length} deployment-related files`);
  
  if (deploymentFiles.length <= KEEP_COUNT) {
    console.log(`✅ No cleanup needed. Keeping all ${deploymentFiles.length} files (limit: ${KEEP_COUNT})`);
    return { deleted: 0, kept: deploymentFiles.length };
  }

  const filesToKeep = deploymentFiles.slice(0, KEEP_COUNT);
  const filesToDelete = deploymentFiles.slice(KEEP_COUNT);

  console.log(`📋 Keeping ${filesToKeep.length} most recent files:`);
  filesToKeep.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.filename} (${file.mtime.toISOString()})`);
  });

  console.log(`🗑️  ${dryRun ? 'Would delete' : 'Deleting'} ${filesToDelete.length} old files:`);
  
  let deletedCount = 0;
  for (const file of filesToDelete) {
    try {
      if (!dryRun) {
        fs.unlinkSync(file.path);
        deletedCount++;
      }
      console.log(`   ${dryRun ? '→' : '✓'} ${file.filename} (${file.mtime.toISOString()})`);
    } catch (error) {
      console.warn(`   ❌ Failed to delete ${file.filename}: ${error.message}`);
    }
  }

  if (!dryRun) {
    console.log(`\n🧹 Cleanup complete: deleted ${deletedCount}/${filesToDelete.length} files`);
    console.log(`📊 Directory now has ${KEEP_COUNT} deployment files (optimal for deployments)`);
  }

  return { deleted: deletedCount, kept: KEEP_COUNT };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
🧹 Automatic Deployment File Cleanup System v1.0

PURPOSE:
  Prevents Replit deployment hanging by keeping only the ${KEEP_COUNT} most recent 
  deployment files and removing old ones that clutter the directory.

USAGE:
  node scripts/auto-cleanup-deployment-files.js [options]

OPTIONS:
  --dry-run, -n    Show what would be deleted without actually deleting
  --help, -h       Show this help message

EXAMPLES:
  # Actually clean up files
  node scripts/auto-cleanup-deployment-files.js
  
  # Preview what would be cleaned up
  node scripts/auto-cleanup-deployment-files.js --dry-run

DEPLOYMENT FILE PATTERNS:
  - DEPLOYMENT*.md/txt/json
  - deployment*.md/txt/js  
  - PRODUCTION*.md/txt/js
  - *debug*.md/txt/js
  - *cache*.md/txt/js
  - *force*.md/txt/js
  - And more...
`);
    return;
  }

  console.log(`🚀 Deployment File Cleanup System v1.0`);
  console.log(`📁 Working directory: ${ROOT_DIR}`);
  console.log(`🎯 Target: Keep ${KEEP_COUNT} most recent deployment files\n`);

  if (dryRun) {
    console.log(`🔍 DRY RUN MODE - No files will be deleted\n`);
  }

  const result = cleanupDeploymentFiles(dryRun);
  
  if (!dryRun && result.deleted > 0) {
    console.log(`\n✅ Your deployment directory is now clean and ready!`);
    console.log(`💡 This prevents Replit deployment hanging issues caused by too many files.`);
  }
}

// Export for use by other scripts
module.exports = {
  cleanupDeploymentFiles,
  getDeploymentFiles,
  isDeploymentFile,
  KEEP_COUNT
};

// Run if called directly
if (require.main === module) {
  main();
}