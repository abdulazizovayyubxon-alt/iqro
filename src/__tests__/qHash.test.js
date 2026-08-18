import { describe, it, expect } from 'vitest';
import { qHashOf, normalizeQuestion } from '../utils/qHash';

/**
 * ADMIN UX AUDIT 2026-08-18, K-3 BAND.
 *
 * `qHash` importning dublikat tekshiruvini 47 000 o'qishdan ~7 so'rovga
 * tushiradi. Shu sababli u DETERMINISTIK bo'lishi shart: bir xil savol
 * matni har doim bir xil kalit berishi kerak, aks holda baza dublikatlar
 * bilan to'lib ketardi.
 */
describe('normalizeQuestion', () => {
  it('apostrof turlarini birlashtiradi', () => {
    // O'zbek matnlarida bir so'z turli klaviaturada turlicha yoziladi
    expect(normalizeQuestion("bo'lim")).toBe(normalizeQuestion('bo‘lim'));
    expect(normalizeQuestion('boʼlim')).toBe(normalizeQuestion('bo’lim'));
  });

  it('registr va ortiqcha probellarni tenglashtiradi', () => {
    expect(normalizeQuestion('  Savol   MATNI  ')).toBe('savol matni');
  });

  it("bo'sh qiymatlarda yiqilmaydi", () => {
    expect(normalizeQuestion(null)).toBe('');
    expect(normalizeQuestion(undefined)).toBe('');
    expect(normalizeQuestion('')).toBe('');
  });
});

describe('qHashOf', () => {
  it('deterministik — bir xil matn bir xil kalit', () => {
    const t = 'Jgut maksimal qancha vaqtga qo‘yiladi?';
    expect(qHashOf(t)).toBe(qHashOf(t));
  });

  it('faqat yozilishi farq qiladigan savollar BIR XIL kalit oladi', () => {
    expect(qHashOf("Bo'lim qaysi?")).toBe(qHashOf('Bo‘lim   QAYSI?'));
  });

  it('turli savollar turli kalit oladi', () => {
    expect(qHashOf('Birinchi savol matni')).not.toBe(qHashOf('Ikkinchi savol matni'));
  });

  it("bo'sh matn bo'sh kalit beradi (indeksga yozilmaydi)", () => {
    expect(qHashOf('')).toBe('');
    expect(qHashOf(null)).toBe('');
  });

  it('kalit qisqa va Firestore uchun xavfsiz', () => {
    const h = qHashOf('Ancha uzun savol matni, ichida tinish belgilari: bor!');
    expect(h.length).toBeLessThanOrEqual(12);
    expect(h).toMatch(/^[0-9a-z_]+$/);
  });

  it('haqiqiy hajmda to‘qnashuv kam (1000 ta savol)', () => {
    const seen = new Set();
    for (let i = 0; i < 1000; i++) seen.add(qHashOf(`Savol raqami ${i} — matn bilan`));
    expect(seen.size).toBe(1000);
  });
});
