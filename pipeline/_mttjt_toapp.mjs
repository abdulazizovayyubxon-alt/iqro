// MTT jismoniy tarbiya bankini ILOVA formatiga (_app.json) o'tkazadi.
//
// Uch lane fayli (gen_mut_a / gen_mut_b / gen_pedkasb) birlashtiriladi, LLM-hakam auditida
// SHUBHALI deb belgilanganlar chiqariladi, lanelar orasidagi dublikatlar tozalanadi, so'ng
// bo'lim (topicId) aniqlanadi.
//
// Bo'lim ANIQLASH: model qaytargan erkin "topic" matniga EMAS, generatsiya paytida yozib
// qo'yilgan `_chunk` (spec bo'lagi sarlavhasi) va `_block` maydonlariga tayanamiz — bu
// deterministik. (Avvalgi fanlarda kalit-so'z xaritasi ishlatilgan, u chalkashishi mumkin edi.)
//
//   node pipeline/_mttjt_toapp.mjs            # quruq yurish
//   node pipeline/_mttjt_toapp.mjs --apply    # fan/mtt_jismoniy/_app.json yozadi
//   node pipeline/_mttjt_toapp.mjs --apply --no-audit   # audit hisobotisiz
import fs from "fs";
import { validateQuestion } from "./lib/schema.mjs";
import { buildIndex, findDuplicate, addToIndex } from "./lib/dedup.mjs";

const apply = process.argv.includes("--apply");
const noAudit = process.argv.includes("--no-audit");
const LETTERS = ["A", "B", "C", "D"];
const CATEGORY = "mtt_jismoniy";

const LANES = [
  { file: "fan/mtt_jismoniy/gen_mut_a.json", report: "pipeline/verify_report_mttjt_mut_a.json" },
  { file: "fan/mtt_jismoniy/gen_mut_b.json", report: "pipeline/verify_report_mttjt_mut_b.json" },
  { file: "fan/mtt_jismoniy/gen_pedkasb.json", report: "pipeline/verify_report_mttjt_pk.json" },
  // To'ldirish yurishi (audit rad etganidan keyin kamchil qolgan bo'limlar uchun)
  { file: "fan/mtt_jismoniy/gen_top_atl.json", report: "pipeline/verify_report_mttjt_top_atl.json", optional: true },
  { file: "fan/mtt_jismoniy/gen_top_oyin.json", report: "pipeline/verify_report_mttjt_top_oyin.json", optional: true },
  { file: "fan/mtt_jismoniy/gen_top_kasb.json", report: "pipeline/verify_report_mttjt_top_kasb.json", optional: true },
];

// Spec bo'lagi raqami → ilova bo'limi (mockData.js TOPICS bilan bir xil).
// 8.x — MTT kasbiy standarti manbasi (scratch/mtt_jismoniy_kasb_spec.txt); run-api uni
// "mutaxassislik" deb teglaydi (--source bilan berilgani uchun), shuning uchun shu yerda
// bo'lim raqami bo'yicha 144 ga yo'naltiramiz.
const SECTION_TO_TOPIC = { 1: 137, 2: 138, 3: 139, 4: 140, 5: 141, 6: 142, 7: 143, 8: 144 };
const TNAME = {
  137: "Valeologiya va sog'lom turmush tarzi", 138: "Gimnastika turlari va qoidalari",
  139: "Harakatli o'yinlar", 140: "Yengil atletika turlari va qoidalari",
  141: "Suzish turlari va qoidalari", 142: "Sport o'yinlari turlari va qoidalari",
  143: "Sport inshootlari", 144: "Kasb standarti", 145: "Pedagogik mahorat",
};
// Rasmiy spetsifikatsiya: imtihonda har bo'limdan nechta savol (examBlueprint.js bilan bir xil)
const BLUEPRINT = { 137: 3, 138: 5, 139: 5, 140: 5, 141: 3, 142: 10, 143: 4, 144: 5, 145: 10 };

function topicIdOf(q) {
  if (q._block === "kasb") return 144;
  if (q._block === "pedagogika") return 145;
  const m = String(q._chunk || "").match(/^(\d)\./);
  return m ? SECTION_TO_TOPIC[Number(m[1])] : null;
}

// ── 1) Yig'ish + audit filtri ────────────────────────────────────────────────
const all = [];
let dropAudit = 0, dropSchema = 0, dropTopic = 0;
for (const lane of LANES) {
  if (!fs.existsSync(lane.file)) {
    if (lane.optional) { console.log(`${lane.file.padEnd(38)} (yo'q — o'tkazildi)`); continue; }
    console.error(`❌ Fayl yo'q: ${lane.file}`); process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(lane.file, "utf8"));
  let report = {};
  if (!noAudit && fs.existsSync(lane.report)) {
    try { report = JSON.parse(fs.readFileSync(lane.report, "utf8")); } catch { report = {}; }
  }
  const suspect = new Set(Object.entries(report).filter(([, v]) => v.verdict === "SHUBHALI").map(([id]) => String(id)));
  let kept = 0;
  for (const q of rows) {
    if (suspect.has(String(q.id))) { dropAudit++; continue; }
    if (validateQuestion(q).length) { dropSchema++; continue; }
    if (!LETTERS.includes(q.answer)) { dropSchema++; continue; }
    const tid = topicIdOf(q);
    if (!tid) { dropTopic++; continue; }
    all.push({ ...q, _topicId: tid });
    kept++;
  }
  console.log(`${lane.file.padEnd(38)} ${String(rows.length).padStart(5)} → ${String(kept).padStart(5)} saqlandi` +
    (Object.keys(report).length ? ` (audit: ${suspect.size} shubhali)` : " (audit hisoboti YO'Q)"));
}

