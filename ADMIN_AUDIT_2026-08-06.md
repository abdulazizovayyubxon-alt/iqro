# Admin paneli — to'liq audit (funksional · yetishmovchilik · ortiqcha · dizayn)

**Sana:** 2026-08-06 · **Branch:** `audit/2026-08-06-tuzatishlar`
**Rol:** Senior Frontend Engineer + Product Designer + QA Auditor
**Usul:** oq quti statik kod tahlili + `grep`/`node` o'lchov skriptlari.
**Runtime testlar O'TKAZILMADI** (sabablar 1.3 bo'limida).

**Bazaviy holat (audit paytida):** `npm test` → 80/80 · `eslint` → 0 xato · `npm run build` → OK

---

## ✅ TUZATISH HOLATI (2026-08-06, audit bilan bir kunda)

Egasi «hammasini boshla» dedi — **barcha bandlar bajarildi**.

**Tekshiruv:** `npm test` → **87/87 o'tdi** · `npx eslint src/ api/ --quiet` → **0 xato** ·
`npm run build` → **muvaffaqiyatli** · `vite dev` da `/admin` marshruti yuklandi, konsol va
server loglarida **xato yo'q**.

### A — siniq funksiyalar (17/17)

| # | Band | Holat | Joy |
|---|---|---|---|
| A-1 | `questionMeta` yangilanmaydi | ✅ | `AdminPage.jsx` — publish ichida 16 ta `getCountFromServer` (≈16 o'qish) |
| A-2 | «Pro bekor qilish» to'lagan mijozni o'chiradi | ✅ | tranzaksiyada `premiumPlan === 'paid'` tekshiruvi |
| A-3 | E'tirozlar/foydalanuvchilar abadiy «Yuklanmoqda» | ✅ | `onSnapshot` error callback + `loadUsers` try/catch + xato UI |
| A-4 | Xabarlar tabida qabul qiluvchi ro'yxati bo'sh | ✅ | `loadUsers` `notifications` tabida ham ishlaydi |
| A-5 | Muddatsiz Pro yo'li + `window.prompt` | ✅ | sanali modal; muddatsiz variant olib tashlandi (max 5 yil) |
| A-6 | Tarif `durationMonths` = NaN → webhook `RangeError` | ✅ | `Number.isInteger` validatsiyasi |
| A-7 | Dublikat tahlili yuklanmagan bazada «topilmadi» | ✅ | `questionsLoaded` guard'i |
| A-8 | Referral jadvali state'ni mutatsiya qiladi | ✅ | `[...allReferrals].sort(...)` |
| A-9 | Referral jamlanmasi ikki xil formula | ✅ | yagona `summarizeReferrals()`; `totalBonus` haqiqiy `bonusAmount` dan |
| A-10 | Foydalanuvchi o'chirilganda yetim yozuvlar | ✅ | `api/notify-admin.js` — objections/questionRequests o'chiriladi, **referrals ANONIMLASHTIRILADI** |
| A-11 | Promo o'chirilganda `redemptions` yetim qoladi | ✅ | ishlatilgan kodni o'chirish TAQIQLANDI (rules mijozga tozalashga ruxsat bermaydi) |
| A-12 | `handleDeleteTariff` mavjud bo'lmagan hujjatda yiqiladi | ✅ | `updateDoc` → `setDoc(merge)` |
| A-13 | Admin huquqi tasdiqsiz beriladi | ✅ | `confirmAction` + o'zini o'zgartirishni to'sish |
| A-14 | Tahrirda hujjatga ortiqcha `id` yoziladi | ✅ | `toEditableQuestion()` |
| A-15 | `users`/`referrals` chegarasiz o'qiladi | ✅ | `limit(200)` + server qidiruvi (1–2 o'qish) |
| A-16 | Xatolar tabi har kirishda qayta o'qiydi | ✅ | kesh guard'i |
| A-17 | E'tiroz hisoblagichi 200 tadan hisoblanadi | ✅ | `getCountFromServer` (1 o'qish) |

### B — qo'shilgan funksiyalar (8/8)

| # | Band | Holat |
|---|---|---|
| B-1 | To'lovlar ko'rinishi (`payments`) | ✅ yangi tab; summa mos kelmasa qizil belgi |
| B-2 | Hisobni o'chirish arizalari | ✅ Foydalanuvchilar tabi ichida bo'lim |
| B-3 | Foydalanuvchi kartochkasi | ✅ modal (0 qo'shimcha o'qish) |
| B-4 | Pro muddatini aniq sana bilan | ✅ `<input type="date">` + tez tugmalar |
| B-5 | Admin harakatlari jurnali | ✅ `src/services/adminLog.js` + `adminActions` rules + «Jurnal» tabi |
| B-6 | Publish eslatmasi | ✅ `pendingPublish` tasmasi |
| B-7 | Server tomonda qidiruv | ✅ shortId / email / telefon bo'yicha |
| B-8 | Ro'yxatni yangilash tugmasi | ✅ users + referrals |

### C — o'chirilgan (6/6)

| # | Band | Holat |
|---|---|---|
| C-1 | `api/admin-publish.js` | ✅ **O'CHIRILDI** → `api/` **11/12** (bitta bo'sh slot) |
| C-2 | O'lik CSS (`.admin-user-avatar`, `-name`, `-actions`) | ✅ |
| C-3 | `.admin-search-icon` ta'rifsiz | ✅ CSS'ga ko'chirildi, inline olib tashlandi |
| C-4 | `.spin-icon` mavjud emas → animatsiya ishlamasdi | ✅ `.spin` ga |
| C-5 | `usedBy: []` o'lik maydon | ✅ yozilmaydi (legacy o'qish saqlandi) |
| C-6 | JSON import — o'chirilmasin | ✅ qoldirildi (asos: namuna quvuri) |

### D — dizayn (9/9)

| # | Band | Holat |
|---|---|---|
| D-1 | Media query ichida `font-size` | ✅ ikkalasi olib tashlandi |
| D-2 | Qattiq kodlangan ranglar | ✅ `rgba()` 12→4, hex 4→3 (qolgani: scrim va soya) |
| D-3 | Modal a11y | ✅ 5 ta modalga `useModalA11y` + `role="dialog"`; `confirmDialog` → umumiy `ConfirmDialog` |
| D-4 | `aria-label` yo'q | ✅ barcha ikonka-tugmalarga |
| D-5 | Bo'sh/yuklanish/xato holatlari | ✅ 11 tabda ham to'liq |
| D-6 | 12 tab mobilda | ✅ mask + `scrollIntoView` + `role="tablist"` |
| D-7 | `overflow-x` barcha `glass-panel` da | ✅ faqat `.admin-table-wrap` ga |
| D-8 | Native `window.prompt`/`confirm` (4 ta) | ✅ 0 ta qoldi |
| D-9 | Takroriy inline naqshlar | ✅ ~30 klass; inline **322 → 241**, `px` satr **109 → 91** |

### ⚠️ Deploydan oldin SHART

