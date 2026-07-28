import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Star, AlertTriangle, ChevronDown } from 'lucide-react';

/**
 * TheoryPreCard — test oldidagi IXCHAM eslatma.
 *
 * Nega alohida komponent: `TheorySheet` to'liq konspektni chizadi — o'rtacha
 * 20 blok, ~3 daqiqalik o'qish. U test OLDIDA to'siq bo'lib qolardi. Bu yerda
 * vazifa boshqa: savolga o'tishdan oldin AYNAN imtihonda so'raladigan
 * faktlarni eslatib qo'yish (~1 daqiqa). Tushuntirish qatlami — `keyPoints` —
 * xato javobdan keyin `TheoryModal`da beriladi, u yerda o'z joyida.
 *
 * Kartochka HECH QACHON to'sib qo'ymaydi: yig'ilgan holatda bir qator, ostida
 * darrov savol turadi. Ya'ni tanlov tugma bilan emas, aylantirish bilan
 * qilinadi — o'qimoqchi bo'lmagan odam hech narsa bosmaydi.
 *
 * props:
 *   theory     — normalizeTheory natijasi (null bo'lsa chizilmaydi)
 *   open       — ochiqmi (ota komponent boshqaradi)
 *   onToggle   — sarlavha bosilganda
 *   onOpenFull — «To'liq konspekt» bosilganda (TheoryModal ochiladi)
 */

/** Test oldida ko'rsatiladigan chegaralar — qolgani to'liq konspektda. */
const MAX_MUST_KNOW = 5;
const MAX_MISTAKES = 3;

/** O'zbekcha matn uchun ~900 belgi/daqiqa — o'lchangan o'rtacha tezlik. */
const CHARS_PER_MIN = 900;

const List = ({ icon: Icon, color, title, items }) => (
  <div style={{ marginTop: 14 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
      fontSize: 'var(--fs-2xs)', fontWeight: 800, letterSpacing: 0.4,
      textTransform: 'uppercase', color: 'var(--text3)',
    }}>
      <Icon size={12} style={{ color }} />
      {title}
    </div>
    <ul style={{ margin: 0, paddingLeft: 17 }}>
      {items.map((x, i) => (
        <li key={i} style={{
          fontSize: 'var(--fs-explain)', lineHeight: 'var(--lh-relaxed)',
          color: 'var(--text2)', marginBottom: 6,
        }}>
          {x}
        </li>
      ))}
    </ul>
  </div>
);

const TheoryPreCard = ({ theory, open, onToggle, onOpenFull }) => {
  const { t } = useTranslation();

  if (!theory) return null;

  const summary = theory.summary || '';
  const mustKnow = (theory.mustKnow || []).slice(0, MAX_MUST_KNOW);
  const mistakes = (theory.mistakes || []).slice(0, MAX_MISTAKES);

  // Ko'rsatadigan hech narsa bo'lmasa kartochka umuman chizilmaydi:
  // bo'sh «eslatma» qatori faqat joy egallaydi.
  if (!summary && mustKnow.length === 0 && mistakes.length === 0) return null;

  const facts = mustKnow.length + mistakes.length;
  const chars = [summary, ...mustKnow, ...mistakes].join(' ').length;
  const minutes = Math.max(1, Math.round(chars / CHARS_PER_MIN));

  return (
    <div
      className="glass-panel"
      style={{
        border: '1px solid var(--border)', borderRadius: 16,
        marginBottom: 12, overflow: 'hidden',
      }}
    >
      {/* Sarlavha qatori — yig'ilgan holatda kartochkaning O'ZI shu qator
          bo'lib qoladi va konspektga doimiy kirish nuqtasi vazifasini
          bajaradi (ilgari uni test o'rtasida ochishning yo'li yo'q edi). */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 13px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 9,
          background: 'var(--blue-bg)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen size={15} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', fontSize: 'var(--fs-md)', fontWeight: 700,
            color: 'var(--text)', lineHeight: 'var(--lh-snug)',
          }}>
            {t('theory.compactTitle')}
          </span>
          <span style={{ display: 'block', fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 1 }}>
            {/* `n`, `count` emas: `count` i18next'da ko'plik shakllarini
                qidiradi va tarjima kalitini «topilmadi»ga aylantiradi */}
            {facts > 0
              ? t('theory.compactMeta', { n: facts, min: minutes })
              : t('theory.compactMetaShort', { min: minutes })}
          </span>
        </span>
        <span style={{
          flexShrink: 0, color: 'var(--text3)', display: 'flex',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.18s ease-out',
        }}>
          <ChevronDown size={17} />
        </span>
      </button>

      {/* Ochilish/yopilish — SOF CSS (grid 0fr↔1fr), `AnimatePresence` emas.
          Sabab: AnimatePresence tanani mount/unmount qiladi va bu loyihada
          uning `exit` bosqichi allaqachon bir marta tishlagan (qarang:
          `TheoryModal.jsx` dagi izoh — modal yopilmay DOM'da osilib qolgan).
          Bu yerda tana doim DOM'da qoladi, faqat qator balandligi o'zgaradi —
          osilib qoladigan holat umuman yo'q. */}
      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.22s ease-out',
      }}>
        <div style={{
          overflow: 'hidden', minHeight: 0,
          // `visibility` — yig'ilgan tanadagi tugma Tab bilan fokus
          // olmasligi uchun (balandligi 0 bo'lsa ham u fokuslanardi)
          visibility: open ? 'visible' : 'hidden',
          transition: 'visibility 0.22s',
        }}>
          <div style={{ padding: '0 13px 13px' }}>
            {summary && (
              <div style={{
                padding: '11px 13px', borderRadius: 12, background: 'var(--bg3)',
                fontSize: 'var(--fs-explain)', lineHeight: 'var(--lh-relaxed)',
                color: 'var(--text2)',
              }}>
                {summary}
              </div>
            )}

            {mustKnow.length > 0 && (
              <List icon={Star} color="var(--amber)" title={t('theory.mustKnow')} items={mustKnow} />
            )}
            {mistakes.length > 0 && (
              <List icon={AlertTriangle} color="var(--red)" title={t('theory.mistakes')} items={mistakes} />
            )}

            {onOpenFull && (
              <button
                onClick={onOpenFull}
                style={{
                  marginTop: 14, width: '100%', padding: '10px 13px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  color: 'var(--accent)', fontSize: 'var(--fs-sm)', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <BookOpen size={14} />
                {t('theory.openFull')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TheoryPreCard;
