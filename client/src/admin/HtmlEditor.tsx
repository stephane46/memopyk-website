import { Editor } from '@tinymce/tinymce-react';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function HtmlEditor({ value, onChange }: HtmlEditorProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Editor
        tinymceScriptSrc="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js"
        value={value}
        init={{
          height: 420,
          menubar: false,
          plugins: 'link lists table code',
          toolbar: 'undo redo | bold italic | bullist numlist | link table | code',
          content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
          branding: false,
          promotion: false,
          link_default_target: '_blank',
          link_rel_list: [
            { title: 'No Follow', value: 'noopener nofollow' }
          ],
          link_default_protocol: 'https',
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            width: '100%'
          },
          valid_elements: 'p,h2,h3,h4,ul,ol,li,blockquote,pre,code,strong,em,a[href|target|rel],img[src|alt|title|loading],table,thead,tbody,tr,th,td',
          extended_valid_elements: 'img[loading|src|alt|title]'
        }}
        onEditorChange={(content) => onChange(content)}
      />
    </div>
  );
}
