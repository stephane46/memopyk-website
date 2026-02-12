import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, adminFetch } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Eye, Upload, Search, Languages, Star, Tag, X } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import { BlogHeroImageUpload } from './BlogHeroImageUpload';
import { BlogTagSelector } from './BlogTagSelector';
import { createTinyMCEConfig, getAdminToken } from './tinymce/config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TranslationAssistant } from './TranslationAssistant';
import type { BlogPost } from '@shared/blogTypes';
import { BlogEditorSkeleton } from './skeletons/BlogEditorSkeleton';

interface BlogEditorProps {
  postId: string;
}

export function BlogEditor({ postId }: BlogEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published' | 'archived'>('draft');
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<number>(1);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [secondaryKeywordInput, setSecondaryKeywordInput] = useState('');

  // Image picker state
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const imagePickerCallbackRef = useRef<any>(null);
  
  // Translation assistant state
  const [isTranslationAssistantOpen, setIsTranslationAssistantOpen] = useState(false);
  
  // Check if this is a translation draft
  const isTranslationDraft = title.startsWith('[TRANSLATE TO');

  // Fetch the blog post
  const { data: postData, isLoading } = useQuery({
    queryKey: [`/api/admin/blog/posts/${postId}`],
    queryFn: async () => {
      const response = await adminFetch(`/api/admin/blog/posts/${postId}`);
      if (!response.ok) throw new Error('Failed to fetch blog post');
      return response.json();
    }
  });

  const post: BlogPost | undefined = postData?.data;

  // Fetch existing blog images for the picker modal
  const { data: imagesData, isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['/api/admin/blog/images'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/blog/images');
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

  // Fetch tags for this post
  const { data: tagsData } = useQuery({
    queryKey: [`/api/admin/blog/posts/${postId}/tags`],
    queryFn: async () => {
      const response = await adminFetch(`/api/admin/blog/posts/${postId}/tags`);
      if (!response.ok) throw new Error('Failed to fetch post tags');
      return response.json();
    }
  });

  // Load selected tags when data arrives
  useEffect(() => {
    if (tagsData?.data) {
      setSelectedTagIds(tagsData.data.map((tag: any) => tag.id));
    }
  }, [tagsData]);

  // Populate form when post loads
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setDescription(post.description);
      setContent(post.content_html || '');
      setStatus(post.status);
      setPublishedAt(post.published_at ? new Date(post.published_at) : null);
      setHeroUrl(post.hero_url);
      setIsFeatured(post.is_featured || false);
      setFeaturedOrder((post as any).featured_order || 1);
      setPrimaryKeyword((post as any).primary_keyword || '');
      setSecondaryKeywords((post as any).secondary_keywords || []);
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
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
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

  // Save tags mutation
  const saveTagsMutation = useMutation({
    mutationFn: async (tagIds: string[]) => {
      return apiRequest(`/api/admin/blog/posts/${postId}/tags`, 'POST', { tagIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/blog/posts/${postId}/tags`] });
      queryClient.invalidateQueries({ queryKey: ['/api/blog-tags'] });
    }
  });

  const handleSave = async () => {
    const sanitizedContent = DOMPurify.sanitize(content);

    // Save post content
    await updateMutation.mutateAsync({
      title,
      slug,
      description,
      content_html: sanitizedContent,
      status,
      published_at: publishedAt?.toISOString() || null,
      hero_url: heroUrl,
      is_featured: isFeatured,
      featured_order: isFeatured ? featuredOrder : null,
      primary_keyword: primaryKeyword || null,
      secondary_keywords: secondaryKeywords.length > 0 ? secondaryKeywords : null
    });

    // Save tags
    await saveTagsMutation.mutateAsync(selectedTagIds);
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

      const response = await adminFetch('/api/admin/blog/images', {
        method: 'POST',
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
    return <BlogEditorSkeleton />;
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
              {isTranslationDraft && (
                <Button
                  variant="outline"
                  onClick={() => setIsTranslationAssistantOpen(true)}
                  className="border-[#D67C4A] text-[#D67C4A] hover:bg-orange-50"
                  data-testid="button-translation-assistant"
                >
                  <Languages className="h-4 w-4 mr-2" />
                  Translation Assistant
                </Button>
              )}
              {post.status === 'published' && (
                <Button
                  variant="outline"
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

          {/* SEO Keywords */}
          <div className="space-y-4 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-600" />
              <Label className="text-base font-semibold text-emerald-800">SEO Keywords</Label>
            </div>

            {/* Primary Keyword */}
            <div>
              <Label htmlFor="primary-keyword" className="text-sm text-gray-700">Primary Keyword</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="primary-keyword"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder="e.g. photos chiots smartphone"
                  className="max-w-md"
                  data-testid="input-primary-keyword"
                />
                {primaryKeyword && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 text-xs font-medium">
                    <Tag className="h-3 w-3 mr-1 inline" />
                    {primaryKeyword}
                  </Badge>
                )}
              </div>
            </div>

            {/* Secondary Keywords */}
            <div>
              <Label htmlFor="secondary-keywords" className="text-sm text-gray-700">Secondary Keywords</Label>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {secondaryKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 px-2.5 py-0.5 text-xs font-medium">
                    {kw}
                    <button
                      type="button"
                      onClick={() => setSecondaryKeywords(secondaryKeywords.filter((_, idx) => idx !== i))}
                      className="ml-1.5 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                id="secondary-keywords"
                value={secondaryKeywordInput}
                onChange={(e) => setSecondaryKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = secondaryKeywordInput.trim().replace(/,$/, '');
                    if (value && !secondaryKeywords.includes(value)) {
                      setSecondaryKeywords([...secondaryKeywords, value]);
                    }
                    setSecondaryKeywordInput('');
                  }
                }}
                placeholder="Type keyword and press Enter or comma to add"
                className="max-w-md"
                data-testid="input-secondary-keywords"
              />
            </div>
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

          {/* Tags */}
          <BlogTagSelector
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
          />

          {/* Featured Controls */}
          <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#D67C4A]" />
                  <Label htmlFor="featured-toggle" className="text-base font-semibold">Featured Post</Label>
                </div>
                <p className="text-sm text-gray-600">
                  Mark this post as featured to display in the featured carousel
                </p>
              </div>
              <Switch
                id="featured-toggle"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                data-testid="switch-featured"
              />
            </div>

            {isFeatured && (
              <div>
                <Label htmlFor="featured-order">Featured Order (1 = first)</Label>
                <Input
                  id="featured-order"
                  type="number"
                  min="1"
                  value={featuredOrder}
                  onChange={(e) => setFeaturedOrder(parseInt(e.target.value) || 1)}
                  placeholder="1"
                  className="max-w-xs"
                  data-testid="input-featured-order"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Lower numbers appear first in the carousel
                </p>
              </div>
            )}
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

      {/* Translation Assistant Modal */}
      <TranslationAssistant
        isOpen={isTranslationAssistantOpen}
        onClose={() => setIsTranslationAssistantOpen(false)}
        currentContent={content}
        currentTitle={title}
        currentSlug={slug}
        currentDescription={description}
        targetLanguage={post.language as 'en-US' | 'fr-FR'}
        onApplyTranslation={(translatedData) => {
          setContent(translatedData.content);
          setTitle(translatedData.title);
          setSlug(translatedData.slug);
          setDescription(translatedData.description);
          toast({
            title: "Translation applied! ✅",
            description: "Title, slug, description, and content have been translated. Remember to save your changes."
          });
        }}
      />
    </div>
  );
}
