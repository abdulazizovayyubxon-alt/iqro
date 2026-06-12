// 9 ta rasmli savolning cue-leak (uzunlik/harf) muammosini balanslab tuzatadi.
// Chalg'ituvchilar parallel/to'liqroq qilinadi (fakt o'zgarmaydi), 1 izohда harf ishorasi olib tashlanadi.
// node pipeline/patch-rasmli-cue.mjs [--apply]
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";

const apply = process.argv.includes("--apply");
const DIR = "fan/chqbt_yangi/";

// fayl -> id -> {options?:{...}, explanation?, answer-saqlanadi}
const PATCH = {
  rasmli_otish: {
    43: { options: { A: "Yon almashinuv tuynuklari", B: "Magazin yorma yo'li", C: "Stvol ichki rezbasi" } },
  },
  rasmli_saf: {
    12: { options: {
      A: "«ERKIN!» — bir oyoqni bo'shatib turish",
      B: "«ROSTLAN!» — qaddini tik tutish holati",
      D: "«JOYIDA QADAM!» — joyida yurish",
    } },
    24: { options: {
      A: "Ta'minot — kolonna boshida; oldinda vzvodlar 3-2-1 teskari tartibda boshqaruvdan keyin",
      B: "Ta'minot — kolonna o'rtasida; vzvodlar va artilleriya aralash tartibda joylashadi",
      C: "Ta'minot — kolonna boshida, keyin artilleriya, eng oxirida vzvodlar boradi",
    } },
  },
  rasmli_taktik: {
    23: { options: {
      A: "Masofani bevosita metrda ko'rsatuvchi gorizontal lineyka shkalasi",
      B: "Gorizontal va vertikal burchaklarni o'lchaydigan ikkita perpendikulyar shkala",
      C: "Gorizont tomonlarini gradusda ko'rsatuvchi aylanma kompas shkalasi",
      D: "Nishonning harakat tezligini o'lchaydigan maxsus tezlik shkalasi",
    } },
    27: { explanation: "Qo'zg'almas (shikastlantirilmaydigan) maydon — yopiq maydonning mazkur trayektoriyada nishon shikastlanishi mumkin bo'lmagan qismi; uning chuqurligi yopiq va shikastlantiriluvchi maydonlar farqiga teng. Trayektoriyaning pastga ketuvchi qismida nishon balandligidan oshmaydigan joy esa shikastlantiriluvchi maydonga tegishli." },
    31: { options: {
      A: "Daryo yoki suv to'sig'ining shartli chizig'ini",
      B: "Sim to'siq qatorining shartli belgisini",
      C: "Bo'linma egallagan pozitsiya, okop chizig'ini",
      D: "Yurish yo'nalishi, marshrut chizig'ini",
    } },
    32: { options: {
      A: "Punktir — artilleriya o'ti, yaxlit — miltiq-pulemyot o'ti yo'nalishi",
      C: "Punktir — bo'linmaning chekinishi, yaxlit — hujumga o'tish yo'nalishi",
      D: "Ikkalasi ham bir xil harakat yo'nalishini bildiradi",
    } },
    36: { options: {
      A: "Bir tomonga g'ujlab, to'xtovsiz o't ochish",
      B: "Nishonlar bo'yicha taqsimlab o't ochish",
      C: "Joyida turib mudofaa o'tini olib borish",
    } },
  },
  rasmli_tibbiy: {
    6: { options: { A: "Bilak bo'g'imiga", B: "Kaft ustki qismiga", D: "Tirsak bo'g'imiga" } },
  },
};

let patched = 0, stillBad = [];
for (const [file, byId] of Object.entries(PATCH)) {
  const path = DIR + file + ".json";
  const obj = JSON.parse(fs.readFileSync(path, "utf8"));
  for (const [id, ch] of Object.entries(byId)) {
    const q = obj.questions.find((x) => String(x.id) === id);
    if (!q) { console.log(`⚠ ${file} id=${id} topilmadi`); continue; }
    if (ch.options) for (const [k, v] of Object.entries(ch.options)) q.options[k] = v;
    if (ch.explanation) q.explanation = ch.explanation;
    const cl = cueLeakReasons(q);
    if (cl.length) stillBad.push(`${file} id=${id}: ${cl.join("; ")}`);
    else patched++;
  }
  if (apply) fs.writeFileSync(path, JSON.stringify(obj, null, 1), "utf8");
}

console.log(`Tuzatildi (toza): ${patched}`);
if (stillBad.length) { console.log("Hali cue-leak qoldi:"); stillBad.forEach((s) => console.log("  " + s)); }
console.log(apply ? "✓ QO'LLANDI." : "(Ko'rish rejimi — --apply bilan yozing)");
