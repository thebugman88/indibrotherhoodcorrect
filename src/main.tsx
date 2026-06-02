import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global Rejection Handlers to prevent zombie processes
window.addEventListener('unhandledrejection', (event) => {
  // Gracefully handle specific dev-only rejections (e.g. Vite HMR/WebSockets)
  if (event.reason?.message?.includes('WebSocket closed')) {
    event.preventDefault();
    return;
  }
  console.error('Sentinel Capture (Unhandled Rejection):', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('Sentinel Capture (Global Error):', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
