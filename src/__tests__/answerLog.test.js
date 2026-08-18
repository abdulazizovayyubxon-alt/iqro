import { describe, it, expect } from 'vitest';
import { summarizeTestResults } from '../engine/SmartQuestionEngine';

/**
 * ADMIN UX AUDIT 2026-08-18, A-1 BAND — savol darajasidagi javob jurnali.
 *
 * NEGA BU TEST BOR: auditda aniqlangan eng qimmat bo'shliq — "qaysi savolda
 * ko'p xato qilinyapti?" degan savolga javob beradigan ma'lumot umuman
 * yo'qligi edi. `answerLog` shu ma'lumotning YAGONA manbai: u yiqilsa
 * `questionStats` ham, "Shubhali savollar" ro'yxati ham jimgina bo'sh
 * qoladi — xato hech qayerda ko'rinmaydi.
 *
 * Jurnaldagi eng qimmatli maydon — `pick` (qaysi variant tanlangani).
 * Aynan u "kalit noto'g'ri" diagnozini mumkin qiladi: agar ko'pchilik B ni
 * tanlasa, "to'g'ri" javob esa C bo'lsa — muammo odamlarda emas, savolda.
 */

const q = (id, correct) => ({
  id,
  q: `Savol ${id} — matni yetarlicha uzun bo'lishi uchun qo'shimcha so'zlar`,
  opts: ['A varianti', 'B varianti', 'C varianti', 'D varianti'],
  correct,
  topicId: 0,
});

describe('answerLog — savol statistikasi uchun xom yozuv', () => {
  it('har javob berilgan savol uchun bitta yozuv qaytaradi', () => {
    const questions = [q('q1', 0), q('q2', 1), q('q3', 2)];
    const answers = { 0: 0, 1: 3, 2: 2 };

    const r = summarizeTestResults(questions, answers, [], 0, {});

    expect(r.answerLog).toHaveLength(3);
    expect(r.answerLog.map(a => a.qid)).toEqual(['q1', 'q2', 'q3']);
  });

  it("javob berilmagan savol jurnalga TUSHMAYDI", () => {
    const questions = [q('q1', 0), q('q2', 1)];
    // 2-savol o'tkazib yuborilgan (`undefined`)
    const answers = { 0: 0 };

    const r = summarizeTestResults(questions, answers, [], 0, {});

    expect(r.answerLog).toHaveLength(1);
    expect(r.answerLog[0].qid).toBe('q1');
  });

  it("to'g'ri/xato bayrog'i javobga mos keladi", () => {
    const questions = [q('q1', 0), q('q2', 1)];
    const answers = { 0: 0, 1: 3 }; // birinchisi to'g'ri, ikkinchisi xato

    const r = summarizeTestResults(questions, answers, [], 0, {});

    expect(r.answerLog[0].ok).toBe(true);
    expect(r.answerLog[1].ok).toBe(false);
  });

  it("TANLANGAN variant saqlanadi — 'kalit shubhali' diagnozining asosi", () => {
    const questions = [q('q1', 2)]; // to'g'ri javob C
    const answers = { 0: 1 };       // odam B ni tanladi

    const r = summarizeTestResults(questions, answers, [], 0, {});

    expect(r.answerLog[0].pick).toBe(1);
    expect(r.answerLog[0].ok).toBe(false);
  });

  it("`id` YO'Q savol jurnalga tushmaydi (agregatlab bo'lmaydi)", () => {
    // Paketdan emas, eski keshdan kelgan savol — identifikatori yo'q.
    const noId = { ...q('x', 0) };
    delete noId.id;
    const questions = [noId, q('q2', 0)];
    const answers = { 0: 0, 1: 0 };

    const r = summarizeTestResults(questions, answers, [], 0, {});

    expect(r.answerLog).toHaveLength(1);
    expect(r.answerLog[0].qid).toBe('q2');
  });

  it('vaqt millisekundda yoziladi', () => {
    const questions = [q('q1', 0)];
    const answers = { 0: 0 };
    const times = { 0: 12 }; // 12 soniya

    const r = summarizeTestResults(questions, answers, [], 0, times);

    expect(r.answerLog[0].ms).toBe(12000);
  });

  it("fonda qolgan tab o'rtachani buzmaydi — vaqt 10 daqiqada cheklanadi", () => {
    const questions = [q('q1', 0)];
    const answers = { 0: 0 };
    const times = { 0: 7200 }; // 2 soat — odam javob bermay ketgan

    const r = summarizeTestResults(questions, answers, [], 0, times);

    expect(r.answerLog[0].ms).toBe(600000);
  });

  it("mavzu hisobi (`topicDeltas`) buzilmagan — `secs` ko'chirilgandan keyin ham", () => {
    // `secs` e'loni answerLog uchun yuqoriga ko'chirilgan edi; bu test
    // o'sha refaktoring topicDeltas'dagi vaqt hisobini buzmaganini qo'riqlaydi.
    const questions = [q('q1', 0), q('q2', 0)];
    const answers = { 0: 0, 1: 1 };
    const times = { 0: 10, 1: 20 };

    const r = summarizeTestResults(questions, answers, [], 0, times);

    expect(r.topicDeltas[0].answered).toBe(2);
    expect(r.topicDeltas[0].correct).toBe(1);
    expect(r.topicDeltas[0].timeSum).toBe(30);
  });
});
