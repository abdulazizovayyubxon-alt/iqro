// CHQBT — uchala bank (gold + fabrika + rasmli) bo'yicha BO'LIM taqsimoti hisoboti.
// Har savolni 8 standart bo'limga ajratadi, maqsad bilan solishtiradi, bo'sh joylarni ko'rsatadi.
// node pipeline/section-report.mjs
import fs from "fs";
import path from "path";

// --- 8 standart bo'lim + maqsad (rejadan) ---
const SECTIONS = [
  ["1. Harbiy xizmat asoslari", 245],
  ["2. Umumharbiy nizomlar", 260],
  ["3. Otish tayyorgarligi", 230],
  ["4. Taktik tayyorgarlik", 130],
  ["5. Fuqaro muhofazasi", 140],
  ["6. Tibbiy bilim", 145],
  ["7. Harbiy tarix (sarkardalar)", 0],
  ["Kasb standartlari", 165],
  ["Pedagogik mahorat", 330],
  ["(tasniflanmagan)", 0],
];
const ORDER = SECTIONS.map((s) => s[0]);

// --- Gold source_file -> bo'lim ---
const GOLD_MAP = {
  "028_kalashnikov.json": "3. Otish tayyorgarligi",
  "029_oqotar_qurollar.json": "3. Otish tayyorgarligi",
  "030-32_ak74_qism_tutilish.json": "3. Otish tayyorgarligi",
  "033_granatalar.json": "3. Otish tayyorgarligi",
  "034_qurol_qonuni.json": "1. Harbiy xizmat asoslari",
  "035_ichki_xizmat_nizomi.json": "2. Umumharbiy nizomlar",
  "036_garnizon_qorovullik.json": "2. Umumharbiy nizomlar",
  "037_intizom_nizomi.json": "2. Umumharbiy nizomlar",
  "038_saf_nizomi_asoslar.json": "2. Umumharbiy nizomlar",
  "039_saf_guruh.json": "2. Umumharbiy nizomlar",
  "040_konstitutsiya_harbiy.json": "1. Harbiy xizmat asoslari",
  "041_umumharbiy_majburiyat.json": "1. Harbiy xizmat asoslari",
  "042_mudofaa_doktrina.json": "1. Harbiy xizmat asoslari",
  "043_qurolli_kuchlar.json": "1. Harbiy xizmat asoslari",
  "044_harbiy_xizmat_tartibi.json": "1. Harbiy xizmat asoslari",
  "045_fv_ta'rif_vazifalari.json": "5. Fuqaro muhofazasi",
  "046_panohgoh_gazniqob.json": "5. Fuqaro muhofazasi",
  "047_teri_himoya.json": "5. Fuqaro muhofazasi",
  "048_taktik_tibbiy_asoslar.json": "6. Tibbiy bilim",
  "049_birinchi_yordam.json": "6. Tibbiy bilim",
  "050_tibbiy_11sinf.json": "6. Tibbiy bilim",
  "051_fv_tabiiy_ofatlar.json": "5. Fuqaro muhofazasi",
  "052_fv_ktezm_yongin_terror.json": "5. Fuqaro muhofazasi",
  "053_oqq_yadro_kimyo_bio.json": "5. Fuqaro muhofazasi",
  "054_yuqumli_zaharlanish.json": "6. Tibbiy bilim",
  "11s_43-44_ballistika.json": "3. Otish tayyorgarligi",
  "11s_45-49_masofa_pnevmatik.json": "3. Otish tayyorgarligi",
};

// --- Rasmli fayl-prefiks -> bo'lim ---
const RASMLI_MAP = {
  "rasmli-otish": "3. Otish tayyorgarligi",
  "rasmli-taktik": "4. Taktik tayyorgarlik",
  "rasmli-fv": "5. Fuqaro muhofazasi",
  "rasmli-saf": "2. Umumharbiy nizomlar",
  "rasmli-tibbiy": "6. Tibbiy bilim",
  "rasmli-jismoniy": "1. Harbiy xizmat asoslari",
};

