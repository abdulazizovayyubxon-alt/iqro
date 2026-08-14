# Google Play — Do'kon listingi + Data Safety (kod tahlilidan)

> Yakuniy brend nomi — **Zehin** (2026-07-17); do'kon nomi — **«Zehin — Malaka toifa testlari»** (2026-07-18 tasdiqlandi).

---

# A) DATA SAFETY (Ma'lumotlar xavfsizligi) formasi

> Play Console → App content → Data safety. Quyidagilar kod tahlilidan aniqlangan.
> Barchasi **to'planadi (collected)**, uchinchi tomonga **sotilmaydi**.

## Yig'iladigan ma'lumot turlari

| Kategoriya | Aniq maydon | Majburiy? | Maqsad |
|---|---|---|---|
| **Shaxsiy** | Ism (`name`) | Ha | Hisob boshqaruvi, ilova funksiyasi |
| **Shaxsiy** | Telefon raqami (`phone`) | Ha | Hisob/login |
| **Shaxsiy** | Jins, tug'ilgan sana (`gender`, `birthDate`) | Ixtiyoriy | Personalizatsiya |
| **Shaxsiy** | Foydalanuvchi ID (`uid`, `shortId`) | Ha | Ilova funksiyasi |
| **Moliyaviy** | Xarid tarixi (premium reja, tranzaksiya) | — | Ilova funksiyasi |
| **Ilova faoliyati** | Test/imtihon natijalari, statistika, reyting | Ha | Ilova funksiyasi, Analitika |
| **Ilova faoliyati** | Sahifa ko'rish, sessiya vaqti, eventlar (GA) | — | Analitika |
| **Ilova faoliyati** | Foydalanuvchi kontenti (e'tirozlar, savol so'rovlari) | Ixtiyoriy | Ilova funksiyasi |
| **Ilova/ishlash** | Nosozlik jurnali / diagnostika (`errorLogs`) | — | Diagnostika |
| **Qurilma ID** | Push token (`fcmTokens`) | Ixtiyoriy | Bildirishnomalar |
| **Qurilma ID** | Analitika identifikatori (Google Analytics) | — | Analitika |

## ⚠️ MUHIM — bank kartasi
- Karta ma'lumotlari ilova tomonidan **YIG'ILMAYDI va SAQLANMAYDI** — to'lov to'liq Click/Payme
  sahifasida amalga oshadi. Data Safety'da "Payment info"ni **collected: NO** deb belgilang.

## Xavfsizlik/qayta ishlash savollari (Play so'raydi)
- **Uzatishda shifrlanadimi?** ✅ HA (HTTPS/TLS).
- **Foydalanuvchi o'chirishni so'ray oladimi?** ✅ HA — ilova ichida `/delete-account` (deletionRequests).
- **Ma'lumot sotiladimi/uchinchi tomonga beriladimi?** ❌ YO'Q sotilmaydi. Google (Firebase +
  Google Analytics) — **protsessor** sifatida sizning nomingizdan qayta ishlaydi (ular "collected",
  odatda "shared" emas). IP `errorLogs`da **saqlanmaydi** (faqat rate-limit uchun).
- **Maqsadlar:** Ilova funksiyasi, Hisob boshqaruvi, Analitika, Bildirishnomalar (push).

---

# B) DO'KON LISTINGI (uz + ru)

## Ilova nomi (≤30 belgi)
- UZ: `Zehin — Malaka toifa testlari` (29 belgi ✓ — **2026-07-18 tasdiqlandi**)
- RU: `Zehin — Тесты на категорию` (26 belgi; muqobil: `Zehin — Тесты аттестации`)

## Qisqa tavsif (≤80 belgi)
- UZ: `O'qituvchilarni attestatsiyaga tayyorlaydi` *(brend brifi, 2026-07-18)*
- RU: `Готовит учителей к аттестации`
- Muqobil (savol soni bilan): `O'qituvchilar attestatsiyasiga tayyorgarlik: 50 000+ savol, imtihon rejimi`

## To'liq tavsif (UZ)

```
Zehin — o'qituvchilar va ta'lim xodimlari uchun malaka toifa (attestatsiya)
imtihonlariga zamonaviy tayyorgarlik platformasi.

📚 50 000+ toifa test savollari, 17+ fan bo'yicha
Har bir fan mavzularga bo'lingan — kerakli bo'limdan mashq qiling.

✍️ Imtihon rejimi
Real attestatsiya sharoitini taqlid qiluvchi taymerli test — o'zingizni haqiqiy
imtihondan oldin sinab ko'ring.

📈 Rivojlanishni kuzatish
Har bir urinish natijasi, statistika, kuchli va zaif mavzular tahlili.

📕 Xatolar daftari + Aqlli takror
Xato qilgan savollaringiz avtomatik saqlanadi va takrorlash uchun qaytariladi.

🏆 Reyting va yutuqlar
Boshqa foydalanuvchilar bilan bellashing, yutuqlar to'plang.

📶 Oflayn rejim
Internet bo'lmaganda ham mashq qiling.

🎁 Do'st taklif qiling — bonus oling.

Premium obuna barcha savollar va imkoniyatlarni ochadi.
```

## To'liq tavsif (RU)

```
Zehin — современная платформа подготовки к квалификационной (аттестационной)
категории для учителей и работников образования.

📚 50 000+ вопросов по 17+ предметам
Каждый предмет разбит по темам — тренируйтесь в нужном разделе.

✍️ Режим экзамена
Тест с таймером, имитирующий реальные условия аттестации.

📈 Отслеживание прогресса
Результаты попыток, статистика, анализ сильных и слабых тем.

📕 Тетрадь ошибок + умное повторение
Вопросы с ошибками сохраняются автоматически и возвращаются для повторения.

🏆 Рейтинг и достижения
Соревнуйтесь с другими пользователями, собирайте достижения.

📶 Офлайн-режим
Занимайтесь даже без интернета.

🎁 Пригласите друга — получите бонус.

Premium-подписка открывает все вопросы и возможности.
```

## Qo'shimcha (topshirishda kerak)
- **Kategoriya:** Education (Ta'lim)
- **Feature grafik:** 1024×500 (yasash kerak)
- **Skrinshotlar:** kamida 2 ta telefon (login, test, natija, reyting — 4–6 tavsiya)
- **Maxfiylik URL:** `https://<domen>/privacy`
- **Aloqa email + Telegram**
- **Yosh reytingi:** Everyone / 3+ (kontent xavfsiz) — IARC anketasida tasdiqlanadi
```
