import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Defektologiya platforma integratsiyasi', () => {
  const defektologiyaTopics = TOPICS.filter(t => t.category === 'defektologiya');
  const defektologiyaTopicIds = defektologiyaTopics.map(t => t.id);

  it('defektologiya fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud', () => {
    const subject = SUBJECTS.find(s => s.id === 'defektologiya');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Defektologiya");
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('defektologiya')).toBe(true);
    expect(subject.group).toBe('school');
    expect(subject.desc).toBeTruthy();
    expect(subject.icon).toBeDefined();
  });

  it('defektologiya bo\'limlari aynan 8 ta (246 dan 253 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(defektologiyaTopics.length).toBe(8);
    expect(defektologiyaTopicIds).toEqual([246, 247, 248, 249, 250, 251, 252, 253]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of defektologiyaTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 8 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(defektologiyaTopicIds)).toBe(true);
    const totalQuestions = defektologiyaTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('defektologiya'));
  });

  it('mutaxassislik bo\'limlari (246–251) aynan 35 ta savol beradi', () => {
    const specIds = defektologiyaTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([246, 247, 248, 249, 250, 251]);
    expect(EXAM_BLUEPRINT[246]).toBe(8);
    expect(EXAM_BLUEPRINT[247]).toBe(4);
    expect(EXAM_BLUEPRINT[248]).toBe(8);
    expect(EXAM_BLUEPRINT[249]).toBe(4);
    expect(EXAM_BLUEPRINT[250]).toBe(5);
    expect(EXAM_BLUEPRINT[251]).toBe(6);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (252 kasb standarti: 5, 253 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = defektologiyaTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([252, 253]);
    expect(EXAM_BLUEPRINT[252]).toBe(5);
    expect(EXAM_BLUEPRINT[253]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('defektologiya fani audiensiyasi va imtihon vaqti to\'g\'ri sozlangan', () => {
    expect(audienceOfSubject('defektologiya')).toBe('school');
    expect(examDurationMin('defektologiya')).toBe(90);
  });

  it('i18n onboarding va sarlavhalar barcha 3 tilda (uz, ru, en) mavjud', () => {
    expect(uz.onboarding.subjects.defektologiya?.title).toBe("Defektologiya");
    expect(ru.onboarding.subjects.defektologiya?.title).toBe("Дефектология");
    expect(en.onboarding.subjects.defektologiya?.title).toBe("Defectology & Special Ed");
  });

  it('questions_defektologiya.json mavjud, to\'liq 520 ta savol va to\'liq 5-lock standartiga mos', () => {
    const filePath = 'src/data/questions_defektologiya.json';
    expect(fs.existsSync(filePath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(questions.length).toBe(520);

    const topicCounts = {};
    const hashes = new Set();
    const ids = new Set();
    const dist = [0, 0, 0, 0];

    questions.forEach((q, idx) => {
      expect(q.id).toBe(`defektologiya_${idx + 1}`);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);

      expect(q.category).toBe('defektologiya');
      expect(q.topicId).toBeGreaterThanOrEqual(246);
      expect(q.topicId).toBeLessThanOrEqual(253);
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

    expect(topicCounts[246]).toBe(70);
    expect(topicCounts[247]).toBe(60);
    expect(topicCounts[248]).toBe(70);
    expect(topicCounts[249]).toBe(60);
    expect(topicCounts[250]).toBe(60);
    expect(topicCounts[251]).toBe(60);
    expect(topicCounts[252]).toBe(50);
    expect(topicCounts[253]).toBe(90);

    // Balanslangan variantlar
    for (const count of dist) {
      expect(count).toBeGreaterThanOrEqual(120);
      expect(count).toBeLessThanOrEqual(140);
    }
  });
});
