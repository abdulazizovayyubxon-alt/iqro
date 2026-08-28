import { describe, it, expect } from 'vitest';
import { sanitizeForFirestore, asPromise } from '../utils/firestoreSafe';
import { heavyCardBody } from '../engine/SmartQuestionEngine';

/**
 * JURNAL TAHLILI 2026-08-28 — NEGA BU TESTLAR BOR.
 *
 * Jurnaldagi 198 yozuvning 164 tasi (83%) bitta xato edi:
 *   «FIRESTORE INTERNAL ASSERTION FAILED (ID: 3029) CONTEXT: {"type":"symbol"}»
 *
 * Sabab: ExamPage savolga `topicIcon` (React elementi) biriktirardi, u SRS
 * kartasi orqali `state.spacedCards` ga, undan `userStats` yozuviga tushardi.
 * React elementining `$$typeof` maydoni — Symbol, Firestore esa uni xato
 * XABARIDA ham tavsiflay olmaydi va ichki assertion tashlaydi.
 *
 * Xato SINXRON otiladi, ya'ni `.catch()` uni ushlay olmaydi: yozuv jimgina
 * yo'qolardi va imtihon natijasi ekrani 0 ball ko'rsatardi.
 *
 * Uch qatlam himoya sinaladi:
 *   1. `heavyCardBody`  — manba: UI maydoni kartaga UMUMAN tushmaydi;
 *   2. `sanitizeForFirestore` — to'siq: tushib qolsa ham yozuvni o'ldirmaydi;
 *   3. `asPromise`     — sinxron xato `.catch()` ga yetib boradi.
 */

// React elementining prod'dagi shakli (React.createElement natijasi)
const reactElement = () => ({
  $$typeof: Symbol.for('react.element'),
  type: { $$typeof: Symbol.for('react.forward_ref'), displayName: 'Medal' },
  key: null,
  ref: null,
  props: { size: 20 },
  _owner: null,
});

describe('sanitizeForFirestore', () => {
  it('React elementini BUTUNLAY tashlaydi (qoldiq ham qolmaydi)', () => {
    const out = sanitizeForFirestore({ qHash: 'h1', topicIcon: reactElement() });
    expect(out).toEqual({ qHash: 'h1' });
    expect('topicIcon' in out).toBe(false);
  });

  it('massiv ichidagi kartadan React elementini tozalaydi (haqiqiy hodisa shakli)', () => {
    const state = {
      spacedCards: [
        { qHash: 'h1', q: 'savol', opts: ['a', 'b'], topicIcon: reactElement() },
        { qHash: 'h2', q: 'ikkinchi' },
      ],
    };
    const out = sanitizeForFirestore(state);
    expect(out.spacedCards).toHaveLength(2);
    expect(out.spacedCards[0]).toEqual({ qHash: 'h1', q: 'savol', opts: ['a', 'b'] });
    expect(JSON.stringify(out)).not.toContain('topicIcon');
  });

  it('symbol, function va bigint qiymatlarini tashlaydi', () => {
    const out = sanitizeForFirestore({
      a: 1, s: Symbol('x'), f: () => {}, b: 10n, ok: 'qoladi',
    });
    expect(out).toEqual({ a: 1, ok: 'qoladi' });
  });

  it("undefined'ni tashlaydi, lekin null, 0, '' va false ni SAQLAYDI", () => {
    const out = sanitizeForFirestore({ u: undefined, n: null, z: 0, e: '', f: false });
    expect(out).toEqual({ n: null, z: 0, e: '', f: false });
  });

  it('massivdan yaroqsiz elementni olib tashlaydi, tartibni buzmaydi', () => {
    expect(sanitizeForFirestore({ a: [1, undefined, 2, Symbol('x'), 3] }).a).toEqual([1, 2, 3]);
  });

  it('sentinel/maxsus obyektlarga TEGMAYDI (deleteField, Date)', () => {
    class FieldValueSentinel { constructor() { this._methodName = 'deleteField'; } }
    const sentinel = new FieldValueSentinel();
    const d = new Date('2026-08-28T00:00:00.000Z');
    const out = sanitizeForFirestore({ eski: sentinel, sana: d });
    expect(out.eski).toBe(sentinel);   // aynan o'sha nusxa
    expect(out.sana).toBe(d);
  });

  it('chuqur ichma-ich joylashgan symbol ham topiladi', () => {
    const out = sanitizeForFirestore({ a: { b: { c: [{ d: Symbol('x'), e: 5 }] } } });
    expect(out.a.b.c[0]).toEqual({ e: 5 });
  });

  it("hech qachon xato tashlamaydi — yozuv har doim yaroqli bo'ladi", () => {
    expect(() => sanitizeForFirestore(Symbol('butun qiymat'))).not.toThrow();
    expect(sanitizeForFirestore(Symbol('x'))).toEqual({});
  });
});

