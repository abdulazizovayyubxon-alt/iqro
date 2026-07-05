// ════════════════════════════════════════════════════════════════════════
// questionFixer — Firestore'dan kelgan savollarni RUNTIME'da tozalaydi.
// Manba (pipeline/Firestore) qayta nashr qilinmasdan ham foydalanuvchi
// toza kontent ko'radi. Test/Imtihon/Takror sahifalari shu funksiyani chaqiradi.
// ════════════════════════════════════════════════════════════════════════

// ── Tipografik normalizatsiya ─────────────────────────────────────────────
// Korpus egri (' ' ʻ) va to'g'ri (') apostroflarni ARALASH ishlatadi
// ("O'zbekiston" ↔ "O‘zbekiston"). Bittaga — to'g'ri ASCII apostrofiga keltiramiz.
const APOS_RE = /[‘’ʻʼ´`]/g; // ' ' ʻ ʼ ´ `  → '
const DQUOTE_RE = /[“”]/g; // " "  → "
function normalizeTypography(s) {
  if (typeof s !== 'string') return s;
  return s.replace(APOS_RE, "'").replace(DQUOTE_RE, '"');
}

// ── Aniq imlo xatolar (konservativ, butun-so'z) ───────────────────────────
// Faqat shubhasiz xatolar; kengaytirish uchun shu yerga qo'shing.
const TYPO_MAP = [
  [/\bVahziri\b/g, 'Vaziri'],
  [/\bShartmasa\b/g, 'Shartnomasa'],
];
function fixTypos(s) {
  if (typeof s !== 'string') return s;
  for (const [re, rep] of TYPO_MAP) s = s.replace(re, rep);
  return s;
}

// ── Foydasiz / xavfli mnemonika ───────────────────────────────────────────
// (a) shablon padding ("Kalit so'zga e'tibor bering...") — har savolda bir xil;
// (b) javob HARFini oshkor qiladigan ("To'g'ri javob: C") — foyda bermaydi va
//     aralashtirishdan keyin chalg'itadi. Bunday mnemonika YASHIRILADI ('').
const GENERIC_MNEMONICS = new Set([
  "kalit so'zga e'tibor bering va javobni vizuallashtiring",
  "kalit so'zga e'tibor bering",
]);
function isJunkMnemonic(m) {
  if (typeof m !== 'string') return true;
  const t = m.trim().replace(/[.\s]+$/, '');
  if (!t) return true;
  if (GENERIC_MNEMONICS.has(t.toLowerCase())) return true;
  if (/^(to'?g'?ri\s+)?javob\s*[:-]?\s*[a-d]\b/i.test(t)) return true; // "To'g'ri javob: C"
  if (/^[a-d]$/i.test(t)) return true; // yolg'iz "C"
  return false;
}

// ── Savol matni padding tozalash ──────────────────────────────────────────
function stripQuestionPadding(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\s*\([^)]*Savol\s+kodi[^)]*\)/gi, '') // (Savol kodi: #...)
    .replace(/\s*#KS\d+\b/gi, '') // #KS1784 teg
    .replace(/^\s*\[\s*Mavzu:[^\]]*\]\s*/i, '') // [Mavzu: ...] prefiks
    .trim();
}

export function processQuestionsOnTheFly(allQ) {
  return allQ.map(qObj => {
    // ── 0. Markazlashgan tozalash (padding + tipografiya + imlo + mnemonika) ──
    let qText = stripQuestionPadding(fixTypos(normalizeTypography(qObj.q || "")));
    let opts = (qObj.opts || []).map(o => fixTypos(normalizeTypography(o)));
    let correct = qObj.correct ?? 0;

    const cleanExplanation = typeof qObj.explanation === 'string'
      ? fixTypos(normalizeTypography(qObj.explanation))
      : qObj.explanation;
    const cleanMnemonicRaw = normalizeTypography(qObj.mnemonic);
    const cleanMnemonic = isJunkMnemonic(cleanMnemonicRaw) ? '' : cleanMnemonicRaw;

    // ── 1. Moslashtirish savollarini (Y2/Y3) dinamik aralashtirish ──
    if (opts.length > 0 && /1\s*[-.]\s*[A-D]/i.test(opts[0])) {
      const lines = qText.split('\n');
      let choiceIndices = [];
      for (let i = 0; i < lines.length; i++) {
        if (/^[A-D][.)-]\s+/i.test(lines[i].trim())) {
          choiceIndices.push(i);
        }
      }

      if (choiceIndices.length >= 2 && choiceIndices.length <= 5) {
        let originalLines = choiceIndices.map(i => lines[i]);
        let originalLetters = originalLines.map(line => line.trim().match(/^[A-D]/i)[0].toUpperCase());
        let bodies = originalLines.map(line => line.replace(/^\s*[A-D][.)-]\s*/i, ''));

        let indices = originalLines.map((_, i) => i);
        // Aralashtirish
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        let newLines = [];
        let mappingOldToNew = {};

        indices.forEach((oldIdx, newIdx) => {
          const newLetter = originalLetters[newIdx];
          const oldLetter = originalLetters[oldIdx];
          newLines.push(`${newLetter}. ${bodies[oldIdx]}`);
          mappingOldToNew[oldLetter] = newLetter;
        });

        choiceIndices.forEach((lineIdx, i) => {
          lines[lineIdx] = newLines[i];
        });

        qText = lines.join('\n');

        let newOptsText = opts.map(opt => {
          return opt.replace(/(\d+)\s*[-.]\s*([A-D])/gi, (match, p1, p2) => {
            const oldL = p2.toUpperCase();
            const newL = mappingOldToNew[oldL] || oldL;
            return `${p1}-${newL}`;
          });
        });

        let optsIndices = [0, 1, 2, 3].slice(0, newOptsText.length);
        for (let i = optsIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optsIndices[i], optsIndices[j]] = [optsIndices[j], optsIndices[i]];
        }

        let finalOpts = [];
        let finalCorrect = 0;

        optsIndices.forEach((oldIdx, newIdx) => {
          const optPrefix = ['A) ', 'B) ', 'C) ', 'D) '][newIdx];
          const optBody = newOptsText[oldIdx].replace(/^[A-D]\)\s*/i, '');
          finalOpts.push(optPrefix + optBody);
          if (oldIdx === correct) {
            finalCorrect = newIdx;
          }
        });

        opts = finalOpts;
        correct = finalCorrect;
      }
    }

    return { ...qObj, q: qText, opts, correct, explanation: cleanExplanation, mnemonic: cleanMnemonic };
  });
}
