/**
 * Shared TinyMCE configuration for all blog editors
 * Prevents configuration drift and ensures consistent behavior
 */

// Helper to get admin authentication token
export const getAdminToken = () => {
  return localStorage.getItem('memopyk-admin-token') || 
         sessionStorage.getItem('memopyk-admin-token') || '';
};

// Common content CSS for image sizing and alignment
export const EDITOR_CONTENT_CSS = `
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
`;

// Image class list configuration (appears in Advanced tab)
export const IMAGE_CLASS_LIST = [
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
];

// Default image upload handler
export const createImageUploadHandler = () => {
  return async (blobInfo: any, progress: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('image', blobInfo.blob(), blobInfo.filename());
    
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
    return result.data.url;
  };
};

interface TinyMCEConfigOptions {
  height?: number;
  menubar?: boolean;
  images_upload_handler?: (blobInfo: any, progress: (percent: number) => void) => Promise<string>;
  file_picker_callback?: (callback: any, value: any, meta: any) => void;
  setup?: (editor: any) => void;
}

/**
 * Create TinyMCE configuration with optional overrides
 */
export function createTinyMCEConfig(options: TinyMCEConfigOptions = {}) {
  return {
    height: options.height || 500,
    menubar: options.menubar !== undefined ? options.menubar : false,
    plugins: 'link lists advlist table code codesample image media preview fullscreen charmap autolink searchreplace anchor wordcount visualblocks visualchars nonbreaking insertdatetime directionality autosave quickbars',
    
    // Three-row toolbar organized logically
    toolbar_mode: 'wrap' as const,
    toolbar: [
      'undo redo | blocks fontselect fontsize lineheight styles | bold italic underline strikethrough subscript superscript | forecolor backcolor | removeformat',
      'alignleft aligncenter alignright alignjustify | outdent indent | bullist numlist | blockquote hr | ltr rtl',
      'link unlink anchor | image media table | charmap nonbreaking insertdatetime | codesample code visualblocks visualchars | searchreplace wordcount | preview fullscreen'
    ],
    
    branding: false,
    promotion: false,
    content_style: EDITOR_CONTENT_CSS,
    
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
    
    // Image editing features - CRITICAL: these settings control the Advanced tab
    image_advtab: true,
    image_caption: true,
    image_dimensions: true,
    image_class_list: IMAGE_CLASS_LIST,
    
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
    paste_data_images: false,
    images_upload_handler: options.images_upload_handler || createImageUploadHandler(),
    file_picker_types: 'image media',
    file_picker_callback: options.file_picker_callback,
    
    // Media settings (YouTube/Vimeo embeds)
    media_live_embeds: true,
    media_url_resolver: (data: any, resolve: any) => {
      if (data.url.includes('youtube.com') || data.url.includes('youtu.be') || 
          data.url.includes('vimeo.com')) {
        resolve({ html: '' });
      } else {
        resolve({ html: '' });
      }
    },
    
    // Advanced list settings
    advlist_bullet_styles: 'default,circle,disc,square',
    advlist_number_styles: 'default,lower-alpha,lower-roman,upper-alpha,upper-roman',
    
    // Quick toolbar for images
    quickbars_insert_toolbar: false,
    quickbars_selection_toolbar: 'bold italic | link',
    quickbars_image_toolbar: 'alignleft aligncenter alignright | rotateleft rotateright | imageoptions',
    
    // Setup editor events
    setup: options.setup
  };
}
