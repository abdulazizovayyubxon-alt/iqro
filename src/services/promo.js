/**
 * promo.js — Promo-kod redemption mijoz tomoni
 * Haqiqiy tekshiruv va qo'llash SERVERDA (api/redeem-promo.js, transaction).
 */
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Server xato kodlari → foydalanuvchiga tushunarli xabarlar
export const PROMO_ERRORS = {
  not_found: "Bunday promo-kod topilmadi",
  inactive: "Bu promo-kod o'chirilgan",
  expired: "Promo-kod muddati tugagan",
  limit_reached: "Promo-kod ishlatish limiti tugagan",
  already_used: "Siz bu kodni allaqachon ishlatgansiz",
  pending_discount_exists: "Sizda ishlatilmagan chegirma bor — avval undan foydalaning",
  invalid_code_format: "Kod formati noto'g'ri",
  invalid_promo: "Promo-kod sozlamasi xato — adminga murojaat qiling",
  unauthorized: "Qaytadan tizimga kiring",
  server_error: "Server xatosi — birozdan keyin urinib ko'ring",
  network: "Internet aloqasini tekshiring",
};

export async function redeemPromo(code) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch (e) {
    console.error('redeemPromo error:', e);
    return { ok: false, error: 'network' };
  }
}

/**
 * Kodni FAOLLASHTIRMASDAN tanishtirish ma'lumotini olish.
 * Hamkor havolasidagi tasdiq kartasi ustoz ismini shu orqali biladi
 * (`promoCodes` firestore.rules'da faqat adminga o'qish uchun ochiq).
 * @returns {Promise<{ok:boolean, partnerName?:string, campaign?:string,
 *   type?:string, value?:number, alreadyUsed?:boolean, usable?:boolean, error?:string}>}
 */
export async function fetchPromoInfo(code) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };

  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'info', code }),
    });
    // Dev muhitida /api/* ishlamaydi va HTML qaytaradi — JSON.parse portlamasin
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { ok: false, error: 'network' };
    return await res.json();
  } catch (e) {
    console.error('fetchPromoInfo error:', e);
    return { ok: false, error: 'network' };
  }
}

/* ══════════════════════════════════════════════════════════════
 *  HAMKOR HAVOLASI — `?promo=KOD`
 * ══════════════════════════════════════════════════════════════
 *  Do'st havolasi (`?ref=`) bilan bir xil naqsh: kod sahifa yuklanishida
 *  ilib olinadi va URL tozalanadi (AuthContext'da, modul yuklanishida).
 *
 *  MUHIM FARQ — kod AVTOMATIK qo'llanmaydi. Sabab uchta:
 *   · hamkor kodi ism, ID va test natijalarini guruh ustoziga OCHADI —
 *     bu haqda foydalanuvchi ogohlantirilishi shart (referral.promoPrivacy);
 *   · `promoCodes/{kod}/redemptions/{uid}` yozuvi QAYTARILMAYDI — guruhdan
 *     chiqish yo'li yo'q, ya'ni tasodifiy bosish umrbod natija beradi;
 *   · `percent` turidagi kod `promoDiscount` ni band qilib, keyingi kodni
 *     bloklaydi (`pending_discount_exists`).
 *  Shuning uchun kod saqlanadi, qo'llashni esa PartnerJoinCard so'raydi.
 *
 *  ── QURILMA EMAS, HISOB (2026-09-02) ──────────────────────────
 *  Ilgari kod boshidan oxirigacha `localStorage`da yashardi. Ammo
 *  `localStorage` QURILMAGA tegishli, hisobga emas — natijada:
 *   · havolani bosgan ustoz chiqib ketsa, o'sha telefonda kirgan BOSHQA
 *     odam taklifni ko'rardi va bosса, uning ismi/ID/natijalari begona
 *     ustozga ochilardi (qaytarib bo'lmaydigan yo'l bilan);
 *   · ustoz boshqa telefonidan kirsa, taklifni umuman ko'rmasdi;
 *   · kod hech qachon eskirmasdi.
 *  Endi `localStorage` faqat KURYER: login bo'lgunicha kodni ushlab turadi,
 *  keyin `users/{uid}.pendingPromo` ga topshiradi va o'zidan o'chiradi.
 *  Shu paytdan boshlab taklif odamning o'ziga tegishli.
 *
 *  Eski formatdagi (vaqtsiz) yozuvlar OLIB O'TILMAYDI — `readPendingPromo`
 *  izohiga qarang. Ya'ni o'zgarish kuchga kirganda qurilmalarda osilib
 *  qolgan kodlar jimgina yo'qoladi; bu ataylab qilingan.
 * ══════════════════════════════════════════════════════════════ */

