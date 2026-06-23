// CHQBT bank FAKTIK AUDITI — har savolni DARSLIK grounding bilan LLM-hakamdan o'tkazadi.
// Natija: pipeline/_chqbt_audit_report.json — { qHash: {verdict, suggested, grounded, reason} }
//   node pipeline/_chqbt_audit.mjs --concurrency 8 --max 400   (bo'lakli; checkpoint bilan davom)
import fs from "fs";
if (fs.existsSync(".env")) for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const CONC = parseInt(A("--concurrency", "8"), 10);
const MAX = parseInt(A("--max", "0"), 10) || Infinity;
const REPORT = "pipeline/_chqbt_audit_report.json";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("t:" + l)), ms))]);
const hashQ = s => String(s).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);

// ── darslik grounding (run-api dagi bilan bir xil g'oya) ──
const STOPW = new Set("uchun bilan bo'lgan ushbu ularning hamda shuning bo'lib bo'ladi qilish kerak orqali asosan bo'yicha mumkin hisoblanadi quyidagi amalga uning bo'lishi bo'ladigan birlik qaysi qanday".split(" "));
const gnorm = s => String(s).toLowerCase().replace(/[`‘’]/g, "'");
const gtoks = s => (gnorm(s).match(/[a-z']{5,}/g) || []).filter(w => !STOPW.has(w));
const bookText = fs.existsSync("scratch/chqbt_book.txt") ? fs.readFileSync("scratch/chqbt_book.txt", "utf8").replace(/[ \t]+/g, " ") : "";
const bookWins = [];
for (let i = 0; bookText && i < bookText.length; i += 1000) bookWins.push(bookText.slice(i, i + 1300).trim());
const winSets = bookWins.map(w => new Set(gtoks(w)));
function grounding(text) {
  if (!bookWins.length) return "";
  const qt = [...new Set(gtoks(text))];
  const top = winSets.map((s, idx) => { let n = 0; for (const t of qt) if (s.has(t)) n++; return [n, idx]; }).sort((a, b) => b[0] - a[0]).slice(0, 2).filter(([n]) => n >= 4);
  return top.length ? top.map(([, idx]) => bookWins[idx]).join("\n[...]\n") : "";
}

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
function parse(t) { const m = String(t).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1")); } catch { return null; } }

function judgePrompt(q) {
  const opts = q.opts.map((o, i) => `${"ABCD"[i]}) ${String(o).replace(/^[A-D]\)\s*/, "")}`).join("\n");
  const g = grounding(q.q + " " + String(q.opts[q.correct]));
  return `Siz CHQBT (chaqiruvga qadar boshlang'ich tayyorgarlik) bo'yicha qattiqqo'l ekspert-hakam. Quyidagi test savolini FAKTIK tekshiring.
${g ? "DARSLIK MANBASI (faktni shunga solishtiring; agar shu yerda bo'lsa, shunga tayan):\n" + g + "\n" : ""}
SAVOL: ${q.q}
${opts}
BELGILANGAN TO'G'RI JAVOB: ${"ABCD"[q.correct]}
IZOH: ${q.explanation}

Vazifa: belgilangan javob FAKTIK to'g'rimi? Agar NOTO'G'RI bo'lsa, to'g'ri variant harfini ko'rsat.
FAQAT JSON: {"verdict":"OK"|"XATO","suggested":"<XATO bo'lsa to'g'ri variant harfi A/B/C/D, aks holda bo'sh>","grounded":<true agar yuqoridagi darslik manbasi shu faktni tasdiqlasa, aks holda false>,"reason":"<qisqa>"}`;
}

async function main() {
  const bank = JSON.parse(fs.readFileSync("chqbt_app_import.json", "utf8"));
  let report = {};
  if (fs.existsSync(REPORT)) try { report = JSON.parse(fs.readFileSync(REPORT, "utf8")); } catch {}
  const todo = bank.filter(q => report[hashQ(q.q)] === undefined);
  const slice = todo.slice(0, MAX === Infinity ? todo.length : MAX);
  console.log(`Bank: ${bank.length} | tekshirilgan: ${Object.keys(report).length} | qolgan: ${todo.length} | shu chaqiruvda: ${slice.length} (parallel ${CONC}, grounding oyna: ${bookWins.length})`);

  let idx = 0, ok = 0, xato = 0, proc = 0, lastSave = 0;
  async function worker() {
    while (idx < slice.length) {
      const q = slice[idx++];
      const v = parse(await call(judgePrompt(q)));
      report[hashQ(q.q)] = v ? { verdict: v.verdict, suggested: v.suggested || "", grounded: !!v.grounded, reason: (v.reason || "").slice(0, 200), topicId: q.topicId } : { verdict: "PARSE", suggested: "", grounded: false, reason: "" };
      if (v && /xato/i.test(v.verdict || "")) xato++; else ok++;
      if (++proc - lastSave >= 15) { lastSave = proc; fs.writeFileSync(REPORT, JSON.stringify(report)); process.stdout.write(`\r  ${proc}/${slice.length} | OK ${ok} | XATO ${xato}   `); }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync(REPORT, JSON.stringify(report));
  const all = Object.values(report);
  const totalXato = all.filter(r => /xato/i.test(r.verdict)).length;
  const groundedXato = all.filter(r => /xato/i.test(r.verdict) && r.grounded && /^[A-D]$/.test(r.suggested)).length;
  console.log(`\n✓ Shu chaqiruv +${proc}. JAMI tekshirilgan ${all.length}/${bank.length} | XATO ${totalXato} (darslik-tasdiqlagan tuzatiladigan: ${groundedXato}) | qolgan ${bank.length - all.length}`);
}
main();
