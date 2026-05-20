import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  savePendingReferralCode,
  getReferralCodeFromUrl,
  applyReferralAfterRegister,
  FREE_TRIAL_DAYS,
  URGENCY_DAYS,
  REFERRAL_DISCOUNT,
} from '../services/referral';

// ── Trial status hisoblash funksiyasi ──
function computeTrialStatus(data) {
  // Agar to'langan premium bo'lsa — 'premium'
  if (data.isPremium && data.premiumPlan === 'paid') return { status: 'premium', daysLeft: 0, urgencyMs: 0 };
  // Agar referral orqali premium bo'lsa va hali muddati tugamagan bo'lsa — 'premium'
  if (data.isPremium && data.premiumExpire) {
    const exp = new Date(data.premiumExpire);
    if (exp > new Date()) return { status: 'premium', daysLeft: Math.ceil((exp - new Date()) / 86400000), urgencyMs: 0 };
  }

  // createdAt asosida hisoblash
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
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

// Taqiqlangan oddiy parollar ro'yxati (blacklist)
const BLACKLISTED_PASSWORDS = [
  'parol123', 'password', 'admin', 'teacher', 'student',
  'qwerty', 'abc123', '123456', '12345678', 'iloveyou',
  'password1', 'letmein', 'welcome', 'monkey', 'dragon',
  '111111', '000000', 'football', 'master', 'login',
  'iqro123', 'iqro2024', 'iqro2025', 'iqro2026', 'test123',
  'parol', 'maxfiy', 'salom123', 'uzbek123'
];

// Ketma-ket belgilarni aniqlash (12345, abcde, qwerty)
const SEQUENTIAL_PATTERNS = [
  '0123456789', '9876543210',
  'abcdefghijklmnopqrstuvwxyz', 'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'
];

const hasSequentialChars = (password, minLen = 4) => {
  const lower = password.toLowerCase();
  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      if (lower.includes(seq.substring(i, i + minLen))) return true;
    }
  }
  return false;
};

// Takrorlanuvchi belgilarni aniqlash (aaaa, 1111)
const hasRepeatedChars = (password, minRepeat = 4) => {
  for (let i = 0; i <= password.length - minRepeat; i++) {
    const char = password[i];
    let count = 1;
    for (let j = i + 1; j < password.length && password[j] === char; j++) {
      count++;
    }
    if (count >= minRepeat) return true;
  }
  return false;
};

// Parol kuchi ballini hisoblash (soddalashtirilgan)
const calculatePasswordStrength = (password, username = '') => {
  if (!password) return { score: 0, level: 'none', label: '' };
  
  const score = Math.min(100, Math.round((password.length / 6) * 100));
  const level = password.length >= 6 ? 'strong' : 'weak';
  const label = password.length >= 6 ? 'Etarli' : 'Kamida 6 belgi';

  return {
    score,
    level,
    label,
    checks: {
      length: password.length >= 6,
      uppercase: true,
      digit: true
    }
  };
};

const validatePassword = (password) => {
  if (!password) return "Parolni kiritish shart.";
  if (password.length < 6) return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  return null;
};

