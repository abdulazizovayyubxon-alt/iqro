/**
 * ResultShareCard.jsx — test/imtihon natijasini vizual (canvas rasm) sifatida ulashish.
 * Pasport canvas texnikasi qayta ishlatildi (krem+oltin brend estetikasi).
 * Ulashish: native Web Share API (rasm bilan, mobil) → bo'lmasa yuklab olish; + Telegram (matn).
 */
import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Send } from 'lucide-react';
import { APP_URL } from '../../config';
import { AnalyticsEvents } from '../../services/analytics';
import { drawZehinLockup } from './BrandLogo';

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export default function ResultShareCard({ open, onClose, score, total, title, mode = 'test', userName, showToast }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const modeLabel = mode === 'exam' ? t('shareCard.modeExam') : t('shareCard.modeTest');

  // Natijaga qarab ohang
  const tone = pct >= 70
    ? { ring: '#1F9D55', tag: t('shareCard.toneExcellentTag'), emoji: '🏆', msg: t('shareCard.toneExcellentMsg') }
    : pct >= 50
      ? { ring: '#B07D2B', tag: t('shareCard.toneGoodTag'), emoji: '📈', msg: t('shareCard.toneGoodMsg') }
      : { ring: '#C64B3C', tag: t('shareCard.tonePracticeTag'), emoji: '💪', msg: t('shareCard.tonePracticeMsg') };

  useEffect(() => {
    if (open && canvasRef.current) draw(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const draw = async (canvas) => {
    const W = 640, H = 800;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── Fon — iliq krem gradient ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FCF8EE');
    bg.addColorStop(1, '#F1EAD8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Nozik tashqi ramka
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
    ctx.lineWidth = 3;
    roundRect(ctx, 24, 24, W - 48, H - 48, 28);
    ctx.stroke();

    ctx.textAlign = 'center';

    // ── Sarlavha: Zehin lockup'i (krem fonda navy + azure buklama) ──
    // Shrift yuklanmagan bo'lsa fallback bilan chiziladi — bloklamaymiz
    try { await document.fonts.load('800 44px "Plus Jakarta Sans"'); } catch { /* ignore */ }
    drawZehinLockup(ctx, W / 2, 104, 44, { text: '#12305A', fold: '#05A3FA' });
    ctx.fillStyle = '#8A7A5C';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText(t('shareCard.subtitle'), W / 2, 138);

    // ── Mode badge ──
    ctx.font = '800 14px Inter, system-ui, sans-serif';
    const badgeW = ctx.measureText(modeLabel.toUpperCase()).width + 36;
    ctx.fillStyle = 'rgba(17, 128, 184, 0.10)';
    roundRect(ctx, W / 2 - badgeW / 2, 170, badgeW, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#1180B8';
    ctx.fillText(modeLabel.toUpperCase(), W / 2, 192);

    // ── Aniqlik halqasi (ring) ──
    const cx = W / 2, cy = 360, r = 110;
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = tone.ring;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
    ctx.stroke();

    // % markazda
    ctx.fillStyle = '#2A2118';
    ctx.font = '900 68px Inter, system-ui, sans-serif';
    ctx.fillText(`${pct}%`, cx, cy + 18);
    ctx.fillStyle = '#8A7A5C';
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.fillText(t('shareCard.accuracy'), cx, cy + 48);

    // Emoji + tag
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = tone.ring;
    ctx.fillText(`${tone.emoji} ${tone.tag}`, cx, cy + 92);

    // ── Natija (score/total) ──
    ctx.fillStyle = '#2A2118';
    ctx.font = '900 34px Inter, system-ui, sans-serif';
    ctx.fillText(t('shareCard.correctOf', { score, total }), W / 2, 540);

    // Fan / mavzu
    if (title) {
      ctx.fillStyle = '#5C4F35';
      ctx.font = '600 20px Inter, system-ui, sans-serif';
      const shortTitle = title.length > 38 ? title.slice(0, 37) + '…' : title;
      ctx.fillText(`📚 ${shortTitle}`, W / 2, 578);
    }

    // Foydalanuvchi ismi (ixtiyoriy)
    if (userName) {
      ctx.fillStyle = '#8A7A5C';
      ctx.font = '700 17px Inter, system-ui, sans-serif';
      ctx.fillText(userName, W / 2, 612);
    }

    // ── Motivatsion qator ──
    ctx.fillStyle = '#3B2F1B';
    ctx.font = 'italic 600 19px Inter, system-ui, sans-serif';
    ctx.fillText(tone.msg, W / 2, 668);

    // ── Pastki chiziq + URL ──
    ctx.strokeStyle = 'rgba(138, 122, 92, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 710);
    ctx.lineTo(W - 80, 710);
    ctx.stroke();
    ctx.fillStyle = '#1180B8';
    ctx.font = '800 19px Inter, system-ui, sans-serif';
    const url = (APP_URL || '').replace(/^https?:\/\//, '');
    ctx.fillText(t('shareCard.tryToo', { url }), W / 2, 748);
  };

  const getBlob = () => new Promise((resolve) => {
    if (!canvasRef.current) return resolve(null);
    canvasRef.current.toBlob(resolve, 'image/png');
  });

  const handleShareImage = async () => {
    try {
      const blob = await getBlob();
      if (!blob) return;
      const file = new File([blob], 'zehin-natija.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        AnalyticsEvents.shareClick('result', 'native');
        await navigator.share({
          files: [file],
          title: t('shareCard.shareTitle'),
          text: t('shareCard.shareImageText', { mode: modeLabel.toLowerCase(), pct }),
        });
      } else {
        handleDownload();
      }
    } catch (e) {
      if (e?.name !== 'AbortError') handleDownload();
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    AnalyticsEvents.shareClick('result', 'download');
    const link = document.createElement('a');
    link.download = 'zehin-natija.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast?.(t('shareCard.downloaded'), 'success');
  };

  const handleTelegram = () => {
    AnalyticsEvents.shareClick('result', 'telegram');
    const text = t('shareCard.telegramText', {
      emoji: tone.emoji,
      mode: modeLabel.toLowerCase(),
      score,
      total,
      pct,
      titleLine: title ? `\n📚 ${title}` : '',
    });
    window.open(`https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg2)', borderRadius: 24, padding: 16,
              maxWidth: 360, width: '100%', maxHeight: '92vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>{t('shareCard.header')}</span>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                style={{ background: 'var(--bg3)', border: 'none', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                onClick={handleShareImage}
                style={{ flex: 2, padding: '13px', background: 'var(--grad-primary)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <Share2 size={16} /> {t('shareCard.share')}
              </button>
              <button
                onClick={handleDownload}
                aria-label="Rasmni yuklab olish"
                style={{ flex: 1, padding: '13px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleTelegram}
                aria-label="Telegram orqali ulashish"
                style={{ flex: 1, padding: '13px', background: 'var(--bg3)', color: 'var(--accent2)', border: '1px solid var(--border)', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
