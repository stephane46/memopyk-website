import DOMPurify from 'dompurify';
import { directusAsset } from '@/constants/directus';

interface EditorJsBlock {
  id?: string;
  type: string;
  data: any;
}

interface CustomBlock {
  type: string;
  content?: string | any;
  level?: number;
  url?: string;
  alt?: string;
  caption?: string;
  items?: string[];
  language?: string;
  code?: string;
}

type Block = EditorJsBlock | CustomBlock;

interface BlockRendererProps {
  blocks: Block[];
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || !Array.isArray(blocks)) {
    return null;
  }

  const renderBlock = (block: Block, index: number) => {
    const sanitizeHtml = (html: string) => {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'span', 'code', 'mark', 'sub', 'sup', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes']
      });
    };

    // Normalize block data to handle both Editor.js and custom formats
    const isEditorJs = 'data' in block && block.data !== undefined;
    const data = isEditorJs ? (block as EditorJsBlock).data : (block as CustomBlock);
    
    // Extract content based on format
    const getContent = () => {
      if (isEditorJs) {
        return data.text || data.content || '';
      }
      return (block as CustomBlock).content || '';
    };

    switch (block.type) {
      case 'paragraph':
        const paragraphText = getContent();
        if (!paragraphText) return null;
        return (
          <p
            key={index}
            className="mb-6 text-gray-700 leading-relaxed text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(paragraphText) }}
          />
        );

      case 'header':
      case 'heading':
        const headingText = getContent();
        if (!headingText) return null;
        
        const level = data.level || (block as CustomBlock).level || 2;
        const headingClasses = {
          1: 'text-4xl md:text-5xl font-playfair font-bold text-memopyk-dark-blue mb-8 mt-12',
          2: 'text-3xl md:text-4xl font-playfair font-bold text-memopyk-dark-blue mb-6 mt-10',
          3: 'text-2xl md:text-3xl font-playfair font-semibold text-memopyk-dark-blue mb-5 mt-8',
          4: 'text-xl md:text-2xl font-playfair font-semibold text-memopyk-navy mb-4 mt-6',
          5: 'text-lg md:text-xl font-poppins font-semibold text-memopyk-navy mb-4 mt-6',
          6: 'text-base md:text-lg font-poppins font-semibold text-memopyk-navy mb-3 mt-4'
        };
        const headingClass = headingClasses[level as keyof typeof headingClasses] || headingClasses[2];
        const headingContent = { __html: sanitizeHtml(headingText) };
        
        switch (level) {
          case 1:
            return <h1 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 2:
            return <h2 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 3:
            return <h3 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 4:
            return <h4 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 5:
            return <h5 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          case 6:
            return <h6 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
          default:
            return <h2 key={index} className={headingClass} dangerouslySetInnerHTML={headingContent} />;
        }

      case 'list':
        const listItems = data.items || (block as CustomBlock).items || [];
        if (!listItems.length) return null;
        
        const style = data.style || 'unordered';
        const isOrdered = style === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';
        
        return (
          <ListTag
            key={index}
            className={`mb-6 ml-6 text-gray-700 leading-relaxed text-lg space-y-2 ${
              isOrdered ? 'list-decimal' : 'list-disc'
            }`}
          >
            {listItems.map((item: string, i: number) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
            ))}
          </ListTag>
        );

      case 'quote':
      case 'blockquote':
        const quoteText = getContent();
        if (!quoteText) return null;
        
        return (
          <blockquote
            key={index}
            className="border-l-4 border-memopyk-orange pl-6 py-4 mb-6 italic text-gray-700 text-lg bg-memopyk-cream/30 rounded-r-lg"
          >
            <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(quoteText) }} />
            {data.caption && (
              <footer className="text-sm text-gray-600 mt-2 not-italic">
                — {data.caption}
              </footer>
            )}
          </blockquote>
        );

      case 'image':
        const f = data?.file || {};
        const raw = f.url || f.fileURL || f.fileId || f.id || '';
        if (!raw) return null;

        const src = directusAsset(raw, { width: 1200, quality: 80, format: 'webp' });
        const alt = data?.caption || f.title || '';

        return (
          <figure key={index} className="mb-8 mt-8">
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="w-full rounded-lg shadow-lg"
              style={{ display: 'block' }}
            />
            {alt && (
              <figcaption className="text-center text-sm text-gray-600 mt-3 italic">
                {alt}
              </figcaption>
            )}
          </figure>
        );

      case 'code':
        const codeContent = data.code || (block as CustomBlock).code || getContent();
        if (!codeContent) return null;
        
        return (
          <pre
            key={index}
            className="bg-gray-900 text-gray-100 p-6 rounded-lg mb-6 overflow-x-auto"
          >
            <code className="text-sm font-mono">
              {codeContent}
            </code>
          </pre>
        );

      case 'warning':
      case 'callout':
        const calloutText = data.message || data.text || getContent();
        if (!calloutText) return null;
        
        const calloutType = data.type || 'info';
        const calloutColors = {
          info: 'bg-blue-50 border-blue-400 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
          danger: 'bg-red-50 border-red-400 text-red-800',
          success: 'bg-green-50 border-green-400 text-green-800'
        };
        
        return (
          <div
            key={index}
            className={`border-l-4 pl-6 py-4 mb-6 rounded-r-lg ${
              calloutColors[calloutType as keyof typeof calloutColors] || calloutColors.info
            }`}
          >
            {data.title && (
              <p className="font-semibold mb-2">{data.title}</p>
            )}
            <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(calloutText) }} />
          </div>
        );

      case 'delimiter':
        return (
          <div key={index} className="flex justify-center items-center my-8">
            <div className="flex space-x-2">
              <span className="w-2 h-2 bg-memopyk-orange rounded-full"></span>
              <span className="w-2 h-2 bg-memopyk-orange rounded-full"></span>
              <span className="w-2 h-2 bg-memopyk-orange rounded-full"></span>
            </div>
          </div>
        );

      default:
        console.warn(`Unknown block type: ${block.type}`, block);
        return null;
    }
  };

  return (
    <div data-testid="post-content" className="prose prose-lg max-w-none">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
