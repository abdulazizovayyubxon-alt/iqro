// IMLO-TUZATISH PASSI — generatsiya qilingan savollarning faqat O'ZBEK IMLO/terish xatolarini tuzatadi.
// Mazmun, struktura, variant tartibi, qaysi javob to'g'riligi O'ZGARMAYDI (answer/qtype/difficulty saqlanadi —
// modelga ham yuborilmaydi). XAVFSIZ: tuzatilgan savol strukturasi buzilsa yoki validatsiyadan o'tmasa,
// ASLINI saqlaydi. Bir xil API (Cerebras zai-glm, 9 kalit rotatsiyasi).
//
//   node pipeline/fix-imlo.mjs --in fan/_glm_test.json [--out <fayl>] [--batch 6] [--delay 400]
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { hasCyrillic } from "./lib/normalize.mjs";

// --- .env (run-api kabi: vergulli ko'p kalit) ---
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean);
let keyIdx = 0;
if (!BASE || !MODEL || !keys.length) { console.error("Xato: .env da PIPELINE_API_BASE/KEY/MODEL kerak"); process.exit(1); }

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const inPath = A("--in");
const outPath = A("--out", inPath);
const batchSize = parseInt(A("--batch", "4"), 10);
const delayMs = parseInt(A("--delay", "400"), 10);
if (!inPath || !fs.existsSync(inPath)) { console.error("--in <fayl> kerak (mavjud)"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LETTERS = ["A", "B", "C", "D"];

function extractArr(text) {
  let t = String(text).replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  const body = a >= 0 && b > a ? t.slice(a, b + 1) : t;
  for (const cand of [body, body.replace(/,(\s*[\]}])/g, "$1")]) {
    try { const j = JSON.parse(cand); if (Array.isArray(j)) return j; } catch {}
  }
  return null;
}

