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
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          language
        })
      });

      if (!response.ok) {
        throw new Error('Subscription failed');
      }

      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-[#011526] py-14 sm:py-20 text-center rounded-2xl shadow-2xl">
      <div className="max-w-[72rem] mx-auto px-6">
        <div className="mx-auto mb-8 sm:mb-10 h-16 w-16 rounded-full bg-[#D67C4A] grid place-items-center shadow-md">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-white/95 text-3xl sm:text-4xl font-semibold tracking-tight">
          {t.title}
        </h2>
        <p className="mt-3 sm:mt-4 text-white/85 text-base sm:text-lg leading-relaxed max-w-[60ch] mx-auto">
          {t.subtitle}
        </p>
        
        <form onSubmit={handleSubmit} className="mt-8 sm:mt-10 max-w-md mx-auto px-2">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.placeholder}
                required
                disabled={status === 'loading' || status === 'success'}
                className="w-full h-12 rounded-full px-6 bg-white text-gray-900 placeholder-gray-500 caret-gray-900 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(1,21,38)] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="input-newsletter-email"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              style={{ backgroundColor: '#D67C4A', color: 'white' }}
              className="h-12 px-6 rounded-full font-semibold shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
              data-testid="button-newsletter-subscribe"
            >
              {status === 'loading' ? '...' : status === 'success' ? '✓' : t.button}
            </button>
          </div>
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
