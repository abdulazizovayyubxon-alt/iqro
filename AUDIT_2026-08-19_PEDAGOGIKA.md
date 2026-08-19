# Zehin — Pedagogik mantiq va test tajribasi auditi

**Sana:** 2026-08-19 · **Qamrov:** testgacha bosqich, test jarayoni, natija tahlili, qayta ishlash silsilasi
**Holat:** 14 banddan **13 tasi bajarildi** (2026-08-19). 1 tasi ataylab qoldirildi — pastga qarang.

---

## BAJARILGAN ISHLAR

| Band | Holat | Nima qilindi |
|---|---|---|
| T-1 Xatolar tugmasi o'lik | ✅ | `state.mistakes` → `state.stats[cat].mistakes`; tugma birinchi darajali harakatga ko'tarildi va «Keyingi blok»dan yuqoriga qo'yildi |
| T-2 Xatolarda izoh yo'qolishi | ✅ | `explanation`/`mnemonic`/`source` xato yozuviga saqlanadi; sun'iy matn olib tashlandi; eski yozuvlar uchun keshlangan bazadan izoh tiklanadi; xatolar daftarida izoh bloki paydo bo'ldi |
| T-3 Xatolar qabristoni | ✅ | Yangi modul `engine/mistakeQueue.js`: `qHash` bo'yicha dedup, «yopish» (2 to'g'ri + ≥3 kun), «tirishqoq» (5+ xato), chegara 50→300, kesish endi eng eskisini emas yopilganini o'chiradi. **To'ldirish (2026-08-19):** `recordMistakeOutcome` — «Takror» sahifasidagi javoblar ham xatoni yopadi (ilgari hayot sikli faqat test/imtihon yakunida ishlardi); tirishqoq savollar uchun nazariyaga bevosita o'tish tugmasi |
| T-4 SRS xotira ufqi ~1 kun | ✅ | Og'ir/yengil karta ajratildi (to'g'ri javob ~130 bayt); chegara 200→800; kesish endi yetuk emas, **zaif** kartani saqlaydi |
| T-5 Maksimal oraliq 4.3 kun | ✅ | Oraliqlar zinapoyasi kunlarda (1→3→7→16→35→75→150), ±10% fuzz, **imtihon sanasiga siqish** |
| T-6 Mini-test jadvalsiz | ✅ | `buildMistakeDrill`: 60% muddati kelgan / 25% ko'p xato / 15% nazorat; Fisher-Yates |
| T-7 Natijada mavzu kesimi yo'q | ✅ | `topicBreakdown` + natija ekranida kasr/foiz/chiziq jadvali, kam namunali bo'lim belgilanadi, zaif bo'limga harakat tugmasi |
| T-8 Imtihonda faqat 1 zaif bo'lim | ✅ | To'liq ro'yxat, kasr+foiz+yo'qotilgan ball, chegara `targetScore` dan, grid sarlavhalarida foiz |
| T-9 Start ekrani «afisha» | ✅ | «Imtihon shartnomasi»: 7 qoida + savol boshiga vaqt byudjeti; o'lik `simulatorDesc` ishga solindi |
| T-10 Mashqda avto-xato taymer | ✅ | Sukut bo'yicha sekundomer (tanlov eslab qolinadi); `TIMED_OUT` endi statistikaga, xatolarga va kartalarga **umuman kirmaydi** |
| T-11 Mashqda navigator yo'q | ✅ | Yangi `QuestionNavigator.jsx` (mobil-birinchi panjara + izoh) va bayroq tugmasi; sessiyada saqlanadi |
| T-13 Taymer tahdid rejimida | ✅ | `ExamTimer` sur'at ko'rsatkichiga aylandi (holat matni + ikki belgili chiziq); rang vaqtni emas holatni bildiradi; cheksiz pulsatsiya cheklandi va `prefers-reduced-motion` qo'shildi |
| T-14 Xatolarni ko'rish oqimi | ✅ | Natija ekranida «Xatolarimni ko'rib chiqish (N ta)» — faqat xato/qoldirilganlar bo'ylab `4/17` hisoblagichi bilan ketma-ket oqim |
| **T-12 Javobni o'zgartirish** | ❌ | **Rad etildi** (egasi qarori, 2026-08-19) — pastga qarang |

**Qo'shimcha (auditda yo'q edi, ish davomida topildi):**

- `questionKey` endi **kanonik shakl** bo'yicha hisoblanadi («Savol kodi: #...» qo'shimchasi va ortiqcha bo'shliqlar tashlanadi). Bunsiz xatolar mashqida tozalangan matn boshqa kalit berardi va xato **hech qachon yopilmasdi** — T-3 hayot sikli jimgina ishlamay qolardi.
- `dueCardCount` — yagona manba. BottomNav/Sidebar nishonchasi, Dashboard va DiagnosticsEngine endi SmartReviewPage bilan **bir xil** raqamni ko'rsatadi (yengil kartalar sanalmaydi).
- `src/components/QuestionMedia.jsx` — `useEffect` import qilinmagan holda ishlatilardi (ishga tushish xatosi). Bu men boshlashimdan oldingi tahrir edi, tuzatildi.

**Testlar:** 70 ta yangi test (`mistakeQueue.test.js`, `spacedRepetition.test.js`). Jami 298 ta test o'tadi, eslint 0 xato, `npm run build` muvaffaqiyatli.

