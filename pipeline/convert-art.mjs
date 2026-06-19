// Rich (gen) → app format. art_app_import.json ni TO'LIQ quradi:
//   mutaxassislik (2304) → topicId 7-13 (mazmun bo'yicha klassifikatsiya)
//   umumiy ped+kasb hovuzi (483) → topicId 14
//   tasviriy o'qitish metodikasi (146) → topicId 14 (hovuzga nisbatan dedup)
// node pipeline/convert-art.mjs
import fs from "fs";
import { normalize, trigrams, jaccard } from "./lib/normalize.mjs";
const LETTERS = ["A", "B", "C", "D"];
const load = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const valid = (q) => q.question && q.options && LETTERS.every((L) => q.options[L]) && LETTERS.includes(q.answer);
const toApp = (q, topicId) => ({
  q: q.question,
  opts: LETTERS.map((L) => `${L}) ${String(q.options[L]).trim()}`),
  correct: LETTERS.indexOf(q.answer),
  explanation: String(q.explanation || "").trim(),
  mnemonic: String(q.mnemonic || "").trim(),
  topicId,
  difficulty: q.difficulty || "Y2",
});

// ── topicId 7-13: mutaxassislik klassifikatori ──
const TOPICS = [
  { id: 7, kw: ["natyurmort","manzara janri","portret","marina","batal","maishiy janr","janr","rangtasvir","rangshunoslik","xromatik","axromatik","iliq rang","sovuq rang","rang tus","haykal","haykaltarosh","relyef","barelyef","gorelyef","kontrelyef","dastgohli grafika","plakat grafika","mahobatli","oqim va yo'nalish","kolorit","tasviriy san'at turi"] },
  { id: 8, kw: ["naqsh","amaliy bezak","islimiy","girih","kashta","zardo'zlik","kulolchilik","ganch","gul naqsh","naqqosh","bezak san'at","hunarmand","sirlangan","kosa","kandakor"] },
  { id: 9, kw: ["me'mor","me'morlik","me'morchilik","miniatyura","behzod","masjid","madrasa","gumbaz","minora","mavzoley","maqbara","kitobat san'at","muraqqa","tasviriy yodgorlik"] },
  { id: 10, kw: ["dizayn","interyer","eksteryer","libos dizayn","landshaft","avtomobil dizayn","fluid","pop-art","pop art","monotipiya","klyaksografiya","grezayl","grafiti","strit-art","street","kollaj","modan","instalyatsiya","zamonaviy san'at"] },
  { id: 11, kw: ["proyeksiya","masshtab","chiziq turi","yo'g'on tutash","o'lcham qo'y","ko'rinish","kesim","qirqim","aksonometrik","izometrik","dimetrik","oktant","epyur","taxt qil","chizma format","tutashma"] },
  { id: 12, kw: ["rezba","birikma","vint","bolt","gayka","prujina","payvand","zanjirli","tishli g'ildirak","val","yig'ish chizma","ajraladigan","ajralmaydigan","shtift"," pona"] },
  { id: 13, kw: ["qurilish chizma","fasad","bino plan","poydevor","qavatli bino","devor","sanuzel","o'zdst","qurilish elementi","bino qirqim","arxitektura-qurilish"] },
];
function classify(q) {
  const hay = ((q.question || "") + " " + Object.values(q.options || {}).join(" ") + " " + (q.explanation || "")).toLowerCase().replace(/[`‘’]/g, "'");
  let best = { id: 7, n: 0 };
  for (const t of TOPICS) { let n = 0; for (const k of t.kw) if (hay.includes(k)) n++; if (n > best.n) best = { id: t.id, n }; }
  return best.id;
}

const out = [];
const dist = {};

// 1) mutaxassislik → 7-13
const mut = load("fan/art/gen_art_mutaxassislik.json").filter(valid);
for (const q of mut) { const id = classify(q); dist[id] = (dist[id] || 0) + 1; out.push(toApp(q, id)); }

// 2) umumiy ped+kasb hovuzi → 14
const pool = load("fan/_ped_hovuz.json").filter(valid);
for (const q of pool) { out.push(toApp(q, 14)); }
dist[14] = pool.length;

// 3) metodika → 14 (hovuzga nisbatan qat'iy dedup: savol>=0.82 VA javob>=0.80)
const poolStem = pool.map((q) => trigrams(normalize(q.question)));
const poolAns = pool.map((q) => normalize(q.options[q.answer] || ""));
const meto = load("fan/art/gen_art_metodika.json").filter(valid);
let metoKept = 0, metoDup = 0;
for (const q of meto) {
  const sg = trigrams(normalize(q.question));
  const an = normalize(q.options[q.answer] || "");
  let dup = false;
  for (let k = 0; k < pool.length; k++) {
    if (jaccard(sg, poolStem[k]) < 0.82) continue;
    if (an === poolAns[k] || jaccard(trigrams(an), trigrams(poolAns[k])) >= 0.80) { dup = true; break; }
  }
  if (dup) { metoDup++; continue; }
  out.push(toApp(q, 14)); metoKept++;
}
dist[14] += metoKept;

fs.writeFileSync("art_app_import.json", JSON.stringify(out, null, 2), "utf8");
const NAMES = { 7: "Tasviriy asoslari", 8: "Amaliy bezak", 9: "Me'morlik+Miniatyura", 10: "Dizayn+Zamonaviy", 11: "Grafik savodxonlik", 12: "Mashinasozlik", 13: "Qurilish", 14: "Ped/metodika" };
console.log(`JAMI: ${out.length} savol → art_app_import.json`);
console.log(`  mutaxassislik: ${mut.length} | hovuz: ${pool.length} | metodika: ${metoKept} qo'shildi (${metoDup} dublikat tashlandi)`);
console.log("topicId taqsimot:");
for (const id of [7, 8, 9, 10, 11, 12, 13, 14]) console.log(`  ${id} ${NAMES[id].padEnd(22)} ${dist[id] || 0}`);
