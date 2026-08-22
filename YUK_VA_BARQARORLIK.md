# Yuk va barqarorlik — "1000 kishi kirsa nima bo'ladi?"

Bu hujjat ikkita alohida savolga javob beradi. Ularni aralashtirmaslik muhim,
chunki yechimlari butunlay boshqacha:

| Savol | Nomi | Qayerda hal bo'ladi |
|---|---|---|
| "Ko'p odam kirsa qulaydimi?" | **Yuk / kvota** | Firebase va Vercel rejasi, o'qish byudjeti |
| "Funksiyalar bir-birini buzmayaptimi?" | **Regressiya** | Testlar, smoke-test ro'yxati |

---

## 0. Arxitektura: nima uchun ilova "qulab tushmaydi"

| Qatlam | Texnologiya | 1000 foydalanuvchi |
|---|---|---|
| Frontend | Vite SPA → Vercel CDN | Muammo yo'q — statik fayl |
| `/api/*` | Vercel serverless (12 funksiya) | Muammo yo'q — har so'rovga alohida nusxa |
| Savollar (~47k) | Maxfiy Storage paketi → `/api/get-questions` → localforage | Foydalanuvchi boshiga **2** o'qish (⚠️ 3-bo'limga qarang) |
| Auth | Firebase Auth | Muammo yo'q |
| Ma'lumotlar | **Firestore** | ⚠️ **Yagona haqiqiy xavf** |

Bitta serverli ilova RAM/CPU tugab qotib qoladi. Sizda unday qatlam yo'q.
Sizning xavfingiz — **Firestore kvotasi tugashi** (ilova `permission-denied`
bera boshlaydi) va **hisob** (Blaze'da pul).

---

## 0.2. ⚠️ Savol yuklash yo'li — platformaning eng qimmat nuqtasi

**2026-08-05 → 2026-08-14 oralig'ida kvota shu sabab tugagan.** Tarixni
bilmasdan bu kodga tegmang:

1. Boshida savollar Storage'da **ochiq** (`makePublic` / `getDownloadURL`)
   turardi, havola esa `settings/version.urls` da. Bu hujjatni har bir kirgan
   foydalanuvchi o'qiy olardi ⇒ pullik baza login'siz yuklab olinardi.
2. 2026-08-05 auditida teshik yopildi: `urls` **bo'shatildi**. Lekin uni
   qayta to'ldiradigan yo'l qolmadi ⇒ `/api/get-questions` HAR DOIM 404
   qaytardi ⇒ ilova zaxira yo'lga tushdi:
   `getDocs(where('category','==',fan))` = **fan boshiga ~2 900 o'qish**,
   har sovuq yuklashda. Kunlik 50 000 kvota ≈ **17 ta yuklash**.
3. 2026-08-14: paket yo'li **maxfiy** holda tiklandi.
   - Fayl Storage'da yopiq turadi (`storage.rules`: `allow read: if false`).
   - `settings/version.bundles.<fan>.path` da URL emas, **ichki yo'l**.
   - Faylni faqat `api/get-questions.js` Admin SDK bilan o'qiydi (u qoidalardan
     mustaqil) va tekshiruvdan o'tgan mijozga uzatadi.
   - `getDownloadURL()` HECH QAYERDA chaqirilmaydi — 1-banddagi teshik aynan shu.

**Natija:** foydalanuvchi boshiga ~2 900 o'qish → **2 o'qish**.

| Holat | Qayerdan bilinadi |
|---|---|
| Paket faol | `/api/health` → `questionSource: "storage-bundle"` |
| Paket yo'q (qimmat) | `/api/health` → `questionSource: "firestore-fallback"` + admin panelda qizil quti |

**Savolni tahrirlagandan keyin:** Admin panel → Savollar → «Bazani yuklash» →
«Paketlarni qayta qurish». Faqat `dbVersion` ni oshirish YETARLI EMAS —
foydalanuvchi paketni qayta yuklaydi, lekin paket ichida eski matn qoladi.

