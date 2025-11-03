import { useState } from 'react';
import type { QRCodeData } from '../types/qr.types';
import { xanoApi } from '../services/xanoApi';

export const VendorCodeLookup: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'code' | 'vendor'>('code');
  const [searchResults, setSearchResults] = useState<QRCodeData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<QRCodeData | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedItem(null);

    try {
      let results: QRCodeData[] = [];

      if (searchType === 'code') {
        results = await xanoApi.searchByVendorCode(searchQuery.trim());
      } else {
        results = await xanoApi.getByVendorName(searchQuery.trim());
      }

      setSearchResults(results);

      if (results.length === 0) {
        setError(`No results found for "${searchQuery}"`);
      }
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const downloadQR = (item: QRCodeData) => {
    if (!item.qr_image) return;

    const link = document.createElement('a');
    link.href = item.qr_image;
    link.download = `qr-${item.vendor_code || item.qr_text}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="vendor-lookup-container">
      <h2>Vendor Code Lookup</h2>
      <p className="subtitle-text">Search for existing QR codes by vendor code or vendor name</p>

      {/* Search Form */}
      <div className="search-form">
        <div className="search-type-selector">
          <label>
            <input
              type="radio"
              value="code"
              checked={searchType === 'code'}
              onChange={(e) => setSearchType(e.target.value as 'code' | 'vendor')}
            />
            <span>Search by Vendor Code</span>
          </label>
          <label>
            <input
              type="radio"
              value="vendor"
              checked={searchType === 'vendor'}
              onChange={(e) => setSearchType(e.target.value as 'code' | 'vendor')}
            />
            <span>Search by Vendor Name</span>
          </label>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              searchType === 'code'
                ? 'Enter vendor code (e.g., VEN-12345)'
                : 'Enter vendor name (e.g., ACME Corp)'
            }
            className="text-input search-input"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="btn-primary"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </h3>

          <div className="results-grid">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="result-card"
                onClick={() => setSelectedItem(item)}
              >
                <div className="result-header">
                  <h4>{item.vendor_code || item.qr_text}</h4>
                  {item.vendor_name && (
                    <p className="vendor-name">{item.vendor_name}</p>
                  )}
                </div>

                {item.qr_image && (
                  <div className="qr-preview">
                    <img src={item.qr_image} alt={`QR for ${item.vendor_code}`} />
                  </div>
                )}

                <div className="result-details">
                  {item.product_name && (
                    <p>
                      <strong>Product:</strong> {item.product_name}
                    </p>
                  )}
                  {item.created_at && (
                    <p className="created-date">
                      Created: {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="result-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadQR(item);
                    }}
                    className="btn-secondary btn-small"
                    disabled={!item.qr_image}
                  >
                    Download
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    className="btn-primary btn-small"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Item Modal/Details */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>QR Code Details</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedItem.qr_image && (
                <div className="qr-display-large">
                  <img src={selectedItem.qr_image} alt="QR Code" />
                </div>
              )}

              <div className="details-list">
                <div className="detail-item">
                  <strong>Vendor Code:</strong>
                  <span>{selectedItem.vendor_code || '-'}</span>
                </div>
                <div className="detail-item">
                  <strong>Vendor Name:</strong>
                  <span>{selectedItem.vendor_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <strong>Product Name:</strong>
                  <span>{selectedItem.product_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <strong>QR Text:</strong>
                  <span className="code-text">{selectedItem.qr_text}</span>
                </div>
                {selectedItem.created_at && (
                  <div className="detail-item">
                    <strong>Created:</strong>
                    <span>
                      {new Date(selectedItem.created_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedItem.metadata && (
                  <div className="detail-item metadata">
                    <strong>Additional Info:</strong>
                    <pre>{JSON.stringify(selectedItem.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => downloadQR(selectedItem)}
                  className="btn-primary"
                  disabled={!selectedItem.qr_image}
                >
                  Download QR Code
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
