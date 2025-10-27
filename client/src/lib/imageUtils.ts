export function rewriteBodyImages(html: string): string {
  console.log('🖼️ rewriteBodyImages - Input HTML length:', html.length);
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const images = div.querySelectorAll('img');
  console.log('🖼️ Found images:', images.length);

  images.forEach((img, index) => {
    const src = img.getAttribute('src') || '';
    console.log(`🖼️ Image ${index + 1} src:`, src);
    
    // Match Directus asset URLs with or without query parameters
    const m = src.match(/https?:\/\/cms\.memopyk\.com\/assets\/([a-f0-9-]+)(?:\.[a-z]+)?/i);
    console.log(`🖼️ Image ${index + 1} regex match:`, m ? 'YES' : 'NO');
    
    if (!m) {
      console.log(`🖼️ Image ${index + 1} - No match, skipping`);
      return;
    }
    
    const id = m[1];
    console.log(`🖼️ Image ${index + 1} extracted ID:`, id);
    
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
    
    console.log(`🖼️ Image ${index + 1} new src:`, img.getAttribute('src'));
  });

  const result = div.innerHTML;
  console.log('🖼️ rewriteBodyImages - Output HTML length:', result.length);
  return result;
}
