/**
 * PassportShareCard.jsx — akademik pasportni (AMI + unvon + yo'nalish darajalari)
 * rasm sifatida ulashish.
 *
 * NEGA KERAK: unvon va AMI ilovaning ICHIDA qolib ketardi — mehnat natijasi
 * hech kimga ko'rinmasdi. Test natijasi allaqachon ulashiladi (ResultShareCard),
 * lekin u BITTA sessiyani ko'rsatadi; pasport esa umumiy yo'lni ko'rsatadi.
 *
 * Chizish texnikasi va brend estetikasi ResultShareCard bilan bir xil
 * (krem fon + oltin ramka + navy lockup) — ikkalasi bir oiladan ko'rinsin.
 */
import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Send } from 'lucide-react';
import { APP_URL } from '../../config';
import { drawZehinLockup } from '../shared/BrandLogo';

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Daraja muhrlari — ilovadagi TierMarks ning canvas ko'rinishi (romb qatori) */
const drawPips = (ctx, x, y, tier, size = 7, gap = 5) => {
  for (let i = 0; i < 3; i++) {
    const cx = x + i * (size + gap);
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    if (i < tier) {
      ctx.fillStyle = '#1180B8';
      ctx.fillRect(-size / 2, -size / 2, size, size);
    } else {
      ctx.strokeStyle = 'rgba(138, 122, 92, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
};

export default function PassportShareCard({
  open, onClose, ami = 0, unvon = '', tracks = [], streak = 0, userName, showToast,
}) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (open && canvasRef.current) draw(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ami, unvon, streak]);

  const draw = async (canvas) => {
    const W = 640, H = 800;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── Fon — iliq krem gradient (ResultShareCard bilan bir xil) ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FCF8EE');
    bg.addColorStop(1, '#F1EAD8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
    ctx.lineWidth = 3;
    roundRect(ctx, 24, 24, W - 48, H - 48, 28);
    ctx.stroke();

    ctx.textAlign = 'center';

    try { await document.fonts.load('800 44px "Plus Jakarta Sans"'); } catch { /* shrift zaxirasi bilan chiziladi */ }
    drawZehinLockup(ctx, W / 2, 100, 42, { text: '#12305A', fold: '#05A3FA' });
    ctx.fillStyle = '#8A7A5C';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText(t('tracks.passportSubtitle'), W / 2, 132);

    // ── AMI halqasi ──
    const cx = W / 2, cy = 268, r = 88;
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#1180B8';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0, Math.min(100, ami))) / 100);
    ctx.stroke();

    ctx.fillStyle = '#2A2118';
    ctx.font = '900 56px Inter, system-ui, sans-serif';
    ctx.fillText(String(ami), cx, cy + 14);
    ctx.fillStyle = '#8A7A5C';
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    ctx.fillText(t('tracks.amiLabel'), cx, cy + 42);

    // ── Unvon chipi ──
    ctx.font = '800 17px Inter, system-ui, sans-serif';
    const chipW = ctx.measureText(unvon).width + 44;
    ctx.fillStyle = 'rgba(17, 128, 184, 0.10)';
    roundRect(ctx, W / 2 - chipW / 2, 382, chipW, 38, 19);
    ctx.fill();
    ctx.fillStyle = '#1180B8';
    ctx.fillText(unvon, W / 2, 407);

    // ── Yo'nalishlar — ikki ustunli ro'yxat, har birida muhr qatori ──
    ctx.textAlign = 'left';
    const colX = [78, 344];
    const rowY = 470;
    tracks.slice(0, 6).forEach((tr, i) => {
      const x = colX[i % 2];
      const y = rowY + Math.floor(i / 2) * 44;
      ctx.fillStyle = '#5C4F35';
      ctx.font = '600 15px Inter, system-ui, sans-serif';
      const label = tr.name.length > 16 ? `${tr.name.slice(0, 15)}…` : tr.name;
      ctx.fillText(label, x, y);
      drawPips(ctx, x + 2, y + 16, tr.tier);
    });

    // ── Zanjir qatori ──
    ctx.textAlign = 'center';
    if (streak > 0) {
      ctx.fillStyle = '#8A7A5C';
      ctx.font = '700 16px Inter, system-ui, sans-serif';
      ctx.fillText(t('tracks.passportStreak', { count: streak }), W / 2, 634);
    }

    if (userName) {
      ctx.fillStyle = '#3B2F1B';
      ctx.font = '800 19px Inter, system-ui, sans-serif';
      ctx.fillText(userName, W / 2, 674);
    }

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
      const file = new File([blob], 'zehin-pasport.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('tracks.passportShareTitle'),
          text: t('tracks.passportShareText', { ami, unvon }),
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
    const link = document.createElement('a');
    link.download = 'zehin-pasport.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast?.(t('shareCard.downloaded'), 'success');
  };

  const handleTelegram = () => {
    const text = t('tracks.passportShareText', { ami, unvon });
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
              <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>{t('tracks.passportHeader')}</span>
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
                style={{ flex: 2, padding: '13px', background: 'var(--cta)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <Share2 size={16} /> {t('shareCard.share')}
              </button>
              <button
                onClick={handleDownload}
                aria-label={t('shareCard.downloaded')}
                style={{ flex: 1, padding: '13px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 14, fontWeight: 700, fontSize: 'var(--fs-base)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleTelegram}
                aria-label="Telegram"
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
