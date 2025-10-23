import { useState, useEffect } from 'react';
import AdminPage from '../pages/AdminPage';
import AdminLogin from '../pages/AdminLogin';

export function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const authStatus = localStorage.getItem('memopyk_admin_authenticated');
    setIsAuthenticated(authStatus === 'true');
    setIsLoading(false);
  }, []);

  // Listen for authentication changes
  useEffect(() => {
    const handleStorageChange = () => {
      const authStatus = localStorage.getItem('memopyk_admin_authenticated');
      setIsAuthenticated(authStatus === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (for same-tab changes)
    const handleAuthChange = () => {
      const authStatus = localStorage.getItem('memopyk_admin_authenticated');
      setIsAuthenticated(authStatus === 'true');
    };

    window.addEventListener('authStateChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleAuthChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <AdminPage /> : <AdminLogin />;
}