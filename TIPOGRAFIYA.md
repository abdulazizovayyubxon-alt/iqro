# Tipografiya tizimi (Typography System)

Yagona markaziy manba: **`src/index.css`** faylining boshidagi `html` + `:root` bloki.
Komponentlarda qattiq `px` yozilmaydi — faqat token ishlatiladi.

---

## 1. Arxitektura — 3 qatlam

```
┌─ 1-QATLAM: ILDIZ ───────────────────────────────────────────────┐
│ html { font-size: calc(clamp(1rem, 0.963rem + 0.163vw, 1.09375rem)│
│                        * var(--fs-scale, 1)); }                  │
│                                                                  │
│  • clamp()  → ekran kengligi bo'yicha 16px → 17.5px silliq o'sish │
│  • --fs-scale → foydalanuvchi tanlovi (S/M/L/XL)                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │ hamma token rem'da — ikkalasini ham meros oladi
┌──────────────────────────▼───────────────────────────────────────┐
│ 2-QATLAM: PRIMITIVLAR — faqat O'LCHAM                            │
│ --fs-3xs … --fs-12xl, --fs-hero-*                                │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│ 3-QATLAM: SEMANTIK TOKENLAR — MA'NO (komponentlar shuni ishlatadi)│
│ --fs-h1 / --fs-body / --fs-caption / --fs-btn / --fs-question …  │
└──────────────────────────────────────────────────────────────────┘
```

**Nima uchun `clamp()` ildizda, har bir tokenda emas?**
Har bir tokenga alohida `clamp()` yozilsa, 40+ ta mustaqil formula paydo bo'ladi va
ular orasidagi nisbat (ierarxiya) ekran o'zgarganda buziladi. Ildizda bitta formula —
butun shkala **bir butun bo'lib** masshtablanadi, nisbatlar esa doim saqlanadi.

---

## 2. Tayyor o'zgaruvchilar

### Semantik tokenlar (komponentlarda SHULAR ishlatiladi)

| Token | Baza | Vazifasi |
|---|---|---|
| `--fs-display` | 36px | Natija/statistika katta raqamlari |
| `--fs-h1` | 22px | Sahifa sarlavhasi |
| `--fs-h2` | 20px | Bo'lim sarlavhasi |
| `--fs-h3` | 18px | Karta sarlavhasi |
| `--fs-h4` | 15px | Kichik blok sarlavhasi |
| `--fs-body-lg` | 16px | Yetakchi paragraf |
| `--fs-body` | 14px | Standart matn |
| `--fs-body-sm` | 13px | Ikkilamchi matn |
| `--fs-caption` | 12px | Izoh, sana, meta |
| `--fs-micro` | 11px | Rozetka, chip |
| `--fs-nano` | 10px | Juda mayda yorliq (a11y chegarasi) |
| `--fs-btn` | 15px | Asosiy tugma |
| `--fs-btn-sm` | 13px | Kichik tugma |
| `--fs-input` | **max(16px, …)** | Kiritish maydoni — iOS zoom himoyasi |

### O'qish yuzalari (test, takror, kartochka, konspekt)

| Token | Baza | Vazifasi |
|---|---|---|
| `--fs-question` | 20px | Savol matni |
| `--fs-option` | 16px | Javob varianti |
| `--fs-explain` | 15px | Izoh / tahlil / konspekt |

Bular UI emas, **kontent** — shu sabab shkalada bir pog'ona yuqori turadi.

### Satr oralig'i va vazn

```css
--lh-tight: 1.2     --fw-regular:  500     --ls-tighter: -0.03em
--lh-snug: 1.35     --fw-medium:   600     --ls-tight:   -0.02em
--lh-normal: 1.5    --fw-semibold: 700     --ls-normal:   0
--lh-relaxed: 1.65  --fw-bold:     800     --ls-wide:     0.04em
                    --fw-black:    900
```

`--ls-*` **em'da** — shrift kattalashganda harflar oralig'i mutanosib qoladi
(`px`da qolsa XL rejimda sarlavhalar siqilib ketardi).

---

## 3. Komponentga qanday bog'lanadi

### A) CSS klassi orqali (afzal)

```css
.my-card-title {
  font-size: var(--fs-h3);
  line-height: var(--lh-snug);
  font-weight: var(--fw-bold);
}
```

### B) Tayyor utilita klasslari (JSX'da eng qisqa yo'l)

```jsx
<h1 className="t-h1">Sarlavha</h1>
<p  className="t-body">Asosiy matn</p>
<span className="t-caption">Izoh</span>
<div className="t-read">Uzun o'qish matni</div>
```

Mavjud utilitalar: `t-display`, `t-h1…t-h4`, `t-body-lg`, `t-body`, `t-body-sm`,
`t-caption`, `t-micro`, `t-label` (UPPERCASE), `t-read`.
Har biri o'lcham + satr oralig'i + vaznni **birga** beradi — "font-size qo'yildi,
line-height unutildi" holati qaytalanmaydi.

