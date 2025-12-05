import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import type { TicketOrder } from '../types/ticket.types';
import { delikaApi } from '../services/delikaApi';

// Helper function to clear cache (but preserve authentication data)
const clearAllCache = () => {
  try {
    // Preserve authentication data
    const authToken = localStorage.getItem('authToken');
    const delikaOnboardingId = localStorage.getItem('delikaOnboardingId');
    const userRole = localStorage.getItem('userRole');
    const userData = localStorage.getItem('userData');

    // Clear all localStorage
    localStorage.clear();

    // Restore authentication data
    if (authToken) localStorage.setItem('authToken', authToken);
    if (delikaOnboardingId) localStorage.setItem('delikaOnboardingId', delikaOnboardingId);
    if (userRole) localStorage.setItem('userRole', userRole);
    if (userData) localStorage.setItem('userData', userData);

    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB if needed (optional)
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
};

export const TicketVerificationScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [ticket, setTicket] = useState<TicketOrder | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');
  const scannerId = 'ticket-qr-reader';

  // Don't clear cache on mount - it was clearing auth token and logging users out
  // Cache is only cleared when explicitly needed (scanning, verifying, clearing)

  // Auto-start camera on initial load if camera mode is selected
  useEffect(() => {
    if (scanMode === 'camera' && !isScanning) {
      setIsScanning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isScanning && scanMode === 'camera') {
      startCameraScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning, scanMode]);

  const startCameraScanner = async () => {
    try {
      // Stop any existing scanner first
      await stopScanner();

      const html5QrCode = new Html5Qrcode(scannerId);
      qrCodeRef.current = html5QrCode;

      // Try to get cameras first (for desktop)
      let cameraId: string | null = null;
      let useFacingMode = false;

      try {
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0) {
          // Try to find back camera (environment facing)
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );

          if (backCamera) {
            cameraId = backCamera.id;
          } else if (devices.length > 0) {
            // If no back camera found, use the last camera (usually back camera on mobile)
            cameraId = devices[devices.length - 1].id;
          }
        }
      } catch (cameraEnumError) {
        // Camera enumeration failed (common on mobile) - use facingMode instead
        useFacingMode = true;
      }

      // Start scanning with back camera
      if (cameraId && !useFacingMode) {
        // Use specific camera ID (desktop)
        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            // Don't stop scanning - keep it running
            await handleScanSuccess(decodedText);
          },
          (_errorMessage) => {
            // Ignore scan errors (when no QR code detected)
            // This is normal and happens continuously when no QR code is in view
          }
        );
      } else {
        // Use facingMode for mobile devices (more reliable)
        await html5QrCode.start(
          { facingMode: 'environment' }, // Back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            // Don't stop scanning - keep it running
            await handleScanSuccess(decodedText);
          },
          (_errorMessage) => {
            // Ignore scan errors (when no QR code detected)
            // This is normal and happens continuously when no QR code is in view
          }
        );
      }

      // Get video track for torch control (wait a bit for video element to be ready)
      setTimeout(() => {
        const videoElement = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrackRef.current = videoTrack;
          }
        }
      }, 500);
    } catch (err: any) {
      console.error('Error starting camera scanner:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to start camera. ';
      if (err.name === 'NotAllowedError' || err.message?.includes('permission') || err.message?.includes('Permission denied')) {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
        errorMessage += 'No camera found on your device.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('could not start')) {
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera and try again.';
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please check permissions and try again.';
      }
      
      setError(errorMessage);
      setIsScanning(false);
      qrCodeRef.current = null;
    }
  };

  const stopScanner = async () => {
    // Turn off torch if on
    if (torchOn && videoTrackRef.current) {
      try {
        await videoTrackRef.current.applyConstraints({ 
          advanced: [{ torch: false } as MediaTrackConstraints] 
        });
        setTorchOn(false);
      } catch (err) {
      }
    }
    videoTrackRef.current = null;

    if (qrCodeRef.current) {
      try {
        await qrCodeRef.current.stop();
        await qrCodeRef.current.clear();
      } catch (error) {
        // Ignore errors when stopping (might already be stopped)
      }
      qrCodeRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!videoTrackRef.current) {
      // Try to get video track if not already stored
      const videoElement = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrackRef.current = videoTrack;
        } else {
          return;
        }
      } else {
        return;
      }
    }

    try {
      const newTorchState = !torchOn;
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraints],
      });
      setTorchOn(newTorchState);
    } catch (err) {
      // Torch might not be supported on this device
    }
  };

  const handleStopScanning = async () => {
    setIsScanning(false);
    await stopScanner();
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
    // Stop scanning immediately when QR code is detected
    if (isScanning) {
      await stopScanner();
      setIsScanning(false);
    }

    setError('');
    setSuccess('');

    // Clear cache before looking up ticket
    clearAllCache();

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

    // Clear cache when verifying ticket
    clearAllCache();

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      // Get the full response from verifyTicket which includes all fields
      const verifiedTicket = await delikaApi.verifyTicket(ticket.id);
      setSuccess('✓ Ticket verified successfully!');

      // Update local ticket state with full response data including:
      // itemName, itemPrice, itemQuantity, orderNumber, and verified status
      setTicket({
        ...ticket,
        ...verifiedTicket,
        verified: true,
        // Ensure these fields are included from the response
        orderNumber: verifiedTicket.orderNumber || ticket.orderNumber,
        itemName: verifiedTicket.itemName || ticket.itemName,
        itemPrice: verifiedTicket.itemPrice || ticket.itemPrice,
        itemQuantity: verifiedTicket.itemQuantity || ticket.itemQuantity,
      });

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
    // Clear cache when clearing result
    clearAllCache();
    setTicket(null);
    setError('');
    setSuccess('');
    
    // Restart scanning if in camera mode
    if (scanMode === 'camera' && !isScanning) {
      setIsScanning(true);
    }
  };

  return (
    <div className="ticket-verification-container">
      <h2>Ticket Verification Scanner</h2>
      <p className="subtitle-text">Scan QR codes to verify event tickets</p>

      <div className="scanner-controls">
        <div className="mode-selector">
          <button
            className={scanMode === 'camera' ? 'active' : ''}
            onClick={async () => {
              if (scanMode !== 'camera') {
                if (isScanning) {
                  await handleStopScanning();
                }
                setScanMode('camera');
                // Auto-start camera when switching to camera mode
                setIsScanning(true);
              }
            }}
          >
            Camera
          </button>
          <button
            className={scanMode === 'file' ? 'active' : ''}
            onClick={async () => {
              if (scanMode !== 'file') {
                if (isScanning) {
                  await handleStopScanning();
                }
                setScanMode('file');
              }
            }}
          >
            Upload File
          </button>
        </div>

        {scanMode === 'camera' && isScanning && !ticket && (
          <div className="camera-controls">
            <button
              onClick={toggleTorch}
              className="btn-torch"
              title={torchOn ? 'Turn off torch' : 'Turn on torch'}
            >
              {torchOn ? '🔦 Torch On' : '💡 Torch Off'}
            </button>
            <button onClick={handleStopScanning} className="btn-secondary">
              Stop Scanner
            </button>
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

      {!ticket && (
        <div id="ticket-qr-reader" className="qr-reader"></div>
      )}

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
            <div className="ticket-item-detail">
              <span><strong>Item Name:</strong> {ticket.itemName || 'N/A'}</span>
              <span><strong>Quantity:</strong> {ticket.itemQuantity || 'N/A'}</span>
              <span><strong>Price:</strong> GH₵{ticket.itemPrice || 'N/A'}</span>
            </div>
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
