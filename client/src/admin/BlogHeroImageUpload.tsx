import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper to get admin token
const getAdminToken = () => {
  return localStorage.getItem('memopyk-admin-token') || 
         sessionStorage.getItem('memopyk-admin-token') || '';
};

interface BlogHeroImageUploadProps {
  currentImageUrl: string | null;
  onImageSelect: (url: string) => void;
}

type BlogImage = {
  name: string;
  url: string;
  size: number;
  created_at: string;
};

export function BlogHeroImageUpload({ currentImageUrl, onImageSelect }: BlogHeroImageUploadProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing images
  const { data: imagesData, isLoading, refetch } = useQuery({
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
    enabled: isDialogOpen
  });

  const images: BlogImage[] = imagesData?.data || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

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
      
      toast({
        title: "Success!",
        description: "Image uploaded successfully"
      });

      // Select the newly uploaded image
      onImageSelect(result.data.url);
      
      // Refresh the images list
      refetch();
      
      // Close dialog
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (url: string) => {
    onImageSelect(url);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>Hero Image</Label>
      
      {/* Current Image Preview - Matches published site appearance */}
      {currentImageUrl && (
        <div className="relative w-full h-64 md:h-80 bg-[#2A4759] rounded-lg overflow-hidden">
          <img 
            src={currentImageUrl} 
            alt="Hero" 
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Browse/Upload Button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            data-testid="button-browse-hero-image"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {currentImageUrl ? 'Change Hero Image' : 'Select Hero Image'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Hero Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload New Image */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="hero-image-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload new image
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      PNG, JPG, GIF, WEBP up to 5MB
                    </span>
                    <input
                      id="hero-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                      data-testid="input-upload-hero-image"
                    />
                    <Button 
                      type="button" 
                      className="mt-3"
                      disabled={isUploading}
                      onClick={() => document.getElementById('hero-image-upload')?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Browse Existing Images */}
            <div>
              <h3 className="text-sm font-medium mb-3">Or select from existing images</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No images found. Upload your first image above.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image) => (
                    <button
                      key={image.url}
                      type="button"
                      onClick={() => handleImageSelect(image.url)}
                      className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#D67C4A] transition-colors group"
                      data-testid={`button-select-image-${image.name}`}
                    >
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                          Select
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image URL Display */}
      {currentImageUrl && (
        <p className="text-xs text-gray-500 truncate">{currentImageUrl}</p>
      )}
    </div>
  );
}
