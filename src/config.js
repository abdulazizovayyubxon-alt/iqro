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

// Bepul foydalanuvchilar uchun savol limiti
// Barcha sahifalar shu konstantadan foydalansin — o'zgartirish kerak bo'lsa faqat shu yerda o'zgartirish yetarli
export const FREE_QUESTION_LIMIT = 200;

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
