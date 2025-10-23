# 🚀 MEMOPYK Blog CMS - Frontend Integration Roadmap

*Complete 4-Week Implementation Guide for Developers*

---

## 📋 Overview

This roadmap provides a **day-by-day implementation plan** for integrating the MEMOPYK Blog CMS into your Next.js 14+ application. The blog focuses on **souvenir films and memory preservation services** targeting families, travelers, and pet owners in France (primary) and the United States (secondary).

**Prerequisites:**
- ✅ Database deployed (`DEPLOY_NOW.sql`)
- ✅ Content seeded (`MEMOPYK-BLOG-CONTENT-SEED.sql`)
- ✅ Next.js 14+ project with App Router
- ✅ Supabase project credentials

**Total Timeline:** 4 weeks (adjustable based on team size)

**Key Pages to Build:**
- `/[locale]/blog` - Blog listing page
- `/[locale]/blog/[slug]` - Individual post page
- `/[locale]/blog/category/[slug]` - Category archive
- `/[locale]/blog/tag/[slug]` - Tag archive
- `/[locale]/blog/search` - Search results page

---

## 🎯 Week-by-Week Overview

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Setup & Foundation | Supabase client, TypeScript types, Blog list page |
| **Week 2** | Core Features | Single post page, Categories, Tags, Search |
| **Week 3** | SEO & Performance | Meta tags, Sitemap, Schema.org, Image optimization |
| **Week 4** | Polish & Launch | Analytics, Mobile optimization, Testing, Deploy |

---

## Week 1: Setup and Foundation

### **Day 1-2: Environment & TypeScript Setup**

**Install Dependencies:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://www.memopyk.com
```

**TypeScript Types** (`lib/types/blog.ts`):
```typescript
export type Language = 'fr-FR' | 'en-US'
export type PostStatus = 'draft' | 'published' | 'archived'

export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  content: any
  language: Language
  status: PostStatus
  publish_date: string
  featured_image_url?: string
  reading_time_minutes: number
  view_count: number
  is_featured: boolean
  meta_title: string
  meta_description: string
  author?: { name: string; slug: string; avatar_url?: string }
  category?: { name: string; slug: string }
  tags?: Array<{ name: string; slug: string }>
}
```

**Supabase Clients:**
- `lib/supabase/server.ts` - Server Components
- `lib/supabase/client.ts` - Client Components

---

### **Day 3-4: API Functions**

**Core Functions** (`lib/api/blog.ts`):
```typescript
export async function getBlogPosts(language, options?)
export async function getFeaturedPosts(language, limit)
export async function getPostBySlug(slug, language)
export async function getCategories(language)
export async function searchPosts(query, language)
```

**Client-Side Functions** (`lib/api/blog-client.ts`):
```typescript
'use client'
export async function incrementViewCount(postId)
```

---

### **Day 5-7: Blog List Page**

**Page:** `app/[locale]/blog/page.tsx`
- Featured posts section (3 posts)
- All posts grid
- SEO metadata

**Components:**
- `BlogPostCard` - Standard post card
- `FeaturedPostCard` - Highlighted featured posts

**Key Features:**
- Responsive grid layout (3 columns desktop)
- Featured badge for featured posts
- Category links
- Reading time and view count display

---

## Week 2: Core Features

### **Day 8-10: Single Post Page**

**Page:** `app/[locale]/blog/[slug]/page.tsx`

**Features:**
- Full post content rendering
- Author information display
- Category and tags
- View count tracking (client-side)
- Related posts section
- CTA section ("Create Your Souvenir Film")
- Social sharing buttons

**Components:**
- `ViewTracker` - Client component for view counting
- `PostContent` - Renders JSONB content blocks
- `RelatedPosts` - Shows 3 related posts

**SEO:**
- Dynamic metadata (title, description)
- Open Graph tags
- Twitter Card tags
- Schema.org Article markup (Week 3)

---

### **Day 11-12: Category & Tag Pages**

**Category Page:** `app/[locale]/blog/category/[slug]/page.tsx`
- List all posts in category
- Category description header
- Generate static params for all categories

**Tag Page:** `app/[locale]/blog/tag/[slug]/page.tsx`
- List all posts with tag
- Tag cloud sidebar (optional)
- Generate static params for all tags

**Shared Features:**
- Use same `BlogPostCard` component
- Empty state handling
- Pagination (if needed)

---

### **Day 13-14: Search Functionality**

**Search Page:** `app/[locale]/blog/search/page.tsx`
- Full-text search using PostgreSQL `tsvector`
- Search results display
- "No results" state
- Search suggestions

**Search Component:** `components/blog/SearchBar.tsx`
- Client-side search input
- Live search suggestions (optional)
- Search history (localStorage)

**API Function:**
```typescript
// Uses PostgreSQL full-text search
searchPosts(query, language) // French/English specific search
```

---

## Week 3: SEO & Optimization

### **Day 15-16: SEO Meta Tags & Schema.org**

**Implement for All Pages:**

**1. Dynamic Metadata:**
```typescript
export async function generateMetadata({ params }) {
  const post = await getPostBySlug(params.slug)
  
  return {
    title: post.meta_title,
    description: post.meta_description,
    openGraph: { ... },
    twitter: { ... },
  }
}
```

**2. Schema.org Markup:**
```typescript
// components/blog/PostSchema.tsx
export function PostSchema({ post }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.featured_image_url,
    datePublished: post.publish_date,
    author: {
      "@type": "Person",
      name: post.author.name
    },
    publisher: {
      "@type": "Organization",
      name: "MEMOPYK",
      logo: {
        "@type": "ImageObject",
        url: "https://www.memopyk.com/logo.png"
      }
    }
  }
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

