import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import {
  cleanForDedup, dedupQuestions, prepareQuestions, PREPARE_CHUNK,
  getPreparedBank, peekPreparedBank, warmPreparedBank, countTopics, clearPreparedBank,
} from '../utils/questionBank';
import { processQuestionsOnTheFly } from '../utils/questionFixer';
import { questionKey } from '../engine/SmartQuestionEngine';

// ════════════════════════════════════════════════════════════════════════
//  2026-09-11: Bosh → Test o'tishi telefonda qotardi — TestPage va ExamPage
//  har ochilganda butun fan paketini qayta tozalardi (o'lchov
//  utils/questionBank.js boshida). Endi tayyor bank xotirada va bo'laklab
//  tayyorlanadi. Pastdagi testlar asosiy va'dani qo'riqlaydi: savollar
//  to'plami AYNAN oldingidek chiqadi. Ma'lumot — haqiqiy CHQBT fayli.
// ════════════════════════════════════════════════════════════════════════

const CHQBT = JSON.parse(fs.readFileSync('src/data/questions_chqbt.json', 'utf8'));

// 2026-09-11 gacha TestPage/ExamPage dagi takror tozalash — aynan shunday edi
const legacyDedup = (list) => {
  const seen = new Set();
  return list.filter((q) => {
    const core = cleanForDedup(q.q || '');
    if (!core) return true;
    if (seen.has(core)) return false;
    seen.add(core);
    return true;
  });
};

// processQuestionsOnTheFly moslashtirish savollarini tasodifiy aralashtiradi —
// solishtirish uchun ikkala yo'lda ham bir xil "tasodif".
let randomSpy;
beforeEach(() => {
  clearPreparedBank();
  randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.37);
});
afterEach(() => randomSpy.mockRestore());

describe('cleanForDedup — ko\'chirilgan, xulqi o\'zgarmagan', () => {
  it('mavzu prefiksi va savol kodini olib tashlaydi', () => {
    expect(cleanForDedup('[Mavzu: Nizom] Qorovul kim? (Savol kodi: #ab_1)')).toBe('qorovul kim?');
  });

  it('verguldan oldingi qisqa kirish qismini olib tashlaydi', () => {
    expect(cleanForDedup('Dars davomida, Konjunktiv II nima?')).toBe('konjunktiv ii nima?');
  });

  it('bo\'sh qiymatda bo\'sh satr', () => {
    expect(cleanForDedup(undefined)).toBe('');
  });
});

describe('prepareQuestions — bo\'laklab, lekin natija bir xil', () => {
  it('bir martalik tozalash bilan AYNAN bir xil (boshqa fan savoli tushib qoladi)', async () => {
    const mixed = [...CHQBT.slice(0, 600), { ...CHQBT[0], id: 'begona', category: 'art' }];
    const expected = processQuestionsOnTheFly(mixed.filter((q) => q.category === 'chqbt'));
    const got = await prepareQuestions(mixed, 'chqbt');
    expect(JSON.stringify(got)).toBe(JSON.stringify(expected));
  });

  it('har bo\'lakdan keyin asosiy oqimga navbat beradi (uzun vazifa yo\'q)', async () => {
    let yields = 0;
    const list = CHQBT.slice(0, PREPARE_CHUNK * 3 + 1);
    await prepareQuestions(list, 'chqbt', async () => { yields += 1; });
    expect(yields).toBe(3);
  });
});

describe('To\'plam oldingi yo\'l bilan bir xil', () => {
  it('Test: bo\'lim filtri tozalashdan KEYIN — natija o\'zgarmaydi', async () => {
    const topicId = 3;
    const legacy = legacyDedup(processQuestionsOnTheFly(
      CHQBT.filter((q) => q.topicId === topicId && q.category === 'chqbt')
    ));
    const bank = await prepareQuestions(CHQBT, 'chqbt');
    const now = dedupQuestions(bank.filter((q) => q.topicId === topicId && q.category === 'chqbt'));
    expect(now.length).toBeGreaterThan(0);
    expect(JSON.stringify(now)).toBe(JSON.stringify(legacy));
  });

  it('Imtihon: butun fan bo\'yicha takror tozalash bir xil', async () => {
    const legacy = legacyDedup(processQuestionsOnTheFly(CHQBT.filter((q) => q.category === 'chqbt')));
    const now = dedupQuestions(await prepareQuestions(CHQBT, 'chqbt'));
    expect(now.length).toBe(legacy.length);
    expect(JSON.stringify(now)).toBe(JSON.stringify(legacy));
  });

  it('takror bo\'lsa birinchisi qoladi', () => {
    const a = { q: 'Dars davomida, Qasamyod nima?' };
    const b = { q: 'Maktabda, Qasamyod nima?' };
    const c = { q: 'Boshqa savol?' };
    expect(dedupQuestions([a, b, c])).toEqual([a, c]);
  });
});

