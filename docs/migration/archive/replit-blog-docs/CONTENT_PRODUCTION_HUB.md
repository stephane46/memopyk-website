# MEMOPYK Blog Posts (Content Production Hub)

## Overview
The Blog Posts section (formerly "Content Production") is a unified 5-tab interface that integrates blog post management with content production planning. It provides a comprehensive system for planning, creating, and publishing blog content with seamless workflow integration.

**Admin Navigation:** Sidebar item "Blog Posts" → `content-production` section ID  
**Key Component:** `ContentProductionPlanner.tsx`

## Architecture

### Tab Structure
The hub consists of 5 main tabs with persistent state:

1. **Weekly Planner** - Dual-mode calendar interface (Topics/Posts views)
2. **Topic Backlog** - 102 content topics with filtering and assignment
3. **Keywords** - 50 SEO keywords with metadata
4. **Blog Posts** - Full post management interface
5. **Tag Management** - Content categorization system

### State Persistence
- URL parameter-based state: `?tab=topics`, `?tab=planner`, etc.
- LocalStorage for calendar view mode toggle (Topics/Posts)
- Admin page routing recognizes sub-tab params (planner/topics/keywords/posts/tags)
- State maintained across page refreshes

### Design System
- **Branding:** MEMOPYK orange accent colors
- **Navigation:** Horizontal scroll tabs on mobile
- **Responsive:** Full mobile optimization

## Calendar Interface - Dual-Mode System

### View Modes

#### TOPICS View (Planning Mode)
- Shows content topic assignments by date
- Displays planned content slots
- Orange vertical bars (2px) for planned slots
- Assignment cards with topic titles and metadata
- Drag-and-drop topic assignment to dates
- Modal-based topic selection from backlog

#### POSTS View (Publication Mode)
- Shows blog posts positioned by publication status
- **Published posts:** Positioned on `published_at` date
- **Draft/In Review posts:** Positioned on assignment date (via `source_topic_id` lookup)
- Distinct visual styling by status
- Real-time status badge updates

### Calendar Auto-Scroll Behavior
- Auto-scrolls to TODAY on initial load
- Re-scrolls to TODAY when switching between TOPICS and POSTS views
- Smooth scrolling for optimal user experience
- Ensures current date is always visible

### Visual Design System

#### Post Status Cards

**Published Posts:**
- Background: Light green (`#dcfce7`)
- Border: Green (`#16a34a`)
- Status bar: Wide green (6px, `#16a34a`)
- Date label: "Published: {date}"
- Badge: Green "PUBLISHED"
- Positioned on: `published_at` date

**Draft Posts:**
- Background: Light yellow (`#fef3c7`)
- Border: Yellow/amber (`#f59e0b`)
- Status bar: Medium yellow (4px, `#eab308`)
- Date labels: "Assigned: {date}" and "Publication: {date or Not set}"
- Badge: Orange "DRAFT"
- Positioned on: Assignment date from `content_daily_assignments`

**In Review Posts:**
- Background: Light yellow (`#fef3c7`) - identical to Draft
- Border: Yellow/amber (`#f59e0b`)
- Status bar: Medium yellow (4px, `#eab308`)
- Date labels: "Assigned: {date}" and "Publication: {date or Not set}"
- Badge: Orange "IN REVIEW"
- Positioned on: Assignment date from `content_daily_assignments`
- **Note:** IN REVIEW treated identically to DRAFT except for badge text

**Planned Slots:**
- Border: Orange (`#f97316`)
- Status bar: Thin orange (2px, `#f97316`)
- Represents available content slots
- Appears in TOPICS view only

#### Status Bar Implementation
Left vertical status bars provide visual hierarchy using DOM manipulation (following replit.md pattern for reliable rendering):

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    const postCards = document.querySelectorAll('[data-testid^="post-"]');
    postCards.forEach((card) => {
      const badge = cardEl.querySelector('[data-testid^="badge-status-"]');
      const badgeText = badge.textContent?.trim().toUpperCase();
      
      let barWidth = '2px';
      let barColor = '#f97316';
      
      if (badgeText === 'PUBLISHED') {
        barWidth = '6px';
        barColor = '#16a34a'; // green
      } else if (badgeText === 'DRAFT' || badgeText === 'IN REVIEW') {
        barWidth = '4px';
        barColor = '#eab308'; // yellow/amber
      }
      
      // Create and insert status bar div
    });
  }, 100);
}, [assignments, blogPosts, viewMode]);
```

**Why DOM Manipulation?**
- CSS classes sometimes fail to render to actual DOM elements
- Direct DOM manipulation ensures consistent visual appearance
- Documented pattern in `replit.md` for handling React/Tailwind rendering issues
- Used throughout MEMOPYK (flip cards, partner directory, blog index, etc.)

### Date Positioning Logic

#### Backend: `/api/admin/blog/posts-by-date`
```javascript
// Published posts: Use published_at normalized to Paris timezone
if (post.published_at) {
  const parisDate = DateTime.fromISO(post.published_at, { zone: 'utc' })
    .setZone('Europe/Paris');
  dateStr = parisDate.toFormat('yyyy-MM-dd');
}

