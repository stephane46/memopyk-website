import { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
import 'tinymce/plugins/emoticons';
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

function TinyMCEEditor({ value, onChange }: HtmlEditorProps) {
  // Get admin token for authenticated uploads
  const getAdminToken = () => {
    return localStorage.getItem('memopyk-admin-token') || 
           sessionStorage.getItem('memopyk-admin-token') || '';
  };

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

  // Custom file picker for images and videos
  const handleFilePicker = (callback: any, value: any, meta: any) => {
    // Check if user is authenticated
    const token = getAdminToken();
    
    if (!token) {
      alert('⚠️ Authentication token not found.\n\nPlease logout and login again to fix this issue.');
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    
    // Set appropriate file types based on what's being inserted
    if (meta.filetype === 'image') {
      input.setAttribute('accept', 'image/jpeg,image/jpg,image/png,image/webp,image/gif');
    } else if (meta.filetype === 'media') {
      input.setAttribute('accept', 'video/mp4,video/webm,video/quicktime');
    } else {
      // Fallback: accept both
      input.setAttribute('accept', 'image/*,video/*');
    }

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
          const error = await response.json();
          
          // Handle authentication errors specifically
          if (response.status === 401) {
            throw new Error('Your session has expired. Please login again and retry.');
          }
          
          throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        
        // Return file URL to TinyMCE
        callback(result.url, { title: file.name, alt: file.name });
      } catch (error) {
        console.error('File upload error:', error);
        alert('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    input.click();
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
    <div className="border rounded-lg overflow-hidden bg-white">
      <Editor
        licenseKey="gpl"
        value={value}
        init={{
          height: 500,
          menubar: false,
          plugins: 'link lists advlist table code codesample image media preview fullscreen charmap autolink searchreplace anchor wordcount emoticons visualblocks visualchars nonbreaking insertdatetime directionality autosave quickbars',
          
          // Three-row toolbar organized logically
          toolbar_mode: 'wrap',
          toolbar: [
            'undo redo | blocks fontselect fontsize lineheight styles | bold italic underline strikethrough subscript superscript | forecolor backcolor | removeformat',
            'alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | blockquote hr | ltr rtl',
            'link unlink anchor | image media table | charmap emoticons nonbreaking insertdatetime | codesample code visualblocks visualchars | searchreplace wordcount | preview fullscreen'
          ],
          
          branding: false,
          promotion: false,
          content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }',
          
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
          
          // Paste event handler for auto-import of external file URLs
          setup: (editor: any) => {
            editor.on('paste', (e: any) => handlePaste(editor, e));
          }
        }}
        onEditorChange={(content) => onChange(content)}
      />
    </div>
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
