/**
 * Click to'lov integratsiyasi
 *
 * ⚠️ 2026-08-14: Click foydalanuvchidan VAQTINCHA YASHIRILGAN —
 * config.js dagi CLICK_ENABLED bayrog'iga qarang. Bu modul o'chirilmadi:
 * webhook va checkout mantiqi tirik qoladi, bayroq true bo'lishi bilan
 * hech narsa qo'shmasdan ishlaydi.
 *
 * ARXITEKTURA:
 * 1. Frontend → Click checkout URL ochadi (userId bilan)
 * 2. Foydalanuvchi to'lov qiladi
 * 3. Click → /api/payment-webhook ga POST yuboradi
 * 4. Webhook Firestore'da isPremium = true qiladi
 *
 * MUHIM: merchant_id va secret_key faqat .env da bo'lishi kerak!
 */
import { CLICK_ENABLED } from '../config';

// ── Narxlar ──
export const PREMIUM_PRICE = 30000; // 30,000 so'm
export const PREMIUM_LABEL = "Zehin — Barcha bo'limlar";

// ── Click checkout URL generatori ──
export const generateClickUrl = (userId, userPhone, planPrice = PREMIUM_PRICE, planId = 'lifetime') => {
  // Bayroq o'chiq bo'lsa — hech qanday chaqiruvchi Click'ni ocholmaydi
  // (UI gate'idan tashqari ikkinchi himoya qatlami).
  if (!CLICK_ENABLED) return null;

  const merchantId = import.meta.env.VITE_CLICK_MERCHANT_ID;
  const serviceId = import.meta.env.VITE_CLICK_SERVICE_ID;

  if (!merchantId || !serviceId) {
    console.error('Click merchant sozlamalari topilmadi (.env)');
    return null;
  }

  // Click butun sonli summa kutadi; chegirma/bonus kasr son hosil qilishi mumkin.
  const amount = Math.max(0, Math.round(Number(planPrice) || 0));
  if (amount <= 0) {
    // 0 so'm — Click qabul qilmaydi. Chaqiruvchi tomon boshqa yo'l tutishi kerak.
    console.error('Click: to\'lov summasi 0 — checkout ochilmaydi');
    return null;
  }

  // Click checkout parametrlari
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount,
    transaction_param: `${userId}__${planId}`, // Firestore user ID + planId — webhook da ishlatiladi
    return_url: `${window.location.origin}/?payment=success`,
    // Qo'shimcha ma'lumot
    merchant_user_id: userId
  });

  return `https://my.click.uz/services/pay?${params.toString()}`;
};

// ── To'lov holatini tekshirish (frontend polling) ──
// Webhook orqali isPremium yangilangandan keyin AuthContext avtomatik oladi
export const checkPaymentSuccess = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('payment') === 'success';
};
