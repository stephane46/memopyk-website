import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string, rememberMe?: boolean) => void;
  logout: () => void;
  token: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored authentication on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('memopyk-admin-token') || 
                      sessionStorage.getItem('memopyk-admin-token');
    
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = (newToken: string, rememberMe = false) => {
    setToken(newToken);
    setIsAuthenticated(true);
    
    // Store token based on "remember me" choice
    if (rememberMe) {
      localStorage.setItem('memopyk-admin-token', newToken);
      sessionStorage.removeItem('memopyk-admin-token');
    } else {
      sessionStorage.setItem('memopyk-admin-token', newToken);
      localStorage.removeItem('memopyk-admin-token');
    }
  };

  const logout = () => {
    setToken(null);
    setIsAuthenticated(false);
    
    // Clear both storage types
    localStorage.removeItem('memopyk-admin-token');
    sessionStorage.removeItem('memopyk-admin-token');
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      token,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};