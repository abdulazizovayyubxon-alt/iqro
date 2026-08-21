import { describe, it, expect } from 'vitest';
import { nextCloudSaveDelay, estimateCloudWrites } from '../utils/saveSchedule';

// ════════════════════════════════════════════════════════════════════════
//  2026-08-20 KVOTA HODISASI.
//
//  `userStats` bulutga 3 soniyalik debounce bilan yozilardi. Koddagi izoh
//  "test paytida ~50 write o'rniga 2-3 write" deb da'vo qilardi — bu
//  XATO edi: har javobdan keyin 3 soniyalik jimlik yuzaga keladi, ya'ni
//  har javobga bitta yozuv ketadi. Natijada loyihaning kunlik Firestore
//  yozuv kvotasi (20 000) tugab, ILOVADA BUTUNLAY yozuv to'xtadi.
//
//  Pastdagi testlar yangi ritmni qulflaydi va eski xatoning qaytishini
//  ko'rsatadi — birinchi test aynan eski qiymatning yomonligini isbotlaydi.
// ════════════════════════════════════════════════════════════════════════

// AppContext.jsx dagi joriy qiymatlar
const DEBOUNCE = 30_000;
const MAX_WAIT = 180_000;

describe('eski 3 soniyalik debounce — nima uchun kvotani yedi', () => {
  it('har javobga deyarli bitta yozuv qilardi', () => {
    // 50 savol, har 20 soniyada bitta javob (odatiy tezlik).
    // 3 s debounce < 20 s oraliq → har javobdan keyin taymer yonadi.
    const eski = estimateCloudWrites({
      answerCount: 50, gapMs: 20_000, debounceMs: 3_000, maxWaitMs: 180_000,
    });
    expect(eski).toBeGreaterThanOrEqual(45); // ~50, izohdagi "2-3" emas
  });

  it('yangi ritm o\'sha testni bir necha yozuvga tushiradi', () => {
    const yangi = estimateCloudWrites({
      answerCount: 50, gapMs: 20_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    // 50 × 20 s = ~17 daqiqa; 3 daqiqada bir marta → ~5-6 yozuv
    expect(yangi).toBeLessThanOrEqual(8);
    expect(yangi).toBeGreaterThan(0); // butunlay yozmay qolmasin
  });

  it('kamida 6 barobar kamaytiradi', () => {
    const args = { answerCount: 50, gapMs: 20_000 };
    const eski = estimateCloudWrites({ ...args, debounceMs: 3_000, maxWaitMs: 180_000 });
    const yangi = estimateCloudWrites({ ...args, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT });
    expect(eski / yangi).toBeGreaterThanOrEqual(6);
  });
});

describe('nextCloudSaveDelay — debounce', () => {
  it('birinchi o\'zgarishga to\'liq debounce beradi', () => {
    expect(nextCloudSaveDelay({
      oldestPendingAt: null, now: 1_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    })).toBe(DEBOUNCE);
  });

  it('undefined ham null kabi ishlaydi', () => {
    expect(nextCloudSaveDelay({
      oldestPendingAt: undefined, now: 0, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    })).toBe(DEBOUNCE);
  });

  it('shift bosilmagan holda debounce qaytadi', () => {
    // 10 soniya kutilgan, shift 180 s — hali erkin
    expect(nextCloudSaveDelay({
      oldestPendingAt: 0, now: 10_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    })).toBe(DEBOUNCE);
  });
});

describe('nextCloudSaveDelay — maksimal kutish shifti', () => {
  it('shift bosilganda DARHOL yozadi (0)', () => {
    expect(nextCloudSaveDelay({
      oldestPendingAt: 0, now: MAX_WAIT, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    })).toBe(0);
  });

  it('shiftdan oshgan holatda ham 0 (manfiy qaytmaydi)', () => {
    expect(nextCloudSaveDelay({
      oldestPendingAt: 0, now: MAX_WAIT + 60_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    })).toBe(0);
  });

  it('shiftga yaqin joyda taymer undan OSHIB KETMAYDI', () => {
    // 175 s kutilgan, shiftgacha 5 s qoldi — 30 s kutish kafolatni buzardi
    const d = nextCloudSaveDelay({
      oldestPendingAt: 0, now: 175_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    expect(d).toBe(5_000);
    expect(175_000 + d).toBe(MAX_WAIT);
  });

  it('debounce shiftdan katta bo\'lsa shift ustun turadi', () => {
    // Noto'g'ri sozlashdan himoya: 60 s debounce, 10 s shift
    expect(nextCloudSaveDelay({
      oldestPendingAt: null, now: 0, debounceMs: 60_000, maxWaitMs: 10_000,
    })).toBe(10_000);
  });
});

describe('uzluksiz javob berish — yozuv umuman bo\'lmay qolmasligi', () => {
  it('debounce oraliqdan katta bo\'lsa ham yozuv baribir ketadi', () => {
    // Har 5 soniyada javob (juda tez), debounce 30 s — sof debounce bilan
    // taymer HAR SAFAR qayta boshlanardi va yozuv HECH QACHON bo'lmasdi.
    // Shift aynan shu holat uchun bor.
    const writes = estimateCloudWrites({
      answerCount: 200, gapMs: 5_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    // 200 × 5 s = 1000 s ≈ 16.7 daqiqa → 3 daqiqada bir marta ≈ 5
    expect(writes).toBeGreaterThanOrEqual(4);
    expect(writes).toBeLessThanOrEqual(7);
  });

  it('shift kafolati: har maxWaitMs da kamida bitta yozuv', () => {
    const daqiqa = 60_000;
    const seansMs = 30 * daqiqa;
    const writes = estimateCloudWrites({
      answerCount: 360, gapMs: 5_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    const kutilgan = Math.floor(seansMs / MAX_WAIT); // 10
    expect(writes).toBeGreaterThanOrEqual(kutilgan - 1);
  });
});

describe('sekin javob beruvchi — ritm buzilmasin', () => {
  it('oraliq debounce dan katta bo\'lsa har javobda yoziladi', () => {
    // Har 2 daqiqada bitta javob: 30 s jimlik yuzaga keladi → yozuv.
    // Bu KUTILGAN xatti-harakat — bunday foydalanuvchi kam yozuv qiladi.
    const writes = estimateCloudWrites({
      answerCount: 10, gapMs: 120_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    expect(writes).toBeGreaterThanOrEqual(9);
    expect(writes).toBeLessThanOrEqual(10);
  });
});

describe('kvota hisobi — o\'zgarish yetarlimi', () => {
  it('200 faol foydalanuvchi kunlik 20 000 yozuv limitiga sig\'adi', () => {
    const perSeans = estimateCloudWrites({
      answerCount: 60, gapMs: 20_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    const kunlik = 200 * perSeans;
    // Eski ritmda bu 200 × ~60 = 12 000 edi (boshqa yozuvlar ustiga qo'shilib
    // 20 000 limitini teshardi). Yangisida ancha zaxira qoladi.
    expect(kunlik).toBeLessThan(3_000);
  });
});
