import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Edit, Heart, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CtaSettings } from '@shared/schema';

export function HowItWorksSection() {
  const { language } = useLanguage();
  
  // Fetch CTA settings from the API to use the same URLs as the main CTA section
  const { data: ctaSettings = [] } = useQuery<CtaSettings[]>({
    queryKey: ['/api/cta']
  });

  const steps = [
    {
      number: 1,
      icon: Upload,
      titleFr: "Téléversement",
      titleEn: "You Upload",
      descriptionFr: "Envoyez-nous vos photos et vidéos telles qu'elles sont — inutile de trier, renommer ou organiser. Nous acceptons tous les formats, et proposons des envois collaboratifs pour que la famille / les amis puissant contribuer.\nNous vous aidons pour la numérisation de vos éléments analogiques (vieilles photos imprimées, CD, cassettes VHS,...).",
      descriptionEn: "Give us your photos and videos as they are — no need to sort, rename, or organize.\nWe support collaborative uploads, so your family/friends can contribute.\nWe also help you with the digitization of your analog materials (printed old photos, CDs, VHS tapes,…).",
      subDescriptionFr: "Vous recevrez également un court questionnaire pour nous en dire plus sur votre histoire — qu'elle soit encore floue ou déjà bien construite.",
      subDescriptionEn: "You'll first fill in a short questionnaire, or have a consultation chat with us, to tell us more about what you have in mind — whether it's a vague or detailed vision.",
      image: "/images/brand/How_we_work_Step1.png"
    },
    {
      number: 2,
      icon: Edit,
      titleFr: "Sélection & Montage", 
      titleEn: "We Create",
      descriptionFr: "Nous étudions chaque photo et chaque video pour repérer les moments les plus marquants, puis établissons l'arc naratif le plus adapté, avec des suggestions de musique, de durée et de format — tout est pensé pour sublimer vos souvenirs.",
      descriptionEn: "We study each photo and each video to identify the most meaningful moments, then establish a personalized storyline, suggest music, duration, and format — every details are tailored to your memories.",
      subDescriptionFr: "Bien entendu, votre brief initial et tout commentaire que vous pourriez avoir sont toujours respectés, à chaque étape du processus.",
      subDescriptionEn: "Of course, your initial brief and any comment that you may have are always respected, each step of the way.",
      image: "/images/brand/How_we_work_Step2.png"
    },
    {
      number: 3,
      icon: Heart,
      titleFr: "C'est prêt !",
      titleEn: "You Enjoy & Share", 
      descriptionFr: "Nous donnons vie à votre film, dans le format de votre choix, le mieux adapté par exemple pour le visionnage à la télévision ou sur Facebook. Vous recevez un résultat soigné en 1 à 3 semaines, avec 2 séries de retours incluses. Vous obtiendrez un film de haute qualité qui reflète fidèlement votre vision et vos souhaits.",
      descriptionEn: "We bring your film to life, in the format of you choice, best suited for example for TV viewing or for Facebook. Expect a beautifully crafted result within 1-3 weeks, with 2 revision rounds included. You'll receive a high-quality visual story that truly reflects your vision and wishes.",
      subDescriptionFr: "Ce film est parfait pour préserver vos souvenirs, offrir un cadeau plein d'émotion à un proche, ou partager un moment privilégié en famille ou entre amis.",
      subDescriptionEn: "The film is ideal for cherishing memories, sharing a heartfelt gift with a loved one, or enjoying together with family and friends.",
      image: "/images/brand/How_we_work_Step3.png"
    }
  ];

  return (
    <section id="how-it-works" className="pt-1 pb-1 bg-gradient-to-br from-white to-memopyk-sky-blue/10">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-poppins font-bold text-memopyk-navy mb-6">
            {language === 'fr-FR' 
              ? "Comment Ça Marche"
              : "How It Works"
            }
          </h2>

        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" style={{ gridAutoRows: '1fr' }}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isMiddleCard = step.number === 2;
            return (
              <div key={step.number} className="h-full">
                {/* Step Card */}
                <div className={`relative bg-gradient-to-br from-memopyk-dark-blue via-memopyk-navy to-memopyk-dark-blue rounded-3xl shadow-2xl text-center group hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 z-10 h-full flex flex-col p-4 sm:p-6 lg:p-8 ${
                  isMiddleCard ? 'border-4 border-memopyk-orange' : ''
                }`}>
                  
                  {/* Step Image */}
                  <div className="mb-3 sm:mb-4 flex-shrink-0">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 mx-auto bg-memopyk-cream rounded-3xl p-2 sm:p-3 shadow-lg">
                      <img 
                        src={step.image}
                        alt={language === 'fr-FR' ? step.titleFr : step.titleEn}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-memopyk-cream mb-3 sm:mb-4 flex-shrink-0">
                    {step.number}. {language === 'fr-FR' ? step.titleFr : step.titleEn}
                  </h3>

                  {/* Step Description - Natural text flow */}
                  <div className="flex-grow flex flex-col">
                    <div className="text-memopyk-cream/90 text-xs sm:text-sm leading-4 mb-3 how-it-works-text">
                      {language === 'fr-FR' ? step.descriptionFr : step.descriptionEn}
                    </div>
                    
                    {/* Sub Description - Fixed at bottom */}
                    <div className="mt-auto pt-3 border-t border-memopyk-cream/20 flex flex-col items-center justify-center">
                      <div className="flex justify-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-memopyk-cream flex items-center justify-center">
                          <Icon className="w-4 h-4 text-memopyk-dark-blue" />
                        </div>
                      </div>
                      <div className="text-memopyk-cream/90 text-xs sm:text-sm leading-4 text-center px-2 how-it-works-text">
                        {language === 'fr-FR' ? step.subDescriptionFr : step.subDescriptionEn}
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