describe('getPreparedBank — seans keshi', () => {
  const ref = { cat: 'chqbt', version: 111 };
  const raw = CHQBT.slice(0, 300);

  it('ikkinchi chaqiruv o\'sha massivni darhol qaytaradi', async () => {
    const first = await getPreparedBank(ref, raw);
    expect(peekPreparedBank(ref)).toBe(first);
    expect(await getPreparedBank(ref, [])).toBe(first);
  });

  it('bir vaqtdagi chaqiruvlar bitta jarayonga qo\'shiladi', () => {
    expect(getPreparedBank(ref, raw)).toBe(getPreparedBank(ref, raw));
  });

  it('versiya o\'zgarsa eski bank ishlatilmaydi', async () => {
    const oldBank = await getPreparedBank(ref, raw);
    const next = { cat: 'chqbt', version: 112 };
    expect(peekPreparedBank(next)).toBeNull();
    const newBank = await getPreparedBank(next, CHQBT.slice(0, 50));
    expect(newBank).not.toBe(oldBank);
    expect(newBank.length).toBe(50);
    expect(peekPreparedBank(ref)).toBeNull();
  });

  it('bo\'sh natija keshlanmaydi (tarmoq xatosi seansga yopishib qolmasin)', async () => {
    expect(await getPreparedBank(ref, [])).toEqual([]);
    expect(peekPreparedBank(ref)).toBeNull();
  });

  it('oldindan tayyorlash jarayoniga keyingi chaqiruv qo\'shiladi', async () => {
    warmPreparedBank(ref, raw);
    const joined = await getPreparedBank(ref, []);
    expect(joined.length).toBe(300);
    expect(peekPreparedBank(ref)).toBe(joined);
  });
});

describe('countTopics', () => {
  it('faqat shu fan savollarini bo\'limlar bo\'yicha sanaydi', () => {
    const list = [
      { category: 'chqbt', topicId: 1 }, { category: 'chqbt', topicId: 1 },
      { category: 'chqbt', topicId: 2 }, { category: 'art', topicId: 1 },
    ];
    expect(countTopics(list, 'chqbt')).toEqual({ 1: 2, 2: 1 });
  });

  it('tayyor bank bo\'yicha sanoq xom paket bilan bir xil', async () => {
    const bank = await prepareQuestions(CHQBT, 'chqbt');
    expect(countTopics(bank, 'chqbt')).toEqual(countTopics(CHQBT, 'chqbt'));
  });
});

describe('questionKey keshi — o\'tishdagi smartSort tezligi uchun', () => {
  it('bir obyektga qayta chaqiruv o\'sha kalitni beradi; matni bir xil boshqa obyekt ham', () => {
    const a = { q: 'Harbiy qasamyod qachon qabul qilinadi?' };
    const b = { q: 'Harbiy  qasamyod qachon qabul qilinadi? (Savol kodi: #x1)' };
    expect(questionKey(a)).toBe(questionKey(a));
    expect(questionKey(b)).toBe(questionKey(a));
  });

  it('matni o\'zgargan YANGI obyekt yangi kalit oladi (kesh eskirmaydi)', () => {
    const a = { q: 'Birinchi matn' };
    const changed = { ...a, q: 'Ikkinchi matn' };
    expect(questionKey(a)).not.toBe(questionKey(changed));
  });

  it('obyekt bo\'lmagan kirishda ham ishlaydi', () => {
    expect(questionKey(undefined)).toBe(questionKey({ q: '' }));
  });
});
