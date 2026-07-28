/**
 * theory.mjs — nazariy konspekt quvurining YAGONA haqiqat manbai.
 *
 * Uchta skript shu moduldan foydalanadi, shuning uchun prompt ham, tekshiruv
 * ham bitta joyda turadi:
 *   make-theory-prompts.mjs  — qo'lda (web LLM) uchun .txt yozadi
 *   run-theory-api.mjs       — API orqali to'liq avtomat
 *   ingest-theory.mjs        — tayyor .json larni qabul qiladi
 *
 * MUHIM: prompt mavzuning O'Z savollaridagi `explanation` matnlariga
 * asoslanadi — LLM yangi fakt O'YLAB TOPMAYDI, mavjud tasdiqlangan
 * faktlarni konspekt shakliga keltiradi.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// fileURLToPath SHART: yo'lda bo'shliq bor («Toifa Pro PLATFORMA»), xom
// url.pathname uni %20 qilib qoldiradi va fayl topilmaydi.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = path.join(ROOT, 'src', 'data');
export const INBOX_DIR = path.join(ROOT, 'pipeline', 'inbox', 'theory');

// Kontent FAN bo'yicha ajratilgan fayllarda saqlanadi (src/data/theory/<fan>.json).
// Nega bitta fayl emas: 128 mavzu bitta bo'lakda ~370 kB (gzip 113 kB) edi va
// u test boshlanishida HAR BIR foydalanuvchiga yuklanardi — shu jumladan
// hech qachon ochmaydigan 15 ta fanning matni ham. Ajratilgach, o'qituvchi
// faqat o'z fanini (~25 kB) yuklaydi.
export const TARGET = path.join(DATA_DIR, 'theory');

export const MAX_EXPLANATIONS = 30;   // promptga tushadigan izohlar soni
export const MIN_EXPLANATION = 40;    // shundan qisqa izoh ma'lumot bermaydi
export const MIN_NEEDED = 5;          // shundan kam izohda konspekt tuzilmaydi

// ── Mavzular ──────────────────────────────────────────────────────────────
// mockData.js React/lucide import qiladi — Node'da import qilib bo'lmaydi,
// shuning uchun metadata matn sifatida o'qiladi.
export function readTopics() {
  const src = fs.readFileSync(path.join(DATA_DIR, 'mockData.js'), 'utf8');
  const re = /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)"[\s\S]*?category:\s*'([a-z_]+)'(?:,\s*\n?\s*theoryHint:\s*"((?:[^"\\]|\\.)*)")?/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({
      id: Number(m[1]),
      name: m[2],
      category: m[3],
      hint: m[4] ? m[4].replace(/\\"/g, '"').replace(/\\n/g, ' ') : '',
    });
  }
  return out;
}

// ── Savollar (Firestore zaxiralaridan) ────────────────────────────────────
// src/data/firestore_backup_<fan>_<sana>.json
//
// ⚠️ BARCHA fayl o'qiladi, savol darajasida `__docId` bo'yicha birlashtiriladi
// (kechroq fayl oldingisini almashtiradi). Ilgari «har fandan faqat eng
// yangi fayl» olinardi va bu JIDDIY XATO edi: bir fanning ikki zaxirasi
// bir-birini ALMASHTIRMASLIGI, TO'LDIRISHI mumkin. Aynan shu sababli ingliz
// tilining 129-134 bo'limlaridagi 2094 savol ko'rinmay qolgan va «savol yo'q»
// degan noto'g'ri xulosa chiqqan edi.
export function loadQuestionsByTopic() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('firestore_backup_') && f.endsWith('.json'))
    .sort();                       // sana nomda — alifbo tartibi = vaqt tartibi

  const byKey = new Map();         // __docId (yoki matn) → savol

  for (const f of files) {
    let rows;
    try {
      rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    } catch {
      continue;                    // buzuq zaxira — o'tkazib yuboriladi
    }
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (typeof r?.topicId !== 'number') continue;
      // `id` maydoni yo'q, Firestore hujjat kaliti `__docId` da. U ham
      // bo'lmasa matnning o'zi kalit bo'ladi (takrorni oldini olish uchun).
      const key = r.__docId || `${r.topicId}::${(r.q || r.question || '').slice(0, 120)}`;
      byKey.set(key, r);           // kechroq fayl = tuzatilgan nusxa
    }
  }

  const byTopic = new Map();
  for (const r of byKey.values()) {
    if (!byTopic.has(r.topicId)) byTopic.set(r.topicId, []);
    byTopic.get(r.topicId).push(r);
  }
  return byTopic;
}

/** Faktga boy izohlarni oldinga qo'yadi: sana, raqam, qonun nomi bor matnlar. */
export function pickExplanations(rows, max = MAX_EXPLANATIONS) {
  const seen = new Set();
  const scored = [];
  for (const r of rows) {
    const e = (r.explanation || '').trim();
    if (e.length < MIN_EXPLANATION) continue;
    const key = e.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;   // yaqin-takror izohlar promptni to'ldirmasin
    seen.add(key);
    let score = 0;
    if (/\b\d{4}\b/.test(e)) score += 3;              // yil
    if (/\d+\s*(oy|yosh|kun|foiz|%)/i.test(e)) score += 2;
    if (/qonun|modda|konstitutsiya|nizom|standart|doktrina/i.test(e)) score += 2;
    score += Math.min(2, e.length / 160);
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, max).map(x => x.e);
}

