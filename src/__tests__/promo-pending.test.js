/**
 * Hamkor taklifining hayot sikli — `?promo=KOD` dan hisobgacha.
 *
 * Nega test kerak: 2026-09-02 gacha taklif QURILMA xotirasida (`localStorage`)
 * boshdan-oxir yashardi. Bir telefonni ikki kishi ishlatsa, havolani bosmagan
 * odam ham taklifni ko'rib, o'z ismi/ID/natijalarini begona ustozga ochib
 * qo'yishi mumkin edi — qaytarib bo'lmaydigan yo'l bilan. Endi `localStorage`
 * faqat login bo'lgunicha kuryer; shu topshirish mantiqi qulflanadi.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const updateDocMock = vi.fn();

vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db, col, id) => `${col}/${id}`,
  updateDoc: (...args) => updateDocMock(...args),
}));

const {
  savePendingPromoCode,
  readPendingPromo,
  bindPendingPromoToAccount,
  settlePendingPromoForAccount,
  isAccountPromoActive,
  snoozeAccountPromo,
  clearAccountPromo,
} = await import('../services/promo.js');

const KEY = 'iqro_pending_promo';
const DAY = 86400000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  updateDocMock.mockReset();
});

describe('kuryer — localStorage', () => {
  it('kod vaqt bilan saqlanadi va o\'qiladi', () => {
    savePendingPromoCode('MIRONSHOH');
    const pending = readPendingPromo();
    expect(pending.code).toBe('MIRONSHOH');
    expect(Date.now() - new Date(pending.at).getTime()).toBeLessThan(5000);
  });

  it('yaroqsiz kod umuman saqlanmaydi', () => {
    savePendingPromoCode('a b');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // 2026-09-02 gacha kalitda vaqtsiz, yalang'och kod qatori turardi. Bunday
  // yozuvni hisobga bog'lash mumkin emas: yoshi noma'lum, ya'ni qurilmada
  // hozir kirgan odam havolani bosgan odam ekaniga kafolat yo'q.
  it('ESKI format (yalang\'och qator) TASHLANADI', () => {
    localStorage.setItem(KEY, 'MIRONSHOH');
    expect(readPendingPromo()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // JSON.parse("12345") xato bermaydi — SON qaytaradi. "Obyektmi?" tekshiruvi
  // bo'lmasa, bu yozuv yangi format sifatida o'tib ketardi.
  it('ESKI format, faqat raqamlardan iborat kod ham TASHLANADI', () => {
    localStorage.setItem(KEY, '12345');
    expect(readPendingPromo()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('vaqtsiz obyekt ham TASHLANADI', () => {
    localStorage.setItem(KEY, JSON.stringify({ code: 'MIRONSHOH' }));
    expect(readPendingPromo()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('7 kundan eski taklif o\'chadi', () => {
    localStorage.setItem(KEY, JSON.stringify({ code: 'MIRONSHOH', at: daysAgo(8) }));
    expect(readPendingPromo()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('6 kunlik taklif hali yaroqli', () => {
    localStorage.setItem(KEY, JSON.stringify({ code: 'MIRONSHOH', at: daysAgo(6) }));
    expect(readPendingPromo().code).toBe('MIRONSHOH');
  });

  it('buzuq yozuv o\'chiriladi', () => {
    localStorage.setItem(KEY, JSON.stringify({ code: 'a b', at: daysAgo(1) }));
    expect(readPendingPromo()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('topshirish — qurilmadan hisobga', () => {
  it('kod hisobga yoziladi va qurilmadan o\'chadi', async () => {
    savePendingPromoCode('MIRONSHOH');
    const bound = await bindPendingPromoToAccount('uid-1');

    expect(bound).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [ref, payload] = updateDocMock.mock.calls[0];
    expect(ref).toBe('users/uid-1');
    expect(payload.pendingPromo.code).toBe('MIRONSHOH');
    expect(payload.pendingPromo.snoozeCount).toBe(0);
    // Eng muhimi: qurilmada iz qolmaydi — keyingi foydalanuvchi ko'rmaydi.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('yozuv xato bersa kod qurilmada QOLADI (keyingi seansda qayta urinish)', async () => {
    savePendingPromoCode('MIRONSHOH');
    updateDocMock.mockRejectedValueOnce(new Error('quota'));

    await expect(bindPendingPromoToAccount('uid-1')).rejects.toThrow('quota');
    expect(readPendingPromo().code).toBe('MIRONSHOH');
  });

  it('kuryer bo\'sh bo\'lsa yozuv qilinmaydi', async () => {
    expect(await bindPendingPromoToAccount('uid-1')).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

describe('hisobdagi taklif ko\'rsatiladimi', () => {
  it('yangi taklif — ha', () => {
    expect(isAccountPromoActive({ code: 'MIRONSHOH', at: daysAgo(1) })).toBe(true);
  });

  it('«Hozir emas» muddati tugamagan — yo\'q', () => {
    expect(isAccountPromoActive({
      code: 'MIRONSHOH', at: daysAgo(1),
      snoozedUntil: new Date(Date.now() + 3 * DAY).toISOString(),
    })).toBe(false);
  });

  it('«Hozir emas» muddati o\'tgan — yana ko\'rinadi', () => {
    expect(isAccountPromoActive({
      code: 'MIRONSHOH', at: daysAgo(9),
      snoozedUntil: daysAgo(2),
    })).toBe(true);
  });

  it('30 kundan eski taklif — yo\'q', () => {
    expect(isAccountPromoActive({ code: 'MIRONSHOH', at: daysAgo(31) })).toBe(false);
  });

  it('bo\'sh yoki buzuq — yo\'q', () => {
    expect(isAccountPromoActive(null)).toBe(false);
    expect(isAccountPromoActive({ code: 'a b' })).toBe(false);
  });

  // `at` bo'lmasa muddat tekshiruvi ishlamas va taklif abadiy yashardi.
  it('vaqtsiz yozuv — yo\'q', () => {
    expect(isAccountPromoActive({ code: 'MIRONSHOH' })).toBe(false);
  });
});

describe('«Hozir emas» — rad javob eshitiladi', () => {
  it('birinchi bosishda 7 kunga yashiriladi', async () => {
    const at = daysAgo(1);
    await snoozeAccountPromo('uid-1', { code: 'MIRONSHOH', at, snoozeCount: 0 });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.pendingPromo.snoozeCount).toBe(1);
    // Tug'ilgan sana o'zgarmaydi — aks holda har «Hozir emas» 30 kunlik
    // umumiy muddatni ham qayta boshlab yuborardi.
    expect(payload.pendingPromo.at).toBe(at);
    const days = (new Date(payload.pendingPromo.snoozedUntil) - Date.now()) / DAY;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  // Eski xulq: snooze bir kunlik edi va cheksiz takrorlanardi.
  it('ikkinchi bosishda taklif BUTUNLAY yopiladi', async () => {
    await snoozeAccountPromo('uid-1', { code: 'MIRONSHOH', at: daysAgo(8), snoozeCount: 1 });

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.pendingPromo).toBeNull();
  });

  it('qo\'shilgach taklif yopiladi', async () => {
    await clearAccountPromo('uid-1');
    expect(updateDocMock.mock.calls[0][1]).toEqual({ pendingPromo: null });
  });

  it('uid yo\'q bo\'lsa yozuv qilinmaydi', async () => {
    await clearAccountPromo(null);
    await snoozeAccountPromo(undefined, { code: 'MIRONSHOH' });
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════
//  AUDIT 2026-09-02 (3), B-1 — KURYER BEGONA HISOBGA O'TIB KETMASLIGI.
//
//  97fe582 kuryerni faqat YOZUV o'tgach tozalardi. Hisobda allaqachon taklif
//  bo'lsa topshirish umuman bajarilmasdi va kod localStorage'da 7 kun qolardi.
//  Keyin o'sha qurilmada pendingPromo si bo'lmagan boshqa hisob kirsa,
//  taklif UNGA tegardi — o'sha teshik, faqat boshqa yo'ldan.
// ════════════════════════════════════════════════════════════════════════
describe('B-1: kuryer hisob uchun yakunlanadi', () => {
  it('hisobda taklif YOQ — kod boglanadi va kuryer tozalanadi', async () => {
    savePendingPromoCode('MIRONSHOH');
    updateDocMock.mockResolvedValueOnce(undefined);

    const bound = await settlePendingPromoForAccount('uid-A', false);

    expect(bound).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('⚠️ hisobda taklif BOR — topshirilmaydi, LEKIN kuryer baribir tozalanadi', async () => {
    savePendingPromoCode('MIRONSHOH');

    const bound = await settlePendingPromoForAccount('uid-A', true);

    expect(bound).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
    // ENG MUHIM QATOR: kod qurilmada QOLMAYDI.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('toliq sahna: A otkazib yuboradi → B ga taklif TEGMAYDI', async () => {
    savePendingPromoCode('MIRONSHOH');

    // A kiradi — hisobida allaqachon taklif bor.
    await settlePendingPromoForAccount('uid-A', true);
    // A chiqadi, B kiradi — B da taklif yo'q.
    const boundForB = await settlePendingPromoForAccount('uid-B', false);

    expect(boundForB).toBe(false);   // kuryer bo'sh — bog'lanmadi
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('yozuv yiqilsa kuryer QOLADI — osha seansda qayta uriniladi', async () => {
    savePendingPromoCode('MIRONSHOH');
    updateDocMock.mockRejectedValueOnce(new Error('kvota'));

    await expect(settlePendingPromoForAccount('uid-A', false)).rejects.toThrow('kvota');
    // Bu ATAYLAB: tarmoq/kvota nosozligida taklif yo'qolmasin. Begona hisobga
    // o'tib ketmasligini chiqishdagi tozalash ta'minlaydi (AuthContext logout).
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('uid bolmasa hech narsa qilinmaydi', async () => {
    savePendingPromoCode('MIRONSHOH');
    expect(await settlePendingPromoForAccount(null, false)).toBe(false);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });
});
