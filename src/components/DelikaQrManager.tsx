import { useEffect, useMemo, useState } from 'react';
import { delikaApi } from '../services/delikaApi';
import type { DelikaQR } from '../types/qr.types';

export const DelikaQrManager: React.FC = () => {
  const [items, setItems] = useState<DelikaQR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { url: string; name: string }>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const publicVerifyBase = (import.meta.env.VITE_QR_PUBLIC_VERIFY_BASE_URL as string | undefined) || '';
  const redirectBase = (import.meta.env.VITE_QR_REDIRECT_BASE_URL as string | undefined) || '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await delikaApi.getDelikaQRs();
      setItems(data);
    } catch (err) {
      setError('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      i.code.toLowerCase().includes(q) ||
      (i.name || '').toLowerCase().includes(q) ||
      i.url.toLowerCase().includes(q)
    );
  }, [filter, items]);

  const startEdit = (code: string) => {
    const current = items.find((i) => i.code === code);
    if (!current) return;
    setDrafts((d) => ({ ...d, [code]: { url: current.url, name: current.name || '' } }));
  };

  const cancelEdit = (code: string) => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[code];
      return next;
    });
  };

  const onDraftChange = (code: string, field: 'url' | 'name', value: string) => {
    setDrafts((d) => ({ ...d, [code]: { ...(d[code] || { url: '', name: '' }), [field]: value } }));
  };

  const save = async (code: string) => {
    const draft = drafts[code];
    if (!draft) return;
    setSavingCode(code);
    setError('');
    try {
      const updated = await delikaApi.updateDelikaQRDetails(code, { url: draft.url, name: draft.name });
      setItems((arr) => arr.map((i) => (i.code === code ? updated : i)));
      cancelEdit(code);
    } catch (err) {
      setError('Failed to save changes');
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="vendor-lookup-container">
      <h2>Manage Generated QRs</h2>

      <div className="search-form">
        <div className="search-input-group">
          <input
            className="text-input search-input"
            placeholder="Search by code, name, or URL"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="vendor-list">
        <h3>QRs</h3>
        <div className="vendor-table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Destination URL</th>
                <th>Encoded URL</th>
                <th>QR Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isEditing = !!drafts[item.code];
                const draft = drafts[item.code] || { url: item.url, name: item.name || '' };
                const encoded = item.encoded_url || (publicVerifyBase
                  ? `${publicVerifyBase}?qr=${item.code}`
                  : (redirectBase ? `${redirectBase}/${item.code}` : item.url));
                return (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className="text-input"
                          value={draft.name}
                          onChange={(e) => onDraftChange(item.code, 'name', e.target.value)}
                        />
                      ) : (
                        item.name || ''
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="text-input"
                          value={draft.url}
                          onChange={(e) => onDraftChange(item.code, 'url', e.target.value)}
                        />
                      ) : (
                        item.url
                      )}
                    </td>
                    <td>
                      <a href={encoded} target="_blank" rel="noreferrer">
                        {encoded}
                      </a>
                    </td>
                    <td>
                      {item.qrcodeUrl ? (
                        <img
                          src={item.qrcodeUrl}
                          alt={item.code}
                          className="qr-thumbnail"
                          onClick={() => setPreviewUrl(item.qrcodeUrl || null)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <span className="qr-pending">No image</span>
                      )}
                    </td>
                    <td>
                      {!isEditing ? (
                        <button className="btn-primary btn-small" onClick={() => startEdit(item.code)}>Edit</button>
                      ) : (
                        <>
                          <button
                            className="btn-save btn-small"
                            onClick={() => save(item.code)}
                            disabled={savingCode === item.code}
                          >
                            {savingCode === item.code ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-secondary btn-small" onClick={() => cancelEdit(item.code)}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {previewUrl && (
          <div className="modal-overlay" onClick={() => setPreviewUrl(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>QR Preview</h3>
                <button className="btn-close" onClick={() => setPreviewUrl(null)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="qr-display-large">
                  {previewUrl && <img src={previewUrl} alt="QR" style={{ maxWidth: '100%' }} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DelikaQrManager;