// ────────────────────────────────────────────────────────
// Brute-force himoyasi — Rate Limiting
// 5 marta noto'g'ri urinishdan so'ng 15 daqiqaga bloklash
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
      message: `Xavfsizlik sababli akkaunt ${minutes} daqiqaga bloklangan. Iltimos, biroz kuting.`,
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

  // ── URL da referral kod bo'lsa — localStorage ga saqlab qo'yamiz ──
  useEffect(() => {
    const code = getReferralCodeFromUrl();
    if (code) {
      savePendingReferralCode(code);
      // URL dan ?ref= parametrini tozalaymiz (chiroyli ko'rinishi uchun)
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    // Tizimda uzoq vaqt (kamida 30 kun) qolishi uchun persistence ni o'rnatamiz
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Persistence rejimini o'rnatishda xato:", err);
    });

    // Redirect natijasini ushlash (mobil yoki fallback uchun)
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        console.log("Google redirect muvaffaqiyatli yakunlandi:", result.user.email);
        const firebaseUser = result.user;
        let role = 'user';
        let isPremium = false;
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            isPremium = data.isPremium || false;
            role = data.role || 'user';
          } else {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL || null,
              role: 'user',
              isPremium: false,
              createdAt: new Date(),
            }).catch(e => console.warn('Yangi profil yaratishda xato (redirect):', e));
            
            const refApplied = await applyReferralAfterRegister(
              firebaseUser.uid,
              firebaseUser.displayName || firebaseUser.email?.split('@')[0]
            );
            if (refApplied) isPremium = true;
          }
        } catch (firestoreErr) {
          console.warn('Firestore profil yuklashda xato (redirect):', firestoreErr.message);
        }

        const enhancedUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isPremium,
          role,
          _firebaseUser: firebaseUser
        };

        localStorage.setItem('iqro_cached_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isPremium,
          role
        }));

        setUser(enhancedUser);
      }
    }).catch((error) => {
      console.error("Google redirect xatosi:", error);
      if (error?.code !== 'auth/redirect-cancelled-by-user') {
        setAuthError("Google bilan ulanish bekor qilindi yoki xatolik yuz berdi.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      let role = 'user';
      let isPremium = false;
      
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

              // ═══ Premium muddati tekshiruvi ═══
              if (isPremium && data.premiumExpire && data.premiumPlan !== 'paid') {
                const expDate = new Date(data.premiumExpire);
                if (expDate < new Date()) {
                  isPremium = false;
                  await updateDoc(userRef, {
                    isPremium: false,
                    premiumPlan: 'expired',
                  }).catch(e => console.warn('Premium expire update xatosi:', e));
                }
              }

              // ═══ TRIAL STATUS HISOBLASH ═══
              trialInfo = computeTrialStatus({ ...data, isPremium });

              // Trial davomida premium funksiyalar ochiq
              if (trialInfo.status === 'trial' || trialInfo.status === 'urgency') {
                isPremium = true;
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
              }).catch(e => console.warn('Yangi profil yaratishda xato:', e));

              const refApplied = await applyReferralAfterRegister(
                firebaseUser.uid,
                firebaseUser.displayName || firebaseUser.email?.split('@')[0]
              );
              if (refApplied) {
                isPremium = true;
                // Referral orqali kelgan B ga "Tabriklaymiz!" ko'rsatish uchun flag
                localStorage.setItem('iqro_referral_welcome', 'true');
              }
              // Yangi foydalanuvchi — trial boshlandi
              trialInfo = { status: 'trial', daysLeft: FREE_TRIAL_DAYS, urgencyMs: 0 };
              isPremium = true;
            }
          } catch (firestoreErr) {
            console.warn('Firestore profil yuklashda xato:', firestoreErr.message);
          }

          const enhancedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isPremium,
            role,
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
            isPremium,
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


  // ─── Google Sign-In ───
  const signInWithGoogle = async () => {
    setAuthError('');

    // Har doim akkaunt tanlash oynasini ko'rsatish
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Har doim birinchi navbatda popup orqali kirishga urinamiz (eng ishonchli usul, desktop va mobil brauzerlarda ishlaydi)
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in xatosi (popup):', err);

      switch (err.code) {
        case 'auth/popup-blocked':
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          // Telegram Webview, Instagram Webview yoki mobil brauzerlarda popup ochish cheklangan bo'lsa,
          // darhol cancelled yoki blocked xatosi beradi. Shuning uchun avtomatik ravishda redirect usuliga o'tamiz.
          const isMobileOrWebview = /iPhone|iPad|iPod|Android|Telegram|Instagram|WebView/i.test(navigator.userAgent);
          if (isMobileOrWebview || err.code === 'auth/popup-blocked') {
            try {
              await signInWithRedirect(auth, googleProvider);
            } catch (redirectErr) {
              console.error('Google redirect xatosi:', redirectErr);
              setAuthError("Brauzer Google oynasini blokladi yoki tizimga kirish imkonsiz.");
            }
          }
          break;
        case 'auth/network-request-failed':
          setAuthError("Internet aloqasi yo'q. Iltimos, tarmoqni tekshiring.");
          break;
        case 'auth/unauthorized-domain':
          setAuthError("Bu domen Google Auth uchun ruxsat etilmagan. Administrator bilan bog'laning.");
          break;
        case 'auth/internal-error':
          setAuthError("Ichki xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
          break;
        default:
          setAuthError("Google bilan kirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    }
  };

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
  const checkUserExists = async (phone) => {
    try {
      const { fetchSignInMethodsForEmail } = await import('firebase/auth');
      const internalEmail = phoneToEmail(phone);
      const methods = await fetchSignInMethodsForEmail(auth, internalEmail);
      return methods.length > 0;
    } catch (e) {
      // Agar xatolik bo'lsa — mavjud emas deb hisoblaymiz
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

    // Default parol: iqro_auto_pass_ + telefon
    const finalPassword = password || `iqro_auto_pass_${cleanPhone}`;
    const internalEmail = phoneToEmail(phone);

    try {
      // 1. Avval mavjud akkaunt bilan kirishga urinamiz
      await signInWithEmailAndPassword(auth, internalEmail, finalPassword);
      
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

      setUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || name || phone,
        photoURL: auth.currentUser.photoURL,
        isPremium,
        _firebaseUser: auth.currentUser
      });
      return { success: true };
    } catch (err) {
      // 2. Akkaunt topilmadi yoki hisob ma'lumotlari yaroqsiz
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        // ═══ FIREBASE EMAIL ENUMERATION PROTECTION WORKAROUND ═══
        // auth/invalid-credential — "user yo'q" yoki "parol noto'g'ri" bo'lishi mumkin.
        // Unauthenticated holatda Firestore'ga murojaat qilib bo'lmaydi,
        // shuning uchun createUser orqali tekshiramiz:
        // agar email-already-in-use kelsa → user mavjud, eski parol bor.
        if (!isRegistering) {
          try {
            // Sinov: yangi akkaunt ochishga urinamiz
            const testCred = await createUserWithEmailAndPassword(auth, internalEmail, finalPassword);
            // Muvaffaqiyatli → bu haqiqiy yangi user, akkaunt yaratildi!
            // Lekin bizga faqat tekshirish kerak edi, shu sababli o'chirib tashlaymiz
            // va LoginPage ga "notRegistered" qaytaramiz (u ism kiritish sahifasiga o'tkazadi)
            await testCred.user.delete();
            await signOut(auth);
            return { success: false, notRegistered: true };
          } catch (probeErr) {
            if (probeErr.code === 'auth/email-already-in-use') {
              // User MAVJUD — eski maxsus parol bor
              return { success: false, hasCustomPassword: true };
            }
            // Boshqa xato — yangi user deb hisoblaymiz
            return { success: false, notRegistered: true };
          }
        }

        try {
          const userCred = await createUserWithEmailAndPassword(auth, internalEmail, finalPassword);
          await updateProfile(userCred.user, { displayName: name });

          // Firestore'da profil yaratamiz
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
          });

          const referralApplied = await applyReferralAfterRegister(userCred.user.uid, name);
          const isPremiumFromReferral = referralApplied;

          setUser({
            uid: userCred.user.uid,
            email: internalEmail,
            displayName: name,
            photoURL: null,
            isPremium: isPremiumFromReferral,
            _firebaseUser: userCred.user
          });
          return { success: true };
        } catch (regErr) {
          console.error("Ro'yxatdan o'tish xatosi:", regErr);
          if (regErr.code === 'auth/email-already-in-use') {
            return { success: false, hasCustomPassword: true };
          }
          setAuthError("Ro'yxatdan o'tishda xatolik yuz berdi.");
          return { success: false };
        }
      }

      // 3. Parol noto'g'ri (akkaunt mavjud, lekin parol mos kelmadi)
      if (err.code === 'auth/wrong-password') {
        // Agar default parol bilan kirmoqchi bo'lgan bo'lsa va xato bergan bo'lsa,
        // demak bu foydalanuvchida eski maxsus parol bor
        if (!password) {
          return { success: false, hasCustomPassword: true };
        }

        const attemptData = recordFailedAttempt();
        const remaining = MAX_ATTEMPTS - attemptData.attempts;
        if (remaining > 0) {
          setAuthError(`Parol noto'g'ri kiritildi. Yana ${remaining} ta urinish qoldi.`);
        } else {
          setAuthError(`Xavfsizlik sababli akkaunt 15 daqiqaga bloklandi. Iltimos, biroz kuting.`);
        }
        return { success: false, wrongPassword: true };
      }

      // 4. Boshqa xatoliklar
      recordFailedAttempt();
      console.error("Kirish xatosi:", err);
      setAuthError("Kirishda xatolik yuz berdi, iltimos qaytadan urinib ko'ring.");
    }
  };

  // ─── Parolni tiklash (telefon raqam uchun) ───
  // Telefon orqali kirgan foydalanuvchilar uchun
  // parolni tiklash imkoniyati (email orqali)
  const resetPassword = async (phone) => {
    setAuthError('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setAuthError("Faqat O'zbekiston telefon raqamlari (+998) orqali tiklash mumkin.");
      return false;
    }

    // Iqro.uz email uchun parol tiklash ishlamaydi (bu haqiqiy email emas)
    // Shuning uchun foydalanuvchiga admin bilan bog'lanish tavsiya etiladi
    setAuthError(
      "Parolni tiklash uchun admin bilan bog'laning: @iqro_admin (Telegram)"
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

  return (
    <AuthContext.Provider value={{ 
      user, loading, authError, setAuthError, 
      signInWithGoogle, signInWithEmail, registerWithEmail, 
    signInWithPhone,
      checkUserExists,
      resetPassword,
      logout,
      calculatePasswordStrength,
      checkLockout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
