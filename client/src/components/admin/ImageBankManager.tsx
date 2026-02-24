import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest, adminFetch } from '@/lib/queryClient';
import { fmtDDMMYY } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  FileText,
  Tag,
  Plus,
  Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ImageBankItem, ImageLabel } from '@shared/schema';
import { ImageLabelPicker } from './ImageLabelPicker';
import { ImageBankSkeleton } from '@/admin/skeletons/ImageBankSkeleton';

const CATEGORIES = [
  'Photo Organization & Preservation',
  'Video Memory & Legacy',
  'Family Storytelling & Traditions',
  'Digital Organization & Technology',
  'Memory Products & Crafts',
  'Seasonal & Holiday Content',
  'General',
];

interface FileMetadata {
  file: File;
  altText: string;
  category: string;
  labels: ImageLabel[];  // Changed from tags string to ImageLabel array
}

// Helper component to load and convert existing labels
function EditImageLabels({ image, onLabelsChange }: { image: ImageBankItem, onLabelsChange: (labels: ImageLabel[]) => void }) {
  const { data: allLabelsData } = useQuery({
    queryKey: ['/api/image-labels'],
    queryFn: async () => {
      const res = await adminFetch('/api/image-labels');
      if (!res.ok) throw new Error('Failed to fetch labels');
      return res.json();
    },
    staleTime: 0, // Always fetch fresh data to ensure we have all labels
  });

  const allLabels: ImageLabel[] = allLabelsData?.data || [];
  
  // Convert existing tag strings to ImageLabel objects by matching with all labels
  const selectedLabels = (image.tags || [])
    .map(tagName => {
      const found = allLabels.find(l => l.name === tagName);
      if (found) return found;
      
      // If label doesn't exist in database yet (edge case), create temporary object
      console.warn(`Label "${tagName}" not found in database, creating temporary label`);
      return {
        id: `temp-${tagName}`,
        name: tagName,
        color: '#94a3b8', // gray fallback color
        usageCount: 0,
        createdBy: 'unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ImageLabel;
    });

  return (
    <ImageLabelPicker
      selectedLabels={selectedLabels}
      onLabelsChange={onLabelsChange}
      placeholder="Add labels to organize this image..."
    />
  );
}

export function ImageBankManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [usageFilter, setUsageFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [labelManagementOpen, setLabelManagementOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageBankItem | null>(null);
  const [usedInPosts, setUsedInPosts] = useState<Array<{ id: string; title: string; slug: string }>>([]);

  // Upload state - keep metadata separate from File objects
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Fetch all labels for color mapping on cards
  const { data: allLabelsData } = useQuery({
    queryKey: ['/api/image-labels'],
    queryFn: async () => {
      const res = await adminFetch('/api/image-labels');
      if (!res.ok) throw new Error('Failed to fetch labels');
      return res.json();
    },
  });
  
  const allLabels: ImageLabel[] = allLabelsData?.data || [];

  // Memoize object URLs to prevent recreation on every render
  const filePreviewUrls = useMemo(() => {
    return selectedFiles.map(({ file }) => {
      try {
        return URL.createObjectURL(file);
      } catch (error) {
        console.error('Error creating object URL:', error);
        return '';
      }
    });
  }, [selectedFiles]);

  // Cleanup object URLs when files change or component unmounts
  useEffect(() => {
    return () => {
      filePreviewUrls.forEach(url => {
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Error revoking object URL:', error);
          }
        }
      });
    };
  }, [filePreviewUrls]);

  // Fetch images with filters
  const { data: images = [], isLoading } = useQuery<ImageBankItem[]>({
    queryKey: ['/api/image-bank', categoryFilter, usageFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (usageFilter !== 'all') params.append('usage', usageFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await adminFetch(`/api/image-bank?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/image-bank/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-bank'] });
      toast({
        title: 'Image deleted',
        description: 'Image has been removed from the bank',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ImageBankItem> }) => {
      const response = await apiRequest(`/api/image-bank/${id}`, 'PATCH', updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-bank'] });
      toast({
        title: 'Image updated',
        description: 'Image metadata has been updated',
      });
      setEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).map((file) => ({
      file,
      altText: '',
      category: 'General',
      labels: [],  // Changed to labels array
    }));
    setSelectedFiles(files);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        file,
        altText: '',
        category: 'General',
        labels: [],  // Changed to labels array
      }));
    setSelectedFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Update file metadata
  const updateFileMetadata = (
    index: number,
    field: 'altText' | 'category',
    value: string
  ) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Update labels for a specific file
  const updateFileLabels = (index: number, labels: ImageLabel[]) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, labels } : item
      )
    );
  };

  // Remove file from upload list
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const fileData of selectedFiles) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('altText', fileData.altText || '');
        formData.append('category', fileData.category || 'General');
        // Convert labels array to comma-separated names for now (backend compatibility)
        const labelNames = fileData.labels.map(l => l.name).join(', ');
        formData.append('tags', labelNames);

        // Upload to backend
        const response = await adminFetch('/api/image-bank/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload ${fileData.file.name}`);
        }
      }

      toast({
        title: 'Upload successful',
        description: `${selectedFiles.length} image(s) uploaded to bank`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/image-bank'] });
      setSelectedFiles([]);
      setUploadModalOpen(false);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Open modals
  const openImageDetails = async (image: ImageBankItem) => {
    setSelectedImage(image);
    setDetailsModalOpen(true);
    
    // Fetch post details if image is used in posts
    if (image.usedInPosts && image.usedInPosts.length > 0) {
      try {
        const response = await adminFetch('/api/admin/blog/posts');
        if (response.ok) {
          const allPosts = await response.json();
          const usedInPostsArray = image.usedInPosts || [];
          const relevantPosts = allPosts
            .filter((post: any) => usedInPostsArray.includes(post.id))
            .map((post: any) => ({
              id: post.id,
              title: post.title,
              slug: post.slug,
            }));
          setUsedInPosts(relevantPosts);
        }
      } catch (error) {
        console.error('Error fetching post details:', error);
        setUsedInPosts([]);
      }
    } else {
      setUsedInPosts([]);
    }
  };

  const openEditModal = (image: ImageBankItem) => {
    setSelectedImage(image);
    setEditModalOpen(true);
  };

  const deleteImage = async (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      deleteMutation.mutate(id);
    }
  };

  const usedCount = images.filter(img => (img.usageCount ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mt-8 mb-3">
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Images</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{images.length}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Used in Posts</span>
            <span className="text-base font-bold text-green-600 dark:text-green-400">{usedCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Button
            onClick={() => setLabelManagementOpen(true)}
            variant="outline"
            data-testid="button-manage-labels"
          >
            <Tag className="w-4 h-4 mr-2" />
            Manage Labels
          </Button>
          <Button
            onClick={() => setUploadModalOpen(true)}
            data-testid="button-upload-images"
            className="bg-[#D67C4A] hover:bg-[#C56B39]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Images
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[280px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.split(' & ')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Usage Filter */}
        <Select value={usageFilter} onValueChange={setUsageFilter}>
          <SelectTrigger className="w-full md:w-[200px]" data-testid="select-usage-filter">
            <SelectValue placeholder="All Images" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Images</SelectItem>
            <SelectItem value="unused">Unused Only</SelectItem>
            <SelectItem value="used">Used in Posts</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search by filename, alt text, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Image Grid */}
      {isLoading ? (
        <ImageBankSkeleton />
      ) : images.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No images found. Upload some images to get started.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <Card 
              key={image.id} 
              className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-[#D67C4A] transition-all" 
              onClick={() => openImageDetails(image)}
              data-testid={`card-image-${image.id}`}
            >
              {/* Image Preview */}
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                <img
                  src={image.publicUrl}
                  alt={image.altText || image.filename}
                  className="w-full h-full object-cover"
                />

                {/* Hover Overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center gap-3 bg-transparent group-hover:bg-black/60 pointer-events-none group-hover:pointer-events-auto transition-all duration-300"
                  data-testid={`overlay-${image.id}`}
                >
                  <button
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageDetails(image);
                    }}
                    data-testid={`button-view-${image.id}`}
                    title="View details"
                  >
                    <Eye className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(image);
                    }}
                    data-testid={`button-edit-${image.id}`}
                    title="Edit image"
                  >
                    <Edit className="w-5 h-5 text-[#D67C4A]" />
                  </button>
                  <button
                    className="w-10 h-10 flex items-center justify-center bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 hover:shadow-lg hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                    data-testid={`button-delete-${image.id}`}
                    title="Delete image"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Usage Badge - Always show */}
                <Badge 
                  className={`absolute top-2 right-2 ${
                    (image.usageCount ?? 0) > 0 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  data-testid={`badge-usage-${image.id}`}
                >
                  {(image.usageCount ?? 0) > 0 ? `Used in ${image.usageCount} post${image.usageCount !== 1 ? 's' : ''}` : 'Unused'}
                </Badge>
              </div>

              {/* Image Info */}
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold truncate leading-tight" data-testid={`text-filename-${image.id}`}>
                  {image.originalFilename}
                </p>
                
                {/* Category and Size */}
                <div className="flex items-center justify-between gap-2">
                  {image.category && (
                    <Badge variant="outline" className="text-xs font-medium bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                      {image.category.split(' & ')[0]}
                    </Badge>
                  )}
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {(image.fileSizeBytes / 1024).toFixed(1)}KB
                  </span>
                </div>

                {/* Image Labels (renamed from Tags) */}
                {image.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {image.tags.slice(0, 2).map((tag) => {
                      const label = allLabels.find(l => l.name === tag);
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs"
                        >
                          <span 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label?.color || '#94a3b8' }}
                          />
                          {tag}
                        </span>
                      );
                    })}
                    {image.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs">
                        +{image.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Images to Bank</DialogTitle>
            <DialogDescription>
              Add new royalty-free images for use in blog posts
            </DialogDescription>
          </DialogHeader>

          {/* Drag & Drop Zone */}
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Drop images here or click to browse</p>
            <p className="text-sm text-gray-500 mt-2">
              Supports JPG, PNG, WebP up to 5MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Preview Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Selected Images ({selectedFiles.length})</h3>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {selectedFiles.map((fileData, index) => (
                  <div key={index} className="flex items-start gap-4 p-3 border rounded">
                    {filePreviewUrls[index] && (
                      <img
                        src={filePreviewUrls[index]}
                        alt={fileData.file.name}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-2 min-w-0">
                      <Input
                        placeholder="Alt text (optional)"
                        value={fileData.altText}
                        onChange={(e) => updateFileMetadata(index, 'altText', e.target.value)}
                      />
                      <Select
                        value={fileData.category}
                        onValueChange={(val) => updateFileMetadata(index, 'category', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ImageLabelPicker
                        selectedLabels={fileData.labels}
                        onLabelsChange={(labels) => updateFileLabels(index, labels)}
                        placeholder="Add image labels (optional)"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-[#D67C4A] hover:bg-[#C56B39]"
              data-testid="button-confirm-upload"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal (Placeholder) */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedImage.publicUrl}
                  alt={selectedImage.altText || ''}
                  className="w-full rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Filename</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImage.originalFilename}
                  </p>
                </div>
                {selectedImage.width && selectedImage.height && (
                  <div>
                    <label className="text-sm font-medium">Dimensions</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedImage.width} × {selectedImage.height}px
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">File Size</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(selectedImage.fileSizeBytes / 1024)}KB
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImage.category || 'None'}
                  </p>
                </div>
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Image Labels</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedImage.tags.map((tag) => {
                        const label = allLabels.find(l => l.name === tag);
                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm"
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: label?.color || '#94a3b8' }}
                            />
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Usage</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImage.usageCount === 0 ? (
                      'Not used in any posts'
                    ) : (
                      <>
                        Used in {selectedImage.usageCount} post
                        {selectedImage.usageCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </p>
                  {selectedImage.lastUsedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Last used: {fmtDDMMYY(selectedImage.lastUsedAt)}
                    </p>
                  )}
                  
                  {/* List of posts using this image */}
                  {usedInPosts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Used in these posts:
                      </p>
                      <div className="space-y-1">
                        {usedInPosts.map((post) => (
                          <a
                            key={post.id}
                            href={`/admin?section=blog&tab=posts`}
                            className="block text-xs text-[#D67C4A] hover:text-[#C56B39] underline"
                            onClick={() => setDetailsModalOpen(false)}
                          >
                            → {post.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDetailsModalOpen(false);
                if (selectedImage) openEditModal(selectedImage);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Image Metadata</DialogTitle>
            <DialogDescription>
              Update alt text, category, and tags for this image
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={selectedImage.publicUrl}
                  alt={selectedImage.altText || ''}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="text-sm font-medium">Alt Text</label>
                <Input
                  placeholder="Descriptive alt text for accessibility"
                  defaultValue={selectedImage.altText || ''}
                  onChange={(e) => {
                    setSelectedImage({ ...selectedImage, altText: e.target.value });
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={selectedImage.category || 'General'}
                  onValueChange={(val) => {
                    setSelectedImage({ ...selectedImage, category: val });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Labels */}
              <div>
                <label className="text-sm font-medium mb-2 block">Image Labels</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Add colored labels to organize and categorize your images
                </p>
                <EditImageLabels
                  image={selectedImage}
                  onLabelsChange={(labels) => {
                    const tags = labels.map(l => l.name);
                    setSelectedImage({ ...selectedImage, tags });
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedImage) {
                  updateMutation.mutate({
                    id: selectedImage.id,
                    updates: {
                      altText: selectedImage.altText,
                      category: selectedImage.category,
                      tags: selectedImage.tags,
                    },
                  });
                }
              }}
              disabled={updateMutation.isPending}
              className="bg-[#D67C4A] hover:bg-[#C56B39]"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label Management Modal */}
      <LabelManagementModal 
        open={labelManagementOpen}
        onOpenChange={setLabelManagementOpen}
      />
    </div>
  );
}

// Label Management Modal Component
function LabelManagementModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [editingLabel, setEditingLabel] = useState<ImageLabel | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [editedName, setEditedName] = useState('');

  // Fetch all labels
  const { data: labelsData, refetch } = useQuery({
    queryKey: ['/api/image-labels'],
    queryFn: async () => {
      const res = await adminFetch('/api/image-labels');
      if (!res.ok) throw new Error('Failed to fetch labels');
      return res.json();
    },
    enabled: open,
  });

  const labels: ImageLabel[] = labelsData?.data || [];

  // Create label mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('/api/image-labels', 'POST', { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create label');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-labels'] });
      setNewLabelName('');
      toast({ title: '✅ Label Created' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update label mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest(`/api/image-labels/${id}`, 'PATCH', { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update label');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-labels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/image-bank'] });
      setEditingLabel(null);
      setEditedName('');
      toast({ title: '✅ Label Updated' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete label mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/image-labels/${id}`, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/image-labels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/image-bank'] });
      toast({ title: '✅ Label Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    if (!newLabelName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Label name cannot be empty', variant: 'destructive' });
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate(newLabelName.trim());
  };

  const handleUpdate = (label: ImageLabel) => {
    if (!editedName.trim()) {
      toast({ title: '⚠️ Invalid Name', description: 'Label name cannot be empty', variant: 'destructive' });
      return;
    }
    if (updateMutation.isPending) return;
    updateMutation.mutate({ id: label.id, name: editedName.trim() });
  };

  const handleDelete = (label: ImageLabel) => {
    if (label.usageCount && label.usageCount > 0) {
      if (!confirm(`This label is used in ${label.usageCount} image(s). Delete anyway?`)) {
        return;
      }
    }
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(label.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Image Labels</DialogTitle>
          <DialogDescription>
            Create, edit, or delete labels for organizing your images
          </DialogDescription>
        </DialogHeader>

        {/* Create New Label */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New label name..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              data-testid="input-new-label-name"
            />
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newLabelName.trim()}
              className="bg-[#D67C4A] hover:bg-[#C56B39]"
              data-testid="button-create-label"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>

          {/* Labels List */}
          <div className="space-y-2">
            {labels.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No labels yet. Create one above!</p>
            ) : (
              labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  data-testid={`label-row-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {editingLabel?.id === label.id ? (
                    <>
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(label);
                          if (e.key === 'Escape') { setEditingLabel(null); setEditedName(''); }
                        }}
                        className="flex-1"
                        autoFocus
                        data-testid="input-edit-label-name"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(label)}
                        disabled={updateMutation.isPending}
                        className="bg-[#D67C4A] hover:bg-[#C56B39]"
                        data-testid="button-save-label"
                      >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingLabel(null); setEditedName(''); }}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 font-medium">{label.name}</span>
                      <span className="text-xs text-gray-500 min-w-[60px] text-right">
                        {label.usageCount || 0} image{(label.usageCount || 0) !== 1 ? 's' : ''}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingLabel(label);
                          setEditedName(label.name);
                        }}
                        data-testid={`button-edit-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(label)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
