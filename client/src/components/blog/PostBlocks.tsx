import DOMPurify from 'dompurify';
import { rewriteBodyImages } from '@/lib/imageUtils';

interface PostBlocksProps {
  content: string;
}

export default function PostBlocks({ content }: PostBlocksProps) {
  // Simple CMS migration: Render single content field as HTML instead of mapping through M2A blocks
  const sanitized = DOMPurify.sanitize(content || '');
  const html = rewriteBodyImages(sanitized);

  return (
    <article
      data-testid="post-content"
      className="prose prose-lg max-w-none
        prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759] prose-headings:scroll-mt-24
        prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:mt-6 prose-h1:mb-3
        prose-h2:text-3xl prose-h2:md:text-4xl prose-h2:mt-4 prose-h2:mb-2
        prose-h3:text-2xl prose-h3:md:text-3xl prose-h3:mt-3 prose-h3:mb-1.5
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-3
        prose-a:text-[#D67C4A] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
        prose-strong:text-[#2A4759] prose-strong:font-semibold
        prose-ul:my-3 prose-ol:my-3 prose-li:text-gray-700 prose-li:my-0.5
        prose-img:rounded-xl prose-img:shadow-2xl prose-img:max-w-full prose-img:h-auto prose-img:my-4
        prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic prose-blockquote:bg-[#F2EBDC]/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:my-4
        prose-code:text-[#D67C4A] prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded
        prose-table:w-full prose-table:my-4 prose-table:border-collapse
        prose-th:bg-gray-100 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-[#2A4759] prose-th:border prose-th:border-gray-300
        prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-gray-300 prose-td:text-gray-700
        prose-tr:even:bg-gray-50"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
