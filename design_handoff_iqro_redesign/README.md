# Handoff: IQRO Redizayn — Vizual yangilash (azure brend + tuzilma)

> **Til eslatmasi:** Bu hujjat dasturchi (yoki Claude Code) uchun. Loyiha — IQRO: O'zbekistondagi kasbiy sertifikatlash / imtihonga tayyorgarlik ilovasi (React + Vite, Firebase, i18next, PWA → kelajakda APK).

---

## 1. Overview (Maqsad)

IQRO ilovasining vizual ko'rinishini yangilash. Uchta asosiy muammoni hal qiladi:

1. **Brend rangi** — eski ko'k→binafsha gradient (`#29B6F6 → #8B5CF6`) "arzon" ko'rinardi. Yangi: **sof azure `#0E97E0`, gradientsiz**, jiddiy va ishonchli (imtihon ilovasiga mos).
2. **Fan tanlash** — 13 ta fan tartibsiz ro'yxat edi; mobilda fan almashtirish topib bo'lmasdi; tanlangan fan ko'rinmasdi. Yangi: **guruhlangan**, tanlangan fan tepada katta/rangli, qolgani neytral.
3. **Ikonka ranglari** — har fanga alohida rang (shovqinli). Yangi: **faqat tanlangan fan rangli (azure), qolgani kulrang**.

Qo'shimcha: Profil **chapdan chiqadigan drawer** (Click ilovasi uslubida), Onboarding'da fan tanlash qadami.

**MUHIM:** Hech qanday funksiya o'chmaydi. Bu **faqat vizual qayta tartiblash + restyle** — barcha mavjud mantiq (e'tiroz, premium devori, mnemonik, anti-cheat, taymer, spaced repetition, referral) saqlanadi.

---

## 2. About the Design Files (Dizayn fayllari haqida)

Bu paketdagi fayllar — **HTML'da yaratilgan dizayn namunalari** (prototip), to'g'ridan-to'g'ri ko'chiriladigan production kod EMAS. Ular faqat **ko'rinish va xatti-harakatni** ko'rsatadi.

Vazifa: bu namunalarni IQRO'ning **mavjud React + Vite muhitida** qayta yaratish — uning o'rnatilgan pattern'lari (CSS o'zgaruvchilari/tokenlar, `framer-motion`, `lucide-react`, `react-i18next`, `AppContext`/`AuthContext`) bilan.

- `IQRO Mockup.dc.html` — 8 ta ekran namunasi (quyida tavsiflangan). Brauzerda oching.
- `index.css (yangilangan)` — **TAYYOR**. Bu sizning `src/index.css` ning yangilangan to'liq nusxasi (faqat token bloklari o'zgargan). To'g'ridan-to'g'ri almashtirsa bo'ladi.
- `BottomNav.jsx (namuna)` — bitta to'liq qayta yozilgan komponent (token-restyle qanday ishlashiga misol).
- `support.js` — namunani ochish uchun runtime (e'tiborsiz qoldiring, dizaynga aloqasi yo'q).

---

## 3. Fidelity: HIGH-FIDELITY (hifi)

Aniq ranglar, oraliqlar, radius va tipografiya berilgan. Pixel-darajada ko'chiring, lekin **kodbazaning mavjud tokenlari va komponentlari** orqali. Yangi rang kiritmang — quyidagi tokenlardan foydalaning.

---

## 4. Design Tokens (eng muhim qism)

Butun redizaynning asosi — `src/index.css` dagi CSS o'zgaruvchilari. **Faqat shu bloklarni almashtirsangiz, ilovaning ~70% i avtomatik yangilanadi.** `index.css (yangilangan)` faylida tayyor.

### O'zgargan tokenlar (faqat shular):

| Token | Kunduz (`:root`) | Tun (`.dark-theme`) | Sepia (`.sepia-theme`) |
|---|---|---|---|
| `--accent` | `#0E97E0` | `#36ABEC` | `#2E7FB0` |
| `--accent2` | `#0B79B8` | `#5BBEF2` | `#216C99` |
| `--accent3` | `#085F90` | `#7DD3FC` | `#17506F` |
| `--grad-primary` | `#0E97E0` | `#36ABEC` | `#2E7FB0` |
| `--blue` | `#0E97E0` | `#36ABEC` | `#2E7FB0` |
| `--blue-bg` | `rgba(14,151,224,0.08)` | `rgba(54,171,236,0.15)` | `rgba(46,127,176,0.10)` |

