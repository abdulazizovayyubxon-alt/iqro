/**
 * ════════════════════════════════════════════════════════════
 *  IQRO PLATFORMA — DO'STLARNI TAKLIF QILISH TIZIMI
 *  Referral Service (Frontend + Firestore)
 * ════════════════════════════════════════════════════════════
 *
 *  QOIDALAR:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  A → B ni taklif qiladi (maksimal 5 kishi)              │
 *  │  B ro'yxatdan o'tganda  → B ga 50% CHEGIRMA beriladi    │
 *  │  B birinchi to'lovini qilganda → A ga 15,000 so'm bonus  │
 *  │  A 5 ta to'lasa → 75,000 so'm yig'adi                   │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  FIRESTORE TUZILMASI:
 *
 *  users/{uid}:
 *    referralCode: string         — "AYYUB8K2" (uniq kod)
 *    referredBy: string | null    — A ning uid (B ni kim taklif qildi)
 *    referralBonus: number        — A ning yig'ilgan bonus (so'mda)
 *    referralCount: number        — A bonus olgan to'lovlar soni
 *    referralDiscount: number     — B uchun keyingi to'lovda chegirma foizi
 *
 *  referrals/{refId}:
 *    referrerId: string           — taklif qiluvchi (A) uid
 *    referredId: string           — taklif qilingan (B) uid
 *    referredName: string         — B ning ismi
 *    referrerName: string         — A ning ismi
 *    status: 'pending'|'paid'     — B to'ladimi?
 *    bonusPaid: boolean           — A ga bonus beriladimi?
 *    bonusAmount: number          — berilgan bonus miqdori
 *    createdAt: string
 *    paidAt: string | null
 * ════════════════════════════════════════════════════════════
 */

import {
  doc, getDoc,
  collection, query, where, getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ── Konstantalar (50/50 MODEL + FREE TRIAL) ──
export const MAX_REFERRALS       = 5;           // A maksimal 5 kishi taklif qilishi mumkin
export const REFERRAL_DISCOUNT   = 50;          // 50% chegirma — ikki tomonga
export const FREE_TRIAL_DAYS     = 7;           // Ro'yxatdan o'tgandan 7 kun bepul sinov
export const URGENCY_DAYS        = 3;           // Trial tugagandan keyin 3 kun (72 soat) chegirma
export const FREE_MONTH_DAYS     = 30;          // Referral orqali kelganlarga 30 kun bepul
export const MONTHLY_PRICE       = 30000;        // 1 oylik tarif narxi (so'm)
export const DISCOUNT_AMOUNT     = Math.round(MONTHLY_PRICE * REFERRAL_DISCOUNT / 100); // 15,000 so'm
export const REFERRAL_BONUS      = DISCOUNT_AMOUNT; // backward compat
export const MAX_TOTAL_BONUS     = REFERRAL_BONUS * MAX_REFERRALS; // 75,000 so'm

// ── Referral kod generatori ──
// Format: ismdanbirinchi4harf + tasodifiy4raqam → "AYYU8K2X"
export function generateReferralCode(displayName = '') {
  const prefix = (displayName || 'IQRO')
    .replace(/[^a-zA-ZА-Яа-яA-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return prefix + suffix;
}

// ── Serverga autentifikatsiyalangan so'rov (ID token bilan) ──
// Barcha referral yozuvlari SERVERDA bajariladi — sabab: `referralDiscount`
// mijozdan yozilsa, uni 99 ga qo'yib to'lov summasini chetlab o'tish mumkin edi
// (audit 2026-08-05, 1-band). Endi bu maydonlar firestore.rules'da bloklangan.
async function callReferralApi(action, payload = {}) {
  const current = auth.currentUser;
  if (!current) return { ok: false, error: 'not_signed_in' };
  try {
    const token = await current.getIdToken();
    const res = await fetch('/api/find-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    // Dev muhitida /api/* serverless funksiyalari ishlamaydi va HTML qaytaradi
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { ok: false, error: 'api_unavailable' };
    return await res.json();
  } catch (err) {
    console.error(`Referral API (${action}) xatosi:`, err);
    return { ok: false, error: 'network' };
  }
}

// ── Foydalanuvchi referral kodini olish/yaratish ──
// Kod SERVERDA yasaladi va yoziladi: avval mijoz o'zi yasab `referralCode`
// maydoniga yozardi — ya'ni boshqa odamning kodini o'ziga yozib, uning
// taklif oqimini o'zlashtirib olish mumkin edi.
export async function getUserReferralCode(uid, displayName) {
  // Avval mahalliy o'qish — kod allaqachon bo'lsa serverga chiqmaymiz
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists() && snap.data().referralCode) return snap.data().referralCode;
  } catch { /* o'qib bo'lmadi — server javob beradi */ }

  const res = await callReferralApi('my-code');
  if (res.ok && res.code) return res.code;

  // Server yetib bo'lmasa (dev muhiti / oflayn) — ko'rsatish uchun vaqtinchalik
  // kod. Firestore'ga YOZILMAYDI, faqat UI bo'sh qolmasligi uchun.
  return generateReferralCode(displayName);
}

import { APP_URL } from '../config';

// ── Referral havolasini yaratish ──
export function buildReferralLink(code) {
  let base = window.location.origin;
  // Agar lokal kompyuterda ishlayotgan bo'lsangiz, doim haqiqiy server domenini oladi
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    base = APP_URL;
  }
  return `${base}/?ref=${code}`;
}

// ── URL dan referral kodni olish ──
export function getReferralCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}

