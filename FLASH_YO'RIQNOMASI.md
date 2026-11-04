# 🔒 GEMINI FLASH UCHUN QAT'IY ISHLASH YO'RIQNOMASI

> **ESLATMA:** Platformada ishlashning umumiy va qat'iy qoidalari loyiha ildizidagi [GEMINI.md](file:///c:/Users/User/Desktop/Zehin%20PLATFORMA/GEMINI.md) faylida keltirilgan. Har doim Firestore kvotasini tejash va foydalanuvchilarga shaxsiy in-app bildirishnoma yuborish talab qilinadi.

---

## 1-BO'LIM. FOYDALANUVCHILAR E'TIROZLARINI KO'RIB CHIQISH (Asosiy Tartib)

Foydalanuvchilardan kelgan e'tirozlarni ko'rib chiqishda **FAQAT** quyidagi 3 bosqichli tejamkor mexanizmdan foydalaning:

### 1-Qadam: Ochiq e'tirozlarni ko'rish
```bash
node scripts/resolve-objections.mjs list
```
* Bu buyruq Firestore'dan FAQAT `solved == false` e'tirozlarni o'qiydi (butun bazani EMAS — atigi 1 ta read).
* Lokal JSON fayllar ichidan ehtimoliy klon/dublikat savollarni avtomatik topadi.
* Natijani `scratch/open_objections_report.json` fayliga saqlaydi va konsolda ko'rsatadi.

### 2-Qadam: Qarorlar patch faylini tayyorlash (`scratch/resolutions.json`)
Har bir e'tiroz uchun bitta ob'ekt yozing:
```json
[
  {
    "questionId": "savol_id_si",
    "category": "chqbt",
    "status": "fixed", // yoki "rejected" (agar savol 100% to'g'ri bo'lsa)
    "q": "Yangilangan savol matni...",
    "opts": ["Variant A", "Variant B", "Variant C", "Variant D"],
    "correct": 0,
    "explanation": "Darslik yoki qonunga asoslangan ilmiy izoh...",
    "mnemonic": "Yodda saqlash kaliti...",
    "clones": [
      {
        "questionId": "klon_savol_id_si",
        "q": "Klon savol matni...",
        "opts": ["Variant A", "Variant B", "Variant C", "Variant D"],
        "correct": 0,
        "explanation": "..."
      }
    ],
    "adminNote": "Admin uchun qisqa izoh",
    "userNotification": "Foydalanuvchi uchun kamida 50 belgidan iborat samimiy, batafsil va tushunarli xabar..."
  }
]
```

### 3-Qadam: Bir urinishda qo'llash va yuborish
```bash
node scripts/resolve-objections.mjs apply scratch/resolutions.json
```
* Ushbu buyruq:
  1. Lokal `questions_<fan>.json` faylini saqlaydi.
  2. Firestore `questions/{id}` hujjatini yangilaydi.
  3. Foydalanuvchining `userStats.spacedCards` keshida shu savol bo'lsa, yangilaydi.
  4. `questionBundles` ga ixcham, ortiqcha maydonlarsiz delta-bo'laklarni yozadi.
  5. `settings/version.dbVersion` ni 1 marta yangilaydi.
  6. E'tirozlarni yopadi (`solved: true`) va foydalanuvchiga `users/{uid}/notifications` orqali to'liq tushuntirish yuboradi.

---

## 2-BO'LIM. DISTRAKTORLARNI QAYTA BALANSLASH (Safe Rebalance)

Agar savol xatolarini emas, distraktorlarning uzunligi va chalg'itish sifatini yaxshilash topshirig'i berilsa:

```bash
# 1. Paketni eksport qilish:
node scripts/safe-rebalance.mjs export-batch <fan> 30 0

# 2. scratch/patch_<fan>_0_30.json fayliga yangi variantlarni yozish:
# [ { "id": "...", "new_distractors": ["...", "...", "..."] } ]

# 3. 5-Qulfli darvoza orqali import qilish:
node scripts/safe-rebalance.mjs import-batch <fan> scratch/patch_<fan>_0_30.json --apply
```
