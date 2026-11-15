import { describe, it, expect } from 'vitest';
import { looseQuestionKey, reconcileReviewDataWithBank } from '../utils/syncUserReviewCache';
import { questionKey } from '../engine/SmartQuestionEngine';

describe('syncUserReviewCache — Takrorlash va Xatolar keshini yangilash', () => {
  const freshBankList = [
    {
      id: 'chqbt_q1',
      category: 'chqbt',
      topicId: 1,
      q: "O'zbekiston Respublikasi Konstitutsiyasining 64-moddasiga ko'ra Vatan himoyasi har bir fuqaroning qanday vazifasidir?",
      opts: [
        "O'zbekiston Respublikasini himoya qilish — har bir fuqaroning burchidir",
        "Faqat shartnoma bo'yicha harbiy xizmatchilarning ixtiyoriy huquqidir",
        "Faqat favqulodda holat e'lon qilinganda yuzaga keladigan majburiyatdir",
        "Faqat oliy harbiy ta'lim muassasalari kursantlariga tegishli talabdir",
      ],
      correct: 0,
      explanation: "Konstitutsiyaning 64-moddasiga muvofiq Vatan himoyasi har bir fuqaroning muqaddas burchidir.",
    },
    {
      id: 'chqbt_q2',
      category: 'chqbt',
      topicId: 2,
      q: "AK-74 avtomatida o'q-dorilarni saqlash va uzatish uchun xizmat qiladigan qism nima deb ataladi?",
      opts: [
        "O'qdon (magazin) — 30 ta patron sig'imli",
        "Qaytarish mexanizmi va zatvor ramasi",
        "Stvol qutisi va gaz trubkasi",
        "Nishonga olish moslamasi va mufta",
      ],
      correct: 0,
      explanation: "O'qdon (magazin) 30 ta patronni joylashtirish va uzatish uchun xizmat qiladi.",
    },
  ];

  const buildMockBank = (list) => {
    const byId = new Map();
    const byKey = new Map();
    const byLoose = new Map();
    for (const bq of list) {
      if (bq.id) byId.set(bq.id, bq);
      if (bq.q) {
        byKey.set(questionKey(bq), bq);
        byLoose.set(looseQuestionKey(bq.q), bq);
      }
    }
    return { ready: true, list, byId, byKey, byLoose };
  };

  it("eski tahrirdagi (52-modda, magazin/kesilgan variant) spacedCards va mistakes yozuvlarini yangi savol matni hamda variantlariga sinxronlaydi", () => {
    const bank = buildMockBank(freshBankList);
    const oldQ1 = "O'zbekiston Respublikasi Konstitutsiyasining 52-moddasiga ko'ra Vatan himoyasi har bir fuqaroning qanday vazifasidir?";
    const state = {
      spacedCards: [
        {
          // ID yo'q (eski karta), matnida 52-modda va kesilgan variant
          qHash: questionKey({ q: oldQ1 }),
          topicId: 1,
          q: oldQ1,
          opts: ["Burchidir", "Huquqidir", "Majburiyatdir", "Talabdir"],
          correct: 0,
          level: 1,
          nextReview: Date.now() - 1000,
        },
        {
          // Bazadan butunlay o'chirilgan / almashtirilgan eski savol
          id: 'deleted_elementary_q',
          qHash: 'q_deleted_123',
          topicId: 1,
          q: "Avtomat necha qismdan iborat?",
          opts: ["5", "6", "7", "8"],
          correct: 2,
          level: 0,
          nextReview: Date.now() - 1000,
        },
      ],
      stats: {
        chqbt: {
          mistakes: [
            {
              qHash: questionKey({ q: oldQ1 }),
              topicId: 1,
              topic: 'Harbiy qonunchilik',
              question: oldQ1,
              opts: ["Burchidir", "Huquqidir", "Majburiyatdir", "Talabdir"],
              correct: "Burchidir",
              wrongCount: 2,
            },
            {
              id: 'deleted_elementary_q',
              qHash: 'q_deleted_123',
              topicId: 1,
              topic: 'Otish tayyorgarligi',
              question: "Avtomat necha qismdan iborat?",
              opts: ["5", "6", "7", "8"],
              correct: "7",
              wrongCount: 1,
            },
          ],
        },
      },
    };

    const res = reconcileReviewDataWithBank('chqbt', state, bank);
    expect(res.changed).toBe(true);
    // O'chirilgan eski savol olib tashlanib, faqat yangilangan savol qolishi kerak
    expect(res.spacedCards).toHaveLength(1);
    expect(res.spacedCards[0].id).toBe('chqbt_q1');
    expect(res.spacedCards[0].q).toContain('64-moddasiga');
    expect(res.spacedCards[0].opts[0]).toBe("O'zbekiston Respublikasini himoya qilish — har bir fuqaroning burchidir");
    expect(res.spacedCards[0].qHash).toBe(questionKey(freshBankList[0]));

    expect(res.mistakes).toHaveLength(1);
    expect(res.mistakes[0].id).toBe('chqbt_q1');
    expect(res.mistakes[0].question).toContain('64-moddasiga');
    expect(res.mistakes[0].opts[0]).toBe("O'zbekiston Respublikasini himoya qilish — har bir fuqaroning burchidir");
  });
});
