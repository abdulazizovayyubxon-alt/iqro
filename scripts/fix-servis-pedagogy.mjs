import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/texnologiya_servis.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const servis = JSON.parse(fs.readFileSync('fan 4/_app/texnologiya_servis.json', 'utf8'));

const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/gi;

let fixed = 0;

servis.forEach(q => {
  const srcId = String(parseInt(q.docId.replace('texnologiya_servis_', ''), 10));
  const cIdx = q.correct;
  let opts = overrides[srcId]?.opts ? [...overrides[srcId].opts] : [...q.opts];
  let changed = false;

  if (srcId === '1889') {
    opts = [
      "'Svetofor' formativ baholash texnikasi amaliyoti",
      "'Klaster' grafik organayzeridan foydalanish usuli",
      "'Sinkveyn' besh qatorli she'riy tahlil metodi",
      "'Beshinchisi ortiqcha' mantiqiy saralash mashg'uloti"
    ];
    changed = true;
  }
  if (srcId === '2244') {
    opts = [
      "Barcha o'quvchilarga bir xil shablon asosida yondashish va individual farqlarni inkor etish tamoyili",
      "Faqat o'zlashtirishi yuqori bo'lgan iqtidorli o'quvchilar bilan ishlab, qolganlarni e'tibordan chetda qoldirish tamoyili",
      "O'quvchilarni tabaqalarga ajratib, past o'zlashtiruvchilarga nisbatan cheklovchi jazo choralari qo'llash tamoyili",
      "O'quv jarayonida har bir bolaning shaxsiy qobiliyatini inobatga oluvchi individual yondashuv tamoyili"
    ];
    changed = true;
  }

  // Clean traps
  opts = opts.map((opt, idx) => {
    if (idx === cIdx) return opt;
    if (trapRegex.test(opt)) {
      let cleaned = opt
        .replace(/\bmutlaqo\b/gi, "yetarlicha")
        .replace(/\bhech qachon\b/gi, "kamdan-kam hollarda")
        .replace(/\bhech qanday\b/gi, "yetarli")
        .replace(/\bfaqatgina\b/gi, "ko'proq")
        .trim();
      changed = true;
      return cleaned;
    }
    return opt;
  });

  // Balance ratio if > 1.18 or diff > 18
  const cLen = opts[cIdx].length;
  let distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  let avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  let maxDist = Math.max(...distLens);

  if (cLen / avgDist > 1.18 || cLen - maxDist > 18) {
    opts = opts.map((opt, idx) => {
      if (idx === cIdx) return opt;
      if (opt.length < cLen - 8) {
        let diff = cLen - opt.length;
        if (diff > 25) {
          return opt + " bo'yicha belgilangan amaliy me'yoriy talablar";
        } else if (diff > 14) {
          return opt + " bo'yicha belgilangan amaliy talab";
        } else if (diff > 6) {
          return opt + " jarayoni";
        }
      }
      return opt;
    });
    changed = true;
  }

  // Handle shortest
  const minDist = Math.min(...distLens);
  if (minDist - cLen > 18) {
    opts[cIdx] = opts[cIdx] + " mezonlariga to'liq muvofiq keladi";
    changed = true;
  }

  if (changed) {
    overrides[srcId] = { opts };
    fixed++;
  }
});

fs.writeFileSync(ovFile, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log(`✅ Servis overrides saqlandi: ${fixed} ta savol tuzatildi.`);
