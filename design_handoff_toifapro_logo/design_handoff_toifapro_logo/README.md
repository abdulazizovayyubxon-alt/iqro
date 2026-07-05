# Handoff: ToifaPro rebrand — logo tadbiqi

## Overview
"IQRO" ilovasi **ToifaPro** deb qayta nomlandi (o'qituvchilar attestatsiyasiga tayyorlash platformasi). Yangi brend logosi yaratildi va uni ilovaning barcha kerakli joylariga tadbiq qilish kerak.

## About the Design Files
Bu paketdagi fayllar **HTML'da yaratilgan dizayn-namunalar** — ular ko'rinish va joylashuvni ko'rsatadi, to'g'ridan-to'g'ri ko'chiriladigan production kod EMAS. Vazifa: quyidagi speclarni **mavjud kodbaza muhitida** (Flutter, React Native, Kotlin/Swift — qaysi bo'lsa) o'sha muhitning pattern'lari bilan qayta yaratish. PNG/SVG assetlar esa to'g'ridan-to'g'ri ishlatiladi.

## Fidelity
**High-fidelity.** Ranglar, o'lchamlar, nisbatlar yakuniy. Pixel-perfect tadbiq qilinishi kerak.

## Brend identifikatsiyasi

### Logo tarkibi
1. **Belgi (mark)**: ko'k kvadrat (squircle) ichida kichik harfli oq **"tp"** ligaturasi
2. **Yozuv (wordmark)**: **Toifa** (to'q rang) + **Pro** (ko'k) — birga yozilgan, bo'sh joysiz
3. Ikonkada FAQAT "tp" ishlatiladi (kichik o'lchamda o'qilishi uchun); to'liq yozuv sarlavha/splash/marketingda

### Design Tokens
- Brend ko'k (asosiy): `#0E97E0`
- Ochiq ko'k (Pro so'zi qorong'i fonda / aksent): `#36ABEC`
- Juda ochiq ko'k (splash'da Pro): `#A5DDF9`
- To'q matn (Toifa so'zi oq fonda): `#1E2A3A` (mockup headerida `#0F1B2D`)
- Oq fonda tun rejimi matni: `#F8FAFC`
- Shrift: **Plus Jakarta Sans**, weight **800** (ExtraBold), letter-spacing: -0.05em…-0.06em ("tp" uchun), -0.02em (wordmark uchun)
- Squircle radius nisbati: kenglikning **~25%** (masalan 28px ikonka → 8px radius)
- "tp" font o'lchami: konteyner kengligining **~52%**, optik markazlash uchun ~7% yuqoriga siljitilgan

## Qayerga qo'yiladi (screens)

### 1. App launcher ikonkasi
- Fayl: `assets/icon-1024.png` (manba), `assets/icon-512.png` (Play Console)
- Android: adaptive icon (foreground: "tp" glifi, background: `#0E97E0`)
- iOS: `icon-1024.png` to'g'ridan-to'g'ri

### 2. Splash / kirish ekrani
- Fayl: `assets/splash-1080x1920.png` (namuna) — lekin kodda chizish tavsiya etiladi:
- Fon: to'liq `#0E97E0`
- Markazda: 112px oq squircle (radius 28px), ichida ko'k "tp" (58px)
- Ostida 26px bo'shliq, keyin "ToifaPro" (34px, 800): Toifa=oq, Pro=`#A5DDF9`
- Ostida 14px bo'shliq, keyin tagline: "ATTESTATSIYA PLATFORMASI" (11px, 700, letter-spacing 0.26em, oq 75%, BIR QATORDA — white-space nowrap)

### 3. Bosh ekran header (top bar)
- Markazda gorizontal lockup: 28px ko'k squircle (radius 8px) ichida oq "tp" (15px) + 8px gap + "ToifaPro" (18px, 800): Toifa=`#0F1B2D`, Pro=`#0E97E0`
- Eski "Xayrli kun, Aziz Yusupov" matni o'rnida

### 4. Onboarding ekrani
- Status bar ostida, markazda kichik lockup: 24px ikonka (radius 7px, "tp" 13px) + 7px gap + "ToifaPro" (15px, 800)
- Uning ostida progress bar qatori

### 5. Drawer / yon menyu footeri (kunduz VA tun rejimi)
- Markazda: 22px ikonka (radius 6px, "tp" 12px) + 7px gap + "ToifaPro" (13.5px, 800) + "v2.0" (11.5px, kulrang)
- Kunduz: Toifa=`#0F1B2D`, Pro=`#0E97E0`, v2.0=`#94A3B8`
- Tun: Toifa=`#F4F6F9`, Pro=`#36ABEC`, v2.0=`#5A606A`

### 6. Premium sahifa nomi
- "IQRO Premium" → "**ToifaPro Premium**" (Pro so'zi ko'k rangda: oq fonda `#0E97E0`, qorong'i fonda `#36ABEC`)

### 7. Play Market listing
- Feature graphic (banner): `assets/play-banner-1024x500.png`

## HTML/CSS namuna (lockup)

```html
<div style="display:flex; align-items:center; gap:8px;">
  <div style="width:28px; height:28px; border-radius:8px; background:#0E97E0;
              display:flex; align-items:center; justify-content:center;">
    <span style="font-family:'Plus Jakarta Sans'; font-size:15px; font-weight:800;
                 color:#fff; letter-spacing:-0.05em; line-height:1; margin-top:-2px;">tp</span>
  </div>
  <span style="font-family:'Plus Jakarta Sans'; font-size:18px; font-weight:800;
               color:#0F1B2D; letter-spacing:-0.02em;">
    Toifa<span style="color:#0E97E0;">Pro</span>
  </span>
</div>
```

Flutter'da: `Container` + `BorderRadius.circular(w*0.25)` + `Text.rich(TextSpan...)`; shrift: google_fonts paketida `PlusJakartaSans` (w800).

## Interactions & Behavior
Logo statik — hover/animatsiya yo'q. Splash'da xohishga ko'ra yengil fade-in (300ms) mumkin, majburiy emas.

## Muhim qoidalar
- Ikonkada hech qachon "tp"dan boshqa narsa ishlatilmasin (to'liq yozuv sig'maydi)
- "ToifaPro" doim bitta so'z sifatida, "Pro" doim aksent rangda
- Ko'k `#0E97E0` fonda "tp" doim oq; oq fonda ikonka foni doim ko'k
- Eski "IQRO" nomi hamma joydan olib tashlansin (app nomi, About, store listing)

## Assets (shu paketda)
- `assets/icon-1024.png`, `assets/icon-512.png` — launcher ikonkalar
- `assets/splash-1080x1920.png` — splash namuna
- `assets/lockup-light.png`, `assets/lockup-dark.png` — shaffof fonli lockup (marketing)
- `assets/play-banner-1024x500.png` — Play Market feature graphic
- `assets/toifapro-icon.svg`, `assets/toifapro-lockup.svg` — vektor manbalar (Google Font talab qiladi)

## Files
- `IQRO Mockup.dc.html` (asl loyihada) — barcha joylashuvlarning vizual namunasi. Bu HTML dizayn-reference, ko'chirish uchun emas.
