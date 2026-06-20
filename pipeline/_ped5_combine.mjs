// 5 fan: framed(ped) + kasb birlashtiradi → per-fan _ped5_new.json (audit + upload uchun).
import fs from "fs";
const load = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; } };
const SUBJ = ["jismoniy_tarbiya", "boshlangich", "ona_tili", "biologiya", "geografiya"];
for (const slug of SUBJ) {
  const all = [...load(`fan/${slug}/_ped5_framed.json`), ...load(`fan/${slug}/_ped5_kasb.json`)];
  all.forEach((q, i) => { q.id = i + 1; });
  fs.writeFileSync(`fan/${slug}/_ped5_new.json`, JSON.stringify(all, null, 2), "utf8");
  console.log(`${slug}: ${all.length} → fan/${slug}/_ped5_new.json`);
}
