// Har fanning namuna faylidan ped savollarini (oxiridagi ~15) ko'rsatadi.
import fs from "fs";
const FILES = {
  jismoniy: "fan/jismoniy_savollar.json", boshlangich: "fan/boshlangich_savollar.json",
  ona_tili: "fan/ona_tili_savollar.json", biologiya: "fan/biologiya_savollar.json",
  geografiya: "fan/geografiya_savollar.json",
};
for (const [slug, p] of Object.entries(FILES)) {
  if (!fs.existsSync(p)) { console.log(`\n### ${slug}: namuna fayl YO'Q (${p})`); continue; }
  const a = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`\n### ${slug} (${p}): jami ${a.length} namuna ###`);
  // ped odatda oxirida (Q36-50). Oxirgi 3 tasini ko'rsatamiz.
  a.slice(-3).forEach((q, i) => {
    console.log(`  ${a.length - 3 + i + 1}. ${(q.question || q.q || "").slice(0, 130)}`);
  });
}
