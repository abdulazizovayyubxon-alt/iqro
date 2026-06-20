// Informatika manba hajmini o'lchaydi — maqsad sonni asoslash uchun.
import fs from "fs";
import { resolveSubject, SHARED_PED } from "./lib/subjects.mjs";
import { chunkSpec } from "./lib/chunk.mjs";
import { loadMany } from "./lib/corpus.mjs";

const sub = resolveSubject("informatika");

let mut = chunkSpec(fs.readFileSync(sub.spec, "utf8"), { maxChars: 2400 }).filter((c) => c.block === "mutaxassislik");
let ped = [];
if (fs.existsSync(SHARED_PED.spec)) ped = chunkSpec(fs.readFileSync(SHARED_PED.spec, "utf8"), { maxChars: 2400 }).filter((c) => c.block !== "mutaxassislik");

const byBlock = {};
for (const c of [...mut, ...ped]) byBlock[c.block] = (byBlock[c.block] || 0) + 1;

console.log("=== BO'LIM (chunk) taqsimoti ===");
for (const [b, n] of Object.entries(byBlock)) console.log(`  ${b}: ${n}`);
console.log("  JAMI:", mut.length + ped.length);

const book = fs.existsSync(sub.book) ? fs.readFileSync(sub.book, "utf8") : "";
const spec = fs.readFileSync(sub.spec, "utf8");
console.log("\n=== MANBA HAJMI ===");
console.log("  spec:", spec.length, "belgi /", spec.split(/\s+/).length, "so'z");
console.log("  darslik:", book.length, "belgi /", book.split(/\s+/).length, "so'z");

const nm = (await loadMany(sub.namuna.filter((p) => /\.json$/i.test(p)))).filter((q) => (q.question || q.q) && q.options);
console.log("  namuna langar:", nm.length, "real demotest savol");
