import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Register event listeners to trigger replay of queued predictions
// Firefox & Safari do not support Background Sync API in service workers so this is a fallback
if ('serviceWorker' in navigator) {
  const triggerReplay = async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'REPLAY_QUEUE' });
  };

  window.addEventListener('online', triggerReplay);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerReplay();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
