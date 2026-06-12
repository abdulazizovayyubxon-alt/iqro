// Savol matnlarini taqqoslash uchun yordamchi funksiyalar (brauzer, paketsiz).
// pipeline/lib/normalize.mjs dan ko'chirildi — dublikat topish (AdminPage) uchun.

const APOSTROPHES = /[ʼʻ'`´’‘""]/g;

// "shablon" belgilarini olib tashlaydi: "#KS1784" tegi va "[Mavzu: ...]" prefiksi.
export function stripMarkers(text) {
  return String(text || "")
    .replace(/\[\s*mavzu[^\]]*\]/gi, " ")
    .replace(/#\s*[A-Za-zА-Яа-я]*\d[\w\-]*/g, " ")
    .replace(/\(\s*#[^)]*\)/g, " ");
}

// Matnni normallashtirish: apostrof/tinish belgilari olib tashlanadi, kichik harf, bo'shliq siqiladi.
export function normalizeText(text) {
  return stripMarkers(text)
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
