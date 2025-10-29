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
    console.log('🔑 Admin token retrieved:', token ? `${token.substring(0, 10)}...` : 'NULL');
    console.log('📦 localStorage keys:', Object.keys(localStorage));
    console.log('📦 sessionStorage keys:', Object.keys(sessionStorage));
    
    if (!token) {
      alert('⚠️ You must be logged into the admin area to upload files.\n\nPlease login and try again.');
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
          height: 460,
          menubar: false,
          plugins: 'link lists advlist table code image media preview fullscreen charmap autolink searchreplace anchor wordcount',
          toolbar: 'undo redo | bold italic underline | link image media table | bullist numlist | searchreplace | charmap | code preview fullscreen',
          branding: false,
          promotion: false,
          content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }',
          
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
