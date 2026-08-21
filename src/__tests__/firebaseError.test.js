import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describeFirebaseError, withWriteTimeout, TIMEOUT_CODE } from '../utils/firebaseError';

// ════════════════════════════════════════════════════════════════════════
//  2026-08-20 HODISASI: admin panelda Pro berish ishlamadi. Panel esa
//  «Xatolik yuz berdi» deb turardi — sabab ko'rsatilmagan. Haqiqiy sabab:
//  loyihaning Firestore yozuv kvotasi tugagan edi (`resource-exhausted`),
//  ya'ni ilovada BITTA ham yozuv o'tmayotgan edi.
//
//  Undan ham yomoni: kvota tugaganda Firestore SDK promise'ni RAD ETMAYDI
//  (cheksiz qayta uradi), demak `catch` umuman ishga tushmaydi va tugma
//  abadiy aylanadi. Pastdagi testlar ikkalasini ham qo'riqlaydi.
// ════════════════════════════════════════════════════════════════════════

const err = (code) => Object.assign(new Error('xom matn'), { code });

describe('describeFirebaseError — sabab aytilishi kerak', () => {
  it('kvota tugashini ochiq aytadi va tugma aybdor emasligini bildiradi', () => {
    const msg = describeFirebaseError(err('resource-exhausted'));
    expect(msg).toContain('kvota');
    // Eng muhim jihat: bu tugmaning nosozligi emasligi aytilishi kerak —
    // aynan shu chalkashlik 2026-08-20 da soatlarni yedi.
    expect(msg).toMatch(/tugmaning nosozligi emas/i);
  });

  it('`firestore/` prefiksli kodni ham tanidi', () => {
    // Firestore ba'zan kodni `firestore/permission-denied` ko'rinishida beradi
    expect(describeFirebaseError(err('firestore/permission-denied')))
      .toBe(describeFirebaseError(err('permission-denied')));
  });

  it('permission-denied rules deploy qilinmaganini eslatadi', () => {
    expect(describeFirebaseError(err('permission-denied'))).toContain('firestore:rules');
  });

  it('tanish kodlar uchun XOM matn qaytmaydi', () => {
    for (const code of [
      'resource-exhausted', 'permission-denied', 'unauthenticated', 'unavailable',
      'deadline-exceeded', 'not-found', 'already-exists', 'failed-precondition',
      'invalid-argument', 'aborted', 'cancelled', TIMEOUT_CODE,
    ]) {
      const msg = describeFirebaseError(err(code));
      expect(msg).not.toContain('xom matn');
      expect(msg.length).toBeGreaterThan(15);
    }
  });

  it('notanish kodda xato matnini qaytaradi — «Xatolik yuz berdi» dan foydali', () => {
    expect(describeFirebaseError(err('allaqachon-yoq-kod'))).toContain('xom matn');
  });

  it('kodsiz/bo\'sh xatoda ham yiqilmaydi', () => {
    expect(() => describeFirebaseError(null)).not.toThrow();
    expect(() => describeFirebaseError(undefined)).not.toThrow();
    expect(() => describeFirebaseError({})).not.toThrow();
    expect(describeFirebaseError({})).toMatch(/aniqlanmadi/);
  });
});

describe('withWriteTimeout — abadiy aylanadigan spinnerga qarshi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muvaffaqiyatli yozuvni o\'zgartirmasdan o\'tkazadi', async () => {
    await expect(withWriteTimeout(Promise.resolve('ok'), 5000)).resolves.toBe('ok');
  });

  it('haqiqiy xatoni o\'z holida qaytaradi (timeout bilan almashtirmaydi)', async () => {
    const original = err('permission-denied');
    await expect(withWriteTimeout(Promise.reject(original), 5000)).rejects.toBe(original);
  });

  it('HECH QACHON tugamaydigan promise timeout bilan rad etiladi', async () => {
    // Kvota tugagan holatning aynan modeli: Firestore promise'i settle bo'lmaydi.
    const hangs = new Promise(() => {});
    const p = withWriteTimeout(hangs, 12000);
    const assertion = expect(p).rejects.toMatchObject({ code: TIMEOUT_CODE });
    await vi.advanceTimersByTimeAsync(12000);
    await assertion;
  });

  it('timeout xabari o\'zgarish saqlanmaganini ogohlantiradi', () => {
    const msg = describeFirebaseError(err(TIMEOUT_CODE));
    expect(msg).toContain('SAQLANMAGAN');
    expect(msg).toContain('kvota');
  });

  it('chegaradan oldin tugagan yozuv timeoutga tushmaydi', async () => {
    const p = withWriteTimeout(Promise.resolve('tez'), 12000);
    await vi.advanceTimersByTimeAsync(11999);
    await expect(p).resolves.toBe('tez');
  });
});