// Qat'iy wall-clock timeout — soket osilib qolsa ham await BLOKLANMAYDI (71-daqiqalik osilishning oldini oladi).
const withTimeout = (p, ms, label) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout:${label}:${ms}ms`)), ms)),
]);

async function callLLM(prompt, tries = 3) {
  for (let k = 0; k < tries; k++) {
    const key = keys[keyIdx % keys.length];
    const ac = new AbortController();
    const killer = setTimeout(() => ac.abort(), 50000); // 2-himoya: AbortSignal ishlamasa ham
    try {
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: Math.max(20000, batchSize * 1500 + 6000) }),
        signal: ac.signal,
      }), 55000, "fetch");
      if (res.status === 429 || res.status >= 500 || !res.ok) { keyIdx++; await sleep(1200); continue; }
      const data = await withTimeout(res.json(), 15000, "json"); // tana o'qishi ham bloklamasin
      const c = data.choices?.[0]?.message?.content;
      if (!c) { keyIdx++; await sleep(800); continue; }
      return c;
    } catch (e) { keyIdx++; await sleep(1200); } // har xato (timeout ham) — kalit almashtirib, cheklangan qayta
    finally { clearTimeout(killer); }
  }
  return ""; // hech qachon throw qilmaydi — chaqiruvchi aslini saqlaydi
}

const FIX_PROMPT = (payload) => `Sen o'zbek tili (lotin) muharririsisan. Quyida JSON test savollari berilgan.
VAZIFANG: FAQAT o'zbek IMLO va TERISH xatolarini tuzat (mas: "Zaxita"→"Zaxira", "juqlashtiring"→"moslashtiring",
"ularnga"→"ularga", "marifat"→"ma'rifat", "hozonng"→"hozir"). Tutuq belgisi (') va o'/g'/sh/ch ni to'g'rila.

QAT'IY TAQIQLAR:
- Ma'noni, savol mazmunini, variantlar TARTIBINI va qaysi javob to'g'riligini O'ZGARTIRMA.
- Variant sonini (4 ta: A,B,C,D) o'zgartirma. Bo'sh qoldirma.
- combo/matching/sequence dagi belgilarni (a, b, d, e yoki 1-A, 2-B yoki 1,2,3,4) AYNAN saqlab qol.
- Yangi gap qo'shma, qisqartirma, qayta yozma. Faqat NOTO'G'RI YOZILGAN so'zni to'g'rila.
- Krill harf ARALASHTIRMA — hammasi lotin bo'lsin.

Har obyektni AYNAN o'sha "i" raqami va o'sha maydonlar (question, options{A,B,C,D}, explanation, mnemonic) bilan qaytar.
CHIQISH: FAQAT to'g'ri JSON massiv. Markdown, izoh YO'Q.

${JSON.stringify(payload, null, 1)}`;

const all = JSON.parse(fs.readFileSync(inPath, "utf8"));
let fixedCount = 0, keptCount = 0, batchFail = 0;

// faqat tuzatiladigan maydonlarni yuboramiz (answer/qtype/difficulty modelga BERILMAYDI — saqlanadi)
function payloadOf(q, i) {
  return { i, question: q.question, options: q.options, explanation: q.explanation, mnemonic: q.mnemonic || "" };
}

// tuzatilgan obyektni asl bilan birlashtirish — faqat struktura saqlangan bo'lsa
function mergeIfSafe(orig, fix) {
  if (!fix || typeof fix !== "object") return null;
  const opts = fix.options || {};
  if (!LETTERS.every((L) => opts[L] && String(opts[L]).trim())) return null; // 4 variant to'liq
  const merged = { ...orig, question: String(fix.question || "").trim(), options: { A: String(opts.A).trim(), B: String(opts.B).trim(), C: String(opts.C).trim(), D: String(opts.D).trim() }, explanation: String(fix.explanation || "").trim(), mnemonic: String(fix.mnemonic || orig.mnemonic || "").trim() };
  if ([merged.question, merged.options.A, merged.options.B, merged.options.C, merged.options.D, merged.explanation].some(hasCyrillic)) return null; // krill kirib qolmasin
  if (validateQuestion(merged).length) return null; // darvozadan o'tsin (answer/qtype asldan)
  return merged;
}

for (let start = 0; start < all.length; start += batchSize) {
  const slice = all.slice(start, start + batchSize);
  const payload = slice.map((q, j) => payloadOf(q, j));
  process.stdout.write(`[${start + 1}-${Math.min(start + batchSize, all.length)}/${all.length}] ... `);
  let fixes = null;
  try { fixes = extractArr(await callLLM(FIX_PROMPT(payload))); } catch (e) { /* keyin asl saqlanadi */ }
  if (!fixes) {
    // Batch kesildi (reasoning token limiti) — har savolni ALOHIDA (1 talik) urinib ko'ramiz, token sig'adi
    batchFail++;
    let rec = 0;
    for (let j = 0; j < slice.length; j++) {
      let one = null;
      try { one = extractArr(await callLLM(FIX_PROMPT([payloadOf(slice[j], 0)]))); } catch {}
      const merged = one && one.length ? mergeIfSafe(slice[j], one[0]) : null;
      if (merged) { all[start + j] = merged; fixedCount++; rec++; } else keptCount++;
      await sleep(delayMs);
    }
    console.log(`batch kesildi → 1talik: ${rec}/${slice.length} tuzatildi`);
    continue;
  }
  const byI = new Map(fixes.filter((f) => f && Number.isInteger(f.i)).map((f) => [f.i, f]));
  let okHere = 0;
  slice.forEach((orig, j) => {
    const merged = mergeIfSafe(orig, byI.get(j));
    if (merged) { all[start + j] = merged; fixedCount++; okHere++; }
    else keptCount++;
  });
  console.log(`tuzatildi ${okHere}/${slice.length}`);
  await sleep(delayMs);
}

fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
console.log(`\n✓ Imlo-fix tugadi: ${fixedCount} tuzatildi, ${keptCount} asl saqlandi (batch parse xato: ${batchFail})`);
console.log(`   → ${outPath}`);
