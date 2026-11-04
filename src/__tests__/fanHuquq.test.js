import { describe, it, expect } from 'vitest';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Davlat va huquq asoslari platforma integratsiyasi', () => {
  const huquqTopics = TOPICS.filter(t => t.category === 'huquq');
  const huquqTopicIds = huquqTopics.map(t => t.id);

  it('huquq fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud va test rejimida', () => {
    const subject = SUBJECTS.find(s => s.id === 'huquq');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Davlat va huquq asoslari");
    expect(subject.group).toBe('school');
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('huquq')).toBe(true);
  });

  it('huquq bo\'limlari aynan 11 ta (212 dan 222 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(huquqTopics.length).toBe(11);
    expect(huquqTopicIds).toEqual([212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of huquqTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 11 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(huquqTopicIds)).toBe(true);
    const totalQuestions = huquqTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('huquq'));
  });

  it('mutaxassislik bo\'limlari (212–220) aynan 35 ta savol beradi', () => {
    const specIds = huquqTopicIds.filter(id => !isPedBlockTopic(id));
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (221 kasb standarti: 5, 222 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = huquqTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([221, 222]);
    expect(EXAM_BLUEPRINT[221]).toBe(5);
    expect(EXAM_BLUEPRINT[222]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('imtihon davomiyligi rasmiy spetsifikatsiyaga mos ravishda 90 daqiqa', () => {
    expect(examDurationMin('huquq')).toBe(90);
  });

  it('maktab fani bo\'lgani uchun pedagogik yo\'nalish "school" bo\'ladi', () => {
    expect(audienceOfSubject('huquq')).toBe('school');
  });

  it('barcha tillarda (uz, ru, en) onboarding matnlari va test rejim nishonlari mavjud', () => {
    expect(uz.onboarding.subjects.huquq?.title).toBe("Davlat va huquq asoslari");
    expect(ru.onboarding.subjects.huquq?.title).toBe("Основы государства и права");
    expect(en.onboarding.subjects.huquq?.title).toBe("Basics of State and Law");
    expect(uz.common.testModeBadge).toBe("Test rejimida");
    expect(ru.common.testModeBadge).toBe("Тестовый режим");
    expect(en.common.testModeBadge).toBe("Test mode");
  });

  it('questions_huquq.json mavjud, to\'liq 560 ta savol (barcha 11 ta mavzu) va to\'liq 5-lock standartiga mos', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/data/questions_huquq.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(questions.length).toBe(560);

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

    for (const q of questions) {
      expect(q.id).toBeDefined();
      expect(typeof q.id).toBe('string');
      expect(seenIds.has(q.id)).toBe(false);
      seenIds.add(q.id);

      expect(q.category).toBe('huquq');
      expect([212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222]).toContain(q.topicId);
      expect(Array.isArray(q.opts)).toBe(true);
      expect(q.opts.length).toBe(4);
      expect([0, 1, 2, 3]).toContain(q.correct);
      expect(q.explanation).toBeTruthy();
      expect(q.mnemonic).toBeTruthy();
      expect(q.qHash).toBeTruthy();
      expect(seenHashes.has(q.qHash)).toBe(false);
      seenHashes.add(q.qHash);

      // 5-Lock test
      const cIdx = q.correct;
      const cText = q.opts[cIdx];
      const cLen = cText.length;
      const minAllowed = Math.floor(cLen * 0.72);
      const maxAllowed = Math.ceil(cLen * 1.35);

      for (let i = 0; i < 4; i++) {
        if (i === cIdx) continue;
        const dText = q.opts[i];
        expect(dText.length).toBeGreaterThanOrEqual(minAllowed);
        expect(dText.length).toBeLessThanOrEqual(maxAllowed);
        expect(FORBIDDEN_DISTRACTOR_RE.test(dText)).toBe(false);
      }
    }
  });
});