### C) Inline style (mavjud kodda)

```jsx
// ✗ NOTO'G'RI — shkaladan tushib qoladi, A+/A- ta'sir qilmaydi
<div style={{ fontSize: 14 }}>

// ✓ TO'G'RI
<div style={{ fontSize: 'var(--fs-body)', lineHeight: 'var(--lh-normal)' }}>
```

---

## 4. A+ / A- (S/M/L/XL) qanday ishlaydi

```
localStorage['iqro-font-scale']  →  --fs-scale  →  html font-size  →  hamma rem token
```

| Joy | Vazifasi |
|---|---|
| `index.html` (boot skript) | React yuklanishidan OLDIN `--fs-scale` beradi — matn "sakramaydi" |
| `src/pages/SettingsPage.jsx` → `applyFontScale()` | Runtime'da o'zgartiradi va saqlaydi |

```js
document.documentElement.style.setProperty('--fs-scale', String(v)); // 0.9 | 1 | 1.1 | 1.25
```

> **DIQQAT:** `document.documentElement.style.fontSize` ga to'g'ridan-to'g'ri qiymat
> berilmaydi. Inline uslub ildizdagi `calc(clamp(…) * var(--fs-scale))` ni bosib ketadi
> va ekranga moslashuv (responsive) o'chib qoladi. Faqat `--fs-scale` o'zgartiriladi.

**Tekshirilgan natija (375px ekran):**

| Tanlov | Ildiz | Savol | Variant | Body | Input |
|---|---|---|---|---|---|
| S (0.9) | 14.4px | 18.0px | 14.4px | 12.6px | **16px** |
| M (1.0) | 16.0px | 20.0px | 16.0px | 14.0px | **16px** |
| L (1.1) | 17.6px | 22.0px | 17.6px | 15.4px | 16.5px |
| XL (1.25) | 20.0px | 25.0px | 20.0px | 17.5px | 18.8px |

Input hech qachon 16px dan pastga tushmaydi — iOS Safari aks holda fokusda sahifani zumlaydi.

---

## 5. Responsive qoidalar

1. **Media query ichida `font-size` qayta belgilanmaydi.** Ekranga moslashuvni ildizdagi
   `clamp()` bajaradi. (Ilgari `@media (max-width: 768px)` savol matnini 20px→17px,
   variantni 16px→14.5px ga tushirib yuborardi — asosiy shikoyat sababi shu edi.)
   Yagona istisno: `.section-header` mobilda ataylab `h2 → h3` ga tushadi (ierarxiya tanlovi).
2. **Overflow himoyasi:** `body { overflow-wrap: break-word }` + flex/grid bolalariga
   `min-width: 0` — shrift kattalashganda uzun termin qutidan chiqib ketmaydi.
3. **`text-size-adjust: 100%`** — iOS gorizontal burilishda shriftni o'zicha kattalashtirmaydi.
4. Bir qatorli sarlavha/tugma uchun `.text-truncate` (`…` bilan kesish) mavjud.

---

## 6. Tizimdan ATAYLAB tashqarida qolgan joylar

| Joy | Sabab |
|---|---|
| `src/App.jsx` (ErrorBoundary, splash) | Dizayn tizimi yuklanmay qolsa ham chizilishi shart |
| `index.html` splash `<style>` | React'gacha chiziladi, CSS o'zgaruvchilarisiz ishlashi kerak |
| SVG `fontSize="9"` atributlari (`QuestionMedia`, `RadarChart`) | `viewBox` koordinata tizimi — `rem` sxemani buzadi |
| `ctx.font = '900 68px …'` (`ResultShareCard`, `BrandLogo`) | Canvas rasm hamma uchun bir xil piksel bo'lishi kerak |
| `BrandLogo` `fontSize: fs` | Wordmark `size` prop'idan hisoblanadi. `size` RAQAM bo'lsa — qat'iy px (splash, header, modal: brend elementi shkaladan qat'iy nazar bir xil turadi). Matn oqimida turgan lockup shkalaga ergashishi uchun CSS uzunligi beriladi: `size="var(--fs-4xl)"` (Sozlamalar → versiya qatori) |
| `--fs-input` ichidagi `16px` | iOS brauzer cheklovi, dizayn tanlovi emas |

---

## 7. Yangi komponent yozayotganda

1. `px` yozmang. Semantik tokendan boshlang: matn sarlavhami, body'mi, izohmi?
2. `font-size` bilan birga `line-height` ni ham tokendan bering.
3. Test/takror/konspekt matni bo'lsa — `--fs-question` / `--fs-option` / `--fs-explain`.
4. Kiritish maydoni bo'lsa — `--fs-input`.
5. Tekshiring: DevTools'da `--fs-scale` ni `1.25` ga qo'ying — matn kattalashsinu,
   hech narsa ekrandan chiqib ketmasin.
