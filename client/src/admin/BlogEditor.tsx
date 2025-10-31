import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Eye, Upload, Search } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import { BlogHeroImageUpload } from './BlogHeroImageUpload';
import { createTinyMCEConfig, getAdminToken } from './tinymce/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  
  // Image picker state
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const imagePickerCallbackRef = useRef<any>(null);

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

  // Fetch existing blog images for the picker modal
  const { data: imagesData, isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['/api/admin/blog/images'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog/images', {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
    enabled: isImagePickerOpen
  });

  type BlogImage = {
    name: string;
    url: string;
    size: number;
    created_at: string;
  };

  const allImages: BlogImage[] = imagesData?.data || [];
  const filteredImages = searchTerm
    ? allImages.filter(img => img.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allImages;

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

  // Custom file picker - Opens modal for image selection
  const handleFilePicker = (callback: any, value: any, meta: any) => {
    const token = getAdminToken();
    
    if (!token) {
      alert('⚠️ Authentication token not found.\n\nPlease logout and login again to fix this issue.');
      return;
    }

    if (meta.filetype === 'image') {
      imagePickerCallbackRef.current = callback;
      setIsImagePickerOpen(true);
    }
  };

  // Handle image selection from modal
  const handleImageSelect = (imageUrl: string) => {
    if (imagePickerCallbackRef.current) {
      imagePickerCallbackRef.current(imageUrl, { alt: '' });
      imagePickerCallbackRef.current = null;
    }
    setIsImagePickerOpen(false);
    setSearchTerm('');
  };

  // Handle file upload from modal
  const handleModalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/blog/images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: "Image uploaded successfully"
      });

      refetchImages();
      
      if (imagePickerCallbackRef.current) {
        handleImageSelect(result.data.url);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
                init={createTinyMCEConfig({ 
                  menubar: true,
                  file_picker_callback: handleFilePicker
                })}
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

      {/* Image Picker Modal */}
      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {/* Upload Section */}
            <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <input
                type="file"
                accept="image/*"
                onChange={handleModalFileUpload}
                disabled={isUploading}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center gap-2 cursor-pointer hover:text-[#D67C4A]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span>Upload New Image</span>
                  </>
                )}
              </label>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Image Gallery */}
            {imagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No images found' : 'No images uploaded yet'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredImages.map((image) => (
                  <button
                    key={image.name}
                    onClick={() => handleImageSelect(image.url)}
                    className="relative aspect-square border rounded-lg overflow-hidden hover:ring-2 hover:ring-[#D67C4A] transition-all group"
                    data-testid={`button-select-image-${image.name}`}
                  >
                    <img 
                      src={image.url} 
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                        Insert
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                      {image.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
