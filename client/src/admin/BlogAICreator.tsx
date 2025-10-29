import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react';

const MASTER_PROMPT_TEMPLATE = `MASTER PROMPT (give this to your marketing AI)
You are creating a new blog post for a Directus CMS that powers memopyk.com.
Return **one JSON object only** (no prose) that conforms EXACTLY to the NEW SIMPLE SCHEMA below.

### INPUTS
- topic: {{TOPIC}}
- locale: {{LOCALE}}
- status: {{STATUS}}
- publish_now: {{PUBLISH_NOW}}
- seo_focus_keywords: {{SEO_KEYWORDS}}

### CRITICAL RULES - READ CAREFULLY
1. **HTML ONLY** - NO Markdown syntax anywhere in the content field
2. **KEEP IT SHORT** - Max 800-1000 words to ensure complete JSON (no truncation)
3. **SIMPLE URLs** - Plain URLs only, no escaped characters, no Markdown link syntax
4. **VALID JSON** - Must be parseable, complete, and properly closed

### GOALS
- Produce an authoritative, helpful post with clear sections and scannable structure.
- Use **pure HTML** for all content (headings, paragraphs, lists, links, blockquotes, images, and tables).
- Inline images use: <img src="https://cms.memopyk.com/assets/PLACEHOLDER_ID" alt="..." loading="lazy">
- Tables must use standard HTML table syntax with proper structure.

### DIRECTUS DATA MODEL (NEW SIMPLE SCHEMA)

{
  "title": string,                          // H1 heading (appears in hero)
  "slug": string-kebab-case,                // URL slug (e.g., "family-reunion-tips")
  "language": "en-US" | "fr-FR",            // EXACT match - must be one of these
  "status": "draft" | "published",          // Content status
  "published_at": iso8601|null,             // ISO date if publish_now=true, else null
  "description": string,                    // Excerpt/teaser (150–200 chars, appears in cards)
  "hero_caption": string|null,              // Optional caption for hero image
  "content": string,                        // **FULL HTML CONTENT** (see format below)
  "read_time_minutes": number|null,         // Estimated read time (e.g., 5)
  "image": null,                            // Hero image file ID (always null in JSON - added later)
  "seo": {                                  // Optional SEO metadata
    "title": string,                        // ≤ 60 chars; fallback to title
    "description": string,                  // 150–160 chars; fallback to description
    "og_image": null                        // Always null - added later
  },
  "tags": [string, string],                 // Keywords array (e.g., ["family", "reunion", "tips"])
  "author": null,                           // Author ID (always null - set by editor)
  "is_featured": false,                     // Featured flag
  "featured_order": null                    // Sort order for featured posts
}

### CONTENT HTML FORMAT

The "content" field should contain complete HTML with:
- Headings: <h2>, <h3>, <h4> (no <h1> - that's the title)
- Paragraphs: <p>...</p>
- Lists: <ul><li>...</li></ul> or <ol><li>...</li></ol>
- Links: <a href="https://example.com">link text</a> (plain URL, NO Markdown [text](url) syntax)
- Blockquotes: <blockquote>...</blockquote>
- Code: <code>...</code>
- Tables: <table><tr><th>...</th></tr><tr><td>...</td></tr></table>
- Images: <img src="https://cms.memopyk.com/assets/PLACEHOLDER_ID" alt="..." loading="lazy">

⚠️ FORBIDDEN SYNTAX:
- NO Markdown links like [text](url) - use <a href="url">text</a> instead
- NO escaped characters like \[ \] \( \) in URLs
- NO Markdown image syntax like ![alt](url) - use <img> tags
- NO backticks for code blocks - use <code> or <pre> tags

IMPORTANT: ALL images must use PLACEHOLDER_ID as the file ID. List actual image requirements in "assets_manifest".

### EXAMPLE HTML CONTENT

<h2>Introduction</h2>
<p>Start with a compelling hook paragraph that draws readers in.</p>

<h3>Key Benefits</h3>
<ul>
  <li>First benefit with details</li>
  <li>Second benefit explanation</li>
  <li>Third compelling reason</li>
</ul>

<h3>Comparison Table</h3>
<table>
  <tr>
    <th>Feature</th>
    <th>DIY Approach</th>
    <th>Professional Service</th>
  </tr>
  <tr>
    <td>Quality</td>
    <td>Variable</td>
    <td>Consistent, High</td>
  </tr>
  <tr>
    <td>Time Required</td>
    <td>20+ hours</td>
    <td>2 hours</td>
  </tr>
</table>

<p><img src="https://cms.memopyk.com/assets/PLACEHOLDER_ID" alt="Family gathering around photo album" loading="lazy"></p>

<h3>Conclusion</h3>
<p>Wrap up with actionable next steps and clear takeaways.</p>

### ASSETS MANIFEST

List all images needed (hero + inline) in this format:
{
  "assets_manifest": [
    { "ref": "hero", "alt": "Family reunion group photo", "notes": "Use as hero image" },
    { "ref": "photo_album", "alt": "Family gathering around photo album", "notes": "Inline after comparison table" }
  ]
}

### QUALITY BARS
- Tone: clear, helpful, non-hype; practical tips + short paragraphs
- SEO: use target keywords naturally; include 2–3 FAQ-style subheads
- Tables: use proper HTML table structure with <thead> and <tbody> when appropriate
- Images: describe clearly in assets_manifest for editor to upload later
- Length: 800-1000 words MAX to avoid JSON truncation issues

### RETURN FORMAT
Return ONLY the JSON object with all fields. No commentary, no markdown fence, just pure JSON.

⚠️ FINAL CHECKS BEFORE RETURNING:
1. Is the "content" field PURE HTML (no Markdown)?
2. Are all URLs plain strings (no escaped characters)?
3. Is the total word count under 1000?
4. Is the JSON valid and complete (properly closed)?

Example minimal structure:
{
  "title": "Your Title Here",
  "slug": "your-slug-here",
  "language": "en-US",
  "status": "draft",
  "published_at": null,
  "description": "Compelling excerpt...",
  "hero_caption": "Optional hero caption",
  "content": "<h2>Intro</h2><p>Content...</p>",
  "read_time_minutes": 5,
  "image": null,
  "seo": {
    "title": "SEO title",
    "description": "SEO description"
  },
  "tags": ["keyword1", "keyword2"],
  "author": null,
  "is_featured": false,
  "featured_order": null,
  "assets_manifest": [
    { "ref": "hero", "alt": "Alt text", "notes": "Usage notes" }
  ]
}`;

