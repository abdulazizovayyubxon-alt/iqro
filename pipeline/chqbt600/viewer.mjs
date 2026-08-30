// ════════════════════════════════════════════════════════════════════════
// viewer.mjs — CHQBT-600 bo'lim ko'rigi uchun HTML sahifa quradi.
// Saqlanadigan + yangi yozilgan savollarni bir joyda, chiqarilganlarni esa
// sabablari bilan ko'rsatadi.
//
//   node pipeline/chqbt600/viewer.mjs --topic 5
// ════════════════════════════════════════════════════════════════════════

import fs from "node:fs";

const args = process.argv.slice(2);
const A = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const topic = Number(A("--topic", "5"));

const V = JSON.parse(fs.readFileSync(`pipeline/chqbt600/verdicts/topic${topic}.json`, "utf8"));
const newDir = "pipeline/chqbt600/new";
const newRe = new RegExp(`^topic${topic}(_[a-z0-9]+)?\\.json$`);
const NEW = fs.readdirSync(newDir).filter((f) => newRe.test(f)).sort()
  .flatMap((f) => JSON.parse(fs.readFileSync(`${newDir}/${f}`, "utf8")));
const LIVE = JSON.parse(fs.readFileSync("scratch/bundle_chqbt_after.json", "utf8"));
const SCREEN = JSON.parse(fs.readFileSync("pipeline/chqbt600/out/screen_all.json", "utf8"));

// Imlo/matn tuzatishlari — bazadan saqlanadigan savollar shu fayl orqali
// tahrirlanadi (jonli hujjat o'zgarmaydi, tuzatish apply bosqichida yoziladi).
const fixPath = `pipeline/chqbt600/fixes/topic${topic}.json`;
const FIX = fs.existsSync(fixPath) ? JSON.parse(fs.readFileSync(fixPath, "utf8")) : {};

const byId = new Map(LIVE.map((q) => [q.id, { ...q, ...(FIX[q.id] || {}) }]));
const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripPrefix = (s) => String(s).replace(/^[A-D]\)\s*/, "");
const LETTERS = ["A", "B", "C", "D"];

const inTopic = SCREEN.filter((q) => q.topicId === topic);
const stats = {
  bazada: inTopic.length,
  nomzod: inTopic.filter((q) => q.__verdict === "pass").length,
  saqlandi: V.saqlanadi.length,
  yangi: NEW.length,
  chiqarildi: V.chiqarildi.length,
};

function record(q, i, kind, meta) {
  const opts = (q.opts || []).map(stripPrefix);
  const optHtml = opts.map((o, j) => `
        <li class="opt${j === q.correct ? " opt-true" : ""}">
          <span class="opt-key">${LETTERS[j]}</span>
          <span class="opt-body">${e(o)}</span>
          ${j === q.correct ? '<span class="opt-flag">to‘g‘ri</span>' : (meta?.distractor_error?.[j] ? `<span class="opt-note">${e(meta.distractor_error[j])}</span>` : "")}
        </li>`).join("");

  return `
    <article class="rec" data-kind="${kind}">
      <header class="rec-head">
        <span class="rec-no">${String(i).padStart(2, "0")}</span>
        <span class="tag tag-${kind}">${kind === "yangi" ? "yangi yozildi" : "bazadan"}</span>
        ${meta?.difficulty ? `<span class="tag tag-lvl">${e(meta.difficulty)}</span>` : ""}
        ${meta?.tahrirlandi ? '<span class="tag tag-edit">matni tahrirlandi</span>' : ""}
        <span class="rec-src">${e(meta?.source_ref || meta?.mavzu || "")}</span>
      </header>
      <p class="stem">${e(q.q)}</p>
      <ol class="opts">${optHtml}
      </ol>
      <div class="expl"><span class="expl-key">izoh</span><p>${e(q.explanation)}</p></div>
      ${q.mnemonic ? `<p class="mnem">${e(q.mnemonic)}</p>` : ""}
      ${meta?.tuzatish ? `<p class="fix"><span class="fix-key">tuzatiladi</span> ${e(meta.tuzatish)}</p>` : ""}
    </article>`;
}

let n = 0;
const keptHtml = V.saqlanadi.map((k) => {
  const q = byId.get(k.id);
  if (!q) return "";
  n += 1;
  const fixed = Boolean(FIX[k.id]);
  return record(q, n, "bazadan", {
    mavzu: k.mavzu,
    tuzatish: fixed ? null : k.tuzatish,
    tahrirlandi: fixed,
  });
}).join("");

const newHtml = NEW.map((q) => {
  n += 1;
  return record(q, n, "yangi", q);
}).join("");

const droppedHtml = V.chiqarildi.map((d) => {
  const q = byId.get(d.id);
  return `
      <li class="drop">
        <p class="drop-q">${e(q ? q.q.slice(0, 160) + (q.q.length > 160 ? "…" : "") : d.id)}</p>
        <p class="drop-why">${e(d.sabab)}</p>
      </li>`;
}).join("");

