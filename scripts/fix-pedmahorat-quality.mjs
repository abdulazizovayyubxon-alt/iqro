import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/pedmahorat.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const ped = JSON.parse(fs.readFileSync('fan 4/_app/pedmahorat.json', 'utf8'));

const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/gi;

let fixedAllAbove = 0;
let fixedTraps = 0;
let fixedRatio = 0;

ped.forEach(q => {
  const srcId = String(parseInt(q.docId.replace('pedmahorat_', ''), 10));
  const cIdx = q.correct;
  let opts = overrides[srcId]?.opts ? [...overrides[srcId].opts] : [...q.opts];
  let changed = false;

  // 1. pedmahorat_1698 or real allAbove
  if (q.docId === 'pedmahorat_1698' || /(barcha|hamma|yuqoridagi).*to'g'ri/i.test(opts[cIdx])) {
    opts[cIdx] = opts[cIdx].replace(
      "Barchaga namoyish qilib koyimasdan, qiziqarli vaziyat sifatida ko'rib chiqilib, qanday to'g'rilash yo'li birgalikda izlanadi",
      "Ommaviy tanbeh bermasdan, qiziqarli holat sifatida ko'rib chiqilib, uni bartaraf etish yo'li birgalikda izlanadi"
    );
    changed = true;
    fixedAllAbove++;
  }

  // 2. Remove cheap traps from distractors
  opts = opts.map((opt, idx) => {
    if (idx === cIdx) return opt;
    if (trapRegex.test(opt)) {
      let cleaned = opt
        .replace(/\bmutlaqo taqiqlangan bo'lib\b/gi, "tavsiya etilmaydigan tartib bo'lib")
        .replace(/\bmutlaqo\b/gi, "yetarlicha")
        .replace(/\bhech qanday imtiyoz berilmaydi\b/gi, "standart imtiyozlar berilmaydi")
        .replace(/\bhech qanday o'zgaruvchan signal bermasdan\b/gi, "qo'shimcha o'zgaruvchan signallarsiz")
        .replace(/\bhech qanday to'siqlarsiz\b/gi, "boshqa murakkab to'siqlarsiz")
        .replace(/\bhech qanday cheklovlarsiz\b/gi, "maxsus mezoniy cheklovlarsiz")
        .replace(/\bhech qanday qoidaga ega bo'lmagan\b/gi, "qat'iy qoidalarga ega bo'lmagan")
        .replace(/\bhech qanday irodaviy to'xtamni talab qilmaydigan\b/gi, "maxsus irodaviy kuchni talab qilmaydigan")
        .replace(/\bhech qachon\b/gi, "kamdan-kam hollarda")
        .replace(/\bhech qanday\b/gi, "yetarli")
        .replace(/\bhech qaysi\b/gi, "boshqa biror")
        .replace(/\bfaqatgina\b/gi, "asosan")
        .replace(/\s+/g, ' ')
        .trim();
      changed = true;
      fixedTraps++;
      return cleaned;
    }
    return opt;
  });

  // 3. Balance lengths (ratio > 1.18 or diff > 18)
  const cLen = opts[cIdx].length;
  let distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  let avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  let maxDist = Math.max(...distLens);

  if (cLen / avgDist > 1.17 || cLen - maxDist > 18) {
    opts = opts.map((opt, idx) => {
      if (idx === cIdx) return opt;
      if (opt.length < cLen - 8) {
        let diff = cLen - opt.length;
        if (diff > 25) {
          return opt + " bo'yicha mas'uliyatni o'z zimmasiga olish";
        } else if (diff > 15) {
          return opt + " amaliy faoliyati";
        } else if (diff > 6) {
          return opt + " jarayoni";
        }
      }
      return opt;
    });

    // Recheck
    distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
    avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
    if (cLen / avgDist > 1.18) {
      opts = opts.map((opt, idx) => {
        if (idx === cIdx) return opt;
        if (opt.length < cLen - 5) {
          return opt + " talablari";
        }
        return opt;
      });
    }

    changed = true;
    fixedRatio++;
  }

  // 4. Also handle shortest correct option (minDist - cLen > 18)
  const minDist = Math.min(...distLens);
  if (minDist - cLen > 18) {
    if (opts[cIdx].endsWith('.')) {
      opts[cIdx] = opts[cIdx].slice(0, -1) + " tamoyillariga to'liq asoslanadi.";
    } else {
      opts[cIdx] = opts[cIdx] + " tamoyillariga to'liq asoslanadi";
    }
    changed = true;
  }

  if (changed) {
    overrides[srcId] = { opts };
  }
});

fs.writeFileSync(ovFile, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log(`✅ Pedmahorat tuzatishlari yakunlandi:`);
console.log(`   - All above: ${fixedAllAbove}`);
console.log(`   - Traplar tuzatildi: ${fixedTraps}`);
console.log(`   - Ratio/uzunlik muvozanatlandi: ${fixedRatio}`);
console.log(`   - Jami Pedmahorat overrides: ${Object.keys(overrides).length}`);
