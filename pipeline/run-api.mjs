// TO'LIQ AVTOMAT generatsiya — BEPUL OpenAI-mos API orqali (Claude limitiga TEGMAYDI).
// "Qo'y-da-ket": maqsadga yetguncha o'zi aylanadi, xatoda qayta uriniadi, davom ettiriladi.
//
// .env (yoki muhit o'zgaruvchilari):
//   PIPELINE_API_BASE   mas: https://openrouter.ai/api/v1   (yoki https://api.groq.com/openai/v1)
//   PIPELINE_API_KEY    bepul kalitingiz
//   PIPELINE_API_MODEL  mas: google/gemini-2.0-flash-exp:free  (yoki llama-3.3-70b-versatile)
//
//   node pipeline/run-api.mjs --subject biologiya --target 2000 --per 15

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { resolveSubject, SHARED_PED } from "./lib/subjects.mjs";
import { chunkSpec } from "./lib/chunk.mjs";
import { buildGenPrompt } from "./lib/prompt.mjs";
import { validateQuestion } from "./lib/schema.mjs";
import { buildIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";
import { shuffleOptions } from "./lib/shuffle.mjs";
import { loadMany } from "./lib/corpus.mjs";

// --- .env o'qish ---
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const BASE = process.env.PIPELINE_API_BASE, KEY = process.env.PIPELINE_API_KEY, MODEL = process.env.PIPELINE_API_MODEL;
if (!BASE || !KEY || !MODEL) {
  console.error("Xato: .env da PIPELINE_API_BASE, PIPELINE_API_KEY, PIPELINE_API_MODEL kerak.");
  console.error("Bepul kalit: openrouter.ai yoki console.groq.com (UZ'da ochiladi).");
  process.exit(1);
}

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const slug = A("--subject");
const per = parseInt(A("--per", "15"), 10);
const target = parseInt(A("--target", "2000"), 10);
const delayMs = parseInt(A("--delay", "1500"), 10);
const sourceFile = A("--source");       // darslik matni (ixtiyoriy) — mutaxassislik bo'laklari shu fayldan
const goldPath = A("--gold");           // oltin korpus (papka/fayl) — dedup langari + few-shot namuna
const fresh = args.includes("--fresh"); // padded sub.corpus'ni e'tiborsiz qoldir (faqat gold+yangi bilan dedup)
const specialOnly = args.includes("--special-only"); // FAQAT matching/sequence yig'adi (format to'ldirish rejimi)
if (!slug) { console.error("--subject kerak"); process.exit(1); }
// Groq bepul TPM (~12k token/daqiqa) cheklovi: max_tokens'ni per'ga moslab kichik tutamiz (429/bo'sh javob oldini olish)
const MAXTOK = Math.max(3000, Math.min(8000, per * 380 + 1500)); // reasoning modellar uchun zaxira ham
const REASONING = process.env.PIPELINE_REASONING || ""; // gpt-oss kabi reasoning modellar: "low"/"medium"/"high"

const sub = resolveSubject(slug);
if (!sub.specExists && sub.specPdf && fs.existsSync(sub.specPdf)) execFileSync("pdftotext", ["-enc", "UTF-8", sub.specPdf, sub.spec]);

// Bo'laklar: mutaxassislik manbasi (darslik bo'lsa o'sha, aks holda spec) + umumiy ped (kasb/pedagogika)
const mutSource = sourceFile && fs.existsSync(sourceFile) ? sourceFile : sub.spec;
let chunks = chunkSpec(fs.readFileSync(mutSource, "utf8"), { maxChars: 2400 });
if (fs.existsSync(SHARED_PED.spec)) chunks = chunks.concat(chunkSpec(fs.readFileSync(SHARED_PED.spec, "utf8"), { maxChars: 2400 }).filter((c) => c.block !== "mutaxassislik"));

// Dedup indeksi: oltin korpus + mavjud korpus + fan/<slug> dagi avvalgilar (DAVOM ETTIRISH uchun)
const subjDir = path.join("fan", slug);
const progressPath = path.join(subjDir, "gen_api_progress.json");

// Mavjud progress faylidan DAVOM ETTIRISH: accepted[] ga yuklaymiz (yo'qolmasin)
const existPaths = fresh ? [] : [...sub.corpus];
if (goldPath && fs.existsSync(goldPath)) existPaths.unshift(goldPath);
if (fs.existsSync(subjDir)) for (const f of fs.readdirSync(subjDir).filter((x) => /^(gen|_clean|_namuna)/.test(x) && x.endsWith(".json") && !x.includes("gen_api_progress"))) existPaths.push(path.join(subjDir, f));
const existing = await loadMany(existPaths);
const index = buildIndex(existing);

// Few-shot langar — ENG yaxshi etalon: RASMIY NAMUNA (fan/<fan>_savollar.json = real demotest savollari).
// Parser rasm/matnga bog'liq savollarni oxiriga surgan → boshidan teng oraliqda 5 ta olamiz (toza, o'z-o'zicha yetarli).
let anchors = [];
const namunaJson = (sub.namuna || []).filter((p) => /\.json$/i.test(p) && fs.existsSync(p));
if (namunaJson.length) {
  const nm = (await loadMany(namunaJson)).filter((q) => (q.question || q.q) && q.options);
  const step = Math.max(1, Math.floor(nm.length / 5));
  for (let i = 0; i < nm.length && anchors.length < 5; i += step) anchors.push(nm[i]);
}
// NAMUNA bo'lmasa — oltin korpusdan format xilma-xilligi bilan langar (zaxira)
if (!anchors.length && goldPath && fs.existsSync(goldPath)) {
  const gold = await loadMany([goldPath]);
  const byType = { single: [], matching: [], sequence: [], combo: [] };
  for (const q of gold) (byType[q.qtype] || byType.single).push(q);
  anchors = [...byType.single.slice(0, 2), ...byType.combo.slice(0, 1), ...byType.matching.slice(0, 1), ...byType.sequence.slice(0, 1)].filter(Boolean);
}

const titles = existing.map((q) => q.question ?? q.q ?? "").filter(Boolean);
const sampleTitles = () => { const out = []; const step = Math.max(1, Math.floor(titles.length / 25)); for (let i = 0; i < titles.length && out.length < 25; i += step) out.push(titles[i]); return out; };

function extract(text) {
  let t = String(text).replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  const body = a >= 0 && b > a ? t.slice(a, b + 1) : t;
  // 1) butun massivni parse (oxirgi vergulni ham tuzatib)
  for (const cand of [body, body.replace(/,(\s*[\]}])/g, "$1")]) {
    try { const j = JSON.parse(cand); if (Array.isArray(j)) return j; } catch {}
  }
  // 2) qutqarish: har bir top-level {...} obyektni alohida ajratib parse qilamiz
  //    (kesilgan/buzuq massivdan ham yaroqli obyektlarni oladi)
  const objs = [];
  let depth = 0, start = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (t[i] === "}") { depth--; if (depth === 0 && start >= 0) {
      try { objs.push(JSON.parse(t.slice(start, i + 1))); } catch {}
      start = -1;
    } }
  }
  return objs.length ? objs : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callLLM(prompt, tries = 5) {
  for (let k = 0; k < tries; k++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.8, max_tokens: MAXTOK, ...(REASONING ? { reasoning_effort: REASONING } : {}) }),
        signal: AbortSignal.timeout(60000),
      });
      if (res.status === 429 || res.status >= 500) { // tezlik/server limiti — Retry-After ni hisobga olib kutamiz
        const ra = parseFloat(res.headers.get("retry-after")) || (5 * (k + 1));
        console.log(`[Limit/Error ${res.status}, kutish: ${ra}s, urinish ${k + 1}/${tries}]`);
        await sleep(Math.min(ra * 1000 + 1000, 120000));
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) { 
        console.log(`[Bo'sh javob, urinish ${k + 1}/${tries}]`);
        await sleep(2000 * (k + 1)); 
        continue; 
      }
      return content;
    } catch (e) { 
      console.log(`[API xato: ${e.message}, urinish ${k + 1}/${tries}]`);
      if (k === tries - 1) throw e; 
      await sleep(3000 * (k + 1)); 
    }
  }
  return "";
}


