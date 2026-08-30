# CHQBT-600 — vaziyatli-murakkab savol banki

**Maqsad:** CHQBT fanining jonli bankini 2383 tadan **600 ta** yuqori sifatli,
vaziyatli (keys) savolga almashtirish. Sabab — o'quvchilardan e'tiroz oqimi va
bankning o'lchangan sifat nuqsonlari.

## 1. Diagnoz (2026-08-29, `scratch/bundle_chqbt_after.json` = jonli paket)

Jami **2383** ta savol. O'lchangan nuqsonlar:

| Nuqson | Soni | %  |
|---|---|---|
| cue-leak (javobni o'qimay topish mumkin) | 389 | 16.3 |
| o'zak < 120 belgi (jo'n savol) | 585 | 24.5 |
| vaziyat belgisi umuman yo'q | 355 | 14.9 |
| soxta vaziyat (uzun hikoya → javob quruq sana/son) | 179 | 7.5 |
| **mexanik darvozadan o'tdi** | **875** | **36.7** |

cue-leak tarkibi: to'g'ri variant ancha uzun (247), faqat to'g'ri variantda
qavs/tire izoh (106), izoh variant HARFiga ishora qiladi (99), distraktorlar
bir xil "Faqat ..." qolipida (61).

## 2. Blueprint — 600 = rasmiy imtihon 50 tasining ×12 nusxasi

Manba: `fan/spes/_txt/ЧҚБТ т.txt`, III bo'lim, 1- va 2-jadval.

| topicId | Bo'lim | Imtihon | 600 da | Ichki taqsimot |
|---|---|---|---|---|
| 0 | Harbiy xizmat asoslari | 8 | 96 | Konstitutsiya, Mudofaa doktrinasi, harbiy majburiyat qonunlari, QK tuzilishi |
| 1 | Umumharbiy nizomlar | 8 | 96 | Ichki xizmat 24 · Intizomiy 24 · Garnizon-qorovullik 24 · Saf 24 |
| 2 | Otish tayyorgarligi | 7 | 84 | "Qurol to'g'risida" qonuni 12 · jangovar vositalar + AK-74 72 |
| 3 | Taktik tayyorgarlik | 4 | 48 | umumqo'shin jangi 12 · harbiy topografiya 24 · jangovar guruh/TTT 12 |
| 4 | Fuqaro muhofazasi | 4 | 48 | FV va harakat tartibi 24 · OQQ (yadro/kimyo/bio) 24 |
| 5 | Tibbiy bilim asoslari | 4 | 48 | birinchi yordam 12 · jarohat/yuqumli/qon ketish/sinish 36 |
| 6 | Ped. mahorat + kasb standarti | 15 | 180 | kasb standarti 60 · umumiy pedagogika 84 · CHQBT metodikasi 36 |
| | **Jami** | **50** | **600** | |

### Kognitiv daraja — imtihondan QASDDAN qiyinroq
Rasmiy 3-jadval: Bilish 8 / Qo'llash 35 / Mulohaza 7 (50 tadan).
Bizda: **Bilish 60 (10%) · Qo'llash 390 (65%) · Mulohaza 150 (25%)**.
Mashq imtihondan qiyin bo'lsin — shunda imtihon oson tuyuladi.

## 3. Sifat standarti (har savol uchun MAJBURIY)

1. **Format faqat `single`.** Moslashtirish (Y2/matching), ketma-ketlik
   (Y3/sequence) va combo ISHLATILMAYDI — foydalanuvchi qarori.
