import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA service worker with auto reload on updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA]: New content available, updating in background...');
  },
  onOfflineReady() {
    console.log('[PWA]: Danzo is ready for offline usage');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
