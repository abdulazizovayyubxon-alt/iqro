/**
 * run-theory-api.mjs — nazariy konspektlarni TO'LIQ AVTOMAT generatsiya qiladi.
 *
 * make-theory-prompts + web LLM + ingest-theory zanjirining bir skriptdagi
 * ko'rinishi: prompt lokalda quriladi, API javob beradi, tekshiruvdan o'tsa
 * darhol src/data/theory/<fan>.json ga yoziladi (uzilsa ham yo'qolmaydi).
 *
 * .env:
 *   PIPELINE_API_BASE   https://api.cerebras.ai/v1
 *   PIPELINE_API_KEY    vergul bilan ajratilgan bir nechta kalit (rotatsiya)
 *   PIPELINE_API_MODEL  zaxira model nomi (--model bilan ustidan yoziladi)
 *
 * Ishlatish:
 *   node pipeline/run-theory-api.mjs --category tarix
 *   node pipeline/run-theory-api.mjs --all
 *   node pipeline/run-theory-api.mjs --topic 15 --redo
 *
 * Tekshiruvdan o'tmagan javob QAYTA so'raladi — nuqsonlar ro'yxati promptga
 * qo'shiladi. Uch urinishdan keyin ham ogohlantirish qolsa, eng yaxshi javob
 * olinadi va hisobotga belgilanadi (mutaxassis ko'rigi uchun ustuvor).
 */
import fs from 'fs';
import path from 'path';
import {
  ROOT, INBOX_DIR, TARGET, MIN_NEEDED,
  readTopics, loadQuestionsByTopic, pickExplanations, buildTheoryPrompt,
  validateTheory, readTheoryContent, writeTheoryContent, topicLang,
} from './lib/theory.mjs';

// ── .env ──────────────────────────────────────────────────────────────────
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const argVal = (name, dflt = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};

const BASE = process.env.PIPELINE_API_BASE;
const keys = (process.env.PIPELINE_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
// GLM-4.7 — bazadagi eng kuchli model; .env dagi PIPELINE_API_MODEL savol
// fabrikasi uchun sozlangan, konspekt uchun ataylab boshqasini olamiz.
const MODEL = argVal('--model') || 'zai-glm-4.7';
const REASONING = argVal('--reasoning');   // faqat berilsa yuboriladi

if (!BASE || keys.length === 0) {
  console.error('Xato: .env da PIPELINE_API_BASE va PIPELINE_API_KEY kerak.');
  process.exit(1);
}

const TRIES = Number(argVal('--tries', '3'));
const DELAY = Number(argVal('--delay', '800'));
const LIMIT = Number(argVal('--limit', '0'));
const REDO = args.includes('--redo');
const REPORT = path.join(ROOT, 'pipeline', 'theory_report.json');
const REJECT_DIR = path.join(INBOX_DIR, '_rejected');

// ── Mavzularni tanlash ────────────────────────────────────────────────────
const topics = readTopics();
const byTopic = loadQuestionsByTopic();
const existing = readTheoryContent();

let selected;
const topicArg = argVal('--topic');
const catArg = argVal('--category');
if (topicArg !== null) selected = topics.filter(t => t.id === Number(topicArg));
else if (catArg) selected = topics.filter(t => t.category === catArg);
else if (args.includes('--all')) selected = topics;
else {
  console.log(`Foydalanish:
  node pipeline/run-theory-api.mjs --category tarix
  node pipeline/run-theory-api.mjs --all [--limit N] [--redo]
  node pipeline/run-theory-api.mjs --topic 15

Mavzular: ${topics.length} ta | yozilgan: ${Object.keys(existing).length} ta
Fanlar: ${[...new Set(topics.map(t => t.category))].join(', ')}`);
  process.exit(0);
}

if (!REDO) selected = selected.filter(t => !existing[t.id]);
if (LIMIT > 0) selected = selected.slice(0, LIMIT);

if (selected.length === 0) {
  console.log('Generatsiya qilinadigan mavzu yo\'q (hammasi yozilgan — qayta yozish uchun --redo).');
  process.exit(0);
}

// ── API ───────────────────────────────────────────────────────────────────
let keyIdx = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Qat'iy wall-clock timeout — stalled soket await'ni BLOKLAMASLIGI uchun.
const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`wall-timeout:${label}:${ms}ms`)), ms))]);