2. **Haqiqiy vaziyat.** 2–4 gapli real holat (navbatchilik, qorovullik, saf,
   otish maydoni, marsh, FV o'chog'i, jarohat, dars/mashg'ulot), so'ng undan
   **QAROR** so'raladi.
3. **Javob quruq fakt bo'lishi TAQIQLANADI.** Javob varianti faqat sana, son,
   ism yoki atama bo'lsa — savol rad etiladi. Bu "soxta vaziyat" naqshini
   (uzun hikoya → "1992-yil 3-iyul") butunlay yo'q qiladi.
4. **Distraktorlar.** Har biri nomlangan TIPIK XATOga asoslanadi
   (`distractor_error` maydoni majburiy). Kulgili yoki aniq bema'ni variant yo'q.
5. **Cue-leak yo'q.** Eng uzun variant eng qisqasidan ≤1.5 baravar; qavs/tire/
   "chunki" faqat to'g'ri javobda emas; "barchasi/hech biri" yo'q.
6. **Izoh** — to'g'ri javobni MAZMUNAN asoslaydi va har bir chalg'ituvchi nega
   jozibador ekanini aytadi. Variant HARFI (A/B/C/D) yozilmaydi.
7. **`source_ref` majburiy** — nizom moddasi, qonun bandi yoki darslik sahifasi.
   E'tiroz tushganda javob shu maydondan yoziladi.
8. **Rasmga bog'liq emas** — kerakli hamma ma'lumot matnda.
9. Lotin imlo, krill aralashmaydi.

## 4. Ish oqimi

```
0) manba yig'ish        → nizom/qonun matnlari (pastda "ochiq muammo")
1) node pipeline/chqbt600/screen.mjs        # 2383 → mexanik darvoza → 875
2) node pipeline/chqbt600/dump.mjs --topic N  # nomzodlarni ko'rikka chiqarish
3) Claude bahosi (60 talik partiya)        → saqlanadigan ~250-350 ta
4) Claude yangi savol yozadi (20 talik)    → qolgan ~250-350 ta
5) darvozalar: schema + cueLeak + dedup + imlo + situational-gate
6) viewer HTML → foydalanuvchi tasdiqlaydi
7) chiqarish (pastdagi ketma-ketlik)
```

### Chiqarish ketma-ketligi (XAVFSIZ TARTIB)
```bash
node scripts/backup-firestore.mjs chqbt        # zaxira SHART
node pipeline/chqbt600/apply.mjs --dry-run
node pipeline/chqbt600/apply.mjs --apply       # eskisini o'chirish + 600 tasini yozish
node scripts/build-fs-bundle.mjs chqbt         # paketni QAYTA QURISH
node scripts/bump-questions-version.mjs        # mijoz keshini bekor qilish
```
⚠️ `build-fs-bundle.mjs` **`settings/questionMeta`** hujjatini YOZMAYDI (u faqat
`settings/version.questionMeta` ni yangilaydi). Dashboard esa aynan alohida
`settings/questionMeta` dan o'qiydi. Shuning uchun `apply.mjs` uni o'zi yozadi —
aks holda Dashboard 2383, test sahifasi 600 ko'rsatadi.

Narxi: ~2400 o'qish + ~2100 yozish. Spark kunlik: 50 000 / 20 000 — sig'adi,
lekin trafik past paytda bajarilsin.

## 5. Ochiq muammolar

1. **Nizom matnlari yo'q.** `scratch/chqbt_book.txt` da *Intizomiy nizom* — 0
   marta, *Ichki xizmat nizomi* — atigi 10 ta eslatma. To'liq matn faqat Saf
   nizomida (`scratch/hafta3/safnizomi.txt`, 172 KB). Ya'ni **topicId 1 ning 72
   tasiga manba yo'q**. Kerak: PF-23 (2025-yil 14-fevral) tahriridagi Ichki
   xizmat, Intizomiy, Garnizon va qorovullik nizomlari + "Qurol to'g'risida"gi
   O'RQ-550 qonuni (lex.uz).
2. **Progress yo'qolishi.** ~1800 savol o'chsa, o'sha savollarga bog'langan
   "xatolar daftari" va spaced-repetition yozuvlari yetim qoladi (progress savol
   MATNI hash'iga bog'langan — `engine/SmartQuestionEngine.js`). Lokal zaxira
   qoladi; ilova tomonda qanday ko'rinishini tekshirish kerak.

## 6. Keyingi bosqich — Tasviriy san'at

Xuddi shu mashina. Hozir 1239 ta → 600 ta.
Blueprint (topicId 7–14): 10/3/4/3/7/4/4/15 ×12 = 120/36/48/36/84/48/48/180.
Farqi: chizmachilikda rasm HAQIQATAN zarur, shuning uchun `requires_image`
qoidasi yumshatiladi — rasm mavjud aktivlar (`store_assets`, `public/images`)
bilan qoplanishi shart.

---

## 7. Bajarilgan ishlar

### 2026-08-29 — mashina qurildi, 5-blok pilot sifatida yakunlandi

**Skriptlar** (`pipeline/chqbt600/`):
- `screen.mjs` — mexanik darvoza. 2383 → **473 nomzod**. Darvozalar: cue-leak,
  o'zak <120 belgi, vaziyatsizlik, ta'rif niqobi, quruq son/sana javob,
  buzilgan izoh, rasmga ishora, krill harf.
- `dump.mjs` — nomzodlarni qo'lda ko'rikka chiqarish.
- `validate.mjs` — YANGI savollar uchun darvoza (tuzilma, majburiy
  metama'lumot, vaziyatlilik, psixometrika, izoh, imlo, dublikat).
- `viewer.mjs` — bo'lim ko'rigi uchun HTML.

**Mexanik saralash natijasi (473 nomzod):**

| topicId | Bo'lim | Bazada | Nomzod | Kerak | Yozish kerak |
|---|---|---|---|---|---|
| 0 | Harbiy xizmat asoslari | 448 | 38 | 96 | 58 |
| 1 | Umumharbiy nizomlar | 463 | 101 | 96 | 0 |
| 2 | Otish tayyorgarligi | 344 | 51 | 84 | 33 |
| 3 | Taktik tayyorgarlik | 180 | 48 | 48 | 0 |
| 4 | Fuqaro muhofazasi | 356 | 60 | 48 | 0 |
| 5 | Tibbiy bilim asoslari | 218 | 49 | 48 | 0 |
| 6 | Ped. mahorat + kasb standarti | 374 | 126 | 180 | 54 |

⚠️ Bu jadval MEXANIK darvoza natijasi. 5-blok tajribasi ko'rsatdi: qo'lda
ko'rikda nomzodlarning ~57% i ham yiqiladi. Ya'ni haqiqiy "yozish kerak"
raqami har blokda jadvaldagidan sezilarli yuqori bo'ladi.

**5-blok (Tibbiy bilim asoslari) — TAYYOR: 48/48**
- 49 nomzoddan **28 tasi** saqlandi, **21 tasi** chiqarildi.
- **20 ta yangi savol** yozildi, hammasi `validate.mjs` dan o'tdi.
- Fayllar: `verdicts/topic5.json`, `new/topic5.json`,
  `out/topic5_korish.html`.

**Qo'lda ko'rikda topilgan, mexanik darvoza ilg'amaydigan nuqson turlari**
(keyingi bloklarda ham shu ro'yxat bo'yicha qaraladi):
1. **Ikki to'g'ri javob** — mas. qon ketishining "ichki" va "yashirin" turlari
   bitta savolda variant sifatida turgan.
2. **Javob o'zakning ichida** — savolda "(gipovolemiya)" deb yozilib, javob
   "gipovolemik shok" bo'lgan.
3. **Fakt xatosi** — "is (karbonat angidrid) gazi": is gazi CO, karbonat
   angidrid emas.
4. **Normativ son javobi** — "2 daqiqa 10 sekund", "5 sm × 5 m" kabi yodlash.
5. **Takror mavzu** — bitta mavzuda 3-4 savol (ilon chaqishi, quyosh urishi).
6. **Moslashtirish formati** — foydalanuvchi qaroriga ko'ra ishlatilmaydi.

**Yangi savol yozishda o'zimizda topilgan tizimli nuqson:** to'g'ri javob
deyarli har safar eng uzun variant bo'lib chiqdi (20 tadan 11 tasida).
`validate.mjs` buni "uzunlik ishorasi" qoidasi bilan ushlaydi: to'g'ri javob
eng uzun bo'lib, distraktorlar medianasidan 1.35 barobardan oshsa — rad.

### 2026-08-29 (davomi) — imlo darvozasi va 4-blok

**Imlo.** Foydalanuvchi 5-blokda imlo xatolarini ko'rsatdi. Tekshiruvda
saqlanadigan 28 ta savolning **23 tasida** terish xatosi topildi ("Tersi
orqali", "qatiqan", "Marsot", "Ertalbod", "ko'kariq", "plevara", "kompres",
"kuyushgi", "punktomga", "xavfsaz"...). Ular `fixes/topic5.json` da tuzatildi.
Topilgan xatolar `pipeline/chqbt600/imlo.mjs` lug'atiga kiritildi va endi
`screen.mjs` har bir nomzodni shu bo'yicha ham tekshiradi (butun bazada yana
20 ta savol shu sababli rad etildi).

⚠️ QOIDA: bazadan saqlanadigan HAR BIR savol qo'lda o'qib chiqiladi. Mexanik
darvoza imloni faqat ma'lum xatolar ro'yxati bo'yicha ushlaydi.

**Nizom matnlari topildi** — `fan/PF-23_Harbiy_Nizomlar/` (Ichki xizmat,
Intizom, Garnizon va qorovullik + Prezident farmoni). Matn
`scratch/nizomlar/*.txt` ga ajratildi. DIQQAT: bular to'liq nizom emas,
konspekt (jami ~28 000 belgi, moddalar tuzilishi saqlangan). 1-blok uchun 96 ta
savolni faqat shu matndan chiqarib bo'lmaydi — tushuncha va tartib-qoidalarga
tayangan vaziyatli savollar yoziladi, aniq modda raqami va sonli me'yorlar esa
matnda bo'lsagina ishlatiladi.

**4-blok (Fuqaro muhofazasi) — TAYYOR: 48/48**
- 39 nomzoddan **14 tasi** saqlandi, 25 tasi chiqarildi.
- **34 ta yangi savol** yozildi. Foydalanuvchi talabiga ko'ra qiyinlik
  oshirildi: Y3 (mulohaza) ulushi 24/34 = **71%** (5-blokda 45% edi).
- Yangi savollarda ishlatilgan murakkablik shakllari: qarama-qarshi fizik
  xossani qo'llash (xlor og'ir → yuqoriga, ammiak yengil → pastga),
  yashirin davrli zaharlanishlarni farqlash (fosgen, iprit), harakatlar
  ketma-ketligidagi xatoni topish, himoya qatlamlarini taqqoslash.
