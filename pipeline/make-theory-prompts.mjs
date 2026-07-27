/**
 * make-theory-prompts.mjs — mavzu konspekti uchun prompt tayyorlaydi.
 *
 * Savol fabrikasi bilan bir xil ish tartibi: og'ir ish (mavzu metadatasi,
 * o'z savol bazangizdan tasdiqlangan izohlarni tanlash) LOKALDA bepul
 * bajariladi, LLM faqat matnni tartibga soladi.
 *
 * MUHIM: prompt mavzuning O'Z savollaridagi `explanation` matnlariga
 * asoslanadi. Ya'ni LLM yangi fakt O'YLAB TOPMAYDI — u sizning bazangizdagi
 * tasdiqlangan faktlarni konspekt shakliga keltiradi. Bu «gallyutsinatsiya»
 * xavfini keskin kamaytiradi.
 *
 * Ishlatish:
 *   node pipeline/make-theory-prompts.mjs --topic 0
 *   node pipeline/make-theory-prompts.mjs --category chqbt
 *   node pipeline/make-theory-prompts.mjs --all --limit 10
 *
 * Chiqish: pipeline/inbox/theory/topic-<id>.txt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// fileURLToPath SHART: yo'lda bo'shliq bor («Toifa Pro PLATFORMA»), xom
// url.pathname uni %20 qilib qoldiradi va fayl topilmaydi.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'pipeline', 'inbox', 'theory');
const DATA_DIR = path.join(ROOT, 'src', 'data');

const MAX_EXPLANATIONS = 30;   // promptga tushadigan izohlar soni
const MIN_EXPLANATION = 40;    // shundan qisqa izoh ma'lumot bermaydi

// ── Mavzular ──────────────────────────────────────────────────────────────
// mockData.js React/lucide import qiladi — Node'da import qilib bo'lmaydi,
// shuning uchun metadata matn sifatida o'qiladi.
function readTopics() {
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
// src/data/firestore_backup_<fan>_<sana>.json — har fanning eng YANGI
// zaxirasi olinadi (bir fanda bir nechta nusxa bo'lishi mumkin).
function loadQuestionsByTopic() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('firestore_backup_') && f.endsWith('.json'))
    .sort();                       // sana nomda — alifbo tartibi = vaqt tartibi

  const byTopic = new Map();
  const seenSubject = new Map();   // fan → ishlatilgan fayl (eng yangisi)

  for (const f of files) {
    const subject = f.replace(/^firestore_backup_/, '').replace(/_\d{4}-.*$/, '');
    seenSubject.set(subject, f);   // keyingi (yangiroq) fayl oldingisini almashtiradi
  }

  for (const f of seenSubject.values()) {
    let rows;
    try {
      rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
    } catch {
      continue;                    // buzuq zaxira — o'tkazib yuboriladi
    }
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (typeof r?.topicId !== 'number') continue;
      if (!byTopic.has(r.topicId)) byTopic.set(r.topicId, []);
      byTopic.get(r.topicId).push(r);
    }
  }
  return byTopic;
}

/** Faktga boy izohlarni oldinga qo'yadi: sana, raqam, qonun nomi bor matnlar. */
function pickExplanations(rows) {
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
  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_EXPLANATIONS).map(x => x.e);
}

// ── Prompt ────────────────────────────────────────────────────────────────
const buildPrompt = (topic, explanations) => `Sen — O'zbekiston malaka toifa (attestatsiya) imtihoniga tayyorlov materialini tuzayotgan metodistsan.

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
- Til: o'zbek tili, LOTIN alifbosi. Kirill harfi ishlatma.
- keyPoints: 5-8 ta. mustKnow: 4-8 ta. mistakes: 2-4 ta. mnemonics: 2-3 ta.
- Har bir mustKnow bandi ANIQ bo'lsin ("2002-yil 12-dekabr" — "yaqinda" emas).
- Izohlarda bo'lmagan faktni yozma. Ishonchsiz bo'lsa — o'sha bandni tashlab ket.
- Faqat JSON. Boshqa hech narsa.`;

// ── Ishga tushirish ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const topics = readTopics();
const byTopic = loadQuestionsByTopic();

let selected;
const topicArg = argVal('--topic');
const catArg = argVal('--category');
if (topicArg !== null) {
  selected = topics.filter(t => t.id === Number(topicArg));
} else if (catArg) {
  selected = topics.filter(t => t.category === catArg);
} else if (args.includes('--all')) {
  selected = topics;
} else {
  console.log(`Foydalanish:
  node pipeline/make-theory-prompts.mjs --topic 0
  node pipeline/make-theory-prompts.mjs --category chqbt
  node pipeline/make-theory-prompts.mjs --all [--limit N]

Mavzular: ${topics.length} ta, zaxirada savoli bor mavzular: ${byTopic.size} ta`);
  process.exit(0);
}

const limit = Number(argVal('--limit') || 0);
if (limit > 0) selected = selected.slice(0, limit);

fs.mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
let skipped = 0;
for (const topic of selected) {
  const rows = byTopic.get(topic.id) || [];
  const explanations = pickExplanations(rows);
  if (explanations.length < 5) {
    console.warn(`  ⚠ ${topic.id} «${topic.name}» — yetarli izoh yo'q (${explanations.length}), o'tkazildi`);
    skipped++;
    continue;
  }
  const file = path.join(OUT_DIR, `topic-${topic.id}.txt`);
  fs.writeFileSync(file, buildPrompt(topic, explanations), 'utf8');
  console.log(`  ✓ ${topic.id} «${topic.name}» — ${explanations.length} izoh → ${path.relative(ROOT, file)}`);
  written++;
}

console.log(`\nTayyor: ${written} ta prompt${skipped ? `, ${skipped} ta o'tkazildi` : ''}.`);
console.log(`Keyingi qadam: har bir .txt ni bepul web LLM'ga qo'ying, javobni`);
console.log(`shu papkaga topic-<id>.json nomi bilan saqlang, so'ng:`);
console.log(`  node pipeline/ingest-theory.mjs`);