// ── Konspekt tili ─────────────────────────────────────────────────────────
/**
 * Til fanlarida konspekt O'SHA TILDA bo'lishi shart.
 *
 * ⚠️ Bu shunchaki uslub emas: rus tili o'qituvchisining imtihonida rus
 * bog'lovchilari (потому что, следовательно) so'raladi. Konspekt o'zbekcha
 * yozilsa, unda o'zbek bog'lovchilari («chunki», «degani») misol bo'lib
 * qoladi — ya'ni material NOTO'G'RI bo'ladi. Aynan shu xato birinchi
 * yurishda chiqqan edi.
 *
 * Qoida `run-api.mjs` dagi `langDirective` bilan bir xil: FAQAT mutaxassislik
 * bo'limlari fan tilida, kasb standarti va pedagogik mahorat esa o'zbekcha
 * (real imtihonda ham shunday).
 */
const RU_SPECIALTY = new Set([121, 122, 123, 124, 125, 126]);   // rus_tili (127-128 = kasb/ped)
const EN_SPECIALTY = new Set([129, 130, 131, 132, 133, 134]);   // ingliz  (135-136 = kasb/ped)

export function topicLang(topic) {
  if (RU_SPECIALTY.has(topic.id)) return 'ru';
  if (EN_SPECIALTY.has(topic.id)) return 'en';
  return 'uz';
}

const LANG_RULES = {
  uz: `- Til: o'zbek tili, LOTIN alifbosi. Kirill harfi ishlatma.`,
  ru: `- ЯЗЫК: пиши ВЕСЬ конспект ТОЛЬКО НА РУССКОМ ЯЗЫКЕ (кириллицей). Не используй узбекский язык или латиницу. Все примеры (слова, союзы, предложения) должны быть РУССКИМИ — это конспект по русскому языку.`,
  en: `- LANGUAGE: write the ENTIRE summary in ENGLISH. Do not use Uzbek or Russian. All examples (words, structures, sentences) must be ENGLISH — this is a study guide for English.`,
};

// ── Prompt ────────────────────────────────────────────────────────────────
/**
 * @param {{id,name,hint}} topic
 * @param {string[]} explanations
 * @param {{ retryNote?: string }} [opts]  qayta urinishda tekshiruv izohi qo'shiladi
 */
