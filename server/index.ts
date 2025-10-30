import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import cookieParser from "cookie-parser";

import { registerRoutes } from "./routes";
import { log } from "./vite";           
import { testDatabaseConnection } from "./database";
import { VideoCache } from "./video-cache";
import { processSeoForDev, isHtmlResponse, shouldProcessSeoUrl, prodSeoMiddleware } from "./seo-middleware";

const VERSION = "1.0.53-deploy-fix";
console.log(`=== MEMOPYK Server Starting ${VERSION} ===`);
console.log("🚀 Deployment Environment Detection:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("   REPLIT_DEPLOYMENT:", process.env.REPLIT_DEPLOYMENT || "undefined");
console.log("   Is Production:", process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1");
console.log("   PORT:", process.env.PORT || 5000);

// Validate required production secrets
console.log("\n🔐 Production Secrets Validation:");
const requiredSecrets = [
  { name: "SUPABASE_URL", value: process.env.SUPABASE_URL },
  { name: "SUPABASE_SERVICE_KEY", value: process.env.SUPABASE_SERVICE_KEY },
  { name: "SESSION_SECRET", value: process.env.SESSION_SECRET }
];

let missingSecrets = false;
for (const secret of requiredSecrets) {
  if (secret.value) {
    console.log(`   ✅ ${secret.name}: Available`);
  } else {
    console.error(`   ❌ ${secret.name}: MISSING!`);
    missingSecrets = true;
  }
}

if (missingSecrets && (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1")) {
  console.error("\n❌ CRITICAL: Missing required production secrets!");
  console.error("   Please configure secrets in the Replit Deployment settings.");
  console.error("   Server will continue but functionality may be limited.");
}

console.log("\n📊 Database Configuration:");
console.log("   DATABASE_URL (Neon): DISABLED - Using Supabase VPS only");
console.log("   SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ Configured" : "❌ Missing");

// Import GA4 scheduler after server startup to avoid blocking deployment
setImmediate(() => {
  // @ts-ignore - ga4-scheduler.js is a plain JS file without types
  import("./ga4-scheduler").catch(err => {
    console.error("❌ GA4 scheduler import error (non-critical):", err.message);
  });
});

// Initialize video cache system for production gallery video support (non-blocking)
console.log("🎬 Initializing video cache system...");
const videoCache = new VideoCache();
console.log("✅ Video cache system initialized");

// Start video preloading after server startup (non-blocking)
setImmediate(() => {
  if (process.env.NODE_ENV === "production") {
    console.log("🚀 Starting hero video preloading for production...");
    videoCache.preloadHeroVideos().catch(err => {
      console.error("❌ Hero video preload error:", err);
    });
  }
});

// Test database connection (non-blocking, don't await during startup)
setImmediate(() => {
  testDatabaseConnection()
    .then((success) => {
      if (success) {
        console.log("✅ Database connectivity confirmed");
      } else {
        console.log("❌ Database connection test failed");
      }
    })
    .catch((err) => {
      console.error("❌ Database test error:", err);
    });
});

const app = express();
const server = createServer(app);

// Add multiple health check endpoints for deployment compatibility
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: process.uptime()
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: process.uptime()
  });
});

app.get('/api/health-check', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime: process.uptime()
  });
});

// 🔍 ABSOLUTE FIRST MIDDLEWARE: Log EVERY request that reaches Express
app.use((req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// CRITICAL: GA4 API interception MUST be first, before any other middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/ga4")) {
    console.log(`🎯 GA4 API REQUEST INTERCEPTED: ${req.method} ${req.path}`);
  }
  next();
});

// Configure Express with large body limits for file uploads
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '5000mb',
  parameterLimit: 50000
}));
app.use(cookieParser());

// Configure CSP headers to allow Google Analytics, Supabase, and Google Fonts
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://replit.com https://www.clarity.ms https://scripts.clarity.ms https://cdn.tiny.cloud; " +
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://stats.g.doubleclick.net https://cdn.jsdelivr.net https://supabase.memopyk.org wss://supabase.memopyk.org https://api.ipapi.co wss: ws:; " +
    "img-src 'self' data: blob: https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://supabase.memopyk.org http://supabase.memopyk.org:8001 https://cdn.jsdelivr.net https://flagcdn.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com; " +
    "frame-src 'self' https://www.googletagmanager.com; " +
    "media-src 'self' https://supabase.memopyk.org http://supabase.memopyk.org:8001; " +
    "frame-ancestors 'self';"
  );
  next();
});

