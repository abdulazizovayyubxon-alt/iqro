// Namuna demotest matnlarini (fan/namuna txt/*.txt) JSON langarga o'giradi.
// Format: [{ question, options:{A,B,C,D}, subject, answer }] — CHQBT_savollar.json bilan bir xil.
// Savol = qatorboshi "N." (chap chekkada); variantlar = "A) ... D)"; davomi — indent qatorlar.
// Rasmga bog'liq / kesilgan ([..], "rasmga qarang", "ko'rinmadi") savollar OXIRIGA suriladi
// (renderAnchors faqat dastlabki 5 tasini ko'rsatadi — toza few-shot uchun).
//
// Ishlatish: node pipeline/namuna-txt-to-json.mjs   (hammasini qayta yasaydi; chqbt'ga tegmaydi)

import fs from "fs";
import path from "path";

const SRC = "fan/namuna txt";
// txt fayl -> { out: chiqish json, subject: fan nomi }. chqbt YO'Q (foydalanuvchi qo'lda yasagan).
const MAP = {
  "biologiya_savollar.txt":            { out: "fan/biologiya_savollar.json",   subject: "Biologiya" },
  "geografiya_savollar.txt":           { out: "fan/geografiya_savollar.json",  subject: "Geografiya" },
  "informatika_savollar.txt":          { out: "fan/informatika_savollar.json", subject: "Informatika va AT" },
  "tarix_savollar.txt":                { out: "fan/tarix_savollar.json",       subject: "Tarix" },
  "ona_tili_savollar.txt":             { out: "fan/ona_tili_savollar.json",    subject: "Ona tili va adabiyot" },
  "savolar_tasviriy_savollar.txt":     { out: "fan/tasviriy_savollar.json",    subject: "Tasviriy san'at" },
  "Jtar_savollar.txt":                 { out: "fan/jismoniy_savollar.json",    subject: "Jismoniy tarbiya" },
  "boshlangich_savollar.txt":          { out: "fan/boshlangich_savollar.json", subject: "Boshlang'ich ta'lim" },
  "MTT_tarbiyachi_savollar.txt":       { out: "fan/mtt_tarbiyachi_savollar.json", subject: "MTT tarbiyachi" },
  "MTT_psixolog_savollar.txt":         { out: "fan/mtt_psixolog_savollar.json",   subject: "MTT psixolog" },
  "MTT_logoped_savollar.txt":          { out: "fan/mtt_logoped_savollar.json",    subject: "MTT logoped" },
  "MTT_direktor_orinbosari_savollar.txt": { out: "fan/mtt_rahbar_savollar.json",  subject: "MTT rahbar" },
};

const OHEAD = /^\s*([A-D])\)\s+(.*)$/;      // variant boshi
const STOP  = /^[=#]+\s*$|^ESLATMA|^={5,}|^#{5,}/;
// Rasmga YOKI matnga bog'liq (standalone langar bo'lolmaydigan) savollarni oxiriga suramiz.
const IMG   = /\[|rasmga qarang|rasmda|rasmga e['’]tibor|ko['’]rinmadi|ko['’]rinmaydi|diagramma|blok-?sxema|quyidagi rasm|matnda|matndan|matn qism|qaysi qismda|berilgan matn|ushbu fikr/i;

function parse(text, subject) {
  const out = [];
  // Sarlavha uslubini aniqlash: ona_tili "Q1." ishlatadi (oddiy "1." — savol ichidagi ro'yxat).
  const useQ = /^Q\d{1,3}\.\s/m.test(text);
  const QHEAD = useQ ? /^Q(\d{1,3})\.\s+(.*)$/ : /^(\d{1,3})\.\s+(.*)$/;
  let cur = null, curOpt = null;
  const flush = () => {
    if (cur) {
      const o = cur.options;
      const stem = cur.stem.join(" ").replace(/\s+/g, " ").trim();
      if (stem.length >= 10 && o.A && o.B && o.C && o.D) {
        const opts = { A: o.A.trim(), B: o.B.trim(), C: o.C.trim(), D: o.D.trim() };
        const imgDep = IMG.test(stem) || Object.values(opts).some((v) => IMG.test(v));
        out.push({ question: stem, options: opts, subject, answer: "", _img: imgDep });
      }
    }
    cur = null; curOpt = null;
  };
  for (const line of text.split(/\r?\n/)) {
    if (STOP.test(line)) { flush(); continue; }
    const qh = line.match(QHEAD);
    if (qh) { flush(); cur = { stem: [qh[2]], options: {} }; curOpt = null; continue; }
    if (!cur) continue;
    const oh = line.match(OHEAD);
    if (oh) { curOpt = oh[1]; cur.options[curOpt] = oh[2]; continue; }
    const t = line.trim();
    if (!t) continue;
    if (curOpt) cur.options[curOpt] += " " + t;
    else cur.stem.push(t);
  }
  flush();
  // Toza (rasmsiz) savollar oldinga; _img maydonini olib tashlaymiz.
  out.sort((a, b) => Number(a._img) - Number(b._img));
  return out.map(({ _img, ...q }) => q);
}

let total = 0;
for (const [file, { out, subject }] of Object.entries(MAP)) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) { console.log(`⚠ topilmadi: ${file}`); continue; }
  const qs = parse(fs.readFileSync(src, "utf8"), subject);
  fs.writeFileSync(out, JSON.stringify(qs, null, 2), "utf8");
  const clean = qs.length; // (sort'dan keyin _img yo'q, lekin yozishdan oldin hisoblaymiz)
  console.log(`✓ ${subject.padEnd(22)} ${String(qs.length).padStart(3)} langar → ${out}`);
  total += qs.length;
}
console.log(`\nJami: ${total} langar (12 fan). chqbt qo'lda — tegilmadi.`);
