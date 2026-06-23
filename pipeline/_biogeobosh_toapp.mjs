// bio/geo/boshlangich toza banklarni ILOVA formatiga (_app.json) o'tkazadi.
// Mavzu → topicId: avval raqam-jadval (1.1-1.23 aniq), bo'lmasa kalit-so'z (raqamsiz variantlar).
// node pipeline/_biogeobosh_toapp.mjs [--apply]
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";

const apply = process.argv.includes("--apply");
const LETTERS = ["A", "B", "C", "D"];

// ── Raqam-jadval (spec 1.1-1.23 → app topicId) ──
const NUM = {
  biologiya: { category: "biologiya", map: {
    "1.1": 80, "1.2": 80, "1.3": 81, "1.4": 81, "1.5": 81, "1.6": 81, "1.7": 83,
    "1.8": 82, "1.9": 82, "1.10": 82, "1.11": 82, "1.12": 82, "1.13": 82, "1.14": 82, "1.15": 82,
    "1.16": 83, "1.17": 83, "1.18": 83, "1.19": 83, "1.20": 83, "1.21": 84, "1.22": 84, "1.23": 84,
  }},
  geografiya: { category: "geografiya", map: {
    "1.1": 87, "1.2": 87, "1.3": 88, "1.4": 88, "1.5": 88, "1.6": 88, "1.7": 88,
    "1.8": 89, "1.9": 89, "1.10": 90, "1.11": 90, "1.12": 90, "1.13": 90,
    "1.14": 91, "1.15": 91, "1.16": 91, "1.17": 91, "1.18": 92, "1.19": 93, "1.20": 93, "1.21": 93, "1.22": 94, "1.23": 94,
  }},
  boshlangich: { category: "boshlangich", map: {
    "1.1": 31, "1.2": 32, "1.3": 31, "1.4": 31, "1.5": 32, "1.6": 33, "1.7": 33, "1.8": 33, "1.9": 33,
    "1.10": 34, "1.11": 34, "1.12": 34, "1.13": 35, "1.14": 35, "1.15": 35, "1.16": 35,
    "1.17": 36, "1.18": 36, "1.19": 37, "1.20": 37, "1.21": 37, "1.22": 37, "1.23": 37,
  }},
};

