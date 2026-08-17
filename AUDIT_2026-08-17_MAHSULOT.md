# Zehin — Mahsulot auditi (PM + UX/UI + Senior Dev)

**Sana:** 2026-08-17
**Qamrov:** haqiqiy kod o'qildi — `src/pages/{Test,Exam,Onboarding,Login,Admin,Leaderboard}Page.jsx`,
`src/context/{App,Auth}Context.jsx`, `src/components/test/*`, `src/index.css`, `vite.config.js`,
`api/get-questions.js`, `dist/` bundle o'lchamlari, `src/data/firestore_backup_chqbt_*.json` (o'lchov uchun).

**Halol chegara:** ilova HAQIQIY telefonda ishga tushirilmadi, Lighthouse/FCP o'lchanmadi,
`firestore.rules` chuqur tekshirilmadi, to'lov oqimi sinalmadi va menda **analitika/funnel
ma'lumoti yo'q**. Shuning uchun "onboardingda odam yo'qoladi" kabi gaplar — GIPOTEZA,
o'lchov emas. Kod bo'yicha aniqlangan xatolar esa fayl:qator bilan ko'rsatilgan — ular fakt.

---

## ✅ TUZATISH HOLATI (2026-08-17, audit bilan bir kunda)

Barcha 7 nuqson tuzatildi. `eslint` 0 xato, `vitest` 166/166 o'tdi (19 tasi yangi),
`vite build` toza, dev serverda konsol xatosi yo'q.

| # | Band | Holat | Nima qilindi |
|---|------|-------|--------------|
| 1 | Imtihon taymeri | ✅ | `deadlineMs` (wall-clock) modeli. Yangi `components/test/ExamTimer.jsx` — har soniyalik state SHU komponentda, `visibilitychange`/`focus` da resync. Mantiq `utils/examClock.js` ga chiqarildi va testlandi |
| 2 | `test_session` egaligi | ✅ | Kalit uid bo'yicha ajratildi (`test_session_${uid}`), tekshiruv qat'iy (`!!s.uid && s.uid === uid`) — `ExamPage` bilan bir xil. Eski global kalit boot'da tozalanadi |
| 3 | Har javobda 2.4 MB yozuv | ✅ | Ikki kalitli sxema: hovuz BIR MARTA (`test_pool_${uid}`), progress esa ~2–5 KB + 400 ms debounce. `questions` ham saqlanmaydi (hovuzdan qayta hosil bo'ladi) |
| 4 | Imtihonda pastki navigatsiya | ✅ | `body.exam-fullscreen .bottom-nav { display: none }` + imtihonning o'z pastki paneli (`.exam-mobile-bar`, 48px teginish zonasi) + `.exam-topbar` sticky |
| 5 | Variantlar `<div onClick>` | ✅ | `<button type="button" role="radio" aria-checked>` + `role="radiogroup"`. Tugma sukut uslublari bekor qilindi, `min-height: 48px` |
| 6 | `fb-messaging` preload | ✅ | `firebase/messaging` `push.js` ichida dinamik yuklanadi → preload 9 chunk'dan 8 ga tushdi. App.jsx'da ruxsat tekshiruvi butun effektni qamraydi |
| 7 | Har harfda global render | ✅ | Yangi `PersonalNote` komponenti: mahalliy state, global yozuv `onBlur` yoki 800 ms tinchlikdan keyin |

**Qo'shimcha (audit bandi emas, yo'lda topilgani):**

- `navigate(0)` (to'liq reload) → `restartExam()` — SPA ichida holat tozalanadi.
- Onboarding yozuvi `updateDoc` → `setDoc(merge)` + bajarilmasa `localStorage` navbatiga
  tushadi va `online` hodisasida/keyingi ishga tushishda qayta yuboriladi
  (`flushPendingOnboarding`, `App.jsx` dan chaqiriladi). Oxirgi ekranda jim qator:
  "internet qaytganda avtomatik sinxronlanadi" — yolg'on "tayyor" ko'rsatilmaydi.
- Onboarding progress bar ekran davomiyligiga moslandi (`LOADING_MS` yagona manba) —
  avval 1000 ms da to'lib, 500 ms qotib turardi. Tanlov kechikishi 350 → 180 ms.
- `.exam-mobile-bar` va `pagehide` tinglovchisi memory leak'siz tozalanadi.

**Migratsiya eslatmasi.** `utils/examClock.js` eski `timeLeft` formatini ham o'qiydi:
2026-08-17 dan oldin saqlangan tugallanmagan imtihonlar yo'qolmaydi (test bilan
qoplangan — `examClock.test.js` → "eski sessiya vaqti YO'QOLMAYDI").

