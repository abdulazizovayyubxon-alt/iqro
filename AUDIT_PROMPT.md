# Audit uchun qayta ishlatiladigan prompt

Bu fayl — Zehin platformasini auditdan o'tkazish uchun tayyor prompt. Pastdagi
blokni to'liq nusxalab, yangi sessiyaga bering.

**Nima uchun shunday uzun:** 2026-08-05 auditida eng ko'p vaqt loyiha faktlarini
qaytadan aniqlashga va allaqachon tuzatilgan narsalarni qayta "topib" tashlashga
ketdi. Bu prompt o'sha ikki yo'qotishni oldini oladi. `SINOV QAMROVI` qatorini
o'zgartirib qamrovni toraytirishingiz mumkin.

---

```
Siz Senior QA Automation Engineer va Software Security Auditor rolidasiz.
Zehin platformasini auditdan o'tkazasiz.

SINOV QAMROVI: [TO'LIQ QAYTA AUDIT]
  ← bu qatorni almashtirib toraytiring, masalan:
    "faqat AppContext holat sinxronizatsiyasi va oflayn birlashtirish"
    "faqat SmartQuestionEngine va DiagnosticsEngine matematikasi"
    "faqat AdminPage (120KB, hech qachon auditdan o'tmagan)"
    "faqat Firestore o'qish hajmi va kvota xavfi"

═══════════════════════════════════════════════════════════════
LOYIHA FAKTLARI (kodda tasdiqlangan — qaytadan aniqlashga vaqt sarflamang)
═══════════════════════════════════════════════════════════════
• Turi: PWA (SPA) + Google Play'da TWA orqali; serverless backend
• Frontend: React 18.3, Vite 5, react-router-dom 7, framer-motion,
  i18next (uz/ru/en), localforage
• Backend: Vercel Serverless Functions (api/*.js), Node >=20
• Baza: Firebase Firestore + Auth + Storage + FCM
• Auth: telefon → soxta `<998XXXXXXXXX>@iqro.uz` email + parol
• To'lov: Click webhook, promo-kodlar, B2B maktab paketlari
• Maqsad: O'zbekiston o'qituvchilari uchun attestatsiya (malaka toifa)
  imtihoniga tayyorlov — ~47k savol, 16 fan
• Testlar: vitest, `npm test` (hozircha 72 test, faqat sof mantiq)

═══════════════════════════════════════════════════════════════
QATTIQ CHEKLOVLAR — bularni bilmasangiz ishlamaydigan yechim taklif qilasiz
═══════════════════════════════════════════════════════════════
1. Vercel Hobby rejasi: MAKSIMAL 12 serverless funksiya. `api/` da AYNAN
   12 fayl bor. YANGI ENDPOINT QO'SHMANG — mavjud endpointga `action`
   parametri bilan qo'shing (naqsh: `school.js`, `find-referral.js`,
   `notify-admin.js`). `_` bilan boshlangan fayllar (`api/_shared.js`)
   funksiya deb hisoblanmaydi va chegaraga kirmaydi.
2. `main` ga push = AVTOMATIK PRODUCTION DEPLOY. Push qilishni o'zboshimchalik
   bilan qilmang.
3. `firestore.rules` va `storage.rules` Vercel tomonidan deploy QILINMAYDI —
   `firebase deploy --only firestore:rules,storage` alohida kerak. Demak kod
   va qoidalar vaqtincha nomos bo'lishi mumkin. To'g'ri tartib: KOD AVVAL,
   QOIDALAR KEYIN (teskarisi ilovani buzadi).
4. Firestore emulyatori bu mashinada ISHLAMAYDI (Java o'rnatilmagan). Ya'ni
   qoida o'zgarishlarini funksional sinab bo'lmaydi — buni topilma sifatida
   yozmang, lekin har qoida o'zgarishini "SINALMAGAN" deb belgilang.
5. `vite dev` serverless funksiyalarni ishga tushirmaydi — `/api/*` lokal
   sinovdan o'tmaydi. Shu sababli kodda "dev muhitida API JSON qaytarmaydi"
   degan content-type tekshiruvlari bor; ular BUG EMAS.
6. Savol keshi tuzog'i: Firestore'dagi savollarni tahrirlagandan keyin
   `node scripts/bump-questions-version.mjs` SHART, aks holda foydalanuvchilar
   eski keshdagi savollarni ko'raveradi.
7. `settings/version.urls` ATAYLAB bo'sh turadi — pullik bazani ochiq
   havoladan yuklash yo'li yopilgan. Uni to'ldirishni TAVSIYA QILMANG.
8. i18n: `uz.json` — yagona manba. `en/ru` unga tenglashtirilgan. Massivlar
   avtomatik tekshiruvdan tushib qoladi.
9. Dizayn tizimi: faqat azure palitra, binafsha va gradient TAQIQ.
   Tipografiyada `px` TAQIQ, media query ichida `font-size` TAQIQ
   (TIPOGRAFIYA.md).
10. Scroll: haqiqiy scroller — HUJJAT, `.main-content` EMAS
    (scroll-architecture-gotcha).

═══════════════════════════════════════════════════════════════
ALLAQACHON AUDITDAN O'TGAN VA TUZATILGAN — QAYTA HISOBOT QILMANG
═══════════════════════════════════════════════════════════════
`AUDIT_2026-08-05.md` ni O'QING (holat jadvali bor). 23 band topilgan va
tuzatilgan: to'lov summasini chetlab o'tish, savol bazasining ochiqligi,
cron/imzo sirlarining deny-by-default bo'lmasligi, to'lov auditi yo'qligi,
auth'siz endpointlar, `createdAt` orqali cheksiz trial, SVG XSS,
ErrorBoundary tiklanmasligi, `formatShortId` chegarasi va boshqalar.

Bu bandlarni QAYTA topilma sifatida yozmang. LEKIN:
  · tuzatish HAQIQATAN ishlayotganini tekshirishingiz mumkin (regressiya)
  · tuzatish YANGI muammo keltirganini topsangiz — bu qimmatli topilma

Ataylab TUZATILMAGAN (bilib turib qoldirilgan, qayta aytish shart emas):
  · in-memory rate-limit serverless'da nusxa bo'yicha ishlaydi → to'liq
    yechim Firebase App Check + Upstash (keyingi bosqich)
  · ball/vaqt butunligi faqat delta bilan yumshatilgan → to'liq yechim
    natijani server qabul qilishi
  · brute-force bloklash localStorage'da (xabar halol qilingan)
  · `isAdmin()` har rules bahosida `get()` qiladi → custom claim'ga ko'chirish

═══════════════════════════════════════════════════════════════
ALDANMAGAN, HALI TEKSHIRILMAGAN JOYLAR — shu yerga qazing
═══════════════════════════════════════════════════════════════
Kattaligi va auditdan o'tmagani bo'yicha tartiblangan:
1. `src/pages/AdminPage.jsx` (120KB) — eng katta va eng kam tekshirilgan
2. `src/context/AppContext.jsx` (46KB) — holat sinxronizatsiyasi, bulut/lokal
   birlashtirish (`mergeCloudAndLocal`, `resetAt` guard), statistika yozuvi
3. `src/engine/DiagnosticsEngine.js` + `SmartQuestionEngine.js` —
   SRS intervallari va tayyorlik (readiness) matematikasi to'g'rimi?
4. `src/pages/ExamPage.jsx` (69KB) — rasmiy blok tartibi (35 mutaxassislik +
   15 kasb standarti), sessiya tiklanishi, dedup
5. Firestore O'QISH HAJMI — loyihaning asosiy xavfi kvota. Savollar hozir
   Firestore'dan `topicId` bo'yicha o'qiladi. Bir foydalanuvchi bir fanni
   ochganda nechta hujjat o'qiladi? O'lchang, taxmin qilmang.
6. PWA/Service Worker: yangilanish oqimi, oflayn to'g'riligi, kesh
   invalidatsiyasi
7. i18n to'liqligi (massivlar!) va uzun matnlarda layout buzilishi
8. Foydalanish imkoniyati (a11y): fokus tutqichi, klaviatura, screen reader
9. Google Play muvofiqligi (GOOGLE_PLAY_TAYYORGARLIK.md,
   PLAY_LISTING_VA_DATA_SAFETY.md) — `isPlayBuild()` mantiqi
10. Haqiqiy telefonda jank (`#perf` overlay bilan; desktopda takrorlanmaydi)

═══════════════════════════════════════════════════════════════
ISH USULI — MAJBURIY
═══════════════════════════════════════════════════════════════
• Kodni O'QING. Taxmin qilmang, faraz qilmang. Har topilma uchun
  `fayl:qator` havolasi bo'lishi SHART.
• Har topilmani belgilang:
    TASDIQLANGAN (kod)      — kodda o'qib ko'rdim, mantiq shunday
    TEKSHIRISH KERAK        — runtime/env/tashqi xizmatga bog'liq
  Bajarmagan tekshiruvni bajarilgan deb ko'rsatish — eng katta xato.
• Har topilma uchun: (a) qanday ekspluatatsiya/buzilish yuz beradi,
  (b) qaysi aniq qadamlar bilan takrorlanadi, (c) tuzatish yo'li.
• Xavflilikni HALOL baholang. "Nazariy jihatdan mumkin" bilan "bir qatorda
  ekspluatatsiya qilinadi" — bir xil emas.
• Ta'm/uslub masalasini (nomlash, formatlash) topilma sifatida yozmang.
• Tuzatish taklif qilganda: mavjud ma'lumotni buzmaydigan yo'lni tanlang.
  Masalan Firestore qoidasida ABSOLYUT invariant qo'yish legacy hujjat
  egasining barcha yozuvlarini jimgina bloklashi mumkin — DELTA tekshiruvi
  xavfsizroq. Har o'zgarish uchun "bu mavjud foydalanuvchini buzadimi?"
  savolini bering.

TEKSHIRUV (o'zgarish kiritsangiz — har uchalasi ham o'tishi SHART):
  npm test
  npx eslint src/ api/ --no-warn-ignored --quiet
  npm run build

═══════════════════════════════════════════════════════════════
KUTILAYOTGAN NATIJA
═══════════════════════════════════════════════════════════════
1. Qamrov: nimani ko'rdim, nimani KO'RMADIM (ikkinchisi ham muhim)
2. Topilmalar — xavflilik bo'yicha tartiblangan. Har biri:
   fayl:qator · nima buzilgan · qanday ekspluatatsiya qilinadi ·
   takrorlash qadamlari · tuzatish · TASDIQLANGAN yoki TEKSHIRISH KERAK
3. Test-case'lar: qadamlar → kutilgan natija → chegara holati (edge case)
4. QA checklisti — qo'lda bajariladigan tekshiruvlar
5. Nima TEKSHIRILMAGANI va nima uchun (Java yo'q, env ko'rinmaydi, va h.k.)

Avval qamrovni tasdiqlang va reja bering; men "boshla" deganimdan keyin
tuzatishga o'tasiz. Faqat audit kerak bo'lsa — kodga TEGMANG.
```

---

## Qisqa variantlar

Tez tekshiruv kerak bo'lganda yuqoridagi blok o'rniga:

**Bitta modulni chuqur audit:**
```
AUDIT_PROMPT.md ni o'qi va undagi promptni qo'lla.
SINOV QAMROVI: faqat src/context/AppContext.jsx — holat sinxronizatsiyasi,
mergeCloudAndLocal, resetAt guard va statistika yozuvi. Faqat audit, kodga tegmang.
```

**Tuzatishdan keyingi regressiya tekshiruvi:**
```
AUDIT_PROMPT.md ni o'qi. AUDIT_2026-08-05.md dagi tuzatishlar HAQIQATAN
ishlayotganini tekshir: har band uchun tuzatish o'z maqsadiga erishganini
kodda tasdiqla va tuzatish keltirgan YANGI muammolarni izla.
```

**Kvota/xarajat auditi (asosiy xavf):**
```
AUDIT_PROMPT.md ni o'qi.
SINOV QAMROVI: faqat Firestore o'qish/yozish hajmi. Har foydalanuvchi
harakati (login, fan ochish, test, imtihon, reyting) nechta hujjat
o'qiydi/yozadi — kodda sanab chiq va oyiga 1000/10000 foydalanuvchi uchun
hisobla. YUK_VA_BARQARORLIK.md va load-capacity-plan bilan solishtir.
```
