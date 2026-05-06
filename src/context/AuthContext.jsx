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
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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
        if (!userSnap.exists()) {
          // Yangi foydalanuvchi — profil yaratamiz
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            photoURL: firebaseUser.photoURL || null,
            role: 'user', // 'user' yoki 'admin'
            createdAt: new Date(),
          });
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Google Sign-In
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

  // Email / Parol bilan kirish
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

  // Ro'yxatdan o'tish
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

  // Oddiy kirish (Ism + Telefon)
  const signInWithPhoneSimple = async (name, phone) => {
    setAuthError('');
    // Telefon raqamidan faqat raqamlarni ajratib olamiz
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setAuthError("Telefon raqami noto'g'ri");
      return false;
    }
    
    // Yolg'on email va doimiy parol yasaymiz
    const fakeEmail = `${cleanPhone}@iqro.uz`;
    const fakePassword = `iqro${cleanPhone}`;

    try {
      // Avval shu raqam bilan kirishga urinamiz
      await signInWithEmailAndPassword(auth, fakeEmail, fakePassword);
      // Kirish muvaffaqiyatli bo'lsa profilni yangilab qo'yamiz (ism o'zgargan bo'lsa)
      if (auth.currentUser && auth.currentUser.displayName !== name) {
        await updateProfile(auth.currentUser, { displayName: name });
        // React state'ni majburan yangilaymiz
        setUser(Object.assign({}, auth.currentUser, { displayName: name }));
        // Firestore dagi ismni ham yangilaymiz
        await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name }, { merge: true });
      }
      return true;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        // Agar topilmasa, demak yangi foydalanuvchi — uni ro'yxatdan o'tkazamiz
        try {
          const userCred = await createUserWithEmailAndPassword(auth, fakeEmail, fakePassword);
          await updateProfile(userCred.user, { displayName: name });
          // React state'ni majburan yangilaymiz
          setUser(Object.assign({}, userCred.user, { displayName: name }));
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            email: fakeEmail,
            phone: cleanPhone,
            displayName: name,
            role: 'user',
            createdAt: new Date(),
          });
          return true;
        } catch (regErr) {
          console.error("Ro'yxatdan o'tish xatosi:", regErr);
          setAuthError("Ro'yxatdan o'tish xatosi: " + (regErr.code || regErr.message));
          return false;
        }
      } else {
        console.error("Kirish xatosi:", err);
        setAuthError("Kirish xatosi: " + (err.code || err.message));
        return false;
      }
    }
  };

  // Chiqish
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ 
      user, loading, authError, setAuthError, 
      signInWithGoogle, signInWithEmail, registerWithEmail, signInWithPhoneSimple, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
