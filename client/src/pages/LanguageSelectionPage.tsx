import { useLanguage } from '../contexts/LanguageContext';
import { useLocation } from 'wouter';

export function LanguageSelectionPage() {
  const { language, setLanguage } = useLanguage();
  const [, setLocation] = useLocation();

  const handleLanguageSelect = (lang: 'fr' | 'en') => {
    setLanguage(lang);
    // Redirect to home page after language selection
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">MEMOPYK</h1>
          <p className="text-gray-600">
            {language === 'fr' ? 'Choisissez votre langue' : 'Choose your language'}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLanguageSelect('fr')}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              language === 'fr'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🇫🇷</span>
                <div className="text-left">
                  <div className="font-semibold">Français</div>
                  <div className="text-sm text-gray-500">Films Mémoire</div>
                </div>
              </div>
              {language === 'fr' && (
                <div className="text-blue-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => handleLanguageSelect('en')}
            className={`w-full p-4 rounded-lg border-2 transition-all ${
              language === 'en'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🇺🇸</span>
                <div className="text-left">
                  <div className="font-semibold">English</div>
                  <div className="text-sm text-gray-500">Memory Films</div>
                </div>
              </div>
              {language === 'en' && (
                <div className="text-blue-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setLocation('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {language === 'fr' ? 'Continuer avec' : 'Continue with'} {language === 'fr' ? 'Français' : 'English'}
          </button>
        </div>
      </div>
    </div>
  );
}