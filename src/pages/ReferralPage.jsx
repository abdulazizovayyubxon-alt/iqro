/**
 * ReferralPage.jsx — Yangi toza minimal dizayn
 */
import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2, AlertCircle, Ticket, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import GiftBox from '../components/shared/GiftBox';
import { redeemPromo, PROMO_ERRORS } from '../services/promo';
import {
  getUserReferralCode,
  buildReferralLink,
  getReferralStats,
  MAX_REFERRALS,
  REFERRAL_BONUS,
  REFERRAL_DISCOUNT,
} from '../services/referral';

const fmtSum = (n) => n.toLocaleString('uz-UZ') + " so'm";

const HEADLINE = {
  title: '🎁 Do\'stingga chegirma sovg\'a qil — sen ham yutasan!',
  sub: `Havolangni ulash — ikkalangizga ${REFERRAL_DISCOUNT}% chegirma`,
};

export default function ReferralPage() {
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [refLink, setRefLink] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // ── Promo-kod kiritish holati ──
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null); // { type: 'ok'|'err', text }

  const handleRedeemPromo = async () => {
    const code = promoCode.trim();
    if (!code || promoLoading) return;
    setPromoLoading(true);
    setPromoMsg(null);
    const res = await redeemPromo(code);
    setPromoLoading(false);
    if (res.ok) {
      if (res.type === 'percent') {
        setPromoMsg({ type: 'ok', text: `Promo-kod muvaffaqiyatli faollashtirildi! Keyingi to'lovda ${res.value}% chegirma qo'llanadi.` });
      } else {
        setPromoMsg({ type: 'ok', text: `Promo-kod faollashtirildi! Premium ${res.value} kunga ochildi — ilovani yangilang.` });
      }
      setPromoCode('');
      showToast('Promo-kod faollashtirildi! ✅', 'success');
    } else {
      setPromoMsg({ type: 'err', text: PROMO_ERRORS[res.error] || 'Xatolik yuz berdi' });
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const code = await getUserReferralCode(user.uid, user.displayName);
      const link = buildReferralLink(code);
      const st = await getReferralStats(user.uid);
      setRefLink(link);
      setStats(st);
    } catch {
      showToast("Ma'lumotlarni yuklashda xatolik", 'error');
    }
    setLoading(false);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      showToast(type === 'code' ? "Kod nusxalandi! ✅" : "Havola nusxalandi! ✅", 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Nusxalab bo'lmadi", 'error');
    }
  };

  // ── Jalb qiluvchi matnlar — har safar biri tasodifiy tanlanadi ──
  const getShareMessage = (senderName, platform = 'general') => {
    const name = senderName || 'Do\'stingiz';
    const firstName = name.split(' ')[0];

    const messages = [
      // 1 — Iliq, shaxsiy tavsiya (win-win)
      `📚 Assalomu alaykum!

Men attestatsiyaga IQRO platformasida tayyorlanyapman — rostdan ham foydali chiqdi. Sizni ham birga o'qishga chaqirmoqchiman 🙌

Bu yerda nima bor:
✅ Haqiqiy imtihon sharoitida testlar
✅ Xatolaringizni "aqlli takrorlash" bilan tuzatadi
✅ Internetsiz (oflayn) ham ishlaydi

Eng yaxshisi — havolam orqali kirsangiz, ${REFERRAL_DISCOUNT}% chegirma SIZGA HAM, MENGA HAM tegadi 🎁

Yuring, birga tayyorlanamiz 👇
${refLink}`,

      // 2 — Muammo → Yechim uslubi
      `🎯 Attestatsiyaga tayyorlanayapsizmi?

${firstName} siz bilan IQRO da birga o'qishni taklif qilmoqda!

Ro'yxatdan o'tish: ${refLink}

Bugundan boshlang — imtihon yaqinlashmoqda!`,

      // 3 — Statistika va ishonch uslubi
`🏆 ${firstName} sizga ${REFERRAL_DISCOUNT}% chegirma sovg'a qilmoqda!

IQRO — attestatsiyaga tayyorlovchi platforma.

Nima uchun IQRO?
• 7 ta fan bo'yicha 1000+ savollar bazasi
• Haqiqiy imtihon sharoitida mashq
• Xatolarni tahlil qilish tizimi
• O'qituvchilar reytingi

Attestatsiya yaqinlashmoqda — tayyorgarlikni bugundan boshlang.

🔗 ${refLink}`,

      // 4 — Qisqa va ta'sirchan
`👋 Salom!

Men senga IQRO platformasida ${REFERRAL_DISCOUNT}% CHEGIRMA sovg'a qilyapman 🎁.

IQRO — DTM standartlaridagi testlar orqali attestatsiyaga tayyorgarlik ko'rish platformasi.
Eng zo'r tarafi — bu yerda xatolarni tahlil qilish va internetsiz ishlash (oflayn) funksiyasi ham bor!

Hoziroq havola orqali o'tib, chegirma bilan ro'yxatdan o't:
${refLink}

⏳ Taklif muddatli — o'tkazib yuborma!`,
    ];

    // Tasodifiy matn tanlash
    const idx = Math.floor(Math.random() * messages.length);

    if (platform === 'telegram') {
      // Telegram uchun qisqaroq variant
      return `📚 ${firstName} sizga IQRO da ${REFERRAL_DISCOUNT}% CHEGIRMA ulashmoqda!\n\nRo‘yxatdan o‘ting — IKKALANGIZ ${REFERRAL_DISCOUNT}% chegirma olasiz!\n\n✅ Ro‘yxatdan o‘tish: ${refLink}`;
    }

    return messages[idx];
  };

  const shareReferral = async () => {
    const msg = getShareMessage(user?.displayName);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: 'IQRO — Kasbiy Sertifikatlash Platformasi',
          text: msg,
          url: refLink
        });
      } catch { /* bekor qilingan */ }
    } else {
      await copyToClipboard(msg, 'link');
    }
  };

  const shareViaTelegram = () => {
    const msg = getShareMessage(user?.displayName, 'telegram');
    const text = encodeURIComponent(msg);
    window.location.href = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`;
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <AlertCircle size={40} style={{ marginBottom: 12 }} />
          <div>Iltimos, avval tizimga kiring</div>
        </div>
      </div>
    );
  }

  // Dynamic max limit: If user successfully invited 5 (paid), give them +2 slots.
  const dynamicMax = stats?.paid >= 5 ? 7 : 5;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 100px' }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2 }}>
        {HEADLINE.title}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 22, lineHeight: 1.5 }}>
        {HEADLINE.sub}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div>Yuklanmoqda...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Bonus & Mukofotlar (birlashtirilgan) ── */}
          <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
            {/* Yig'ilgan summa — eng ko'zga tashlanadigan qism */}
            <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', padding: '20px 18px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 }}>YIG'ILGAN BONUS</div>
                  <div style={{ fontSize: 34, fontWeight: 900, margin: '2px 0', lineHeight: 1.05 }}>{fmtSum(stats?.totalBonus || 0)}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>
                    Har to'lagan do'st uchun +{fmtSum(REFERRAL_BONUS)} — to'lovda ayiriladi
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '7px 13px', borderRadius: 20, fontWeight: 800, fontSize: 14, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Users size={15} strokeWidth={2.5} /> {stats?.paid || 0}/{dynamicMax}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginTop: 16, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((stats?.paid || 0) / dynamicMax) * 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ position: 'absolute', top: 0, left: 0, bottom: 0, background: '#fff', borderRadius: 6 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                <span>{stats?.paid || 0} ta to'ladi</span>
                <span>Maqsad: {dynamicMax} ta = {fmtSum(REFERRAL_BONUS * dynamicMax)}</span>
              </div>
            </div>

            {/* Mukofot yo'lakchasi (sovg'alar) */}
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 7 }}>
                {Array.from({ length: dynamicMax }).map((_, i) => {
                  const isPaid = i < (stats?.paid || 0);
                  const isPending = !isPaid && i < (stats?.total || 0);
                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.08 }}
                      style={{
                        flex: 1, padding: '11px 2px', borderRadius: 13, textAlign: 'center',
                        background: isPaid ? 'var(--green-bg)' : isPending ? 'var(--amber-bg)' : 'var(--bg3)',
                        border: `1.5px solid ${isPaid ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--border)'}`,
                        boxShadow: isPaid ? '0 4px 12px rgba(16,185,129,0.18)' : 'none',
                      }}>
                      <motion.div
                        animate={isPaid ? { y: [0, -4, 0], scale: [1, 1.1, 1] } : {}}
                        transition={isPaid ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                        style={{ marginBottom: 5, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 28, opacity: isPending ? 0.9 : 1 }}
                      >
                        {isPending ? <span style={{ fontSize: 22 }}>⏳</span> : <GiftBox size={27} />}
                      </motion.div>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: isPaid ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {isPaid ? 'Olindi' : isPending ? 'Kutish' : '+15k'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {!stats?.canInviteMore && (
                <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🏆 Maksimal {MAX_REFERRALS} ta taklif limitiga yetdingiz!
                </div>
              )}
            </div>
          </div>

          {/* ── Ulashish (soddalashtirilgan) ── */}
          <div style={s.card}>
            <div style={s.label}>Sizning havolangiz</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {refLink}
              </span>
              <motion.button whileTap={{ scale: 0.95 }} style={s.copyBtn} onClick={() => copyToClipboard(refLink, 'link')}>
                {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'link' ? 'Nusxalandi' : 'Nusxa'}
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={shareReferral} style={{ ...s.primaryBtn, flex: 1 }}>
                <Share2 size={17} /> Do'stlarni taklif qilish
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                onClick={shareViaTelegram}
                title="Telegram orqali ulashish"
                style={{ ...s.outlineBtn, width: 54, flexShrink: 0, padding: 0, borderColor: 'var(--accent)', color: '#0088cc' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.54l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.46c.538-.194 1.006.131.837.948z" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* ── Qanday ishlaydi? (ixcham) ── */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              {[
                { icon: '🔗', t: 'Havola yubor' },
                { icon: '🤝', t: "Do'sting qo'shilsin" },
                { icon: '💰', t: `+${fmtSum(REFERRAL_BONUS)}` },
              ].map((st, i) => (
                <React.Fragment key={i}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{st.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', lineHeight: 1.3 }}>{st.t}</div>
                  </div>
                  {i < 2 && <div style={{ color: 'var(--text3)', fontSize: 16, alignSelf: 'center', padding: '0 2px' }}>→</div>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Referrallar ro'yxati */}
          {stats?.referrals?.length > 0 && (
            <div style={s.card}>
              <div style={s.label}>Taklif qilganlarim ({stats.referrals.length}/{MAX_REFERRALS})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.referrals.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: r.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: r.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>
                      {r.referredName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referredName || "Noma'lum"}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px' }}>
                        <span>{new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</span>
                        {(() => {
                          if (r.freeExpire) {
                            return (
                              <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
                                🎁 Chegirma: 50% faol
                              </span>
                            );
                          }
                          const created = new Date(r.createdAt);
                          const now = new Date();
                          const diffMs = now - created;
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          if (diffDays < 7) {
                            return (
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                🎁 Trial: {7 - diffDays} kun qoldi
                              </span>
                            );
                          } else if (diffDays < 10) {
                            return (
                              <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                                ⏳ Chegirma: {10 - diffDays} kun qoldi
                              </span>
                            );
                          } else {
                            return <span style={{ color: 'var(--text3)' }}>❌ Muddati tugagan</span>;
                          }
                        })()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: r.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', color: r.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>
                        {r.status === 'paid' ? "✓ To'ladi" : '⏳ Kutilmoqda'}
                      </span>
                      {r.status === 'paid' && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>+{fmtSum(REFERRAL_BONUS)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Promo-kod kiritish (oynaning eng pasti) ── */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ticket size={18} color="var(--accent)" />
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Promo-kodingiz bormi?</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.45 }}>
              Aksiya kodini kiriting — chegirma yoki bonusingizni darhol oling 🎉
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(null); }}
                onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
                placeholder="Promo-kodni kiriting"
                maxLength={32}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 12, fontSize: 14,
                  border: '1.5px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700,
                  letterSpacing: 1, outline: 'none', textTransform: 'uppercase',
                  boxSizing: 'border-box', minWidth: 0,
                }}
              />
              <motion.button
                whileHover={{ scale: promoLoading || !promoCode.trim() ? 1 : 1.03 }}
                whileTap={{ scale: promoLoading || !promoCode.trim() ? 1 : 0.97 }}
                onClick={handleRedeemPromo}
                disabled={promoLoading || !promoCode.trim()}
                style={{
                  ...s.primaryBtn, padding: '12px 18px', fontSize: 14, flexShrink: 0,
                  opacity: promoLoading || !promoCode.trim() ? 0.55 : 1,
                  cursor: promoLoading ? 'wait' : (!promoCode.trim() ? 'not-allowed' : 'pointer'),
                }}
              >
                {promoLoading ? '...' : 'Faollashtirish'}
              </motion.button>
            </div>

            <AnimatePresence>
              {promoMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: 12, fontSize: 13, fontWeight: 700, lineHeight: 1.4,
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '10px 12px', borderRadius: 12,
                    background: promoMsg.type === 'ok' ? 'var(--green-bg)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${promoMsg.type === 'ok' ? 'var(--green)' : '#EF4444'}`,
                    color: promoMsg.type === 'ok' ? 'var(--green)' : '#EF4444',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{promoMsg.type === 'ok' ? '✅' : '⚠️'}</span>
                  <span>{promoMsg.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const s = {
  card: { background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 18, padding: '18px 16px' },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  copyBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg3)', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' },
  primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 14, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 14, background: 'var(--bg2)', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' },
};
