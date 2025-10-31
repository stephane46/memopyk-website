import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Editor } from '@tinymce/tinymce-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/table';
import 'tinymce/plugins/code';
import 'tinymce/plugins/image';
import 'tinymce/plugins/media';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/autosave';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/quickbars';
import 'tinymce/skins/ui/oxide/skin.min.css';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  const editorEngine = import.meta.env.VITE_EDITOR_ENGINE || 'tinymce';

  if (editorEngine === 'quill') {
    return <QuillEditor value={value} onChange={onChange} />;
  }

  return <TinyMCEEditor value={value} onChange={onChange} />;
}

type BlogImage = {
  name: string;
  url: string;
  size: number;
  created_at: string;
};

function TinyMCEEditor({ value, onChange }: HtmlEditorProps) {
  // State for image picker modal
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const imagePickerCallbackRef = useRef<any>(null);

  // Get admin token for authenticated uploads
  const getAdminToken = () => {
    return localStorage.getItem('memopyk-admin-token') || 
           sessionStorage.getItem('memopyk-admin-token') || '';
  };

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

  const allImages: BlogImage[] = imagesData?.data || [];
  const filteredImages = searchTerm
    ? allImages.filter(img => img.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : allImages;

  // Custom image upload handler - uploads to Directus via our proxy
  const handleImageUpload = async (blobInfo: any, progress: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('file', blobInfo.blob(), blobInfo.filename());
    
    const response = await fetch('/api/admin/upload', {
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
    return result.url; // Returns /assets/{id} URL
  };

  // Custom file picker - Opens modal for image selection
  const handleFilePicker = (callback: any, value: any, meta: any) => {
    // Check if user is authenticated
    const token = getAdminToken();
    
    if (!token) {
      alert('⚠️ Authentication token not found.\n\nPlease logout and login again to fix this issue.');
      return;
    }

    // Only open modal for images (not videos)
    if (meta.filetype === 'image') {
      // Store callback and open modal
      imagePickerCallbackRef.current = callback;
      setIsImagePickerOpen(true);
    } else {
      // For non-image files, fall back to direct file input
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'video/mp4,video/webm,video/quicktime');
      
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch('/api/admin/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Upload failed');
          }
          
          const result = await response.json();
          callback(result.url, { title: file.name, alt: file.name });
        } catch (error) {
          console.error('File upload error:', error);
          alert('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      };
      input.click();
    }
  };

  // Handle file upload from modal
  const handleModalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB');
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
      
      // Call TinyMCE callback with the uploaded image URL
      if (imagePickerCallbackRef.current) {
        imagePickerCallbackRef.current(result.data.url, { title: file.name, alt: file.name });
      }
      
      // Refresh images list
      refetchImages();
      
      // Close modal
      setIsImagePickerOpen(false);
    } catch (error) {
      alert('Failed to upload image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image selection from modal
  const handleImageSelect = (url: string, name: string) => {
    if (imagePickerCallbackRef.current) {
      imagePickerCallbackRef.current(url, { title: name, alt: name });
    }
    setIsImagePickerOpen(false);
  };

  // Handle paste events to auto-import external file URLs
  const handlePaste = async (editor: any, e: any) => {
    const pastedText = e.clipboardData?.getData('text/plain');
    if (!pastedText) return;

    // Check if it's an image or video URL
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i;
    const match = pastedText.trim().match(urlPattern);
    
    if (match) {
      e.preventDefault();
      
      try {
        console.log('🔗 Importing external file URL:', pastedText);
        
        const response = await fetch('/api/admin/fetch-external', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: pastedText.trim() })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to import file');
        }
        
        const result = await response.json();
        const isVideo = result.mimetype?.startsWith('video/');
        
        // Insert the imported file into editor
        if (isVideo) {
          editor.insertContent(`<video src="${result.url}" controls></video>`);
        } else {
          editor.insertContent(`<img src="${result.url}" alt="${result.filename}" loading="lazy" />`);
        }
        
        console.log('✅ External file imported:', result.url);
      } catch (error) {
        console.error('❌ Failed to import external file:', error);
        // Fallback: paste as text
        editor.insertContent(pastedText);
      }
    }
  };

  return (
    <>
      {/* Image Picker Modal */}
      <Dialog open={isImagePickerOpen} onOpenChange={setIsImagePickerOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select or Upload Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="inline-image-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload new image
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      PNG, JPG, GIF, WEBP up to 5MB
                    </span>
                    <input
                      id="inline-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleModalFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      className="mt-3"
                      disabled={isUploading}
                      onClick={() => document.getElementById('inline-image-upload')?.click()}
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

            {/* Search and Browse Existing Images */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search images by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {imagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D67C4A]" />
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'No images match your search.' : 'No images found. Upload your first image above.'}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredImages.map((image) => (
                    <button
                      key={image.url}
                      type="button"
                      onClick={() => handleImageSelect(image.url, image.name)}
                      className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#D67C4A] transition-colors group"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* TinyMCE Editor */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Editor
          licenseKey="gpl"
          value={value}
          init={{
          height: 500,
          menubar: false,
          plugins: 'link lists advlist table code codesample image media preview fullscreen charmap autolink searchreplace anchor wordcount visualblocks visualchars nonbreaking insertdatetime directionality autosave quickbars',
          
          // Three-row toolbar organized logically
          toolbar_mode: 'wrap',
          toolbar: [
            'undo redo | blocks fontselect fontsize lineheight styles | bold italic underline strikethrough subscript superscript | forecolor backcolor | removeformat',
            'alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | blockquote hr | ltr rtl',
            'link unlink anchor | image media table | charmap nonbreaking insertdatetime | codesample code visualblocks visualchars | searchreplace wordcount | preview fullscreen'
          ],
          
          branding: false,
          promotion: false,
          content_style: `
            body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }
            
            /* Default max-width for images in editor before sizing class is applied */
            img:not([class*="img-"]) { 
              max-width: 600px; 
              height: auto; 
              display: block;
              margin: 1rem auto;
            }
            
            /* Image sizing classes */
            img.img-quarter {
              max-width: 25% !important;
              height: auto !important;
            }
            
            img.img-half {
              max-width: 50% !important;
              height: auto !important;
            }
            
            img.img-three-quarter {
              max-width: 75% !important;
              height: auto !important;
            }
            
            img.img-full {
              max-width: 100% !important;
              height: auto !important;
            }
            
            /* Block alignment (no text wrap) */
            img.align-left {
              display: block !important;
              margin-left: 0 !important;
              margin-right: auto !important;
              margin-bottom: 1.5rem !important;
              margin-top: 0 !important;
            }
            
            img.align-center {
              display: block !important;
              margin-left: auto !important;
              margin-right: auto !important;
              margin-bottom: 1.5rem !important;
              margin-top: 0 !important;
            }
            
            img.align-right {
              display: block !important;
              margin-left: auto !important;
              margin-right: 0 !important;
              margin-bottom: 1.5rem !important;
              margin-top: 0 !important;
            }
            
            /* Float alignment (text wraps around) */
            img.float-left {
              float: left !important;
              margin: 0 2rem 1.5rem 0 !important;
              max-width: 50% !important;
              display: block !important;
            }
            
            img.float-right {
              float: right !important;
              margin: 0 0 1.5rem 2rem !important;
              max-width: 50% !important;
              display: block !important;
            }
          `,
          
          // Line height options (spacing between lines)
          lineheight_formats: '1 1.1 1.2 1.3 1.4 1.5 1.6 1.8 2 2.5 3',
          
          // Custom spacing styles (works on paragraphs AND headings)
          style_formats: [
            { title: 'Spacing', items: [
              { title: 'No Space', selector: 'p,h1,h2,h3,h4,h5,h6', styles: { 'margin-top': '0', 'margin-bottom': '0' } },
              { title: 'Small Space', selector: 'p,h1,h2,h3,h4,h5,h6', styles: { 'margin-top': '0.5em', 'margin-bottom': '0.5em' } },
              { title: 'Normal Space', selector: 'p,h1,h2,h3,h4,h5,h6', styles: { 'margin-top': '1em', 'margin-bottom': '1em' } },
              { title: 'Large Space', selector: 'p,h1,h2,h3,h4,h5,h6', styles: { 'margin-top': '1.5em', 'margin-bottom': '1.5em' } },
              { title: 'Extra Large Space', selector: 'p,h1,h2,h3,h4,h5,h6', styles: { 'margin-top': '2em', 'margin-bottom': '2em' } }
            ]}
          ],
          
          // Enable visual resize handles on images/tables/media
          object_resizing: true,
          resize_img_proportional: true,
          
          // Explicitly enable image editing features
          image_advtab: true,
          image_caption: true,
          image_dimensions: true,
          
          // Block formats (headings, paragraphs)
          block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
          
          // Font sizes
          fontsize_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt',
          
          // Link settings
          link_default_target: '_blank',
          link_default_protocol: 'https',
          autolink_pattern: /^(https?:\/\/|www\.)/i,
          
          // Table settings
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            width: '100%'
          },
          
          // Image upload settings
          automatic_uploads: true,
          paste_data_images: false, // Prevent base64 images in content
          images_upload_handler: handleImageUpload,
          file_picker_types: 'image media',
          file_picker_callback: handleFilePicker,
          
          // Media settings (YouTube/Vimeo embeds)
          media_live_embeds: true,
          media_url_resolver: (data: any, resolve: any) => {
            // Allow YouTube and Vimeo embeds (don't download)
            if (data.url.includes('youtube.com') || data.url.includes('youtu.be') || 
                data.url.includes('vimeo.com')) {
              resolve({ html: '' }); // Let TinyMCE handle embeds
            } else {
              resolve({ html: '' });
            }
          },
          
          // Advanced list settings
          advlist_bullet_styles: 'default,circle,disc,square',
          advlist_number_styles: 'default,lower-alpha,lower-roman,upper-alpha,upper-roman',
          
          // Image class list for sizing and alignment
          image_class_list: [
            { title: 'Default', value: '' },
            { title: 'Quarter - Left', value: 'img-quarter align-left' },
            { title: 'Quarter - Center', value: 'img-quarter align-center' },
            { title: 'Quarter - Right', value: 'img-quarter align-right' },
            { title: 'Half - Left', value: 'img-half align-left' },
            { title: 'Half - Center', value: 'img-half align-center' },
            { title: 'Half - Right', value: 'img-half align-right' },
            { title: 'Three-quarter - Left', value: 'img-three-quarter align-left' },
            { title: 'Three-quarter - Center', value: 'img-three-quarter align-center' },
            { title: 'Three-quarter - Right', value: 'img-three-quarter align-right' },
            { title: 'Full - Left', value: 'img-full align-left' },
            { title: 'Full - Center', value: 'img-full align-center' },
            { title: 'Full - Right', value: 'img-full align-right' },
            { title: 'Float Left (text wraps)', value: 'float-left' },
            { title: 'Float Right (text wraps)', value: 'float-right' },
          ],
          
          // Setup editor events
          setup: (editor: any) => {
            // Paste event handler for auto-import of external file URLs
            editor.on('paste', (e: any) => handlePaste(editor, e));
            
            // Intercept when any dialog opens
            let imageDialogApi: any = null;
            
            editor.on('OpenWindow', () => {
              setTimeout(() => {
                // Get the active dialog
                const windows = (editor as any).windowManager.getWindows();
                if (windows.length === 0) return;
                
                const dialog = document.querySelector('.tox-dialog');
                if (!dialog) return;
                
                // Check if it's the image dialog by looking for Source field
                const hasSourceField = dialog.querySelector('input[type="url"]') || 
                                       Array.from(dialog.querySelectorAll('label')).some(
                                         el => el.textContent?.includes('Source')
                                       );
                if (!hasSourceField) return;
                
                // This is the image dialog - save reference
                imageDialogApi = windows[0];
                
                const captionLabel = Array.from(dialog.querySelectorAll('label')).find(
                  el => el.textContent?.includes('Show caption')
                );
                
                if (captionLabel && !dialog.querySelector('#custom-image-size-select')) {
                  const container = captionLabel.closest('.tox-form__group')?.parentElement;
                  if (container) {
                    const sizeGroup = document.createElement('div');
                    sizeGroup.className = 'tox-form__group';
                    sizeGroup.innerHTML = `
                      <label class="tox-label">Image Size & Alignment</label>
                      <select id="custom-image-size-select" class="tox-selectfield" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Default (full width, centered)</option>
                        <option value="img-quarter align-left">Quarter - Left</option>
                        <option value="img-quarter align-center">Quarter - Center</option>
                        <option value="img-quarter align-right">Quarter - Right</option>
                        <option value="img-half align-left">Half - Left</option>
                        <option value="img-half align-center">Half - Center</option>
                        <option value="img-half align-right">Half - Right</option>
                        <option value="img-three-quarter align-left">Three-quarter - Left</option>
                        <option value="img-three-quarter align-center">Three-quarter - Center</option>
                        <option value="img-three-quarter align-right">Three-quarter - Right</option>
                        <option value="img-full align-left">Full - Left</option>
                        <option value="img-full align-center">Full - Center</option>
                        <option value="img-full align-right">Full - Right</option>
                        <option value="float-left">Float Left (text wraps)</option>
                        <option value="float-right">Float Right (text wraps)</option>
                      </select>
                    `;
                    
                    container.insertBefore(sizeGroup, captionLabel.closest('.tox-form__group'));
                    
                    const select = sizeGroup.querySelector('select') as HTMLSelectElement;
                    
                    // Set initial value from current image class
                    const currentData = imageDialogApi.getData();
                    if (currentData.class) {
                      select.value = currentData.class;
                    }
                    
                    // Update dialog data when dropdown changes
                    select?.addEventListener('change', () => {
                      const newData = { ...imageDialogApi.getData(), class: select.value };
                      imageDialogApi.setData(newData);
                    });
                  }
                }
              }, 100);
            });
          }
        }}
        onEditorChange={(content) => onChange(content)}
      />
      </div>
    </>
  );
}

function QuillEditor({ value, onChange }: HtmlEditorProps) {
  const [showSource, setShowSource] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [2, 3, 4, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link', 'image',
    'blockquote', 'code-block'
  ];

  if (showSource) {
    return (
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-gray-100 px-3 py-2 border-b">
          <button 
            onClick={() => setShowSource(false)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Visual Editor
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 font-mono text-sm"
          rows={20}
          style={{ minHeight: '400px' }}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="bg-gray-100 px-3 py-2 border-b">
        <button 
          onClick={() => setShowSource(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View Source (HTML)
        </button>
      </div>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        style={{ height: '400px', paddingBottom: '42px' }}
      />
    </div>
  );
}
