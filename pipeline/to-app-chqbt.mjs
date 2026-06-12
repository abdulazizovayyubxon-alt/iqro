// CHQBT — uchala bankni (oltin 812 + fabrika 1200 + rasmli 179) ilova import formatiga o'tkazadi.
// Ilova (AdminPage JSON yuklash) formati: { q, opts:["A) ...",...], correct:<idx>, explanation,
//   mnemonic, topicId(0..6), image? }. category topicId'dan avtomat aniqlanadi.
// Oltin javoblar A/B/C/D bo'yicha QIYSHIQ (392/302/105/13) → shuffleOptions bilan aralashtiriladi.
// node pipeline/to-app-chqbt.mjs   → chqbt_app_import.json
import fs from "fs";
import path from "path";
import { shuffleOptions } from "./lib/shuffle.mjs";

const LETTERS = ["A", "B", "C", "D"];

// ── Bo'lim nomi → topicId (mockData chqbtTopics) ──
const SEC2TID = {
  "1. Harbiy xizmat asoslari": 0,
  "2. Umumharbiy nizomlar": 1,
  "3. Otish tayyorgarligi": 2,
  "4. Taktik tayyorgarlik": 3,
  "5. Fuqaro muhofazasi": 4,
  "6. Tibbiy bilim": 5,
  "Pedagogik mahorat": 6,
  "7. Harbiy tarix (sarkardalar)": 3, // alohida mavzu yo'q → Taktik tayyorgarlik (harbiy san'at/taktika)
  "Kasb standartlari": 0,
  "(tasniflanmagan)": 0,
};

// ── Gold source_file → bo'lim ──
const GOLD_MAP = {
  "028_kalashnikov.json": "3. Otish tayyorgarligi", "029_oqotar_qurollar.json": "3. Otish tayyorgarligi",
  "030-32_ak74_qism_tutilish.json": "3. Otish tayyorgarligi", "033_granatalar.json": "3. Otish tayyorgarligi",
  "034_qurol_qonuni.json": "1. Harbiy xizmat asoslari", "035_ichki_xizmat_nizomi.json": "2. Umumharbiy nizomlar",
  "036_garnizon_qorovullik.json": "2. Umumharbiy nizomlar", "037_intizom_nizomi.json": "2. Umumharbiy nizomlar",
  "038_saf_nizomi_asoslar.json": "2. Umumharbiy nizomlar", "039_saf_guruh.json": "2. Umumharbiy nizomlar",
  "040_konstitutsiya_harbiy.json": "1. Harbiy xizmat asoslari", "041_umumharbiy_majburiyat.json": "1. Harbiy xizmat asoslari",
  "042_mudofaa_doktrina.json": "1. Harbiy xizmat asoslari", "043_qurolli_kuchlar.json": "1. Harbiy xizmat asoslari",
  "044_harbiy_xizmat_tartibi.json": "1. Harbiy xizmat asoslari", "045_fv_ta'rif_vazifalari.json": "5. Fuqaro muhofazasi",
  "046_panohgoh_gazniqob.json": "5. Fuqaro muhofazasi", "047_teri_himoya.json": "5. Fuqaro muhofazasi",
  "048_taktik_tibbiy_asoslar.json": "6. Tibbiy bilim", "049_birinchi_yordam.json": "6. Tibbiy bilim",
  "050_tibbiy_11sinf.json": "6. Tibbiy bilim", "051_fv_tabiiy_ofatlar.json": "5. Fuqaro muhofazasi",
  "052_fv_ktezm_yongin_terror.json": "5. Fuqaro muhofazasi", "053_oqq_yadro_kimyo_bio.json": "5. Fuqaro muhofazasi",
  "054_yuqumli_zaharlanish.json": "6. Tibbiy bilim", "11s_43-44_ballistika.json": "3. Otish tayyorgarligi",
  "11s_45-49_masofa_pnevmatik.json": "3. Otish tayyorgarligi",
};

const RASMLI_MAP = {
  "rasmli-otish": "3. Otish tayyorgarligi", "rasmli-taktik": "4. Taktik tayyorgarlik",
  "rasmli-fv": "5. Fuqaro muhofazasi", "rasmli-saf": "2. Umumharbiy nizomlar",
  "rasmli-tibbiy": "6. Tibbiy bilim", "rasmli-jismoniy": "1. Harbiy xizmat asoslari",
};

