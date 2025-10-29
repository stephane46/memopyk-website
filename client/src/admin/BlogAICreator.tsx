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

const MASTER_PROMPT_TEMPLATE = `ROLE: You are a JSON generator for a Directus CMS blog. You MUST return valid JSON only.

INPUTS:
- Topic: {{TOPIC}}
- Language: {{LOCALE}}
- Status: {{STATUS}}
- Publish now: {{PUBLISH_NOW}}
- SEO keywords: {{SEO_KEYWORDS}}

TASK: Create blog post content following this TWO-PHASE process:

═══════════════════════════════════════════════════════════════════════════════
PHASE 1: DRAFT HTML CONTENT (800-1000 words max)
═══════════════════════════════════════════════════════════════════════════════

Write your HTML in a scratchpad first. Use ONLY these tags:
- Headings: <h2>, <h3>, <h4>
- Paragraphs: <p>text</p>
- Lists: <ul><li>item</li></ul>
- Links: <a href="https://example.com">text</a>
- Images: <img src="https://cms.memopyk.com/assets/PLACEHOLDER_ID" alt="description" loading="lazy">
- Tables: <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
- Emphasis: <strong>bold</strong>, <em>italic</em>
- Blockquotes: <blockquote>quote</blockquote>

FORBIDDEN - DO NOT USE:
❌ [text](url) — Use <a href="url">text</a>
❌ ![alt](url) — Use <img src="url" alt="alt">
❌ **text** or *text* — Use <strong> or <em>
❌ Backslashes before quotes (\")
❌ Percent-encoded characters (%22, %3A)
❌ Any square brackets [ ] in your HTML

═══════════════════════════════════════════════════════════════════════════════
PHASE 2: SELF-CHECK AND VALIDATE
═══════════════════════════════════════════════════════════════════════════════

Before creating JSON, search your HTML content for these FORBIDDEN patterns:
1. ✗ Search for [ or ] — If found, you're using Markdown syntax. STOP and fix.
2. ✗ Search for backslash-quote — Escaped quotes break JSON. Remove all backslashes.
3. ✗ Search for %22 or %3A — Percent-encoding breaks JSON. Use plain characters.
4. ✗ Count words — If over 1000, cut content down.

If ANY forbidden pattern found → REGENERATE your HTML from Phase 1 before continuing.

═══════════════════════════════════════════════════════════════════════════════
PHASE 3: POPULATE JSON SKELETON
═══════════════════════════════════════════════════════════════════════════════

Fill this EXACT template with your validated content:

{
  "title": "YOUR_TITLE_HERE",
  "slug": "your-slug-here",
  "language": "{{LOCALE}}",
  "status": "{{STATUS}}",
  "published_at": null,
  "description": "YOUR_150_CHAR_DESCRIPTION",
  "hero_caption": "YOUR_HERO_CAPTION_OR_NULL",
  "content": "YOUR_VALIDATED_HTML_FROM_PHASE_1",
  "read_time_minutes": 6,
  "image": null,
  "seo": {
    "title": "YOUR_SEO_TITLE_60_CHARS",
    "description": "YOUR_SEO_DESCRIPTION_160_CHARS",
    "og_image": null
  },
  "tags": ["tag1", "tag2"],
  "author": null,
  "is_featured": false,
  "featured_order": null,
  "assets_manifest": [
    { "ref": "hero", "alt": "DESCRIBE_IMAGE", "notes": "Usage notes" }
  ],
  "_self_check": "passed"
}

CRITICAL:
- Replace ALL_CAPS_PLACEHOLDERS with actual content
- "content" field must be your Phase 1 HTML (after self-check validation)
- "_self_check" MUST be "passed" - this confirms you ran Phase 2
- Response must start with { and end with }
- NO markdown fences, NO explanatory text — ONLY the JSON object`;

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