// ── localStorage ga vaqtincha saqlash (ro'yxatdan o'tishdan oldin) ──
const REF_KEY = 'iqro_pending_ref';
export function savePendingReferralCode(code) {
  if (code) localStorage.setItem(REF_KEY, code);
}
export function getPendingReferralCode() {
  return localStorage.getItem(REF_KEY);
}
export function clearPendingReferralCode() {
  localStorage.removeItem(REF_KEY);
}

// ── Yangi foydalanuvchi ro'yxatdan o'tganda referral ulash ──
// AuthContext orqali ro'yxatdan o'tgandan SO'NG chaqiriladi.
//
// BUTUN MANTIQ SERVERDA (api/find-referral.js → action:'link'):
// taklif qiluvchini topish, o'z-o'ziga taklifni to'sish, hisob yoshini va
// oldingi to'lovni tekshirish, taklif chegarasini hisoblash va ikkala
// yozuvni bitta TRANSACTION'da bajarish. Mijozda qolgani — kodni yuborish.
// Parametrlar (_newUserId, _newUserName) endi ISHLATILMAYDI: server uid'ni
// tokendan, ismni Firestore hujjatidan o'zi oladi. Chaqiruv joylari (AuthContext)
// o'zgarmasligi uchun imzo saqlanadi.
export async function applyReferralAfterRegister(_newUserId, _newUserName) {
  const code = getPendingReferralCode();
  if (!code) return false;

  // Kodni darhol o'chiramiz (qayta urinish tsiklini oldini olish uchun)
  clearPendingReferralCode();

  const res = await callReferralApi('link', { code: code.toUpperCase() });

  if (res.ok) {
    console.log(`✅ Referral ulandi: referrer=${res.referrerName}, chegirma=${res.discount}%`);
    return true;
  }

  // Biznes-xatolar kutilgan holat — foydalanuvchiga xato ko'rsatilmaydi,
  // ro'yxatdan o'tish jarayoni to'xtamaydi.
  console.log('Referral ulanmadi:', res.error);
  return false;
}

// ── A ning referral statistikasini olish ──
export async function getReferralStats(uid) {
  try {
    // Barcha referrallarni olamiz (A taklif qilganlar)
    const q = query(collection(db, 'referrals'), where('referrerId', '==', uid));
    const snap = await getDocs(q);

    const referrals = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const total = referrals.length;
    const paid = referrals.filter(r => r.status === 'paid').length;
    const pending = referrals.filter(r => r.status === 'pending').length;
    const totalBonus = paid * REFERRAL_BONUS;
    
    const dynamicMax = paid >= 5 ? 7 : 5;
    const canInviteMore = total < dynamicMax;
    const remainingSlots = dynamicMax - total;

    return {
      referrals,
      total,
      paid,
      pending,
      totalBonus,
      canInviteMore,
      remainingSlots,
    };
  } catch (err) {
    console.error('Referral stats olishda xato:', err);
    return {
      referrals: [],
      total: 0, paid: 0, pending: 0,
      totalBonus: 0, canInviteMore: true, remainingSlots: MAX_REFERRALS
    };
  }
}

// ── A ning yig'ilgan bonus balansini olish ──
export async function getReferralBonusBalance(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;
  return snap.data().referralBonus || 0;
}

// ── Eslatma yuborish kerakligini tekshirish ──
// B ning bepul oyi tugashiga 5 kun qolganda eslatma yuboriladi
// (Bu server-side Cloud Function orqali ishlashi yaxshiroq,
//  lekin frontend da ham tekshirib notification ko'rsatish mumkin)
export async function checkFreeMonthExpiry(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (!data.freeMonthExpire || !data.referredBy) return null;

  const expireDate = new Date(data.freeMonthExpire);
  const now = new Date();
  const daysLeft = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));

  return { daysLeft, expireDate, reminderSent: data.reminderSent || false };
}