// Mavjud progress faylini yuklash (davom ettirish uchun)
let accepted = [];
if (!fresh && fs.existsSync(progressPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    if (Array.isArray(prev) && prev.length > 0) {
      accepted = prev;
      // Avvalgilarni ham dedup indeksiga qo'shamiz
      for (const q of accepted) addToIndex(index, q);
      console.log(`  ↩ Davom ettirish: ${accepted.length} ta savol yuklandi`);
    }
  } catch { /* yuklash xatosi — yangidan boshlaymiz */ }
}
const already = 0; // accepted[] ga kiritildi, already endi 0
let dup = 0, bad = 0, pass = 0, nSpecial = 0, specialSkip = 0;
const SPECIAL_CAP = Math.ceil(target * 0.20); // matching+sequence ko'pi bilan ~20% (qolgani ishonchli single)
// "Maxsus" = faqat matching/sequence (model ro'yxat/tartibni to'qishi xavfli). combo esa 1 javobli,
// namuna uslubining o'zagi — single kabi cheklovsiz oqadi.
const isSpecial = (qt) => qt === "matching" || qt === "sequence";
// Mavjud nSpecial sanagichini tiklaymiz
for (const q of accepted) if (isSpecial(q.qtype)) nSpecial++;
console.log(`▶ ${sub.name}: maqsad ${target} (hozir ${accepted.length}), ${chunks.length} bo'lim, model ${MODEL}${specialOnly ? " | FAQAT matching/sequence" : ""}`);
const langarSrc = namunaJson.length ? `namuna: ${namunaJson.map((p) => path.basename(p)).join(", ")}` : (goldPath ? "gold (zaxira)" : "YO'Q");
console.log(`   manba: ${mutSource} | few-shot langar: ${anchors.length} ta [${langarSrc}] | dedup baza: ${existing.length}${goldPath ? " (+gold)" : ""}${fresh ? " | FRESH" : ""}`);

