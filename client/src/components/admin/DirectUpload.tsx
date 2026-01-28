import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface DirectUploadProps {
  onUploadComplete: (result: { url: string; filename: string; static_image_url?: string | null; auto_crop_settings?: any | null }) => void;
  onUploadError?: (error: string) => void;
  type?: 'video' | 'image';
  bucket?: string;
  acceptedTypes?: string;
  maxSizeMB?: number;
  children?: React.ReactNode;
  uploadId?: string;
  currentFilename?: string;
}

interface UploadState {
  status: 'idle' | 'generating' | 'uploading' | 'completing' | 'success' | 'error';
  progress: number;
  error?: string;
  file?: File;
}

export default function DirectUpload({ 
  onUploadComplete, 
  onUploadError = (error) => console.error('Upload error:', error), 
  type = 'video',
  bucket = 'memopyk-videos',
  acceptedTypes,
  maxSizeMB = 5000,
  children,
  uploadId = 'direct-upload',
  currentFilename
}: DirectUploadProps) {
  // Set default accepted types based on type
  const defaultAcceptedTypes = type === 'video' ? 'video/*' : 'image/*';
  const finalAcceptedTypes = acceptedTypes || defaultAcceptedTypes;
  
  // DEBUG: Log component configuration to help troubleshoot upload dialog issues
  React.useEffect(() => {
    console.log(`🔧 DirectUpload Component Initialized:`, {
      uploadId,
      type,
      acceptedTypes,
      defaultAcceptedTypes,
      finalAcceptedTypes,
      bucket
    });
  }, [uploadId, type, acceptedTypes, defaultAcceptedTypes, finalAcceptedTypes, bucket]);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: `File too large. Maximum size is ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(2)}MB.`
      });
      onUploadError(`File too large: ${fileSizeMB.toFixed(2)}MB`);
      return;
    }

    setUploadState({
      status: 'generating',
      progress: 10,
      file
    });

    try {
      console.log(`🎬 DIRECT UPLOAD STARTED:`);
      console.log(`   - File: ${file.name}`);
      console.log(`   - Size: ${fileSizeMB.toFixed(2)}MB`);
      console.log(`   - Type: ${file.type}`);
      console.log(`   - Bucket: ${bucket}`);

      // Step 1: Generate signed upload URL
      setUploadState(prev => ({ ...prev, status: 'generating', progress: 20 }));
      
      const signedUrlResponse = await fetch('/api/upload/generate-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          bucket: bucket
        })
      });

      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json();
        throw new Error(errorData.error || 'Failed to generate upload URL');
      }

      const { signedUrl, publicUrl, filename } = await signedUrlResponse.json();
      console.log(`✅ Signed URL generated for: ${filename}`);

      // Step 2: Upload directly to Supabase
      setUploadState(prev => ({ ...prev, status: 'uploading', progress: 30 }));

      console.log(`🔗 Attempting direct upload to Supabase signed URL...`);
      console.log(`📊 File details: ${file.name} (${file.size} bytes, ${file.type})`);
      
      // Try direct upload to Supabase first, fallback to server-side upload if failed
      let uploadSuccess = false;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for direct upload
        
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`📤 Direct upload response: ${uploadResponse.status} ${uploadResponse.statusText}`);
        
        if (uploadResponse.ok) {
          console.log(`✅ Direct upload to Supabase successful: ${filename}`);
          uploadSuccess = true;
          setUploadState(prev => ({ ...prev, progress: 80 }));
        } else {
          throw new Error(`Direct upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
      } catch (directUploadError) {
        console.log(`⚠️ Direct upload failed, trying server-side upload fallback...`);
        console.log(`Error: ${directUploadError.message}`);
        
        // Fallback: Upload through our server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('filename', filename);
        
        const serverUploadResponse = await fetch('/api/upload/server-side-upload', {
          method: 'POST',
          body: formData
        });
        
        if (!serverUploadResponse.ok) {
          const errorData = await serverUploadResponse.json();
          throw new Error(errorData.error || 'Server-side upload failed');
        }
        
        const serverResult = await serverUploadResponse.json();
        console.log(`✅ Server-side upload successful: ${serverResult.filename}`);
        uploadSuccess = true;
        setUploadState(prev => ({ ...prev, progress: 80 }));
      }

      // Step 3: Complete the upload (for caching and database updates)
      setUploadState(prev => ({ ...prev, status: 'completing', progress: 90 }));

      const completeResponse = await fetch('/api/upload/complete-direct-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicUrl,
          filename,
          bucket,
          fileType: file.type
        })
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const result = await completeResponse.json();
      console.log(`✅ Direct upload completed successfully: ${filename}`);
      
      // Log auto-thumbnail results if available
      if (result.static_image_url) {
        console.log(`🎯 Auto-thumbnail generated: ${result.static_image_url}`);
        console.log(`🎯 Auto-crop settings:`, result.auto_crop_settings);
      }

      setUploadState({
        status: 'success',
        progress: 100,
        file
      });

      // Reset only this component's file input after successful upload
      const fileInput = document.getElementById(`${uploadId}-input`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      onUploadComplete({
        url: publicUrl,
        filename,
        // Include auto-generated thumbnail info for images
        static_image_url: result.static_image_url || null,
        auto_crop_settings: result.auto_crop_settings || null
      });

      // Auto-reset after 2 seconds to prepare for next upload
      setTimeout(() => {
        resetUpload();
      }, 2000);

    } catch (error) {
      console.error('❌ Direct upload failed:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState({
        status: 'error',
        progress: 0,
        error: errorMessage,
        file
      });

      onUploadError(errorMessage);
    }
  };

  const resetUpload = () => {
    setUploadState({
      status: 'idle',
      progress: 0
    });
    
    // Clear only this component's file input
    const fileInput = document.getElementById(`${uploadId}-input`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getStatusMessage = () => {
    switch (uploadState.status) {
      case 'generating':
        return 'Génération de l\'URL signée...';
      case 'uploading':
        return 'Téléchargement vers le stockage cloud...';
      case 'completing':
        return 'Finalisation du téléchargement...';
      case 'success':
        return '✅ Téléchargement réussi! Prêt pour le suivant...';
      case 'error':
        return uploadState.error || 'Échec du téléchargement';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const isUploading = ['generating', 'uploading', 'completing'].includes(uploadState.status);

  return (
    <div className="space-y-4">
      {children ? (
        <div className="relative">
          <input
            type="file"
            accept={finalAcceptedTypes}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {children}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept={finalAcceptedTypes}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id={`${uploadId}-input`}
          />
          <label 
            htmlFor={`${uploadId}-input`} 
            className={`cursor-pointer flex flex-col items-center space-y-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {getStatusIcon()}
            <span className="text-sm font-medium">
              {isUploading ? 'Téléchargement en cours...' : 'Cliquez pour choisir un fichier'}
            </span>
            <span className="text-xs text-gray-500">
              {finalAcceptedTypes} • Max {maxSizeMB}MB • Contourne les limites serveur
            </span>
          </label>
        </div>
      )}

      {uploadState.status !== 'idle' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-2">
              {getStatusIcon()}
              <span>{getStatusMessage()}</span>
            </span>
            {uploadState.file && (
              <span className="text-gray-500">
                {uploadState.file.name} ({(uploadState.file.size / 1024 / 1024).toFixed(2)}MB)
              </span>
            )}
          </div>
          
          {isUploading && (
            <Progress value={uploadState.progress} className="w-full" />
          )}

          {uploadState.status === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">{uploadState.error}</span>
            </div>
          )}

          {uploadState.status === 'success' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Upload completed successfully! File is now available in cloud storage.
              </span>
            </div>
          )}

          {(uploadState.status === 'success' || uploadState.status === 'error') && (
            <Button onClick={resetUpload} variant="outline" size="sm">
              Upload Another File
            </Button>
          )}
        </div>
      )}
    </div>
  );
}