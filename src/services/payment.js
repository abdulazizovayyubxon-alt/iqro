/**
 * Click/Payme to'lov integratsiyasi
 *
 * ARXITEKTURA:
 * 1. Frontend → Click/Payme checkout URL ochadi (userId bilan)
 * 2. Foydalanuvchi to'lov qiladi
 * 3. Click/Payme → /api/payment-webhook ga POST yuboradi
 * 4. Webhook Firestore'da isPremium = true qiladi
 *
 * MUHIM: merchant_id va secret_key faqat .env da bo'lishi kerak!
 */

// ── Narxlar ──
export const PREMIUM_PRICE = 30000; // 30,000 so'm
export const PREMIUM_LABEL = "IQRO Pro — Barcha bo'limlar";

// ── Click checkout URL generatori ──
export const generateClickUrl = (userId, userPhone, planPrice = PREMIUM_PRICE, planId = 'lifetime') => {
  const merchantId = import.meta.env.VITE_CLICK_MERCHANT_ID;
  const serviceId = import.meta.env.VITE_CLICK_SERVICE_ID;

  if (!merchantId || !serviceId) {
    console.error('Click merchant sozlamalari topilmadi (.env)');
    return null;
  }

  // Click checkout parametrlari
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: planPrice,
    transaction_param: `${userId}__${planId}`, // Firestore user ID + planId — webhook da ishlatiladi
    return_url: `${window.location.origin}/?payment=success`,
    // Qo'shimcha ma'lumot
    merchant_user_id: userId
  });

  return `https://my.click.uz/services/pay?${params.toString()}`;
};

// ── Payme checkout URL generatori ──
export const generatePaymeUrl = (userId, planPrice = PREMIUM_PRICE, planId = 'lifetime') => {
  const merchantId = import.meta.env.VITE_PAYME_MERCHANT_ID;

  if (!merchantId) {
    console.error('Payme merchant sozlamalari topilmadi (.env)');
    return null;
  }

  // Payme checkout parametrlari (Base64 encoded)
  const params = {
    m: merchantId,
    'ac.user_id': `${userId}__${planId}`,
    a: planPrice * 100, // Payme tiyinda ishlaydi (1 so'm = 100 tiyin)
    c: `${window.location.origin}/?payment=success`
  };

  // Payme URL: https://checkout.paycom.uz/base64_encoded_params
  const encoded = btoa(JSON.stringify(params));
  return `https://checkout.paycom.uz/${encoded}`;
};

// ── To'lov holatini tekshirish (frontend polling) ──
// Webhook orqali isPremium yangilangandan keyin AuthContext avtomatik oladi
export const checkPaymentSuccess = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('payment') === 'success';
};