// ⚠️ Cerebras 8192 tokenni PROMPT+JAVOB yig'indisiga qo'yadi (max_tokens'ni
// oshirish yordam bermaydi — sinab ko'rilgan). GLM-4.7 reasoning modeli va
// ~3-4 ming token o'ylashga ketadi, shuning uchun prompt kichik bo'lishi
// SHART: 30 ta izoh bilan javobga joy qolmay finish_reason=length chiqadi.
const MAX_TOTAL_TOKENS = 8192;

async function callLLM(prompt, tries = 5) {
  for (let k = 0; k < tries; k++) {
    const key = keys[keyIdx % keys.length];
    try {
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,          // konspekt — ijod emas, aniqlik kerak
          max_tokens: MAX_TOTAL_TOKENS,
          ...(REASONING ? { reasoning_effort: REASONING } : {}),
        }),
        signal: AbortSignal.timeout(90000),
      }), 100000, 'fetch');

      if (res.status === 429 || res.status >= 500) {
        keyIdx++;
        await sleep(keys.length > 1 ? 800 : 5000 * (k + 1));
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = await withTimeout(res.json(), 20000, 'json');
      const choice = data.choices?.[0];
      keyIdx++;
      if (!choice?.message?.content) { await sleep(1500 * (k + 1)); continue; }
      return { content: choice.message.content, finish: choice.finish_reason };
    } catch (e) {
      keyIdx++;
      if (k === tries - 1) throw e;
      await sleep(2000 * (k + 1));
    }
  }
  return { content: '', finish: 'empty' };
}

/** Reasoning modellar javob oldidan matn yozishi mumkin — birinchi { dan oxirgi } gacha. */
function extractJson(text) {
  const t = String(text).replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  const body = t.slice(a, b + 1);
  for (const cand of [body, body.replace(/,(\s*[\]}])/g, '$1')]) {
    try { return JSON.parse(cand); } catch { /* keyingi urinish */ }
  }
  return null;
}

// ── Yurish ────────────────────────────────────────────────────────────────
console.log(`▶ ${selected.length} mavzu | model ${MODEL} | ${keys.length} kalit${REDO ? ' | QAYTA YOZISH' : ''}`);

const content = { ...existing };
const report = fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, 'utf8')) : {};
let done = 0, failed = 0, warned = 0;

/**
 * Prompt byudjeti: izohlar soni VA umumiy belgisi cheklanadi. Urinish
 * o'sgani sari kichrayadi — javob kesilgan bo'lsa keyingi urinishda
 * o'ylashga ko'proq joy qoladi.
 */
const EX_BUDGET = [12, 8, 5];
const EX_MAX_CHARS = 4200;
function fitExplanations(rows, attemptIdx) {
  const n = EX_BUDGET[Math.min(attemptIdx, EX_BUDGET.length - 1)];
  const list = pickExplanations(rows, n);
  const out = [];
  let total = 0;
  for (const e of list) {
    if (out.length >= MIN_NEEDED && total + e.length > EX_MAX_CHARS) break;
    out.push(e);
    total += e.length;
  }
  return out;
}

/**
 * Bir xil NOMLI bo'limlarning savollarini birlashtiradi.
 *
 * «Kasb standarti» va «Pedagogik mahorat» — barcha fanda AYNI hujjat
 * (umumiy kasb standarti, umumiy pedagogika). Ba'zi fanda bu bo'limga
 * savol yozilmagan (mas. biologiya 85, geografiya 95). Boshqa fandagi
 * xuddi shu bo'lim izohlari mazmunan bir xil manbadan — shuning uchun
 * ularni ishlatish to'g'ri. Fanga xos bo'limlarda bu hech qachon
 * ishlamaydi, chunki nomlar takrorlanmaydi.
 */
const siblingRows = (topic) => topics
  .filter(t => t.id !== topic.id && t.name === topic.name)
  .flatMap(t => byTopic.get(t.id) || []);

