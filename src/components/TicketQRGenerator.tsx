import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { TicketOrder } from '../types/ticket.types';
import { delikaApi } from '../services/delikaApi';
import type { GenerateOptions } from '../types/qr.types';

export const TicketQRGenerator: React.FC = () => {
  const [tickets, setTickets] = useState<TicketOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedQRs, setGeneratedQRs] = useState<Map<string, string>>(new Map());
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  // QR Code generation options
  const options: GenerateOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  useEffect(() => {
    loadTickets();
  }, [showOnlyPending]);

  const loadTickets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const allTickets = showOnlyPending
        ? await delikaApi.getUnverifiedPaidTickets()
        : await delikaApi.getPaidTickets();
      setTickets(allTickets);

      // Load existing QR codes
      const qrMap = new Map<string, string>();
      allTickets.forEach(ticket => {
        if (ticket.qrCode) {
          qrMap.set(ticket.id, ticket.qrCode);
        }
      });
      setGeneratedQRs(qrMap);
    } catch (err) {
      setError('Failed to load tickets. Please try again.');
      console.error('Error loading tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRForTicket = async (ticket: TicketOrder) => {
    try {
      // Use order number if available, otherwise use ticket ID
      const qrData = ticket.orderNumber || ticket.id;
      const vendorCode = `TKT-${ticket.orderNumber || ticket.id}`;

      const qrCodeUrl = await QRCode.toDataURL(qrData, options);

      // Update local state
      setGeneratedQRs(prev => new Map(prev).set(ticket.id, qrCodeUrl));

      // Update ticket in API
      try {
        await delikaApi.addQRCodeToTicket(ticket.id, qrCodeUrl, vendorCode);
        console.log(`QR code saved for ticket ${ticket.orderNumber}`);
      } catch (apiError) {
        console.warn('Could not save QR code to API:', apiError);
        // Continue even if API update fails - QR code is still generated locally
      }

      return { success: true, qrCodeUrl };
    } catch (err) {
      console.error(`Error generating QR for ticket ${ticket.id}:`, err);
      return { success: false, error: err };
    }
  };

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');

    let successCount = 0;
    let failCount = 0;

    for (const ticket of tickets) {
      // Skip if already has QR code
      if (ticket.qrCode || generatedQRs.has(ticket.id)) {
        successCount++;
        continue;
      }

      const result = await generateQRForTicket(ticket);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsGenerating(false);

    if (successCount > 0) {
      setSuccess(`Generated ${successCount} QR codes successfully`);
    }
    if (failCount > 0) {
      setError(`Failed to generate ${failCount} QR codes`);
    }

    // Reload tickets to get updated data
    await loadTickets();
  };

  const downloadQR = (ticket: TicketOrder) => {
    const qrCodeUrl = generatedQRs.get(ticket.id) || ticket.qrCode;
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `ticket-${ticket.orderNumber || ticket.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllQRCodes = () => {
    tickets.forEach(ticket => {
      if (generatedQRs.has(ticket.id) || ticket.qrCode) {
        downloadQR(ticket);
      }
    });
  };

  return (
    <div className="ticket-qr-generator-container">
      <h2>Ticket QR Code Generator</h2>
      <p className="subtitle-text">Generate QR codes for event tickets</p>

      <div className="filter-controls">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showOnlyPending}
            onChange={(e) => setShowOnlyPending(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-text">
            Show only unverified tickets
          </span>
        </label>

        <button onClick={loadTickets} disabled={isLoading} className="btn-secondary">
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
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

      {isLoading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="no-tickets">
          <p>No {showOnlyPending ? 'unverified ' : ''}paid tickets found</p>
        </div>
      ) : (
        <>
          <div className="tickets-summary">
            <p>
              <strong>{tickets.length}</strong> ticket{tickets.length !== 1 ? 's' : ''} found
              {' | '}
              <strong>{generatedQRs.size}</strong> with QR codes
            </p>
          </div>

          <div className="action-buttons">
            <button
              onClick={generateAllQRCodes}
              disabled={isGenerating}
              className="btn-primary"
            >
              {isGenerating ? 'Generating...' : 'Generate All QR Codes'}
            </button>

            {generatedQRs.size > 0 && (
              <button onClick={downloadAllQRCodes} className="btn-secondary">
                Download All ({generatedQRs.size})
              </button>
            )}
          </div>

          <div className="tickets-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>QR Code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const hasQR = generatedQRs.has(ticket.id) || Boolean(ticket.qrCode);
                  const qrUrl = generatedQRs.get(ticket.id) || ticket.qrCode;

                  return (
                    <tr key={ticket.id} className={ticket.verified ? 'verified' : ''}>
                      <td>
                        <strong>{ticket.orderNumber || 'N/A'}</strong>
                      </td>
                      <td>
                        <div>
                          {ticket.customer.fullName || 'Unknown'}
                          <br />
                          <small>{ticket.customerPhoneNumber}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          {ticket.events.event_name}
                          <br />
                          <small>{new Date(ticket.events.event_date).toLocaleDateString()}</small>
                        </div>
                      </td>
                      <td>
                        {ticket.inventory.map((item, idx) => (
                          <div key={idx} className="ticket-item">
                            {item.itemName} x{item.itemQuantity}
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className={`status-badge ${ticket.verified ? 'verified' : 'pending'}`}>
                          {ticket.verified ? '✓ Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {hasQR && qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={`QR for ${ticket.orderNumber}`}
                            className="qr-thumbnail"
                          />
                        ) : (
                          <span className="qr-pending">Not generated</span>
                        )}
                      </td>
                      <td>
                        <div className="action-cell">
                          {!hasQR && (
                            <button
                              onClick={() => generateQRForTicket(ticket)}
                              className="btn-small btn-primary"
                            >
                              Generate
                            </button>
                          )}
                          {hasQR && (
                            <button
                              onClick={() => downloadQR(ticket)}
                              className="btn-small btn-secondary"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
