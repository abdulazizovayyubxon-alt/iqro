/**
 * theory.js — nazariy material sxemasi va kirish nuqtasi.
 *
 * Bu fayl KONTENTNI o'z ichiga olmaydi (u `theory/<fan>.json` fayllarida,
 * fan bo'yicha dinamik yuklanadi) — faqat shakl, zaxira (fallback) va
 * savol↔band moslashtiruvi.
 *
 * ZAXIRA QOIDASI: `mockData.js` dagi barcha 128 mavzuda `theoryHint` matni
 * bor. Strukturaviy material yozilmagan mavzu ham ishlashi shart —
 * `getTheory()` bunday holatda hint'ni `summary` sifatida qaytaradi va
 * `legacy: true` belgisini qo'yadi. Shu sababli materialni mavzu-ma-mavzu
 * to'ldirish mumkin, ilova hech qachon bo'sh ekran ko'rsatmaydi.
 */
import { TOPICS } from './mockData';
import { normalizeText, trigrams, jaccard } from '../utils/textSimilarity';

/**
 * Struktura (qisqa kalitlar — 128 mavzu uchun hajm muhim):
 *   summary   — 1-2 jumla: mavzu nima haqida
 *   keyPoints — [{ t: sarlavha, d: izoh }] — asosiy bandlar (4-8 ta)
 *   mustKnow  — imtihonda so'raladigan aniq faktlar (sana, raqam, ta'rif)
 *   mistakes  — tipik xatolar
 *   mnemonics — eslab qolish usullari
 *   source    — manba (qaysi qo'llanma/qonun asosida)
 *   updatedAt — 'YYYY-MM-DD'
 */
export const emptyTheory = () => ({
  summary: '',
  keyPoints: [],
  mustKnow: [],
  mistakes: [],
  mnemonics: [],
  source: null,
  updatedAt: null,
  legacy: true,
});

const asArray = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
const asText = (v) => (typeof v === 'string' ? v.trim() : '');

/** Xom yozuvni (yoki eski matnli hint'ni) bir xil shaklga keltiradi. */
export const normalizeTheory = (raw, fallbackHint = '') => {
  const hint = asText(fallbackHint);
  if (!raw || typeof raw !== 'object') {
    return { ...emptyTheory(), summary: hint };
  }
  const keyPoints = asArray(raw.keyPoints)
    .map(p => (typeof p === 'string'
      ? { t: p, d: '' }
      : { t: asText(p?.t), d: asText(p?.d) }))
    .filter(p => p.t || p.d);

  return {
    summary: asText(raw.summary) || hint,
    keyPoints,
    mustKnow: asArray(raw.mustKnow).map(asText).filter(Boolean),
    mistakes: asArray(raw.mistakes).map(asText).filter(Boolean),
    mnemonics: asArray(raw.mnemonics).map(asText).filter(Boolean),
    source: asText(raw.source) || null,
    updatedAt: asText(raw.updatedAt) || null,
    // legacy = strukturaviy material hali yozilmagan (faqat eski hint matni)
    legacy: keyPoints.length === 0,
  };
};

// ── Dinamik yuklash (FAN bo'yicha) ────────────────────────────────────────
// Kontent asosiy paketga kirmaydi va FAN bo'yicha bo'lingan: o'qituvchi
// faqat o'z fanining konspektini (~25 kB) yuklaydi.
//
// ⚠️ Nega aniq ro'yxat, `import(\`./theory/${cat}.json\`)` emas: shablonli
// dinamik import'da Vite papkadagi HAMMA faylni alohida bo'lak qilib
// tayyorlaydi va ba'zi konfiguratsiyalarda birlashtirib yuboradi. Aniq
// ro'yxat har fanni mustaqil bo'lak qilishni KAFOLATLAYDI.
//
// Yangi fan qo'shilganda shu ro'yxatga ham qator qo'shiladi; unutilsa
// mavzu `theoryHint` zaxirasida ishlayveradi (ilova buzilmaydi).
const LOADERS = {
  chqbt: () => import('./theory/chqbt.json'),
  art: () => import('./theory/art.json'),
  tarix: () => import('./theory/tarix.json'),
  sport: () => import('./theory/sport.json'),
  boshlangich: () => import('./theory/boshlangich.json'),
  info: () => import('./theory/info.json'),
  mtt: () => import('./theory/mtt.json'),
  til: () => import('./theory/til.json'),
  mtt_rahbar: () => import('./theory/mtt_rahbar.json'),
  biologiya: () => import('./theory/biologiya.json'),
  geografiya: () => import('./theory/geografiya.json'),
  mtt_logoped: () => import('./theory/mtt_logoped.json'),
  mtt_psixolog: () => import('./theory/mtt_psixolog.json'),
  kimyo: () => import('./theory/kimyo.json'),
  rus_tili: () => import('./theory/rus_tili.json'),
  ingliz: () => import('./theory/ingliz.json'),
};

