// Spetsifikatsiya matnini mavzu bo'laklariga ajratadi.
// 1) Avval mavzu markerlari bo'yicha ("1.1.", "2.3.", "II.") urinadi.
// 2) Bo'lmasa — belgilangan oyna (window) + ustma-ustlik (overlap) bilan bo'laklaydi.

// Mavzu sarlavhasiga o'xshash qator: "1.1. ...", "1.2. O'zbekiston ...", "2.2. Tarixni..."
const TOPIC_MARKER = /^\s*(\d{1,2}\.\d{1,2}\.?)\s+(\S.*)$/;

// Imtihon 3 blokdan iborat (spec): mutaxassislik (35) + kasb standartlari (5) + pedagogik mahorat (10).
// Har bo'lakni mazmuniga qarab blokka ajratamiz — generatsiyada nisbatni to'g'ri qamrash uchun.
const RE_PEDAGOGIKA = /pedagog|ta.?lim texnologiya|o.?qitish metod|metodika|didaktik|tarbiya metod|kompetensi|baholash mezon/i;
const RE_KASB = /kasb standart|professional standart|mehnat funksiya/i;

// Marker bo'lakda SARLAVHA ishonchli signal (bo'lim heading'i) — faqat shunga qaraymiz.
// Faqat generik sarlavhada ("Bo'lim N") matnga murojaat qilamiz (kirish-matni bleed'idan qochish).
const GENERIC_TITLE = /^\s*(bo.?lim|qism)\s*\d/i;
export function classifyBlock(title, body = "") {
  const t = String(title || "");
  if (RE_KASB.test(t)) return "kasb";
  if (RE_PEDAGOGIKA.test(t)) return "pedagogika";
  if (!GENERIC_TITLE.test(t) && t.trim()) return "mutaxassislik"; // real heading, kalit yo'q
  const b = String(body || "");
  if (RE_KASB.test(b)) return "kasb";
  if (RE_PEDAGOGIKA.test(b)) return "pedagogika";
  return "mutaxassislik";
}

export const BLOCK_LABEL = {
  mutaxassislik: "Mutaxassislik fani",
  kasb: "Kasb standartlari",
  pedagogika: "Pedagogik mahorat",
};

export function chunkSpec(text, { maxChars = 3500, minChars = 400, overlap = 200 } = {}) {
  const lines = String(text || "").split(/\r?\n/);

  // 1-usul: marker bo'yicha
  const marked = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(TOPIC_MARKER);
    if (m) {
      if (cur) marked.push(cur);
      cur = { title: (m[1] + " " + m[2]).trim().slice(0, 120), text: line + "\n" };
    } else if (cur) {
      cur.text += line + "\n";
    }
  }
  if (cur) marked.push(cur);

  // Yetarli marker topilsa — shularni ishlatamiz (juda uzunlarini bo'lib)
  if (marked.length >= 3) {
    const out = [];
    for (const c of marked) {
      const t = c.text.trim();
      if (t.length <= maxChars) { out.push(c); continue; }
      // uzun mavzuni qism-qismga bo'lamiz
      for (let i = 0, part = 1; i < t.length; i += maxChars - overlap, part++) {
        out.push({ title: `${c.title} (${part})`, text: t.slice(i, i + maxChars) });
      }
    }
    return out
      .filter((c) => c.text.trim().length >= 80)
      .map((c) => ({ ...c, block: classifyBlock(c.title, c.text) }));
  }

  // 2-usul: oddiy oyna
  const clean = String(text || "").replace(/[ \t]+/g, " ").trim();
  const out = [];
  for (let i = 0, n = 1; i < clean.length; i += maxChars - overlap, n++) {
    const piece = clean.slice(i, i + maxChars);
    if (piece.trim().length >= minChars || out.length === 0) {
      out.push({ title: `Bo'lim ${n}`, text: piece });
    }
  }
  return out.map((c) => ({ ...c, block: classifyBlock(c.title, c.text) }));
}
