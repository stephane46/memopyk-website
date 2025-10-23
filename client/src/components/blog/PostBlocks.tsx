import DOMPurify from 'dompurify';
import { setAttr } from '@directus/visual-editing';
import { rewriteBodyImages } from '@/lib/imageUtils';
import { directusAsset } from '@/constants/directus';
import BlockContentSection from './BlockContentSection';

interface PostBlocksProps {
  blocks: Array<{
    collection: string;
    item: any;
  }>;
}

export default function PostBlocks({ blocks }: PostBlocksProps) {
  return (
    <div className="space-y-8" data-testid="post-blocks">
      {blocks.map((b, i) => {
        switch (b.collection) {
          case "block_heading": {
            const { text, level = "h2", align = "left" } = b.item || {};
            const Tag = (["h1", "h2", "h3"].includes(level) ? level : "h2") as "h1" | "h2" | "h3";
            
            const alignClass = align === "center" ? "text-center" : "text-left";
            const sizeClass = level === "h1" 
              ? "text-4xl md:text-5xl" 
              : level === "h2" 
              ? "text-3xl md:text-4xl" 
              : "text-2xl md:text-3xl";
            
            return (
              <Tag 
                key={`heading-${i}`}
                data-testid={`block-heading-${i}`}
                className={`${alignClass} ${sizeClass} font-['Playfair_Display'] text-[#2A4759] leading-tight text-balance`}
                data-directus={setAttr({
                  collection: "block_heading",
                  item: b.item?.id,
                  fields: "text,level,align",
                  mode: "popover",
                })}
              >
                {text}
              </Tag>
            );
          }

          case "block_richtext": {
            const raw = b.item?.html || b.item?.content || "";
            const sanitized = DOMPurify.sanitize(raw);
            const html = rewriteBodyImages(sanitized);

            return (
              <article
                key={`richtext-${i}`}
                data-testid={`block-richtext-${i}`}
                className="prose prose-lg max-w-none
                  prose-headings:font-['Playfair_Display'] prose-headings:text-[#2A4759] prose-headings:scroll-mt-24
                  prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                  prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                  prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-6
                  prose-a:text-[#D67C4A] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
                  prose-strong:text-[#2A4759] prose-strong:font-semibold
                  prose-ul:my-6 prose-ol:my-6 prose-li:text-gray-700 prose-li:my-2
                  prose-img:rounded-xl prose-img:shadow-2xl prose-img:max-w-full prose-img:h-auto prose-img:my-8
                  prose-blockquote:border-l-4 prose-blockquote:border-[#D67C4A] prose-blockquote:italic prose-blockquote:bg-[#F2EBDC]/30 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:my-8
                  prose-code:text-[#D67C4A] prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded"
                dangerouslySetInnerHTML={{ __html: html }}
                data-directus={setAttr({
                  collection: "block_richtext",
                  item: b.item?.id,
                  fields: "content",
                  mode: "drawer",
                })}
              />
            );
          }

          case "block_gallery": {
            const items = b.item?.items || [];
            if (!items || items.length === 0) return null;
            
            // Sort items by sort field as per schema
            // NOTE: items now contains {id, sort, directus_file: {id}} structure (no nested metadata to avoid 403)
            const sorted = [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

            return (
              <div
                key={`gallery-${i}`}
                data-testid={`block-gallery-${i}`}
                className="my-8"
                data-directus={setAttr({
                  collection: "block_gallery",
                  item: b.item?.id,
                  fields: "items",
                  mode: "drawer",
                })}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {sorted.map((galleryItem: any, idx: number) => {
                    const file = galleryItem.directus_file;
                    if (!file || !file.id) return null;

                    const fileId = file.id;

                    const sizes = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 300px';
                    
                    const srcset = [640, 828, 1200]
                      .map(w => `${directusAsset(fileId, { width: w, quality: 82, format: 'webp' })} ${w}w`)
                      .join(', ');

                    return (
                      <figure
                        key={galleryItem.id || idx}
                        className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
                        data-testid={`gallery-item-${i}-${idx}`}
                      >
                        <img
                          src={directusAsset(fileId, { width: 828, quality: 82, format: 'webp' })}
                          srcSet={srcset}
                          sizes={sizes}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover aspect-square"
                        />
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          }

          case "block_content_section":
          case "block_content_section_v3": {
            if (!b.item) {
              console.warn(`Block content section at index ${i} has no item data`);
              return null;
            }
            return (
              <BlockContentSection 
                key={`content-section-${i}`}
                item={b.item}
                index={i}
              />
            );
          }

          default:
            console.warn(`Unknown block collection: ${b.collection}`);
            return null;
        }
      })}
    </div>
  );
}
