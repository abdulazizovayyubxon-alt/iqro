/**
 * ════════════════════════════════════════════════════════════
 *  IQRO PLATFORMA — DO'STLARNI TAKLIF QILISH TIZIMI
 *  Referral Service (Frontend + Firestore)
 * ════════════════════════════════════════════════════════════
 *
 *  QOIDALAR:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  A → B, C, D ni taklif qiladi (maksimal 3 kishi)        │
 *  │  B ro'yxatdan o'tganda  → B ga 1 OY BEPUL               │
 *  │  B birinchi to'lovini qilganda → A ga 15,000 so'm bonus  │
 *  │  A 3 ta to'lasa → 45,000 so'm (1.5 oy bepul)            │
 *  │  B bepul oydan keyin eslatma xabari yuboriladi           │
 *  └─────────────────────────────────────────────────────────┘
 *
 *  FIRESTORE TUZILMASI:
 *
 *  users/{uid}:
 *    referralCode: string         — "AYYUB8K2" (uniq kod)
 *    referredBy: string | null    — A ning uid (B ni kim taklif qildi)
 *    referralBonus: number        — A ning yig'ilgan bonus (so'mda)
 *    referralCount: number        — A taklif qilgan va TO'LAGAN kishilar soni
 *    freeMonthExpire: string|null — B ning bepul oy tugash sanasi
 *    reminderSent: boolean        — B ga eslatma yuboriladimi?
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
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs,
  increment, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Konstantalar ──
export const MAX_REFERRALS       = 3;           // A maksimal 3 kishi taklif qilishi mumkin
export const REFERRAL_BONUS      = 15000;        // Har bir to'lagan uchun A ga bonus (so'm)
export const FREE_MONTH_DAYS     = 30;           // B ga bepul muddat (kun)
export const MONTHLY_PRICE       = 30000;        // 1 oylik tarif narxi (so'm)
export const MAX_TOTAL_BONUS     = REFERRAL_BONUS * MAX_REFERRALS; // 45,000 so'm

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

// ── Foydalanuvchi referral kodini olish/yaratish ──
export async function getUserReferralCode(uid, displayName) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().referralCode) {
    return snap.data().referralCode;
  }

  // Yangi kod yaratamiz
  const code = generateReferralCode(displayName);
  await updateDoc(userRef, { referralCode: code }).catch(async () => {
    // Agar doc yo'q bo'lsa — setDoc
    await setDoc(userRef, { referralCode: code }, { merge: true });
  });
  return code;
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

// ── Kod orqali foydalanuvchini topish ──
export async function findUserByReferralCode(code) {
  if (!code) return null;
  const q = query(
    collection(db, 'users'),
    where('referralCode', '==', code.toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() };
}

// ── Yangi foydalanuvchi ro'yxatdan o'tganda referral ulash ──
// AuthContext orqali ro'yxatdan o'tgandan SO'NG chaqiriladi
export async function applyReferralAfterRegister(newUserId, newUserName) {
  const code = getPendingReferralCode();
  if (!code) return false;
  
  // Dastlabki qadamda kodni o'chirib tashlaymiz (race condition oldini olish uchun)
  clearPendingReferralCode();

  try {
    const referrer = await findUserByReferralCode(code);
    if (!referrer || referrer.uid === newUserId) {
      return false;
    }

    // Referrer ning joriy referral sonini tekshiramiz
    const referrerRef = doc(db, 'users', referrer.uid);
    const referrerSnap = await getDoc(referrerRef);
    const referrerData = referrerSnap.data() || {};
    const currentCount = referrerData.referralCount || 0;

    if (currentCount >= MAX_REFERRALS) {
      // Limit to'lgan — bonus berilmaydi, lekin B ga bepul oy yine beramiz
      // (B ni chetlab qo'ymaslik uchun)
      console.log('Referrer referral limitga yetdi, lekin B ga bepul oy beriladi');
    }

    // B ga 1 oy bepul muddat berish
    const freeExpire = new Date();
    freeExpire.setDate(freeExpire.getDate() + FREE_MONTH_DAYS);

    const newUserRef = doc(db, 'users', newUserId);
    await setDoc(newUserRef, {
      referredBy: referrer.uid,
      freeMonthExpire: freeExpire.toISOString(),
      isPremium: true,        // 1 oy davomida Premium
      premiumExpire: freeExpire.toISOString(),
      premiumPlan: 'referral_free',
      reminderSent: false,
    }, { merge: true });

    // Referrals kolleksiyasiga yozamiz
    await addDoc(collection(db, 'referrals'), {
      referrerId: referrer.uid,
      referredId: newUserId,
      referredName: newUserName,
      referrerName: referrer.displayName || '',
      status: 'pending',      // B henuz to'lamagan
      bonusPaid: false,
      bonusAmount: 0,
      createdAt: new Date().toISOString(),
      paidAt: null,
      freeExpire: freeExpire.toISOString(),
    });

    return true;
  } catch (err) {
    console.error('Referral ulashda xato:', err);
    return false;
  }
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
    const canInviteMore = total < MAX_REFERRALS;
    const remainingSlots = MAX_REFERRALS - total;

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
