# Zehin platformasi — QAYTA audit (QA & Xavfsizlik)

**Sana:** 2026-08-06 · **Commit:** `bf3322c` · **Branch:** `main`
**Auditor roli:** Senior QA Automation Engineer + Software Security Auditor
**Usul:** oq quti statik kod tahlili + o'lchov skriptlari. Jonli muhitda runtime testlar O'TKAZILMAGAN.
**Oldingi hisobot:** [`AUDIT_2026-08-05.md`](AUDIT_2026-08-05.md) — undagi 23 band qayta hisobot QILINMAGAN, faqat regressiya nuqtai nazaridan tekshirilgan.

> Fayl nomi 08-06 — qayta audit ertasi kuni bajarilgani uchun (oldingi hisobot bilan sana to'qnashmasin).

---

## ✅ TUZATISH HOLATI (2026-08-06, audit bilan bir kunda)

**Barcha 22 band ko'rib chiqildi.** Tekshiruv: `npm test` — **80 test o'tdi** (72 + T-7 uchun 8 ta yangi), `eslint` — **0 xato**, `npm run build` — **muvaffaqiyatli**.

| # | Band | Holat | Fayl |
|---|---|---|---|
| **T-1** | 🔴 Muddati o'tgan to'lov mangu kirish beradi | ✅ **Tuzatildi** | `api/cron-daily.js` — `premiumPlan === 'paid'` istisnosi olib tashlandi + partiyali yozuv |
| **T-2** | 🟠 Hisob almashish poygasi | ✅ **Tuzatildi** | `src/context/AppContext.jsx` — effekt cleanup + `cancelled` guard |
| **T-3** | 🟠 Import dedup filtri o'lik | ✅ **Tuzatildi** | `src/pages/AdminPage.jsx` — `questionsLoaded` guard'i |
| **T-4** | 🟠 Firestore o'qish hajmi | 🟡 **Qisman** | `src/pages/TestPage.jsx` — 7–10 query → **1 query**. Server proksisi BAJARILMADI (pastga qarang) |
| **T-5** | 🟡 Ikki blueprint jadvali ziddiyati | ✅ **Tuzatildi** | `ExamPage.jsx` — `SUBJECT_BLUEPRINTS` o'chirildi, yagona manba `EXAM_BLUEPRINT` |
| **T-6** | 🟡 `userStats` yozuv amplifikatsiyasi | 🟡 **Qisman** | `AppContext.jsx` — lokal nusxa debounce (600ms) + flush. Kartani yengillashtirish BAJARILMADI |
| **T-7** | 🟡 `qHash` to'qnashuvi (1.98% o'lchandi) | ✅ **Tuzatildi** | `SmartQuestionEngine.js` — to'liq matn xeshi + migratsiyasiz zaxira; **8 ta yangi test** |
| **T-8** | 🟡 Chegarasiz listenerlar | ✅ **Tuzatildi** | `AdminPage.jsx` — 3 ta listenerga `limit()`, referral amallarida lokal yangilash |
| **T-9** | 🟡 Referral bonusi ikki marta | ✅ **Tuzatildi** | `AdminPage.jsx` — `runTransaction` + `bonusPaid` tekshiruvi |
| **T-10** | 🟡 a11y: klaviatura yo'q | 🟡 **Qisman** | Yangi `hooks/useModalA11y.js`; 11 ta modalga ulandi (pastga qarang) |
| **T-11** | 🟡 PWA yangilanish banneri | ✅ **Tuzatildi** | `OfflineIndicator.jsx` — `registration.waiting` + soatlik `update()` + cleanup |
| **T-12** | 🟡 Hisob o'chirilmaydi (Play) | ✅ **Tuzatildi** | `api/notify-admin.js` — yangi `action=delete-user` (Auth + subkolleksiya) |
| **T-13** | 🟡 Play'da to'lov havolasi | ✅ **Yopildi** | Egasi tasdiqladi: kanal orqali to'lov YO'Q → siyosat buzilmaydi, izoh tuzatildi |
| **T-14** | 🔵 `/api/send-result` mavjud emas | ✅ **Tuzatildi** | `TestPage.jsx` — o'lik chaqiruv olib tashlandi |
| **T-15** | 🔵 `spacedCards`/`customMnemonics` birlashmaydi | ✅ **Tuzatildi** | `AppContext.jsx` — `lastReview` bo'yicha union |
| **T-16** | 🔵 Import validatsiyasi | ✅ **Tuzatildi** | `AdminPage.jsx` — topicId/correct tekshiruvi + qisman yozuv hisoboti |
| **T-17** | 🔵 Context memoizatsiyasi | ✅ **Tuzatildi** | `AppContext.jsx` — `useMemo` + 6 ta `useCallback` |
| **T-18** | 🔵 `smartSort` O(n²) | ✅ **Tuzatildi** | `SmartQuestionEngine.js` — ko'rsatkichlar + o'ram (klonlashsiz) |
| **T-19** | 🔵 Dublikat tahlili xotirasi | ✅ **Tuzatildi** | `AdminPage.jsx` — 8 000 dan katta hajmda fan filtri talab qilinadi |
| **T-20** | 🔵 O'lik Firestore kesh qoidasi | ✅ **Tuzatildi** | `vite.config.js` — qoida olib tashlandi |
| **T-21** | 🔵 Imtihon sessiyasi egaligi | ✅ **Tuzatildi** | `ExamPage.jsx` — `uid` qat'iy talab qilinadi |
| **T-22** | 🔵 React eager-state'ga tayanish | ✅ **Tuzatildi** | `AppContext.jsx` — `stateRef` + sof `computeNext()` |

### Ataylab BAJARILMAGAN qismlar (sabab bilan)

**T-4 — server proksisi.** `api/get-questions.js` ni Firestore proksisiga aylantirish o'qishni mijozdan serverga ko'chiradi (fan boshiga 2 430–3 744 → 0), lekin serverless funksiyaning xotira/timeout profilini o'zgartiradi va **faqat preview deploy'da sinaladi**. Bajarilgani: TestPage 7–10 query o'rniga 1 ta query ishlatadi → rules ichidagi `get(users/{uid})` shuncha marta kamaydi.

**T-6 — kartani yengillashtirish.** `spacedCards` savolning to'liq nusxasini saqlaydi (200 karta ≈ 210 KB). Uni identifikatorga qisqartirish `SmartReviewPage` ni buzadi: u takror navbatini **bevosita kartadan** render qiladi (`card.q`, `card.opts`, `card.correct`). To'g'ri yechim — savol matnini `bundle_v2_*` keshidan qidirish, lekin kesh o'chirilgan holatda takror navbati bo'shab qoladi. Alohida ish sifatida rejalashtirilsin. Bajarilgani: har state o'zgarishidagi **sinxron** `JSON.stringify(~250 KB)` debounce qilindi (jank manbai).

**T-10 — qolgan modallar.** `useModalA11y` hooki yaratildi va ulandi: `ConfirmDialog`, `PremiumModal`, `ObjectionModal`, `ExamDateModal` va `ModalShell` orqali 7 ta profil modali (Avatar, ConfirmDelete, ConfirmLogout, EditProfile, Password, Privacy, Repetition) — **jami 11 ta**. Ulanmagan: `TheoryModal`, `SmartBottomSheet`, `StatsDrawer`, `ProfileDrawer`, `GuideModal` va boshqa drawer'lar. Sabab: ular modal emas, sirg'aluvchi panel — fokus tutqichi ularda boshqacha ishlashi kerak va **brauzerda ko'rmasdan** ulash xavfli.

