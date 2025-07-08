import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { registerServiceWorker, setupNetworkMonitoring } from './lib/serviceWorker'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for caching and offline support
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('App is ready for offline use');
      }
    },
    onUpdate: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('New app version available');
      }
    }
  });
}

// Setup network monitoring
setupNetworkMonitoring({
  onOnline: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Connection restored');
    }
  },
  onOffline: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Connection lost - using cached content');
    }
  }
});
