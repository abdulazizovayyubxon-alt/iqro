#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// parse.mjs — `fan/namuna txt/*.txt` → `pipeline/namuna/parsed/<cat>.json`
//
// NEGA KERAK: mavjud `fan/*_savollar.json` ekstraksiyasi BUZUQ — moslashtirish
// va "to'g'ri mulohazalarni tanlang" turidagi savollarning o'zak ro'yxati
// (1., 2., 3., 4. bandlari) tushib qolgan, savolning faqat oxirgi qatori
// saqlangan. Masalan tarix #7 da butun ro'yxat yo'qolib, "Kesh hokimi Hoji
// Barlos..." qatorigina qolgan — bunday savolga javob berib bo'lmaydi.
// Shu sabab manba sifatida FAQAT txt ishlatiladi.
//
// AJRATISH MANTIG'I: variantlar bloki (A) B) C) D) ketma-ket) — savol
// chegarasi. Bir blokdan keyingi matn to'g'ridan-to'g'ri keyingi savolning
// o'zagi. O'zak ichidagi `1.`/`a)` bandlari saqlanadi.
//
// FOYDALANISH:  node pipeline/namuna/parse.mjs
// ════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SRC = path.join(ROOT, 'fan/namuna txt');
const OUT = path.join(ROOT, 'pipeline/namuna/parsed');

const FILES = {
  chqbt:        'CHQBT_savollar.txt',
  art:          'savolar_tasviriy_savollar.txt',
  tarix:        'tarix_savollar.txt',
  sport:        'Jtar_savollar.txt',
  boshlangich:  'boshlangich_savollar.txt',
  info:         'informatika_savollar.txt',
  mtt:          'MTT_tarbiyachi_savollar.txt',
  til:          'ona_tili_savollar.txt',
  mtt_rahbar:   'MTT_direktor_orinbosari_savollar.txt',
  biologiya:    'biologiya_savollar.txt',
  geografiya:   'geografiya_savollar.txt',
  mtt_logoped:  'MTT_logoped_savollar.txt',
  mtt_psixolog: 'MTT_psixolog_savollar.txt',
};

// Savol matnisiz javob berib bo'lmaydigan belgilar
const IMG_MARK = /\[(rasm|grafik|jadval|chizma|diagramma|sxema|badiiy matn|matn)\b|rasmda|grafikda|chizmada|diagrammada|ko'rinmaydi|ko'rinmagan|topilmadi|rasm yo'q/i;
// Bo'lim/sarlavha ajratgichlari
const SECTION = /^\s*(#{3,}|={3,}|-{3,})\s*$|^\s*={0,}\s*TEST\s+([AB])\b|^\s*===\s*(.+?)\s*===\s*$/i;

const isOpt = (line, L) => new RegExp(`^\\s*${L}\\)\\s`).test(line);

fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const [cat, fname] of Object.entries(FILES)) {
  const fp = path.join(SRC, fname);
  if (!fs.existsSync(fp)) { console.error(`❌ ${cat}: ${fname} yo'q`); continue; }
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);

  // ── 1) variant bloklarini topish ───────────────────────────────────────
  // A) dan boshlanib, B) C) D) bilan tugaydigan ketma-ketlik. Variant matni
  // keyingi qatorlarga o'ralishi mumkin — shuning uchun "keyingi harfgacha".
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isOpt(lines[i], 'A')) continue;
    const bounds = { A: i };
    let j = i + 1, ok = true;
    for (const L of ['B', 'C', 'D']) {
      while (j < lines.length && !isOpt(lines[j], L)) {
        // faqat o'ralgan matn qatori bo'lishi mumkin; bo'sh qator yoki yangi
        // savol boshlansa — bu variant bloki emas
        if (!lines[j].trim() || /^\s*\d{1,3}\.\s/.test(lines[j]) || isOpt(lines[j], 'A')) { ok = false; break; }
        j++;
      }
      if (!ok || j >= lines.length) { ok = false; break; }
      bounds[L] = j; j++;
    }
    if (!ok) continue;
    // D) variantining oxiri: bo'sh qator yoki keyingi savol/sarlavha
    let end = bounds.D + 1;
    while (end < lines.length && lines[end].trim() && !/^\s*\d{1,3}\.\s/.test(lines[end]) && !SECTION.test(lines[end])) end++;
    blocks.push({ ...bounds, end });
    i = end - 1;
  }

  // ── 2) har blok uchun o'zakni orqaga qarab yig'ish ─────────────────────
  const items = [];
  let prevEnd = 0, expected = 1, section = null;
  for (const b of blocks) {
    const region = lines.slice(prevEnd, b.A);
    prevEnd = b.end;

    // bo'lim ajratgichi (TEST A / TEST B / === TARIX ===) — raqamlash qaytadan
    for (const ln of region) {
      const m = ln.match(SECTION);
      if (m && (m[2] || m[3])) { section = (m[2] || m[3]).trim(); expected = 1; }
    }

    // o'zak boshlanishi: kutilgan raqamdan (yoki undan keyingi 3 tadan) biri
    let start = -1, num = null;
    for (let cand = expected; cand <= expected + 3 && start < 0; cand++) {
      for (let k = 0; k < region.length; k++) {
        const m = region[k].match(/^\s*(\d{1,3})\.\s/);
        if (m && Number(m[1]) === cand) { start = k; num = cand; break; }
      }
    }
    if (start < 0) { start = 0; num = expected; }
    expected = num + 1;

    const stemLines = region.slice(start).filter((l) => !SECTION.test(l));
    const stem = stemLines.join('\n')
      .replace(/^\s*\d{1,3}\.\s*/, '')       // savol raqamini olib tashlash
      .replace(/[ \t]+\n/g, '\n').trim();

    const opt = (L) => {
      const from = b[L], to = L === 'D' ? b.end : b[{ A: 'B', B: 'C', C: 'D' }[L]];
      return lines.slice(from, to).join(' ')
        .replace(new RegExp(`^\\s*${L}\\)\\s*`), '').replace(/\s+/g, ' ').trim();
    };

    const options = { A: opt('A'), B: opt('B'), C: opt('C'), D: opt('D') };
    const flat = stem.replace(/\s+/g, ' ');
    items.push({
      n: num,
      ...(section ? { section } : {}),
      question: flat,
      options,
      needsContext: IMG_MARK.test(stem),
    });
  }

  fs.writeFileSync(path.join(OUT, `${cat}.json`), JSON.stringify(items, null, 2));

  const ctx = items.filter((q) => q.needsContext).length;
  const short = items.filter((q) => q.question.length < 25).length;
  const dupN = items.length - new Set(items.map((q) => `${q.section || ''}#${q.n}`)).size;
  report.push({ cat, n: items.length, ctx, short, dupN });
  console.log(
    `${cat.padEnd(13)} ${String(items.length).padStart(3)} savol  |  kontekstli ${String(ctx).padStart(2)}` +
    `  |  qisqa o'zak ${short}  |  raqam takrori ${dupN}`,
  );
}

const tot = report.reduce((a, r) => a + r.n, 0);
console.log(`\nJAMI ${tot} savol → pipeline/namuna/parsed/`);
