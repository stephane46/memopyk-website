import DOMPurify from 'dompurify';

// Configure DOMPurify for safe HTML rendering
const createSanitizer = () => {
  // Allow only safe HTML tags and attributes for FAQ content
  const allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
    'h1', 'h2', 'h3', 
    'ul', 'ol', 'li',
    'a'
  ];

  const allowedAttributes = {
    'a': ['href', 'title', 'target', 'rel']
  };

  return {
    sanitize: (html: string): string => {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: Object.keys(allowedAttributes).reduce((acc, tag) => {
          allowedAttributes[tag as keyof typeof allowedAttributes].forEach(attr => {
            acc.push(attr);
          });
          return acc;
        }, [] as string[]),
        // Force links to open in new tab with security attributes
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ADD_ATTR: ['target', 'rel']
      });
    },

    // Helper to check if content has HTML tags
    isHTML: (content: string): boolean => {
      return /<[a-z][\s\S]*>/i.test(content);
    },

    // Convert plain text to basic HTML paragraphs
    textToHTML: (text: string): string => {
      if (!text || text.trim() === '') return '';
      
      // Split by double line breaks for paragraphs
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
      
      if (paragraphs.length === 0) return `<p>${text}</p>`;
      
      return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    }
  };
};

// Export singleton instance
export const htmlSanitizer = createSanitizer();