/**
 * partnerSets.js — hamkor ustozning YOPIQ haftalik diagnostika to'plamlari.
 *
 * ── Tuzilish ────────────────────────────────────────────────────────────
 *   partnerSets/{setId}                    → metama'lumot (nom, tartib, sana)
 *   partnerSets/{setId}/content/questions  → savollar massivi
 *
 * Ikki qavat ATAYIN: haftalar ro'yxati ochilganda barcha savollar ham
 * yuklanib ketmasin. Ro'yxat = bir necha yengil hujjat; hafta ochilganda
 * qo'shimcha 1 ta o'qish. Savollarni har biri alohida hujjat qilib saqlasak,
 * 35 savol = 35 o'qish bo'lardi (Firestore kvotasi bu loyihada asosiy xarajat).
 *
 * ── Yopiqlik ────────────────────────────────────────────────────────────
 * firestore.rules o'qishni shu promokodni TASDIQLAGAN guruh a'zolariga
 * bog'lagan. Ya'ni guruhdan tashqaridagi odam so'rov yuborsa ham savollarni
 * ololmaydi — bu ko'rinishni yashirish emas, haqiqiy chegara.
 *
 * ── Qulflash qoidalari ──────────────────────────────────────────────────
 * Har to'plamda ikki shart bo'lishi mumkin:
 *   · `order`   — oldingi tartibdagi to'plam YAKUNLANGAN bo'lishi kerak;
 *   · `opensAt` — belgilangan sana kelishi kerak (ISO, kun aniqligida).
 * Ikkalasi buzilgan bo'lsa KETMA-KETLIK xabari chiqadi: foydalanuvchi hozir
 * qila oladigan ish — oldingi haftani ishlash, sanani esa kutishdan boshqa
 * iloji yo'q.
 *
 * "Yakunlangan" = to'plam bir marta topshirilgan. Ball SHARTI YO'Q —
 * diagnostika baho emas, o'lchov; past natija olgan ustoz ham keyingisiga
 * o'tadi (aks holda eng ko'p yordam kerak bo'lgan odam to'silib qolardi).
 */
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const PARTNER_SET_ERRORS = {
  no_code: "Siz hech qaysi hamkor guruhiga qo'shilmagansiz",
  permission: "Bu to'plamni ko'rish huquqingiz yo'q",
  network: "Internet aloqasini tekshiring",
  empty: "Bu to'plamda hali savollar yo'q",
};

const HAFTA_KUNLARI = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/** "2026-08-23" → "23-avgust, yakshanba" */
export function sanaMatni(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${OYLAR[d.getMonth()]}, ${HAFTA_KUNLARI[d.getDay()]}`;
}

/**
 * Sana kelganmi? Taqqoslash KUN aniqligida — `opensAt` kuni soat 00:00 dan
 * ochiq bo'lishi kerak. To'g'ridan-to'g'ri `new Date(iso) > new Date()`
 * deyilsa, o'sha kuni ertalab hali yopiq bo'lib qolardi.
 */
function sanaKeldimi(iso) {
  if (!iso) return true;
  const ochilish = new Date(iso);
  if (Number.isNaN(ochilish.getTime())) return true;
  ochilish.setHours(0, 0, 0, 0);
  return Date.now() >= ochilish.getTime();
}

/**
 * Har bir to'plamning qulf holatini hisoblaydi.
 * @param {Array} sets — `order` bo'yicha tartiblangan to'plamlar
 * @param {object} natijalar — userStats.partnerSets: { [setId]: { correct, answered, doneAt } }
 * @returns {Array} har biriga { locked, lockReason, lockMessage, result } qo'shilgan
 */
export function qulfHolatini(sets, natijalar = {}) {
  return sets.map((s, i) => {
    const result = natijalar[s.id] || null;
    const oldingi = i > 0 ? sets[i - 1] : null;
    const oldingiIshlangan = !oldingi || !!natijalar[oldingi.id];

    // TARTIB birinchi tekshiriladi — sana ham kelmagan bo'lsa, foydalanuvchiga
    // hozir bajarsa bo'ladigan ishni aytamiz.
    if (!oldingiIshlangan) {
      return {
        ...s,
        result,
        locked: true,
        lockReason: 'sequence',
        lockMessage: `Avval «${oldingi.title}» ni ishlang — shundan keyin ochiladi`,
      };
    }
    if (!sanaKeldimi(s.opensAt)) {
      return {
        ...s,
        result,
        locked: true,
        lockReason: 'date',
        lockMessage: `${sanaMatni(s.opensAt)} kuni ochiladi`,
      };
    }
    return { ...s, result, locked: false, lockReason: null, lockMessage: null };
  });
}

/**
 * Foydalanuvchining guruhiga tegishli to'plamlar ro'yxati (savollarsiz).
 * @param {string} partnerCode
 * @param {string} category — fan (masalan 'chqbt')
 */
export async function fetchPartnerSets(partnerCode, category) {
  if (!partnerCode) return { ok: false, error: 'no_code' };
  try {
    const q = query(
      collection(db, 'partnerSets'),
      where('partnerCode', '==', partnerCode.toUpperCase()),
      where('category', '==', category),
      where('active', '==', true),
      orderBy('order', 'asc'),
    );
    const snap = await getDocs(q);
    return { ok: true, sets: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  } catch (err) {
    console.error('fetchPartnerSets:', err);
    return { ok: false, error: err?.code === 'permission-denied' ? 'permission' : 'network' };
  }
}

/** Bitta to'plamning savollari (1 ta hujjat o'qishi) */
export async function fetchSetQuestions(setId) {
  try {
    const snap = await getDoc(doc(db, 'partnerSets', setId, 'content', 'questions'));
    if (!snap.exists()) return { ok: false, error: 'empty' };
    const list = snap.data().questions;
    if (!Array.isArray(list) || list.length === 0) return { ok: false, error: 'empty' };
    return { ok: true, questions: list };
  } catch (err) {
    console.error('fetchSetQuestions:', err);
    return { ok: false, error: err?.code === 'permission-denied' ? 'permission' : 'network' };
  }
}
