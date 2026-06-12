// TOZALASH: padded korpusdan yaqin-dublikatlarni tashlab, haqiqiy noyob savollarni ajratadi.
// Asl fayllar O'CHIRILMAYDI — natija fan/<slug>/_clean.json ga yoziladi.
//
// Ishlatish:
//   node pipeline/dedupe-corpus.mjs                 # barcha padded fanlar
//   node pipeline/dedupe-corpus.mjs --subject tarix # bitta fan
//   node pipeline/dedupe-corpus.mjs --write         # _clean.json yozadi (yo'qsa faqat hisobot)

import fs from "fs";
import path from "path";
import { dedupeList } from "./lib/dedup.mjs";
import { ALL_SLUGS, getSubject } from "./lib/subjects.mjs";

const args = process.argv.slice(2);
const only = args.includes("--subject") ? args[args.indexOf("--subject") + 1] : null;
const doWrite = args.includes("--write");

// fan/<slug> papkasidagi savollarni o'qiydi ("_" bilan boshlanadigan fayllarni o'tkazib yuboradi)
function loadFolder(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && !x.startsWith("_")).sort()) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const qs = Array.isArray(d) ? d : (d.questions || []);
      out.push(...qs);
    } catch {}
  }
  return out;
}

// Padded fan papkasiga ega fanlar
const padded = ALL_SLUGS.filter((s) => {
  const sub = getSubject(s);
  return sub.corpus.some((p) => p.startsWith("fan/") && fs.existsSync(p) && fs.statSync(p).isDirectory());
});

const targets = only ? [only] : padded;

const pad = (s, n) => String(s).padEnd(n);
const padN = (s, n) => String(s).padStart(n);
console.log(pad("FAN", 18), padN("JAMI", 7), padN("NOYOB", 7), padN("PADDING", 8), "  noyob%");
console.log("-".repeat(56));

let tJami = 0, tNoyob = 0;
for (const slug of targets) {
  const sub = getSubject(slug);
  const dir = sub.corpus.find((p) => p.startsWith("fan/"));
  if (!dir) { console.log(pad(slug, 18), "  fan/ papka yo'q"); continue; }

  const all = loadFolder(dir);
  if (!all.length) { console.log(pad(slug, 18), padN(0, 7), "  bo'sh"); continue; }

  const { kept, removed } = dedupeList(all);
  tJami += all.length; tNoyob += kept.length;
  const pct = Math.round((kept.length / all.length) * 100);
  console.log(pad(slug, 18), padN(all.length, 7), padN(kept.length, 7), padN(removed, 8), "  " + pct + "%");

  if (doWrite) {
    // ID larni qayta beramiz
    kept.forEach((q, i) => { q.id = i + 1; });
    const outPath = path.join(dir, "_clean.json");
    fs.writeFileSync(outPath, JSON.stringify(kept, null, 2), "utf8");
    console.log("     → yozildi:", outPath, `(${kept.length} noyob savol)`);
  }
}
console.log("-".repeat(56));
console.log(pad("JAMI", 18), padN(tJami, 7), padN(tNoyob, 7), padN(tJami - tNoyob, 8),
  "  " + (tJami ? Math.round((tNoyob / tJami) * 100) : 0) + "%");
if (!doWrite) console.log("\n(faqat hisobot. Yozish uchun: --write qo'shing)");
