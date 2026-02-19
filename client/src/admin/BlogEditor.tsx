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
import { Loader2, Save, Eye, Upload, Search, Languages, Star, Tag, Sparkles, Globe, Trash2 } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import DOMPurify from 'dompurify';
import { StatusSelector } from './StatusSelector';
import { PublishedAtPicker } from './PublishedAtPicker';
import { BlogHeroImageUpload } from './BlogHeroImageUpload';
import { BlogTagSelector } from './BlogTagSelector';
import { KeywordCombobox, MultiKeywordCombobox } from './KeywordCombobox';
import { TopicCombobox } from './TopicCombobox';
import { createTinyMCEConfig, getAdminToken } from './tinymce/config';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [language, setLanguage] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const [includeInSitemap, setIncludeInSitemap] = useState(true);
  const [enableFaqSchema, setEnableFaqSchema] = useState(true);
  const [sourceTopicId, setSourceTopicId] = useState<string | null>(null);

  // AI Assist state
  const [isAIAssistOpen, setIsAIAssistOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [aiTargetWordCount, setAiTargetWordCount] = useState(900);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [showAIOverwriteConfirm, setShowAIOverwriteConfirm] = useState(false);
  const [pendingAIResult, setPendingAIResult] = useState<any>(null);

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

  // Fetch existing blog images from Image Bank
  const { data: imagesData, isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['/api/image-bank'],
    queryFn: async () => {
      const response = await adminFetch('/api/image-bank');
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
    enabled: isImagePickerOpen
  });

  type ImageBankItem = {
    id: string;
    filename: string;
    originalFilename: string;
    publicUrl: string;
    fileSizeBytes: number;
    altText: string | null;
    createdAt: string;
  };

  const allImages: ImageBankItem[] = Array.isArray(imagesData) ? imagesData : [];
  const filteredImages = searchTerm
    ? allImages.filter(img => img.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) || img.filename.toLowerCase().includes(searchTerm.toLowerCase()))
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
      setContent(post.contentHtml || '');
      setStatus(post.status);
      setPublishedAt(post.publishedAt ? new Date(post.publishedAt) : null);
      setHeroUrl(post.heroUrl);
      setIsFeatured(post.isFeatured || false);
      setFeaturedOrder(post.featuredOrder || 1);
      setPrimaryKeyword(post.primaryKeyword || '');
      setSecondaryKeywords(post.secondaryKeywords || []);
      setLanguage(post.language as 'fr-FR' | 'en-US' || 'fr-FR');
      setIncludeInSitemap(post.includeInSitemap !== false);
      setEnableFaqSchema(post.enableFaqSchema !== false);
      setSourceTopicId(post.sourceTopicId || null);
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
      contentHtml: sanitizedContent,
      status,
      publishedAt: publishedAt?.toISOString() || null,
      heroUrl: heroUrl,
      isFeatured: isFeatured,
      featuredOrder: isFeatured ? featuredOrder : null,
      primaryKeyword: primaryKeyword || null,
      secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : null,
      language,
      includeInSitemap: includeInSitemap,
      enableFaqSchema: enableFaqSchema,
      sourceTopicId: sourceTopicId
    });

    // Save tags
    await saveTagsMutation.mutateAsync(selectedTagIds);

    // After first save, remove "new" flag so help reverts to Blog Editor help
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('new')) {
      currentUrl.searchParams.delete('new');
      window.history.replaceState({}, '', currentUrl.toString());
    }
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

      const response = await adminFetch('/api/image-bank/upload', {
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
        handleImageSelect(result.publicUrl);
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

  const applyAIResult = (result: any) => {
    if (result.title) setTitle(result.title);
    if (result.slug) setSlug(result.slug);
    if (result.description) setDescription(result.description);
    if (result.content) setContent(result.content);
    setIsAIAssistOpen(false);
    setPendingAIResult(null);
    toast({
      title: "AI content applied",
      description: "Title, slug, description, and content have been filled. Remember to save."
    });
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) {
      toast({ title: "Topic required", variant: "destructive" });
      return;
    }

    setIsAIGenerating(true);
    try {
      const response = await adminFetch('/api/admin/blog/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          language,
          primaryKeyword: primaryKeyword.trim() || undefined,
          secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
          notes: aiNotes.trim() || undefined,
          targetWordCount: aiTargetWordCount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Generation failed');
      }

      const result = await response.json();
      const data = result.data || result;

      // If content already exists, ask for confirmation
      if (content.trim() && content.trim() !== '<p></p>') {
        setPendingAIResult(data);
        setShowAIOverwriteConfirm(true);
      } else {
        applyAIResult(data);
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || 'Failed to generate content',
        variant: "destructive"
      });
    } finally {
      setIsAIGenerating(false);
    }
  };

  const isBlankDraft = post?.status === 'draft' && (!title.trim() || title.trim() === 'Untitled Post') && (!content.trim() || content.trim() === '<p></p>' || content.trim() === '<p>Start writing your post here...</p>');

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
              {isBlankDraft && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await adminFetch(`/api/admin/blog/posts/${postId}`, { method: 'DELETE' });
                      const currentPath = window.location.pathname;
                      const langPrefix = currentPath.match(/^\/(en-US|fr-FR)/)?.[0] || '';
                      window.location.href = `${langPrefix}/admin?tab=posts`;
                    } catch (e) {
                      toast({ title: 'Failed to discard', variant: 'destructive' });
                    }
                  }}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  data-testid="button-discard"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setAiTopic(post?.sourceTopicTitle || title || '');
                  setIsAIAssistOpen(true);
                }}
                className="border-purple-400 text-purple-600 hover:bg-purple-50"
                data-testid="button-ai-assist"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assist
              </Button>
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
          {/* Language */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <Label>Language:</Label>
            <Select value={language} onValueChange={(val) => setLanguage(val as 'fr-FR' | 'en-US')}>
              <SelectTrigger className="w-48" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr-FR">French (fr-FR)</SelectItem>
                <SelectItem value="en-US">English (en-US)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Topic */}
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Source Topic:</Label>
            <TopicCombobox
              value={sourceTopicId}
              onChange={setSourceTopicId}
              data-testid="select-source-topic"
            />
          </div>

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
              <Label className="text-sm text-gray-700">Primary Keyword</Label>
              <div className="flex items-center gap-3 mt-1">
                <KeywordCombobox
                  value={primaryKeyword}
                  onChange={setPrimaryKeyword}
                  placeholder="Search keywords..."
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
              <Label className="text-sm text-gray-700">Secondary Keywords</Label>
              <div className="mt-1">
                <MultiKeywordCombobox
                  values={secondaryKeywords}
                  onChange={setSecondaryKeywords}
                  excludeKeyword={primaryKeyword}
                  placeholder="Add keyword..."
                  data-testid="input-secondary-keywords"
                />
              </div>
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

          {/* AI Assist CTA for blank posts */}
          {isBlankDraft && (
            <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-50/50">
              <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Start with AI</h3>
              <p className="text-sm text-purple-600 mb-4">Generate a complete article with AI assistance, or start writing manually below.</p>
              <Button
                onClick={() => {
                  setAiTopic(post?.sourceTopicTitle || title || '');
                  setIsAIAssistOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-ai-assist-cta"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          )}

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

          {/* Sitemap & FAQ Schema */}
          <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sitemap-toggle" className="text-sm font-medium">Include in Sitemap</Label>
                <p className="text-xs text-gray-500">Include this post in the XML sitemap for search engines</p>
              </div>
              <Switch
                id="sitemap-toggle"
                checked={includeInSitemap}
                onCheckedChange={setIncludeInSitemap}
                data-testid="switch-sitemap"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="faq-toggle" className="text-sm font-medium">Enable FAQ Schema</Label>
                <p className="text-xs text-gray-500">Auto-generates FAQ structured data from question headings</p>
              </div>
              <Switch
                id="faq-toggle"
                checked={enableFaqSchema}
                onCheckedChange={setEnableFaqSchema}
                data-testid="switch-faq-schema"
              />
            </div>
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
                    key={image.id}
                    onClick={() => handleImageSelect(image.publicUrl)}
                    className="relative aspect-square border rounded-lg overflow-hidden hover:ring-2 hover:ring-[#D67C4A] transition-all group"
                    data-testid={`button-select-image-${image.filename}`}
                  >
                    <img
                      src={image.publicUrl}
                      alt={image.altText || image.originalFilename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                        Insert
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                      {image.originalFilename}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assist Modal */}
      <Dialog open={isAIAssistOpen} onOpenChange={setIsAIAssistOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Assist
            </DialogTitle>
            <DialogDescription>
              Generate content with AI. Fields will be filled with the result.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="ai-topic">Topic *</Label>
              <Input
                id="ai-topic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="What should the article be about?"
                data-testid="input-ai-topic"
              />
            </div>
            <div>
              <Label>Primary Keyword</Label>
              <Input value={primaryKeyword} disabled className="bg-gray-50" />
            </div>
            {secondaryKeywords.length > 0 && (
              <div>
                <Label>Secondary Keywords</Label>
                <Input value={secondaryKeywords.join(', ')} disabled className="bg-gray-50" />
              </div>
            )}
            <div>
              <Label htmlFor="ai-notes">Notes (optional)</Label>
              <Textarea
                id="ai-notes"
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="Any specific instructions..."
                rows={2}
                data-testid="textarea-ai-notes"
              />
            </div>
            <div>
              <Label htmlFor="ai-word-count">Target Word Count</Label>
              <Input
                id="ai-word-count"
                type="number"
                min={300}
                max={3000}
                value={aiTargetWordCount}
                onChange={(e) => setAiTargetWordCount(parseInt(e.target.value) || 900)}
                data-testid="input-ai-word-count"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIAssistOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={isAIGenerating || !aiTopic.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-ai-generate"
            >
              {isAIGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Overwrite Confirmation */}
      <Dialog open={showAIOverwriteConfirm} onOpenChange={setShowAIOverwriteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace existing content?</DialogTitle>
            <DialogDescription>
              This post already has content. AI-generated content will overwrite the title, slug, description, and body.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAIOverwriteConfirm(false);
              setPendingAIResult(null);
            }}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                setShowAIOverwriteConfirm(false);
                if (pendingAIResult) applyAIResult(pendingAIResult);
              }}
            >
              Replace
            </Button>
          </DialogFooter>
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
