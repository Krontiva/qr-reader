import { useState } from 'react';
import './App.css';
import { QRScanner } from './components/QRScanner';
import { QRGenerator } from './components/QRGenerator';
import { VendorCodeGenerator } from './components/VendorCodeGenerator';
import { VendorCodeLookup } from './components/VendorCodeLookup';
import type { ScanResult } from './types/qr.types';

type TabType = 'scanner' | 'generator' | 'vendor' | 'lookup';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('vendor');
  const [autoSave, setAutoSave] = useState(false);

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
    <div className="app">
      <header className="app-header">
        <h1>QR Code Scanner & Generator</h1>
        <p className="subtitle">Scan and generate QR codes with Xano integration</p>
      </header>

      <div className="auto-save-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => setAutoSave(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-text">
            Auto-save to Xano {autoSave ? '✓' : ''}
          </span>
        </label>
      </div>

      <div className="tab-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'vendor' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendor')}
          >
            Vendor Codes
          </button>
          <button
            className={`tab ${activeTab === 'lookup' ? 'active' : ''}`}
            onClick={() => setActiveTab('lookup')}
          >
            Lookup
          </button>
          <button
            className={`tab ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            Generate QR
          </button>
          <button
            className={`tab ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            Scan QR
          </button>
        </div>

        <div className="tab-content">
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
        </div>
      </div>

      <footer className="app-footer">
        <p>
          Configure your Xano credentials in <code>.env</code> file
        </p>
      </footer>
    </div>
  );
}

export default App;