// Non-published posts: Look up assignment date via source_topic_id
else if (post.status !== 'published' && post.source_topic_id) {
  const assignmentDate = topicAssignmentMap.get(post.source_topic_id);
  if (assignmentDate) {
    dateStr = assignmentDate.split('T')[0]; // Normalize to YYYY-MM-DD
  }
}
```

**Topic Assignment Map:**
- Created from `content_daily_assignments` table
- Maps `topic_id` → `assignment date`
- Efficient O(1) lookup for post positioning
- Handles unscheduled drafts (no assignment = unscheduled section)

#### Frontend: Assignment Date Display
```typescript
// For non-published posts, the backend positions them on their assignment date
// So the current 'day' IS the assignment date - no need to look it up
const assignmentDate = (isDraft || isInReview) ? day : null;

// Display in UI
{assignmentDate && (
  <div className="text-[10px] text-gray-600">
    Assigned: {assignmentDate.toLocaleDateString('en-US', { ... })}
  </div>
)}
```

## Integration with Blog System

### Phase 2: Create Post from Topic
**Component:** `BlogPostCreatorModal.tsx`

**Workflow:**
1. User clicks "Create Post" from topic row in Topic Backlog
2. Modal pre-fills with topic metadata (title, primary keyword, word count, etc.)
3. AI prompt generation uses topic data for context
4. User pastes JSON response from AI into validation field
5. Backend validates `source_topic_id` exists before insertion
6. Post created with automatic status synchronization

**Features:**
- One-click post creation from topics
- Structured JSON input/validation
- Pre-filled metadata from source topic
- Robust error handling with toast notifications
- Backend validation surfaces errors inline

### Phase 3: Bidirectional Status Sync
**Automatic status synchronization between blog posts and content topics:**

#### Status Update Triggers

**Creating a Post:**
- Topic status: `backlog` → `in_progress`
- Occurs on POST to `/api/admin/blog/posts`
- Updates both `content_topics` and `content_daily_assignments` tables

**Publishing a Post:**
- Topic status: `in_progress` → `published`
- Occurs on PATCH to `/api/admin/blog/posts/:id` with `status: 'published'`
- Sets `published_at` timestamp automatically
- Syncs to source topic and assignment

**Deleting a Post:**
- **Single post from topic:** Status reverts (`published` → `planned`)
- **Multiple posts from topic:** Status preserved until ALL posts deleted
- Occurs on DELETE to `/api/admin/blog/posts/:id`
- Smart deletion logic checks for remaining posts before reverting

#### Status Badge System
**Visual Feedback:**
- **Backlog:** Gray badge (topic has no posts)
- **Planned:** Yellow badge (topic assigned but no posts)
- **In Progress:** Blue badge (topic has draft/in_review posts)
- **Published:** Green badge (topic has published posts)

**Generation Counter:**
- Orange "Generated Nx" badge appears when topic reused
- Tracks number of posts created from single topic
- Helps identify high-value content topics

**Implementation:**
```typescript
const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'backlog': return 'Backlog';
    case 'planned': return 'Planned';
    case 'in_progress': return 'In Progress';
    case 'published': return 'Published';
    default: return status;
  }
};
```

## Database Schema

### Key Tables

#### `blog_posts`
- `id` - UUID primary key
- `title`, `slug`, `status`, `language`
- `published_at` - Publication timestamp (NULL for drafts)
- `source_topic_id` - Foreign key to `content_topics`
- `html_content` - Sanitized HTML from TinyMCE
- `meta_description`, `featured_image_url`
- `tags` - Array of tag IDs

#### `content_topics`
- `id` - UUID primary key
- `title`, `status` - Synchronized with post status
- `primary_keyword`, `target_word_count`
- `priority`, `topic_type`
- `language` - 'English' or 'French'

#### `content_daily_assignments`
- `id` - UUID primary key
- `topic_id` - Foreign key to `content_topics`
- `date` - Assignment date (YYYY-MM-DD format)
- `post_id` - Foreign key to `blog_posts` (added Phase 2)
- `status` - Synchronized with topic status

### Database Relationships
```
content_topics (1) ←→ (many) blog_posts
    ↓
content_daily_assignments
    ↓
(future) post scheduling integration
```

## API Endpoints

### Calendar View
- `GET /api/admin/blog/posts-by-date` - Posts grouped by date for calendar
  - Query params: `startDate`, `endDate`
  - Returns: `{ byDate: {}, unscheduled: [] }`
  - Uses topic assignment map for draft positioning

### Post Management
- `GET /api/admin/blog/posts` - List posts with pagination/filtering
- `GET /api/admin/blog/posts/:id` - Get single post
- `POST /api/admin/blog/posts` - Create post (triggers status sync)
- `PATCH /api/admin/blog/posts/:id` - Update post (syncs on publish)
- `DELETE /api/admin/blog/posts/:id` - Delete post (smart status revert)

### Content Topics
- `GET /api/admin/content-topics` - Fetch all topics
- `POST /api/admin/content-topics` - Create topic
- `PATCH /api/admin/content-topics/:id` - Update topic
- `DELETE /api/admin/content-topics/:id` - Delete topic

### Daily Assignments
- `GET /api/admin/daily-assignments` - Fetch assignments for date range
- `POST /api/admin/daily-assignments` - Create assignment
- `DELETE /api/admin/daily-assignments/:id` - Remove assignment

## Technical Patterns

### CSS Rendering Issues
**Problem:** React/Tailwind CSS classes sometimes fail to render to actual DOM  
**Solution:** Direct DOM manipulation with `useEffect`

**Pattern:**
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    const elements = document.querySelectorAll('[data-testid="target"]');
    elements.forEach((el) => {
      (el as HTMLElement).style.setProperty('property', 'value', 'important');
    });
  }, 50-100); // Small delay for React render

  return () => clearTimeout(timeout);
}, [dependencies]);
```