export function buildTheoryPrompt(topic, explanations, opts = {}) {
  const retry = opts.retryNote
    ? `\n\n⚠️ OLDINGI URINISH RAD ETILDI. Aynan shu nuqsonlarni tuzat:\n${opts.retryNote}\n`
    : '';
  const lang = topicLang(topic);
  return `Sen — O'zbekiston malaka toifa (attestatsiya) imtihoniga tayyorlov materialini tuzayotgan metodistsan.

MAVZU: ${topic.name}
QISQACHA: ${topic.hint || '(yo\'q)'}

Quyida shu mavzu bo'yicha TASDIQLANGAN test izohlari berilgan. Konspektni FAQAT shu izohlardagi faktlarga tayanib tuz. Yangi fakt, sana yoki raqam QO'SHMA — izohlarda yo'q ma'lumotni yozma.

TASDIQLANGAN IZOHLAR:
${explanations.map((e, i) => `${i + 1}. ${e}`).join('\n')}

VAZIFA: quyidagi JSON'ni to'ldir va FAQAT JSON qaytar (izoh, matn, markdown belgilari bo'lmasin):

{
  "summary": "1-2 jumla: mavzu nima haqida va imtihonda nimaga urg'u beriladi",
  "keyPoints": [
    { "t": "Band sarlavhasi (3-6 so'z)", "d": "1-3 jumla izoh" }
  ],
  "mustKnow": ["Imtihonda so'raladigan aniq fakt: sana, raqam, muddat, ta'rif"],
  "mistakes": ["Tipik xato va uning to'g'ri shakli"],
  "mnemonics": ["Eslab qolish usuli"],
  "source": "Qaysi qonun/qo'llanma asosida",
  "updatedAt": "${new Date().toISOString().slice(0, 10)}"
}

QAT'IY TALABLAR:
${LANG_RULES[lang]}
- keyPoints: 5-8 ta. Har bandning "d" izohi 20-600 belgi (600 dan OSHMASIN — uzun bo'lsa ikkiga bo'l).
- mustKnow: 4-8 ta. mistakes: 2-4 ta. mnemonics: 2-3 ta.
- Har bir mustKnow bandi ANIQ va TO'LIQ bo'lsin: aniq raqam/sana bo'lsin yoki kamida bir jumlalik ta'rif bo'lsin ("2002-yil 12-dekabr" yoki "DTS ta'lim mazmuniga qo'yiladigan majburiy talablarni belgilaydi" — "muhim tushuncha" emas).
- summary 40-400 belgi.
- Izohlarda bo'lmagan faktni yozma. Ishonchsiz bo'lsa — o'sha bandni tashlab ket.
- Faqat JSON. Boshqa hech narsa.${retry}`;
}

// ── Tekshiruv ─────────────────────────────────────────────────────────────
// Nega qat'iy: bu matnni attestatsiyaga tayyorlanayotgan o'qituvchi o'qiydi.
// Tekshiruv AVTOMATIK — lekin mazmun to'g'riligini u KAFOLATLAMAYDI.
export const LIMITS = {
  summary: [40, 400],
  keyPoints: [4, 10],
  pointTitle: [3, 90],
  pointBody: [20, 600],
  mustKnow: [2, 12],
  mistakes: [0, 8],
  mnemonics: [0, 6],
};

const CYRILLIC = /[Ѐ-ӿ]/;
const CJK = /[　-鿿가-힯]/;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const inRange = (n, [lo, hi]) => n >= lo && n <= hi;

/**
 * Apostrof birxilligi. Loyihada TIK apostrof («o'qituvchi») ishlatiladi, LLM
 * esa tipografik variantlarni aralashtirib yuboradi («oʻqituvchi», «o‘quv»).
 * Bu faqat ko'rinish masalasi emas: `matchKeyPoint` trigram o'xshashligi
 * apostrof farqidan buziladi va savol↔band bog'lanishi ishlamay qoladi.
 */