**T-7 — `customMnemonics` kalitlari.** Takrorlash kartalari va xatolar yangi (to'liq matn) xeshiga o'tkazildi. Mnemonika kalitlari **eski 100-belgilik shaklda qoldi**: kalitda faqat o'sha 100 belgi saqlangan, to'liq matn yo'q — ya'ni ularni qayta hisoblab bo'lmaydi va migratsiya foydalanuvchi yozgan izohlarni yo'qotardi. To'qnashuv oqibati bu yerda yengil (o'xshash savolda o'sha izoh ko'rinadi).

**`firestore.rules` va `storage.rules` O'ZGARTIRILMADI** — to'rt tuzatish ham faqat kod. Ya'ni «kod avval, qoidalar keyin» tartibi bu relizga taalluqli emas va emulyatorsiz sinalmagan qoida xavfi yo'q.

### ⚠️ T-1 deploydan keyingi BIR MARTALIK ta'sir

Istisno olib tashlangach **birinchi cron ishga tushishida** shu paytgacha yig'ilib qolgan, muddati o'tgan barcha to'langan obunalar bir vaqtda `isPremium: false` ga o'tadi. Bu tuzatishning maqsadi, lekin:

- bu odamlar hozir (xato tufayli) kirish huquqiga ega va **buni to'satdan yo'qotadi**;
- `/api/cron-daily` javobidagi `premiumExpired` soni nechta hisob ta'sirlanganini ko'rsatadi;
- **tavsiya:** deploydan oldin `where('isPremium','==',true)` + `premiumExpire < now` + `premiumPlan == 'paid'` bo'yicha sanab chiqing va kerak bo'lsa ularga oldindan xabar bering yoki imtiyoz muddati bering.

Muddatsiz obunalar (`premiumExpire: null`, `durationMonths: 999` — «Cheksiz Pro») **tegilmaydi**.

### Qo'shimcha ish (audit bandi emas, egasi so'ragan)

**Foydalanish qo'llanmasi to'ldirildi** — `GuideModal` 4 ta paneldan **10 taga** kengaytirildi. Ilgari boshlash, imtihon rejimi, kunlik reja, tayyorlik ko'rsatkichi, xatolar daftari, ball hisobi va oflayn ishlash umuman tushuntirilmagan edi. Mazmun kod konstantalaridan olindi (ball qiymatlari, SRS intervallari, streak muzlatishi, 35+15 tuzilma, referral summalari) — ya'ni qo'llanma ilovaning haqiqiy xatti-harakatiga mos. Matn `...a`/`...bold`/`...b` bo'laklaridan oddiy `Title`+`Body` juftligiga o'tkazildi; uz/ru/en **1297 kalitda teng**, CJK = 0.

**Hisobni o'chirish qiyinlashtirildi** — T-12 ning davomi. Ilgari bitta qizil tugma edi. Endi yirik platformalar naqshi:

| Bosqich | Nima bo'ladi |
|---|---|
| 1 | Nima yo'qolishi aniq ro'yxat bilan; faol obuna bo'lsa alohida ogohlantirish (pul qaytmasligi); muqobillar taklif qilinadi — **Chiqish** yoki **Yordam** |
| 2 | **Parolni qayta kiritish** (`reauthenticateWithCredential`) — telefon boshqa qo'lda ochiq qolsa himoya qiladi |
| 3 | Tasdiq so'zini (`O'CHIRISH` / `УДАЛИТЬ` / `DELETE`) **qo'lda yozish** — tasodifiy bosish imkonsiz |

Tozalash serverga ko'chdi: `api/notify-admin.js?action=delete-me`. Endi o'chirish **admin yo'li bilan aynan bir xil** (`purgeUser`): Auth hisobi + `users` + `userStats` + bildirishnomalar subkolleksiyasi. Server `auth_time` ni tekshiradi (10 daqiqadan eski autentifikatsiya rad etiladi) va uid'ni FAQAT tokendan oladi — boshqa odamning hisobini o'chirib bo'lmaydi.

⚠️ Google Play talabi buzilmadi: o'chirish yo'li avvalgi joyida, ochiq va to'siqsiz — faqat tasodifiy bajarilishdan himoyalangan.

---

### ⚠️ T-5 va T-7 — foydalanuvchiga ko'rinadigan xatti-harakat o'zgarishlari

**T-5.** Endi imtihon tarkibi 5 fanda (tarix, mtt, mtt_rahbar, til, kimyo) boshqacha bo'ladi — `EXAM_BLUEPRINT` taqsimoti bo'yicha. Eng sezilarlisi: **til** fanining 61-bo'limi ilgari imtihonga UMUMAN tushmasdi, endi 4 ta savol beradi (bazada u yerda 279 ta savol bor). 35+15 invarianti ikkala jadvalda ham buzilmagan edi, faqat ichki taqsimot farq qilardi.
⚠️ Qaysi jadval rasmiy spetsifikatsiyaga mos ekanini **`fan/spes/` PDF'lari** hal qiladi — `EXAM_BLUEPRINT` tanlandi, chunki u manba PDF va savol oraliqlarini hujjatlashtiradi. Deploydan oldin tasdiqlang.

**T-7.** Takrorlash kartochkalari yangi kalitga **o'zi ko'chadi** (karta savol matnini saqlaydi). Progress yo'qolmaydi — buni test qo'riqlaydi (`questionKey.test.js`: daraja saqlanadi, `dueReviewCorrectCount` to'g'ri sanaladi, yangi kartochka yaratilmaydi). Ilgari to'qnashib turgan 891 ta savol (1.98%) endi to'g'ri, alohida jadval oladi.

---

## 0. Bazaviy holat (audit boshida o'lchandi)

| Tekshiruv | Natija |
|---|---|
| `npm test` | ✅ **72/72 test o'tdi** (4 fayl, 829ms) |
| `npx eslint src/ api/ --no-warn-ignored --quiet` | ✅ **0 xato** |
| `npm run build` | ✅ **muvaffaqiyatli** (6.34s) · PWA generateSW, 82 precache entry (2.94 MB) |
| `api/` funksiyalar soni | **12/12** — Vercel Hobby chegarasida, bo'sh joy YO'Q |

---

## 1. Qamrov

### 1.1 To'liq o'qilgan

`src/context/AppContext.jsx` (1019 q.) · `src/engine/SmartQuestionEngine.js` · `src/engine/DiagnosticsEngine.js` ·
`src/data/examBlueprint.js` · `firestore.rules` (317 q.) · `src/config.js` · `src/hooks/useAdmin.js` ·
`src/services/referral.js` · `api/get-questions.js` · `src/services/registerSW.js` · `vite.config.js`

### 1.2 Nishonli qismlar bo'yicha o'qilgan

`src/pages/AdminPage.jsx` 1–960 / 2278 · `src/pages/ExamPage.jsx` 45–570, 660–700 ·
`src/pages/TestPage.jsx` 330–700 · `src/context/AuthContext.jsx` 176–360, 490–720 ·
`api/cron-daily.js` · `api/payment-webhook.js` (grep) · `src/components/OfflineIndicator.jsx` 150–215

### 1.3 KO'RILMAGAN (halol ro'yxat)

- `AdminPage.jsx` 960–2278 — asosan JSX render qismi; mantiq ko'rildi, render ko'rilmadi
- `SmartReviewPage.jsx` (38KB), `PremiumModal.jsx` (29KB), `Dashboard.jsx`, `AchievementsPage.jsx` — **umuman ochilmadi**
- `api/school.js`, `api/notify-admin.js`, `api/redeem-promo.js`, `api/check-user.js` — faqat grep darajasida
- `storage.rules`, `src/data/tracks.js`, `src/data/milestones.js`, `src/index.css` (62KB)
- **Haqiqiy telefonda jank (10-band)** — qurilma yo'q, BAJARILMADI
- Runtime'da hech narsa ishga tushirilmadi (Java yo'q → emulyator; `vite dev` → serverless yo'q)

---

## 2. Topilmalar

Belgilar: **TASDIQLANGAN (kod)** — kodda o'qib ko'rildi · **TASDIQLANGAN (o'lchov)** — skript bilan o'lchandi · **TEKSHIRISH KERAK** — runtime/env/biznes qaroriga bog'liq.

---

### 🔴 KRITIK

#### T-1. To'lagan foydalanuvchi muddat tugagach ham pullik bazaga MANGU kirish huquqini saqlaydi

**Joy:** `api/cron-daily.js:80` · `src/context/AuthContext.jsx:241` · `firestore.rules:145,172` · `api/get-questions.js:61`
**Holat:** TASDIQLANGAN (kod)
**Turi:** ⚠️ **1-band tuzatishi keltirgan YANGI muammo**

**Buzilish zanjiri:**

1. To'lov `premiumPlan: 'paid'` yozadi — `api/payment-webhook.js:283`; promo-kod ham xuddi shunday — `api/redeem-promo.js:113`.
2. `api/cron-daily.js:80`:
   ```js
   // To'langan premium — tegmaymiz
   if (data.premiumPlan === 'paid') continue;
   ```
   → server hech qachon to'langan obunani tugatmaydi.
3. Mijoz o'zi tugatishga urinadi — `AuthContext.jsx:241`:
   ```js
   await updateDoc(userRef, { isPremium: false, premiumPlan: 'expired' })
     .catch(e => console.warn('Premium expire update xatosi:', e));
   ```
   Lekin `isPremium` va `premiumPlan` endi `protectedUserFields()` ichida (`firestore.rules:145`), `users` update qoidasi esa (`:172`) egaga bu maydonlarga tegishni taqiqlaydi → **yozuv rad etiladi**, xato `.catch` bilan jimgina yutiladi.
4. Firestore'da `isPremium: true` abadiy qoladi:
   - `firestore.rules:33` `hasContentAccess()` → `u.isPremium == true` → **RUXSAT**
   - `api/get-questions.js:61` → `isPremium === true` → **403 bermaydi**

**Tasdiq:** `isPremium: false` yozadigan yagona server yo'li — `cron-daily.js:88` — va u aynan shu holatni chetlab o'tadi. Grep bilan tekshirildi: boshqa server yo'li mavjud emas.

**Ekspluatatsiya:** eng arzon oylik tarifni bir marta to'lang (30 000 so'm). Bir oydan keyin UI qulflanadi (lokal `isPremium=false`), lekin `questions` kolleksiyasi rules bo'yicha ochiq qoladi. `localforage` dagi `version_v2_<fan>` kalitini o'chirish yoki konsoldan to'g'ridan-to'g'ri query kifoya → ~45 000 savollik butun baza qaytadi.

**Takrorlash qadamlari:**
1. `users/{uid}` da: `premiumPlan:'paid'`, `premiumExpire` = kechagi sana, `isPremium:true`
2. `/api/cron-daily` ni to'g'ri secret bilan chaqiring
3. `users/{uid}` ni o'qing → `isPremium` hamon `true`
4. Shu hisob bilan: `getDocs(query(collection(db,'questions'), where('category','==','chqbt')))` → savollar keladi

**Tuzatish:** `api/cron-daily.js:80` dagi `premiumPlan === 'paid'` istisnosini olib tashlash.
**Mavjud foydalanuvchini buzadimi — YO'Q:** yuqoridagi `if (data.premiumExpire)` guard'i saqlanadi, muddatsiz obunada (`durationMonths: 999` → `premiumExpire: null`) shart bajarilmaydi. Bu `AuthContext.jsx:235` dagi izoh («to'lov, promo va admin — barchasi uchun bir xil») va loyiha modeli bilan ham mos.

> ⚠️ Rules tomonida `premiumExpire` ni tekshirish ISHLAMAYDI: u ISO **satr** sifatida saqlanadi (`payment-webhook.js:282`, `redeem-promo.js:112`), Firestore rules esa satrni timestamp'ga aylantira olmaydi. Yechim faqat server tomonida bo'lishi mumkin.

---

### 🟠 YUQORI

#### T-2. Hisob almashganda boshqa foydalanuvchining statistikasi yuklanadi va uning hujjatiga yoziladi

**Joy:** `src/context/AppContext.jsx:459-498`
**Holat:** TASDIQLANGAN (kod)

`loadUserStats()` async, lekin **uid guard ham, effect cleanup ham yo'q**. `getDoc` javobi kelganda closure'dagi `user.uid` — eski qiymat.

A chiqib B kirsa va A ning so'rovi hali yo'lda bo'lsa: A ning javobi kech kelib `setState(A ma'lumoti)` qiladi → 2-effekt (`:512-535`) uni `userStats/B` ga va `localStorage.iqro_state_B` ga yozadi.

**Zarar:** B ning ball/streak/readiness/xatolari A niki bilan almashadi. `mergeCloudAndLocal` monoton `max()` qilgani uchun (`:200-201`) **qaytarib bo'lmaydi** — B ning haqiqiy raqamlari A nikidan past bo'lsa, ular butunlay yo'qoladi.

**Ekspluatatsiya:** hujumkor emas — umumiy qurilma (maktabda bitta telefon) yoki sekin tarmoq. Maxfiylik jihati ham bor: B, A ning xatolar daftarini va statistikasini ko'radi.

**Takrorlash:** DevTools → Network → Slow 3G → A bilan kiring → splash paytida darhol chiqing → B bilan kiring → B ning dashboard'ida A ning raqamlari.

**Tuzatish:** `loadUserStats` boshida uid ni ushlab, har `setState` dan oldin tekshirish:
```js
const uid = user.uid;
// ... har setState oldidan:
if (userRef.current?.uid !== uid) return;
```
yoki effektga `let cancelled = false` + cleanup.

---

#### T-3. AdminPage JSON importidagi dublikat filtri jimgina ISHLAMAY qolgan

**Joy:** `src/pages/AdminPage.jsx:297` (va `:441-460`)
**Holat:** TASDIQLANGAN (kod)
**Turi:** ⚠️ **2-band / kvota tuzatishi keltirgan YANGI muammo**

`processJsonQuestions` dublikatni lokal state'dan tekshiradi:
```js
// Use already-loaded questions state — avoids re-fetching 6000+ docs
const existingSet = new Set(questions.map(q => normalize(q.q)));
```
Lekin `loadAllQuestions()` (`:449`) **ataylab qo'lga o'tkazilgan** — kvota tejash uchun (o'sha faylning `:441-448` izohi buni tushuntiradi).

Agar admin «savollarni yuklash» tugmasini bosmasdan JSON tashlasa → `questions = []` → `existingSet` bo'sh → **barcha savol «yangi» deb 400 talik batch bilan bazaga qo'shiladi**. `:296` dagi izoh hamon «allaqachon yuklangan» deb turibdi, lekin buni hech narsa kafolatlamaydi.

**Zarar:** 45 000 lik bazaga minglab dublikat; `bump-questions-version` bilan hamma foydalanuvchiga tarqaladi; orqaga qaytarish faqat `analyzeDuplicates` (T-19 ga qarang — u ham og'ir).

**Takrorlash:** Admin → «Savollar» tab → yuklash tugmasini BOSMANG → bazada allaqachon bor 100 ta savolli JSON tashlang → 100 ta dublikat qo'shiladi.

**Tuzatish:** import boshida guard:
```js
if (questions.length === 0) {
  showToast('Avval savollar bazasini yuklang (dublikat tekshiruvi uchun)', 'error');
  return;
}
```
(yoki importdan oldin `await loadAllQuestions()`).

---

#### T-4. Firestore o'qish hajmi — O'LCHANDI

**Joy:** `src/pages/TestPage.jsx:439-443` · `src/pages/ExamPage.jsx:364` · `api/get-questions.js:92`
**Holat:** TASDIQLANGAN (o'lchov)

Bir foydalanuvchi bir fanni «sovuq» ochganda o'qiladigan hujjatlar soni (zaxira nusxalardan o'lchandi):

| Fan | Hujjat o'qish | Yuklab olish |
|---|---:|---:|
| tarix | **3 744** | 2.95 MB |
| til | 3 478 | 2.56 MB |
| info | 3 410 | 2.32 MB |
| rus_tili | 3 001 | 1.67 MB |
| art | 2 895 | 2.11 MB |
| mtt_psixolog | 2 876 | 2.41 MB |
| mtt | 2 872 | 2.41 MB |
| mtt_logoped | 2 850 | 2.41 MB |
| geografiya | 2 842 | 2.14 MB |
| mtt_rahbar | 2 842 | 2.32 MB |
| biologiya | 2 806 | 2.14 MB |
| boshlangich | 2 799 | 1.98 MB |
| kimyo | 2 597 | 1.46 MB |
| chqbt | 2 596 | 2.09 MB |
| sport | 2 430 | 1.83 MB |
| ingliz | 906 | 0.55 MB |
| **JAMI (16 fan)** | **44 944** | **33.36 MB** |

Qo'shimcha o'qishlar: `settings/version` (1, TestPage mount'iga) + `/api/get-questions` ichida `users/{uid}` va `settings/version` (2) + rules `hasContentAccess()` ichidagi `get()` — TestPage har `topicId` uchun alohida query qilgani uchun **7–10 marta**.

**Muhim:** `settings/version.urls` ataylab bo'sh (loyiha qoidasi) → `api/get-questions.js:92` **DOIM 404 qaytaradi**. Ya'ni har sovuq yuklashda:
serverless funksiya chaqiriladi → `verifyIdToken` → 2 ta Firestore o'qish → **404**. Hech qachon muvaffaqiyat yo'q. Yagona haqiqiy yo'l — Firestore zaxirasi.

**Sovuq yuklash qachon sodir bo'ladi:**
- yangi foydalanuvchi (1 marta)
- **har `bump-questions-version.mjs` da — HAMMA foydalanuvchi, har fani uchun**
- brauzer xotirasi tozalansa / PWA qayta o'rnatilsa
- **iOS Safari ITP:** 7 kun ishlatilmasa IndexedDB o'chadi → iOS foydalanuvchilarda ~haftada bir marta

**Miqyos:** Spark bepul reja = 50 000 o'qish/kun → **kuniga ~17 ta sovuq yuklash**. 1 000 foydalanuvchida bitta versiya bump = ~2.8 mln o'qish.

**Tuzatish (kichikdan kattaga):**
1. **Arzon:** TestPage'ni ExamPage kabi bitta `where('category','==',cat)` query'ga o'tkazish — hujjat soni bir xil qoladi, lekin rules `get()` 7–10 martadan **1 martaga** tushadi va tarmoq so'rovlari kamayadi.
2. **Asosiy:** `api/get-questions.js` ni Firestore'dan o'qib javobni proksi qiladigan qilish — o'qish bir marta **serverda** bo'ladi, mijozda 0. Yangi endpoint kerak emas.

> ⚠️ **TEKSHIRISH KERAK:** Firebase loyihasi Spark'dami yoki Blaze'da — buni kod ko'rsatmaydi. Blaze'da bu $ jihatdan arzon (~$1.7 / 2.8 mln o'qish), Spark'da esa ilova butun kun davomida hamma uchun o'ladi.

---

### 🟡 O'RTA

#### T-5. Rasmiy spetsifikatsiyaning IKKI xil jadvali bir-biriga mos emas

**Joy:** `src/data/examBlueprint.js:36` (`EXAM_BLUEPRINT`) vs `src/pages/ExamPage.jsx:59` (`SUBJECT_BLUEPRINTS`)
**Holat:** TASDIQLANGAN (skript bilan tekshirildi)

**Avval yaxshi xabar:** 35 (mutaxassislik) + 15 (kasb standarti + ped. mahorat) invarianti **16 fanning hammasida, ikkala jadvalda ham buzilmagan** ✅.

Lekin bo'limlar ICHIDAGI taqsimot 5 fanda farq qiladi:

| Fan | Farqlar (imtihon / diagnostika) |
|---|---|
| tarix | t19: **5 / 9** · t20: **7 / 3** |
| mtt | t48: 5/6 · t49: 5/3 · t50: 5/3 · t51: 5/6 · t53: 5/7 |
| mtt_rahbar | t63: 5/7 · t64: 5/3 · t65: 5/3 · t66: 5/7 · t68: 5/3 · t69: 5/7 |
| **til** | t56: 8/4 · t57: 7/4 · t58: 5/7 · t59: 8/7 · t60: 2/4 · **t61: 0 / 4** |
| kimyo | t116: 5/6 · t117: 7/6 |

**Eng og'ir holat — til, t61:** `SUBJECT_BLUEPRINTS` unga **0** savol beradi (`ExamPage.jsx:456`: `if (countNeeded === 0) return;`), `EXAM_BLUEPRINT` esa **4** (= tayyorlik bahosining 8%).

Natija: `DiagnosticsEngine` «bu bo'lim imtihoningizning 8%i» deydi, `buildTrajectory` unga qamrov qadami qo'yadi — imtihon simulyatori esa u yerdan **bironta ham savol bermaydi**. Foydalanuvchi hech qachon yopolmaydigan teshik.

**Ta'sir doirasi:** `readiness` bulutga yoziladi va **maktab hisobotida** ko'rsatiladi (`AppContext.jsx:761`), ya'ni B2B mijoz ko'radigan raqam ham shu.

**Tuzatish:** `SUBJECT_BLUEPRINTS` ni o'chirib, `ExamPage` ni `EXAM_BLUEPRINT` dan o'qitish (yagona manba printsipi).
**TEKSHIRISH KERAK:** qaysi jadval to'g'ri — buni `fan/spes/` papkasidagi rasmiy PDF'lar hal qiladi, kod emas.

---

#### T-6. `userStats` yozuv amplifikatsiyasi — O'LCHANDI

**Joy:** `src/context/AppContext.jsx:519` · `src/engine/SmartQuestionEngine.js:459`
**Holat:** TASDIQLANGAN (o'lchov)

`spacedCards` har kartada BUTUN savol obyektini saqlaydi:
```js
const newCard = { ...q, qHash, q: q.q, opts: q.opts, correct: q.correct, ... };
// ...
updatedSpacedCards: Array.from(updatedCards.values()).slice(-200)
```

O'lchov (haqiqiy savol ma'lumotlari asosida):

| Komponent | Hajm |
|---|---:|
| `spacedCards` (200 ta, chegara) | **210 KB** |
| `mistakes` (1 fan uchun 50 ta) | 24 KB |

| Ishlatilgan fan soni | `userStats` hujjati | Firestore 1MB chegarasining |
|---:|---:|---:|
| 1 | 249 KB | 24% |
| 2 | 273 KB | 27% |
| 4 | 321 KB | 31% |
| 8 | 418 KB | 41% |
| 16 | 611 KB | 60% |

**1MB chegarasiga YETMAYDI** — dastlabki farazim (hujjat chegaradan oshib `setDoc` yiqiladi) **noto'g'ri edi**, o'lchov shuni ko'rsatdi. Haqiqiy zarar boshqa:

- Har debounce'da (3 soniya) Firestore'ga **~250 KB** yoziladi
- Har kirishda **~250 KB** yuklab olinadi
- `AppContext.jsx:519` — har state o'zgarishida `JSON.stringify(~250 KB)` **sinxron**, asosiy oqimda bajariladi → arzon Android'da har javobda seziladigan pauza

**10-bandga (jank) bevosita aloqador — lekin telefonda o'lchanmagan.**

**Tuzatish:** kartada faqat identifikator saqlansin:
```js
{ qHash, topicId, level, correctStreak, difficulty, lastReview, nextReview, lastResult }
```
Savol matni allaqachon `bundle_v2_*` keshida bor va `smartSort` uni `spacedMap.get(qHash)` orqali topadi. Hajm ~210 KB dan ~20 KB ga tushadi.
**Mavjud ma'lumotni buzadimi:** yo'q, eski kartalarda ortiqcha maydonlar qoladi va o'z-o'zidan siqiladi; `updateSpacedCard` `{...card}` qilgani uchun migratsiya kerak emas.

---

#### T-7. `qHash` = savolning birinchi 100 belgisi → SRS va xatolar identifikatori to'qnashadi

**Joy:** `src/engine/SmartQuestionEngine.js:198, 238, 354`
**Holat:** TASDIQLANGAN (kod)

```js
const qHash = (q.q || '').substring(0, 100);
```

45 000 savol ichida bir xil boshlanadigan savollar («Quyidagi keltirilgan javoblardan qaysi biri...», «Qaysi javobda ... to'g'ri ko'rsatilgan?») bir xil `qHash` oladi.

**Natija:** A savoliga javob berish B savolini «takrorlandi» deb belgilaydi (`spacedMap`), xatolar daftarida bittasi ikkinchisini bosadi (`mistakeSet`), ball hisobida (`dueReviewCorrectCount`) noto'g'ri natija.

**Nomuvofiqlik:** `mergeCloudAndLocal` xatolarni **to'liq** `m.question` bo'yicha dedup qiladi (`AppContext.jsx:216`), `mistakeSet` esa **100 belgi** bo'yicha — ikki xil identifikator.

**Tuzatish:** Firestore `doc.id` dan foydalanish (u `rawList` da allaqachon bor — `TestPage.jsx:445`) yoki to'liq matn xeshi (`cyrb53`).
**Diqqat:** mavjud `spacedCards` eski `qHash` bilan yozilgan → migratsiya rejasi kerak (yoki ikkala kalitni bir muddat qo'llab-quvvatlash).

---

#### T-8. AdminPage: chegarasiz real-time tinglovchilar va butun `users` kolleksiyasini o'qish

**Joy:** `src/pages/AdminPage.jsx:190, 405, 420, 435`
**Holat:** TASDIQLANGAN (kod)

| Joy | Nima | Chegara |
|---|---|---|
| `:190` | `onSnapshot(notifications, orderBy('date','desc'))` | ❌ `limit()` yo'q |
| `:405` | `onSnapshot(objections, orderBy('timestamp','desc'))` | ❌ `limit()` yo'q |
| `:420` | `onSnapshot(questionRequests, orderBy(...))` | ❌ `limit()` yo'q |
| `:435` | `getDocs(collection(db,'users'))` | ❌ butun kolleksiya |

Birinchi uchtasi **tab'dan qat'i nazar**, sahifa ochilishi bilan ishga tushadi va ochiq turgan vaqt davomida real-time yangilanadi. Savollar uchun qo'yilgan «qo'lda yuklash» himoyasi (`:441-448`) bu to'rttasiga qo'llanmagan.

Qo'shimcha: `:519` va `:546` — har referral amalidan keyin **butun `referrals` kolleksiyasi** qayta o'qiladi.

**Tuzatish:** uchala listener'ga `limit(100)`; `users` uchun sahifalash yoki qidiruv bo'yicha query; referral amallaridan keyin lokal state'ni yangilash (savollar uchun allaqachon shunday qilingan — `:350`, `:889`).

---

#### T-9. Admin referral bonusini takroran bera oladi (idempotentlik yo'q)

**Joy:** `src/pages/AdminPage.jsx:505-516`
**Holat:** TASDIQLANGAN (kod)

```js
await updateDoc(doc(db, 'referrals', refId), { status:'paid', bonusPaid:true, ... });
if (referrerId) {
  await updateDoc(doc(db, 'users', referrerId), { referralBonus: increment(15000) });
}
```

`bonusPaid` **oldindan tekshirilmaydi**. Allaqachon to'langan referralda tugma qayta bosilsa yana 15 000 qo'shiladi. `api/payment-webhook.js` ham bonus beradi → qo'sh hisoblash mumkin.

**Tuzatish:** `runTransaction` ichida `if (snap.data().bonusPaid) return;` — `api/redeem-promo.js:67` dagi naqsh bo'yicha.

**~~Yon topilma~~ — BEKOR QILINDI (mening xatoyim):** dastlab `updateDoc(doc(db,'referrals', ...), { freeExpire: null })` ni "ma'nosiz yozuv" deb belgilagandim, chunki `services/referral.js:24-33` dagi sxema izohida `freeExpire` yo'q. Tekshirganda ma'lum bo'ldiki, u referral hujjatidan **haqiqatan o'qiladi** — `AdminPage.jsx:2007, 2048` va `ReferralPage.jsx:325`. Ya'ni maydon qonuniy, faqat sxema izohi to'liq emas. Yozuv o'z joyida qoldirildi.

---

#### T-10. Foydalanuvchanlik (a11y): modallarning HECH BIRIDA klaviatura qo'llab-quvvatlanmagan

**Joy:** butun `src/components`, `src/pages`
**Holat:** TASDIQLANGAN (grep)

| Tekshiruv | Natija |
|---|---|
| `Escape` bilan yopish | **butun `src/` da 0 ta joy** |
| `role="dialog"` / `aria-modal` | ~28 ta modal/drawer/sheet komponentdan **2 tasida** (ular ham boshqa maqsadda) |
| Fokus tutqichi (focus trap) | topilmadi |
| Yopilgach fokusni qaytarish | topilmadi |

Ta'sir qiladi: `PremiumModal`, `ConfirmDialog`, `ProfileDrawer`, `TheoryModal`, `ExamDateModal`, `ObjectionModal`, `PasswordModal`, `AvatarPickerModal`, `SmartBottomSheet`, `StatsDrawer` va boshqalar.

**Natija:** faqat sichqoncha/teginish bilan boshqariladi; screen reader modal ochilganini e'lon qilmaydi; `Tab` fokusi fon sahifaga «qochib ketadi».

**Tuzatish:** bitta umumiy `useModalA11y(ref, onClose)` hook — `Escape` tinglovchisi, `role="dialog" aria-modal="true"`, fokusni modalga ko'chirish va yopilgach qaytarish. Barcha modallar bitta joydan foydalanadi.

---

#### T-11. PWA yangilanish so'rovi bir marta o'tkazib yuborilsa qaytmaydi

**Joy:** `src/components/OfflineIndicator.jsx:161-193`
**Holat:** TASDIQLANGAN (kod)

Faqat `updatefound` hodisasiga obuna bo'lingan. Agar yangi SW **oldingi sessiyada** `waiting` holatiga o'tgan bo'lsa, sahifa yuklanganda `updatefound` **otilmaydi**, `registration.waiting` esa hech qayerda tekshirilmaydi → yangilash tugmasi ko'rsatilmaydi.

Davriy `registration.update()` chaqiruvi ham yo'q → uzoq ochiq turgan PWA/TWA yangi deployni umuman sezmaydi.

**Yumshatuvchi omil:** ilova butunlay yopilganda `waiting` SW o'zi faollashadi (`skipWaiting: false` + `clientsClaim: true`), shuning uchun bu **abadiy qotib qolish emas** — yangilanish keyingi sovuq ishga tushirishda keladi.

**Ijobiy:** `dist/sw.js` da `SKIP_WAITING` tinglovchisi bor ✅, `navigateFallbackDenylist: [/^\/api/]` to'g'ri ✅, `injectRegister: null` + qo'lda ro'yxatga olish ✅.

**Tuzatish:**
```js
navigator.serviceWorker.ready.then(reg => {
  if (reg.waiting) { setSwWorker(reg.waiting); setShowUpdate(true); }
  reg.addEventListener('updatefound', ...);
  setInterval(() => reg.update(), 60 * 60 * 1000);
});
```

---

#### T-12. «Hisobni o'chirish» haqiqatda hisobni o'chirmaydi (Google Play muvofiqligi)

**Joy:** `src/pages/AdminPage.jsx:675-687`
**Holat:** TASDIQLANGAN (kod)

`handleDeleteUser` faqat ikkita hujjatni o'chiradi: `users/{uid}` va `userStats/{uid}`.

**O'chirilmaydi:** Firebase **Auth hisobi** (foydalanuvchi kirishda davom etadi) · `users/{uid}/notifications` subkolleksiyasi · `referrals` dagi yozuvlar · `objections` · `questionRequests` · `errorLogs` dagi uid · Storage'dagi fayllar.

**Natija:** `users/{uid}` yo'q bo'lgani uchun `hasContentAccess()` (`firestore.rules:32`) `get()` natijasi `null` bo'ladi va baholash xatoga uchraydi → ruxsat berilmaydi. Foydalanuvchi kira oladi, lekin hamma joyda «obuna kerak» ko'radi — **zombi hisob**.

Google Play «Data deletion» talabi hisobning o'zini ham o'chirishni ko'zda tutadi (`PLAY_LISTING_VA_DATA_SAFETY.md`).

**Tuzatish:** o'chirishni Admin SDK ga ko'chirish — **yangi endpoint kerak emas**, `api/notify-admin.js` ga `action=delete-user` qo'shish (naqsh `action=delete-request` bilan bir xil): `getAuth().deleteUser(uid)` + subkolleksiyalarni rekursiv o'chirish.

---

#### T-13. Play build'da to'lov operatori havolasi gate qilinmagan

**Joy:** `src/config.js:13` · `ProfileDrawer.jsx:206` · `SettingsPage.jsx:378` · `AboutPage.jsx:59` · `SchoolPage.jsx:372`
**Holat:** TEKSHIRISH KERAK (biznes qarori)

`isPlayBuild()` faqat 4 joyda qo'llanadi: `PremiumModal.jsx:154`, `PremiumPage.jsx:28`, `Dashboard.jsx:428`, `FreeMonthBanner.jsx:27`.

`SUPPORT_URL` esa hech qayerda gate qilinmagan, `config.js:13` dagi izohda u shunday ta'riflangan:
> `// Shaxsiy murojaat (kanal DM) — support, to'lov operatori, huquqiy murojaatlar`

Agar shu Telegram kanali orqali haqiqatan obuna sotilsa, bu Play'ning tashqi to'lovga yo'naltirish taqiqiga tushadi (A variant strategiyasi buzuladi). Agar u faqat texnik yordam bo'lsa — muammo yo'q.

**Kod bu savolga javob bera olmaydi.** `SchoolPage:372` (B2B paket so'rovi) odatda Play siyosatida ruxsat etilgan.

---

### 🔵 PAST

**T-14. `/api/send-result` mavjud emas** — `src/pages/TestPage.jsx:684`.
`api/` dagi 12 fayl bilan solishtirdim: bunday endpoint yo'q. `fetch` 404 da reject qilmaydi, javob esa o'qilmaydi → xato ko'rinmaydi. Ya'ni «natijani Telegramga yuborish» funksiyasi **hech qachon ishlamagan**, har test yakunida bekorga so'rov ketadi. Tuzatish: `notify-admin.js` ga `action=result` qo'shish yoki chaqiruvni olib tashlash. (12 funksiya chegarasining bevosita oqibati.)

**T-15. `mergeCloudAndLocal` `spacedCards` va `customMnemonics` ni birlashtirmaydi** — `src/context/AppContext.jsx:194-351`. `merged = {...cloud}` va bu ikki maydon birlashtirish ro'yxatiga kirmagan → bulut g'olib. Oflayn sessiyada olingan SRS progressi, hisoblagichlar `max()` bilan saqlanib qolgani holda, yo'qoladi — nomuvofiq xatti-harakat.

**T-16. Importda jim ma'lumot buzilishi** — `src/pages/AdminPage.jsx:308-316`. `parseInt(q.topicId) || 0` → noto'g'ri/yo'q `topicId` jimgina **0 (chqbt)** ga tushadi. `correct` indeksining `opts` uzunligidan oshmasligi tekshirilmaydi → javobi bo'lmagan savol. Rules rad etsa 400 talik batch yiqiladi, lekin **oldingi batch'lar allaqachon yozilgan** (qisman import, orqaga qaytarish yo'q).

**T-17. Context qiymati memoizatsiya qilinmagan** — `src/context/AppContext.jsx:1005`. `value={{...}}` har render'da yangi obyekt, `updateState` `useCallback`siz → AppProvider har state o'zgarishida BARCHA iste'molchilarni qayta render qiladi (Header, BottomNav, Sidebar, joriy sahifa). **10-bandga aloqador.**

**T-18. `smartSort` O(n²) + to'liq klonlash** — `src/engine/SmartQuestionEngine.js:196, 272-285`. `batchSize = rawList.length` (`TestPage.jsx:511`) → ~2 900 savol to'liq klonlanadi (`{...q}`), keyin `shift()` bilan bo'shatiladi (massiv boshidan o'chirish O(n)). Har test boshlanishida, asosiy oqimda. **10-bandga aloqador.**

**T-19. `analyzeDuplicates` xotira portlashi** — `src/pages/AdminPage.jsx:801-871`. 45 000 savol uchun 45 000 ta trigram `Set` quriladi (har biri ~100 satr) → yuzlab MB, asosiy oqimda (`setTimeout 50ms` yordam bermaydi). Tab qulashi mumkin. Faqat admin.

**T-20. Firestore uchun runtimeCaching qoidasi amalda o'lik** — `vite.config.js:100-108`. Firestore Web SDK POST (WebChannel/gRPC-Web) ishlatadi, Workbox esa sukut bo'yicha faqat GET so'rovlarini ushlaydi → `StaleWhileRevalidate` hech qachon qo'llanmaydi. Zarar yo'q, lekin konfiguratsiya adashtiradi (Firestore o'z persistent kesh qatlamiga ega).

**T-21. Imtihon sessiyasi `uid`siz tiklanadi** — `src/pages/ExamPage.jsx:219`. `(!s.uid || s.uid === user?.uid)` → `uid: null` bilan saqlangan sessiyani (masalan, `user` bir lahza `null` bo'lganda yozilgan) **istalgan hisob** tiklay oladi. Umumiy qurilmada boshqa odamning imtihoni ochiladi.

**T-22. `batchCommitResults` React'ning kafolatlanmagan optimizatsiyasiga tayanadi** — `src/context/AppContext.jsx:581, 811-813`. `snapshot` `setState` updater'i ichida to'ldiriladi va updater'dan KEYIN o'qiladi. Bu faqat React'ning «eager state» yo'li ishlaganda (AppProvider fiber'ida kutilayotgan yangilanish bo'lmasa) ishlaydi. Aks holda `snapshot` `null` qoladi → `earnedPoints: 0` ko'rsatiladi, yutuq bildirishnomalari yozilmaydi, darhol saqlash bo'lmaydi (3 soniyalik debounce qutqaradi).
Hozirgi chaqiruv joylarida (`TestPage.jsx:673`, `ExamPage.jsx:671`) AppProvider'ga oldindan `setState` yo'q, shuning uchun **amalda ishlaydi** — lekin bu tasodifiy. **TEKSHIRISH KERAK (runtime).**

---

## 3. Oldingi audit tuzatishlarining regressiya holati

| Band | Tuzatish | Holat |
|---|---|---|
| 3 | cron deny-by-default (`verifySecret`) | ✅ **ishlaydi** — `cron-daily.js:55` |
| 4 | `CLICK_SECRET_KEY` bo'sh tekshiruvi | ✅ kod joyida (runtime sinalmagan) |
| 7 | `deletionRequests` create yopildi | ✅ **ishlaydi** — `DeleteAccountPage.jsx:51` → `api/notify-admin?action=delete-request` |
| 13 | `iqro_cached_user` → admin UI | ✅ **ishlaydi** — kesh `_firebaseUser`siz qo'lda yig'iladi (`AuthContext.jsx:321`, `:687`), `JSON.stringify` orqali sizib chiqmaydi |
| 15 | `redemptions` subkolleksiyasi | ✅ rules joyida |
| 17 | `admin-publish` POST + header | ✅ |
| 18 | `safeEqual` doimiy vaqt | ✅ testlar bilan qoplangan |
| 22 | ErrorBoundary tiklanishi | ✅ |
| 23 | Avtotestlar | ✅ 72 test o'tadi |
| 2 | Savol bazasi gating | ⚠️ rules joyida, **lekin T-1 uni chetlab o'tadi** |
| 1 | Himoyalangan maydonlar | ⚠️ ishlaydi, **lekin T-1 ni keltirib chiqardi** |
| — | Kvota tejash (qo'lda yuklash) | ⚠️ ishlaydi, **lekin T-3 ni keltirib chiqardi** |

**Mijoz yozuvlari rules bilan solishtirildi** (`SettingsPage:264`, `ProfileDrawer:167`, `OnboardingPage:361`, `studyContract:146`, `push.js:87`, `ExamDateModal:60`) — hech biri himoyalangan maydonlarga tegmaydi ✅. `SchoolsTab:138,204` himoyalangan maydonlarga yozadi, lekin u faqat platforma admini uchun (`isAdmin()` yo'li bilan o'tadi) ✅.

---

## 4. Yangi test-case'lar

**TC-N01 — Muddati o'tgan to'lov (T-1)** 🔴
Qadamlar: `premiumPlan:'paid'`, `premiumExpire`=kecha, `isPremium:true` → `/api/cron-daily` → `users/{uid}` ni o'qing.
Kutilgan: `isPremium:false`. **Hozirgi natija:** `isPremium:true`.
Chegara: `premiumExpire:null` (muddatsiz obuna) → **tegilmasligi SHART** (regressiya testi).

**TC-N02 — Hisob almashish poygasi (T-2)**
Qadamlar: Slow 3G → A bilan kiring → 1 soniya ichida chiqing → B bilan kiring.
Kutilgan: B o'z statistikasini ko'radi.
Chegara: A ning `totalScore` qiymati `userStats/B` ga yozilmasligi SHART.

**TC-N03 — Import dedup (T-3)**
Qadamlar: Admin → Savollar tab → «yuklash» BOSMANG → bazada bor 100 ta savolli JSON tashlang.
Kutilgan: «Barcha savollar allaqachon mavjud». **Hozirgi natija:** 100 ta dublikat qo'shiladi.
Chegara: yuklash tugmasi bosilgandan keyin — to'g'ri ishlaydi.

**TC-N04 — Sovuq yuklash hajmi (T-4)**
Qadamlar: DevTools → Application → IndexedDB tozalash → Network → `/test` oching.
Kutilgan: o'lchash — tarix uchun ~3 744 hujjat / ~3 MB.
Chegara: `bump-questions-version.mjs` dan keyin ham xuddi shu takrorlanadi.

**TC-N05 — til fani, t61 bo'limi (T-5)**
Qadamlar: fan = til → 50 savollik imtihon → savollarning `topicId` larini sanang.
Kutilgan: t61 dan 4 ta. **Hozirgi natija:** 0 ta, lekin `/analysis` da t61 og'irligi 8%.

**TC-N06 — Klaviatura va screen reader (T-10)**
Qadamlar: PremiumModal oching → `Esc` bosing → `Tab` ni 20 marta bosing.
Kutilgan: Esc yopadi; fokus modal ichida aylanadi. **Hozirgi natija:** ikkalasi ham yo'q.

**TC-N07 — PWA yangilanishi (T-11)**
Qadamlar: yangi versiya deploy → ilovani oching (banner chiqadi) → **bosmasdan** yoping → qayta oching.
Kutilgan: banner qayta chiqadi. **Hozirgi natija:** chiqmaydi (`registration.waiting` tekshirilmaydi).

**TC-N08 — Hisobni o'chirish (T-12)**
Qadamlar: Admin → foydalanuvchini o'chiring → o'sha telefon+parol bilan kiring.
Kutilgan: kirish imkonsiz. **Hozirgi natija:** kiradi, lekin hamma joyda paywall (zombi hisob).

---

## 5. QA checklisti (qo'lda bajariladigan)

### Bosqich 0 — Bloklovchi (T-1 tuzatilgunicha relizga chiqmang)
- [ ] To'langan obuna muddati tugagach `isPremium:false` bo'ladimi (TC-N01)
- [ ] Muddatsiz obuna (`premiumExpire:null`) tegilmay qoladimi — **regressiya**
- [ ] Muddati o'tgan hisob bilan `questions` query → `permission-denied`
- [ ] Promo-kod bilan berilgan muddat ham tugaydimi (`redeem-promo.js:113` ham `'paid'` yozadi)

### Bosqich 1 — Ma'lumot butunligi
- [ ] Ikki hisob bilan tez almashish → statistika aralashmaydi (TC-N02)
- [ ] Admin: savollarni yuklamasdan JSON import → to'siladi (TC-N03)
- [ ] Referral «To'landi» tugmasini 2 marta bosish → bonus bir marta (T-9)
- [ ] `resetStats` dan keyin boshqa qurilmadagi eski zaxira statistikani tiklamaydi (`resetAt` guard)

### Bosqich 2 — Kvota va xarajat
- [ ] **Firebase rejasi Spark yoki Blaze — aniqlang** (T-4 ning og'irligi shunga bog'liq)
- [ ] `bump-questions-version` dan keyin 24 soat Firestore o'qish grafigini kuzating
- [ ] Admin panelini 10 daqiqa ochiq qoldirib listener trafigini o'lchang (T-8)
- [ ] `/api/get-questions` 404 ekanini tasdiqlang (`urls` bo'shligi kutilgan holat)

### Bosqich 3 — Imtihon to'g'riligi
- [ ] 16 fanning har birida 50 savol; 1–35 mutaxassislik, 36–50 kasb standarti + ped. mahorat
- [ ] til fanida t61 bo'limidan savol tushadimi (TC-N05)
- [ ] `/analysis` dagi bo'lim og'irliklari imtihondagi savollar soniga mos keladimi (T-5)
- [ ] Imtihon o'rtasida ilovani yopish → «Davom etish» ishlaydi; boshqa hisob bilan tiklanmaydi (T-21)

### Bosqich 4 — PWA va a11y
- [ ] Yangilanish banneri o'tkazib yuborilgach qayta chiqadimi (TC-N07)
- [ ] Barcha modallar `Esc` bilan yopiladimi (TC-N06)
- [ ] Klaviatura bilan to'liq navigatsiya; screen reader modalni e'lon qiladimi

### Bosqich 5 — Qurilmada (bu mashinada BAJARIB BO'LMAYDI)
- [ ] `#perf` overlay: test paytida har javobda jank (T-6, T-17, T-18 sabab bo'lishi mumkin)
- [ ] iOS Safari: 7 kun ishlatmaslikdan keyin IndexedDB o'chishi va qayta yuklash hajmi
- [ ] TWA `?play=1`: Support havolasi ko'rinadimi, u to'lovga olib boradimi (T-13)

---

## 6. Nima TEKSHIRILMADI va nima uchun

| Nima | Sabab |
|---|---|
| `firestore.rules` / `storage.rules` **funksional** semantikasi | Java o'rnatilmagan → Firestore emulyatori ishga tushmaydi. Qoidalar faqat o'qib chiqildi |
| `/api/*` endpointlarining runtime xatti-harakati | `vite dev` serverless funksiyalarni ishga tushirmaydi (loyiha qoidasi 5) |
| Env o'zgaruvchilari (`CLICK_SECRET_KEY`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT`…) | Vercel muhiti ko'rinmaydi. `/api/health` → `env: "ok"` bilan tasdiqlang |
| Firebase tarif rejasi (Spark/Blaze) va real kvota iste'moli | Kodda yo'q. **T-4 ning og'irligi to'liq shunga bog'liq** |
| Haqiqiy telefonda jank (10-band) | Qurilma yo'q. T-6/T-17/T-18 sabab bo'lishi **mumkin**, lekin o'lchanmagan — sabab-oqibat isbotlanmagan |
| Real Click to'lovi (uchidan uchiga) | Pul talab qiladi; oldingi hisobotda ham «hali sinalmagan» |
| i18n **tarjima sifati** va uzun matnda layout buzilishi | Faqat **struktura** tekshirildi (pastga qarang) |
| `SmartReviewPage`, `PremiumModal`, `Dashboard`, `AchievementsPage` | Qamrov/vaqt — ochilmadi |
| `AdminPage.jsx` 960–2278 (render qismi) | Mantiq qismi ko'rildi, JSX ko'rilmadi |
| `storage.rules` | Ochilmadi |

### i18n — tekshirildi va TOZA ✅

| Tekshiruv | Natija |
|---|---|
| Kalitlar soni | uz **1269** · ru **1269** · en **1269** |
| uz da bor, ru/en da yo'q | **0** |
| ru/en da ortiqcha | **0** |
| Massiv kalitlar | **20 ta** |
| Uzunligi mos kelmagan massivlar | **0 / 20** |

Ya'ni «massivlar avtomatik tekshiruvdan tushib qoladi» xavfi hozirgi holatda **yuzaga chiqmagan**. Bu faqat struktura — tarjima **mazmuni** va uzun matnlarda layout tekshirilmadi.

---

## 7. Xulosa va tavsiya etilgan tartib

Oldingi auditning tekshirganim 9 ta bandi (3, 7, 13, 15, 17, 18, 22, 23 va qisman 4) **haqiqatan ishlaydi**. Imtihonning 35+15 invarianti va i18n strukturasi toza.

Lekin ikkita tuzatish yangi muammo tug'dirgan:

1. **Himoyalangan maydonlar ro'yxati (1-band)** mijozning o'z obunasini tugatish yo'lini yopdi, `cron-daily` esa to'langan obunani ataylab chetlab o'tadi → **T-1, kritik paywall teshigi**.
2. **Kvota tejash (qo'lda yuklash)** JSON import dublikat filtrini jimgina o'ldirdi → **T-3**.

Bu ikkalasi ham «tuzatish ikkinchi tomonini ko'rmaslik» naqshi: o'zgarish o'z modulida to'g'ri, lekin unga tayangan boshqa modul tekshirilmagan.

**Tavsiya etilgan tartib:**

1. **Bugun:** T-1 (bir qatorlik o'zgarish, kritik ta'sir) → T-3 (guard qo'shish)
2. **Bu hafta:** T-2 (uid guard) → T-4 (TestPage'ni bitta query'ga o'tkazish) → T-9
3. **Keyingi sprint:** T-5 (yagona blueprint manbasi) → T-6 (spacedCards yengillashtirish) → T-12 (Play muvofiqligi)
4. **Texnik qarz:** T-7 (qHash migratsiyasi), T-10 (a11y hook), T-11 (PWA), T-8

**Har o'zgarishdan keyin majburiy:** `npm test` · `npx eslint src/ api/ --no-warn-ignored --quiet` · `npm run build`.
`firestore.rules` o'zgarsa — **«SINALMAGAN»** deb belgilanadi (emulyator yo'q) va deploy tartibi saqlanadi: **KOD AVVAL, QOIDALAR KEYIN**.
