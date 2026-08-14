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
ishlamaydi. UTC yarim tunigacha. Ya'ni 400-chi foydalanuvchidan keyin
kirganlar uchun ilova buzilgan ko'rinadi. **Spark'da 1000 foydalanuvchi
mumkin emas** — bu kod muammosi emas, reja muammosi.

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
