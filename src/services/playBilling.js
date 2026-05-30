/**
 * playBilling.js
 * Google Play Billing (In-App Purchases) arxitekturasi uchun tayanch (placeholder) servis.
 * 
 * Loyiha Capacitor yoki Cordova orqali Android (APK/AAB) formatiga o'ralganda,
 * ushbu faylga RevenueCat (yoki @capacitor-community/in-app-purchases) API ulanadi.
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Google Play Console da yaratiladigan Product ID lar
export const PLAY_PRODUCTS = {
  monthly: 'iqro_premium_1_month',
  quarterly: 'iqro_premium_3_months',
  yearly: 'iqro_premium_12_months',
};

/**
 * To'lov tizimini initsializatsiya qilish.
 * App.jsx (yoki main.jsx) da dastur ishga tushganda chaqiriladi.
 */
export const initPlayBilling = async () => {
  try {
    // Agar Capacitor RevenueCat o'rnatilgan bo'lsa:
    // await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    // await Purchases.configure({ apiKey: "goog_xxxx_YOUR_REVENUECAT_API_KEY_xxxx" });
    console.log('[Play Billing] Initialized (Placeholder)');
    return true;
  } catch (error) {
    console.error('[Play Billing] Init error:', error);
    return false;
  }
};

/**
 * Google Play to'lov darchasini chaqirish
 * @param {string} planId - 'monthly', 'quarterly' yoki 'yearly'
 * @param {string} userId - To'lov qilayotgan foydalanuvchi UID'si
 * @returns {Promise<{success: boolean, message: string, transactionId?: string}>}
 */
export const purchasePlan = async (planId, userId) => {
  try {
    const productId = PLAY_PRODUCTS[planId];
    if (!productId) {
      throw new Error("Noto'g'ri tarif tanlandi");
    }

    console.log(`[Play Billing] Purchasing product: ${productId}`);

    // Dastur Capacitor orqali ishlayotgan bo'lsa:
    // const { customerInfo } = await Purchases.purchaseProduct(productId);
    // if (typeof customerInfo.entitlements.active["premium"] !== "undefined") {
    //   await verifyReceipt(userId, customerInfo);
    //   return { success: true, message: "Google Play orqali muvaffaqiyatli xarid qilindi!" };
    // }

    // Hozircha "Mock" (Simulyatsiya) funksiyasi:
    // Play Billing o'rnatilmagan muhitda xatoni qaytarish
    return {
      success: false,
      message: "Dastur hali Play Marketga ulanmagan. To'lov darchasi chaqirilmadi.",
    };

  } catch (error) {
    console.error('[Play Billing] Purchase error:', error);
    // Xatoliklarni ushlash (masalan, foydalanuvchi to'lovni bekor qildi)
    return {
      success: false,
      message: error.userCancelled ? "To'lov bekor qilindi" : "Google Play bilan ulanishda xatolik",
    };
  }
};

/**
 * Xarid kvitansiyasini (Receipt) tekshirish va Firebase'ga yozish
 * (RevenueCat yoki Custom Backend orqali amalga oshiriladi)
 */
export const verifyReceipt = async (userId, transactionData) => {
  try {
    // Xarid muvaffaqiyatli bo'lsa, transaction log ni saqlaymiz
    const transactionRef = doc(db, 'transactions', transactionData.transactionId || Date.now().toString());
    await setDoc(transactionRef, {
      userId,
      provider: 'google_play',
      productId: transactionData.productId || 'unknown',
      amount: transactionData.price || 0,
      currency: transactionData.currency || 'UZS',
      status: 'completed',
      createdAt: serverTimestamp(),
    });

    console.log('[Play Billing] Receipt verified and saved to DB');
    return true;
  } catch (error) {
    console.error('[Play Billing] Verification error:', error);
    return false;
  }
};
