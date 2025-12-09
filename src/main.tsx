import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QrRedirector } from './components/QrRedirector'

const shouldRedirect = (() => {
  const url = new URL(window.location.href);
  if (url.pathname.toLowerCase().startsWith('/qr')) return true;
  if (url.searchParams.has('qr')) return true;
  if (url.searchParams.has('code')) return true;
  return false;
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shouldRedirect ? <QrRedirector /> : <App />}
  </StrictMode>,
)
