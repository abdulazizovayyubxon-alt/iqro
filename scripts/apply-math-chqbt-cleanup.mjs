import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, query, where, writeBatch
} from 'firebase/firestore';

const SUPER_DIGITS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'n': 'ⁿ', 'k': 'ᵏ', 'm': 'ᵐ', 'x': 'ˣ'
};

function toSuper(str) {
  return String(str).split('').map(ch => SUPER_DIGITS[ch] || ch).join('');
}

export function cleanText(str) {
  if (!str || typeof str !== 'string') return str;

  let s = str;

  // 1. Remove internal question tags
  s = s.replace(/\s*\((?:FM|Nizomiy|Vaziyat|Metodik|Taktik|Qurol|Tibbiy|Topografik)?\s*tahlil[i]?\s*#\s*\d+\s*\)/gi, '');
  s = s.replace(/\s*\(Savol kodi:\s*#[a-zA-Z0-9_-]+\)/gi, '');
  s = s.replace(/\s*\(Test kodi:\s*#[a-zA-Z0-9_-]+\)/gi, '');
  s = s.replace(/\s*\(#\d+\)/g, '');

  // 2. Escaped characters in LaTeX: \%, \&, \#, \_
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\&/g, '&');
  s = s.replace(/\\#/g, '#');
  s = s.replace(/\\_/g, '_');

  // 3. Normalize fractions with unbraced single tokens
  s = s.replace(/\\(?:c)?frac\s*\{([^{}]+)\}\s*([0-9a-zA-Z])/g, '\\frac{$1}{$2}');
  s = s.replace(/\\(?:c)?frac\s*([0-9a-zA-Z])\s*\{([^{}]+)\}/g, '\\frac{$1}{$2}');
  s = s.replace(/\\(?:c)?frac\s*([0-9a-zA-Z])\s+([0-9a-zA-Z])/g, '\\frac{$1}{$2}');

  // 4. LaTeX text wrappers
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\operatorname\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
    s = s.replace(/\\mathbf\{([^{}]+)\}/g, '$1');
  }
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\mathbb\{Q\}/g, 'ℚ');
  s = s.replace(/\\mathbb\{C\}/g, 'ℂ');
  s = s.replace(/\\mathbb\{([^{}]+)\}/g, '$1');

  // 5. Matrix & cases environments
  s = s.replace(/\\begin\{cases\}/g, '').replace(/\\end\{cases\}/g, '');
  s = s.replace(/\\begin\{vmatrix\}/g, '|').replace(/\\end\{vmatrix\}/g, '|');
  s = s.replace(/\\begin\{matrix\}/g, '').replace(/\\end\{matrix\}/g, '');
  s = s.replace(/\\\\/g, '; ');

  // 6. Spacing commands
  s = s.replace(/\\[,;:!]/g, ' ');
  s = s.replace(/\\quad/g, ' ');
  s = s.replace(/\\qquad/g, '  ');

  // 7. Overline, underbrace, vectors, binom, pmod
  s = s.replace(/\\underbrace\{([^{}]+)\}_\{([^{}]+)\}/g, '$1 ($2)');
  s = s.replace(/\\underbrace\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\overline\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\bar\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\vec\{([^{}]+)\}/g, '$1');
  s = s.replace(/\\vec\s+([a-zA-Z]+)/g, '$1');
  s = s.replace(/\\binom\{([^{}]+)\}\{([^{}]+)\}/g, 'C($1, $2)');
  s = s.replace(/\\pmod\{([^{}]+)\}/g, '(mod $1)');
  s = s.replace(/\\pmod\s+([a-zA-Z0-9]+)/g, '(mod $1)');

  // 8. Loop inner-most fractions and roots FIRST
  let changed = true;
  let loops = 0;
  while (changed && loops < 12) {
    loops++;
    const prev = s;
    s = s.replace(/\\sqrt\[([^{}\]]+)\]\{([^{}]+)\}/g, (match, idx, content) => {
      const sup = toSuper(idx);
      return `${sup}√(${content})`;
    });
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
    s = s.replace(/\\(?:c)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
    s = s.replace(/\^\{\\circ\}|\^\\circ/g, '°');
    s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
    s = s.replace(/_\{([^{}]+)\}/g, '_($1)');
    changed = s !== prev;
  }
  s = s.replace(/\\sqrt([0-9a-zA-Z])/g, '√$1');

  // 9. Superscripts and Subscripts
  s = s.replace(/\^0(?![0-9])|\^\{0\}/g, '⁰');
  s = s.replace(/\^1(?![0-9])|\^\{1\}/g, '¹');
  s = s.replace(/\^2(?![0-9])|\^\{2\}/g, '²');
  s = s.replace(/\^3(?![0-9])|\^\{3\}/g, '³');
  s = s.replace(/\^4(?![0-9])|\^\{4\}/g, '⁴');
  s = s.replace(/\^5(?![0-9])|\^\{5\}/g, '⁵');
  s = s.replace(/\^6(?![0-9])|\^\{6\}/g, '⁶');
  s = s.replace(/\^7(?![0-9])|\^\{7\}/g, '⁷');
  s = s.replace(/\^8(?![0-9])|\^\{8\}/g, '⁸');
  s = s.replace(/\^9(?![0-9])|\^\{9\}/g, '⁹');
  s = s.replace(/\^n(?![a-zA-Z])|\^\{n\}/g, 'ⁿ');
  s = s.replace(/\^x(?![a-zA-Z])|\^\{x\}/g, 'ˣ');
  s = s.replace(/\^\{\+\}/g, '⁺');
  s = s.replace(/\^\{\-\}/g, '⁻');
  for (let iter = 0; iter < 3; iter++) {
    s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
  }

  s = s.replace(/_0(?![0-9])|_\{0\}/g, '₀');
  s = s.replace(/_1(?![0-9])|_\{1\}/g, '₁');
  s = s.replace(/_2(?![0-9])|_\{2\}/g, '₂');
  s = s.replace(/_3(?![0-9])|_\{3\}/g, '₃');
  s = s.replace(/_4(?![0-9])|_\{4\}/g, '₄');
  s = s.replace(/_n(?![a-zA-Z])|_\{n\}/g, 'ₙ');
  for (let iter = 0; iter < 3; iter++) {
    s = s.replace(/_\{([^{}]+)\}/g, '_($1)');
  }

  // 10. Delimiters
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
  s = s.replace(/\\left\./g, '').replace(/\\right\./g, '');
  s = s.replace(/\\left/g, '').replace(/\\right/g, '');
  s = s.replace(/\\lfloor\s*/g, '⌊').replace(/\\rfloor\s*/g, '⌋');
  s = s.replace(/\\lceil\s*/g, '⌈').replace(/\\rceil\s*/g, '⌉');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

  // 11. Math symbols and operators
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\cdots/g, '···');
  s = s.replace(/\\dots/g, '...');
  s = s.replace(/\\vdots/g, '⋮');
  s = s.replace(/\\times(?![a-zA-Z])/g, '×');
  s = s.replace(/\\div(?![a-zA-Z])/g, '÷');
  s = s.replace(/\\pm(?![a-zA-Z])/g, '±');
  s = s.replace(/\\mp(?![a-zA-Z])/g, '∓');
  s = s.replace(/\\le(?![a-zA-Z])|\\leq(?![a-zA-Z])/g, '≤');
  s = s.replace(/\\ge(?![a-zA-Z])|\\geq(?![a-zA-Z])/g, '≥');
  s = s.replace(/\\ne(?![a-zA-Z])|\\neq(?![a-zA-Z])/g, '≠');
  s = s.replace(/\\approx(?![a-zA-Z])/g, '≈');
  s = s.replace(/\\sim(?![a-zA-Z])/g, '∼');
  s = s.replace(/\\equiv(?![a-zA-Z])/g, '≡');
  s = s.replace(/\\propto(?![a-zA-Z])/g, '∝');
  s = s.replace(/\\ll(?![a-zA-Z])/g, '≪');
  s = s.replace(/\\infty(?![a-zA-Z])/g, '∞');
  s = s.replace(/\\in(?![a-zA-Z])/g, '∈');
  s = s.replace(/\\notin(?![a-zA-Z])/g, '∉');
  s = s.replace(/\\subset(?![a-zA-Z])/g, '⊂');
  s = s.replace(/\\cup(?![a-zA-Z])/g, '∪');
  s = s.replace(/\\cap(?![a-zA-Z])/g, '∩');
  s = s.replace(/\\emptyset(?![a-zA-Z])/g, '∅');
  s = s.replace(/\\setminus(?![a-zA-Z])/g, '∖');
  s = s.replace(/\\forall(?![a-zA-Z])/g, '∀');
  s = s.replace(/\\exists(?![a-zA-Z])/g, '∃');
  s = s.replace(/\\implies(?![a-zA-Z])|\\Rightarrow(?![a-zA-Z])/g, '⇒');
  s = s.replace(/\\iff(?![a-zA-Z])|\\Leftrightarrow(?![a-zA-Z])/g, '⇔');
  s = s.replace(/\\to(?![a-zA-Z])|\\rightarrow(?![a-zA-Z])/g, '→');
  s = s.replace(/\\mapsto(?![a-zA-Z])/g, '↦');
  s = s.replace(/\\angle(?![a-zA-Z])/g, '∠');
  s = s.replace(/\\triangle(?![a-zA-Z])/g, '△');
  s = s.replace(/\\perp(?![a-zA-Z])/g, '⊥');
  s = s.replace(/\\parallel(?![a-zA-Z])/g, '∥');
  s = s.replace(/\\mid(?![a-zA-Z])/g, '|');
  s = s.replace(/\\nmid(?![a-zA-Z])/g, '∤');
  s = s.replace(/\\smile(?![a-zA-Z])/g, '⌒');
  s = s.replace(/\\neg(?![a-zA-Z])/g, '¬');
  s = s.replace(/\\land(?![a-zA-Z])/g, '∧');
  s = s.replace(/\\circ(?![a-zA-Z])/g, '°');
  s = s.replace(/\\deg(?![a-zA-Z])/g, '°');
  s = s.replace(/\\sum(?![a-zA-Z])/g, '∑');
  s = s.replace(/\\prod(?![a-zA-Z])/g, '∏');
  s = s.replace(/\\int(?![a-zA-Z])/g, '∫');

  // Greek letters
  s = s.replace(/\\alpha(?![a-zA-Z])/g, 'α');
  s = s.replace(/\\beta(?![a-zA-Z])/g, 'β');
  s = s.replace(/\\gamma(?![a-zA-Z])/g, 'γ');
  s = s.replace(/\\delta(?![a-zA-Z])/g, 'δ');
  s = s.replace(/\\Delta(?![a-zA-Z])/g, 'Δ');
  s = s.replace(/\\epsilon(?![a-zA-Z])|\\varepsilon(?![a-zA-Z])/g, 'ε');
  s = s.replace(/\\lambda(?![a-zA-Z])/g, 'λ');
  s = s.replace(/\\mu(?![a-zA-Z])/g, 'μ');
  s = s.replace(/\\pi(?![a-zA-Z])/g, 'π');
  s = s.replace(/\\Pi(?![a-zA-Z])/g, 'Π');
  s = s.replace(/\\sigma(?![a-zA-Z])/g, 'σ');
  s = s.replace(/\\tau(?![a-zA-Z])/g, 'τ');
  s = s.replace(/\\phi(?![a-zA-Z])|\\varphi(?![a-zA-Z])/g, 'φ');
  s = s.replace(/\\Phi(?![a-zA-Z])/g, 'Φ');
  s = s.replace(/\\theta(?![a-zA-Z])/g, 'θ');
  s = s.replace(/\\omega(?![a-zA-Z])/g, 'ω');
  s = s.replace(/\\Omega(?![a-zA-Z])/g, 'Ω');
  s = s.replace(/\\xi(?![a-zA-Z])/g, 'ξ');
  s = s.replace(/\\psi(?![a-zA-Z])/g, 'ψ');
  s = s.replace(/\\Psi(?![a-zA-Z])/g, 'Ψ');

  // Math functions
  s = s.replace(/\\sin(?![a-zA-Z])/g, 'sin');
  s = s.replace(/\\cos(?![a-zA-Z])/g, 'cos');
  s = s.replace(/\\tan(?![a-zA-Z])/g, 'tan');
  s = s.replace(/\\cot(?![a-zA-Z])/g, 'cot');
  s = s.replace(/\\arcsin(?![a-zA-Z])/g, 'arcsin');
  s = s.replace(/\\arccos(?![a-zA-Z])/g, 'arccos');
  s = s.replace(/\\arctan(?![a-zA-Z])/g, 'arctan');
  s = s.replace(/\\log(?![a-zA-Z])/g, 'log');
  s = s.replace(/\\ln(?![a-zA-Z])/g, 'ln');
  s = s.replace(/\\lg(?![a-zA-Z])/g, 'lg');
  s = s.replace(/\\lim(?![a-zA-Z])/g, 'lim');
  s = s.replace(/\\min(?![a-zA-Z])/g, 'min');
  s = s.replace(/\\max(?![a-zA-Z])/g, 'max');
  s = s.replace(/\\sup(?![a-zA-Z])/g, 'sup');
  s = s.replace(/\\gcd(?![a-zA-Z])/g, 'EKUB');

  // 12. Final pass on any leftover \frac or \sqrt
  for (let iter = 0; iter < 4; iter++) {
    s = s.replace(/\\(?:c)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  }

  // 13. Strip $ delimiters
  s = s.replace(/\$([^\$]+)\$/g, '$1');
  s = s.replace(/\$/g, '');

  // 14. Clean up stray curly brackets around standalone tokens
  s = s.replace(/\{([a-zA-Z0-9_+\-·=]+)\}/g, '$1');

  // 15. Normalise extra spaces
  s = s.replace(/[ \t]+/g, ' ').trim();

  return s;
}

const MAX_CHUNK_BYTES = 800 * 1024;
function chunkQuestions(list) {
  const chunks = [];
  let cur = [];
  let curBytes = 2;
  for (const q of list) {
    const s = JSON.stringify(q);
    const add = Buffer.byteLength(s, 'utf8') + 1;
    if (cur.length > 0 && curBytes + add > MAX_CHUNK_BYTES) {
      chunks.push(cur);
      cur = [];
      curBytes = 2;
    }
    cur.push(q);
    curBytes += add;
  }
  if (cur.length > 0) chunks.push(cur);
  return chunks;
}

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(`\n=============================================================`);
  console.log(`🚀 MATEMATIKA VA CHQBT TOZALASH VA DEPLOY QILISH ${DRY ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`=============================================================\n`);

  // 1. Process Matematika
  const matPath = 'fan 4/_app/matematika.json';
  const rawMat = JSON.parse(fs.readFileSync(matPath, 'utf8'));
  const cleanMat = rawMat.map(q => ({
    ...q,
    q: cleanText(q.q),
    opts: q.opts.map(cleanText),
    explanation: cleanText(q.explanation || ''),
    mnemonic: cleanText(q.mnemonic || '')
  }));

  // Verify Matematika quality
  const matStems = new Set();
  let matDups = 0;
  cleanMat.forEach(q => {
    const s = q.q.toLowerCase().replace(/[`‘’ʻʼ']/g, "'").replace(/\s+/g, ' ').trim();
    if (matStems.has(s)) matDups++;
    else matStems.add(s);
  });
  console.log(`✓ Matematika: ${cleanMat.length} ta savol | 0 duplikat kutilgan, topildi: ${matDups}`);
  if (matDups > 0) throw new Error('Matematika duplicate detected!');

  // 2. Process CHQBT
  const chqbtPath = 'src/data/questions_chqbt.json';
  const rawChqbt = JSON.parse(fs.readFileSync(chqbtPath, 'utf8'));
  const cleanChqbt = rawChqbt.map(q => ({
    ...q,
    q: cleanText(q.q),
    opts: q.opts.map(cleanText),
    explanation: cleanText(q.explanation || ''),
    mnemonic: cleanText(q.mnemonic || '')
  }));

  // Verify CHQBT quality
  const chqbtStems = new Set();
  let chqbtDups = 0;
  cleanChqbt.forEach(q => {
    const s = q.q.toLowerCase().replace(/[`‘’ʻʼ']/g, "'").replace(/\s+/g, ' ').trim();
    if (chqbtStems.has(s)) chqbtDups++;
    else chqbtStems.add(s);
  });
  console.log(`✓ CHQBT: ${cleanChqbt.length} ta savol | 0 duplikat kutilgan, topildi: ${chqbtDups}`);
  if (chqbtDups > 0) throw new Error('CHQBT duplicate detected!');

  if (!DRY) {
    // Write cleaned local files
    fs.writeFileSync(matPath, JSON.stringify(cleanMat, null, 2), 'utf8');
    fs.writeFileSync(chqbtPath, JSON.stringify(cleanChqbt, null, 2), 'utf8');
    console.log(`\n💾 Lokal fayllar yangilandi:`);
    console.log(`   - ${matPath}`);
    console.log(`   - ${chqbtPath}`);
  }

  // 3. Connect to Firebase
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL / ADMIN_PASSWORD topilmadi');
    process.exit(1);
  }

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
  const db = getFirestore(app);
  await signInWithEmailAndPassword(getAuth(app), email, password);
  console.log(`✓ Firebase ga ulandi (${email})`);

  // 4. Update Firestore questionBundles for Matematika and CHQBT
  const nowIso = new Date().toISOString();

  for (const item of [
    { cat: 'matematika', list: cleanMat.map(({ docId, ...d }) => ({ id: docId, ...d })) },
    { cat: 'chqbt', list: cleanChqbt }
  ]) {
    const chunks = chunkQuestions(item.list);
    console.log(`\n📦 ${item.cat}: ${item.list.length} ta savol, ${chunks.length} ta bo'lak`);
    if (DRY) {
      console.log(`   [dry-run] questionBundles/${item.cat}__* yozilardi`);
      continue;
    }

    // Get previous chunk count to prune if needed
    const vref = doc(db, 'settings', 'version');
    const vprev = (await getDoc(vref)).data() || {};
    const prevChunks = Number(vprev.fsBundles?.[item.cat]?.chunks || 0);

    for (let i = 0; i < chunks.length; i++) {
      const json = JSON.stringify(chunks[i]);
      const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(0);
      await setDoc(doc(db, 'questionBundles', `${item.cat}__${i}`), {
        category: item.cat,
        chunk: i,
        chunks: chunks.length,
        count: chunks[i].length,
        data: json,
        updatedAt: nowIso,
      });
      console.log(`   ✓ questionBundles/${item.cat}__${i} (${chunks[i].length} savol, ${kb} KB)`);
    }

    for (let i = chunks.length; i < prevChunks; i++) {
      await deleteDoc(doc(db, 'questionBundles', `${item.cat}__${i}`));
      console.log(`   🗑 questionBundles/${item.cat}__${i} o'chirildi`);
    }

    // Update settings/version
    const dbVersion = Date.now();
    await setDoc(vref, {
      dbVersion,
      fsBundles: {
        ...(vprev.fsBundles || {}),
        [item.cat]: { chunks: chunks.length, count: item.list.length, updatedAt: nowIso },
      },
      questionMeta: {
        ...(vprev.questionMeta || {}),
        [item.cat]: { count: item.list.length, updatedAt: nowIso },
      }
    }, { merge: true });
    console.log(`   ✓ settings/version yangilandi (dbVersion: ${dbVersion})`);
  }

  // 5. Update changed docs in Firestore 'questions' collection for offline/fallback
  if (!DRY) {
    console.log(`\n📝 Firestore 'questions' kolleksiyasini yangilash (BATCH yozuv)...`);
    
    // Matematika
    const BATCH_SIZE = 400;
    let matWritten = 0;
    for (let i = 0; i < cleanMat.length; i += BATCH_SIZE) {
      const batchSlice = cleanMat.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const q of batchSlice) {
        const { docId, ...data } = q;
        batch.set(doc(db, 'questions', docId), data, { merge: true });
      }
      await batch.commit();
      matWritten += batchSlice.length;
      process.stdout.write(`\r   Matematika questions: ${matWritten} / ${cleanMat.length} yozildi`);
    }
    console.log('');

    // CHQBT
    let chqbtWritten = 0;
    for (let i = 0; i < cleanChqbt.length; i += BATCH_SIZE) {
      const batchSlice = cleanChqbt.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const q of batchSlice) {
        const { id, ...data } = q;
        batch.set(doc(db, 'questions', id), data, { merge: true });
      }
      await batch.commit();
      chqbtWritten += batchSlice.length;
      process.stdout.write(`\r   CHQBT questions: ${chqbtWritten} / ${cleanChqbt.length} yozildi`);
    }
    console.log('');
  }

  console.log(`\n🎉 HAMMASI MUVAFFAQIYATLI YAKUNLANDI!`);
}

main().catch(err => {
  console.error('❌ Xato:', err);
  process.exit(1);
});
