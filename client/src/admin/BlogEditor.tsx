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

// Helper to get admin token
const getAdminToken = () => {
  return localStorage.getItem('memopyk-admin-token') || 
         sessionStorage.getItem('memopyk-admin-token') || '';
};

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
                init={{
                  height: 500,
                  menubar: true,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'image | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  promotion: false,
                  // Automatic image upload to Supabase
                  automatic_uploads: true,
                  images_upload_handler: async (blobInfo, progress) => {
                    const formData = new FormData();
                    formData.append('image', blobInfo.blob(), blobInfo.filename());

                    try {
                      const response = await fetch('/api/admin/blog/images', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${getAdminToken()}`
                        },
                        body: formData
                      });

                      if (!response.ok) {
                        throw new Error('Upload failed');
                      }

                      const result = await response.json();
                      return result.data.url;
                    } catch (error) {
                      throw new Error('Image upload failed: ' + (error as Error).message);
                    }
                  },
                  // File picker for browsing existing images
                  file_picker_callback: (callback, value, meta) => {
                    if (meta.filetype === 'image') {
                      // Fetch existing images
                      fetch('/api/admin/blog/images', {
                        headers: {
                          'Authorization': `Bearer ${getAdminToken()}`
                        }
                      })
                        .then(res => res.json())
                        .then(data => {
                          const images = data.data || [];
                          
                          // Create a simple dialog with image grid
                          const dialog = document.createElement('div');
                          dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                          
                          const content = document.createElement('div');
                          content.style.cssText = 'background:white;padding:24px;border-radius:8px;max-width:800px;max-height:80vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
                          
                          const header = document.createElement('div');
                          header.style.cssText = 'display:flex !important;justify-content:space-between !important;align-items:center !important;margin-bottom:20px !important;';
                          
                          const title = document.createElement('h2');
                          title.textContent = 'Select Image from Library';
                          title.style.cssText = 'margin:0 !important;color:#000 !important;font-size:20px !important;font-weight:600 !important;';
                          header.appendChild(title);
                          
                          // Upload button
                          const uploadBtn = document.createElement('button');
                          uploadBtn.textContent = '+ Upload New';
                          uploadBtn.style.cssText = 'padding:10px 20px !important;background-color:#D67C4A !important;color:#fff !important;border:none !important;border-radius:6px !important;cursor:pointer !important;font-weight:600 !important;font-size:14px !important;';
                          uploadBtn.onclick = () => {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/*';
                            fileInput.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              
                              const formData = new FormData();
                              formData.append('image', file);
                              
                              try {
                                const response = await fetch('/api/admin/blog/images', {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${getAdminToken()}`
                                  },
                                  body: formData
                                });
                                
                                if (!response.ok) throw new Error('Upload failed');
                                
                                const result = await response.json();
                                callback(result.data.url, { alt: file.name });
                                document.body.removeChild(dialog);
                              } catch (error) {
                                alert('Image upload failed: ' + (error as Error).message);
                              }
                            };
                            fileInput.click();
                          };
                          header.appendChild(uploadBtn);
                          
                          content.appendChild(header);
                          
                          const grid = document.createElement('div');
                          grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;';
                          
                          images.forEach((img: any) => {
                            const imgBtn = document.createElement('button');
                            imgBtn.style.cssText = 'border:2px solid #ccc;padding:0;cursor:pointer;border-radius:4px;overflow:hidden;aspect-ratio:16/9;transition:border-color 0.2s;';
                            imgBtn.innerHTML = `<img src="${img.url}" style="width:100%;height:100%;object-fit:cover;">`;
                            imgBtn.onmouseover = () => imgBtn.style.borderColor = '#D67C4A';
                            imgBtn.onmouseout = () => imgBtn.style.borderColor = '#ccc';
                            imgBtn.onclick = () => {
                              callback(img.url, { alt: img.name });
                              document.body.removeChild(dialog);
                            };
                            grid.appendChild(imgBtn);
                          });
                          
                          content.appendChild(grid);
                          
                          const closeBtn = document.createElement('button');
                          closeBtn.textContent = 'Close';
                          closeBtn.style.cssText = 'padding:12px 24px !important;background-color:#000 !important;color:#fff !important;border:none !important;border-radius:6px !important;cursor:pointer !important;font-weight:600 !important;width:100% !important;font-size:15px !important;margin-top:10px !important;';
                          closeBtn.onclick = () => document.body.removeChild(dialog);
                          content.appendChild(closeBtn);
                          
                          dialog.appendChild(content);
                          document.body.appendChild(dialog);
                        });
                    }
                  }
                }}
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