---

## 0.1. O'lchangan haqiqiy raqamlar (2026-07-28)

`getCountFromServer` bilan o'lchandi:

| Kolleksiya | Hujjat |
|---|---|
| users | **18** |
| userStats | 15 |
| **questions** | **47 038** ⚠️ |
| notifications | 2 |
| objections | 3 |
| errorLogs | 20 |
| promoCodes | 1 |

**Cronlar sababchi emas:** 18 ta foydalanuvchida ikkala cron jami ~36 o'qish
qiladi. Kuniga 5 700 o'qishning sababi — `scripts/*.mjs` maintenance
skriptlari. Ularning hammasi bir xil so'rov qiladi:

```js
getDocs(query(collection(db, 'questions'), where('category', '==', fan)))
```

47 038 ÷ 16 fan ≈ **fan boshiga ~2 900 o'qish**. Grafikdagi ikkita cho'qqi
(2.8K va 2.6K) — ikkita fan ustida ishlatilgan skript. Ya'ni kvota
ilovaga emas, **ishlab chiqish vositalariga** ketgan.

## 1. O'qish byudjeti (eng muhim raqam)

Firestore har bir **hujjat o'qishini** sanaydi. Bitta foydalanuvchi ilovani
bir marta ochganda:

| Manba | Tuzatishdan oldin | Keyin |
|---|---|---|
| `users/{uid}` | 2 | 2 |
| `userStats/{uid}` | 1 | 1 |
| `notifications` (global) | **N** — cheksiz o'sadi | **≤30** |
| `users/{uid}/notifications` | **M** — cron har kuni qo'shadi | **≤30** |
| Reyting sahifasi (ochilsa) | 50 | 50 |
| Savollar | 0 ✅ | 0 ✅ |
| Token yangilanishida | **hammasi QAYTA o'qilardi** | qayta o'qilmaydi |

> ⚠️ **Bu jadval 2026-08-14 holati.** Ikkinchi bosqich 2026-08-22 da
> bajarildi — yangi raqamlar **1.6-bo'limda**.

### Tuzatilgan uchta nuqta

1. **[useNotifications.js](src/hooks/useNotifications.js)** — ikkala `onSnapshot`
   ham limitsiz edi: har foydalanuvchi butun kolleksiyani yuklardi.
   → `orderBy('date','desc') + limit(30)` qo'shildi.

2. **[useNotifications.js](src/hooks/useNotifications.js)** — `useEffect`
   bog'liqligi `[user]` edi. `AuthContext` token yangilanganda yoki tab
   fokusga qaytganda `setUser(enhancedUser)` bilan **yangi obyekt** qaytaradi
   → tinglovchilar uzilib qayta ulanardi → kolleksiyalar boshidan qayta
   o'qilardi. → `[user?.uid]` ga o'zgartirildi.
   (Xuddi shu xato `AppContext.jsx:484` da ilgari tuzatilgan.)

3. **[AdminPage.jsx](src/pages/AdminPage.jsx)** — shaxsiy bildirishnomalar
   ochiq `notifications` kolleksiyasiga yozilardi. Ikki muammo:
   - **Maxfiylik:** `firestore.rules:101` bo'yicha uni har qanday tizimga
     kirgan foydalanuvchi o'qiy olardi.
   - **Yuk:** bir marta 50 ta savol so'rovini bajarsangiz, ochiq
     kolleksiyaga 50 ta hujjat tushib, uni **har bir** foydalanuvchi o'qirdi.

   → Endi shaxsiy xabar `users/{uid}/notifications` ga yoziladi
   (`api/payment-webhook.js:110` da avval qilingan tuzatish bilan bir xil).

