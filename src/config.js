// Markaziy konfiguratsiya — barcha global konstantalar shu yerda

// Imtihon sanasi — agar o'tib ketgan bo'lsa, keyingi siklga o'tadi
const RAW_EXAM_DATE = new Date('2026-05-13T09:00:00');
export const EXAM_DATE = RAW_EXAM_DATE > new Date() ? RAW_EXAM_DATE : null;

export const APP_NAME = 'IQRO';
export const APP_SUBTITLE = 'Kasbiy Sertifikatlash Tayyorgarligi';
export const EXAM_LABEL = EXAM_DATE ? '13 May — IQRO Kasbiy Sertifikatlash Imtihoni' : 'IQRO Kasbiy Sertifikatlash Platformasi';
export const EXAM_GOAL_SCORE = 70;
export const APP_URL = 'https://iqro-t41p.vercel.app'; // Haqiqiy domen (agar o'zgarsa shu yerni tahrirlaysiz)

export const BATCH_SIZE = 50; // Har bir blokdagi savollar soni
export const MAX_MISTAKES_SAVED = 50; // Maksimal saqlanadigan xatolar soni


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
// APK bundle build qilinayotganda .env da VITE_PLAY_BUILD=true qo'yiladi.
// Build-time flag paketlash usulidan (TWA yoki Capacitor) mustaqil ishlaydi.
export const isPlayBuild = () => {
  if (import.meta.env.VITE_PLAY_BUILD === 'true') return true; // build-time (asosiy)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return true; // Capacitor fallback
  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) return true; // TWA fallback
  return false;
};

// ─── Toifa ROI kalkulyatori ───
// DIQQAT: ustama foizlari taxminiy — rasmiy hujjat asosida TASDIQLAB SO'NG o'zgartiring.
// base — 1 stavka o'qituvchining o'rtacha oyligi (so'm)
export const TOIFA_SALARY = {
  base: 3800000,
  deltas: {
    '2-toifa': 0.20,
    '1-toifa': 0.30,
    'oliy': 0.50,
  },
  labels: {
    '2-toifa': '2-toifa',
    '1-toifa': '1-toifa',
    'oliy': 'Oliy toifa',
  },
};
