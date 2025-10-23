import { useLanguage } from '../../contexts/LanguageContext';
import { Smartphone, Laptop, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
// Using direct path to public asset
const keyVisualImage = '/images/brand/photos_video_organization_chaos.png';

export function KeyVisualSection() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);


  return (
    <section ref={sectionRef} className="-my-4 bg-gradient-to-br from-memopyk-cream to-memopyk-cream/70 overflow-hidden">
      <div className="container mx-auto px-4 pb-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 lg:gap-6 items-center overflow-hidden">
          {/* Left: Key Visual Illustration with Overlaid Animated Elements */}
          <div className="relative order-1 lg:order-none -mb-2">
            <div className="relative flex items-center justify-center">
              <img 
                src={keyVisualImage}
                alt={language === 'fr-FR' 
                  ? "Illustration MEMOPYK - Transformation des souvenirs"
                  : "MEMOPYK Illustration - Memory transformation"
                }
                className="w-full h-auto max-w-full rounded-2xl block"
                loading="eager"
                style={{ maxWidth: '100%', height: 'auto', visibility: 'visible', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('KeyVisual image failed to load:', keyVisualImage);
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.border = '2px dashed #d1d5db';
                }}
                onLoad={() => {
                  console.log('KeyVisual image loaded successfully on mobile');
                }}
              />


            </div>

            {/* Background Pattern - Hidden on mobile for better performance */}
            <div className="hidden sm:block absolute inset-0 -z-10 transform translate-x-8 translate-y-8">
              <div className="w-full h-full bg-gradient-to-br from-memopyk-sky-blue/20 to-memopyk-blue-gray/20 rounded-2xl"></div>
            </div>
          </div>

          {/* Right: Clean and Elegant Text */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 order-2 lg:order-none overflow-hidden -mt-12 sm:-mt-8 lg:mt-0">
            {/* Main heading */}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-poppins font-bold text-memopyk-navy leading-relaxed">
              {language === 'fr-FR' ? (
                <>
                  <span>Ne laissez pas vos souvenirs</span>
                  <br />
                  <span>se perdre à jamais.</span>
                </>
              ) : (
                <>
                  <span>Don't let your memories</span>
                  <br />
                  <span>be lost forever.</span>
                </>
              )}
            </h2>
            
            {/* Animated Elements Coming from Left Image */}
            <div className="text-lg sm:text-xl lg:text-2xl text-memopyk-navy leading-relaxed space-y-3 sm:space-y-2 overflow-visible w-fit max-w-none">
              {language === 'fr-FR' ? (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[290px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1200ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[0] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">enfouis dans des téléphones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[290px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1600ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[1] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">oubliés sur des disques durs...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[290px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '2000ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[2] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">entassés dans des cartons...</span>
                  </div>
                </>
              ) : (
                <>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[249px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1200ms' }}
                  >
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[3] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">buried in phones...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[249px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '1600ms' }}
                  >
                    <Laptop className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[4] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">forgotten on hard drives...</span>
                  </div>
                  <div 
                    className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-memopyk-sky-blue/30 shadow-lg max-w-[249px] sm:max-w-sm md:max-w-md transform transition-all duration-1000 hover:scale-105 hover:bg-white/80 hover:shadow-xl ${
                      isVisible ? 'translate-x-0 opacity-100' : '-translate-x-96 opacity-0'
                    }`}
                    style={{ transitionDelay: '2000ms' }}
                  >
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-memopyk-sky-blue transition-transform duration-300 hover:rotate-6" />
                    <span ref={(el) => { textRefs.current[5] = el; }} className="font-poppins text-memopyk-navy text-sm sm:text-base lg:text-lg">piled in boxes...</span>
                  </div>
                </>
              )}
            </div>

            {/* Key message */}
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-poppins font-bold text-memopyk-navy leading-tight sm:leading-relaxed">
              {language === 'fr-FR' ? (
                <>
                  <span className="block">Vos photos et vidéos méritent mieux</span>
                  <span className="block">que d'être simplement stockées,</span>
                  <span className="block">elles méritent une histoire.</span>
                </>
              ) : (
                <>
                  <span className="block">Your photos & videos deserve better</span>
                  <span className="block">than just being stored,</span>
                  <span className="block">they deserve a story.</span>
                </>
              )}
            </h2>

            {/* THE ANSWER - Enhanced Solution Statement */}
            <div className="relative mt-8 overflow-hidden transform hover:scale-[1.02] transition-all duration-500 inline-block origin-left">
              {/* Light blue background with dark blue outline */}
              <div className="bg-memopyk-sky-blue/20 border-2 border-memopyk-dark-blue rounded-xl px-5 py-5 shadow-lg relative overflow-hidden">

                {/* Main solution text with consistent typography */}
                <div className="relative z-10">
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-poppins text-memopyk-navy leading-tight sm:leading-relaxed text-center">
                    {language === 'fr-FR' ? (
                      <>
                        <span className="block">Laissez-nous sauver vos <span className="font-bold">photos et vidéos</span></span>
                        <span className="block">en les transformant en un <span className="font-bold">film souvenir</span></span>
                        <span className="block">que vous garderez précieusement.</span>
                      </>
                    ) : (
                      <>
                        <span className="block">Let us save your <span className="font-bold">photos and videos</span></span>
                        <span className="block">by transforming them into a <span className="font-bold">souvenir film</span></span>
                        <span className="block">you'll treasure forever.</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>


      </div>
    </section>
  );
}