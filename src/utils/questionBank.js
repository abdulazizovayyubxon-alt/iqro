/**
 * ════════════════════════════════════════════════════════════════════════
 *  questionBank.js — fan savollarining EKRANGA TAYYOR nusxasi (seans xotirasi)
 *
 *  NEGA (2026-09-11): Bosh → Test o'tishi telefonda «qotib» o'tardi.
 *  TestPage har ochilganda butun fan paketini (CHQBT: 3 781 savol, 3.25 MB)
 *  IndexedDB'dan o'qib, HAMMASINI qayta tozalardi. Haqiqiy fayl bilan
 *  kompyuterda o'lchandi:
 *      IndexedDB o'qish           16–21 ms
 *      processQuestionsOnTheFly   33–60 ms
 *      takror tozalash            10–15 ms
 *      smartSort                  16–35 ms
 *  Bular bitta uzluksiz ~110–165 ms vazifa edi; o'rta telefon 4–6 barobar
 *  sekin, ya'ni ~0.5–0.9 s asosiy oqim band bo'lardi — pastki panel
 *  animatsiyasi, skelet va teginish shu paytda qotardi. ExamPage aynan shu
 *  ishni takrorlardi.
 *
 *  ENDI:
 *   · fan filtri + processQuestionsOnTheFly + takror kaliti fan+versiya
 *     uchun BIR MARTA hisoblanadi va seans davomida xotirada qoladi;
 *   · ish 250 talik bo'laklarda, har bo'lakdan keyin asosiy oqimga navbat
 *     berib bajariladi — uzun vazifa yo'q;
 *   · Bosh sahifa paketni baribir o'qiydi (useTopicTotals) — o'sha nusxa
 *     bo'sh vaqtda oldindan tayyorlab qo'yiladi.
 *
 *  To'plam AYNAN oldingidek chiqadi: processQuestionsOnTheFly savolning
 *  mavzusi va fanini o'zgartirmaydi, shuning uchun mavzu filtrini tozalashdan
 *  KEYIN qo'llash bir xil natija beradi (src/__tests__/questionBank.test.js).
 *  Yagona farq: moslashtirish savollari variantlarining tasodifiy tartibi
 *  endi seans davomida bir xil qoladi (oddiy savollar hech qachon
 *  aralashtirilmagan).
 * ════════════════════════════════════════════════════════════════════════
 */
import { processQuestionsOnTheFly } from './questionFixer';
import { questionKey } from '../engine/SmartQuestionEngine';

/**
 * Savol matnidan kirish/kontekst qismini olib tashlaydi — takrorni aniqlash
 * uchun. Masalan, "Im Unterricht, Konjunktiv II nima?" va "Dars davomida,
 * Konjunktiv II nima?" bir xil hisoblanadi.
 *
 * TestPage.jsx va ExamPage.jsx dagi ikki nusxadan ko'chirildi — ikkalasi
 * izohsiz aynan bir xil edi.
 */
export function cleanForDedup(text) {
  let clean = (text || '').trim().toLowerCase();
  // [Mavzu: ...] yoki [... yangi savol] prefikslarini olib tashlash
  clean = clean.replace(/^\s*\[mavzu:\s*[^\]]+\]\s*/gi, '');
  clean = clean.replace(/^\s*\[[^\]]+yangi\s+savol\]\s*/gi, '');
  // Savol kodlarini olib tashlash
  clean = clean.replace(/\s*\(\s*savol\s+kodi\s*:\s*#[a-z0-9_]+\s*\)/gi, '');
  clean = clean.replace(/\s*#[a-z0-9_]+/gi, '');
  // Verguldan oldingi kirish qismini olib tashlash (agar u qisqa va kontekst bo'lsa)
  const parts = clean.split(/,\s+/);
  if (parts.length > 1) {
    const firstPart = parts[0].trim();
    const isIntro =
      /^(in|im|während|bei|für|dars|o'qituvchi|sinf|maktab|o'quvchi|ota-ona|attestatsiya|metodik|pedagogik|ichki|tashqi|harbiy|amaliy|kasbiy|ilmiy|seminar|muhokama)/i.test(firstPart) ||
      firstPart.split(' ').length <= 6;
    if (isIntro) {
      return parts.slice(1).join(', ').trim();
    }
  }
  return clean.trim();
}

// Takror kaliti har savol obyekti uchun BIR MARTA hisoblanadi. WeakMap —
// obyekt tashlab yuborilsa kalit ham o'zi tozalanadi. Xavfsiz, chunki savol
// obyekti hech qayerda joyida o'zgartirilmaydi (processQuestionsOnTheFly
// ham yangi obyekt qaytaradi).
const coreCache = new WeakMap();

export function dedupCore(q) {
  let core = coreCache.get(q);
  if (core === undefined) {
    core = cleanForDedup(q.q || '');
    coreCache.set(q, core);
  }
  return core;
}

/** Tartibni saqlab takrorlarni tashlaydi — birinchi uchragani qoladi. */
export function dedupQuestions(list) {
  const seen = new Set();
  return list.filter((q) => {
    const core = dedupCore(q);
    if (!core) return true;
    if (seen.has(core)) return false;
    seen.add(core);
    return true;
  });
}

/** Fan bo'yicha { [topicId]: savollar soni }. */
export function countTopics(list, cat) {
  const out = {};
  for (const q of list) {
    if (q.category === cat) out[q.topicId] = (out[q.topicId] || 0) + 1;
  }
  return out;
}

// Bir bo'lak telefonda ~25 ms — «uzun vazifa» chegarasi (50 ms) dan ancha past.
export const PREPARE_CHUNK = 250;

// Navbat berish. MessageChannel — setTimeout(0) dagi 4 ms qisqichsiz;
// bo'lim testi darhol kerak bo'lganda ishlatiladi.
const channelYield = () => new Promise((resolve) => {
  const ch = new MessageChannel();
  ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
  ch.port2.postMessage(null);
});

// Oldindan tayyorlashda — faqat brauzer bo'sh turganda (Bosh sahifa
// aylantirilayotgan bo'lsa unga xalaqit bermasin). Safari'da
// requestIdleCallback yo'q.
const idleYield = () => new Promise((resolve) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 500 });
  else setTimeout(resolve, 16);
});

