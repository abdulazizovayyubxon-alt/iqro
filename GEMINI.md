# Zehin Platformasi — Agent Qoidalari va Xotirasi (Gemini Flash uchun)

Ushbu qoidalar Zehin platformasida har qanday vazifa, ayniqsa **foydalanuvchilar e'tirozlarini ko'rib chiqish** va **savollarni tahrirlash**da QAT'IY va MAJBURIYDIR.

---

## 1. KVOTANI KESKIN TEJASH QOIDASI (Firestore Quota Discipline)
- **Umumiy bazani qayta ko'rib chiqish yoki tozalash QAT'IYAN TAQIQLANADI!** Butun bazani (`questions` yoki `objections` kolleksiyasini) qayta o'qish yoki barcha savollarni birma-bir tekshirib chiqish taqiqlanadi.
- **Faqat ochiq e'tirozlar bilan ishlash:** Firestore'dan faqat `where('solved', '==', false)` filtri bilan so'rov o'tkaziladi.
- **Savollarni Firestore'dan EMAS, lokal fayllardan o'qish (0 Firestore read):** Savol matni, variantlari va kontekstini qidirishda faqat `src/data/questions_<fan>.json` lokal faylidan foydalaning.
- **Delta-only Bundle Sync (Faqat o'zgargan bo'laklarni yozish):** `questionBundles` ga yozishda faqat o'zgargan chunk (`dirtyChunk`) yoziladi. Savollar ixcham schema (`id, q, opts, correct, topicId, category, difficulty, level, explanation, mnemonic, image, qHash`) ga keltiriladi, ortiqcha dublikat maydonlar (`question`, `options`, `correctAnswer`) tashlanadi.
- **dbVersion bitta sessiyada FAQAT 1 MARTA yangilanadi:** Har bir savol uchun alohida emas, butun paketning eng oxirida `settings/version.dbVersion` 1 marta yangilanadi.

---

## 2. BIR XIL XATO VA QAYTA-QAYTA CHIQISHNING OLDINI OLISH (Dublikat/Klon tekshiruvi)
- Foydalanuvchi bitta savoldagi xatoni yozganida, lokal `src/data/questions_<fan>.json` ichida aynan shu atama, jumla yoki mavzu bo'yicha boshqa nusxalar (klonlar) bor-yo'qligi darhol tekshiriladi (`node scripts/resolve-objections.mjs list` bu klonlarni avtomatik ko'rsatadi).
- Asosiy savol bilan birgalikda uning barcha klonlari ham BIR URINISHDA tuzatiladi. Aks holda foydalanuvchi keyingi test blokida xuddi shu savolning 2-nusxasini ko'rib, yana e'tiroz bildiradi.
- `TestPage.jsx` va `SmartReviewPage.jsx` mijoz keshlarida `dbVersion` tekshiruvi doimiy faol: foydalanuvchi yangi versiyani darhol qabul qiladi va keshdagi eski savol matni yangilanadi.

---

## 3. FOYDALANUVCHILARGA TO'LIQ BILDIRISHNOMA YUBORISH (`users/{uid}/notifications`)
- Har bir e'tiroz bildirgan foydalanuvchiga shaxsiy in-app bildirishnoma borishi SHART.
- **Savol tuzatilgan bo'lsa (`status: 'fixed'`):**
  - Foydalanuvchiga xushmuomalalik bilan minnatdorchilik bildiriladi.
  - Aynan qaysi savolda nima o'zgartirilgani (eski xato jumla va yangi to'g'ri atama, masalan: «osqichda» -> «tasmaga», «dorichka» -> «dori qutisi») aniq yoziladi.
- **E'tiroz rad etilgan bo'lsa (`status: 'rejected'`):**
  - Shunchaki "savol to'g'ri" deb yopib ketish TAQIQLANADI!
  - Foydalanuvchiga qaysi darslik, nizom moddasi yoki qonun qoidasiga asosan savol to'g'ri ekani va nima uchun o'zgartirilmagani ilmiy asos bilan tushuntiriladi.
- Bitta foydalanuvchi bitta savolga bir necha marta e'tiroz yozgan bo'lsa (masalan, test paytida 2 marta bosgan), unga ortiqcha takrorlanishsiz bitta to'liq bildirishnoma yuboriladi va barcha nusxalari yopiladi.

---

## 4. STANDART VOSITA: `scripts/resolve-objections.mjs`
Kelgusida e'tirozlarni ko'rib chiqish uchun faqat shu vositadan foydalaning:
1. `node scripts/resolve-objections.mjs list` — ochiq e'tirozlarni va lokal klonlarni chiqaradi (`scratch/open_objections_report.json` ga saqlaydi).
2. `scratch/resolutions.json` patch faylini tayyorlang:
   ```json
   [
     {
       "questionId": "savol_id",
       "category": "chqbt",
       "status": "fixed",
       "q": "Savol matni...",
       "opts": ["Variant A", "Variant B", "Variant C", "Variant D"],
       "correct": 0,
       "explanation": "Ilmiy izoh...",
       "mnemonic": "Yodda saqlash kaliti...",
       "clones": [
         {
           "questionId": "klon_savol_id",
           "q": "Klon savol matni...",
           "opts": ["Variant A", "Variant B", "Variant C", "Variant D"],
           "correct": 0,
           "explanation": "..."
         }
       ],
       "adminNote": "Admin uchun qisqa qayd...",
       "userNotification": "Foydalanuvchi uchun kamida 50 belgidan iborat batafsil va tushunarli xabar..."
     }
   ]
   ```
3. `node scripts/resolve-objections.mjs apply scratch/resolutions.json` — lokal JSON, Firestore `questions/{id}`, foydalanuvchi keshidagi `spacedCards`, Firestore `questionBundles`, `settings/version.dbVersion` ni va bildirishnomalarni avtomatik, tejamkor ravishda bir marta sinxronlaydi.