const TITLE = { 0: "Harbiy Xizmat Asoslari", 1: "Umumharbiy Nizomlar", 2: "Otish Tayyorgarligi", 3: "Taktik Tayyorgarlik", 4: "Fuqaro Muhofazasi Bloki", 5: "CHQBT-600 Tibbiy Blok", 6: "Pedagogik Mahorat Bloki" };

const html = `<title>${TITLE[topic] || V.bolim}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root {
    --ground: #f2f4ef;
    --sheet: #ffffff;
    --ink: #1b1f16;
    --ink-2: #4e5647;
    --ink-3: #7d8575;
    --rule: #d8ddd2;
    --rule-2: #ecefe8;
    --olive: #4d6b2f;
    --olive-soft: #eaf0e1;
    --slate: #3c5a78;
    --slate-soft: #e5ecf3;
    --rust: #8a3f36;
    --rust-soft: #f3e5e3;
    --amber: #8a6a1f;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #14170f;
      --sheet: #1c2016;
      --ink: #e7ebe0;
      --ink-2: #adb5a4;
      --ink-3: #7b8474;
      --rule: #333a2b;
      --rule-2: #262c1f;
      --olive: #a3c47a;
      --olive-soft: #26301b;
      --slate: #8fb4d6;
      --slate-soft: #1d2833;
      --rust: #d99a90;
      --rust-soft: #2f201d;
      --amber: #d6b45f;
    }
  }
  :root[data-theme="dark"] {
    --ground: #14170f;
    --sheet: #1c2016;
    --ink: #e7ebe0;
    --ink-2: #adb5a4;
    --ink-3: #7b8474;
    --rule: #333a2b;
    --rule-2: #262c1f;
    --olive: #a3c47a;
    --olive-soft: #26301b;
    --slate: #8fb4d6;
    --slate-soft: #1d2833;
    --rust: #d99a90;
    --rust-soft: #2f201d;
    --amber: #d6b45f;
  }

  body {
    background: var(--ground);
    color: var(--ink);
    font-family: "Source Sans 3", ui-sans-serif, system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    margin: 0;
    padding: 0 20px 96px;
  }
  .wrap { max-width: 860px; margin: 0 auto; }

  .masthead { padding: 56px 0 28px; border-bottom: 2px solid var(--ink); }
  .eyebrow {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-weight: 600; font-size: 15px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--olive); margin: 0 0 6px;
  }
  h1 {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-weight: 700; font-size: clamp(34px, 6vw, 52px); line-height: 1.02;
    letter-spacing: -.01em; margin: 0; text-wrap: balance;
  }
  .lede { color: var(--ink-2); max-width: 62ch; margin: 14px 0 0; }

  .ledger { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); margin: 28px 0 0; }
  .cell { background: var(--sheet); padding: 14px 16px; }
  .cell dt {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-size: 14px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); margin: 0 0 2px;
  }
  .cell dd { margin: 0; font-size: 27px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .cell dd small { font-size: 14px; font-weight: 400; color: var(--ink-3); }
  .cell-goal dd { color: var(--olive); }

  h2 {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-weight: 700; font-size: 24px; letter-spacing: .02em; text-transform: uppercase;
    margin: 56px 0 4px; padding-bottom: 8px; border-bottom: 1px solid var(--ink);
  }
  .sec-note { color: var(--ink-3); font-size: 15px; margin: 8px 0 20px; }

  .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0 4px; }
  .filters button {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-size: 15px; letter-spacing: .08em; text-transform: uppercase; font-weight: 600;
    background: var(--sheet); color: var(--ink-2); border: 1px solid var(--rule);
    padding: 7px 14px; cursor: pointer;
  }
  .filters button[aria-pressed="true"] { background: var(--ink); color: var(--ground); border-color: var(--ink); }
  .filters button:focus-visible { outline: 2px solid var(--olive); outline-offset: 2px; }

  .rec { background: var(--sheet); border: 1px solid var(--rule); padding: 20px 22px; margin-top: -1px; }
  .rec-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .rec-no {
    font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13px;
    color: var(--ink-3); font-variant-numeric: tabular-nums;
  }
  .tag {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-size: 13px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600;
    padding: 2px 8px;
  }
  .tag-yangi { background: var(--olive-soft); color: var(--olive); }
  .tag-bazadan { background: var(--slate-soft); color: var(--slate); }
  .tag-lvl { background: var(--rule-2); color: var(--ink-2); }
  .tag-edit { background: var(--rust-soft); color: var(--rust); }
  .rec-src { font-size: 13px; color: var(--ink-3); margin-left: auto; text-align: right; }

  .stem { margin: 0 0 16px; max-width: 68ch; }
  .opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; background: var(--rule-2); }
  .opt { background: var(--sheet); display: grid; grid-template-columns: 26px 1fr; gap: 10px; padding: 9px 10px; align-items: baseline; }
  .opt-key { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 13px; color: var(--ink-3); }
  .opt-true { background: var(--olive-soft); }
  .opt-true .opt-key, .opt-true .opt-body { color: var(--ink); font-weight: 600; }
  .opt-flag, .opt-note {
    grid-column: 2; font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-size: 13px; letter-spacing: .08em; text-transform: uppercase;
  }
  .opt-flag { color: var(--olive); font-weight: 700; }
  .opt-note { color: var(--ink-3); }

  .expl { display: grid; grid-template-columns: 62px 1fr; gap: 12px; margin-top: 14px; }
  .expl-key, .fix-key {
    font-family: "Barlow Condensed", ui-sans-serif, sans-serif;
    font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3);
  }
  .expl p { margin: 0; color: var(--ink-2); font-size: 15px; max-width: 66ch; }
  .mnem { margin: 10px 0 0 74px; font-style: italic; color: var(--ink-3); font-size: 15px; }
  .fix { margin: 12px 0 0; padding: 8px 10px; background: var(--rust-soft); color: var(--rust); font-size: 14px; }
  .fix-key { color: var(--rust); margin-right: 6px; }

  .drops { list-style: none; margin: 0; padding: 0; }
  .drop { border-bottom: 1px solid var(--rule); padding: 12px 0; display: grid; grid-template-columns: 1fr; gap: 3px; }
  .drop-q { margin: 0; color: var(--ink-2); font-size: 15px; }
  .drop-why { margin: 0; font-size: 14px; color: var(--rust); }

  footer { margin-top: 56px; padding-top: 18px; border-top: 1px solid var(--rule); color: var(--ink-3); font-size: 14px; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">CHQBT-600 &middot; ${e(V.bolim)}</p>
    <h1>${e(V.bolim)}: ${stats.saqlandi + stats.yangi} ta vaziyatli savol</h1>
    <p class="lede">Bazadagi ${stats.bazada} ta savoldan mexanik darvoza ${stats.nomzod} tasini nomzod qilib qoldirdi; qo'lda ko'rikdan ${stats.saqlandi} tasi o'tdi. Yetishmagan ${stats.yangi} ta savol yangidan yozildi va barcha darvozalardan o'tkazildi.</p>
    <dl class="ledger">
      <div class="cell"><dt>bazada bor edi</dt><dd>${stats.bazada}</dd></div>
      <div class="cell"><dt>saqlandi</dt><dd>${stats.saqlandi}</dd></div>
      <div class="cell"><dt>yangi yozildi</dt><dd>${stats.yangi}</dd></div>
      <div class="cell cell-goal"><dt>blok normasi</dt><dd>${stats.saqlandi + stats.yangi}<small>&thinsp;/&thinsp;${V.kerak}</small></dd></div>
    </dl>
  </header>

  <h2>Savollar</h2>
  <p class="sec-note">To'g'ri javob yashil bilan belgilangan. Yangi savollarda har bir chalg'ituvchi ostida u qaysi tipik xatoga asoslangani ko'rsatilgan.</p>
  <div class="filters">
    <button type="button" data-f="all" aria-pressed="true">Hammasi &middot; ${stats.saqlandi + stats.yangi}</button>
    <button type="button" data-f="bazadan" aria-pressed="false">Bazadan &middot; ${stats.saqlandi}</button>
    <button type="button" data-f="yangi" aria-pressed="false">Yangi &middot; ${stats.yangi}</button>
  </div>
  <div id="recs">${keptHtml}${newHtml}</div>

  <h2>Chiqarilganlar</h2>
  <p class="sec-note">Mexanik darvozadan o'tgan, lekin qo'lda ko'rikda yiqilgan ${stats.chiqarildi} ta savol. Qolgan ${stats.bazada - stats.nomzod} tasi darvozaning o'zidayoq rad etilgan (jo'nlik, javob-ishora, vaziyatsizlik).</p>
  <ol class="drops">${droppedHtml}</ol>

  <footer>Zehin &middot; CHQBT-600 &middot; ${e(V.bolim)} bloki &middot; ${new Date().toISOString().slice(0, 10)}</footer>
</div>

<script>
  (function () {
    var btns = document.querySelectorAll(".filters button");
    var recs = document.querySelectorAll("#recs .rec");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.dataset.f;
        btns.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        recs.forEach(function (r) { r.style.display = (f === "all" || r.dataset.kind === f) ? "" : "none"; });
      });
    });
  })();
</script>
`;

fs.writeFileSync(`pipeline/chqbt600/out/topic${topic}_korish.html`, html);
console.log(`→ pipeline/chqbt600/out/topic${topic}_korish.html`);
console.log(`   saqlandi ${stats.saqlandi} + yangi ${stats.yangi} = ${stats.saqlandi + stats.yangi} / ${V.kerak}`);
