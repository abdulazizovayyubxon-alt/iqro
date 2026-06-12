// Mavjud savollarni turli manbalardan yuklash: .json (massiv yoki {questions:[]}),
// .js (export const ... = [...]), va papkalar (ichidagi barcha .json).
// Dedup registri va namuna langarlari uchun ishlatiladi.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// Bitta obyekt savolga o'xshaydimi? (question/q + options/opts bor)
function looksLikeQuestion(o) {
  if (!o || typeof o !== "object") return false;
  const hasQ = typeof o.question === "string" || typeof o.q === "string";
  const hasOpt = o.options || Array.isArray(o.opts);
  return hasQ && !!hasOpt;
}

function pickArrays(value, out) {
  if (Array.isArray(value)) {
    if (value.some(looksLikeQuestion)) out.push(...value.filter(looksLikeQuestion));
    return;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.questions)) {
      out.push(...value.questions.filter(looksLikeQuestion));
      return;
    }
    for (const v of Object.values(value)) pickArrays(v, out);
  }
}

async function loadJsModule(absPath) {
  const out = [];
  try {
    const mod = await import(pathToFileURL(absPath).href + `?t=${Date.now()}`);
    for (const v of Object.values(mod)) pickArrays(v, out);
  } catch (e) {
    // ESM import bo'lmasa — matndan qo'pol ajratish (zaxira)
    try {
      const txt = fs.readFileSync(absPath, "utf8");
      const m = txt.match(/\[[\s\S]*\]/);
      if (m) pickArrays(JSON.parse(m[0].replace(/,\s*]/g, "]")), out);
    } catch {}
  }
  return out;
}

export async function loadFile(p) {
  if (!fs.existsSync(p)) return [];
  const ext = path.extname(p).toLowerCase();
  if (ext === ".json") {
    try {
      const out = [];
      pickArrays(JSON.parse(fs.readFileSync(p, "utf8")), out);
      return out;
    } catch { return []; }
  }
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    return await loadJsModule(path.resolve(p));
  }
  return [];
}

// Papka yoki fayl yo'lini yuklaydi (papka bo'lsa — ichidagi barcha .json).
export async function loadPath(p) {
  if (!fs.existsSync(p)) return [];
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    const out = [];
    for (const f of fs.readdirSync(p).filter((x) => x.endsWith(".json")).sort()) {
      out.push(...(await loadFile(path.join(p, f))));
    }
    return out;
  }
  return await loadFile(p);
}

// Bir nechta yo'ldan yuklab, yagona massivga jamlaydi.
export async function loadMany(paths = []) {
  const out = [];
  for (const p of paths) out.push(...(await loadPath(p)));
  return out;
}
