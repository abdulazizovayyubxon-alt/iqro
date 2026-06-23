import fs from "fs";
const SRC = "chqbt_app_import.json";
const d = JSON.parse(fs.readFileSync(SRC, "utf8"));

// ── Harbiy tarix / sarkardalar (spesda YO'Q) ──
const NAMES = ["jaloliddin","manguberdi","amir temur","\\btemur\\b","temuriy","\\bbobur","chingizxon","chingiz","spitamen","to[‘'`]?maris","tomiris","shayboniy","ulug[‘'`]?bek","napoleon","aleksandr makedon","makedonskiy","qutayba","muqanna","spartak","gannibal","\\bsezar","to[‘'`]?xtamish"];
const PHRASES = ["harbiy tarix","jahon urush","ikkinchi jahon","birinchi jahon","tarixiy jang","lashkarboshi","sarkard","parvon dasht","xorazmshoh","mo[‘'`]?g[‘'`]?ul qo","o[‘'`]?rta asr","miloddan avval","temur tuzuk","sind daryosi","stalingrad","berlin jang","hiroshima"];
const histRe = new RegExp("(" + [...NAMES, ...PHRASES].join("|") + ")", "i");
// Faqat SAVOL MATNI bo'yicha — izohdagi tasodifiy nom (mas. "Amir Temur jangovar bayrog'i" mukofoti) yolg'on-mos bermasligi uchun
const isHist = q => histRe.test(q.q || "");

// ── Guard: harbiy xizmatga yaroqlilik stsenariysi (shaxs ismi sifatida) — SAQLANADI ──
const svcRe = /chaqiruv muddat|chaqiruvdan|harbiy xizmatga chaqir|nogiron|kechiktiril|xizmatdan ozod|muddatli xizmat/i;

function shouldRemove(q) {
  if (![0, 1, 3].includes(q.topicId)) return false; // pedagogika (6) tegilmaydi — tarix u yerda dars-foni
  if (!isHist(q)) return false;
  if (svcRe.test(q.q)) return false;  // "Bobur 25 yoshda... chaqiruv muddati" — haqiqiy harbiy-xizmat savoli
  return true;
}

const removed = [], kept = [];
for (const q of d) (shouldRemove(q) ? removed : kept).push(q);

// Removal taqsimoti
const rByTid = {};
for (const q of removed) rByTid[q.topicId] = (rByTid[q.topicId]||0)+1;
console.log("=== OLIB TASHLANADIGAN tarix savollari ===");
console.log("Jami:", removed.length, "| topicId bo'yicha:", JSON.stringify(rByTid));
console.log("Qoladi:", kept.length, "(oldin", d.length + ")");

// Saqlangan soxta-mos (sanity): isHist bo'lsa-yu, saqlangan
const keptHist = kept.filter(isHist);
console.log("\nisHist=true, lekin SAQLANGAN (guard tufayli):", keptHist.length);
keptHist.slice(0,12).forEach(q=>console.log(`   [tid${q.topicId}] ${q.q.slice(0,80)}`));

fs.writeFileSync("pipeline/_chqbt_removed_history.json", JSON.stringify(removed, null, 1));

if (process.argv.includes("--write")) {
  fs.writeFileSync(SRC, JSON.stringify(kept));
  console.log("\n>>> YOZILDI: " + SRC + " (" + kept.length + " savol)");
}
