// chqbt_book_clean.txt dagi encoding muammolarini tuzatish
// вЂ™ -> ' (apostrophe), вЂ" -> — (em dash), вЂ˜ -> ' va h.k.
import fs from 'fs';

const input = 'scratch/chqbt_book_clean.txt';
const output = 'scratch/chqbt_book_fixed.txt';

let text = fs.readFileSync(input, 'utf8');

const fixes = [
  // Mojibake patterns (UTF-8 chars mis-read as Windows-1252)
  [/вЂ™/g, "'"],      // right single quote '
  [/вЂ˜/g, "'"],      // left single quote '
  [/вЂ"/g, "—"],      // em dash —
  [/вЂ"/g, "–"],      // en dash –
  [/вЂ¦/g, "..."],    // ellipsis
  [/вЂ¢/g, "•"],      // bullet
  [/в–є/g, "►"],      // triangle bullet
  [/в–¶/g, "►"],      // triangle bullet variant
  [/Г±/g, "ñ"],
  [/\f/g, "\n"],       // form feeds -> newlines
  [/\r\n/g, "\n"],     // CRLF -> LF
  [/[ \t]+\n/g, "\n"], // trailing spaces
  [/\n{4,}/g, "\n\n"], // multiple blank lines -> double
];

let fixed = text;
for (const [from, to] of fixes) {
  fixed = fixed.replace(from, to);
}

// Statistika
const origLen = text.length;
const fixedLen = fixed.length;
const remaining = (fixed.match(/вЂ|в–|Г±/g) || []).length;

fs.writeFileSync(output, fixed, 'utf8');
console.log(`✓ Tuzatildi: ${input} -> ${output}`);
console.log(`  Uzunlik: ${origLen} -> ${fixedLen} char`);
console.log(`  Qolgan muammo belgilari: ${remaining}`);
console.log(`  Birinchi 500 char:`);
console.log(fixed.slice(0, 500));
