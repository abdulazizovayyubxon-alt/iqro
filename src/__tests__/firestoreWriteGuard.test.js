import { describe, it, expect } from 'vitest';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, doc, setDoc } from 'firebase/firestore';
import { summarizeTestResults } from '../engine/SmartQuestionEngine';
import { sanitizeForFirestore } from '../utils/firestoreSafe';

/**
 * UCHDAN-UCHGACHA REGRESSIYA TESTI — JURNAL TAHLILI 2026-08-28.
 *
 * Yuqoridagi sof funksiya testlaridan FARQI: bu yerda HAQIQIY Firestore SDK
 * ishlatiladi. `setDoc` ma'lumotni SINXRON tekshiradi va yaroqsiz qiymatda
 * xato Promise yaratilishidan OLDIN otiladi — ya'ni tarmoq ham, emulyator ham
 * kerak emas, validatsiya to'liq lokal kechadi.
 *
 * Nima qo'riqlanadi: `/exam` sahifasidagi savol obyekti UI ma'lumotini
 * (React elementi) ko'targan holatda ham, test yakuni natijasidan qurilgan
 * `userStats` yozuvi Firestore uchun YAROQLI bo'lishi shart.
 *
 * Bu test yiqilsa — 2026-08 dagi nosozlik qaytgan degani:
 *   «FIRESTORE INTERNAL ASSERTION FAILED (ID: 3029) CONTEXT: {"type":"symbol"}»
 *   164 crash, 59 foydalanuvchi, natija ekrani 0 ball, bulutga yozuv yo'q.
 */

const app = initializeApp({ apiKey: 'test-key', projectId: 'zehin-test' }, 'write-guard');
const db = initializeFirestore(app, { localCache: memoryLocalCache() });

/** ExamPage ilgari savolga aynan shunday obyekt biriktirardi (mockData.js) */
const reactElement = () => ({
  $$typeof: Symbol.for('react.element'),
  type: { $$typeof: Symbol.for('react.forward_ref'), displayName: 'Medal' },
  key: null,
  ref: null,
  props: { size: 20 },
  _owner: null,
});

const savol = (i, zaharli) => ({
  id: `q${i}`,
  q: `Savol ${i} — matni yetarlicha uzun bo'lishi uchun qo'shimcha so'zlar bor`,
  opts: ['A) bir', 'B) ikki', 'C) uch', 'D) tort'],
  correct: 0,
  explanation: `Izoh ${i}`,
  mnemonic: 'esda saqlash uchun',
  topicId: 1,
  category: 'chqbt',
  difficulty: 'Y2',
  topicName: 'Harbiy xizmat asoslari',
  ...(zaharli ? { topicIcon: reactElement() } : {}),
});

/** Firestore yozuvni QABUL QILADIMI? (sinxron validatsiya) */
const yozibKoradi = (data) => {
  try {
    setDoc(doc(db, 'userStats', 'u1'), data, { merge: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || String(e) };
  }
};

describe('userStats yozuvi — haqiqiy Firestore validatsiyasi', () => {
  it('MUAMMONI TASDIQLAYDI: React elementi yozuvni o\'ldiradi', () => {
    const r = yozibKoradi({ spacedCards: [{ qHash: 'h1', topicIcon: reactElement() }] });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('INTERNAL ASSERTION FAILED');
    expect(r.message).toContain('symbol');
  });

  it('summarizeTestResults zaharlangan savoldan TOZA karta yasaydi', () => {
    const savollar = [savol(0, true), savol(1, true)];
    // ikkalasiga ham NOTO'G'RI javob → og'ir SRS kartasi yaratiladi
    const res = summarizeTestResults(savollar, { 0: 1, 1: 1 }, [], 1, {});

    expect(res.updatedSpacedCards.length).toBeGreaterThan(0);
    for (const c of res.updatedSpacedCards) {
      expect('topicIcon' in c).toBe(false);
    }
    // Karta hamon render qilinadigan tanaga ega
    const ogir = res.updatedSpacedCards.find(c => c.q);
    expect(ogir).toBeTruthy();
    expect(ogir.opts).toHaveLength(4);
    expect(ogir.explanation).toBeTruthy();
  });

  it('zaharlangan savoldan qurilgan spacedCards Firestore uchun YAROQLI', () => {
    const savollar = [savol(0, true), savol(1, true), savol(2, true)];
    const res = summarizeTestResults(savollar, { 0: 1, 1: 1, 2: 0 }, [], 1, {});
    // Aynan shu yozuv 22 kun davomida yiqilardi
    expect(yozibKoradi({ spacedCards: res.updatedSpacedCards }).ok).toBe(true);
  });

  it("to'liq oqim: natija -> prepareStatsForSave quvuri -> Firestore QABUL QILADI", () => {
    const savollar = [savol(0, true), savol(1, true), savol(2, true)];
    const res = summarizeTestResults(savollar, { 0: 1, 1: 1, 2: 0 }, [], 1, {});

    const state = {
      spacedCards: res.updatedSpacedCards,
      stats: { chqbt: { mistakes: res.newMistakes, totalAnswered: 3 } },
      topicStats: res.topicDeltas || {},
    };

    // XOM holat hamon rad etiladi — LEKIN endi boshqa sabab bilan: xato
    // yozuvida `source: undefined` bor (savolda bu maydon yo'q edi). Bu
    // `undefined` sinfi, ya'ni Firestore ODDIY xato beradi va uni `.catch()`
    // ushlay oladi — assertion crash'i EMAS. Farqni test qayd etib qo'yadi.
    const xom = yozibKoradi(state);
    expect(xom.ok).toBe(false);
    expect(xom.message).toContain('undefined');
    expect(xom.message).not.toContain('INTERNAL ASSERTION');

    // `prepareStatsForSave` AYNAN shu qadamni bajaradi — va yozuv o'tadi.
    expect(yozibKoradi(sanitizeForFirestore(state)).ok).toBe(true);
  });

  it('sanitizeForFirestore ikkinchi qatlam sifatida ham yetarli', () => {
    // Kelajakda boshqa yo'ldan UI ma'lumoti sizib chiqsa ham yozuv o'lmasin
    const buzuq = {
      spacedCards: [{ qHash: 'h1', q: 'savol', kelajakdagiMaydon: reactElement() }],
      stats: { chqbt: { mistakes: [{ qHash: 'h2', belgi: Symbol('x') }] } },
    };
    expect(yozibKoradi(buzuq).ok).toBe(false);              // himoyasiz — yiqiladi
    expect(yozibKoradi(sanitizeForFirestore(buzuq)).ok).toBe(true);   // himoya bilan — o'tadi
  });
});
