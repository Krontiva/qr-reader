import { useState, useEffect, useRef } from 'react';
import { authApi } from '../../services/authApi';
import './OTPVerificationModal.css';

interface OTPVerificationModalProps {
  email: string;
  onSuccess: () => void;
  onClose: () => void;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  email,
  onSuccess,
  onClose,
}) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.length === 4) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{4}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setError('');
      // Focus last input
      inputRefs.current[3]?.focus();
      // Auto-verify
      setTimeout(() => handleVerifyOTP(pastedData), 100);
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const otpCodeToVerify = otpCode || otp.join('');
    
    if (otpCodeToVerify.length !== 4) {
      setError('Please enter a 4-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const authToken = authApi.getAuthToken();
      if (!authToken) {
        throw new Error('No auth token found. Please login again.');
      }

      // Step 3: Verify OTP
      const verifyResponse = await authApi.verifyOTP(email, otpCodeToVerify);

      if (verifyResponse.otpValidate === 'otpFound') {
        // Step 4: Get user profile (optional - if endpoint doesn't exist, still allow login)
        try {
          const userData = await authApi.getUserProfile(authToken);
          
          // Store user data
          localStorage.setItem('userData', JSON.stringify(userData));
          
          if (userData.id) {
            localStorage.setItem('delikaOnboardingId', userData.id);
          }

          if (userData.role) {
            localStorage.setItem('userRole', userData.role);
          }

        } catch (profileError: any) {
          // If endpoint doesn't exist (404), allow login to continue silently
          // Otherwise show warning but don't block login
          if (profileError.response?.status === 404 || profileError.is404 || profileError.message?.includes('404') || profileError.message?.includes('not found')) {
            // Silently continue - endpoint doesn't exist yet
            // Don't log to console to reduce noise
          } else {
            // For other errors, show warning but don't block login
            console.warn('Failed to fetch user profile, but continuing with login:', profileError.message);
          }
        }

        // Success - proceed with login regardless of profile fetch result
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setError('Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code. Please try again.');
      console.error('OTP verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="otp-modal-overlay" onClick={onClose}>
      <div className="otp-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="otp-modal-close" onClick={onClose}>×</button>
        
        <div className="otp-modal-header">
          <h3>Verify OTP</h3>
          <p>Enter the 4-digit code sent to <strong>{email}</strong></p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        <div className="otp-input-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isLoading}
              className="otp-input"
            />
          ))}
        </div>

        <button
          onClick={() => handleVerifyOTP()}
          className="btn-primary"
          disabled={isLoading || otp.some(digit => !digit)}
        >
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <div className="otp-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-link"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;

