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

### CSS & Component Pattern Rules
**CRITICAL: Always copy existing working patterns instead of creating custom solutions.**

**Buttons & Badges - NEVER use raw `<span>` or `<div>` elements:**
- ✅ **CORRECT**: Use shadcn `<Badge>` component with existing class patterns
  ```tsx
  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
    🟠 IP Filtered
  </Badge>
  ```
- ❌ **WRONG**: Custom `<span>` elements with manual styling - these always have CSS conflicts

**Pattern Discovery Protocol:**
1. **ALWAYS search codebase first** for existing working examples before creating new UI elements
2. **Copy exact className patterns** from working components (don't improvise new styles)
3. **Test in browser immediately** - if styling looks broken, you're not using the right component
4. **Reference existing pills/badges** in the same file or related files for consistency

**Common Issue: List-style CSS conflicts**
- Problem: Raw `<span>` elements can inherit list styling from global CSS (`.prose` styles, etc.)
- Solution: Use shadcn `<Badge>` component which has proper CSS isolation built-in

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
- **Deployment Optimizations**: Fast health checks, production video cache preloading, error handling, routing priorities.
- **Visitor Classification & Analytics Accuracy**: 30-second session deduplication, proper new/returning visitor classification. Video analytics track watch duration and completion, excluding admin views. All analytics (session, video, blog) exclude development/preview environments (replit.dev, localhost) to ensure only production traffic is tracked.
- **Professional Flag System**: 255-country SVG flag solution with dynamic mapping and three-tier fallback.
- **OpenReplay Integration**: Session recording and user behavior analytics.
- **Partner Intake System**: Bilingual partner directory with Zoho CRM integration. Uses OAuth refresh-token flow, rate limiting, CSRF, and reCAPTCHA stub.
- **Supabase-Native Blog System**: Direct Supabase PostgreSQL integration for full blog management control. Features include a native `blog_posts` table with HTML content, AI blog creator, self-hosted TinyMCE WYSIWYG editor with DOMPurify sanitization, and comprehensive Supabase Storage integration for images.
- **Blog Content Rendering System**: Posts use pre-formatted, sanitized HTML; DOMPurify for XSS protection; TailwindCSS `@tailwindcss/typography` for styling; responsive tables.
- **Blog Analytics System**: Tracks blog post views with hybrid storage, excluding admin IPs. Admin dashboard shows popular posts with language and time filtering.
- **Advanced Analytics System**: Comprehensive infrastructure with dual-stream tracking to GA4 and Supabase. Includes custom event types, conversion tracking with business value assignments, performance monitoring (Core Web Vitals), and 5 Supabase tables for data storage and daily aggregation.

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
- **marked**: Fast Markdown parser with GFM (GitHub Flavored Markdown) enabled.

### CRM Integration
- **Zoho CRM**: Partner intake system integration.

### Analytics
- **Google Analytics 4 (GA4)**: JavaScript tracking and BigQuery export.
- **OpenReplay**: Session recording and user behavior analytics.