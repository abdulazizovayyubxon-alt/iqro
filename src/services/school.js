/**
 * school.js — Maktab (B2B) mijoz tomoni.
 * Haqiqiy tekshiruv va yozuv SERVERDA (api/school.js, Admin SDK + transaction).
 */
import { auth } from '../firebase';

export const SCHOOL_ERRORS = {
  invalid_code_format: "Kod formati noto'g'ri",
  school_not_found: 'Bunday kodli maktab topilmadi',
  school_inactive: "Maktab hisobi faol emas — ma'muriyatga murojaat qiling",
  already_member: 'Siz allaqachon shu maktab a\'zosisiz',
  already_in_other_school: 'Siz boshqa maktabga biriktirilgansiz',
  seats_full: "Maktab paketidagi o'rinlar tugagan",
  forbidden: "Bu ma'lumotni ko'rish huquqingiz yo'q",
  no_active_subscription: "Maktabda faol obuna yo'q",
  invalid_request: "So'rov noto'g'ri",
  unknown_action: "Noma'lum amal",
  unauthorized: 'Qaytadan tizimga kiring',
  server_error: 'Server xatosi — birozdan keyin urinib ko\'ring',
  network: 'Internet aloqasini tekshiring',
};

async function call(action, payload = {}) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: 'unauthorized' };
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
    return await res.json();
  } catch (e) {
    console.error(`school.${action} error:`, e);
    return { ok: false, error: 'network' };
  }
}

export const joinSchool = (code, shareStats = true) => call('join', { code, shareStats });
export const fetchSchoolStats = (schoolId) => call('stats', { schoolId });
export const syncSchoolPremium = (schoolId) => call('sync', { schoolId });
