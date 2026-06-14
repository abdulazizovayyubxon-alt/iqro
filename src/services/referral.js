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
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';

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

// ── Foydalanuvchi referral kodini olish/yaratish ──
export async function getUserReferralCode(uid, displayName) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().referralCode) {
    return snap.data().referralCode;
  }

  // Yangi kod yaratamiz — uniqligini tekshiramiz
  let code = generateReferralCode(displayName);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await findUserByReferralCode(code);
    if (!existing) break; // unikal
    code = generateReferralCode(displayName);
    attempts++;
  }

  await updateDoc(userRef, { referralCode: code }).catch(async () => {
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

// ── Kod orqali foydalanuvchini topish (XAVFSIZ API ORQALI) ──
export async function findUserByReferralCode(code) {
  if (!code) return null;
  try {
    const res = await fetch('/api/find-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase() })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error('findUserByReferralCode API xatosi:', err);
    return null;
  }
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

    // Referrer ning joriy taklif qilganlar sonini tekshiramiz
    const q = query(collection(db, 'referrals'), where('referrerId', '==', referrer.uid));
    const snap = await getDocs(q);
    const currentTotalInvites = snap.size;
    
    const paidInvites = snap.docs.filter(d => d.data().status === 'paid').length;
    const dynamicMax = paidInvites >= 5 ? 7 : 5;

    // ═══ LIMIT TEKSHIRUVI ═══
    if (currentTotalInvites >= dynamicMax) {
      console.log('Referrer taklif limitiga yetdi — yangi referral qabul qilinmaydi');
      return false; // Limitga yetgan
    }

    // ═══ 50/50 MODEL — Faqat chegirma belgilanadi ═══
    // B (yangi foydalanuvchi) ga 50% chegirma beramiz, bepul premium YO'Q
    const newUserRef = doc(db, 'users', newUserId);
    await setDoc(newUserRef, {
      referredBy: referrer.uid,
      referralDiscount: REFERRAL_DISCOUNT, // Keyingi to'lovda 50% chegirma
      isPremium: false, // Bepul oylik bekor qilingan
    }, { merge: true });

    // A (taklif qiluvchi) ga ham hozircha bonus berilmaydi. 
    // Bonus qachonki B to'lov qilsa, webhook orqali beriladi.

    // Referrals kolleksiyasiga yozamiz
    await addDoc(collection(db, 'referrals'), {
      referrerId: referrer.uid,
      referredId: newUserId,
      referredName: newUserName,
      referrerName: referrer.displayName || '',
      status: 'pending',  // B to'lov qilgunicha kutish holatida
      bonusPaid: false,
      bonusAmount: 0,
      discountPercent: REFERRAL_DISCOUNT,
      createdAt: new Date().toISOString(),
      paidAt: null,
    });

    console.log(`✅ Referral muvaffaqiyatli ulandi: referrer=${referrer.uid}, referred=${newUserId}, discount=${REFERRAL_DISCOUNT}%`);
    return true;
  } catch (err) {
    console.error('❌ Referral ulashda xato yuz berdi:', err);
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
