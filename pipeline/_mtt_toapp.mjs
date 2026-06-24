// MTT psixolog/logoped — gen_mut + gen_pedkasb → app format, TOPICID taqsimoti bilan.
// mut: topic "1.N"/nom → mavzu topicId. pedkasb: kasb → kasb-id, aks holda ped-id.
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";

const LET = ["A", "B", "C", "D"];
const norm = (s) => String(s || "").toLowerCase().replace(/[`‘’']/g, "'").replace(/\s+/g, " ").trim();

// Har fan: mutaxassislik mavzu nomlari (tartib = 1.1, 1.2, ...) + bazaviy topicId + kasb/ped id.
const CFG = {
  mtt_logoped: {
    category: "mtt_logoped", base: 97, kasbId: 105, pedId: 106,
    topics: [
      "tovush talaffuzi buzilishlari",            // 97 (1.1)
      "markaziy (neyrogen) nutq buzilishlari",    // 98 (1.2)
      "motor nutq buzilishlari",                  // 99 (1.3)
      "nutqning ritm va ravonligi buzilishlari",  // 100 (1.4)
      "tovush talaffuzi va ovoz rezonansi buzilishlari", // 101 (1.5)
      "nutqning umumiy rivojlanmaganligi",        // 102 (1.6)
      "yozma nutq buzilishlari",                  // 103 (1.7)
      "o'qish va yozish bilan bog'liq",           // 104 (1.8)
    ],
  },
  mtt_psixolog: {
    category: "mtt_psixolog", base: 107, kasbId: 112, pedId: 113,
    topics: [
      "yosh psixologiyasining maqsad",            // 107 (1.1)
      "oila psixologiyasi",                       // 108 (1.2)
      "hayotiy davrlar va rivojlanish bosqichlari",// 109 (1.3)
      "inklyuziv ta'lim",                         // 110 (1.4)
      "yosh psixologiyasi",                       // 111 (1.5) — "maqsad"siz
    ],
  },
  mtt_tarbiyachi: {
    category: "mtt", base: 47, kasbId: 54, pedId: 54,   // app'da kasb alohida topic emas → ped+kasb 54 ga
    topics: [
      "pedagogikaning asoslari va bola",          // 47 (1.1)
      "tarbiya turlari va bolalar mehnati",       // 48 (1.2)
      "nutq o'stirish va sensor tarbiya",         // 49 (1.3)
      "matematik tasavvur, tasviriy",             // 50 (1.4)
      "o'yin va rivojlantiruvchi muhit",          // 51 (1.5)
      "normativ-huquqiy asoslar",                 // 52 (1.6)
      "kompetensiyaviy yondashuv",                // 53 (1.7)
    ],
  },
  mtt_rahbar: {
    category: "mtt_rahbar", base: 63, kasbId: 70, pedId: 70,   // app'da kasb alohida topic emas → ped+kasb 70 ga
    topics: [
      "pedagogika asoslari va bola rivoji",       // 63 (1.1)
      "tarbiya turlari va kun tartibi",           // 64 (1.2)
      "metodikasi va metodik rahbarlik",          // 65 (1.3)
      "boshqaruv, pedagogik mahorat",             // 66 (1.4)
      "normativ-huquqiy asoslar va davlat",       // 67 (1.5)
      "kuzatuv kengashi",                         // 68 (1.6)
      "rejalashtirish, hujjatchilik, monitoring", // 69 (1.7)
    ],
  },
};

function mutTopicId(cfg, topic) {
  const t = norm(topic);
  // 1) "1.N" prefiks
  const m = t.match(/^1\.(\d+)\b/);
  if (m) { const i = +m[1] - 1; if (i >= 0 && i < cfg.topics.length) return cfg.base + i; }
  // 2) nom bo'yicha — eng UZUN mos (psixolog "yosh psix...maqsad" vs "yosh psix" ni ajratish uchun)
  let best = -1, bestLen = 0;
  for (let i = 0; i < cfg.topics.length; i++) {
    const key = cfg.topics[i];
    if (t.includes(key) && key.length > bestLen) { best = i; bestLen = key.length; }
  }
  if (best >= 0) return cfg.base + best;
  return cfg.base; // fallback: 1-mavzu
}

const KASB_RE = /(kasb standart|kasb-standart|professional standart|mehnat funksiya|mehnat vazifa|mehnat harakat|malaka talab|kasbiy standart)/i;
function isKasb(q) {
  return KASB_RE.test(`${q.topic || ""} ${q.subtopic || ""} ${q.source_construct || ""} ${q.question || ""}`);
}

function conv(q, topicId) {
  if (validateQuestion(q).length) return null;
  const correct = LET.indexOf(q.answer);
  if (correct < 0) return null;
  return { q: q.question, opts: LET.map((L) => `${L}) ${q.options[L]}`), correct,
    explanation: q.explanation || "", mnemonic: q.mnemonic || "", topicId, category: CFG_cur.category };
}

let CFG_cur;
const slug = process.argv[2];
CFG_cur = CFG[slug];
if (!CFG_cur) { console.error("fan: mtt_psixolog | mtt_logoped"); process.exit(1); }

const out = [];
const dist = {};
let bad = 0;
// mutaxassislik
const mut = JSON.parse(fs.readFileSync(`fan/${slug}/gen_mut.json`, "utf8"));
for (const q of mut) {
  const id = mutTopicId(CFG_cur, q.topic);
  const c = conv(q, id); if (!c) { bad++; continue; }
  out.push(c); dist[id] = (dist[id] || 0) + 1;
}
// ped+kasb
const pk = JSON.parse(fs.readFileSync(`fan/${slug}/gen_pedkasb.json`, "utf8"));
for (const q of pk) {
  const id = isKasb(q) ? CFG_cur.kasbId : CFG_cur.pedId;
  const c = conv(q, id); if (!c) { bad++; continue; }
  out.push(c); dist[id] = (dist[id] || 0) + 1;
}

fs.writeFileSync(`fan/${slug}/_app.json`, JSON.stringify(out, null, 2), "utf8");
console.log(`✓ ${slug}: ${out.length} app savol (yaroqsiz ${bad}) → fan/${slug}/_app.json`);
console.log("  topicId taqsimoti:", Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join("  "));
