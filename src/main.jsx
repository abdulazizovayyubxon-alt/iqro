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
import './i18n'
import './index.css'

// ── Monitoring va Analytics ──
import { initAnalytics } from './services/analytics'
import { initSentry } from './services/sentry'
import { registerServiceWorker } from './services/registerSW'
import { dropLegacyFirestoreCache } from './services/dropLegacyFirestoreCache'

initSentry()           // Xatolarni kuzatish (async, lazy)
initAnalytics()        // Google Analytics
registerServiceWorker() // PWA offline kesh — rad etilsa jimgina o'tadi

// Eski Firestore IndexedDB keshini bo'shatish — bir marta, ishga tushishdan
// KEYIN. `setTimeout` ataylab: bu tozalash, foydalanuvchi kutadigan ish emas,
// shuning uchun birinchi render bilan resurs talashmasin.
setTimeout(dropLegacyFirestoreCache, 3000)

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
//   - Sahifa YANGILANGANDA (sessionStorage mavjud)     → splash YO'Q
//
// ── NEGA YANGILASHDA SPLASH YO'Q (tezlik o'lchovi, 2026-08-15) ──────────────
// Avval bu yerda SimpleSplash turardi: 600ms ko'rsatish + 400ms fade = HAR
// yangilashda 1 soniya. Bu SOF KECHIKISH edi — ilova orqada allaqachon tayyor
// bo'lardi, splash uni ataylab to'sib turardi.
//
// Ustiga-ustak u navy logo ekranining UCHINCHI nusxasi edi: index.html ичida
// `.zh-splash` (React mount bo'lgunicha) va App.jsx dagi `bootSplashVisible`
// ekrani (auth hal bo'lgunicha) allaqachon AYNAN shu navy fon + belgini
// ko'rsatadi. Ya'ni olib tashlash ko'rinishni o'zgartirmaydi — faqat
// 1 soniyani qaytaradi.
const AppRoot = () => {
  const isFirstOpen = !sessionStorage.getItem(SPLASH_SESSION_KEY);
  // 'video' | 'done'
  const [splashMode, setSplashMode] = React.useState(isFirstOpen ? 'video' : 'done');

  const handleVideoComplete = React.useCallback(() => {
    // sessionStorage video ichida o'zi setItem qiladi
    setSplashMode('done');
  }, []);

  return (
    <>
      {splashMode === 'video' && <SplashVideo onComplete={handleVideoComplete} />}
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
