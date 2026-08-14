// Javob-ishora (cue leakage) tekshiruvi: to'g'ri javobni o'qimasdan topib bo'lmasligi uchun.
// Variantlar teng "vazn"da bo'lishi kerak — to'g'ri javob uzunligi yoki izohi bilan ajralmasin.

const CUE_TOKENS = [/—/, /–/, / - /, /\(/, /\bya'?ni\b/i, /\bnatijasida\b/i, /\bsababli\b/i, /\bchunki\b/i, /\bdemak\b/i];
const LETTERS = ["A", "B", "C", "D"];

export function cueLeakReasons(q) {
  const reasons = [];
  const opts = q.options || {};
  if (!LETTERS.every((x) => opts[x] != null)) return reasons; // to'liqsizlikni schema ushlaydi
  const ans = q.answer;
  if (!LETTERS.includes(ans)) return reasons;

  const correct = String(opts[ans]).trim();
  const distract = LETTERS.filter((x) => x !== ans).map((x) => String(opts[x]).trim());
  const qtype = q.qtype || "single";

  // 1) UZUNLIK ishorasi: to'g'ri javob distraktorlardan ancha uzun va eng uzun yagona bo'lsa
  //    (combo variantlari "b, e" qolipida — bir xil qisqa, uzunlik ishorasi qo'llanmaydi)
  const lens = distract.map((s) => s.length).sort((a, b) => a - b);
  const med = lens[Math.floor(lens.length / 2)] || 1;
  const maxD = Math.max(...lens);
  if (qtype !== "combo" && correct.length > maxD && correct.length > 1.6 * med && correct.length - maxD >= 8) {
    reasons.push(`javob-ishora: to'g'ri variant ancha uzun (${correct.length} belgi, distraktorlar ~${med}) — o'qimay topiladi`);
  }

  // 2) IZOH ishorasi (faqat single da): qavs/tire/izoh faqat to'g'ri javobda bo'lsa
  if (qtype === "single") {
    const hasCue = (s) => CUE_TOKENS.some((re) => re.test(s));
    if (hasCue(correct) && !distract.some(hasCue)) {
      reasons.push("javob-ishora: faqat to'g'ri variantda izoh/qavs/tire bor (distraktorlarda yo'q)");
    }
  }

  // 3) "Barchasi/hech biri" kabi variant — psixometrik nuqson
  if (distract.concat(correct).some((s) => /yuqoridagilarning|barchasi to'g'ri|hech biri/i.test(s))) {
    reasons.push("javob-ishora: 'barchasi/hech biri' kabi variant ishlatilgan");
  }

  // 5) FORMULA-NAQSH ishorasi: distraktorlar bir xil "Faqat ..." qolipida, to'g'ri javob esa emas.
  //    Agar HAMMA distraktor "Faqat" bilan boshlansa — yagona "Faqat"siz variant ko'rinib qoladi.
  //    Ikkitasi bo'lsa-yu, to'g'ri javob ulardan uzunroq (keng/to'liq) bo'lsa ham — ishora.
  if (qtype === "single") {
    const isFaqat = (s) => /^Faqat(gina)?\b/i.test(s);
    const fc = distract.filter(isFaqat).length;
    const avgD = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
    if (!isFaqat(correct) && (fc === 3 || (fc === 2 && correct.length > avgD))) {
      reasons.push(`javob-ishora: distraktorlar bir xil 'Faqat ...' qolipida (${fc} ta), to'g'ri javob naqshdan ajralib turadi`);
    }
  }

  // 4) IZOH-HARF nomuvofiqligi (faqat single): explanation variant HARFiga ishora qilsa
  //    (mas: "A to'g'ri", "B variant", "B, C, D"), AVTOMATIK aralashtirishdan keyin izoh NOTO'G'RI
  //    bo'lib qoladi. Shuning uchun bunday savol rad etiladi — izoh mazmunan yozilishi shart.
  if (qtype === "single") {
    const ex = String(q.explanation || "");
    if (/\b[A-D]\b\s*[).,:\-]?\s*(to['’‘`]?\s?g['’‘`]?ri|javob|variant|noto)/i.test(ex) ||
        /\b[A-D]\)/.test(ex) ||
        /\b[A-D]\s*,\s*[A-D]\b/.test(ex)) {
      reasons.push("javob-ishora: izoh variant HARFiga ishora qiladi (aralashtirishdan keyin buziladi) — mazmunan yozilsin");
    }
  }

  return reasons;
}

// Kombinatsiya (combo) tuzilma tekshiruvi: savol o'zagida raqamli/harfli kichik mulohazalar
// (a, b, d, e yoki 1, 2, 3, 4), variantlar (A–D) esa ularning kombinatsiyasi ("b, e"). Bittasi to'g'ri.
// Psixometrik jihatdan single kabi, lekin o'zak bilan variantlar mosligini alohida tekshirish kerak.
// DIQQAT: combo izohi KICHIK belgiga (a, d) ishora qiladi — bu o'zakdagi mulohaza, A–D variant EMAS;
// shuning uchun cue-leak'ning izoh-harf qoidasi (faqat single) combo'ni rad etmaydi.
export function comboReasons(q) {
  const reasons = [];
  if ((q.qtype || "single") !== "combo") return reasons;
  const opts = q.options || {};
  if (!LETTERS.every((x) => opts[x] != null)) return reasons; // to'liqsizlikni schema ushlaydi

  const comboRe = /^[a-z0-9](\s*[,;]\s*[a-z0-9])+$/i; // kamida 2 ta bir belgili token, vergul bilan
  const sets = [];
  const used = new Set();
  for (const L of LETTERS) {
    const v = String(opts[L]).trim();
    if (!comboRe.test(v)) {
      reasons.push(`combo: variant ${L} ("${v.slice(0, 24)}") belgilar kombinatsiyasi emas (mas: "b, e")`);
      continue;
    }
    const toks = v.split(/[\s,;]+/).filter(Boolean).map((t) => t.toLowerCase());
    toks.forEach((t) => used.add(t));
    sets.push(toks.slice().sort().join(","));
  }
  if (reasons.length) return reasons; // formati buzuq — qolgan tekshiruvlar ma'nosiz

  // Variant-to'plamlar mazmunan takrorlanmasin (faqat tartibi farq qilmasin: "a, b" va "b, a")
  if (new Set(sets).size < sets.length) {
    reasons.push("combo: ikki variant bir xil to'plam (faqat tartibi farq qiladi)");
  }

  // Har bir foydalanilgan belgi savol o'zagida e'lon qilingan bo'lsin (mas: "b) ...")
  const stem = String(q.question || "");
  for (const t of used) {
    const re = new RegExp(`(^|[\\s\\n(])${t}\\s*[).]`, "i");
    if (!re.test(stem)) {
      reasons.push(`combo: "${t}" variantlarda bor, lekin savol o'zagida e'lon qilinmagan (mas: "${t}) ...")`);
    }
  }

  // Kamida 3 ta kichik mulohaza bo'lsin (namuna odatda 4 ta)
  if (used.size < 3) reasons.push(`combo: kamida 3 ta kichik mulohaza kerak (hozir ${used.size})`);

  return reasons;
}

// ── matching / sequence tuzilma tekshiruvi (2026-08-14 da qo'shildi) ─────────────────────
//
// NEGA: mtt_jismoniy pilot yurishida model "matching" savollarni O'ZAKDA o'ng ustunni (A./B./C.
// ta'riflarni) UMUMAN yozmasdan chiqardi — variantlar "1-B, 2-A, 3-C" edi, lekin B/A/C nima
// ekani savolda yo'q. Bunday savolga javob berib bo'lmaydi. combo uchun bunday qo'riqlagich
// (comboReasons) bor edi, matching/sequence uchun yo'q edi — shu bo'shliq to'ldirildi.
//
// Ikkinchi nuqson: izoh o'zining moslik/tartibini aytadi-yu, u BELGILANGAN javobga zid bo'ladi
// (pilotda: izoh "to'g'ri juftlik 1-A, 2-B, 3-C" deydi, answer esa "1-A, 2-C, 3-B" variantini
// ko'rsatadi). Izohdagi moslik/tartib javob varianti bilan solishtiriladi — zid bo'lsa rad etiladi.
const MAP_PAIR = /(\d)\s*[-–—:]\s*([A-Z])\b/g;
const listedNums = (stem) => new Set((stem.match(/(?:^|[\s\n(])(\d)\s*[).]/g) || []).map((s) => s.replace(/\D/g, "")));
const listedLetters = (stem) => new Set((stem.match(/(?:^|[\s\n(])([A-Z])\s*[).]/g) || []).map((s) => s.trim()[0]));

export function matchingReasons(q) {
  const reasons = [];
  if ((q.qtype || "single") !== "matching") return reasons;
  const opts = q.options || {};
  if (!LETTERS.every((x) => opts[x] != null)) return reasons;
  const stem = String(q.question || "");

  const nums = listedNums(stem);
  const lets = listedLetters(stem);
  if (nums.size < 2) reasons.push(`matching: savol o'zagida raqamli ro'yxat yo'q (kamida 2 ta "1) ..." kerak)`);
  if (lets.size < 2) reasons.push(`matching: savol o'zagida harfli ro'yxat yo'q (kamida 2 ta "A. ..." kerak) — javob berib bo'lmaydi`);
  if (reasons.length) return reasons;

  const parsed = [];
  for (const L of LETTERS) {
    const v = String(opts[L]).trim();
    const pairs = [...v.matchAll(MAP_PAIR)];
    if (pairs.length < 2) { reasons.push(`matching: variant ${L} ("${v.slice(0, 24)}") moslik ro'yxati emas (mas: "1-B, 2-A")`); continue; }
    for (const [, n, c] of pairs) {
      if (!nums.has(n)) reasons.push(`matching: variant ${L} da "${n}" raqami o'zakda e'lon qilinmagan`);
      if (!lets.has(c)) reasons.push(`matching: variant ${L} da "${c}" harfi o'zakda e'lon qilinmagan`);
    }
    parsed.push(pairs.map(([, n, c]) => `${n}${c}`).sort().join(","));
  }
  if (reasons.length) return reasons;
  if (new Set(parsed).size < parsed.length) reasons.push("matching: ikki variant bir xil moslikni beradi");

  // Izoh o'z moslikini aytsa — belgilangan javob bilan mos kelsin
  const exPairs = [...String(q.explanation || "").matchAll(MAP_PAIR)];
  if (exPairs.length >= nums.size) {
    const exSet = exPairs.slice(0, nums.size).map(([, n, c]) => `${n}${c}`).sort().join(",");
    const ansSet = parsed[LETTERS.indexOf(q.answer)];
    if (ansSet && exSet !== ansSet) {
      reasons.push(`matching: izohdagi moslik (${exSet}) belgilangan javob (${ansSet}) bilan zid`);
    }
  }
  return reasons;
}

export function sequenceReasons(q) {
  const reasons = [];
  if ((q.qtype || "single") !== "sequence") return reasons;
  const opts = q.options || {};
  if (!LETTERS.every((x) => opts[x] != null)) return reasons;
  const stem = String(q.question || "");

  const nums = listedNums(stem);
  if (nums.size < 3) { reasons.push(`sequence: savol o'zagida kamida 3 ta raqamli qadam kerak (hozir ${nums.size})`); return reasons; }

  const orders = [];
  for (const L of LETTERS) {
    const v = String(opts[L]).trim();
    const toks = (v.match(/\d/g) || []);
    if (toks.length !== nums.size) { reasons.push(`sequence: variant ${L} ("${v.slice(0, 24)}") o'zakdagi ${nums.size} ta qadamning tartibi emas`); continue; }
    if (new Set(toks).size !== toks.length) reasons.push(`sequence: variant ${L} da takroriy raqam bor`);
    for (const t of toks) if (!nums.has(t)) reasons.push(`sequence: variant ${L} da "${t}" raqami o'zakda yo'q`);
    orders.push(toks.join(""));
  }
  if (reasons.length) return reasons;
  if (new Set(orders).size < orders.length) reasons.push("sequence: ikki variant bir xil tartibni beradi");

  // Izoh o'z tartibini aytsa — belgilangan javob bilan mos kelsin
  const exNums = (String(q.explanation || "").match(/\d\s*(?:[,→\-–—]\s*\d\s*){2,}/) || [])[0];
  if (exNums) {
    const exOrder = (exNums.match(/\d/g) || []).join("");
    const ansOrder = orders[LETTERS.indexOf(q.answer)];
    if (ansOrder && exOrder.length === ansOrder.length && exOrder !== ansOrder) {
      reasons.push(`sequence: izohdagi tartib (${exOrder}) belgilangan javob (${ansOrder}) bilan zid`);
    }
  }
  return reasons;
}
