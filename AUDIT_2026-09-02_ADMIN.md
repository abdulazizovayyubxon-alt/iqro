# Audit 2026-09-02 (2) — AdminPage va firestore.rules juftligi

**Qamrov:** `src/pages/AdminPage.jsx` (6380 qator) + uning `firestore.rules`
bilan mosligi. Diqqat markazi — 2026-08-19 dan keyingi 11 ta o'zgarish.
**Asos:** [AUDIT_PROMPT.md](AUDIT_PROMPT.md), «hali tekshirilmagan joylar», 1-band.

## Tuzatish holati

| Band | Xavflilik | Holat |
|---|---|---|
| A-1 e'lon o'chirilmasligi | o'rta | ✅ **tuzatildi + 13 test** |
| A-2 emaillar besh joyda | past | ⬜ ochiq |
| A-3 adminLog sinxron throw | past | ⬜ ochiq |
| A-4 bo'sh so'rov takrori | past | ⬜ ochiq |

Tekshiruv: `npm test` **450 o'tdi** (437 dan +13), `eslint` toza,
`npm run build` muvaffaqiyatli.

---

## 1. Qamrov

**Ko'rildi:** AdminPage'dagi barcha yozuv amallari (37 ta), barcha o'qish va
tinglovchilar (21 ta), `firestore.rules` ning 27 ta `match` bloki,
`src/hooks/useAdmin.js`, `src/services/adminLog.js`,
`src/hooks/useNotifications.js`, `src/utils/announcements.js`,
`src/services/contentGaps.js`, `src/config.js`, `api/` dagi admin tekshiruvlari.

**Ko'rilMADI:** deploy qilingan qoidalarning haqiqiy holati (5-bo'lim),
savol tahriri va import oqimi, `PromoTab`/`SchoolsTab`/`PartnerSetsTab`
ichki mantig'i.

---

## 2. Topilmalar

### A-1 · O'RTA · Admin e'lonni o'chirsa, u foydalanuvchilarda QOLIB KETADI

