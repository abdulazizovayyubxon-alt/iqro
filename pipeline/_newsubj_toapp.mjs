// kimyo / rus_tili / ingliz toza banklarni ILOVA formatiga (_app.json) o'tkazadi.
// Mavzu (topic matni) → topicId: kalit-so'z xaritasi (generatsiya raqamsiz "topic" beradi).
// rus_tili: kirill=mutaxassislik (121-126), lotin=ped/kasb (127/128) — til signali ishonchli.
// node pipeline/_newsubj_toapp.mjs [--apply]
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";

const apply = process.argv.includes("--apply");
const LETTERS = ["A", "B", "C", "D"];
const CYR = /[А-Яа-яЁё]/;

function kimyoId(t) {
  const s = t.toLowerCase().replace(/[''`´]/g, "'");
  if (/kasb standart|talaba standart|mehnat funksiya/.test(s)) return 119;
  if (/pedagog|metodik|metod\b|metodlar|baholash|didaktik|\bdars\b|o'qit|ta'lim|texnolog|qobiliyat|vazifa|kompeten|tarbiya|refleks/.test(s)) return 120;
  if (/laboratoriya|sifat reaksiya|tajriba|jihoz|reaktiv|probirka/.test(s)) return 118;
  if (/kislorodli|azotli|spirt|fenol|aldegid|keton|karbon|efir|uglevod|amin|oqsil|polimer|kauchuk|\btola|sovun|\byog'|nitro/.test(s)) return 117;
  if (/anorganik|metall|oksid|\basos|kislota|\btuz|koordinatsion/.test(s)) return 115;
  if (/organik|uglevodorod|alkan|alken|alkin|aromatik|izomer|siklo|alkadiyen|benzol|nomenklatura/.test(s)) return 116;
  return 114; // umumiy kimyo (atom, davriy, dissotsiatsiya, elektroliz, kinetika, termodinamika, tenglama)
}

function rusId(t) {
  if (!CYR.test(t)) { // lotin = ped/kasb (o'zbekcha)
    if (/kasb standart|talaba standart|mehnat funksiya/i.test(t)) return 127;
    return 128; // pedagogika
  }
  const r = t.toLowerCase();
  if (/интерпретац|изобразительн|искусств|живопис/.test(r)) return 122;
  if (/читательск|грамотн|чтени/.test(r)) return 121;
  if (/лингвистическ|теория язык|языковой анализ/.test(r)) return 126;
  if (/синтаксис|пунктуац|предложен|словосочетан|запят/.test(r)) return 125;
  if (/лексик|фразеолог|орфоэп|состав слов|словообразован|синоним|антоним|омоним|пароним|ударени/.test(r)) return 123;
  if (/морфолог|орфограф|правописан|существит|прилагат|глагол|местоимен|наречи|числительн|част.{0,4}реч/.test(r)) return 124;
  return 126; // default mutaxassislik (til nazariyasi)
}

function inglizId(t) {
  const s = t.toLowerCase().replace(/[''`´]/g, "'");
  if (/kasb standart|talaba standart|mehnat funksiya/.test(s)) return 135;
  if (/pedagog|metodik|metodlar|metodolog|baholash|didaktik|\bdars\b|o'qit|ta'lim|texnolog|qobiliyat|vazifa|kompeten|tarbiya|bosqich|rejalash|refleks/.test(s)) return 136;
  if (/grammar|grammatik/.test(s)) return 132;
  if (/vocabular|lexis|leksik/.test(s)) return 133;
  if (/pragmatic|pragmatik/.test(s)) return 134;
  if (/cohesion|coherence|cohes/.test(s)) return 131;
  if (/narrative/.test(s)) return 130;
  if (/scientific|reading|comprehension/.test(s)) return 129;
  return 136; // default: ped (mutaxassislik inglizcha kalit-so'zlar bilan qamrab olingan)
}

