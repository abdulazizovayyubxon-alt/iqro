---

### Tez tashxis

| Javobda ko'rsangiz | Ma'nosi | Nima qilish |
|---|---|---|
| `"firestoreError": "quota_exceeded"` | Kunlik Firestore kvotasi tugagan | Blaze rejasiga o'ting yoki tiklanishni kuting — kvota **Pacific yarim tunida** tiklanadi (Toshkent ~12:00), UTC yarim tunida EMAS. Sababni qidiring: kimdir filtrsiz kolleksiya o'qigan. |
| `"env": "missing"` | Vercel'da muhit o'zgaruvchisi yo'q | Vercel → Settings → Environment Variables |
| `"settingsDoc": "missing"` | `settings/version` hujjati yo'q | Ilova savol yuklay olmaydi — hujjatni tiklang |
| `"questionSource": "firestore-fallback"` | Paket qurilmagan — HAR yuklash ~2 900 o'qish | Admin → Savollar → «Paketlarni qayta qurish» |
| `firestoreMs` doim yuqori (>2000) | Firestore sekinlashgan | Qulashdan oldingi ogohlantirish — yukni tekshiring |
| HTTP `000` yoki timeout | Domen yoki deploy o'lgan | Vercel deploy holatini tekshiring |

Kvotani tekshirish: **Firebase Console → Firestore → Usage**. Bitta soatdagi
cho'qqi = filtrsiz so'rov. Tekis chiziq = haqiqiy foydalanuvchi trafigi.

Tiklangach bu issue **avtomatik yopiladi**.

<sub>Manba: `.github/workflows/health-monitor.yml` · fon: `BARQARORLIK_AUDIT_2026-08-17.md`, `YUK_VA_BARQARORLIK.md`</sub>
