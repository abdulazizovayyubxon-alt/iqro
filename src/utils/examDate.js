/**
 * examDate — imtihon sanasining YAGONA o'qish nuqtasi.
 *
 * Sana uch manbadan keladi, ustuvorlik tartibi shu:
 *   1. localStorage `CUSTOM_EXAM_DATE` — foydalanuvchi o'zi belgilagan
 *      (Header/Dashboard modalidan yoziladi, Firestore `users/{uid}.examDate`
 *      dan sinxron keladi — ProfileDrawer va Header shu kalitni to'ldiradi)
 *   2. localStorage `iqro_global_exam` — Firestore `settings/exam` keshi
 *      (admin yangilaydi, kod deploy qilinmaydi)
 *   3. config `EXAM_DATE` — zaxira, faqat hali kelmagan bo'lsa
 *   4. hech biri yo'q → null
 *
 * MUHIM: o'tib ketgan sana INKOR qilinadi (keyingi manbaga tushiladi), aks
 * holda sanoq abadiy «0 kun qoldi» bo'lib qotib qolardi — aynan shu xato
 * bo'lgan edi: config'dagi sana o'tgach EXAM_DATE null bo'lib, Dashboard
 * banneri umuman yo'qolgan, headerdagi chip esa «0 kun» ko'rsatgan.
 */
import { EXAM_DATE } from '../config';

export const EXAM_DATE_KEY = 'CUSTOM_EXAM_DATE';
export const GLOBAL_EXAM_KEY = 'iqro_global_exam';   // { date, label, fetchedAt }
export const COUNTDOWN_KEY = 'iqro-exam-countdown';  // 'off' = foydalanuvchi o'chirgan
export const COUNTDOWN_EVENT = 'zehin:exam-countdown';

/** Firestore keshi qancha vaqt yangi hisoblanadi */
export const GLOBAL_TTL_MS = 6 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Sana bugundan oldinmi (kalendar kuni bo'yicha) */
const isExpired = (d) => startOfDay(d).getTime() < startOfDay(new Date()).getTime();

const lsGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

/** Firestore'dan kelgan umumiy sanani keshga yozish */
export const writeGlobalExam = (data) => {
  try {
    localStorage.setItem(GLOBAL_EXAM_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }));
  } catch { /* kvota to'lgan yoki private rejim — keshsiz ham ishlayveradi */ }
};

/** Keshdagi umumiy sana: { date, label, fetchedAt } | null */
export const readGlobalExam = () => {
  try {
    const raw = lsGet(GLOBAL_EXAM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/** Kesh eskirganmi (qayta so'rash kerakmi) */
export const isGlobalStale = () => {
  const cached = readGlobalExam();
  return !cached || (Date.now() - (cached.fetchedAt || 0)) > GLOBAL_TTL_MS;
};

/** Sanoq foydalanuvchi tomonidan yoqilganmi (Sozlamalar > Ko'rinish) */
export const isCountdownEnabled = () => lsGet(COUNTDOWN_KEY) !== 'off';

/**
 * Amaldagi imtihon sanasi va u qayerdan kelgani.
 * @returns {{ date: Date, source: 'personal'|'global'|'config', label: string|null } | null}
 */
export const readExamSource = () => {
  const personal = parseDate(lsGet(EXAM_DATE_KEY));
  if (personal && !isExpired(personal)) {
    return { date: personal, source: 'personal', label: null };
  }

  const global = readGlobalExam();
  const globalDate = parseDate(global?.date);
  if (globalDate && !isExpired(globalDate)) {
    return { date: globalDate, source: 'global', label: global.label || null };
  }

  if (EXAM_DATE && !isExpired(EXAM_DATE)) {
    return { date: EXAM_DATE, source: 'config', label: null };
  }

  return null;
};

/** @returns {Date|null} amaldagi imtihon sanasi (o'tgan sana null) */
export const readExamDate = () => readExamSource()?.date || null;

/**
 * Imtihongacha qolgan KALENDAR kunlari.
 * Kalendar kuni ishlatiladi (soatlar emas): kechqurun ham «ertaga» 1 kun
 * bo'lib turadi, xom farq esa 0 ko'rsatib chalg'itardi.
 * @returns {number|null} null = sana yo'q yoki o'tgan; 0 = imtihon bugun
 */
export const daysUntilExam = () => {
  const target = readExamDate();
  if (!target) return null;
  return Math.round((startOfDay(target) - startOfDay(new Date())) / 86400000);
};

/**
 * Sanoq ohangi — sokin palitra. Qizil pulsatsiya yo'q: muddat eslatma
 * bo'lishi kerak, vahima manbai emas.
 */
export const examTone = (daysLeft) =>
  daysLeft === 0 ? 'today' : daysLeft <= 7 ? 'soon' : 'calm';

/**
 * Sanoq uchun to'liq ma'lumot.
 * @returns {{ hasDate, enabled, date, source, label, daysLeft, isToday, tone, isPersonal }}
 */
export const readExamInfo = () => {
  const enabled = isCountdownEnabled();
  const src = readExamSource();
  if (!src) {
    return {
      hasDate: false, enabled, date: null, source: null, label: null,
      daysLeft: null, isToday: false, tone: 'calm', isPersonal: false,
    };
  }
  const daysLeft = Math.round((startOfDay(src.date) - startOfDay(new Date())) / 86400000);
  return {
    hasDate: true,
    enabled,
    date: src.date,
    source: src.source,
    label: src.label,
    daysLeft,
    isToday: daysLeft === 0,
    tone: examTone(daysLeft),
    isPersonal: src.source === 'personal',
  };
};
