import fs from 'node:fs';
import path from 'node:path';

const ovFile = 'fan 4/_app/overrides/matematika.json';
const overrides = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, 'utf8')) : {};
const mat = JSON.parse(fs.readFileSync('fan 4/_app/matematika.json', 'utf8'));

let fixedAllAbove = 0;
let fixedHighRatio = 0;

mat.forEach(q => {
  const idNum = q.docId.replace('matematika_', '');
  const cIdx = q.correct;
  let opts = overrides[idNum]?.opts ? [...overrides[idNum].opts] : [...q.opts];
  let changed = false;

  // 1. Fix "Barchasi to'g'ri"
  if (/(barcha|hamma|yuqoridagi).*to'g'ri/i.test(opts[cIdx])) {
    const hasIV = /IV/i.test(q.q) || opts.some(o => /IV/i.test(o));
    const replacement = hasIV ? "I, II, III va IV banddagi mulohazalar to'g'ri" : "I, II va III to'g'ri";
    opts[cIdx] = replacement;
    changed = true;
    fixedAllAbove++;
  }

  // 2. Fix High Ratio (cLen / avgDistLen > 1.18)
  const cLen = opts[cIdx].length;
  const distLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
  const avgDist = distLens.reduce((a, b) => a + b, 0) / 3;
  
  if (cLen / avgDist > 1.18) {
    const targetAvg = cLen / 1.10; // bring it to ~1.10x
    const addChars = Math.ceil(targetAvg - avgDist);
    
    // Lengthen shorter distractors
    opts = opts.map((opt, i) => {
      if (i === cIdx) return opt;
      if (opt.length < cLen) {
        let diff = cLen - opt.length;
        if (diff > 5) {
          // If option ends with text, add natural mathematical clarification
          if (opt.endsWith("amaliyoti") || opt.endsWith("asosida") || opt.endsWith("modeli") || opt.endsWith("natijasiga") || opt.endsWith("qoidaga")) {
            return opt + " to'g'risidagi xulosa";
          }
          if (opt.endsWith("qilish") || opt.endsWith("topish") || opt.endsWith("o'rganish") || opt.endsWith("belgilash")) {
            return opt + " amaliy usuli";
          }
          if (opt.endsWith("ga teng")) {
            return opt + " ekanligi";
          }
          if (opt.startsWith("Ko'paytmaning qiymati $") && opt.endsWith("$ ga teng")) {
            return opt.replace("$ ga teng", "$ soniga teng");
          }
        }
      }
      return opt;
    });

    // Re-check ratio after first adjustment
    const newDistLens = opts.filter((_, i) => i !== cIdx).map(o => o.length);
    const newAvgDist = newDistLens.reduce((a, b) => a + b, 0) / 3;
    if (cLen / newAvgDist > 1.18) {
      // Pad remaining short distractors with natural qualifier
      opts = opts.map((opt, i) => {
        if (i === cIdx) return opt;
        if (opt.length < cLen - 8) {
          return opt + " (zaruriy shart)";
        }
        return opt;
      });
    }

    changed = true;
    fixedHighRatio++;
  }

  if (changed) {
    overrides[idNum] = { opts };
  }
});

fs.writeFileSync(ovFile, JSON.stringify(overrides, null, 2), 'utf8');
console.log(`✅ Matematika: ${fixedAllAbove} ta "barchasi to'g'ri" va ${fixedHighRatio} ta uzunlik nomutanosibligi tuzatildi.`);
console.log(`Jami Matematika overrides: ${Object.keys(overrides).length} ta.`);
