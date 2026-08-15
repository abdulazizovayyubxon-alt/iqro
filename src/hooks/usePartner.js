import { useAuth } from '../context/AuthContext';
import { useAdmin } from './useAdmin';

/**
 * usePartner — Foydalanuvchida Hamkor (Partner/Ustoz) huquqi borligini tekshirish.
 *
 * ⚠️ HAMKOR AUDITI 2026-08-15 — shart SERVER bilan tenglashtirildi.
 * Avval `Boolean(user.partnerCode)` yolg'iz o'zi yetardi va `role === 'mentor'`
 * ham sanalardi. Ikkalasi ham noto'g'ri edi:
 *  · `mentor` roli hech qayerda BERILMAYDI (o'lik shart);
 *  · `api/partner.js` endi kodni ROL bilan birga tekshiradi
 *    (`role === 'partner' && partnerCode === kod`) — chunki `partnerCode`
 *    foydalanuvchining o'zi yoza oladigan maydon edi. Menyuni faqat kodga
 *    qarab ko'rsatsak, hamkor bo'lmagan odam «Hamkor paneli» ni ochib,
 *    «huquqingiz yo'q» xatosiga urilardi.
 */
export const usePartner = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  // `_firebaseUser` — haqiqiy Firebase sessiyasi belgisi (localStorage keshida
  // yo'q). useAdmin bilan bir xil qoida: keshdan tiklangan rolga ishonmaymiz.
  const authResolved = !!user?._firebaseUser;

  const isPartner = !!user && authResolved && (isAdmin || user.role === 'partner');

  const partnerCode = user?.partnerCode || null;

  return { isPartner, partnerCode, isAdmin };
};
