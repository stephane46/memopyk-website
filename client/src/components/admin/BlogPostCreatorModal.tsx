import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { HtmlEditor } from '@/admin/HtmlEditor';
import { BlogHeroImageUpload } from '@/admin/BlogHeroImageUpload';
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

export function BlogPostCreatorModal({ topic, isOpen, onClose }: BlogPostCreatorModalProps) {
  const { toast } = useToast();
  const [language, setLanguage] = useState<'en-US' | 'fr-FR'>('en-US');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('draft');
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<any>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await adminFetch('/api/admin/blog/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          language,
          primaryKeyword: topic.primary_keyword,
          secondaryKeywords: topic.secondary_keywords,
          notes: [
            topic.content_angle ? `Content angle: ${topic.content_angle}` : '',
            topic.description ? `Scope: ${topic.description}` : '',
            topic.search_intent ? `Search intent: ${topic.search_intent}` : '',
            notes.trim()
          ].filter(Boolean).join('\n') || undefined,
          targetWordCount: topic.target_word_count
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
        description: "Review and edit below, then create the post"
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
      ALLOWED_TAGS: ['p','h2','h3','h4','ul','ol','li','blockquote','pre','code','strong','em','a','img','br','hr','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','target','rel','src','alt','title','loading']
    });
  };

  const createBlogPost = async () => {
    if (!generatedPost) return;

    setIsCreating(true);
    try {
      const sanitizedContent = sanitizeContent(generatedPost.content);
      const postData = {
        title: generatedPost.title,
        slug: generatedPost.slug,
        description: generatedPost.description || '',
        content: sanitizedContent,
        hero_url: generatedPost.image || null,
        language,
        status,
        published_at: null,
        is_featured: false,
        meta_title: generatedPost.seo?.title || generatedPost.title,
        meta_description: generatedPost.seo?.description || generatedPost.description || '',
        source_topic_id: topic.id,
        primary_keyword: topic.primary_keyword,
        secondary_keywords: topic.secondary_keywords || []
      };

      const response = await adminFetch('/api/admin/blog/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || responseData.message || 'Failed to create blog post');
      }

      const responseData = await response.json();

      await queryClient.invalidateQueries({ queryKey: ['/api/admin/content/topics'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });

      toast({
        title: "Success!",
        description: `Blog post "${responseData.data.title}" created from topic!`
      });

      onClose();
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#D67C4A]" />
            Create Post from Topic
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Generate content with AI using topic data, then review and create the post
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

              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Additional Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any extra instructions for the AI..."
                  rows={2}
                  data-testid="textarea-notes"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
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

          {/* Generated Content Review */}
          {generatedPost && (
            <Card className="border-green-500 border-2">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Review & Create</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-900 dark:text-white">Title</Label>
                  <Input
                    value={generatedPost.title}
                    onChange={(e) => setGeneratedPost({ ...generatedPost, title: e.target.value })}
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Slug</Label>
                  <Input
                    value={generatedPost.slug}
                    onChange={(e) => setGeneratedPost({ ...generatedPost, slug: e.target.value })}
                    className="font-mono"
                    data-testid="input-slug"
                  />
                </div>
                <div>
                  <Label className="text-gray-900 dark:text-white">Description</Label>
                  <Textarea
                    value={generatedPost.description || ''}
                    onChange={(e) => setGeneratedPost({ ...generatedPost, description: e.target.value })}
                    className="h-20"
                    data-testid="textarea-description"
                  />
                </div>

                <BlogHeroImageUpload
                  currentImageUrl={generatedPost.hero_url || generatedPost.image}
                  onImageSelect={(url) => setGeneratedPost({ ...generatedPost, hero_url: url, image: url })}
                />

                <div>
                  <Label className="text-gray-900 dark:text-white">Content</Label>
                  <HtmlEditor
                    value={generatedPost.content}
                    onChange={(content) => setGeneratedPost({ ...generatedPost, content })}
                  />
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