**3. Canonical URLs:**
```typescript
metadata: {
  alternates: {
    canonical: `https://www.memopyk.com/${locale}/blog/${slug}`
  }
}
```

---

### **Day 17-18: Sitemap & Robots.txt**

**Sitemap Generator** (`app/sitemap.ts`):
```typescript
import { getBlogPosts } from '@/lib/api/blog'

export default async function sitemap() {
  const [frPosts, enPosts] = await Promise.all([
    getBlogPosts('fr-FR'),
    getBlogPosts('en-US')
  ])

  const blogUrls = [
    ...frPosts.map(post => ({
      url: `https://www.memopyk.com/fr-FR/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: 'weekly' as const,
      priority: post.is_featured ? 0.9 : 0.7,
    })),
    ...enPosts.map(post => ({
      url: `https://www.memopyk.com/en-US/blog/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: 'weekly' as const,
      priority: post.is_featured ? 0.9 : 0.7,
    }))
  ]

  return [
    {
      url: 'https://www.memopyk.com',
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: 'https://www.memopyk.com/fr-FR/blog',
      lastModified: new Date(),
      priority: 0.8,
    },
    {
      url: 'https://www.memopyk.com/en-US/blog',
      lastModified: new Date(),
      priority: 0.8,
    },
    ...blogUrls,
  ]
}
```

**Robots.txt** (`app/robots.ts`):
```typescript
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://www.memopyk.com/sitemap.xml',
  }
}
```

---

### **Day 19-21: Image Optimization**

**Image Component Wrapper:**
```typescript
// components/blog/OptimizedImage.tsx
import Image from 'next/image'

export function OptimizedImage({ src, alt, priority = false }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85}
      priority={priority}
      className="object-cover"
    />
  )
}
```

**Performance Optimizations:**
- Lazy load images below the fold
- WebP format with fallback
- Responsive images with `sizes` attribute
- Blur placeholder for featured images
- CDN for image hosting (Supabase Storage)

**Lighthouse Targets:**
- Performance: 90+
- SEO: 95+
- Accessibility: 90+
- Best Practices: 90+

---

## Week 4: Polish & Launch

### **Day 22-23: Analytics Integration**

**Google Analytics 4:**
```typescript
// components/analytics/GoogleAnalytics.tsx
'use client'

