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
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

// Parol kuchi ballini hisoblash (0-100)
const calculatePasswordStrength = (password, username = '') => {
  if (!password) return { score: 0, level: 'none', label: '' };
  
  let score = 0;
  const checks = {
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
    noSequential: false,
    noRepeated: false,
    notBlacklisted: false,
    notUsername: false
  };

  // Uzunlik — 10 dan 16 gacha
  if (password.length >= 10) { score += 20; checks.length = true; }
  else if (password.length >= 8) { score += 10; }
  else if (password.length >= 6) { score += 5; }

  // Katta harf
  if (/[A-Z]/.test(password)) { score += 15; checks.uppercase = true; }

  // Kichik harf
  if (/[a-z]/.test(password)) { score += 15; checks.lowercase = true; }

  // Raqam
  if (/\d/.test(password)) { score += 15; checks.digit = true; }

  // Maxsus belgi
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) { score += 15; checks.special = true; }

  // Ketma-ket belgilar yo'q
  if (!hasSequentialChars(password)) { score += 5; checks.noSequential = true; }
  else { score -= 10; }

  // Takrorlanuvchi belgilar yo'q
  if (!hasRepeatedChars(password)) { score += 5; checks.noRepeated = true; }
  else { score -= 10; }

  // Blacklist da emas
  if (!BLACKLISTED_PASSWORDS.includes(password.toLowerCase())) { score += 5; checks.notBlacklisted = true; }
  else { score -= 30; }

  // Foydalanuvchi nomi bilan bir xil emas
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    score -= 20;
  } else {
    score += 5; checks.notUsername = true;
  }

  score = Math.max(0, Math.min(100, score));

  let level, label;
  if (score >= 80) { level = 'strong'; label = 'Mustahkam parol'; }
  else if (score >= 50) { level = 'medium'; label = "O'rtacha parol"; }
  else if (score >= 25) { level = 'weak'; label = 'Zaif parol'; }
  else { level = 'danger'; label = 'Juda zaif'; }

  return { score, level, label, checks };
};

