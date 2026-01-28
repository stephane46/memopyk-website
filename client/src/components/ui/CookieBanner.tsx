import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CookieSettings } from './CookieSettings';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '../../contexts/LanguageContext';

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  timestamp: number;
}

interface CookieBannerProps {
  onFooterSettingsClick?: () => void;
}

export function CookieBanner({ onFooterSettingsClick }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const { toast } = useToast();
  const { getLocalizedPath, language } = useLanguage();

  // Wait for language initialization based on URL
  useEffect(() => {
    // Check if URL has language prefix
    const path = window.location.pathname;
    const hasLanguageInUrl = path.startsWith('/fr-FR') || path.startsWith('/en-US');
    
    if (hasLanguageInUrl) {
      // URL has language, wait a moment for context to sync
      const timer = setTimeout(() => {
        setLanguageInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // No language in URL, assume initialization will happen quickly
      setLanguageInitialized(true);
    }
  }, []);

  // Check if banner should be shown on mount (only after language is initialized)
  useEffect(() => {
    if (!languageInitialized) return;
    
    const consent = getStoredConsent();
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('show-cookies') === 'true';
    
    if (!consent || forceShow) {
      setIsVisible(true);
    }
  }, [languageInitialized]);

  // Handle footer settings click
  useEffect(() => {
    if (onFooterSettingsClick) {
      // This will be called from footer
      const handleFooterClick = () => setShowSettings(true);
      window.addEventListener('memopyk-cookie-settings', handleFooterClick);
      return () => window.removeEventListener('memopyk-cookie-settings', handleFooterClick);
    }
  }, [onFooterSettingsClick]);

  const getStoredConsent = (): CookieConsent | null => {
    try {
      const stored = localStorage.getItem('memopyk-consent-demo');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const saveConsent = (consent: CookieConsent) => {
    try {
      localStorage.setItem('memopyk-consent-demo', JSON.stringify(consent));
    } catch {
      // Ignore localStorage errors in demo
    }
  };

  const handleAcceptAll = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: true,
      timestamp: Date.now()
    };
    saveConsent(consent);
    setIsVisible(false);
    
    toast({
      title: "Preference saved: analytics ON",
      description: "We'll use analytics to improve your experience.",
      duration: 2000,
    });
  };

  const handleReject = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: false,
      timestamp: Date.now()
    };
    saveConsent(consent);
    setIsVisible(false);
    
    toast({
      title: "Preference saved: analytics OFF",
      description: "Only essential cookies will be used.",
      duration: 2000,
    });
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleSettingsSave = (consent: CookieConsent) => {
    saveConsent(consent);
    setIsVisible(false);
    setShowSettings(false);
    
    const analyticsStatus = consent.analytics ? "ON" : "OFF";
    toast({
      title: `Preference saved: analytics ${analyticsStatus}`,
      description: consent.analytics 
        ? "We'll use analytics to improve your experience."
        : "Only essential cookies will be used.",
      duration: 2000,
    });
  };

  const handleSettingsCancel = () => {
    setShowSettings(false);
  };

  if (!isVisible && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      {isVisible && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
          role="banner"
          aria-label="Cookie consent banner"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
              {/* Banner Content */}
              <div className="flex-1 text-[11px] sm:text-xs text-gray-700 leading-relaxed">
                <p className="mb-2 font-medium text-gray-900 text-xs sm:text-sm">
                  {language === 'fr-FR' ? 'Votre vie privée est importante chez MEMOPYK.' : 'Your privacy matters at MEMOPYK.'}
                </p>
                <p>
                  {language === 'fr-FR' 
                    ? <>Nous utilisons uniquement les cookies essentiels pour faire fonctionner le site, et -si vous le permettez- des cookies analytiques optionnels pour savoir si les visiteurs regardent nos exemples de films. <strong>Nous n'utilisons jamais de cookies à des fins publicitaires, de reciblage, ni pour partager vos données avec des tiers.</strong> Tout le suivi reste limité à MEMOPYK : <strong>vos activités sur le site ne sont ni reliées ni partagées avec d'autres sites</strong>.</>
                    : <>We use only essential cookies to run the site, and -if you allow- optional analytics to see if people visit or watch our sample films. <strong>We never use cookies for advertising, remarketing, or sharing your data with third parties.</strong> All tracking stays on MEMOPYK—<strong>your activity here isn't connected to or shared with other websites</strong>.</>
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 lg:min-w-fit">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="cookie-accept-btn px-4 sm:px-6 py-1.5 sm:py-2 text-sm"
                    data-testid="cookie-accept-all"
                  >
                    {language === 'fr-FR' ? 'Tout accepter' : 'Accept all'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 sm:px-6 py-1.5 sm:py-2 text-sm"
                    data-testid="cookie-reject"
                  >
                    {language === 'fr-FR' ? 'Refuser' : 'Reject'}
                  </Button>
                  <Button
                    onClick={handleSettings}
                    variant="ghost"
                    className="text-gray-600 hover:bg-gray-100 px-4 sm:px-6 py-1.5 sm:py-2 text-sm"
                    data-testid="cookie-settings"
                  >
                    {language === 'fr-FR' ? 'Paramètres' : 'Settings'}
                  </Button>
                </div>
                
                {/* Policy Links */}
                <div className="flex justify-end sm:justify-start lg:justify-end gap-4 text-[10px] text-gray-500 mt-2 sm:mt-0 lg:ml-4">
                  <a 
                    href={getLocalizedPath('/legal/cookie-policy')}
                    className="hover:text-gray-700 underline"
                    data-testid="cookie-policy-link"
                  >
                    {language === 'fr-FR' ? 'Politique de cookies' : 'Cookie Policy'}
                  </a>
                  <a 
                    href={getLocalizedPath('/legal/privacy-policy')} 
                    className="hover:text-gray-700 underline"
                    data-testid="privacy-policy-link"
                  >
                    {language === 'fr-FR' ? 'Politique de confidentialité' : 'Privacy Policy'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <CookieSettings
          isOpen={showSettings}
          onSave={handleSettingsSave}
          onCancel={handleSettingsCancel}
          currentConsent={getStoredConsent()}
        />
      )}
    </>
  );
}

// Export utility functions for footer integration
export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent('memopyk-cookie-settings'));
};

export const getCookieConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem('memopyk-consent-demo');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};