**Qayerda:** [src/hooks/useNotifications.js:171-188](src/hooks/useNotifications.js#L171), [src/pages/AdminPage.jsx:1038-1044](src/pages/AdminPage.jsx#L1038)
**Holat:** TASDIQLANGAN (kod)

Admin panelida e'lonni o'chirish `deleteDoc(doc(db, 'notifications', notifId))`
qiladi va surat (`settings/announcements`) darhol qayta yoziladi — u yerda
hammasi to'g'ri, `merge` ataylab yo'q.

Muammo MIJOZ tomonda. `absorb()` faqat QO'SHADI va YANGILAYDI:

```js
setNotifications(prev => {
  const localMap = new Map(prev.map(item => [item.id, item]));
  fresh.forEach(fn => { localMap.set(fn.id, ...); });   // ← faqat qo'shish
  const merged = Array.from(localMap.values())
    .filter(n => !deleted.has(n.id))                    // ← faqat FOYDALANUVCHI o'chirgani
    ...
  persist(merged);
});
```

`prev` — `localStorage.IQRO_NOTIFICATIONS` dagi doimiy ro'yxat (`KEEP_LOCAL = 60`).
Suratdan YO'QOLGAN element hech qayerda olib tashlanmaydi. `deleted` to'plami
esa boshqa narsa — u foydalanuvchining O'ZI yopgan bildirishnomalar
(`IQRO_NOTIFICATIONS_DELETED`), adminning o'chirgani emas.

**Oqibati:** admin noto'g'ri e'lon yuborsa (narx, imtihon sanasi, muddat) va
uni o'chirsa, panel «🗑️ Bildirishnoma o'chirildi» deydi — lekin e'lonni
ALLAQACHON olgan har bir foydalanuvchida u qoladi. Cheksiz: faqat 60 talik
oynadan tushib ketganda yoki brauzer xotirasi tozalanganda yo'qoladi.

Tasdiq matni ham adminni chalg'itadi: «Bu bildirishnomani **bazadan**
o'chirishni tasdiqlaysizmi?» — texnik jihatdan to'g'ri, lekin admin buni
«qaytarib oldim» deb o'qiydi.

**Takrorlash:**
1. Admin panelidan umumiy e'lon yuboring.
2. Boshqa hisobda ilovani oching, qo'ng'iroqda e'lonni ko'ring.
3. Adminda o'sha e'lonni o'chiring.
4. Foydalanuvchi ilovasini qayta yuklang — e'lon HAMON turadi.

### ✅ TUZATILDI

Solishtirish sof funksiyaga chiqarildi:
[`reconcileAnnouncements`](src/utils/announcements.js) +
[13 test](src/__tests__/announcementReconcile.test.js).

⚠️ **TUZATISH PAYTIDA TOPILGAN TUZOQ — hisobotdagi dastlabki tavsiya XATO edi.**

Men avval «faqat `isBroadcast` elementlarni o'chiring» deb yozgandim. Kodni
tekshirganda ma'lum bo'ldiki, bu HALOKATLI bo'lardi: shaxsiy bildirishnomalar
`targetUser` va `userId` maydonlarisiz yoziladi —
[AppContext.jsx:1374](src/context/AppContext.jsx#L1374) (yutuq),
[:1392](src/context/AppContext.jsx#L1392) (marra),
[:1410](src/context/AppContext.jsx#L1410) (unvon) va
[FixQuestionModal.jsx:135](src/components/admin/FixQuestionModal.jsx#L135).
Ular uchun `isBroadcast()` **`true`** qaytaradi. Faqat shakl bo'yicha
solishtirsak, HAR FOYDALANUVCHINING butun yutuqlar tarixi o'chib ketardi.

Shuning uchun IKKI shart birga talab qilinadi:
1. `src === 'global'` — element umumiy kanaldan kelgan (mijoz `absorb()` da
   belgilaydi), shaxsiy obuna yo'lidan emas;
2. `isBroadcast()` — shakli ham umumiy, ya'ni mavjud bo'lsa surat uni o'z
   ichiga olgan bo'lardi.

Qo'shimcha himoyalar: solishtirish faqat surat ROSTDAN o'qilganda ishlaydi
(`fromSnapshot`), langardan keyin kelgan e'lonlarga tegilmaydi, surat
to'lgan (30 ta) bo'lsa faqat u qamragan sana oralig'iga ishoniladi, belgisiz
eski yozuvlarga umuman tegilmaydi.

Admin tasdiq matni ham rostiga keltirildi — ilgari «bazadan o'chirish» derdi.

---

### A-2 · PAST · Admin emaillar ro'yxati BESH joyda takrorlangan

**Qayerda:** [src/config.js:150](src/config.js#L150), [firestore.rules:28-29](firestore.rules#L28), [api/notify-admin.js:27](api/notify-admin.js#L27), [api/partner.js:22](api/partner.js#L22), [api/school.js:31](api/school.js#L31)
**Holat:** TASDIQLANGAN (kod) — hozir beshtasi ham MOS

Bugun nomuvofiqlik yo'q. Xavf — kelajakda:

| Qayerda | Deploy yo'li |
|---|---|
| `src/config.js` | Vercel (main'ga push) |
| `api/*.js` (3 ta fayl) | Vercel (main'ga push) |
| `firestore.rules` | **`firebase deploy --only firestore:rules` — ALOHIDA** |

Admin qo'shish yoki OLIB TASHLASH uchun beshta joyni tahrirlash va IKKI xil
deploy qilish kerak. Bittasini unutish ikki xil nosozlik beradi:
- `config.js` dan olib tashlab, `rules` da qoldirsangiz — o'sha odam panelni
  ko'rmaydi, lekin bazaga to'liq yozish huquqi SAQLANIB QOLADI;
- teskarisi bo'lsa — admin panelni ko'radi, har amali `permission-denied`
  bilan yiqiladi.

**Tuzatish:** `firestore.rules` ni matn sifatida o'qib, undagi email ro'yxati
`ADMIN_EMAILS` va `api/` dagi uch nusxa bilan bir xilligini tasdiqlaydigan
test. Arzon va aynan shu loyihaning naqshiga mos (kvota qarorlari kabi —
qaror testsiz turmasligi kerak).

---

### A-3 · PAST · `adminLog` da sinxron `throw` xavfi (hozircha yetib bo'lmaydi)

**Qayerda:** [src/services/adminLog.js:150-168](src/services/adminLog.js#L150)
**Holat:** TASDIQLANGAN (kod) — lekin **hozirgi 37 chaqiruvda YETIB BO'LMAYDI**

```js
addDoc(collection(db, 'adminActions'), {
  meta: meta ? JSON.parse(JSON.stringify(meta)) : null,
  ...
}).catch((e) => { ... });
```

`JSON.stringify` sikl havolasida yoki `BigInt` da xato tashlaydi — va bu
`addDoc` PROMISE'i yaratilishidan OLDIN yuz beradi. Ya'ni yozilgan `.catch()`
UMUMAN ishga tushmaydi va xato chaqiruvchining `try` iga uchadi. Bu aynan
[firestoreSafe.js:81-97](src/utils/firestoreSafe.js#L81) da uzun izoh bilan
hujjatlashtirilgan xato sinfi.

Amaliy oqibat bo'lsa jiddiy bo'lardi: jurnal yozuvi barcha admin amallaridan
KEYIN chaqiriladi, ya'ni baza o'zgarishi ALLAQACHON bajarilgan bo'ladi — xato
esa `catch` ga tushib «Xatolik: ...» toast'ini ko'rsatadi. Admin amal
bajarilmadi deb o'ylab, uni QAYTA bajaradi.

**Lekin bugun yetib bo'lmaydi:** 37 chaqiruvning hammasi oddiy satr, son va
`null` uzatadi. Shuning uchun xavflilik PAST.

**Tuzatish:** mavjud `asPromise()` bilan o'rash (`utils/firestoreSafe.js`) —
bitta qator, va bu tuzoqni butunlay yopadi.

---

### A-4 · PAST · Bo'sh `deletionRequests` har tab ochilishida qayta o'qiladi

**Qayerda:** [src/pages/AdminPage.jsx:562](src/pages/AdminPage.jsx#L562)
**Holat:** TASDIQLANGAN (kod)

```js
if (!force && deletionRequests.length > 0) return;
```

Qo'shni bo'limlar mantiqiy bayroq ishlatadi (`proLoaded`, `gapsLoaded`,
`questionsLoaded`), bu yerda esa ro'yxat UZUNLIGI. Kolleksiya bo'sh bo'lsa
(odatiy holat) shart hech qachon bajarilmaydi va tab har ochilganda so'rov
qaytadan ketadi. Narxi kichik (bo'sh so'rov = 1 o'qish), lekin naqsh
qo'shnilaridan farq qiladi va jimgina takrorlanadi.

**Tuzatish:** `delReqLoaded` bayrog'i.

---

## 3. Tekshirildi va SOG'LOM topildi

| Nima | Xulosa |
|---|---|
| `loadAllQuestions` (~47 000 o'qish) | **Ibratli.** Tugma oldida aniq ogohlantirish: narx, kunlik kvota (50 000) va «kvota tugasa ilova BARCHA foydalanuvchilar uchun ishlamay qoladi». Tugma matni — «Tushundim — baribir yuklash» |
| Qoidalar qamrovi | AdminPage tegadigan 16 kolleksiyaning HAMMASIDA `match` bloki bor; yakuniy `match /{document=**}` — `read, write: if false` |
| `useAdmin` ↔ rules | Mijoz tekshiruvi qoidalar bilan AYNAN mos (`ADMIN_EMAILS` yoki `role == 'admin'`); `_firebaseUser` sharti keshdan soxta admin bo'lishni to'sadi |
| `isAdmin()` o'rni | Har `\|\|` zanjirida OXIRIDA — kvota qoidasi ([firestore.rules:7](firestore.rules#L7)) buzilmagan |
| `in` filtri bo'laklash | Ikkala boyitish halqasida ham 30 talik — chegara to'g'ri; topilmagan uid `null` bilan belgilanadi, ya'ni qayta so'ralmaydi |
| `adminActions` | `allow update, delete: if false` — audit izi qo'shib boriladigan (append-only) |
| `deletionRequests` | `allow create: if false` — yozuv faqat Admin SDK orqali; «Bajarildi» holatni o'zgartiradi, hisobni O'CHIRMAYDI (izohda ochiq yozilgan) |
| Pro obunachilar so'rovi | `limit(500)` + `proTruncated` bayrog'i; bo'lim ochilganda bir marta |
| `contentGaps` chegarasiz o'qish | Haqiqatan xavfsiz: hujjat mavzu boshiga, yuqori chegara ≈ **154** (137 mavzu + 17 fan). Koddagi «kolleksiya kichik» izohi HALOL |
| Qaytarilmas amallar | Pro bekor qilish, rol berish, hisob o'chirish, e'lon o'chirish — hammasi `confirmAction` orqali va `logAdminAction` bilan qayd etiladi |

---

## 4. QA checklisti

- [ ] **A-1:** ikki qurilmada sinang — e'lon yuboring, ko'ring, o'chiring,
      foydalanuvchi tomonda qayta yuklang. E'lon qolsa — topilma tasdiqlangan.
- [ ] **A-2:** admin qo'shsangiz yoki olib tashlasangiz, beshta joyni ham
      tekshiring VA `firebase deploy --only firestore:rules` qiling.
- [ ] **A-4:** «Hisob o'chirish» tabini ikki marta oching, Network'da ikkinchi
      so'rov ketayotganini ko'ring.

## 5. TEKSHIRILMAGAN — va nima uchun

1. **Deploy qilingan qoidalar holati.** Repodagi `firestore.rules` oxirgi
   marta 2026-08-31 22:38 da o'zgargan. Vercel qoidalarni deploy QILMAYDI;
   `firebase deploy --only firestore:rules` bajarilganini bu yerdan bilib
   bo'lmaydi. `contentGaps` yozuvlari `permission-denied` bermayotganini
   panelda tasdiqlang.
2. **Qoidalarni funksional sinash.** Java yo'q → Firestore emulyatori
   ishlamaydi. Barcha qoida xulosalari — kod o'qish natijasi.
3. **Savol tahriri, import va publish oqimi.** Katta va alohida qamrovga
   loyiq; bu auditda faqat ularning kvota izohlari o'qildi.
4. **Auth oqimi** — uchinchi qamrov, hali bajarilmagan.

---

## Xulosa

AdminPage «eng kam tekshirilgan» degan tavsifga endi mos EMAS: uch audit va
uzluksiz tuzatishlardan keyin u loyihaning eng puxta hujjatlashtirilgan
qismlaridan biri. Kvota, tasdiq va audit izi jihatidan qoidalar bilan mosligi
ham to'liq.

Yagona haqiqiy nuqson — **A-1**, va u AdminPage'da emas: admin tomonda
o'chirish to'g'ri ishlaydi, mijozdagi `absorb()` esa faqat qo'shishni biladi.
Qolgan uchtasi — mustahkamlash (A-2, A-3) va kichik nomuvofiqlik (A-4).
