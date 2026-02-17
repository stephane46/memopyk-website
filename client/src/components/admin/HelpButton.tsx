import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useHelp } from '@/contexts/HelpContext';

interface HelpButtonProps {
  /** Optional: Custom className for the button */
  className?: string;
}

export function HelpButton({ className }: HelpButtonProps) {
  const { openHelp, setCurrentRoute } = useHelp();

  // Build route string from current location + search params
  // Strip language prefix (e.g., /en-US/admin -> /admin)
  const computeRoute = React.useCallback(() => {
    let pathname = window.location.pathname;
    // Strip language prefix like /en-US or /fr-FR
    pathname = pathname.replace(/^\/(en-US|fr-FR)/, '');

    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      // For analytics dashboard, include subtab for granular help
      const anTab = searchParams.get('an_tab');
      if (tab === 'analytics-new' && anTab) {
        return `${pathname}?tab=${tab}&an_tab=${anTab}`;
      }
      // Show "New Post" help when editing a just-created post
      if (tab === 'blog-edit' && searchParams.get('new') === 'true') {
        return '/admin?tab=new-post';
      }
      return `${pathname}?tab=${tab}`;
    }
    return pathname;
  }, []);

  // Update route on mount and when URL changes
  React.useEffect(() => {
    setCurrentRoute(computeRoute());

    // Listen for popstate (back/forward navigation)
    const handlePopState = () => setCurrentRoute(computeRoute());
    window.addEventListener('popstate', handlePopState);

    // Poll for URL changes (handles pushState from tab clicks)
    let lastUrl = window.location.href;
    const interval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setCurrentRoute(computeRoute());
      }
    }, 500);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(interval);
    };
  }, [computeRoute, setCurrentRoute]);

  return (
    <button
      onClick={openHelp}
      className={className || "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"}
      title="Help"
    >
      <HelpCircle className="h-5 w-5" />
      <span className="text-sm font-medium">Aide</span>
    </button>
  );
}
