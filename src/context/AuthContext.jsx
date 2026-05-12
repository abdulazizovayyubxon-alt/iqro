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
// Parol validatsiyasi
// ────────────────────────────────────────────────────────
const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  }
  if (password.length > 128) {
    return "Parol juda uzun (maksimum 128 belgi).";
  }
  return null; // Xatolik yo'q
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
      if (firebaseUser) {
        // Firestore'da foydalanuvchi profilini tekshiramiz/yaratamiz
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        let isPremium = false;
        if (!userSnap.exists()) {
          // Yangi foydalanuvchi — profil yaratamiz
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            photoURL: firebaseUser.photoURL || null,
            role: 'user', // 'user' yoki 'admin'
            isPremium: false,
            createdAt: new Date(),
          });
        } else {
          isPremium = userSnap.data().isPremium || false;
        }
        
        // Firebase user ob'ektini mutatsiya qilmasdan yangi ob'ekt yaratamiz
        // Object.assign(firebaseUser, ...) — XAVFLI, chunki asl Firebase ob'ektni buzadi
        const enhancedUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isPremium,
          // Firebase Auth metodlarini saqlash uchun asl referensni saqlaymiz
          _firebaseUser: firebaseUser
        };
        setUser(enhancedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Google Sign-In ───
  const signInWithGoogle = async () => {
    setAuthError('');
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
      if (err.code === 'auth/popup-blocked') {
        // Agar popup bloklangan bo'lsa, baribir redirect qilamiz
        await signInWithRedirect(auth, googleProvider);
      } else {
        setAuthError("Google bilan kirishda xatolik. Qayta urinib ko'ring.");
        console.error(err);
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
  const signInWithPhone = async (name, phone, password) => {
    setAuthError('');

    // Telefon raqam validatsiyasi
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setAuthError("Telefon raqami noto'g'ri");
      return false;
    }

    // Parol validatsiyasi
    const passwordError = validatePassword(password);
    if (passwordError) {
      setAuthError(passwordError);
      return false;
    }

    // Ichki email yaratish (foydalanuvchi ko'rmaydi)
    const internalEmail = phoneToEmail(phone);

    try {
      // 1. Avval mavjud akkaunt bilan kirishga urinamiz
      await signInWithEmailAndPassword(auth, internalEmail, password);
      
      // Kirish muvaffaqiyatli — profilni yangilaymiz
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
        setAuthError("Parol noto'g'ri. Qaytadan urinib ko'ring.");
        return false;
      }

      // 4. Boshqa xatoliklar
      console.error("Kirish xatosi:", err);
      setAuthError("Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
      return false;
    }
  };

  // ─── Parolni tiklash (telefon raqam uchun) ───
  // Telefon orqali kirgan foydalanuvchilar uchun
  // parolni tiklash imkoniyati (email orqali)
  const resetPassword = async (phone) => {
    setAuthError('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setAuthError("Telefon raqami noto'g'ri");
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
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ 
      user, loading, authError, setAuthError, 
      signInWithGoogle, signInWithEmail, registerWithEmail, 
      signInWithPhone, // YANGI: xavfsiz telefon+parol auth
      resetPassword,   // YANGI: parol tiklash
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
