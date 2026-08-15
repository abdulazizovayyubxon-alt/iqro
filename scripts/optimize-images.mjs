#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════
// optimize-images.mjs — public/ dagi savol rasmlarini JOYIDA siqadi.
//
// MUAMMO (2026-08-15 o'lchovi):
//   public/art_img  → 65 MB / 85 fayl (o'rtacha 770 KB, eng kattasi 1.4 MB)
//   public/images   → 19 MB / 91 fayl
//   Rasm ekranda ko'pi bilan 340px balandlikda ko'rsatiladi
//   (QuestionMedia.jsx), kattalashtirilganda ham telefon ekrani bo'yicha.
//   Ya'ni 3000px li asl nusxa BUTUNLAY behuda yuklanadi.
//
// NEGA KENGAYTMA O'ZGARMAYDI (WebP emas):
//   Rasm manzillari savol hujjatlarining `image` maydonida Firestore'da
//   saqlanadi. `.jpg` → `.webp` qilinsa, ~47 000 savol hujjatini yangilash
//   kerak bo'lardi (qimmat va xavfli). Shuning uchun fayl NOMI ham,
//   KENGAYTMASI ham o'zgarmaydi — faqat ichi qayta kodlanadi.
//
// XAVFSIZLIK: asl nusxalar avval `image-backup/` ga ko'chiriladi
// (.gitignore da). Natija yoqmasa shu papkadan qaytarish mumkin.
//
// FOYDALANISH:
//   node scripts/optimize-images.mjs              # faqat hisobot (hech narsa yozilmaydi)
//   node scripts/optimize-images.mjs --write      # zaxira + joyida siqish
//   node scripts/optimize-images.mjs --write --max-width 1600
// ════════════════════════════════════════════════════════════════════════

import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Keshsiz — sharp fayl deskriptorlarini ushlab turmasin (Windows'da o'sha
// faylning ustiga yozishni bloklaydi).
sharp.cache(false);

const ROOT = path.resolve(process.cwd());
const TARGET_DIRS = ['public/art_img', 'public/images'];
const BACKUP_DIR = path.join(ROOT, 'image-backup');

const argv = process.argv.slice(2);
const write = argv.includes('--write');
const maxWidthArg = argv.indexOf('--max-width');
// 1200px — 340px li ko'rinish uchun ham, to'liq ekran zoom uchun ham
// (3x DPR telefonda ~400px CSS kengligi) yetarli zaxira bilan.
const MAX_WIDTH = maxWidthArg !== -1 ? Number(argv[maxWidthArg + 1]) : 1200;

const JPEG_QUALITY = 78;   // 78 — ko'z bilan farqi sezilmaydi, hajmi ~5x kichik
const PNG_QUALITY = 80;

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + ' KB';
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

async function listImages(dir) {
  const abs = path.join(ROOT, dir);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    console.warn(`⚠️  ${dir} topilmadi — o'tkazib yuborildi`);
    return [];
  }
  return entries
    .filter((e) => e.isFile() && /\.(jpe?g|png)$/i.test(e.name))
    .map((e) => path.join(abs, e.name));
}

/**
 * Manba fayl yo'li: zaxira mavjud bo'lsa — AYNAN O'SHA.
 *
 * NEGA: skript ikkinchi marta ishlatilsa (masalan birinchisi yarim yo'lda
 * uzilgan bo'lsa) allaqachon siqilgan faylni QAYTA siqish sifatni ikki karra
 * yo'qotardi. Zaxiradan o'qish skriptni idempotent qiladi — natija har doim
 * asl nusxadan bir marta siqilgan bo'ladi.
 */
function sourceOf(file) {
  return path.join(BACKUP_DIR, path.relative(ROOT, file));
}

/** Bitta faylni siqadi. Natija asl nusxadan kichik bo'lmasa — TEGILMAYDI. */
async function optimize(file) {
  let src = file;
  try {
    await fs.access(sourceOf(file));
    src = sourceOf(file);
  } catch { /* zaxira yo'q — fayl hali asl holida */ }

  // Faylni AVVAL xotiraga o'qiymiz va sharp'ga bufer beramiz.
  // Windows'da `sharp(path)` fayl deskriptorini ushlab turadi va o'sha faylning
  // ustiga yozmoqchi bo'lganda `EUNKNOWN: open` bilan yiqilardi.
  const input = await fs.readFile(src);
  const before = (await fs.stat(file)).size;
  const ext = path.extname(file).toLowerCase();

  const img = sharp(input, { failOn: 'none' });
  const meta = await img.metadata();

  let pipeline = img.rotate();  // EXIF burilishini pikselga qo'llaydi
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  pipeline = ext === '.png'
    // `palette: true` — diagramma/sxema kabi cheklangan rangli rasmlarni
    // keskin qisqartiradi va chiziqlar tiniqligini saqlaydi.
    ? pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, palette: true, effort: 8 })
    : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true });

  const buf = await pipeline.toBuffer();
  return { before, after: buf.length, buf, width: meta.width, height: meta.height };
}

let totalBefore = 0, totalAfter = 0, changed = 0, skipped = 0;
const plan = [];

for (const dir of TARGET_DIRS) {
  const files = await listImages(dir);
  if (files.length === 0) continue;
  console.log(`\n📁 ${dir} — ${files.length} ta rasm`);

  for (const file of files) {
    let r;
    try {
      r = await optimize(file);
    } catch (e) {
      console.warn(`   ⚠️  ${path.basename(file)} — o'qib bo'lmadi: ${e.message}`);
      continue;
    }
    totalBefore += r.before;

    // Siqilgan variant kattaroq bo'lsa (allaqachon optimal fayl) — tegmaymiz.
    if (r.after >= r.before) {
      totalAfter += r.before;
      skipped++;
      continue;
    }

    totalAfter += r.after;
    changed++;
    const pct = (100 - (r.after / r.before) * 100).toFixed(0);
    console.log(`   ${path.basename(file).padEnd(28)} ${kb(r.before)} → ${kb(r.after)}  (−${pct}%)`);
    plan.push({ file, buf: r.buf });
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Jami:  ${mb(totalBefore)} → ${mb(totalAfter)}   (−${(100 - (totalAfter / totalBefore) * 100).toFixed(1)}%)`);
console.log(`Siqiladi: ${changed} ta | Tegilmaydi (allaqachon optimal): ${skipped} ta`);

if (!write) {
  console.log('\n(hisobot rejimi — hech narsa yozilmadi)');
  console.log('Yozish uchun: node scripts/optimize-images.mjs --write');
  process.exit(0);
}

// ── Zaxira + yozish ──────────────────────────────────────────────────────
console.log(`\n💾 Asl nusxalar zaxiraga: ${path.relative(ROOT, BACKUP_DIR)}/`);
for (const { file, buf } of plan) {
  const backupPath = sourceOf(file);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  // Zaxira allaqachon bo'lsa QAYTA YOZILMAYDI — skript ikki marta ishlatilsa
  // zaxira siqilgan nusxa bilan almashib, asl nusxa yo'qolib ketardi.
  try {
    await fs.access(backupPath);
  } catch {
    await fs.copyFile(file, backupPath);
  }
  await fs.writeFile(file, buf);
}

console.log(`✅ ${plan.length} ta rasm siqildi. Tejaldi: ${mb(totalBefore - totalAfter)}`);
console.log('   Qaytarish: image-backup/public/... dan nusxalang.');
process.exit(0);
