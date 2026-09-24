import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/pages.css';
import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';
import './styles/camera.css';
import './styles/scanner.css';
import './styles/recording.css';

// === ONE-TIME IDB CLEANUP (deploy 2026-09-24) ===
// Xóa IndexedDB cũ chứa video lỗi/stale sessions trên tất cả devices
const CLEAR_KEY = 'force_clear_idb_20260924';
if (!localStorage.getItem(CLEAR_KEY)) {
  try {
    indexedDB.deleteDatabase('quay_video_db');
  } catch {}
  localStorage.setItem(CLEAR_KEY, '1');
  console.info('[CLEANUP] IndexedDB cleared (one-time deploy cleanup)');
}
// === END CLEANUP ===

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
