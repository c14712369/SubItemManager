import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 禁止 iOS Safari pinch-to-zoom
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// 監聽畫面上是否有開啟的 Modal，若有則鎖定 body 捲動以防止手機版背景滑動
const observer = new MutationObserver(() => {
  const hasOpenModal = document.querySelector('.modal-overlay.active');
  if (hasOpenModal) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
