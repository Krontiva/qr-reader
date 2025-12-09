import { useEffect, useMemo, useState } from 'react';

export const QrRedirector: React.FC = () => {
  const [code, setCode] = useState<string | null>(null);
  const redirectBase = (import.meta.env.VITE_QR_REDIRECT_BASE_URL as string | undefined) || '';

  const targetUrl = useMemo(() => {
    if (!code || !redirectBase) return '';
    return `${redirectBase}/${encodeURIComponent(code)}`;
  }, [code, redirectBase]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const qrParam = url.searchParams.get('qr') || url.searchParams.get('code');
    if (qrParam) {
      setCode(qrParam);
      return;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === 'qr');
    if (idx >= 0 && parts[idx + 1]) {
      setCode(parts[idx + 1]);
    }
  }, []);

  useEffect(() => {
    if (!code || !redirectBase) return;
    const target = `${redirectBase}/${encodeURIComponent(code)}`;
    window.location.replace(target);
  }, [code, redirectBase]);

  return (
    <div className="redirect-container">
      <div className="redirect-card">
        <div className="redirect-header">
          <img src="/image/delikahorizontal.png" alt="Delika" className="brand-logo" />
        </div>
        <div className="redirect-body">
          <div className="loading-spinner" />
          <h2>Redirecting</h2>
          {!redirectBase && (
            <div className="error-message"><p>Redirect base is not configured.</p></div>
          )}
          {!code && (
            <div className="error-message"><p>No code provided.</p></div>
          )}
          <div className="skeleton-lines">
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrRedirector;
