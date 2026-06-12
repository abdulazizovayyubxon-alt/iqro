// Watchdog: generatsiya to'xtasa o'zi qayta yuradi, TARGET ga yetguncha.
// node pipeline/watchdog.mjs --subject chqbt --target 1200 --per 12 --delay 400

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i+1] : d; };
const subject = A("--subject", "chqbt");
const target = parseInt(A("--target", "1200"), 10);
const per = A("--per", "12");
const delay = A("--delay", "400");
const source = A("--source", "scratch/chqbt_book_clean.txt");
const gold = A("--gold", "fan/chqbt_yangi");

const outFile = path.join("fan", subject, "gen_api_progress.json");

function getCount() {
  try { return JSON.parse(fs.readFileSync(outFile, "utf8")).length; }
  catch { return 0; }
}

async function runOnce() {
  return new Promise((resolve) => {
    const child = spawn("node", [
      "pipeline/run-api.mjs",
      "--subject", subject,
      "--target", String(target),
      "--per", per,
      "--source", source,
      "--gold", gold,
      "--delay", delay,
    ], { stdio: "inherit" });
    child.on("close", (code) => resolve(code));
    child.on("error", (e) => { console.error("Spawn xato:", e.message); resolve(1); });
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let round = 0;
while (true) {
  const count = getCount();
  console.log(`\n=== [Watchdog] Round ${++round} | Hozir: ${count}/${target} ===`);
  if (count >= target) { console.log("✓ MAQSADGA YETILDI! Watchdog to'xtadi."); break; }
  console.log("Generatsiya boshlanmoqda...");
  await runOnce();
  const after = getCount();
  console.log(`[Watchdog] Jarayon tugadi. Tayyor: ${after}/${target}`);
  if (after >= target) { console.log("✓ TUGADI!"); break; }
  console.log("[Watchdog] 10 soniya so'ng qayta urinadi...");
  await sleep(10000);
}
