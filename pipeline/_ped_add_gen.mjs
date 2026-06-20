// Uch fanga qo'shimcha ped generatsiya (fan-xos + umumiy) — ketma-ket, resumable.
// Har run-api o'z --out fayliga yozadi va maqsadgacha resume qiladi.
import { execFileSync } from "child_process";
import fs from "fs";

const RUNS = [
  ["chqbt", "framed", 112, "fan/chqbt/_ped_add_framed.json"],
  ["chqbt", "neutral", 183, "fan/chqbt/_ped_add_neutral.json"],
  ["informatika", "framed", 21, "fan/informatika/_ped_add_framed.json"],
  ["informatika", "neutral", 174, "fan/informatika/_ped_add_neutral.json"],
  ["art", "framed", 165, "fan/art/_ped_add_framed.json"],
];

const count = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")).length; } catch { return 0; } };

for (const [subj, style, target, out] of RUNS) {
  const have = count(out);
  if (have >= target) { console.log(`\n### ${subj} ${style}: ${have}/${target} — TAYYOR, o'tkazib yuborildi ###`); continue; }
  console.log(`\n### ${subj} ${style} → ${target} (hozir ${have}) → ${out} ###`);
  try {
    execFileSync("node", ["pipeline/run-api.mjs", "--subject", subj, "--blocks", "pedagogika",
      "--ped-style", style, "--target", String(target), "--per", "15", "--out", out], { stdio: "inherit" });
  } catch (e) { console.log(`[${subj} ${style}] run uzildi: ${String(e.message).slice(0, 80)}`); }
}
console.log("\n=== ORKESTRATOR YAKUNI ===");
for (const [subj, style, target, out] of RUNS) console.log(`  ${subj} ${style}: ${count(out)}/${target}`);