const cache = new Map();   // category → Promise<{ [topicId]: yozuv }>

/** @param {string} category */
export const loadTheoryContent = (category) => {
  if (!cache.has(category)) {
    const loader = LOADERS[category];
    cache.set(category, loader
      ? loader().then(m => m.default || m).catch(() => ({}))
      : Promise.resolve({}));   // fan ro'yxatda yo'q — hint zaxirasi ishlaydi
  }
  return cache.get(category);
};

const topicOf = (topicId) => TOPICS.find(t => t.id === topicId);
const hintOf = (topicId) => topicOf(topicId)?.theoryHint || '';

/**
 * Mavzuning nazariy materiali.
 * @param {number} topicId
 * @returns {Promise<object>} normalizeTheory natijasi (hech qachon null emas)
 */
export async function getTheory(topicId) {
  const topic = topicOf(topicId);
  const cat = Array.isArray(topic?.category) ? topic.category[0] : topic?.category;
  const content = cat ? await loadTheoryContent(cat) : {};
  return normalizeTheory(content[topicId], hintOf(topicId));
}

/** Yuklanmasdan turib zaxira variant (birinchi renderda ko'rsatish uchun). */
export const getTheoryFallback = (topicId) =>
  ({ ...emptyTheory(), summary: hintOf(topicId) });

// ── Savol ↔ band moslashtiruvi ────────────────────────────────────────────
// «AI ustoz»ning eng foydali qismini AI'siz beradi: xato qilingan savol
// uchun AYNAN kerakli nazariy bandni topadi. 47 000 savolga qo'lda `anchor`
// yozish shart emas — moslik matn o'xshashligidan hisoblanadi.

// Chegaralar mavzu 0 ning 458 ta HAQIQIY savolida o'lchab tanlangan.
// Bo'shroq qiymatlarda (0.045 / 1.35) qamrov 59% edi, lekin namunalar
// ichida ochiq XATO mosliklar bor edi: «harbiy unvonlar» savoli «Xalqaro
// gumanitar huquq» bandiga tushardi. Noto'g'ri joyga yuborilgan «shu qismni
// o'qing» tugmasi tugma umuman bo'lmaganidan yomonroq — shuning uchun
// QAMROV emas, ANIQLIK tanlandi: hozirgi qiymatlarda qamrov ~13%, lekin
// tekshirilgan namunalarning barchasi to'g'ri bandga tushdi.
// Konspekt boyigani sari (band ko'proq mavzuni qoplagani sari) qamrov o'zi ortadi.
/** Eng yaxshi nomzod o'rtachadan shuncha marta ustun bo'lishi kerak. */
export const MATCH_DOMINANCE = 1.6;
/** Va shu absolyut chegaradan yuqori — umuman aloqasiz bandni ko'rsatmaslik uchun. */
export const MATCH_FLOOR = 0.16;

/**
 * @param {string} questionText  savol matni (+ to'g'ri javob bo'lsa yaxshiroq)
 * @param {object} theory        normalizeTheory natijasi
 * @returns {{ index: number, score: number } | null}
 */
export function matchKeyPoint(questionText, theory) {
  const points = theory?.keyPoints || [];
  if (points.length === 0) return null;

  const qSet = trigrams(normalizeText(questionText));
  if (qSet.size === 0) return null;

  const scores = points.map(p => jaccard(qSet, trigrams(normalizeText(`${p.t} ${p.d}`))));
  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i;
  const best = scores[bestIdx];
  if (best < MATCH_FLOOR) return null;

  // Bitta band bo'lsa taqqoslash uchun raqib yo'q — faqat absolyut chegara.
  if (scores.length === 1) return { index: 0, score: best };

  // Ustunlik sharti: eng yaxshi nomzod qolganlarning o'rtachasidan sezilarli
  // yuqori bo'lishi kerak. Aks holda «hammasiga ozgina o'xshaydi» holatida
  // tasodifiy band ko'rsatilardi — bu foydalanuvchini chalg'itadi.
  const rest = scores.filter((_, i) => i !== bestIdx);
  const mean = rest.reduce((a, b) => a + b, 0) / rest.length;
  if (mean > 0 && best < mean * MATCH_DOMINANCE) return null;

  return { index: bestIdx, score: best };
}
