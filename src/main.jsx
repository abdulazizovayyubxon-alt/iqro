import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ObjectionProvider } from './context/ObjectionContext'
import { AppProvider } from './context/AppContext'
import { PWAProvider } from './context/PWAContext'
import App from './App.jsx'
import SplashVideo, { SPLASH_SESSION_KEY } from './components/shared/SplashVideo.jsx'
import SimpleSplash from './components/shared/SimpleSplash.jsx'
import './i18n'
import './index.css'

// ── Monitoring va Analytics ──
import { initAnalytics } from './services/analytics'
import { initSentry } from './services/sentry'
import { registerServiceWorker } from './services/registerSW'

initSentry()           // Xatolarni kuzatish (async, lazy)
initAnalytics()        // Google Analytics
registerServiceWorker() // PWA offline kesh — rad etilsa jimgina o'tadi

// Ilova qobig'i (SPA) har doim tepadan ochiladi: reload'dan keyin brauzer
// eski scroll o'rnini tiklamasin (aks holda dashboard o'rtasidan ochilib,
// yuqoridagi fan tanlash "yo'qolib qolgan"dek ko'rinadi). Route ichidagi
// scroll'ni App.jsx o'zi boshqaradi.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// AppRoot - eng yuqori darajadagi render
// Splash rejimi:
//   - Ilova BIRINCHI ochilganda (sessionStorage bo'sh) → VIDEO splash
//   - Sahifa YANGILANGANDA (sessionStorage mavjud)     → ODDIY splash (faqat logo)
const AppRoot = () => {
  const isFirstOpen = !sessionStorage.getItem(SPLASH_SESSION_KEY);
  // 'video' | 'simple' | 'done'
  const [splashMode, setSplashMode] = React.useState(isFirstOpen ? 'video' : 'simple');

  const handleVideoComplete = React.useCallback(() => {
    // sessionStorage video ichida o'zi setItem qiladi
    setSplashMode('done');
  }, []);

  const handleSimpleComplete = React.useCallback(() => {
    setSplashMode('done');
  }, []);

  return (
    <>
      {splashMode === 'video' && <SplashVideo onComplete={handleVideoComplete} />}
      {splashMode === 'simple' && <SimpleSplash onComplete={handleSimpleComplete} />}
      <App />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ObjectionProvider>
            <AppProvider>
              <PWAProvider>
                <AppRoot />
              </PWAProvider>
            </AppProvider>
          </ObjectionProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
