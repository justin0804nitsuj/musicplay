import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline capability & automatic updates
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, reloading...');
    updateSW(true);
  },
  onOfflineReady() {
    console.log('SonicWave PWA is ready for complete offline use');
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
