import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// vite-plugin-pwa auto-registers the service worker in production builds.
// In development, ensure any leftover service workers and caches are cleared
// so the dev server isn't serving stale assets.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
      console.log('Development mode: cleared service workers and caches');
    } catch (error) {
      console.log('Development cleanup failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
