/**
 * ResultShareCard.jsx — test/imtihon natijasini vizual (canvas rasm) sifatida ulashish.
 *  - Oddiy test va malaka toifa imtihoni: krem+oltin brend estetikasi + % halqasi.
 *  - Milliy sertifikat (`mode === 'national_cert'`): rasmiy UzBMB Milliy Sertifikat
 *    (Royal Navy + Gold guilloche ramka, A+/A/B+/B/C+/C daraja muhri, Rash balli,
 *    6 pog'onali shkala, Y1/Y2/Y3 tahlili va rasmiy muhr).
 */
import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Send } from 'lucide-react';
import { APP_URL } from '../../config';
import { AnalyticsEvents } from '../../services/analytics';
import { MILLIY_CERT_TIERS } from '../../utils/milliySertifikat';
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

export default function ResultShareCard({
  open,
  onClose,
  score,
  total,
  title,
  mode = 'test',
  certGrade,
  raschScore,
  certResult,
  userName,
  showToast,
}) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const isNationalCert = mode === 'national_cert';
  const grade = certResult?.grade ?? certGrade ?? null;
  const raschVal = certResult?.raschScore ?? raschScore ?? 0;

  const modeLabel = isNationalCert
    ? t('shareCard.modeNationalCert', 'Milliy Sertifikat')
    : mode === 'exam' ? t('shareCard.modeExam') : t('shareCard.modeTest');

  // Natijaga qarab ohang
  const tone = isNationalCert && grade
    ? {
        ring: '#1F9D55',
        tag: `${grade} ${t('exam.certGradeLabel', 'DARAJA')} · ${raschVal} ${t('exam.certBall', 'BALL').toUpperCase()}`,
        emoji: '🏅',
        msg: t('shareCard.toneExcellentMsg'),
      }
    : pct >= 70
      ? { ring: '#1F9D55', tag: t('shareCard.toneExcellentTag'), emoji: '🏆', msg: t('shareCard.toneExcellentMsg') }
      : pct >= 50
        ? { ring: '#B07D2B', tag: t('shareCard.toneGoodTag'), emoji: '📈', msg: t('shareCard.toneGoodMsg') }
        : { ring: '#C64B3C', tag: t('shareCard.tonePracticeTag'), emoji: '💪', msg: t('shareCard.tonePracticeMsg') };

  useEffect(() => {
    if (open && canvasRef.current) draw(canvasRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isNationalCert, grade, raschVal, score, total]);

  const drawNationalCert = async (ctx, W, H) => {
    // ── 1. Rasmiy sertifikat foni (och fil suyagi + kumush-moviy tus) ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#FBFDFF');
    bg.addColorStop(0.5, '#F4F8FC');
    bg.addColorStop(1, '#ECF2F9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Nozik guilloche (himoya to'ri) halqalari
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 41, 66, 0.028)';
    ctx.lineWidth = 1;
    for (let r = 80; r <= 440; r += 28) {
      ctx.beginPath();
      ctx.arc(W / 2, 340, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // ── 2. Qo'shaloq rasmiy sertifikat hoshiyasi (Royal Navy + Oltin) ──
    ctx.strokeStyle = '#0F2942';
    ctx.lineWidth = 3.5;
    roundRect(ctx, 18, 18, W - 36, H - 36, 22);
    ctx.stroke();

    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 1.8;
    roundRect(ctx, 28, 28, W - 56, H - 56, 16);
    ctx.stroke();

    // Burchak oltin bezaklari
    const corners = [
      [38, 38, 1, 1],
      [W - 38, 38, -1, 1],
      [38, H - 38, 1, -1],
      [W - 38, H - 38, -1, -1],
    ];
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2.5;
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 18);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 18, cy);
      ctx.stroke();
    });

    ctx.textAlign = 'center';

    // ── 3. Yuqori gerb / brend qismi ──
    try { await document.fonts.load('800 36px "Plus Jakarta Sans"'); } catch { /* ignore */ }
    drawZehinLockup(ctx, W / 2, 74, 34, { text: '#0F2942', fold: '#05A3FA' });

    ctx.fillStyle = '#0F2942';
    ctx.font = '900 18px Inter, system-ui, sans-serif';
    ctx.fillText("UMUMTA'LIM FANIDAN MILLIY SERTIFIKAT", W / 2, 108);

    // Oltin-sariq TEST REJIMI nishoni
    const subBadge = 'RASH MODELI SIMULYATORI · TEST REJIMI';
    ctx.font = '800 11px Inter, system-ui, sans-serif';
    const sbW = ctx.measureText(subBadge).width + 28;
    ctx.fillStyle = 'rgba(201, 162, 39, 0.16)';
    roundRect(ctx, W / 2 - sbW / 2, 120, sbW, 24, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)';
    ctx.lineWidth = 1;
    roundRect(ctx, W / 2 - sbW / 2, 120, sbW, 24, 12);
    ctx.stroke();
    ctx.fillStyle = '#8F6B00';
    ctx.fillText(subBadge, W / 2, 136);

    // ── 4. Fan va Nomzod ma'lumotnomasi ──
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, 48, 156, W - 96, 68, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 41, 66, 0.12)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 48, 156, W - 96, 68, 14);
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillText("UMUMTA'LIM FANI YO'NALISHI", W / 2, 176);

    const subjTitle = (title || "Umumta'lim fani").toUpperCase();
    ctx.fillStyle = '#0F2942';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(subjTitle.length > 34 ? subjTitle.slice(0, 33) + '…' : subjTitle, W / 2, 206);

    // ── 5. Asosiy Natija Bloki (Royal Navy + Daraja Muhri + Rash Balli) ──
    const heroGrad = ctx.createLinearGradient(48, 238, W - 48, 430);
    heroGrad.addColorStop(0, '#0B2138');
    heroGrad.addColorStop(1, '#153A5E');
    ctx.fillStyle = heroGrad;
    roundRect(ctx, 48, 238, W - 96, 190, 20);
    ctx.fill();

    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = 2;
    roundRect(ctx, 48, 238, W - 96, 190, 20);
    ctx.stroke();

    // Chap tomonda: Daraja muhri (A+, A, B+, B, C+, C)
    const sealX = 142, sealY = 333;
    const tierColor = certResult?.color && !certResult.color.startsWith('var')
      ? certResult.color
      : grade ? '#059669' : '#DC2626';

    // Tashqi oltin xalqa
    ctx.beginPath();
    ctx.arc(sealX, sealY, 64, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201, 162, 39, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ichki rangli daraja doirasi
    ctx.beginPath();
    ctx.arc(sealX, sealY, 54, 0, Math.PI * 2);
    ctx.fillStyle = tierColor;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 46px Inter, system-ui, sans-serif';
    ctx.fillText(grade || '—', sealX, sealY + 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.fillText('DARAJA', sealX, sealY + 32);

    // O'ng tomonda: Rash balli va imtiyozlar
    ctx.textAlign = 'left';
    const rightX = 232;

    ctx.fillStyle = '#94A3B8';
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    ctx.fillText('RASH MODELI NATIJASI (T-BALL)', rightX, 278);

    // Rash balli (masalan: 71.2 / 75.0 BALL)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 48px Inter, system-ui, sans-serif';
    const scoreStr = `${raschVal}`;
    ctx.fillText(scoreStr, rightX, 330);
    const scoreW = ctx.measureText(scoreStr).width;

    ctx.fillStyle = '#FACC15';
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.fillText(`/ 75.0 BALL`, rightX + scoreW + 10, 326);

    const raschPct = Math.round((raschVal / 75) * 1000) / 10;
    ctx.fillStyle = grade ? '#34D399' : '#F87171';
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    ctx.fillText(
      grade
        ? `✓ Sertifikat ko'rsatkichi (${raschPct}% proporsional)`
        : '✗ Sertifikat chegarasiga (46.0 ball) yetmadi',
      rightX,
      364
    );

    const bonusPct = certResult?.salaryBonusPct ?? (grade === 'A+' || grade === 'A' || grade === 'B+' ? 50 : grade === 'B' || grade === 'C+' ? 20 : 0);
    const dtmPct = certResult?.dtmPct ?? (grade === 'A+' || grade === 'A' ? 100 : Math.round(raschPct));

    ctx.fillStyle = '#FDE68A';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    if (bonusPct > 0) {
      ctx.fillText(`🏅 O'qituvchiga: +${bonusPct}% ustama · OTMda: ${dtmPct}% ball`, rightX, 394);
    } else if (grade === 'C') {
      ctx.fillText(`🎓 OTM kirish imtihonida: ${dtmPct}% proporsional ball`, rightX, 394);
    } else {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText("📊 O'tish chegarasi: C daraja (46.0 ball) va undan yuqori", rightX, 394);
    }

    ctx.textAlign = 'center';

    // ── 6. 6 pog'onali darajalar shkalasi (C -> A+) ──
    const tiersAsc = [...MILLIY_CERT_TIERS].reverse();
    const scaleY = 444;
    const boxW = (W - 96 - 5 * 8) / 6; // 6 ta katak
    tiersAsc.forEach((tr, idx) => {
      const bx = 48 + idx * (boxW + 8);
      const isCurrent = grade === tr.grade;
      const isPassed = raschVal >= tr.minScore;

      ctx.fillStyle = isCurrent ? tr.color : isPassed ? '#E2E8F0' : '#F1F5F9';
      roundRect(ctx, bx, scaleY, boxW, 52, 10);
      ctx.fill();

      ctx.strokeStyle = isCurrent ? '#C9A227' : 'rgba(15, 41, 66, 0.12)';
      ctx.lineWidth = isCurrent ? 2.5 : 1;
      roundRect(ctx, bx, scaleY, boxW, 52, 10);
      ctx.stroke();

      ctx.fillStyle = isCurrent ? '#FFFFFF' : isPassed ? '#0F2942' : '#64748B';
      ctx.font = '900 16px Inter, system-ui, sans-serif';
      ctx.fillText(tr.grade, bx + boxW / 2, scaleY + 24);

      ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.9)' : '#64748B';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.fillText(`${tr.minScore}+ ball`, bx + boxW / 2, scaleY + 42);
    });

    // ── 7. Savollar va Qiyinlik darajalari bo'yicha hisobot jadvali (4 ta blok) ──
    const bd = certResult?.breakdown;
    const statsBoxes = [
      { label: "TO'G'RI JAVOB", val: `${score} / ${total}`, sub: `${pct}% aniqlik`, color: '#0F2942' },
      { label: 'OSON (Y1 · ×1.0)', val: bd ? `${bd.Y1.correct}/${bd.Y1.total}` : '—', sub: 'bazaviy savollar', color: '#059669' },
      { label: "O'RTA (Y2 · ×1.5)", val: bd ? `${bd.Y2.correct}/${bd.Y2.total}` : '—', sub: 'asosiy savollar', color: '#0E97E0' },
      { label: 'QIYIN (Y3 · ×2.2)', val: bd ? `${bd.Y3.correct}/${bd.Y3.total}` : '—', sub: 'yuqori vaznli', color: '#D97706' },
    ];

    const statY = 512;
    const statW = (W - 96 - 3 * 10) / 4;
    statsBoxes.forEach((st, i) => {
      const sx = 48 + i * (statW + 10);
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, sx, statY, statW, 86, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 41, 66, 0.12)';
      ctx.lineWidth = 1;
      roundRect(ctx, sx, statY, statW, 86, 12);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '800 10px Inter, system-ui, sans-serif';
      ctx.fillText(st.label, sx + statW / 2, statY + 22);

      ctx.fillStyle = st.color;
      ctx.font = '900 24px Inter, system-ui, sans-serif';
      ctx.fillText(st.val, sx + statW / 2, statY + 52);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillText(st.sub, sx + statW / 2, statY + 72);
    });

    // ── 8. Nomzod, Sana va Rasmiy Muhr ──
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F2942';
    ctx.font = '800 15px Inter, system-ui, sans-serif';
    ctx.fillText(`👤 Nomzod: ${userName || 'Zehin foydalanuvchisi'}`, 52, 640);

    ctx.fillStyle = '#475569';
    ctx.font = '600 14px Inter, system-ui, sans-serif';
    ctx.fillText(`📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}   ·   ⏱ 45 ta savol / 150 daqiqa`, 52, 666);

    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 500 12px Inter, system-ui, sans-serif';
    ctx.fillText("* Ushbu sertifikat Zehin platformasining Milliy sertifikat simulyatori natijasidir.", 52, 692);

    // Dumaloq ko'k muhr (o'ng pastda)
    ctx.save();
    ctx.translate(W - 108, 650);
    ctx.rotate(-0.18);
    ctx.strokeStyle = 'rgba(14, 151, 224, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(14, 151, 224, 0.75)';
    ctx.textAlign = 'center';
    ctx.font = '900 9px Inter, system-ui, sans-serif';
    ctx.fillText('ZEHIN PLATFORMASI', 0, -10);
    ctx.font = '900 11px Inter, system-ui, sans-serif';
    ctx.fillText('MILLIY SERTIFIKAT', 0, 4);
    ctx.font = '700 8px Inter, system-ui, sans-serif';
    ctx.fillText('SINOV NATIJASI', 0, 17);
    ctx.restore();

    // ── 9. Pastki chiziq + URL ──
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(15, 41, 66, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(52, 714);
    ctx.lineTo(W - 52, 714);
    ctx.stroke();

    ctx.fillStyle = '#0E97E0';
    ctx.font = '800 18px Inter, system-ui, sans-serif';
    const url = (APP_URL || '').replace(/^https?:\/\//, '');
    ctx.fillText(t('shareCard.tryToo', { url }), W / 2, 748);
  };

  const drawStandard = async (ctx, W, H) => {
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

  const draw = async (canvas) => {
    const W = 640, H = 800;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (isNationalCert) {
      await drawNationalCert(ctx, W, H);
    } else {
      await drawStandard(ctx, W, H);
    }
  };

  const getBlob = () => new Promise((resolve) => {
    if (!canvasRef.current) return resolve(null);
    canvasRef.current.toBlob(resolve, 'image/png');
  });

  const fileName = isNationalCert ? 'zehin-milliy-sertifikat.png' : 'zehin-natija.png';

  const handleShareImage = async () => {
    try {
      const blob = await getBlob();
      if (!blob) return;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        AnalyticsEvents.shareClick('result', 'native');
        await navigator.share({
          files: [file],
          title: t('shareCard.shareTitle'),
          text: isNationalCert
            ? `🏅 Milliy Sertifikat simulyatorida ${raschVal} ball (${grade || '—'} daraja) oldim!`
            : t('shareCard.shareImageText', { mode: modeLabel.toLowerCase(), pct }),
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
    link.download = fileName;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast?.(t('shareCard.downloaded'), 'success');
  };

  const handleTelegram = () => {
    AnalyticsEvents.shareClick('result', 'telegram');
    const text = isNationalCert
      ? `🏅 Zehin — Milliy Sertifikat simulyatorida ${raschVal} / 75.0 ball (${grade ? `${grade} daraja` : 'sinov natijasi'}) oldim!\n✅ To'g'ri javoblar: ${score}/${total} (${pct}%)${title ? `\n📚 Fan: ${title}` : ''}`
      : t('shareCard.telegramText', {
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
