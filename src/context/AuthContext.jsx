import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import {
  savePendingReferralCode,
  getReferralCodeFromUrl,
  applyReferralAfterRegister,
  FREE_TRIAL_DAYS,
  URGENCY_DAYS,
  REFERRAL_DISCOUNT,
} from '../services/referral';
import { getPromoCodeFromUrl, savePendingPromoCode } from '../services/promo';
import { AnalyticsEvents } from '../services/analytics';
import { ensureShortId } from '../utils/shortId';
import { validatePassword, calculatePasswordStrength } from '../utils/passwordPolicy';

// Synchronously capture and save the referral code on script load
try {
  const initialCode = getReferralCodeFromUrl();
  if (initialCode) {
    savePendingReferralCode(initialCode);
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());
  }
} catch (e) {
  console.warn("Failed to capture referral code synchronously:", e);
}

// Hamkor havolasi (`?promo=KOD`) — kod shu yerda ilib olinadi, chunki
// foydalanuvchi ro'yxatdan o'tguncha URL yo'qoladi (login → onboarding →
// `/test`). Ilgari havola hech qayerda o'qilmagani uchun hamkor guruhiga
// faqat kodni QO'LDA yozganlar tushardi.
// Kod bu yerda QO'LLANMAYDI — sababi services/promo.js izohida.
try {
  const initialPromo = getPromoCodeFromUrl();
  if (initialPromo) {
    savePendingPromoCode(initialPromo);
    const url = new URL(window.location.href);
    url.searchParams.delete('promo');
    window.history.replaceState({}, '', url.toString());
  }
} catch (e) {
  console.warn("Failed to capture promo code synchronously:", e);
}

// ── Trial status hisoblash funksiyasi ──
function computeTrialStatus(data) {
  // Agar to'langan premium bo'lsa — 'premium'
  if (data.isPremium && data.premiumPlan === 'paid') return { status: 'premium', daysLeft: 0, urgencyMs: 0 };
  // Agar referral orqali premium bo'lsa va hali muddati tugamagan bo'lsa — 'premium'
  if (data.isPremium && data.premiumExpire) {
    const exp = new Date(data.premiumExpire);
    if (exp > new Date()) return { status: 'premium', daysLeft: Math.ceil((exp - new Date()) / 86400000), urgencyMs: 0 };
  }
  // isPremium=true, lekin muddat sanasi yo'q (admin/muddatsiz premium) — doimiy 'premium'.
  // Aks holda bunday hisob xato ravishda createdAt bo'yicha trial/urgency'ga tushib,
  // "Premium" nishoni bilan "Sinov tugadi" banneri bir vaqtda ko'rinardi.
  if (data.isPremium && !data.premiumExpire) {
    return { status: 'premium', daysLeft: 0, urgencyMs: 0 };
  }

  // Referral orqali kelgan (B) — bepul oyi tugamagan bo'lsa cheksiz (legacy holat)
  if (data.referredBy && data.freeMonthExpire) {
    const freeEnd = new Date(data.freeMonthExpire);
    if (freeEnd > new Date()) {
      return { status: 'premium', daysLeft: Math.ceil((freeEnd - new Date()) / 86400000), urgencyMs: 0 };
    }
  }

  // createdAt yo'q — eski foydalanuvchi. Unga yangidan trial bermaymiz ('expired').
  if (!data.createdAt) {
    return { status: 'expired', daysLeft: 0, urgencyMs: 0 };
  }

  // createdAt asosida hisoblash
  const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
  const now = new Date();
  const daysSinceReg = Math.floor((now - createdAt) / 86400000);

  if (daysSinceReg < FREE_TRIAL_DAYS) {
    // 1-7 kun: Free Trial
    return { status: 'trial', daysLeft: FREE_TRIAL_DAYS - daysSinceReg, urgencyMs: 0 };
  }

  if (daysSinceReg < FREE_TRIAL_DAYS + URGENCY_DAYS) {
    // 8-10 kun: Urgency — 72 soatlik countdown
    const urgencyEnd = new Date(createdAt);
    urgencyEnd.setDate(urgencyEnd.getDate() + FREE_TRIAL_DAYS + URGENCY_DAYS);
    const msLeft = urgencyEnd - now;
    return {
      status: 'urgency',
      daysLeft: 0,
      urgencyMs: Math.max(0, msLeft),
      hasReferralDiscount: !!data.referredBy,
      discountPercent: data.referredBy ? REFERRAL_DISCOUNT : 0,
    };
  }

  // 11+ kun: Normal (chegirma tugagan)
  return { status: 'expired', daysLeft: 0, urgencyMs: 0 };
}

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// ────────────────────────────────────────────────────────
// Telefon raqamidan internal email generatsiya qilish
// Bu faqat Firebase Auth uchun ichki identifikator —
// foydalanuvchi bu emailni ko'rmaydi
// ────────────────────────────────────────────────────────
const phoneToEmail = (phone) => {
  const clean = phone.replace(/\D/g, '');
  return `${clean}@iqro.uz`;
};

