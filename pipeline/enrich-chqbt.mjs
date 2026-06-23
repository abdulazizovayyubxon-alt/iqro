// CHQBT bankini SIFAT bo'yicha boyitish: zaif "rekall" savollarni namuna darajasidagi
// vaziyatli/analitik (Y2) savolga aylantiradi — LEKIN to'g'ri javob FAKTINI saqlaydi.
// Har qayta-yozish qat'iy validatsiya + fakt-mosligi tekshiruvidan o'tadi; o'tmasa ASL saqlanadi.
//
//   node pipeline/enrich-chqbt.mjs --smoke 6     # 6 ta sinov (oldin/keyin, BANK O'ZGARMAYDI)
//   node pipeline/enrich-chqbt.mjs --run         # to'liq; -> chqbt_app_import.enriched.json + checkpoint
import fs from "fs";
import { cueLeakReasons } from "./lib/quality.mjs";
import { hasCyrillic, cyrillicChars } from "./lib/normalize.mjs";

// ── .env ──
if (fs.existsSync(".env")) for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const BASE = process.env.PIPELINE_API_BASE, MODEL = process.env.PIPELINE_API_MODEL;
const keys = (process.env.PIPELINE_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
let keyIdx = 0;
if (!BASE || !keys.length || !MODEL) { console.error("Xato: .env da PIPELINE_API_* kerak"); process.exit(1); }

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SMOKE = args.includes("--smoke") ? parseInt(args[args.indexOf("--smoke") + 1] || "6", 10) : 0;
const RUN = args.includes("--run");
const SRC = "chqbt_app_import.json";
const OUT = "chqbt_app_import.enriched.json";
const CKPT = "pipeline/_chqbt_enrich_ckpt.json"; // { doneByKey: {qHash: newObjOrNull} }

const TOPICS = ["Harbiy xizmat asoslari", "Umumharbiy nizomlar", "Otish tayyorgarligi", "Taktik tayyorgarlik", "Fuqaro muhofazasi", "Tibbiy bilim asoslari", "Pedagogik mahorat"];
const L = ["A", "B", "C", "D"];

// ── yordamchilar ──
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms, l) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout:${l}`)), ms))]);
const stripL = s => String(s).replace(/^\s*[A-D]\)\s*/, "").trim();
const normToks = s => new Set((String(s).toLowerCase().replace(/[`‘’ʼ']/g, "'").match(/[a-z'’]{3,}/g) || []));
const nums = s => (String(s).match(/\d+[.,]?\d*/g) || []).map(x => x.replace(",", "."));
const hashQ = s => String(s).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);

function isMatchingLike(q) {
  return /moslashtir|ketma-ket|to[‘'`]?g[‘'`]?ri tartib|joylashtiring/i.test(q.q) || /\n\s*[A-D][.)]/.test(q.q) || /\b1-[A-D]\b/.test((q.opts || []).join(" "));
}
function isWeakRecall(q) {
  const stem = q.q || "";
  const scen = stem.length > 120 || /vaziyat|holatda|agar |bo[‘']?lsa|tahlil|taqqosla|farq|nega |o[‘']qituvchi|o[‘']quvchi|moslashtir|tartib(da|ini)|ketma-ket/i.test(stem);
  return !scen && stem.length < 95;
}
function isCandidate(q) {
  if (q.image || q.img || q.imageUrl) return false;     // rasmli — tegmaymiz
  if ((q.opts || []).length !== 4) return false;
  if (isMatchingLike(q)) return false;                   // faqat single
  return isWeakRecall(q);
}

// ── LLM ──
async function callLLM(prompt, tries = 4) {
  for (let k = 0; k < tries; k++) {
    try {
      const key = keys[keyIdx % keys.length];
      const res = await withTimeout(fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 8000 }),
        signal: AbortSignal.timeout(60000),
      }), 70000, "fetch");
      if (res.status === 429 || res.status >= 500) { keyIdx++; await sleep(800); continue; }
      if (!res.ok) { keyIdx++; await sleep(800); continue; }
      const data = await withTimeout(res.json(), 20000, "json");
      const c = data.choices?.[0]?.message?.content;
      keyIdx++;
      if (c) return c;
    } catch { keyIdx++; await sleep(1200 * (k + 1)); }
  }
  return "";
}
function parseObj(text) {
  let t = String(text).replace(/```(?:json)?/gi, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  for (const cand of [t.slice(a, b + 1), t.slice(a, b + 1).replace(/,(\s*[\]}])/g, "$1")]) { try { return JSON.parse(cand); } catch {} }
  return null;
}