// ── 2) Lanelar orasidagi dublikat (har lane o'zi ichida allaqachon dedup qilingan) ──
const index = buildIndex([]);
const unique = [];
let dup = 0;
for (const q of all) {
  if (findDuplicate(index, q)) { dup++; continue; }
  addToIndex(index, q);
  unique.push(q);
}

// ── 3) Bo'lim balansini rasmiy og'irlikka yaqinlashtirish ────────────────────
// Generatsiya bo'lak soniga proporsional ketgan, lekin ped/kasb lane'i alohida maqsad bilan
// yurgani uchun pedagogika ortiqcha chiqadi. Ortiqchasini TENG ORALIQDA qisqartiramiz
// (barcha aylanish/uslubdan vakil qoladi) — avvalgi fanlarda ham shu usul ishlatilgan.
const byTopic = {};
for (const q of unique) (byTopic[q._topicId] ||= []).push(q);

const mutIds = [137, 138, 139, 140, 141, 142, 143];
const mutTotal = mutIds.reduce((n, id) => n + (byTopic[id]?.length || 0), 0);
const mutWeight = mutIds.reduce((n, id) => n + BLUEPRINT[id], 0);   // = 35
// Mutaxassislik nisbati saqlansin: eng "siqilgan" bo'limga qarab umumiy shkalani tanlaymiz.
const scale = Math.min(...mutIds.map((id) => (byTopic[id]?.length || 0) / BLUEPRINT[id]));
// HEADROOM: qat'iy proporsiya auditdan o'tgan yaxshi savollarni bekorga tashlab yuboradi.
// Bo'lim og'irligini DiagnosticsEngine va ExamPage baribir EXAM_BLUEPRINT dan oladi (bazadagi
// savol sonidan emas), shuning uchun bir bo'limda ortiqcha savol bo'lishi zarar qilmaydi —
// u faqat mashq materialini ko'paytiradi. Shu bois proporsiyadan 40% gacha oshishga ruxsat
// beramiz; undan ortig'i teng oraliqda qisqartiriladi (xilma-xillik saqlanadi).
const HEADROOM = 1.4;
const capOf = (id) => Math.max(1, Math.round(scale * HEADROOM * BLUEPRINT[id]));

const evenly = (arr, keep) => {
  if (arr.length <= keep) return arr;
  const out = [];
  const step = arr.length / keep;
  for (let i = 0; out.length < keep && Math.floor(i * step) < arr.length; i++) out.push(arr[Math.floor(i * step)]);
  return out;
};

const final = [];
for (const id of Object.keys(BLUEPRINT).map(Number)) {
  const pool = byTopic[id] || [];
  final.push(...evenly(pool, capOf(id)));
}

// ── 4) Ilova sxemasi ────────────────────────────────────────────────────────
const rows = final.map((q) => ({
  q: q.question,
  opts: LETTERS.map((L) => `${L}) ${q.options[L]}`),
  correct: LETTERS.indexOf(q.answer),
  explanation: q.explanation || "",
  topicId: q._topicId,
  category: CATEGORY,
}));

// ── 5) Hisobot ──────────────────────────────────────────────────────────────
console.log(`\nyig'ildi ${all.length} | dublikat (lanelararo) ${dup} | audit rad ${dropAudit} | sxema rad ${dropSchema} | bo'limsiz ${dropTopic}`);
console.log(`\n===== ${CATEGORY} → ${rows.length} savol (shkala: 1 imtihon savoliga ~${scale.toFixed(0)} baza savoli) =====`);
const perTopic = {};
for (const r of rows) perTopic[r.topicId] = (perTopic[r.topicId] || 0) + 1;
for (const id of Object.keys(BLUEPRINT).map(Number)) {
  const have = byTopic[id]?.length || 0;
  console.log(`  ${id} ${TNAME[id].padEnd(38)} ${String(perTopic[id] || 0).padStart(4)}  (bankda ${String(have).padStart(4)}, imtihonda ${BLUEPRINT[id]})`);
}
const mut = rows.filter((r) => r.topicId < 144).length;
console.log(`  mutaxassislik ulushi: ${Math.round((mut / rows.length) * 100)}% (imtihonda 70%)`);
const dist = { A: 0, B: 0, C: 0, D: 0 };
for (const r of rows) dist[LETTERS[r.correct]]++;
console.log(`  to'g'ri javob taqsimoti: ${LETTERS.map((L) => `${L}=${dist[L]}`).join(" ")}`);

// CJK (xitoy/yapon/koreys) artefakti — generatsiya chiqindisi, boshqa fanlarda uchragan.
// Bu yerda faqat OGOHLANTIRISH: topilsa qo'lda tarjima qilinadi (avvalgi fanlar tartibi).
const CJK = /[　-〿㐀-鿿＀-￯가-힯]/;
const cjkRows = rows.filter((r) => CJK.test(r.q + r.opts.join(" ") + r.explanation));
console.log(`  CJK belgili savollar: ${cjkRows.length}${cjkRows.length ? " ⚠️ QO'LDA TUZATILSIN" : ""}`);
for (const r of cjkRows.slice(0, 10)) console.log(`    · ${r.q.slice(0, 80)}`);

if (apply) {
  fs.writeFileSync("fan/mtt_jismoniy/_app.json", JSON.stringify(rows, null, 2), "utf8");
  console.log(`\n✓ YOZILDI: fan/mtt_jismoniy/_app.json (${rows.length} savol)`);
} else {
  console.log("\n(quruq yurish — yozish uchun --apply)");
}
