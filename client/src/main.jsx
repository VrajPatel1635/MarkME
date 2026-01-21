// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/authContext.jsx'
import { AdminProvider } from './context/adminContext.jsx'
import { initPWAInstall } from './hooks/usePWAInstall.js'

// Initialize the PWA install prompt listener as early as possible.
initPWAInstall();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AdminProvider>
        <App />
      </AdminProvider>
    </AuthProvider>
  </StrictMode>,
)

// ✅ Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch(err => console.error("Service Worker error:", err));
  });
}
