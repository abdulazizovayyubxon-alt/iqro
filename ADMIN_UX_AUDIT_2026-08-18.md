# Admin paneli — Back-Office UX auditi

**Sana:** 2026-08-18
**Qamrov:** kontent boshqaruvi · moderatsiya · analitika
**Usul:** kod o'qildi, taxmin qilinmadi. Har bir topilma `fayl:satr` bilan bog'langan.

---

## ✅ BAJARILGAN ISHLAR (2026-08-18, audit bilan bir kunda)

Quyidagilar shu auditdan keyin **kodga kiritildi**. Tekshiruv:
`npm run lint` → 0 xato · `npm test` → **225 ta test o'tdi** (17 tasi yangi) ·
`npm run build` → muvaffaqiyatli.

### Ildiz sabab — tiklandi

| | |
|---|---|
| `objections.questionId` | ✅ `ObjectionContext.jsx:122` — endi saqlanadi |
| `objections.reason` / `status` | ✅ triaj maydonlari qo'shildi |

### Moderatsiya

| Band | Holat | Nima qilindi |
|---|---|---|
| **M-1** | ✅ | Yangi `FixQuestionModal` — savolni chindan tuzatadi. Eski tugma «Faqat yopish» deb qayta nomlandi (endi u nima qilishini rostgo'ylik bilan aytadi) |
| **M-2** | ✅ | Savol `questionId` bo'yicha **1 o'qishda** ochiladi (47 000 emas) |
| **M-3** | ✅ | Foydalanuvchi shikoyat turini tanlaydi (6 chip, uz/ru/en); admin panelda chip va oynada ko'rinadi |
| **M-4** | ✅ | Saqlashda **shu savolga tegishli barcha e'tiroz** birdan yopiladi va har bir shikoyatchiga bildirishnoma ketadi |
| **M-5** | ❌ | E'tirozlar sahifalash — qilinmadi |

«Muomaladan olish» **haqiqiy**: savolga `status: 'retired'` yoziladi va u
paketdan hamda ikkala zaxira yo'ldan (`TestPage`, `ExamPage`) chiqariladi —
aks holda tugma M-1 da tanqid qilingan soxta naqshning o'zi bo'lardi.

### Analitika

| Band | Holat | Nima qilindi |
|---|---|---|
| **A-1** | ✅ | `answerLog` (engine) → `answerEvents` (mijoz) → `questionStats` (cron agregatsiyasi) → **«Shubhali savollar»** ro'yxati, har qatorda diagnoz va «Tuzatish» tugmasi |
| **A-2** | ✅ | `cron-daily` endi **so'mdagi summani** yozadi (`paymentsSumToday`, `paymentsSum30d`); panelda bugungi/30 kunlik tushum va o'rtacha chek |
| **A-3** | ✅ | «So'nggi 15 daqiqada faol» — 1 ta agregat so'rov, 60 s da bir, faqat tab ko'rinib turganda |
| **A-4** | ❌ | Grafiklar — qilinmadi |
| **A-5** | ❌ | 13 → 5 tab — qilinmadi |

**Diagnoz** javob taqsimotidan chiqariladi va uch turni ajratadi:
`kalit shubhali` · `ikki xil tushuniladi` · `o'lik distraktor`.
Mantiq `src/utils/questionDiagnosis.js` da — **9 ta test** bilan qoplangan.

### Kontent

| Band | Holat | Nima qilindi |
|---|---|---|
| **K-3** | ✅ | `qHash` — import dublikatni **serverdan** topadi (~7 so'rov). Bazani oldindan yuklash sharti **olib tashlandi**. Eski savollar uchun bir martalik «Dublikat kalitini to'ldirish» tugmasi |
| **K-5** | 🟡 | Clipboard'dan Ctrl+V bilan rasm qo'yish + WebP siqish (4 MB → ~120 KB). `alt` matni, variantga rasm va yetim fayllarni tozalash — **qilinmadi** |
| **K-1** | ❌ | Excel/Word import — qilinmadi |
| **K-2** | ❌ | Import oldidan ko'rish (dry-run) — qilinmadi |
| **K-4** | ❌ | LaTeX/KaTeX — qilinmadi |
| **K-6** | ❌ | `difficulty` / `grade` teglari — qilinmadi |
| **K-7** | ❌ | Sahifalash, ommaviy amallar — qilinmadi |

Yo'l-yo'lakay tuzatilgan **eski nuqson**: dublikat normalizatsiyasida oddiy
apostrof (U+0027) hisobga olinmasdi — «bo'lim» va «bo‘lim» turli savol
sanalardi va dublikat jimgina o'tib ketardi. Ta'rif endi bitta joyda
(`src/utils/qHash.js`).

Yana bittasi: rasm yuklashda `setNewQ({...newQ})` eskirgan yopilmani
ishlatardi — yuklash davomida admin matnni tahrirlasa, o'sha tahrir
yo'qolardi. Endi `setNewQ(prev => ...)`.

### Yangi fayllar

```
src/components/admin/FixQuestionModal.jsx   «Tuzatish» oynasi
src/utils/questionDiagnosis.js              diagnoz mantiqi  (+9 test)
src/utils/qHash.js                          dublikat kaliti  (+9 test)
src/utils/compressImage.js                  rasm siqish
src/__tests__/answerLog.test.js             javob jurnali    (+8 test)
```

### ⚠️ Deploydan oldin SHART

1. **`firestore.rules` deploy qilinsin** — `answerEvents` va `questionStats`
   qoidalari yangi. Deploy qilinmasa statistika jimgina yig'ilmaydi.
2. **«Dublikat kalitini to'ldirish» bir marta bosilsin** — busiz import eski
   47 000 savolni dublikat sifatida ko'rmaydi.
3. Composite indeks **kerak emas** — barcha yangi so'rovlar bitta maydon
   bo'yicha (`qHash`, `questionId`, `shown`, `lastActiveAt`).

### ⚠️ Ma'lumot o'tmishga ishlamaydi

`questionId` va `answerLog` **faqat deploydan keyingi** hodisalarda paydo
bo'ladi. Eski e'tirozlarda identifikator yo'q — «Tuzatish» oynasi buni ochiq
aytadi va soxta ishonch bermaydi. «Shubhali savollar» ro'yxati ham birinchi
kunlarda bo'sh turadi: statistika foydalanuvchilar test yechgandan va cron
ishlagandan keyin to'planadi.

---

## 0. Qamrov

**To'liq o'qilgan:**

| Fayl | Nima uchun |
|---|---|
| `src/pages/AdminPage.jsx` (233 KB, 13 tab) | asosiy panel |
| `src/context/ObjectionContext.jsx` | e'tiroz yozuvi |
| `api/cron-daily.js` (metrika bloki) | kunlik ko'rsatkichlar manbai |
| `src/data/mockData.js` (TOPICS) | teglash taksonomiyasi |

**Nishonli o'qilgan:** `src/context/AppContext.jsx` (xatolar saqlanishi), `package.json`,
`src/index.css` (tokenlar), `api/payment-webhook.js` (to'lov yozuvi).

**KO'RILMAGAN — halol ro'yxat:** `PromoTab.jsx`, `SchoolsTab.jsx`, `PartnerSetsTab.jsx`
(so'ralgan uch sohaga kirmaydi), Firestore indekslari, real foydalanuvchi seanslari
(faqat kod tahlili — metodist bilan suhbat o'tkazilmagan).

---

## 1. Bosh xulosa — uchta muammo, bitta ildiz

So'ralgan uch soha alohida ko'rinadi, lekin ularning **hammasi bitta nuqsondan** o'sib chiqadi:

> **Foydalanuvchi «savolda xatolik bor» deb bosganda, savolning `id` si saqlanmaydi.**

`src/context/ObjectionContext.jsx:92-111` — e'tiroz yoziladi, ichida savol **matni**,
variantlari va to'g'ri javobi bor. `questionObj.id` esa **tashlab yuboriladi**.

Buning oqibati zanjir bo'lib tarqaladi:

| Ildiz | Oqibat |
|---|---|
| `id` yo'q | E'tirozdan savolga o'tib bo'lmaydi → «1 tugma bilan tuzatish» **texnik jihatdan imkonsiz** |
| `id` yo'q | Guruhlash matn bo'yicha ketadi (`AdminPage.jsx:2063` — birinchi 100 belgi) → bitta savol haqidagi 5 ta shikoyat 5 ta alohida karta |
| `id` yo'q | Xatolar ham matn bo'yicha saqlanadi (`AppContext.jsx:1233`) → «qaysi savolda ko'p xato qilinyapti» **hisoblab bo'lmaydi** |
| `id` yo'q | Dublikat tekshiruvi matnni solishtiradi → import uchun **47 000 ta savolni yuklash shart** |

**Eng muhim jihat:** bu tuzatish deyarli bepul. Zanjir allaqachon butun:

- `AdminPage.jsx:1037` — savollar `{ id: d.id, ...d.data() }` bo'lib yuklanadi
- `AdminPage.jsx:1930` — paket `JSON.stringify(list)` — ya'ni **`id` paketning ichida bor**
- Demak test paytida mijozning qo'lida `q.id` **allaqachon turibdi**

`addObjection` unga `questionObj` ni to'liq oladi va `id` ni o'zi tashlaydi.
Ya'ni **bir qatorlik o'zgarish** butun auditning yarmini ochadi.

> ⚠️ Bu o'zgarish **o'tmishga ishlamaydi**. Faqat deploydan keyingi e'tirozlarda `id`
> bo'ladi. Shuning uchun u boshqa hamma ishdan **oldin** chiqishi kerak — har kechikkan
> kun `id` siz e'tirozlar to'planishi demak.

---

## 2. Savollar bazasini boshqarish

### K-1 🔴 Import faqat JSON — metodist JSON yozmaydi

`AdminPage.jsx:3018` — `accept=".json"`. Boshqa format qabul qilinmaydi.

Metodist real hayotda savolni **Word** yoki **Excel** da tayyorlaydi, yoki AI'dan matn
ko'chiradi. Hozirgi holatda u JSON yozishni bilishi kerak — yoki dasturchiga murojaat
qiladi. Bu kontent kiritishni **bitta odamga bog'lab qo'yadi**.

**Eng achinarlisi:** kerakli kutubxonalar **allaqachon o'rnatilgan**:

```
"xlsx": "^0.18.5"       ← Excel o'qish
"mammoth": "^1.12.0"    ← Word (.docx) o'qish
"docx": "^9.7.1"        ← Word yozish
```

Bu uchtasi `src/`, `pipeline/`, `scripts/`, `api/` ning **hech qayerida ishlatilmagan**.
Ya'ni imkoniyat sotib olingan, lekin ulanmagan.

### K-2 🔴 Import — «ko'r-ko'rona yozish», oldindan ko'rish yo'q

`AdminPage.jsx:757-793` — fayl tashlanadi, tekshiriladi va **darhol bazaga yoziladi**.
Natija faqat oxirida toast bo'lib chiqadi: «N ta takror, N ta format xatosi».

Metodist **yozishdan oldin** hech narsani ko'rmaydi. 200 ta savoldan 40 tasi rad etilsa
— qaysilari? Nega? Qaysi qatorda? Javob yo'q. Faylni tuzatib qayta yuklash uchun
metodist qorong'uda ishlaydi.

Validatsiya o'zi yaxshi (`AdminPage.jsx:747-779` — `topicId`, `correct` chegaralari
tekshiriladi, bu 2026-08-06 auditida to'g'irlangan). Muammo — **natijani ko'rsatmaslikda**.

### K-3 🔴 Import 47 000 ta o'qishni yeydi — kunlik kvotaning hammasini

`AdminPage.jsx:726-729`:

```js
if (!questionsLoaded) {
  showToast("Avval «Savollarni yuklash» tugmasini bosing — busiz dublikat tekshiruvi ishlamaydi", 'error');
  return;
}
```

Dublikat tekshiruvi mijoz tomonida, `questions` state'iga qarab ishlaydi
(`AdminPage.jsx:745`). Demak **20 ta savol qo'shish uchun ham** avval butun baza
yuklanadi — panelning o'z ogohlantirishiga ko'ra `~47 000` o'qish
(`AdminPage.jsx:2831`), bepul rejaning kunlik kvotasi esa `50 000`.

**Amaliy oqibat:** metodist bitta imlo xatosini tuzatsa, ilova o'sha kun davomida
**barcha foydalanuvchilar uchun** ishlamay qolishi mumkin.

**Yechim — `qHash`:** har savolga normallashtirilgan matn hash'ini yozib qo'yish va
`where('qHash', 'in', [...])` bilan 30 talab so'rash. 200 ta savollik import ≈ **7 ta
so'rov**, 47 000 emas. Bu K-3 ni ham, importni ham, tahrirni ham bir yo'la ochadi.

### K-4 🟠 Formula yo'q — LaTeX / MathJax umuman ulanmagan

`package.json` da `katex` ham, `mathjax` ham yo'q. Kimyo, biologiya, boshlang'ich sinf
matematikasi savollari **oddiy matn** sifatida yoziladi: `H2SO4`, `x^2`, `1/2`.

Kasal joyi: bu fanlar bazada **allaqachon bor** (`kimyo`, `biologiya`, `boshlangich`),
ya'ni muammo faraziy emas.

**Yechim:** `$...$` orasidagi matnni KaTeX bilan render qilish (~28 KB gz, faqat admin
va faqat `$` bo'lganda lazy-load). Manba matnda saqlanadi → **sxema o'zgarmaydi, eski
savollar buzilmaydi**.

Muhim nuqta: **metodist LaTeX sintaksisini o'rganmaydi**. Shuning uchun formula
paneli kerak — 12 ta real kerak bo'ladigan belgi (√ ∫ Σ kasr daraja indeks × ÷ ≈ ≤ ≥ π)
tugma bosilganda LaTeX parchasini o'zi qo'yadi.

### K-5 🟠 Rasm — faqat fayl tanlash, nusxa-ko'chirish yo'q

`AdminPage.jsx:884-898`:

- Faqat `<input type="file">` — **clipboard'dan qo'yib bo'lmaydi**
- Metodist PDF'dan skrinshot oladi → faylga saqlaydi → tanlaydi. Har savolda 3 qadam ortiqcha
- Siqish yo'q — telefon kamerasidagi 4 MB rasm o'zgarishsiz Storage'ga ketadi
- `alt` matni yo'q — ko'rish qobiliyati cheklangan foydalanuvchi uchun savol yo'qoladi
- Rasm faqat **savolga**, variantlarga qo'yib bo'lmaydi (Tasviriy san'at uchun jiddiy cheklov)
- Yo'l: `questions/${Date.now()}_${file.name}` — savol o'chirilsa rasm Storage'da **yetim qoladi**

### K-6 🔴 Teglash — 4 emas, aslida 1 o'lchov

So'ralgani: **Fan → Sinf → Mavzu → Qiyinlik**. Bazadagisi:

```js
// AdminPage.jsx:476
{ q, opts[4], correct, topicId, explanation, mnemonic, image }
```

- **Qiyinlik darajasi — yo'q.** Umuman mavjud emas.
- **Sinf — yo'q.**
- **Fan — mustaqil emas.** `getCategoryFromTopicId` (`AdminPage.jsx:109-113`) uni
  `topicId` dan **kelib chiqaradi**.

Ya'ni real taksonomiya — bitta global butun son `topicId`, 17 ta fan bo'ylab yagona
tekis fazoda. Metodist «6-sinf, qiyin» deb belgilay olmaydi, chunki bunday maydon yo'q.

`TOPICS` obyekti ham buni tasdiqlaydi (`mockData.js`):
`{ id, name, subtitle, icon, day, category, theoryHint }` — `difficulty` ham, `grade` ham yo'q.

Qo'shimcha: 17 ta fan ro'yxati filtrda **JSX ichiga qo'lda yozilgan**
(`AdminPage.jsx:2956-2973`) — yangi fan qo'shilsa bu yer unutiladi.

### K-7 🟠 Ro'yxat 50 tada qotib qoladi

`AdminPage.jsx:3044` — `.slice(0, 50)`, so'ng «... va yana N ta savol». Sahifalash yo'q,
virtualizatsiya yo'q. 51-savolga yetish uchun qidiruvni aniqlashtirish kerak.

Yo'q narsalar: ommaviy tanlash, ommaviy o'chirish, ommaviy qayta teglash, bekor qilish (undo),
qoralama/nashr holati (`status`), `updatedAt`/`updatedBy`, versiya tarixi.

---

## 3. Moderatsiya — e'tirozlar

### M-1 🔴 «Hal qilindi» tugmasi savolni tuzatmaydi

`AdminPage.jsx:1211`:

```js
await updateDoc(doc(db, 'objections', fbId), { solved: true, solvedBy: user.email, solvedAt: new Date() });
```

Bu **faqat e'tirozga bayroq qo'yadi**. Savolning o'zi tegilmaydi.

Amalda: admin «Hal qilindi» ni bosadi → hisoblagich nolga tushadi → panel toza ko'rinadi
→ **buzuq savol foydalanuvchilarga borishda davom etadi**. Panel adminni «ish bajarildi»
deb ishontiradi. Bu shunchaki yetishmovchilik emas — bu **noto'g'ri ma'lumot beruvchi
interfeys**.

### M-2 🔴 Tuzatish uchun 6 qadam va bir kunlik kvota

Hozirgi real yo'l:

1. E'tirozdagi savol matnini o'qish
2. «Savollar» tabiga o'tish
3. «Tushundim — baribir yuklash» → **~47 000 o'qish** (K-3)
4. Matn bo'yicha qidirish
5. Tahrirlash
6. «Paketlarni qayta qurish» → «Yangilanishni yuborish»

Bitta vergulni tuzatish uchun kunlik kvotaning hammasi. Amalda bu shuni anglatadiki,
adminlar buni **umuman qilmaydi** — «Hal qilindi» bosiladi va savol qoladi.

### M-3 🟠 Triaj yo'q

E'tirozda faqat erkin `note` matni bor. Yo'q narsalar:

- **Shikoyat turi** (javob noto'g'ri / imlo / ikki xil tushuniladi / eskirgan / rasm ko'rinmaydi)
- **Rad etish sababi** — admin «xato yo'q» deb yopa olmaydi, faqat o'chira oladi
- **Mas'ul biriktirish** — bir nechta metodist bo'lsa kim nima qilayotgani ko'rinmaydi
- **Javob qaytarish** — e'tiroz yuborgan odam natijani bilmaydi

Solishtiring: «So'rovlar» tabi buni **to'g'ri** qiladi — `handleFulfillRequest` so'rov
yuborgan hammaga bildirishnoma yuboradi (`AdminPage.jsx:2760`). E'tirozlarda esa yo'q.
Ya'ni naqsh loyihada bor, shunchaki bu yerga qo'llanmagan.

### M-4 🟠 Takroriy shikoyatlar birlashmaydi

`AdminPage.jsx:2063` — `objKey` = matnning birinchi 100 belgisi. Guruhlash yo'q, faqat
`⚠ N ta shikoyat` chipi. 5 kishi bitta savoldan shikoyat qilsa — **5 ta alohida karta**,
har birini alohida yopish kerak.

### M-5 🔵 Faqat oxirgi 200 ta

`AdminPage.jsx:904` — `limit(200)`. Sarlavhadagi son server agregatidan olinadi
(to'g'ri), lekin ro'yxatning o'zida sahifalash yo'q — 200 dan nariga o'tib bo'lmaydi.

---

## 4. Analitika va Dashboard

### A-1 🔴 «Qaysi savolda ko'p xato qilinyapti» — javob berib bo'lmaydi

Bu so'ralgan savolga to'g'ridan-to'g'ri javob: **hozir hech qanday yo'l bilan bilib bo'lmaydi.**

Butun kodda savol darajasidagi to'g'ri/xato agregatsiyasi **yo'q**:

- `wrongCount` (`ExamPage.jsx:1025`) — bitta seans ichida, saqlanmaydi
- `catStats.mistakes` (`AppContext.jsx:844`) — foydalanuvchiga xos, chegaralangan
  (`MAX_MISTAKES_SAVED`), va yana **matn bo'yicha** kalitlangan (`AppContext.jsx:1233`)
- `questionStats` degan kolleksiya mavjud emas

Ya'ni «noto'g'ri tuzilgan savolni statistika orqali topish» imkoniyati **nolga teng**.
Buzuq savol faqat kimdir shikoyat qilsa topiladi — kimdir shikoyat qilsa esa M-1/M-2
tufayli baribir tuzatilmaydi.

### A-2 🔴 Tushum — so'mda hech qayerda ko'rsatilmagan

`api/cron-daily.js:563-567`:

```js
num(db.collection('payments').count().get()),                          // paymentsTotal
num(db.collection('payments').where('createdAt','>=',since(1)).count().get()), // paymentsToday
```

Ikkalasi ham **`.count()`** — ya'ni **tranzaksiyalar soni**, summa emas.

«To'lovlar» tabida (`AdminPage.jsx:2586-2622`) har qatorda `paidAmount` bor, lekin u
**hech qayerda qo'shilmaydi**. Panelda «bugun necha so'm tushdi?» degan savolga javob
beradigan **birorta raqam yo'q**. MRR, ARPU, o'rtacha chek — hech qaysisi.

Bu biznes uchun eng katta ko'r nuqta: 12 ta to'lov `12 × 29 000` ham, `12 × 199 000` ham
bo'lishi mumkin — panel farqni ko'rsatmaydi.

### A-3 🟠 «Real vaqt» — sutkada bir marta

Metrikalar `api/cron-daily.js` da kuniga bir marta, Toshkent vaqti bilan 11:00 da
yoziladi. «Kunlik faol» — o'sha bir lahzada hisoblangan «oxirgi 24 soat».

Ya'ni **hozir nechta odam test yechayotgani ko'rinmaydi**, va ertalab 11:00 dagi raqam
kechqurun 23:00 gacha o'zgarmaydi.

Halol yechim (Firestore presence qimmat): `userStats.lastActiveAt >= now - 15min`
bo'yicha **bitta agregat so'rov**, tab ochiq va ko'rinib turganda 60 soniyada bir
yangilanadi. Bu «hozir onlayn» emas, «so'nggi 15 daqiqada faol» — shunday deb
**yozib qo'yish kerak**, chunki panel o'zini haqiqatdan aniqroq ko'rsatmasligi lozim.

### A-4 🟠 Statistika tabida shakl yo'q

`AdminPage.jsx:3342+` — stat qutilar va xom jadval. Grafik yo'q, trend yo'q, kechagi
kun bilan solishtirish yo'q. Voronka (`3413-3448`) yaxshi qo'shilgan, lekin u ham faqat
oxirgi kun uchun — dinamikasi ko'rinmaydi.

### A-5 🔵 13 ta tab — asosiy narsa yo'qoladi

`AdminPage.jsx:2198-2212`. Kirish nuqtasi `objections` (`:139`). Umumiy holat
ko'rsatadigan bosh ekran yo'q — 3 ta kichik raqam sarlavhada turadi, xolos.

---

## 5. Taklif etilayotgan prototip

### 5.1 Ma'lumot modeli — 3 ta o'zgarish

**(1) `objections` hujjatiga:**

```js
questionId,                    // ← ILDIZ TUZATISH
reason,                        // 'wrong_answer'|'typo'|'ambiguous'|'outdated'|'image'
status,                        // 'new'|'fixing'|'fixed'|'rejected'
resolution                     // rad etilsa — sabab
```

**(2) `questions` hujjatiga:**

```js
qHash,                         // dublikatni arzon topish uchun (K-3)
difficulty,                    // 1-5 — qo'lda yoki statistikadan
grade,                         // sinf (ixtiyoriy)
status,                        // 'draft'|'published'|'retired'
updatedAt, updatedBy,          // kim, qachon
flagCount                      // ochiq shikoyatlar soni
```

**(3) Yangi `questionStats/{questionId}`:**

```js
shown, correct, wrong,
optionPicks: [n, n, n, n],     // ← eng qimmatli maydon
avgTimeMs, lastComputedAt
```

**Qanday to'ldiriladi (kvotani buzmasdan):** mijoz test yakunida `userStats` ga
allaqachon yozadi. O'sha yozuvga ixcham `answerLog: [{qid, ok, ms}]` qo'shiladi
(qo'shimcha **o'qish yo'q**). `cron-daily` faqat yangi hujjatlarni o'qib `questionStats`
ga yig'adi. Kuniga 200 ta test = **200 o'qish**, javob soniga bog'liq emas.

### 5.2 Moderatsiya — «Tuzatish» tugmasi

E'tiroz kartasida bitta asosiy tugma: **Tuzatish**. U modal ochadi va
`getDoc(doc(db,'questions', questionId))` bilan **1 ta o'qish** qiladi (47 000 emas).

Modal ichida:

- **Yonma-yon solishtirish:** foydalanuvchi ko'rgan nusxa (e'tirozdagi snapshot) ⟷ bazadagi
  hozirgi holat. Farq bo'lsa — savol allaqachon tuzatilgan, admin buni **darhol ko'radi**
- Shikoyat matni tepada qadab qo'yilgan
- Variantlar joyida tahrirlanadi
- Statistika lentasi: `847 marta ko'rsatilgan · 71% xato · B variantni 68% tanlagan`
  — ya'ni javob kaliti noto'g'ri ekani **shu yerda ko'rinadi**

Saqlash **atomar** bo'ladi: savol yangilanadi → **shu `questionId` ga tegishli hamma
e'tiroz** yopiladi (M-4 hal bo'ladi) → shikoyat qilganlarga bildirishnoma ketadi (M-3) →
paket «eskirgan» deb belgilanadi.

To'rtta natija tugmasi: **Tuzatdim** · **Xato yo'q — rad etish** · **Muomaladan olish
(retire)** · **Keyinroq**.

«Retire» muhim: savol chindan buzuq, lekin metodist hozir tuzata olmasa — bitta bosish
bilan **aylanmadan chiqariladi**, navbatda turib odamlarga zarar bermaydi.

### 5.3 Import — 3 qadamli sehrgar

| Qadam | Nima bo'ladi |
|---|---|
| **1. Yuklash** | `.xlsx` · `.docx` · `.csv` · `.json` + «AI'dan matn qo'yish» maydoni. `xlsx` va `mammoth` allaqachon o'rnatilgan |
| **2. Moslash** | Birinchi 20 qator jadvalda. Ustunlar avtomatik topiladi, metodist tasdiqlaydi: Savol / A / B / C / D / To'g'ri / Izoh / Mavzu / Qiyinlik. Moslash **fan bo'yicha shablon** sifatida eslab qolinadi |
| **3. Tekshirish** | **Yozishdan oldin** hisobot: N ta yangi · N ta dublikat (topilgan mavjud savol yonida ko'rsatiladi) · N ta xato (qator raqami + sabab, tuzatib qayta yuklash uchun fayl yuklab olinadi). **«Yozish» bosilmaguncha bazaga hech narsa tegmaydi** |

Dublikat `qHash` orqali tekshiriladi → **47 000 o'qish o'rniga ~7 ta so'rov**.

### 5.4 Muharrir — formula va rasm

- Savol matni va **har bir variant** uchun bitta `RichAnswerField`
- `$...$` ichi KaTeX bilan yozayotganda render qilinadi (lazy, faqat admin)
- **Formula paneli:** 12 ta tugma LaTeX parchasini qo'yadi — metodist sintaksis o'rganmaydi
- **Clipboard'dan rasm qo'yish** (`onPaste` → Storage). Eng katta vaqt tejovchi o'zgarish
- Yuklashdan oldin WebP ga siqish
- `alt` matni maydoni
- Savol o'chirilsa — rasmi ham o'chadi (K-5 dagi yetim fayllar)

### 5.5 Teglash

Muharrirdagi doimiy teg qatori: **Fan → Sinf → Mavzu → Qiyinlik**.

- «Teglarni saqlab qolish» tugmasi — bitta mavzuga 50 ta savol kiritayotgan metodist
  teglarni **bir marta** qo'yadi
- Oxirgi ishlatilgan teglar chip sifatida yonida turadi
- Statistika yig'ilgach **qiyinlik avtomatik taklif qilinadi**:
  `>85% to'g'ri` → oson · `40-70%` → o'rta · `<35%` → qiyin **yoki buzuq**.
  Metodistning qo'lidagi yorliq bilan yonma-yon ko'rsatiladi

### 5.6 Bosh ekran (yangi, birinchi tab)

**Yuqori qator — 4 ta plitka:**

| Plitka | Manba |
|---|---|
| **Hozir faol** (so'nggi 15 daq) | 1 ta agregat so'rov, 60 s da yangilanadi (A-3) |
| **Bugungi tushum, so'm** | `paidAmount` **yig'indisi** — hozir yo'q (A-2) |
| **Bugungi DAU** | mavjud cron metrikasi |
| **Kutayotgan e'tirozlar** | mavjud agregat |

**Ostida — «Shubhali savollar»** (eng qimmatli blok):

`questionStats` dan tartiblangan jadval: `xato > 75%` **va** `ko'rsatilgan > 30`,
`ko'rsatilgan × xato foizi` bo'yicha saralangan. Har qatorda **o'sha «Tuzatish» tugmasi**.

Bu **hech kim shikoyat qilmagan** buzuq savollarni topadi — ya'ni moderatsiyani
reaktivdan proaktivga o'tkazadi.

Ikkita qo'shimcha signal:

- **Javob kaliti shubhali:** 70% `B` ni tanlagan, «to'g'ri» esa `C` → kalit
  ehtimol noto'g'ri. Taxmin emas, **diagnoz**
- **O'lik distraktor:** hech kim tanlamaydigan variant → savol yomon tuzilgan

### 5.7 Tab tuzilishi: 13 → 5

| Guruh | Ichida |
|---|---|
| **Nazorat** | bosh ekran, shubhali savollar |
| **Kontent** | savollar, import, so'rovlar |
| **Moderatsiya** | e'tirozlar, jurnal |
| **Biznes** | to'lovlar, tariflar, promo, referral, maktablar, hamkor |
| **Odamlar** | foydalanuvchilar, xabarlar |

Desktopda yon panel, mobilda pastdan chiquvchi varaq.

---

## 6. Bosqichma-bosqich reja

| Faza | Ish | Hajm | Nima ochiladi |
|---|---|---|---|
| **0** | `questionId` ni e'tirozga yozish · `answerLog` yig'a boshlash | **~1 soat** | Hamma qolgani. **Birinchi chiqishi shart** — ma'lumot shu kundan yig'iladi |
| **1** | «Tuzatish» modali · `qHash` dublikat · tushum yig'indisi | ~1 hafta | M-1, M-2, M-4, K-3, A-2 |
| **2** | Import sehrgari · KaTeX · clipboard rasm | ~2 hafta | K-1, K-2, K-4, K-5 |
| **3** | `questionStats` · bosh ekran · shubhali savollar | ~2 hafta | A-1, A-3, A-4 |
| **4** | Teglash (`difficulty`, `grade`) · tab qayta tuzilishi | ~1 hafta | K-6, A-5 |

**Faza 0 ni kechiktirmaslik kerak.** U bir soatlik ish, lekin **o'tmishga ishlamaydi** —
bugun chiqmasa, ertangi e'tirozlar ham `id` siz to'planadi va Faza 1 ning qiymati
shuncha kamayadi.

---

## 7. Xulosa — raqamlarda

| | |
|---|---|
| Topilma | **17** (🔴 8 · 🟠 7 · 🔵 2) |
| Ildiz sabab | **1** — `questionId` saqlanmaydi |
| Bitta qatorlik tuzatish ochadigan topilmalar | **4** |
| O'rnatilgan, lekin ulanmagan kutubxonalar | **3** (`xlsx`, `mammoth`, `docx`) |
| Bitta imlo xatosini tuzatish narxi (hozir) | **~47 000 o'qish** = kunlik kvota |
| Bitta imlo xatosini tuzatish narxi (taklifdan keyin) | **1 o'qish** |
| Panelda so'mdagi tushum ko'rsatkichi | **0 ta** |
| Savol darajasidagi xato statistikasi | **mavjud emas** |

**Bir jumlada:** panel *ma'lumotni ko'rsatishni* yaxshi biladi, lekin *ish bajarishga*
yo'l bermaydi — chunki e'tiroz bilan savol o'rtasidagi bog'lanish yozilmagan holda
tashlab yuborilgan. O'sha bir qatorni tiklash qolgan hamma narsani mumkin qiladi.
