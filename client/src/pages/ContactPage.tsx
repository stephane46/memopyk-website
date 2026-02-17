import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { ContactForm } from '@/components/forms/ContactForm';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function ContactPage() {
  const [location] = useLocation();
  const languageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';

  // Scroll to top when contact page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const t = {
    'fr-FR': {
      title: 'Contactez-nous',
      subtitle: 'Parlons de votre projet',
      description: 'Une question ? Un projet de film souvenir ? N\'hésitez pas à nous écrire.',
      backHome: 'Retour à l\'accueil',
      contactInfo: 'Nos coordonnées',
      phoneLabel: 'Téléphone',
      emailLabel: 'Email',
      addressLabel: 'Adresse'
    },
    'en-US': {
      title: 'Contact Us',
      subtitle: 'Let\'s talk about your project',
      description: 'Have a question? A souvenir film project? Don\'t hesitate to reach out.',
      backHome: 'Back to home',
      contactInfo: 'Contact Information',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
      addressLabel: 'Address'
    }
  }[languageCode];

  const homeRoute = languageCode === 'fr-FR' ? '/fr-FR' : '/en-US';

  return (
    <>
      <Helmet>
        <title>{t.title} | MEMOPYK</title>
        <meta name="description" content={t.description} />

        <meta property="og:title" content={`${t.title} | MEMOPYK`} />
        <meta property="og:description" content={t.description} />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${t.title} | MEMOPYK`} />
        <meta name="twitter:description" content={t.description} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#F2EBDC] to-white">
        {/* Hero Section */}
        <header className="relative bg-[#2A4759] py-4 md:py-6 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <Link href={homeRoute} data-testid="link-home">
              <span className="inline-flex items-center text-[#D67C4A] hover:text-white transition-colors cursor-pointer font-medium group">
                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t.backHome}
              </span>
            </Link>
            <div className="mt-4 max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-['Playfair_Display'] font-bold leading-tight text-white">
                {t.title}
              </h1>
              <p className="text-lg md:text-xl mt-2 font-medium text-white">
                {t.subtitle}
              </p>
              <p className="text-sm md:text-base mt-1.5 leading-relaxed text-white/90">
                {t.description}
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 pt-8 md:pt-12 pb-12 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            {/* Contact Information Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-4">
                <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#2A4759] dark:text-white mb-6">
                  {t.contactInfo}
                </h2>

                <div className="space-y-6">
                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#D67C4A] bg-opacity-10 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[#D67C4A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {t.phoneLabel}
                      </h3>
                      <a
                        href="tel:+33745843821"
                        className="text-gray-600 dark:text-gray-300 hover:text-[#D67C4A] transition-colors"
                      >
                        +33 7 45 84 38 21
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#D67C4A] bg-opacity-10 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#D67C4A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {t.emailLabel}
                      </h3>
                      <a
                        href="mailto:contact@memopyk.com"
                        className="text-gray-600 dark:text-gray-300 hover:text-[#D67C4A] transition-colors"
                      >
                        contact@memopyk.com
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-[#D67C4A] bg-opacity-10 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#D67C4A]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {t.addressLabel}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        MEMOPYK EURL<br />
                        Toulouse, France
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
