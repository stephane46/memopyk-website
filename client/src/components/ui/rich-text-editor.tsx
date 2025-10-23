import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './rich-text-editor.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

  // Custom link handler that works for both URLs and emails
  const linkHandler = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    const currentLink = quill.getFormat(range.index, range.length).link;
    const input = prompt('Enter URL or email address:', currentLink || '');
    
    if (input === null) return; // User cancelled
    
    if (input === '') {
      // Remove link
      quill.format('link', false);
    } else {
      // Smart link formatting
      let formattedLink = input;
      
      // Check if it's an email (contains @ and no protocol)
      if (input.includes('@') && !/^https?:\/\//i.test(input) && !/^mailto:/i.test(input)) {
        formattedLink = `mailto:${input}`;
      }
      // Check if it's a URL that needs protocol
      else if (!input.includes('@') && !/^https?:\/\//i.test(input) && !/^mailto:/i.test(input)) {
        formattedLink = `https://${input}`;
      }
      
      quill.format('link', formattedLink);
    }
  };

  // Configure toolbar modules with single link handler
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }], // H1, H2, H3
        ['bold', 'italic', 'underline'], // Bold, Italic, Underline
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Ordered and unordered lists
        ['link'], // Smart link button (URLs and emails)
        [{ 'indent': '-1'}, { 'indent': '+1' }], // Indent/outdent
        ['clean'] // Remove formatting
      ],
      handlers: {
        link: linkHandler
      }
    },
    clipboard: {
      // Strip formatting when pasting
      matchVisual: false,
    }
  }), []);

  // Configure allowed formats
  const formats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'indent',
    'link'
  ];



    return (
      <div ref={ref} className={`rich-text-editor ${className || ''}`}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';