import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import type { ScanResult } from '../types/qr.types';
import { xanoApi } from '../services/xanoApi';

interface QRScannerProps {
  onScanSuccess?: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
  autoSaveToXano?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  autoSaveToXano = false,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');

  useEffect(() => {
    if (isScanning && scanMode === 'camera') {
      startCameraScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning, scanMode]);

  const startCameraScanner = () => {
    const scannerId = 'qr-reader';

    scannerRef.current = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      },
      false
    );

    scannerRef.current.render(
      async (decodedText) => {
        setScanResult(decodedText);
        const result: ScanResult = {
          text: decodedText,
          timestamp: new Date(),
        };

        if (onScanSuccess) {
          onScanSuccess(result);
        }

        // Auto-save to Xano if enabled
        if (autoSaveToXano) {
          await saveToXano(decodedText);
        }

        // Optionally stop scanning after successful scan
        // stopScanner();
      },
      (errorMessage) => {
        // Handle scan errors (usually when no QR code is detected)
        // We don't want to show these as actual errors
        if (errorMessage !== scanResult) {
          // console.log(errorMessage);
        }
      }
    );
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((error) => {
        console.error('Error clearing scanner:', error);
      });
      scannerRef.current = null;
    }

    if (qrCodeRef.current) {
      qrCodeRef.current.stop().catch((error) => {
        console.error('Error stopping QR code scanner:', error);
      });
      qrCodeRef.current = null;
    }
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    setError('');
    setScanResult('');
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    stopScanner();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      qrCodeRef.current = html5QrCode;

      const decodedText = await html5QrCode.scanFile(file, false);
      setScanResult(decodedText);

      const result: ScanResult = {
        text: decodedText,
        timestamp: new Date(),
      };

      if (onScanSuccess) {
        onScanSuccess(result);
      }

      // Auto-save to Xano if enabled
      if (autoSaveToXano) {
        await saveToXano(decodedText);
      }
    } catch (err) {
      const errorMsg = 'Error scanning file. Please try another image.';
      setError(errorMsg);
      if (onScanError) {
        onScanError(errorMsg);
      }
    }
  };

  const saveToXano = async (text: string) => {
    setIsSaving(true);
    try {
      await xanoApi.saveQRCode({
        qr_text: text,
        metadata: {
          scanned_at: new Date().toISOString(),
          source: 'scanner',
        },
      });
      console.log('QR code saved to Xano successfully');
    } catch (err) {
      console.error('Failed to save QR code to Xano:', err);
      setError('Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (scanResult) {
      await saveToXano(scanResult);
    }
  };

  return (
    <div className="qr-scanner-container">
      <h2>QR Code Scanner</h2>

      <div className="scanner-controls">
        <div className="mode-selector">
          <button
            className={scanMode === 'camera' ? 'active' : ''}
            onClick={() => {
              setScanMode('camera');
              if (isScanning) {
                handleStopScanning();
              }
            }}
          >
            Camera
          </button>
          <button
            className={scanMode === 'file' ? 'active' : ''}
            onClick={() => {
              setScanMode('file');
              if (isScanning) {
                handleStopScanning();
              }
            }}
          >
            Upload File
          </button>
        </div>

        {scanMode === 'camera' && (
          <div className="camera-controls">
            {!isScanning ? (
              <button onClick={handleStartScanning} className="btn-primary">
                Start Camera Scanner
              </button>
            ) : (
              <button onClick={handleStopScanning} className="btn-secondary">
                Stop Scanner
              </button>
            )}
          </div>
        )}

        {scanMode === 'file' && (
          <div className="file-controls">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
            />
          </div>
        )}
      </div>

      <div id="qr-reader" className="qr-reader"></div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {scanResult && (
        <div className="scan-result">
          <h3>Scan Result:</h3>
          <div className="result-content">
            <p>{scanResult}</p>
          </div>
          {!autoSaveToXano && (
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="btn-save"
            >
              {isSaving ? 'Saving...' : 'Save to Xano'}
            </button>
          )}
          {autoSaveToXano && isSaving && (
            <p className="saving-indicator">Saving to Xano...</p>
          )}
        </div>
      )}
    </div>
  );
};
