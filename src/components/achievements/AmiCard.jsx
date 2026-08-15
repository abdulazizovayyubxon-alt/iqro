import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, HelpCircle } from 'lucide-react';
import RadarChart from './RadarChart';
import { UNVON_AMI_THRESHOLDS, TRACK_WEIGHTS, TRACKS } from '../../data/tracks';

// Legend uchun kichik romb
const Diamond = ({ filled }) => (
  <span
    style={{
      width: 6,
      height: 6,
      transform: 'rotate(45deg)',
      background: filled ? 'var(--accent)' : 'transparent',
      border: filled ? '1px solid var(--accent)' : '1px solid var(--border)',
      borderRadius: 1,
      display: 'inline-block'
    }}
  />
);

/**
 * AmiCard — Akademik Mahorat Indeksi: katta raqam + pasport unvoni + 6 o'qli radar + daraja legendasi.
 * props:
 *   ami: 0-100
 *   unvonTier: 1|2|3 — pasport darajasidagi yagona unvon (tracks.unvonTierFromAmi)
 *   axes: [{ label, value 0..1 }] — RadarChart uchun
 *   weeklyDelta: shu haftada AMI necha ballga o'sgani (0 bo'lsa ko'rsatilmaydi)
 *   onShare: berilsa — pasportni ulashish tugmasi chiqadi
 */
const AmiCard = ({ ami = 0, unvonTier = 1, axes = [], weeklyDelta = 0, onShare }) => {
  const { t } = useTranslation();
  // «AMI qanday hisoblanadi» — yopiq holatda bitta qator, ochilganda og'irliklar.
  // NEGA: 0-100 raqami tushuntirilmasa, unga qarab HARAKAT qilib bo'lmaydi —
  // foydalanuvchi qaysi yo'nalish ko'proq ball berishini bilishi kerak.
  const [showHow, setShowHow] = useState(false);

  // Keyingi unvon bosag'asi (tier1→33, tier2→67); tier3 — eng yuqori unvon
  const nextThreshold = unvonTier < 3 ? UNVON_AMI_THRESHOLDS[unvonTier - 1] : null;
  const unvonPct = nextThreshold ? Math.min(100, Math.round((ami / nextThreshold) * 100)) : 100;

  return (
    <div
      style={{
        padding: '18px 16px 8px',
        marginBottom: 16,
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        textAlign: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 'var(--fs-9xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1, letterSpacing: '-1px' }}>
          {ami}
        </span>
        <span style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text3)' }}>/100</span>
        {weeklyDelta > 0 && (
          <span
            style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 12,
              background: 'var(--blue-bg)', color: 'var(--accent2)',
              fontSize: 'var(--fs-xs)', fontWeight: 700
            }}
          >
            {t('tracks.amiWeekly', { count: weeklyDelta })}
          </span>
        )}
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text2)', margin: '6px 0 2px' }}>
        {t('tracks.amiLabel')}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          margin: '4px 0 6px',
          padding: '4px 14px',
          borderRadius: 20,
          background: 'var(--blue-bg)',
          color: 'var(--accent2)',
          fontSize: 'var(--fs-md)',
          fontWeight: 700
        }}
      >
        {t(`tracks.tier${unvonTier}`)}
      </div>

      {/* Keyingi unvon progressi — ingichka chiziq + qolgan ball */}
      <div style={{ maxWidth: 210, margin: '2px auto 0' }}>
        <div style={{ height: 3, borderRadius: 1.5, background: 'var(--bg3)', overflow: 'hidden' }}>
          <div style={{ width: `${unvonPct}%`, height: '100%', borderRadius: 1.5, background: 'var(--accent)', transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 4 }}>
          {nextThreshold
            ? t('tracks.unvonProgress', { unvon: t(`tracks.tier${unvonTier + 1}`), count: Math.max(1, nextThreshold - ami) })
            : t('tracks.unvonMax')}
        </div>
      </div>

      <RadarChart axes={axes} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
          padding: '8px 0 6px',
          fontSize: 'var(--fs-xs)',
          fontWeight: 600,
          color: 'var(--text3)'
        }}
      >
        {[1, 2, 3].map(lv => (
          <span key={lv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <Diamond filled={lv >= 1} />
              <Diamond filled={lv >= 2} />
              <Diamond filled={lv >= 3} />
            </span>
            {t(`tracks.tier${lv}`)}
          </span>
        ))}
      </div>

      {/* Sokin amallar qatori: ulashish + AMI izohi */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, padding: '2px 0 10px' }}>
        {onShare && (
          <button
            onClick={onShare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer',
              color: 'var(--accent2)', fontWeight: 700, fontSize: 'var(--fs-xs)', fontFamily: 'inherit',
            }}
          >
            <Share2 size={13} /> {t('tracks.shareCta')}
          </button>
        )}
        <button
          onClick={() => setShowHow(v => !v)}
          aria-expanded={showHow}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer',
            color: 'var(--text3)', fontWeight: 600, fontSize: 'var(--fs-xs)', fontFamily: 'inherit',
          }}
        >
          <HelpCircle size={13} /> {t('tracks.amiHowCta')}
        </button>
      </div>

      {showHow && (
        <div style={{ textAlign: 'left', padding: '0 4px 12px' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', lineHeight: 1.5, marginBottom: 8 }}>
            {t('tracks.amiHowHint')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...TRACKS]
              .sort((a, b) => TRACK_WEIGHTS[b.id] - TRACK_WEIGHTS[a.id])
              .map(tr => (
                <div key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text2)', fontWeight: 600, minWidth: 96 }}>
                    {t(`tracks.${tr.id}.name`)}
                  </span>
                  <span style={{ flex: 1, height: 3, borderRadius: 1.5, background: 'var(--bg3)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', width: `${(TRACK_WEIGHTS[tr.id] / 25) * 100}%`, height: '100%', background: 'var(--accent)', opacity: 0.55 }} />
                  </span>
                  <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, color: 'var(--text3)', minWidth: 34, textAlign: 'right' }}>
                    {t('tracks.amiWeight', { count: TRACK_WEIGHTS[tr.id] })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AmiCard;