- Fayllar: `verdicts/topic4.json`, `fixes/topic4.json`, `new/topic4.json`,
  `out/topic4_korish.html`.

**Holat: 96 / 600.** Qolgan bloklar: 0 (96), 1 (96), 2 (84), 3 (48), 6 (180).

### 2026-08-29 (davomi) — 3-blok

**3-blok (Taktik tayyorgarlik) — TAYYOR: 48/48** (13 saqlandi + 35 yangi).

⚠️ MUHIM TOPILMA: bu blokda bazadagi savollarning **42% i boshqa bo'limga
tegishli** — 48 nomzoddan 11 tasi SAF NIZOMI mashqlari («Bajar-IKKI»,
«Qadam – BOS!», burilishda qo'l holati, qadam balandligi 15-20 sm), 4 tasi
sof TARIX savoli (Panipat jangi, Amir Temur merosining bo'linishi, o'rta asr
qurollari), 5 tasi esa OTISH TAYYORGARLIGI (PKM/SVD masofalari, PM kalibri).
Ya'ni `topicId` noto'g'ri qo'yilgan. Boshqa bloklarda ham shu xatoni
qidirish kerak.

Yangi 35 ta savolning 18 tasi HARBIY TOPOGRAFIYAga bag'ishlandi (blueprintда
shu qism eng katta — 24 ta) va hisob talab qiladi: teskari azimut, qadamlab
masofa o'lchash (juft qadam × 1,5 m), ovoz kechikishi bo'yicha masofa
(330 m/s), xarita masshtabi (1:50 000 → 1 sm = 500 m), «ming» formulasi
(D = H×1000/U), gorizontallar zichligi, qayta kesishuv usuli.

