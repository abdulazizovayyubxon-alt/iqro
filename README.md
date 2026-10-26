# Zehin — Malaka toifa testlari (attestatsiya platformasi)

Zehin (`zehin.org`) — maktab va maktabgacha ta'lim (MTT) o'qituvchilarini malaka toifa (attestatsiya) imtihonlariga tayyorlaydigan adaptiv EdTech web va PWA platformasi (**23 ta fan**, **75 000+ toifa savollari**).

## 📚 Fanlar qamrovi (23 ta fan)
- **Maktab fanlari (17 ta):** Boshlang'ich ta'lim, Matematika, Ona tili va adabiyot, Tarix, Ingliz tili, Biologiya, Kimyo, Fizika, Geografiya, Informatika va AT, Rus tili (milliy va rus maktablar uchun), Nemis tili, Fransuz tili, Davlat va huquq asoslari, Texnologiya (servis), Tasviriy san'at va chizmachilik, CHQBT.
- **MTT yo'nalishlari (5 ta):** Tarbiyachi-metodist, MTT psixologi, Musiqa rahbari, Defektolog (logoped), Jismoniy tarbiya yo'riqchisi.
- **Umumiy fan (1 ta):** Pedagogik mahorat va Kasb standarti (barcha fan o'qituvchilari va MTT xodimlari uchun 10 savollik majburiy blok).

## 🚀 Asosiy imkoniyatlar
- **Turli o'quv rejimlari:**
  - 📖 **Takrorlash (Practice):** Savollarni batafsil izohlari va mnemonik kalit so'zlari bilan o'rganish.
  - ⚡ **Flashcards:** Bilimlarni tezkor kartochkalar orqali mustahkamlash.
  - 🏆 **Imtihon (50 savollik simulyatsiya):** Real attestatsiya formatida (40 ta mutaxassislik + 10 ta Pedagogik mahorat/Kasb standarti) vaqt bilan chegaralangan imtihon.
  - 🧠 **Aqlli takrorlash (Spaced Repetition):** Ebbinghaus unutish egri chizig'i (`1 → 3 → 7 → 14 → 30 kun`) asosida xato qilingan savollarni avtomatik rejalashtirish.
- **Adaptiv diagnostika va prognoz (`DiagnosticsEngine`):**
  - **Bayesian (Beta-prior) baholash:** Kam savol ishlangan mavzularda tasodifiy 100% yoki 0% og'ishlarni tekislab, haqiqiy o'zlashtirish darajasini hisoblash.
  - **Haftalik diagnostika va kunlik reja:** Zaif mavzular ustuvorligida shaxsiy o'quv rejasi.
- **Offline-first arxitektura:** Savollar bazasi IndexedDB (`localforage`) va Service Worker orqali keshlanadi (`v22`), o'quv jarayoni past internetda ham uzluksiz ishlaydi, natijalar esa tejamkor debounced tartibda Firestore bilan sinxronlanadi.
- **B2B Maktab va Hamkor ustoz portallari:**
  - 🏫 **Maktab portali (`/maktab`):** Maktab ma'muriyati uchun o'qituvchilar faolligi va tayyorgarlik ko'rsatkichlari monitoringi.
  - 🤝 **Hamkor ustoz portali (`/hamkor`):** O'quv guruhlari, promokodlar va haftalik diagnostika to'plamlarini boshqarish.
- **Telegram WebApp & Bot integratsiyasi:** Bir tugmada parolsiz kirish, kunlik eslatmalar, savol e'tirozlari va Click to'lov tizimi.

## 🛠 Texnologiyalar
- **Frontend:** React 18 + Vite 5, React Router v6, Framer Motion, Lucide React, KaTeX (matematik formulalar), Canvas Confetti
- **Ma'lumotlar bazasi va Auth:** Firebase Auth + Cloud Firestore + Firebase Cloud Messaging (Web Push)
- **Offline saqlash:** IndexedDB (`localforage`) + PWA (`vite-plugin-pwa` / Workbox)
- **Backend:** Vercel Serverless Functions (`api/`, 12 ta endpoint — Firebase Admin SDK, Click webhook, Telegram Bot API, Cron)
- **Sifat nazorati:** Vitest (unit va integratsion testlar) + ESLint

## 📦 O'rnatish va ishga tushirish
1. Repozitoriyani yuklab oling:
   ```bash
   git clone https://github.com/USER_NAME/zehin.git
   cd zehin
   ```
2. Kerakli kutubxonalarni o'rnating:
   ```bash
   npm install
   ```
3. Loyihani ishga tushiring:
   ```bash
   npm run dev
   ```
4. Testlarni tekshirish:
   ```bash
   npm test
   ```
