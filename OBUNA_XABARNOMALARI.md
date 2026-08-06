# Obuna xabarnomalari — push va (ixtiyoriy) SMS

Play build'da sotuv UI'si yo'q (anti-steering: narx, to'lov tugmasi va Telegram
havolasi yashirilgan). Demak foydalanuvchiga obuna holati haqida **ilova
ekranidan tashqarida** eslatish kerak. Buni `api/cron-daily.js` qiladi.

**Hozirgi holat: sof push rejimi. Pul sarflanmaydi.**

## Nima qachon yuboriladi

Cron har kuni **06:00 UTC (11:00 Toshkent)** da ishlaydi.

| Turi | Qachon | Bayroq (`users/{uid}`) |
|---|---|---|
| `welcome` | ro'yxatdan 1–2 kun keyin, Pro'si yo'qlarga | `notifyWelcomeSent: true` |
| `trialEnd` | sinov muddati ertaga tugaydi (6-kun) | `notifyTrialSent: true` |
| `expired` | Pro obuna tugadi | `notifyExpiredFor: <premiumExpire>` |

## Kanal tanlash

```
push tokeni bormi?  ──ha──►  PUSH (bepul)
        │
        yo'q
        │
        ▼
   SMS_ENABLED=1 ?  ──ha──►  SMS (pullik, zaxira)
        │
        yo'q
        │
        ▼
   yubormaymiz — bayroq QO'YILMAYDI
```

Oxirgi holat muhim: bayroq qo'yilmagani uchun odam keyinroq push'ni yoqsa,
xabarni o'shanda oladi — navbatdan tushib qolmaydi.

Qoidalar:

- Bir odam bir ishga tushishda **ko'pi bilan bitta** xabar oladi.
- Bayroq xabar **qabul qilingandan keyin** yoziladi. FCM ishlamay qolgan kuni
  hech kim navbatdan tushmaydi.
- `users/{uid}.billingNotifyOptOut === true` bo'lsa **hech qanday kanalda**
  yuborilmaydi (Sozlamalar → «Obuna xabarnomalari»). Maydon yo'qligi «rozi»
  degani — eski hisoblar migratsiyasiz ishlaydi.
- Bir ishga tushishdagi chegara `NOTIFY_MAX_PER_RUN` (default 300).
- `expired` uchun `notifyExpiredFor` **muddatni** saqlaydi, `true` emas: odam
  qayta obuna bo'lib yana tugatsa, yangi muddat bo'yicha yana yuboriladi.

## ⚠️ Push matnida Telegram manzili — faqat sayt foydalanuvchisiga

Push ilova orqali yetkaziladi. Play build uchun u anti-steering nuqtai
nazaridan ilova **ichidagi** xabarga yaqin turadi — ya'ni push ichida tashqi
to'lov kanalini reklama qilish riskli.

Shuning uchun `src/services/push.js` token ro'yxatdan o'tkazishda
`users/{uid}.pushIsPlay = true` yozadi (agar `isPlayBuild()` rost bo'lsa), cron
esa shu bayroqqa qarab manzilni matndan olib tashlaydi:

| Token qayerdan | Push matni |
|---|---|
| sayt / brauzer | «… Aloqa: t.me/zehinuz» |
| Play ilovasi | manzilsiz, faqat `/premium` ekraniga havola |

`pushIsPlay` faqat `true` ga yoziladi, hech qachon `false` ga qaytarilmaydi:
TWA va Chrome bitta origin'ni bo'lishadi va ko'pincha ayni tokenni oladi —
shubha bo'lsa cheklovli tomon tanlanadi.

SMS'da bunday cheklov **yo'q** — u Google yurisdiksiyasidan butunlay tashqarida.

## Sinash

```bash
curl "https://zehin-t41p.vercel.app/api/cron-daily?secret=$CRON_SECRET&dry=1"
```

`dry=1` butun cron'ni **faqat-o'qish** qiladi (obuna tugatish, bildirishnoma
yozish, chegirma tozalash — hammasi to'xtatiladi). Bu shart: aks holda oldindan
ko'rish paytida obunalar tugatilib, keyingi haqiqiy ishga tushishda win-back
xabari yo'qolardi.

Javobdagi muhim maydonlar:

- `notify.channel` — `{ push: N, sms: M }`. `sms` noldan katta bo'lsa **pul
  ketmoqda**.
- `notify.smsParts` — SMS bo'laklari soni, yagona pullik ko'rsatkich.
- `notify.skipped.noChannel` — na push tokeni, na SMS. Bu son katta bo'lsa,
  push'ni yoqish taklifini ko'proq ko'rsatish kerak.
- `notifySample` — birinchi 10 ta xabar, kanali va matni bilan.

## SMS zaxirasini yoqish (hozir kerak emas)

Yuborish **ikki qulf** ortida: `SMS_ENABLED=1` **va** provayder kalitlari.
Ikkalasi ochilmaguncha `api/_sms.js` `log` rejimida ishlaydi.

```
SMS_ENABLED=1
SMS_PROVIDER=eskiz
SMS_CONTACT=t.me/zehinuz
ESKIZ_EMAIL=<kabinet emaili>
ESKIZ_PASSWORD=<kabinet paroli>
ESKIZ_FROM=<tasdiqlangan nick yoki 4546>
```

Play Mobile uchun: `SMS_PROVIDER=playmobile` + `PLAYMOBILE_LOGIN`,
`PLAYMOBILE_PASSWORD`, `PLAYMOBILE_ORIGINATOR`.

**⚠️ Eskiz shablon qoidasi.** Eskiz ixtiyoriy matnni yubormaydi — har bir matn
kabinetda oldindan tasdiqlanishi kerak, aks holda so'rov `waiting` da qotadi.
`api/_sms.js` dagi `TEXT` matnlarini kabinetga aynan shundayligicha kiriting.

**⚠️ GSM-7 narxi.** O'zbekcha `ʻ` (U+02BB) GSM-7 da yo'q → xabar UCS-2 ga
o'tadi → bir bo'lakka 160 emas, **70** belgi → xarajat ikki barobar. Matnlar
ataylab ASCII; `asciiFold()` tozalaydi, `segments()` narxni ko'rsatadi.
`src/__tests__/sms.test.js` shu uchalasini qamrab oladi.
