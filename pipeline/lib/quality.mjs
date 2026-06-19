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
