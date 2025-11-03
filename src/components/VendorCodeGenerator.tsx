import { useState } from 'react';
import QRCode from 'qrcode';
import type { VendorCode, GenerateOptions, BatchGenerateResult } from '../types/qr.types';
import { xanoApi } from '../services/xanoApi';

interface VendorCodeGeneratorProps {
  autoSaveToXano?: boolean;
}

export const VendorCodeGenerator: React.FC<VendorCodeGeneratorProps> = ({
  autoSaveToXano = false,
}) => {
  const [vendorCodes, setVendorCodes] = useState<VendorCode[]>([]);
  const [currentVendorCode, setCurrentVendorCode] = useState('');
  const [currentVendorName, setCurrentVendorName] = useState('');
  const [currentProductName, setCurrentProductName] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [batchResult, setBatchResult] = useState<BatchGenerateResult | null>(null);
  const [generatedQRs, setGeneratedQRs] = useState<Map<string, string>>(new Map());

  // QR Code generation options
  const [options] = useState<GenerateOptions>({
    width: 250,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const addVendorCode = () => {
    if (!currentVendorCode.trim() || !currentVendorName.trim()) {
      setError('Vendor code and vendor name are required');
      return;
    }

    const newCode: VendorCode = {
      vendor_code: currentVendorCode.trim(),
      vendor_name: currentVendorName.trim(),
      product_name: currentProductName.trim() || undefined,
      description: currentDescription.trim() || undefined,
    };

    setVendorCodes([...vendorCodes, newCode]);
    setCurrentVendorCode('');
    setCurrentVendorName('');
    setCurrentProductName('');
    setCurrentDescription('');
    setError('');
  };

  const removeVendorCode = (index: number) => {
    const updated = vendorCodes.filter((_, i) => i !== index);
    setVendorCodes(updated);
  };

  const processBulkInput = () => {
    if (!bulkInput.trim()) {
      setError('Please enter vendor codes in the bulk input area');
      return;
    }

    const lines = bulkInput.split('\n').filter(line => line.trim());
    const newCodes: VendorCode[] = [];

    for (const line of lines) {
      // Expected format: VENDOR_CODE,VENDOR_NAME,PRODUCT_NAME,DESCRIPTION
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        newCodes.push({
          vendor_code: parts[0],
          vendor_name: parts[1],
          product_name: parts[2] || undefined,
          description: parts[3] || undefined,
        });
      }
    }

    if (newCodes.length > 0) {
      setVendorCodes([...vendorCodes, ...newCodes]);
      setBulkInput('');
      setSuccess(`Added ${newCodes.length} vendor codes`);
      setError('');
    } else {
      setError('No valid vendor codes found in bulk input');
    }
  };

  const generateAllQRCodes = async () => {
    if (vendorCodes.length === 0) {
      setError('No vendor codes to generate');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');
    setBatchResult(null);

    const newGeneratedQRs = new Map<string, string>();
    const results: BatchGenerateResult = {
      success: 0,
      failed: 0,
      results: [],
    };

    for (const vendorCode of vendorCodes) {
      try {
        const qrDataUrl = await QRCode.toDataURL(vendorCode.vendor_code, options);
        newGeneratedQRs.set(vendorCode.vendor_code, qrDataUrl);
        results.success++;
        results.results.push({
          vendor_code: vendorCode.vendor_code,
          qr_image: qrDataUrl,
        });
      } catch (err) {
        results.failed++;
        results.results.push({
          vendor_code: vendorCode.vendor_code,
          error: 'Failed to generate QR code',
        });
        console.error(`Error generating QR for ${vendorCode.vendor_code}:`, err);
      }
    }

    setGeneratedQRs(newGeneratedQRs);
    setBatchResult(results);
    setIsGenerating(false);

    if (results.success > 0) {
      setSuccess(`Generated ${results.success} QR codes successfully`);

      // Auto-save if enabled
      if (autoSaveToXano) {
        await saveAllToXano(vendorCode => newGeneratedQRs.get(vendorCode.vendor_code));
      }
    }

    if (results.failed > 0) {
      setError(`Failed to generate ${results.failed} QR codes`);
    }
  };

  const saveAllToXano = async (getQRImage?: (code: VendorCode) => string | undefined) => {
    if (vendorCodes.length === 0) {
      setError('No vendor codes to save');
      return;
    }

    setIsSaving(true);
    try {
      const qrCodeData = vendorCodes.map(code => ({
        qr_text: code.vendor_code,
        qr_image: getQRImage ? getQRImage(code) : generatedQRs.get(code.vendor_code),
        vendor_code: code.vendor_code,
        vendor_name: code.vendor_name,
        product_name: code.product_name,
        metadata: {
          description: code.description,
          additional_info: code.additional_info,
          generated_at: new Date().toISOString(),
          source: 'vendor_batch',
        },
      }));

      await xanoApi.batchSaveQRCodes(qrCodeData);
      setSuccess(`Successfully saved ${vendorCodes.length} QR codes to Xano`);
    } catch (err) {
      console.error('Failed to save vendor codes to Xano:', err);
      setError('Failed to save to database. Try saving individually.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAll = () => {
    generatedQRs.forEach((qrDataUrl, vendorCode) => {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr-${vendorCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const clearAll = () => {
    setVendorCodes([]);
    setGeneratedQRs(new Map());
    setBatchResult(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="vendor-code-generator-container">
      <h2>Vendor Code QR Generator</h2>
      <p className="subtitle-text">Generate QR codes for vendor-supplied codes in bulk</p>

      {/* Single Entry Form */}
      <div className="vendor-form">
        <h3>Add Single Vendor Code</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="vendor-code">Vendor Code *</label>
            <input
              id="vendor-code"
              type="text"
              value={currentVendorCode}
              onChange={(e) => setCurrentVendorCode(e.target.value)}
              placeholder="e.g., VEN-12345"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="vendor-name">Vendor Name *</label>
            <input
              id="vendor-name"
              type="text"
              value={currentVendorName}
              onChange={(e) => setCurrentVendorName(e.target.value)}
              placeholder="e.g., ACME Corp"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-name">Product Name</label>
            <input
              id="product-name"
              type="text"
              value={currentProductName}
              onChange={(e) => setCurrentProductName(e.target.value)}
              placeholder="e.g., Widget Pro"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={currentDescription}
              onChange={(e) => setCurrentDescription(e.target.value)}
              placeholder="e.g., High-quality widget"
              className="text-input"
            />
          </div>
        </div>

        <button onClick={addVendorCode} className="btn-primary">
          Add to List
        </button>
      </div>

      {/* Bulk Entry Form */}
      <div className="bulk-form">
        <h3>Bulk Import Vendor Codes</h3>
        <p className="help-text">
          Enter one vendor code per line in CSV format:
          <br />
          <code>VENDOR_CODE,VENDOR_NAME,PRODUCT_NAME,DESCRIPTION</code>
        </p>
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="VEN-001,ACME Corp,Widget A,Premium widget&#10;VEN-002,XYZ Inc,Gadget B,Standard gadget&#10;VEN-003,ABC Ltd,Tool C"
          rows={6}
          className="text-input bulk-textarea"
        />
        <button onClick={processBulkInput} className="btn-secondary">
          Import from CSV
        </button>
      </div>

      {/* Vendor Codes List */}
      {vendorCodes.length > 0 && (
        <div className="vendor-list">
          <h3>Vendor Codes ({vendorCodes.length})</h3>
          <div className="vendor-table">
            <table>
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Vendor Name</th>
                  <th>Product</th>
                  <th>QR Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorCodes.map((code, index) => (
                  <tr key={index}>
                    <td><strong>{code.vendor_code}</strong></td>
                    <td>{code.vendor_name}</td>
                    <td>{code.product_name || '-'}</td>
                    <td>
                      {generatedQRs.has(code.vendor_code) ? (
                        <img
                          src={generatedQRs.get(code.vendor_code)}
                          alt={`QR for ${code.vendor_code}`}
                          className="qr-thumbnail"
                        />
                      ) : (
                        <span className="qr-pending">Not generated</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => removeVendorCode(index)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            <button
              onClick={generateAllQRCodes}
              disabled={isGenerating}
              className="btn-primary"
            >
              {isGenerating ? 'Generating...' : `Generate All QR Codes (${vendorCodes.length})`}
            </button>

            {generatedQRs.size > 0 && (
              <>
                <button onClick={downloadAll} className="btn-secondary">
                  Download All ({generatedQRs.size})
                </button>
                {!autoSaveToXano && (
                  <button
                    onClick={() => saveAllToXano()}
                    disabled={isSaving}
                    className="btn-save"
                  >
                    {isSaving ? 'Saving...' : 'Save All to Xano'}
                  </button>
                )}
              </>
            )}

            <button onClick={clearAll} className="btn-clear">
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
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

      {/* Batch Results */}
      {batchResult && (
        <div className="batch-result">
          <h3>Generation Results</h3>
          <p>
            ✓ Success: {batchResult.success} | ✗ Failed: {batchResult.failed}
          </p>
        </div>
      )}
    </div>
  );
};