// 🔍 DIAGNOSTIC 2: Log ALL Proxy Requests (Before Any Route Logic) 
app.use('/api/video-proxy', (req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// ULTIMATE REQUEST INTERCEPTOR: Capture ALL requests before ANY processing
app.use((req, res, next) => {
  // Debug logging disabled for production build performance
  next();
});

// EMERGENCY: Log ALL requests to diagnose production routing
app.use((req, res, next) => {
  // Emergency debug logging disabled for production build performance
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: any;

  const origJson = res.json;
  res.json = function (body, ...args) {
    capturedJsonResponse = body;
    return origJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (pathReq.startsWith("/api")) {
      let duration = Date.now() - start;
      let line = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });

  next();
});

(async () => {
  // 1) Register API routes FIRST - before any static file handling
  await registerRoutes(app);
  
  // --- BEGIN: correct content types for sitemap/robots ---
  const root = process.cwd();
  
  app.get("/sitemap.xml", (req: Request, res: Response) => {
    res.type("application/xml");
    res.sendFile(path.join(root, "public", "sitemap.xml"));
  });

  app.get("/robots.txt", (req: Request, res: Response) => {
    res.type("text/plain");
    res.sendFile(path.join(root, "public", "robots.txt"));
  });
  // --- END ---
  
  // Add health check endpoint after API routes for better organization
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.50',
      uptime: process.uptime()
    });
  });

  // 2) Frontend handling
  if (process.env.NODE_ENV !== "production") {
    // — Dev mode: spawn Vite and proxy to it
    const viteProc = spawn("npx", ["vite"], {
      stdio: "inherit",
      env: process.env,
    });

    // Wait a bit for Vite to start before setting up proxy
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Serve static files before proxy (for images and other assets)
    app.use('/images', express.static(path.join(__dirname, '../public/images')));
    app.use('/logo.svg', express.static(path.join(__dirname, '../public/logo.svg')));
    app.use('/flags', express.static(path.join(__dirname, '../public/flags')));
    
    // Serve public folder for static assets (partners.json, etc.) in dev mode
    app.use(express.static(path.resolve(process.cwd(), 'public')));
    
    // SEO middleware for development - intercepts HTML pages before proxy
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      // Only process HTML requests for specific routes that need SEO
      const isHtmlRequest = req.headers.accept?.includes('text/html');
      const needsSeo = shouldProcessSeoUrl(req.path);
      
      if (isHtmlRequest && needsSeo && !req.path.startsWith('/api')) {
        try {
          // Make internal request to Vite to get HTML
          const viteResponse = await fetch(`http://localhost:5173${req.originalUrl}`);
          
          if (viteResponse.ok && viteResponse.headers.get('content-type')?.includes('text/html')) {
            const originalHtml = await viteResponse.text();
            
            // Process HTML with SEO injection
            const modifiedHtml = await processSeoForDev(req.originalUrl, originalHtml);
            
            // Set appropriate headers
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Length', Buffer.byteLength(modifiedHtml));
            
            console.log(`✅ SEO injection completed for ${req.originalUrl}`);
            return res.send(modifiedHtml);
          }
        } catch (error) {
          console.error('❌ SEO processing error:', error);
          // Fall through to proxy on error
        }
      }
      
      next();
    });
    
    // Create proxy for Vite dev server
    const proxy = createProxyMiddleware({
      target: "http://localhost:5173",
      ws: true,
      changeOrigin: true,
      timeout: 10000,
    });


    // Proxy non-API requests to Vite dev server with error handling  
    app.use((req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/images") || req.path === "/logo.svg" || req.path.startsWith("/flags") || req.path === "/partners.json") {
        return next(); // Skip proxy for API routes and static assets
      }
      
      // Handle proxy
      try {
        return proxy(req, res, (error?: Error) => {
          if (error) {
            console.error("❌ Proxy error:", error.message);
            res.status(503).send('Vite dev server not ready. Please wait and refresh.');
          } else {
            next();
          }
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ Proxy setup error:", errorMessage);
        res.status(503).send('Proxy configuration error. Please restart the server.');
      }
    });

    console.log("🔄 Proxying frontend requests to Vite on port 5173");
  } else {
    // — Prod mode: serve static build
    const clientDist = path.resolve(process.cwd(), "dist");
    
    // CRITICAL FIX: Only serve static files for non-API routes
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Skip static serving for API routes only
      }
      express.static(clientDist, { index: false })(req, res, next);
    });
    
    // Serve flags from public directory in production
    app.use('/flags', express.static(path.resolve(process.cwd(), 'public/flags')));
    
    // Serve public folder for static assets (partners.json, etc.)
    app.use(express.static(path.resolve(process.cwd(), 'public')));
    
    // Serve index.html for all non-API routes (SPA fallback) with SEO injection
    app.get("*", async (req: Request, res: Response, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Let API routes be handled directly
      }
      
      // Use SEO middleware for production HTML serving
      await prodSeoMiddleware(req, res, () => {
        // Fallback to static file if SEO middleware doesn't handle it
        res.sendFile(path.join(clientDist, "index.html"));
      });
    });
    
    console.log("📦 Serving static files from", clientDist);
  }

  // 3) Error handler
  app.use(
    (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", message);
      res.status(status).json({ message });
    }
  );

  // 4) Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Set server timeout for production deployments
  server.timeout = 120000; // 2 minutes timeout for requests (was 30s)
  server.headersTimeout = 121000; // Slightly higher than server timeout
  server.keepAliveTimeout = 5000; // Keep alive timeout
  
  console.log(`\n🌐 Starting HTTP server on 0.0.0.0:${port}...`);
  
  server.listen(port, "0.0.0.0", () => {
    console.log(`\n✅ ========================================`);
    console.log(`✅ MEMOPYK Server Successfully Started!`);
    console.log(`✅ ========================================`);
    console.log(`📡 Version: ${VERSION}`);
    console.log(`🌍 Listening on: 0.0.0.0:${port}`);
    console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
    console.log(`🔗 API endpoints: http://0.0.0.0:${port}/api/*`);
    
    if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
      console.log(`📦 Mode: PRODUCTION`);
      console.log(`📁 Static files: dist/`);
      console.log(`🔒 SEO injection: ENABLED`);
    } else {
      console.log(`🔄 Mode: DEVELOPMENT`);
      console.log(`🔄 Frontend proxy: http://localhost:5173`);
    }
    
    console.log(`✅ Server ready to accept connections!`);
    console.log(`✅ ========================================\n`);
    
    // Signal deployment readiness immediately
    if (process.send) {
      console.log(`📤 Sending ready signal to process manager...`);
      process.send('ready');
    }
  });
  
  // Handle deployment errors gracefully
  server.on('error', (err: any) => {
    console.error('\n❌ ========================================');
    console.error('❌ SERVER STARTUP ERROR');
    console.error('❌ ========================================');
    
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      console.error(`   Another process is listening on 0.0.0.0:${port}`);
      console.error(`   Kill the other process or use a different port`);
    } else if (err.code === 'EACCES') {
      console.error(`❌ Permission denied to bind port ${port}`);
      console.error(`   Try using a port >= 1024 or run with elevated privileges`);
    } else {
      console.error('❌ Server startup error:', err.message);
      console.error('   Error code:', err.code);
      console.error('   Stack trace:', err.stack);
    }
    
    console.error('❌ ========================================\n');
    process.exit(1);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('\n❌ ========================================');
    console.error('❌ UNCAUGHT EXCEPTION');
    console.error('❌ ========================================');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('❌ ========================================\n');
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n⚠️ ========================================');
    console.error('⚠️ UNHANDLED PROMISE REJECTION');
    console.error('⚠️ ========================================');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    console.error('⚠️ ========================================\n');
  });
  
})().catch((error) => {
  console.error('\n❌ ========================================');
  console.error('❌ FATAL INITIALIZATION ERROR');
  console.error('❌ ========================================');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('❌ ========================================\n');
  console.error('\n💡 Troubleshooting:');
  console.error('   1. Check that all required secrets are configured');
  console.error('   2. Verify the build completed successfully');
  console.error('   3. Ensure dist/ folder exists with index.html');
  console.error('   4. Check server logs for detailed error messages\n');
  process.exit(1);
});