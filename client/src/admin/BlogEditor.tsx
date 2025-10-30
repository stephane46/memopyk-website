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
                    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount', 'quickbars'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'image | removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  promotion: false,
                  // Image toolbar - appears when clicking on an image
                  image_caption: true,
                  image_advtab: true,
                  image_class_list: [
                    { title: 'Default (centered, full width)', value: '' },
                    { title: '─── QUARTER WIDTH (25%) ───', value: '' },
                    { title: 'Quarter - Left aligned', value: 'img-quarter align-left' },
                    { title: 'Quarter - Centered', value: 'img-quarter align-center' },
                    { title: 'Quarter - Right aligned', value: 'img-quarter align-right' },
                    { title: '─── HALF WIDTH (50%) ───', value: '' },
                    { title: 'Half - Left aligned', value: 'img-half align-left' },
                    { title: 'Half - Centered', value: 'img-half align-center' },
                    { title: 'Half - Right aligned', value: 'img-half align-right' },
                    { title: '─── THREE-QUARTER WIDTH (75%) ───', value: '' },
                    { title: 'Three-quarter - Left aligned', value: 'img-three-quarter align-left' },
                    { title: 'Three-quarter - Centered', value: 'img-three-quarter align-center' },
                    { title: 'Three-quarter - Right aligned', value: 'img-three-quarter align-right' },
                    { title: '─── FULL WIDTH (100%) ───', value: '' },
                    { title: 'Full - Left aligned', value: 'img-full align-left' },
                    { title: 'Full - Centered', value: 'img-full align-center' },
                    { title: 'Full - Right aligned', value: 'img-full align-right' },
                    { title: '─── TEXT WRAP (Inline) ───', value: '' },
                    { title: 'Float left (text wraps right)', value: 'float-left' },
                    { title: 'Float right (text wraps left)', value: 'float-right' }
                  ],
                  // Quick toolbar for images with alignment buttons
                  quickbars_insert_toolbar: false,
                  quickbars_selection_toolbar: 'bold italic | link',
                  quickbars_image_toolbar: 'alignleft aligncenter alignright | rotateleft rotateright | imageoptions',
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
                          let allImages = (data.data || []).sort((a: any, b: any) => 
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                          );
                          
                          let currentPage = 1;
                          const imagesPerPage = 12;
                          let searchQuery = '';
                          
                          // Create dialog
                          const dialog = document.createElement('div');
                          dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
                          
                          const content = document.createElement('div');
                          content.style.cssText = 'background:white;padding:24px;border-radius:8px;max-width:900px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
                          
                          // Header
                          const header = document.createElement('div');
                          header.style.cssText = 'display:flex !important;justify-content:space-between !important;align-items:center !important;margin-bottom:20px !important;';
                          
                          const title = document.createElement('h2');
                          title.textContent = 'Select Image from Library';
                          title.style.cssText = 'margin:0 !important;color:#000 !important;font-size:20px !important;font-weight:600 !important;';
                          header.appendChild(title);
                          
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
                          
                          // Search bar
                          const searchContainer = document.createElement('div');
                          searchContainer.style.cssText = 'margin-bottom:20px !important;';
                          
                          const searchInput = document.createElement('input');
                          searchInput.type = 'text';
                          searchInput.placeholder = 'Search images by filename...';
                          searchInput.style.cssText = 'width:100% !important;padding:10px 15px !important;border:2px solid #ddd !important;border-radius:6px !important;font-size:14px !important;';
                          searchInput.oninput = (e) => {
                            searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
                            currentPage = 1;
                            renderImages();
                          };
                          searchContainer.appendChild(searchInput);
                          content.appendChild(searchContainer);
                          
                          // Container for grid and pagination
                          const gridContainer = document.createElement('div');
                          const paginationContainer = document.createElement('div');
                          
                          const renderImages = () => {
                            // Filter images
                            const filteredImages = searchQuery
                              ? allImages.filter((img: any) => img.name.toLowerCase().includes(searchQuery))
                              : allImages;
                            
                            const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
                            const startIdx = (currentPage - 1) * imagesPerPage;
                            const endIdx = startIdx + imagesPerPage;
                            const paginated = filteredImages.slice(startIdx, endIdx);
                            
                            // Clear grid
                            gridContainer.innerHTML = '';
                            gridContainer.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;min-height:300px;';
                            
                            if (paginated.length === 0) {
                              const emptyMsg = document.createElement('div');
                              emptyMsg.textContent = searchQuery ? 'No images found' : 'No images yet';
                              emptyMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px;color:#666;';
                              gridContainer.appendChild(emptyMsg);
                            } else {
                              paginated.forEach((img: any) => {
                                const imgWrapper = document.createElement('div');
                                imgWrapper.style.cssText = 'position:relative;border:2px solid #ccc;border-radius:4px;overflow:hidden;aspect-ratio:16/9;transition:border-color 0.2s;';
                                
                                const imgBtn = document.createElement('button');
                                imgBtn.style.cssText = 'width:100%;height:100%;padding:0;border:none;cursor:pointer;background:transparent;';
                                imgBtn.innerHTML = `<img src="${img.url}" style="width:100%;height:100%;object-fit:cover;">`;
                                imgBtn.onmouseover = () => imgWrapper.style.borderColor = '#D67C4A';
                                imgBtn.onmouseout = () => imgWrapper.style.borderColor = '#ccc';
                                imgBtn.onclick = () => {
                                  callback(img.url, { alt: img.name });
                                  document.body.removeChild(dialog);
                                };
                                
                                const deleteBtn = document.createElement('button');
                                deleteBtn.innerHTML = '×';
                                deleteBtn.style.cssText = 'position:absolute;top:5px;right:5px;width:28px;height:28px;background:rgba(220,38,38,0.9) !important;color:#fff !important;border:none !important;border-radius:4px !important;cursor:pointer !important;font-size:20px !important;font-weight:bold !important;line-height:1 !important;display:flex;align-items:center;justify-content:center;';
                                deleteBtn.onclick = async (e) => {
                                  e.stopPropagation();
                                  if (!confirm(`Delete "${img.name}"? This action cannot be undone.`)) return;
                                  
                                  try {
                                    // Check if image is used
                                    const checkResponse = await fetch(`/api/admin/blog/images/${encodeURIComponent(img.name)}/usage`, {
                                      headers: { 'Authorization': `Bearer ${getAdminToken()}` }
                                    });
                                    const checkData = await checkResponse.json();
                                    
                                    if (checkData.data.isUsed) {
                                      alert(`Cannot delete: This image is used in ${checkData.data.count} blog post(s):\n${checkData.data.posts.map((p: any) => '• ' + p.title).join('\n')}`);
                                      return;
                                    }
                                    
                                    // Delete image
                                    const deleteResponse = await fetch(`/api/admin/blog/images/${encodeURIComponent(img.name)}`, {
                                      method: 'DELETE',
                                      headers: { 'Authorization': `Bearer ${getAdminToken()}` }
                                    });
                                    
                                    if (!deleteResponse.ok) throw new Error('Delete failed');
                                    
                                    allImages = allImages.filter((i: any) => i.name !== img.name);
                                    renderImages();
                                  } catch (error) {
                                    alert('Delete failed: ' + (error as Error).message);
                                  }
                                };
                                
                                imgWrapper.appendChild(imgBtn);
                                imgWrapper.appendChild(deleteBtn);
                                gridContainer.appendChild(imgWrapper);
                              });
                            }
                            
                            // Pagination
                            paginationContainer.innerHTML = '';
                            paginationContainer.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:10px;margin-bottom:20px;';
                            
                            if (totalPages > 1) {
                              const prevBtn = document.createElement('button');
                              prevBtn.textContent = '← Prev';
                              prevBtn.disabled = currentPage === 1;
                              prevBtn.style.cssText = `padding:8px 16px !important;background-color:${currentPage === 1 ? '#ccc' : '#2A4759'} !important;color:#fff !important;border:none !important;border-radius:4px !important;cursor:${currentPage === 1 ? 'not-allowed' : 'pointer'} !important;font-weight:500 !important;`;
                              prevBtn.onclick = () => {
                                if (currentPage > 1) {
                                  currentPage--;
                                  renderImages();
                                }
                              };
                              paginationContainer.appendChild(prevBtn);
                              
                              const pageInfo = document.createElement('span');
                              pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
                              pageInfo.style.cssText = 'color:#000 !important;font-weight:500 !important;';
                              paginationContainer.appendChild(pageInfo);
                              
                              const nextBtn = document.createElement('button');
                              nextBtn.textContent = 'Next →';
                              nextBtn.disabled = currentPage === totalPages;
                              nextBtn.style.cssText = `padding:8px 16px !important;background-color:${currentPage === totalPages ? '#ccc' : '#2A4759'} !important;color:#fff !important;border:none !important;border-radius:4px !important;cursor:${currentPage === totalPages ? 'not-allowed' : 'pointer'} !important;font-weight:500 !important;`;
                              nextBtn.onclick = () => {
                                if (currentPage < totalPages) {
                                  currentPage++;
                                  renderImages();
                                }
                              };
                              paginationContainer.appendChild(nextBtn);
                            }
                          };
                          
                          content.appendChild(gridContainer);
                          content.appendChild(paginationContainer);
                          
                          // Close button
                          const closeBtn = document.createElement('button');
                          closeBtn.textContent = 'Close';
                          closeBtn.style.cssText = 'padding:12px 24px !important;background-color:#000 !important;color:#fff !important;border:none !important;border-radius:6px !important;cursor:pointer !important;font-weight:600 !important;width:100% !important;font-size:15px !important;';
                          closeBtn.onclick = () => document.body.removeChild(dialog);
                          content.appendChild(closeBtn);
                          
                          dialog.appendChild(content);
                          document.body.appendChild(dialog);
                          
                          renderImages();
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
