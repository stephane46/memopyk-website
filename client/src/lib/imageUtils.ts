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

  return div.innerHTML;
}
