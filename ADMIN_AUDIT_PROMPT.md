# Admin panel auditi uchun prompt

Pastdagi blokni to'liq nusxalab, YANGI sessiyaga bering. Prompt loyiha
faktlarini o'z ichiga oladi — agent ularni qaytadan aniqlashga vaqt sarflamaydi.

---

```
Siz Senior Frontend Engineer + Product Designer + QA Auditor rolidasiz.
Zehin platformasining ADMIN PANELINI to'liq auditdan o'tkazasiz va tuzatasiz.

MAQSAD (4 ta, hammasi bajarilishi shart):
  A) FUNKSIONAL AUDIT — xato ishlaydigan yoki umuman ishlamaydigan
     funksiyalarni topish va tuzatish
  B) KERAKLI FUNKSIYALARNI QO'SHISH — admin kundalik ishida yetishmayotgan
     narsalar (asoslangan holda, xohishga ko'ra emas)
  C) ORTIQCHASINI OLIB TASHLASH — ishlatilmaydigan, takrorlanuvchi yoki
     xavfli bo'lgan boshqaruvlarni o'chirish
  D) DIZAYN AUDITI — panel loyihaning dizayn tizimiga mos emas, shuni
     to'g'rilash

═══════════════════════════════════════════════════════════════
QAMROV — AYNAN SHU FAYLLAR
═══════════════════════════════════════════════════════════════
• src/pages/AdminPage.jsx        — 2415 qator (~130 KB), 11 ta tab, ASOSIY nishon
• src/pages/AdminPage.css        — atigi 492 qator (JSX'ga nomutanosib kichik)
• src/components/admin/PromoTab.jsx    (12 KB)
• src/components/admin/SchoolsTab.jsx  (19 KB)
• src/hooks/useAdmin.js          — rol tekshiruvi
• api/admin-publish.js           — bundle nashr qilish endpointi
• firestore.rules                — admin yozuvlari uchun server tomon qoidalari
• src/config.js                  — ADMIN_EMAILS

Tegishli, lekin O'ZGARTIRMANG (faqat o'qish uchun): AppContext, ExamPage,
TestPage, engine/*.

═══════════════════════════════════════════════════════════════
LOYIHA FAKTLARI (kodda tasdiqlangan — qaytadan aniqlamang)
═══════════════════════════════════════════════════════════════
• Frontend: React 18.3, Vite 5, react-router-dom 7, framer-motion, i18next,
  lucide-react ikonkalar. Backend: Vercel serverless (api/*.js), Node >= 20.
• Baza: Firebase Firestore + Auth + Storage + FCM.
• Admin paneli marshruti: /admin, `useAdmin()` bilan himoyalangan.
  `useAdmin` ataylab `user._firebaseUser` mavjudligini talab qiladi —
  localStorage keshidan "role: admin" yozib panelni ochish yo'li YOPILGAN
  (AUDIT 2026-08-05, 13-band). BU MANTIQNI BUZMANG.
• Haqiqiy himoya server tomonda: firestore.rules dagi `isAdmin()`.
  UI tekshiruvi faqat ko'rinish uchun.

MAVJUD 11 TA TAB (AdminPage.jsx:1250 atrofida):
  objections (E'tirozlar) · requests (So'rovlar) · questions (Savollar) ·
  users (Foydalanuvchilar) · stats (Statistika) · tariffs (Tariflar) ·
  notifications (Xabarlar) · referrals (Referral) · promos (Promo) ·
  schools (Maktablar) · errors (Xatolar)

═══════════════════════════════════════════════════════════════
QATTIQ CHEKLOVLAR — bularni bilmasangiz ishlamaydigan yechim taklif qilasiz
═══════════════════════════════════════════════════════════════
1. Vercel Hobby: MAKSIMAL 12 serverless funksiya. `api/` da AYNAN 12 fayl
   bor (`_shared.js` hisoblanmaydi). YANGI ENDPOINT QO'SHMANG — mavjudiga
   `action` parametri bilan qo'shing (naqsh: `school.js`, `notify-admin.js`).
2. `main` ga push = AVTOMATIK PRODUCTION DEPLOY. So'ramasdan push qilmang.
3. `firestore.rules` Vercel tomonidan deploy QILINMAYDI — alohida
   `firebase deploy --only firestore:rules` kerak. Tartib: KOD AVVAL,
   QOIDALAR KEYIN. Firestore emulyatori bu mashinada ISHLAMAYDI (Java yo'q) —
   har qoida o'zgarishini "SINALMAGAN" deb belgilang.
4. `vite dev` serverless funksiyalarni ishga tushirmaydi — `/api/*` lokal
   sinovdan o'tmaydi. Koddagi "dev'da API JSON qaytarmaydi" tekshiruvlari
   BUG EMAS.
5. KVOTA — loyihaning asosiy xavfi. Firestore Spark kunlik limiti 50 000
   o'qish. Admin panelida ikkita katta o'qish bor:
     · `loadAllQuestions()` — ~47 000 hujjat. ATAYLAB qo'lda tugma orqali
       qilingan (AdminPage.jsx:518 dagi izohni o'qing). AVTOMATIK
       YUKLASHGA QAYTARMANG.
     · `loadUsers()` (AdminPage.jsx:503) — BUTUN `users` kolleksiyasini
       sahifalashsiz o'qiydi. Bu hali tuzatilmagan — baholang.
   Har taklifingiz uchun "bu nechta o'qish qo'shadi?" savoliga javob bering.
6. Savol keshi tuzog'i: Firestore'dagi savollarni tahrirlagandan keyin
   `node scripts/bump-questions-version.mjs` SHART, aks holda foydalanuvchilar
   eski keshdagi savollarni ko'raveradi. Savol tahriri qiladigan har qanday
   admin oqimi shuni hisobga olishi kerak.
7. `settings/version.urls` ATAYLAB bo'sh — pullik bazani ochiq havoladan
   yuklash yopilgan. To'ldirishni TAVSIYA QILMANG.
8. Obuna muddati: `premiumExpire` — YAGONA MANBA. Admin qo'lda premium
   bergani ham muddat tugaganda tugashi kerak. Cheksiz premium yo'llarini
   qo'shmang.

═══════════════════════════════════════════════════════════════
DIZAYN TIZIMI QOIDALARI — buzilishi topilma hisoblanadi
═══════════════════════════════════════════════════════════════
• Palitra: FAQAT azure (moviy) ohang. Binafsha va gradient TAQIQ.
  Ohang — jiddiy, xotirjam; o'yin/geymifikatsiya estetikasi emas.
• Tipografiya (TIPOGRAFIYA.md): `px` TAQIQ, media query ichida `font-size`
  TAQIQ. Faqat `var(--fs-*)` tokenlari.
• Rang qiymatlari qo'lda emas, tokendan: `var(--text)`, `var(--text3)`,
  `var(--blue)`, `var(--red)`, `var(--amber)`, `var(--green)`, `var(--cta)`.
• Scroll: haqiqiy scroller — HUJJAT, `.main-content` EMAS.

O'LCHANGAN HOLAT (tasdiqlangan):
  · AdminPage.jsx da 261 ta inline `style={{...}}`
  · ular ichida 108 ta qattiq kodlangan `px` qiymati
  · AdminPage.css atigi 492 qator — ya'ni uslublarning aksariyati JSX ichida
Demak dizayn ishi asosan: inline uslublarni CSS klasslariga ko'chirish,
px → token, takrorlanuvchi bloklarni umumiy klassga yig'ish.
LEKIN: bu 261 ta o'zgarishni ko'r-ko'rona qilmang — avval takrorlanadigan
naqshlarni aniqlang (kartochka, jadval qatori, statistika kataklari,
tugmalar qatori), 8-12 ta klass yarating va shularga ko'chiring.

═══════════════════════════════════════════════════════════════
BILIB TURIB QOLDIRILGAN — qayta topilma qilib yozmang
═══════════════════════════════════════════════════════════════
`AUDIT_2026-08-05.md` va `AUDIT_2026-08-06_QAYTA.md` ni O'QING (holat
jadvallari bor). U yerda tuzatilgan bandlarni qayta hisobot qilmang.
Ataylab tuzatilmaganlar:
  · in-memory rate-limit serverless'da nusxa bo'yicha ishlaydi
  · `isAdmin()` har rules bahosida `get()` qiladi (custom claim keyingi bosqich)
  · admin paneli i18n qilinmagan — matnlar qattiq kodlangan o'zbekcha.
    BU ATAYLAB (panel faqat ichki foydalanish uchun). i18n qo'shishni
    ish sifatida BOSHLAMANG; agar zarur deb hisoblasangiz — faqat taklif
    sifatida yozing.

═══════════════════════════════════════════════════════════════
NIMAGA E'TIBOR BERISH KERAK — tekshiruv ro'yxati
═══════════════════════════════════════════════════════════════
A) SINIQ FUNKSIYALAR — har tab uchun quyidagilarni kodda kuzating:
   · Tugma bosilganda haqiqatan Firestore'ga yozadimi, yoki faqat lokal
     state'ni o'zgartiradimi? (optimistik yangilanish orqaga qaytariladimi?)
   · Xatolik bo'lganda foydalanuvchi ko'radimi (toast), yoki `console.error`
     bilan jimgina yutiladimi?
   · `onSnapshot` obunalari tab almashganda tozalanadimi? (memory leak)
   · O'chirish amallari bog'liq hujjatlarni yetim qoldiradimi?
     (masalan foydalanuvchi o'chirilganda uning referral/natijalari)
   · `confirmAction` har xavfli amalda bormi?
   · Transaksiya kerak bo'lgan joyda oddiy `updateDoc` ishlatilganmi?
     (referral to'lovi, premium berish — poyga holati)
   · Sana/vaqt: `timestamp?.toDate ? ... : new Date(...)` naqshi hamma
     joyda to'g'ri ishlaydimi (serverTimestamp hali yozilmagan holat)?
   · Katta ro'yxatlar: sahifalash yoki limit bormi? Yo'q bo'lsa — nechta
     hujjatda buziladi?

B) KERAKLI, LEKIN YO'Q FUNKSIYALAR — quyidagilarni tekshiring va
   ASOSLANGAN holda taklif qiling (real admin ishidan kelib chiqib):
   · Foydalanuvchini qidirish server tomonda emas, mijozda filtrlanadimi?
   · Bitta foydalanuvchining to'liq kartochkasi (obuna tarixi, to'lovlar,
     natijalar) bormi?
   · Premium/muddatni qo'lda uzaytirish aniq sana bilan qilinadimi?
   · To'lovlar (Click webhook) bo'yicha ko'rinish bormi? Muvaffaqiyatsiz
     to'lovlar qayerda ko'rinadi?
   · Admin harakatlari jurnali (kim, qachon, nima qildi) bormi?
     Yo'q bo'lsa — bu eng muhim yetishmovchilik bo'lishi mumkin.
   · Savol tahriridan keyin versiya bump eslatmasi bormi?
   Har taklif uchun: nima uchun kerak · qancha ish · kvotaga ta'siri.

C) ORTIQCHA — o'chirishga nomzodlar:
   · Hech qayerda ishlatilmaydigan state/handler/import
   · Bir xil ishni qiladigan ikkita tugma
   · Xavfli va kam ishlatiladigan ommaviy amallar (dublikat o'chirish,
     ommaviy JSON yuklash) — ular haqiqatan kerakmi, yoki skript sifatida
     `scripts/` da turgani xavfsizroqmi?
   O'chirishdan oldin: `grep` bilan ishlatilmasligini TASDIQLANG.

D) DIZAYN:
   · Yuqoridagi dizayn qoidalari buzilishi
   · Mobil ko'rinish: 11 ta tab telefonda qanday siqiladi?
   · Bo'sh holat (empty state), yuklanish holati, xato holati har tabda bormi?
   · Fokus ko'rinishi, klaviatura bilan yurish, modal fokus tutqichi
     (`src/hooks/useModalA11y.js` mavjud — ishlatilganmi?)
   · Jadval/ro'yxatlar uzun matnda buziladimi?

═══════════════════════════════════════════════════════════════
ISH TARTIBI — MAJBURIY, 3 BOSQICH
═══════════════════════════════════════════════════════════════
BOSQICH 1 — AUDIT (kodga TEGMANG)
  Kodni o'qing. Taxmin qilmang. Har topilma uchun `fayl:qator` havolasi
  SHART. Har topilmani belgilang:
     TASDIQLANGAN (kod) — kodda o'qib ko'rdim, mantiq shunday
     TEKSHIRISH KERAK  — runtime/env/tashqi xizmatga bog'liq
  Bajarmagan tekshiruvni bajarilgan deb ko'rsatish — eng katta xato.
  Natijani `ADMIN_AUDIT_<sana>.md` fayliga yozing:
    1. Qamrov: nimani ko'rdim, nimani KO'RMADIM
    2. Topilmalar — jiddiylik bo'yicha tartiblangan (A/B/C/D toifalari bilan)
       har biri: fayl:qator · nima buzilgan · qanday takrorlanadi · tuzatish
    3. Qo'shish tavsiya qilinadigan funksiyalar — foyda/ish/xavf bilan
    4. O'chirish tavsiya qilinadigan narsalar — tasdiqlangan grep bilan
    5. Dizayn ishlari ro'yxati — naqsh bo'yicha guruhlangan

BOSQICH 2 — MEN TASDIQLAYMAN
  Menga ustuvorlik bo'yicha reja bering. Men "boshla" deganimdan keyingina
  kodga tegasiz. Qaysi bandlarni tashlab ketishimni men hal qilaman.

BOSQICH 3 — TUZATISH
  · Bitta commit = bitta mantiqiy o'zgarish. Aralashtirmang.
  · Har tuzatishdan keyin: bu mavjud foydalanuvchini/ma'lumotni buzadimi?
  · Ma'lumot o'chiradigan yoki qoidalarni qattiqlashtiradigan
    o'zgarishlarni alohida ajratib ko'rsating.

TEKSHIRUV (har o'zgarishdan keyin uchalasi ham o'tishi SHART):
  npm test
  npx eslint src/ api/ --no-warn-ignored --quiet
  npm run build

QO'SHIMCHA QOIDALAR:
  · Ta'm/uslub masalasini (nomlash, formatlash) topilma sifatida yozmang.
  · Xavflilikni HALOL baholang: "nazariy jihatdan mumkin" bilan "bir
    bosishda buziladi" — bir xil emas.
  · AdminPage.jsx ni butunlay qayta yozishni TAKLIF QILMANG. Bosqichma-
    bosqich, tekshirib boriladigan o'zgarishlar qiling. Agar fayl bo'lishga
    arzisa — buni alohida taklif sifatida, aniq bo'linish rejasi bilan
    bering.
```

---

## Qisqa variantlar

**Faqat dizayn (funksiyaga tegmasdan):**
```
ADMIN_AUDIT_PROMPT.md ni o'qi va undagi promptni qo'lla.
QAMROV: faqat D bo'limi — dizayn. Inline uslublarni CSS klasslariga
ko'chirish, px → token, mobil ko'rinish. Funksional mantiqqa TEGMA.
```

**Faqat siniq funksiyalarni topish:**
```
ADMIN_AUDIT_PROMPT.md ni o'qi.
QAMROV: faqat A bo'limi — xato ishlaydigan funksiyalar. Har 11 ta tabni
alohida ko'rib chiq. Faqat audit, kodga tegma.
```

**Bitta tabni chuqur:**
```
ADMIN_AUDIT_PROMPT.md ni o'qi.
QAMROV: faqat `users` tabi — yuklash, qidiruv, premium berish, admin
qilish, o'chirish oqimlari. A+B+C+D hammasi, lekin faqat shu tab uchun.
```
