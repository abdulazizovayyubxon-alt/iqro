// Rasmli savollarni tartibga soladi:
//  1) fayl darajasidagi topic/soha ni har savolga qo'shadi (+ subject CHQBT)
//  2) difficulty ni cognitive ga moslaydi (Bilish=Y1, Qo'llash=Y2, Mulohaza=Y3)
//  3) cue-leak: faqat to'g'ri variantдаgi (qavs) izohini olib tashlaydi (asimmetriyani yo'qotadi)
// node pipeline/fix-rasmli.mjs [--apply]
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";

const apply = process.argv.includes("--apply");
const FILES = ["rasmli_fv", "rasmli_jismoniy", "rasmli_otish", "rasmli_saf", "rasmli_taktik", "rasmli_tibbiy"];
const DIR = "fan/chqbt_yangi/";
const DIFF = { "Bilish": "Y1", "Qo'llash": "Y2", "Qoʻllash": "Y2", "Mulohaza": "Y3" };

let nTopic = 0, nDiff = 0, nCue = 0;

for (const f of FILES) {
  const path = DIR + f + ".json";
  const obj = JSON.parse(fs.readFileSync(path, "utf8"));
  const topic = obj.topic || obj.soha || "";
  for (const q of obj.questions) {
    // 1) topic/subject
    if (!q.topic) { q.topic = topic; nTopic++; }
    if (!q.subject) q.subject = "CHQBT";

    // 2) difficulty <-> cognitive
    const cg = (q.cognitive || "").replace(/ʻ/g, "'");
    const want = DIFF[cg] || DIFF[q.cognitive];
    if (want && q.difficulty !== want) { q.difficulty = want; nDiff++; }

    // 3) cue-leak: to'g'ri variantда qavs bo'lib, asimmetriya bo'lsa — qavsni olib tashlaymiz
    const before = cueLeakReasons(q);
    if (before.some((r) => r.includes("izoh/qavs/tire"))) {
      const a = q.answer;
      const stripped = q.options[a].replace(/\s*\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
      if (stripped && stripped !== q.options[a]) {
        const test = { ...q, options: { ...q.options, [a]: stripped } };
        if (!cueLeakReasons(test).some((r) => r.includes("izoh/qavs/tire"))) {
          q.options[a] = stripped; nCue++;
        }
      }
    }
  }
  // tartiblangan maydon nomlarini saqlash uchun questions ni yangilab yozamiz
  if (apply) fs.writeFileSync(path, JSON.stringify(obj, null, 1), "utf8");
}

console.log(`Tuzatildi: topic qo'shildi ${nTopic} | difficulty moslandi ${nDiff} | cue-leak qavs olib tashlandi ${nCue}`);
console.log(apply ? "✓ QO'LLANDI (fayllar yangilandi)." : "(Ko'rish rejimi — qo'llash uchun --apply)");
