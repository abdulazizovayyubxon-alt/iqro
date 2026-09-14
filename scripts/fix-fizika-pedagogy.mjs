import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/fizika.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const fizika = JSON.parse(fs.readFileSync('fan 4/_app/fizika.json', 'utf8'));

const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi)\b/gi;

let fixed = 0;

fizika.forEach(q => {
  const srcId = String(parseInt(q.docId.replace('fizika_', ''), 10));
  const cIdx = q.correct;
  let opts = overrides[srcId]?.opts ? [...overrides[srcId].opts] : [...q.opts];
  let changed = false;

  // Specific hand-crafted fixes for high ratio questions
  if (srcId === '1823') {
    opts = [
      "Tashkiliy qism -> Qiziqish uyg'otish (motivatsiya) -> Yangi mavzu bayoni -> Mustahkamlash mashqlari -> Yakuniy baholash va uyga vazifa topshirish",
      "Darsni boshlash -> Mavzuni tezkor tushuntirish -> Mustaqil ish o'tkazish -> O'quvchilarni baholash va darsni yakunlash tartibi",
      "Uy vazifasini tekshirish -> Mavzuni o'quvchilarga o'qitish -> Savol-javob o'tkazish -> Baholarni e'lon qilib darsni yakunlash tartibi",
      "Tashkiliy tartib -> Yangi mavzuni konspekt qildirish -> Mashqlar yechish -> Uyga vazifani tushuntirib darsni yakunlash tartibi"
    ];
    changed = true;
  }
  if (srcId === '1828') {
    opts = [
      "Ta'limiy maqsad, tarbiyaviy maqsad va rivojlantiruvchi maqsadlar uyg'unligi",
      "Nazariy bilim berish, yodlatish va qat'iy nazorat qilish mezonlari tizimi",
      "Darslik bilan ishlash, konspekt yozdirish va uyga vazifa berish bosqichi",
      "O'quvchini intizomga chaqirish, baholash va ota-onaga hisobot berish tartibi"
    ];
    changed = true;
  }
  if (srcId === '1871') {
    opts = [
      "Loyihaning maqsadga mosligi va dolzarbligini ko'rib chiqish -> Taqdimot va himoya jarayoni -> Natijalar tahlili va yakuniy baholash",
      "Loyiha matnini ko'rib chiqish -> Xatolarni tekshirib tuzatish -> O'quvchilarni guruhlab rag'batlantirish va umumiy baholash",
      "Ijodiy ishni topshirish -> O'qituvchi tomonidan mustaqil o'qib chiqish -> Xulosalarni e'lon qilish va umumiy baho qo'yish",
      "Guruh yetakchisini eshitish -> Tayyorlangan ko'rgazmani ko'zdan kechirish -> Fikr-mulohazalarni umumlashtirib baholash tartibi"
    ];
    changed = true;
  }
  if (srcId === '1889') {
    opts = [
      "'Svetofor' formativ baholash texnikasi",
      "Yo'l harakati qoidalariga oid maxsus dars",
      "Avtomatlashtirilgan qat'iy jarima tizimi",
      "Rangli illyustratsiya chizish musobaqasi"
    ];
    overrides[srcId] = { opts };
    fixed++;
    return;
  }
  if (srcId === '2244') {
    opts = [
      "Barcha o'quvchilarga bir xil shablon asosida yondashish va individual farqlarni inkor etish tamoyili",
      "Faqat yuqori iqtidorli o'quvchilar bilan ishlab, qolganlarni e'tibordan chetda qoldirish tamoyili",
      "O'quvchilarni tabaqalarga ajratib, past o'zlashtiruvchilarga nisbatan jazo chorasi qo'llash tamoyili",
      "O'quv jarayonida har bir o'quvchining individual xususiyatlari va iqtidorini inobatga olish tamoyili"
    ];
    overrides[srcId] = { opts };
    fixed++;
    return;
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
console.log(`✅ Fizika overrides saqlandi: ${fixed} ta savol tuzatildi.`);
