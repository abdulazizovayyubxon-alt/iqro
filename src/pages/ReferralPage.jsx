/**
 * ReferralPage.jsx — Yangi toza minimal dizayn
 */
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
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

const fmtSum = (n) => n.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ') + ' ' + i18n.t('referral.currency');

export default function ReferralPage() {
  const { t } = useTranslation();
  const { user, updateUserData } = useAuth();
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
        setPromoMsg({ type: 'ok', text: t('referral.promoPercentOk', { value: res.value }) });
      } else {
        // days/team — profil muddatini reload kutmasdan yangilaymiz
        const base = user?.premiumExpire && new Date(user.premiumExpire) > new Date()
          ? new Date(user.premiumExpire) : new Date();
        const newExpire = new Date(base.getTime() + Number(res.value) * 86400000).toISOString();
        updateUserData({ isPremium: true, isTruePremium: true, premiumExpire: newExpire, trialStatus: 'premium' });
        setPromoMsg({ type: 'ok', text: t('referral.promoDaysOk', { value: res.value }) });
      }
      setPromoCode('');
      showToast(t('referral.promoActivated'), 'success');
    } else {
      setPromoMsg({ type: 'err', text: PROMO_ERRORS[res.error] || t('exam.toastError') });
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  // Yangi do'st qo'shilganda konfetti
  useEffect(() => {
    if (stats?.paid > 0) {
      const lastSeenPaid = parseInt(localStorage.getItem('iqro_last_seen_paid') || '0', 10);
      if (stats.paid > lastSeenPaid) {
        import('canvas-confetti').then((module) => {
          const confetti = module.default;
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        });
        localStorage.setItem('iqro_last_seen_paid', stats.paid.toString());
      }
    }
  }, [stats?.paid]);

  const loadData = async () => {
    setLoading(true);
    try {
      const code = await getUserReferralCode(user.uid, user.displayName);
      const link = buildReferralLink(code);
      const st = await getReferralStats(user.uid);
      setRefLink(link);
      setStats(st);
    } catch {
      showToast(t('referral.loadError'), 'error');
    }
    setLoading(false);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      showToast(type === 'code' ? t('referral.codeCopied') : t('referral.linkCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t('referral.copyFailed'), 'error');
    }
  };

  // ── Jalb qiluvchi matnlar — har safar biri tasodifiy tanlanadi ──
  const getShareMessage = (senderName, platform = 'general') => {
    const name = senderName || t('referral.shareDefaultName');
    const firstName = name.split(' ')[0];

    if (platform === 'telegram') {
      return t('referral.shareMsgTelegram', { firstName, percent: REFERRAL_DISCOUNT, link: refLink });
    }

    const messages = [
      t('referral.shareMsg1', { percent: REFERRAL_DISCOUNT, link: refLink }),
      t('referral.shareMsg2', { firstName, link: refLink }),
      t('referral.shareMsg3', { firstName, percent: REFERRAL_DISCOUNT, link: refLink }),
      t('referral.shareMsg4', { percent: REFERRAL_DISCOUNT, link: refLink }),
    ];

    const idx = Math.floor(Math.random() * messages.length);
    return messages[idx];
  };

  const shareReferral = async () => {
    const msg = getShareMessage(user?.displayName);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: t('referral.shareTitle'),
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
        <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
          <AlertCircle size={40} style={{ marginBottom: 12 }} />
          <div>{t('referral.loginFirst')}</div>
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
      <h1 style={{ fontSize: 'var(--fs-5xl)', fontWeight: 900, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2 }}>
        {t('referral.headlineTitle')}
      </h1>
      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 22, lineHeight: 1.5 }}>
        {t('referral.headlineSub', { percent: REFERRAL_DISCOUNT })}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 'var(--fs-9xl)', marginBottom: 12 }}>⏳</div>
          <div>{t('common.loading')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Bonus & Mukofotlar (birlashtirilgan) ── */}
          <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
            {/* Yig'ilgan summa — eng ko'zga tashlanadigan qism */}
            <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', padding: '20px 18px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 }}>{t('referral.collectedBonus')}</div>
                  <div style={{ fontSize: 'var(--fs-9xl)', fontWeight: 900, margin: '2px 0', lineHeight: 1.05 }}>{fmtSum(stats?.totalBonus || 0)}</div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.78)' }}>
                    {t('referral.perPaidFriend', { amount: fmtSum(REFERRAL_BONUS) })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '7px 13px', borderRadius: 20, fontWeight: 800, fontSize: 'var(--fs-base)', flexShrink: 0, whiteSpace: 'nowrap' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {stats?.paid < dynamicMax ? (
                  <span style={{ color: '#FCD34D' }}>
                    Yana {fmtSum(REFERRAL_BONUS * (dynamicMax - (stats?.paid || 0)))} yig'sangiz Premium sizniki!
                  </span>
                ) : (
                  <span style={{ color: '#10B981' }}>Tabriklaymiz, siz to'liq maqsadga yetdingiz! 👑</span>
                )}
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
                        {isPending ? <span style={{ fontSize: 'var(--fs-4xl)' }}>⏳</span> : <GiftBox size={27} />}
                      </motion.div>
                      <div style={{ fontSize: 'var(--fs-3xs)', fontWeight: 800, color: isPaid ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {isPaid ? t('referral.rewardGot') : isPending ? t('referral.rewardWaiting') : '+15k'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {!stats?.canInviteMore && (
                <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 10, padding: '10px 14px', fontSize: 'var(--fs-md)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t('referral.maxReached', { count: MAX_REFERRALS })}
                </div>
              )}
            </div>
          </div>

          {/* ── Ulashish (soddalashtirilgan) ── */}
          <div style={s.card}>
            <div style={s.label}>{t('referral.yourLink')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {refLink}
              </span>
              <motion.button whileTap={{ scale: 0.95 }} style={s.copyBtn} onClick={() => copyToClipboard(refLink, 'link')}>
                {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                {copied === 'link' ? t('referral.copied') : t('referral.copy')}
              </motion.button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={shareReferral} style={{ ...s.primaryBtn, flex: 1 }}>
                <Share2 size={17} /> {t('referral.inviteFriends')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                onClick={shareViaTelegram}
                title={t('referral.shareViaTelegram')}
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
                { icon: '🔗', t: t('referral.howStep1') },
                { icon: '🤝', t: t('referral.howStep2') },
                { icon: '💰', t: `+${fmtSum(REFERRAL_BONUS)}` },
              ].map((st, i) => (
                <React.Fragment key={i}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--fs-4xl)', marginBottom: 5 }}>{st.icon}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text2)', lineHeight: 1.3 }}>{st.t}</div>
                  </div>
                  {i < 2 && <div style={{ color: 'var(--text3)', fontSize: 'var(--fs-xl)', alignSelf: 'center', padding: '0 2px' }}>→</div>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Referrallar ro'yxati */}
          {stats?.referrals?.length > 0 && (
            <div style={s.card}>
              <div style={s.label}>{t('referral.myInvites', { count: stats.referrals.length, max: MAX_REFERRALS })}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.referrals.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: r.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-lg)', fontWeight: 800, color: r.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>
                      {r.referredName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referredName || t('referral.unknownName')}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px' }}>
                        <span>{new Date(r.createdAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ', { day: 'numeric', month: 'short' })}</span>
                        {(() => {
                          if (r.freeExpire) {
                            return (
                              <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
                                {t('referral.discountActive')}
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
                                {t('referral.trialDaysLeft', { count: 7 - diffDays })}
                              </span>
                            );
                          } else if (diffDays < 10) {
                            return (
                              <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                                {t('referral.discountDaysLeft', { count: 10 - diffDays })}
                              </span>
                            );
                          } else {
                            return <span style={{ color: 'var(--text3)' }}>{t('referral.expired')}</span>;
                          }
                        })()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: r.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', color: r.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>
                        {r.status === 'paid' ? t('referral.statusPaid') : t('referral.statusPending')}
                      </span>
                      {r.status === 'paid' && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--green)', fontWeight: 700 }}>+{fmtSum(REFERRAL_BONUS)}</span>}
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
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>{t('referral.promoTitle')}</div>
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginBottom: 8, lineHeight: 1.45 }}>
              {t('referral.promoSubtitle')}
            </div>
            {/* Hamkor/guruh kodi bilan kirgan ustoz o'z natijalari guruh
                ustoziga ko'rinishini BILISHI kerak — «Hamkor paneli» aynan shu
                ma'lumotni ko'rsatadi (ism, ID, o'zlashtirish, faollik). */}
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginBottom: 14, lineHeight: 1.45, opacity: 0.9 }}>
              {t('referral.promoPrivacy')}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(null); }}
                onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
                placeholder={t('referral.promoPlaceholder')}
                maxLength={32}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: 12, fontSize: 'var(--fs-input)',
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
                  ...s.primaryBtn, padding: '12px 18px', fontSize: 'var(--fs-base)', flexShrink: 0,
                  opacity: promoLoading || !promoCode.trim() ? 0.55 : 1,
                  cursor: promoLoading ? 'wait' : (!promoCode.trim() ? 'not-allowed' : 'pointer'),
                }}
              >
                {promoLoading ? '...' : t('referral.promoActivate')}
              </motion.button>
            </div>

            <AnimatePresence>
              {promoMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: 12, fontSize: 'var(--fs-md)', fontWeight: 700, lineHeight: 1.4,
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
  label: { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  copyBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg3)', fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' },
  primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 14, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 'var(--fs-lg)', cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 14, background: 'var(--bg2)', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' },
};
