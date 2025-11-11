import { useEffect, useState } from 'react';
import './App.css';
import { QRScanner } from './components/QRScanner';
import { QRGenerator } from './components/QRGenerator';
import { VendorCodeGenerator } from './components/VendorCodeGenerator';
import { VendorCodeLookup } from './components/VendorCodeLookup';
import { TicketVerificationScanner } from './components/TicketVerificationScanner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { authApi, type UserData } from './services/authApi';
import type { ScanResult } from './types/qr.types';
import { VerifyIcon, VendorIcon, LookupIcon, GenerateIcon, ScannerIcon } from './assets/icons';

type TabType = 'tickets' | 'verify' | 'vendor' | 'lookup' | 'scanner' | 'generator';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('verify');
  const [autoSave] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  // Get user email from localStorage
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          const userData: UserData = JSON.parse(userDataStr);
          if (userData.email) {
            setUserEmail(userData.email);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    // Load on mount
    loadUserData();

    // Listen for auth state changes
    const handleAuthStateChange = () => {
      loadUserData();
    };

    window.addEventListener('authStateChange', handleAuthStateChange);
    window.addEventListener('storage', handleAuthStateChange);

    return () => {
      window.removeEventListener('authStateChange', handleAuthStateChange);
      window.removeEventListener('storage', handleAuthStateChange);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isSmall = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(isSmall);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Prevent navigating to hidden tabs on mobile and when Tickets is disabled
    if (isMobile && activeTab === 'tickets') {
      setActiveTab('verify');
    }
  }, [isMobile, activeTab]);

  const handleScanSuccess = (result: ScanResult) => {
    console.log('QR Code Scanned:', result);
    // You can add additional logic here, such as showing notifications
  };

  const handleScanError = (error: string) => {
    console.error('Scan Error:', error);
  };

  const handleGenerate = (qrImageUrl: string, text: string) => {
    console.log('QR Code Generated:', { qrImageUrl, text });
  };

  return (
    <ProtectedRoute>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <img
              src="/image/delikahorizontal.png"
              alt="Delika logo"
              className="brand-logo"
            />
            <div className="header-right">
              {userEmail && (
                <div className="user-email">
                  <span className="user-email-label">Logged in as:</span>
                  <span className="user-email-value">{userEmail}</span>
                </div>
              )}
              <button
                onClick={() => {
                  authApi.logout();
                  window.location.reload();
                }}
                className="logout-btn"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

      {/** Auto-save toggle removed per request (hidden on desktop too) **/}

      <div className="tab-container">
        {isMobile ? (
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >
              <VerifyIcon active={activeTab === 'verify'} />
              Verify Tickets
            </button>
            <button
              className={`tab ${activeTab === 'lookup' ? 'active' : ''}`}
              onClick={() => setActiveTab('lookup')}
            >
              <LookupIcon active={activeTab === 'lookup'} />
              Lookup
            </button>
          </div>
        ) : (
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >
              <VerifyIcon active={activeTab === 'verify'} />
              Verify Tickets
            </button>
            <button
              className={`tab ${activeTab === 'vendor' ? 'active' : ''}`}
              onClick={() => setActiveTab('vendor')}
            >
              <VendorIcon active={activeTab === 'vendor'} />
              Vendor Codes
            </button>
            <button
              className={`tab ${activeTab === 'lookup' ? 'active' : ''}`}
              onClick={() => setActiveTab('lookup')}
            >
              <LookupIcon active={activeTab === 'lookup'} />
              Lookup
            </button>
            <button
              className={`tab ${activeTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveTab('generator')}
            >
              <GenerateIcon active={activeTab === 'generator'} />
              Generate QR
            </button>
            <button
              className={`tab ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <ScannerIcon active={activeTab === 'scanner'} />
              Scan QR
            </button>
          </div>
        )}

        <div className="tab-content">
          {isMobile ? (
            activeTab === 'verify' ? (
              <TicketVerificationScanner />
            ) : (
              <VendorCodeLookup />
            )
          ) : (
            <>
              {activeTab === 'verify' && (
                <TicketVerificationScanner />
              )}
              {activeTab === 'vendor' && (
                <VendorCodeGenerator autoSaveToXano={autoSave} />
              )}
              {activeTab === 'lookup' && (
                <VendorCodeLookup />
              )}
              {activeTab === 'generator' && (
                <QRGenerator
                  onGenerate={handleGenerate}
                  autoSaveToXano={autoSave}
                />
              )}
              {activeTab === 'scanner' && (
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  onScanError={handleScanError}
                  autoSaveToXano={autoSave}
                />
              )}
            </>
          )}
        </div>
      </div>

        {/* Footer removed per request: no Xano credentials note on desktop */}
      </div>
    </ProtectedRoute>
  );
}

export default App;