const validatePassword = (password, username = '') => {
  if (!password) {
    return "Parolni kiritish shart.";
  }
  if (password.length < 10) {
    return "Parol kamida 10 ta belgidan iborat bo'lishi kerak.";
  }
  if (password.length > 128) {
    return "Parol juda uzun (maksimum 128 belgi).";
  }
  if (!/[A-Z]/.test(password)) {
    return "Parolda kamida 1 ta katta harf bo'lishi kerak (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Parolda kamida 1 ta kichik harf bo'lishi kerak (a-z).";
  }
  if (!/\d/.test(password)) {
    return "Parolda kamida 1 ta raqam bo'lishi kerak (0-9).";
  }
  if (BLACKLISTED_PASSWORDS.includes(password.toLowerCase())) {
    return "Bu parol juda oddiy va xavfsiz emas. Boshqa parol tanlang.";
  }
  if (hasSequentialChars(password)) {
    return "Parolda ketma-ket belgilar (1234, abcd, qwerty) ishlatmang.";
  }
  if (hasRepeatedChars(password)) {
    return "Parolda bir xil belgilarni ko'p marta takrorlamang (aaaa).";
  }
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return "Parol foydalanuvchi nomi yoki telefon raqamini o'z ichiga olmasligi kerak.";
  }
  return null; // Xatolik yo'q
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Redirect natijasini ushlash (mobil uchun)
    getRedirectResult(auth).catch((error) => {
      console.error("Google redirect xatosi:", error);
      setAuthError("Google bilan ulanish bekor qilindi yoki xatolik yuz berdi.");
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Firestore'da foydalanuvchi profilini tekshiramiz/yaratamiz
          let isPremium = false;
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              // Yangi foydalanuvchi — profil yaratamiz
              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
                photoURL: firebaseUser.photoURL || null,
                role: 'user',
                isPremium: false,
                createdAt: new Date(),
              });
            } else {
              isPremium = userSnap.data().isPremium || false;
            }
          } catch (firestoreErr) {
            // Firestore xatosi — foydalanuvchini baribir tizimga kiritamiz
            console.warn('Firestore profil xatosi (davom etilmoqda):', firestoreErr.message);
          }

          const enhancedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isPremium,
            _firebaseUser: firebaseUser
          };
          setUser(enhancedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('onAuthStateChanged xatosi:', err);
        setUser(null);
      } finally {
        // Har qanday holatda ham loading ni o'chiramiz
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

    // Mobil yoki brauzerni tekshiramiz
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    try {
      if (isMobile) {
        // Telefonda to'g'ridan-to'g'ri yo'naltirish (popup ishlamaydi)
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Kompyuterda popup oyna
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error('Google sign-in xatosi:', err);

      // Xato kodlariga qarab aniq xabar berish
      switch (err.code) {
        case 'auth/popup-blocked':
          // Popup bloklangan — redirect ga o'tish
          try {
            await signInWithRedirect(auth, googleProvider);
          } catch (redirectErr) {
            setAuthError("Brauzer Google oynasini blokladi. Iltimos, popup-blokerini o'chiring.");
          }
          break;
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          // Foydalanuvchi o'zi yopdi — xato ko'rsatmaymiz
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
  const signInWithPhone = async (name, phone, password, isRegistering = false) => {
    setAuthError('');

    // Brute-force tekshiruvi
    const lockStatus = checkLockout();
    if (lockStatus.locked) {
      setAuthError(lockStatus.message);
      return false;
    }

    // Telefon raqam validatsiyasi (Faqat O'zbekiston kodi)
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      setAuthError("Faqat O'zbekiston telefon raqamlari (+998) orqali kirish mumkin.");
      return false;
    }

    // Parol validatsiyasi — faqat ro'yxatdan o'tishda kuchli tekshiruv
    if (isRegistering) {
      const passwordError = validatePassword(password, cleanPhone);
      if (passwordError) {
        setAuthError(passwordError);
        return false;
      }
    } else {
      // Kirishda faqat bo'sh emasligini tekshiramiz
      if (!password || password.length < 6) {
        setAuthError("Parolni kiritish shart.");
        return false;
      }
    }

    // Ichki email yaratish (foydalanuvchi ko'rmaydi)
    const internalEmail = phoneToEmail(phone);

    try {
      // 1. Avval mavjud akkaunt bilan kirishga urinamiz
      await signInWithEmailAndPassword(auth, internalEmail, password);
      
      // Kirish muvaffaqiyatli — brute-force hisoblagichni tozalaymiz
      resetLoginAttempts();

      // Profilni yangilaymiz
      let isPremium = false;
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) isPremium = userSnap.data().isPremium || false;

      // Agar ism o'zgargan bo'lsa — yangilaymiz
      if (auth.currentUser && auth.currentUser.displayName !== name) {
        await updateProfile(auth.currentUser, { displayName: name });
        await setDoc(userRef, { displayName: name }, { merge: true });
      }

      setUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: name,
        photoURL: auth.currentUser.photoURL,
        isPremium,
        _firebaseUser: auth.currentUser
      });
      return true;
    } catch (err) {
      // 2. Akkaunt topilmadi — yangi foydalanuvchi, ro'yxatdan o'tkazamiz
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, internalEmail, password);
          await updateProfile(userCred.user, { displayName: name });

          // Firestore'da profil yaratamiz
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            email: internalEmail,
            phone: cleanPhone,
            displayName: name,
            role: 'user',
            isPremium: false,
            createdAt: new Date(),
          });

          setUser({
            uid: userCred.user.uid,
            email: internalEmail,
            displayName: name,
            photoURL: null,
            isPremium: false,
            _firebaseUser: userCred.user
          });
          return true;
        } catch (regErr) {
          console.error("Ro'yxatdan o'tish xatosi:", regErr);
          if (regErr.code === 'auth/email-already-in-use') {
            setAuthError("Bu raqam allaqachon ro'yxatdan o'tgan. Parol noto'g'ri bo'lishi mumkin.");
          } else if (regErr.code === 'auth/weak-password') {
            setAuthError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
          } else {
            setAuthError("Ro'yxatdan o'tishda xatolik yuz berdi.");
          }
          return false;
        }
      }

      // 3. Parol noto'g'ri (akkaunt mavjud, lekin parol mos kelmadi)
      if (err.code === 'auth/wrong-password') {
        const attemptData = recordFailedAttempt();
        const remaining = MAX_ATTEMPTS - attemptData.attempts;
        if (remaining > 0) {
          setAuthError(`Ma'lumotlar noto'g'ri kiritildi. Yana ${remaining} ta urinish qoldi.`);
        } else {
          setAuthError(`Xavfsizlik sababli akkaunt 15 daqiqaga bloklandi. Iltimos, biroz kuting.`);
        }
        return false;
      }

      // 4. Boshqa xatoliklar
      recordFailedAttempt();
      console.error("Kirish xatosi:", err);
      setAuthError("Ma'lumotlar noto'g'ri kiritildi, iltimos qaytadan urinib ko'ring.");
      return false;
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
      resetPassword,
      logout,
      calculatePasswordStrength,
      checkLockout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
