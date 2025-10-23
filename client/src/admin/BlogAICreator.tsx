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
Return **one JSON object only** (no prose) that conforms EXACTLY to the schema below.

### INPUTS
- topic: {{TOPIC}}
- locale: {{LOCALE}}
- status: {{STATUS}}
- publish_now: {{PUBLISH_NOW}}
- seo_focus_keywords: {{SEO_KEYWORDS}}

### GOALS
- Produce an authoritative, helpful post with clear sections and scannable structure.
- Use **Markdown** for headings, lists, links, blockquotes, and **tables** (tables must be valid Markdown).
- Create content blocks using the "block_content_section_v3" layouts described below.

### DIRECTUS DATA MODEL

Top-level post fields:
{
  "title": string,                          // H1
  "slug": string-kebab-case,                // URL slug
  "language": "en-US" | "fr-FR",            // EXACT match
  "status": "draft" | "published",
  "published_at": iso8601|null,             // if publish_now else null
  "description": string,                    // teaser (150–200 chars)
  "author_name": string,                    // free text; editor can map to a user later
  "image_featured": null,                   // always null (assets are added later)
  "meta_title": string,                     // ≤ 60 chars; fallback to title
  "meta_description": string,               // 150–160 chars; fallback to description
  "blocks": [ Block, Block, ... ]           // ordered list; first block renders first
}

Supported Block types:

1) Rich text (simple article sections)
{
  "type": "block_richtext",
  "text": "## Section title\\nBody in **Markdown** ... (tables allowed)"
}

2) Content Section (v3) – flexible layouts
{
  "type": "block_content_section_v3",
  "layout": "text-only" | "image-left" | "image-right" | "image-full" | "two-images" | "three-images",
  "text": "### Heading\\nBody in Markdown …",
  "caption": "Optional caption",
  "alt": "Accessible alt text for key image(s)",

  // images are file IDs in Directus; if unknown, set null and add a human-friendly label in assets_manifest
  "image_primary": null,
  "image_secondary": null,
  "image_third": null,

  // layout controls
  "media_width": "25|33|40|50|60|66|75" | null,   // for side-by-side
  "media_align": "left|center|right"    | null,
  "max_width": "content|wide|full"      | "content",
  "spacing_top": "none|sm|md|lg"        | "md",
  "spacing_bottom": "none|sm|md|lg"     | "md",
  "background": "default|light|dark"    | "default",

  // editor presentation controls
  "image_fit": "natural|cover|contain"  | "natural",
  "image_height": number|null,          // e.g., 320 (px) when fit is cover/contain
  "gutter": number|null,                 // e.g., 16 (px) for two/three-images
  "corner_radius": number|null,          // e.g., 12
  "image_shadow": true|false             | false,
  "block_shadow": true|false             | false,
  "caption_align": "left|center|right"  | "center",
  "caption_position": "below|above|overlay" | "below",
  "caption_bg": "none|light|dark"       | "none"
}

3) (Optional) Gallery
{
  "type": "block_gallery",
  "title": "Gallery title",
  "intro": "Markdown intro",
  "images": []     // ALWAYS empty; assets added later by editor
}

### IMPORTANT CONTENT RULES
- Use the **first block** as a compelling intro with an H2 and short hook.
- Include at least one content_section_v3 with layout "two-images" for visual comparison if relevant.
- If you need internal links, add Markdown links and also list them in \`internal_links\` at the end.
- If you reference images, set \`image_*: null\` and describe them in \`assets_manifest\` with a short label.

### OUTPUT FORMAT
Return a single JSON object:
{
  ...post fields...,
  "blocks": [ ... ],
  "internal_links": [
    { "label": "FAQ: Photo Restoration", "url": "/en-US/faq/photo-restoration" }
  ],
  "assets_manifest": [
    { "ref": "hero_01", "alt": "Grandmother holding a vintage photo", "notes": "Use as featured image" },
    { "ref": "compare_left",  "alt": "DIY scan sample", "notes": "Left image for two-images block" },
    { "ref": "compare_right", "alt": "Pro scan sample", "notes": "Right image for two-images block" }
  ]
}

### QUALITY BARS
- Tone: clear, helpful, non-hype; practical tips + short paragraphs.
- SEO: use target keywords naturally; include 2–3 FAQ-style subheads.
- Tables: use GitHub-flavored Markdown table syntax (| col | col |).

### RETURN
Return ONLY the JSON object. No commentary.`;

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

  const validateJson = (jsonStr: string): { valid: boolean; data?: any; error?: string } => {
    try {
      const data = JSON.parse(jsonStr);
      
      // Required top-level fields
      const requiredFields = ['title', 'slug', 'language', 'status', 'description', 'blocks'];
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

      // Validate blocks is array
      if (!Array.isArray(data.blocks)) {
        return { valid: false, error: 'Blocks must be an array' };
      }

      // Validate each block has type
      for (let i = 0; i < data.blocks.length; i++) {
        const block = data.blocks[i];
        if (!block.type) {
          return { valid: false, error: `Block ${i + 1} missing type field` };
        }
        if (!['block_richtext', 'block_content_section_v3', 'block_gallery'].includes(block.type)) {
          return { valid: false, error: `Block ${i + 1} has invalid type: ${block.type}` };
        }
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
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
