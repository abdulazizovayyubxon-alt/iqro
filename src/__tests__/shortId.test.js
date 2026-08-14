/**
 * formatShortId — qisqa foydalanuvchi ID formati.
 * Audit 19-band: 26 harf tugagach format buzilardi.
 *
 * ensureShortId — 2026-08-06 tekshiruvi: 22 hisobdan 20 tasi ID'siz qolgan edi.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { formatShortId, ensureShortId } = await import('../utils/shortId.js');
const { ensureShortIdAdmin } = await import('../../api/_shared.js');

describe('formatShortId — normal oraliq', () => {
  it('birinchi foydalanuvchi A0001', () => {
    expect(formatShortId(1)).toBe('A0001');
  });

  it('A harfining oxiri A9999', () => {
    expect(formatShortId(9999)).toBe('A9999');
  });

  it('keyingisi B0001 ga o\'tadi', () => {
    expect(formatShortId(10000)).toBe('B0001');
  });

  it('o\'rtadagi qiymat', () => {
    expect(formatShortId(5000)).toBe('A5000');
    expect(formatShortId(12345)).toBe('B2346');
  });

  it('Z harfining oxiri', () => {
    // 26 harf × 9999 = 259 974
    expect(formatShortId(259974)).toBe('Z9999');
  });
});

describe('formatShortId — 19-BAND: alifbo chegarasidan oshish', () => {
  // AVVAL: `String.fromCharCode(65 + letterIndex)` 26 dan oshganda `[`, `\`, `]`
  // kabi belgilar berardi — ID formati buzilardi.
  it('Z9999 dan keyin AA0001 ga o\'tadi, buzilmaydi', () => {
    expect(formatShortId(259975)).toBe('AA0001');
  });

  it('ikki harfli prefiks ham to\'g\'ri sanaydi', () => {
    expect(formatShortId(259975 + 9999)).toBe('AB0001');
  });

  it('chegaradan oshgan qiymatlar DOIM harf bilan boshlanadi', () => {
    for (const seq of [259975, 300000, 500000, 1_000_000, 5_000_000]) {
      const id = formatShortId(seq);
      expect(id).toMatch(/^[A-Z]{1,2}\d{4}$/);
    }
  });
});

describe('formatShortId — invariantlar', () => {
  it('raqam qismi DOIM 4 xonali va 0001..9999 oralig\'ida', () => {
    for (const seq of [1, 2, 9998, 9999, 10000, 99999, 259974, 259975, 400000]) {
      const id = formatShortId(seq);
      const digits = Number(id.slice(-4));
      expect(id.slice(-4)).toHaveLength(4);
      expect(digits).toBeGreaterThanOrEqual(1);
      expect(digits).toBeLessThanOrEqual(9999);
    }
  });

  it('ketma-ket seq → ketma-ket UNIKAL ID', () => {
    const ids = new Set();
    for (let seq = 9995; seq <= 10005; seq++) ids.add(formatShortId(seq));
    expect(ids.size).toBe(11); // dublikat yo'q
  });

  it('katta oraliqda ham dublikat bermaydi', () => {
    const ids = new Set();
    for (let seq = 259970; seq <= 259990; seq++) ids.add(formatShortId(seq));
    expect(ids.size).toBe(21);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 2026-08-14 TEKSHIRUVI — nega 99 hisobdan 17 tasi ID'siz qolgan edi
//
// Sabab zanjiri:
//   1) ID ni MIJOZ generatsiya qilardi — `meta/counters` bitta umumiy hujjat;
//   2) firestore.rules `userSeq == oldingi + 1` ni talab qilgani uchun mag'lub
//      tranzaksiya ABORTED emas, PERMISSION_DENIED olardi — SDK uni retry
//      QILMAYDI;
//   3) `catch → null` xatoni yutardi va ID faqat foydalanuvchi QAYTGANDA
//      to'ldirilardi. Qaytmaganlar ID'siz qolaverardi.
//
// Yechim: raqamni faqat server beradi (Admin SDK, qoidalardan ozod, raqobatda
// o'zi qayta urinadi), foydalanuvchi hujjati va hisoblagich BIR tranzaksiyada.
// Quyidagi testlar aynan shu invariantlarni qo'riqlaydi.
// ══════════════════════════════════════════════════════════════════════════

// Admin SDK tranzaksiyasining eng kichik soxta modeli.
function fakeDb(docs) {
  const store = new Map(Object.entries(docs));
  const writes = [];
  const refFor = (path) => ({
    path,
    get _data() { return store.get(path); },
  });
  const db = {
    writes,
    collection: (c) => ({ doc: (d) => refFor(`${c}/${d}`) }),
    runTransaction: async (fn) => fn({
      getAll: async (...refs) => refs.map((r) => ({
        exists: store.has(r.path),
        data: () => store.get(r.path),
      })),
      set: (ref, payload, opts) => {
        writes.push({ path: ref.path, payload, opts });
        store.set(ref.path, { ...(store.get(ref.path) || {}), ...payload });
      },
    }),
  };
  return db;
}

describe('ensureShortIdAdmin — ID berishning yagona nuqtasi (server)', () => {
  it('birinchi foydalanuvchiga A0001 beradi va hisoblagichni yaratadi', async () => {
    const db = fakeDb({ 'users/u1': { displayName: 'Test' } });

    await expect(ensureShortIdAdmin(db, 'u1')).resolves.toBe('A0001');
    expect(db.writes).toEqual([
      { path: 'meta/counters', payload: { userSeq: 1 }, opts: { merge: true } },
      { path: 'users/u1', payload: { shortId: 'A0001' }, opts: { merge: true } },
    ]);
  });

  it('hisoblagichni +1 oshiradi', async () => {
    const db = fakeDb({ 'users/u1': {}, 'meta/counters': { userSeq: 82 } });
    await expect(ensureShortIdAdmin(db, 'u1')).resolves.toBe('A0083');
  });

  it('MAVJUD ID ni qayta yozmaydi va hisoblagichga tegmaydi', async () => {
    // Foydalanuvchi ID sini allaqachon ko'rgan bo'lishi mumkin — u o'zgarmaydi.
    const db = fakeDb({ 'users/u1': { shortId: 'A0009' }, 'meta/counters': { userSeq: 82 } });

    await expect(ensureShortIdAdmin(db, 'u1')).resolves.toBe('A0009');
    expect(db.writes).toEqual([]);
  });

  it('hujjati yo\'q foydalanuvchida raqam SARFLAMAYDI', async () => {
    // Aks holda har bir yo'q hisob hisoblagichda "teshik" qoldirardi.
    const db = fakeDb({ 'meta/counters': { userSeq: 82 } });

    await expect(ensureShortIdAdmin(db, 'yoq')).resolves.toBe(null);
    expect(db.writes).toEqual([]);
  });

  it('hisoblagich va foydalanuvchi BIR tranzaksiyada yoziladi', async () => {
    // Ilgari ular alohida edi: raqam olinib, hujjat yozuvi yiqilsa raqam
    // yo'qolardi (ketma-ketlikda teshik).
    const db = fakeDb({ 'users/u1': {}, 'meta/counters': { userSeq: 5 } });
    await ensureShortIdAdmin(db, 'u1');

    expect(db.writes.map((w) => w.path)).toEqual(['meta/counters', 'users/u1']);
  });

  it('faqat `shortId` maydoniga tegadi (protectedUserFields buzilmaydi)', async () => {
    const db = fakeDb({ 'users/u1': { role: 'user', isPremium: false } });
    await ensureShortIdAdmin(db, 'u1');

    const userWrite = db.writes.find((w) => w.path === 'users/u1');
    expect(Object.keys(userWrite.payload)).toEqual(['shortId']);
    expect(userWrite.opts).toEqual({ merge: true });
  });

  it('uid bo\'lmasa hech narsa qilmaydi', async () => {
    const db = fakeDb({});
    await expect(ensureShortIdAdmin(db, '')).resolves.toBe(null);
    expect(db.writes).toEqual([]);
  });
});

describe('ensureShortId (mijoz) — serverdan so\'raydi, hisoblagichga TEGMAYDI', () => {
  const user = (uid = 'u1') => ({ uid, getIdToken: async () => 'token-123' });

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, shortId: 'A0005' }),
    }));
  });

  it('ID ni serverdan oladi va tokenni yuboradi', async () => {
    await expect(ensureShortId(user())).resolves.toBe('A0005');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('action=ensure-id');
    expect(opts.headers.Authorization).toBe('Bearer token-123');
  });

  it('bir uid uchun parallel chaqiruvlar BITTA so\'rovni baham ko\'radi', async () => {
    const u = user('poyga');
    const [a, b, c] = await Promise.all([ensureShortId(u), ensureShortId(u), ensureShortId(u)]);

    expect([a, b, c]).toEqual(['A0005', 'A0005', 'A0005']);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('server xato bersa TASHLAYDI (jimgina null qaytarmaydi)', async () => {
    // Chaqiruvchi `catch` bilan yozuvni o'tkazib yuboradi; ID'siz qolgani
    // esa kechasi cron-daily tomonidan to'ldiriladi.
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500 }));
    await expect(ensureShortId(user('xato'))).rejects.toThrow(/500/);
  });

  it('foydalanuvchi yo\'q bo\'lsa so\'rov ham yubormaydi', async () => {
    await expect(ensureShortId(null)).resolves.toBe(null);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('tugagach keyingi chaqiruv qayta so\'ray oladi', async () => {
    await ensureShortId(user('a'));
    await ensureShortId(user('b'));
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
