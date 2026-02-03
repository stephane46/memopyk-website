import React, { createContext, useContext, useState, useCallback } from 'react';

interface HelpContextType {
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
}

const HelpContext = createContext<HelpContextType | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const toggleHelp = useCallback(() => setIsHelpOpen(prev => !prev), []);

  return (
    <HelpContext.Provider value={{
      isHelpOpen,
      openHelp,
      closeHelp,
      toggleHelp,
      currentRoute,
      setCurrentRoute
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