> **Diqqat — admin panelidagi o'zgarish:** admin paneldagi "yuborilgan
> bildirishnomalar" ro'yxati faqat ochiq kolleksiyani o'qiydi, shuning uchun
> bir kishiga yuborilgan xabarlar u yerda endi ko'rinmaydi (va o'chirilmaydi).
> Umumiy e'lonlar avvalgidek ko'rinadi. Agar shaxsiylarini ham ko'rish kerak
> bo'lsa — alohida audit ro'yxati qilinadi.

### 4. Reyting sahifasi jonli tinglovchi edi — [LeaderboardPage.jsx](src/pages/LeaderboardPage.jsx)

`onSnapshot` ishlatilardi. Top-50 dagi **istalgan** kishining bali o'zgarganda
hujjatlar qayta o'qilardi — 400 kishi test yechayotganda top-50 doim
o'zgaradi, ya'ni xarajat foydalanuvchi soniga qarab kvadratik o'sardi.
Bir seansda 50 o'qish — butun ilovadagi eng qimmat amal (qolgan hammasi ~8).

→ `getDocs` + **5 daqiqalik localStorage kesh**. Sahifa qayta yuklanganda
(F5 / pull-to-refresh) kesh chetlab o'tiladi. O'z o'rni (top-50 tashqarisida
bo'lsa) har safar yangi o'qiladi — 2 o'qish, chunki foydalanuvchi avvalo
shuni ko'rgani keladi.

Admin qatorni o'chirganda `onSnapshot` avtomatik yangilardi — endi kesh
tozalanadi va qator lokal holatdan olib tashlanadi (0 qo'shimcha o'qish).

### 5. Admin "Questions" tabi = 47 038 o'qish bitta bosishda — [AdminPage.jsx](src/pages/AdminPage.jsx)

**Eng jiddiy mina.** Tab ochilishi bilan AVTOMATIK `getDocs(collection(db,
'questions'))` ishga tushardi — 47 038 o'qish, kunlik kvotaning **94%** i.
Bitta tasodifiy bosish ilovani o'sha kun davomida hamma foydalanuvchi uchun
buzardi. Bundan tashqari yana 3 joyda butun kolleksiya qayta o'qilardi:
bitta savol saqlangandan keyin, JSON import qilingandan keyin va dublikat
o'chirilgandan keyin.

Tuzatildi:
- Avtomatik yuklash olib tashlandi → **ataylab tugma bosish** kerak,
  ogohlantirish matni va narxi ko'rsatilgan holda
- Savol saqlash / import / dublikat o'chirish → lokal holat yangilanadi,
  qayta o'qish yo'q
- Publish → ro'yxat yuklangan bo'lsa qayta o'qimaydi
- Sarlavhadagi son endi arzon `getCountFromServer` dan olinadi

### Natija

```
Reyting (400 foydalanuvchi, kuniga 1 marta):
  Oldin:  400 × 51  = 20 400 o'qish/kun   (+ jonli tinglovchi ustama)
  Keyin:  400 × ~10 =  4 000 o'qish/kun

Admin Questions tabi:
  Oldin:  tasodifiy bosishda 47 038 o'qish
  Keyin:  0 (ataylab tasdiqlanmaguncha)
```

---


---

## 1.6. Ikkinchi bosqich — 2026-08-22

Birinchi bosqich (yuqorida) eng katta yiqilishlarni to'xtatgan edi. Bu bosqich
qolgan **takroriy** o'qishlarni oldi: hech biri foydalanuvchi funksiyasi emas,
hammasi bir xil ma'lumotni qayta-qayta so'rash edi.

### Seansiga o'qish (Dashboard → test → reyting)

