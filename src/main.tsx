import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// PWA: skip inside iframes (Arena preview) so the service worker cannot blank the embed
if (
  "serviceWorker" in navigator &&
  window.location.protocol.startsWith("http") &&
  window.self === window.top
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline support unavailable — game still runs */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
