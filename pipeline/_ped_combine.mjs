// Yangi ped fayllarni per-fan birlashtiradi (framed+neutral) — audit + upload uchun.
import fs from "fs";
const load = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; } };

const SUBJ = {
  chqbt: ["fan/chqbt/_ped_add_framed.json", "fan/chqbt/_ped_add_neutral.json"],
  informatika: ["fan/informatika/_ped_add_framed.json", "fan/informatika/_ped_add_neutral.json"],
  art: ["fan/art/_ped_add_framed.json"],
};

for (const [slug, files] of Object.entries(SUBJ)) {
  const all = files.flatMap(load);
  all.forEach((q, i) => { q.id = i + 1; });
  const out = `fan/${slug}/_ped_new.json`;
  fs.writeFileSync(out, JSON.stringify(all, null, 2), "utf8");
  console.log(`${slug}: ${all.length} → ${out}`);
}
