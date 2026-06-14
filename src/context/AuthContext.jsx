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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  savePendingReferralCode,
  getReferralCodeFromUrl,
  applyReferralAfterRegister,
  FREE_TRIAL_DAYS,
  URGENCY_DAYS,
  REFERRAL_DISCOUNT,
} from '../services/referral';

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

// Parol kuchi ballini hisoblash — haqiqiy tekshiruvlar asosida
const calculatePasswordStrength = (password, _username = '') => {
  if (!password) return { score: 0, level: 'none', label: '', checks: {} };

  const checks = {
    length: password.length >= 6,
    longer: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    digit: /\d/.test(password),
  };

  let score = 0;
  if (checks.length) score += 35;
  if (checks.longer) score += 20;
  if (checks.letter) score += 20;
  if (checks.digit) score += 25;

  // Zaif/oson topiladigan parollar ballini pasaytiramiz
  const lower = password.toLowerCase();
  const isBlacklisted = BLACKLISTED_PASSWORDS.includes(lower);
  if (isBlacklisted || hasSequentialChars(password) || hasRepeatedChars(password)) {
    score = Math.min(score, 25);
  }

  let level = 'weak';
  let label = 'Zaif parol';
  if (score >= 80) { level = 'strong'; label = 'Kuchli parol'; }
  else if (score >= 50) { level = 'medium'; label = "O'rtacha parol"; }
  else if (password.length < 6) { label = 'Kamida 6 belgi'; }

  return { score: Math.min(100, score), level, label, checks };
};

// Ro'yxatdan o'tishda parolni tekshirish — oson topiladigan parollarni rad etadi
const validatePassword = (password) => {
  if (!password) return "Parolni kiritish shart.";
  if (password.length < 6) return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  if (BLACKLISTED_PASSWORDS.includes(password.toLowerCase())) {
    return "Bu parol juda oddiy va xavfsiz emas. Boshqa parol tanlang.";
  }
  if (hasRepeatedChars(password)) {
    return "Parolda bir xil belgilar ketma-ket takrorlanmasin (masalan: 1111).";
  }
  if (hasSequentialChars(password)) {
    return "Parol oddiy ketma-ketlikdan iborat bo'lmasin (masalan: 12345, qwerty).";
  }
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


  useEffect(() => {
    // Tizimda uzoq vaqt (kamida 30 kun) qolishi uchun persistence ni o'rnatamiz
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Persistence rejimini o'rnatishda xato:", err);
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

        const referralApplied = await applyReferralAfterRegister(userCred.user.uid, name);
        if (referralApplied) {
          localStorage.setItem('iqro_referral_welcome', 'true');
        }

        // Adminga bildirishnoma yuborish
        fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'register',
            message: `Yangi foydalanuvchi ro'yxatdan o'tdi!\nIsm: ${name}\nTelefon: ${cleanPhone}\nID: ${userCred.user.uid}`
          })
        }).catch(e => console.warn('Admin notify xatosi:', e));

        setUser({
          uid: userCred.user.uid,
          email: internalEmail,
          displayName: name,
          photoURL: null,
          isPremium: true,  // Trial davomida premium funksiyalar ochiq
          trialStatus: 'trial',
          trialDaysLeft: FREE_TRIAL_DAYS,
          _firebaseUser: userCred.user
        });
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
            setAuthError(`Xavfsizlik sababli akkaunt 15 daqiqaga bloklandi. Iltimos, biroz kuting.`);
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
        isPremium: updated.isPremium,
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
