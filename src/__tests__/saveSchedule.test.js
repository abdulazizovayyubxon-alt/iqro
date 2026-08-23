import { describe, it, expect } from 'vitest';
import {
  nextCloudSaveDelay, estimateCloudWrites,
  shouldRetryCloudWrite, nextRetryDelay, RETRY_BASE_MS, RETRY_MAX_MS,
} from '../utils/saveSchedule';

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

  it("yangi ritm o\'sha testni bir necha yozuvga tushiradi", () => {
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
  it("birinchi o\'zgarishga to\'liq debounce beradi", () => {
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

  it("debounce shiftdan katta bo\'lsa shift ustun turadi", () => {
    // Noto'g'ri sozlashdan himoya: 60 s debounce, 10 s shift
    expect(nextCloudSaveDelay({
      oldestPendingAt: null, now: 0, debounceMs: 60_000, maxWaitMs: 10_000,
    })).toBe(10_000);
  });
});

describe('uzluksiz javob berish — yozuv umuman bo\'lmay qolmasligi', () => {
  it("debounce oraliqdan katta bo\'lsa ham yozuv baribir ketadi", () => {
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
  it("oraliq debounce dan katta bo\'lsa har javobda yoziladi", () => {
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
  it("200 faol foydalanuvchi kunlik 20 000 yozuv limitiga sig\'adi", () => {
    const perSeans = estimateCloudWrites({
      answerCount: 60, gapMs: 20_000, debounceMs: DEBOUNCE, maxWaitMs: MAX_WAIT,
    });
    const kunlik = 200 * perSeans;
    // Eski ritmda bu 200 × ~60 = 12 000 edi (boshqa yozuvlar ustiga qo'shilib
    // 20 000 limitini teshardi). Yangisida ancha zaxira qoladi.
    expect(kunlik).toBeLessThan(3_000);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  2026-08-23 KVOTA HALOKATI — qayta urinish halqasi.
//
//  Kvota tugaganda Firestore promise'i NA resolve NA reject bo'ladi.
//  Eski kod `pendingCloudRef` yoqilgan ekan HAR 60 SONIYADA yangi `setDoc`
//  yuborardi — ya'ni osilgan yozuv qayta urinishlarni TO'XTATMASDI, aksincha
//  ularni cheksiz qilardi. Pastdagi birinchi test eski xatoning narxini
//  o'lchaydi, qolganlari yangi darvozani qulflaydi.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Osilib qolgan yozuv holatida 4 soat davomida nechta YANGI mutatsiya
 * navbatga qo'shilishini sanaydi (taymer har 60 soniyada yonadi).
 */
const osilganYozuvdaUrinishlar = ({ inFlightDarvozasi }) => {
  const TIK = 60_000;
  const DAVR = 4 * 60 * 60_000; // 4 soat — 12:00 dan 16:00 gacha
  let urinish = 0;
  let inFlight = false;
  let nextAttemptAt = 0;
  for (let now = 0; now <= DAVR; now += TIK) {
    const ruxsat = inFlightDarvozasi
      ? shouldRetryCloudWrite({ pending: true, inFlight, online: true, now, nextAttemptAt })
      // Eski mantiq: faqat `pending` va `online` tekshirilardi.
      : (true && true);
    if (!ruxsat) continue;
    urinish++;
    // Yozuv yuborildi va OSILIB QOLDI — hech qachon settle bo'lmaydi.
    inFlight = true;
  }
  return urinish;
};

describe('osilgan bulut yozuvi — qayta urinish halqasi', () => {
  it("eski mantiq 4 soatda yuzlab mutatsiya navbatga qo'shardi", () => {
    const eski = osilganYozuvdaUrinishlar({ inFlightDarvozasi: false });
    // Har daqiqada bitta: 4 soat = 241 ta. Kvota tiklanganda hammasi quyiladi.
    expect(eski).toBeGreaterThanOrEqual(240);
  });

  it("yangi darvoza bilan tabda ko'pi bilan BITTA kutayotgan yozuv qoladi", () => {
    const yangi = osilganYozuvdaUrinishlar({ inFlightDarvozasi: true });
    expect(yangi).toBe(1);
  });

  it('kamida 200 barobar kam yozuv — kvota halqasi uziladi', () => {
    const eski = osilganYozuvdaUrinishlar({ inFlightDarvozasi: false });
    const yangi = osilganYozuvdaUrinishlar({ inFlightDarvozasi: true });
    expect(eski / yangi).toBeGreaterThanOrEqual(200);
  });
});

describe('shouldRetryCloudWrite — darvoza shartlari', () => {
  const asos = { pending: true, inFlight: false, online: true, now: 1_000_000, nextAttemptAt: 0 };

  it('tasdiqlangan yozuvda qayta urinmaydi', () => {
    expect(shouldRetryCloudWrite({ ...asos, pending: false })).toBe(false);
  });

  it('ochiq yozuv borida yangisini YUBORMAYDI (asosiy tuzatish)', () => {
    expect(shouldRetryCloudWrite({ ...asos, inFlight: true })).toBe(false);
  });

  it('oflaynda urinmaydi', () => {
    expect(shouldRetryCloudWrite({ ...asos, online: false })).toBe(false);
  });

  it('backoff oynasi ochilmaguncha kutadi', () => {
    expect(shouldRetryCloudWrite({ ...asos, nextAttemptAt: asos.now + 1 })).toBe(false);
    expect(shouldRetryCloudWrite({ ...asos, nextAttemptAt: asos.now })).toBe(true);
  });

  it("hammasi joyida bo'lsa ruxsat beradi", () => {
    expect(shouldRetryCloudWrite(asos)).toBe(true);
  });
});

describe('nextRetryDelay — eksponensial backoff', () => {
  it('birinchi urinish asosiy kechikishda', () => {
    expect(nextRetryDelay(1)).toBe(RETRY_BASE_MS);
  });

  it('har muvaffaqiyatsizlikda ikkilanadi', () => {
    expect(nextRetryDelay(2)).toBe(RETRY_BASE_MS * 2);
    expect(nextRetryDelay(3)).toBe(RETRY_BASE_MS * 4);
    expect(nextRetryDelay(4)).toBe(RETRY_BASE_MS * 8);
  });

  it("shiftdan oshmaydi — cheksiz o'smaydi", () => {
    expect(nextRetryDelay(50)).toBe(RETRY_MAX_MS);
    expect(nextRetryDelay(1000)).toBe(RETRY_MAX_MS);
  });

  it('uzoq uzilishda soatiga bir necha urinishgacha tushadi', () => {
    // 15 daqiqalik shift = soatiga 4 ta urinish (eski: 60 ta).
    expect(60 * 60_000 / nextRetryDelay(99)).toBeLessThanOrEqual(4);
  });
});
