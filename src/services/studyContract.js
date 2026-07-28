/**
 * studyContract — foydalanuvchining o'quv shartnomasi: YAGONA maqsad manbasi.
 *
 * MUAMMO (shu fayl hal qiladigan): onboarding 3 ta savol berardi va javoblarni
 * Firestore'ga `onboardingGoal` / `onboardingDailyMinutes` deb yozardi — ularni
 * ilovada HECH KIM qayta o'qimasdi. Natijada maqsad uch joyda alohida yashardi:
 *   • toifa        → onboardingGoal (o'lik) va profil teacherCategory (jonli)
 *   • kunlik vaqt  → onboardingDailyMinutes (o'lik) va localStorage byudjeti
 *   • maqsad foizi → config.EXAM_GOAL_SCORE (hammaga bir xil 70)
 * Foydalanuvchi onboardingda «20 daqiqa» deb aytgach, Reja sahifasi shu savolni
 * qaytadan berardi — «qon tomiri» aynan shu yerda uzilgan edi.
 *
 * YECHIM: bitta shartnoma. Onboarding uni TO'LDIRADI, Reja sahifasi TAHRIRLAYDI,
 * Dashboard/Tahlil/sur'at/eslatma esa faqat O'QIYDI.
 *
 * Imtihon sanasi ATAYIN bu yerda emas — u allaqachon yagona manbaga ega
 * (utils/examDate.js). Shartnoma uni takrorlamaydi, o'sha yerdan o'qiladi.
 *
 * Saqlash: localStorage (sinxron o'qish — diagnostika useMemo ichida kerak)
 * + Firestore users/{uid} (qurilmalar orasida sinxron).
 */
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { EXAM_GOAL_SCORE, BATCH_SIZE } from '../config';

const KEY = 'zehin_study_contract_v1';
export const CONTRACT_EVENT = 'zehin:study-contract';

/**
 * Maqsad foizi — malaka toifasi bo'yicha.
 *
 * ⚠️ SOZLASH NUQTASI: rasmiy attestatsiya chegaralari o'zgarsa FAQAT shu
 * jadvalni tahrirlang — qolgan hamma joy shu yerdan o'qiydi.
 * Qiymat = 50 savollik testda to'g'ri javoblar ULUSHI (foiz), «ball» emas.
 */
export const TARGET_BY_TOIFA = {
  mutaxassis: 60,
  ikkinchi: 60,
  birinchi: 70,
  oliy: 80,
  sertifikat: 70,
};

/**
 * Kunlik vaqt variantlari — onboarding va Reja sarlavhasi AYNAN shu ro'yxatni
 * ishlatadi. Ilgari ular boshqacha edi (onboarding 10/20/30/60, reja 10/20/40),
 * shuning uchun onboardingda «30 daqiqa» tanlagan odam reja sahifasida hech bir
 * tugma yonmaganini ko'rardi.
 */
export const DAILY_MINUTE_OPTIONS = [10, 20, 30, 60];

/** Onboarding maqsad id'lari → profil toifa lug'ati (ikkalasi bir tilda gapirsin) */
export const ONBOARDING_TOIFA = {
  second_category: 'ikkinchi',
  first_category: 'birinchi',
  highest_category: 'oliy',
  professional: 'sertifikat',
};

/** Toifaga mos maqsad foizi; noma'lum toifada — umumiy standart */
export const targetScoreFor = (toifa) => TARGET_BY_TOIFA[toifa] ?? EXAM_GOAL_SCORE;

/**
 * Maqsad foizini SAVOL SONIGA aylantiradi.
 * «70 ball» degan yozuv chalg'itardi: 70 aslida foiz, imtihonda esa 50 savol
 * bor. «50 savoldan 35 tasi» — foydalanuvchi tekshira oladigan aniq son.
 */
export const targetQuestions = (targetScore, examQuestions = BATCH_SIZE) =>
  Math.round((targetScore / 100) * examQuestions);

/** Kunlik maqsad zaxirasi — shartnomada vaqt ko'rsatilmagan bo'lsa */
export const DEFAULT_DAILY_TARGET = 20;

/**
 * Kunlik vaqtni kunlik SAVOL maqsadiga aylantiradi (streak shu maqsad bilan
 * yopiladi). Ya'ni onboardingdagi «kuniga qancha vaqt» javobi endi to'g'ridan-
 * to'g'ri kunlik normani va zanjirni belgilaydi — ilgari norma hammaga 20 edi.
 * @param {number|null} minutes  shartnomadagi kunlik daqiqa
 * @param {number} secondsPerQ   foydalanuvchining o'rtacha tezligi
 */
