import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  writeBatch, addDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { logAdminAction } from '../../services/adminLog';
import { qHashOf } from '../../utils/qHash';

export const REASON_LABELS = {
  wrong_answer: "Javob noto'g'ri",
  typo: 'Imlo xatosi',
  ambiguous: 'Ikki xil tushuniladi',
  outdated: 'Eskirgan',
  image: "Rasm ko'rinmayapti",
  other: 'Boshqa',
};

const L = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * FixQuestionModal — e'tirozni BIR TUGMA bilan tuzatish oynasi.
 *
 * ══════════════════════════════════════════════════════════════════
 *  ADMIN UX AUDIT 2026-08-18 — M-1, M-2, M-4 bandlariga javob
 * ══════════════════════════════════════════════════════════════════
 *
 *  AVVAL: «Hal qilindi» tugmasi FAQAT e'tirozga bayroq qo'yardi
 *  (AdminPage.jsx:1211) — savolning o'ziga tegmasdi. Hisoblagich nolga
 *  tushardi, panel toza ko'rinardi, buzuq savol esa foydalanuvchilarga
 *  borishda davom etardi. Panel adminni ish bajarilgan deb ISHONTIRARDI.
 *
 *  Savolni chindan tuzatish uchun 6 qadam kerak edi va ularning biri —
 *  butun bazani yuklash, ya'ni ~47 000 o'qish (bepul kunlik kvota 50 000).
 *  Amalda adminlar buni umuman qilmasdi.
 *
 *  ENDI: savol `questionId` bo'yicha to'g'ridan-to'g'ri o'qiladi — 1 o'qish.
 *  Bir oynada: shikoyat, foydalanuvchi ko'rgan nusxa, bazadagi tahrirlanadigan
 *  holat va javob taqsimoti.
 *
 *  Saqlash ATOMAR: savol yangilanadi → shu savolga tegishli BARCHA e'tiroz
 *  yopiladi (M-4) → shikoyat qilganlarga bildirishnoma boradi (M-3).
 *
 *  ESKI E'TIROZLAR: 2026-08-18 dan oldingi yozuvlarda `questionId` yo'q.
 *  Oyna buni ochiq aytadi — soxta ishonch bermaydi.
 */
