const fs = require('fs');
const path = require('path');

const dir = './src/data';
const files = fs.readdirSync(dir).filter(f => f.startsWith('questions_') && f.endsWith('.js'));

let totalFixes = 0;

const replacements = [
  { regex: /Imobilizatsiya/g, replacement: "Immobilizatsiya" },
  { regex: /Pistolyet/g, replacement: "Pistolet" },
  { regex: /Zatvorning/g, replacement: "Zatvorning" }, // Already correct
  { regex: /topologiya/g, replacement: "topografiya" }, // Fix specification typo
  { regex: /Topologiya/g, replacement: "Topografiya" },
  { regex: /xarakterlanadi/g, replacement: "tavsiflanadi" }, // Better Uzbek
  { regex: /otdeleniye/g, replacement: "bo'linma (otdeleniye)" }, 
  { regex: /bo'linma \(bo'linma \(otdeleniye\)\)/g, replacement: "bo'linma (otdeleniye)" }, // Deduplicate
  { regex: /stvol/g, replacement: "stvol (nay)" },
  { regex: /stvol \(nay\)dan/g, replacement: "stvol(nay)dan" },
  { regex: /stvol \(nay\)ni/g, replacement: "stvol(nay)ni" },
  { regex: /stvol \(nay\) ichida/g, replacement: "stvol (nay) ichida" },
  { regex: /porox/g, replacement: "porox" }, 
  { regex: /kapsyul/g, replacement: "kapsyul" },
  { regex: /PMP/g, replacement: "BTYo (Birinchi tibbiy yordam)" }, // Use Uzbek acronym instead of Russian PMP
  { regex: /BTYo \(Birinchi tibbiy yordam\) ko'rsatuvchi/g, replacement: "Birinchi tibbiy yordam ko'rsatuvchi" },
  { regex: /O'YR/g, replacement: "O'YR (O'pka-yurak reanimatsiyasi)" },
  { regex: /O'YR \(O'pka-yurak reanimatsiyasi\) nisbati/g, replacement: "O'pka-yurak reanimatsiyasi nisbati" },
  { regex: /qismiga qon to'xtatuvchi jgut \(burama\) o'rnatish/g, replacement: "qismiga qon to'xtatuvchi burama (jgut) o'rnatish" },
  { regex: /Jgut \(burama\)/g, replacement: "Burama (jgut)" },
  { regex: /Jgutni/g, replacement: "Buramani (jgutni)" },
  { regex: /OQQ-/g, replacement: "OQQ (Ommaviy qirg'in qurollari)-" },
  { regex: /Manevr/g, replacement: "Manevr" }
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixes++;
    console.log(`Fixed terminology in ${file}`);
  }
});

console.log(`Terminology fix completed. Modifed ${totalFixes} files.`);