// ── Kalit-so'z (raqamsiz variantlar uchun; TARTIB muhim — eng aniqdan) ──
function kwId(slug, raw) {
  const s = String(raw || "").toLowerCase().replace(/[''`´]/g, "'");
  if (slug === "biologiya") {
    if (/genetika|allel|genotip|fenotip|mendel|morgan|krossingover|irsiyl|noallel|mutatsiya|genetik kod|evolyutsiya|tabiiy tanlanish|dnk|rnk|irsiy axborot/.test(s)) return 83;
    if (/ekologik|moslanish|biotik|moddalar aylanish|populyatsiya|biosfera|ekosistema/.test(s)) return 84;
    if (/to'qima|nerv tizim|impuls|endokrin|gumoral|oziqlanish|hazm|nafas|ayirish|qon aylanish|ichki muhit|tayanch-harakat|ko'payish|individual rivojlan/.test(s)) return 82;
    if (/hujayra|kimyoviy tarkib|organoid|organik va anorganik|modda almashinuv|fotosintez|energiya hosil/.test(s)) return 81;
    if (/asoslari|tiriklik daraja|fanining metod|organizmlar guruh|tasnif|xilma-xil/.test(s)) return 80;
  }
  if (slug === "geografiya") {
    if (/amaliy geografik|geosiyosat/.test(s)) return 92;
    if (/geografik masala|soat mintaqa|azimut|daryo va suv|topshiriq/.test(s)) return 93;
    if (/atlas|shartli belgi|diagramma|sxema|jadval|geografik xarita|grafik material/.test(s)) return 94;
    if (/jahon|siyosiy xarita|davlat tuzilish|urbanizatsiya|global ekolog|xo'jaligi geograf/.test(s)) return 91;
    if (/o'rta osiyo|o'zbekiston tabiiy/.test(s)) return 89;
    if (/o'zbekiston/.test(s)) return 90;
    if (/litosfera|relyef|atmosfera|ob-havo|iqlim|gidrosfera|dunyo okeani|materik|geografik qobiq/.test(s)) return 88;
    if (/geografiya fani|tadqiqot usul|quyosh siste|yer shakli|yer harakati/.test(s)) return 87;
  }
  if (slug === "boshlangich") {
    if (/yer yuzasi|tabiiy hudud|quyosh siste|hayotiy tizim|organizmlar/.test(s)) return 36;
    if (/modda va uning xossa|fizik xossa|energiya|yorug'lik|harakat|kuch|tarbiya|axloqiy|fuqarolik|madaniyatlararo|hayotiy ko'nikma/.test(s)) return 37;
    if (/geometriya|o'lchov|ehtimollik|ma'lumotlar bilan|kombinatorika|mantiqiy masala/.test(s)) return 35;
    if (/natural|butun va kasr|sonlar|algebraik|tenglama|taqqoslash va bo'linish/.test(s)) return 34;
    if (/badiiy matn|adabiyot|matnni o'qib|qahramon|bolalar adabiyoti/.test(s)) return 33;
    if (/lingvistik tahlil|fonetik/.test(s)) return 32;
    if (/imlo|talaffuz|punktuatsiya|uslubiyat|so'z ma'no|ona tili/.test(s)) return 31;
  }
  return null;
}

function topicIdFor(slug, topic) {
  const m = String(topic || "").match(/(\d+\.\d+)/);
  if (m && NUM[slug].map[m[1]] != null) return NUM[slug].map[m[1]];
  return kwId(slug, topic);
}

const TNAME = {}; // topicId → nom (mockData'dan qo'lda)
Object.assign(TNAME, {
  80: "Biologiya asoslari", 81: "Hujayra biologiyasi", 82: "Organizmlar biologiyasi", 83: "Genetika va evolyutsiya", 84: "Ekosistema va biosfera",
  87: "Geografiya boshlang'ich kursi", 88: "Materiklar/okeanlar tabiiy geo", 89: "O'rta Osiyo/O'zb tabiiy geo", 90: "O'zb iqtisodiy/ijtimoiy geo", 91: "Jahon iqtisodiy/ijtimoiy geo", 92: "Amaliy geografiya", 93: "Geografik masala/topshiriq", 94: "Geografik grafik material",
  31: "Imlo va Uslubiyat", 32: "Lingvistik tahlil", 33: "O'qish va Adabiyot", 34: "Sonlar va Algebra", 35: "Geometriya va Mantiq", 36: "Geografiya va Biologiya", 37: "Fizika/Kimyo/Tarbiya",
});

for (const slug of ["biologiya", "geografiya", "boshlangich"]) {
  const bank = JSON.parse(fs.readFileSync(`fan/${slug}/gen_api_progress.json`, "utf8"));
  const out = [];
  let skipped = 0;
  const perTopic = {};
  const unmapped = {};
  for (const q of bank) {
    if (validateQuestion(q).length) { skipped++; continue; }
    const correct = LETTERS.indexOf(q.answer);
    if (correct < 0) { skipped++; continue; }
    const tid = topicIdFor(slug, q.topic);
    if (tid == null) { unmapped[(q.topic || "?").slice(0, 50)] = (unmapped[(q.topic || "?").slice(0, 50)] || 0) + 1; skipped++; continue; }
    perTopic[tid] = (perTopic[tid] || 0) + 1;
    out.push({
      q: q.question,
      opts: LETTERS.map((L) => `${L}) ${q.options[L]}`),
      correct,
      explanation: q.explanation || "",
      mnemonic: q.mnemonic || "",
      topicId: tid,
      category: NUM[slug].category,
    });
  }
  console.log(`\n===== ${slug.toUpperCase()} → ${out.length} savol (skip ${skipped}) | category "${NUM[slug].category}" =====`);
  for (const id of Object.keys(perTopic).sort((a, b) => a - b)) {
    console.log(`  ${id} ${(TNAME[id] || "?").padEnd(32)} ${perTopic[id]}`);
  }
  const un = Object.entries(unmapped);
  if (un.length) {
    console.log(`  ⚠️ XARITALANMAGAN (${un.length}):`);
    for (const [t, n] of un) console.log(`     ${n} | ${t}`);
  } else {
    console.log(`  ✅ 0 xaritalanmagan`);
  }
  if (apply) {
    fs.writeFileSync(`fan/${slug}/_app.json`, JSON.stringify(out, null, 2), "utf8");
    console.log(`  → YOZILDI: fan/${slug}/_app.json`);
  }
}
console.log(apply ? "\n✓ _app.json fayllar yozildi." : "\n(quruq yurish — yozish uchun --apply)");
