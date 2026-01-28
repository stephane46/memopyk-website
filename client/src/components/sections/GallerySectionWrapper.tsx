import GallerySection from './GallerySection';

export default function GallerySectionWrapper() {
  console.log("Current path:", window.location.pathname);
  console.log("🎬 Rendering GallerySection at", window.location.pathname);
  
  return <GallerySection />;
}