// Audit'da darslik-tasdiqlangan wrong-key nomzodlarni MUSTAQIL ikkinchi tekshiruvdan o'tkazib tuzatadi.
// Faqat ikkinchi hakam HAM xato desa: correct indeksini + izohni (yangi javobga mos) almashtiradi.
//   node pipeline/_chqbt_applyfix.mjs            (sinov: o'zgarishlarni ko'rsatadi, BANK O'ZGARMAYDI)
//   node pipeline/_chqbt_applyfix.mjs --write    (bankka yozadi)
import fs from "fs";
import { hasCyrillic } from "./lib/normalize.mjs";
if (fs.existsSync(".env")) for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
const WRITE = process.argv.includes("--write");
const L = ["A", "B", "C", "D"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("t:" + l)), ms))]);
const hashQ = s => String(s).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
const stripL = s => String(s).replace(/^\s*[A-D]\)\s*/, "").trim();

// darslik grounding
const STOPW = new Set("uchun bilan bo'lgan ushbu ularning hamda shuning bo'lib bo'ladi qilish kerak orqali asosan bo'yicha mumkin hisoblanadi quyidagi amalga uning bo'lishi bo'ladigan birlik qaysi qanday".split(" "));
const gnorm = s => String(s).toLowerCase().replace(/[`‘’]/g, "'");
const gtoks = s => (gnorm(s).match(/[a-z']{5,}/g) || []).filter(w => !STOPW.has(w));
const bookText = fs.existsSync("scratch/chqbt_book.txt") ? fs.readFileSync("scratch/chqbt_book.txt", "utf8").replace(/[ \t]+/g, " ") : "";
const bookWins = []; for (let i = 0; bookText && i < bookText.length; i += 1000) bookWins.push(bookText.slice(i, i + 1300).trim());
const winSets = bookWins.map(w => new Set(gtoks(w)));
function grounding(text) { if (!bookWins.length) return ""; const qt = [...new Set(gtoks(text))]; const top = winSets.map((s, idx) => { let n = 0; for (const t of qt) if (s.has(t)) n++; return [n, idx]; }).sort((a, b) => b[0] - a[0]).slice(0, 2).filter(([n]) => n >= 4); return top.length ? top.map(([, idx]) => bookWins[idx]).join("\n[...]\n") : ""; }

async function call(prompt) {
  for (let k = 0; k < 4; k++) {
    try { const key = keys[keyIdx++ % keys.length];
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 8000 }), signal: AbortSignal.timeout(60000) }), 70000, "f");
      if (!res.ok) { await sleep(700); continue; }
      const d = await res.json(); const c = d.choices?.[0]?.message?.content; if (c) return c;
    } catch { await sleep(900 * (k + 1)); }
  }
  return "";
}
const parse = t => { const m = String(t).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1")); } catch { return null; } };
function cleanExpl(ex) { let s = String(ex || "").trim(); s = s.replace(/^\s*(to['’`]?\s?g['’`]?ri\s+javob|javob|[A-D]\s+variant\w*)\b[^.,]*[,.]\s*/i, "").replace(/\b(to['’`]?\s?g['’`]?ri\s+javob|javob|variant)\s*[—:\-]?\s*[A-D]\b\.?/gi, "").replace(/\s*\(([A-D])\)\s*/g, " ").replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").replace(/^[\s.,;:—-]+/, "").trim(); if (s) s = s[0].toUpperCase() + s.slice(1); return s; }

function fixPrompt(q) {
  const opts = q.opts.map((o, i) => `${L[i]}) ${stripL(o)}`).join("\n");
  const g = grounding(q.q + " " + stripL(q.opts[q.correct]));
  return `Siz CHQBT bo'yicha qattiqqo'l ekspert. Quyidagi test savolini MANBAGA tayanib hal qiling.
${g ? "DARSLIK MANBASI (faqat shunga tayan):\n" + g + "\n" : ""}
SAVOL: ${q.q}
${opts}

Qaysi variant FAKTIK to'g'ri? Manbaga ko'ra aniqlang. Izohni MAZMUNAN yozing (variant harfini izohda yozma).
FAQAT JSON: {"correct":"A|B|C|D","explanation":"<2-3 jumla, mazmunan>"}`;
}

async function main() {
  const bank = JSON.parse(fs.readFileSync("chqbt_app_import.json", "utf8"));
  const rep = JSON.parse(fs.readFileSync("pipeline/_chqbt_audit_report.json", "utf8"));
  const cands = bank.filter(q => { const r = rep[hashQ(q.q)]; return r && /xato/i.test(r.verdict) && r.grounded && /^[A-D]$/.test(r.suggested) && L.indexOf(r.suggested) !== q.correct; });
  console.log(`Darslik-tasdiqlangan wrong-key nomzod: ${cands.length} | ikkinchi mustaqil tekshiruv...`);

  const changes = [];
  let idx = 0;
  async function worker() {
    while (idx < cands.length) {
      const q = cands[idx++];
      const v = parse(await call(fixPrompt(q)));
      if (!v || !/^[A-D]$/.test(v.correct || "")) continue;
      const newIdx = L.indexOf(v.correct);
      if (newIdx === q.correct) continue;          // ikkinchi hakam asl bilan rozi — TEGMAYMIZ
      const audit = rep[hashQ(q.q)];
      if (v.correct !== audit.suggested) continue;  // ikki hakam BIR XIL javobga kelmasa — ehtiyot, tegmaymiz
      const ex = cleanExpl(v.explanation);
      if (!ex || ex.length < 15 || hasCyrillic(ex) || /\b[A-D]\)/.test(ex) || /(javob|variant)\s+[A-D]\b/i.test(ex)) continue;
      changes.push({ q, oldIdx: q.correct, newIdx, ex });
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));

  console.log(`\n=== Ikki hakam ROZI bo'lgan tuzatishlar: ${changes.length} / ${cands.length} ===`);
  for (const c of changes.slice(0, 60)) {
    console.log(`\n[tid${c.q.topicId}] ${c.q.q.slice(0, 70)}`);
    console.log(`   ${L[c.oldIdx]}→${L[c.newIdx]}: "${stripL(c.q.opts[c.oldIdx]).slice(0, 38)}" → "${stripL(c.q.opts[c.newIdx]).slice(0, 38)}"`);
  }
  if (WRITE) {
    for (const c of changes) { c.q.correct = c.newIdx; c.q.explanation = c.ex; }
    fs.writeFileSync("chqbt_app_import.json", JSON.stringify(bank));
    fs.writeFileSync("pipeline/_chqbt_applied_fixes.json", JSON.stringify(changes.map(c => ({ q: c.q.q, oldIdx: c.oldIdx, newIdx: c.newIdx })), null, 1));
    console.log(`\n✓ ${changes.length} ta tuzatish BANKKA yozildi (+ _chqbt_applied_fixes.json). Qolgan shubhalilar tegilmadi.`);
  } else {
    console.log(`\n(Sinov — bank o'zgarmadi. Yozish uchun --write bering.)`);
  }
}
main();