const PENDING_PROMO_KEY = 'iqro_pending_promo';
// 2026-09-02 gacha ishlatilgan kunlik snooze kaliti. Endi snooze hisobda
// saqlanadi; kalit faqat eski qurilmalardan tozalash uchun eslab qolindi.
const LEGACY_SNOOZE_KEY = 'iqro_promo_snoozed_on';

// Server bilan bir xil format tekshiruvi (api/redeem-promo.js).
// Yaroqsiz qator saqlanmaydi — aks holda karta har kirganda so'ralib,
// serverdan doim `invalid_code_format` olardi.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

const DAY_MS = 86400000;
// Havola bosilgandan keyin foydalanuvchi shuncha kun ichida tizimga kirmasa,
// kod kuchini yo'qotadi. Bir oy oldin tasodifan bosilgan havola bugun taklif
// so'ramasligi kerak.
const COURIER_TTL_DAYS = 7;
// Hisobga bog'langan taklif shuncha kundan keyin o'zi so'nadi (foydalanuvchi
// kartaga umuman javob bermagan holat uchun yuqori chegara).
const ACCOUNT_TTL_DAYS = 30;
// «Hozir emas» bosilganda taklif shuncha kunga yashiriladi...
const SNOOZE_DAYS = 7;
// ...va shuncha marta bosilgach butunlay yopiladi. Yo'qotish yo'q: kodni
// qo'lda kiritish yo'li ochiq qoladi (ReferralPage, PremiumModal).
const MAX_SNOOZES = 2;

export function getPromoCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('promo');
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/* ── 1-bosqich: KURYER (localStorage, login bo'lgunicha) ───────── */

export function savePendingPromoCode(code) {
  if (!code || !CODE_RE.test(code)) return;
  localStorage.setItem(PENDING_PROMO_KEY, JSON.stringify({
    code,
    at: new Date().toISOString(),
  }));
}

/**
 * Kuryerdagi kodni o'qish. Muddati o'tgan yoki buzuq yozuv shu yerda
 * tozalanadi — chaqiruvchi tomonda tekshiruv takrorlanmasin.
 * @returns {{code:string, at:string}|null}
 */
export function readPendingPromo() {
  const raw = localStorage.getItem(PENDING_PROMO_KEY);
  if (!raw) return null;

  // 2026-09-02 gacha bu yerda faqat kod qatori turardi (vaqtsiz). JSON.parse
  // "MIRONSHOH" da portlaydi, "12345" da esa son qaytaradi — ikkalasi ham
  // eski format demakdir.
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* eski format */ }

  // ── Eski yozuv TASHLAB YUBORILADI ──
  // Uni hisobga bog'lash mumkin emas: yoshi noma'lum, ya'ni bugun shu
  // qurilmada kirgan odam havolani bosgan odam ekaniga hech qanday kafolat
  // yo'q. Aynan shu noaniqlik tuzatilayotgan teshikning o'zi edi, shuning
  // uchun uni migratsiya orqali olib o'tmaymiz. Yo'qotish qaytarilishi
  // mumkin: kodni qo'lda kiritish yo'li ochiq (ReferralPage, PremiumModal),
  // havolaning o'zi esa ustozning guruhida turibdi.
  if (!parsed || typeof parsed !== 'object' || !parsed.at) {
    clearPendingPromoCode();
    return null;
  }

  const { code, at } = parsed;
  if (!code || !CODE_RE.test(code)) {
    clearPendingPromoCode();
    return null;
  }
  if (Date.now() - new Date(at).getTime() > COURIER_TTL_DAYS * DAY_MS) {
    clearPendingPromoCode();
    return null;
  }
  return { code, at };
}

export function clearPendingPromoCode() {
  localStorage.removeItem(PENDING_PROMO_KEY);
  localStorage.removeItem(LEGACY_SNOOZE_KEY);
}

/* ── 2-bosqich: HISOB (users/{uid}.pendingPromo) ───────────────── */

