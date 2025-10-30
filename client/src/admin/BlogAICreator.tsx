import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, CheckCircle, AlertCircle, Loader2, Send, Edit3 } from 'lucide-react';
import { HtmlEditor } from './HtmlEditor';
import { HeroImageUpload } from './HeroImageUpload';
import { BlogTagSelector } from './BlogTagSelector';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import DOMPurify from 'dompurify';

const MASTER_PROMPT_TEMPLATE = `You are an expert content writer for MEMOPYK, a premium memory film production company. You create engaging, SEO-optimized blog posts about photography, videography, family memories, storytelling, and creative visual arts.

YOUR WRITING STYLE:
- Professional yet warm and conversational
- Practical advice with actionable tips readers can use immediately
- Storytelling that connects emotionally with families preserving memories
- Clear structure with scannable headings and short paragraphs
- Include real-world examples and specific techniques
- Balance educational content with inspiration

TOPIC: {{TOPIC}}
LANGUAGE: {{LOCALE}}
SEO KEYWORDS: {{SEO_KEYWORDS}}

CONTENT REQUIREMENTS:
- 800-1000 words of high-quality, original content
- Start with a compelling hook that draws readers in
- Organize with clear H2 and H3 headings for easy scanning
- Include practical tips, numbered steps, or how-to guidance where relevant
- End with a call-to-action or inspiring conclusion
- Naturally incorporate SEO keywords without keyword stuffing

HTML STRUCTURE GUIDANCE (Semantic Elements Only - NO inline styles):
Use these semantic HTML elements to create well-structured, scannable content:

HEADINGS (for hierarchy and SEO):
- <h2> - Main section headings (like chapter titles)
- <h3> - Subsection headings under H2
- <h4> - Minor subsections if needed
→ Use logical hierarchy: H2 → H3 → H4 (don't skip levels)

LISTS (for step-by-step guides, tips, comparisons):
- <ul><li>item</li></ul> - Unordered lists for general points
- <ol><li>step</li></ol> - Ordered lists for sequential steps
→ Perfect for "5 Tips", "How-to Steps", feature lists

EMPHASIS (semantic, not visual):
- <strong>important text</strong> - Strong importance
- <em>emphasized text</em> - Stress emphasis
→ Use sparingly for key concepts

BLOCKQUOTES (for testimonials, quotes, callouts):
- <blockquote>Pro Tip: Your advice here</blockquote>
→ Great for highlighting key takeaways or expert tips

TABLES (for comparisons, data, feature matrices):
- <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
→ Use for "Before vs After", "Feature Comparison", pricing tables

IMAGE PLACEHOLDERS - Strategic Visual Breaks:
Include 2-4 visible red placeholder paragraphs throughout the content suggesting where images should be inserted.
Each placeholder should specify:
- What type of image (e.g., "Baby portrait with natural window lighting")
- Orientation: Portrait (800×1200px) or Landscape (1200×800px)
- Purpose/context (e.g., "Visual break after introduction", "Illustrate the lighting technique")

FORMAT: <p style='color: #cc0000; font-weight: bold;'>📸 IMAGE SUGGESTION: [description] | [Portrait/Landscape] [dimensions] | [purpose]</p>

EXAMPLE PLACEMENTS:
<p>Introduction paragraph about the topic...</p>
<p style='color: #cc0000; font-weight: bold;'>📸 IMAGE SUGGESTION: Hero shot showing the main subject | Landscape 1200×800px | Visual break after introduction</p>
<h2>Section Title</h2>
<p>Explanation of technique...</p>
<p style='color: #cc0000; font-weight: bold;'>📸 IMAGE SUGGESTION: Before/after comparison showing natural vs artificial light | Landscape 1200×800px | Illustrate the lighting difference</p>

IMPORTANT: Output clean semantic HTML with NO inline styles (no color, margin, padding, font-size).
The frontend CSS automatically handles all visual formatting for brand consistency.

CRITICAL RULES FOR JSON VALIDITY:
1. Use SINGLE QUOTES for all HTML attributes: <a href='url'> NOT <a href="url">
2. NO Markdown syntax: NO [text](url), NO ![alt](url), NO **bold**
3. NO backslashes, NO percent-encoding (%22, %3A)
4. Keep content focused and concise

HTML TAGS ALLOWED (with single quotes for attributes):
- <h2>, <h3>, <h4>
- <p>text</p>
- <ul><li>item</li></ul>
- <a href='url'>text</a>
- <img src='url' alt='description'>
- <strong>bold</strong>, <em>italic</em>
- <blockquote>quote</blockquote>
- <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>

OUTPUT EXACTLY THIS JSON (no code fences, no explanations):

{
  "title": "Your Blog Title Here",
  "slug": "your-blog-slug-here",
  "language": "{{LOCALE}}",
  "status": "{{STATUS}}",
  "published_at": null,
  "description": "150-character summary of the post",
  "hero_caption": "Caption for hero image or null",
  "content": "<h2>Introduction</h2><p>Your HTML content here with SINGLE QUOTES for attributes...</p>",
  "read_time_minutes": 6,
  "image": null,
  "seo": {
    "title": "SEO title (60 chars max)",
    "description": "SEO description (160 chars max)",
    "og_image": null
  },
  "tags": ["tag1", "tag2", "tag3"],
  "author": null,
  "is_featured": false,
  "featured_order": null,
  "assets_manifest": [
    { "ref": "hero", "alt": "Image description", "notes": "Use as hero image" }
  ]
}`;

