import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 禁止 iOS Safari pinch-to-zoom
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
