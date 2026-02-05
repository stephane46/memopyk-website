import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, CheckCircle, CheckCircle2, AlertCircle, Loader2, Send, FileJson } from 'lucide-react';
import { HtmlEditor } from '@/admin/HtmlEditor';
import { BlogHeroImageUpload } from '@/admin/BlogHeroImageUpload';
import { BlogTagSelector } from '@/admin/BlogTagSelector';
import { StatusSelector } from '@/admin/StatusSelector';
import { PublishedAtPicker } from '@/admin/PublishedAtPicker';
import DOMPurify from 'dompurify';
import { queryClient, adminFetch } from '@/lib/queryClient';

interface ContentTopic {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: string;
  target_word_count: number;
  primary_keyword: string;
  secondary_keywords: string[];
  search_volume: number | null;
  competition: string | null;
  search_intent: string;
  content_angle: string;
  description: string;
  hero_image_concept: string | null;
  body_image_concepts: string[] | null;
  memopyk_link_opportunities: string | null;
  times_generated: number;
  last_generated_at: string | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BlogPostCreatorModalProps {
  topic: ContentTopic;
  isOpen: boolean;
  onClose: () => void;
}

const MASTER_PROMPT_TEMPLATE = `You are an expert content writer for MEMOPYK, a service that transforms personal photos and videos into emotional stories and premium memory films.

Your task is to generate a COMPLETE VALID JSON OBJECT with approximately {{TARGET_WORDS}} words of HTML content (acceptable range: {{TARGET_WORDS_MIN}} to {{TARGET_WORDS_MAX}} words). The JSON must be valid, must contain properly escaped quotes, and must NOT contain any comments, explanations, or text before or after the JSON object.

IMPORTANT OUTPUT RULES:
1. Output ONLY the JSON object. No introduction, no commentary, no text outside JSON.
2. Do NOT wrap the JSON in backticks or code fences.
3. The JSON MUST be valid and must parse successfully.
4. The "content" value MUST contain fully escaped double quotes (\") and MUST end with a closing quote before the next field begins.
5. The "content" field must contain the FULL ~{{TARGET_WORDS}} word HTML article in ONE STRING.
6. DO NOT use the em dash (—). Use only the hyphen (-).
7. Use ONLY the allowed HTML tags: <h2>, <h3>, <h4>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>, <table>, <thead>, <tbody>, <tr>, <th>, <td>
8. Include 2 to 4 IMAGE SUGGESTIONS using this exact format inside <p> tags:
   <p>📸 IMAGE SUGGESTION: [description] | [Portrait/Landscape] [dimensions] | [purpose]</p>

ARTICLE STYLE REQUIREMENTS:
- Topic: {{TOPIC}}
- Language: {{LOCALE}}
- SEO keywords: {{SEO_KEYWORDS}} (use naturally){{ADDITIONAL_CONTEXT}}
- Style: professional, warm, family-centric, actionable, inspirational
- Structure: 
  * 2-3 paragraph hook
  * 4-6 H2 sections
  * H3 subsections where appropriate
  * Practical steps and numbered lists
  * Strong conclusion with call-to-action

RETURN EXACTLY THIS JSON STRUCTURE:

{
  "title": "Your SEO-Optimized Blog Title Here",
  "slug": "your-url-friendly-slug-here",
  "language": "{{LOCALE}}",
  "status": "draft",
  "published_at": null,
  "description": "A compelling 150-character summary that encourages readers to explore this guide.",
  "hero_caption": "A short inspiring caption for the hero image",
  "content": "<h2>...</h2><p>...FULL {{TARGET_WORDS}} WORD HTML ARTICLE...</p>",
  "read_time_minutes": {{READ_TIME}},
  "image": null,
  "seo": {
    "title": "SEO Title Under 60 Characters",
    "description": "SEO meta description under 160 characters with primary keywords.",
    "og_image": null
  },
  "tags": ["relevant-tag-1", "relevant-tag-2", "relevant-tag-3"],
  "author": null,
  "is_featured": false,
  "featured_order": null,
  "assets_manifest": [
    { "ref": "hero", "alt": "Descriptive alt text for hero image", "notes": "Use as hero image" }
  ]
}

FINAL CRITICAL RULE:
You MUST generate the JSON in a way that fits fully within the token limit and does not truncate. Ensure the "content" string is fully closed and the JSON parses without errors.

Now generate the output.`;

export function BlogPostCreatorModal({ topic, isOpen, onClose }: BlogPostCreatorModalProps) {
  const { toast } = useToast();
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editable parsed fields
  const [parsedData, setParsedData] = useState<any>(null);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableSlug, setEditableSlug] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableContent, setEditableContent] = useState('');

  const generatePrompt = () => {
    const allKeywords = [topic.primary_keyword, ...(topic.secondary_keywords || [])].join(', ');
    const estimatedReadTime = Math.ceil(topic.target_word_count / 200);
    const minWords = Math.floor(topic.target_word_count * 0.9); // 90% of target
    const maxWords = Math.ceil(topic.target_word_count * 1.1); // 110% of target

    // Build additional context from optional fields (only include non-empty values)
    let additionalContext = '';
    if (topic.content_angle) {
      additionalContext += `\n- Content angle: ${topic.content_angle}`;
    }
    if (topic.description) {
      additionalContext += `\n- Article scope: ${topic.description}`;
    }
    if (topic.search_intent) {
      additionalContext += `\n- Search intent: ${topic.search_intent}`;
    }

    const prompt = MASTER_PROMPT_TEMPLATE
      .replace(/\{\{TOPIC\}\}/g, topic.title)
      .replace(/\{\{LOCALE\}\}/g, language)
      .replace(/\{\{STATUS\}\}/g, status)
      .replace(/\{\{TARGET_WORDS\}\}/g, topic.target_word_count.toString())
      .replace(/\{\{TARGET_WORDS_MIN\}\}/g, minWords.toString())
      .replace(/\{\{TARGET_WORDS_MAX\}\}/g, maxWords.toString())
      .replace(/\{\{SEO_KEYWORDS\}\}/g, allKeywords)
      .replace(/\{\{ADDITIONAL_CONTEXT\}\}/g, additionalContext)
      .replace(/\{\{READ_TIME\}\}/g, estimatedReadTime.toString());

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

  const sanitizeContent = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p','h2','h3','h4','ul','ol','li','blockquote','pre','code','strong','em','a','img','br','hr','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','target','rel','src','alt','title','loading']
    });
  };

  const parseAndValidateJSON = () => {
    if (!aiJsonInput.trim()) {
      toast({
        title: "JSON Required",
        description: "Please paste the AI-generated JSON first",
        variant: "destructive"
      });
      return;
    }

    try {
      const parsed = JSON.parse(aiJsonInput.trim());
      
      // Validate required fields
      if (!parsed.title || !parsed.slug || !parsed.content) {
        throw new Error('Missing required fields: title, slug, or content');
      }
      
      // Store parsed data and populate editable fields
      setParsedData(parsed);
      setEditableTitle(parsed.title);
      setEditableSlug(parsed.slug);
      setEditableDescription(parsed.description || '');
      setEditableContent(parsed.content);
      setValidationError(null);
      
      toast({
        title: "JSON Parsed!",
        description: "Review and edit fields below before creating the post"
      });
    } catch (error: any) {
      const errorMsg = error instanceof SyntaxError 
        ? 'Invalid JSON format. Check for missing quotes, commas, or brackets.' 
        : error.message;
      
      setValidationError(errorMsg);
      toast({
        title: "Parse failed",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  const createBlogPost = async () => {
    if (!parsedData) {
      toast({
        title: "Parse JSON First",
        description: "Please paste and parse the JSON before creating the post",
        variant: "destructive"
      });
      return;
    }

    if (!editableTitle || !editableSlug || !editableContent) {
      toast({
        title: "Missing Required Fields",
        description: "Title, slug, and content are required",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    setValidationError(null);

    try {
      // Sanitize content
      const sanitizedContent = sanitizeContent(editableContent);
      
      // Prepare post data with source_topic_id and keywords (using edited fields)
      const postData = {
        title: editableTitle,
        slug: editableSlug,
        description: editableDescription,
        content: sanitizedContent,
        hero_url: parsedData.image || null,
        language,
        status,
        published_at: publishedAt ? publishedAt.toISOString() : null,
        is_featured: parsedData.is_featured || false,
        meta_title: parsedData.seo?.title || editableTitle,
        meta_description: parsedData.seo?.description || editableDescription || '',
        source_topic_id: topic.id,
        primary_keyword: topic.primary_keyword,
        secondary_keywords: topic.secondary_keywords || []
      };

      const response = await adminFetch('/api/admin/blog/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      // Parse response JSON safely
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        throw new Error('Server returned invalid response. Please try again.');
      }

      // Check for errors
      if (!response.ok) {
        const errorMsg = responseData.error || responseData.message || 'Failed to create blog post';
        throw new Error(errorMsg);
      }
      
      // Invalidate cache to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
      
      toast({
        title: "Success!",
        description: `Blog post "${responseData.data.title}" created from topic!`
      });

      onClose();
    } catch (error: any) {
      console.error('Error creating blog post:', error);
      const errorMsg = error instanceof SyntaxError 
        ? 'Invalid JSON format. Check the JSON syntax and try again.' 
        : error.message || 'Failed to create blog post';
      
      setValidationError(errorMsg);
      toast({
        title: "Creation failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#D67C4A]" />
            Create Post from Topic
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Generate an AI prompt pre-filled with topic data, then paste the AI's JSON response to create the post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Topic Preview */}
          <Card className="border-[#D67C4A] border-2">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">Topic Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Title:</span>
                  <p className="text-gray-700 dark:text-gray-300">{topic.title}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Category:</span>
                  <p className="text-gray-700 dark:text-gray-300">{topic.category}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Primary Keyword:</span>
                  <p className="text-gray-700 dark:text-gray-300">{topic.primary_keyword}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Target Words:</span>
                  <p className="text-gray-700 dark:text-gray-300">{topic.target_word_count}</p>
                </div>
              </div>
              {topic.secondary_keywords && topic.secondary_keywords.length > 0 && (
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white">Secondary Keywords:</span>
                  <p className="text-gray-700 dark:text-gray-300">{topic.secondary_keywords.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900 dark:text-white">Language</Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val as 'en-US' | 'fr-FR')}>
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (en-US)</SelectItem>
                      <SelectItem value="fr-FR">French (fr-FR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as 'draft' | 'in_review' | 'published')}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generatePrompt}
                className="w-full bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
                data-testid="button-generate-prompt"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Prompt
              </Button>
            </CardContent>
          </Card>

          {/* Generated Prompt */}
          {generatedPrompt && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 dark:text-white">Generated Prompt</CardTitle>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    data-testid="button-copy-prompt"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Copy this prompt and paste it into ChatGPT, Claude, or your preferred AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generatedPrompt}
                  readOnly
                  className="font-mono text-sm h-64 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-testid="textarea-prompt"
                />
              </CardContent>
            </Card>
          )}

          {/* AI JSON Response Input */}
          {generatedPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">AI Response (JSON)</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Paste the JSON response from your AI assistant below, then click "Parse JSON"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={aiJsonInput}
                  onChange={(e) => setAiJsonInput(e.target.value)}
                  placeholder='Paste AI-generated JSON here...'
                  className="font-mono text-sm h-64 text-gray-900 dark:text-white"
                  data-testid="textarea-json-input"
                />
                {validationError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="text-sm text-red-600 dark:text-red-400">{validationError}</div>
                  </div>
                )}
                <Button
                  onClick={parseAndValidateJSON}
                  disabled={!aiJsonInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-parse-json"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Parse JSON
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Editable Fields (shown after parsing) */}
          {parsedData && (
            <Card className="border-green-500 border-2">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Parsed Data - Review & Edit Before Creating
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  You can edit any field below before creating the post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-900 dark:text-white">Title *</Label>
                  <Input
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="text-gray-900 dark:text-white"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Slug *</Label>
                  <Input
                    value={editableSlug}
                    onChange={(e) => setEditableSlug(e.target.value)}
                    className="text-gray-900 dark:text-white font-mono"
                    data-testid="input-slug"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    URL-friendly identifier (e.g., "my-blog-post")
                  </p>
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Description</Label>
                  <Textarea
                    value={editableDescription}
                    onChange={(e) => setEditableDescription(e.target.value)}
                    className="text-gray-900 dark:text-white h-20"
                    data-testid="textarea-description"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Content Preview (HTML)</Label>
                  <Textarea
                    value={editableContent.substring(0, 500) + '...'}
                    readOnly
                    className="text-gray-900 dark:text-white font-mono text-xs h-32 bg-gray-50 dark:bg-gray-800"
                    data-testid="textarea-content-preview"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Full content: {editableContent.length} characters
                  </p>
                </div>

                <Button
                  onClick={createBlogPost}
                  disabled={isCreating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-create-post"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Post...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Blog Post
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
