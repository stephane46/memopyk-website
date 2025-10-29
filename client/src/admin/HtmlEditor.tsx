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
import 'tinymce/plugins/table';
import 'tinymce/plugins/code';
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
  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Editor
        value={value}
        init={{
          height: 420,
          menubar: false,
          plugins: 'link lists table code',
          toolbar: 'undo redo | bold italic underline | bullist numlist | link table | code',
          branding: false,
          promotion: false,
          content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
          link_default_target: '_blank',
          link_default_protocol: 'https',
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            width: '100%'
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
