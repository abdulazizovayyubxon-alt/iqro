# Audit 2026-09-02 — kvota va o'qish/yozish hajmi

**Qamrov:** 2026-08-19 auditidan keyingi kvota o'zgarishlari (28 commit).
**Usul:** kodni o'qish → topilmalarni tuzatish.
**Baza holati (auditdan oldin):** `npm test` — 24 fayl, 424 test.
**Holat (tuzatishlardan keyin):** `npm test` — 25 fayl, **437 test o'tdi**;
`eslint` toza; `npm run build` muvaffaqiyatli.

## Tuzatish holati

| Band | Xavflilik | Holat | Tegilgan fayllar |
|---|---|---|---|
| K-1 cron jadvali | yuqori | ✅ tuzatildi | `vercel.json`, `api/cron-daily.js` |
| K-2 davr almashish oynasi | yuqori | ✅ tuzatildi + 13 test | `src/utils/leaderboardSnapshot.js` (yangi), `LeaderboardPage.jsx`, uz/ru/en |
| K-3 bayroqlar tozalanmasligi | o'rta | ✅ tuzatildi | `AppContext.jsx` |
| K-4 faollik qulfi | o'rta | ✅ tuzatildi | `AppContext.jsx` |
| K-5 shift kafolati | past | ✅ tuzatildi | `AppContext.jsx` |
| K-6 eski hisobga qayta urinish | past | ✅ tuzatildi | `AppContext.jsx` |

⚠️ O'zgarishlar ishchi katalogda — **commit qilinmagan va deploy qilinmagan.**

Bu hisobot [AUDIT_PROMPT.md](AUDIT_PROMPT.md) dagi usulga amal qiladi: har
topilma `fayl:qator` ga bog'langan va TASDIQLANGAN / TEKSHIRISH KERAK deb
belgilangan.

---

## 1. Qamrov — nima ko'rildi

| Modul | Holat |
|---|---|
| `src/utils/saveSchedule.js` | to'liq o'qildi |
| `src/utils/firestoreSafe.js` | to'liq o'qildi |
| `src/utils/settingsCache.js` | to'liq o'qildi |
| `src/utils/announcements.js` | to'liq o'qildi |
| `src/services/contentGaps.js` | to'liq o'qildi |
| `src/context/AppContext.jsx` | bulutga saqlash bloki (490–930) |
| `src/pages/LeaderboardPage.jsx` | kesh + surat yo'li (42–270) |
| `src/hooks/useNotifications.js` | e'lon bootstrap va tinglovchilar (95–248) |
| `api/cron-daily.js` | jadval izohi + reyting snapshot bloki (757–830) |
| `api/_shared.js` | `getWeekId` / `getMonthId` / `cronHeartbeat` |
| `firestore.rules` | `contentGaps`, `hasContentAccess`, `questionRequests` |
| `vercel.json` | cron jadvali |

**Ko'rilMAGAN** (5-bo'limga qarang): haqiqiy Firestore raqamlari, deploy
qilingan `firestore.rules` holati, AdminPage'ning qolgan 11 o'zgarishi.

---

## 2. Topilmalar

### K-1 · YUQORI · Cron jadvali 2026-11-01 da kvota chegarasiga tushadi

**Qayerda:** [api/cron-daily.js:9-18](api/cron-daily.js#L9), [vercel.json:14](vercel.json#L14)
**Holat:** TASDIQLANGAN (kod + Firebase hujjati)

`9dcaa4d` cron'ni `0 6 * * *` dan `0 8 * * *` UTC ga ko'chirdi va izohda
shunday yozdi:

> Firestore bepul (Spark) rejada kunlik yozuv kvotasi Tinch okeani yarim
> kechasida = **07:00 UTC** da yangilanadi. […] Vaqtni o'zgartirsangiz,
> 07:00 UTC dan KEYIN qoldiring.

Bu **faqat yozgi vaqt uchun to'g'ri**. Besh kun oldin yozilgan `8d0d108`
(«tiklanish vaqti UTC emas, Pacific yarim tuni») buni aynan jadval bilan
hujjatlashtirgan:

| | Yozgi vaqt (PDT, UTC−7) | Qishki vaqt (PST, UTC−8) |
|---|---|---|
| Tiklanish, UTC | 07:00 | **08:00** |

Ya'ni **2026-11-01** dan (AQShda qishki vaqtga o'tish) tiklanish 08:00 UTC
bo'ladi — cron esa AYNAN 08:00 UTC da ishga tushadi. Vercel cron soniyagacha
aniq emas, Firebase hujjati ham *"reset **around** midnight Pacific time"*
deydi. Demak cron tugab bo'lgan kvota kunining dumida ishlashi mumkin — bu
`9dcaa4d` tuzatgan nosozlikning aynan o'zi, faqat ikki oy kechikib qaytadi.