export const BlogAICreator: React.FC = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishNow, setPublishNow] = useState(false);
  const [seoKeywords, setSeoKeywords] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
      .replace('{{PUBLISH_NOW}}', publishNow.toString())
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
    // Try to fix common JSON issues from AI-generated content
    let fixed = jsonStr;
    
    // Remove any markdown code fences
    fixed = fixed.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '');
    
    // Fix smart quotes to regular quotes (common AI issue)
    fixed = fixed.replace(/[\u201C\u201D]/g, '"');
    fixed = fixed.replace(/[\u2018\u2019]/g, "'");
    
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

  const createBlogPost = async () => {
    if (!aiJsonInput.trim()) {
      toast({
        title: "JSON required",
        description: "Please paste the AI-generated JSON",
        variant: "destructive"
      });
      return;
    }

    // Validate JSON
    const validation = validateJson(aiJsonInput);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid JSON');
      toast({
        title: "Validation failed",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setValidationError(null);
    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/blog/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create blog post');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Blog post "${result.title}" created successfully in Directus`,
      });

      // Reset form
      setTopic('');
      setSeoKeywords('');
      setGeneratedPrompt('');
      setAiJsonInput('');
      setValidationError(null);

    } catch (error: any) {
      console.error('Error creating blog post:', error);
      toast({
        title: "Creation failed",
        description: error.message || 'Failed to create blog post in Directus',
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-[#D67C4A]" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Blog Post Creator</h1>
            <p className="text-gray-600 mt-1">Generate prompts, paste AI responses, publish to Directus</p>
          </div>
        </div>

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

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as 'draft' | 'published')}>
                    <SelectTrigger id="status" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="publishNow"
                  checked={publishNow}
                  onCheckedChange={(checked) => setPublishNow(checked as boolean)}
                  data-testid="checkbox-publish-now"
                />
                <Label htmlFor="publishNow" className="cursor-pointer">
                  Publish immediately (sets published_at to now)
                </Label>
              </div>

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
            <CardTitle>Step 3: Paste AI Response & Create Post</CardTitle>
            <CardDescription>
              Paste the JSON response from your AI assistant, validate it, and publish to Directus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aiJson">AI-Generated JSON *</Label>
              <Textarea
                id="aiJson"
                placeholder='{"title": "...", "slug": "...", "language": "en-US", ...}'
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

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  const validation = validateJson(aiJsonInput);
                  if (validation.valid) {
                    setValidationError(null);
                    toast({
                      title: "Validation passed",
                      description: "JSON structure is valid and ready to create"
                    });
                  } else {
                    setValidationError(validation.error || 'Invalid JSON');
                    toast({
                      title: "Validation failed",
                      description: validation.error,
                      variant: "destructive"
                    });
                  }
                }}
                variant="outline"
                className="flex-1"
                disabled={!aiJsonInput.trim()}
                data-testid="button-validate"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate JSON
              </Button>

              <Button
                onClick={createBlogPost}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isCreating || !aiJsonInput.trim()}
                data-testid="button-create-post"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating in Directus...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create Blog Post in Directus
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