/**
 * Kuryerdagi kodni hisobga topshirish. Foydalanuvchi hujjati MAVJUD bo'lgan
 * paytda chaqiriladi (AuthContext onSnapshot) — `updateDoc` yo'q hujjatda
 * xato beradi, `setDoc(merge)` esa firestore.rules'dagi `create` shartiga
 * (`role == 'user'`) urilardi.
 *
 * Kuryer FAQAT yozuv o'tgach tozalanadi: kvota tugagan yoki tarmoq uzilgan
 * bo'lsa kod joyida qoladi va keyingi seansda qayta urinib ko'riladi.
 */
export async function bindPendingPromoToAccount(uid) {
  if (!uid) return false;
  const pending = readPendingPromo();
  if (!pending) return false;

  await updateDoc(doc(db, 'users', uid), {
    pendingPromo: {
      code: pending.code,
      at: pending.at,
      snoozeCount: 0,
      snoozedUntil: null,
    },
  });
  clearPendingPromoCode();
  return true;
}

/**
 * ⚠️ AUDIT 2026-09-02 (3), B-1 — KURYERNI HISOB UCHUN YAKUNLASH.
 *
 * `bindPendingPromoToAccount` kuryerni faqat YOZUV o'tgach tozalaydi (kvota
 * yoki tarmoq nosozligida qayta urinish uchun). Lekin hisobda ALLAQACHON
 * taklif bo'lsa topshirish umuman bajarilmasdi — va kuryer `localStorage` da
 * 7 kun qolib ketardi. Keyin o'sha qurilmada `pendingPromo` si BO'LMAGAN
 * boshqa hisob kirsa, taklif UNGA tegardi: aynan 97fe582 yopmoqchi bo'lgan
 * teshik, faqat boshqa yo'ldan.
 *
 * Kuryerning vazifasi — «login bo'lgunicha ushlab turish». Kirgan hisob uni
 * ko'rib chiqqach vazifa tugaydi, shuning uchun bu holatda TOZALANADI.
 *
 * @param {string} uid
 * @param {boolean} accountHasPromo  hisobda allaqachon `pendingPromo` bormi
 * @returns {Promise<boolean>} kod hisobga BOG'LANDIMI
 */
export async function settlePendingPromoForAccount(uid, accountHasPromo) {
  if (!uid) return false;
  if (accountHasPromo) {
    // Topshirmaymiz — lekin qurilmada ham qoldirmaymiz.
    clearPendingPromoCode();
    return false;
  }
  return bindPendingPromoToAccount(uid);
}

/**
 * Hisobdagi taklif hozir ko'rsatilishi kerakmi?
 * (Kod egasi/admin tekshiruvi bu yerda emas — u foydalanuvchi profiliga
 * tegishli va PartnerJoinCard'da qilinadi.)
 */
export function isAccountPromoActive(pendingPromo) {
  if (!pendingPromo?.code || !CODE_RE.test(pendingPromo.code)) return false;
  // Vaqtsiz yozuv ko'rsatilmaydi: `at` yo'q bo'lsa quyidagi muddat tekshiruvi
  // ham ishlamas, taklif esa abadiy yashab qolardi.
  if (!pendingPromo.at) return false;
  if (pendingPromo.snoozedUntil && new Date(pendingPromo.snoozedUntil) > new Date()) return false;
  if (Date.now() - new Date(pendingPromo.at).getTime() > ACCOUNT_TTL_DAYS * DAY_MS) return false;
  return true;
}

/** «Hozir emas» — MAX_SNOOZES ga yetganda taklif butunlay yopiladi. */
export async function snoozeAccountPromo(uid, pendingPromo) {
  if (!uid) return;
  const count = (pendingPromo?.snoozeCount || 0) + 1;
  if (count >= MAX_SNOOZES) return clearAccountPromo(uid);

  await updateDoc(doc(db, 'users', uid), {
    pendingPromo: {
      code: pendingPromo.code,
      // `at` AYNAN saqlanadi — u taklifning tug'ilgan sanasi. Yangilansa,
      // har «Hozir emas» 30 kunlik muddatni ham qayta boshlardi.
      at: pendingPromo.at,
      snoozeCount: count,
      snoozedUntil: new Date(Date.now() + SNOOZE_DAYS * DAY_MS).toISOString(),
    },
  });
}

/** Taklif yakunlandi (qo'shildi, kod yaroqsiz yoki oxirgi marta rad etildi). */
export async function clearAccountPromo(uid) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), { pendingPromo: null });
}
