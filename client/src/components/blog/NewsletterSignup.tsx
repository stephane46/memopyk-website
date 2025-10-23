import { useState } from 'react';
import { Mail } from 'lucide-react';

interface NewsletterSignupProps {
  language: 'en-US' | 'fr-FR';
}

export default function NewsletterSignup({ language }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const t = {
    'fr-FR': {
      title: 'Restez inspiré',
      subtitle: 'Recevez nos derniers articles et conseils directement dans votre boîte mail',
      placeholder: 'votre@email.com',
      button: 'S\'abonner',
      success: 'Merci ! Vous êtes inscrit(e).',
      error: 'Une erreur est survenue. Veuillez réessayer.'
    },
    'en-US': {
      title: 'Stay Inspired',
      subtitle: 'Get our latest articles and tips delivered directly to your inbox',
      placeholder: 'your@email.com',
      button: 'Subscribe',
      success: 'Thank you! You\'re subscribed.',
      error: 'An error occurred. Please try again.'
    }
  }[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    // Placeholder for newsletter API integration
    // TODO: Integrate with newsletter service (e.g., Resend, Mailchimp)
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="bg-gradient-to-br from-[#2A4759] to-[#1a2d38] rounded-2xl p-8 md:p-12 text-white shadow-2xl">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D67C4A] mb-6">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-3xl md:text-4xl font-['Playfair_Display'] font-semibold mb-4">
          {t.title}
        </h3>
        <p className="text-lg text-gray-300 mb-8">
          {t.subtitle}
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholder}
            required
            disabled={status === 'loading' || status === 'success'}
            className="flex-1 px-6 py-4 rounded-full text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D67C4A] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="input-newsletter-email"
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="px-8 py-4 bg-[#D67C4A] hover:bg-[#c56a3a] text-white font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            data-testid="button-newsletter-subscribe"
          >
            {status === 'loading' ? '...' : status === 'success' ? '✓' : t.button}
          </button>
        </form>
        
        {status === 'success' && (
          <p className="mt-4 text-[#89BAD9] font-medium" data-testid="text-newsletter-success">
            {t.success}
          </p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-red-300 font-medium" data-testid="text-newsletter-error">
            {t.error}
          </p>
        )}
      </div>
    </div>
  );
}