for (const topic of selected) {
  let rows = byTopic.get(topic.id) || [];
  let pooled = false;
  if (pickExplanations(rows).length < MIN_NEEDED) {
    const sib = siblingRows(topic);
    if (sib.length) { rows = rows.concat(sib); pooled = true; }
  }
  const available = pickExplanations(rows);
  const label = `${topic.id} «${topic.name}» [${topic.category}]${pooled ? ' (umumiy bo\'lim izohlari)' : ''}`;

  if (available.length < MIN_NEEDED) {
    console.log(`⊘ ${label} — izoh yetarli emas (${available.length}/${MIN_NEEDED})`);
    report[topic.id] = { status: 'skipped', reason: `izoh ${available.length}`, name: topic.name };
    failed++;
    continue;
  }

  let best = null;         // ogohlantirishi eng kam yaroqli javob
  let lastErrors = null;

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const prompt = buildTheoryPrompt(topic, fitExplanations(rows, attempt), {
      retryNote: lastErrors ? lastErrors.map(e => `- ${e}`).join('\n') : null,
    });
    let out;
    try {
      out = await callLLM(prompt);
    } catch (e) {
      lastErrors = [`API xato: ${String(e.message).slice(0, 100)}`];
      continue;
    }
    const parsed = extractJson(out.content);
    if (!parsed) {
      lastErrors = [out.finish === 'length'
        ? 'Javob kesildi — qisqaroq yoz.'
        : 'Javob JSON emas edi — FAQAT JSON qaytar.'];
      fs.mkdirSync(REJECT_DIR, { recursive: true });
      fs.writeFileSync(path.join(REJECT_DIR, `topic-${topic.id}.txt`), out.content || '(bo\'sh)', 'utf8');
      continue;
    }
    const { ok, errors, warns, value } = validateTheory(parsed, { lang: topicLang(topic) });
    if (!ok) { lastErrors = errors; continue; }
    if (!best || warns.length < best.warns.length) best = { value, warns };
    if (warns.length === 0) break;
    lastErrors = warns;
  }

  if (!best) {
    console.log(`✗ ${label} — ${TRIES} urinish, hammasi rad: ${(lastErrors || []).join('; ').slice(0, 120)}`);
    report[topic.id] = { status: 'failed', reason: (lastErrors || []).join('; '), name: topic.name };
    failed++;
    await sleep(DELAY);
    continue;
  }

  // ⚠️ Har yozuvdan OLDIN fayl QAYTA o'qiladi. Sabab: bir vaqtda ikkita
  // generatsiya yurgizilsa (mas. bitta fon jarayoni + bitta qo'lda), har biri
  // o'z xotiradagi nusxasini butunlay yozib yuborardi va ikkinchisining
  // natijasi YO'QOLARDI. Aynan shu sodir bo'lgan: tuzatilgan ruscha konspekt
  // eski o'zbekcha nusxa bilan almashib qolgan edi.
  content[topic.id] = best.value;
  writeTheoryContent({ ...readTheoryContent(), ...content });
  report[topic.id] = {
    status: best.warns.length ? 'ok-warn' : 'ok',
    name: topic.name,
    category: topic.category,
    warns: best.warns,
    points: best.value.keyPoints.length,
    facts: best.value.mustKnow.length,
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
  if (best.warns.length) warned++;
  done++;
  console.log(`✓ ${label} — ${best.value.keyPoints.length} band, ${best.value.mustKnow.length} fakt`
    + (best.warns.length ? `  ⚠ ${best.warns.join('; ').slice(0, 80)}` : '')
    + `   (${done}/${selected.length})`);
  await sleep(DELAY);
}

console.log(`\n✓ Tayyor: ${done} ta yozildi (${warned} tasi ogohlantirish bilan), ${failed} ta o'tkazildi.`);
console.log(`  ${path.relative(ROOT, TARGET)} — jami ${Object.keys(content).length} mavzu`);
console.log(`  hisobot: ${path.relative(ROOT, REPORT)}`);
console.log('⚠ Avtomatik tekshiruv SHAKLNI tekshiradi, TO\'G\'RILIKNI emas — mutaxassis ko\'rigi shart.');