const clean = (s) => String(s)
  .replace(/[ʼʻ‘’´`]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/ /g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

/**
 * @param {object} raw
 * @param {{ lang?: 'uz'|'ru'|'en' }} [opts]  konspekt tili (topicLang natijasi)
 * @returns {{ ok, errors: string[], warns: string[], value }}
 */
export function validateTheory(raw, opts = {}) {
  const lang = opts.lang || 'uz';
  const errors = [];
  const warns = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['JSON obyekt emas'], warns, value: null };
  }

  const summary = isStr(raw.summary) ? clean(raw.summary) : '';
  if (!inRange(summary.length, LIMITS.summary)) {
    errors.push(`summary uzunligi ${summary.length} — ${LIMITS.summary.join('-')} oralig'ida bo'lishi kerak`);
  }

  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];
  if (!inRange(keyPoints.length, LIMITS.keyPoints)) {
    errors.push(`keyPoints soni ${keyPoints.length} — ${LIMITS.keyPoints.join('-')} bo'lishi kerak`);
  }
  const points = [];
  keyPoints.forEach((p, i) => {
    const t = isStr(p?.t) ? clean(p.t) : '';
    const d = isStr(p?.d) ? clean(p.d) : '';
    if (!inRange(t.length, LIMITS.pointTitle)) errors.push(`keyPoints[${i}].t uzunligi ${t.length}`);
    if (!inRange(d.length, LIMITS.pointBody)) errors.push(`keyPoints[${i}].d uzunligi ${d.length}`);
    points.push({ t, d });
  });

  const arr = (v) => (Array.isArray(v) ? v.filter(isStr).map(clean) : []);
  const mustKnow = arr(raw.mustKnow);
  const mistakes = arr(raw.mistakes);
  const mnemonics = arr(raw.mnemonics);
  if (!inRange(mustKnow.length, LIMITS.mustKnow)) {
    errors.push(`mustKnow soni ${mustKnow.length} — ${LIMITS.mustKnow.join('-')} bo'lishi kerak`);
  }
  if (!inRange(mistakes.length, LIMITS.mistakes)) errors.push(`mistakes soni ${mistakes.length}`);
  if (!inRange(mnemonics.length, LIMITS.mnemonics)) errors.push(`mnemonics soni ${mnemonics.length}`);

  const all = [summary, ...points.flatMap(p => [p.t, p.d]), ...mustKnow, ...mistakes, ...mnemonics].join(' ');
  if (lang === 'ru') {
    // Ruscha konspektda kirill SHART — lotincha chiqsa, model tilni almashtirgan
    if (!CYRILLIC.test(all)) errors.push('rus tili konspekti kirill alifbosida bo\'lishi kerak');
  } else if (CYRILLIC.test(all)) {
    errors.push('kirill harfi topildi (matn lotin alifbosida bo\'lishi kerak)');
  }
  if (CJK.test(all)) errors.push('CJK belgisi topildi');
  if (/```|^\s*[#*]/m.test(all)) warns.push('markdown belgilari bor — tozalash kerak');

  // Aniqlik: mustKnow bandi mavhum bo'lmasin.
  // Raqamning O'ZI mezon emas — pedagogika/metodika mavzularida aniq fakt
  // ta'rif shaklida bo'ladi («DTS majburiy talablarni belgilaydi»). Shuning
  // uchun band FAQAT raqamsiz VA qisqa bo'lsa shubhali hisoblanadi.
  const VAGUE_LEN = 40;
  const vague = mustKnow.filter(x => !/\d/.test(x) && x.length < VAGUE_LEN);
  if (vague.length > Math.floor(mustKnow.length / 2)) {
    warns.push(`mustKnow bandlarining ko'pi mavhum (${vague.length}/${mustKnow.length}: raqamsiz va ${VAGUE_LEN} belgidan qisqa)`);
  }

  const source = isStr(raw.source) ? clean(raw.source) : null;
  if (!source) warns.push('source yo\'q — material manbasi ko\'rsatilmagan');

  const updatedAt = /^\d{4}-\d{2}-\d{2}$/.test(raw.updatedAt || '')
    ? raw.updatedAt
    : new Date().toISOString().slice(0, 10);

  return {
    ok: errors.length === 0,
    errors,
    warns,
    value: { summary, keyPoints: points, mustKnow, mistakes, mnemonics, source, updatedAt },
  };
}

// ── src/data/theory/<fan>.json ────────────────────────────────────────────
/** { [topicId]: category } — mockData'dan bir marta o'qiladi */
let catCache = null;
const categoryOf = (topicId) => {
  if (!catCache) {
    catCache = {};
    for (const t of readTopics()) catCache[t.id] = t.category;
  }
  return catCache[topicId] || 'other';
};

/** Barcha fan fayllarini bitta obyektga birlashtirib qaytaradi. */
export function readTheoryContent() {
  if (!fs.existsSync(TARGET)) return {};
  const out = {};
  for (const f of fs.readdirSync(TARGET).filter(x => x.endsWith('.json'))) {
    try {
      Object.assign(out, JSON.parse(fs.readFileSync(path.join(TARGET, f), 'utf8')));
    } catch { /* buzuq fayl — qolganlari o'qilaveradi */ }
  }
  return out;
}

/**
 * Kontentni fanlarga bo'lib yozadi. Kalitlar raqam tartibida (diff o'qishga
 * qulay), qator oxiri CRLF (loyihaning qolgan fayllari bilan bir xil).
 * @returns {number} yozilgan mavzular soni
 */
export function writeTheoryContent(obj) {
  const byCat = {};
  for (const id of Object.keys(obj).map(Number).sort((a, b) => a - b)) {
    const cat = categoryOf(id);
    (byCat[cat] = byCat[cat] || {})[id] = obj[id];
  }
  fs.mkdirSync(TARGET, { recursive: true });
  for (const [cat, data] of Object.entries(byCat)) {
    const file = path.join(TARGET, `${cat}.json`);
    fs.writeFileSync(file, (JSON.stringify(data, null, 2) + '\n').replace(/\n/g, '\r\n'), 'utf8');
  }
  return Object.keys(obj).length;
}
