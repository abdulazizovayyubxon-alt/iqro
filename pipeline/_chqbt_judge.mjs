// Boyitilgan savollarda faktik to'g'rilikni LLM-hakam bilan namunaviy tekshirish.
import fs from "fs";
if (fs.existsSync(".env")) for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
const N = parseInt(process.argv[2] || "40", 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("t:" + l)), ms))]);

async function call(prompt) {
  for (let k = 0; k < 4; k++) {
    try {
      const key = keys[keyIdx++ % keys.length];
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0, max_tokens: 8000 }), signal: AbortSignal.timeout(60000) }), 70000, "f");
      if (!res.ok) { await sleep(700); continue; }
      const d = await res.json();
      const c = d.choices?.[0]?.message?.content;
      if (c) return c;
    } catch { await sleep(900 * (k + 1)); }
  }
  return "";
}

const orig = JSON.parse(fs.readFileSync("chqbt_app_import.json", "utf8"));
const enr = JSON.parse(fs.readFileSync("chqbt_app_import.enriched.json", "utf8"));
const changed = enr.filter((q, i) => q.q !== orig[i].q);
let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = [];
const pool = changed.slice();
for (let i = 0; i < N && pool.length; i++) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);

function judgePrompt(q) {
  const opts = q.opts.map((o, i) => `${"ABCD"[i]}) ${String(o).replace(/^[A-D]\)\s*/, "")}`).join("\n");
  return `Siz CHQBT (harbiy ta'lim) bo'yicha qattiqqo'l ekspert-hakam. Quyidagi test savolini baholang.
SAVOL: ${q.q}
${opts}
BELGILANGAN TO'G'RI JAVOB: ${"ABCD"[q.correct]}
IZOH: ${q.explanation}

Tekshiring: (1) belgilangan javob FAKTIK to'g'rimi? (2) boshqa variant ham to'g'ri bo'lib qolmaganmi? (3) savol mantiqan sog'lommi (vaziyat real, fakt to'g'ri)?
FAQAT JSON: {"verdict":"OK"|"SHUBHALI","tuzar":"<agar SHUBHALI bo'lsa qisqa sabab, aks holda bo'sh>"}`;
}
function parse(t) { const m = String(t).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1")); } catch { return null; } }

const results = [];
let idx = 0;
async function worker() {
  while (idx < pick.length) {
    const q = pick[idx++];
    const v = parse(await call(judgePrompt(q)));
    results.push({ q, v });
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const sus = results.filter(r => !r.v || /shubhali/i.test(r.v.verdict || ""));
console.log(`\n=== LLM-HAKAM NAMUNASI: ${results.length} ta boyitilgan savol ===`);
console.log(`OK: ${results.length - sus.length} | SHUBHALI/parse-xato: ${sus.length} (${Math.round(sus.length / results.length * 100)}%)`);
for (const r of sus.slice(0, 12)) {
  console.log(`\n⚠ ${r.q.q.slice(0, 80)}`);
  console.log(`   to'g'ri="${String(r.q.opts[r.q.correct]).replace(/^[A-D]\)\s*/, "")}"`);
  console.log(`   hakam: ${r.v ? r.v.verdict + " — " + (r.v.tuzar || "") : "parse-xato"}`);
}
