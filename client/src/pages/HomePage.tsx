import { useEffect } from 'react';
import { HeroVideoSection } from '../components/sections/HeroVideoSection';
import { KeyVisualSection } from '../components/sections/KeyVisualSection';
import { HowItWorksCondensed } from '../components/sections/HowItWorksCondensed';
import { WhyMemopykSection } from '../components/sections/WhyMemopykSection';
import GallerySection from '../components/sections/GallerySection';
import FAQSection from '../components/sections/FAQSection';
import { CtaSection } from '../components/sections/CtaSection';
import { SEO } from '../components/SEO';

import { useLanguage } from '../contexts/LanguageContext';
import { useVideoAnalytics } from '../hooks/useVideoAnalytics';
// Session tracking re-implemented properly to avoid infinite re-renders

export function HomePage() {
  const { language } = useLanguage();
  const { trackSession } = useVideoAnalytics();
  
  // Track visitor session on page load (fixed implementation to prevent infinite loops)
  useEffect(() => {
    console.log('📊 Tracking visitor session on HomePage load');
    trackSession();
  }, []); // Empty dependency array to only run once on mount
  
  // Handle scrolling to anchor after navigation from other pages
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    if (scrollToSection) {
      // Clear the stored section
      sessionStorage.removeItem('scrollToSection');
      
      // Wait for page to fully load and render
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 1000); // Increased delay to ensure all components are rendered
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <div className="min-h-screen">
      {/* SEO Meta Tags */}
      <SEO page="homepage" />
      
      {/* Hero Video Section with Full Carousel */}
      <HeroVideoSection />
      
      {/* Key Visual Problem/Solution Section */}
      <KeyVisualSection />

      {/* Why MEMOPYK Benefits Section - Moved before Gallery */}
      <WhyMemopykSection />

      {/* Gallery Section */}
      <GallerySection />

      {/* How It Works Condensed */}
      <HowItWorksCondensed />

      {/* Second Call to Action Section */}
      <CtaSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* All Phase 6.2 Content Sections Complete */}
    </div>
  );
}