| Manba | Oldin | Keyin | Nima qilindi |
|---|---:|---:|---|
| `notifications` (global) | ≤30 | **~1** | Cron/admin yozadigan bitta surat hujjati + faqat undan keyingilarini tinglash |
| `users/{uid}/notifications` | ≤30 | **~1** | Lokal kursor: `where('date','>',kursor)` — subkolleksiya faqat to'ldiriladi |
| Reyting (sahifa ochilsa) | 52 | **1** | Snapshot oynasi 30 daqiqadan **26 soatga** |
| `users/{uid}` | 3 | **1** | `AuthContext` jonli nusxani `userDoc` sifatida beradi |
| `settings/questionMeta` + `premium` | 2 × har mount | **~0** | 6 soatlik localStorage keshi |
| `settings/version` | har mount | **1/seans** | Seans keshi (TestPage ↔ ExamPage bo'lishadi) |
| `firestore.rules` ichidagi `get()` | ~4 | **0** | `isAdmin()` `\|\|` zanjirining oxiriga surildi |
| **JAMI** | **~125** | **~6** | |

Sig'im: **~400 kunlik faol foydalanuvchi → ~5 000+** (Spark, 50 000 o'qish/kun).

### Nima qilindi va nega

**1. Qo'ng'iroq — sarfning ~88% i shu yerda edi.**
Ikkita `onSnapshot`, har biri `limit(30)`, har ilova ochilishida boshidan.
Firestore keshi ataylab xotirada, ya'ni har seans to'liq to'lanardi.
- *Umumiy e'lonlar* hamma uchun bir xil → ular endi bitta hujjatda:
  `settings/announcements`. Uni **admin panel qo'shimcha o'qishsiz yozadi**
  (ro'yxat u yerda allaqachon xotirada). Suratdan keyin qo'shilganlar jonli
  tinglovchi bilan keladi (`where('date','>', updatedAt)`) — «jonli» xususiyat
  yo'qolmadi.
- *Shaxsiy bildirishnomalar* faqat qo'shiladi, hech kim eskisini tahrirlamaydi
  → lokal kursordan keyingilarigina so'raladi.
- **Chegara (bilib turib qabul qilingan):** eski e'lon tahrirlansa yoki
  o'chirilsa, o'zgarish qurilmaga admin suratni keyingi marta yangilaganda
  yetadi. Yangi e'lon esa darhol keladi.

**2. Reyting snapshot'i ishlamayotgan ekan.**
`SNAPSHOT_MAX_AGE` 30 daqiqa edi, cron esa kuniga bir marta (`0 6 * * *`).
Ya'ni kunning 23.5 soatida snapshot «eskirgan» deb tashlanardi va har kim
baribir 50 ta hujjat o'qirdi — **optimizatsiya yozilgan, foydasi yo'q edi.**
Endi oyna 26 soat. «Reyting qotib qolgandek ko'rinadi» e'tirozi yashirish
bilan emas, **rostini aytish** bilan yechildi: taxta tepasida «Yangilangan:
06:00». Top-50 dan tashqaridagining o'z o'rni hamon jonli sanaladi.

> ⚠️ Endi bu blok **kritik**: cron yiqilsa yoki `updatedAt` 26 soatdan eskirsa,
> har foydalanuvchi yana 50 ta o'qishga tushadi. `meta/cronHealth` ni kuzating.

**3. `firestore.rules` — `isAdmin()` zanjirning boshida turardi.**
Uning ichidagi `get(users/{uid})` ni Firestore **oddiy hujjat o'qishi** deb
sanaydi, `||` esa chapdan o'ngga baholanadi. Ya'ni har `userStats` yozuvi
(test yakuni) va har `users` yangilanishi (kunlik faollik, imtihon sanasi,
sozlamalar, push holati) shu `get()` ni to'lardi. Endi arzon shart oldinda.
Mantiq o'zgarmadi (`A || B` ≡ `B || A`). Qoida fayl boshida yozib qo'yilgan.

**4. `users/{uid}` uch marta o'qilardi.**
`AuthContext` uni `onSnapshot` bilan tinglaydi, lekin Header, ProfileDrawer,
SettingsPage (ikki joyda), PremiumModal va SchoolPage har biri qaytadan
`getDoc` qilardi. ProfileDrawer'niki eng yomoni edi: effekt `[user]` ga
bog'langan, `user` esa hujjat har o'zgarganda yangidan yasaladi → har
o'zgarish yana bitta o'qish. Endi kontekst xom hujjatni `userDoc` sifatida
beradi.

**5. `settings/*` har mount'da qayta o'qilardi.**
`utils/settingsCache.js` — 6 soatlik TTL (`examDate.js` dagi naqsh
umumlashtirildi). Admin hujjatni yangilaganda kesh bekor qilinadi.

> ⚠️ **`settings/premium` TO'LOV YO'LIDA KESHLANMAYDI.** `PremiumModal` uni
> ataylab to'g'ridan-to'g'ri o'qiydi: to'lov summasi shu ro'yxatdan yasaladi va
> `api/payment-webhook.js:218` uni Firestore'dagi narx bilan solishtiradi.
> Eskirgan narx = `amount_mismatch` = **foydalanuvchi to'lay olmaydi.**
> Dashboard banneri faqat ko'rsatadi, shuning uchun u keshdan oladi.

**6. `api/cron-reminder.js` — narx faol foydalanuvchiga bog'lanmagan edi.**
Butun `users` kolleksiyasi o'qilardi, so'ng har token'li foydalanuvchi uchun
**alohida, ketma-ket** `userStats.get()`. Endi boshlang'ich nuqta —
`userStats` dagi faol hujjatlar (`lastActiveAt >= 30 kun`), mos profillar esa
bitta `getAll()` da. Natija aynan bir xil (nofaol hisob ilgari ham chetlab
o'tilardi), lekin nofaol hisob endi **umuman o'qilmaydi**. Yon foyda:
yuzlab ketma-ket `get()` yo'qoldi — 60 s chegarasiga eng yaqin joy shu edi.

### Ataylab TEGILMAGAN joylar

| Joy | Nega |
|---|---|
| `AuthContext` dagi boshlang'ich `getDoc(users/{uid})` | Kirish yo'li: hujjat yo'q bo'lsa yaratadi va referral qo'llaydi — tinglovchi hali mavjud emas. 1 o'qish uchun bu xavf arzimaydi |
| `App.jsx` onboarding tekshiruvi | Birinchi muvaffaqiyatdan keyin localStorage'da keshlanadi — amalda 0 o'qish |
| `api/cron-daily.js` to'liq skani | Foydalanuvchi qarori (2026-08-22): ID to'ldirish va push statistikasi **har kunlik** qolsin |
| `settings/version` TTL'i | Savol mazmuni muhim: admin savolni tuzatgach foydalanuvchi TTL tugashini kutmasligi kerak. Faqat seans ichidagi takror olib tashlandi |
| Vercel funksiyalari soni | `api/` da aniq **12** ta route, Hobby chegarasi ham 12. Shuning uchun `/api/leaderboard` qo'shilmadi — reyting cron surati bilan yechildi |

---

## 2. HOZIR tekshirilishi shart bo'lgan ikkita narsa

Bu kodda emas, konsolda. Kod qanchalik yaxshi bo'lmasin, bulardan biri
noto'g'ri bo'lsa ilova 1000 kishini ko'tarmaydi.

### 2.1. Firebase rejasi — TASDIQLANDI: **Spark (bepul)**

Spark kunlik limitlari va bizning sarfimiz:

| Limit | Sarf (tuzatishdan keyin) | Sig'im |
|---|---|---|
| **50 000 o'qish/kun** | ~63 / ilova ochilishi, kuniga ~2 marta ⇒ ~125 / foydalanuvchi | **~400 kunlik faol foydalanuvchi** |
| 20 000 yozuv/kun | ~3 / foydalanuvchi | ~6 000 foydalanuvchi ✅ |
| 1 GiB saqlash | savollar Storage'da | ✅ |

**Yozuvlar muammo emas** — `AppContext.jsx:549` dagi `batchCommitResults`
natijalarni test yakunida BIR MARTA yozadi (ataylab "50 write → 1 write" deb
qilingan). Yagona tor joy — **o'qish**.

**Limit tugaganda:** ilova qulamaydi, lekin Firestore HAMMAGA
`permission-denied` qaytaradi — reyting, statistika, bildirishnomalar
ishlamaydi. Ya'ni 400-chi foydalanuvchidan keyin kirganlar uchun ilova
buzilgan ko'rinadi. **Spark'da 1000 foydalanuvchi mumkin emas** — bu kod
muammosi emas, reja muammosi.

⚠️ **Kvota QACHON tiklanadi — bu yerda avval xato yozilgan edi.**
Bu hujjatda «UTC yarim tunigacha» deb turardi. Firebase hujjati esa aniq
aytadi: *«Quotas are applied daily and reset around midnight Pacific time»* —
ya'ni **Tinch okeani vaqti** bo'yicha, UTC emas.

| | Yozgi vaqt (PDT, UTC−7) | Qishki vaqt (PST, UTC−8) |
|---|---|---|
| Tiklanish, UTC | 07:00 | 08:00 |
| **Tiklanish, Toshkent** | **12:00** | **13:00** |

Farq **7–8 soat**. «Ertalab 5 da o'zi tuzaladi» deb kutgan odam tushgacha
nosozlikda qoladi. Kvota tugagan kuni buni bilish muhim.

### 2.2. Blaze ≠ "pul to'lashni boshlash"

Keng tarqalgan tushunmovchilik: Blaze'da bepul kvota (50 000 o'qish/kun)
**saqlanib qoladi**. Siz faqat **ortiqchasi** uchun to'laysiz.

```
1000 kunlik faol foydalanuvchi:
  O'qish:   125 000/kun − 50 000 bepul = 75 000/kun × 30 = 2 250 000/oy
  Narx:     $0.06 / 100 000            →  ~$1.35/oy
  Yozuv:    3 000/kun — bepul limitdan past  →  $0
```

**1000 foydalanuvchi ≈ oyiga $1–2.** 5000 foydalanuvchi ≈ $10.

⚠️ **Halol ogohlantirish:** Firebase byudjeti **ogohlantiradi, lekin
avtomatik to'xtatmaydi**. Xato kod (cheksiz siklda o'qish) katta hisob
keltirishi mumkin. Shuning uchun Blaze'ga o'tgach darhol:
Google Cloud Console → **Billing** → **Budgets & alerts** → **Create budget**
→ oylik $20, ogohlantirish 50% / 90% / 100%.

