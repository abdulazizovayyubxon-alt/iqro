// Oltin bankда cue-leak (uzunlik/qavs/tire/barchasi/izoh-harf) ni MEXANIK kamaytiradi:
//  - barcha variantlardan trailing "(...)" va " — izoh" / "; izoh" tayoqlarini bir xil olib tashlaydi
//  - izohда "X variant" harf ishorasini olib tashlaydi (mazmun saqlanadi)
// Faktni o'zgartirmaydi. Hal bo'lmaganlar QO'LGA chiqariladi.
// node pipeline/fix-gold-cue.mjs [--apply]
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";

const apply = process.argv.includes("--apply");
const inPath = "fan/chqbt/gold_bank.json";
const bank = JSON.parse(fs.readFileSync(inPath, "utf8"));

// variant matnini "tayoq"larsiz qisqartirish variantlari (eng kuchsizdan kuchligigacha)
function trims(s) {
  const out = [];
  let t = s;
  // 1) trailing parenthesis
  const noParen = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (noParen !== s) out.push(noParen);
  // 2) em-dash izohini kesish: "core — reasoning" -> "core"
  const dash = s.split(/\s+[—–-]\s+/)[0].trim();
  if (dash && dash !== s) out.push(dash);
  // 3) ", chunki ..." yoki "; ..." ni kesish
  const clause = s.replace(/[,;]\s*(chunki|ya'ni|natijasida|sababli)\b.*$/i, "").trim();
  if (clause !== s) out.push(clause);
  // 4) barcha qavslarni (o'rta ham) olib tashlash
  const allParen = s.replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
  if (allParen !== s) out.push(allParen);
  return [...new Set(out)].filter((x) => x.length >= 4);
}

let fixed = 0; const manual = [];
for (const q of bank) {
  let cl = cueLeakReasons(q);
  if (!cl.length) continue;

  // izoh-harf: "B variant", "A javob" kabilarni mazmunga aylantirib bo'lmaydi avtomatik — faqat harf+variant naqshini olib tashlaymiz
  if (/HARFiga/.test(cl.join())) {
    q.explanation = (q.explanation || "")
      .replace(/\b([ABCD])\s*variant(dagi|da|ning)?\b/g, "boshqa variant")
      .replace(/\bvariant\s*([ABCD])\b/g, "boshqa variant");
  }

  // uzunlik/qavs/tire: barcha variantlarni bir xil trim qilib ko'ramiz
  if (/ancha uzun|izoh\/qavs\/tire/.test(cl.join())) {
    // har variant uchun eng yaxshi trimни qo'llaymiz (faqat agar umumiy cue-leakни kamaytirsa)
    const tryOpts = { ...q.options };
    // avval qavslarni HAMMA variantдан bir xil olib tashlaymiz
    for (const k of ["A", "B", "C", "D"]) tryOpts[k] = (tryOpts[k] || "").replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
    let cand = { ...q, options: tryOpts };
    if (cueLeakReasons(cand).length < cl.length) { q.options = tryOpts; cl = cueLeakReasons(q); }
    // hali uzun bo'lsa — to'g'ri javobni em-dash/clause bo'yicha qisqartiramiz
    if (cl.some((r) => r.includes("ancha uzun"))) {
      for (const candidate of trims(q.options[q.answer])) {
        const test = { ...q, options: { ...q.options, [q.answer]: candidate } };
        if (!cueLeakReasons(test).some((r) => r.includes("ancha uzun"))) { q.options[q.answer] = candidate; cl = cueLeakReasons(q); break; }
      }
    }
  }

  const after = cueLeakReasons(q);
  if (!after.length) fixed++;
  else manual.push({ id: q.id, why: after.join("; ") });
}

console.log(`Mexanik tuzatildi (toza): ${fixed} | Qo'lга qoldi: ${manual.length}`);
if (manual.length) { console.log("\nQO'LGA (tafsilot):"); manual.slice(0, 80).forEach((m) => console.log(`  id=${m.id}: ${m.why}`)); }
if (apply) {
  fs.writeFileSync(inPath + ".bak_cue", JSON.stringify(JSON.parse(fs.readFileSync(inPath, "utf8")), null, 1), "utf8");
  fs.writeFileSync(inPath, JSON.stringify(bank, null, 1), "utf8");
  console.log(`\n✓ QO'LLANDI. Zaxira: ${inPath}.bak_cue`);
} else console.log("\n(Ko'rish rejimi — --apply bilan yozing)");
