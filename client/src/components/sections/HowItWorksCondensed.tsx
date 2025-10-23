import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import RoundedPeelCorner from '@/components/ui/RoundedPeelCorner';

export function HowItWorksCondensed() {
  const { language } = useLanguage();
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [card2InitialReveal, setCard2InitialReveal] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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
  
  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Consultation & Collecte",
      titleEn: "Consultation & Collection",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles quelles.\nDites-nous tout ce que vous avez en tête, via notre questionnaire, ou la séance de consultation gratuite.\nVous recevez un devis clair et adapté avant tout travail.",
      descriptionEn: "Send us your photos and videos as they are.\nTell us everything you have in mind, via our questionnaire, or the free consultation session.\nYou receive a clear and tailored quote before any work.",
      subDescriptionFr: "Nous sommes à l'écoute de vos souhaits, puis vous fournissons un lien unique et crypté pour un partage de fichiers sécurisé et privé.",
      subDescriptionEn: "We listen carefully to your wishes, then provide you with a unique, encrypted link for secure and private file sharing.",
      image: "/images/brand/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Création", 
      titleEn: "Selection & Creation",
      descriptionFr: "Nous trions, sélectionnons et gardons uniquement le meilleur.\nNous construisons le scénario avec la musique, le rythme et le format qui vous correspondent.\nNous relions chaque détail dans votre film souvenir unique.",
      descriptionEn: "We sort, select and keep only the best.\nWe build the scenario with the music, rhythm and format that suits you.\nWe connect every detail into your unique souvenir film.",
      subDescriptionFr: "Nous faisons revivre vos souvenirs avec soin et créativité, pour en faire un film que vous aurez plaisir à redécouvrir.",
      subDescriptionEn: "We bring your memories to life with dedicated care and creativity, transforming them into a film you'll treasure.",
      image: "/images/brand/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "Retours & Finalisation",
      titleEn: "Feedback & Finalization", 
      descriptionFr: "Vous recevez la première version de votre film-souvenir en une à trois semaines, prête à être revue.\nDeux séries de retours sont incluses pour affiner le montage jusqu'à votre entière satisfaction.",
      descriptionEn: "You receive the first version of your souvenir film in one to three weeks, ready to be reviewed.\nTwo rounds of feedback are included to refine the editing to your complete satisfaction.",
      subDescriptionFr: "Nous peaufinons chaque détail selon vos retours, pour un film vraiment personnel, parfaitement abouti et livré dans les délais.",
      subDescriptionEn: "We refine every detail from your feedback, making your film truly personal, perfectly finished, and delivered on time.",
      image: "/images/brand/How_we_work_Step3.png"
    }
  ];

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
            const isFlipped = flippedCards.has(step.number);
            
            return (
              <div key={step.number} className="text-center group">
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
                            if (newSet.has(step.number)) {
                              newSet.delete(step.number);
                            } else {
                              newSet.add(step.number);
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
                      className="card-back shadow-lg hover:shadow-2xl rounded-2xl border border-gray-200 relative"
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(214, 124, 74, 0.92) 0%, rgba(42, 71, 89, 0.92) 100%), url(${step.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      {/* White Number Circle with Orange Text - Top Left on Back Card - Same position as front */}
                      <div className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center transition-transform duration-300 shadow-lg" style={{ zIndex: 10 }}>
                        <span className="text-sm font-bold text-memopyk-orange">{step.number}</span>
                      </div>
                      
                      <div 
                        className="relative cursor-pointer overflow-hidden rounded-2xl h-full"
                        onClick={() => {
                          setFlippedCards(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(step.number);
                            return newSet;
                          });
                        }}
                      >
                        
                        {/* Content area - EXACT SAME STRUCTURE AS FRONT */}
                        <div className="relative rounded-xl transition-all duration-500 aspect-square">
                          <div className="h-full flex flex-col px-2 pt-0 pb-2">
                            {/* Top Section - Text content area */}
                            <div className="text-center flex flex-col" style={{ position: 'relative' }}>
                              <div className="text-sm leading-normal text-white w-full flip-card-text-zero-spacing" style={{ paddingTop: '30px' }}>
                                {(language === 'fr-FR' ? step.descriptionFr : step.descriptionEn).split('\n').map((paragraph, i) => (
                                  <p key={i} className="m-0 p-0" style={{ marginBottom: '16px' }}>{paragraph}</p>
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
                                <div className="text-sm font-bold text-white leading-relaxed w-full">
                                  {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Title - SAME AS FRONT CARD */}
                        <div className="p-4 text-center" style={{ paddingTop: '76px' }}>
                          <h3 className="text-lg font-semibold text-white">
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