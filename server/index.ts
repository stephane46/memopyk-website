/**
 * MEMOPYK Server Entry Point
 *
 * Clean rebuild for Coolify deployment.
 * Version 2.0.0 - Modular architecture
 */

import "dotenv/config";
import { createServer } from "http";
import type { Request, Response } from "express";
import { app, setupErrorHandler, setupStaticServing } from "./app";
import { registerRoutes } from "./routes";
import { testDatabaseConnection } from "./config/database";

const VERSION = "2.0.0-clean-rebuild";
const PORT = parseInt(process.env.PORT || "5000", 10);

console.log(`\n=== MEMOPYK Server Starting ${VERSION} ===`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📍 Port: ${PORT}`);

// ============================================================================
// VALIDATE REQUIRED ENVIRONMENT VARIABLES
// ============================================================================
function validateEnvironment() {
  console.log("\n🔐 Environment Validation:");
  
  const required = [
    { name: "DATABASE_URL", value: process.env.DATABASE_URL },
    { name: "SUPABASE_URL", value: process.env.SUPABASE_URL },
    { name: "SUPABASE_SERVICE_KEY", value: process.env.SUPABASE_SERVICE_KEY },
    { name: "SESSION_SECRET", value: process.env.SESSION_SECRET }
  ];
  
  let hasErrors = false;
  
  for (const { name, value } of required) {
    if (value) {
      console.log(`   ✅ ${name}: Configured`);
    } else {
      console.log(`   ❌ ${name}: MISSING`);
      hasErrors = true;
    }
  }
  
  if (hasErrors && process.env.NODE_ENV === "production") {
    console.error("\n⚠️  Warning: Missing required environment variables");
    console.error("   Server will start but functionality may be limited.");
  }
  
  return !hasErrors;
}

// ============================================================================
// HEALTH CHECK ENDPOINTS (Must be first!)
// ============================================================================
function setupHealthChecks() {
  const healthResponse = {
    status: 'healthy',
    version: VERSION,
    timestamp: () => new Date().toISOString(),
    uptime: () => process.uptime()
  };
  
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      ...healthResponse,
      timestamp: healthResponse.timestamp(),
      uptime: healthResponse.uptime()
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      ...healthResponse,
      timestamp: healthResponse.timestamp(),
      uptime: healthResponse.uptime()
    });
  });
  
  console.log("✅ Health check endpoints registered");
}

// ============================================================================
// BACKGROUND SERVICES (Non-blocking initialization)
// ============================================================================
async function initializeBackgroundServices() {
  // Test database connection
  setImmediate(async () => {
    try {
      const success = await testDatabaseConnection();
      if (success) {
        console.log("✅ Database connection verified");
      } else {
        console.log("⚠️  Database connection test failed");
      }
    } catch (err) {
      console.error("❌ Database test error:", err);
    }
  });
  
  // GA4 Scheduler (lazy load)
  setImmediate(async () => {
    try {
      await import("./jobs/ga4-scheduler");
      console.log("✅ GA4 scheduler initialized");
    } catch (err) {
      console.log("⚠️  GA4 scheduler not available (non-critical)");
    }
  });
  
  // Universal Sync Service (lazy load)
  setImmediate(async () => {
    try {
      const { startSyncService } = await import("./jobs/sync.job");
      startSyncService();
      console.log("✅ Sync service initialized");
    } catch (err) {
      console.log("⚠️  Sync service not available (non-critical)");
    }
  });
}

// ============================================================================
// MAIN STARTUP SEQUENCE
// ============================================================================
async function main() {
  try {
    // 1. Validate environment
    validateEnvironment();
    
    // 2. Setup health checks FIRST (before routes)
    setupHealthChecks();
    
    // 3. Create HTTP server
    const server = createServer(app);
    server.timeout = 120000;
    server.headersTimeout = 121000;
    server.keepAliveTimeout = 5000;
    
    // 4. Start listening IMMEDIATELY (for health checks)
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n✅ ========================================`);
      console.log(`✅ MEMOPYK Server Started Successfully!`);
      console.log(`✅ ========================================`);
      console.log(`📡 Version: ${VERSION}`);
      console.log(`🌍 Listening on: http://0.0.0.0:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`✅ ========================================\n`);
      
      // Signal ready to process manager
      if (process.send) {
        process.send('ready');
      }
    });
    
    // 5. Register API routes (after server starts)
    await registerRoutes(app);
    console.log("✅ API routes registered");
    
    // 6. Setup static file serving (production only)
    if (process.env.NODE_ENV === "production") {
      setupStaticServing();
    }
    
    // 7. Setup error handler (must be last)
    setupErrorHandler();
    
    // 8. Initialize background services (non-blocking)
    await initializeBackgroundServices();
    
    // 9. Handle server errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      console.error('\n❌ Server Error:', err.message);
      
      if (err.code === 'EADDRINUSE') {
        console.error(`   Port ${PORT} is already in use`);
      } else if (err.code === 'EACCES') {
        console.error(`   Permission denied for port ${PORT}`);
      }
      
      process.exit(1);
    });
    
  } catch (error) {
    console.error('\n❌ Fatal startup error:', error);
    process.exit(1);
  }
}

// ============================================================================
// PROCESS ERROR HANDLING
// ============================================================================
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('\n⚠️  Unhandled Promise Rejection:', reason?.message || reason);
});

// ============================================================================
// START SERVER
// ============================================================================
main();