// Maqsadga yetguncha bo'limlar bo'ylab AYLANAMIZ (har aylanishda har bo'limdan yana so'raymiz)
outer:
while (already + accepted.length < target) {
  pass++;
  for (let i = 0; i < chunks.length; i++) {
    if (already + accepted.length >= target) break outer;
    const c = chunks[i];
    process.stdout.write(`[aylanish ${pass} · ${i + 1}/${chunks.length}] ${c.block} "${c.title.slice(0, 32)}" ... `);
    try {
      let prompt = buildGenPrompt({ subjectName: sub.name, topicTitle: c.title, specChunk: c.text.trim(), anchors, existingTitles: sampleTitles(), count: per, block: c.block });
      if (specialOnly) prompt += `\n\n⚠️ MAXSUS REJIM: bu so'rovda FAQAT "matching" va "sequence" formatdagi savollar yoz — "single" YOZMA!
Taxminan yarmi matching, yarmi sequence. FAQAT manba matnida ANIQ ro'yxat/juftlik/tartib bo'lsa tuz — to'qima.
Agar bu bo'lakda mos ro'yxat/tartib bo'lmasa, KAM savol qaytar (bo'sh massiv ham mumkin).`;
      const rawContent = await callLLM(prompt);
      const out = extract(rawContent);
      if (!out) { console.log("parse xato"); try { fs.writeFileSync("pipeline/_lastraw.txt", rawContent); } catch {} continue; }
      let ok = 0;
      for (const q0 of out) {
        q0.subject = q0.subject || sub.name;
        const qt = q0.qtype || "single";
        if (validateQuestion(q0).length) { bad++; continue; }
        if (specialOnly && !isSpecial(qt)) { specialSkip++; continue; } // maxsus rejim: faqat matching/sequence
        if (!specialOnly && isSpecial(qt) && nSpecial >= SPECIAL_CAP) { specialSkip++; continue; } // format balansi (single+combo ustun)
        if (findDuplicate(index, q0)) { dup++; continue; }
        const q = shuffleOptions(q0);
        accepted.push(q); addToIndex(index, q); ok++;
        if (isSpecial(qt)) nSpecial++;
        titles.push(q.question);
      }
      console.log(`+${ok}  (jami ${already + accepted.length}/${target})`);
    } catch (e) { console.log("XATO:", String(e.message).slice(0, 80)); }
    // Har bo'limdan keyin saqlaymiz (uzilsa ham yo'qolmaydi)
    if (accepted.length && accepted.length % 1 === 0) saveProgress();
    await sleep(delayMs);
  }
  if (pass > 50) break; // cheksiz aylanishdan himoya
}

function saveProgress() {
  fs.mkdirSync(subjDir, { recursive: true });
  accepted.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(progressPath, JSON.stringify(accepted, null, 2), "utf8");
}
saveProgress();
const fmt = accepted.reduce((a, q) => { a[q.qtype] = (a[q.qtype] || 0) + 1; return a; }, {});
console.log(`\n✓ Jami: ${accepted.length}/${target} (single ${fmt.single || 0}, matching ${fmt.matching || 0}, sequence ${fmt.sequence || 0}) | takror: ${dup} | yaroqsiz: ${bad} | format-cap skip: ${specialSkip}`);
console.log(`   → ${progressPath}`);
