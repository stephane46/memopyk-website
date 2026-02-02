import React from 'react';
import { HelpCircle } from 'lucide-react';
import { HelpDrawer } from './HelpDrawer';

interface HelpButtonProps {
  /** Optional: Override the current route detection */
  currentRoute?: string;
  /** Optional: Custom className for the button */
  className?: string;
}

export function HelpButton({ currentRoute: propRoute, className }: HelpButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Build route string from current location + search params
  const currentRoute = React.useMemo(() => {
    if (propRoute) return propRoute;

    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      return `${pathname}?tab=${tab}`;
    }
    return pathname;
  }, [propRoute]);

  // Update route when URL changes (for SPA navigation)
  const [, forceUpdate] = React.useState({});
  React.useEffect(() => {
    const handlePopState = () => forceUpdate({});
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className || "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"}
        title="Help"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="text-sm font-medium">Aide</span>
      </button>

      <HelpDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentRoute={currentRoute}
      />
    </>
  );
}
