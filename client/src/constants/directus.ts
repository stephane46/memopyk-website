export const DIRECTUS_URL = "https://cms-blog.memopyk.org";

export function directusAsset(
  raw: string,
  opts?: { width?: number; quality?: number; format?: "webp" | "jpg"; fit?: "inside" | "cover" }
) {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const path = raw.startsWith("/assets/") ? raw : `/assets/${raw}`;
  
  const isWebP = raw.toLowerCase().endsWith('.webp');
  
  const q = new URLSearchParams({
    ...(opts?.width ? { width: String(opts.width) } : {}),
    ...(opts?.quality ? { quality: String(opts.quality) } : {}),
    ...(opts?.fit ? { fit: opts.fit } : {}),
    ...(opts?.format ? { format: opts.format } : !isWebP ? { format: "webp" } : {}),
  });
  return `${DIRECTUS_URL}${path}${q.toString() ? `?${q}` : ""}`;
}

export async function getPostWithBlocks(slug: string, locale: string) {
  try {
    const response = await fetch(`/api/blog/posts/${slug}?language=${locale}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📝 Blog post not found: ${slug}`);
        return null;
      }
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const post = await response.json();
    console.log('✅ Blog post fetched:', post.title);
    return post;
  } catch (error) {
    console.error('❌ Error fetching blog post:', error);
    return null;
  }
}
