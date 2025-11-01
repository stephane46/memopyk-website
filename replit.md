# MEMOPYK - Replit Project Documentation

## Overview
MEMOPYK is a full-stack memory film platform that transforms personal photos and videos into cinematic memory films. Its purpose is to provide a seamless and intuitive experience for creating and managing cherished video memories, targeting a niche market for personalized, high-quality video memories with significant market potential. Key capabilities include a bilingual (French/English) CMS, professional video lightbox, robust gallery management with reliable video streaming, language-specific upload functionality, advanced image reframing, and real-time preview.

## User Preferences
Preferred communication style: Simple, everyday language.
Visual consistency priority: Extremely detail-oriented about spacing and formatting consistency between admin interface and published pages.
Analytics interface: Expects all three filter buttons (7d, 30d, 90d) to be visible with proper orange highlighting for active states.
Language detection priority: Fixed primary browser language detection with console testing capability. Enhanced cross-device compatibility prevents English users overseas from seeing French content by checking ONLY the first browser language preference.
Accessibility priority: High contrast text is essential - white text on gray backgrounds is completely unreadable and must be avoided throughout admin interface.
Modal styling: Requires solid white modal backgrounds with dark overlays for proper floating appearance. Framework components like Radix UI need precise CSS targeting to avoid affecting backdrop elements.
IP Exclusion Accuracy: Excluded IP addresses (e.g., 109.17.150.48 "Capadenac home network") must be completely hidden from all analytics views including "Total Views Details" modal - no exceptions. The "🟠 IP Filtered" badge guarantees complete exclusion.

### Critical Code Investigation Protocol
**NEVER remove or modify existing code without understanding its purpose first.**

**Required Investigation Process:**
1. **Read and understand** existing code before making changes
2. **Ask the user** if unsure about code purpose or if it seems redundant
3. **Investigate git history** or documentation for context
4. **Test functionality** before and after changes
5. **Assume existing code exists for a reason** until proven otherwise

**Never assume code is:**
- Redundant without investigation
- Outdated without checking
- Unnecessary without user confirmation

