import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAILS } from '../config';

/**
 * Admin huquqi — FAQAT UI ko'rinishi uchun.
 *
 * ⚠️ AUDIT 2026-08-05, 13-BAND:
 * `user` obyekti dastlab `localStorage.iqro_cached_user`dan tiklanadi
 * (AuthContext.jsx:254 — bu ataylab, tez ochilish uchun). Ya'ni foydalanuvchi
 * keshni qo'lda tahrirlab `role: "admin"` yozsa, bu hook `true` qaytarardi va
 * admin paneli UI'si to'liq ochilardi.
 *
 * Ma'lumot uchun XAVF YO'Q edi — barcha yozuvlar firestore.rules'da server
 * tomonida tekshiriladi (`get(users/$(uid)).data.role`) va rad etiladi. Lekin
 * panel tuzilishi va bo'limlari oshkor bo'lardi, harakatlar esa chalkash
 * xatolar bilan yiqilardi.
 *
 * ENDI: rol FAQAT Firebase auth hal qilingandan keyin (`authResolved`) hisobga
 * olinadi — ya'ni keshdan kelgan qiymatga emas, Firestore hujjatiga tayanadi.
 * Email bo'yicha tekshiruv ham `_firebaseUser` mavjudligini talab qiladi:
 * u faqat haqiqiy Firebase sessiyasida bo'ladi va keshga yozilmaydi (JSON'da
 * serializatsiya qilinmaydi).
 */
export const useAdmin = () => {
  const { user } = useAuth();

  // `_firebaseUser` — haqiqiy Firebase sessiyasining belgisi. localStorage
  // keshida bu maydon YO'Q (JSON.stringify uni tashlab ketadi), demak keshdan
  // tiklangan "admin" bu tekshiruvdan o'tolmaydi.
  const authResolved = !!user?._firebaseUser;

  const isAdmin = !!user && authResolved && (
    ADMIN_EMAILS.includes(user.email) || user.role === 'admin'
  );

  return { isAdmin };
};
