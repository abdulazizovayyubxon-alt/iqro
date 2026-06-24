// Bayroqlangan savollarni TO'LIQ ko'rsatadi — false-positive'mi yoki haqiqiy nuqson, ko'z bilan baholash uchun.
import fs from "fs";
import { cueLeakReasons, comboReasons } from "./lib/quality.mjs";
const LETTERS = ["A", "B", "C", "D"];
const comboRe = /^[a-z0-9](\s*[,;]\s*[a-z0-9])+$/i;
function adapt(item) {
  const opts = {};
  (item.opts || []).forEach((s, i) => { if (i < 4) opts[LETTERS[i]] = String(s).replace(/^[A-D]\)\s*/, "").trim(); });
  const allCombo = LETTERS.every((L) => opts[L] && comboRe.test(opts[L]));
  return { question: item.q || "", options: opts, answer: LETTERS[item.correct] ?? "A", qtype: allCombo ? "combo" : "single", explanation: item.explanation || "" };
}
function show(item, q, reasons) {
  console.log("\nSAVOL:", q.question.slice(0, 110));
  for (const L of LETTERS) console.log(`   ${L}) ${q.options[L]}`);
  console.log("   JAVOB:", q.answer, "| TURI:", q.qtype);
  console.log("   IZOH:", String(q.explanation).slice(0, 140));
  console.log("   ⚠", reasons.join(" | "));
}
const files = process.argv.slice(2);
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(f, "utf8"));
  const data = Array.isArray(arr) ? arr : (arr.questions || []);
  let shown = 0;
  console.log("\n############ " + f + " ############");
  for (const item of data) {
    if (!item || !item.opts) continue;
    const q = adapt(item);
    const cue = cueLeakReasons(q);
    const combo = q.qtype === "combo" ? comboReasons(q) : [];
    if (cue.length || combo.length) { show(item, q, [...cue, ...combo]); if (++shown >= 6) break; }
  }
}
