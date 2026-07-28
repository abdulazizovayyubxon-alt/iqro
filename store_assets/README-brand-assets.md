# Zehin — logo va brend assetlari (dasturchi uchun)

> Rebrending: **ToifaPro → Zehin**. Barcha eski "tp" assetlar bekor. Bu papkadagi fayllar yakuniy (27a belgi).

## Belgi
Yumaloq varaq, past burchagi yuqoriga ochilib buklangan (azure). Ma'no: sahifa aylanmoqda — o'rganish, keyingi bosqich.

## Ranglar
| Token | HEX | Ishlatilishi |
|---|---|---|
| Navy (asosiy to'q) | `#0A2440` | ikonka foni, hero |
| Navy belgi/matn | `#12305A` | oq fonda belgi doirasi, wordmark |
| Azure (ilova asosiy) | `#05A3FA` | buklama (fold) |
| Azure lip | `#4FB4F7` / `#6FC5FB` | buklama ichki qatlami |
| App accent | `#0E97E0` | interfeys asosiy rangi |

## Fayllar
| Fayl | O'lcham | Qayerda |
|---|---|---|
| icon-1024.png / icon-512.png | 1024/512 | Play Market, App Store |
| adaptive-foreground-432.png + adaptive-background-432.png | 432 | Android adaptive icon (foreground belgi, background navy) |
| notification-96.png | 96 | Android push (oq, alpha, buklama kesik) |
| mono-white-512.png / mono-black-512.png | 512 | watermark, hujjat, bir rangli joylar |
| favicon-16/32/48.png | 16–48 | web favicon |
| splash-1080x1920.png | 1080×1920 | splash (azure gradient) |
| play-banner-1024x500.png | 1024×500 | Play Market feature banner |
| zehin-icon.svg, lockup-light/dark.svg | vektor | istalgan masshtab (SVG matni Plus Jakarta Sans talab qiladi) |
| lockup-light.png / lockup-dark.png | 822×372 | belgi + yozuv, shaffof fon |

## Wordmark
Matn: **Zehin** — Plus Jakarta Sans ExtraBold (800), letter-spacing −0.03em…−0.04em. "i" nuqtasi belgi bilan almashtiriladi (pastda SVG). Nuqta o'lchami ≈ 0.34em, pozitsiya: top −0.58em, markazda.

## Belgi SVG (yadro)
```svg
<svg viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="21" fill="#12305A"/>
  <g transform="rotate(45 24 24)">
    <path d="M45 24 A21 21 0 0 1 24 45 Q41.06 38.44 37.78 27.28 Q37.13 24 45 24 Z" fill="#05A3FA"/>
    <path d="M45 24 Q37.13 24 37.78 27.28 Q39.75 35.81 29.91 42.38 Q42.38 35.81 45 24 Z" fill="#4FB4F7"/> <!-- lip; 32px dan kichikda olib tashlang -->
  </g>
</svg>
```
Oq/to'q fonda: doira `#fff`, buklama `#05A3FA`. Azure fonda: doira `#fff`, buklama `#0A2440` (solid, shaffoflik YO'Q — kulrang bo'lib qoladi).

## Flutter
```yaml
# pubspec.yaml — flutter_launcher_icons
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/logo/icon-1024.png"
  adaptive_icon_background: "assets/logo/adaptive-background-432.png"
  adaptive_icon_foreground: "assets/logo/adaptive-foreground-432.png"
```
Push ikonka: `android/app/src/main/res/drawable-*/ic_stat_zehin.png` = notification-96.png.

## Splash animatsiya spetsifikatsiyasi
1. Belgi 0.85→1.0 scale + fade, 500ms, easing cubic-bezier(0.2, 0.8, 0.2, 1)
2. Buklama: rotate -8°→0° (transform-origin: o'ng-past), belgi bilan birga
3. Wordmark "Zehin": fade + 12px yuqoriga siljish, 400ms, 250ms kechikish
4. Tagline: fade, 300ms, 450ms kechikish
Flutter: `flutter_animate` yoki Lottie; umumiy davomiylik ≤ 900ms.

## Qoidalar
- Belgini cho'zmang, aylantirmaslik (buklama har doim past-o'ngda 45°)
- Minimal bo'sh joy: belgi diametrining 25% har tomondan
- 32px dan kichikda: lip (och qatlam) olib tashlanadi, faqat doira + buklama
