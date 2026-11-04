import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — Iqtisodiy bilim asoslari platforma integratsiyasi', () => {
  const iqtisodTopics = TOPICS.filter(t => t.category === 'iqtisod');
  const iqtisodTopicIds = iqtisodTopics.map(t => t.id);

  it('iqtisod fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud', () => {
    const subject = SUBJECTS.find(s => s.id === 'iqtisod');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("Iqtisodiy bilim asoslari");
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('iqtisod')).toBe(true);
    expect(subject.group).toBe('school');
    expect(subject.desc).toBeTruthy();
    expect(subject.icon).toBeDefined();
  });

  it('iqtisod bo\'limlari aynan 8 ta (231 dan 238 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(iqtisodTopics.length).toBe(8);
    expect(iqtisodTopicIds).toEqual([231, 232, 233, 234, 235, 236, 237, 238]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of iqtisodTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 8 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(iqtisodTopicIds)).toBe(true);
    const totalQuestions = iqtisodTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('iqtisod'));
  });

  it('mutaxassislik bo\'limlari (231–236) aynan 35 ta savol beradi', () => {
    const specIds = iqtisodTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([231, 232, 233, 234, 235, 236]);
    expect(EXAM_BLUEPRINT[231]).toBe(7);
    expect(EXAM_BLUEPRINT[232]).toBe(3);
    expect(EXAM_BLUEPRINT[233]).toBe(7);
    expect(EXAM_BLUEPRINT[234]).toBe(7);
    expect(EXAM_BLUEPRINT[235]).toBe(6);
    expect(EXAM_BLUEPRINT[236]).toBe(5);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (237 kasb standarti: 5, 238 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = iqtisodTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([237, 238]);
    expect(EXAM_BLUEPRINT[237]).toBe(5);
    expect(EXAM_BLUEPRINT[238]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('iqtisod fani audiensiyasi va imtihon vaqti to\'g\'ri sozlangan', () => {
    expect(audienceOfSubject('iqtisod')).toBe('school');
    expect(examDurationMin('iqtisod')).toBe(90);
  });

  it('i18n onboarding va sarlavhalar barcha 3 tilda (uz, ru, en) mavjud', () => {
    expect(uz.onboarding.subjects.iqtisod?.title).toBe("Iqtisodiy bilim asoslari");
    expect(ru.onboarding.subjects.iqtisod?.title).toBeTruthy();
    expect(en.onboarding.subjects.iqtisod?.title).toBeTruthy();
  });

  it('questions_iqtisod.json mavjud, to\'liq 530 ta savol va to\'liq 5-lock standartiga mos', () => {
    const filePath = 'src/data/questions_iqtisod.json';
    expect(fs.existsSync(filePath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(questions.length).toBe(530);

    const topicCounts = {};
    const hashes = new Set();
    const ids = new Set();
    const dist = [0, 0, 0, 0];

    questions.forEach((q, idx) => {
      expect(q.id).toBe(`iqtisod_${idx + 1}`);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);

      expect(q.category).toBe('iqtisod');
      expect(q.topicId).toBeGreaterThanOrEqual(231);
      expect(q.topicId).toBeLessThanOrEqual(238);
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

    expect(topicCounts[231]).toBe(70);
    expect(topicCounts[232]).toBe(45);
    expect(topicCounts[233]).toBe(80);
    expect(topicCounts[234]).toBe(80);
    expect(topicCounts[235]).toBe(70);
    expect(topicCounts[236]).toBe(60);
    expect(topicCounts[237]).toBe(50);
    expect(topicCounts[238]).toBe(75);

    // Balanslangan variantlar
    for (const count of dist) {
      expect(count).toBeGreaterThanOrEqual(125);
      expect(count).toBeLessThanOrEqual(140);
    }
  });
});
