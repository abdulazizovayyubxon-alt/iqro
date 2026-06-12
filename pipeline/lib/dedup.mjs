// Yaqin-dublikat aniqlash — trigram teskari-indeks (inverted index) bilan bloklash.
// Maqsad: 24 000+ savol ichida ham tez ishlasin (har savolni hammasi bilan emas,
// faqat umumiy trigramga ega nomzodlar bilan solishtiradi).

import { normalize, trigrams, jaccard } from "./normalize.mjs";

export const DEFAULT_THRESHOLD = 0.82;
const SKIP_POSTING = 6000; // juda keng tarqalgan trigramni nomzod tanlashda e'tiborsiz qoldirish (tezlik)
const MIN_SHARED = 4;      // kamida shuncha umumiy trigram bo'lsa nomzod deb qaraladi

function textOf(q) {
  if (typeof q === "string") return q;
  return q?.question ?? q?.q ?? "";
}

export function makeIndex(threshold = DEFAULT_THRESHOLD) {
  return { items: [], inverted: new Map(), threshold };
}

// Bitta savolni indeksga qo'shadi.
export function addToIndex(index, q) {
  const norm = normalize(textOf(q));
  if (!norm) return -1;
  const gram = trigrams(norm);
  const idx = index.items.length;
  index.items.push({ norm, gram, ref: q });
  for (const t of gram) {
    let arr = index.inverted.get(t);
    if (!arr) index.inverted.set(t, (arr = []));
    arr.push(idx);
  }
  return idx;
}

// Savollar ro'yxatidan indeks quradi.
export function buildIndex(questions, threshold = DEFAULT_THRESHOLD) {
  const index = makeIndex(threshold);
  for (const q of questions) addToIndex(index, q);
  return index;
}

// Berilgan matnga indeksdagi eng o'xshash savolni topadi (>= chegara bo'lsa).
// Qaytaradi: { score, item } yoki null (noyob bo'lsa).
export function findDuplicate(index, q, threshold = index.threshold) {
  const norm = normalize(textOf(q));
  if (!norm) return null;
  const gram = trigrams(norm);

  // 1) Nomzodlarni tanlash: umumiy trigram sonini sanaymiz
  const shared = new Map();
  for (const t of gram) {
    const arr = index.inverted.get(t);
    if (!arr || arr.length > SKIP_POSTING) continue;
    for (const idx of arr) shared.set(idx, (shared.get(idx) || 0) + 1);
  }

  // 2) Faqat yetarli umumiylikka ega nomzodlar uchun aniq Jaccard
  let best = null;
  for (const [idx, sh] of shared) {
    if (sh < MIN_SHARED) continue;
    const cand = index.items[idx];
    const score = jaccard(gram, cand.gram);
    if (score >= threshold && (!best || score > best.score)) {
      best = { score, item: cand };
      if (score > 0.99) break; // aniq dublikat — to'xtaymiz
    }
  }
  return best;
}

// Ro'yxatni yaqin-dublikatlardan tozalaydi (greedy klaster).
// Qaytaradi: { kept: [...noyob savollar], removed: <son>, clusters: <son> }
export function dedupeList(questions, threshold = DEFAULT_THRESHOLD) {
  const index = makeIndex(threshold);
  const kept = [];
  let removed = 0;
  for (const q of questions) {
    const hit = findDuplicate(index, q, threshold);
    if (hit) { removed++; continue; }
    addToIndex(index, q);
    kept.push(q);
  }
  return { kept, removed, clusters: kept.length };
}