**Documented in `replit.md`:**
- Flip card text colors
- Blog header text
- Partner directory headers
- Content Production Hub status bars

### Data Attribute Rendering
**Problem:** Custom data attributes not rendered to DOM by React  
**Solution:** Use element index from source array

**Example:**
```typescript
// Instead of: data-keyword-text={value}
// Use element index:
badges.forEach((el, index) => {
  if (sourceArray[index]) {
    (el as HTMLElement).innerHTML = sourceArray[index].value;
  }
});
```

**Database Schema Naming:**
- Always verify TypeScript interfaces match database column names
- Database uses `snake_case` (`primary_keyword`, `target_word_count`)
- TypeScript may default to `camelCase` - this causes `undefined` values
- Fixed in `ContentTopic` interface and `BlogPostCreatorModal`

## Future Enhancements

### Planned Features
1. **Post Scheduling:** Use `post_id` in `content_daily_assignments` for future publication
2. **Editorial Calendar:** Multi-week/month view with drag-and-drop rescheduling
3. **Content Performance:** Analytics integration showing post performance metrics
4. **AI Suggestions:** Automated topic suggestions based on keyword research
5. **Collaboration:** Multi-user assignment and review workflows
6. **Bulk Operations:** Mass topic assignment, status updates, tag management

### Technical Debt
- LSP diagnostics in `server/routes.ts` (166 warnings) - mostly type annotations
- Calendar performance optimization for large datasets (>100 posts)
- Improved error handling for Supabase connection failures
- Unit tests for status synchronization logic

## Development Guidelines

### When Adding Features
1. **Read `replit.md` first** - Understand existing architecture
2. **Copy working patterns** - Avoid creating custom solutions
3. **Never remove code** - Understand purpose before modifying
4. **Test synchronization** - Verify topic/post status updates work correctly
5. **Use DOM manipulation** - For CSS issues follow documented pattern

### Code Conventions
- TypeScript interfaces match database schema (snake_case)
- Status types: `'draft' | 'in_review' | 'published'`
- Date format: YYYY-MM-DD for assignments, ISO for timestamps
- Use `data-testid` attributes for DOM manipulation targets
- Apply styles with `.setProperty('property', 'value', 'important')`

## Deployment Notes

### Performance Considerations
- Calendar auto-scroll uses smooth scrolling (may be slow on mobile)
- DOM manipulation runs on 100ms delay - tune if needed
- Topic assignment map created server-side for O(1) lookups
- Status bar creation is O(n) where n = visible posts

### Browser Compatibility
- Tested on Chrome, Firefox, Safari
- DOM manipulation works across all modern browsers
- LocalStorage for state persistence (fallback to session if disabled)
- Smooth scrolling with `behavior: 'smooth'` polyfill not needed

## Changelog

### Phase 3 Complete (Current)
- ✅ Bidirectional status synchronization (topic ↔ post)
- ✅ Smart deletion logic (preserves status when multiple posts exist)
- ✅ Visual status badges with color coding
- ✅ Generation counter for topic reuse tracking
- ✅ Status updates across complete lifecycle
- ✅ Backend synchronization in POST/PATCH/DELETE endpoints

### Phase 2 Complete
- ✅ "Create Post from Topic" workflow
- ✅ BlogPostCreatorModal component
- ✅ AI prompt generation with topic metadata
- ✅ JSON input validation
- ✅ Backend validation for `source_topic_id`
- ✅ Added `post_id` to `content_daily_assignments` table

### Phase 1 Complete
- ✅ Unified 5-tab interface
- ✅ Weekly Planner with Topics/Posts dual-mode calendar
- ✅ Topic Backlog (102 topics)
- ✅ Keywords management (50 keywords)
- ✅ Blog Posts management integration
- ✅ Tag Management system
- ✅ URL param state persistence
- ✅ Mobile-responsive horizontal scroll tabs
- ✅ MEMOPYK orange branding
- ✅ Calendar auto-scroll to TODAY
- ✅ Visual status bar system (green/yellow/orange)
- ✅ IN REVIEW status treated as DRAFT with distinct badge
- ✅ Proper date wording ("Published:" vs "Assigned:" + "Publication:")
- ✅ DOM manipulation for status bar rendering

---

**Last Updated:** November 21, 2025  
**Maintained by:** MEMOPYK Development Team
