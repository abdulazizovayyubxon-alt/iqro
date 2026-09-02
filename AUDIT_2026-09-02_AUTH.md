# Audit 2026-09-02 (3) — auth oqimi

**Qamrov:** ro'yxatdan o'tish, kirish, chiqish, hamkor taklifi oqimi va
qurilmada qoladigan ma'lumot. Diqqat markazi — 2026-08-19 dan keyingi
o'zgarishlar (`60996aa` ro'yxat rollback'i, `97fe582` promo, `b1ae909` kvota).
**Usul:** faqat kodni o'qish. **Kodga TEGILMADI.**

---

## 1. Qamrov

**Ko'rildi:** `src/context/AuthContext.jsx` (ro'yxat, kirish, chiqish,
`onAuthStateChanged`, `onSnapshot`), `src/services/promo.js`,
`src/components/PartnerJoinCard.jsx`, `src/hooks/useNotifications.js`,
`api/check-user.js`, `src/hooks/useAdmin.js`, ilovadagi BARCHA `localStorage`
kalitlari (32 ta) va ularning hisobga bog'langanligi.

**Ko'rilMADI:** `api/notify-admin?action=delete-user` tozalash qamrovi,
SMS yo'li (`api/_sms.js`), TWA/Google Play seans xususiyatlari.

---

## 2. Topilmalar

