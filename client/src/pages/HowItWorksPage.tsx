import { useEffect } from 'react';
import { Link } from 'wouter';
import { HowItWorksSection } from '../components/sections/HowItWorksSection';
import { useLanguage } from '../contexts/LanguageContext';
import { useVideoAnalytics } from '../hooks/useVideoAnalytics';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export function HowItWorksPage() {
  const { language } = useLanguage();
  const { trackSession } = useVideoAnalytics();
  
  // Track visitor session on page load
  useEffect(() => {
    console.log('📊 Tracking visitor session on HowItWorksPage load');
    trackSession();
  }, [trackSession]);
  
  // Set page title based on language and scroll to top
  useEffect(() => {
    const title = language === 'fr-FR' 
      ? 'Comment ça marche | MEMOPYK - Films de souvenirs personnalisés'
      : 'How it works | MEMOPYK - Personalized memory films';
    document.title = title;
    
    // Ensure page scrolls to top when loaded
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [language]);
  
  const homeUrl = language === 'fr-FR' ? '/fr-FR' : '/en-US';
  
  return (
    <div className="min-h-screen">
      {/* How It Works 3-Step Process */}
      <HowItWorksSection />

      {/* Back to Home Button - Bottom of page */}
      <div className="bg-memopyk-cream py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Link href={homeUrl}>
            <Button 
              size="lg"
              className="button-dark-blue-forced font-bold px-8 py-4 text-lg transition-all duration-300 shadow-lg border-2 transform hover:scale-105 hover:shadow-xl"
            >
              <Home className="w-5 h-5 mr-2" />
              {language === 'fr-FR' ? 'Retourner à l\'accueil' : 'Return to Home'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}