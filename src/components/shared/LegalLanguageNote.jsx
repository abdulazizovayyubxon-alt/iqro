import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

/**
 * LegalLanguageNote — huquqiy hujjatning qaysi tildagi matni ustun ekani.
 *
 * Maxfiylik siyosati va oferta o'zbek tilida yozilgan; rus va ingliz
 * variantlari tarjima. Tarjimada ma'no bir necha so'zga siljishi mumkin, shu
 * sababli qaysi matn huquqiy kuchga ega ekani hujjatning O'ZIDA yozilishi
 * kerak — bu shartnomaning bir qismi, shuning uchun uchala tilda ham
 * ko'rsatiladi (faqat tarjimalarda emas).
 */
const LegalLanguageNote = () => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        margin: '0 0 20px', padding: '11px 13px',
        border: '1px solid var(--border)', borderRadius: 12,
        background: 'var(--bg2)',
      }}
    >
      <Languages size={15} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }} />
      <div style={{
        fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-relaxed)', color: 'var(--text3)',
      }}>
        {t('legal.langNote')}
      </div>
    </div>
  );
};

export default LegalLanguageNote;
