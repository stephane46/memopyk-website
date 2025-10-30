import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import DirectUpload from '@/components/admin/DirectUpload';

interface HeroImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  label?: string;
  description?: string;
}

export function HeroImageUpload({ 
  currentImageUrl, 
  onImageChange,
  label = "Hero Image",
  description = "Upload a hero image for this post (recommended: 1200×630px)"
}: HeroImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl || null);

  const handleUploadComplete = (result: { url: string; filename: string }) => {
    const publicUrl = result.url;
    setImageUrl(publicUrl);
    onImageChange(publicUrl);
  };

  const handleRemove = () => {
    setImageUrl(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-gray-900">{label}</Label>
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {imageUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={imageUrl} 
                  alt="Hero preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <DirectUpload
                  type="image"
                  bucket="memopyk-blog"
                  acceptedTypes="image/*"
                  maxSizeMB={10}
                  onUploadComplete={handleUploadComplete}
                  uploadId="hero-image-replace"
                >
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Image
                  </Button>
                </DirectUpload>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DirectUpload
          type="image"
          bucket="memopyk-blog"
          acceptedTypes="image/*"
          maxSizeMB={10}
          onUploadComplete={handleUploadComplete}
          uploadId="hero-image-upload"
        >
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#D67C4A] transition-colors cursor-pointer">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Click to upload hero image
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG up to 10MB
            </p>
          </div>
        </DirectUpload>
      )}
    </div>
  );
}