// ────────────────────────────────────────────────────────
// Parol validatsiyasi — entropiya asosida
// ────────────────────────────────────────────────────────

// Parol siyosati src/utils/passwordPolicy.js ga AJRATILDI — bu fayl
// `../firebase`ni import qilgani uchun sof mantiqni unit test bilan qoplash
// imkonsiz edi (audit 2026-08-05, 23-band). Mantiq o'zgarmadi, faqat ko'chdi.

// ────────────────────────────────────────────────────────
// Brute-force himoyasi — MIJOZ TOMONIDAGI to'sib turish
//
// ⚠️ AUDIT 2026-08-05, 12-BAND — bu himoyaning HAQIQIY kuchi:
// Hisoblagich localStorage'da turadi, ya'ni uni tozalash, incognito oynasi yoki
// to'g'ridan-to'g'ri Firebase Auth REST API bilan CHETLAB O'TISH mumkin.
// Bu — foydalanuvchini tasodifiy takror urinishdan qaytaruvchi UX to'sig'i,
// xavfsizlik chegarasi EMAS.
//
// HAQIQIY himoya — Firebase Auth'ning o'z tomonidagi cheklovi
// (`auth/too-many-requests`, IP va hisob bo'yicha). Shu sababli xabar matni ham
// halol: "akkaunt bloklandi" deb aytmaymiz (aytilsa, bu yolg'on bo'lardi va
// foydalanuvchini ham chalg'itardi).
//
// Server tomonida qattiq chegara kerak bo'lsa: Firebase App Check + Identity
// Platform'ning parol siyosati/bloklash funksiyalarini yoqish kerak.
// ────────────────────────────────────────────────────────
const LOGIN_ATTEMPTS_KEY = 'iqro_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 daqiqa

const getLoginAttempts = () => {
  try {
    const data = JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '{}');
    return data;
  } catch { return {}; }
};

const recordFailedAttempt = () => {
  const data = getLoginAttempts();
  const now = Date.now();
  data.attempts = (data.attempts || 0) + 1;
  data.lastAttempt = now;
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_DURATION;
  }
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(data));
  return data;
};

const resetLoginAttempts = () => {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
};

