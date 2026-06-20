// 5 Hovuz A faniga ped+kasb generatsiya — 600/fan: 450 fan-xos pedagogika + 150 kasb (har ikkisi fan-xos).
// Ketma-ket, resumable. til (ona_tili) 183 bor → +417.
import { execFileSync } from "child_process";
import fs from "fs";

const RUNS = [
  ["jismoniy_tarbiya", "pedagogika", 450, "fan/jismoniy_tarbiya/_ped5_framed.json"],
  ["jismoniy_tarbiya", "kasb", 150, "fan/jismoniy_tarbiya/_ped5_kasb.json"],
  ["boshlangich", "pedagogika", 450, "fan/boshlangich/_ped5_framed.json"],
  ["boshlangich", "kasb", 150, "fan/boshlangich/_ped5_kasb.json"],
  ["ona_tili", "pedagogika", 313, "fan/ona_tili/_ped5_framed.json"],
  ["ona_tili", "kasb", 104, "fan/ona_tili/_ped5_kasb.json"],
  ["biologiya", "pedagogika", 450, "fan/biologiya/_ped5_framed.json"],
  ["biologiya", "kasb", 150, "fan/biologiya/_ped5_kasb.json"],
  ["geografiya", "pedagogika", 450, "fan/geografiya/_ped5_framed.json"],
  ["geografiya", "kasb", 150, "fan/geografiya/_ped5_kasb.json"],
];

const count = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")).length; } catch { return 0; } };

for (const [subj, block, target, out] of RUNS) {
  const have = count(out);
  if (have >= target) { console.log(`\n### ${subj} ${block}: ${have}/${target} — TAYYOR ###`); continue; }
  console.log(`\n### ${subj} [${block}] fan-xos → ${target} (hozir ${have}) → ${out} ###`);
  try {
    execFileSync("node", ["pipeline/run-api.mjs", "--subject", subj, "--blocks", block,
      "--ped-style", "framed", "--target", String(target), "--per", "15", "--out", out], { stdio: "inherit" });
  } catch (e) { console.log(`[${subj} ${block}] uzildi: ${String(e.message).slice(0, 80)}`); }
}
console.log("\n=== YAKUN ===");
for (const [subj, block, target, out] of RUNS) console.log(`  ${subj} ${block}: ${count(out)}/${target}`);
