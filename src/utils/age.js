/**
 * age — yosh HAR DOIM tug'ilgan sanadan hisoblanadi.
 *
 * Ilgari profilda «Yosh» alohida maydon edi: foydalanuvchi ikkita bir xil
 * ma'lumotni qo'lda kiritardi, ular bir-biriga zid bo'lishi mumkin edi va
 * yozilgan yosh keyingi yili eskirib qolardi. Endi yagona manba — birthDate.
 */

/** @returns {number|null} to'la yillar; sana yo'q/noto'g'ri bo'lsa null */
export const ageFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  // Tug'ilgan kun shu yil hali kelmagan bo'lsa — bir yil kam
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) years -= 1;
  return years >= 0 && years <= 120 ? years : null;
};