describe('heavyCardBody — manbadagi himoya', () => {
  const savol = {
    q: 'Savol matni', opts: ['A) bir', 'B) ikki'], correct: 1,
    explanation: 'Izoh', isHtml: false, image: '/x.png', topicId: 3,
    // ── kartaga TUSHMASLIGI kerak bo'lganlar ──
    topicIcon: reactElement(),
    topicName: 'Mavzu', category: 'chqbt', difficulty: 'Y2',
    id: 'q123', createdAt: '2026-01-01', mnemonic: 'esda', source: 'kitob',
  };

  it('React elementini kartaga KO\'CHIRMAYDI', () => {
    expect('topicIcon' in heavyCardBody(savol, 'h1', -1)).toBe(false);
  });

  it('render uchun kerakli maydonlarni saqlaydi', () => {
    const c = heavyCardBody(savol, 'h1', -1);
    expect(c).toMatchObject({
      qHash: 'h1', topicId: 3, q: 'Savol matni', correct: 1,
      explanation: 'Izoh', isHtml: false, image: '/x.png',
    });
    expect(c.opts).toEqual(['A) bir', 'B) ikki']);
  });

  it('hujjatni shishiradigan ortiqcha maydonlarni tashlaydi', () => {
    const c = heavyCardBody(savol, 'h1', -1);
    for (const k of ['topicName', 'category', 'difficulty', 'id', 'createdAt', 'mnemonic', 'source']) {
      expect(k in c).toBe(false);
    }
  });

  it('savolda topicId bo\'lmasa zaxira qiymatni oladi', () => {
    expect(heavyCardBody({ q: 'x' }, 'h9', 7).topicId).toBe(7);
  });

  it('mavjud bo\'lmagan ixtiyoriy maydon uchun bo\'sh kalit qo\'shmaydi', () => {
    const c = heavyCardBody({ q: 'x', opts: [], correct: 0 }, 'h1', 1);
    expect('image' in c).toBe(false);
    expect('svg' in c).toBe(false);
  });
});

describe('asPromise — sinxron xato .catch() ga yetadi', () => {
  it('sinxron throw rad etilgan Promise ga aylanadi', async () => {
    await expect(asPromise(() => { throw new Error('INTERNAL ASSERTION FAILED'); }))
      .rejects.toThrow('INTERNAL ASSERTION FAILED');
  });

  it('oddiy holatda qiymatni o\'zgartirmasdan qaytaradi', async () => {
    await expect(asPromise(() => Promise.resolve('ok'))).resolves.toBe('ok');
    await expect(asPromise(() => 'sinxron qiymat')).resolves.toBe('sinxron qiymat');
  });

  it('himoyasiz chaqiruvda .catch() ISHLAMASLIGINI ko\'rsatadi (regressiya isboti)', () => {
    const buzuq = () => { throw new Error('sinxron'); };
    // `.catch()` yozilgan bo'lsa ham xato yuqoriga uchadi — aynan shu 164 crash sababi
    expect(() => buzuq().catch(() => {})).toThrow('sinxron');
  });
});
