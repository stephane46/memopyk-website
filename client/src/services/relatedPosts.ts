export interface PostCard {
  id: number;
  slug: string;
  title: string;
  description?: string;
  heroCaption?: string;
  publishedAt?: string;
  language?: string;
  image?: { id: string };
  matchingTags?: number;
}

export async function fetchRelatedPosts(
  slug: string,
  language: string,
  limit: number
): Promise<PostCard[]> {
  const res = await fetch(
    `/api/blog/posts/${encodeURIComponent(slug)}/related?limit=${limit}`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []).map((post: any) => ({
    ...post,
    image: post.heroUrl ? { id: post.heroUrl } : undefined,
    matchingTags: post.score || 0,
  }));
}

export function assetUrl(id: string | undefined): string {
  if (!id) return '/placeholder-blog.jpg';
  if (id.startsWith('http')) return id;
  return id;
}