function buildPrompt(q) {
  const correctText = stripL(q.opts[q.correct]);
  const topic = TOPICS[q.topicId] || "CHQBT";
  return `Siz O'zbekiston "Chaqiruvga qadar boshlang'ich tayyorgarlik" (CHQBT) o'qituvchilari attestatsiyasi uchun professional test-maker'siz. Quyidagi MAVJUD savol juda sodda — "quruq yodlash" darajasida. Uni RASMIY DEMOTEST NAMUNASI darajasidagi VAZIYATLI/QO'LLASH (Y2) savoliga aylantiring.

MAVZU BLOKI: ${topic}

MAVJUD SAVOL:
"${q.q}"
TO'G'RI JAVOB (fakt): "${correctText}"
IZOH: "${q.explanation || ""}"

QATIY TALABLAR:
1) TO'G'RI JAVOB FAKTI O'ZGARMAYDI. Sinaladigan asosiy fakt aynan yuqoridagi to'g'ri javob bo'lib qoladi (raqam/atama/qoida o'sha-o'sha). Faktni almashtirma, yangi fakt qo'shma.
2) SAVOLNI CHUQURLASHTIR: quruq ta'rif o'rniga real harbiy/dars/hayotiy VAZIYAT tasvirla, so'ng shu faktni QO'LLASH/TANLASH/FARQLASHni so'ra. Bir qarashda topib bo'lmasin.
3) 4 ta variant (A-D), bittasi to'g'ri. Chalg'ituvchilar ham ishonarli, TIPIK xatoga asoslangan bo'lsin. Variantlar bir-biriga yaqin uzunlikda — to'g'ri javob eng uzun bo'lib ajralmasin.
4) explanation: lo'nda (2-4 jumla), faktni MAZMUNAN asosla, nega boshqalari xato — tushuncha bilan. Variant HARFINI (A/B/C/D) YOZMA.
5) mnemonic: 1 qator o'zbekcha — qisqa assotsiatsiya/so'z o'yini.
6) FAQAT lotin alifbosi (krill harf YO'Q). Imlo to'g'ri (o', g', sh, ch; tutuq belgisi: ma'no, ta'lim).

CHIQISH — FAQAT shu JSON (markdown yo'q, izoh yo'q):
{"q":"...","opts":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"...","mnemonic":"..."}`;
}

