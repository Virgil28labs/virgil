import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import {
  registerServiceWorker,
  setupNetworkMonitoring,
} from "./lib/serviceWorker";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for caching and offline support
if (import.meta.env.PROD) {
  registerServiceWorker({
    onSuccess: () => {},
    onUpdate: () => {},
  });
}

// Setup network monitoring
setupNetworkMonitoring({
  onOnline: () => {},
  onOffline: () => {},
});