**Qurilmada tekshirilishi kerak (bu mashinada bajarib bo'lmaydi):**
imtihonni boshlab telefonni 5 daqiqa bloklash → qaytganda taymer 5 daqiqa
kamayganini ko'rish; imtihon davomida pastki panel yo'qligini tasdiqlash;
50 savolli blokda javob bosish silliqligini his qilish.

---

## 0. Bir qarashda

Kodning umumiy sifati **yuqori**. Tipografiya tizimi markazlashgan (`--fs-*`, `clamp()`),
savol paketi server orqali himoyalangan (`api/get-questions.js` — 2 900 o'qish → 2 o'qish),
reyting `limit(50)` + `getCountFromServer` bilan, holat o'sishi cheklangan (`MAX_MISTAKES_SAVED`),
oldingi ikki audit bandlari haqiqatan bajarilgan. Bu odatiy "MVP tartibsizligi" emas.

Shuning uchun bu hisobot umumiy maslahat bermaydi. U **7 ta aniq nuqsonni** ko'rsatadi va
ularning aksariyati bitta naqshdan kelib chiqadi: **bir joyda to'g'ri hal qilingan muammo
ikkinchi joyda qolib ketgan**.

Quyidagi jadvaldagi fayl:qator raqamlari **audit paytidagi** holatga tegishli
(tuzatishdan oldin). Tuzatishlar ro'yxati yuqoridagi "Tuzatish holati" bo'limida.

| # | Xato | Qayerda (audit paytida) | Og'irlik |
|---|------|-------------------------|----------|
| 1 | Imtihon taymeri `setInterval` bilan sanaydi (wall-clock emas) | `ExamPage.jsx:691` | 🔴 Kritik |
| 2 | `test_session` ni uid'siz tiklash — begona javoblarga kirish | `TestPage.jsx:268` | 🔴 Kritik |
| 3 | Har javobda 2.4 MB IndexedDB'ga yoziladi | `TestPage.jsx:617` | 🔴 Kritik |
| 4 | Imtihon davomida pastki navigatsiya ochiq turadi | `index.css:1271` | 🟠 Yuqori |
| 5 | Mobilda taymer va "Yakunlash" ekrandan chiqib ketadi | `index.css:1323` | 🟠 Yuqori |
| 6 | Javob variantlari `<div onClick>` (klaviatura/a11y yo'q) | `index.css:535` | 🟠 Yuqori |
| 7 | `firebase/messaging` birinchi ekranga preload bo'ladi | `App.jsx:12` | 🟡 O'rta |

---

## 1. 🎨 UX/UI va foydalanish qulayligi

### 1.1 🟠 Mobilda imtihon taymeri va "Yakunlash" tugmasi ekrandan chiqib ketadi

**Xato.** `.exam-topbar` da `position: sticky` YO'Q (`src/index.css:1278`). Mobilda esa layout
tik ustunga aylanadi va navigator savoldan PASTGA tushadi:

```css
/* src/index.css:1323 */
@media (max-width: 768px) {
  .exam-content { flex-direction: column; overflow-y: auto; }
  .exam-question-area { order: 1; }
  .exam-navigator    { order: 2; }   /* ← 50 tali panjara + "Yakunlash" pastda */
}
```

**Oqibati.** 90 daqiqalik imtihonda foydalanuvchi savol matnini o'qish uchun pastga
skroll qiladi → **qolgan vaqt ko'rinmay qoladi**. "Keyingi" tugmasi savol tanasining
oxirida (izohdan keyin), "Yakunlash" esa yana pastda — rasmli yoki uzun savolda bitta
savoldan ikkinchisiga o'tish uchun 2 marta skroll kerak. 50 savol × 2 skroll = imtihon
o'zi emas, **interfeys charchatadi**. Bir qo'lda boshqarish umuman yo'q: bosh barmoq
zonasida (ekran pastki 1/3) hech qanday doimiy boshqaruv yo'q.

**To'g'ri yechim.**
1. `.exam-topbar` ni `position: sticky; top: 0; z-index: 20` qilish — taymer HAR DOIM ko'rinadi.
2. Mobilda **yopishgan pastki panel** qo'shish: `← Orqaga | 12/50 | Keyingi →` + o'ng burchakda
   "Yakunlash". Bosh barmoq zonasida, `env(safe-area-inset-bottom)` hisobga olingan holda.
3. 50 tali panjarani navigatorda qoldirib, pastki paneldagi `12/50` ni bosilganda ochiladigan
   `ActionSheet` (loyihada allaqachon bor: `components/shared/ActionSheet.jsx`) qilish.

```jsx
/* ExamPage.jsx — mobil pastki panel (yangi) */
{isMobile && !reviewMode && (
  <div className="exam-mobile-bar">
    <button onClick={() => handleQuestionSwitch(currentQ - 1)} disabled={currentQ === 0}>
      <ChevronLeft size={20} />
    </button>
    <button className="exam-mobile-counter" onClick={() => setShowNavSheet(true)}>
      {currentQ + 1} / {questions.length}
    </button>
    <button onClick={() => handleQuestionSwitch(currentQ + 1)}
            disabled={currentQ === questions.length - 1}>
      <ChevronRight size={20} />
    </button>
  </div>
)}
```

```css
.exam-mobile-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: var(--bg2); border-top: 1px solid var(--border);
}
.exam-mobile-bar button { min-height: 48px; min-width: 48px; }
```

---

### 1.2 🟠 Javob variantlari — tugma emas, `<div>`

**Xato.** Mashq rejimidagi variant `div` (`src/components/test/QuestionBox.jsx:150`, uslub
`src/index.css:535`):

```jsx
<div className={`option ${bg} ${!answered ? 'hoverable' : ''}`}
     onClick={() => handleSelect(currentQ, i)}>
```

Qiziq tomoni: **imtihon sahifasida bu to'g'ri qilingan** — `ExamPage.jsx:1499` da haqiqiy
`<button>` ishlatiladi. Ya'ni bu bilim yetishmasligi emas, bitta joyda qolib ketgan qarz.

**Oqibati.**
- Klaviatura bilan javob berish mumkin emas (Tab/Enter ishlamaydi) — desktop foydalanuvchi
  va tashqi klaviaturali planshet uchun asosiy amal yopiq.
- Skrinriderda "clickable" deb ham o'qilmaydi; ko'zi ojiz o'qituvchi ilovadan foydalana olmaydi.
- Google Play **Pre-launch report → Accessibility** bu ni belgilaydi.
- `role`/`aria-checked` yo'q → tanlangan variant yordamchi texnologiyaga bildirilmaydi.

**To'g'ri yechim.** Variantlar guruhini radio semantikasiga o'tkazish (vizual o'zgarish yo'q):

```jsx
<div className="options" role="radiogroup"
     aria-label={t('test.questionNum', { current: currentQ + 1, total: questions.length })}>
  {questions[currentQ].opts.map((opt, i) => (
    <button
      key={i}
      type="button"
      role="radio"
      aria-checked={answers[currentQ] === i}
      disabled={answered}
      className={`option ${bg} ${!answered ? 'hoverable' : ''}`}
      onClick={() => handleSelect(currentQ, i)}
    >
      <span className="opt-letter" aria-hidden="true">{['A','B','C','D'][i]}</span>
      <span className="opt-text">{opt.replace(/^[A-D]\)\s*/, '')}</span>
    </button>
  ))}
</div>
```

Qo'shimcha: `.option` uchun `min-height: 48px` qo'shing. Hozir `padding: 16px` +
`--fs-option: 16px` ≈ 54px — yetarli, lekin bitta so'zli qisqa variantda
(`opt-letter` 32px + padding) chegaraga yaqin turadi. Aniq `min-height` bu ni qulflaydi.

---

### 1.3 🟡 Onboardingda ~2.6 soniya sun'iy kutish

**Xato.** Uchta joyda ataylab kechikish bor:

```js
// OnboardingPage.jsx:379 — har tanlovdan keyin
setTimeout(() => { step === 2 ? handleFinish(val) : goNext(); }, 350);

// OnboardingPage.jsx:407 — "reja tuzilmoqda" ekrani
setTimeout(() => { setStep(4); setSaving(false); }, 1500);
```

3 × 350ms + 1500ms ≈ **2.55 soniya** hech narsa qilinmayotgan vaqt. Progress bar esa
1000 ms da 100% ga yetadi (`40ms × 25`) va keyin **500 ms to'lgan holda turadi** — bu
"qotib qoldi" hissini beradi.

**Oqibati.** Bu ataylab qilingan "qadr-qimmat animatsiyasi" (perceived value) va o'zi
xato emas — Duolingo/Noom ham shunday qiladi. LEKIN progress bar to'lib turib qolishi
teskari ishlaydi: foydalanuvchi ilovani buzuq deb o'ylaydi. Registratsiya oxiridagi
har soniya eng qimmat: bu yerda odam hali hech narsa olmagan, faqat bergan.

**To'g'ri yechim.**
1. Progress bar tezligini kechikishga moslash: `1500 / 25 = 60ms` (yoki kechikishni
   1000 ms ga tushirish). Bar tugagan zahoti ekran ham almashishi kerak.
2. Tanlovdan keyingi 350ms ni 180ms ga tushirish — animatsiya baribir ko'rinadi.
3. **Va eng muhimi — o'lchash.** `AnalyticsEvents` allaqachon bor. Har qadamga hodisa
   qo'ying (`onboarding_step_view` / `onboarding_step_select`) va haqiqiy drop-off ni
   ko'ring. Mening yuqoridagi gapim — gipoteza; funnel bo'lmasa hech kim bilmaydi.

---

### 1.4 🟢 To'g'ri qilingan narsalar (buzmang)

Bu ro'yxat ataylab bor — audit faqat tanqid bo'lmasligi kerak:

- **Login oqimi ideal.** "Yangimisiz?" deb so'ralmaydi — raqam `/api/check-user` orqali
  fonda tekshiriladi va to'g'ri ekranga olib boriladi (`LoginPage.jsx:97`). Bu 2026 yil
  darajasidagi yechim; ko'p ilovada hali ham 2 ta alohida tugma turadi.
- **`--fs-input: max(16px, ...)`** — iOS'da input fokusida majburiy zoom yopilgan
  (`index.css:104`). Bu ni ko'pchilik faqat shikoyatdan keyin biladi.
- **Anti-cheat olib tashlangan** (`ExamPage.jsx:838`) — `visibilitychange` bilan
  diskvalifikatsiya mobilda halol foydalanuvchini jazolardi. To'g'ri qaror.
- **`touch-action: manipulation`** (`index.css:297`) — 300ms tap kechikishi yo'q.
- **i18n lazy** — `ru` (124 KB) va `en` (75 KB) alohida chunk (`i18n/index.js:31`).

---

## 2. ⚙️ Funksionallik va biznes mantiq

### 2.1 🔴 KRITIK: Imtihon taymeri fonda to'xtaydi

**Xato.** `src/pages/ExamPage.jsx:691`:

```js
timerRef.current = setInterval(() => {
  setTimeLeft(prev => {
    if (prev <= 1) { clearInterval(timerRef.current); handleFinishRef.current?.(true); return 0; }
    return prev - 1;                      // ← har "tick" da 1 ayiriladi
  });
}, 1000);
```

Vaqt **hodisalar soni** bilan sanaladi, haqiqiy soat bilan emas.

Eng achinarlisi — **to'g'ri yechim loyihada allaqachon yozilgan**.
`src/components/test/TimerPill.jsx:5-18` da aynan shu muammo hujjatlashtirilgan:

> "Fon/qo'ng'iroq muammosi: setInterval mobil brauzerda (Safari/WebView/TWA) ilova fonga
> tushganda muzlaydi yoki sekinlashadi. Shuning uchun vaqt DEADLINE (epoch ms) bo'yicha
> hisoblanadi va `visibilitychange`da darhol qayta sinxronlanadi... Bu 'ilovani fonga
> tushirib taymerni to'xtatish' aldash vektorini ham yopadi."

Ya'ni bir savolga beriladigan mayda taymer to'g'ri qilingan, **90 daqiqalik asosiy
imtihon taymeri esa yo'q**.

**Oqibati — uchta alohida zarar:**

1. **Imtihon simulyatsiyasi haqiqiy emas.** Odam telefonni bloklaydi yoki boshqa ilovaga
   o'tadi → Android/iOS `setInterval`ni muzlatadi → qaytganda taymer o'sha joyda turadi.
   Foydalanuvchi 90 daqiqalik imtihonni 3 soatda ishlaydi va **70% oladi**. Keyin
   haqiqiy attestatsiyada 45% oladi va ilovani "yolg'onchi" deb hisoblaydi. Bu Play
   Market'dagi past sharhning eng tabiiy sababi.
2. **Har uzilishda vaqt sovg'a qilinadi.** Sessiya `timeLeftRef.current` ni saqlaydi
   (`ExamPage.jsx:255`), yozuv esa har javobda va har 30 soniyada bo'ladi. Ilova
   yopilib qayta ochilganda oxirgi yozuvdagi qiymat tiklanadi — ya'ni **oxirgi
   yozuvdan keyin o'tgan butun vaqt qaytariladi**. 30 soniyagacha har uzilishda.
3. **Har soniyada BUTUN `ExamPage` qayta render bo'ladi.** `timeLeft` — sahifa darajasidagi
   state. 90 daqiqa × 60 = **5400 marta** 50 tali navigator panjarasi, savol, variantlar va
   `AnimatePresence` qayta hisoblanadi. `TimerPill` izohida buning oldi olingan
   ("har soniyada faqat shu kichik pill render bo'ladi"), `ExamPage` da esa yo'q.
   O'rta darajali Android'da bu — jank va batareya.

**To'g'ri yechim.** `TimerPill` naqshini asosiy taymerga ko'chirish. Uch qadam:

```jsx
// 1) State emas, DEADLINE saqlanadi (epoch ms)
const [deadlineMs, setDeadlineMs] = useState(null);
const timeLeftRef = useRef(getExamDuration(cat));

// 2) Imtihon boshlanganda / resume'da
setDeadlineMs(Date.now() + savedTimeLeft * 1000);   // resume: saqlangan qoldiq
// yoki yangi imtihon: Date.now() + getExamDuration(cat) * 1000

// 3) Taymer faqat KO'RSATISH uchun; haqiqat — Date.now()
useEffect(() => {
  if (!examStarted || finished || reviewMode || loading || !deadlineMs) return;
  const tick = () => {
    const left = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
    timeLeftRef.current = left;
    setTimeLeft(left);                    // pastdagi 4-qadamdan keyin bu ham ko'chadi
    if (left === 0) handleFinishRef.current?.(true);
  };
  tick();
  const id = setInterval(tick, 1000);
  const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}, [examStarted, finished, reviewMode, loading, deadlineMs]);
```

**4-qadam (render narxi).** Taymer ko'rsatuvini alohida kichik komponentga chiqaring —
`ExamTimer({ deadlineMs })` — o'zining `useState`i bilan. Shunda har soniyada faqat
o'sha tabletka render bo'ladi, 50 tali panjara emas. `ExamPage` esa `timeLeft` ni
umuman bilmaydi; `isUrgent`/`isWarning` ham shu komponent ichida hisoblanadi.

**5-qadam (sessiya).** `persistRef` da `timeLeft` o'rniga **`deadlineMs` ni saqlang**.
Shunda resume'da vaqt haqiqiy soat bo'yicha davom etadi va 2-bandda tasvirlangan
"sovg'a" yopiladi. (Mahsulot qarori: agar siz ATAYLAB uzilishda vaqtni to'xtatishni
xohlasangiz — u holda `timeLeft` qolsin, lekin **fonda muzlash** baribir tuzatilishi
kerak, chunki u boshqarilmaydigan teshik.)

---

### 2.2 🟠 Imtihon davomida pastki navigatsiya ochiq turadi

**Xato.** `body.exam-fullscreen` faqat `.header` ni yashiradi:

```css
/* src/index.css:1271 */
body.exam-fullscreen .header,
body.flashcard-fullscreen .header { display: none; }
```

`.bottom-nav` esa mobilda `display: block !important` bilan turadi (`index.css:1603`),
`.exam-navigator` da `margin-bottom: 80px` — ya'ni **panel joyi ataylab qoldirilgan**.

**Oqibati.** Imtihon paytida ekran pastida 4 ta tab + markazda "Imtihon" FAB turadi.
Bosh barmoq zonasi — aynan o'sha joy. Bitta noto'g'ri teginish → `navigate('/leaderboard')`.
`useExitGuard` bu yerda yordam bermaydi: u faqat **`popstate`** (brauzer "orqaga") ni
ushlaydi (`hooks/useExitGuard.js:22`), `navigate()` esa `push` — guard qo'zg'almaydi.
Sessiya `localforage`da tirik, lekin foydalanuvchi bu ni bilmaydi. U ko'rgan narsa:
"imtihonim yo'qoldi". Va qaytib kelganda 2.1-bandga ko'ra taymer ham chalkash.

**To'g'ri yechim.**

```css
/* index.css — bir qator */
body.exam-fullscreen .bottom-nav { display: none !important; }
body.exam-fullscreen .main-content { padding-bottom: 0 !important; }
```

va mobil pastki panel (1.1-band) uning o'rnini oladi — imtihonda faqat imtihonga
tegishli boshqaruv qoladi. Agar navigatsiyani qoldirishni xohlasangiz, minimum
`ConfirmDialog` (loyihada bor) chiqarilishi shart.

---

### 2.3 🟡 Natijalar ekrani: kuchli, lekin bitta halqa yetishmaydi

**Hozir bor (va bu yaxshi):** donut + to'g'ri/xato/tashlab ketilgan/ball,
pacing tahlili Y1/Y2/Y3 bo'yicha (`ExamPage.jsx:1211`), eng zaif mavzu + "mashq qilish"
tugmasi (`:1255`), mavzular bo'yicha 50 tali rangli panjara, keyingi bosqich (milestone),
rejadagi keyingi qadam, ulashish kartasi. Izohlar `reviewMode` da to'liq ko'rsatiladi
(`ExamPage.jsx:1543`). Bu bozordagi ko'p ilovadan yuqori.

**Xato.** Xatolarni ko'rish uchun foydalanuvchi **panjaradagi har bir qizil raqamni
alohida bosishi** kerak (`ExamPage.jsx:1310`). 50 savolda 18 xato bo'lsa — 18 marta
"raqamni bos → o'qi → 'Natijalarga qaytish'ni bos". Ketma-ket o'tish yo'li yo'q.

**Oqibati.** Odam 2-3 xatoni ko'rib tashlab ketadi. Ya'ni ilovaning eng qimmatli qismi —
**xato tahlili** — amalda iste'mol qilinmaydi. O'rganish o'sha yerda sodir bo'ladi.

**To'g'ri yechim.** Natija ekraniga bitta asosiy tugma: **"18 xatoni ko'rib chiqish →"**.
U `reviewMode` ga faqat xato indekslari ro'yxati bilan kiradi va review ichida
"Keyingi xato →" bilan ketma-ket yuradi, oxirida "Xatolar tugadi" + "Bu mavzularni
mashq qilish" taklifi.

```jsx
const wrongIdx = useMemo(
  () => questions.map((q, i) => (answers[i] !== undefined && answers[i] !== q.correct ? i : -1))
                 .filter(i => i >= 0),
  [questions, answers],
);
// reviewMode ichida: keyingi/oldingi XATOGA o'tish (barcha savolga emas)
```

---

### 2.4 🟡 "Qayta urinish" butun sahifani qayta yuklaydi

**Xato.** `ExamPage.jsx:1333`: `onClick={() => navigate(0)}`.

**Oqibati.** `navigate(0)` — to'liq `location.reload()`. Ilova qaytadan boot bo'ladi:
splash, Firebase auth, `getDoc(users/{uid})`, chunk'lar, statistika yuklash. Sekin
tarmoqda 3-6 soniya va **ortiqcha Firestore o'qishlari**. SPA'da bunga hech qanday
ehtiyoj yo'q.

**To'g'ri yechim.** Holatni o'z ichida tozalash:

```jsx
const restartExam = () => {
  clearSavedSession();
  committedRef.current = false;
  resumingRef.current  = false;
  setFinished(false); setReviewMode(false);
  setAnswers({}); setFlagged({}); setCurrentQ(0);
  setPacing(null); setWeakTopicsSorted([]);
  setExamStarted(false);   // kirish oynasiga qaytadi; "Boshlash" savollarni qayta yuklaydi
};
```

---

### 2.5 🟡 Onboarding natijasi bulutga yozilmasa — jimgina yo'qoladi

**Xato.** `OnboardingPage.jsx:395`:

```js
writeContract({ toifa, dailyMinutes: minutes }, user?.uid);   // await YO'Q
try {
  if (user?.uid) {
    await updateDoc(doc(db, 'users', user.uid), { onboardingDone: true, ... });
  }
} catch (e) { console.error(e); }        // ← foydalanuvchi hech narsa bilmaydi
setTimeout(() => { setStep(4); setSaving(false); }, 1500);
```

**Oqibati.** Ro'yxatdan o'tish paytida tarmoq uzilsa (Uzbekistonda mobil internetda
odatiy holat) `onboardingDone` bulutga tushmaydi. Joriy qurilmada muammo ko'rinmaydi —
`App.jsx:379` `localStorage`ga bayroq qo'yadi. Lekin **ilovani qayta o'rnatganda yoki
ikkinchi qurilmada onboarding boshidan qaytadi** va tanlangan fan/toifa yo'qoladi.
Foydalanuvchi uchun bu "ilova meni eslamaydi".

**To'g'ri yechim.**
1. Yozuvni **navbatga qo'yish**: muvaffaqiyatsiz bo'lsa `localforage`ga
   `pending_onboarding` yozib, `online` hodisasida yoki keyingi ishga tushishda qayta urinish.
2. `updateDoc` → `setDoc(..., { merge: true })`: hujjat yo'q bo'lsa `updateDoc` REJECT
   qiladi (bu holat kamdan-kam, lekin bor).
3. `writeContract` ni `await` qilish yoki xatosini bir joyda ushlash.
4. Xato bo'lsa 5-qadamda kichik jim qator: "Sozlamalar keyinroq sinxronlanadi" —
   yolg'on "tayyor" ko'rsatmaslik.

---

### 2.6 Gamifikatsiya: yetarli, lekin **kunlik qaytish sababi** yo'q

**Hozir bor:** `dailyStreak` + `streakFreezes`, `totalScore` + haftalik/oylik reyting
(`weekly_*`/`monthly_*`), `achievements` (AMI + unvon + tracks), `milestones`,
combo + konfetti (5, 10, 15...), yutuq uchun ball/zaxira mukofoti, referral, hamkor guruhlari,
haftalik yopiq diagnostika to'plamlari. Bu **ko'p** — muammo miqdorda emas.

**Xato (mahsulot darajasida).** Bularning hammasi **ilova ICHIDA**. Ilovadan tashqarida
odamni qaytaradigan yagona mexanizm — FCM push (`services/push.js` + `api/cron-reminder.js`),
lekin u faqat ruxsat berganlarga va umumiy matn bilan ishlaydi.

**Oqibati.** Zanjir (streak) faqat ilovani ochgan odamni ushlaydi; ochmagan odamni
qaytarmaydi. 3-kunda odam esdan chiqaradi, 7-kunda trial tugaydi va u qaytmaydi.
Retention grafigi 1-kundan keyin tik tushadi — bu Zehin muammosi emas, lekin bor
gamifikatsiya bu ni yechmaydi.

**To'g'ri yechim** — 4-bo'limdagi 3 ta taklif aynan shu haqida.

---

## 3. 🛠 Texnik barqarorlik va xavfsizlik

### 3.1 🔴 KRITIK: `test_session` uid'siz tiklanadi (maxfiylik teshigi)

**Xato.** `src/pages/TestPage.jsx:268`:

```js
const valid = s && s.activeCategory === state.activeCategory && s.mode === mode
  && s.topicId === topicId && sameSubset
  && (!s.uid || s.uid === user?.uid)          // ← "uid yo'q bo'lsa — kirsin"
  && Array.isArray(s.questions) && s.questions.length > 0;
```

Bu **AYNAN o'sha xato** 2026-08-06 auditida T-21 bandi sifatida topilgan va
`ExamPage.jsx:277` da yopilgan. Kod izohi hali ham o'sha yerda turadi:

> "avval shart `(!s.uid || s.uid === user?.uid)` edi: `uid` YO'Q sessiya ISTALGAN hisob
> tomonidan tiklanardi. Umumiy qurilmada bir o'qituvchi boshqasining tugallanmagan
> imtihonini — javoblari bilan — ochib olardi."

Tuzatish `ExamPage`ga qo'llanib, **`TestPage`ga qo'llanmagan**. Ustiga-ustak
`test_session` kaliti global (uid bo'yicha ajratilmagan) — `EXAM_SESSION_KEY` ham
shunday, lekin u yerda qat'iy tekshiruv bor.

**Oqibati.** Umumiy qurilma (maktab kompyuteri, oiladagi bitta telefon) — bu auditoriya
uchun real senariy. `user` bir lahza `null` bo'lganda saqlangan sessiya (masalan token
yangilanayotganda) keyin **boshqa hisob tomonidan javoblari bilan ochiladi**.

**To'g'ri yechim** — bir qator, `ExamPage` bilan bir xil qat'iylik:

```js
const valid = s && s.activeCategory === state.activeCategory && s.mode === mode
  && s.topicId === topicId && sameSubset
  && !!s.uid && !!user?.uid && s.uid === user.uid      // ← qat'iy egalik
  && Array.isArray(s.questions) && s.questions.length > 0;
```

Va kalitni uid bo'yicha ajratish (`test_session_${uid}`) — ikkinchi qatlam himoya.
Chiqishda (`logout`) ikkala kalitni ham tozalash.

---

### 3.2 🔴 KRITIK: Har javobda 2.4 MB IndexedDB'ga yoziladi

**Xato.** `src/pages/TestPage.jsx:617`:

```js
useEffect(() => {
  if (questions.length === 0 || showResults) return;
  localforage.setItem('test_session', {
    ...
    questions,      // 50 ta savol
    fullPool,       // ← FANNING BARCHA SAVOLLARI
    answers, currentQ, selectedBatch, comboCount,
    questionTimes: questionTimesRef.current,
    savedAt: Date.now()
  }).catch(...);
}, [questions, answers, currentQ, selectedBatch, comboCount, showResults,
    mode, topicId, topicSubset, state.activeCategory, user?.uid, fullPool]);
```

**Debounce YO'Q.** `answers` har teginishda o'zgaradi, `currentQ` har o'tishda.

**O'lchov (bu mashinada bajarildi):**

| Ko'rsatkich | Qiymat |
|---|---|
| CHQBT fanidagi savol soni | **2 596** (`firestore_backup_chqbt_*.json`) |
| Fayl hajmi | **2.45 MB** (~942 bayt/savol) |
| `structuredClone(2596 savol)` — desktop Node | **~9.4 ms** |
| O'rta Android (×4–6 sekinroq) | **~40–60 ms** asosiy oqim bloklanishi |
| 50 savolli blokda yozuv soni | ~50 javob + ~50 o'tish ≈ **100** |
| Blok davomida IndexedDB'ga yozilgan hajm | **~240 MB** (bir kalit ustiga qayta-qayta) |

**Oqibati.**
1. **Har teginishda 40-60 ms lag** — javob bosilgach variant rangi kechikib o'zgaradi.
   Foydalanuvchi buni "ilova sekin" deb ta'riflaydi va sababini aytib bera olmaydi.
2. **Batareya va flesh xotira.** Bir seansda yuzlab megabayt yozuv.
3. **Eng xavflisi — bu AYNAN o'sha IndexedDB qatlami** bo'lib, `src/firebase.js` dagi
   izohga ko'ra `persistentLocalCache` dan voz kechishga sabab bo'lgan. O'sha yerda
   yozilgan: "Android fondagi tabning IndexedDB ulanishini yopib qo'yadi... butun
   Firestore o'ladi". Og'ir `localforage` yozuvlari xuddi shu qatlamni bosim ostida
   ushlab turadi — `INTERNAL ASSERTION FAILED` oilasining qaytishi uchun sharoit.

**To'g'ri yechim — uch qadam:**

1. **`fullPool` ni SAQLAMANG.** U allaqachon `localforage` da savol keshida turadi
   (`questions_${cat}` — `TestPage.jsx:431` atrofida) va `generateFullPool` uni
   qayta yasay oladi. Sessiyada faqat **tiklash uchun zarur minimum** kerak:

```js
localforage.setItem(sessionKey, {
  uid: user.uid, activeCategory: state.activeCategory, mode, topicId, topicSubset,
  selectedBatch, currentQ, answers, comboCount,
  questionTimes: questionTimesRef.current,
  // Savollarni EMAS, ularning kalitlarini saqlaymiz (~40 bayt/savol o'rniga 942):
  questionKeys: questions.map(q => questionKey(q)),
  savedAt: Date.now(),
});
```
   Resume'da: keshdan `fullPool` qayta yasaladi → `questionKeys` bo'yicha 50 savol
   topiladi. Yozuv hajmi **2.4 MB → ~4 KB** (600 barobar kichik).

2. **Debounce qo'shing** (AppContext'da bu naqsh allaqachon bor — `flushSaveRef`):

```js
const saveTimerRef = useRef(null);
useEffect(() => {
  if (questions.length === 0 || showResults) return;
  clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => { persistSession(); }, 600);
  return () => clearTimeout(saveTimerRef.current);
}, [answers, currentQ, selectedBatch, comboCount]);

// Ilova fonga tushganda DARHOL yozamiz (debounce kutmasdan)
useEffect(() => {
  const onHide = () => { if (document.visibilityState === 'hidden') persistSession(); };
  document.addEventListener('visibilitychange', onHide);
  return () => document.removeEventListener('visibilitychange', onHide);
}, []);
```

3. `questions` va `fullPool` ni dependency massividan olib tashlang (ular
   `persistSession` ichida `ref` orqali o'qilsin) — aks holda blok almashganda
   yana ortiqcha yozuv bo'ladi.

**Eslatma:** `ExamPage` da bu qisman to'g'ri — u har 30 soniyada + `visibilitychange`da
yozadi (`ExamPage.jsx:262-268`), lekin **`answers`/`currentQ` o'zgarishida ham** yozadi
va 50 ta savolni to'liq saqlaydi (~47 KB). Bu chidamli, lekin u ham debounce'dan
foyda ko'radi.

---

### 3.3 🟡 `firebase/messaging` birinchi ekranga preload bo'ladi

**Xato.** `src/App.jsx:12` — statik import:

```js
import { enablePush, listenForegroundPush } from './services/push';
```

`services/push.js:14` esa `firebase/messaging` ni statik import qiladi. Natijada
`fb-messaging` chunk'i eager grafga tushadi va `dist/index.html` da
`<link rel="modulepreload" href="/assets/fb-messaging-D5fsd0Ui.js">` paydo bo'ladi.

Bu **`vite.config.js` dagi o'z niyatiga qarshi** — u yerda yozilgan:
"messaging faqat push yoqilganda (Settings), storage faqat admin yuklashlarida kerak.
Shunda dastlabki 'firebase' chunk'i kichikroq bo'ladi."

**Oqibati.** 36 KB (xom) birinchi ekrandan OLDIN yuklanadi va u foydalanuvchilarning
katta qismiga (push ruxsati bermaganlar) hech qachon kerak emas. Umumiy manzara:

| Chunk | Hajm (xom) |
|---|---|
| `fb-firestore` | 478 KB |
| `index` | 346 KB |
| `vendor` | 275 KB |
| `fb-auth` | 214 KB |
| `react-vendor` | 142 KB |
| `motion` | 114 KB |
| `firebase` | 107 KB |
| `icons` | 65 KB |
| `router` | 38 KB |
| `fb-messaging` | 36 KB ⚠️ |
| **Jami preload** | **~1.71 MB** (gzip ≈ 450–500 KB) |

**To'g'ri yechim.** Push'ni dinamik importga o'tkazish:

```js
// App.jsx — statik importni olib tashlab:
useEffect(() => {
  if (!user) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let cleanup;
  import('./services/push').then(({ enablePush, listenForegroundPush }) => {
    enablePush(user).catch(() => {});
    listenForegroundPush(() => {}).then(u => { cleanup = u; }).catch(() => {});
  });
  return () => { if (typeof cleanup === 'function') cleanup(); };
}, [user]);
```

Shunda `fb-messaging` faqat ruxsat berilgan foydalanuvchida yuklanadi.

Qo'shimcha: `canvas-confetti` `Header.jsx:17` da statik import — Header lazy emas,
ya'ni confetti ham eager. Kichik (~10 KB), lekin `ReferralPage.jsx:76` da allaqachon
`import('canvas-confetti')` dinamik ishlatilgan — shu naqshni `Header`/`TestPage`/
`ExamPage`/`SmartReviewPage`ga ham qo'llash mumkin.

---

### 3.4 🟡 Har harf bosilganda butun ilova qayta render bo'ladi

**Xato.** `QuestionBox.jsx:283` — shaxsiy izoh maydoni:

```jsx
onChange={(e) => saveCustomMnemonic(qHash, e.target.value)}
```

`saveCustomMnemonic` (`AppContext.jsx:1030`) global `state` ni o'zgartiradi. Context
qiymati `state` ga bog'liq (`AppContext.jsx:1185` `useMemo` deps) → **har harfda
`AppContext`ning BARCHA iste'molchilari qayta render bo'ladi** (Header, BottomNav,
Sidebar, TestPage, QuestionBox...).

**Oqibati.** Izoh yozayotganda klaviatura kechikadi; uzun izohda harflar tushib qoladi.
Shu bilan birga `writeCloudNow` debounce'i (3 s) qayta-qayta siljiydi.

**To'g'ri yechim.** Mahalliy state + `onBlur`/debounce'da global yozish:

```jsx
const [draft, setDraft] = useState(state.customMnemonics?.[qHash] || '');
useEffect(() => { setDraft(state.customMnemonics?.[qHash] || ''); }, [qHash]);
// ...
<textarea
  value={draft}
  onChange={e => setDraft(e.target.value)}
  onBlur={() => { if (draft !== (state.customMnemonics?.[qHash] || '')) saveCustomMnemonic(qHash, draft); }}
/>
```

---

### 3.5 🟡 Admin paneldagi 47 000 o'qishlik mina

**Holat.** `AdminPage.jsx:1036` — `getDocs(collection(db, 'questions'))`. Kodda
to'g'ri hujjatlashtirilgan va **avtomatik ishga tushishdan qo'lga o'tkazilgan**
(`loadAllQuestions` faqat tugma bosilganda). Bu yaxshi mitigatsiya.

**Qolgan xavf.** Mina hali ham joyida: bitta bosish = 47 000 o'qish = Spark bepul
rejasining kunlik kvotasining (50 000) deyarli hammasi. Bosilgandan keyin **o'sha kun
davomida barcha foydalanuvchida** statistika, reyting va bildirishnomalar
`permission-denied`/`resource-exhausted` beradi.

**To'g'ri yechim.**
1. Tugmaga tasdiq oynasi: "Bu amal ~47 000 o'qish sarflaydi (kunlik kvota 50 000).
   Davom etilsinmi?" — hozircha eng arzon himoya.
2. Yaxshiroq: fan bo'yicha yuklash (`where('category','==',fan)`) — 2 900 o'qish.
3. To'g'ri yechim: `api/get-questions.js` naqshi — Admin SDK bilan server tomonda
   o'qib, admin'ga tayyor paket berish. O'qish narxi 0 (paket allaqachon qurilgan).

---

### 3.6 🟢 Offline/kesh bo'yicha to'g'ri qilinganlar

- **Savol paketi** `localforage` da versiya kaliti bilan keshlanadi → offline'da mashq ishlaydi.
- **Natijalar** ikki qatlamda: `localStorage` (`iqro_state_${uid}`) + `localforage` zaxira,
  `visibilitychange`da `flushAll` (`AppContext.jsx:671`).
- **Natija darhol yoziladi** — `batchCommitResults` debounce kutmaydi (`AppContext.jsx:976`).
- **Firestore keshi xotirada** (`firebase.js`) — imtihondagi `INTERNAL ASSERTION FAILED`
  crash oilasi yopilgan, sabab jurnal bilan hujjatlashtirilgan. Bu juda kuchli ish.
- **SW `skipWaiting: false`** — imtihon o'rtasida majburiy reload bo'lmaydi.
- **`api/get-questions.js`** — paket maxfiy, mijozga havola berilmaydi,
  `Cache-Control: private, no-store`, trial noaniq bo'lsa ruxsat YO'Q.
- **Reyting** `limit(50)` + `getCountFromServer` — o'z o'rnini aggregatsiya bilan topadi.

---

## 4. 🚀 Aniq amaliy tavsiyalar

### TOP-5: zudlik bilan tuzatilishi kerak

| # | Nima | Fayl | Kuch | Nega birinchi |
|---|------|------|------|---------------|
| **1** | Imtihon taymerini `deadlineMs` (wall-clock) ga o'tkazish + taymerni alohida komponentga chiqarish | `ExamPage.jsx:691, 255, 691-701` | ~3 soat | Imtihon simulyatsiyasi hozir **noto'g'ri natija beradi**. Naqsh loyihada bor (`TimerPill.jsx`) — nusxa ko'chirish ishi |
| **2** | `test_session` egaligini qat'iylashtirish + kalitni uid bo'yicha ajratish | `TestPage.jsx:268` | ~20 daqiqa | Maxfiylik. `ExamPage`da yopilgan, bu yerda ochiq qolgan. Bir qatorlik tuzatish |
| **3** | `fullPool` ni sessiyadan olib tashlash + 600ms debounce | `TestPage.jsx:617-633` | ~2 soat | Har teginishda 2.4 MB yozuv — "ilova sekin" hissining asosiy manbai. 600 barobar kamayadi |
| **4** | Imtihonda `.bottom-nav` ni yashirish + yopishgan mobil pastki panel | `index.css:1271, 1323` | ~3 soat | Tasodifiy chiqib ketish + 50 savolda ikki barobar skroll |
| **5** | Variantlarni `<button role="radio">` ga o'tkazish | `QuestionBox.jsx:150`, `index.css:535` | ~1 soat | Klaviatura + skrinrider + Play a11y hisoboti. `ExamPage`da allaqachon to'g'ri |

**Jami:** ~1.5 ish kuni. Beshtasi ham **yangi funksiya emas**, mavjud to'g'ri yechimni
ikkinchi joyga ko'chirish yoki bir qatorni o'zgartirish.

**Tavsiya etilgan tartib:** 2 → 1 → 3 → 4 → 5.
(2-si eng arzon va maxfiylikka tegishli; 1-si eng qimmat zarar; 3-si eng ko'p
"sezilarli tezlik" beradi.)

---

### 3 ta yangi funksiya (NPS/Retention uchun)

Uchtasi ham **mavjud infratuzilma ustiga** qo'yiladi — noldan tizim qurish kerak emas.

#### A. "Kunning 5 savoli" — push ichida javob berish
**Nima.** Har kuni bir vaqtda push: *"Bugungi 5 savol tayyor — 2 daqiqa"*. Bosilganda
to'g'ridan-to'g'ri 5 savolli mikro-sessiya ochiladi (yangi ekran emas, `TestPage` ning
`topicSubset` + `BATCH_SIZE=5` rejimi). Tugagach: "Zanjir: 7 kun 🔥" va tamom.

**Nega ishlaydi.** Hozirgi gamifikatsiya (zanjir, AMI, reyting) faqat **ilovani
ochgan** odamni ushlaydi. Bu funksiya **ochmagan odamni qaytaradi**. Kunlik maqsad
20 savol — bu psixologik jihatdan katta; 5 savol "yo'q" deyish qiyin bo'lgan hajm.
Zanjir uzilishi qo'rquvi (loss aversion) allaqachon kodda bor (`streakRisk.js`,
`StreakRiskCard.jsx`) — faqat tashqi turtki yetishmaydi.

**Nima allaqachon bor.** `api/cron-reminder.js`, `services/push.js`,
`hooks/useDailyPlan.js`, `SmartQuestionEngine.smartSort` (savol tanlash),
`streakRisk.js` (kim uzilish arafasida). Yangi kod: mikro-sessiya rejimi + push matnini
shaxsiylashtirish ("Sizning zaif mavzuingiz: Pedagogik mahorat").

**O'lchov.** D1/D7 retention, push CTR, zanjir uzunligi medianasi.

---

#### B. "Attestatsiyaga tayyorlik prognozi" — sanaga bog'langan
**Nima.** Dashboard tepasida bitta qator: *"13-mayga 118 kun. Hozirgi tempda tayyorlik:
64%. Toifa uchun kerak: 70%. Kuniga +8 savol — 12-mayda 71% bo'lasiz."*
Grafik emas — **bitta jumla + bitta tugma**.

**Nega ishlaydi.** Foydalanuvchining haqiqiy qo'rquvi "reytingda 12-o'rin" emas —
**imtihondan o'tmaslik**. Hozir `readiness`, `readinessHistory`, `DiagnosticsEngine`,
`TrajectoryPlan`, `useExamDaysLeft` hammasi mavjud, lekin bu ma'lumot Tahlil sahifasida
ko'milgan. Uni birinchi ekranga chiqarish "yana bir o'yin" ni "shaxsiy xavf hisoboti"
ga aylantiradi. Bu — pullik obunani asoslaydigan yagona eng kuchli argument.

**Nima allaqachon bor.** `engine/DiagnosticsEngine.js` (631 qator), `state.readiness`,
`readinessHistory`, `EXAM_BLUEPRINT`, `components/diagnostics/*`, `EXAM_DATE`.
Yangi kod: prognoz formulasi (chiziqli ekstrapolyatsiya yetarli) + Dashboard qatori.

**O'lchov.** Trial → to'lov konversiyasi, Dashboard'dan testga o'tish darajasi.

---

#### C. "Xato daftari" ni haftalik yopiladigan halqaga aylantirish
**Nima.** `ErrorNotebookPage` allaqachon bor, lekin passiv. Uni **majburiy bo'lmagan,
lekin taqdim etiladigan** halqaga aylantirish: har dushanba *"O'tgan hafta 23 xato
qildingiz. 12 tasi bitta mavzuda: 'Ta'lim to'g'risidagi qonun'. 10 daqiqada yopamizmi?"*
Yopilgach — "Bu mavzuda xatolaringiz 12 → 2 ga tushdi" (haqiqiy oldin/keyin raqami).

**Nega ishlaydi.** O'rganish xatoni tuzatishda sodir bo'ladi, lekin hozir foydalanuvchi
o'z xatosini **50 tali panjaradan raqamlarni bir-bir bosib** ko'rishi kerak (2.3-band).
Natijada eng qimmatli kontent iste'mol qilinmaydi. "Oldin/keyin" raqami esa — ilovaning
ishlayotganini KO'RSATADIGAN yagona dalil. NPS aynan shundan o'sadi: odam "menga
yordam berdi" deb aytishi uchun dalil kerak.

**Nima allaqachon bor.** `state.mistakes` (fan bo'yicha, `MAX_MISTAKES_SAVED=50`),
`ErrorNotebookPage.jsx`, `spacedCards` (spaced repetition), `topicStats`,
`services/interrupts.js` (haftalik oyna chiqarish navbati).
Yangi kod: haftalik guruhlash + "oldin/keyin" o'lchovi + dushanba interrupt.

**O'lchov.** Xato daftariga kirish darajasi, xato takrorlanish foizi, NPS.

---

## 5. Nima tekshirilmadi (halol ro'yxat)

- **Haqiqiy qurilma.** Ilova telefonda ishga tushirilmadi. Yuqoridagi mobil
  o'lchamlar CSS'dan o'qildi, ekranda ko'rilmadi.
- **Lighthouse / FCP / LCP / INP.** O'lchanmadi. Bundle hajmlari `dist/` dan olindi,
  lekin gzip/brotli va real tarmoq vaqti o'lchanmadi.
- **`firestore.rules` va `storage.rules`.** Faylni mavjudligini tasdiqladim, ichini
  chuqur audit qilmadim. `api/get-questions.js` izohlariga ko'ra qoidalar to'g'ri
  qo'yilgan, lekin buni mustaqil tekshirmadim.
- **To'lov oqimi** (`api/payment-webhook.js`, `redeem-promo.js`) — ko'rilmadi.
- **`AdminPage.jsx` ning 4 442 qatori** — faqat so'rovlar (`getDocs`/`onSnapshot`)
  bo'yicha skanerlandi, to'liq o'qilmadi.
- **Analitika ma'lumoti.** Funnel, drop-off, retention raqamlari menda YO'Q.
  1.3 va 2.6-bandlardagi xulosalar — gipoteza. Ularni tasdiqlash uchun
  `AnalyticsEvents` ga onboarding qadamlari hodisasi qo'shilishi kerak.
- **`ru`/`en` tarjima to'liqligi** — tekshirilmadi (oldingi audit "toza" degan).

---

## 6. Xulosa

Zehin — texnik jihatdan yaxshi qurilgan mahsulot. Auditda topilgan 7 ta nuqsonning
5 tasi **bir joyda to'g'ri hal qilingan, ikkinchi joyda qolib ketgan** naqshdan
kelib chiqadi:

| To'g'ri qilingan joy | Qolib ketgan joy |
|---|---|
| `TimerPill.jsx` — wall-clock taymer | `ExamPage.jsx` — asosiy imtihon taymeri |
| `ExamPage.jsx:277` — qat'iy uid tekshiruvi | `TestPage.jsx:268` — `!s.uid \|\|` |
| `ExamPage.jsx:1499` — `<button>` variant | `QuestionBox.jsx:150` — `<div onClick>` |
| `vite.config.js` — messaging lazy niyati | `App.jsx:12` — statik import |
| `AppContext.jsx` — debounce + flush naqshi | `TestPage.jsx:617` — debounce'siz 2.4 MB |

**Tavsiya:** kelgusi auditlarda "tuzatildi" deb belgilashdan oldin **grep bilan
tekshirish**: xato naqshi loyihada boshqa qayerda uchraydi? Masalan
`grep -rn "!s.uid ||" src/` yoki `grep -rn "setInterval" src/ | grep -i tim`.
Yuqoridagi 5 ta band aynan shu qadam bajarilmagani uchun qolgan.
