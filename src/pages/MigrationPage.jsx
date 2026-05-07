import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { questionDatabase } from '../data/mockData';

const MigrationPage = () => {
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'completed', 'error'
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const migrateData = async () => {
    setStatus('loading');
    setProgress(0);
    setErrorMsg('');

    try {
      let totalCount = 0;
      let processedCount = 0;

      // 1. Calculate total number of questions for progress tracking
      for (const questions of Object.values(questionDatabase)) {
        totalCount += questions.length;
      }

      // 2. Firestore batch limit is 500 operations
      const BATCH_LIMIT = 500;
      let currentBatch = writeBatch(db);
      let batchSize = 0;

      for (const [topicId, questions] of Object.entries(questionDatabase)) {
        const tId = parseInt(topicId);

        for (let index = 0; index < questions.length; index++) {
          const q = questions[index];
          const qId = `topic_${tId}_q${index}`;
          const qRef = doc(collection(db, 'questions'), qId);

          currentBatch.set(qRef, {
            ...q,
            topicId: tId,
            category: tId >= 7 ? 'art' : 'chqbt',
            createdAt: new Date()
          });

          batchSize++;
          processedCount++;

          // If batch limit reached, commit and start a new batch
          if (batchSize >= BATCH_LIMIT) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            batchSize = 0;
            setProgress(Math.round((processedCount / totalCount) * 100));
          }
        }
      }

      // Commit remaining operations in the last batch
      if (batchSize > 0) {
        await currentBatch.commit();
      }

      setProgress(100);
      setStatus('completed');
      console.log(`Successfully migrated ${totalCount} questions!`);
    } catch (err) {
      console.error("Migration error:", err);
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', padding: 20,
      fontFamily: 'sans-serif', textAlign: 'center'
    }}>
      <div className="glass-panel" style={{ padding: 40, borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>🛠 Migration Tool</h1>
        <p style={{ color: 'var(--text3)', marginBottom: 24 }}>
          Ushbu sahifa barcha statik savollarni Firestore bazasiga ko'chirish uchun xizmat qiladi.
        </p>

        {status === 'idle' && (
          <button
            className="btn btn-primary"
            onClick={migrateData}
            style={{ padding: '12px 24px', fontSize: 16 }}
          >
            Barcha savollarni bazaga yuklash
          </button>
        )}

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%' }} />
            <div style={{ color: 'var(--text)' }}>
              Yuklanmoqda... {progress}%
            </div>
            <div style={{ width: '200px', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div style={{ color: 'var(--green)', fontWeight: 700 }}>
            ✅ Barcha savollar muvaffaqiyatli yuklandi!
          </div>
        )}

        {status === 'error' && (
          <div style={{ color: 'var(--red)' }}>
            ❌ Xatolik yuz berdi: {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationPage;