**CRITICAL: Always read replit.md documentation FIRST before making any changes to understand the existing architecture and avoid breaking working systems.**

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: shadcn/ui (built on Radix UI).
- **Styling**: Tailwind CSS with CSS custom properties.
- **State Management**: TanStack Query.
- **Form Handling**: React Hook Form with Zod validation.
- **UI/UX Decisions**:
    - **Typography**: Poppins, Playfair Display.
    - **Color Scheme**: MEMOPYK brand palette (Dark Blue #2A4759, Orange #D67C4A, Navy #011526, Cream #F2EBDC, Sky Blue #89BAD9).
    - **Responsive Design**: Adaptive to all screen sizes, mobile optimizations, PWA features.
    - **Navigation**: Customer journey-focused anchor-based scrolling on homepage; logo acts as home button with language routing.
    - **Image Cropping**: Inline drag-and-reposition interface with real-time visual feedback.
    - **Video Display**: Minimal controls for gallery videos, 2/3 screen size lightbox. Hero videos use cache, gallery videos stream from CDN.
    - **Admin Interface**: Streamlined content management, professional field labeling, responsive font size, real-time preview.
    - **Silent Loading Experience**: Eliminated all loading states.
    - **Instant Thumbnail-to-Video System**: Professional YouTube/Netflix-style loading.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Database Provider**: Hybrid system with Supabase PostgreSQL (VPS) as primary and JSON fallback.
- **Session Management**: Express sessions with PostgreSQL store.

### Key Architectural Decisions
- **Hybrid Storage System**: JSON fallback for most data, complementing PostgreSQL; gallery data from Supabase VPS only.
- **Universal Video Proxy**: Manages video serving, range requests, local caching, and Supabase CDN fallback.
- **Image Proxy**: Handles image loading, resolves CORS, prioritizes static cropped images.
- **Cache Management**: Smart caching for hero videos (preload), direct CDN streaming for gallery videos. Persistent caching for GA4 endpoints with auto-cleanup and 24-hour retention.
- **Bilingual Support**: Comprehensive French/English content management for UI, data, SEO with primary-language-first detection.
- **Modular API Design**: RESTful API for content types (hero videos, gallery, FAQs, legal docs, analytics).
- **Static Image Generation**: Automated Sharp-based cropping and generation of static images for gallery thumbnails upon upload.
- **Unified Analytics Architecture**: Dual-stream system combining direct Supabase tracking with automated GA4 BigQuery sync for enriched data. Real-time dashboard loading from Supabase.
- **Google Analytics Integration**: GA4 JavaScript tracking and automated BigQuery export sync to Supabase for enriched data.
- **Bundle Optimization System**: Reduced bundle size through dependency cleanup.
- **Direct Supabase Upload System**: Facilitates large file uploads.
- **SEO Management System**: Comprehensive interface for page-level meta tags, keywords, redirects, image SEO, and global settings, integrated with hybrid storage and audit logging.
- **Deployment Optimizations**: Fast health checks, production video cache preloading, error handling, routing priorities.
- **Visitor Classification & Analytics Accuracy**: 30-second session deduplication, proper new/returning visitor classification. Video analytics track watch duration and completion, excluding admin views. All analytics (session, video, blog) exclude development/preview environments (replit.dev, localhost) to ensure only production traffic is tracked.
- **Professional Flag System**: 255-country SVG flag solution with dynamic mapping and three-tier fallback.
- **OpenReplay Integration**: Session recording and user behavior analytics.
- **Partner Intake System**: Bilingual partner directory with Zoho CRM integration (Account, Contact, Partner records). Uses OAuth refresh-token flow, rate limiting, CSRF, and reCAPTCHA stub.
- **Supabase-Native Blog System** (Migrated Oct 2025): Direct Supabase PostgreSQL integration for full blog management control
  - **Architecture**: Removed Directus CMS dependency for simpler, self-managed workflow
  - **Database Schema**: Native `blog_posts` table with HTML content model (`content_html` field)
  - **AI Blog Creator**: Generates complete HTML blog posts using AI with direct Supabase inserts
  - **WYSIWYG Editor**: Self-hosted TinyMCE for post-validation content refinement with DOMPurify sanitization
  - **Image Management System**: Complete Supabase Storage integration with authenticated API endpoints
    - **Storage**: All images in `memopyk-blog` bucket with public CDN URLs
    - **Hero Images**: BlogHeroImageUpload component for browse/upload with modal gallery interface
    - **Inline Images**: TinyMCE automatic upload on paste/insert + enhanced file picker with search, pagination (12 per page), and newest-first sorting
    - **Image Library**: Search by filename, paginated browsing for 50+ images, date-sorted (newest first)
    - **Safe Delete**: Red delete button (×) on each image with usage checking across all blog posts (hero images and content HTML) before deletion; prevents breaking published posts
    - **Image Alignment**: TinyMCE quickbars toolbar and image_class_list with clear separation of block vs float alignment:
      - **Block Alignment** (no text wrap): left/center/right with 1.5rem bottom margins, max-width 100%
      - **Float Alignment** (text wraps around): float-left/right with 2rem (32px) spacing for better text separation, max-width 50%
      - **TinyMCE Interface**: Descriptive labels clarify text flow behavior ("text below" vs "text wraps left/right")
      - **Inline Style Conversion**: rewriteBodyImages automatically detects and converts inline float styles to CSS classes, strips inline float/margin styles to prevent overrides
    - **API Endpoints**: `/api/admin/blog/images` (GET/POST/DELETE), `/api/admin/blog/images/:name/usage` (GET) protected with `requireAdmin` middleware
    - **Authentication**: Bearer token auth pattern (localStorage/sessionStorage fallback) across all image operations
    - **File Cleanup**: Automatic cleanup of temporary uploaded files after Supabase storage
  - **Core Features**: Bilingual (EN/FR), draft/published status, featured posts, SEO metadata, slug-based routing
  - **Public API Routes**: `/api/blog/posts` (list), `/api/blog/posts/:slug` (detail), `/api/blog/featured`, `/api/blog/posts/search`
  - **Admin API Routes**: `/api/admin/blog/posts` (CRUD), `/api/admin/blog/create-from-ai` (AI generation), `/api/admin/blog/images` (GET/POST)
  - **Migration Status**: Core blog system complete; advanced features (tags, galleries, related posts) stubbed for future implementation
- **Blog Content Rendering System**: 
  - **Simple HTML Content**: Posts use `content_html` field containing pre-formatted, sanitized HTML
  - **Security**: DOMPurify sanitizes all rendered HTML before display for XSS protection
  - **Typography**: TailwindCSS `@tailwindcss/typography` prose classes provide professional styling
  - **Table Styling**: Responsive tables with zebra striping, subtle borders, and horizontal scroll on mobile
- **Blog Image Migration Process** (Manual VPS Procedure):
  - **Step 1 - Export from Directus Container**: `docker cp directus-oggoowksgsws8kgg40kwk0sg:/directus/uploads/. /root/directus_export/`
  - **Step 2 - Install Supabase CLI**: `npm install -g supabase && supabase login`
  - **Step 3 - Bulk Upload to Storage**: Use `find` + `supabase storage upload` loop to transfer files to `memopyk-blog` bucket
  - **Step 4 - Update Database URLs**: Run SQL migration to rewrite `hero_url` and gallery URLs from Directus CDN to Supabase Storage paths
  - **Step 5 - Verify Migration**: Confirm non-zero counts for Supabase Storage URLs in production database
  - **Status**: Image migration pending - currently blog posts can reference external URLs or Supabase Storage URLs directly
- **Blog Analytics System**: Tracks blog post views with hybrid storage pattern (Supabase primary + JSON fallback). Excludes admin IP addresses. Admin dashboard "Blog" tab shows popular posts ranked by views with language filtering and time period selection (7d/30d/90d).
- **Advanced Analytics System** (Completed Oct 2025): Comprehensive analytics infrastructure with dual-stream tracking to GA4 and Supabase database:
  - **Event Tracking**: 6 custom event types (page_view, scroll_engagement, form_submit, cta_click, video_interaction, gallery_card_flip, share_click) with automatic tracking hooks
  - **Conversion Tracking**: Business value assignments in EUR (Partner Form €50, Contact Form €40, Scroll 90% €25, CTA Click €15, Video €10, Card Flip €8, Share €5)
  - **Performance Monitoring**: Core Web Vitals auto-capture (LCP, CLS, INP, FID) with rating classification (good/needs-improvement/poor) and page load metrics (DNS, TCP, TTFB, DOM timing)
  - **Database Architecture**: 5 Supabase tables (analytics_events, analytics_conversions, analytics_daily_summary, performance_metrics, performance_daily_summary) with automated daily aggregation
  - **Directus Dashboard Integration**: 10 pre-built SQL views for analytics visualization (KPIs, performance by page, top conversions, funnel analysis, device/browser stats, monthly trends)
  - **API Endpoints**: `/api/analytics/event`, `/api/analytics/conversions`, `/api/analytics/performance` for dual-stream logging
  - **Geographic Enhancement**: IP-based country detection, browser language tracking, device type classification
  - **Admin Exclusion**: Development environments (replit.dev, localhost) excluded from production analytics
  - **Non-blocking Design**: Asynchronous event logging prevents user experience impact

## External Dependencies

### Database
- **Supabase PostgreSQL**: Primary production database.
- **Neon Database**: Development/staging database.
- **Supabase Storage**: For video and image storage (CDN).

### UI Components
- **Radix UI**: Unstyled, accessible component primitives.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.
- **svg-country-flags**: Professional country flag library.

### Development Tools
- **Vite**: Frontend build tool.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Schema validation library.
- **React-Quill**: Rich text editor.
- **DOMPurify**: HTML sanitization library.
- **Crypto-js**: Client-side MD5 hashing.
- **Multer**: Node.js middleware for file uploads.
- **Sharp**: Image processing library for static image generation.
- **marked**: Fast Markdown parser with GFM (GitHub Flavored Markdown) enabled for tables, strikethrough, and enhanced syntax support.

### CRM Integration
- **Zoho CRM**: Partner intake system integration.

### Analytics
- **Google Analytics 4 (GA4)**: JavaScript tracking and BigQuery export.
- **OpenReplay**: Session recording and user behavior analytics.