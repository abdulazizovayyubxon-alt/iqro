import { describe, it, expect } from 'vitest';
import { mergeBundleQuestions, compactQuestion } from '../../api/notify-admin.js';

describe('mergeBundleQuestions — Admin delta-bundle data-loss himoyasi', () => {
  const baseList = [
    {
      id: 'chqbt_101',
      q: 'AK-74 avtomatining kalibri necha mm?',
      opts: ['A) 7,62 mm', 'B) 5,45 mm', 'C) 9 mm', 'D) 5,56 mm'],
      correct: 1,
      topicId: 2,
      category: 'chqbt',
      difficulty: 'medium',
      level: '2',
      explanation: 'AK-74 5,45 mm kalibrli patron ishlatadi.',
      mnemonic: '74 -> 5,45',
      image: '/images/ak74.webp',
      qHash: 'h_old',
    },
    {
      id: 'chqbt_102',
      q: 'Saf qadami tezligi daqiqasiga nechta?',
      opts: ['A) 90-100', 'B) 110-120', 'C) 130-140', 'D) 80-90'],
      correct: 1,
      topicId: 1,
      category: 'chqbt',
      explanation: 'Saf nizomiga binoan 110-120 qadam.',
    },
  ];

  it('qisman (partial) upsert mavjud savolning topicId, mnemonic, image va difficulty maydonlarini yo`qotmaydi', () => {
    // FixQuestionModal aynan shunday qisman patch yuborishi mumkin (Savollar tabi yuklanmagan bo'lsa)
    const partialPatch = {
      id: 'chqbt_101',
      q: 'AK-74M avtomatining kalibri necha millimetr?',
      opts: ['A) 7,62 mm', 'B) 5,45 mm', 'C) 9 mm', 'D) 5,56 mm'],
      correct: 1,
      explanation: 'AK-74 va AK-74M 5,45×39 mm patron ishlatadi.',
      qHash: 'h_new',
      topicId: undefined, // undefined mavjud qiymatni ustidan bosib yubormasligi shart!
    };

    const next = mergeBundleQuestions(baseList, [partialPatch], []);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual({
      id: 'chqbt_101',
      q: 'AK-74M avtomatining kalibri necha millimetr?',
      opts: ['A) 7,62 mm', 'B) 5,45 mm', 'C) 9 mm', 'D) 5,56 mm'],
      correct: 1,
      topicId: 2,
      category: 'chqbt',
      difficulty: 'medium',
      level: '2',
      explanation: 'AK-74 va AK-74M 5,45×39 mm patron ishlatadi.',
      mnemonic: '74 -> 5,45',
      image: '/images/ak74.webp',
      qHash: 'h_new',
    });
  });

  it('bo`sh satr (`image: ""` yoki `mnemonic: ""`) berilganda o`sha maydonni tozalaydi', () => {
    const clearImagePatch = {
      id: 'chqbt_101',
      image: '',
      mnemonic: '',
    };

    const next = mergeBundleQuestions(baseList, [clearImagePatch], []);
    expect(next[0].image).toBeUndefined();
    expect(next[0].mnemonic).toBeUndefined();
    expect(next[0].topicId).toBe(2);
    expect(next[0].q).toBe(baseList[0].q);
  });

  it('`deletes` yoki `status: "retired"` savollarni paketdan butunlay chiqarib tashlaydi', () => {
    const next = mergeBundleQuestions(
      baseList,
      [{ id: 'chqbt_101', status: 'retired' }],
      ['chqbt_102']
    );
    expect(next).toHaveLength(0);
  });

  it('yangi qo`shilgan savolni ixcham schemada ro`yxat oxiriga qo`shadi', () => {
    const newQuestion = {
      id: 'chqbt_103',
      q: 'PM pistoletining og`irligi qancha?',
      opts: ['A) 730 g', 'B) 810 g', 'C) 900 g', 'D) 650 g'],
      correct: '1',
      topicId: '2',
      category: 'chqbt',
      explanation: 'O`qlangan PM og`irligi 810 g.',
      extraFieldIgnored: 'keraksiz',
    };

    const next = mergeBundleQuestions(baseList, [newQuestion], []);
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual(compactQuestion(newQuestion));
    expect(next[2].correct).toBe(1);
    expect(next[2].topicId).toBe(2);
    expect(next[2].extraFieldIgnored).toBeUndefined();
  });
});