**Holat: 144 / 600.** Qolgan bloklar: 0 (96), 1 (96), 2 (84), 6 (180).

### 2026-08-29 (davomi) — 0-blok

**0-blok (Harbiy xizmat asoslari) — TAYYOR: 96/96** (15 saqlandi + 81 yangi).

Bu blokda baza eng zaif chiqdi: 38 nomzoddan atigi 15 tasi o'tdi. Rad
sabablarining yarmi — QURUQ SON javob (18-27 yosh; 12 oy; qonun nechta
bo'limdan iborat; doktrina 4 bo'lim 40 modda; 15-16 yosh tibbiy ko'rik) va
TUZILMA YODLASH (qonunning 6-, 7-, 2-bo'limi nomi). Bittasida izoh savolning
o'ziga zid edi (havo-desant qo'shinlari haqida), bittasida esa uzun hikoya
oxirida javob quruq sana bo'lib chiqdi.

81 ta yangi savol uch yo'nalishda yozildi:
· Konstitutsiya va fuqarolik burchlari — 24 ta (huquq/burch farqi, so'z
  erkinligi chegarasi, aybsizlik prezumpsiyasi, tenglik, qiynoq taqiqi);
· Mudofaa doktrinasi — 17 ta (mudofaa xarakteri, chet el bazalari, yadrosiz
  hudud, bloklarga qo'shilmaslik, mudofaa yetarliligi, oshkoralik);
· Qonunchilik va Qurolli Kuchlar tuzilmasi — 40 ta (chaqiruv, kechiktirish,
  muqobil xizmat, harbiy hisob, safarbarlik, yakkaboshchilik, boshliq va
  katta farqi, jangovar bayroq).

⚠️ MUHIM: Konstitutsiya savollarida MODDA RAQAMI ataylab ishlatilmadi —
2023-yil tahriridagi to'liq matn bizda yo'q. Savollar normaning MAZMUNIga
tayanadi, shuning uchun raqam o'zgarsa ham eskirmaydi.

**Yangi vosita:** `validate.mjs` va `viewer.mjs` endi bitta blokning bir necha
faylini o'qiydi (`topic0.json` + `topic0_b.json`) — katta bloklarni bo'lib
yozish uchun. Shuningdek to'g'ri javob pozitsiyasini A/B/C/D bo'ylab teng
tarqatuvchi aylantirish skripti ishlatildi (darvoza qoidalari indeksga bog'liq
emas, shuning uchun aylantirish xavfsiz).

**Holat: 240 / 600.** Qolgan bloklar: 1 (96), 2 (84), 6 (180).

### 2026-08-29 (davomi) — 1-blok

**1-blok (Umumharbiy nizomlar) — TAYYOR: 96/96** (39 saqlandi + 57 yangi).

Manba: `fan/PF-23_Harbiy_Nizomlar/` (foydalanuvchi topib berdi) →
`scratch/nizomlar/*.txt`. Konspekt bo'lsa ham, unda aniq normalar bor:
gauptvaxta 10 sutkagacha, jazo aniqlangandan 10 sutkada, murojaat 15 kun/1 oy,
xizmat kartochkasiga 7 kunda, rag'bat ta'tili 10 sutkagacha, patrul tarkibi
boshliq + 2-3 patrulchi, soqchining qurol qo'llash ketma-ketligi.

⚠️ MUVOZANAT MUAMMOSI: bazada saf nizomi bo'yicha 44 ta yaroqli savol bor edi,
blueprintda esa unga atigi 24 o'rin (Ichki xizmat 24 · Intizom 24 ·
Garnizon-qorovullik 24 · Saf 24). Garnizon-qorovullik bo'yicha esa bazada
BOR-YO'G'I 3 ta yaroqli savol chiqdi. Shuning uchun saf kvotasidan ortiqchasi
chiqarilib, o'rniga PF-23 matnidan 21 ta garnizon-qorovullik, 19 ta intizom va
15 ta ichki xizmat savoli yozildi.

Chiqarilganlar orasida ikkita TAKRORLANGAN FAKT XATOSI topildi: ikki savolda
komanda «uch qismdan iborat» deyilgan (nizomda ikki qism), ikki savolda esa
«Hurmat kitobi» PF-23 rag'batlantirish ro'yxatida yo'q bo'lsa-da, javob
sifatida berilgan.

**Holat: 336 / 600.** Qolgan bloklar: 2 (84), 6 (180).

### 2026-08-29 (davomi) — 2-blok

**2-blok (Otish tayyorgarligi) — TAYYOR: 84/84** (27 saqlandi + 57 yangi).

⚠️ BO'SHLIQ: blueprint «Qurol to'g'risida»gi qonunga 12 ta savol ajratadi —
bazada bu mavzu bo'yicha BITTA HAM yaroqli savol topilmadi. Hammasi yangidan
yozildi: ro'yxatdan o'tkazish, saqlash talablari, qurolni boshqaga berish
taqiqi, mast holatda qo'llash, zaruriy mudofaa chegarasi, yo'qolganda xabar
berish, tasnif, pnevmatik qurol, tashish, ruxsatnoma, konstruksiyani
o'zgartirish taqiqi, muddat tugashi.

Rad sabablari orasida yana BO'LIM XATOSI: Milliy gvardiya (0-blok), gazniqob
komplekti (4-blok), mudofaa tamoyili va kadrlar rezervi (3- va 0-blok)
savollari otish tayyorgarligi ostida turgan edi.

Yangi savollarning taqsimoti: qurol qonuni 12 · otish maydonchasi xavfsizligi
8 · granatalar 10 · AK-74 tuzilishi va ishlashi 15 · ballistika 12.
Ballistikada hisob-kitob emas, MULOHAZA sinaladi: traektoriyaning nosimmetrik
shakli, nishonga olish chizig'ini ikki marta kesib o'tishi, harorat va
shamolning ta'siri, to'g'ri otish masofasi tushunchasi.

**Holat: 420 / 600.** Qolgan blok: 6 (Ped. mahorat + kasb standarti, 180).

### 2026-08-29 (davomi) — 6-blok va YAKUN

**6-blok (Pedagogik mahorat + kasb standarti) — TAYYOR: 180/180**
(72 saqlandi + 108 yangi).

⚠️ TAKROR MUAMMOSI: 126 nomzod to'g'ri javob mazmuni bo'yicha klasterlanganda
atigi 86 ta KONSTRUKT chiqdi. Eng katta klasterda 12 ta, ikkinchisida 11 ta
mazmunan bir xil savol bor edi («Xavfsiz rivojlantiruvchi ta'lim muhitini
yaratish» va «O'quv dasturini moslashtirish»). Har konstruktdan 1-3 ta vakil
saqlanib, qolgani chiqarildi. Ikkita savol MOSLASHTIRISH formatida edi.

108 ta yangi savol: kasb standarti 30 (7 ta mehnat vazifasi bo'yicha) ·
umumiy pedagogika 51 (didaktika tamoyillari, metodlar, baholash turlari,
ta'lim texnologiyalari, tarbiya, yosh psixologiyasi, etika, nizolar) ·
CHQBT o'qitish metodikasi 27.

**DARVOZA KALIBRLASHI:** «uzunlik ishorasi» qoidasiga MUTLAQ chegara qo'shildi
(farq ≥ 20 belgi). Sabab: «Ilmiylik tamoyili» (17) va «Ko'rgazmalilik
tamoyili» (23) o'rtasidagi nisbat 1.35 dan katta bo'lsa-da, bu o'quvchi uchun
ishora emas — atamalarning tabiiy uzunlik farqi. O'zgarish barcha bloklarda
qayta tekshirildi: 0-5 bloklar avvalgidek 100% o'tadi.

---

## YAKUNIY HOLAT: 600 / 600 ✅

| topicId | Bo'lim | Nomzod | Saqlandi | Yangi | Jami |
|---|---|---|---|---|---|
| 0 | Harbiy xizmat asoslari | 38 | 15 | 81 | 96 |
| 1 | Umumharbiy nizomlar | 101 | 39 | 57 | 96 |
| 2 | Otish tayyorgarligi | 51 | 27 | 57 | 84 |
| 3 | Taktik tayyorgarlik | 48 | 13 | 35 | 48 |
| 4 | Fuqaro muhofazasi | 39 | 14 | 34 | 48 |
| 5 | Tibbiy bilim asoslari | 49 | 28 | 20 | 48 |
| 6 | Ped. mahorat + kasb standarti | 126 | 72 | 108 | 180 |
| | **JAMI** | **452** | **208** | **392** | **600** |

Ya'ni bazadagi 2383 savoldan 208 tasi (8,7%) saqlandi, 392 tasi yangidan
yozildi. Barcha 392 ta yangi savol `validate.mjs` darvozasidan o'tdi.

**KO'RIK SAHIFALARI:**
- 0-blok: https://claude.ai/code/artifact/353c1cb5-8d1c-4d0c-bc43-4ce04ab06ed8
- 1-blok: https://claude.ai/code/artifact/c0505f0e-0ad9-4c79-810f-57adc5df3e05
- 2-blok: https://claude.ai/code/artifact/a157fbb2-58c5-42f6-a044-f997bef5823a
- 3-blok: https://claude.ai/code/artifact/515cd468-4d4f-4bc1-abe4-2b9ee131f666
- 4-blok: https://claude.ai/code/artifact/c1b6abfb-9cde-4c86-9746-1fb9dff669b2
- 5-blok: https://claude.ai/code/artifact/9fe48c63-133a-4e74-829a-25e19cd186ce
- 6-blok: https://claude.ai/code/artifact/4b86b2c0-9cf8-4c0d-b092-20e6fa2854f2

## KEYINGI QADAM — CHIQARISH

Hali BAJARILMAGAN. `apply.mjs` yozilishi kerak (5-bo'limdagi ketma-ketlik):
zaxira → eski savollarni o'chirish → 600 tasini yozish (saqlanganlarga
`fixes/*.json` dagi tuzatilgan matn qo'llaniladi) → `build-fs-bundle.mjs` →
`bump-questions-version.mjs` → `settings/questionMeta` ni ALOHIDA yozish.

---

# YO'NALISH TUZATILDI — 2026-08-30

Loyiha boshida topshiriq **«2383 → 600 ga qisqartirish»** deb tushunilgan edi.
Foydalanuvchi buni rad etdi:

> «ammaldagi bor savollar sonini 600 qo'shib 3000 tadan oshiramiz»

**Yangi maqsad: bazadan hech narsa o'chirilmaydi, ustiga ~620 ta yangi
vaziyatli savol QO'SHILADI.** Jonli 2383 savol joyida qoladi.

Chiqarish hali bajarilmagan, shuning uchun yo'nalishni o'zgartirish hech
narsani yo'qotmadi: yozilgan savollar baribir yangi savollar.

## Nima o'zgardi

| | Eski tushunish | Yangi maqsad |
|---|---|---|
| Bazadagi 2383 savol | 2175 tasi o'chiriladi | tegilmaydi |
| Saqlanadigan 208 savol | «yangi 600» ichida sanaladi | allaqachon bazada, yangi emas |
| Yangi yozilishi kerak | 392 | 625 |
| Yakuniy son | 600 | **3008** |

`fixes/*.json` (208 savolning imlo va faktik tuzatishlari) endi **alohida,
ixtiyoriy bosqich**: savol soni o'zgarmaydi, faqat matn yangilanadi.
Qo'shish bosqichi bilan aralashtirilmasin.

## Yakuniy holat — 625 ta yangi savol, hammasi darvozadan o'tdi

| topicId | Bo'lim | Yangi savol | Fayllar |
|---|---|---|---|
| 0 | Harbiy xizmat asoslari | 99 | topic0, _b, _c |
| 1 | Umumharbiy nizomlar | 100 | topic1, _b, _c |
| 2 | Otish tayyorgarligi | 88 | topic2, _b, _c |
| 3 | Taktik tayyorgarlik | 50 | topic3, _b |
| 4 | Fuqaro muhofazasi | 50 | topic4, _b |
| 5 | Tibbiy bilim asoslari | 50 | topic5, _b |
| 6 | Ped. mahorat + kasb standarti | 188 | topic6, _b … _g |
| | **JAMI** | **625** | |

- Kognitiv daraja: Y2 292 · Y3 333 (53% mulohaza)
- To'g'ri javob o'rni: A158 · B158 · C156 · D153
- **2383 + 625 = 3008**

## Ikkinchi bosqichda to'ldirilgan bo'shliqlar

Birinchi 392 savolda qolgan teshiklar aynan shu bosqichda yopildi:

- **Saf nizomi** (topic 1) — jonli bazada ham, birinchi bloklarda ham deyarli
  yo'q edi. 28 savol: interval/distansiya, qanot, to'liq bo'lmagan qator,
  qadam me'yorlari (110-120 qadam, 70-80 sm), burilishlar, salom berish
  masofalari, safdan chiqish va qaytish. Manba: `scratch/hafta3/safnizomi.txt`.
- **Xalqaro gumanitar huquq** (topic 0) — butunlay yo'q edi. Harbiy asirlar,
  ajratish tamoyili, himoya belgilari, xiyonat va harbiy hiyla farqi.
- **Xarita o'qish va muhandislik jihozlanishi** (topic 3) — ranglar, shartli
  belgilar turlari, gorizontallar, magnit og'ish, okop, niqoblash.
- **Yakka himoya vositalari** (topic 4) — gazniqob o'lchami, respirator/gazniqob
  farqi, dozimetrik va kimyoviy razvedka asboblari, karantin/observatsiya.
- **Reanimatsiya va zaharlanishlar** (topic 5) — 5-6 sm / 100-120, 30:2 nisbat,
  kalla asosi sinishi, pnevmotoraks, is gazi (CO ≠ CO₂), xlor/ammiak zichligi.
- **Kasb standarti va didaktika** (topic 6) — 78 savol: DTS, kompetensiyaviy
  yondashuv, manfaatlar to'qnashuvi, formativ baholash, rubrika, yaqin
  rivojlanish zonasi, teskari dars, mediasavodxonlik.

## Yo'l-yo'riqda topilgan xatolar va ularning tuzatilishi

1. **«Faqat …» qolipi.** Distraktorlarni bir xil «Faqat …» qolipida yozish
   to'g'ri javobni naqshdan ajratib qo'yadi. 14 ta savolda uchradi, hammasi
   qayta yozildi.
2. **Uzunlik ishorasi.** Yana takrorlandi — 12 ta savolda to'g'ri javob eng
   uzun bo'lib qoldi. Variantlar qayta muvozanatlandi.
3. **Javob o'rnining qiyshiqligi.** Yangi savollar yozishda qulaylik uchun
   javob har doim 0-indeksda yoziladi. Buni tuzatish uchun
   `pipeline/chqbt600/balance.mjs` yozildi: fan bo'yicha mavjud taqsimotni
   o'qib, har bir savolni eng kam to'lgan o'ringa aylantiradi.
4. **Indeks bo'yicha tuzatishda adashish (jiddiy).** `topic6_f.json` da qo'lda
   indeks hisoblashda bir birlik xato qilindi va uchta savolning variantlari
   **qo'shni savolga** yozilib, ular buzildi. Boshqa darvozalarning hech biri
   buni ushlamadi. Ikkita chora ko'rildi:
   - `validate.mjs` ga **variant to'plami takrori** tekshiruvi qo'shildi —
     ikki savolda variantlar to'plami aynan bir xil bo'lsa, rad etiladi.
     Bu xato turini nol soxta signal bilan ushlaydi.
   - Bundan keyingi barcha tuzatish skriptlari o'zakning boshini tekshirib,
     mos kelmasa to'xtaydi.
5. **Kirill harflar** — lotin matn ichiga tasodifan tushdi (`o'qlanган`,
   `чекланган`). `hasCyrillic` darvozasi ikkalasini ham ushladi.

Rad etilgan bog'liqlik tekshiruvi: «to'g'ri javob so'zlari izohda uchraydimi»
degan avtomatik nazorat sinab ko'rildi — 615 savoldan 39 tasini belgiladi,
deyarli barchasi soxta signal (izohda boshqacha ifodalash normal holat).
Darvoza qilinmadi.

## Keyingi qadam

Chiqarish uchun `apply.mjs` yozilishi kerak. Endi u **faqat qo'shadi**:

1. `scripts/backup-firestore.mjs chqbt` — zaxira
2. 625 ta yangi savolni `questions` kolleksiyasiga yozish (o'chirish YO'Q)
3. Yozilgandan keyin son tekshiriladi: 3008 chiqmasa, to'xtaydi
4. `scripts/build-fs-bundle.mjs chqbt`
5. `scripts/bump-questions-version.mjs`
6. `settings/questionMeta` ni ALOHIDA yozish — `build-fs-bundle.mjs` uni
   yozmaydi, aks holda Dashboard 2383 ni, test sahifasi 3008 ni ko'rsatadi

Yozuv narxi ~625 ta yozuv — Spark kunlik 20 000 chegarasiga bemalol sig'adi.
Progress muammosi ham yo'q: hech narsa o'chirilmagani uchun «xatolar daftari»
va takrorlash yozuvlari yetim qolmaydi.