### T-12 nega qoldirildi

Auditda mashq rejimida javobni **ikki bosqichda** tasdiqlash taklif qilingandi (tasodifiy teginishdan himoya). Bu ilovadagi **eng ko'p takrorlanadigan harakatni** o'zgartiradi — 50 savollik blokda 50 ta qo'shimcha teginish. Foydalanuvchi sinovisiz bunday qarorni bir tomonlama qabul qilish to'g'ri emas.

Ikki muhim tafsilot bu bandning shoshilinchligini kamaytiradi:

1. **Imtihon rejimida javob allaqachon erkin o'zgaradi** — `ExamPage.handleSelect` hech narsani qulflamaydi. Auditning shu yarmi amalda mavjud edi.
2. **T-3 dan keyin tasodifiy teginishning narxi keskin tushdi**: bitta yolg'on xato endi abadiy qolmaydi — 2 marta to'g'ri javobdan keyin avtomatik «yopiladi».

**EGASI QARORI (2026-08-19): ikki bosqichli tasdiqlash KERAK EMAS.** Band yopildi —
mashq rejimida birinchi teginish yakuniy bo'lib qoladi. Bu bandga qaytilmaydi.

---

Tahlil qilingan fayllar: `src/pages/TestPage.jsx`, `src/pages/ExamPage.jsx`,
`src/pages/ErrorNotebookPage.jsx`, `src/pages/SmartReviewPage.jsx`,
`src/components/test/*`, `src/engine/SmartQuestionEngine.js`,
`src/context/AppContext.jsx`, `src/config.js`, `chqbt_app_import.json` (2 596 savol).

---

## 0. Nima yaxshi (buzmaslik kerak)

| Aktiv | Dalil |
|---|---|
| Izohlar bazasi | chqbt bankidagi **2 596 savolning 100%** ida `explanation` bor; mediana **226 belgi**; 60 belgidan qisqasi atigi 20 ta. Bozorda kam uchraydigan aktiv. |
| Taymer arxitekturasi | `ExamTimer`/`TimerPill` wall-clock deadline + `visibilitychange` resync. Fonda muzlash va aldash vektori yopilgan. |
| Anti-cheat olib tashlangani | 2026-06-17 qarori to'g'ri — mobil `visibilitychange` halol foydalanuvchini jazolardi. |
| Diagnostika dvigateli | `DiagnosticsEngine` + `AnalysisPage` bo'limlarni `expectedLoss` bo'yicha saralaydi. Bu allaqachon kuchli. |
| Imtihon navigatori | 50 katakli grid, `flagged`, legend — attestatsiya formatiga mos. |

**Asosiy xulosa:** zarur mexanizmlarning ko'pchiligi ALLAQACHON YOZILGAN, lekin ular
bir-biriga ULANMAGAN yoki foydalanuvchiga KO'RINMAYDI. Quyidagi 14 banddan 6 tasi —
1–20 qatorlik ulanish xatosi, algoritm qayta yozish emas.

---

# 1. TESTGACHA BO'LGAN BOSQICH

## T-9 · Imtihon boshlanish ekrani "shartnoma" emas, afisha

**[Kamchilik]**
`ExamPage.jsx:1074-1080` — start ekrani faqat 3 ta chip beradi:
`50 ta savol` · `90 daqiqa` · fan nomi. Boshqa hech narsa yo'q.

Hech qayerda aytilmaydi:

- **O'tish bo'sag'asi.** `config.js:16` da `EXAM_GOAL_SCORE = 70` bor, natija
  ekranida chegara rang uchun ishlatiladi — lekin BOSHLASHDAN OLDIN aytilmaydi.
