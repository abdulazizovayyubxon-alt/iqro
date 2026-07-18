// Markaziy konfiguratsiya — barcha global konstantalar shu yerda

// Imtihon sanasi — agar o'tib ketgan bo'lsa, keyingi siklga o'tadi
const RAW_EXAM_DATE = new Date('2026-05-13T09:00:00');
export const EXAM_DATE = RAW_EXAM_DATE > new Date() ? RAW_EXAM_DATE : null;

export const APP_NAME = 'Zehin';
export const APP_VERSION = '2.0'; // Ilova versiyasi (Sozlamalar pastida ko'rsatiladi; relizda bu yerni yangilang)
export const APP_SUBTITLE = 'Attestatsiya platformasi';
export const EXAM_LABEL = EXAM_DATE ? '13 May — Malaka toifa imtihoni' : 'Zehin — attestatsiya platformasi';
export const EXAM_GOAL_SCORE = 70;
export const APP_URL = 'https://toifapro-t41p.vercel.app'; // Haqiqiy domen (agar o'zgarsa shu yerni tahrirlaysiz)
export const SUPPORT_URL = 'https://t.me/Toifapro'; // Qo'llab-quvvatlash / Biz bilan bog'lanish Telegram kanali

export const BATCH_SIZE = 50; // Har bir blokdagi savollar soni
export const MAX_MISTAKES_SAVED = 50; // Maksimal saqlanadigan xatolar soni

// Tugallanmagan imtihon sessiyasi localforage kaliti — ExamPage yozadi/tiklaydi,
// Dashboard "Davom etish" kartasi shu kalitni o'qiydi (magic-string ikkilanmasin)
export const EXAM_SESSION_KEY = 'exam_session_v1';


// Bepul sinov muddati (kun) — ro'yxatdan o'tgan sanadan boshlab hisoblanadi
// Faqat shu yerda o'zgartirish yetarli — barcha sahifalar avtomatik yangilanadi
export const FREE_TRIAL_DAYS = 7;

// Admin huquqiga ega emaillar ro'yxati
export const ADMIN_EMAILS = [
  'abdulazizovayyubxon@gmail.com',
  '998999154686@iqro.uz' // Ayyubxonning telefon raqami
];

// Imtihon rejimida har savol uchun vaqt (soniyada)
export const QUESTION_TIMER_SECONDS = 60;

// Yillik obuna default narxi (ROI ko'rsatish uchun; haqiqiy narx Firestore settings/premium da)
export const DEFAULT_YEARLY_PRICE = 240000;

// ─── Google Play build aniqlash — yagona haqiqat manbasi ───
// Play Store ichida (APK/AAB) ishlayotganini aniqlaydi. Play'da raqamli obuna
// FAQAT Google Play Billing orqali sotilishi shart — Click/Payme/Telegram-karta
// to'lovlari faqat web/brauzer versiyasida ko'rsatiladi.
//
// Bu loyiha TWA (Trusted Web Activity) — APK Vercel saytining AYNAN o'zini ochadi,
// shuning uchun .env dagi VITE_PLAY_BUILD ilovaga yetib bormaydi (u Vercel build'ni
// yuklaydi). Demak ilova vs brauzer farqini FAQAT runtime signallar ajratadi:
//   1) Capacitor native platform (agar kelajakda Capacitor'ga o'tilsa)
//   2) TWA referrer (android-app://...) — ishonchsiz, SW/SPA da yo'qolishi mumkin
//   3) TWA launch URL'idagi ?play=1 — KAFOLATLANGAN (Bubblewrap startUrl da sozlanadi)
// Bir marta aniqlangach localStorage'da saqlanadi — keyingi navigatsiyalarda
// referrer yo'qolsa ham Play rejimi barqaror qoladi.
export const isPlayBuild = () => {
  // Build-time flag (Capacitor/lokal bundle build uchun — TWA da ishlamaydi)
  if (import.meta.env.VITE_PLAY_BUILD === 'true') return true;

  if (typeof window === 'undefined') return false;

  // Bir marta aniqlangach — saqlab qolamiz
  try {
    if (window.localStorage.getItem('iqro_play_build') === '1') return true;
  } catch (_) { /* localStorage bloklangan bo'lishi mumkin */ }

  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);

  const isCapacitor = !!window.Capacitor?.isNativePlatform?.();
  const isTWA = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
  // TWA launch URL'iga ?play=1 qo'shilsa — kafolatlangan aniqlash (faqat Android)
  const hasPlayParam = isAndroid && new URLSearchParams(window.location.search).get('play') === '1';

  if (isCapacitor || isTWA || hasPlayParam) {
    try { window.localStorage.setItem('iqro_play_build', '1'); } catch (_) { /* ignore */ }
    return true;
  }

  return false;
};

// ─── Toifa ROI kalkulyatori ───
// gains — toifa ortidan OYLIKKA qo'shiladigan SOF farq (oddiy mutaxassisga nisbatan), so'm.
// Haqiqiy hisob (2026): 2-toifa mutaxassisdan +445 928; 1-toifa +923 245 (2-toifadan +477 317);
// oliy toifa +1 412 147 (1-toifadan +488 902). Yangilanса shu yerni tahrirlang.
export const TOIFA_SALARY = {
  gains: {
    '2-toifa': 445928,
    '1-toifa': 923245,
    'oliy': 1412147,
  },
  labels: {
    '2-toifa': '2-toifa',
    '1-toifa': '1-toifa',
    'oliy': 'Oliy toifa',
  },
};
