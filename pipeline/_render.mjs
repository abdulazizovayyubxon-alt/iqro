// PDF sahifalarini PNG'ga chiqaradi (mupdf WASM). node pipeline/_render.mjs <pdf> <out-dir> <from> <to> [dpi]
import * as mupdf from "mupdf";
import fs from "fs";
import path from "path";
const [pdf, outDir, fromS, toS, dpiS] = process.argv.slice(2);
const dpi = parseInt(dpiS || "120", 10);
fs.mkdirSync(outDir, { recursive: true });
const data = fs.readFileSync(pdf);
const doc = mupdf.Document.openDocument(data, "application/pdf");
const n = doc.countPages();
const from = Math.max(1, parseInt(fromS || "1", 10));
const to = Math.min(n, parseInt(toS || String(n), 10));
console.log(`PDF: ${path.basename(pdf)} | jami ${n} sahifa | chiqarish ${from}-${to} @ ${dpi}dpi`);
const zoom = dpi / 72;
for (let i = from; i <= to; i++) {
  const page = doc.loadPage(i - 1);
  const pix = page.toPixmap(mupdf.Matrix.scale(zoom, zoom), mupdf.ColorSpace.DeviceRGB, false);
  const out = path.join(outDir, `p${String(i).padStart(3, "0")}.png`);
  fs.writeFileSync(out, pix.asPNG());
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`  p${i}: ${kb}KB`);
  pix.destroy?.();
  page.destroy?.();
}
console.log("tayyor:", outDir);