export const BlogAICreator: React.FC = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [seoKeywords, setSeoKeywords] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedPost, setValidatedPost] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const generatePrompt = () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for the blog post",
        variant: "destructive"
      });
      return;
    }

    const prompt = MASTER_PROMPT_TEMPLATE
      .replace('{{TOPIC}}', topic)
      .replace('{{LOCALE}}', language)
      .replace('{{STATUS}}', status)
      .replace('{{PUBLISH_NOW}}', (publishedAt ? publishedAt.toISOString() : 'null'))
      .replace('{{SEO_KEYWORDS}}', seoKeywords || 'none');

    setGeneratedPrompt(prompt);
    toast({
      title: "Prompt generated!",
      description: "Copy this prompt and paste it into your AI assistant"
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive"
      });
    }
  };

  const fixCommonJsonIssues = (jsonStr: string): string => {
    // ROBUST JSON FIXING - Manual field extraction and escaping
    let fixed = jsonStr.trim();
    
    // 1. Remove markdown code fences
    fixed = fixed.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '');
    
    // 2. Fix smart quotes
    fixed = fixed.replace(/[\u201C\u201D]/g, '"');
    fixed = fixed.replace(/[\u2018\u2019]/g, "'");
    
    // 3. Manual JSON reconstruction
    try {
      // Parse out individual fields manually
      const extractField = (fieldName: string, json: string): string | null => {
        const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"([^]*?)(?=",\\s*"|"})`);
        const match = json.match(pattern);
        return match ? match[1] : null;
      };
      
      // Try to extract key fields
      const title = extractField('title', fixed);
      const slug = extractField('slug', fixed);
      const language = extractField('language', fixed);
      const description = extractField('description', fixed);
      const heroCaption = extractField('hero_caption', fixed);
      
      // For content field, we need special handling - find it by position
      const contentStart = fixed.indexOf('"content":');
      if (contentStart !== -1) {
        const contentValueStart = fixed.indexOf('"', contentStart + 10) + 1;
        
        // Find the end of content - look for "image" or "seo" field
        let contentEnd = fixed.indexOf('",\n  "image":', contentValueStart);
        if (contentEnd === -1) contentEnd = fixed.indexOf('",\n  "seo":', contentValueStart);
        if (contentEnd === -1) contentEnd = fixed.indexOf('",\n  "tags":', contentValueStart);
        
        if (contentEnd !== -1) {
          let rawContent = fixed.substring(contentValueStart, contentEnd);
          
          // Clean the content:
          // 1. Remove Markdown links [text](url) → text
          rawContent = rawContent.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
          
          // 2. Escape all unescaped quotes
          // Temporarily replace escaped quotes, escape all quotes, then restore
          rawContent = rawContent.split('\\"').join('§§ESCAPED§§');
          rawContent = rawContent.split('"').join('\\"');
          rawContent = rawContent.split('§§ESCAPED§§').join('\\"');
          
          // Rebuild JSON with cleaned content
          const beforeContent = fixed.substring(0, contentValueStart);
          const afterContent = fixed.substring(contentEnd);
          fixed = beforeContent + rawContent + afterContent;
        }
      }
      
    } catch (e) {
      console.error('Auto-fix error:', e);
    }
    
    return fixed.trim();
  };

  const validateJson = (jsonStr: string): { valid: boolean; data?: any; error?: string } => {
    // First, try to fix common issues
    const cleanedJson = fixCommonJsonIssues(jsonStr);
    
    try {
      const data = JSON.parse(cleanedJson);
      
      // Required top-level fields for NEW SCHEMA
      const requiredFields = ['title', 'slug', 'language', 'status', 'content'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return { valid: false, error: `Missing required field: ${field}` };
        }
      }

      // Validate language
      if (!['en-US', 'fr-FR'].includes(data.language)) {
        return { valid: false, error: `Invalid language: ${data.language}. Must be "en-US" or "fr-FR"` };
      }

      // Validate status
      if (!['draft', 'published'].includes(data.status)) {
        return { valid: false, error: `Invalid status: ${data.status}. Must be "draft" or "published"` };
      }

      // Validate content is string (HTML)
      if (typeof data.content !== 'string') {
        return { valid: false, error: 'Content must be a string (HTML)' };
      }

      // Validate content is not empty
      if (data.content.trim().length === 0) {
        return { valid: false, error: 'Content cannot be empty' };
      }

      return { valid: true, data };
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.log('Problematic JSON (first 500 chars):', cleanedJson.substring(0, 500));
      console.log('JSON around error position:', cleanedJson.substring(3500, 3600));
      const errorMsg = error instanceof Error ? error.message : 'Unknown parse error';
      return { valid: false, error: `Invalid JSON: ${errorMsg}. Check browser console for details.` };
    }
  };

  const sanitizeContent = (html: string): string => {
    // Sanitize HTML with DOMPurify - includes table and video support
    const cleaned = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p','h2','h3','h4','ul','ol','li','blockquote','pre','code','strong','em','a','img','br','hr','table','thead','tbody','tr','th','td','video','source'],
      ALLOWED_ATTR: ['href','target','rel','src','alt','title','loading','controls','poster','type']
    })
    // Normalize external links: add rel="noopener nofollow"
    .replace(/<a\s+([^>]*href="https?:\/\/[^"]+"[^>]*)>/gi, (_m, attrs) => {
      if (!attrs.includes('rel=')) {
        return `<a ${attrs} rel="noopener nofollow">`;
      }
      return `<a ${attrs.replace(/rel="[^"]*"/, 'rel="noopener nofollow"')}>`;
    })
    // Normalize images: ensure loading="lazy"
    .replace(/<img\s+([^>]*)(?<!loading="lazy")>/gi, (_m, attrs) => {
      if (!attrs.includes('loading=')) {
        return `<img ${attrs} loading="lazy">`;
      }
      return `<img ${attrs}>`;
    })
    // Normalize videos: ensure controls attribute
    .replace(/<video\s+([^>]*)(?<!controls)>/gi, (_m, attrs) => {
      if (!attrs.includes('controls')) {
        return `<video ${attrs} controls>`;
      }
      return `<video ${attrs}>`;
    });

    return cleaned;
  };

  const handleValidateAndEdit = () => {
    const validation = validateJson(aiJsonInput);
    if (validation.valid) {
      setValidationError(null);
      setValidatedPost(validation.data);
      setIsEditing(true);
      toast({
        title: "Validation passed",
        description: "Review and refine your content below, then publish your blog post"
      });
    } else {
      setValidationError(validation.error || 'Invalid JSON');
      toast({
        title: "Validation failed",
        description: validation.error,
        variant: "destructive"
      });
    }
  };

  const createBlogPost = async () => {
    if (!validatedPost) {
      toast({
        title: "No validated post",
        description: "Please validate the JSON first",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Sanitize the content before submitting
      const sanitizedContent = sanitizeContent(validatedPost.content);
      const postData = {
        ...validatedPost,
        content: sanitizedContent,
        status,
        published_at: publishedAt ? publishedAt.toISOString() : null
      };

      const response = await fetch('/api/admin/blog/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create blog post');
      }

      const result = await response.json();
      
      // Assign tags to the newly created post
      if (selectedTagIds.length > 0 && result.data?.id) {
        try {
          await fetch(`/api/admin/blog/posts/${result.data.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: selectedTagIds })
          });
        } catch (tagError) {
          console.error('Failed to assign tags:', tagError);
          // Don't fail the whole operation if tags fail
        }
      }
      
      toast({
        title: "Success!",
        description: `Blog post "${result.title}" published to Supabase! View it on your blog or create another post.`,
      });

      // Reset form
      setTopic('');
      setSeoKeywords('');
      setSelectedTagIds([]);
      setStatus('draft');
      setPublishedAt(null);
      setGeneratedPrompt('');
      setAiJsonInput('');
      setValidationError(null);
      setValidatedPost(null);
      setIsEditing(false);

    } catch (error: any) {
      console.error('Error creating blog post:', error);
      toast({
        title: "Creation failed",
        description: error.message || 'Failed to publish blog post to Supabase',
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Input Form */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Step 1: Configure Post</CardTitle>
              <CardDescription>Set up the basic parameters for your blog post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., The Ultimate Guide to Digitizing Old Photos in 2025"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="input-topic"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val as 'en-US' | 'fr-FR')}>
                    <SelectTrigger id="language" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (en-US)</SelectItem>
                      <SelectItem value="fr-FR">French (fr-FR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <StatusSelector
                  value={status}
                  onChange={(val) => setStatus(val)}
                  label="Status *"
                />
              </div>

              <PublishedAtPicker
                value={publishedAt}
                onChange={setPublishedAt}
                label="Published At (optional)"
              />

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">SEO Keywords (optional)</Label>
                <Input
                  id="seoKeywords"
                  placeholder="e.g., photo digitization, memory preservation, scanning"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  data-testid="input-seo-keywords"
                />
                <p className="text-xs text-gray-500">Comma-separated keywords for SEO focus</p>
              </div>

              <Button
                onClick={generatePrompt}
                className="w-full bg-[#D67C4A] hover:bg-[#C16B3A]"
                data-testid="button-generate-prompt"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Prompt
              </Button>
            </CardContent>
          </Card>

          {/* Right Column: Generated Prompt */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Step 2: Copy Prompt to AI</CardTitle>
              <CardDescription>Give this prompt to Claude, ChatGPT, or your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedPrompt ? (
                <>
                  <Textarea
                    value={generatedPrompt}
                    readOnly
                    className="font-mono text-xs h-[400px] bg-gray-50"
                    data-testid="textarea-generated-prompt"
                  />
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="w-full"
                    data-testid="button-copy-prompt"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                </>
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 text-center px-4">
                    Configure the post parameters and click "Generate AI Prompt" to create your prompt
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: JSON Input & Create */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Step 3: Paste AI's JSON Response</CardTitle>
            <CardDescription>
              After giving the prompt to ChatGPT/Claude, copy the JSON response it returns and paste it below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiJson">AI-Generated JSON Response *</Label>
              <Textarea
                id="aiJson"
                placeholder='{"title": "Your Blog Title", "slug": "your-slug", "content": "<h2>...</h2>", ...}'
                value={aiJsonInput}
                onChange={(e) => {
                  setAiJsonInput(e.target.value);
                  setValidationError(null);
                }}
                className="font-mono text-sm h-[300px]"
                data-testid="textarea-ai-json"
              />
              {validationError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationError}</span>
                </div>
              )}
              {aiJsonInput && !validationError && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>JSON format looks good!</span>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const fixed = fixCommonJsonIssues(aiJsonInput);
                    setAiJsonInput(fixed);
                    toast({
                      title: "Auto-fix applied",
                      description: "Common JSON issues have been repaired. Now validate."
                    });
                  }}
                  variant="outline"
                  disabled={!aiJsonInput.trim()}
                  data-testid="button-autofix"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Auto-Fix
                </Button>

                <Button
                  onClick={handleValidateAndEdit}
                  variant="outline"
                  className="flex-1"
                  disabled={!aiJsonInput.trim()}
                  data-testid="button-validate"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Validate & Edit Content
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setValidatedPost(null);
                }}
                variant="outline"
                data-testid="button-back"
              >
                ← Back to JSON Input
              </Button>
            )}
          </CardContent>
        </Card>

        {/* WYSIWYG Editor - Shows after validation */}
        {isEditing && validatedPost && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Step 4: Refine Your Content</CardTitle>
              <CardDescription>
                Use the rich text editor to add tables, format text, and perfect your blog post before publishing to Supabase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Post Title</Label>
                <Input
                  value={validatedPost.title}
                  onChange={(e) => setValidatedPost({ ...validatedPost, title: e.target.value })}
                  className="font-semibold"
                  data-testid="input-post-title"
                />
              </div>

              <HeroImageUpload
                currentImageUrl={validatedPost.hero_url}
                onImageChange={(url) => setValidatedPost({ ...validatedPost, hero_url: url })}
              />

              <BlogTagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
              />

              <div className="space-y-2">
                <Label>Content (HTML Editor)</Label>
                <HtmlEditor
                  value={validatedPost.content}
                  onChange={(content) => setValidatedPost({ ...validatedPost, content })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  onClick={createBlogPost}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isCreating}
                  data-testid="button-submit-to-supabase"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing to Supabase...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish Blog Post
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