const checkLockout = () => {
  const data = getLoginAttempts();
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const remainingMs = data.lockedUntil - Date.now();
    const minutes = Math.ceil(remainingMs / 60000);
    return {
      locked: true,
      // "Akkaunt bloklangan" DEB AYTILMAYDI — hisob aslida bloklanmagan
      // (yuqoridagi izoh, 12-band). Foydalanuvchini chalg'itmaydigan matn.
      message: `Ketma-ket noto'g'ri urinishlar. ${minutes} daqiqadan so'ng qayta urinib ko'ring yoki parolni tiklang.`,
      remainingMs
    };
  }
  // Muddat o'tgan bo'lsa, tozalaymiz
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    resetLoginAttempts();
  }
  return { locked: false, attempts: data.attempts || 0 };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('iqro_cached_user');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { console.warn("Cache parse error:", e); }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('iqro_cached_user');
  });
  const [authError, setAuthError] = useState('');


  useEffect(() => {
    // Tizimda uzoq vaqt (kamida 30 kun) qolishi uchun persistence ni o'rnatamiz
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Persistence rejimini o'rnatishda xato:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let role = 'user';
      let isPremium = false;
      // isTruePremium — faqat HAQIQIY (to'langan/referral) premium. isPremium
      // trial/urgency davrida ham true bo'ladi (funksiyalarni ochish uchun),
      // lekin "Premium" nishonini ko'rsatishda shu xom holatdan foydalanamiz.
      let isTruePremium = false;
      let avatarId = null;
      let premiumExpire = null; // ISO sana yoki null (muddatsiz)
      let shortId = null;
      // Maktab a'zoligi — menyuda "Maktab" bo'limini ko'rsatish sharti
      let schoolId = null;
      // O'qituvchilik fani (profildan) — fan tanlagichda "Sizning faningiz" uchun
      let subject = null;
      // Hamkorlik promokodi (partnerCode) — hamkor ustoz portali uchun
      let partnerCode = null;

      try {
        let trialInfo = { status: 'expired', daysLeft: 0, urgencyMs: 0 };
        if (firebaseUser) {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              isPremium = data.isPremium || false;
              role = data.role || 'user';
              avatarId = data.avatarId || null;
              premiumExpire = data.premiumExpire || null;
              shortId = data.shortId || null;
              schoolId = data.schoolId || null;
              subject = data.subject || null;
              partnerCode = data.partnerCode || null;

              // ═══ Premium muddati tekshiruvi ═══
              // premiumExpire (sana) — obuna tugash vaqtining yagona manbasi.
              // Sana o'tgan bo'lsa obuna tugaydi (to'lov, promo va admin — barchasi
              // uchun bir xil). premiumExpire yo'q bo'lsa — muddatsiz, tugamaydi.
              if (isPremium && data.premiumExpire) {
                const expDate = new Date(data.premiumExpire);
                if (expDate < new Date()) {
                  isPremium = false;
                  await updateDoc(userRef, {
                    isPremium: false,
                    premiumPlan: 'expired',
                  }).catch(e => console.warn('Premium expire update xatosi:', e));
                }
              }

              // Shu nuqtada isPremium = xom (muddati tekshirilgan) Firestore qiymati —
              // trial users'da u false, faqat to'langan/referral premiumda true.
              isTruePremium = isPremium;

              // ═══ TRIAL STATUS HISOBLASH ═══
              trialInfo = computeTrialStatus({ ...data, isPremium });

              // Trial davomida premium funksiyalar ochiq
              if (trialInfo.status === 'trial' || trialInfo.status === 'urgency') {
                isPremium = true;
              }

              // Muddat tugagach referral chegirmasi bekor qilinadi — LEKIN buni
              // mijoz YOZMAYDI. `referralDiscount` to'lov summasini belgilaydi,
              // shuning uchun u firestore.rules'da mijoz uchun bloklangan
              // (audit 2026-08-05, 1-band). Server tomonida api/cron-daily.js:186
              // har kuni muddati o'tgan chegirmalarni tozalaydi.
              // Bu yerda faqat MAHALLIY ko'rinishni to'g'rilaymiz.
              if (trialInfo.status === 'expired' && data.referralDiscount > 0) {
                trialInfo.hasReferralDiscount = false;
                trialInfo.discountPercent = 0;
              }
            } else {
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
                photoURL: firebaseUser.photoURL || null,
                role: 'user',
                isPremium: false,
                createdAt: new Date(),
              }, { merge: true }).catch(e => console.warn('Yangi profil yaratishda xato:', e));

              const refApplied = await applyReferralAfterRegister(
                firebaseUser.uid,
                firebaseUser.displayName || firebaseUser.email?.split('@')[0]
              );
              if (refApplied) {
                // Referral orqali kelgan B ga "Tabriklaymiz!" ko'rsatish uchun flag
                localStorage.setItem('iqro_referral_welcome', 'true');
              }
              // Yangi foydalanuvchi — trial boshlandi
              trialInfo = { status: 'trial', daysLeft: FREE_TRIAL_DAYS, urgencyMs: 0 };
              isPremium = true;
            }

            // ── Qisqa ID (A0001…) ──
            // ID SERVERDA beriladi (api/_shared.js ensureShortIdAdmin) — mijoz
            // `meta/counters` ga tegmaydi, sababi src/utils/shortId.js izohida.
            // Bu chaqiruv faqat ID'siz qolgan hisoblar uchun; idempotent.
            // Yiqilsa hujjatga hech narsa yozilmaydi va kechasi cron-daily
            // to'ldiradi — foydalanuvchi ID'siz qolib ketmaydi.
            if (!shortId) {
              shortId = await ensureShortId(firebaseUser)
                .catch(e => { console.warn('ShortId berishda xato:', e); return null; });
            }
          } catch (firestoreErr) {
            console.warn('Firestore profil yuklashda xato:', firestoreErr.message);
          }

          const enhancedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            avatarId,
            shortId,
            schoolId,
            subject,
            isPremium,
            isTruePremium,
            premiumExpire,
            role,
            partnerCode,
            trialStatus: trialInfo.status,
            trialDaysLeft: trialInfo.daysLeft,
            urgencyMs: trialInfo.urgencyMs,
            hasReferralDiscount: trialInfo.hasReferralDiscount || false,
            discountPercent: trialInfo.discountPercent || 0,
            _firebaseUser: firebaseUser
          };

          // Cache for instant load next time
          localStorage.setItem('iqro_cached_user', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            avatarId,
            shortId,
            schoolId,
            subject,
            partnerCode,
            isPremium,
            isTruePremium,
            premiumExpire,
            role,
            trialStatus: trialInfo.status,
            trialDaysLeft: trialInfo.daysLeft,
            urgencyMs: trialInfo.urgencyMs,
            hasReferralDiscount: trialInfo.hasReferralDiscount || false,
            discountPercent: trialInfo.discountPercent || 0,
          }));

          setUser(enhancedUser);
        } else {
          localStorage.removeItem('iqro_cached_user');
          setUser(null);
        }
      } catch (err) {
        console.error('onAuthStateChanged umumiy xatosi:', err);
        localStorage.removeItem('iqro_cached_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Email / Parol bilan kirish ───
  const signInWithEmail = async (email, password) => {
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError("Email yoki parol noto'g'ri.");
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("Email manzil noto'g'ri formatda.");
      } else {
        setAuthError("Kirishda xatolik yuz berdi.");
      }
      return false;
    }
  };

  // ─── Ro'yxatdan o'tish ───
  const registerWithEmail = async (email, password, displayName) => {
    setAuthError('');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCred.user, { displayName });
      AnalyticsEvents.register('email');
      return true;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("Bu email allaqachon ro'yxatdan o'tgan.");
      } else if (err.code === 'auth/weak-password') {
        setAuthError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      } else {
        setAuthError("Ro'yxatdan o'tishda xatolik.");
      }
      return false;
    }
  };

  // ────────────────────────────────────────────────────────
  // XAVFSIZ Telefon + Parol bilan kirish
  //
  // OLDINGI (XAVFLI) usul:
  //   parol = "iqro" + telefon_raqam  ← har kim boshqaning akkauntiga kirishi mumkin edi!
  //
  // YANGI (XAVFSIZ) usul:
  //   - Foydalanuvchi o'zi parol kiritadi
  //   - Parol kamida 6 ta belgidan iborat
  //   - Telefon raqam ichki email sifatida ishlatiladi (foydalanuvchi ko'rmaydi)
  // ────────────────────────────────────────────────────────
  // Foydalanuvchi mavjudligini tekshirish (telefon raqam bo'yicha)
  // ASOSIY: /api/check-user — Firebase Admin SDK orqali (getUserByEmail).
  // Bu Email Enumeration Protection'ni chetlab o'tadi va ishonchli javob beradi.
  // ZAXIRA: API ishlamasa (mas. lokal `vite dev`da serverless yo'q), mijoz
  // tomon fetchSignInMethodsForEmail — enumeration himoyasi yoqilgan bo'lsa
  // ishonchsiz (false qaytishi mumkin), shunda yangi deb hisoblanadi va
  // ro'yxat oqimi o'zini email-already-in-use orqali tuzatadi.
  const checkUserExists = async (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');

    // DEV: lokal `vite dev`da serverless funksiyalar yo'q → /api/check-user 404 beradi
    // va zaxira usul (enumeration himoyasi bilan) doim 'yangi' deb qaytaradi. Lokal
    // sinov uchun deterministik mock: raqamda "77" bo'lsa MAVJUD (login oqimi),
    // aks holda YANGI (register oqimi). Production'da bu blok umuman ishlamaydi.
    if (import.meta.env.DEV) {
      await new Promise(r => setTimeout(r, 600));
      return cleanPhone.includes('77');
    }

    try {
      const res = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.exists;
      }
    } catch (e) {
      console.warn("check-user API ishlamadi, zaxira usulga o'tildi:", e);
    }
    // Zaxira usul
    try {
      const { fetchSignInMethodsForEmail } = await import('firebase/auth');
      const internalEmail = phoneToEmail(phone);
      const methods = await fetchSignInMethodsForEmail(auth, internalEmail);
      return methods.length > 0;
    } catch (e) {
      return false;
    }
  };

  const signInWithPhone = async (name, phone, password = '', isRegistering = false, gender = '', birthDate = '') => {
    setAuthError('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setAuthError("Faqat O'zbekiston telefon raqamlari (+998) orqali kirish mumkin.");
      return { success: false };
    }

    if (isRegistering) {
      const pwError = validatePassword(password);
      if (pwError) {
        setAuthError(pwError);
        return { success: false };
      }
    }

    const internalEmail = phoneToEmail(phone);

    try {
      if (!password && !isRegistering) {
        // PROBE MODE: Faqat foydalanuvchi bormi yo'qmi tekshiramiz. Parolsiz login qilish taqiqlanadi!
        const exists = await checkUserExists(phone);
        
        // Agar eski iqro_auto_pass_ bilan migratsiya qilingan bo'lsa,
        // foydalanuvchidan Telegram orqali kirishni so'rash kerak
        if (exists) {
          return { success: false, hasCustomPassword: true };
        } else {
          return { success: false, notRegistered: true };
        }
      }

      // Parol mavjud bo'lsa (Login holati)
      if (password && !isRegistering) {
        await signInWithEmailAndPassword(auth, internalEmail, password);
      }
      
      // Yangi foydalanuvchi bo'lsa (Ro'yxatdan o'tish)
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, internalEmail, password);
        await updateProfile(userCred.user, { displayName: name });

        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          email: internalEmail,
          phone: cleanPhone,
          displayName: name,
          gender,
          birthDate,
          role: 'user',
          isPremium: false,
          createdAt: new Date(),
        }, { merge: true });

        // Qisqa ID — hujjat yaratilgandan KEYIN (server hujjatni o'qiydi).
        // ensureShortId ichida uid bo'yicha dedupe bor, shuning uchun shu payt
        // parallel ishlayotgan onAuthStateChanged tinglovchisi bilan ikki marta
        // so'ralmaydi. Adminga bildirishnomadan oldin turadi — api/notify-admin.js
        // xabarda shu ID'ni ko'rsatadi.
        const shortId = await ensureShortId(userCred.user)
          .catch(e => { console.warn('ShortId berishda xato:', e); return null; });

        const referralApplied = await applyReferralAfterRegister(userCred.user.uid, name);
        if (referralApplied) {
          localStorage.setItem('iqro_referral_welcome', 'true');
        }

        // Adminga bildirishnoma. Xabar MATNI serverda Firestore ma'lumotidan
        // yig'iladi — mijoz matn yubormaydi (audit 2026-08-05, 20-band: avval bu
        // endpoint auth'siz edi va istalgan odam adminga ixtiyoriy matn
        // jo'natishi mumkin edi).
        userCred.user.getIdToken()
          .then(token => fetch('/api/notify-admin?action=register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }))
          .catch(e => console.warn('Admin notify xatosi:', e));

        setUser({
          uid: userCred.user.uid,
          shortId,
          email: internalEmail,
          displayName: name,
          photoURL: null,
          isPremium: true,  // Trial davomida premium funksiyalar ochiq
          isTruePremium: false,  // Yangi foydalanuvchi — hali to'lov yo'q
          trialStatus: 'trial',
          trialDaysLeft: FREE_TRIAL_DAYS,
          _firebaseUser: userCred.user
        });
        AnalyticsEvents.register('phone');
        return { success: true };
      }
      
      // Kirish muvaffaqiyatli — brute-force hisoblagichni tozalaymiz
      resetLoginAttempts();

      // Profilni yangilaymiz
      let isPremium = false;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) isPremium = userSnap.data().isPremium || false;

      // Agar ism o'zgargan bo'lsa — yangilaymiz
      if (auth.currentUser && name && auth.currentUser.displayName !== name) {
        await updateProfile(auth.currentUser, { displayName: name });
        await setDoc(userRef, { displayName: name }, { merge: true });
      }

      const currentFbUser = auth.currentUser;
      setUser({
        uid: currentFbUser.uid,
        email: currentFbUser.email,
        displayName: currentFbUser.displayName || name || phone,
        photoURL: currentFbUser.photoURL,
        isPremium,
        isTruePremium: isPremium,  // bu yerda isPremium = xom Firestore qiymati
        _firebaseUser: currentFbUser
      });
      return { success: true };
    } catch (err) {
      console.warn("signInWithPhone xatosi:", err.code, err.message);

      const isAuthWrong = 
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials' ||
        err.code === 'auth/wrong-password';

      if (isAuthWrong) {
        if (password) {
          const attemptData = recordFailedAttempt();
          const remaining = MAX_ATTEMPTS - attemptData.attempts;
          if (remaining > 0) {
            setAuthError(`Telefon raqam yoki parol noto'g'ri kiritildi. Yana ${remaining} ta urinish qoldi.`);
          } else {
            setAuthError(`Ketma-ket noto'g'ri urinishlar. 15 daqiqadan so'ng qayta urinib ko'ring yoki parolni tiklang.`);
          }
          return { success: false, wrongPassword: true };
        } else {
          const exists = await checkUserExists(phone);
          if (exists) {
            return { success: false, hasCustomPassword: true };
          } else {
            return { success: false, notRegistered: true };
          }
        }
      }

      // Tarmoq xatoligi
      if (err.code === 'auth/network-request-failed') {
        setAuthError("Internet aloqasi yo'q. Iltimos, tarmoqni tekshiring.");
        return { success: false };
      }

      // Agar email band bo'lsa (Ro'yxatdan o'tayotganda)
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("Bu telefon raqam allaqachon ro'yxatdan o'tgan. Iltimos, tizimga kiring.");
        return { success: false, hasCustomPassword: true };
      }

      // Juda ko'p urinish
      if (err.code === 'auth/too-many-requests') {
        setAuthError("Juda ko'p urinish. Iltimos, biroz kutib qaytadan urining.");
        return { success: false };
      }

      // Boshqa xatoliklar
      recordFailedAttempt();
      console.error("Kirish xatosi:", err);
      setAuthError(`Xatolik yuz berdi: ${err.message || err.toString()}`);
      return { success: false };
    }
  };



  // ─── Parolni o'zgartirish (joriy foydalanuvchi uchun) ───
  // Telegram orqali kirgan yoki tizimda bo'lgan foydalanuvchi yangi parol o'rnatadi.
  const changePassword = async (newPassword) => {
    if (!auth.currentUser) return { success: false, error: 'not_logged_in' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'weak_password' };
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        return { success: false, error: 'requires_recent_login' };
      }
      return { success: false, error: err.code || 'unknown' };
    }
  };

  // ─── Parolni tiklash (telefon raqam uchun) ───
  // Email soxta (@iqro.uz) bo'lgani uchun email orqali tiklash ishlamaydi.
  // Yechim: foydalanuvchi Telegram orqali kiradi (parolsiz), keyin Profildan
  // yangi parol o'rnatadi. Shuning uchun bu yerda yo'naltirish xabari beramiz.
  const resetPassword = async (_phone) => {
    setAuthError('');
    setAuthError(
      "Parolingizni unutdingizmi? Orqaga qayting va \"Telegram orqali kirish\" tugmasi orqali kiring — keyin Profil → Parolni o'zgartirish bo'limidan yangi parol o'rnatasiz."
    );
    return false;
  };

  // ─── Chiqish ───
  // Xavfsizlik: logout paytida barcha mahalliy ma'lumotlarni tozalash
  // Bu "Improper Session Management" zaifligini oldini oladi
  const logout = async () => {
    const currentUid = user?.uid;

    // 1. Foydalanuvchiga tegishli izolyatsiyalangan ma'lumotlarni tozalash
    if (currentUid) {
      localStorage.removeItem(`iqro_state_${currentUid}`);
      localStorage.removeItem(`sentObjectionIds_${currentUid}`);
    }

    // 2. Eski format (izolyatsiyalanmagan) kalitlarni ham tozalash
    localStorage.removeItem('iqro_state');
    localStorage.removeItem('chqbt_state');
    localStorage.removeItem('sentObjectionIds');

    // 3. Brute-force hisoblagichni tozalash
    localStorage.removeItem('iqro_login_attempts');
    localStorage.removeItem('iqro_cached_user');

    // 4. sessionStorage ni to'liq tozalash
    sessionStorage.clear();

    // 5. Firebase Auth dan chiqish
    return signOut(auth);
  };

  // Foydalanuvchi ma'lumotlarini context state va keshi bilan sinxron yangilash funksiyasi
  const updateUserData = (newData) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      localStorage.setItem('iqro_cached_user', JSON.stringify({
        uid: updated.uid,
        email: updated.email,
        displayName: updated.displayName,
        photoURL: updated.photoURL,
        avatarId: updated.avatarId,
        shortId: updated.shortId,
        schoolId: updated.schoolId ?? null,
        subject: updated.subject ?? null,
        partnerCode: updated.partnerCode ?? null,
        isPremium: updated.isPremium,
        isTruePremium: updated.isTruePremium,
        premiumExpire: updated.premiumExpire ?? null,
        role: updated.role,
        trialStatus: updated.trialStatus,
        trialDaysLeft: updated.trialDaysLeft,
        urgencyMs: updated.urgencyMs,
        hasReferralDiscount: updated.hasReferralDiscount || false,
        discountPercent: updated.discountPercent || 0,
      }));
      return updated;
    });
  };

  // ─── Obuna holatini jonli kuzatish ───
  // To'lov saytda (Click) amalga oshadi va webhook users/{uid} hujjatini
  // yangilaydi. Ilova ochiq turgan bo'lsa ham premium darhol ochilishi uchun
  // shu hujjatni tinglaymiz — aks holda foydalanuvchi ilovani butunlay yopib
  // qayta ochishi kerak bo'lardi. Boshlang'ich yuklash onAuthStateChanged'da.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return undefined;

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // premiumExpire — muddatning yagona manbasi. Sana o'tgan bo'lsa obuna
        // tugagan; Firestore yozuvini onAuthStateChanged keyingi kirishda tuzatadi.
        let rawPremium = data.isPremium || false;
        if (rawPremium && data.premiumExpire && new Date(data.premiumExpire) < new Date()) {
          rawPremium = false;
        }

        const trialInfo = computeTrialStatus({ ...data, isPremium: rawPremium });
        const isPremiumNow = rawPremium || trialInfo.status === 'trial' || trialInfo.status === 'urgency';

        updateUserData({
          isPremium: isPremiumNow,
          isTruePremium: rawPremium,
          premiumExpire: data.premiumExpire || null,
          role: data.role || 'user',
          avatarId: data.avatarId ?? null,
          schoolId: data.schoolId || null,
          subject: data.subject || null,
          partnerCode: data.partnerCode || null,
          trialStatus: trialInfo.status,
          trialDaysLeft: trialInfo.daysLeft,
          urgencyMs: trialInfo.urgencyMs,
          hasReferralDiscount: trialInfo.hasReferralDiscount || false,
          discountPercent: trialInfo.discountPercent || 0,
        });
      },
      (err) => console.warn('Obuna kuzatuvchisi xatosi:', err.message)
    );

    return () => unsub();
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{
      user, loading, authError, setAuthError,
      signInWithEmail, registerWithEmail,
      signInWithPhone,
      checkUserExists,
      resetPassword,
      changePassword,
      logout,
      calculatePasswordStrength,
      checkLockout,
      updateUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};
