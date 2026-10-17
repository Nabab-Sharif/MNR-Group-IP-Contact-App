import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.tsx";
import "./index.css";
import { store } from "./store";
import { hydrateStore, startDataSync } from "./store/dataSync";

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
    } catch {
      // ignore dev cleanup failures
    }
  });
}

const render = () =>
  createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <App />
    </Provider>
  );

// Hydrate IndexedDB data into Redux before first paint, then sync silently.
hydrateStore().finally(() => {
  render();
  startDataSync();
});
