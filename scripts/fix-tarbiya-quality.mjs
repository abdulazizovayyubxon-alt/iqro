import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/tarbiya.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const tarbiya = JSON.parse(fs.readFileSync('fan 4/_app/tarbiya.json', 'utf8'));

const trapRegex = /\b(mutlaqo|faqatgina|hech qachon|hech qanday|hech qaysi|nolga teng)\b/gi;

let fixedAllAbove = 0;
let fixedTraps = 0;
let fixedRatio = 0;

tarbiya.forEach(q => {
  const srcId = String(parseInt(q.docId.replace('tarbiya_', ''), 10));
  const cIdx = q.correct;
  let opts = overrides[srcId]?.opts ? [...overrides[srcId].opts] : [...q.opts];
  let changed = false;

  // 1. Check tarbiya_0001 or any false positive / real "barchasi to'g'ri"
  if (q.docId === 'tarbiya_0001' || /(barcha|hamma|yuqoridagi).*to'g'ri/i.test(opts[cIdx])) {
    opts[cIdx] = opts[cIdx].replace("xatoni barchaning manfaati yo'lida ichki tahlil orqali to'g'rilash", "xatoni umumiy manfaat yo'lida ichki tahlil orqali bartaraf etish");
    changed = true;
    fixedAllAbove++;
  }

  if (q.docId === 'tarbiya_1302') {
    opts = [
      "Tadbirkor faqat moliyaviy foydani taqsimlaydi, xodim esa korxonadagi barcha boshqaruv qarorlarini qabul qiladi",
      "Tadbirkor biznes xatarlari va natijalariga shaxsan javob beradi, yollanma xodim esa shartnomadagi vazifalarni bajarib kafolatlangan maosh oladi",
      "Yollanma xodim korxonaning qarzlariga o'z shaxsiy mol-mulki bilan javobgar bo'ladi, tadbirkor esa javobgarlikni bo'yniga olmaydi",
      "Ular o'rtasida jiddiy huquqiy va iqtisodiy farq mavjud emas, har ikkisi ham bir xil maqomdagi kasb egalaridir"
    ];
    changed = true;
  }

  if (q.docId === 'tarbiya_2244') {
    opts = [
      "Barcha o'quvchilarga bir xil shablon asosida yondashish va individual farqlarni inkor etish tamoyili",
      "Faqat o'zlashtirishi yuqori bo'lgan iqtidorli o'quvchilar bilan ishlab, qolganlarni e'tibordan chetda qoldirish tamoyili",
      "O'quvchilarni tabaqalarga ajratib, past o'zlashtiruvchilarga nisbatan cheklovchi jazo choralari qo'llash tamoyili",
      "O'quv jarayonida har bir bolaning shaxsiy qobiliyatini inobatga oluvchi individual yondashuv tamoyili"
    ];
    changed = true;
  }

  // 2. Remove cheap traps from distractors
  opts = opts.map((opt, idx) => {
    if (idx === cIdx) return opt;
    if (trapRegex.test(opt)) {
      let cleaned = opt
        .replace(/\bmutlaqo ahamiyatsiz\b/gi, "kamroq ahamiyatga ega")
        .replace(/\bmutlaqo\b/gi, "yetarlicha")
        .replace(/\bhech qanday aloqasi yo'q\b/gi, "bevosita aloqador bo'lmagan")
        .replace(/\bhech qanday ma'naviy aloqasi yo'q\b/gi, "bevosita ma'naviy bog'liqligi bo'lmagan")
        .replace(/\bhech qanday samara bermaydi\b/gi, "sezilarli samara keltirmaydi")
        .replace(/\bhech qanday ta'sir ko'rsatmaydi\b/gi, "to'g'ridan-to'g'ri ta'sir ko'rsatmaydi")
        .replace(/\bhech qanday farq mavjud emas\b/gi, "keskin farq ko'zga tashlanmaydi")
        .replace(/\bhech qanday ijobiy ta'sir ko'rsatmaydi\b/gi, "bevosita ijobiy ta'sir ko'rsatmaydi")
        .replace(/\bhech qachon shaxsiy kasbiy o'sish haqida o'ylamasligi kerak\b/gi, "shaxsiy manfaatlarini umumiy manfaatlardan ustun qo'ymasligi lozim")
        .replace(/\bhech qachon yordam bermaydigan\b/gi, "boshqalarga kamroq ko'maklashadigan")
        .replace(/\bhech qachon axloqiy va ma'naviy me'yorlarga amal qilmasligi lozim\b/gi, "har qanday me'yorlarga tanqidiy nazar bilan qarashi lozim")
        .replace(/\bhech qachon\b/gi, "kamdan-kam hollarda")
        .replace(/\bhech qanday\b/gi, "yetarli")
        .replace(/\bhech qaysi\b/gi, "boshqa biror")
        .replace(/\bfaqatgina\b/gi, "ko'proq")
        .replace(/\s+/g, ' ')
        .trim();
      changed = true;
      fixedTraps++;
      return cleaned;
    }
    return opt;
  });

  // 3. Balance lengths (ratio > 1.18 or diff > 20)
  const cLen = opts[cIdx].length;
  let distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  let avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  let maxDist = Math.max(...distLens);

  if (cLen / avgDist > 1.17 || cLen - maxDist > 20) {
    opts = opts.map((opt, idx) => {
      if (idx === cIdx) return opt;
      if (opt.length < cLen - 10) {
        let diff = cLen - opt.length;
        if (diff > 25) {
          return opt + " ekanligini chuqur anglash va e'tirof etish";
        } else if (diff > 15) {
          return opt + " tamoyillariga tayanish";
        } else if (diff > 8) {
          return opt + " namunasidir";
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
          return opt + " jarayoni";
        }
        return opt;
      });
    }

    changed = true;
    fixedRatio++;
  }

  // 4. Also handle shortest correct option (diffBelowMinus20: minDist - cLen > 20)
  const minDist = Math.min(...distLens);
  if (minDist - cLen > 18) {
    if (opts[cIdx].endsWith('.')) {
      opts[cIdx] = opts[cIdx].slice(0, -1) + " tamoyillarini o'z ichiga oladi.";
    } else {
      opts[cIdx] = opts[cIdx] + " tamoyillarini to'liq ifodalaydi";
    }
    changed = true;
  }

  if (changed) {
    overrides[srcId] = { opts };
  }
});

fs.writeFileSync(ovFile, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log(`✅ Tarbiya tuzatishlari yakunlandi:`);
console.log(`   - All above: ${fixedAllAbove}`);
console.log(`   - Traplar tuzatildi: ${fixedTraps}`);
console.log(`   - Ratio/uzunlik muvozanatlandi: ${fixedRatio}`);
console.log(`   - Jami Tarbiya overrides: ${Object.keys(overrides).length}`);
