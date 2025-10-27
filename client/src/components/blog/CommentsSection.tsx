import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommentsSectionProps {
  slug: string;
  title: string;
  url: string;
  commentsEnabled?: boolean;
  disqusShortname?: string;
  language?: string;
  className?: string;
}

export default function CommentsSection({
  slug,
  title,
  url,
  commentsEnabled = true,
  disqusShortname = 'memopyk',
  language = 'en-US',
  className = ''
}: CommentsSectionProps) {
  const [disqusLoaded, setDisqusLoaded] = useState(false);

  useEffect(() => {
    if (!commentsEnabled) return;

    // Lazy load Disqus
    const timer = setTimeout(() => {
      // Check if Disqus is already loaded
      if ((window as any).DISQUS) {
        (window as any).DISQUS.reset({
          reload: true,
          config: function () {
            this.page.identifier = `post-${slug}`;
            this.page.url = url;
            this.page.title = title;
            this.language = language === 'fr-FR' ? 'fr' : 'en';
          }
        });
        setDisqusLoaded(true);
      } else {
        // Load Disqus for the first time
        const disqusScript = document.createElement('script');
        disqusScript.src = `https://${disqusShortname}.disqus.com/embed.js`;
        disqusScript.setAttribute('data-timestamp', String(+new Date()));
        disqusScript.async = true;
        
        disqusScript.onload = () => setDisqusLoaded(true);
        
        (document.head || document.body).appendChild(disqusScript);

        // Disqus config
        (window as any).disqus_config = function () {
          this.page.url = url;
          this.page.identifier = `post-${slug}`;
          this.page.title = title;
          this.language = language === 'fr-FR' ? 'fr' : 'en';
        };
      }
    }, 1000); // Delay 1 second for lazy loading

    return () => clearTimeout(timer);
  }, [slug, title, url, commentsEnabled, disqusShortname, language]);

  if (!commentsEnabled) {
    return null;
  }

  return (
    <div className={`py-12 border-t border-gray-200 ${className}`} data-testid="comments-section">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-['Playfair_Display'] text-[#2A4759]">
            <MessageSquare className="h-6 w-6" />
            {language === 'fr-FR' ? 'Commentaires' : 'Comments'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!disqusLoaded && (
            <div className="text-center py-8 text-gray-500">
              {language === 'fr-FR' ? 'Chargement des commentaires...' : 'Loading comments...'}
            </div>
          )}
          <div id="disqus_thread" data-testid="disqus-thread"></div>
          <noscript>
            <p className="text-gray-600 text-center py-4">
              {language === 'fr-FR' 
                ? 'Veuillez activer JavaScript pour voir les commentaires.' 
                : 'Please enable JavaScript to view the comments.'}
            </p>
          </noscript>
        </CardContent>
      </Card>
    </div>
  );
}