import Script from 'next/script'

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}
```

**Track Events:**
- Page views (automatic)
- Blog post reads (time on page > 30s)
- CTA clicks ("Create Your Souvenir Film")
- Category navigation
- Search queries

**Custom Events:**
```typescript
// lib/analytics.ts
export function trackBlogRead(postTitle: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'blog_read', {
      post_title: postTitle,
      engagement_time: 30000 // 30 seconds
    })
  }
}

export function trackCTAClick(ctaLocation: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_click', {
      cta_location: ctaLocation
    })
  }
}
```

---

### **Day 24-25: Mobile Optimization**

**Responsive Design Checklist:**

- [ ] **Navigation**: Mobile-friendly menu
- [ ] **Blog Cards**: Stack on mobile (1 column)
- [ ] **Images**: Responsive, proper aspect ratios
- [ ] **Typography**: Readable font sizes (16px+ body)
- [ ] **Touch Targets**: Min 44x44px buttons
- [ ] **Forms**: Large inputs, clear labels
- [ ] **Search**: Accessible on mobile
- [ ] **CTA Buttons**: Visible, easy to tap

**Tailwind Responsive Utilities:**
```typescript
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">
  {/* Sidebar */}
</div>

// Typography scaling
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  {title}
</h1>
```

**Test On:**
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Various screen sizes (320px - 1920px)

---

### **Day 26-28: QA, Testing & Deployment**

#### **QA Checklist:**

**Functionality:**
- [ ] All blog posts load correctly
- [ ] Navigation works (categories, tags)
- [ ] Search returns relevant results
- [ ] View count increments
- [ ] Related posts show correctly
- [ ] Links work (internal and external)
- [ ] Forms submit properly (if any)

**SEO:**
- [ ] All pages have unique titles
- [ ] Meta descriptions present (<160 chars)
- [ ] Open Graph images display
- [ ] Sitemap generates correctly
- [ ] Robots.txt accessible
- [ ] Schema.org markup validates
- [ ] Canonical URLs set

**Performance:**
- [ ] Lighthouse score 90+ (all metrics)
- [ ] Images optimized (<150KB each)
- [ ] Page load time <3 seconds
- [ ] No layout shifts (CLS < 0.1)
- [ ] Lazy loading works

**Accessibility:**
- [ ] Alt text on all images
- [ ] Proper heading hierarchy (H1 → H6)
- [ ] Keyboard navigation works
- [ ] Color contrast 4.5:1+
- [ ] Screen reader friendly

**Cross-Browser:**
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge

#### **Deployment Steps:**

**1. Pre-Deployment:**
```bash
# Build check
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

**2. Environment Variables:**
```bash
# Production .env
NEXT_PUBLIC_SUPABASE_URL=production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-key
NEXT_PUBLIC_SITE_URL=https://www.memopyk.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**3. Deploy to Vercel:**
```bash
vercel --prod
```

**4. Post-Deployment:**
- Submit sitemap to Google Search Console
- Verify indexing of first 6 posts
- Test production URLs
- Monitor analytics

---

## 📊 Component Architecture

```
app/
├── [locale]/
│   └── blog/
│       ├── page.tsx (Blog list)
│       ├── [slug]/
│       │   └── page.tsx (Single post)
│       ├── category/
│       │   └── [slug]/page.tsx
│       ├── tag/
│       │   └── [slug]/page.tsx
│       └── search/
│           └── page.tsx
├── sitemap.ts
└── robots.ts

components/
└── blog/
    ├── BlogPostCard.tsx
    ├── FeaturedPostCard.tsx
    ├── PostContent.tsx
    ├── ViewTracker.tsx
    ├── RelatedPosts.tsx
    ├── SearchBar.tsx
    ├── PostSchema.tsx
    └── OptimizedImage.tsx

lib/
├── api/
│   ├── blog.ts (server)
│   └── blog-client.ts (client)
├── supabase/
│   ├── server.ts
│   └── client.ts
├── types/
│   └── blog.ts
└── utils.ts
```

---

## 🔧 Code Snippets Library

### **Related Posts Component**

```typescript
// components/blog/RelatedPosts.tsx
import { BlogPostCard } from './BlogPostCard'
import type { Post, Language } from '@/lib/types/blog'

