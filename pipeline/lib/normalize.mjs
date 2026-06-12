// Savol matnini taqqoslash uchun normallashtirish.
// Maqsad: "O'qituvchi" / "Oʻqituvchi" / "o qituvchi" kabi farqlarni bir xil ko'rinishga keltirish,
// shunda dedup (takror topish) aniq ishlaydi.

// Turli apostrof/tutuq belgilarini bitta holatga keltiramiz, keyin ularni butunlay olib tashlaymiz.
const APOSTROPHES = /[ʼʻ'`´’‘""]/g;

// Padding "shablon" belgilarini olib tashlaydi: "#KS1784" tegi va "[Mavzu: ...]" prefiksi.
// Bularsiz har savol sun'iy ravishda noyob ko'rinadi va dedup aldanardi.
export function stripMarkers(text) {
  return String(text || "")
    .replace(/\[\s*mavzu[^\]]*\]/gi, " ") // [Mavzu: O'quv jarayoni...] -> olib tashlanadi
    .replace(/#\s*[A-Za-zА-Яа-я]*\d[\w\-]*/g, " ") // #KS1784, #PQ393 ... -> olib tashlanadi
    .replace(/\(\s*#[^)]*\)/g, " "); // (#KS1784) -> olib tashlanadi
}

export function normalize(text) {
  return stripMarkers(text)
    .toLowerCase()
    .replace(APOSTROPHES, "")        // o'qituvchi -> oqituvchi
    .replace(/[^a-zа-яё0-9\s]/gi, " ") // tinish belgilari -> bo'shliq (lotin+kirill+raqam qoladi)
    .replace(/\s+/g, " ")
    .trim();
}

// Matnda krill harf bormi? (lotin-only qoidasini tekshirish uchun)
// Krill Unicode oralig'i U+0400..U+04FF.
const CYRILLIC = /[Ѐ-ӿ]/;
export function hasCyrillic(text) {
  return CYRILLIC.test(String(text || ""));
}

// Matndagi krill harflarni ajratib qaytaradi (xato xabarida ko'rsatish uchun).
export function cyrillicChars(text) {
  const m = String(text || "").match(/[Ѐ-ӿ]/g);
  return m ? [...new Set(m)].join("") : "";
}

// Belgi-trigram to'plami (3 ta belgidan iborat oynalar). Yaqin-takror o'lchash uchun.
export function trigrams(normText) {
  const s = "  " + normText + "  ";
  const set = new Set();
  for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
  return set;
}

// Jaccard o'xshashligi: 0 (umuman boshqa) .. 1 (aynan bir xil)
export function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  const [small, big] = setA.size < setB.size ? [setA, setB] : [setB, setA];
  for (const t of small) if (big.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}
