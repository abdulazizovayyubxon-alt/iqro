import { describe, it, expect } from 'vitest';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Musiqa madaniyati platforma integratsiyasi', () => {
  const musiqaTopics = TOPICS.filter(t => t.category === 'musiqa');
  const musiqaTopicIds = musiqaTopics.map(t => t.id);

  it('musiqa fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud va test rejimida', () => {
    const subject = SUBJECTS.find(s => s.id === 'musiqa');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Musiqa madaniyati");
    expect(subject.group).toBe('school');
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('musiqa')).toBe(true);
  });

  it('musiqa bo\'limlari aynan 8 ta (223 dan 230 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(musiqaTopics.length).toBe(8);
    expect(musiqaTopicIds).toEqual([223, 224, 225, 226, 227, 228, 229, 230]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of musiqaTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 8 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(musiqaTopicIds)).toBe(true);
    const totalQuestions = musiqaTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('musiqa'));
  });

  it('mutaxassislik bo\'limlari (223–228) aynan 35 ta savol beradi', () => {
    const specIds = musiqaTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([223, 224, 225, 226, 227, 228]);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (229 kasb standarti: 5, 230 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = musiqaTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([229, 230]);
    expect(EXAM_BLUEPRINT[229]).toBe(5);
    expect(EXAM_BLUEPRINT[230]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('imtihon davomiyligi rasmiy spetsifikatsiyaga mos ravishda 90 daqiqa', () => {
    expect(examDurationMin('musiqa')).toBe(90);
  });

  it('maktab fani bo\'lgani uchun pedagogik yo\'nalish "school" bo\'ladi', () => {
    expect(audienceOfSubject('musiqa')).toBe('school');
  });

  it('barcha tillarda (uz, ru, en) onboarding matnlari va test rejim nishonlari mavjud', () => {
    expect(uz.onboarding.subjects.musiqa?.title).toBe("Musiqa madaniyati");
    expect(ru.onboarding.subjects.musiqa?.title).toBe("Музыкальная культура");
    expect(en.onboarding.subjects.musiqa?.title).toBe("Music Culture");
    expect(uz.common.testModeBadge).toBe("Test rejimida");
    expect(ru.common.testModeBadge).toBe("Тестовый режим");
    expect(en.common.testModeBadge).toBe("Test mode");
  });

  it('questions_musiqa.json mavjud, to\'liq 540 ta savol (barcha 8 ta mavzu) va to\'liq 5-lock standartiga mos', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/data/questions_musiqa.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(questions.length).toBe(540);

    const FORBIDDEN_DISTRACTOR_RE = new RegExp(
      [
        '\\bfaqat\\b',
        '\\bfaqatgina\\b',
        '\\bmutlaqo\\b',
        '\\bhech qachon\\b',
        '\\bhech qanday\\b',
        '\\bumuman\\b',
        '\\bdangasa\\b',
        '\\berinchoq\\b',
        '\\bzeriktiradi\\b',
        '\\bmenga nima\\b',
        '\\bjarima\\b',
        '\\bhaydab\\b',
        '\\byirtib\\b',
        '\\buxlashi\\b',
        '\\bdamborchi\\b',
        '\\brotmistonchi\\b',
        '\\bmoviqrang\\b',
        '\\bmotootqich\\b',
        'qonuniyatlariga binoan',
        'qoidalariga muvofiq',
        'uslubiy vositalari'
      ].join('|'),
      'i'
    );

    const seenIds = new Set();
    const seenHashes = new Set();
    const distCounts = [0, 0, 0, 0];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      expect(q.id).toBe(`musiqa_${i + 1}`);
      expect(seenIds.has(q.id)).toBe(false);
      seenIds.add(q.id);

      expect(typeof q.q).toBe('string');
      expect(q.q.length).toBeGreaterThanOrEqual(10);

      expect(Array.isArray(q.opts)).toBe(true);
      expect(q.opts.length).toBe(4);

      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
      distCounts[q.correct]++;

      expect(musiqaTopicIds).toContain(q.topicId);
      expect(q.category).toBe('musiqa');

      expect(q.explanation).toBeTruthy();
      expect(q.mnemonic).toBeTruthy();

      expect(q.qHash).toBeTruthy();
      expect(seenHashes.has(q.qHash)).toBe(false);
      seenHashes.add(q.qHash);

      const correctLen = q.opts[q.correct].length;
      const minLen = Math.floor(correctLen * 0.72);
      const maxLen = Math.ceil(correctLen * 1.35);

      for (let optIdx = 0; optIdx < 4; optIdx++) {
        const opt = q.opts[optIdx];
        expect(FORBIDDEN_DISTRACTOR_RE.test(opt)).toBe(false);
        if (optIdx !== q.correct) {
          expect(opt.length).toBeGreaterThanOrEqual(minLen);
          expect(opt.length).toBeLessThanOrEqual(maxLen);
        }
      }
    }

    // Javoblar balansi har bir variant (A, B, C, D) 20% dan 30% oralig'ida bo'lishi shart
    for (const count of distCounts) {
      const ratio = count / questions.length;
      expect(ratio).toBeGreaterThanOrEqual(0.20);
      expect(ratio).toBeLessThanOrEqual(0.30);
    }
  });
});
