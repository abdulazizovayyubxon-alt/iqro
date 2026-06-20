// 5 fan yangi ped (ped5) auditi — ketma-ket, resumable (verify-bank tekshirilganni o'tkazadi).
import { execFileSync } from "child_process";
import fs from "fs";
const SUBJ = [
  ["jismoniy_tarbiya", "jismoniy_ped5"], ["boshlangich", "boshlangich_ped5"],
  ["ona_tili", "ona_tili_ped5"], ["biologiya", "biologiya_ped5"], ["geografiya", "geografiya_ped5"],
];
const count = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")).length; } catch { return 0; } };
const repCount = (slug) => { try { return Object.keys(JSON.parse(fs.readFileSync(`pipeline/verify_report_${slug}.json`, "utf8")).length ? JSON.parse(fs.readFileSync(`pipeline/verify_report_${slug}.json`, "utf8")) : {}).length; } catch { return 0; } };

for (const [slug, rslug] of SUBJ) {
  const total = count(`fan/${slug}/_ped5_new.json`);
  if (repCount(rslug) >= total && total > 0) { console.log(`\n### ${slug}: audit TAYYOR (${total}) ###`); continue; }
  console.log(`\n### ${slug} audit → ${total} (tekshirilgan ${repCount(rslug)}) ###`);
  try {
    execFileSync("node", ["pipeline/verify-bank.mjs", "--in", `fan/${slug}/_ped5_new.json`, "--slug", rslug, "--batch", "5"], { stdio: "inherit" });
  } catch (e) { console.log(`[${slug}] audit uzildi: ${String(e.message).slice(0, 60)}`); }
}
console.log("\n=== AUDIT YAKUN ===");
for (const [slug, rslug] of SUBJ) console.log(`  ${slug}: ${repCount(rslug)}/${count(`fan/${slug}/_ped5_new.json`)}`);
