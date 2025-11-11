import { useEffect, useState } from 'react';
import { authApi } from '../../services/authApi';
import SignIn from './SignIn';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authApi.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsChecking(false);
    };

    // Check on mount
    checkAuth();

    // Listen for auth state changes
    const handleAuthStateChange = () => {
      checkAuth();
    };

    window.addEventListener('authStateChange', handleAuthStateChange);

    return () => {
      window.removeEventListener('authStateChange', handleAuthStateChange);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isChecking) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn onSuccess={handleLoginSuccess} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