// --- Fabrika topic -> bo'lim (kalit so'z bo'yicha) ---
function classifyTopic(t) {
  const s = (t || "").toLowerCase();
  const has = (...kw) => kw.some((k) => s.includes(k));
  // Tarix avval (sarkardalar nomlari boshqalarga aralashmasin)
  if (has("temur", "bobur", "jaloliddin", "manguberdi", "sarkarda", "harbiy tarix", "harbiy san'at", "jahon urush", "tarix", "lodiy")) return "7. Harbiy tarix (sarkardalar)";
  if (has("pedagog")) return "Pedagogik mahorat";
  if (has("maktabgacha", "maktab ta'lim", "kasb standart", "etika")) return "Kasb standartlari";
  if (has("tibbiy", "birinchi yordam", "immobil", "imobil", "zaharlanish", "ko'rik", "sog")) return "6. Tibbiy bilim";
  if (has("fuqaro muhofaza", "favqulodda", "evakuatsiya", "panoh", "gazniqob", "respirator", "himoya vosita", "himoya kiyim", "himoya to", "l-1", "kostyum", "yadro", "kimyo", "bio", "oqq", "yong'in", "terror", "avariya", "halokat", "transport", "tabiiy ofat", "energetika", "kommunal", "zilzila", "muhofaza inshoot", "umumiy himoya", "umumqo")) return "5. Fuqaro muhofazasi";
  if (has("taktik", "jang", "dushman", "yashirin", "jangovar", "navigatsiya", "harbiy harakat", "harakat turlari", "aviatsiya", "jang maydon", "hududiy mudofaa")) return "4. Taktik tayyorgarlik";
  if (has("qurol", "kalashnikov", "ak-74", "ak74", "granata", "otish", "ballistika", "patron", "o'qdon", "o‘qdon", "stvol", "zatvor", "gilza", "magazin", "nishon", "masofa", "pnevmatik", "gaz oqim", "gaz tizim", "rgd", "qurilma")) return "3. Otish tayyorgarligi";
  if (has("nizom", "saf", "intizom", "ta'zir", "komanda", "burilish", "yurish", "salom", "garnizon", "qorovul", "navbatchilik", "rag", "shaxdam", "shaxdam qadam", "bosh kiyim")) return "2. Umumharbiy nizomlar";
  if (has("konstitutsiya", "majburiyat", "doktrina", "qurolli kuch", "harbiy xizmat", "chaqiruv", "chaqiriluvchi", "chaqirish", "kontrakt", "rezerv", "safarbarlik", "qasamyod", "unvon", "okrug", "harbiy obyekt", "harbiy huquq", "qonun", "mudofaa", "vatan himoya", "harbiy majburiyat", "harbiy birlik", "harbiy tashkilot", "xizmat turlari", "xizmat me'yor", "jismoniy tayyorgarlik", "kombatant", "xalqaro", "jeneva", "insonparvarlik", "protokol", "harbiy logistika", "harbiy xavfsizlik", "harbiy texnika", "harbiy nazorat", "qurolli kuchlar")) return "1. Harbiy xizmat asoslari";
  return "(tasniflanmagan)";
}

const counts = {}; // section -> {gold, factory, rasmli}
for (const sec of ORDER) counts[sec] = { gold: 0, factory: 0, rasmli: 0 };

// GOLD
const gold = JSON.parse(fs.readFileSync("fan/chqbt/gold_bank.json", "utf8"));
for (const q of gold) {
  const sec = GOLD_MAP[q.source_file] || "(tasniflanmagan)";
  counts[sec].gold++;
}

// FACTORY
const fac = JSON.parse(fs.readFileSync("fan/chqbt/gen_api_progress.json", "utf8"));
const facArr = Array.isArray(fac) ? fac : (fac.questions || []);
const unclassified = {};
for (const q of facArr) {
  const sec = classifyTopic(q.topic || q.source_construct);
  counts[sec].factory++;
  if (sec === "(tasniflanmagan)") unclassified[q.topic] = (unclassified[q.topic] || 0) + 1;
}

// RASMLI — section maydoni bo'yicha
const rdir = "fan/chqbt_yangi";
for (const f of fs.readdirSync(rdir).filter((f) => f.startsWith("rasmli") && f.endsWith(".json"))) {
  const o = JSON.parse(fs.readFileSync(path.join(rdir, f), "utf8"));
  const tag = (o.section || o.topic || f).toLowerCase();
  const prefix = Object.keys(RASMLI_MAP).find((p) => tag.includes(p));
  const sec = RASMLI_MAP[prefix] || "(tasniflanmagan)";
  counts[sec].rasmli += (o.questions || []).length;
}

// --- Chiqarish ---
console.log("=== CHQBT — BO'LIM BO'YICHA SAVOL TAQSIMOTI ===\n");
const W = 32;
console.log("Bo'lim".padEnd(W) + "Gold".padStart(6) + "Fabr".padStart(6) + "Rasm".padStart(6) + "JAMI".padStart(7) + "Maqs".padStart(7) + "  Holat");
console.log("-".repeat(W + 6 + 6 + 6 + 7 + 7 + 12));
let tg = 0, tf = 0, tr = 0, ttarget = 0;
for (const [sec, target] of SECTIONS) {
  const c = counts[sec];
  const jami = c.gold + c.factory + c.rasmli;
  tg += c.gold; tf += c.factory; tr += c.rasmli; ttarget += target;
  let holat = "";
  if (target > 0) {
    const pct = Math.round((jami / target) * 100);
    holat = jami >= target ? `✓ to'la (${pct}%)` : (jami === 0 ? "✗ BO'SH" : `${pct}% (${target - jami} kam)`);
  } else if (jami > 0) holat = "(maqsadsiz)";
  console.log(sec.padEnd(W) + String(c.gold).padStart(6) + String(c.factory).padStart(6) + String(c.rasmli).padStart(6) + String(jami).padStart(7) + (target || "—").toString().padStart(7) + "  " + holat);
}
console.log("-".repeat(W + 6 + 6 + 6 + 7 + 7 + 12));
const tjami = tg + tf + tr;
console.log("JAMI".padEnd(W) + String(tg).padStart(6) + String(tf).padStart(6) + String(tr).padStart(6) + String(tjami).padStart(7) + String(ttarget).padStart(7));

if (Object.keys(unclassified).length) {
  console.log("\n(tasniflanmagan fabrika mavzulari):");
  Object.entries(unclassified).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log("  " + v + "  " + k));
}
