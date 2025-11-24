import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { VendorCode, GenerateOptions, BatchGenerateResult } from '../types/qr.types';
import { delikaApi } from '../services/delikaApi';
import type { DelikaEvent } from '../types/ticket.types';

interface VendorCodeGeneratorProps {
  autoSaveToXano?: boolean;
}

export const VendorCodeGenerator: React.FC<VendorCodeGeneratorProps> = ({
  autoSaveToXano = false,
}) => {
  const [vendorCodes, setVendorCodes] = useState<VendorCode[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DelikaEvent | null>(null);
  const [events, setEvents] = useState<DelikaEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [currentVendorCode, setCurrentVendorCode] = useState('');
  const [currentProductName, setCurrentProductName] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [autoGenerateCount, setAutoGenerateCount] = useState(10);
  const [autoGenerateProduct, setAutoGenerateProduct] = useState('');
  const [bulkExpectedCount, setBulkExpectedCount] = useState(10);
  const [bulkProductName, setBulkProductName] = useState('');
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

  // Fetch events on component mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const ticketEvents = await delikaApi.getEventsByType('ticket');
      setEvents(ticketEvents);
    } catch (err) {
      setError('Failed to load events. Please try again.');
      console.error('Error loading events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Helper function to convert base64 data URL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const addVendorCode = () => {
    if (!selectedEvent) {
      setError('Please select a vendor/event first');
      return;
    }

    if (!currentVendorCode.trim()) {
      setError('Vendor code is required');
      return;
    }

    const newCode: VendorCode = {
      vendor_code: currentVendorCode.trim(),
      vendor_name: selectedEvent.vendor_name,
      product_name: currentProductName || undefined,
      description: currentDescription.trim() || undefined,
    };

    setVendorCodes([...vendorCodes, newCode]);
    setCurrentVendorCode('');
    setCurrentProductName('');
    setCurrentDescription('');
    setError('');
  };

  const removeVendorCode = (index: number) => {
    const updated = vendorCodes.filter((_, i) => i !== index);
    setVendorCodes(updated);
  };

  const processBulkInput = () => {
    if (!selectedEvent) {
      setError('Please select a vendor/event first');
      return;
    }

    if (!bulkInput.trim()) {
      setError('Please enter vendor codes in the bulk input area');
      return;
    }

    const lines = bulkInput.split('\n').map(line => line.trim()).filter(Boolean);
    const newCodes: VendorCode[] = [];

    for (const line of lines) {
      // Expected format: VENDOR_CODE (just the code, vendor comes from selected event)
      const vendorCode = line.trim();
      if (vendorCode) {
        newCodes.push({
          vendor_code: vendorCode,
          vendor_name: selectedEvent.vendor_name,
          product_name: bulkProductName || undefined,
        });
      }
    }

    if (newCodes.length > 0) {
      if (bulkExpectedCount > 0 && newCodes.length !== bulkExpectedCount) {
        console.warn(`Expected ${bulkExpectedCount} codes but detected ${newCodes.length}. Proceeding with detected count.`);
      }
      setVendorCodes([...vendorCodes, ...newCodes]);
      setBulkInput('');
      setSuccess(`Added ${newCodes.length} vendor codes from import`);
      setError('');
    } else {
      setError('No valid vendor codes found in bulk input');
    }
  };

  const getEventInitials = (eventName?: string) => {
    if (!eventName) return 'EVT';
    return eventName
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word[0]?.toUpperCase())
      .join('')
      .slice(0, 4) || 'EVT';
  };

  const generateRandomCode = (initials: string) => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    return `${initials}-${randomDigits}`;
  };

  const handleAutoGenerateCodes = () => {
    if (!selectedEvent) {
      setError('Please select a vendor/event first');
      return;
    }

    if (autoGenerateCount <= 0) {
      setError('Please enter a valid number of codes to generate');
      return;
    }

    const initials = getEventInitials(selectedEvent.event_name);
    const existingCodes = new Set(vendorCodes.map(code => code.vendor_code));
    const newCodes: VendorCode[] = [];
    let attempts = 0;
    const maxAttempts = autoGenerateCount * 10;

    while (newCodes.length < autoGenerateCount && attempts < maxAttempts) {
      const code = generateRandomCode(initials);
      attempts++;
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        newCodes.push({
          vendor_code: code,
          vendor_name: selectedEvent.vendor_name,
          product_name: autoGenerateProduct || undefined,
        });
      }
    }

    if (newCodes.length === 0) {
      setError('Failed to generate new unique vendor codes. Please try again.');
      return;
    }

    setVendorCodes([...vendorCodes, ...newCodes]);
    setSuccess(`Auto-generated ${newCodes.length} vendor code${newCodes.length > 1 ? 's' : ''}`);
    setError('');
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
      if (autoSaveToXano && selectedEvent) {
        await saveAllToDelika(vendorCode => newGeneratedQRs.get(vendorCode.vendor_code));
      }
    }

    if (results.failed > 0) {
      setError(`Failed to generate ${results.failed} QR codes`);
    }
  };

  const saveAllToDelika = async (getQRImage?: (code: VendorCode) => string | undefined) => {
    if (vendorCodes.length === 0) {
      setError('No vendor codes to save');
      return;
    }

    if (!selectedEvent) {
      setError('Please select a vendor/event first');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    let successCount = 0;
    let failCount = 0;

    for (const code of vendorCodes) {
      try {
        const qrImageDataUrl = getQRImage ? getQRImage(code) : generatedQRs.get(code.vendor_code);
        
        if (!qrImageDataUrl) {
          failCount++;
          continue;
        }

        // Convert base64 data URL to File
        const qrFile = dataURLtoFile(qrImageDataUrl, `qr-${code.vendor_code}.png`);

        // Post to Delika API with productName
        await delikaApi.addTicketCode(code.vendor_code, qrFile, selectedEvent.id, code.product_name);
        successCount++;
      } catch (err) {
        console.error(`Failed to save vendor code ${code.vendor_code}:`, err);
        failCount++;
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      setSuccess(`Successfully saved ${successCount} vendor code(s) to Delika`);
    }
    if (failCount > 0) {
      setError(`Failed to save ${failCount} vendor code(s). Please try again.`);
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

  const detectedBulkCount = bulkInput
    ? bulkInput.split('\n').map(line => line.trim()).filter(Boolean).length
    : 0;

  const autoGeneratePreview = selectedEvent
    ? `${getEventInitials(selectedEvent.event_name)}-123456`
    : 'Select an event to preview format';

  return (
    <div className="vendor-code-generator-container">
      <h2>Vendor Code QR Generator</h2>
      <p className="subtitle-text">Generate QR codes for vendor-supplied codes in bulk</p>

      {/* Vendor/Event Selection */}
      <div className="vendor-form">
        <h3>Select Vendor</h3>
        <div className="form-group">
          <label htmlFor="vendor-select">Vendor/Event *</label>
          {isLoadingEvents ? (
            <p>Loading events...</p>
          ) : (
            <select
              id="vendor-select"
              value={selectedEvent?.id || ''}
              onChange={(e) => {
                const event = events.find(ev => ev.id === e.target.value);
                setSelectedEvent(event || null);
                // Clear vendor codes and form fields when changing selection
                if (event?.id !== selectedEvent?.id) {
                  setVendorCodes([]);
                  setGeneratedQRs(new Map());
                  setCurrentVendorCode('');
                  setCurrentProductName('');
                  setCurrentDescription('');
                  setAutoGenerateProduct('');
                  setBulkProductName('');
                }
              }}
              className="text-input"
            >
              <option value="">-- Select a vendor/event --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.event_name} - {event.vendor_name}
                </option>
              ))}
            </select>
          )}
          {selectedEvent && (
            <p className="help-text">
              Selected: <strong>{selectedEvent.event_name}</strong> by <strong>{selectedEvent.vendor_name}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Auto-generate section */}
      <div className="vendor-form">
        <h3>Auto Generate Vendor Codes</h3>
        <p className="help-text">
          Create random 6-digit vendor codes automatically using the initials of the selected event.
          Example format: <code>{autoGeneratePreview}</code>
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="auto-count">How many codes?</label>
            <input
              id="auto-count"
              type="number"
              min={1}
              max={500}
              value={autoGenerateCount}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) {
                  setAutoGenerateCount(1);
                } else {
                  setAutoGenerateCount(Math.min(500, Math.max(1, value)));
                }
              }}
              className="text-input"
              disabled={!selectedEvent}
            />
            <p className="help-text">Generate between 1 and 500 codes in one click.</p>
          </div>

          <div className="form-group">
            <label>Preview</label>
            <input
              type="text"
              value={autoGeneratePreview}
              readOnly
              className="text-input"
            />
            <p className="help-text">Format: [Event Initials]-[Random 6 digits]</p>
          </div>

          <div className="form-group">
            <label htmlFor="auto-product">Which product should these codes represent?</label>
            {selectedEvent && selectedEvent.inventory && selectedEvent.inventory.length > 0 ? (
              <select
                id="auto-product"
                value={autoGenerateProduct}
                onChange={(e) => setAutoGenerateProduct(e.target.value)}
                className="text-input"
              >
                <option value="">-- No specific product --</option>
                {selectedEvent.inventory.map((item, index) => (
                  <option key={index} value={item.itemName}>
                    {item.itemName} {item.description ? `- ${item.description}` : ''} (GH₵{item.itemPrice})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="auto-product"
                type="text"
                value="No inventory items available"
                readOnly
                className="text-input"
              />
            )}
            <p className="help-text">
              Every auto-generated code will automatically reference this product.
            </p>
          </div>
        </div>
        <button
          onClick={handleAutoGenerateCodes}
          className="btn-secondary"
          disabled={!selectedEvent}
        >
          Auto Generate Vendor Codes
        </button>
      </div>

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
              disabled={!selectedEvent}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-name">Product Name</label>
            {selectedEvent && selectedEvent.inventory && selectedEvent.inventory.length > 0 ? (
              <select
                id="product-name"
                value={currentProductName}
                onChange={(e) => setCurrentProductName(e.target.value)}
                className="text-input"
              >
                <option value="">-- Select a product --</option>
                {selectedEvent.inventory.map((item, index) => (
                  <option key={index} value={item.itemName}>
                    {item.itemName} {item.description ? `- ${item.description}` : ''} (GH₵{item.itemPrice})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="product-name"
                type="text"
                value={currentProductName}
                onChange={(e) => setCurrentProductName(e.target.value)}
                placeholder="No inventory items available"
                className="text-input"
                disabled
              />
            )}
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

        <button 
          onClick={addVendorCode} 
          className="btn-primary"
          disabled={!selectedEvent}
        >
          Add to List
        </button>
      </div>

      {/* Bulk Entry Form */}
      <div className="bulk-form">
        <h3>Bulk Import Vendor Codes</h3>
        <p className="help-text">
          Enter one vendor code per line. The selected vendor/event will be used for all codes:
          <br />
          <code>VENDOR_CODE (one per line)</code>
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="bulk-expected">How many codes are you importing?</label>
            <input
              id="bulk-expected"
              type="number"
              min={1}
              max={1000}
              value={bulkExpectedCount}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) {
                  setBulkExpectedCount(1);
                } else {
                  setBulkExpectedCount(Math.min(1000, Math.max(1, value)));
                }
              }}
              className="text-input"
              disabled={!selectedEvent}
            />
            <p className="help-text">
              Helps double-check that you imported the expected number of codes.
            </p>
          </div>
          <div className="form-group">
            <label>Detected Codes</label>
            <input
              type="text"
              value={detectedBulkCount}
              readOnly
              className="text-input"
            />
            <p className="help-text">
              We count codes automatically as you paste them.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="bulk-product">Which product should imported codes use?</label>
            {selectedEvent && selectedEvent.inventory && selectedEvent.inventory.length > 0 ? (
              <select
                id="bulk-product"
                value={bulkProductName}
                onChange={(e) => setBulkProductName(e.target.value)}
                className="text-input"
              >
                <option value="">-- No specific product --</option>
                {selectedEvent.inventory.map((item, index) => (
                  <option key={index} value={item.itemName}>
                    {item.itemName} {item.description ? `- ${item.description}` : ''} (GH₵{item.itemPrice})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="bulk-product"
                type="text"
                value="No inventory items available"
                readOnly
                className="text-input"
              />
            )}
            <p className="help-text">
              Applied to every code imported in this batch.
            </p>
          </div>
        </div>
        <textarea
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="VEN-001&#10;VEN-002&#10;VEN-003"
          rows={6}
          className="text-input bulk-textarea"
          disabled={!selectedEvent}
        />
        <button 
          onClick={processBulkInput} 
          className="btn-secondary"
          disabled={!selectedEvent}
        >
          Import Codes
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
              {isGenerating ? 'Generating...' : `Generate  QR Codes (${vendorCodes.length})`}
            </button>

            {generatedQRs.size > 0 && (
              <>
                <button onClick={downloadAll} className="btn-secondary">
                  Download All ({generatedQRs.size})
                </button>
                {!autoSaveToXano && (
                  <button
                    onClick={() => saveAllToDelika()}
                    disabled={isSaving || !selectedEvent}
                    className="btn-save"
                  >
                    {isSaving ? 'Saving...' : 'Save All to Delika'}
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
        <p className="saving-indicator">Saving to Delika...</p>
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
