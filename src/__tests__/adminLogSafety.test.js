import { describe, it, expect, beforeEach, vi } from 'vitest';

// ════════════════════════════════════════════════════════════════════════
//  AUDIT 2026-09-02 (2), A-3 — JURNAL YOZUVI ADMIN AMALINI BUZMASLIGI KERAK.
//
//  `logAdminAction` har admin amalidan KEYIN chaqiriladi — ya'ni baza
//  o'zgarishi ALLAQACHON bajarilgan bo'ladi. Agar u sinxron `throw` qilsa,
//  xato chaqiruvchining `try/catch` iga uchadi va admin «Xatolik: ...»
//  toast'ini ko'radi. Tabiiy xulosa — amal bajarilmadi, qayta bosaman.
//  Pro berish, rol berish yoki o'chirishda bu qimmatga tushadi.
//
//  Ikkita sinxron `throw` nuqtasi bor va ikkalasi ham `addDoc` promise'i
//  yaratilishidan OLDIN otiladi, ya'ni yozilgan `.catch()` ularni ushlay
//  olmasdi (to'liq izoh: src/utils/firestoreSafe.js:81).
// ════════════════════════════════════════════════════════════════════════

const addDocMock = vi.fn();

vi.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-1', email: 'admin@iqro.uz' } },
}));
vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  addDoc: (...args) => addDocMock(...args),
  serverTimestamp: () => 'SERVER_TS',
}));

const { logAdminAction } = await import('../services/adminLog.js');

beforeEach(() => {
  addDocMock.mockReset();
  addDocMock.mockResolvedValue({ id: 'log-1' });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('oddiy yo‘l', () => {
  it('yozuv yuboriladi va maydonlar joyida', async () => {
    logAdminAction('premium.grant', 'uid-42', { gacha: '2026-10-01' });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [col, payload] = addDocMock.mock.calls[0];
    expect(col).toBe('adminActions');
    expect(payload.type).toBe('premium.grant');
    expect(payload.target).toBe('uid-42');
    expect(payload.meta).toEqual({ gacha: '2026-10-01' });
    expect(payload.actorUid).toBe('admin-1');
    expect(payload.ts).toBe('SERVER_TS');
  });

  it('kirmagan holatda umuman yozilmaydi', async () => {
    const { auth } = await import('../firebase');
    const saved = auth.currentUser;
    auth.currentUser = null;
    logAdminAction('premium.grant', 'uid-42');
    expect(addDocMock).not.toHaveBeenCalled();
    auth.currentUser = saved;
  });

  it('uzun `target` kesiladi (jurnal hujjati arzon qolsin)', () => {
    logAdminAction('question.delete', 'x'.repeat(500));
    expect(addDocMock.mock.calls[0][1].target).toHaveLength(128);
  });
});

describe('⚠️ A-3: sinxron xato chaqiruvchiga UCHMAYDI', () => {
  it('sikl havolali `meta` — throw emas, jimgina ogohlantirish', async () => {
    const circular = { a: 1 };
    circular.self = circular;   // JSON.stringify shu yerda throw qiladi

    // ENG MUHIM TEKSHIRUV: chaqiruv YIQILMAYDI.
    expect(() => logAdminAction('premium.grant', 'uid-42', circular)).not.toThrow();

    // Yozuv ketmadi — bu to'g'ri: jurnal ikkinchi darajali.
    expect(addDocMock).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(console.warn).toHaveBeenCalled();
  });

  it('`BigInt` li `meta` ham oqimni uzmaydi', () => {
    expect(() => logAdminAction('tariff.save', 'yillik', { narx: 10n })).not.toThrow();
  });

  it('`addDoc` ning O‘ZI sinxron tashlasa ham ushlaladi', async () => {
    addDocMock.mockImplementationOnce(() => {
      // Firestore yaroqsiz turda AYNAN shunday qiladi: promise yaratilmaydi.
      throw new Error('FIRESTORE INTERNAL ASSERTION FAILED (ID: 3029)');
    });

    expect(() => logAdminAction('role.grant_admin', 'uid-9')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(console.warn).toHaveBeenCalled();
  });

  it('oddiy rad etish (rules deploy qilinmagan) ham ushlaladi', async () => {
    addDocMock.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'permission-denied' }));

    expect(() => logAdminAction('log.delete', 'err-1')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(console.warn).toHaveBeenCalled();
  });
});
