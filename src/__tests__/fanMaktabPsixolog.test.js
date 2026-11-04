import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Maktab psixologi platforma integratsiyasi', () => {
  const maktabPsixologTopics = TOPICS.filter(t => t.category === 'maktab_psixolog');
  const maktabPsixologTopicIds = maktabPsixologTopics.map(t => t.id);

  it('maktab_psixolog fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud', () => {
    const subject = SUBJECTS.find(s => s.id === 'maktab_psixolog');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Maktab psixologi");
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('maktab_psixolog')).toBe(true);
    expect(subject.group).toBe('school');
    expect(subject.desc).toBeTruthy();
    expect(subject.icon).toBeDefined();
  });

  it('maktab_psixolog bo\'limlari aynan 8 ta (259 dan 266 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(maktabPsixologTopics.length).toBe(8);
    expect(maktabPsixologTopicIds).toEqual([259, 260, 261, 262, 263, 264, 265, 266]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of maktabPsixologTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 8 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(maktabPsixologTopicIds)).toBe(true);
    const totalQuestions = maktabPsixologTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('maktab_psixolog'));
  });

  it('mutaxassislik bo\'limlari (259–264) aynan 35 ta savol beradi', () => {
    const specIds = maktabPsixologTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([259, 260, 261, 262, 263, 264]);
    expect(EXAM_BLUEPRINT[259]).toBe(3);
    expect(EXAM_BLUEPRINT[260]).toBe(4);
    expect(EXAM_BLUEPRINT[261]).toBe(4);
    expect(EXAM_BLUEPRINT[262]).toBe(4);
    expect(EXAM_BLUEPRINT[263]).toBe(16);
    expect(EXAM_BLUEPRINT[264]).toBe(4);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (265 kasb standarti: 5, 266 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = maktabPsixologTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([265, 266]);
    expect(EXAM_BLUEPRINT[265]).toBe(5);
    expect(EXAM_BLUEPRINT[266]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('maktab_psixolog fani audiensiyasi va imtihon vaqti to\'g\'ri sozlangan', () => {
    expect(audienceOfSubject('maktab_psixolog')).toBe('school');
    expect(examDurationMin('maktab_psixolog')).toBe(90);
  });

  it('i18n onboarding va sarlavhalar barcha 3 tilda (uz, ru, en) mavjud', () => {
    expect(uz.onboarding.subjects.maktab_psixolog?.title).toBe("Maktab psixologi");
    expect(ru.onboarding.subjects.maktab_psixolog?.title).toBe("Школьный психолог");
    expect(en.onboarding.subjects.maktab_psixolog?.title).toBe("School Psychologist");
  });

  it('questions_maktab_psixolog.json mavjud, to\'liq 500 ta savol va to\'liq 5-lock standartiga mos', () => {
    const filePath = 'src/data/questions_maktab_psixolog.json';
    expect(fs.existsSync(filePath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(questions.length).toBe(500);

    const topicCounts = {};
    const hashes = new Set();
    const ids = new Set();
    const dist = [0, 0, 0, 0];

    questions.forEach((q, idx) => {
      expect(q.id).toBe(`maktab_psixolog_${idx + 1}`);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);

      expect(q.category).toBe('maktab_psixolog');
      expect(q.topicId).toBeGreaterThanOrEqual(259);
      expect(q.topicId).toBeLessThanOrEqual(266);
      topicCounts[q.topicId] = (topicCounts[q.topicId] || 0) + 1;

      expect(q.opts.length).toBe(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
      dist[q.correct]++;

      expect(q.explanation).toBeTruthy();
      expect(q.explanation.length).toBeGreaterThan(15);
      expect(q.mnemonic).toBeTruthy();
      expect(q.qHash).toBeTruthy();

      expect(hashes.has(q.qHash)).toBe(false);
      hashes.add(q.qHash);
    });

    expect(topicCounts[259]).toBe(30);
    expect(topicCounts[260]).toBe(40);
    expect(topicCounts[261]).toBe(40);
    expect(topicCounts[262]).toBe(40);
    expect(topicCounts[263]).toBe(160);
    expect(topicCounts[264]).toBe(40);
    expect(topicCounts[265]).toBe(50);
    expect(topicCounts[266]).toBe(100);

    // Balanslangan variantlar (har biri 125 tadan)
    for (const count of dist) {
      expect(count).toBe(125);
    }
  });
});
