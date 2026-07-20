import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ObjectionProvider } from './context/ObjectionContext'
import { AppProvider } from './context/AppContext'
import { PWAProvider } from './context/PWAContext'
import App from './App.jsx'
import SplashVideo, { shouldShowSplash } from './components/shared/SplashVideo.jsx'
import './i18n'
import './index.css'

// ── Monitoring va Analytics ──
import { initAnalytics } from './services/analytics'
import { initSentry } from './services/sentry'

initSentry()    // Xatolarni kuzatish (async, lazy)
initAnalytics() // Google Analytics

// Ilova qobig'i (SPA) har doim tepadan ochiladi: reload'dan keyin brauzer
// eski scroll o'rnini tiklamasin (aks holda dashboard o'rtasidan ochilib,
// yuqoridagi fan tanlash "yo'qolib qolgan"dek ko'rinadi). Route ichidagi
// scroll'ni App.jsx o'zi boshqaradi.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// AppRoot - eng yuqori darajadagi render
// Splash video ilova qanday holatdaligidan qat'i nazar (kirmagan bo'lsa ham)
// eng birinchi bo'lib ko'rinishini ta'minlaydi.
const AppRoot = () => {
  const [showSplash, setShowSplash] = React.useState(() => shouldShowSplash());
  return (
    <>
      {showSplash && <SplashVideo onComplete={() => setShowSplash(false)} />}
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
