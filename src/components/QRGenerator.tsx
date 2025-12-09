import { useState, useRef } from 'react';
import QRCode from 'qrcode';
import type { GenerateOptions } from '../types/qr.types';
import { xanoApi } from '../services/xanoApi';
import { delikaApi } from '../services/delikaApi';

interface QRGeneratorProps {
  onGenerate?: (qrImageUrl: string, text: string) => void;
  autoSaveToXano?: boolean;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  onGenerate,
  autoSaveToXano = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [encodedText, setEncodedText] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const publicVerifyBase = (import.meta.env.VITE_QR_PUBLIC_VERIFY_BASE_URL as string | undefined) || '';
  const redirectBase = (import.meta.env.VITE_QR_REDIRECT_BASE_URL as string | undefined) || '';

  // QR Code generation options
  const [options, setOptions] = useState<GenerateOptions>({
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const generateQRCode = async () => {
    if (!inputText.trim()) {
      setError('Please enter text to generate QR code');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const qrTextToEncode = publicVerifyBase
        ? `${publicVerifyBase}?qr=${code}`
        : (redirectBase ? `${redirectBase}/${code}` : inputText);
      const url = await QRCode.toDataURL(qrTextToEncode, options);
      setQrCodeUrl(url);
      setEncodedText(qrTextToEncode);
      setGeneratedCode(code);

      // Also draw on canvas for better quality
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrTextToEncode, options);
      }

      if (onGenerate) {
        onGenerate(url, inputText);
      }

      // Auto-save to Xano if enabled
      if (autoSaveToXano) {
        await saveToXano(url, inputText);
      }

      setSuccess('QR Code generated successfully!');
    } catch (err) {
      setError('Failed to generate QR code. Please try again.');
      console.error('QR generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToXano = async (imageUrl: string, text: string) => {
    setIsSaving(true);
    try {
      const code = generatedCode || Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const parts = imageUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(parts[1] || '');
      const len = bstr.length;
      const u8arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      const blob = new Blob([u8arr], { type: mime });

      await delikaApi.createDelikaQR(text, code, text, blob);
      setSuccess('QR Code saved successfully');
    } catch (err) {
      console.error('Failed to save QR code:', err);
      setError('Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (qrCodeUrl && inputText) {
      await saveToXano(qrCodeUrl, inputText);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearQRCode = () => {
    setQrCodeUrl('');
    setInputText('');
    setEncodedText('');
    setGeneratedCode('');
    setError('');
    setSuccess('');
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  return (
    <div className="qr-generator-container">
      <h2>QR Code Generator</h2>

      <div className="generator-form">
        <div className="form-group">
          <label htmlFor="qr-text">Enter Text or URL:</label>
          <textarea
            id="qr-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text, URL, or any data to encode..."
            rows={4}
            className="text-input"
          />
        </div>

        <div className="options-grid">
          <div className="form-group">
            <label htmlFor="qr-width">Size (px):</label>
            <input
              id="qr-width"
              type="number"
              value={options.width}
              onChange={(e) =>
                setOptions({ ...options, width: Number(e.target.value) })
              }
              min={100}
              max={1000}
              className="number-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="qr-margin">Margin:</label>
            <input
              id="qr-margin"
              type="number"
              value={options.margin}
              onChange={(e) =>
                setOptions({ ...options, margin: Number(e.target.value) })
              }
              min={0}
              max={10}
              className="number-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="qr-dark">Dark Color:</label>
            <input
              id="qr-dark"
              type="color"
              value={options.color?.dark}
              onChange={(e) =>
                setOptions({
                  ...options,
                  color: { ...options.color, dark: e.target.value },
                })
              }
              className="color-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="qr-light">Light Color:</label>
            <input
              id="qr-light"
              type="color"
              value={options.color?.light}
              onChange={(e) =>
                setOptions({
                  ...options,
                  color: { ...options.color, light: e.target.value },
                })
              }
              className="color-input"
            />
          </div>
        </div>

        <div className="button-group">
          <button
            onClick={generateQRCode}
            disabled={isGenerating || !inputText.trim()}
            className="btn-primary"
          >
            {isGenerating ? 'Generating...' : 'Generate QR Code'}
          </button>

          {qrCodeUrl && (
            <>
              <button onClick={downloadQRCode} className="btn-secondary">
                Download
              </button>
              {!autoSaveToXano && (
                <button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="btn-save"
                >
                  {isSaving ? 'Saving...' : 'Save to Xano'}
                </button>
              )}
              <button onClick={clearQRCode} className="btn-clear">
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="success-message">
          <p>{success}</p>
        </div>
      )}

      {isSaving && autoSaveToXano && (
        <p className="saving-indicator">Saving to Xano...</p>
      )}

      {qrCodeUrl && (
        <div className="qr-display">
          <h3>Generated QR Code:</h3>
          <div className="qr-code-wrapper">
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <img src={qrCodeUrl} alt="Generated QR Code" className="qr-image" />
          </div>
          <div className="qr-info">
            <p>
              <strong>Encoded Text:</strong> {encodedText || inputText}
            </p>
            {(publicVerifyBase || redirectBase) && (
              <p>
                <strong>Destination URL:</strong> {inputText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
