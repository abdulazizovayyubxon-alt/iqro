/**
 * theorySeen — qaysi mavzu konspekti O'QILGANINING doimiy xotirasi.
 *
 * Ilgari bu holat TestPage ichida oddiy `useState({})` edi: sahifadan chiqib
 * qaytilsa nolga tushar va konspekt HAR SAFAR ochilardi. «Bir marta
 * ko'rsatish» niyati bor edi, lekin amalda hech qachon ishlamagan.
 *
 * Qiymat sifatida konspektning `updatedAt` sanasi saqlanadi — material
 * yangilansa yozuv eskiradi va konspekt bir martagina qayta ochiladi.
 * Foydalanuvchi kirmagan bo'lsa 'guest' kaliti ishlatiladi: mehmon ham
 * qayta-qayta to'xtatilmasligi kerak.
 */
const keyOf = (uid) => `zehin_theory_seen_${uid || 'guest'}`;

const readAll = (uid) => {
  try {
    const raw = localStorage.getItem(keyOf(uid));
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Shu mavzu konspekti shu holatida allaqachon ko'rsatilganmi?
 * Aralash mashq (topicId < 0) uchun doim `true` — u yerda bitta mavzu yo'q.
 *
 * @param {string|undefined} uid
 * @param {number|null} topicId
 * @param {string|null} updatedAt  konspektning yangilanish sanasi
 */
export function isTheorySeen(uid, topicId, updatedAt) {
  if (topicId == null || topicId < 0) return true;
  const seen = readAll(uid)[String(topicId)];
  if (!seen) return false;
  return seen === (updatedAt || '1');
}

/** Mavzuni «o'qilgan» deb belgilash. */
export function markTheorySeen(uid, topicId, updatedAt) {
  if (topicId == null || topicId < 0) return;
  try {
    const all = readAll(uid);
    const stamp = updatedAt || '1';
    if (all[String(topicId)] === stamp) return;
    all[String(topicId)] = stamp;
    localStorage.setItem(keyOf(uid), JSON.stringify(all));
  } catch {
    // Kvota to'lgan yoki xotira o'chirilgan — bu kritik ma'lumot emas,
    // eng yomoni konspekt yana bir marta ochiladi.
  }
}

/** Sinov/sozlamalar uchun: belgilarni tozalash. */
export function resetTheorySeen(uid) {
  try { localStorage.removeItem(keyOf(uid)); } catch { /* ahamiyatsiz */ }
}
