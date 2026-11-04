import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBJECTS, TOPICS, isTestModeSubject } from '../data/mockData';
import { audienceOfSubject } from '../data/pedAudience';
import { EXAM_BLUEPRINT, isPedBlockTopic, hasBlueprint } from '../data/examBlueprint';
import { examTotal, examDurationMin } from '../config';
import uz from '../i18n/locales/uz.json';
import ru from '../i18n/locales/ru.json';
import en from '../i18n/locales/en.json';

describe('Fan 5 — MTT Musiqa rahbari platforma integratsiyasi', () => {
  const mttMusiqaTopics = TOPICS.filter(t => t.category === 'mtt_musiqa');
  const mttMusiqaTopicIds = mttMusiqaTopics.map(t => t.id);

  it('mtt_musiqa fani SUBJECTS ro\'yxatida to\'g\'ri parametrlar bilan mavjud', () => {
    const subject = SUBJECTS.find(s => s.id === 'mtt_musiqa');
    expect(subject).toBeDefined();
    expect(subject.name).toBe("MTT Musiqa rahbari");
    expect(subject.testMode).toBe(true);
    expect(isTestModeSubject('mtt_musiqa')).toBe(true);
    expect(subject.group).toBe('mtt');
    expect(subject.desc).toBeTruthy();
    expect(subject.icon).toBeDefined();
  });

  it('mtt_musiqa bo\'limlari aynan 5 ta (254 dan 258 gacha) va ID\'lar takrorlanmaydi', () => {
    expect(mttMusiqaTopics.length).toBe(5);
    expect(mttMusiqaTopicIds).toEqual([254, 255, 256, 257, 258]);
    const allTopicIds = TOPICS.map(t => t.id);
    expect(new Set(allTopicIds).size).toBe(allTopicIds.length);
  });

  it('har bir bo\'limda nazariy ko\'rsatma (theoryHint) mavjud', () => {
    for (const t of mttMusiqaTopics) {
      expect(t.theoryHint).toBeTruthy();
      expect(typeof t.theoryHint).toBe('string');
      expect(t.theoryHint.length).toBeGreaterThan(20);
    }
  });

  it('blueprint barcha 5 ta bo\'limni qoplaydi va jami 50 savolga teng', () => {
    expect(hasBlueprint(mttMusiqaTopicIds)).toBe(true);
    const totalQuestions = mttMusiqaTopicIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(totalQuestions).toBe(50);
    expect(totalQuestions).toBe(examTotal('mtt_musiqa'));
  });

  it('mutaxassislik bo\'limlari (254–256) aynan 35 ta savol beradi', () => {
    const specIds = mttMusiqaTopicIds.filter(id => !isPedBlockTopic(id));
    expect(specIds).toEqual([254, 255, 256]);
    expect(EXAM_BLUEPRINT[254]).toBe(18);
    expect(EXAM_BLUEPRINT[255]).toBe(6);
    expect(EXAM_BLUEPRINT[256]).toBe(11);
    const specTotal = specIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(specTotal).toBe(35);
  });

  it('pedagogik blok (257 kasb standarti: 5, 258 pedagogik mahorat: 10) aynan 15 ta savol beradi', () => {
    const pedIds = mttMusiqaTopicIds.filter(isPedBlockTopic);
    expect(pedIds).toEqual([257, 258]);
    expect(EXAM_BLUEPRINT[257]).toBe(5);
    expect(EXAM_BLUEPRINT[258]).toBe(10);
    const pedTotal = pedIds.reduce((sum, id) => sum + EXAM_BLUEPRINT[id], 0);
    expect(pedTotal).toBe(15);
  });

  it('mtt_musiqa fani audiensiyasi va imtihon vaqti to\'g\'ri sozlangan', () => {
    expect(audienceOfSubject('mtt_musiqa')).toBe('mtt');
    expect(examDurationMin('mtt_musiqa')).toBe(90);
  });

  it('i18n onboarding va sarlavhalar barcha 3 tilda (uz, ru, en) mavjud', () => {
    expect(uz.onboarding.subjects.mtt_musiqa?.title).toBe("MTT Musiqa rahbari");
    expect(ru.onboarding.subjects.mtt_musiqa?.title).toBe("Музыкальный руководитель ДОО");
    expect(en.onboarding.subjects.mtt_musiqa?.title).toBe("Preschool Music Director");
  });

  it('questions_mtt_musiqa.json mavjud, to\'liq 500 ta savol va to\'liq 5-lock standartiga mos', () => {
    const filePath = 'src/data/questions_mtt_musiqa.json';
    expect(fs.existsSync(filePath)).toBe(true);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(questions.length).toBe(500);

    const topicCounts = {};
    const hashes = new Set();
    const ids = new Set();
    const dist = [0, 0, 0, 0];

    questions.forEach((q, idx) => {
      expect(q.id).toBe(`mtt_musiqa_${idx + 1}`);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);

      expect(q.category).toBe('mtt_musiqa');
      expect(q.topicId).toBeGreaterThanOrEqual(254);
      expect(q.topicId).toBeLessThanOrEqual(258);
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

    expect(topicCounts[254]).toBe(180);
    expect(topicCounts[255]).toBe(60);
    expect(topicCounts[256]).toBe(110);
    expect(topicCounts[257]).toBe(50);
    expect(topicCounts[258]).toBe(100);

    // Balanslangan variantlar (125 tadan)
    for (const count of dist) {
      expect(count).toBe(125);
    }
  });
});