- **Ball hisoblash.** Xato uchun minus bormi? (Yo'q.) Tashlab ketilgan savol
  xato hisoblanadimi? (Natijada `statSkipped` alohida — lekin oldindan emas.)
- **Vaqt tugaganda nima bo'ladi.** (Avto-yakunlanadi.)
- **Savolga qaytish va belgilash mumkinligi.**
- **Ilovadan chiqib ketsa imtihon buzilmasligi** (`examSessionKey` da saqlanadi).
- **Savol boshiga vaqt byudjeti:** 90 daq / 50 savol = **1 daq 48 son**.
  Bu raqam hech qayerda hisoblab berilmaydi.

Ustiga-ustak `exam.simulatorDesc` matni **uz/ru/en uchtala tarjimada yozilgan**
(`src/i18n/locales/uz.json:342`), lekin butun kod bazasida **hech qayerda render
qilinmaydi** — o'lik satr.

**[Salbiy ta'siri]**
Birinchi imtihonda kognitiv yuk savolga emas, interfeysni ochishga sarflanadi.
Pedagog "ulguraman-ulgurmayman" hisobini qila olmaydi va bu noaniqlik testdan
oldingi eng katta stress manbai bo'ladi. Amaliy oqibat: birinchi urinishda past
ball → "men tayyor emasman" degan noto'g'ri xulosa → chiqib ketish.

**[Yechim & namuna]**
Start ekranini **"Imtihon shartnomasi"**ga aylantiring — matn emas, ikonka+raqam:

```
50 savol            90 daqiqa            ~1 daq 48 son / savol
70% — o'tish        Xato uchun minus YO'Q
Tashlab ketilgan savol = xato           Vaqt tugasa avtomatik yakunlanadi
Istalgan savolga qaytish va belgilash mumkin
Ilovadan chiqsangiz imtihon saqlanadi
```

Pastida bitta havola: **"Formatni sinab ko'rish (3 savol, taymersiz)"**.

*Eng yaxshi namuna:* **Prometric/NBME tutorial** — rasmiy imtihondan oldin
sanalmaydigan interfeys mashqi. **UWorld** har blok oldidan
"Timed / Tutor / Untimed" tanlovini oqibati bilan bir ekranda tushuntiradi.

---

## T-10 · Mashq rejimida 60 soniyalik taymer sukut bo'yicha yoqilgan va o'zi XATO yozadi

**[Kamchilik]**
`TestPage.jsx:174` — `useState('countdown')`; `config.js:126` — `QUESTION_TIMER_SECONDS = 60`.
Vaqt tugaganda `handleTimeExpire` (`TestPage.jsx:243`):

```js
setAnswers(prev => (prev[currentQ] === undefined ? { ...prev, [currentQ]: -1 } : prev));
```

Ya'ni **javob ko'rilmasdan xato yozib qo'yiladi**. O'chirish mumkin (`TimerPill`
bosiladi), lekin bu affordance faqat `title` atributida — **mobil qurilmada `title`
ko'rinmaydi**. Mashq rejimida taymer borligi haqida ogohlantirish yo'q.

**[Salbiy ta'siri]**
Yangi savolni birinchi marta ko'rayotgan odam o'ylab ulgurmay "xato" oladi.
Bu yolg'on xato butun zanjirni ifloslantiradi: `-1` → `newMistakes` →
`spacedCards` da level 0 → `topicStats.correct` pasayadi → `DiagnosticsEngine`
bo'limni "zaif" deb belgilaydi → `AnalysisPage` foydalanuvchini **noto'g'ri
mavzuga** yo'naltiradi. Bitta UX qarori butun diagnostikani buzadi.

**[Yechim & namuna]**

1. Mashq rejimida sukut bo'yicha **`stopwatch`** — o'lchaydi, lekin jazolamaydi.
   `countdown` — ataylab tanlanadigan "Imtihon sur'ati" rejimi.
2. Vaqt tugaganda javobni `-1` deb yozmang: savolni **"o'tkazib yuborilgan"**
   holatiga qo'ying, izohni ochib bering, statistikaga `answered` sifatida
   KIRITMANG. Vaqt signalini alohida (`timeouts`) saqlang.
3. Rejim tanlovini ochiq qiling: `Mashq (taymersiz) / Sur'at (60s) / Imtihon`.

*Eng yaxshi namuna:* **UWorld "Tutor mode"** — mashqda taymer maslahat beradi,
ball qo'ymaydi. **Anki** hech qachon vaqt bo'yicha xato yozmaydi.

---

# 2. TEST YECHISH JARAYONI

## T-11 · Navigatsiya assimetriyasi: mashq rejimida grid ham, belgilash ham yo'q

**[Kamchilik]**
`ExamPage.jsx` da to'liq navigator bor: `flagged` state (133), 50 katakli grid (1752),
legend (1728), "Belgilash" tugmasi (1548), javob soni bilan yakunlash (1824).

`TestPage.jsx` da — `grep -n "flag" src/pages/TestPage.jsx` → **0 natija**.
Yagona navigatsiya (`TestPage.jsx:1200-1213`): `[Orqaga] [Keyingi]`.
Foydalanuvchi vaqtining ~90%i aynan TestPage'da o'tadi.

**[Salbiy ta'siri]**
50 savollik blokda 37-savolga qaytish uchun **13 marta "Orqaga"** bosish kerak.
Shubhali savolni belgilab qo'yib bo'lmaydi — "keyin qaytaman" strategiyasi
(imtihon topshirishning asosiy ko'nikmasi) mashq qilinmaydi.

**[Yechim & namuna]**
`ExamPage` navigatoridan **umumiy komponent** ajrating
(`components/test/QuestionNavigator.jsx`) va ikkala sahifada ishlating.
Mashqda kataklar 4 holatni ko'rsatsin: javobsiz / to'g'ri / xato / belgilangan.
Mobil uchun pastki chiziqda gorizontal minigrid (10 katak + swipe).

*Eng yaxshi namuna:* **UWorld** va DTM sinov platformalari — bayroq + grid
juftligi imtihon interfeysining de-fakto standarti.

---

## T-12 · Javobni o'zgartirib bo'lmaydi — tasodifiy teginish tuzatilmas xato

**[Kamchilik]**
`TestPage.jsx:708` — `if (answers[qIndex] !== undefined) return;`
Birinchi teginish yakuniy. (`QuestionBox.jsx:232` da `disabled` a11y sababli
ishlatilmagan, lekin mantiq baribir qulflaydi.)

**[Salbiy ta'siri]**
Mobil qurilmada scroll paytidagi tasodifiy teginish → tuzatib bo'lmaydigan xato →
xatolar ro'yxatiga yolg'on yozuv → zaif mavzu signali ifloslanadi.
Foydalanuvchi psixologiyasida bu "ilova meni tuzoqqa tushirdi" hissi.

**[Yechim & namuna]**
Mashq rejimida (darhol fikr-mulohaza bo'lgani uchun) qulf o'rinli, **lekin**
tanlovni 2 bosqichli qiling: 1-teginish variantni tanlaydi, "Tasdiqlash" yakunlaydi.
Imtihon rejimida javob **yakunlashgacha erkin o'zgarsin** — u yerda darhol
fikr-mulohaza yo'q, ya'ni qulflashning pedagogik sababi ham yo'q.
Qo'shimcha: `answerChanged` hodisasini yozing — natijada "o'zgartirgan 8
javobingizdan 6 tasi to'g'riga o'zgardi" degan qimmatli signal chiqadi.

*Eng yaxshi namuna:* **UWorld "Answer Changes"** hisoboti — foydalanuvchiga o'z
intuitsiyasiga qachon ishonishni o'rgatadi.

---

## T-13 · Taymer tahdid rejimida vizuallashtirilgan, sur'at signali yo'q

**[Kamchilik]**

- `TimerPill`: 60→0, 20 sonda amber, 10 sonda qizil + progress bar torayadi.
  50 savolda **~250 marta** rang-tahdid signali.
- `ExamTimer`: 10 daqiqada amber, 5 daqiqada qizil; doimiy soniyagacha aniqlik (`42:17`).
- Ikkalasida ham **konstruktiv** ma'lumot yo'q: "jadvaldan oldindamisiz?"
  degan savolga javob bermaydi.

`aria-live="off"` qo'yilgani to'g'ri, lekin bu faqat ekran o'quvchi uchun.

**[Salbiy ta'siri]**
Doimiy kamayuvchi qizil raqam — klassik vaqt bosimi generatori. Test tashvishi
yuqori foydalanuvchida (attestatsiya auditoriyasining katta qismi) bu ishchi
xotirani band qiladi va natijani real bilimdan PAST ko'rsatadi. Ya'ni ilovadagi
natija haqiqiy tayyorlikni kam baholaydi — diagnostika buziladi.

**[Yechim & namuna]**
Taymerni tahdiddan **sur'at ko'rsatkichiga** aylantiring:

1. **Asosiy vizual — chiziq, raqam emas.** Yupqa progress bar, ustida ikki marker:
   `siz` va `jadval`. Raqam faqat bosganda yoki oxirgi 5 daqiqada chiqadi.
2. **Rang mantig'i teskari:** yashil = jadvaldan oldindasiz, neytral = jadvalda,
   amber = orqadasiz. Rang **vaqtni emas, holatni** bildirsin.
3. **Faqat 3 ta diskret ogohlantirish:** 50% vaqt, 10 daqiqa, 2 daqiqa.
   Oraliqda taymer sokin turadi.
4. Savol taymerini (`TimerPill`) mashqda umuman olib tashlang — vaqt fonda
   o'lchansin (T-10 bilan birga).
5. `prefers-reduced-motion` da progress bar animatsiyasiz.

*Eng yaxshi namuna:* **Khan Academy** mashqda taymer ko'rsatmaydi, vaqtni fonda
o'lchaydi. **Duolingo** vaqt bosimini alohida ixtiyoriy rejimga ajratgan.

---

# 3. NATIJALAR VA XATOLAR TAHLILI

## T-1 · 🔴 KRITIK BUG: "Xatolar ustida ishlash" tugmasi HECH QACHON ko'rinmaydi

**[Kamchilik]**
`src/components/test/TestResults.jsx:152`:

```jsx
{state.mistakes?.length > 0 && (
  <button onClick={() => setMode('mistakes')}> Xatolar ustida ishlash </button>
)}
```

Lekin xatolar **`state.stats[cat].mistakes`** da saqlanadi
(`AppContext.jsx:981`, `1303`, `1320` — uchalasi ham `stats[cat]` ichida).
Top-level `state.mistakes` faqat `buildDefaultState()` da `[]` deb yaratiladi
(`AppContext.jsx:133`) va **hech qachon yozilmaydi**.

Shart **har doim `false`**. `ErrorNotebookPage.jsx:22` va `TestPage.jsx:416`
to'g'ri manbadan o'qiydi — faqat shu bitta joyda xato.

**[Salbiy ta'siri]**
Xatolar ustida ishlashga eng tabiiy, eng yuqori niyatli kirish nuqtasi — test
tugagan lahza, natija ko'z oldida turganda — **o'lik**. Foydalanuvchi bu
funksiyani faqat Tahlil sahifasi yoki `/errors` marshruti orqali tasodifan topadi.
Butun "qayta ishlash silsilasi"ning kirish eshigi yopiq.

**[Yechim & namuna]**

```js
const catMistakes = state.stats?.[state.activeCategory]?.mistakes || [];
{catMistakes.length > 0 && ( ... )}
```

Va tugmani ikkinchi darajali havoladan **birinchi darajali harakatga** ko'taring:
`Xatolar ustida ishlash (7 ta)` — "Keyingi blok"dan YUQORIDA turishi kerak.
Yangi materialga o'tishdan oldin xatoni yopish — retrieval practice'ning asosiy qoidasi.

---

## T-2 · 🔴 KRITIK: Xatolar ustida ishlaganda ilmiy izoh YO'QOLADI

**[Kamchilik]** Ikki bosqichli yo'qotish:

1. `SmartQuestionEngine.js` (`summarizeTestResults`) xatoni saqlaganda
   `explanation` maydonini **yozmaydi**:

   ```js
   newMistakes.push({ topic, topicId, question: q.q, correct: q.opts[q.correct], opts: q.opts || [] });
   ```

2. `TestPage.jsx:435` — mini-test qurilganda izoh o'rniga sun'iy matn qo'yiladi:

   ```js
   explanation: t('test.correctAnswerWas', { answer: m.correct })   // "To'g'ri javob: B"
   ```

`ErrorNotebookPage.jsx` da ham xuddi shu: kengaytirilgan kartochkada faqat
variantlar + to'g'ri javob ko'rinadi, izoh yo'q.

**[Salbiy ta'siri]**
Aynan **eng qimmatli o'quv lahzasida** — odam o'z xatosini qayta ishlayotganda —
platforma sababni tushuntirmaydi, faqat to'g'ri harfni aytadi. Bu "xatolar ustida
ishlash"ni **tushunishdan yodlashga** aylantiradi: foydalanuvchi "bu savolda B" ni
yodlaydi, bir xil tamoyilga asoslangan boshqa savolda yana xato qiladi.

Bu, qolaversa, **regressiya**: savol birinchi marta ishlanganda izoh KO'RSATILGAN
edi, ikkinchi marta — yo'q. 100% izoh qamroviga ega bazangiz shu yerda bekorga ketyapti.

**[Yechim & namuna]**

1. `newMistakes.push({ ..., explanation: q.explanation, mnemonic: q.mnemonic, source: q.source, qHash })`
2. `TestPage.jsx:435` dagi sun'iy matnni olib tashlang — `m.explanation` ni bering.
3. `ErrorNotebookPage` kengaytmasiga izoh blokini qo'shing (imtihon `reviewMode`
   dagi bilan bir xil komponent).
4. Eski yozuvlar uchun: `qHash` orqali bankdan izohni qayta topib oling
   (`questionKey` allaqachon bor) — migratsiya kerak emas.

*Eng yaxshi namuna:* **UWorld** izohi uch qismli — (a) to'g'ri javob nega to'g'ri,
(b) **har bir chalg'ituvchi variant nega noto'g'ri**, (c) asosiy tamoyil bir jumlada.
Sizning bazangizda (a) bor; (b) va (c) ni sxemaga qo'shish keyingi bosqich.

---

## T-7 · Mashq natijasi ekranida mavzular kesimi umuman yo'q

**[Kamchilik]**
`TestResults.jsx` 50 ta savoldan keyin ko'rsatadigan hamma narsa:
`correctCount / questionsLength`, foiz, progress bar, AMI delta, daraja muhri,
"rejadagi keyingi qadam". **Mavzu kesimi yo'q. Xato savollar ro'yxati yo'q.**

Holbuki ma'lumot ALLAQACHON hisoblangan: `summarizeTestResults` `topicDeltas`
qaytaradi (`{topicId: {answered, correct, timeSum, fast}}`) va u
`batchCommitResults` ga uzatiladi — lekin ekranga chiqarilmaydi.

**[Salbiy ta'siri]**
Foydalanuvchi "34/50" ni ko'radi va **keyin nima qilishni bilmaydi**.
Bitta raqam harakatga aylanmaydi — natija ekranining asosiy vazifasi bajarilmagan.

**[Yechim & namuna]**
Natija ekranining markaziga **"Bo'limlar kesimi"** jadvalini qo'ying —
`topicDeltas` dan to'g'ridan-to'g'ri:

```
Didaktika           3/9    33%  ▁▁▁▁▁▁▁▁▁   → Mashq qilish
Tarbiya nazariyasi  6/8    75%  ▆▆▆▆▆▆▆▆
Normativ hujjatlar  8/8   100%  ████████
```

Qoidalar:

- Har qatorda **kasr + foiz + chiziq** (faqat rang emas — daltonizm).
- **5 tadan kam savol** tushgan bo'lim "ma'lumot yetarli emas" deb belgilansin,
  foiz ko'rsatilmasin (kichik namunadan yolg'on xulosa chiqmasligi uchun).
- Eng pastdagi 1-2 bo'limga **bevosita harakat tugmasi**.
- Yuqorisida bitta jumla: *"Bu blokdan eng ko'p ball Didaktikada yo'qoldi."*

---

## T-8 · Imtihon natijasida mavzu tahlili yarim yo'lda to'xtatilgan

**[Kamchilik]**
`ExamPage.jsx:918-936` har bo'lim uchun `accuracy` ni hisoblaydi va to'liq
saralangan massiv yasaydi:

```js
const weakTopics = topicPerformance.filter(t => t.accuracy < 80).sort((a,b) => a.accuracy - b.accuracy);
```

Ekranda esa **faqat `weakTopicsSorted[0]`** ishlatiladi (1387, 1392-qatorlar).
Qolgan barcha zaif bo'limlar hisoblanadi va **tashlab yuboriladi**.

Mavzular gridida (1419-1440) faqat rangli kataklar bor — **foiz ham, kasr ham
yo'q**. Foydalanuvchi kataklarni sanashi kerak.
Bundan tashqari `80%` chegarasi **qattiq kodlangan** va foydalanuvchining
`targetScore` (o'quv shartnomasi) bilan bog'lanmagan.

**[Salbiy ta'siri]**
50 savollik imtihon — eng boy diagnostik hodisa. Undan chiqadigan xulosa bitta
bo'limga qisqartiriladi. Foydalanuvchi 5 ta zaif bo'limdan faqat bittasini
ko'radi va qolganlari borligini bilmaydi.

**[Yechim & namuna]**

1. `weakTopicsSorted` ni **to'liq ro'yxat** sifatida ko'rsating (3-5 tasi
   ko'rinadi, qolgani "yana N ta" ostida).
2. Grid sarlavhasiga **`3/9 · 33%`** qo'shing.
3. `80` o'rniga `targetScore` (`useStudyContract`) dan foydalaning.
4. Har bo'lim yonida **kutilayotgan yo'qotish** ko'rsatilsin — `DiagnosticsEngine`
   dagi `expectedLoss` allaqachon shu mantiqni biladi: *"Bu bo'lim haqiqiy
   attestatsiyada sizga ~4 ball turadi."* Bu foizdan kuchliroq motivator.

---

## T-14 · "Barcha xatolarimni ketma-ket ko'rish" oqimi yo'q

**[Kamchilik]**
Imtihonda izoh faqat `reviewMode` da, **bitta savolga bitta ekran** tarzida
ko'rinadi (`ExamPage.jsx:1656-1685`). 17 ta xatoni ko'rish uchun:
katakka bos → o'qi → orqaga → keyingi katakka bos… × 17.

**[Salbiy ta'siri]**
Ko'rib chiqish — o'rganishning eng ko'p qiymat beradigan bosqichi — eng ko'p
ishqalanishga ega bosqichga aylangan. Amalda ko'pchilik 2-3 ta xatoni ko'rib
tashlab ketadi.

**[Yechim & namuna]**
Natija ekraniga bitta tugma: **"Xatolarimni ko'rib chiqish (17 ta)"** — u faqat
xato qilingan savollarni **ketma-ket, izohi ochiq holda** oqim sifatida beradi
(`Keyingi xato →`), yuqorisida `4/17` hisoblagichi.
Har savol ostida ikki harakat: **"Tushundim"** (kartani ilg'or intervalga
o'tkazadi) va **"Hali ham tushunmadim"** (intervalni 0 ga qaytaradi + konspektga havola).

*Eng yaxshi namuna:* **Anki review oqimi** va **Duolingo "Mistakes review"** —
ikkalasi ham xatoni alohida sahifa emas, **uzluksiz oqim** sifatida beradi.

---

# 4. QAYTA ISHLASH SILSILASI (SPACED REPETITION)

## T-3 · 🔴 Xatolar ro'yxati — o'chmaydigan qabriston

**[Kamchilik]** Uchta mustaqil nuqson bir joyda:

1. **Dedup yo'q.** `AppContext.jsx:849`:
   `const newMistakes = [...catStats.mistakes, ...results.newMistakes];`
   Bir savolni ikki marta xato qilsangiz — ikkita yozuv. (Bulut birlashtirishda
   dedup bor — `AppContext.jsx:248` — lekin lokal qo'shishda yo'q.)
2. **To'g'ri javob xatoni o'chirmaydi.** Ro'yxatdan chiqishning yagona yo'li —
   qo'lda `deleteMistake`. O'zlashtirilgan savol abadiy "xato" bo'lib qoladi.
3. **FIFO 50 ta.** `config.js:60` — `MAX_MISTAKES_SAVED = 50`, ortiqchasi
   `shift()` bilan **eng eskisidan** o'chiriladi.

**[Salbiy ta'siri]** — o'lchangan ssenariy:
60% aniqlik bilan ishlayotgan pedagog har 50 savollik blokda **~20 ta xato**
qiladi. **2.5 ta blokdan keyin** ro'yxat to'ladi. Undan keyin har yangi xato eng
eski xatoni **jimgina o'chiradi** — bu esa aynan **eng uzoq vaqt
o'zlashtirilmagan** xato. Ayni paytda allaqachon o'zlashtirilgan xatolar
ro'yxatda qolib, "15 ta xatodan mini-test"ning yarmini egallaydi.

Natija: xatolar daftari vaqt o'tgani sari **kamroq foydali** bo'lib boradi —
o'rganish egri chizig'iga teskari.

**[Yechim & namuna]**
Xatolar ro'yxatini **ro'yxatdan navbatga** aylantiring:

```js
{ qHash, topicId, question, opts, correct, explanation,
  wrongCount, lastWrongAt, streakSinceWrong, retiredAt }
```

Qoidalar:

- **Kalit — `qHash`** (`questionKey`, cyrb53 allaqachon mavjud). Takroriy xato
  yangi yozuv emas, `wrongCount++`.
- **Chiqish sharti:** `streakSinceWrong >= 2` va oxirgi to'g'ri javob xatodan
  **≥ 3 kun keyin** bo'lsa → `retiredAt` qo'yiladi (o'chirilmaydi, "yopilgan
  xatolar" bo'limiga o'tadi — kuchli motivator).
- **`wrongCount >= 5`** → **"tirishqoq savol"**: mini-testga tushmaydi, o'rniga
  konspekt/nazariya taklif etiladi. (Xuddi shu savolni yana ko'rsatish —
  isbotlangan samarasiz strategiya.)
- **Chegarani ko'taring** (50 → 300), yoki eng muhimi: chegara faqat
  `retiredAt IS NULL` bo'lganlarga qo'llansin. Yozuv ~250 bayt → 300 ta ≈ 75 KB.
- Chegara oshsa **eng eskisini emas, `wrongCount` eng pastini** chiqaring.

*Eng yaxshi namuna:* **Anki "leech" mexanizmi** — karta 8 marta unutilsa
avtomatik to'xtatiladi va teg qo'yiladi; foydalanuvchi uni qayta ishlash o'rniga
materialni qaytadan o'rganishga yo'naltiriladi.

---

## T-6 · Mini-test tasodifiy — mavjud Ebbinghaus jadvalidan foydalanmaydi

**[Kamchilik]**
`TestPage.jsx:427`:

```js
const shuffledMistakes = [...filteredMistakes].sort(() => 0.5 - Math.random());
qList = shuffledMistakes.slice(0, 15).map(...)
```

Uch muammo:

1. **Muddat (`due`) mutlaqo hisobga olinmaydi.** `spacedCards` da to'liq Ebbinghaus
   jadvali bor (`nextReview`, `level`, `difficulty`), lekin "mistakes" rejimi undan
   **umuman foydalanmaydi** — bu ikkinchi, parallel, jadvalsiz tizim.
2. **Aralashtirish xolis emas.** `sort` bilan random komparator taqsimotni buzadi.
   Loyihada Fisher-Yates allaqachon yozilgan (`SmartQuestionEngine.js`, blok ichida).
3. **15 ta qattiq chegara**, sabab ko'rsatilmagan.

**[Salbiy ta'siri]**
Foydalanuvchi bugun 3 marta mini-test ishlasa — deyarli bir xil savollar keladi,
va hech qaysi biri "muddati kelgani" uchun kelmagan. Ya'ni **spaced repetition
emas, oddiy tasodifiy takrorlash**. Ebbinghaus dvigateli yozilgan, lekin eng
muhim yuzada ulanmagan.

**[Yechim & namuna]**
Mini-testni **navbat**dan yig'ing, ro'yxatdan emas:

```
1. muddati kelganlar (nextReview <= now), eng kechikkani birinchi   — 60%
2. muddati kelmagan, lekin wrongCount yuqori                        — 25%
3. yaqinda yopilgan (retired) — nazorat savollari                   — 15%
```

Uchinchi guruh muhim: u "men buni haqiqatan o'rgandim" tasdiqini beradi va
o'zlashtirishni tekshiradi (Anki'dagi mature card tekshiruvi).
Aralashtirish uchun Fisher-Yates. 15 o'rniga `min(20, navbat.length)` va
yuqorida `Bugun muddati kelgan: 12 ta` ko'rsatgichi.

---

## T-4 · 🟠 SRS xotira ufqi ~1 kun: 200 karta chegarasi butun tarixni yuvadi

**[Kamchilik]**
`SmartQuestionEngine.js` — `MAX_SPACED_CARDS = 200`, saqlash mantiqi:

```js
updatedSpacedCards: Array.from(updatedCards.values())
  .sort((a, b) => (a.lastReview || 0) - (b.lastReview || 0))
  .slice(-MAX_SPACED_CARDS)
```

Va karta **HAR javob berilgan savol uchun** yaratiladi — to'g'ri javob ham
(`level: 1, nextReview: +25 daqiqa`).

**Hisob:** 50 savollik **4 ta blok = 200 savol**. Ya'ni **bir kunlik jadal mashq
butun oldingi takrorlash tarixini o'chiradi**. `lastReview` bo'yicha
saralanganligi sababli **birinchi bo'lib eng uzoq intervalli, hali muddati
kelmagan yetuk kartalar** qurbon bo'ladi — aynan tizimning eng qimmatli qismi.

**[Salbiy ta'siri]**
Faol foydalanuvchi (eng kerakli segment) uchun spaced repetition **umuman
ishlamaydi**: bir hafta oldin xato qilingan va ertaga takrorlanishi kerak bo'lgan
savol bugungi mashq paytida jimgina o'chib ketadi. Foydalanuvchi buni hech qachon
ko'rmaydi — xatolik yo'q, log yo'q.

**[Yechim & namuna]**

1. **To'g'ri javob berilgan yangi savolga karta yaratmang.** Karta faqat
   (a) xato qilinganda yoki (b) foydalanuvchi ataylab belgilaganda tug'ilsin.
   Navbatni darhol ~3-5 barobar bo'shatadi. (Anki tamoyili: navbat sizga **qiyin**
   bo'lgan narsalar uchun, hamma narsa uchun emas.)
2. **Chegarani `nextReview` bo'yicha qo'llang, `lastReview` bo'yicha emas:**
   chiqarib tashlash kerak bo'lsa **eng uzoq muddatlisini** (eng yaxshi
   o'zlashtirilganini) chiqaring.
3. Kartada savolning **to'liq nusxasini saqlamang** — faqat
   `qHash + topicId + SRS metadata` (~120 bayt), savol matni bankdan olinadi.
   Shunda 5 000 karta ham ~600 KB. Ayni paytda karta `{...q}` bilan butun savolni
   nusxalaydi (200 karta ≈ 210 KB) — bu chegaraning asl sababi.

---

## T-5 · Maksimal takrorlash oralig'i — 4.3 kun. Attestatsiya sikliga mos emas

**[Kamchilik]**
`SmartQuestionEngine.js`: `BASE_INTERVAL_MIN = 10`, `INTERVAL_MULTIPLIER = 2.5`,
`MAX_LEVEL = 7`.

```
10 daq × 2.5^7 = 6 104 daqiqa ≈ 4.24 kun   ← maksimal oraliq
```

Ya'ni **7 marta ketma-ket to'g'ri javob berilgan, mukammal o'zlashtirilgan savol
ham har 4 kunda qaytib keladi**. Boshlang'ich oraliq 10 daqiqa — bu ko'pincha
**ayni sessiya ichida** takrorlanish (massed practice, spaced emas).

**[Salbiy ta'siri]**
2-3 oy tayyorlanadigan foydalanuvchida navbat asta-sekin **allaqachon
bilinadigan material bilan to'lib boradi**. Yangi material uchun joy qolmaydi,
mashq zerikarli bo'ladi, "men bularni bilaman-ku" hissi foydalanuvchini
uzoqlashtiradi. Bu — SRS tizimini o'ldiruvchi klassik xato.

**[Yechim & namuna]**
SM-2 ga yaqinlashtiring — oraliqlarni **kunlarda** o'lchang:

```
Level 0 (xato)  →  10 daqiqa      (ayni sessiyada qayta ko'rish)
Level 1         →  1 kun
Level 2         →  3 kun
Level 3         →  7 kun
Level 4         →  16 kun
Level 5         →  35 kun
Level 6         →  75 kun         → "o'zlashtirilgan" deb belgilanadi
```

Ikki muhim tuzatish:

- **Imtihon sanasiga bog'lang.** `config.js` da `EXAM_DATE` va `useExamDaysLeft`
  allaqachon bor. Oraliq imtihon sanasidan oshsa, uni **imtihondan 3 kun
  oldinga** siqib qo'ying — har bir karta imtihongacha kamida bir marta qaytadi.
  Bu attestatsiya platformasi uchun eng qimmatli farqlovchi xususiyat va
  raqobatchilarda deyarli yo'q.
- **Interval fuzzing (±10%)** qo'shing, aks holda bir kunda o'rganilgan 50 ta
  karta bir kunda birga qaytadi va "og'ir kunlar" hosil bo'ladi.

*Eng yaxshi namuna:* **SuperMemo SM-2 / Anki** — standart oraliqlar oylar bilan
o'lchanadi. **Duolingo** maqsad sanasiga moslashtirilgan siqishni ishlatadi.

---

# 5. Amalga oshirish tartibi

| # | Band | Ta'sir | Mehnat | Fayl |
|---|---|---|---|---|
| 1 | **T-1** Xatolar tugmasi o'lik | 🔴 Juda yuqori | ~1 qator | `TestResults.jsx:152` |
| 2 | **T-2** Xatolarda izoh yo'qolishi | 🔴 Juda yuqori | ~15 qator | `SmartQuestionEngine.js`, `TestPage.jsx:435`, `ErrorNotebookPage.jsx` |
| 3 | **T-10** Mashqdagi avto-xato taymer | 🔴 Yuqori (ma'lumot ifloslanishi) | ~20 qator | `TestPage.jsx:174,243` |
| 4 | **T-3** Xatolar navbati (dedup + retire) | 🔴 Yuqori | ~60 qator | `AppContext.jsx:849`, `SmartQuestionEngine.js` |
| 5 | **T-7** Natijada bo'limlar kesimi | 🟠 Yuqori | ~80 qator | `TestResults.jsx` (`topicDeltas` tayyor) |
| 6 | **T-4** SRS karta chegarasi | 🟠 Yuqori | ~40 qator | `SmartQuestionEngine.js` |
| 7 | **T-5** Oraliqlarni kunlarga o'tkazish | 🟠 O'rta-yuqori | ~20 qator | `SmartQuestionEngine.js` |
| 8 | **T-8** To'liq zaif bo'limlar ro'yxati | 🟠 O'rta | ~40 qator | `ExamPage.jsx:1372-1400` |
| 9 | **T-6** Mini-test navbatdan yig'ilsin | 🟠 O'rta | ~50 qator | `TestPage.jsx:414-445` |
| 10 | **T-14** Xatolar ko'rib chiqish oqimi | 🟡 O'rta | ~120 qator | yangi komponent |
| 11 | **T-9** Imtihon shartnomasi ekrani | 🟡 O'rta | ~60 qator | `ExamPage.jsx:1063` |
| 12 | **T-11** Umumiy navigator + flag | 🟡 O'rta | ~150 qator | yangi umumiy komponent |
| 13 | **T-13** Taymer sur'at ko'rsatkichi | 🟡 O'rta | ~80 qator | `TimerPill.jsx`, `ExamTimer.jsx` |
| 14 | **T-12** Javobni tasdiqlash/o'zgartirish | 🟡 Past-o'rta | ~30 qator | `TestPage.jsx:708`, `ExamPage` |

**1-4 bandlar bir kunlik ish** va ular platformaning eng zaif bo'g'inini —
xatolar ustida ishlash silsilasini — butunlay tiklaydi.
