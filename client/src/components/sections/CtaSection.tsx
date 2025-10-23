import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { Phone, Edit } from 'lucide-react';
import type { CtaSettings } from '@shared/schema';
import { trackCtaClick } from '@/lib/analytics';

export function CtaSection() {
  const { language } = useLanguage();

  // Fetch CTA settings from the API
  const { data: ctaSettings = [] } = useQuery<CtaSettings[]>({
    queryKey: ['/api/cta']
  });

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <section id="cta" className="py-12 bg-gradient-to-br from-memopyk-cream/30 to-white">
      <div className="container mx-auto px-4">
        <div className="relative bg-gradient-to-br from-memopyk-dark-blue via-memopyk-navy to-memopyk-dark-blue p-10 rounded-3xl shadow-2xl border border-memopyk-orange/20 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-memopyk-orange/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-memopyk-sky-blue/10 rounded-full blur-2xl"></div>
          
          {/* Content */}
          <div className="relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {getText(
              'Faites-nous part de vos envies, et imaginons ensemble votre film unique.',
              'Share your ideas, let\'s imagine your unique film together.'
            )}
          </h2>
          <p className="text-memopyk-cream/90 text-lg mb-8">
            {getText(
              'Choisissez un rendez-vous pour échanger ensemble, ou obtenez un devis personnalisé en répondant à notre questionnaire.',
              'Book an appointment to talk with us, or get a personalized quote by filling out our questionnaire.'
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Filter and display only active CTA buttons */}
            {ctaSettings
              .filter((cta: any) => cta.isActive)
              .map((cta: any) => {
                const url = language === 'fr-FR' ? cta.buttonUrlFr : cta.buttonUrlEn;
                return (
                  <a
                    key={cta.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={cta.id === 'book_call' ? undefined : 'cta-questionnaire'}
                    className="inline-flex items-center justify-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-6 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer no-underline w-full sm:w-auto whitespace-nowrap min-w-0"
                    onClick={() => trackCtaClick(cta.id, window.location.pathname, language)}
                  >
                    {cta.id === 'book_call' ? <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <Edit className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                    <span className="block">
                      {language === 'fr-FR' ? cta.buttonTextFr : cta.buttonTextEn}
                    </span>
                  </a>
                );
              })
            }
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}