**Oqibati** (kodning o'zida yozilgan, [api/cron-daily.js:777](api/cron-daily.js#L777)):
cron bloklansa `metrics`, `meta/cronHealth` va reyting surati yozilmaydi.
26 soatdan keyin **har foydalanuvchi yana 50 ta hujjat o'qishga tushadi**.

**Takrorlash:** tizim vaqtini 2026-11-02 ga qo'ying → Pacific yarim tuni
08:00 UTC → cron jadvali bilan ustma-ust.

**Tuzatish:** `vercel.json` da `"schedule": "0 9 * * *"` (Toshkent 14:00) —
07:00 va 08:00 UTC ning IKKALASIDAN ham keyin. Narxi: surat bir soat kech
yangilanadi. Izohdagi «07:00 UTC» ni «07:00 UTC (yozda) / 08:00 UTC (qishda)»
ga tuzating, aks holda keyingi safar yana shu qadam takrorlanadi.

---

### K-2 · YUQORI · Dushanba ertalab reyting surati rad etiladi — kunlik o'qish byudjeti yonadi

**Qayerda:** [src/pages/LeaderboardPage.jsx:188-196](src/pages/LeaderboardPage.jsx#L188), [api/cron-daily.js:784-787](api/cron-daily.js#L784)
**Holat:** TASDIQLANGAN (kod)

Mijoz suratni faqat davri mos bo'lganda qabul qiladi:

```js
const periodOk =
  boardType === 'all' ? true
  : boardType === 'weekly' ? data?.weekId === weekId
  : data?.monthId === monthId;
```

`getWeekId` Toshkent kalendari bo'yicha ishlaydi (server va mijozda bir xil —
buni tekshirdim, [api/_shared.js:234](api/_shared.js#L234)). Demak hafta
**dushanba 00:00 (Toshkent)** da almashadi, cron esa suratni **14:00 (Toshkent)**
da yozadi (K-1 tuzatishidan keyin; ilgari 13:00 edi).

**14 soatlik oyna:** dushanba 00:00–14:00 oralig'ida haftalik taxtani ochgan
HAR KIM `periodOk === false` oladi va jonli so'rovga tushadi. Oylik taxta
uchun xuddi shu — har oyning 1-sanasida.

**Hisob** (mijoz keshi [LeaderboardPage.jsx:42](src/pages/LeaderboardPage.jsx#L42) — atigi 5 daqiqa):

| | O'qish |
|---|---|
| Bitta foydalanuvchi, bitta ochish | 1 (`settings/leaderboard`) + 50 (jonli) = **51** |
| 400 foydalanuvchi | 20 400 |
| **~980 foydalanuvchi** | **~50 000 = Spark kunlik o'qish limitining HAMMASI** |

⚠️ **Bu raqamga aniqlik.** Jonli so'rov `orderBy(weekly_<yangi>)` bilan
ishlaydi, Firestore esa bu maydon YO'Q hujjatni umuman qaytarmaydi. Ya'ni
dushanba 00:00–03:00 oralig'ida (hali deyarli hech kim ball yig'magan) so'rov
50 emas, bir necha hujjat qaytaradi va arzon tushadi. To'liq 50 lik narx
maydonni to'ldirgan foydalanuvchilar soni 50 dan oshgach yuzaga keladi — ya'ni
**ertalabki cho'qqida (07:00–14:00, o'qituvchilar darsdan oldin)**. Jadvaldagi
chegara aynan o'sha soatlarga tegishli; kechasi xavf kichikroq.

Xulosa o'zgarmaydi: eng qimmat yo'l eng gavjum soatda ochiladi. Bu K-1 bilan
zanjirlanadi — kvota tugasa cron ham bloklanadi → ertasi kuni surat yo'q →
yana 50 ta o'qish.

**Yon foyda:** o'sha oynada jonli so'rov TO'LIQ taxtani ham bermaydi (maydoni
yo'q hujjatlar tushib qoladi), ya'ni 50 ta o'qish sarflab yarim javob olinardi.

**Takrorlash:** yakshanba kuni ilovani oching (surat yoziladi) → dushanba
00:30 da haftalik taxtani oching → Network'da `userStats` bo'yicha
`orderBy+limit(50)` so'rovi ko'rinadi.

**TANLANGAN TUZATISH (1-variant):** `periodOk === false` bo'lganda jonli
so'rovga TUSHILMAYDI. Bo'sh ro'yxat o'rniga sabab ko'rsatiladi: «Yangi hafta
boshlandi — reyting soat 14:00 da yangilanadi». Bu `SNAPSHOT_MAX_AGE`
falsafasiga mos: *muammo yashirish bilan emas, rostini aytish bilan yechiladi.*
Foydalanuvchining O'Z o'rni pastda hamon ko'rsatiladi — u lokal statistikadan
hisoblanadi va ro'yxatga bog'liq emas.

Qaror sof funksiyaga chiqarildi: [src/utils/leaderboardSnapshot.js](src/utils/leaderboardSnapshot.js)
(`saveSchedule.js` naqshi — kvota qarori testsiz turmasligi kerak) va
[13 ta test](src/__tests__/leaderboardSnapshot.test.js) bilan qulflandi.

**Rad etilgan variantlar:**
- *Cron suratga KELGUSI davr taxtasini ham yozsin.* Ishlamaydi: yakshanba kuni
  `weekly_<kelgusi>` maydoni hujjatlarda hali YO'Q, ya'ni `orderBy` bo'sh
  qaytaradi — 50 o'qish sarflab bo'sh taxta olinardi.
- *Ikkinchi cron qo'shish.* Vercel Hobby cheklovi: kuniga 1 marta, jami 2 ta
  vazifa ([LeaderboardPage.jsx:65](src/pages/LeaderboardPage.jsx#L65) izohi),
  ikkalasi ham band.
- *`LB_CACHE_TTL` ni uzaytirish.* Oynani yopmaydi, faqat yumshatadi — va
  reyting yangilanishini butun kun sekinlashtiradi.

---

### K-3 · O'RTA · Hisob almashganda bulut bayroqlari tozalanmaydi — `inFlightRef` qotib qolishi mumkin

**Qayerda:** [src/context/AppContext.jsx:605](src/context/AppContext.jsx#L605) va [712-730](src/context/AppContext.jsx#L712)
**Holat:** TASDIQLANGAN (kod) / TEKSHIRISH KERAK (runtime — kvota tugashi kerak)

Foydalanuvchi almashganda faqat `setCloudSynced(false)` bajariladi. Oltita
yozuv bayrog'i — `pendingCloudRef`, `inFlightRef`, `dirtyRef`,
`oldestPendingRef`, `retryAttemptRef`, `nextAttemptAtRef` — **tegilmasdan
qoladi**. `AppProvider` esa ildizda turadi, ya'ni unmount bo'lmaydi.

**Buzilish yo'li:**
1. Kvota tugadi → `setDoc` promise'i osilib qoldi → `inFlightRef = true`
   ([AppContext.jsx:796](src/context/AppContext.jsx#L796)).
2. Foydalanuvchi chiqdi, boshqasi kirdi (sahifa QAYTA YUKLANMAYDI — SPA).
3. Yangi foydalanuvchining har `writeCloudNow` chaqiruvi
   [785-790](src/context/AppContext.jsx#L785) dagi darvozadan qaytadi:
   ```js
   if (inFlightRef.current) { dirtyRef.current = true; return; }
   ```
4. Natija: **yangi foydalanuvchining statistikasi butun seans davomida
   bulutga umuman yozilmaydi.** Lokal zaxira ishlaydi, ya'ni ma'lumot
   yo'qolmaydi — lekin reyting, admin paneli va boshqa qurilma bo'sh ko'radi.

Osilgan promise kvota tiklangach settle bo'ladi va `finally` bayroqni ochadi —
ya'ni o'zi tuzaladi, lekin **tushgacha**.

Yon ta'siri: `nextAttemptAtRef` ham o'tib ketadi. Oldingi foydalanuvchida 5 ta
ketma-ket xato bo'lgan bo'lsa, backoff 15 daqiqaga chiqadi va yangi
foydalanuvchi shuncha kutadi.

**Tuzatish:** 1-effektda (`user?.uid` o'zgarganda) oltala ref'ni nolga
tushiring. `inFlightRef` ni tozalash xavfsiz: eski promise'ning `finally`
qismi endi begona bayroqqa tegmasligi uchun `uidAtWrite` tekshiruvini
`finally` ga ham qo'shing.

---

### K-4 · O'RTA · `touchUserActivity` qulfi yozuvdan OLDIN qo'yiladi — kvota tugagan kuni «oxirgi faollik» butunlay yo'qoladi

**Qayerda:** [src/context/AppContext.jsx:531-547](src/context/AppContext.jsx#L531)
**Holat:** TASDIQLANGAN (kod)

```js
localStorage.setItem(ACTIVITY_PING_KEY(uid), today);   // ← qulf AVVAL
...
updateDoc(doc(db, 'users', uid), { lastActiveAt: ... }).catch(() => {});  // ← xato JIM
```

Kunlik qulf yozuv MUVAFFAQIYATLI bo'lishidan oldin qo'yiladi va xato jimgina
yutiladi. Kvota tugagan kunda birinchi urinish yiqiladi, qulf esa yarim tungacha
turadi — ya'ni **o'sha kuni birorta foydalanuvchining `lastActiveAt` maydoni
yozilmaydi**.

Nega muhim: bu maydon admin panelidagi «oxirgi faollik» ustuni. Kvota tugagan
kun — aynan siz «kim ilovada edi, nima bo'ldi?» deb qaraydigan kun. Ustun
o'sha kuni jimgina yolg'on gapiradi.

**Tuzatish:** qulfni `.then()` ichiga ko'chiring. Xavfi yo'q — eng yomon holatda
seansiga bir necha ortiqcha yozuv bo'ladi, bu `contentGaps` naqshi bilan bir xil.

---

### K-5 · PAST · «Eng ko'pi 180 soniya» kafolati ochiq yozuv borida buziladi

**Qayerda:** [src/context/AppContext.jsx:770](src/context/AppContext.jsx#L770) va [785](src/context/AppContext.jsx#L785)
**Holat:** TASDIQLANGAN (kod)

`oldestPendingRef.current = null` funksiyaning BOSHIDA, `inFlightRef`
darvozasidan OLDIN bajariladi. Darvoza yopiq bo'lsa yozuv bo'lmaydi, lekin
shift hisoblagichi baribir nolga tushadi va keyingi o'zgarish yana to'liq
30 soniyalik debounce oladi.

Amalda **zararsiz**: darvoza yopiq bo'lishining yagona sababi — osilgan yozuv,
o'shanda esa hech narsa yozilmaydi va shift ham ma'nosiz. Lekin kod va'da
qilgan invariant bajarilmaydi, keyingi o'quvchi shunga tayanib xato qilishi
mumkin.

**Tuzatish:** `oldestPendingRef.current = null` qatorini `if (inFlightRef.current)`
blokidan KEYINGA ko'chiring.

---

### K-6 · PAST · Chiqib ketgandan keyingi qayta urinish eski hisobga yoziladi

**Qayerda:** [src/context/AppContext.jsx:829](src/context/AppContext.jsx#L829) va [897-921](src/context/AppContext.jsx#L897)
**Holat:** TASDIQLANGAN (kod)

`retryCloudRef.current = writeCloudNow` 2-effekt ichida, `if (!user || !cloudSynced) return;`
([732](src/context/AppContext.jsx#L732)) dan KEYIN o'rnatiladi. Chiqib ketilganda
effekt erta qaytadi — ya'ni **ref eski `user` ga bog'langan eski closure'ni
ushlab qoladi**. Qayta urinish effekti esa `[]` bog'liqlik bilan ishlaydi va
har 60 soniyada uni chaqiraveradi.

Natijada chiqib ketgandan keyin `setDoc(userStats/<eski uid>)` yuboriladi.
`firestore.rules` uni rad etadi (`isOwner` mos emas), ya'ni **ma'lumot
sizib chiqmaydi** — lekin konsolga xato oqadi, backoff bekorga o'sadi va
navbatga keraksiz mutatsiya tushadi.

**Tuzatish:** 1-effektda `retryCloudRef.current = null` qo'ying (K-3 bilan
bitta joyda).

---

## 3. Tekshirildi va SOG'LOM topildi

Bularni qayta auditga kiritmang — bu safar o'qildi va muammo topilmadi:

| Nima | Xulosa |
|---|---|
| `saveSchedule.js` matematikasi | to'g'ri; shift, backoff va `inFlight` darvozasi 424 test bilan qoplangan |
| `firestoreSafe.js` | `symbol`/`undefined`/React elementi to'sig'i to'g'ri; sentinellarga (`serverTimestamp`, `deleteField`) tegilmaydi |
| `settingsCache` — to'lov yo'li | `PremiumModal` ATAYLAB keshni chetlab o'tadi ([settingsCache.js:19-27](src/utils/settingsCache.js#L19)) — `amount_mismatch` xavfi to'g'ri yopilgan |
| `settings/version` sessiya keshi | `invalidateSettings('version')` admin paketni yangilaganda chaqiriladi ([AdminPage.jsx:2908](src/pages/AdminPage.jsx#L2908)) |
| `contentGaps` yozuv byudjeti | hujjat MAVZU boshiga, localStorage qulfi kuniga/haftasiga 1 ta — cheklangan |
| `contentGaps` qoidalari | `increment()` sentineli rules'da hal qilinadi; `hasOnly` + delta chegarasi to'g'ri |
| `getWeekId` server↔mijoz | ikkalasi ham Toshkent kalendarida — nomuvofiqlik YO'Q (tekshirildi) |
| E'lonlar surati | `publishedSigRef` takroriy yozuvni to'sadi; surat yo'q bo'lsa migratsiya yo'li ishlaydi |

---

## 4. QA checklisti (qo'lda)

- [ ] **K-1:** `vercel.json` tuzatilgandan keyin Vercel panelida cron keyingi
      ishga tushish vaqti 09:00 UTC ekanini tasdiqlang.
- [ ] **K-1:** `meta/cronHealth` hujjatini har dushanba tekshiring — `updatedAt`
      24 soatdan eski bo'lsa cron bloklangan.
- [ ] **K-2:** dushanba 01:00 (Toshkent) da haftalik taxtani oching, DevTools →
      Network'da `Listen`/`RunQuery` so'rovlarini sanang. 50 ta hujjat kelsa —
      topilma tasdiqlangan.
- [ ] **K-3:** ikki hisob bilan sinang: A bilan test yeching → chiqing →
      B bilan kiring → test yeching → Firestore'da `userStats/B` yangilanganini
      tekshiring. (Kvota tugagan holatni takrorlash qiyin — buni «TEKSHIRISH
      KERAK» deb qoldiring.)
- [ ] **K-4:** `users/<uid>.lastActiveAt` bugungi sana bilan yangilanayotganini
      tasdiqlang.

## 5. TEKSHIRILMAGAN — va nima uchun

1. **Haqiqiy Firestore raqamlari.** Hisobotdagi barcha o'qish/yozish sonlari
   KODDAN chiqarilgan, Firebase konsolidan OLINMAGAN. K-2 dagi «~980
   foydalanuvchi» chegarasini konsoldagi Usage grafigi bilan solishtiring.
2. **Deploy qilingan `firestore.rules` holati.** Repodagi qoidalar oxirgi marta
   2026-08-31 22:38 da o'zgargan (`contentGaps` bloki). Vercel qoidalarni
   deploy QILMAYDI — `firebase deploy --only firestore:rules` alohida
   bajarilgani bu yerdan ko'rinmaydi. `contentGaps` yozuvlari
   `permission-denied` bermayotganini admin panelida tasdiqlang.
3. **Qoidalarni funksional sinash.** Bu mashinada Java yo'q → Firestore
   emulyatori ishlamaydi. Barcha qoida xulosalari — o'qish natijasi.
4. **AdminPage'ning qolgan o'zgarishlari.** 2026-08-19 dan beri 11 marta
   o'zgargan, lekin bu auditning qamrovi kvota edi. Alohida audit kerak
   (AUDIT_PROMPT.md, «hali tekshirilmagan joylar», 1-band).
5. **`metrics` hujjatlarining hozirgi holati.** `2026-08-21..23` yozilmagani
   ma'lum; `9dcaa4d` dan keyin tiklanganini Firestore'da qarash kerak.

---

## Xulosa

Kvota ishlari asosan **to'g'ri bajarilgan**: qarorlar sof funksiyalarga
chiqarilgan, testlar bilan qoplangan va sabablari kodda yozilgan. Regressiya
izlab topilgan ikki jiddiy band ham optimizatsiyaning O'ZIDA emas, uning
CHEKKALARIDA:

- **K-1** — vaqt mintaqasi farqi (2026-11-01 da o'zi portlaydi);
- **K-2** — davr almashish chegarasi (har dushanba takrorlanadi).

Ikkalasi ham bir xil oqibatga olib keladi: reyting surati yaroqsiz bo'ladi va
har foydalanuvchi 50 ta o'qishga tushadi. **Avval K-2 ni tuzating** — u har
hafta ishlaydigan xarajat, K-1 esa ikki oydan keyingi xavf.