// pedTopic/pedCap — SHARED_PED bloki barcha fanga teng aylangani uchun pedagogika ortiqcha chiqdi.
// Mavjud 13 fan ~75-80% mutaxassislik (biologiya 2203 mut / 603 ped) va blueprint ham ~70% mut talab qiladi,
// shuning uchun pedagogikani teng oraliqda (xilma-xillikni saqlab) shu songa qisqartiramiz.
const SUB = {
  kimyo:    { category: "kimyo",    fn: kimyoId,  allowCyrillic: false, pedTopic: 120, pedCap: 450 },
  rus_tili: { category: "rus_tili", fn: rusId,    allowCyrillic: true,  pedTopic: 128, pedCap: 550 },
  ingliz:   { category: "ingliz",   fn: inglizId, allowCyrillic: false, pedTopic: 136, pedCap: 671 },
};
const TNAME = {
  114: "Umumiy kimyo", 115: "Anorganik kimyo", 116: "Organik: uglevodorodlar", 117: "Organik: kislorodli/azotli", 118: "Laboratoriya", 119: "Kasb standarti", 120: "Pedagogik mahorat",
  121: "O'qish savodxonligi", 122: "San'at talqini", 123: "Leksika/orfoepiya", 124: "Morfologiya/orfografiya", 125: "Sintaksis/punktuatsiya", 126: "Til nazariyasi", 127: "Kasb standarti", 128: "Pedagogik mahorat",
  129: "Reading: sci-pop", 130: "Reading: narrative", 131: "Text cohesion", 132: "Grammar", 133: "Vocabulary", 134: "Pragmatics", 135: "Kasb standarti", 136: "Pedagogik mahorat va ELT",
};

for (const [slug, cfg] of Object.entries(SUB)) {
  const bank = JSON.parse(fs.readFileSync(`fan/${slug}/gen_api_progress.json`, "utf8"));
  const out = [];
  let bad = 0;
  const perTopic = {};
  for (const q of bank) {
    if (validateQuestion(q, { allowCyrillic: cfg.allowCyrillic }).length) { bad++; continue; }
    const correct = LETTERS.indexOf(q.answer);
    if (correct < 0) { bad++; continue; }
    const tid = cfg.fn(q.topic || "");
    perTopic[tid] = (perTopic[tid] || 0) + 1;
    out.push({
      q: q.question,
      opts: LETTERS.map((L) => `${L}) ${q.options[L]}`),
      correct,
      explanation: q.explanation || "",
      topicId: tid,
      category: cfg.category,
    });
  }
  // ── Pedagogikani CAP qilish (teng oraliqda tanlab — barcha aylanish/uslubdan vakil qoladi) ──
  let final = out;
  if (cfg.pedCap && (perTopic[cfg.pedTopic] || 0) > cfg.pedCap) {
    const ped = out.filter((q) => q.topicId === cfg.pedTopic);
    const rest = out.filter((q) => q.topicId !== cfg.pedTopic);
    const step = ped.length / cfg.pedCap;
    const kept = [];
    for (let i = 0; kept.length < cfg.pedCap && Math.floor(i * step) < ped.length; i++) kept.push(ped[Math.floor(i * step)]);
    final = rest.concat(kept);
    perTopic[cfg.pedTopic] = kept.length;
  }
  const mut = final.filter((q) => q.topicId !== cfg.pedTopic && q.topicId !== cfg.pedTopic - 1).length;
  console.log(`\n===== ${slug.toUpperCase()} → ${final.length} savol (yaroqsiz ${bad}) | category "${cfg.category}" | mutaxassislik ${Math.round((mut / final.length) * 100)}% =====`);
  for (const id of Object.keys(perTopic).sort((a, b) => a - b)) {
    console.log(`  ${id} ${(TNAME[id] || "?").padEnd(26)} ${perTopic[id]}`);
  }
  if (apply) {
    fs.writeFileSync(`fan/${slug}/_app.json`, JSON.stringify(final, null, 2), "utf8");
    console.log(`  → YOZILDI: fan/${slug}/_app.json`);
  }
}
console.log(apply ? "\n✓ _app.json fayllar yozildi." : "\n(quruq yurish — yozish uchun --apply)");
