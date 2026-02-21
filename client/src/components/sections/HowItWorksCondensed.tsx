import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface HowItWorksStep {
  id: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  backTitleEn?: string;
  backTitleFr?: string;
  backDescriptionEn?: string;
  backDescriptionFr?: string;
  imagePath?: string;
  orderIndex: number;
  isActive: boolean;
}

// Icon map for step order (1=Upload, 2=Edit, 3=Heart)
const STEP_ICONS = [Upload, Edit, Heart];

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [card2InitialReveal, setCard2InitialReveal] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { data: dbSteps } = useQuery<HowItWorksStep[]>({
    queryKey: ['/api/how-it-works-steps'],
    staleTime: 5 * 60 * 1000,
  });

  // Map DB steps to the shape the component needs, preserving visual identity
  const steps = (dbSteps ?? [])
    .filter(s => s.isActive)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s, idx) => ({
      id: s.id,
      number: idx + 1,
      icon: STEP_ICONS[idx] ?? Upload,
      titleFr: s.titleFr,
      titleEn: s.titleEn,
      descriptionFr: s.descriptionFr,
      descriptionEn: s.descriptionEn,
      subDescriptionFr: s.backDescriptionFr ?? '',
      subDescriptionEn: s.backDescriptionEn ?? '',
      image: s.imagePath ?? '',
    }));

  // Auto-reveal and reset when section visibility changes
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Card 2: Start big reveal sequence when section comes into view
            if (!card2InitialReveal) {
              setTimeout(() => {
                setCard2InitialReveal(true);
                // Return to small corner after 1 second
                setTimeout(() => {
                  setCard2InitialReveal(false);
                }, 1000);
              }, 600); // Delay for Card 2
            }
          } else {
            // Reset everything when section is not visible
            setFlippedCards(new Set());
            setCard2InitialReveal(false);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [card2InitialReveal]);

  // Fix: Force white text AND background on back cards only when flipped
  useEffect(() => {
    if (flippedCards.size === 0) return;

    // Small delay to let flip animation start
    const timeout = setTimeout(() => {
      const backCards = document.querySelectorAll('.card-back');
      backCards.forEach((card: any, index) => {
        // Force background on the card itself
        const step = steps[index];
        if (step) {
          const bgGradient = `linear-gradient(to bottom, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.35) 100%), linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`;
          card.style.setProperty('background', bgGradient, 'important');
          card.style.setProperty('background-size', 'cover', 'important');
          card.style.setProperty('background-position', 'center', 'important');
          card.style.setProperty('background-repeat', 'no-repeat', 'important');
        }

        // Force white text on all children
        const allElements = card.querySelectorAll('*');
        allElements.forEach((el: any) => {
          if (el.tagName !== 'SPAN' || !el.closest('.bg-white')) {
            el.style.setProperty('color', '#FFFFFF', 'important');
          }
        });
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [flippedCards]);

  return (
    <section id="how-it-works" className="py-12 bg-gradient-to-b from-memopyk-cream to-white" ref={sectionRef}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-memopyk-dark-blue mb-4">
            {language === 'fr-FR' ? 'Comment ça marche' : 'How It Works'}
          </h2>
          <p className="text-xl text-memopyk-dark-blue/70 max-w-3xl mx-auto">
            {language === 'fr-FR'
              ? '3 étapes pour transformer vos photos et vidéos en films passionnants'
              : '3 steps to turn your photos and videos into captivating movies'
            }
          </p>
        </div>

        {/* Steps Grid with Flip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => {
            const Icon = step.icon;
            const isFlipped = flippedCards.has(step.id);

            return (
              <div key={step.id} className="text-center group">
                {/* Flip Card Container - Only for the image area */}
                <div className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl mb-4`}>
                  <div className="card-flip-inner">

                    {/* FRONT SIDE - Step Card */}
                    <div className="card-front bg-white border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden relative" style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
                      {/* Orange peel corner with interactive icon */}
                      <div
                        className="absolute bottom-0 right-0 pointer-events-none"
                        style={{
                          width: '60px',
                          height: '60px',
                          background: 'linear-gradient(135deg, #D67C4A 0%, #c2693c 100%)',
                          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
                          borderRadius: '0 0 1rem 0',
                          boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.1)',
                          zIndex: 10
                        }}
                      ></div>

                      {/* Flip icon with pulse animation - positioned ABOVE the triangle */}
                      <div
                        className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center animate-pulse pointer-events-none"
                        style={{
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          zIndex: 20
                        }}
                      >
                        <Info
                          size={18}
                          className="text-white drop-shadow-lg"
                          strokeWidth={3}
                        />
                      </div>
                      {/* Clickable Area */}
                      <div
                        className="relative cursor-pointer"
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(step.id)) {
                              newSet.delete(step.id);
                            } else {
                              newSet.add(step.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        {/* Step Image */}
                        <div className="relative overflow-hidden rounded-xl transition-all duration-500 aspect-square">
                          <img
                            src={step.image}
                            alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                            className="w-full h-full object-contain bg-gray-50 transition-transform duration-500"
                          />

                          {/* Orange Number Circle - Top Left */}
                          <div className="absolute top-2 left-2 w-8 h-8 bg-memopyk-orange rounded-full flex items-center justify-center transition-transform duration-300 shadow-lg">
                            <span className="text-sm font-bold text-white">{step.number}</span>
                          </div>
                        </div>

                        {/* Title inside card - white area below image */}
                        <div className="p-4 text-center">
                          <h3 className="text-lg font-semibold text-memopyk-dark-blue">
                            {language === 'fr-FR' ? step.titleFr : step.titleEn}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* BACK SIDE - Detailed Information */}
                    <div
                      className="card-back flip-card-back-with-bg shadow-lg hover:shadow-2xl rounded-2xl border border-gray-200 relative overflow-hidden"
                      style={{
                        color: '#FFFFFF',
                        backgroundColor: 'transparent',
                        backgroundImage: `url(${step.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >

                      {/* White Number Circle with Orange Text - Top Left on Back Card - Same position as front */}
                      <div className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 shadow-lg" style={{ zIndex: 10 }}>
                        <span className="text-sm font-bold" style={{ color: '#D67C4A' }}>{step.number}</span>
                      </div>

                      <div
                        className="relative cursor-pointer overflow-hidden rounded-2xl h-full [&_*]:!text-white"
                        style={{ zIndex: 3, color: '#FFFFFF' }}
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(step.id);
                            return newSet;
                          });
                        }}
                      >

                        {/* Content area - EXACT SAME STRUCTURE AS FRONT */}
                        <div className="relative rounded-xl transition-all duration-500 aspect-square" style={{ background: 'transparent' }}>
                          <div className="h-full flex flex-col px-2 pt-0 pb-2" style={{ background: 'transparent' }}>
                            {/* Top Section - Text content area */}
                            <div className="text-center flex flex-col" style={{ position: 'relative' }}>
                              <div className="text-sm leading-normal w-full flip-card-text-zero-spacing" style={{ paddingTop: '30px' }}>
                                {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                  <p key={i} className="m-0 p-0 !text-white" style={{ marginBottom: '16px' }}>{paragraph}</p>
                                ))}
                              </div>

                              {/* Separator Line - MOVED MUCH HIGHER UP */}
                              <div
                                className="absolute border-t border-white/40 left-2"
                                style={{
                                  top: '220px',
                                  right: "calc(0.5rem + var(--peel-c, 0px))",
                                  zIndex: 1,
                                }}
                              ></div>

                              {/* Bottom Section - Sub Description - MOVED MUCH HIGHER UP */}
                              <div className="absolute text-center left-2 right-2" style={{ top: '230px' }}>
                                <div className="text-sm font-bold leading-relaxed w-full !text-white">
                                  {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Title - SAME AS FRONT CARD */}
                        <div className="p-4 text-center" style={{ paddingTop: '76px' }}>
                          <h3 className="text-lg font-semibold !text-white">
                            {language === 'fr-FR' ? step.titleFr : step.titleEn}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
