import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import type { TicketOrder } from '../types/ticket.types';
import { delikaApi } from '../services/delikaApi';

export const TicketVerificationScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [ticket, setTicket] = useState<TicketOrder | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
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
    const scannerId = 'ticket-qr-reader';

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
        await handleScanSuccess(decodedText);
      },
      () => {
        // Ignore scan errors (when no QR code detected)
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
    setSuccess('');
    setTicket(null);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    stopScanner();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('ticket-qr-reader');
      qrCodeRef.current = html5QrCode;

      const decodedText = await html5QrCode.scanFile(file, false);
      await handleScanSuccess(decodedText);
    } catch (err) {
      setError('Error scanning file. Please try another image.');
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    setError('');
    setSuccess('');

    // Try to find the ticket by order number or ID
    try {
      let foundTicket = await delikaApi.getTicketByOrderNumber(decodedText);

      // If not found by order number, try by ID
      if (!foundTicket) {
        foundTicket = await delikaApi.getTicketById(decodedText);
      }

      // If still not found, try by vendor code
      if (!foundTicket) {
        foundTicket = await delikaApi.getTicketByVendorCode(decodedText);
      }

      if (foundTicket) {
        setTicket(foundTicket);

        if (foundTicket.verified) {
          setError('⚠️ This ticket has already been verified!');
        } else if (foundTicket.paymentStatus !== 'Paid') {
          setError('⚠️ This ticket has not been paid for!');
        } else {
          setSuccess('✓ Ticket found and valid!');
        }
      } else {
        setError('✗ Ticket not found in the system');
        setTicket(null);
      }
    } catch (err) {
      setError('Error looking up ticket. Please try again.');
      console.error('Ticket lookup error:', err);
    }
  };

  const verifyTicket = async () => {
    if (!ticket) return;

    if (ticket.verified) {
      setError('This ticket has already been verified');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      await delikaApi.verifyTicket(ticket.id);
      setSuccess('✓ Ticket verified successfully!');

      // Update local ticket state
      setTicket({ ...ticket, verified: true });

      // Clear after a delay
      setTimeout(() => {
        setTicket(null);
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to verify ticket. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const clearResult = () => {
    setTicket(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="ticket-verification-container">
      <h2>Ticket Verification Scanner</h2>
      <p className="subtitle-text">Scan QR codes to verify event tickets</p>

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

      <div id="ticket-qr-reader" className="qr-reader"></div>

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

      {ticket && (
        <div className="ticket-details-card">
          <h3>Ticket Details</h3>

          <div className="ticket-info-grid">
            <div className="info-item">
              <strong>Order Number:</strong>
              <span>{ticket.orderNumber || 'N/A'}</span>
            </div>

            <div className="info-item">
              <strong>Payment Status:</strong>
              <span className={`status-badge ${ticket.paymentStatus.toLowerCase()}`}>
                {ticket.paymentStatus}
              </span>
            </div>

            <div className="info-item">
              <strong>Verification Status:</strong>
              <span className={`status-badge ${ticket.verified ? 'verified' : 'pending'}`}>
                {ticket.verified ? '✓ Verified' : 'Not Verified'}
              </span>
            </div>
          </div>

          <div className="customer-info">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> {ticket.customer.fullName || 'Unknown'}</p>
            <p><strong>Phone:</strong> {ticket.customerPhoneNumber}</p>
            {ticket.customerEmail && <p><strong>Email:</strong> {ticket.customerEmail}</p>}
          </div>

          <div className="event-info">
            <h4>Event Information</h4>
            <p><strong>Event:</strong> {ticket.events.event_name}</p>
            <p><strong>Date:</strong> {new Date(ticket.events.event_date).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {ticket.events.event_location || 'TBD'}</p>
            {ticket.events.vendor_name && <p><strong>Vendor:</strong> {ticket.events.vendor_name}</p>}
          </div>

          <div className="ticket-items">
            <h4>Ticket Items</h4>
            {ticket.inventory.map((item, idx) => (
              <div key={idx} className="ticket-item-detail">
                <span>{item.itemName}</span>
                <span>Qty: {item.itemQuantity}</span>
                <span>Price: GH₵{item.itemPrice}</span>
              </div>
            ))}
          </div>

          <div className="verification-actions">
            {!ticket.verified && ticket.paymentStatus === 'Paid' && (
              <button
                onClick={verifyTicket}
                disabled={isVerifying}
                className="btn-verify"
              >
                {isVerifying ? 'Verifying...' : '✓ Verify Ticket'}
              </button>
            )}
            <button onClick={clearResult} className="btn-secondary">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
