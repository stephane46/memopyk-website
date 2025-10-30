export function rewriteBodyImages(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    // Match Directus asset URLs with or without query parameters
    const m = src.match(/https?:\/\/cms\.memopyk\.com\/assets\/([a-f0-9-]+)(?:\.[a-z]+)?/i);
    if (!m) return;
    
    const id = m[1];
    const base = `https://cms.memopyk.com/assets/${id}`;
    const mk = (w: number) => `${base}?width=${w}&fit=inside&quality=82&format=webp`;

    img.setAttribute('src', mk(828));
    img.setAttribute('srcset', [
      `${mk(640)} 640w`,
      `${mk(828)} 828w`,
      `${mk(1200)} 1200w`,
    ].join(', '));
    img.setAttribute('sizes', '(max-width: 768px) 100vw, 90vw');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');

    const style = img.getAttribute('style') || '';
    if (!/max-width/i.test(style)) {
      img.setAttribute('style', `${style};max-width:100%;height:auto;`.trim());
    }
  });

  // Remove inline float/margin styles from ALL images to let CSS classes control spacing
  div.querySelectorAll('img').forEach((img) => {
    const classList = img.className;
    const hasAlignmentClass = /\b(align-left|align-center|align-right|float-left|float-right)\b/.test(classList);
    
    if (hasAlignmentClass) {
      // Remove inline float and margin styles so CSS can control them
      const style = img.getAttribute('style') || '';
      const cleanedStyle = style
        .replace(/float\s*:\s*[^;]+;?/gi, '')
        .replace(/margin(-left|-right|-top|-bottom)?\s*:\s*[^;]+;?/gi, '')
        .trim();
      
      if (cleanedStyle) {
        img.setAttribute('style', cleanedStyle);
      } else {
        img.removeAttribute('style');
      }
    }
  });

  return div.innerHTML;
}
