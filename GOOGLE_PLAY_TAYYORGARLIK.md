# Google Play'ga chiqarish — Tayyorgarlik yo'l xaritasi

> Holat sanasi: 2026-07-14. Ilova = PWA (Vite+React) → **TWA** (Trusted Web Activity) qobig'i.
> Paket nomi: `uz.iqro.app`. Backend: Firebase + Vercel (`toifapro-t41p.vercel.app`).

---

## 1. ✅ TAYYOR (texnik poydevor)

- [x] Production `build` toza o'tadi
- [x] Lint bloklovchi xatosiz (0 error)
- [x] Jonli sayt yuklanadi, konsolda xato yo'q
- [x] PWA manifest to'liq (192 + 512 maskable ikon, standalone, start_url, theme)
- [x] Service worker + offline caching ishlaydi
- [x] `.well-known/assetlinks.json` jonli serverda to'g'ri beriladi (TWA verifikatsiyasi uchun shart)
- [x] Paket nomi ↔ imzo SHA256 mos
- [x] HTTPS (Vercel)
- [x] Maxfiylik siyosati (`/privacy`) + Ommaviy oferta (`/terms`) mavjud
- [x] `.env` sirlari git'ga tushmagan

---

## 2. 🔴 MENING (foydalanuvchi) ZIMMAMDAGI — qaror va rasmiylashtirish

- [ ] **Yakuniy nom + brend** (Toifa Pro yoki Zehin) — trademark tekshiruvidan keyin qat'iylashtirish.
      Nom hal bo'lgach: manifest, ilova nomi, ekran matnlari, do'kon listingi yangilanadi.
- [ ] **Click uchun statik-IP server** (VPS, ideal TAS-IX) — webhook shu yerga ko'chadi.
      *(keyinga qoldirildi — ilova bunisiz ham chiqadi, avval Telegram-operator zaxirasi bilan)*
- [ ] **Google Play Developer hisob** — $25 (bir martalik) + shaxsni tasdiqlash.
- [ ] **20 tester × 14 kun yopiq test** — yangi *shaxsiy* hisob uchun majburiy (production'gacha).
- [ ] **Oferta huquqiy rekvizitlari** — YaTT nomi + STIR qo'shilishi (hozir "Ma'muriyat").

---

## 3. 🟠 MEN (Claude) QILA OLADIGAN — sizning qaroringizni kutmaydigan tayyorgarlik

- [ ] **Do'kon listingi matnlari** (uz + ru): qisqa tavsif (80 belgи), to'liq tavsif, kalit so'zlar
- [ ] **Data Safety formasi javoblari** (kod tahlilidan): qaysi ma'lumot yig'iladi
- [ ] **Content Rating (IARC) anketa** javoblari bo'yicha maslahat
- [ ] **Precache optimizatsiyasi** (birinchi yuklashni yengillashtirish) — ixtiyoriy
- [ ] `test_groq.mjs` qoldiq faylni o'chirish
- [ ] Firestore/Storage rules jonli holatini qayta tasdiqlash

---

## 4. Google Play topshirish bosqichlari (nom + hisob tayyor bo'lgach)

1. **`.aab` yasash** — PWABuilder yoki Bubblewrap orqali (paket `uz.iqro.app` + mavjud kalit).
2. **Play App Signing** — Google imzolasa, `assetlinks.json`dagi SHA256 **Google kalitiga yangilanadi**
   (aks holda ilova brauzer manzil satri bilan ochiladi — TWA "toza" bo'lmaydi).
3. **Do'kon materiallari:**
   - Ikonka 512×512 (bor)
   - Feature grafik 1024×500 (yasash kerak)
   - Kamida 2 telefon skrinshot (yasash kerak)
   - Qisqa + to'liq tavsif, kategoriya (Education)
4. **Content Rating** anketasi (IARC)
5. **Data Safety** formasi
6. **Maxfiylik siyosati URL:** `https://<domen>/privacy`
7. **Target audience & content** (yosh guruhi)
8. **Yopiq test → ochiq test → production** (shaxsiy hisob uchun test davri majburiy)

---

## 5. ⚠️ Alohida hal qilinadigan siyosat masalasi

- **Google Play Billing:** Play'da ilova ichida raqamli obuna sotishda Google odatda o'z billing
  tizimini talab qiladi, uchinchi tomon (Click/Payme)ni cheklaydi. Bu rad etilish xavfi.
  O'zbekistonda ijro turlicha — yechimni alohida ko'rib chiqish kerak.
- **Ma'lumot lokalizatsiyasi (O'RQ-547):** foydalanuvchi cheklovlar yumshatilgan/olib tashlangan
  deb hisoblaydi — tasdiqlansa, to'siq emas.