export const questionsForMinutes = (minutes, secondsPerQ = 45) => {
  if (minutes == null) return DEFAULT_DAILY_TARGET;
  const sec = secondsPerQ > 0 ? secondsPerQ : 45;
  const raw = Math.round((minutes * 60) / sec);
  // Yuqori chegara = bitta imtihon hajmi. Kunlik norma zanjirni (streak)
  // belgilaydi: «60 daqiqa» tanlagan odamga 80 savol qo'yilsa, bir kun
  // ulgurmasa zanjir uzilardi — ya'ni o'z imkoniyatini ko'p baholagani uchun
  // JAZOLANARDI. Norma bajarilishi mumkin bo'lib qolishi kerak.
  return Math.max(5, Math.min(BATCH_SIZE, raw));
};

const clampMinutes = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 600) : null;
};

const clampScore = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(30, n)) : null;
};

const readRaw = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Amaldagi shartnoma.
 * @returns {{ toifa: string|null, dailyMinutes: number|null, targetScore: number,
 *             targetIsCustom: boolean, examQuestions: number }}
 */
export const readContract = () => {
  const c = readRaw();
  const toifa = c.toifa || null;
  const custom = clampScore(c.targetScore);
  return {
    toifa,
    dailyMinutes: clampMinutes(c.dailyMinutes),
    // Qo'lda belgilangan maqsad toifadan ustun turadi
    targetScore: custom ?? targetScoreFor(toifa),
    targetIsCustom: custom !== null,
  };
};

/**
 * Shartnomani yangilash (qisman). Firestore'ga yozish uid berilganda bo'ladi.
 * @param {object} patch  { toifa?, dailyMinutes?, targetScore? }
 * @param {string} [uid]
 */
export const writeContract = (patch, uid) => {
  const next = { ...readRaw() };
  if ('toifa' in patch) next.toifa = patch.toifa || null;
  if ('dailyMinutes' in patch) next.dailyMinutes = clampMinutes(patch.dailyMinutes);
  if ('targetScore' in patch) next.targetScore = clampScore(patch.targetScore);

  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private rejim */ }
  // Bir oynadagi o'zgarish boshqa komponentlarga yetib borsin ('storage' faqat
  // BOSHQA tablarda ishlaydi, shuning uchun o'z hodisamiz kerak)
  try { window.dispatchEvent(new Event(CONTRACT_EVENT)); } catch { /* SSR */ }

  if (uid) {
    setDoc(doc(db, 'users', uid), {
      teacherCategory: next.toifa || '',
      studyDailyMinutes: next.dailyMinutes ?? null,
      studyTargetScore: next.targetScore ?? null,
    }, { merge: true }).catch(e => console.warn('Shartnoma sinxronlash xatosi:', e));
  }
  return readContract();
};

/**
 * Firestore hujjatidan localStorage keshini to'ldirish (kirishdan keyin, boshqa
 * qurilmada o'zgargan bo'lsa). Faqat mahalliy qiymat yo'q bo'lganda yozadi —
 * shu qurilmadagi yangi tanlovni eskirgan bulut qiymati bosib ketmasin.
 */
export const hydrateContract = (userDoc = {}) => {
  const local = readRaw();
  const next = { ...local };
  let changed = false;
  if (!local.toifa && userDoc.teacherCategory) { next.toifa = userDoc.teacherCategory; changed = true; }
  if (local.dailyMinutes == null && userDoc.studyDailyMinutes != null) {
    next.dailyMinutes = clampMinutes(userDoc.studyDailyMinutes); changed = true;
  }
  // Qo'lda belgilangan maqsad FAQAT mahalliy toifa ham bo'lmaganda olinadi.
  // Aks holda: shu qurilmada «ikkinchi toifa» (60%) tanlangan, bulutda esa eski
  // 99% qolib ketgan bo'lsa — toifa bilan maqsad bir-biriga zid chiqardi.
  if (local.targetScore == null && !local.toifa && userDoc.studyTargetScore != null) {
    next.targetScore = clampScore(userDoc.studyTargetScore); changed = true;
  }
  if (changed) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    try { window.dispatchEvent(new Event(CONTRACT_EVENT)); } catch { /* ignore */ }
  }
  return readContract();
};
