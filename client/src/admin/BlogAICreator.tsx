import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { adminFetch } from '@/lib/queryClient';
import { HtmlEditor } from './HtmlEditor';
import { BlogHeroImageUpload } from './BlogHeroImageUpload';
import { BlogTagSelector } from './BlogTagSelector';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import DOMPurify from 'dompurify';

export const BlogAICreator: React.FC = () => {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published' | 'archived'>('draft');
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [notes, setNotes] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(900);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for the blog post",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await adminFetch('/api/admin/blog/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          language,
          primaryKeyword: primaryKeyword.trim() || undefined,
          secondaryKeywords: secondaryKeywords.trim()
            ? secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean)
            : undefined,
          notes: notes.trim() || undefined,
          targetWordCount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Generation failed');
      }

      const result = await response.json();
      setGeneratedPost(result.data || result);
      toast({
        title: "Content generated",
        description: "Review and refine your content below, then save"
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || 'Failed to generate content',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sanitizeContent = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p','h2','h3','h4','ul','ol','li','blockquote','pre','code','strong','em','a','img','br','hr','table','thead','tbody','tr','th','td','video','source'],
      ALLOWED_ATTR: ['href','target','rel','src','alt','title','loading','controls','poster','type']
    });
  };

  const createBlogPost = async () => {
    if (!generatedPost) return;

    setIsCreating(true);
    try {
      const sanitizedContent = sanitizeContent(generatedPost.content);
      const postData = {
        ...generatedPost,
        content: sanitizedContent,
        language,
        status,
        published_at: publishedAt ? publishedAt.toISOString() : null
      };

      const response = await adminFetch('/api/admin/blog/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create blog post');
      }

      const result = await response.json();

      // Assign tags
      if (selectedTagIds.length > 0 && result.data?.id) {
        try {
          await adminFetch(`/api/admin/blog/posts/${result.data.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: selectedTagIds })
          });
        } catch (tagError) {
          console.error('Failed to assign tags:', tagError);
        }
      }

      toast({
        title: "Success!",
        description: `Blog post "${result.data?.title || generatedPost.title}" saved! Opening editor...`,
      });

      // Navigate to Blog Editor
      const currentPath = window.location.pathname;
      const langPrefix = currentPath.match(/^\/(en-US|fr-FR)/)?.[0] || '';
      window.location.href = `${langPrefix}/admin?tab=blog-edit&id=${result.data.id}`;
    } catch (error: any) {
      toast({
        title: "Creation failed",
        description: error.message || 'Failed to create blog post',
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Configure */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Step 1: Configure Post</CardTitle>
          <CardDescription>Set up parameters and generate content with AI</CardDescription>
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
            <Label htmlFor="primaryKeyword">Primary Keyword (optional)</Label>
            <Input
              id="primaryKeyword"
              placeholder="e.g., photo digitization"
              value={primaryKeyword}
              onChange={(e) => setPrimaryKeyword(e.target.value)}
              data-testid="input-primary-keyword"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryKeywords">Secondary Keywords (optional)</Label>
            <Input
              id="secondaryKeywords"
              placeholder="e.g., memory preservation, scanning, family photos"
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              data-testid="input-secondary-keywords"
            />
            <p className="text-xs text-gray-500">Comma-separated keywords for SEO focus</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetWordCount">Target Word Count</Label>
            <Input
              id="targetWordCount"
              type="number"
              min={300}
              max={3000}
              value={targetWordCount}
              onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 900)}
              data-testid="input-word-count"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional instructions or context for the AI..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full bg-[#D67C4A] hover:bg-[#C16B3A]"
            data-testid="button-generate"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating content...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Review & Save */}
      {generatedPost && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Step 2: Review & Save</CardTitle>
            <CardDescription>
              Edit the generated content, then save to create your blog post
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Post Title</Label>
              <Input
                value={generatedPost.title}
                onChange={(e) => setGeneratedPost({ ...generatedPost, title: e.target.value })}
                className="font-semibold"
                data-testid="input-post-title"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={generatedPost.slug}
                onChange={(e) => setGeneratedPost({ ...generatedPost, slug: e.target.value })}
                className="font-mono"
                data-testid="input-post-slug"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={generatedPost.description || ''}
                onChange={(e) => setGeneratedPost({ ...generatedPost, description: e.target.value })}
                rows={2}
                data-testid="textarea-post-description"
              />
            </div>

            <BlogHeroImageUpload
              currentImageUrl={generatedPost.hero_url}
              onImageSelect={(url) => setGeneratedPost({ ...generatedPost, hero_url: url })}
            />

            <BlogTagSelector
              selectedTagIds={selectedTagIds}
              onTagsChange={setSelectedTagIds}
            />

            <div className="space-y-2">
              <Label>Content (HTML Editor)</Label>
              <HtmlEditor
                value={generatedPost.content}
                onChange={(content) => setGeneratedPost({ ...generatedPost, content })}
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
                    Saving post...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Save Blog Post
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