const FixQuestionModal = ({ objection, onClose, onResolved, showToast, adminEmail }) => {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [stats, setStats] = useState(null);
  const [draft, setDraft] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [replyNote, setReplyNote] = useState('');
  const [confirmRetire, setConfirmRetire] = useState(false);

  const safeClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  const dialogRef = useModalA11y(true, safeClose);

  const qid = objection?.questionId || null;

  // ── Yuklash: 1 ta savol + 1 ta statistika = 2 o'qish ──
  useEffect(() => {
    let alive = true;
    if (!qid) { setLoading(false); return undefined; }

    (async () => {
      try {
        const [qSnap, sSnap] = await Promise.all([
          getDoc(doc(db, 'questions', qid)),
          getDoc(doc(db, 'questionStats', qid)).catch(() => null),
        ]);
        if (!alive) return;

        if (!qSnap.exists()) {
          setLoadError("Savol bazadan topilmadi — ehtimol allaqachon o'chirilgan.");
        } else {
          const q = { id: qSnap.id, ...qSnap.data() };
          setQuestion(q);
          setDraft({
            q: q.q || '',
            opts: Array.isArray(q.opts) ? [...q.opts] : ['', '', '', ''],
            correct: Number.isInteger(q.correct) ? q.correct : 0,
            explanation: q.explanation || '',
            mnemonic: q.mnemonic || '',
          });
        }
        if (sSnap && sSnap.exists()) setStats(sSnap.data());

        // Shu savolga tegishli boshqa e'tirozlar (M-4).
        const sibSnap = await getDocs(
          query(collection(db, 'objections'), where('questionId', '==', qid))
        );
        if (!alive) return;
        setSiblings(sibSnap.docs.map(d => ({ fbId: d.id, ...d.data() })));
      } catch (e) {
        if (alive) setLoadError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [qid]);

  // ── Barcha tegishli e'tirozni yopish + shikoyat qilganlarga xabar ──
  const closeAllObjections = useCallback(async (status, noteForUser) => {
    const list = siblings.length > 0
      ? siblings
      : [{ fbId: objection.fbId, uid: objection.uid, solved: objection.solved }];

    // `fbId` YO'Q bo'lishi mumkin: oyna «Shubhali savollar» ro'yxatidan ham
    // ochiladi — u yerda haqiqiy e'tiroz yo'q, sun'iy obyekt uzatiladi.
    // Bunday yozuvni batch'ga qo'shsa `doc(db,'objections', undefined)`
    // xato tashlardi va savol tuzatilgani holda oyna yiqilardi.
    const open = list.filter(o => o.fbId && !o.solved);
    if (open.length > 0) {
      const solvedAt = new Date().toISOString();
      for (let i = 0; i < open.length; i += 400) {
        const batch = writeBatch(db);
        open.slice(i, i + 400).forEach(o =>
          batch.update(doc(db, 'objections', o.fbId), {
            solved: true, status, solvedBy: adminEmail || null, solvedAt,
          })
        );
        await batch.commit();
      }
    }

    // Bildirishnoma — FAQAT ochiq e'tiroz egalariga (har foydalanuvchiga BIR MARTA).
    // Avvalgi yopilgan e'tirozlarga qayta spam yuborilmaydi.
    if (noteForUser && open.length > 0) {
      const uids = [...new Set(open.map(o => o.uid).filter(Boolean))];
      await Promise.allSettled(uids.map(uid => addDoc(
        collection(db, 'users', uid, 'notifications'), {
          title: noteForUser.title,
          message: noteForUser.message,
          type: noteForUser.type,
          read: false,
          date: new Date().toISOString(),
        }
      )));
    }
    return open.length;
  }, [siblings, objection, adminEmail]);

  // ── Foydalanuvchilar keshidagi (`spacedCards` va `mistakes`) xato savolni yangilash ──
  const syncAffectedUserCaches = useCallback(async (uids, modQ, cat) => {
    if (!uids.length || !modQ?.id) return;
    await Promise.allSettled(uids.map(async (uid) => {
      const uRef = doc(db, 'userStats', uid);
      const uSnap = await getDoc(uRef);
      if (!uSnap.exists()) return;
      const uData = uSnap.data();
      let cardUpdated = false;
      let mistakesUpdated = false;

      const cards = Array.isArray(uData.spacedCards)
        ? uData.spacedCards.map((c) => {
            if (c?.id !== modQ.id) return c;
            cardUpdated = true;
            return {
              ...c,
              qHash: modQ.qHash || c.qHash,
              q: modQ.q,
              question: modQ.q,
              opts: [...modQ.opts],
              options: [...modQ.opts],
              correct: modQ.correct,
              explanation: modQ.explanation,
            };
          })
        : [];

      const nextStats = { ...(uData.stats || {}) };
      const targetCats = cat ? [cat] : Object.keys(nextStats);
      for (const cKey of targetCats) {
        const catMistakes = nextStats[cKey]?.mistakes;
        if (!Array.isArray(catMistakes) || catMistakes.length === 0) continue;
        let catChanged = false;
        const updatedMistakes = catMistakes.map((m) => {
          if (m?.id !== modQ.id) return m;
          catChanged = true;
          mistakesUpdated = true;
          return {
            ...m,
            qHash: modQ.qHash || m.qHash,
            question: modQ.q,
            opts: [...modQ.opts],
            correct: modQ.opts[modQ.correct] || m.correct,
            explanation: modQ.explanation,
            mnemonic: modQ.mnemonic || m.mnemonic,
          };
        });
        if (catChanged) {
          nextStats[cKey] = { ...nextStats[cKey], mistakes: updatedMistakes };
        }
      }

      if (cardUpdated || mistakesUpdated) {
        const patch = {};
        if (cardUpdated) patch.spacedCards = cards;
        if (mistakesUpdated) patch.stats = nextStats;
        await updateDoc(uRef, patch);
      }
    }));
  }, []);

  // Ochiq shikoyatlar bormi («Shubhali savollar»dan ochilganda fbId bo'lmaydi)
  const openObjectionsList = (siblings.length > 0
    ? siblings
    : [{ fbId: objection?.fbId, uid: objection?.uid, solved: objection?.solved }]
  ).filter(o => o?.fbId && !o.solved);

  // Farqlardan avtomatik batafsil xabar yasash (GEMINI.md 3-qoidasi bo'yicha ≥50 belgi)
  const buildAutoFixReply = () => {
    if (!question || !draft) return '';
    const changes = [];
    if (draft.q.trim() !== String(question.q || '').trim()) {
      changes.push('savol matnidagi ifoda/imlo aniqlandi');
    }
    if (draft.correct !== question.correct) {
      changes.push(`to'g'ri javob kaliti ${L[question.correct]} variantdan ${L[draft.correct]} variantga («${draft.opts[draft.correct]?.trim()}») o'zgartirildi`);
    }
    const changedOpts = draft.opts
      .map((o, i) => (o.trim() !== String(question.opts?.[i] || '').trim() ? L[i] : null))
      .filter(Boolean);
    if (changedOpts.length > 0) {
      changes.push(`${changedOpts.join(', ')} javob variantlari tahrirlandi`);
    }
    if (draft.explanation.trim() !== String(question.explanation || '').trim()) {
      changes.push('ilmiy izoh boyitildi');
    }
    const summary = changes.length > 0
      ? changes.join('; ')
      : "savol va javob variantlari tekshirilib, me'yoriy manbaga moslashtirildi";
    const snippet = draft.q.trim().slice(0, 80) + (draft.q.trim().length > 80 ? '…' : '');
    return `E'tiboringiz va faolligingiz uchun katta rahmat! «${snippet}» savoli bo'yicha murojaatingiz o'rganib chiqildi va tuzatildi: ${summary}.`;
  };

  // ── 1) Tuzatdim ──
  const handleFix = async () => {
    if (!draft.q.trim()) { showToast("Savol matni bo'sh bo'lmasin", 'error'); return; }
    if (draft.opts.some(o => !o || !o.trim())) { showToast("Barcha variantlarni to'ldiring", 'error'); return; }
    if (!Number.isInteger(draft.correct) || draft.correct < 0 || draft.correct >= draft.opts.length) {
      showToast("To'g'ri javob variantlar orasida bo'lishi kerak", 'error'); return;
    }
    const customNote = replyNote.trim();
    if (openObjectionsList.length > 0 && customNote.length < 20) {
      showToast("Foydalanuvchiga aynan nima o'zgartirilganini yozing yoki «Avto-izoh» tugmasini bosing (kamida 20 belgi)", 'error');
      return;
    }

    setBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanQ = draft.q.trim();
      const cleanOpts = draft.opts.map(o => o.trim());
      const cleanExp = draft.explanation.trim();
      const cleanMnem = (draft.mnemonic || '').trim();
      const nextHash = qHashOf(cleanQ);

      const savedPatch = {
        q: cleanQ,
        opts: cleanOpts,
        correct: draft.correct,
        explanation: cleanExp,
        mnemonic: cleanMnem,
        // K-3: savol matni o'zgardi — dublikat kaliti ham yangilanishi shart,
        // aks holda keyingi import bu savolni topa olmay dublikat yozardi.
        qHash: nextHash,
        updatedAt: nowIso,
        updatedBy: adminEmail || null,
      };

      await updateDoc(doc(db, 'questions', qid), savedPatch);

      const resolvedCategory = question?.category || objection?.category || null;
      const fullQuestion = {
        ...question,
        ...savedPatch,
        id: qid,
        ...(resolvedCategory ? { category: resolvedCategory } : {}),
      };

      const uids = [...new Set(openObjectionsList.map(o => o.uid).filter(Boolean))];
      await syncAffectedUserCaches(uids, fullQuestion, resolvedCategory);

      const n = await closeAllObjections('fixed', {
        title: "✅ E'tirozingiz asosida savol tuzatildi!",
        message: customNote || buildAutoFixReply(),
        type: 'success',
      });
      logAdminAction('question.fix', qid, { objections: n, category: resolvedCategory });
      showToast('Savol tuzatildi, ' + n + " ta e'tiroz yopildi", 'success');
      onResolved({
        action: 'fixed',
        questionId: qid,
        category: resolvedCategory,
        patch: savedPatch,
        fullQuestion,
      });
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
      setBusy(false);
    }
  };

  // ── 2) Xato yo'q — rad etish (yoki o'chirilgan/eski savol e'tiroziga javob berib yopish) ──
  const handleReject = async () => {
    const reason = replyNote.trim();
    if (reason.length < 30) {
      showToast("Rad etish sababini foydalanuvchiga darslik/qonun asosida batafsil yozing (kamida 30 belgi)", 'error');
      return;
    }
    setBusy(true);
    try {
      const n = await closeAllObjections('rejected', {
        title: "ℹ️ E'tirozingiz ko'rib chiqildi (Tushuntirish)",
        message: reason,
        type: 'info',
      });
      logAdminAction('objection.reject', qid || objection.fbId, { objections: n });
      showToast(n + " ta e'tiroz tushuntirish bilan yopildi", 'success');
      onResolved({ action: 'rejected', questionId: qid, category: question?.category || objection?.category || null });
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
      setBusy(false);
    }
  };

  // ── 3) Muomaladan olish ──
  // Savol bazadan o'chmaydi, lekin `status: 'retired'` bo'ladi va paket
  // sinxronizatsiyasida TASHLAB KETILADI.
  const handleRetire = async () => {
    setConfirmRetire(false);
    setBusy(true);
    try {
      const resolvedCategory = question?.category || objection?.category || null;
      await updateDoc(doc(db, 'questions', qid), {
        status: 'retired',
        retiredAt: new Date().toISOString(),
        retiredBy: adminEmail || null,
      });
      const customNote = replyNote.trim();
      const snippet = String(question?.q || objection?.question || '').trim().slice(0, 80);
      const n = await closeAllObjections('fixed', {
        title: '✅ Xabaringiz uchun rahmat!',
        message: customNote || `E'tiboringiz uchun rahmat! Siz bildirgan «${snippet}…» savoli ekspert tekshiruviga olindi va test aylanmasidan chiqarildi.`,
        type: 'success',
      });
      logAdminAction('question.retire', qid, { objections: n, category: resolvedCategory });
      showToast("Savol muomaladan olindi, " + n + " ta e'tiroz yopildi", 'success');
      onResolved({
        action: 'retired',
        questionId: qid,
        category: resolvedCategory,
        patch: { status: 'retired' },
      });
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error');
      setBusy(false);
    }
  };

  // ── Ko'rsatkichlar ──
  const shown = stats?.shown || 0;
  const wrongPct = shown > 0 ? Math.round(((stats.wrong || 0) / shown) * 100) : null;
  const picks = stats?.picks || {};
  const pickPct = (i) => (shown > 0 ? Math.round(((picks[i] || 0) / shown) * 100) : 0);

  // Kalit shubhali: eng ko'p tanlangan variant «to'g'ri» javob EMAS.
  const topPick = Object.keys(picks).length
    ? Object.entries(picks).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  const keySuspect = topPick !== null && question
    && Number(topPick) !== question.correct
    && shown >= 20;

  // Foydalanuvchi ko'rgan nusxa bazadagidan farq qiladimi?
  const drifted = question && objection.question
    && String(objection.question).trim() !== String(question.q).trim();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay" style={{ zIndex: 1100 }} onClick={safeClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label="Savolni tuzatish"
        tabIndex={-1}
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        className="modal-content admin-fix-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title" style={{ flexShrink: 0 }}>Savolni tuzatish</div>

        <div className="admin-fix-scroll">
          <div className="admin-fix-complaint">
            <div className="admin-fix-complaint-h">
              SHIKOYAT{objection.reason && objection.reason !== 'other'
                ? ' · ' + (REASON_LABELS[objection.reason] || objection.reason)
                : ''}
            </div>
            <div>{objection.note}</div>
            <div className="admin-fix-meta">
              {siblings.length > 1 ? siblings.length + ' kishi shikoyat qilgan' : '1 kishi'}
              {' · '}{objection.date}
            </div>
          </div>

          {loading && <div className="admin-state-block">Savol yuklanmoqda...</div>}

          {!loading && !qid && (
            <div className="admin-info-box admin-info-box--warn">
              <div className="admin-info-title"><AlertTriangle size={15} /> Bu eski e&apos;tiroz</div>
              <div className="admin-info-text">
                Yozuvda savol identifikatori yo&apos;q — u 2026-08-18 dan oldin yuborilgan.
                Bunday e&apos;tirozni bir tugma bilan tuzatib bo&apos;lmaydi: savolni
                «Savollar» tabidan matn bo&apos;yicha qidirish kerak.<br />
                Bu sanadan keyingi yangi e&apos;tirozlar shu oynada ochiladi.
              </div>
            </div>
          )}

          {!loading && loadError && (
            <div className="admin-info-box admin-info-box--error">
              <div className="admin-info-title"><AlertTriangle size={15} /> Savolni ochib bo&apos;lmadi</div>
              <div className="admin-info-text">{loadError}</div>
            </div>
          )}

          {!loading && stats && shown > 0 && (
            <div className="admin-fix-stats">
              <span>{shown.toLocaleString('uz-UZ')} marta ko&apos;rsatilgan</span>
              <span className={wrongPct >= 70 ? 'is-bad' : ''}>{wrongPct}% xato</span>
              {Object.keys(picks).length > 0 && (
                <span>
                  {L.map((l, i) => (picks[i] ? l + ': ' + pickPct(i) + '%' : null))
                    .filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          )}

          {!loading && keySuspect && (
            <div className="admin-info-box admin-info-box--warn">
              <div className="admin-info-title"><AlertTriangle size={15} /> Kalit shubhali</div>
              <div className="admin-info-text">
                Ko&apos;pchilik (<strong>{pickPct(Number(topPick))}%</strong>)
                {' '}<strong>{L[Number(topPick)]}</strong> variantni tanlagan,
                «to&apos;g&apos;ri» javob esa <strong>{L[question.correct]}</strong>.
                Javob kaliti noto&apos;g&apos;ri bo&apos;lishi mumkin.
              </div>
            </div>
          )}

          {!loading && question && draft && (
            <>
              {drifted && (
                <div className="admin-info-box">
                  <div className="admin-info-title"><Info size={15} /> Savol o&apos;zgargan</div>
                  <div className="admin-info-text">
                    Bazadagi matn foydalanuvchi ko&apos;rgan nusxadan farq qiladi —
                    savol e&apos;tirozdan keyin allaqachon tahrirlangan bo&apos;lishi mumkin.
                  </div>
                </div>
              )}

              <div className="admin-fix-split">
                <div className="admin-fix-pane">
                  <div className="admin-fix-pane-h">Foydalanuvchi ko&apos;rgan nusxa</div>
                  <div className="admin-fix-q">{objection.question}</div>
                  {(objection.options || []).map((o, i) => (
                    <div key={i} className="admin-fix-opt">
                      {L[i]}) {String(o).replace(/^[A-D]\)\s*/, '')}
                    </div>
                  ))}
                  {objection.correct && (
                    <div className="admin-fix-opt is-key">
                      To&apos;g&apos;ri: {String(objection.correct).replace(/^[A-D]\)\s*/, '')}
                    </div>
                  )}
                </div>

                <div className="admin-fix-pane admin-fix-pane--live">
                  <div className="admin-fix-pane-h">Bazadagi holat — tahrirlanadi</div>
                  <textarea
                    className="modal-input"
                    style={{ minHeight: 70 }}
                    value={draft.q}
                    onChange={e => setDraft({ ...draft, q: e.target.value })}
                    aria-label="Savol matni"
                  />
                  {draft.opts.map((o, i) => (
                    <div key={i} className="admin-fix-opt-row">
                      <button
                        type="button"
                        className={'admin-fix-key' + (draft.correct === i ? ' is-key' : '')}
                        onClick={() => setDraft({ ...draft, correct: i })}
                        title="Bu variantni to&apos;g&apos;ri javob deb belgilash"
                        aria-pressed={draft.correct === i}
                      >
                        {L[i]}
                      </button>
                      <input
                        className="modal-input"
                        value={o}
                        onChange={e => {
                          const next = [...draft.opts];
                          next[i] = e.target.value;
                          setDraft({ ...draft, opts: next });
                        }}
                        aria-label={L[i] + ' varianti'}
                      />
                    </div>
                  ))}
                  <textarea
                    className="modal-input"
                    style={{ minHeight: 48, marginTop: 6 }}
                    placeholder="Ilmiy izoh (explanation)"
                    value={draft.explanation}
                    onChange={e => setDraft({ ...draft, explanation: e.target.value })}
                    aria-label="Izoh"
                  />
                  <input
                    className="modal-input"
                    style={{ marginTop: 6 }}
                    placeholder="Yodda saqlash kaliti (mnemonic — ixtiyoriy)"
                    value={draft.mnemonic}
                    onChange={e => setDraft({ ...draft, mnemonic: e.target.value })}
                    aria-label="Mnemonic"
                  />
                </div>
              </div>

              <div className="admin-info-text" style={{ fontSize: 'var(--fs-sm)', marginTop: 6 }}>
                Tuzatish bazaga va shikoyatchi keshiga darhol yoziladi. Foydalanuvchilarga yetkazish uchun
                «Yangilanishni yuborish» tugmasini bosing (faqat o&apos;zgargan fan bo&apos;lagi sinxronlanadi).
              </div>
            </>
          )}

          {!loading && (question || openObjectionsList.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <label className="admin-label" style={{ margin: 0 }}>
                  Foydalanuvchiga batafsil javob xati {openObjectionsList.length > 0 ? '(majburiy)' : '(ixtiyoriy)'}
                </label>
                {question && draft && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setReplyNote(buildAutoFixReply())}
                    title="Kiritilgan o'zgarishlardan foydalanuvchi uchun to'liq xabar yasash"
                  >
                    <Sparkles size={13} /> Avto-izoh (tuzatishdan)
                  </button>
                )}
              </div>
              <textarea
                className="modal-input"
                style={{ minHeight: 64 }}
                placeholder="Tuzatishda: nima o'zgartirilgani («osqichda» → «tasmaga»). Rad etishda: qaysi darslik/qonun moddasiga ko'ra savol to'g'ri ekani (kamida 30 belgi)..."
                value={replyNote}
                onChange={e => setReplyNote(e.target.value)}
                aria-label="Foydalanuvchiga javob xati"
              />
            </div>
          )}
        </div>

        {confirmRetire && (
          <div className="admin-info-box admin-info-box--warn" style={{ marginTop: 8, flexShrink: 0 }}>
            <div className="admin-info-title"><AlertTriangle size={15} /> Savolni muomaladan olishni tasdiqlaysizmi?</div>
            <div className="admin-info-text" style={{ marginBottom: 8 }}>
              Savol test va imtihonlardan chiqariladi, barcha ochiq e&apos;tirozlar yopiladi.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm admin-btn-danger" onClick={handleRetire} disabled={busy}>
                Ha, muomaladan ol
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => setConfirmRetire(false)} disabled={busy}>
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        <div className="admin-fix-actions">
          {question ? (
            <>
              <button className="btn btn-primary" onClick={handleFix} disabled={busy}>
                <CheckCircle size={14} /> {busy ? 'Saqlanmoqda...' : 'Tuzatdim va yopish'}
              </button>
              <button className="btn btn-outline" onClick={handleReject} disabled={busy}>
                Xato yo&apos;q — rad etish
              </button>
              <button className="btn btn-outline admin-btn-danger" onClick={() => setConfirmRetire(true)} disabled={busy}>
                Muomaladan olish
              </button>
            </>
          ) : (!loading && openObjectionsList.length > 0 && (
            <button className="btn btn-primary" onClick={handleReject} disabled={busy}>
              <CheckCircle size={14} /> {busy ? 'Yopilmoqda...' : 'Tushuntirish yuborib yopish'}
            </button>
          ))}
          <button className="btn btn-outline" onClick={safeClose} disabled={busy}>Keyinroq</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FixQuestionModal;
