# Click To'lov Tizimi Integratsiyasi Yo'riqnomasi

Ushbu hujjat loyihaga Click to'lov tizimini ulash bo'yicha qo'llanma va muhim ma'lumotlarni o'z ichiga oladi. Loyiha deploy qilinganidan so'ng (Vercel'ga yuklanganidan keyin), quyidagi qadamlarni bajarishingiz so'raladi.

## 1. Asosiy Kalitlar (Credentials)
Siz taqdim etgan va `.env` hamda Vercel sozlamalarida ishlatiladigan Click ma'lumotlari:
- **SERVICE_ID:** 107116
- **MERCHANT_ID:** 62897
- **SECRET_KEY:** iTdJGBkK2WdXN
- **Merchant User ID (Shaxsiy):** 87686 *(Bu asosan kabinetda yoki yordam guruhiga murojaat qilganda kerak bo'ladi)*

---

## 2. Click Kabinetini Sozlash (Deploy'dan keyin)

Loyihangiz serverda (masalan: `https://toifapro.uz`) to'liq ishlashni boshlagach, **merchant.click.uz** kabinetiga kiring va quyidagi amallarni bajaring:

1. Chap tomondagi menyudan **"Сервисы" (Xizmatlar)** bo'limiga o'ting.
2. Jadvalning oxirgi ustunidagi **"Действие" (Harakat)** maydonidagi qalamcha tugmasini bosing.
3. Sozlamalar oynasida webhook manzillarini kiritishingiz kerak. Buning uchun loyihangizning asosiy domeniga `/api/payment-webhook` ni qo'shib kiritasiz:
   - **Prepare URL:** `https://sizning_domeningiz.uz/api/payment-webhook`
   - **Complete URL:** `https://sizning_domeningiz.uz/api/payment-webhook`
4. Sozlamalarni saqlaganingizdan so'ng, Click qo'llab-quvvatlash guruhiga xizmatni faollashtirishni so'rab murojaat qiling (sukut bo'yicha xizmat o'chiq bo'ladi).

---

## 3. Server IP va TAS-IX (Oq ro'yxat)

Agar sizning serveringiz (masalan, Vercel) O'zbekistondagi TAS-IX tarmog'ida joylashmagan bo'lsa, **birinchi real to'lovni o'tkazishdan oldin** bu haqida Click guruhiga xabar berishingiz shart.

Click xodimlariga quyidagilarni yuboring:
- Domeningiz (masalan: `toifapro.uz`)
- Serveringizning IP-manzili va porti (Agar Vercel ishlatsangiz, ularda dinamik IP bo'lishi mumkin. Bunday holatda Click guruhiga siz "Vercel" platformasidan foydalanayotganingizni va maxsus firewall sozlamalari qanday bo'lishini so'rashingiz mumkin).
- **Muhim:** Server IP manzili iloji boricha statik bo'lishi talab qilinadi.

---

## 4. Test To'lovini Amalga Oshirish

Xizmat faollashtirilgach, test to'lovini amalga oshirish:
1. Telefoningizga **Click Up** ilovasini o'rnating.
2. Saytingizga kiring, Pro obuna sotib olish tugmasini bosing, to'lov usullaridan **Click** ni tanlang.
3. Tizim sizni avtomatik ravishda Click to'lov sahifasiga yo'naltiradi.
4. Telefon raqamingiz yoki plastik karta ma'lumotlaringizni kiritib to'lovni bajaring.
5. To'lov muvaffaqiyatli amalga oshsa, tizim hisobingizni avtomatik Pro darajasiga o'tkazadi va Firestore orqali ma'lumotlar saqlanadi.

Xatolik yuz bersa, Click guruhi bilan bog'laning va so'rovlar tarixini taqdim eting.