// Izohdan "To'g'ri javob B" kabi HARF-ishoralarini tozalaydi (bank uslubi: mazmunan, harfsiz)
function cleanExplanation(ex) {
  let s = String(ex || "").trim();
  // 1) bosh ibora "B varianti bo'lib," / "To'g'ri javob — B," — vergul/nuqtagacha butunlay olib tashlanadi
  s = s.replace(/^\s*(to['’`]?\s?g['’`]?ri\s+javob|javob|[A-D]\s+variant\w*)\b[^.,]*[,.]\s*/i, "");
  // 2) ichki harf-ishoralar (ikkala tartib)
  s = s.replace(/\b(to['’`]?\s?g['’`]?ri\s+javob|javob)\s*[—:\-]?\s*[A-D]\b\.?/gi, ""); // "javob B"
  s = s.replace(/\b[A-D]\s+variant\w*/gi, "");                                          // "B varianti"
  s = s.replace(/\bvariant\w*\s+[A-D]\b\.?/gi, "");                                     // "varianti B"
  // 3) "(B)" tegi
  s = s.replace(/\s*\(([A-D])\)\s*/g, " ");
  // 4) oxirida osilib qolgan bog'lovchi/qoldiq ("...Shuning uchun." / "Demak, varianti." / ", varianti.")
  s = s.replace(/[\s,.;—-]+(shuning\s+uchun|demak|shu\s+sababli|shu\s+bois|xullas|shu\s+tariqa)?\s*variant\w*\.?\s*$/i, ".");
  s = s.replace(/[\s,.;—-]*(shuning\s+uchun|demak|shu\s+sababli|shu\s+bois|xullas|shu\s+tariqa)[\s,.;—-]*$/i, ".");
  // 5) qoldiq artefaktlar: bo'sh "()", orfan "esa" (harf olib tashlangach qolgan)
  s = s.replace(/\(\s*\)/g, "").replace(/([,.]\s*)esa\s+/gi, "$1");
  // 6) tartibga solish + bosh harfni katta qilish
  s = s.replace(/\s*\.\s*\./g, ".").replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").replace(/^[\s.,;:—-]+/, "").trim();
  if (s) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

// ── Validatsiya + fakt-mosligi: o'tsa yangi obyekt, o'tmasa null ──
function validateRewrite(orig, nu) {
  const fail = r => ({ ok: false, why: r });
  if (!nu || typeof nu.q !== "string") return fail("parse/q yo'q");
  if (!Array.isArray(nu.opts) || nu.opts.length !== 4) return fail("opts!=4");
  if (!Number.isInteger(nu.correct) || nu.correct < 0 || nu.correct > 3) return fail("correct noto'g'ri");
  const optsTxt = nu.opts.map(stripL);
  if (optsTxt.some(o => !o || o.length < 1)) return fail("bo'sh variant");
  if (new Set(optsTxt.map(o => o.toLowerCase())).size < 4) return fail("takror variant");
  if (nu.q.trim().length < 25) return fail("savol qisqa");
  nu.explanation = cleanExplanation(nu.explanation); // "To'g'ri javob B" kabi harf-ishorani olib tashlaymiz
  if (!nu.explanation || nu.explanation.trim().length < 15) return fail("izoh qisqa");
  if (!nu.mnemonic || !nu.mnemonic.trim()) return fail("mnemonika yo'q");
  for (const f of [nu.q, ...nu.opts, nu.explanation, nu.mnemonic]) if (hasCyrillic(f)) return fail("krill: " + cyrillicChars(f));
  // izoh harfga ishora qilmasin (tozalashdan keyin ham qolsa — rad)
  if (/\b[A-D]\)/.test(nu.explanation) || /\b[A-D]\b\s*(to['’`]?\s?g['’`]?ri|variant|javob)/i.test(nu.explanation) || /(javob|variant)\s+[A-D]\b/i.test(nu.explanation) || /\b[A-D]\s+esa\b/.test(nu.explanation)) return fail("izoh harfga ishora");
  // cue-leak (loyiha standarti)
  const canon = { options: Object.fromEntries(L.map((x, i) => [x, optsTxt[i]])), answer: L[nu.correct], qtype: "single", explanation: nu.explanation };
  const cl = cueLeakReasons(canon);
  if (cl.length) return fail("cue-leak: " + cl[0].slice(0, 40));
  // FAKT SAQLANISHI: yangi to'g'ri variant eski to'g'ri fakt bilan mos
  const oldCorrect = stripL(orig.opts[orig.correct]);
  const newCorrect = optsTxt[nu.correct];
  const oNums = nums(oldCorrect);
  if (oNums.length) { // raqamli fakt — AYNAN saqlanishi shart (kalibr, son, sur'at...)
    const nAll = nums(newCorrect + " " + nu.q).map(x => x);
    for (const x of oNums) if (!nAll.includes(x)) return fail(`raqamli fakt yo'qoldi: ${x}`);
  }
  const oSet = normToks(oldCorrect), nSet = normToks(newCorrect);
  if (oSet.size) {
    let inter = 0; for (const t of oSet) if (nSet.has(t)) inter++;
    const overlap = inter / oSet.size;
    const numOk = oNums.length && oNums.every(x => nums(newCorrect).includes(x));
    if (overlap < 0.34 && !numOk) return fail(`fakt-mosligi past (${overlap.toFixed(2)})`);
  }
  // chuqurlashganmi (statistika uchun)
  const deeper = nu.q.length >= (orig.q.length + 12) || /vaziyat|holatda|agar |bo[‘']?lsa|jangchi|o[‘']qituvchi|komandir|askar/i.test(nu.q);
  return { ok: true, deeper, obj: { q: nu.q.trim(), opts: nu.opts.map(s => s.trim()), correct: nu.correct, explanation: nu.explanation.trim(), mnemonic: nu.mnemonic.trim(), topicId: orig.topicId } };
}

async function main() {
  const bank = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const cands = bank.filter(isCandidate);
  console.log(`Bank: ${bank.length} | enrich nomzodi (zaif rekall, single, rasmsiz): ${cands.length}`);

  if (SMOKE) {
    const pick = [];
    const step = Math.max(1, Math.floor(cands.length / SMOKE));
    for (let i = 0; i < cands.length && pick.length < SMOKE; i += step) pick.push(cands[i]);
    let ok = 0;
    for (const q of pick) {
      const raw = await callLLM(buildPrompt(q));
      const v = validateRewrite(q, parseObj(raw));
      console.log("\n" + "=".repeat(72));
      console.log(`[tid${q.topicId} ${TOPICS[q.topicId]}]`);
      console.log("OLDIN:  " + q.q);
      q.opts.forEach((o, i) => console.log(`   ${i === q.correct ? "✔" : " "} ${o}`));
      if (v.ok) {
        ok++;
        console.log("KEYIN:  " + v.obj.q + (v.deeper ? "  [chuqurlashdi]" : "  [valid]"));
        v.obj.opts.forEach((o, i) => console.log(`   ${i === v.obj.correct ? "✔" : " "} ${o}`));
        console.log("   Izoh: " + v.obj.explanation);
        console.log("   Mnem: " + v.obj.mnemonic);
      } else {
        console.log("KEYIN:  ✗ RAD (" + v.why + ") → asl saqlanadi");
      }
      await sleep(400);
    }
    console.log(`\nSmoke yakuni: ${ok}/${pick.length} qabul qilindi. (Bank o'zgarmadi.)`);
    return;
  }

  if (!RUN) { console.log("--smoke N yoki --run bering"); return; }

  // checkpoint
  let ckpt = { done: {} };
  if (fs.existsSync(CKPT)) try { ckpt = JSON.parse(fs.readFileSync(CKPT, "utf8")); } catch {}
  const MAX = parseInt(A("--max", "0"), 10) || Infinity;       // shu chaqiruvda ko'pi bilan N ta yangi (bo'lakli haydash)
  const CONC = parseInt(A("--concurrency", "6"), 10);          // parallel ishchilar (27 kalit — 6 xavfsiz)

  const todoAll = cands.filter(q => ckpt.done[hashQ(q.q)] === undefined);
  const slice = todoAll.slice(0, MAX === Infinity ? todoAll.length : MAX);
  const alreadyDone = Object.keys(ckpt.done).length;
  console.log(`Checkpoint: ${alreadyDone} bajarilgan | qolgan ${todoAll.length} | shu chaqiruvda ${slice.length} (parallel ${CONC})`);

  let idx = 0, acc = 0, rej = 0, deep = 0, proc = 0;
  let lastSave = 0;
  async function worker() {
    while (idx < slice.length) {
      const q = slice[idx++];
      try {
        const v = validateRewrite(q, parseObj(await callLLM(buildPrompt(q))));
        ckpt.done[hashQ(q.q)] = v.ok ? v.obj : null; // null = rad (asl saqlanadi)
        if (v.ok) { acc++; if (v.deeper) deep++; } else rej++;
      } catch { rej++; }
      if (++proc - lastSave >= 12) { lastSave = proc; fs.writeFileSync(CKPT, JSON.stringify(ckpt)); process.stdout.write(`\r  ${proc}/${slice.length} | qabul ${acc} (chuqur ${deep}) | rad ${rej}   `); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONC) }, worker));
  fs.writeFileSync(CKPT, JSON.stringify(ckpt));

  // OUT ni har chaqiruvda yangilab boramiz (bajarilgan joyda boyitilgan, qolgani asl)
  const out = bank.map(q => {
    if (!isCandidate(q)) return q;
    const nu = ckpt.done[hashQ(q.q)];
    return nu ? nu : q;
  });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const totalDone = Object.keys(ckpt.done).length;
  const remain = cands.length - totalDone;
  console.log(`\n✓ Shu chaqiruv: +${proc} (qabul ${acc}, chuqur ${deep}, rad ${rej}) | JAMI bajarilgan ${totalDone}/${cands.length} | qolgan ${remain}`);
  console.log(`   → ${OUT}. ${remain > 0 ? "Davom uchun yana --run bering." : "TUGADI — barcha nomzod bajarildi."}`);
}
main();
