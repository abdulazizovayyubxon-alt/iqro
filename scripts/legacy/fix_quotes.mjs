import { readFileSync, writeFileSync } from 'fs';

const path = "fan/chqbt_yangi/045_fv_ta'rif_vazifalari.json";
let txt = readFileSync(path, 'utf8');

// Fix single-quote delimited JSON string values
// Pattern: colon + optional whitespace + single-quote + content + single-quote
// Replace with double-quoted version
let result = '';
let i = 0;
while (i < txt.length) {
  // Look for pattern: ': '
  if (txt[i] === ':' && i + 2 < txt.length) {
    let j = i + 1;
    // Skip whitespace
    while (j < txt.length && (txt[j] === ' ' || txt[j] === '\n' || txt[j] === '\r' || txt[j] === '\t')) j++;
    if (j < txt.length && txt[j] === "'") {
      // Found single-quoted value - find the closing single quote
      let k = j + 1;
      let inner = '';
      while (k < txt.length && txt[k] !== "'") {
        inner += txt[k];
        k++;
      }
      if (k < txt.length && txt[k] === "'") {
        // Replace with double-quoted
        // Fix any \" sequences (from prev bad fix) in inner
        inner = inner.replace(/\\"/g, '\\"');
        // Escape any unescaped double quotes
        inner = inner.replace(/(?<!\\)"/g, '\\"');
        // Rebuild: from i to j (colon + spaces) + double-quoted inner
        result += txt.slice(i, j) + '"' + inner + '"';
        i = k + 1;
        continue;
      }
    }
  }
  result += txt[i];
  i++;
}

writeFileSync(path, result, 'utf8');

// Test
try {
  JSON.parse(readFileSync(path, 'utf8'));
  console.log('VALID JSON after fix');
} catch(e) {
  console.log('Still invalid:', e.message);
  // Show context
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    const ctx = readFileSync(path, 'utf8');
    console.log('Context:', JSON.stringify(ctx.slice(Math.max(0,pos-30), pos+30)));
  }
}