/**
 * Xom paketdan ekranga tayyor ro'yxat: fan filtri + processQuestionsOnTheFly,
 * takror kaliti ham shu yerda hisoblab qo'yiladi. Natija
 * `processQuestionsOnTheFly(rawList.filter(q => q.category === cat))` bilan
 * aynan bir xil, faqat bo'laklab.
 */
export async function prepareQuestions(rawList, cat, yieldFn = channelYield, { yieldFirst = false } = {}) {
  const list = Array.isArray(rawList) ? rawList : [];
  const out = [];
  if (yieldFirst && list.length > 0) await yieldFn();
  for (let i = 0; i < list.length; i += PREPARE_CHUNK) {
    const part = processQuestionsOnTheFly(list.slice(i, i + PREPARE_CHUNK).filter((q) => q.category === cat));
    for (const q of part) {
      dedupCore(q);
      // smartSort kaliti ham shu bo'lakda (u obyekt bo'yicha keshlanadi) —
      // aks holda bankdan keyingi BIRINCHI o'tish uni 3 780 marta hisoblardi.
      questionKey(q);
      out.push(q);
    }
    if (i + PREPARE_CHUNK < list.length) await yieldFn();
  }
  return out;
}

// Seansda BITTA fan saqlanadi — xotira chegaralangan.
let cached = null;   // { key, list }
let inflight = null; // { key, gen, promise }
let generation = 0;
let committedGeneration = 0;

const keyOf = ({ cat, version }) => `${cat}|${version ?? 0}`;

/** Tayyor bank xotirada bo'lsa — darhol, aks holda `null`. */
export function peekPreparedBank(ref) {
  return cached && cached.key === keyOf(ref) ? cached.list : null;
}

/**
 * Fan+versiya uchun tayyor bank. Xotirada bo'lsa darhol, tayyorlanayotgan
 * bo'lsa o'sha jarayonga qo'shiladi (ikki marta tozalanmaydi).
 *
 * `rawList` — shu `version` ga tegishli xom paket. Bo'sh natija KESHLANMAYDI:
 * tarmoq xatosi yoki obuna yopig'i seans oxirigacha «savol yo'q» bo'lib
 * qolmasin.
 */
export function getPreparedBank(ref, rawList, { idle = false } = {}) {
  const key = keyOf(ref);
  if (cached?.key === key) return Promise.resolve(cached.list);
  if (inflight?.key === key) return inflight.promise;

  const gen = ++generation;
  const promise = prepareQuestions(rawList, ref.cat, idle ? idleYield : channelYield, { yieldFirst: idle })
    .then((list) => {
      // Eskiroq so'rov keyinroq tugasa, yangisining natijasini bosib ketmasin.
      if (list.length > 0 && gen > committedGeneration) {
        committedGeneration = gen;
        cached = { key, list };
      }
      return list;
    })
    .finally(() => {
      if (inflight?.gen === gen) inflight = null;
    });
  inflight = { key, gen, promise };
  return promise;
}

/** Bo'sh vaqtda oldindan tayyorlash (natija kutilmaydi). */
export function warmPreparedBank(ref, rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return;
  const key = keyOf(ref);
  if (cached?.key === key || inflight?.key === key) return;
  getPreparedBank(ref, rawList, { idle: true }).catch(() => { /* Test sahifasi o'zi qayta urinadi */ });
}

/** Testlar uchun. */
export function clearPreparedBank() {
  cached = null;
  inflight = null;
}
