import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for mobile & desktop PWA installability and offline shell
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Ignore service worker registration errors in restricted preview sandboxes
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
