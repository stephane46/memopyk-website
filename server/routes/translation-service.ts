/**
 * Translation Service
 *
 * Shared translation logic for Claude API calls.
 * Used by:
 * - ai-context.routes.ts (POST /api/admin/translate)
 * - blog-admin.routes.ts (POST /admin/blog/posts/:id/translate with method: 'ai')
 */

import Anthropic from '@anthropic-ai/sdk';

export interface TranslationInput {
  text: string;
  title: string;
  slug: string;
  description: string;
  sourceLanguage: 'en-US' | 'fr-FR';
  targetLanguage: 'en-US' | 'fr-FR';
}

export interface TranslationResult {
  title: string;
  slug: string;
  description: string;
  content: string;
  rawResponse: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface AIContext {
  brand: Record<string, string>;
  translation: Record<string, string>;
  publishedPostsList?: string;
}

/**
 * Translate content using Claude API with Brand Brain context
 */
export async function translateContent(
  input: TranslationInput,
  aiContext: AIContext
): Promise<TranslationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Translation service not configured. ANTHROPIC_API_KEY is missing.');
  }

  const { text, title, slug, description, sourceLanguage, targetLanguage } = input;

  // Build language labels
  const targetLangLabel = targetLanguage === 'en-US' ? 'English' : 'French';
  const sourceLangLabel = sourceLanguage === 'en-US' ? 'English' : 'French';
  const targetLangCode = targetLanguage === 'en-US' ? 'en' : 'fr';

  // Build system prompt with Brand Brain context
  const brandIdentity = aiContext.brand?.brand_identity || '';
  const toneVoice = aiContext.brand?.tone_voice || '';
  const translationRules = aiContext.translation?.translation_rules || '';

  const systemPrompt = `You are a professional translator for MEMOPYK, a premium video digitization service.

${brandIdentity ? `## Brand Identity\n${brandIdentity}\n` : ''}
${toneVoice ? `## Tone of Voice\n${toneVoice}\n` : ''}
${translationRules ? `## Translation Guidelines\n${translationRules}\n` : ''}

You are translating blog content from ${sourceLangLabel} to ${targetLangLabel}.

CRITICAL RULES:
1. Preserve ALL [IMAGE X] placeholders EXACTLY as they are — do not translate, move, or remove them
2. Maintain the same HTML structure and formatting (all tags like <h2>, <p>, <strong>, <ul>, <li>, etc.)
3. Translate ONLY the text content between HTML tags
4. For the slug, create a ${targetLangLabel}-friendly URL (lowercase, hyphens, no special characters or accents)
5. NEVER use em dashes (—) — use regular hyphens (-) instead
6. Keep brand names untranslated: MEMOPYK, VHS, Super 8, etc.
7. Adapt cultural references appropriately for the target audience
8. Match the tone described in the brand guidelines above

${aiContext.publishedPostsList ? `## Published Posts for Reference\n${aiContext.publishedPostsList}` : ''}

Return your response in this EXACT format (no markdown formatting like **bold**):

TITLE: [translated title here]
SLUG: [${targetLangCode}-url-slug-here]
DESCRIPTION: [translated description here]
CONTENT:
[translated HTML content here]`;

  // Build user message
  const userMessage = `Translate the following blog post metadata and content from ${sourceLangLabel} to ${targetLangLabel}.

Current Title: ${title || 'Untitled'}
Current Slug: ${slug || ''}
Current Description: ${description || ''}

Content to translate:
${text}`;

  // Call Claude API
  const anthropic = new Anthropic({ apiKey });

  console.log(`🌐 Calling Claude API for translation: ${sourceLangLabel} → ${targetLangLabel}`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  });

  // Extract text from response
  const translatedText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  if (!translatedText) {
    throw new Error('Empty response from translation service');
  }

  // Parse the response to extract title, slug, description, and content
  const titleMatch = translatedText.match(/\*\*TITLE:\*\*\s*(.+)|TITLE:\s*(.+)/i);
  const slugMatch = translatedText.match(/\*\*SLUG:\*\*\s*(.+)|SLUG:\s*(.+)/i);
  const descMatch = translatedText.match(/\*\*DESCRIPTION:\*\*\s*(.+)|DESCRIPTION:\s*(.+)/i);
  const contentMatch = translatedText.match(/\*\*CONTENT:\*\*\s*([\s\S]+)|CONTENT:\s*([\s\S]+)/i);

  if (!titleMatch || !slugMatch || !descMatch || !contentMatch) {
    throw new Error('Translation response format invalid. Could not parse TITLE, SLUG, DESCRIPTION, or CONTENT.');
  }

  const parsedTitle = (titleMatch[1] || titleMatch[2]).trim();
  const parsedSlug = (slugMatch[1] || slugMatch[2]).trim();
  const parsedDescription = (descMatch[1] || descMatch[2]).trim();
  const parsedContent = (contentMatch[1] || contentMatch[2]).trim();

  console.log(`✅ Translation complete: ${sourceLangLabel} → ${targetLangLabel}`);

  return {
    title: parsedTitle,
    slug: parsedSlug,
    description: parsedDescription,
    content: parsedContent,
    rawResponse: translatedText,
    model: response.model,
    usage: response.usage
  };
}

/**
 * Fetch AI context from Supabase
 */
export async function fetchAIContext(supabase: any): Promise<AIContext> {
  // Fetch AI context entries
  const { data: contextEntries, error: contextError } = await supabase
    .from('ai_context')
    .select('key, content, category')
    .order('category')
    .order('sort_order');

  if (contextError) {
    console.error('Error fetching AI context:', contextError);
    throw new Error('Failed to fetch AI context');
  }

  // Group context entries by category
  const grouped: Record<string, Record<string, string>> = {};
  for (const entry of contextEntries || []) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = {};
    }
    grouped[entry.category][entry.key] = entry.content;
  }

  // Fetch published posts for reference
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, language')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  const publishedPostsList = (posts || [])
    .map((p: any) => `- ${p.title} (/${p.language}/blog/${p.slug})`)
    .join('\n');

  return {
    brand: grouped.brand || {},
    translation: grouped.translation || {},
    publishedPostsList
  };
}

/**
 * Extract images from HTML content and replace with placeholders
 */
export function extractImagesFromContent(contentHtml: string): {
  textWithPlaceholders: string;
  images: string[];
} {
  const images: string[] = [];
  let placeholderCount = 0;

  // Replace images (with or without wrapper elements like <figure>) with [IMAGE X] placeholders
  // This regex captures: <figure>...</figure>, <span>...</span> containing <img>, or bare <img> tags
  const textWithPlaceholders = contentHtml.replace(
    /(<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>)|(<span[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/span>)|(<img[^>]*>)/gi,
    (fullMatch) => {
      placeholderCount++;
      images.push(fullMatch);
      return `[IMAGE ${placeholderCount}]`;
    }
  );

  return { textWithPlaceholders, images };
}

/**
 * Re-insert images into translated content
 */
export function reinsertImages(translatedContent: string, images: string[]): string {
  let result = translatedContent;
  images.forEach((imgTag, index) => {
    const placeholder = `[IMAGE ${index + 1}]`;
    result = result.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      imgTag
    );
  });
  return result;
}
