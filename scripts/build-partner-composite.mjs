/**
 * build-partner-composite.mjs — moslashtirish testlari uchun bir nechta rasmni
 * BITTA belgilangan rasmga birlashtiradi.
 *
 * Sabab: platformadagi savol obyektida bitta `image` maydoni bor, bu testlarda
 * esa 1–4 (yoki a–d) belgilari ostida bir nechta surat kerak. Har birini alohida
 * savol qilib bo'lmaydi — moslashtirish testining mazmuni yo'qoladi.
 *
 * Ishlatilishi:
 *   node scripts/build-partner-composite.mjs <rasmlar_papkasi> <chiqish_papkasi> <spec.json>
 *
 * spec.json namunasi:
 *   [{ "out": "hafta2_t21.jpg", "imgs": [1,2,3,4], "labels": "num", "ext": "png" }]
 *   labels: "num" → 1,2,3,4 | "alpha" → A,B,C,D | "lower" → a,b,c,d
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync, readFileSync } from 'node:fs';

const SRC = process.argv[2];   // rasmlar papkasi
const OUT = process.argv[3];   // chiqish papkasi

// Har bir katak — kengroq, chunki qurol suratlari cho'ziq (gorizontal)
const CELL_W = 520;
const CELL_H = 300;
const PAD = 16;
const COLS = 2;

async function build(name, files, labels) {
  const ROWS = Math.ceil(files.length / COLS);
  const W = CELL_W * COLS;
  const H = CELL_H * ROWS;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Oq fon — asl suratlar ham oq fonda, chegara ko'rinmasin
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < files.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x0 = col * CELL_W;
    const y0 = row * CELL_H;

    const img = await loadImage(files[i]);

    // Katakka sig'dirib, nisbatni saqlaymiz
    const maxW = CELL_W - PAD * 2 - 40; // 40 — raqam nishoni uchun joy
    const maxH = CELL_H - PAD * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = x0 + 40 + (CELL_W - 40 - w) / 2;
    const y = y0 + (CELL_H - h) / 2;

    ctx.drawImage(img, x, y, w, h);

    // Raqam nishoni — to'q ko'k doira, oq raqam
    const cx = x0 + 30;
    const cy = y0 + 34;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0E97E0';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], cx, cy + 1);
  }

  // Kataklar orasidagi ingichka chiziqlar
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CELL_W, 0); ctx.lineTo(CELL_W, H);
  for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, CELL_H * r); ctx.lineTo(W, CELL_H * r); }
  ctx.stroke();

  // JPEG — suratlar fotografik, PNG'da 3 barobar og'ir chiqadi. Telefonda
  // ochiladigan savol rasmi uchun ortiqcha yuk (public/art_img ham .jpg).
  const buf = canvas.toBuffer('image/jpeg', 88);
  writeFileSync(`${OUT}/${name}`, buf);
  console.log(`${name}: ${Math.round(buf.length / 1024)} KB`);
}

const SPEC = JSON.parse(readFileSync(process.argv[4], 'utf8'));
const LABELS = {
  num: ['1', '2', '3', '4', '5', '6'],
  alpha: ['A', 'B', 'C', 'D', 'E', 'F'],
  lower: ['a', 'b', 'c', 'd', 'e', 'f'],
};

for (const item of SPEC) {
  const ext = item.ext || 'png';
  const files = item.imgs.map((n) => `${SRC}/img${n}.${ext}`);
  await build(item.out, files, LABELS[item.labels || 'num']);
}