Ikkala asosiy topilma ham BIR XIL sinfdan: **umumiy qurilmada oldingi
hisobning izi keyingi hisobga o'tadi**. Bu tahdid modeli loyihada
ALLAQACHON qabul qilingan va imtihon sessiyasi uchun yopilgan
([ExamPage.jsx:361-367](src/pages/ExamPage.jsx#L361), audit 2026-08-06 T-21):

> «Umumiy qurilmada bir o'qituvchi boshqasining tugallanmagan imtihonini —
> javoblari bilan — ochib olardi.»

Quyidagi ikki yo'l o'sha qamrovga kirmay qolgan.

---

### B-1 · O'RTA · Hamkor taklifi BEGONA hisobga o'tib ketishi mumkin

**Qayerda:** [src/services/promo.js:189](src/services/promo.js#L189), [src/context/AuthContext.jsx:1002](src/context/AuthContext.jsx#L1002)
**Holat:** TASDIQLANGAN (kod)

Bugungi `97fe582` aynan shu teshikni yopish uchun yozilgan:

> Havolani bosgan ustoz chiqib ketsa, o'sha telefonda kirgan boshqa odam
> taklifni ko'rardi va bossa, uning ismi, ID'si va test natijalari begona
> ustozga ochilardi. Qaytarib bo'lmaydigan yo'l bilan.

Kuryer (`localStorage.iqro_pending_promo`) endi hisobga topshiriladi va
o'zidan o'chiriladi. Lekin topshirish SHARTGA bog'langan:

```js
if (!data.pendingPromo) {
  bindPendingPromoToAccount(uid).catch(...);
}
```

`clearPendingPromoCode()` esa FAQAT `bindPendingPromoToAccount` ichida, yozuv
o'tgandan keyin chaqiriladi ([promo.js:217](src/services/promo.js#L217)).
Ya'ni **shart bajarilmasa kuryer tozalanmaydi**. `logout()` ham uni
o'chirmaydi ([AuthContext.jsx:923-945](src/context/AuthContext.jsx#L923)).

**Buzilish yo'li:**
1. A hisobida ALLAQACHON `pendingPromo` bor (oldingi havoladan).
2. Shu qurilmada Y hamkor havolasi bosiladi → kuryerda Y turadi.
3. A kiradi → `data.pendingPromo` bor → topshirish O'TKAZIB YUBORILADI →
   **kuryer Y localStorage'da qoladi**.
4. A chiqadi, B kiradi. B da `pendingPromo` yo'q → topshirish ishlaydi →
   **B ga Y taklifi ko'rinadi**.

Soddaroq ikkinchi yo'l: havola bosiladi, lekin odam KIRMAYDI (telefonni
hamkasbiga beradi) → hamkasb kirganda taklif unga tegadi.

Kuryer 7 kun yashaydi, ya'ni oyna kichik emas. Shu muddat ichida `pendingPromo`
si bo'lmagan HAR bir hisob Y ni olishi mumkin.

**Oqibati** — `97fe582` ning o'zi tasvirlagani: B taklifni qabul qilsa, uning
ismi, ID'si va natijalari o'zi tanlamagan hamkor ustozga ochiladi va
`redemptions` yozuvi o'chirilmaydi.

**Takrorlash:** A hisobiga qo'lda `pendingPromo` yozing → hamkor havolasini
oching → A bilan kiring (taklif ko'rinmaydi, kuryer qoladi) → chiqing →
B bilan kiring → B da Y taklifi chiqadi.

**Tuzatish:** kuryerni **kirgan har qanday hisob uni ko'rib chiqqach** tozalash
— ya'ni `else` shoxida ham. Kuryerning vazifasi «login bo'lgunicha ushlab
turish», bir hisob uni ko'rgach vazifa tugaydi. Qo'shimcha: `logout()` ga
`clearPendingPromoCode()` qo'shish.

---

### B-2 · O'RTA · Oldingi hisobning bildirishnomalari keyingi hisobga ko'rinadi

**Qayerda:** [src/hooks/useNotifications.js:8-9](src/hooks/useNotifications.js#L8), [src/context/AuthContext.jsx:923-945](src/context/AuthContext.jsx#L923)
**Holat:** TASDIQLANGAN (kod)

```js
const STORAGE_KEY = 'IQRO_NOTIFICATIONS';          // ← uid YO'Q
const DELETED_KEY = 'IQRO_NOTIFICATIONS_DELETED';  // ← uid YO'Q
```

Boshlang'ich holat shu kalitdan TO'G'RIDAN-TO'G'RI o'qiladi:

```js
const [notifications, setNotifications] = useState(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { try { return JSON.parse(saved).filter(...); } catch {} }
  ...
});
```

`logout()` yetti xil kalitni tozalaydi, lekin bu ikkitasi ro'yxatda YO'Q.
Solishtirish uchun: `iqro_state_${uid}` va `sentObjectionIds_${uid}`
hisobga bog'langan va chiqishda o'chiriladi — bildirishnomalar esa emas.

**Oqibati:** A chiqib B kirganda, B **A ning shaxsiy bildirishnomalarini
ko'radi**:
- admin bir kishiga yuborgan xabarlar (`users/{uid}/notifications` — to'lov
  eslatmasi, e'tirozga javob, obuna holati);
- yutuq / marra / unvon yozuvlari (A ning o'zlashtirish darajasini oshkor qiladi).

`DELETED_KEY` ham o'tadi, ya'ni A yopgan bildirishnomalar B da ham yashirin
qoladi.

**Takrorlash:** A bilan kiring, qo'ng'iroqda bildirishnoma paydo bo'lsin →
chiqing → B bilan kiring → qo'ng'iroqni oching: A ning yozuvlari turadi.

**Tuzatish:** ikkala kalitni ham hisobga bog'lash (`iqro_state_${uid}`
naqshi) — bu har foydalanuvchining ro'yxatini o'z qurilmasida saqlab qoladi.
Eng kam o'zgarish esa — ularni `logout()` ga qo'shish; lekin u holda odam
o'z ro'yxatini har chiqishda yo'qotadi.

⚠️ Kursor (`zehin_notif_cursor_${uid}`) allaqachon bog'langan — unga tegmang.

---

### B-3 · PAST · Yana ikkita global kalit hisobga bog'lanmagan

**Qayerda:** [src/hooks/useDailyPlan.js:22](src/hooks/useDailyPlan.js#L22) (`zehin_daily_plan_v1`), [src/services/studyContract.js:26](src/services/studyContract.js#L26) (`zehin_study_contract_v1`)
**Holat:** TASDIQLANGAN (kod)

B-2 bilan bir xil sinf: kunlik reja va o'quv shartnomasi qurilmaga bog'langan,
hisobga emas, va chiqishda tozalanmaydi. Keyingi foydalanuvchi oldingisining
rejasi bilan boshlaydi (shartnoma Firestore'dan sinxronlanguncha).

Mazmuni maxfiy emas, shuning uchun xavflilik past — lekin B-2 tuzatilganda
bir yo'la yopilishi mantiqiy.

---

### B-4 · PAST · Rollback yetim Firestore hujjati qoldirishi mumkin

**Qayerda:** [src/context/AuthContext.jsx:701-726](src/context/AuthContext.jsx#L701)
**Holat:** TASDIQLANGAN (kod) / **TEKSHIRISH KERAK** (bazada bormi — so'rov kerak)

`60996aa` rollback'i to'g'ri ishlaydi: profil yozilmasa Auth hisobi
o'chiriladi va raqam bo'shaydi. Lekin `withTimeout` **yozuvni BEKOR
QILMAYDI**.

Kvota tugagan holat (loyihada tanish): `setDoc` promise'i osiladi → 20 s
timeout → `deleteUser` Auth hisobini o'chiradi → **navbatdagi `setDoc` kvota
tiklanganda baribir bajariladi** → `users/{uid}` hujjati o'chirilgan Auth
hisobi uchun paydo bo'ladi.

**Ro'yxatdan o'tishni BUZMAYDI:** `checkUserExists` Firestore'ni emas, Auth'ni
tekshiradi ([api/check-user.js:77](api/check-user.js#L77) —
`getUserByEmail`), ya'ni raqam bo'sh qoladi va `60996aa` tuzatgan nosozlik
qaytmaydi. Buni tekshirdim.

**Oqibati** — statistika va panel: yetim hujjat foydalanuvchilar sonini
shishiradi, admin ro'yxati va qidiruvida (`searchTokens` bor) hech qachon
kira olmaydigan «foydalanuvchi» bo'lib turadi.

**Tuzatish:** mijoz buni tozalay olmaydi — `users` o'chirish qoidasi
`isAdmin()` talab qiladi. Shuning uchun server tomonda: `cron-daily` allaqachon
`users` bo'ylab yuradi, o'sha yerda Auth'da yo'q hujjatlarni belgilash yoki
o'chirish mumkin.

---

## 3. Tekshirildi va SOG'LOM topildi

| Nima | Xulosa |
|---|---|
| `registrationInFlight` bayrog'i | Uchala chiqish yo'lida ham tozalanadi ([724](src/context/AuthContext.jsx#L724), [769](src/context/AuthContext.jsx#L769), [827](src/context/AuthContext.jsx#L827)) — koddagi da'vo TO'G'RI, osilib qolmaydi |
| `check-user` | Auth'ni tekshiradi (`getUserByEmail`), Firestore'ni emas — yetim hujjat ro'yxatdan o'tishni bloklamaydi |
| `pendingPromo` imtiyoz bermaydimi | `api/` da bu maydonga BIRORTA havola yo'q (grep bilan tasdiqlangan) — u faqat UI ishorasi, redemption serverda tranzaksiyada tekshiriladi. `97fe582` dagi da'vo to'g'ri |
| Ro'yxatning majburiy bo'lmagan qadamlari | `shortId`, referral, adminga xabar — har biri alohida `catch` bilan; yiqilsa ham foydalanuvchi ilovaga kiradi |
| Profil o'qilmasa | Rol/premium oxirgi keshdan tiklanadi va kesh USTIGA YOZILMAYDI — bir marta uzilgan internet premiumni o'chirmaydi |
| Adminga ro'yxat xabari | Matn SERVERDA Firestore ma'lumotidan yig'iladi; mijoz matn yubormaydi (audit 2026-08-05, 20-band) |
| Imtihon sessiyasi egaligi | QAT'IY: `!!s.uid && s.uid === uid`, kalitlar uid bilan; T-21 tuzatishi joyida |
| `useAdmin` keshdan soxta admin | `_firebaseUser` sharti keshdan tiklangan «admin» ni to'sadi |
| Yarim hisoblarni davolash | `onAuthStateChanged` zaxira profili `phone` ni emaildan tiklaydi + `searchTokens` yozadi — 35 ta yarim hisob endi qidiruvda topiladi |

---

## 4. QA checklisti

- [ ] **B-1:** ikki hisob bilan sinang (yuqoridagi 4 qadam). B da begona
      hamkor taklifi chiqsa — tasdiqlangan.
- [ ] **B-2:** A bilan kiring, bildirishnoma oling, chiqing, B bilan kiring —
      qo'ng'iroqda A ning yozuvlari turibdimi?
- [ ] **B-4:** Firestore'dagi `users` hujjatlari sonini Firebase Auth'dagi
      hisoblar soni bilan solishtiring. Farq bo'lsa — yetimlar bor.

## 5. TEKSHIRILMAGAN — va nima uchun

1. **`api/notify-admin?action=delete-user` tozalash qamrovi.** `12a67b8`
   «yetim yozuvlarni tozalash» deb aytadi, lekin qaysi kolleksiyalar
   qamralganini tekshirmadim — alohida qamrov.
2. **SMS yo'li** (`api/_sms.js`) — parol tiklash oqimi bu auditga kirmadi.
3. **TWA / Google Play seansi** — `isPlayBuild()` mantiqi va u yerdagi auth
   xususiyatlari tekshirilmadi.
4. **Emulyator yo'q** (Java o'rnatilmagan) — qoida xulosalari kod o'qish
   natijasi.

---

## Xulosa

Ro'yxatdan o'tish oqimi `60996aa` dan keyin puxta: rollback to'g'ri, bayroq
osilmaydi, majburiy bo'lmagan qadamlar kirishni to'smaydi. Kirish va admin
tekshiruvi ham joyida.

Zaif joy — **qurilmada qoladigan iz**. Loyiha bu tahdidni imtihon sessiyasi
uchun tan olgan va yopgan, lekin bildirishnomalar (B-2) va hamkor kuryeri
(B-1) o'sha qamrovga kirmagan. Ikkalasi ham kichik tuzatish: kalitni hisobga
bog'lash va `logout()` ro'yxatini to'ldirish.
