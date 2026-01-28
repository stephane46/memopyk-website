import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ContactForm } from '@/components/forms/ContactForm';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { language } = useLanguage();

  const getText = (fr: string, en: string) => language === 'fr-FR' ? fr : en;

  return (
    <section className="py-16 bg-memopyk-cream">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-memopyk-navy mb-4">
            {getText('Contactez-nous', 'Contact Us')}
          </h2>
          <p className="text-xl text-memopyk-dark-blue max-w-3xl mx-auto">
            {getText(
              'Prêt à transformer vos souvenirs en films mémorables? Contactez-nous pour discuter de votre projet.',
              'Ready to transform your memories into memorable films? Contact us to discuss your project.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-8 border border-memopyk-sky-blue/20">
              <h3 className="text-2xl font-bold text-memopyk-navy mb-6">
                {getText('Informations de contact', 'Contact Information')}
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-memopyk-orange/20 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-memopyk-orange" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-memopyk-navy mb-2">
                      {getText('Adresse', 'Address')}
                    </h4>
                    <p className="text-memopyk-blue-gray">
                      {getText(
                        '123 Rue de la Mémoire\n75001 Paris, France',
                        '123 Memory Lane\nNew York, NY 10001'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-memopyk-orange/20 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-memopyk-orange" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-memopyk-navy mb-2">
                      {getText('Téléphone', 'Phone')}
                    </h4>
                    <p className="text-memopyk-blue-gray">
                      +33 1 23 45 67 89
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-memopyk-orange/20 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-memopyk-orange" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-memopyk-navy mb-2">
                      {getText('E-mail', 'Email')}
                    </h4>
                    <p className="text-memopyk-blue-gray">
                      contact@memopyk.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-memopyk-orange/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-memopyk-orange" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-memopyk-navy mb-2">
                      {getText('Heures d\'ouverture', 'Business Hours')}
                    </h4>
                    <div className="text-memopyk-blue-gray space-y-1">
                      <p>{getText('Lundi - Vendredi: 9h00 - 18h00', 'Monday - Friday: 9:00 AM - 6:00 PM')}</p>
                      <p>{getText('Samedi: 10h00 - 16h00', 'Saturday: 10:00 AM - 4:00 PM')}</p>
                      <p>{getText('Dimanche: Fermé', 'Sunday: Closed')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-memopyk-sky-blue/20 rounded-lg p-8">
              <h3 className="text-xl font-bold text-memopyk-navy mb-4">
                {getText('Pourquoi nous choisir?', 'Why Choose Us?')}
              </h3>
              <ul className="space-y-3 text-memopyk-dark-blue">
                <li className="flex items-start gap-2">
                  <span className="text-memopyk-orange font-bold">✓</span>
                  {getText('Plus de 10 ans d\'expérience dans la création de films de mariage', 'Over 10 years of experience in wedding film creation')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-memopyk-orange font-bold">✓</span>
                  {getText('Équipement professionnel de haute qualité', 'High-quality professional equipment')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-memopyk-orange font-bold">✓</span>
                  {getText('Approche personnalisée pour chaque couple', 'Personalized approach for every couple')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-memopyk-orange font-bold">✓</span>
                  {getText('Livraison rapide sous 2-3 semaines', 'Fast delivery within 2-3 weeks')}
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8 border border-memopyk-orange/30">
            <h3 className="text-2xl font-bold text-memopyk-navy mb-6">
              {getText('Envoyez-nous un message', 'Send us a message')}
            </h3>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
};