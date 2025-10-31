import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import { BlogHeroImageUpload } from './BlogHeroImageUpload';
import { createTinyMCEConfig, getAdminToken } from './tinymce/config';

interface BlogEditorProps {
  postId: string;
}

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: 'draft' | 'in_review' | 'published';
  description: string;
  content_html: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  hero_url: string | null;
  seo: any;
};

export function BlogEditor({ postId }: BlogEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  // Fetch the blog post
  const { data: postData, isLoading } = useQuery({
    queryKey: [`/api/admin/blog/posts/${postId}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/blog/posts/${postId}`);
      if (!response.ok) throw new Error('Failed to fetch blog post');
      return response.json();
    }
  });

  const post: BlogPost | undefined = postData?.data;

  // Populate form when post loads
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setDescription(post.description);
      setContent(post.content_html);
      setStatus(post.status);
      setPublishedAt(post.published_at ? new Date(post.published_at) : null);
      setHeroUrl(post.hero_url);
    }
  }, [post]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/admin/blog/posts/${postId}`, 'PUT', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/posts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/blog/posts/${postId}`] });
      toast({
        title: "Success!",
        description: "Blog post updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    const sanitizedContent = DOMPurify.sanitize(content);
    
    updateMutation.mutate({
      title,
      slug,
      description,
      content_html: sanitizedContent,
      status,
      published_at: publishedAt?.toISOString() || null,
      hero_url: heroUrl
    });
  };

  const handlePreview = () => {
    if (post?.status === 'published') {
      window.open(`/blog/${post.slug}`, '_blank');
    } else {
      toast({
        title: "Preview unavailable",
        description: "Only published posts can be previewed",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
      </div>
    );
  }

  if (!post) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Post not found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Edit Blog Post</span>
            <div className="flex gap-2">
              {post.status === 'published' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  data-testid="button-preview"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-[#D67C4A] hover:bg-[#C66B3A]"
                data-testid="button-save"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              data-testid="input-title"
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="post-url-slug"
              data-testid="input-slug"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (SEO)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for SEO"
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          {/* Hero Image */}
          <BlogHeroImageUpload 
            currentImageUrl={heroUrl}
            onImageSelect={setHeroUrl}
          />

          {/* Status and Published At */}
          <div className="grid grid-cols-2 gap-4">
            <StatusSelector value={status} onChange={setStatus} />
            <PublishedAtPicker value={publishedAt} onChange={setPublishedAt} />
          </div>

          {/* Content Editor */}
          <div>
            <Label>Content</Label>
            <div className="border rounded-md overflow-hidden">
              <Editor
                tinymceScriptSrc="/tinymce/tinymce.min.js"
                licenseKey="gpl"
                value={content}
                onEditorChange={(newContent) => setContent(newContent)}
                init={createTinyMCEConfig({ menubar: true })}
              />
            </div>
          </div>

          {/* Language Badge */}
          <div className="flex items-center gap-2">
            <Label>Language:</Label>
            <span className="text-sm font-medium text-gray-700">
              {post.language === 'en-US' ? 'English' : 'French'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
