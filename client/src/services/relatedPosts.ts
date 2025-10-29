/**
 * Related Posts Service
 * Fetches related posts from Directus based on shared tags
 * 
 * Logic:
 * 1. Primary: Posts that share ≥1 tag via post_tags junction
 * 2. Fallback: Latest posts in same language if no tag matches
 * 3. Always: Same language, published status, exclude current post
 * 4. Sort: By shared tag count desc, then published_at desc
 * 5. Max: 3 items
 */

const CMS_BASE = "https://cms.memopyk.com";
const DIRECTUS_TOKEN = import.meta.env.VITE_DIRECTUS_TOKEN;

export interface PostCard {
  id: string;
  title: string;
  slug: string;
  published_at?: string;
  description?: string;
  hero_caption?: string;
  language: string;
  status: string;
  image?: {
    id?: string;
  };
  matching_tags?: number; // Client-side computed field
}

// Asset URL helper with placeholder fallback
export function assetUrl(id?: string): string {
  if (!id) return '/img/placeholder-16x9.jpg';
  return `${CMS_BASE}/assets/${id}?fit=inside&width=800&quality=82&format=webp`;
}

// Simple fetch wrapper with authorization
async function directusGet<T = any>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }
  
  const res = await fetch(`${CMS_BASE}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directus ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch related posts using Directus REST API
 * Uses tag-based matching with fallback to latest posts
 */
export async function fetchRelatedPosts(
  currentSlug: string,
  language: string,
  max = 3
): Promise<PostCard[]> {
  try {
    // Step 1: Get current post to extract id
    const currentPostResponse = await directusGet<{ data: any[] }>(
      `/items/posts?filter[slug][_eq]=${encodeURIComponent(currentSlug)}&filter[language][_eq]=${language}&fields=id,language`
    );
    
    const currentPost = currentPostResponse.data?.[0];
    if (!currentPost) {
      console.warn(`⚠️ Related posts: Current post ${currentSlug} (${language}) not found`);
      return [];
    }
    
    const postId = currentPost.id as string;
    const lang = language; // Use provided language parameter
    
    // Step 2: Get tag IDs associated with current post via post_tags junction
    let tagIds: string[] = [];
    try {
      const tagsResponse = await directusGet<{ data: any[] }>(
        `/items/post_tags?filter[post_id][_eq]=${postId}&fields=tag_id&limit=100`
      );
      tagIds = (tagsResponse.data || [])
        .map((x) => x?.tag_id)
        .filter(Boolean);
    } catch (err) {
      console.warn('⚠️ Related posts: Error fetching tags, will use fallback:', err);
    }
    
    let candidates: PostCard[] = [];
    
    // Step 3: If tags exist, fetch posts that share tags
    if (tagIds.length > 0) {
      try {
        // Try deep filter first (Directus 10+)
        const tagBasedQuery = `/items/posts?limit=24`
          + `&fields=id,title,slug,published_at,description,image.id,hero_caption,language,status`
          + `&filter[_and][0][id][_neq]=${postId}`
          + `&filter[_and][1][status][_eq]=published`
          + `&filter[_and][2][language][_eq]=${lang}`
          + `&filter[_and][3][post_tags][tag_id][_in]=${tagIds.join(',')}`
          + `&sort[]=-published_at`;
        
        const tagResponse = await directusGet<{ data: PostCard[] }>(tagBasedQuery);
        candidates = tagResponse.data || [];
        
        // CRITICAL: Compute matching_tags for deep-filter path to match fallback behavior
        if (candidates.length > 0) {
          // Fetch tag associations for all candidate posts to compute shared tag counts
          const candidateIds = candidates.map(p => p.id);
          const tagAssocQuery = `/items/post_tags?filter[post_id][_in]=${candidateIds.join(',')}&filter[tag_id][_in]=${tagIds.join(',')}&fields=post_id,tag_id&limit=500`;
          const tagAssocResponse = await directusGet<{ data: any[] }>(tagAssocQuery);
          
          // Tally shared tags per post
          const tally = new Map<string, number>();
          for (const record of tagAssocResponse.data || []) {
            const pid = record.post_id;
            if (!pid) continue;
            tally.set(pid, (tally.get(pid) ?? 0) + 1);
          }
          
          // Add matching_tags and sort by shared tag count desc, then date desc
          candidates = candidates.map(p => ({
            ...p,
            matching_tags: tally.get(p.id) ?? 0
          }));
          
          candidates.sort((p1, p2) => {
            const count1 = p1.matching_tags ?? 0;
            const count2 = p2.matching_tags ?? 0;
            if (count2 - count1 !== 0) return count2 - count1;
            
            const date1 = new Date(p1.published_at ?? 0).getTime();
            const date2 = new Date(p2.published_at ?? 0).getTime();
            return date2 - date1;
          });
        }
        
      } catch (deepFilterError) {
        console.warn('⚠️ Deep filter not supported, using client-side join:', deepFilterError);
        
        // Fallback: Client-side join approach
        try {
          // Get all post_tags entries for these tags
          const junctionResponse = await directusGet<{ data: any[] }>(
            `/items/post_tags?filter[tag_id][_in]=${tagIds.join(',')}&fields=post_id,tag_id&limit=500`
          );
          
          // Tally shared tag counts per post
          const tally = new Map<string, number>();
          for (const record of junctionResponse.data || []) {
            const pid = record.post_id;
            if (!pid || pid === postId) continue;
            tally.set(pid, (tally.get(pid) ?? 0) + 1);
          }
          
          const relatedPostIds = Array.from(tally.keys());
          
          if (relatedPostIds.length > 0) {
            // Fetch those posts
            const postsResponse = await directusGet<{ data: PostCard[] }>(
              `/items/posts?filter[id][_in]=${relatedPostIds.join(',')}`
              + `&fields=id,title,slug,published_at,description,image.id,hero_caption,language,status`
            );
            
            candidates = (postsResponse.data || [])
              .filter(p => p.language === lang && p.status === 'published' && p.id !== postId);
            
            // Client-side sort: by shared tag count desc, then date desc
            candidates.sort((p1, p2) => {
              const count1 = tally.get(p1.id) ?? 0;
              const count2 = tally.get(p2.id) ?? 0;
              if (count2 - count1 !== 0) return count2 - count1;
              
              const date1 = new Date(p1.published_at ?? 0).getTime();
              const date2 = new Date(p2.published_at ?? 0).getTime();
              return date2 - date1;
            });
            
            // Add matching_tags count for display
            candidates = candidates.map(p => ({
              ...p,
              matching_tags: tally.get(p.id) ?? 0
            }));
          }
        } catch (joinError) {
          console.warn('⚠️ Client-side join failed, will use fallback:', joinError);
        }
      }
    }
    
    // Step 4: Trim to max and backfill with latest posts if needed
    let results = candidates.slice(0, max);
    
    if (results.length < max) {
      const needed = max - results.length;
      const excludeIds = new Set(results.map(p => p.id).concat([postId]));
      
      try {
        const fallbackQuery = `/items/posts?limit=${needed * 3}`
          + `&fields=id,title,slug,published_at,description,image.id,hero_caption,language,status`
          + `&filter[_and][0][id][_neq]=${postId}`
          + `&filter[_and][1][status][_eq]=published`
          + `&filter[_and][2][language][_eq]=${lang}`
          + `&sort[]=-published_at`;
        
        const fallbackResponse = await directusGet<{ data: PostCard[] }>(fallbackQuery);
        
        for (const post of fallbackResponse.data || []) {
          if (!excludeIds.has(post.id) && results.length < max) {
            results.push(post);
          }
        }
      } catch (err) {
        console.warn('⚠️ Related posts fallback failed:', err);
      }
    }
    
    return results.slice(0, max);
    
  } catch (error) {
    console.error('❌ Related posts fetch failed:', error);
    return [];
  }
}
