# scripts/legacy — bir martalik skriptlar arxivi

Bu papkadagi fayllar **ilova kodi emas**. Ular o'tmishda bir marta ishlatilgan
migratsiya, tekshiruv va tuzatish skriptlari: savol bazasini ko'chirish,
kategoriyalarni tuzatish, javob variantlarini aralashtirish, PDF/JSON o'qish
va shunga o'xshash bir martalik ishlar.

**Nega ko'chirildi (2026-08-14 auditi):** 57 tasi loyiha ILDIZIDA yotardi.
`vite.config.js` va `eslint.config.js` kabi haqiqiy konfiguratsiya fayllari
o'sha uyumda ko'rinmay ketardi, yangi odam (yoki keyingi safargi siz) qaysi
fayl tirik, qaysi biri arxiv ekanini ajrata olmasdi.

## Ishlatishdan oldin

Bu skriptlarning aksariyati **jonli Firestore'ga yozadi** va ko'pchiligi
yozilgan paytdagi ma'lumot sxemasiga bog'langan. Ular:

- kesh versiyasini oshirmaydi — savol matnini o'zgartirsangiz, keyin
  `node scripts/bump-questions-version.mjs` kerak (va paket qurilgan bo'lsa,
  Admin panel → Savollar → «Paketlarni qayta qurish»);
- fan bo'yicha to'liq o'qish qiladi — bittasi ~2 900 Firestore o'qishi,
  kunlik bepul kvota 50 000 (qarang: `YUK_VA_BARQARORLIK.md`).

**Yangi ish uchun bu yerdan nusxa olmang** — tirik vositalar bir qavat
yuqorida: `scripts/fix-questions.mjs`, `scripts/fix-typos-dict.mjs`,
`scripts/backup-firestore.mjs`, `scripts/sync-firestore.mjs`.
