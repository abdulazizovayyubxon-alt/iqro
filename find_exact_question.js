/**
 * ⛔ BU SKRIPT O'CHIRILGAN — u production'ni buzgan.
 *
 * Ichida shu qator turardi:
 *     const snap = await getDocs(collection(db, 'questions'));
 *
 * `questions` kolleksiyasida ~47 000 hujjat bor. Ya'ni bitta ishga tushirish =
 * 47 000 Firestore o'qish = Spark bepul rejasining KUNLIK kvotasining (50 000)
 * 94 foizi.
 *
 * 2026-08-17 kuni production aynan shu sababdan `quota_exceeded` holatiga
 * tushdi: `/api/health` → 503, va reyting, statistika, bildirishnomalar
 * HAMMA foydalanuvchi uchun ~9 soat ishlamadi (Firebase kvotasi Pacific
 * yarim tunida tiklanadi = Toshkent 12:00, UTC yarim tunida EMAS). Keshi sovuq
 * foydalanuvchilar savollarni ham yuklay olmadi.
 *
 * O'RNIGA — xavfsiz vosita:
 *
 *     node scripts/find-question.mjs "qidiruv matni"
 *
 * U lokal eksport fayllaridan qidiradi va Firestore'ga UMUMAN tegmaydi.
 * Hujjat ID'si kerak bo'lsa (tahrirlash uchun) fan bo'yicha cheklangan
 * so'rov bor — u ~2 900 o'qish, 47 000 emas:
 *
 *     node scripts/find-question.mjs "matn" --firestore --category=chqbt --yes
 *
 * Batafsil: YUK_VA_BARQARORLIK.md 2.3-bo'limi va
 *           BARQARORLIK_AUDIT_2026-08-17.md 0.0-bo'limi.
 */

console.error(`
⛔ find_exact_question.js ishlatilmaydi — u kunlik Firestore kvotasining
   94 foizini bitta ishga tushirishda yeb qo'yardi (47 038 o'qish).

   O'rniga:
     node scripts/find-question.mjs "qidiruv matni"
`);
process.exit(1);
