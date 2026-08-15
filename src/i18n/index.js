/**
 * i18n — ko'p tillilik (react-i18next).
 * Standart til: uz (o'zbek-lotin). Qo'shimcha: ru (rus), en (ingliz).
 * Til localStorage `iqro-lang` da saqlanadi. Brauzer/qurilma tili ATAYIN
 * e'tiborga olinmaydi: ilova birinchi ochilishda doim o'zbekcha — foydalanuvchi
 * Sozlamalardan boshqa til tanlasa, o'sha tanlov saqlanadi va ishlatiladi.
 *
 * Matnlarni bosqichma-bosqich ko'chiramiz — hozircha tarjima qilingan yuzalar
 * (BottomNav, Settings) tilga moslashadi; qolgani uz-lotin'da qoladi (fallback).
 *
 * ── TEZLIK: ru/en KECHIKTIRIB yuklanadi ──────────────────────────────────
 * Avval uchala lokal ham statik `import` bilan kelardi — uz 92 KB + ru 134 KB
 * + en 86 KB = 312 KB xom matn ASOSIY chunk ichida. Ya'ni foydalanuvchilarning
 * deyarli hammasi (uz) hech qachon ochmaydigan 220 KB ni birinchi ekrandan
 * OLDIN yuklardi.
 *
 * Endi faqat `uz` paketga kiradi; ru/en alohida chunk bo'lib, o'sha til
 * tanlanganda (yoki saqlangan tanlov o'sha bo'lsa) yuklanadi.
 *
 * DIQQAT — `bindI18n`: paket kechroq kelgani uchun komponentlar `added`
 * hodisasida ham qayta render bo'lishi SHART, aks holda ru foydalanuvchisi
 * tarjima kelgunicha uz matnini ko'rib qolardi va u o'zgarmasdi.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import uz from './locales/uz.json';

// Qo'shimcha tillar — faqat kerak bo'lganda. Vite har birini alohida
// chunk qiladi (`import()` dinamik bo'lgani uchun).
const LOADERS = {
  ru: () => import('./locales/ru.json'),
  en: () => import('./locales/en.json'),
};

// `uz` allaqachon paket ichida; qolganlari bir martadan ko'p yuklanmasin.
const requested = new Set(['uz']);

/**
 * Til paketini kerak bo'lsa yuklaydi va i18n'ga qo'shadi.
 * Xato bo'lsa (tarmoq yo'q) jimgina o'tadi — ilova uz fallback bilan ishlaydi.
 */
export function ensureLanguage(lng) {
  // 'ru-RU' → 'ru' (nonExplicitSupportedLngs bilan bir xil mantiq)
  const base = String(lng || '').split('-')[0].toLowerCase();
  const load = LOADERS[base];
  if (!load || requested.has(base)) return Promise.resolve();
  requested.add(base);
  return load()
    .then((mod) => {
      // `deep`=true, `overwrite`=true — takroriy qo'shilsa ham holat buzilmaydi
      i18n.addResourceBundle(base, 'translation', mod.default, true, true);
    })
    .catch(() => {
      // Qayta urinish mumkin bo'lsin (masalan til qayta tanlanganda)
      requested.delete(base);
    });
}

// Saqlangan tanlovni init'dan OLDIN o'qiymiz va yuklashni darhol boshlaymiz:
// so'rov auth/Firestore bilan PARALLEL ketadi, ya'ni ru foydalanuvchisi uchun
// ham amalda kutish qo'shilmaydi.
let savedLang = 'uz';
try {
  savedLang = localStorage.getItem('iqro-lang') || 'uz';
} catch { /* localStorage bloklangan bo'lishi mumkin (private rejim) */ }
const preload = ensureLanguage(savedLang);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
    },
    // Faqat `uz` paketda bor — i18next qolgan tillarni "yo'q" deb hisoblab
    // ogohlantirmasin va fallback bilan ishlab tursin.
    partialBundledLanguages: true,
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    nonExplicitSupportedLngs: true, // 'ru-RU' → 'ru'
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'iqro-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false }, // React XSS'dan o'zi himoyalaydi
    react: {
      // 'added' SHART — tarjima paketi init'dan keyin kelganda ham qayta render
      // bo'lsin (yuqoridagi izohga qarang).
      bindI18n: 'languageChanged added',
    },
  });

// Sozlamalarda til almashtirilganda paketni yuklab qo'yamiz.
// (SettingsPage `i18n.changeLanguage(id)` chaqiradi — bu hodisani beradi.)
i18n.on('languageChanged', (lng) => { ensureLanguage(lng); });

// Preload tugagunicha kutish kerak bo'lsa (test/SSR) — havola ochiq qoladi.
export { preload };
export default i18n;