function classifyTopic(t) {
  const s = (t || "").toLowerCase();
  const has = (...kw) => kw.some((k) => s.includes(k));
  if (has("temur", "bobur", "jaloliddin", "manguberdi", "sarkarda", "harbiy tarix", "harbiy san'at", "jahon urush", "tarix", "lodiy")) return "7. Harbiy tarix (sarkardalar)";
  if (has("pedagog")) return "Pedagogik mahorat";
  if (has("maktabgacha", "maktab ta'lim", "kasb standart", "etika")) return "Kasb standartlari";
  if (has("tibbiy", "birinchi yordam", "immobil", "imobil", "zaharlanish", "ko'rik", "sog")) return "6. Tibbiy bilim";
  if (has("fuqaro muhofaza", "favqulodda", "evakuatsiya", "panoh", "gazniqob", "respirator", "himoya vosita", "himoya kiyim", "himoya to", "l-1", "kostyum", "yadro", "kimyo", "bio", "oqq", "yong'in", "terror", "avariya", "halokat", "transport", "tabiiy ofat", "energetika", "kommunal", "zilzila", "muhofaza inshoot", "umumiy himoya", "umumqo")) return "5. Fuqaro muhofazasi";
  if (has("taktik", "jang", "dushman", "yashirin", "jangovar", "navigatsiya", "harbiy harakat", "harakat turlari", "aviatsiya", "jang maydon", "hududiy mudofaa")) return "4. Taktik tayyorgarlik";
  if (has("qurol", "kalashnikov", "ak-74", "ak74", "granata", "otish", "ballistika", "patron", "o'qdon", "o‘qdon", "stvol", "zatvor", "gilza", "magazin", "nishon", "masofa", "pnevmatik", "gaz oqim", "gaz tizim", "rgd", "qurilma")) return "3. Otish tayyorgarligi";
  if (has("nizom", "saf", "intizom", "ta'zir", "komanda", "burilish", "yurish", "salom", "garnizon", "qorovul", "navbatchilik", "rag", "shaxdam", "bosh kiyim")) return "2. Umumharbiy nizomlar";
  return "1. Harbiy xizmat asoslari";
}

const normalize = (t) => t ? t.toLowerCase().replace(/[‘'`ʼ]/g, "'").replace(/\s+/g, " ").trim() : "";

// q (options{A-D}, answer) → ilova obyekti
function toApp(q, topicId, { shuffle = false } = {}) {
  let s = q;
  if (shuffle) s = shuffleOptions(q);
  if (!LETTERS.every((L) => s.options && s.options[L] != null)) return null;
  const correct = LETTERS.indexOf(s.answer);
  if (correct < 0) return null;
  const obj = {
    q: s.question,
    opts: LETTERS.map((L) => `${L}) ${s.options[L]}`),
    correct,
    explanation: s.explanation || "",
    mnemonic: s.mnemonic || "",
    topicId,
  };
  if (s.image) obj.image = s.image;
  return obj;
}

const all = [];
const tidCount = {};
const seen = new Set();
let dups = 0, bad = 0;
const add = (obj) => {
  if (!obj) { bad++; return; }
  const k = normalize(obj.q);
  if (seen.has(k)) { dups++; return; }
  seen.add(k);
  all.push(obj);
  tidCount[obj.topicId] = (tidCount[obj.topicId] || 0) + 1;
};

// 1) OLTIN (aralashtiriladi)
const gold = JSON.parse(fs.readFileSync("fan/chqbt/gold_bank.json", "utf8"));
for (const q of gold) {
  const sec = GOLD_MAP[q.source_file] || "1. Harbiy xizmat asoslari";
  add(toApp(q, SEC2TID[sec], { shuffle: true }));
}
const afterGold = all.length;

// 2) FABRIKA (allaqachon aralash)
const facRaw = JSON.parse(fs.readFileSync("fan/chqbt/gen_api_progress.json", "utf8"));
const fac = Array.isArray(facRaw) ? facRaw : (facRaw.questions || []);
for (const q of fac) {
  const sec = classifyTopic(q.topic || q.source_construct);
  add(toApp(q, SEC2TID[sec]));
}
const afterFac = all.length;

// 3) RASMLI (image bilan, aralash)
const rdir = "fan/chqbt_yangi";
for (const f of fs.readdirSync(rdir).filter((x) => x.startsWith("rasmli") && x.endsWith(".json"))) {
  const o = JSON.parse(fs.readFileSync(path.join(rdir, f), "utf8"));
  const tag = (o.section || o.topic || f).toLowerCase();
  const prefix = Object.keys(RASMLI_MAP).find((p) => tag.includes(p));
  const sec = RASMLI_MAP[prefix] || "4. Taktik tayyorgarlik";
  for (const q of (o.questions || [])) add(toApp(q, SEC2TID[sec]));
}

const outPath = "chqbt_app_import.json";
fs.writeFileSync(outPath, JSON.stringify(all, null, 1), "utf8");

// Hisobot
const NAMES = ["0 Harbiy xizmat asoslari", "1 Umumharbiy nizomlar", "2 Otish tayyorgarligi", "3 Taktik tayyorgarlik", "4 Fuqaro muhofazasi", "5 Tibbiy bilim", "6 Pedagogik mahorat"];
console.log(`=== CHQBT ilova import fayli: ${outPath} ===`);
console.log(`Oltin: ${afterGold} | Fabrika: +${afterFac - afterGold} | Rasmli: +${all.length - afterFac}`);
console.log(`JAMI yozildi: ${all.length} | ichki takror: ${dups} | yaroqsiz: ${bad}`);
// javob balansi
const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (const o of all) dist[o.correct]++;
console.log(`Javob balansi (A/B/C/D): ${dist[0]}/${dist[1]}/${dist[2]}/${dist[3]}`);
console.log("topicId bo'yicha:");
for (let i = 0; i <= 6; i++) console.log(`  ${NAMES[i].padEnd(28)} ${tidCount[i] || 0}`);
