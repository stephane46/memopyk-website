import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X, Mail, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { openCookieSettings } from '@/components/ui/CookieBanner';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t, language, setLanguage, getLocalizedPath } = useLanguage();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle scroll to section after navigation
  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    const animateElement = sessionStorage.getItem('animateElement');
    if (scrollToSection) {
      sessionStorage.removeItem('scrollToSection');
      if (animateElement) {
        sessionStorage.removeItem('animateElement');
      }
      // Use a small timeout to ensure the page is fully loaded
      setTimeout(() => {
        const element = document.getElementById(scrollToSection);
        if (element) {
          const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
          const elementPosition = element.offsetTop;
          const offsetPosition = elementPosition - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // If there's an element to animate, do it after scrolling
          if (animateElement) {
            setTimeout(() => {
              const animateElementNode = document.getElementById(animateElement);
              if (animateElementNode) {
                // Add animation classes with tight outline - exactly 2 bounces
                animateElementNode.classList.add('animate-double-bounce');
                animateElementNode.style.outline = '2px solid rgb(214, 124, 74)';
                animateElementNode.style.outlineOffset = '2px';
                // Remove animation after 1 second
                setTimeout(() => {
                  animateElementNode.classList.remove('animate-double-bounce');
                  animateElementNode.style.outline = '';
                  animateElementNode.style.outlineOffset = '';
                }, 1000);
              }
            }, 800); // Wait for scroll to complete
          }
        }
      }, 100);
    }
  }, [location]);

  // Handle anchor scrolling
  const handleAnchorClick = (sectionId: string, animateElementId?: string) => {
    // First navigate to home page if not already there
    const cleanLocation = location.replace(/^\/(fr-FR|en-US)/, '') || '/';
    if (cleanLocation !== '/') {
      // Store the section ID in sessionStorage so we can scroll after navigation
      sessionStorage.setItem('scrollToSection', sectionId);
      if (animateElementId) {
        sessionStorage.setItem('animateElement', animateElementId);
      }
      window.location.href = getLocalizedPath('/');
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - headerHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // If there's an element to animate, do it after scrolling
        if (animateElementId) {
          setTimeout(() => {
            const animateElement = document.getElementById(animateElementId);
            if (animateElement) {
              // Add animation classes with tight outline - exactly 2 bounces
              animateElement.classList.add('animate-double-bounce');
              animateElement.style.outline = '2px solid rgb(214, 124, 74)';
              animateElement.style.outlineOffset = '2px';
              // Remove animation after 1 second
              setTimeout(() => {
                animateElement.classList.remove('animate-double-bounce');
                animateElement.style.outline = '';
                animateElement.style.outlineOffset = '';
              }, 1000);
            }
          }, 800); // Wait for scroll to complete
        }
      }
    }
  };

  const navigation = [
    { 
      name: t('nav.our-service'), 
      type: 'anchor', 
      sectionId: 'how-it-works' 
    },
    { 
      name: t('nav.why-choose-us'), 
      type: 'anchor', 
      sectionId: 'why-memopyk' 
    },
    { 
      name: t('nav.gallery'), 
      type: 'anchor', 
      sectionId: 'gallery' 
    },
    { 
      name: t('nav.blog'), 
      type: 'link', 
      href: getLocalizedPath('/blog')
    },
    { 
      name: t('nav.faq'), 
      type: 'anchor', 
      sectionId: 'faq' 
    },
    { 
      name: t('nav.quotation'), 
      type: 'anchor', 
      sectionId: 'cta' 
    },
    { 
      name: t('nav.contact'), 
      type: 'anchor', 
      sectionId: 'footer' 
    },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'fr-FR' ? 'en-US' : 'fr-FR');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden max-w-full">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-memopyk-cream shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link 
              href={getLocalizedPath('/')} 
              className="flex items-center"
              onClick={() => {
                // Always scroll to top when logo is clicked
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <img 
                src="/logo.svg" 
                alt="MEMOPYK" 
                className="h-8 lg:h-10 w-auto cursor-pointer"
              />
            </Link>

            {/* Navigation Links - Hidden on mobile */}
            <div className="hidden lg:flex space-x-6">
              {navigation.map((item, index) => {
                if (item.type === 'anchor') {
                  return (
                    <button
                      key={`nav-${index}`}
                      onClick={() => handleAnchorClick(item.sectionId, item.sectionId === 'footer' ? 'footer-email-text' : (item.sectionId === 'cta' ? 'cta-questionnaire' : undefined))}
                      className="text-sm font-medium transition-colors text-gray-600 hover:text-memopyk-navy cursor-pointer"
                    >
                      {item.name}
                    </button>
                  );
                } else if (item.type === 'link' && 'href' in item) {
                  return (
                    <Link
                      key={`nav-${index}`}
                      href={item.href as string}
                      className="text-sm font-medium transition-colors text-gray-600 hover:text-memopyk-navy"
                    >
                      {item.name}
                    </Link>
                  );
                } else if (item.type === 'external' && 'href' in item) {
                  return (
                    <a
                      key={`nav-${index}`}
                      href={item.href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium transition-colors text-gray-600 hover:text-memopyk-navy"
                    >
                      {item.name}
                    </a>
                  );
                }
                return null;
              })}
            </div>

            {/* Language Toggle & Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Desktop Language Toggle - Hidden on mobile */}
              <div className="hidden lg:flex items-center space-x-2">
                <a
                  href="/en-US"
                  hrefLang="en-US"
                  onClick={(e) => {
                    e.preventDefault();
                    setLanguage('en-US');
                  }}
                  className={`p-2 rounded-md transition-all ${
                    language === 'en-US' 
                      ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                      : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                  }`}
                  title="Switch to English"
                  data-testid="lang-switcher-en"
                >
                  <img 
                    src="https://flagcdn.com/w40/us.png" 
                    alt="English"
                    className="w-8 h-5 object-cover rounded"
                  />
                </a>
                <a
                  href="/fr-FR"
                  hrefLang="fr-FR"
                  onClick={(e) => {
                    e.preventDefault();
                    setLanguage('fr-FR');
                  }}
                  className={`p-2 rounded-md transition-all ${
                    language === 'fr-FR' 
                      ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                      : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                  }`}
                  title="Passer au français"
                  data-testid="lang-switcher-fr"
                >
                  <img 
                    src="https://flagcdn.com/w40/fr.png" 
                    alt="French"
                    className="w-8 h-5 object-cover rounded"
                  />
                </a>
              </div>

              {/* Mobile menu button - Enhanced with 44px touch target */}
              <button 
                onClick={() => {
                  console.log('Hamburger menu clicked! Current state:', isMobileMenuOpen);
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="lg:hidden p-3 rounded-md text-gray-600 hover:text-memopyk-navy hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation - Slide Down Animation */}
          <div className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen 
              ? 'max-h-[32rem] opacity-100 border-t border-gray-200 bg-white' 
              : 'max-h-0 opacity-0'
          }`}>
            <div className="py-4 space-y-2">
              {/* Navigation items */}
              {navigation.map((item, index) => {
                if (item.type === 'anchor') {
                  return (
                    <button
                      key={`mobile-nav-${index}`}
                      onClick={() => {
                        handleAnchorClick(item.sectionId, item.sectionId === 'footer' ? 'footer-email' : (item.sectionId === 'cta' ? 'cta-questionnaire' : undefined));
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray"
                    >
                      {item.name}
                    </button>
                  );
                } else if (item.type === 'link' && 'href' in item) {
                  return (
                    <Link
                      key={`mobile-nav-${index}`}
                      href={item.href as string}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray"
                    >
                      {item.name}
                    </Link>
                  );
                } else if (item.type === 'external' && 'href' in item) {
                  return (
                    <a
                      key={`mobile-nav-${index}`}
                      href={item.href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-md text-base font-medium transition-all duration-200 min-h-[44px] flex items-center text-gray-600 hover:text-memopyk-navy hover:bg-gray-50 hover:border-l-4 hover:border-memopyk-blue-gray"
                    >
                      {item.name}
                    </a>
                  );
                }
                return null;
              })}
              
              {/* Mobile Language Switcher */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="px-4 text-sm font-medium text-gray-500 mb-3">
                  {language === 'fr-FR' ? 'Langue' : 'Language'}
                </p>
                <div className="px-4 flex items-center space-x-3">
                  <a
                    href="/en-US"
                    hrefLang="en-US"
                    onClick={(e) => {
                      e.preventDefault();
                      setLanguage('en-US');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 p-2 rounded-md transition-all min-h-[44px] ${
                      language === 'en-US' 
                        ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                        : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                    }`}
                    title="Switch to English"
                    data-testid="mobile-lang-switcher-en"
                  >
                    <img 
                      src="https://flagcdn.com/w40/us.png" 
                      alt="English"
                      className="w-8 h-5 object-cover rounded"
                    />
                    <span className="text-sm font-medium">English</span>
                  </a>
                  <a
                    href="/fr-FR"
                    hrefLang="fr-FR"
                    onClick={(e) => {
                      e.preventDefault();
                      setLanguage('fr-FR');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 p-2 rounded-md transition-all min-h-[44px] ${
                      language === 'fr-FR' 
                        ? 'border-2 border-memopyk-navy bg-memopyk-cream shadow-md' 
                        : 'border-2 border-transparent hover:border-memopyk-blue-gray hover:bg-gray-50'
                    }`}
                    title="Passer au français"
                    data-testid="mobile-lang-switcher-fr"
                  >
                    <img 
                      src="https://flagcdn.com/w40/fr.png" 
                      alt="French"
                      className="w-8 h-5 object-cover rounded"
                    />
                    <span className="text-sm font-medium">Français</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Add padding for fixed nav */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer id="footer" className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="col-span-1 lg:col-span-1">
              <img 
                src="/logo.svg" 
                alt="MEMOPYK" 
                className="h-12 w-auto mb-4"
              />
              <p className="text-gray-400 mb-4">
                {language === 'fr-FR' 
                  ? 'Créateur de films souvenirs pour immortaliser vos moments les plus précieux.'
                  : 'Creator of souvenir films to immortalize your most precious moments.'
                }
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr-FR' ? 'Navigation' : 'Navigation'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => handleAnchorClick('how-it-works')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.our-service')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('why-memopyk')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.why-choose-us')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('gallery')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.gallery')}
                  </button>
                </li>
                <li>
                  <Link 
                    href={getLocalizedPath('/blog')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.blog')}
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('faq')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.faq')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('cta', 'cta-questionnaire')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.quotation')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAnchorClick('footer', 'footer-contact-title')}
                    className="hover:text-white transition-colors"
                  >
                    {t('nav.contact')}
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {language === 'fr-FR' ? 'Légal' : 'Legal'}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href={getLocalizedPath('/legal/legal-notice')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Mentions légales' : 'Legal Notice'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/terms-of-service')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Conditions générales d\'utilisation' : 'Terms of Service'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/terms-of-sale')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Conditions générales de vente' : 'Terms of Sale'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/privacy-policy')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Politique de confidentialité' : 'Privacy Policy'}
                </Link></li>
                <li><Link href={getLocalizedPath('/legal/cookie-policy')} className="hover:text-white">
                  {language === 'fr-FR' ? 'Politique des cookies' : 'Cookie Policy'}
                </Link></li>
                <li>
                  <button 
                    onClick={openCookieSettings}
                    className="hover:text-white transition-colors"
                    data-testid="footer-cookie-settings"
                  >
                    {language === 'fr-FR' ? 'Paramètres des cookies' : 'Cookie settings'}
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 id="footer-contact-title" className="font-semibold mb-4 cursor-pointer transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:text-memopyk-orange hover:font-bold">Contact</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a 
                    id="footer-email"
                    href="mailto:contact@memopyk.com"
                    className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer p-2 -m-2 rounded-lg"
                  >
                    <Mail className="w-4 h-4" />
                    <span id="footer-email-text">contact@memopyk.com</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="https://wa.me/33745843821"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-white transition-colors cursor-pointer p-2 -m-2 rounded-lg"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    <span>(+33) 07 45 84 38 21</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MEMOPYK. {language === 'fr-FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
            <div className="mt-2">
              <Link href={getLocalizedPath('/admin')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}