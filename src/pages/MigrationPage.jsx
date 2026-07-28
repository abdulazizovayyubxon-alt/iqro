import React from 'react';
import { CheckCircle } from 'lucide-react';

const MigrationPage = () => {
  return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
        <CheckCircle size={48} style={{ color: 'var(--green)', marginBottom: '16px' }} />
        <h2 style={{ marginBottom: '8px' }}>Migratsiya yakunlangan</h2>
        <p style={{ color: 'var(--text2)', fontSize: 'var(--fs-base)' }}>
          Barcha savollar Firestore'ga muvaffaqiyatli ko'chirilgan.
          Statik fayllar loyihadan olib tashlangan.
        </p>
      </div>
    </div>
  );
};

export default MigrationPage;