### 2.2.1. 300–400 foydalanuvchi Spark'da bo'ladimi? — HA

Tuzatishlardan keyin, 400 faol foydalanuvchi uchun:

| | Kunlik o'qish |
|---|---|
| 400 × 2 seans × ~8 | 6 400 |
| Reyting (keshlangan) | ~4 000 |
| Cronlar (400 foydalanuvchi) | 800 |
| **JAMI** | **~11 200 = 50K ning 22%** |

Ya'ni **~1 500 foydalanuvchigacha** Spark yetadi. "Pul kelguncha bepulda"
rejasi to'liq ishlaydi.

⚠️ **Lekin ikkita narsa kvotani sizning o'z qo'lingiz bilan yeydi:**
1. Admin "Questions" tabini yuklash — 47 038 o'qish (endi ogohlantirish bor)
2. `scripts/*.mjs` — har fan ~2 900 o'qish. 16 fanni birdan qayta ishlash =
   47 000 = butun kvota. Foydalanuvchi ko'payganda skriptlarni kechqurun
   ishlating yoki fanlarni kunlarga bo'ling.

### 2.2.2. 🔴 HODISA — 2026-08-17: bashorat amalga oshdi

Yuqoridagi ogohlantirish **nazariy emas ekan**. 2026-08-17, 21:17 UTC da
`/api/health` shuni qaytardi:

```json
{ "ok": false, "firestore": "down", "firestoreError": "quota_exceeded",
  "firestoreMs": 10526 }        // HTTP 503
```

Kunlik 50 000 o'qish kvotasi tugagan: reyting, statistika, bildirishnomalar
HAMMA foydalanuvchi uchun tiklanish vaqtigacha ishlamadi (Pacific yarim
tuni = Toshkent 12:00); keshi sovuq
foydalanuvchilar savollarni ham yuklay olmadi (`settings/version` o'qilmaydi).

#### O'lchangan raqamlar (Firestore → Usage, oxirgi 24 soat)

Bu taxmin emas — konsoldan olingan:

| Ko'rsatkich | Qiymat | Nimani aytadi |
|---|---|---|
| **Reads, jami** | **60 000** | Kvota 50 000 — oshib ketgan |
| **Reads, cho'qqi soat** | **~50 000** (≈22:00) | Bitta soatda. Qolgan 23 soat tekis |
| Reads, cho'qqisiz | **~10 000/kun** | ⚠️ Asosiy sarf kvotaning atigi 20% i |
| Writes | 677 | Yozuv muammo emas (1-bo'limdagi xulosa tasdiqlandi) |
| Deletes | 1 | — |
| Active connections | **8** peak | Bir vaqtda ~8 kishi |
| Snapshot listeners | 33 peak | — |
| Rules: allows / denies / errors | 11 000 / 86 / 10 | Pastdagi izohga qarang |

**Eng aniq dalil — reads va rules o'rtasidagi nomutanosiblik.** O'qish 60 000,
qoidalar baholanishi esa atigi 11 000. Firestore `list` amalida qoidalarni
SO'ROV boshiga bir marta baholaydi, o'qishni esa HAR HUJJAT uchun sanaydi.
Ya'ni 47 038 hujjatlik bitta so'rov = 1 ta rules evaluation + 47 038 read.
Agar bu haqiqiy foydalanuvchi trafigi bo'lganda, ikkala raqam yonma-yon
o'sardi. Ular ajralib ketgan — demak bitta katta filtrsiz so'rov.

**Ikkinchi dalil:** cho'qqi paytida bir vaqtda atigi 8 ta ulanish bor edi.
8 kishi bir soatda 50 000 hujjat o'qiy olmaydi.

#### Muhim xulosa: platforma Spark'dan OSHIB KETMAGAN

Cho'qqisiz kunlik sarf **~10 000 o'qish** — kvotaning atigi 20% i. Ya'ni
2.2.1-bo'limdagi model (400 foydalanuvchi uchun ~11 200 baholangan edi)
o'lchov bilan **tasdiqlandi**.

Bu nosozlik o'sishdan emas, **bitta himoyasiz vositadan** kelib chiqqan.
Blaze rejasi sig'im uchun kerak emas — u «bitta xato skript butun kunni
yiqitadi» holatini yo'q qilish uchun kerak.

#### Sababi

**Ro'yxatdagi 2-band, aniqrog'i uning kuzatilmagan varianti.** Repo
ildizida `find_exact_question.js` degan bir martalik skript yotgan edi:

```js
const snap = await getDocs(collection(db, 'questions'));   // 47 038 o'qish
```

Filtrsiz. Bitta ishga tushirish = kunlik kvotaning **94%**.

**Tuzatildi:** skript zararsizlantirildi, o'rniga
[scripts/find-question.mjs](scripts/find-question.mjs) — u lokal eksportdan
qidiradi (0 o'qish), Firestore rejimi esa `--category` va `--yes` talab qiladi.

**Sabot:** ogohlantirish hujjatda bor edi, lekin **kodda yo'q edi**. Hujjat
o'qilmaydi, guard esa ishlaydi. Bundan keyin to'liq kolleksiyani o'qiydigan
har qanday yangi skript shu naqshni takrorlasin — majburiy filtr + aniq tasdiq.

### 2.3. Qaror: avval O'LCHASH (2026-07-28 da tanlangan yo'l)

Firebase Console → **Firestore Database** → **Usage** tabi → **Reads** grafigi.
So'nggi 7 kundagi eng yuqori kunni oling:

| Kunlik o'qish | Ma'nosi |
|---|---|
| < 10 000 | Bemalol, Spark uzoq yetadi |
| 10 000 – 25 000 | Yarmiga yetdi, kuzating |
| 25 000 – 40 000 | **Blaze'ga o'tish vaqti** |
| > 45 000 | Xavfli — ilova istalgan kuni to'xtashi mumkin |

**Ikki marta o'lchang:** bugungi raqam = tuzatishdan OLDINGI holat.
Deploy qilib 2–3 kundan keyin qayta o'lchang — o'qish ~4x kamayishi kerak.

### 2.4. Vercel rejasi — bepul (Hobby)

**Texnik jihatdan muammo yo'q:** savol to'plami ~2 MB (gzip ~0.5 MB), CDN kesh
+ localforage bilan har foydalanuvchi bir marta yuklaydi → 1000 foydalanuvchi
≈ 1 GB, Hobby limiti 100 GB/oy. Bemalol.

**Huquqiy muammo bor:** Hobby reja **tijorat loyihalariga ruxsat etilmagan**,
siz esa obuna sotyapsiz. Qoida buzilsa loyiha to'xtatilishi mumkin.
Bu biznes qarori — texnik zaruriyat emas.

---

## 3. Kuzatuv: `/api/health`

Yangi endpoint qo'shildi — [api/health.js](api/health.js).

```bash
curl https://zehin-t41p.vercel.app/api/health
```

Javob:

```json
{
  "ok": true,
  "env": "ok",
  "firestore": "up",
  "firestoreMs": 47,
  "questionBundles": 16,
  "questionsVersion": "...",
  "coldStart": false,
  "region": "fra1"
}
```

Nimaga foydali:
- `firestore: "down"` + `firestoreError: "quota_exceeded"` → kvota tugagan,
  darhol ko'rasiz (kod xatosi emas, reja masalasi).
- `firestoreMs` — yuk ostida bu raqam o'sadi. **Qulashdan oldin ogohlantiradi.**
- HTTP status 200/503 — tashqi monitoring (UptimeRobot, Better Stack) hech
  qanday sozlashsiz tushunadi. Bepul tarifda 5 daqiqada bir tekshiradi va
  ilova o'lsa SMS/email yuboradi.

**Tavsiya:** UptimeRobot'da bepul monitor qo'ying → `/api/health`, 5 daqiqa.

---

## 4. Keyingi bosqichlar (hali qilinmagan)

### Bosqich 2 — haqiqiy yuk sinovi

`k6` yoki `autocannon` bilan real raqam olish:

```bash
npx autocannon -c 100 -d 30 https://zehin-t41p.vercel.app/api/health
```

O'lchanadigan narsa: p95 javob vaqti, xato foizi, Firestore o'qish soni
(Firebase Console → Firestore → Usage). Maqsad — "1000 kishi = X so'm/kun,
p95 = Y ms" degan **aniq raqamga** ega bo'lish.

### Bosqich 3 — regressiya himoyasi

Hozircha loyihada **birorta ham avtomatik test yo'q** (`tests/` papkasi yo'q),
holbuki 23 ta sahifa va 2000 qatorlik o'zaro bog'liq kontekst bor.

- Relizdan oldingi 20 qadamli qo'lda smoke-test ro'yxati
- Playwright bilan 5 ta kritik oqim: login → test yechish → natija saqlanishi
  → premium → to'lov