interface RelatedPostsProps {
  posts: Post[]
  locale: Language
}

export function RelatedPosts({ posts, locale }: RelatedPostsProps) {
  if (posts.length === 0) return null

  const isEnglish = locale === 'en-US'

  return (
    <section className="container mx-auto px-4 py-12 bg-gray-50">
      <h2 className="text-3xl font-bold mb-8">
        {isEnglish ? 'Related Articles' : 'Articles Connexes'}
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {posts.slice(0, 3).map(post => (
          <BlogPostCard 
            key={post.id} 
            post={post} 
            locale={locale}
          />
        ))}
      </div>
    </section>
  )
}
```

### **Search Bar Component**

```typescript
// components/blog/SearchBar.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Language } from '@/lib/types/blog'

interface SearchBarProps {
  locale: Language
  placeholder?: string
}

export function SearchBar({ locale, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${locale}/blog/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-md">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || (locale === 'en-US' ? 'Search articles...' : 'Rechercher...')}
          className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600"
        >
          🔍
        </button>
      </div>
    </form>
  )
}
```

### **Breadcrumbs Component**

```typescript
// components/blog/Breadcrumbs.tsx
import Link from 'next/link'
import type { Language } from '@/lib/types/blog'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  locale: Language
}

export function Breadcrumbs({ items, locale }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link href={`/${locale}`} className="hover:text-blue-600">
        {locale === 'en-US' ? 'Home' : 'Accueil'}
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-blue-600">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
```

---

## 🎯 Success Metrics

### **Week 1 Goals:**
- ✅ Supabase integration complete
- ✅ Blog list page functional
- ✅ TypeScript types defined

### **Week 2 Goals:**
- ✅ Single post pages working
- ✅ Category/tag filtering
- ✅ Search functionality

### **Week 3 Goals:**
- ✅ SEO metadata on all pages
- ✅ Sitemap generating
- ✅ Lighthouse score 90+

### **Week 4 Goals:**
- ✅ Analytics tracking
- ✅ Mobile optimized
- ✅ Production deployed

---

## 💡 Best Practices

### **Performance:**
- Use Server Components by default
- Client Components only when needed (interactivity)
- Implement lazy loading for images
- Minimize JavaScript bundle size
- Use `next/image` for all images

### **SEO:**
- Unique title/description per page
- Semantic HTML structure
- Internal linking strategy
- Mobile-first design
- Fast page load times

### **Code Quality:**
- TypeScript strict mode
- ESLint + Prettier
- Component reusability
- Consistent naming conventions
- Comprehensive error handling

### **Security:**
- Never expose Supabase service key
- Use Row Level Security (RLS)
- Sanitize user inputs
- HTTPS only
- CSP headers

---

## 🆘 Troubleshooting

### **Common Issues:**

**1. Posts not loading:**
- Check RLS policies in Supabase
- Verify `status = 'published'` and `deleted_at IS NULL`
- Confirm date is `<= NOW()`

**2. View count not incrementing:**
- Check browser console for errors
- Verify RPC function exists: `increment_post_view_count`
- Test with Supabase SQL: `SELECT increment_post_view_count('post-uuid')`

**3. Images not displaying:**
- Check Supabase Storage bucket permissions (public)
- Verify image URLs are absolute
- Add image domain to `next.config.js`:
```typescript
images: {
  domains: ['your-project.supabase.co']
}
```

**4. Search not working:**
- Verify `search_vector` column populated
- Check trigger: `update_posts_search_vector`
- Test in Supabase SQL directly

---

## 📚 Resources

### **Documentation:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Tailwind CSS](https://tailwindcss.com/docs)

### **SEO Tools:**
- [Google Search Console](https://search.google.com/search-console)
- [Schema.org Validator](https://validator.schema.org/)
- [Open Graph Debugger](https://www.opengraph.xyz/)

### **Testing:**
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

---

**🚀 Ready to Build! Follow this roadmap day-by-day for a successful implementation.**

*Last Updated: October 4, 2025*  
*Project: MEMOPYK Blog CMS Frontend Integration*
