import { useState } from 'react';
import { authApi } from '../../services/authApi';
import OTPVerificationModal from './OTPVerificationModal';
import './SignIn.css';

interface SignInProps {
  onSuccess: () => void;
}

const SignIn: React.FC<SignInProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [tempAuthData, setTempAuthData] = useState<{ authToken: string; delika_onboarding_id: string } | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Login
      const loginResponse = await authApi.login({ email, password });

      // Store auth token and onboarding ID
      localStorage.setItem('authToken', loginResponse.authToken);
      localStorage.setItem('delikaOnboardingId', loginResponse.delika_onboarding_id);
      
      if (loginResponse.role) {
        localStorage.setItem('userRole', loginResponse.role);
      }

      // Store temp data for OTP success callback
      setTempAuthData({
        authToken: loginResponse.authToken,
        delika_onboarding_id: loginResponse.delika_onboarding_id,
      });

      // Step 2: Send OTP automatically
      try {
        await authApi.sendOTP(email);
        setShowOTPModal(true);
      } catch (otpError: any) {
        setError(otpError.message || 'Login successful, but failed to send OTP. Please try again.');
        console.error('OTP send error:', otpError);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    // Store auth data (redundant for safety)
    if (tempAuthData) {
      localStorage.setItem('authToken', tempAuthData.authToken);
      localStorage.setItem('delikaOnboardingId', tempAuthData.delika_onboarding_id);
    }

    // Dispatch events for auth state change
    window.dispatchEvent(new Event('authStateChange'));
    window.dispatchEvent(new Event('roleDetectionTrigger'));

    // Close OTP modal
    setShowOTPModal(false);
    
    // Call success callback
    onSuccess();
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          <img
            src="/image/delikahorizontal.png"
            alt="Delika logo"
            className="signin-logo"
          />
          <h2>Sign In</h2>
          <p>Please sign in to access the QR Reader</p>
        </div>

        <form onSubmit={handleLogin} className="signin-form">
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      {showOTPModal && (
        <OTPVerificationModal
          email={email}
          onSuccess={handleOTPSuccess}
          onClose={() => {
            setShowOTPModal(false);
            setTempAuthData(null);
          }}
        />
      )}
    </div>
  );
};

export default SignIn;