**ENG MUHIM:** `--grad-primary` endi **gradient emas, sof rang** (ko'k→binafsha o'chirildi). Bu binafsha tovlanishni butun ilovadan olib tashlaydi.

### O'zgarmagan tokenlar (tegmang):
`--bg`, `--bg2`, `--surface`, `--text*`, `--red`, `--green`, `--amber`, `--purple` (premium/badge'larda ishlatilishi mumkin — saqlandi).

### Boshqa qiymatlar (namunada ishlatilgan):
- **Yashil (to'g'ri javob):** `#16A34A`, fon `rgba(22,163,74,0.07)`
- **Qizil (xato/ogohlantirish):** `#EF4444`
- **Amber (premium crown, 1-o'rin):** `#F59E0B → #FBBF24`
- **Neytral ikonka foni:** `#EEF1F5` / `#F0F3F7`, ikonka rangi `#94A3B8`
- **Border:** `#E4E9EF` / `#ECEFF3`
- **Sepia oltin border:** `#D9B98A`
- **Radius:** kartalar `14–18px`, tugmalar `13–15px`, ikonka qutilari `11–13px`, chip/pill `99px`
- **Soya:** kartalar `0 4px 16px rgba(15,27,45,0.05)`; azure tugma `0 10px 22px rgba(14,151,224,0.30)`
- **Mobil fon:** `#EEF2F6` (kunduz), `#0C0D10` (tun)

### Tipografiya:
- Asosiy: **Plus Jakarta Sans** (400/500/600/700/800) — mavjud
- Texnik (taymer, kod): **IBM Plex Mono** — mavjud
- Sarlavhalar: 800 weight, `letter-spacing: -0.01em`
- Tana matn: 600 weight asosiy, 400/500 ikkilamchi
- O'lcham minimal: 11px (yorliq), 13–15px (asosiy), 17–23px (sarlavha)

---

## 5. Screens / Views (Ekranlar)

> Namuna `IQRO Mockup.dc.html` da 4 qator, har biri telefon ko'rinishida (375×812 mantiqiy, status bar + home indicator bilan).

### 5.1 — Fan tanlash (SubjectSelect) ⭐ ASOSIY O'ZGARISH
**Maqsad:** Foydalanuvchi tayyorlanadigan asosiy fanni tanlaydi. Odatda 1 ta fan bilan ishlaydi, lekin boshqalarni ko'rishi kerak (referral uchun).

**Tanlangan yo'nalish: Variant B (Karta + guruh).**

**Layout (yuqoridan pastga):**
1. **Header:** "Fan tanlash" (23px/800) + subtitle "Tayyorlanayotgan faningiz" (13px, `--text3`); o'ngda yopish (×) tugmasi.
2. **Qidiruv maydoni:** oq fon, `#ECEFF3` border, radius 13px, search ikonka + "Fan qidirish..." placeholder.
3. **HERO — Faol fan kartasi:** to'liq azure (`--accent`) fon, radius 18px, soya `0 12px 28px rgba(14,151,224,0.32)`. Ichida: oq yarim-shaffof ikonka qutisi (`rgba(255,255,255,0.18)`), "Faol fan" pill (✓ bilan), fan nomi (20px/800 oq), tavsif, **o'zlashtirish progress bar** (oq, foiz bilan).
4. **Guruhlar** — har biri uppercase yorliq (11px/800, `--text3`) + 2 ustunli grid kartalar:
   - **"Maktab fanlari":** Ona tili, Tarix, Biologiya, Geografiya, Informatika, Jismoniy, Tasviriy...
   - **"Maktabgacha · MTT":** Tarbiyachi, Logoped, Psixolog...
   - (Kodingizdagi haqiqiy 13 fanni tegishli guruhga joylashtiring.)
5. **Guruhlanmagan fan kartasi (neytral):** oq fon, `#ECEFF3` border, **kulrang ikonka qutisi** (`#EEF1F5` fon, `#94A3B8` ikonka), fan nomi (13.5px/700), qisqa tavsif.

**Asosiy qoida:** Faqat **faol fan** azure rangli. Qolgan barcha fan ikonkalari **kulrang** (`#94A3B8`). Tanlanganda → azure bo'ladi.

**Referral nudge** (ro'yxat oxirida, ixtiyoriy): punktir azure border, "Do'stingiz boshqa fanga tayyorlanyaptimi? Ulashing — ikkalangiz bonus olasiz" + "Ulash" tugmasi.

---

### 5.1b — Header: Fan → Bo'lim (Blok) navigatsiyasi ⭐ MUHIM TUZATISH
**Muammo (hozir):** Ilovada ikki darajali ierarxiya bor — **Fan** (Tasviriy San'at...) → **Bo'lim/Blok** (har fanda ~58 blok × 50 savol). Hozirgi header buni chalkash ko'rsatadi:
- "Tasviriy San'at • Barcha bo'limlar" va pastida "50 savol · Blok 1" — **ziddiyat** ("Barcha" + "Blok 1" bir vaqtda).
- Pastida yana "Blok 1 / 58 · 1–50" stepper — **"Blok 1" ikki marta takror**.
- 3 qator siqilgan, qaysi rejimda (Barcha yoki bitta blok) ekani aniq emas.

**Yechim — asosiy g'oya:** Fan (kamdan-kam o'zgaradi) va Blok (har kuni almashadi) ni ajratish; takrorlanishni yo'qotish.

**Header layout (2 qator):**
1. **Identity qatori (saqlanadi):** avatar + ism + Pro badge + "0 kun qoldi" + tema toggle + sovg'a/referral. O'zgarmaydi.
2. **Bitta kontekst paneli (3 qator stepper o'rniga):**
   ```
   [‹]   🎨 Tasviriy San'at          [›]
         Blok 1 · 1–50-savol     ⌄
   ```
   - **Chap/o'ng tugma (‹ ›):** 44px kvadrat. ‹ = oldingi blok, › = keyingi blok (azure to'ldirilgan = faol yo'nalish). "Barcha bo'limlar" rejimida ‹ › yashiriladi/o'chiriladi (bitta blok yo'q).
   - **Markaziy panel (tappable):** oq karta, `#E4E9EF` border, radius 14px, soya `0 4px 14px rgba(15,27,45,0.05)`. Chapda fan ikonka qutisi (38px, azure-light fon `rgba(14,151,224,0.10)`, azure ikonka). Markazda: **fan nomi** (15px/800, `--text`, ellipsis) + **joriy blok** (12.5px, `--text2`): `Blok 1 · 1–50-savol` YOKI `Barcha bo'limlar · 2900 savol`. O'ngda chevron-down.
   - Bosilganda → **Bo'lim tanlash** sheet ochiladi (5.1c).

**Asosiy qoidalar:**
- "Blok N" faqat **bitta joyda** (kontekst panelida) ko'rsatiladi — takror yo'q.
- "Barcha bo'limlar" rejimida blok raqami va savol oralig'i ko'rsatilmaydi (faqat "Barcha bo'limlar · N savol").
- Savol progress'i (1–50 ichida hozir qaysi savol) — **header'da emas**, test ekranining o'zida (yuqori progress bar).

---

### 5.1c — Bo'lim (Blok) tanlash sheet ⭐ YANGI
**Maqsad:** Bloklarni ko'rinadigan va tanlanadigan qilish. Kontekst panel bosilganda pastdan chiqadigan sheet (bottom sheet).

**Layout:**
1. **Grabber** (42×5px, `#CBD5E1`) + ustda dim backdrop (`rgba(15,27,45,0.30)`).
2. **Yuqori qator:** chapda "‹ Fanni o'zgartirish" (azure/700) → Fan tanlash modalini ochadi (5.1). O'ngda ✕ (yopish).
3. **Fan sarlavhasi:** azure ikonka qutisi (44px) + fan nomi (18px/800) + "58 bo'lim · 2 900 savol" (12.5px, `--text3`).
4. **"BO'LIM TANLANG"** uppercase yorliq.
5. **Ro'yxat (scrollable):**
   - **"Barcha bo'limlar" kartasi (selected default):** to'liq azure fon, grid ikonka (oq), "Barcha bo'limlar" (15px/800 oq) + "2900 savol · aralash", o'ngda ✓ (oq doira). Soya `0 10px 22px rgba(14,151,224,0.30)`.
   - **Blok kartalari (1...58):** oq fon, `#E4E9EF` border, radius 14px. Chapda blok raqami badge (38px, tanlangan=azure-light/azure matn, default=kulrang `#EEF1F5`/`#94A3B8`). Markazda "Blok N" (14.5px/700) + savol oralig'i (12px, `--text3`): "1–50-savol", "51–100-savol"... O'ngda **o'zlashtirish foizi** (yashil `#16A34A` agar >0, aks holda kulrang) + mini progress bar (48px keng).

**Hisoblash:** Blok N savol oralig'i = `(N-1)*50 + 1` dan `N*50` gacha. Blok soni = `ceil(jami_savol / 50)`.

**Oqim:** Kontekst panel → Bo'lim tanlash (bloklar) → kerak bo'lsa "Fanni o'zgartirish" → Fan tanlash (5.1). Ikki daraja, lekin har biri toza va bitta vazifaga fokuslangan.

**Modal sarlavhalarini yangilang:** eski "Fan va Bo'limni Tanlash" → ikkiga bo'linadi: Fan modali = **"Fan tanlash"**, Blok sheet = **"Bo'lim tanlash"**.

---

### 5.2 — Asosiy ekran (Dashboard / Test home)
**Maqsad:** Joriy fan bo'yicha bosh sahifa, mavzular, imtihongacha vaqt.

**Layout:**
1. **Top bar:** avatar (40px, `rgba(14,151,224,0.12)` fon) + **fan chip** (oq pill, azure mini-ikonka + "CHQBT" + chevron — bosilganda fan almashtirish) + o'ngda **countdown** ("12 kun", kalendar ikonka).
2. **Hero:** azure fon karta — "Imtihongacha / 12 kun qoldi" (32px/800 oq) + oq "Bugungi testni boshlash" tugmasi (azure matn).
3. **Mavzular ro'yxati:** "Mavzular" yorlig'i + "Barchasi" havola. Har mavzu oq karta: azure-light ikonka qutisi (`rgba(14,151,224,0.10)`), nomi, "16/20 test", foiz (azure), progress bar (azure to'ldirish, `#EEF1F5` track).
4. **Pastki nav** (BottomNav — `BottomNav.jsx` da TAYYOR).

**Fan chip — yangi pattern:** joriy fan doim tepada ko'rinadi va bosilganda fan tanlash ochiladi. Bu "mobilda fanni topib bo'lmaydi" muammosini hal qiladi.

---

### 5.3 — Profil drawer (chapdan) ⭐ YANGI PATTERN
**Maqsad:** Avatarni bosganda **chapdan siljib chiqadigan** panel (to'liq sahifa emas). Click ilovasi uslubida.

**Trigger:** avatar bosilganda. **Animatsiya:** `translateX(-100%)` → `0`, `framer-motion` spring; orqada qora backdrop (`rgba(15,27,45,0.28)` kunduz / `rgba(0,0,0,0.55)` tun), backdrop bosilsa yopiladi.

**Layout (340px keng, chapdan):**
1. **Header:** avatar (56px, azure, ✓ status nishoni bilan) + ism (uppercase yorliq) + telefon raqam (18px/800).
2. **Daraja kartasi:** oq, qalqon ikonka (yashil), "Darajangiz: Bilimdon" (gamifikatsiya). → bosilsa yutuqlar/daraja sahifasi.
3. **Menyu (ramkasiz, havodor):** Yutuqlarim · Statistikam · Sozlamalar · Qo'llab-quvvatlash · Dastur haqida. Har biri azure ikonka (25px) + 17px/600 matn, oraliq 12px.
4. **Premium kartasi:** ochiq azure gradient fon (`#DBEEFB → #F4FAFE` kunduz / `#0E2C40 → #0A1A26` tun), "IQRO Premium", tavsif, "Obuna bo'lish →" (azure/800), o'ngda 3D oltin crown asset (rotate -12deg, amber gradient).
5. **Pastki amal kartalari:** "Do'stni taklif qilish" (azure ikonka + "+5 kun" badge) · "Telegram kanalimiz" (ochiqroq azure ikonka).

> Click ilovasidan olingan pattern: toza havodor layout, daraja kartasi, premium karta, ulash/telegram kartalari. To'lov/o'tkazma funksiyalari OLINMADI (IQRO imtihon ilovasi).

---

### 5.4 — Onboarding (fan tanlash qadami)
**Maqsad:** Birinchi kirgan foydalanuvchi nima qilishni darrov tushunadi.

**Layout:**
1. **Progress:** orqaga tugma + 3 segmentli bar (2/3 to'lgan, azure) + "2/3".
2. **Sarlavha:** "Qaysi fanga tayyorlanasiz?" (26px/800) + tavsif "Asosiy faningizni tanlang. Keyinroq Profil orqali o'zgartirasiz."
3. **Chip-grid:** guruhlangan ("Maktab fanlari" / "Maktabgacha · MTT"), har fan kichik chip (ikonka + nom). Tanlangan chip azure fon/oq matn + soya; qolgani oq fon, `#ECEFF3` border, kulrang ikonka.
4. **Pastda:** "Davom etish →" azure tugma.

---

### 5.5 — Test / Takrorlash (QuestionBox, repetition mode)
**Maqsad:** Savol + javob variantlari + izoh (o'rganish rejimi).

**MUHIM — barcha mavjud funksiyalar saqlanadi:**
- **Top bar:** orqaga + mavzu nomi + progress bar + "12/40".
- **Savol kartasi (oq, radius 18):**
  - Yuqori qator: "Savol 12" yorlig'i + **qiyinlik nuqtasi** (rang: qizil/amber/yashil) + **mavzu chip** (azure-light) + o'ngda **E'tiroz tugmasi** (MessageCircle ikonka + "E'tiroz", border pill).
  - **Aqlli belgilar:** "Takrorlash" (ko'k badge) / "Zaif nuqta" — agar mavjud bo'lsa.
  - Savol matni (16.5px/700).
- **Variantlar:** harf qutisi (A/B/C/D) + matn. To'g'ri = yashil border + yashil fon + ✓; tanlangan-xato = qizil; default = oq/`#E4E9EF` border.
- **Izoh — 2 TABLI karta:**
  - Tab 1 "Tahlil": ✓ "To'g'ri javob" (yashil) + izoh matni + **Manba** (punktir chiziq ostida, "Manba: ... nizomi, N-modda").
  - Tab 2 "Eslatma": mnemonik kalit so'z + shaxsiy qayd (yashil nuqta = qayd bor).
- **Premium devori:** bepul foydalanuvchiga izoh **xira (blur)** + "Premium" qulf — mavjud mantiqni saqlang.
- **Pastki bar:** ogohlantirish/flag tugma (kvadrat) + "Keyingi savol →" azure tugma.

---

### 5.6 — Imtihon (Exam mode)
**Maqsad:** Vaqtli real imtihon simulyatsiyasi, anti-cheat.

**Test'dan farqi:**
- **Taymer kartasi (to'q `#0F1B2D` fon):** "Imtihon rejimi" (yashil qulf ikonka) + katta monospace taymer "24:18" + "Savol 15/50". Pastida azure progress.
- **Javob tanlanganda to'g'ri/xato KO'RSATILMAYDI** — faqat azure "tanlangan" holati (imtihon tugaguncha).
- **Izoh YO'Q** imtihon davomida.
- **Savol navigatori:** raqamli kataklar (15=joriy azure, javob berilgan=och azure `#CDE7F8`, bo'sh=oq border) + "Barchasi".
- E'tiroz + qiyinlik nuqtasi qoladi.
- Pastki: orqaga + "Keyingi →".

---

### 5.7 — Reyting (Leaderboard)
**Maqsad:** Haftalik/oylik/umumiy reyting.

**Layout:**
1. "Reyting" sarlavha + **3 tabli segment** (Haftalik=azure aktiv / Oylik / Umumiy).
2. **Podium (top-3):** o'rtada 1-o'rin eng baland (azure ustun, oltin crown, 60px avatar), chap 2-o'rin (kumush), o'ng 3-o'rin (bronza). Avatar + raqamli nishon + ism + ball.
3. **Ro'yxat (4-o'rindan):** oq kartalar (raqam + avatar + ism + ball). **Joriy foydalanuvchi azure fon bilan ajratiladi** ("Siz · Ayyubxon").

---

## 6. Interactions & Behavior

- **Fan chip (asosiy ekran) bosilsa** → fan tanlash ochiladi (modal yoki sahifa).
- **Avatar bosilsa** → profil drawer chapdan ochiladi (spring, ~300ms). Backdrop yoki ESC = yopish.
- **Fan tanlanganda** → ikonka kulrangdan azure'ga o'tadi, faol holatga ko'tariladi.
- **Variant tanlanganda (Test):** darhol to'g'ri/xato ko'rsatiladi + izoh ochiladi. (Imtihon: ko'rsatilmaydi.)
- **Tema almashtirish:** Kunduz/Sepia/Tun — `body` class (`.dark-theme`/`.sepia-theme`) almashadi, tokenlar avtomatik o'zgaradi. **Sepia saqlanadi** (muhim — ko'zni charchatmaydigan kitob rejimi).
- **BottomNav:** active pill `layoutId` spring animatsiya (mavjud).
- Animatsiyalar: `framer-motion`, spring `stiffness: 380, damping: 30`.

---

## 7. State Management

Mavjud holatni saqlang (`AppContext`, `AuthContext`):
- `state.topicId`, `state.testMode`, `state.spacedCards` (takrorlash)
- `user.isTruePremium` (premium oltin halqa/devor — faqat haqiqiy to'langan premium)
- Joriy tanlangan fan (subject) — global holatda saqlanishi kerak, fan chip va onboarding shundan o'qiydi.
- Tema (kunduz/sepia/tun) — localStorage'da saqlanadi (mavjud).

Yangi holat kerak emas — faqat fan tanlash UI'sini mavjud subject-state'ga ulang.

---

## 8. Asset'lar

- **Ikonalar:** `lucide-react` (mavjud) — Award, BarChart3, Settings, Share2, MessageCircle, GraduationCap, PenTool, Brain, Trophy, User, Calendar, RefreshCw, Search, Clock, ShieldCheck va h.k. Namuna inline SVG ishlatadi, lekin kodingizda lucide ekvivalentini oling.
- **Premium crown:** amber gradient (`#FCD34D → #F59E0B`) ustida oq crown — CSS/SVG bilan yasaladi, rasm shart emas.
- **Avatar:** mavjud `resolveAvatar(user)` + `src/data/avatars.js`.
- **Yangi rasm/asset kerak emas.**

---

## 9. Files (paketdagi va loyihadagi fayllar)

**Paketda:**
- `IQRO Mockup.dc.html` — barcha ekran namunalari (brauzerda oching)
- `index.css (yangilangan)` — TAYYOR, `src/index.css` o'rniga qo'ying
- `BottomNav.jsx (namuna)` — TAYYOR, `src/components/BottomNav.jsx` o'rniga qo'ying
- `support.js` — namuna runtime (e'tiborsiz qoldiring)

**Loyihada o'zgartirilishi kerak (taxminiy):**
- `src/index.css` — ✅ token bloklari (TAYYOR — paketdan oling)
- `src/components/BottomNav.jsx` — ✅ active pill soyasi (TAYYOR — paketdan oling)
- `src/components/Sidebar.jsx` — fan tanlash → guruhlangan, neytral ikonka
- `src/pages/` fan tanlash sahifasi/modal — Variant B layout
- `src/components/Header.jsx` — fan chip (asosiy ekranda)
- Profil → drawer komponenti (chapdan, framer-motion)
- `src/components/test/QuestionBox.jsx` — restyle (token'lar avtomatik, struktura saqlanadi)
- Onboarding sahifasi — fan tanlash qadami

---

## 10. Implementatsiya tartibi (tavsiya)

1. **`index.css` token bloklarini almashtiring** → ilovaning ~70% i darrov yangilanadi, gradient yo'qoladi. Sinab ko'ring (3 tema).
2. **`BottomNav.jsx`** ni qo'ying → active pill azure soyasi.
3. **Fan ikonka ranglarini neytrallashtiring** — `src/data/` dagi fan rang-mapping'ini "faqat tanlangan rangli" mantig'iga o'tkazing.
4. **Fan tanlash (Sidebar/sahifa)** → guruhlangan Variant B.
5. **Fan chip** asosiy ekranga.
6. **Profil drawer** (chapdan, framer-motion).
7. **Onboarding** fan tanlash qadami.
8. QuestionBox / Exam / Leaderboard — restyle (asosan token avtomatik, kichik tuzatishlar).

Har qadamdan keyin **sinab ko'ring** — funksiya saqlanganini tekshiring.

---

## 11. Muhim eslatmalar

- ⚠️ **Hech qanday funksiyani o'chirmang.** Bu restyle, refactor emas. E'tiroz, premium devori, mnemonik, anti-cheat, taymer, spaced repetition, referral, i18n — hammasi saqlanadi.
- ⚠️ **Sepia rejimi saqlanadi** — uchala tema (Kunduz/Sepia/Tun) ishlashi shart.
- ⚠️ **Yangi rang kiritmang** — faqat tokenlardan foydalaning, shunda tema almashtirish buzilmaydi.
- ⚠️ Yolg'on/soxta ma'lumot qo'shmang — namunadagi matnlar (ballar, savollar) faqat ko'rgazma uchun; haqiqiy ma'lumotni kodingizdan oling.
- ✅ Kodbazaning mavjud pattern'lariga amal qiling (CSS o'zgaruvchilari, framer-motion, lucide, i18next).