1. **`firebase deploy --only firestore:rules`** — `adminActions` kolleksiyasi qo'shildi.
   Qoidalar deploy qilinmaguncha jurnal yozuvi `permission-denied` oladi. Bu **ataylab
   xavfsiz**: `adminLog.js` xatoni yutadi (konsolga ogohlantirish) va hech qanday admin
   amalini bloklamaydi. **EMULYATORDA SINALMAGAN** (bu mashinada Java yo'q).
2. `api/admin-publish.js` o'chirildi → `PUBLISH_SECRET` env o'zgaruvchisi endi
   ishlatilmaydi, uni Vercel'dan olib tashlash mumkin.

### Ataylab BAJARILMAGAN

**Mavjud muddatsiz obunalar migratsiyasi (A-5 ning davomi).** Yangi muddatsiz Pro berish
yo'li yopildi, lekin `premiumExpire: null` bilan turgan HOZIRGI hisoblar **tegilmadi** —
ularga muddat qo'yish odamlarning kirish huquqini to'satdan olib qo'yadi. Bu biznes
qarori: `where('isPremium','==',true)` + `premiumExpire == null` bo'yicha sanab chiqib,
har biriga alohida sana belgilash kerak.

---

**Oldingi hisobotlar:** `AUDIT_2026-08-05.md` (23 band) va `AUDIT_2026-08-06_QAYTA.md` (22 band)
o'qildi. Ulardagi tuzatilgan bandlar bu yerda **qayta hisobot qilinmagan**. Ataylab
qoldirilganlar (in-memory rate-limit, `isAdmin()` dagi `get()`, panel i18n'siz) ham
topilma sifatida yozilmagan.

> Muhim: oldingi audit `AdminPage.jsx` ning **960–2278 qatorlarini KO'RMAGAN**
> (o'sha hisobotning 1.3 bo'limi, 117-qator), `PromoTab`/`SchoolsTab` esa umuman
> qamrovda bo'lmagan. Quyidagi topilmalarning aksariyati aynan o'sha ko'rilmagan
> hududdan.

---

## 1. Qamrov

### 1.1 To'liq o'qilgan (satrma-satr)

| Fayl | Hajm |
|---|---|
| `src/pages/AdminPage.jsx` | 2415 q. — **to'liq** |
| `src/pages/AdminPage.css` | 492 q. — to'liq |
| `src/components/admin/PromoTab.jsx` | 301 q. — to'liq |
| `src/components/admin/SchoolsTab.jsx` | 415 q. — to'liq |
| `src/hooks/useAdmin.js` | 37 q. |
| `src/hooks/useModalA11y.js` | 110 q. |
| `api/admin-publish.js` | 117 q. |
| `api/notify-admin.js` | 313 q. |
| `firestore.rules` | 317 q. |
| `src/config.js` | 111 q. |
| `src/components/shared/ConfirmDialog.jsx` | 61 q. |
| `src/services/school.js` | 42 q. |

### 1.2 Nishonli o'qilgan (faqat kerakli qism)

`src/context/AuthContext.jsx` 36–63 (`computeTrialStatus` — premium muddat mantiqi) ·
`api/payment-webhook.js` 262–311 (`durationMonths` → `premiumExpire`) ·
`api/redeem-promo.js` (grep: `redemptions`, `usedBy`, `usedCount`) ·
`api/log-error.js` (grep: yozilayotgan maydonlar) ·
`src/data/mockData.js` (grep: `TOPICS` toifalari va `id` chegarasi) ·
`src/index.css` (grep: token ta'riflari, `.spin`) ·
`src/pages/Dashboard.jsx` / `OnboardingPage.jsx` (grep: `questionMeta` iste'molchilari) ·
`TIPOGRAFIYA.md` (qoidalar)

### 1.3 KO'RILMAGAN — halol ro'yxat

- **Hech narsa ishga tushirilmadi.** `vite dev` serverless funksiyalarni bermaydi,
  Firestore emulyatori bu mashinada yo'q (Java yo'q). Ya'ni **birorta ham tugma
  haqiqatda bosilmadi.**
- **Haqiqiy hujjat sonlari** (`users`, `referrals`, `payments`, `errorLogs`,
  `deletionRequests`) — o'lchanmadi. Kvota baholarim shu sonlarga bog'liq, shuning
  uchun ular **TEKSHIRISH KERAK** deb belgilangan.
- **Mobil ko'rinish haqiqiy qurilmada** — faqat CSS o'qildi, o'lchanmadi.
- `api/school.js`, `api/redeem-promo.js`, `api/check-user.js` — faqat admin bilan
  bog'liq qismlari grep darajasida.
- `AppContext`, `ExamPage`, `TestPage`, `engine/*` — qoidaga ko'ra tegilmadi va
  o'qilmadi (faqat `AuthContext` ning premium mantiqi).
- `firestore.indexes.json` **mavjud emas** — indekslar Firebase konsolida qo'lda
  boshqarilishi ehtimoli bor, tekshirilmadi.
- Panel i18n — qoidaga ko'ra qamrovdan tashqarida.

### 1.4 O'lchangan dizayn qarzi

| Fayl | `style={{` | `'Npx'` satr | Raqamli qiymat | `rgba()` | hex |
|---|---|---|---|---|---|
| `AdminPage.jsx` | **266** | **109** | **104** | 12 | 3 |
| `SchoolsTab.jsx` | 34 | 0 | 36 | 0 | 1 |
| `PromoTab.jsx` | 22 | 0 | 21 | 0 | 0 |
| **Jami** | **322** | **109** | **161** | **12** | **4** |

`AdminPage.css` = 492 qator. Ya'ni uslublarning ~85% i JSX ichida.

---

## 2. Topilmalar

Belgilar: **TASDIQLANGAN (kod)** — kodda o'qib ko'rildi · **TASDIQLANGAN (o'lchov)** —
skript bilan tekshirildi · **TEKSHIRISH KERAK** — runtime/ma'lumot hajmiga bog'liq.

---

### 🔴 YUQORI

---

#### A-1. `settings/questionMeta` hech qachon yangilanmaydi — Dashboard'dagi savol soni abadiy eskirgan

**Toifa:** A (siniq funksiya) · **TASDIQLANGAN (o'lchov)**

`api/admin-publish.js:103` — `settings/questionMeta` ning **yagona yozuvchisi**
butun repoda. Uni chaqiruvchi kod **YO'Q**:

```
grep -rn "admin-publish" --include="*.jsx" --include="*.js" . | grep -v node_modules
→ faqat izohlar va audit hujjatlari. Bironta fetch()/chaqiruv yo'q.
```

Iste'molchilar esa bor:
- `src/pages/Dashboard.jsx:95` — fan kartochkasidagi «ishonch badge» (savol soni)
- `src/pages/OnboardingPage.jsx:320` — fan tanlash ekranidagi savol soni

Paneldagi «🚀 Yangilanishni yuborish» tugmasi (`AdminPage.jsx:1058`
`handlePublishBundles`) **faqat `dbVersion` ni oshiradi** — `questionMeta` ga
tegmaydi.

**Qanday takrorlanadi:** bazaga savol qo'shing (masalan 2026-08-06 dagi 560 ta namuna
savol) → panelda «Yangilanishni yuborish» → Dashboard'ni oching. Fan kartasida
**eski son** turadi. `admin-publish` oxirgi marta qachon qo'lda ishga tushirilgan
bo'lsa, badge o'sha kunda muzlab qolgan.

**Tuzatish (kvota jihatidan arzon):** `handlePublishBundles` ichida 16 ta
`getCountFromServer(query(questions, where('category','==',cat)))` bajarib,
`settings/questionMeta` ni yozish. **Narxi ≈ 16 o'qish** (aggregatsiya 1000 hujjatga
1 o'qish). `loadAllQuestions()` (~47 000 o'qish) SHART EMAS.

---

#### A-2. «✕ Pro bekor qilish» tugmasi TO'LAGAN foydalanuvchining obunasini o'chiradi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:633-652` — `handleCancelReferralPremium`:

```js
await updateDoc(doc(db, 'users', referredId), {
  isPremium: false,          // ← SHARTSIZ
  freeMonthExpire: null
});
```

`premiumPlan` va `premiumExpire` **tegilmaydi**, `isPremium` esa shartsiz `false`
bo'ladi. `AuthContext.jsx:42`:

```js
if (data.isPremium && data.premiumPlan === 'paid') return { status: 'premium', ... };
```

`isPremium: false` → bu shart o'tmaydi → foydalanuvchi `expired` holatiga tushadi.

**Qanday takrorlanadi:** referral orqali kelgan foydalanuvchi (B) keyinchalik Click
orqali **haqiqiy to'lov** qiladi (`premiumPlan: 'paid'`, `premiumExpire: +12 oy`).
Uning referral yozuvida `freeExpire` hamon turibdi → Referral tabida «✕ Pro bekor
qilish» tugmasi ko'rinadi. Admin uni bosadi → **pul to'lagan mijoz Pro'ni yo'qotadi.**
`premiumExpire` kelajakda turgani uchun `cron-daily` ham uni tiklamaydi.

**Tuzatish:** faqat `premiumPlan !== 'paid'` bo'lganda `isPremium: false` yozish;
aks holda toast bilan rad etish («Bu foydalanuvchi to'lov qilgan — bepul premium
allaqachon almashtirilgan»). Tugmani ham `premiumPlan === 'paid'` da yashirish.

---

#### A-3. Xato yuz berganda ikkita tab abadiy «Yuklanmoqda...» da qotadi

**Toifa:** A · **TASDIQLANGAN (kod)**

**(a) E'tirozlar** — `AdminPage.jsx:472-482`:

```js
const unsub = onSnapshot(q, (snap) => { ...; setLoading(false); });
//                                    ↑ error callback YO'Q
```

`loading` — bu tabning yagona darvozasi (`1412`: `{loading ? 'Yuklanmoqda...' : ...}`).
Rules rad etsa, indeks yetishmasa yoki tarmoq uzilsa → `setLoading(false)` **hech
qachon chaqirilmaydi**, toast ham chiqmaydi. Admin cheksiz spinner ko'radi.

Solishtiring: `questionRequests` (`496`) va `notifications` (`204`) listenerlarida
error callback **bor** — ya'ni bu unutilgan joy.

**(b) Foydalanuvchilar** — `AdminPage.jsx:500-508`:

```js
const loadUsers = async () => {
  if (users.length > 0) return;
  const snap = await getDocs(collection(db, 'users'));   // try/catch YO'Q
  setUsers(...);
};
loadUsers();   // .catch() ham YO'Q
```

Xato bo'lsa — ushlanmagan promise rejection. `users` bo'sh qoladi → `1778`:
`users.length === 0` → «👥 Yuklanmoqda...» **mangu**. Xato haqida hech qanday belgi
yo'q.

**Tuzatish:** ikkalasiga ham xato yo'li — `setLoading(false)` + `showToast(...)` +
qayta urinish tugmasi.

---

#### A-4. «Xabarlar» tabida bitta kishiga xabar yuborib bo'lmaydi (ro'yxat bo'sh)

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:1983` — «Qabul qiluvchilar» dropdown'i `users` massividan quriladi.
Lekin `users` **faqat** `tab === 'users'` bo'lganda yuklanadi (`500-508`).

**Qanday takrorlanadi:** panelni yangi oching (default tab = `objections`) →
to'g'ridan-to'g'ri «Xabarlar» tabiga o'ting → dropdown'da **faqat** «👥 Barcha
foydalanuvchilar» bor. Bitta kishiga xabar yuborish imkoniyati amalda mavjud emas.
Buni tushuntiruvchi hech qanday matn yo'q — admin funksiya buzilgan deb o'ylaydi.

**Tuzatish:** `tab === 'notifications'` bo'lganda ham `loadUsers()` chaqirish, YOKI
(yaxshiroq) dropdown o'rniga shortId/telefon bo'yicha qidiruv maydoni — bu A-15
(sahifalashsiz o'qish) ni ham hal qiladi.

---

#### A-5. `togglePremium` — `window.prompt` va MUDDATSIZ Pro yo'li

**Toifa:** A + D · **TASDIQLANGAN (kod)**

`AdminPage.jsx:733`:

```js
const input = window.prompt("Necha kunga Pro berilsin?\n(bo'sh qoldiring — muddatsiz)", "30");
...
if (input.trim() !== '') { ... } else premiumExpire = null;   // ← muddatsiz
```

`AuthContext.jsx:51-53`: `isPremium && !premiumExpire` → **doimiy** `premium`.
`AUDIT_2026-08-06_QAYTA.md:61` buni yozib qo'ygan: «Muddatsiz obunalar
(`premiumExpire: null`) tegilmaydi» — ya'ni `cron-daily` ham ularni tugatmaydi.

Bu **qoida 8 ga zid**: «Admin qo'lda premium bergani ham muddat tugaganda tugashi
kerak». Yo'l allaqachon mavjud (men qo'shmadim), lekin panel uni **default taklif
sifatida** ko'rsatib turibdi.

Qo'shimcha muammolar:
- `window.prompt` dizayn tizimidan tashqarida, TWA/ba'zi brauzerlarda bloklanishi
  mumkin — bunda funksiya jimgina ishlamaydi.
- Kun soni kiritiladi, **aniq sana emas** — «31-dekabrgacha bering» so'rovi qo'lda
  hisoblashni talab qiladi.

**Tuzatish:** modal + `<input type="date">` + majburiy sana (muddatsiz variantsiz).
Mavjud muddatsiz hisoblar uchun alohida migratsiya qarori kerak — bu **ma'lumotga
ta'sir qiluvchi o'zgarish**, alohida ajratilsin.

---

### 🟠 O'RTA

---

#### A-6. Tarifda bo'sh «Muddati» maydoni to'lov webhook'ini yiqitadi

**Toifa:** A · **TASDIQLANGAN (kod + o'lchov)**

`AdminPage.jsx:2348`:

```js
onChange={e => setNewTariff({...newTariff, durationMonths: parseInt(e.target.value)})}
```

Maydon tozalansa → `parseInt('')` = `NaN`. Saqlash tugmasi (`2353`) faqat
`id`/`name`/`price` ni tekshiradi — **`durationMonths` tekshirilmaydi**. Firestore
`NaN` ni qabul qiladi (yaroqli double).

Keyin `api/payment-webhook.js:271-277`:

```js
if (durationMonths && durationMonths !== 999) {   // NaN truthy → kiradi
  d.setMonth(d.getMonth() + durationMonths);       // Invalid Date
  expireDate = d.toISOString();                    // ← RangeError
}
```

O'lchandi:
```
node -e "const d=new Date(); d.setMonth(d.getMonth()+NaN); d.toISOString()"
→ THROWS: RangeError: Invalid time value
```

Bu `runTransaction` ichida → to'lov tranzaksiyasi yiqiladi → Click qayta uradi →
**mijoz pul to'laydi, Pro olmaydi.**

**Tuzatish:** ikki tomonlama — panelda `durationMonths` validatsiyasi (butun son ≥ 1)
va `payment-webhook.js` da `Number.isFinite()` tekshiruvi. Webhook tuzatishi qamrovdan
tashqarida, lekin ayni xavf shu yerda tug'iladi.

---

#### A-7. Dublikat tahlili baza yuklanmagan holatda «topilmadi» deb aldaydi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:919` `analyzeDuplicates` — `questionsLoaded` ni **tekshirmaydi**.
Baza yuklanmagan bo'lsa `questions = []` → `poolSize = 0` → chegara tekshiruvidan
o'tadi → `totalRemove === 0` → `1000`-qator:

```js
showToast('Takroriy savollar topilmadi!', 'success');
```

**Qanday takrorlanadi:** panelni oching → «Savollar» tabi → «Tushundim — baribir
yuklash» ni bosMASDAN «Dublikatlar» tugmasini bosing → yashil «Takroriy savollar
topilmadi!». Admin bazada dublikat yo'q degan **xato xulosaga** keladi.

Solishtiring: JSON import (`299`) va JSON zaxira (`857`) da bu tekshiruv **bor** —
faqat dublikat tahlili unutilgan.

**Tuzatish:** `processJsonQuestions` dagi bilan bir xil guard.

---

#### A-8. Referral jadvali React state massivini render paytida mutatsiya qiladi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:2100-2102`:

```js
{allReferrals
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))   // nusxa EMAS
  .map((r) => ( ...
```

`Array.prototype.sort` **joyida** ishlaydi → `allReferrals` state massivi render
davomida o'zgaradi. `applyReferralPatch` (`573`) yangi massiv yasagani uchun avariya
bermaydi, lekin bu React ning o'zgarmaslik shartini buzadi va tartib kutilmagan
holga kelishi mumkin.

**Tuzatish:** `[...allReferrals].sort(...)`, yoki (yaxshiroq) `useMemo` ichiga.

---

#### A-9. Referral jamlanmasi ikki xil formula bilan hisoblanadi

**Toifa:** A · **TASDIQLANGAN (kod)**

- Boshlang'ich yuklash (`554-555`): `pending = refs.filter(r => r.status === 'pending')`
- Har amaldan keyin (`579`): `pending: next.length - paid`

Jadval `status === 'active'` holatini ham chizadi (`2118`). Demak `active` yozuvlari
bo'lsa: boshida ular **hech qayerda** sanalmaydi (total ≠ paid + pending), bitta
«✓ To'ladi» bosilgandan keyin esa **birdan** `pending` ga qo'shilib ketadi — raqam
sakraydi.

Shu bilan birga `totalBonus = paid * 15000` (`560`, `581`) — haqiqiy `bonusAmount`
maydonini e'tiborsiz qoldiradi. Hozir hamma joyda 15000 yozilgani uchun mos keladi,
lekin summa o'zgarsa jimgina noto'g'ri bo'lib qoladi.

---

#### A-10. Foydalanuvchi o'chirilganda referral/e'tiroz/so'rov yozuvlari yetim qoladi

**Toifa:** A · **TASDIQLANGAN (kod)**

`api/notify-admin.js:188-226` `purgeUser` uchta narsani o'chiradi:
`users/{uid}`, `userStats/{uid}`, `users/{uid}/notifications/*`, + Auth hisobi.

O'chirilmaydiganlar:
- `referrals` — `referrerId`/`referredId` mavjud bo'lmagan hisobga ishora qiladi
  (Referral jadvalida «—» ismli qatorlar, `handleMarkReferralPaid` esa
  `tx.update(users/{referrerId})` da **NOT_FOUND** bilan yiqiladi)
- `objections` — `uid` yetim
- `questionRequests` — `uid` yetim; `handleFulfillRequest` (`690`) o'sha uid ga
  bildirishnoma yozmoqchi bo'ladi
- `promoCodes/*/redemptions/{uid}` — yetim

**Tuzatish:** `purgeUser` ga referral/objection/questionRequest tozalashini qo'shish
(query + batch delete). **DIQQAT:** `referrals` moliyaviy iz — o'chirish o'rniga
`anonymized: true` bilan belgilash to'g'riroq bo'lishi mumkin. Bu **qaror talab
qiladigan** band.

---

#### A-11. Promo kod o'chirilganda `redemptions` subkolleksiyasi qoladi va qayta ishlatishni buzadi

**Toifa:** A · **TASDIQLANGAN (kod)**

`PromoTab.jsx:133` — `deleteDoc(doc(db,'promoCodes', promo.id))`. Firestore
subkolleksiyani **kaskad o'chirmaydi**.

`api/redeem-promo.js:72,85` — `promoRef.collection('redemptions').doc(uid)` ni
tekshiradi.

**Qanday takrorlanadi:** `IQRO-ABC12` kodini yarating → 10 kishi ishlatsin →
kodni o'chiring → **aynan o'sha nom bilan** yangi kod yarating → o'sha 10 kishi
`already_used` xatosini oladi, sababi hech qayerda ko'rinmaydi.

**Tuzatish:** o'chirishdan oldin `redemptions` ni batch bilan tozalash, yoki
(xavfsizroq) o'chirishni butunlay olib tashlab faqat «O'chiq» qoldirish —
`SchoolsTab.jsx:158-167` da xuddi shu qaror allaqachon to'g'ri qabul qilingan.

---

#### A-12. `handleDeleteTariff` hujjat mavjud bo'lmasa yiqiladi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:1117` — `updateDoc(doc(db,'settings','premium'), { plans })`.
`updateDoc` mavjud bo'lmagan hujjatda **`not-found`** beradi.

`settings/premium` yo'q bo'lgan holat kodda ochiq ko'rsatilgan (`534-539`): u
holda default `lifetime` tarifi ko'rsatiladi. Admin o'sha ko'rsatilgan tarifni
o'chirmoqchi bo'lsa → «Xatolik yuz berdi», sababsiz.

`handleSaveTariff` (`1106`) esa to'g'ri — `setDoc(..., {merge:true})`.

**Tuzatish:** `setDoc(..., { merge: true })` ga o'tkazish.

---

#### A-13. Admin huquqini berish/olish tasdiqsiz, bitta bosishda

**Toifa:** A + C · **TASDIQLANGAN (kod)**

`AdminPage.jsx:762-769` `toggleAdmin` — `confirmAction` **yo'q**. Panelda 10 ta
`confirmAction` chaqiruvi bor; eng kuchli amal — to'liq admin huquqi berish —
ularning orasida emas.

Foydalanuvchilar ro'yxatida 🛡️ tugmasi ⭐ tugmasining yonida, ikkalasi ham 32×32 px
(`AdminPage.css:330`) — telefonda noto'g'ri bosish real.

Qo'shimcha: admin **o'zidan** huquqni olib qo'yishi mumkin. `ADMIN_EMAILS` dagi
ikki hisob `firestore.rules:8-9` orqali himoyalangan, lekin `role === 'admin'` bilan
qo'shilgan uchinchi admin o'zini bir bosishda quvib chiqaradi.

**Tuzatish:** `confirmAction` + o'zini tekshirish (`u.id === user?.uid` bo'lsa rad).

---

#### A-14. Savol tahrirlanganda hujjatga ortiqcha `id` maydoni yoziladi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:1738`: `onClick={() => { setEditingQ(q); setNewQ({...q}); ... }}` —
`{...q}` ichida `id` ham bor (`523`: `{ id: d.id, ...d.data() }`).

`891`: `questionToSave = { ...newQ, correct, category }` → `900`
`updateDoc(doc(db,'questions', id), questionToSave)` → hujjat ichiga
`id: "<docId>"` maydoni yoziladi.

Zarar cheklangan (rules `topicId`/`category` ni tekshiradi, boshqa maydonlarga
befarq), lekin: har tahrirlangan savol +1 ortiqcha maydon oladi va bu zaxira JSON
hamda import formatiga oqib o'tadi.

**Tuzatish:** `setNewQ` da `id`, `createdAt` ni ajratib tashlash.

---

### 🔵 PAST / kvota

---

#### A-15. `users` va `referrals` sahifalashsiz to'liq o'qiladi, qidiruv mijozda

**Toifa:** A + B · **TASDIQLANGAN (kod)** · hajm **TEKSHIRISH KERAK**

- `AdminPage.jsx:504` — `getDocs(collection(db,'users'))`, chegarasiz
- `AdminPage.jsx:551` — `getDocs(collection(db,'referrals'))`, chegarasiz
- `AdminPage.jsx:1146` — qidiruv butun massiv ustida `filter()`

**Kvota hisobi:** foydalanuvchilar tabiga bir kirish = `N` o'qish, bu yerda `N` =
jami foydalanuvchi soni. Panelning o'zi bu sonni ko'rsatadi (`overview.users`,
`stats` tabida). 5 000 foydalanuvchida = **5 000 o'qish** har seansda; referral
tabi alohida shuncha. Spark kunlik limiti 50 000.

Bu `questions` (~47 000) darajasidagi xavf **emas**, lekin platforma o'sgani sari
o'sib boradi va hozir hech qanday ogohlantirish yo'q. `loadAllQuestions` ga
qo'yilgan «ataylab, qo'lda» himoyasi bu yerda yo'q.

**Yumshatish (arzon):** `limit(200)` + `orderBy('createdAt','desc')`; qidiruv esa
server tomonda — `where('shortId','==',term)` yoki `where('phone','==',term)`
(1–2 o'qish). Bu A-4 ni ham hal qiladi.

---

#### A-16. «Xatolar» tabi har kirishda qayta o'qiydi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:136-139` — `useEffect([tab, isAdmin])` → `loadErrorLogs()`. Kesh
guard'i yo'q (solishtiring: `users` (`503`) va `referrals` (`548`) da bor).

Har «Xatolar» tabiga qaytishda: 100 ta log o'qish + noyob uid'lar uchun 30 talik
`in` so'rovlari. Tablar orasida 5 marta almashish ≈ 500+ o'qish.

**Tuzatish:** `errorLogs.length > 0` guard'i (yangilash tugmasi allaqachon bor,
`1306`).

---

#### A-17. E'tirozlar hisoblagichi faqat yuklangan 200 tadan hisoblanadi

**Toifa:** A · **TASDIQLANGAN (kod)**

`AdminPage.jsx:472` — `limit(200)`. `unsolvedCount`/`solvedCount` (`1168-1169`)
shu 200 tadan hisoblanadi va sarlavhadagi katta raqamlar hamda tab badge'i
(`1254`) sifatida ko'rsatiladi — go'yo **jami** son.

`questionRequests` uchun bu izohda ochiq ogohlantirilgan (`487-488`), objections
uchun yo'q.

**Tuzatish:** `getCountFromServer(query(objections, where('solved','==',false)))`
(1 o'qish) yoki sarlavhaga «(oxirgi 200)» qo'shish.

---

## 3. Qo'shish tavsiya qilinadigan funksiyalar

Har biri: **nima uchun · qancha ish · kvotaga ta'siri**.

---

### B-1. To'lovlar ko'rinishi (`payments`) — 🔴 eng muhim yetishmovchilik

**Hozir:** `firestore.rules:197` — `allow read: if isAdmin()`, izohida aniq
yozilgan: *«Faqat admin ko'radi ("to'ladim, premium yo'q" murojaatlarini tekshirish
uchun)»*. **Bunday UI YO'Q** — grep `'payments'` `src/` da 0 natija.

`payment-webhook.js:297-309` har to'lovga to'liq yozuv yozadi: `transId`,
`provider`, `planId`, `planPrice`, `expectedAmount`, `paidAmount`,
`durationMonths`, `premiumExpire`, `status`, `createdAt`.

**Nima uchun:** «Men to'ladim, Pro kelmadi» — bu eng ko'p uchraydigan yordam
murojaati. Hozir admin buni **hech qanday yo'l bilan tekshira olmaydi** — faqat
Firebase konsoliga kirish kerak. `AMOUNT_MISMATCH` bilan rad etilgan to'lovlar ham
ko'rinmaydi.

**Ish:** kichik — ~80 qator, mavjud jadval naqshida. Yangi tab yoki «To'lovlar»
bo'limi Statistika tabi ichida.
**Kvota:** `orderBy('createdAt','desc') + limit(50)` = **50 o'qish** ochilganda.
**Xavf:** yo'q — faqat o'qish, rules allaqachon ruxsat beradi.

---

### B-2. Hisobni o'chirish arizalari (`deletionRequests`)

**Hozir:** `firestore.rules:289-292` admin uchun ochiq, `api/notify-admin.js:161`
yozadi. **UI YO'Q** — grep `deletionRequests` `src/` da 0 natija.

**Nima uchun:** bu Google Play talabi bo'yicha ochiq ariza oqimi. Yagona xabar
kanali — Telegram (`sendToAdmin`, `167`). Telegram xabari o'chib ketsa yoki
`TELEGRAM_BOT_TOKEN` sozlanmagan bo'lsa (`94`: jimgina `false` qaytaradi) — **ariza
butunlay yo'qoladi.** Play muvofiqligi uchun javob berish majburiyati bor.

**Ish:** kichik — ~50 qator, «Xatolar» tabi naqshida (ro'yxat + status
o'zgartirish).
**Kvota:** `limit(50)` = 50 o'qish, faqat tab ochilganda.
**Xavf:** yo'q.

---

### B-3. Bitta foydalanuvchining to'liq kartochkasi

**Hozir:** `AdminPage.jsx:1787-1825` — qatorda faqat ism, shortId, email/telefon
va 3 ta tugma. **Ko'rinmaydi:** `premiumExpire` (obuna qachon tugaydi),
`premiumPlan`, `premiumMethod`, `createdAt`, `referralCount`, `schoolId`,
`promoDiscount`.

**Nima uchun:** «Obunam qachon tugaydi?» — admin javob bera olmaydi. Pro tugmasi
esa faqat `isPremium` ni ko'rsatadi, muddatni emas — ya'ni muddati o'tgan hisob
ham «⭐» bilan turadi.

**Ish:** o'rtacha — bitta modal (~120 qator) + qatorga muddat chipi.
**Kvota:** **0** — barcha ma'lumot `users` hujjatida allaqachon yuklangan.
B-1 bilan birlashtirilsa, o'sha foydalanuvchi to'lovlari ham ko'rsatilishi mumkin
(+1 query).

---

### B-4. Premium muddatini aniq sana bilan berish

A-5 ning tuzatishi. `window.prompt` → modal + `<input type="date">` + tez tugmalar
(30 kun / 6 oy / 1 yil) + «muddatsiz» variantini olib tashlash.

**Ish:** kichik (~70 qator, `isAddingTariff` modali naqshida).
**Kvota:** 0.
**Xavf:** mavjud muddatsiz hisoblarga tegmaydi — ular alohida qaror (A-5).

---

### B-5. Admin harakatlari jurnali (`adminActions`)

**Hozir:** butunlay **YO'Q** — grep `adminlog|auditlog|admin_log` → 0 natija.

**Nima uchun:** panelda qaytarilmas amallar bor — foydalanuvchini butunlay
o'chirish (Auth hisobi bilan), minglab savolni dublikat sifatida o'chirish, admin
huquqi berish, qo'lda premium berish. Kim, qachon, nima qilgani **hech qayerda
qayd etilmaydi**. Adminlar soni birdan ortiq (rules'da 2 email + `role === 'admin'`
orqali cheksiz), demak «bu savollarni kim o'chirdi?» savoliga javob yo'q.

**Ish:** kichik — bitta `logAdminAction(type, target, meta)` yordamchisi +
xavfli amallarda 1 chaqiruv (~8 joy) + oddiy ro'yxat ko'rinishi.
**Kvota:** amal boshiga **+1 yozuv**. O'qish: `limit(100)` ko'rilganda.
**Xavf:** ⚠️ `firestore.rules` ga yangi kolleksiya kerak
(`allow read: if isAdmin(); allow create: if isAdmin(); allow update, delete: if false`).
Emulyator yo'qligi sababli **SINALMAGAN** deb belgilanadi va kod deploy'idan
KEYIN qo'llaniladi.

---

### B-6. Savol tahriridan keyin «versiya bump» eslatmasi

**Hozir:** `handleSaveQuestion` (`874`), `handleDeleteQuestion` (`1083`),
`executeDuplicateDeletion` (`1011`), `processJsonQuestions` (`292`) — hech biri
`handlePublishBundles` bilan bog'lanmagan. Admin savolni tahrirlab publish qilishni
unutsa, foydalanuvchilar **eski keshdagi savolni ko'raveradi** (loyihaning ma'lum
tuzog'i).

**Ish:** juda kichik — `pendingPublish` state, har yozuvdan keyin `true`, Savollar
tabida yopishqoq ogohlantirish tasmasi + tugma, publish'dan keyin `false`.
**Kvota:** 0.

---

### B-7. Server tomonda foydalanuvchi qidirish + sahifalash

A-15 ning to'g'ri yechimi. `limit(200)` + `where('shortId','==')` /
`where('phone','==')` bo'yicha aniq qidiruv.
**Ish:** o'rtacha. **Kvota:** panel ochilishida `N` → **200** o'qish; qidiruvda 1–2.
**Xavf:** `phone` bo'yicha so'rov uchun indeks kerak bo'lishi mumkin —
**TEKSHIRISH KERAK** (`firestore.indexes.json` repoda yo'q).

---

### B-8. Foydalanuvchilar/referrallar ro'yxatini yangilash tugmasi

`503` va `548` dagi kesh guard'i abadiy — panelni yopmasdan yangi ro'yxatni olish
mumkin emas. Statistika (`1837`) va Xatolar (`1306`) tablarida «Yangilash» tugmasi
bor, bu ikkitasida yo'q.

**Ish:** juda kichik. **Kvota:** bosilganda yana `N` o'qish (B-7 dan keyin 200).

---

## 4. O'chirish tavsiya qilinadigan narsalar

Har biri **grep bilan tasdiqlangan**.

---

### C-1. `api/admin-publish.js` — o'lik endpoint, 12 slotdan 1 tasini egallaydi 🔴

**Tasdiq:**
```
grep -rn "admin-publish" --include="*.jsx" --include="*.js" --include="*.mjs" .
  | grep -v node_modules | grep -v ^./dist
→ src/ da bironta chaqiruv YO'Q. Faqat izohlar (health.js:87, Dashboard.jsx:93,
  OnboardingPage.jsx:317) va audit hujjatlari.
```

Har chaqiruvda u:
1. butun `questions` kolleksiyasini o'qiydi (**~47 000 o'qish**, `43`-qator);
2. fan bo'yicha bundle'larni Storage'ga yozadi (`64`) — lekin `storageUrls[cat] = null`
   (`80`) va `urls: {}` (`90`), ya'ni **bu bundle'larni hech kim o'qimaydi**;
3. `settings/version.dbVersion` ni yangilaydi — buni panel allaqachon o'zi qiladi;
4. `settings/questionMeta` ni yangilaydi — **va bu YAGONA foydali qismi** (A-1).

**Tavsiya (bosqichma-bosqich):**
1. `questionMeta` hisoblashni panelga ko'chirish (16 ta `getCountFromServer`, A-1);
2. shundan keyin `api/admin-publish.js` ni butunlay o'chirish → **1 ta bo'sh
   Vercel slot** (hozir 12/12, ya'ni yangi imkoniyat qo'shib bo'lmaydi) + `PUBLISH_SECRET`
   sirini iste'moldan chiqarish + o'lik Storage yozuvlarini to'xtatish.

⚠️ **Bu ma'lumotga ta'sir qiluvchi o'zgarish emas**, lekin **qaytarilishi qiyin**
(funksiya o'chirilgach qayta tiklash uchun kod kerak). Alohida commit bo'lsin.

---

### C-2. O'lik CSS klasslari — `AdminPage.css`

| Klass | Qator | Tasdiq |
|---|---|---|
| `.admin-user-avatar` | 94–100 | JSX'da faqat `.admin-user-avatar-sm` (1789) |
| `.admin-user-name` | 102–105 | JSX'da faqat `.admin-user-name-sm` (1794) |
| `.admin-user-actions` + `button` qoidalari | 108–119 | JSX'da faqat `.admin-user-actions-sm` (1802) |

```
grep -rn 'admin-user-avatar\b|admin-user-name"|admin-user-actions"' src/
→ faqat CSS ta'riflari, JSX'da 0 natija
```

~25 qator o'lik CSS.

---

### C-3. `.admin-search-icon` — JSX'da bor, CSS'da ta'rif yo'q

`AdminPage.jsx:1618` — `className="admin-search-icon"` berilgan, lekin yonida ayni
o'sha uslub inline ham yozilgan. `AdminPage.css` da bunday klass **yo'q**.

Faqat shu bitta joyda ishlatiladi (boshqa uchta `Search` ikonkasida — `1391`, `1764` —
klass umuman yo'q). Klassni CSS'ga ko'chirib inline'ni olib tashlash yoki klassni
o'chirish kerak; hozirgi holat — ikkalasining o'rtasida.

---

### C-4. `.spin-icon` — animatsiya ishlamaydi

`AdminPage.jsx:1715` — JSON yuklanayotganda `⏳` emojisiga `className="spin-icon"`
beriladi. `src/index.css:1618` da faqat `.spin` bor, `.spin-icon` **hech qayerda
ta'riflanmagan**.

Ya'ni «yuklanmoqda» ko'rsatkichi **qimirlamaydi** — foydalanuvchi jarayon qotib
qolgan deb o'ylashi mumkin. Tuzatish: `className="spin"` (bir belgi).

---

### C-5. `PromoTab` da `usedBy: []` — o'lik maydon

`PromoTab.jsx:103` har yangi promo kodga `usedBy: []` yozadi.
`AUDIT_2026-08-05.md` 15-band bu modelni **subkolleksiyaga** ko'chirgan (1 MB hujjat
chegarasi sababli).

`api/redeem-promo.js:88` eski massivni hamon **o'qiydi** (legacy kodlar uchun), lekin
unga **yozmaydi** (`123` faqat `usedCount` ni oshiradi). Demak yangi kodlarda bu
maydon abadiy bo'sh qoladi.

**Tavsiya:** yaratishda `usedBy` yozmaslik. `redeem-promo.js` dagi o'qish
eski kodlar uchun **qoldirilsin** — o'chirish alohida migratsiya talab qiladi.

---

### C-6. Ommaviy JSON import — o'chirilmasin, lekin sharti qimmat

Baholandi, **o'chirish tavsiya qilinmaydi**: namuna savollar quvuri (2026-08-06,
560 savol) aynan shu yo'ldan foydalanadi.

Lekin diqqat: `processJsonQuestions` (`299`) `questionsLoaded` ni talab qiladi —
ya'ni **har import oldidan ~47 000 o'qish** majburiy. Bu ataylab (T-3 tuzatishi),
lekin arzonroq yo'l bor: dublikat tekshiruvini faqat import qilinayotgan
**fan(lar) bo'yicha** yuklash (`where('category','in', [...])`) — bitta fan ≈ 3 000
o'qish, ya'ni **15× arzon**. Bu alohida taklif, majburiy emas.

---

## 5. Dizayn ishlari

---

### D-1. Tipografiya qoidasi buzilgan — media query ichida `font-size` 🔴

`TIPOGRAFIYA.md:155`: *«Media query ichida `font-size` qayta belgilanmaydi. Ekranga
moslashuvni ildizdagi `clamp()` bajaradi.»*

Buzilishlar (`AdminPage.css`, `@media (max-width: 768px)` ichida):

| Qator | Kod |
|---|---|
| 244 | `.admin-quick-stat-val { font-size: var(--fs-2xl); }` |
| 246 | `.admin-tab { padding: 8px 12px; font-size: var(--fs-sm); }` |

Ikkalasi ham `--fs-scale` (foydalanuvchi shrift o'lchami sozlamasi) bilan
to'qnashadi: XL rejimda tanlangan token media query tomonidan kichraytirib
yuboriladi.

**Tuzatish:** media query'dan `font-size` ni olib tashlash; kerak bo'lsa boshidanoq
kichikroq token tanlash.

---

### D-2. Qattiq kodlangan ranglar (token o'rniga)

**`AdminPage.jsx`** — 12 ta `rgba()`, 3 ta hex, ko'plab `'white'`/`'#fff'`:

| Qator | Qiymat | Bo'lishi kerak |
|---|---|---|
| 1430 | `rgba(16,185,129,0.3)` / `rgba(245,158,11,0.3)` | `--green` / `--amber` chegaralari |
| 1441 | `rgba(239,68,68,0.3)` | `--red` |
| 1467, 1471 | `rgba(16,185,129,0.2)`, `rgba(245,158,11,0.2)` | ayni token |
| 1528 | `rgba(14,151,224,0.3)` | `--blue` |
| 1702 | `rgba(14, 151, 224, 0.15)` | `--blue` |
| 2362, 2399 | `rgba(0,0,0,0.6)` (2 ta modal fon) | umumiy overlay klassi |
| 2376, 2381 | `var(--green-bg, rgba(34,197,94,0.12))` | token **bor**, fallback boshqa yashil — olib tashlansin |
| 1478, 1552, 2164, 2173, 2390, 2406 | `color: 'white'` / `'#fff'` | `--cta` ustidagi oq — klassga |

**`AdminPage.css`:**

| Qator | Qiymat |
|---|---|
| 379 | `background: rgba(255,255,255,0.02)` — dark temada ko'rinmaydi, light'da noto'g'ri |
| 382 | `box-shadow: 0 8px 32px 0 rgba(0,0,0,0.05)` |
| 480 | `border-color: rgba(14,151,224,0.3) !important` — `!important` + qattiq rang |
| 354, 360, 369, 457, 463, 469 | `rgba(...)` chegaralar |

**`SchoolsTab.jsx`:** 1 ta hex.

**Palitra tekshiruvi:** binafsha yoki gradient **topilmadi** ✅.
`--accent2` = `#0B79B8` (azure), `--accent3` = `#085F90` (azure) — qoidaga mos.

---

### D-3. Modal a11y — `useModalA11y` mavjud, lekin panelda ishlatilmagan

Panelda **4 ta** modal bor, hech birida `role="dialog"`, `aria-modal`, Escape yoki
fokus tutqichi **yo'q**:

| Modal | Qator |
|---|---|
| Savol qo'shish/tahrirlash | 2204–2317 |
| Tarif qo'shish/tahrirlash | 2321–2357 |
| Dublikat preview | 2361–2396 |
| `confirmDialog` | 2398–2410 |

`src/hooks/useModalA11y.js` **aynan shu muammo uchun** yaratilgan (T-10) va 11 ta
modalga ulangan — panel o'sha ro'yxatga kirmagan.

Bundan tashqari `src/components/shared/ConfirmDialog.jsx` **allaqachon mavjud** va
`useModalA11y` bilan jihozlangan, lekin `AdminPage` o'zining nusxasini (`2398-2410`)
saqlab turibdi — bir ishni qiladigan ikkita komponent.

**Tuzatish:** `confirmDialog` ni umumiy `ConfirmDialog` ga almashtirish
(⚠️ u `useTranslation` ishlatadi — tugma matnlari tarjima kalitidan keladi, panelning
o'zbekcha-qattiq-kodlangan qoidasiga zid emas, chunki uz manbadir); qolgan 3 tasiga
`useModalA11y` ulash.

---

### D-4. Ikonka-tugmalarda `aria-label` yo'q

| Joy | Qator | Hozir |
|---|---|---|
| ⭐ Pro | 1803 | faqat `title` |
| 🛡️ Admin | 1810 | faqat `title` |
| 🗑 O'chirish | 1817 | faqat `title` |
| Xato hal qilindi / o'chirish | 1351, 1358 | faqat `title` |
| Savol tahrirlash / o'chirish | 1738, 1739 | **hech narsa** |
| Tarif tahrirlash / o'chirish | 1924, 1925 | **hech narsa** |
| So'rov o'chirish | 1556 | faqat `title` |
| Bildirishnoma o'chirish | 2036 | faqat `title` |

⭐/🛡️ holatida ekran o'quvchi emojining o'zini o'qiydi. `title` — hover uchun,
a11y nomi sifatida ishonchsiz.

---

### D-5. Bo'sh / yuklanish / xato holatlari nomutanosib

| Tab | Bo'sh | Yuklanish | Xato |
|---|---|---|---|
| E'tirozlar | ✅ | ✅ | ❌ **abadiy spinner** (A-3a) |
| So'rovlar | ✅ | ❌ | ❌ (console.error) |
| Savollar | ✅ | ✅ | ✅ toast |
| Foydalanuvchilar | ✅ | ⚠️ bo'sh holat sifatida | ❌ **abadiy** (A-3b) |
| Statistika | ❌ | ⚠️ `—` | ❌ (console.error) |
| Tariflar | ❌ | ❌ | ❌ |
| Xabarlar | ✅ | ❌ | ✅ toast |
| Referral | ✅ | ✅ | ✅ toast |
| Promo | ✅ | ✅ | ✅ toast |
| Maktablar | ✅ | ✅ | ✅ toast |
| Xatolar | ✅ | ✅ | ❌ (console.error) |

Eng yomon uchtasi A-3 da alohida topilma sifatida yozilgan. Tariflar tabida
uchalasi ham yo'q (`1915-1929` — `tariffs.map` bo'sh massivda hech narsa
ko'rsatmaydi).

---

### D-6. 11 ta tab mobilda — qirq belgisi yo'q

`AdminPage.css:36-43`: `overflow-x: auto` + `scrollbar-width: none` +
`::-webkit-scrollbar { display: none }`.

375 px ekranda ~4–5 tab sig'adi. Scrollbar yashirilgani uchun **yana 6 tasi
borligini bildiradigan hech narsa yo'q** — na fade, na soya, na strelka. Faol tab
tanlanganda `scrollIntoView` ham chaqirilmaydi, ya'ni chetdagi tab tanlangach
ko'rinmay qolishi mumkin.

**Tuzatish:** o'ng chetga `mask-image` gradiyenti (rang emas, shaffoflik —
gradient taqiqi rangga tegishli) yoki oddiy soya; + faol tabga `scrollIntoView({inline:'nearest'})`.

---

### D-7. `overflow-x: auto` barcha `glass-panel` larga qo'llanadi

`AdminPage.css:256`:
```css
.admin-page .glass-panel { overflow-x: auto; }
.admin-page table { min-width: 600px; }
```

Niyat — referral **jadvali** (`2091`). Lekin `.glass-panel` panelda **9 joyda**
ishlatiladi: bildirishnoma formasi (`1936`, `2002`), statistika kartalari
(`1842-1855`), bo'sh holat bloklari (`1415`, `1514`), dublikat modali (`2363`),
`confirmDialog` (`2400`), Promo/Schools kartalari.

Natija: telefonda statistika kartochkalari va xabar formasi ham gorizontal scroll
oladi — kontent kesilib, ichida qimirlaydi.

**Tuzatish:** qoidani `.admin-table-wrap` kabi aniq klassga tor qilish.

---

### D-8. Native `window.prompt` / `window.confirm` — 4 joyda

| Fayl:qator | Amal |
|---|---|
| `AdminPage.jsx:733` | Pro necha kunga |
| `PromoTab.jsx:131` | Promo kodni o'chirish |
| `SchoolsTab.jsx:168` | Maktabni o'chirish |
| `SchoolsTab.jsx:197` | Maktab admini emaili |

Panelda `confirmAction` (10 chaqiruv) va umumiy `ConfirmDialog` bo'lgani holda —
uslub jihatidan ham, ishonchlilik jihatidan ham chetda. TWA/PWA muhitida bu
dialoglar bloklanishi mumkin, bunda amal **jimgina bajarilmaydi**.

---

### D-9. Takroriy inline naqshlar → 11 ta klass nomzodi

261+ inline uslubni ko'r-ko'rona ko'chirish o'rniga aniqlangan naqshlar
(taxminiy takrorlanish soni):

| # | Klass | Nima | ~Takror |
|---|---|---|---|
| 1 | `.admin-stack` | `flex; column; gap` | ~15 |
| 2 | `.admin-form-row` | label+input ustuni (`gap: 8`) | ~14 |
| 3 | `.admin-label` | `--fs-md`, `--text3`, 600 | ~14 |
| 4 | `.admin-row-between` | `flex; space-between; center; wrap; gap` | ~10 |
| 5 | `.admin-chip` + `--red/--green/--amber/--blue` modifikatorlari | kichik rozetka | ~10 |
| 6 | `.admin-btn-danger` | `color/borderColor: var(--red)` | ~8 |
| 7 | `.admin-meta-line` | `--fs-xs`, `--text3`, flex, wrap | ~6 |
| 8 | `.admin-card` | `bg2` + `border` + `radius` | ~6 |
| 9 | `.admin-empty-block` | markaz, `padding`, `--text3` | ~6 |
| 10 | `.admin-modal-overlay` + `.admin-modal-panel` | 2 ta o'z modali + 2 ta `modal-overlay` | 4 |
| 11 | `.admin-table` (`th`/`td`) | referral jadvali | 12 ta inline → 1 klass |

Bu 11 ta klass inline uslublarning taxminan **60–70%** ini yopadi. Qolganlari
(bir martalik joylashuv nozikliklari) inline qolishi mumkin — ularni majburan
ko'chirish foyda bermaydi.

**Alohida:** `PromoTab.jsx:141-146` va `SchoolsTab.jsx:31-39` da **bir xil**
`inputStyle`/`labelStyle` obyektlari nusxalangan → 2 va 3-klasslar bilan
almashtiriladi.

⚠️ `AdminPage.css:483-486` dagi eslatmaga rioya qilinsin: faqat `.admin-*`
prefiksli klasslar, global klasslar (`.btn`, `.modal-overlay`) qayta
belgilanmasin — fayl lazy yuklanadi va sahifadan chiqilgach ham DOM'da qoladi.

---

## 6. Xulosa — raqamlarda

| Toifa | Soni |
|---|---|
| **A** — siniq/xato ishlaydigan funksiyalar | **17** (5 yuqori, 9 o'rta, 3 past) |
| **B** — yetishmayotgan funksiyalar | **8** |
| **C** — o'chirishga nomzodlar | **6** (1 tasi Vercel slotini bo'shatadi) |
| **D** — dizayn ishlari | **9 guruh** |

**Kod hali o'zgartirilmagan.** `firestore.rules` ham tegilmagan.

Rules o'zgarishi **faqat B-5** (admin jurnali) uchun kerak bo'ladi — u
**SINALMAGAN** deb belgilanadi (emulyator yo'q) va tartib bo'yicha **kod avval,
qoidalar keyin** qo'llaniladi.

---

## 7. Ma'lumotga / muhitga ta'sir qiluvchi bandlar (alohida ajratilgan)

Bosqich 3 da bular **alohida commit** bo'lishi va alohida tasdiq talab qilishi kerak:

| Band | Ta'sir |
|---|---|
| **A-5** | Mavjud muddatsiz (`premiumExpire: null`) hisoblarni nima qilish — migratsiya qarori |
| **A-10** | Yetim `referrals` — o'chirish yoki anonimlashtirish (moliyaviy iz) |
| **A-11** | `redemptions` subkolleksiyasini tozalash — qaytarilmas |
| **C-1** | `api/admin-publish.js` ni o'chirish — Vercel funksiyasi yo'qoladi |
| **B-5** | `firestore.rules` ga yangi kolleksiya — SINALMAGAN |
