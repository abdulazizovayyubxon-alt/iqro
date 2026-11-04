import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Maktab logopediyasi platforma integratsiyasi', () => {
  const maktabLogopedTopics = TOPICS.filter(t => t.category === 'maktab_logoped');
  const maktabLogopedTopicIds = maktabLogopedTopics.map(t => t.id);

  it('maktab_logoped fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud', () => {
    const subject = SUBJECTS.find(s => s.id === 'maktab_logoped');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Maktab logopediyasi");
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('maktab_logoped')).toBe(true);
    expect(subject.group).toBe('school');
    expect(subject.desc).toBeTruthy();
    expect(subject.icon).toBeDefined();
  });

  it('maktab_logoped bo\'limlari aynan 7 ta (239 dan 245 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(maktabLogopedTopics.length).toBe(7);
    expect(maktabLogopedTopicIds).toEqual([239, 240, 241, 242, 243, 244, 245]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of maktabLogopedTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 7 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(maktabLogopedTopicIds)).toBe(true);
    const totalQuestions = maktabLogopedTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('maktab_logoped'));
  });

  it('mutaxassislik bo\'limlari (239–243) aynan 35 ta savol beradi', () => {
    const specIds = maktabLogopedTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([239, 240, 241, 242, 243]);
    expect(EXAM_BLUEPRINT[239]).toBe(5);
    expect(EXAM_BLUEPRINT[240]).toBe(8);
    expect(EXAM_BLUEPRINT[241]).toBe(10);
    expect(EXAM_BLUEPRINT[242]).toBe(4);
    expect(EXAM_BLUEPRINT[243]).toBe(8);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (244 kasb standarti: 5, 245 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = maktabLogopedTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([244, 245]);
    expect(EXAM_BLUEPRINT[244]).toBe(5);
    expect(EXAM_BLUEPRINT[245]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('maktab_logoped fani audiensiyasi va imtihon vaqti to\'g\'ri sozlangan', () => {
    expect(audienceOfSubject('maktab_logoped')).toBe('school');
    expect(examDurationMin('maktab_logoped')).toBe(90);
  });

  it('i18n onboarding va sarlavhalar barcha 3 tilda (uz, ru, en) mavjud', () => {
    expect(uz.onboarding.subjects.maktab_logoped?.title).toBe("Maktab logopediyasi");
    expect(ru.onboarding.subjects.maktab_logoped?.title).toBeTruthy();
    expect(en.onboarding.subjects.maktab_logoped?.title).toBeTruthy();
  });

  it('questions_maktab_logoped.json mavjud, to\'liq 500 ta savol va to\'liq 5-lock standartiga mos', () => {
    const filePath = 'src/data/questions_maktab_logoped.json';
    expect(fs.existsSync(filePath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(questions.length).toBe(500);

    const topicCounts = {};
    const hashes = new Set();
    const ids = new Set();
    const dist = [0, 0, 0, 0];

    questions.forEach((q, idx) => {
      expect(q.id).toBe(`maktab_logoped_${idx + 1}`);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);

      expect(q.category).toBe('maktab_logoped');
      expect(q.topicId).toBeGreaterThanOrEqual(239);
      expect(q.topicId).toBeLessThanOrEqual(245);
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

    expect(topicCounts[239]).toBe(60);
    expect(topicCounts[240]).toBe(80);
    expect(topicCounts[241]).toBe(90);
    expect(topicCounts[242]).toBe(50);
    expect(topicCounts[243]).toBe(80);
    expect(topicCounts[244]).toBe(50);
    expect(topicCounts[245]).toBe(90);

    // Balanslangan variantlar
    for (const count of dist) {
      expect(count).toBeGreaterThanOrEqual(120);
      expect(count).toBeLessThanOrEqual(130);
    }
  });
});
