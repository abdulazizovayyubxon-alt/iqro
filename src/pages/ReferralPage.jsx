/**
 * ReferralPage.jsx — Yangi toza minimal dizayn
 */
import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Gift, Share2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  getUserReferralCode,
  buildReferralLink,
  getReferralStats,
  MAX_REFERRALS,
  REFERRAL_BONUS,
  FREE_MONTH_DAYS,
  MAX_TOTAL_BONUS,
  REFERRAL_DISCOUNT,
  DISCOUNT_AMOUNT,
} from '../services/referral';

const fmtSum = (n) => n.toLocaleString('uz-UZ') + " so'm";

export default function ReferralPage() {
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [refCode, setRefCode] = useState('');
  const [refLink, setRefLink] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
      setRefCode(code);
      setRefLink(link);
      setStats(st);
    } catch (e) {
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
      // 1 — Shaxsiy tavsiya uslubi
      `📚 Assalomu alaykum!

${firstName} sizga IQRO platformasida ${REFERRAL_DISCOUNT}% CHEGIRMA ulashmoqda!

IQRO — kasbiy sertifikatlash imtihoniga tayyorgarlik platformasi.

✅ Testlar va imtihon simulyatsiyasi
✅ Aqlli takrorlash tizimi
✅ Ikki tomonga ${REFERRAL_DISCOUNT}% chegirma

Havola orqali ro'yxatdan o'ting — SIZ HAM, MEN HAM ${REFERRAL_DISCOUNT}% chegirma olamiz! 👇
${refLink}`,

      // 2 — Muammo → Yechim uslubi
      `🎯 Sertifikatlash imtihoniga tayyorlanayapsizmi?

${firstName} siz bilan IQRO da birga o'qishni taklif qilmoqda!

Ro'yxatdan o'tish: ${refLink}

Bugundan boshlang — imtihon yaqinlashmoqda!`,

      // 3 — Statistika va ishonch uslubi
`🏆 ${firstName} sizga ${REFERRAL_DISCOUNT}% chegirma sovg'a qilmoqda!

IQRO — kasbiy sertifikatlash platformasi.

Nima uchun IQRO?
• 7 ta fan bo'yicha 1000+ savollar bazasi
• Haqiqiy imtihon sharoitida mashq
• Xatolarni tahlil qilish tizimi
• O'qituvchilar reytingi

Sertifikatlash imtihoni yaqinlashmoqda — tayyorgarlikni bugundan boshlang.

🔗 ${refLink}`,

      // 4 — Qisqa va ta'sirchan
`👋 Salom!

${firstName} sizga IQRO platformasida ${REFERRAL_DISCOUNT}% chegirma ulashmoqda.

IQRO — kasbiy sertifikatlash imtihoniga onlayn tayyorgarlik. Qulay, tez va samarali.

Bugun ro'yxatdan o'tish:
${refLink}

⏳ Taklif muddatli — o'tkazib yubormang!`,
    ];

    // Tasodifiy matn tanlash
    const idx = Math.floor(Math.random() * messages.length);

    if (platform === 'telegram') {
      // Telegram uchun qisqaroq variant
      return `📚 ${firstName} sizga IQRO da ${REFERRAL_DISCOUNT}% CHEGIRMA ulashmoqda!\n\nRo\u2018yxatdan o\u2018ting — IKKALANGIZ ${REFERRAL_DISCOUNT}% chegirma olasiz!\n\n✅ Ro\u2018yxatdan o\u2018tish: ${refLink}`;
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
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`, '_blank');
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

  const bonusProgress = stats ? (stats.paid * REFERRAL_BONUS) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 100px' }}
    >
      <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>
        🤝 Do'stlarni taklif qilish
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>
        Taklif qiling — ikkalangiz {REFERRAL_DISCOUNT}% chegirma oling!
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div>Yuklanmoqda...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Bonus banner */}
          <div style={{
            background: 'linear-gradient(135deg, #29B6F6, #0284C7)',
            borderRadius: 20, padding: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>50/50 Model — ikki tomonga foyda</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '4px 0' }}>{stats?.total || 0} / {MAX_REFERRALS}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {stats?.total || 0} ta do'st taklif qilindi · Ikki tomonga {REFERRAL_DISCOUNT}% chegirma
              </div>
            </div>
            <div style={{ fontSize: 48 }}>🎁</div>
          </div>

          {/* Kod va havola */}
          <div style={s.card}>
            <div style={s.label}>Sizning referral ma'lumotlaringiz</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>REFERRAL HAVOLA</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '10px 14px' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {refLink}
                </span>
                <button style={s.copyBtn} onClick={() => copyToClipboard(refLink, 'link')}>
                  {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                  {copied === 'link' ? 'Nusxalandi' : 'Nusxa'}
                </button>
              </div>
            </div>

            {/* Matnni nusxalash — har qanday qurilmada ishlaydi */}
            <button
              onClick={() => copyToClipboard(getShareMessage(user?.displayName), 'msg')}
              style={{ ...s.outlineBtn, width: '100%', marginBottom: 10, justifyContent: 'center', gap: 8 }}
            >
              {copied === 'msg' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'msg' ? 'Matn nusxalandi! ✅' : 'Tayyor matn nusxalash (WhatsApp / SMS)'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={shareReferral} style={{ ...s.primaryBtn, flex: 1 }}>
                <Share2 size={16} /> Ulashish
              </button>
              <button onClick={shareViaTelegram} style={{ ...s.outlineBtn, flex: 1, borderColor: '#29B6F6', color: '#0088cc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.54l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.46c.538-.194 1.006.131.837.948z" />
                </svg>
                Telegram
              </button>
            </div>
          </div>

          {/* Progress */}
          <div style={s.card}>
            <div style={s.label}>Taklif qadamlari</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {Array.from({ length: MAX_REFERRALS }).map((_, i) => {
                const isPaid = i < (stats?.paid || 0);
                const isPending = !isPaid && i < (stats?.total || 0);
                return (
                  <div key={i} style={{
                    flex: 1, padding: '10px 4px', borderRadius: 12, textAlign: 'center',
                    background: isPaid ? 'var(--green-bg)' : isPending ? 'var(--amber-bg)' : 'var(--bg3)',
                    border: `1.5px solid ${isPaid ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--border)'}`,
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{isPaid ? '✅' : isPending ? '⏳' : '👤'}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isPaid ? 'var(--green)' : isPending ? 'var(--amber)' : 'var(--text3)' }}>
                      {isPaid ? fmtSum(REFERRAL_BONUS) : isPending ? 'Kutilmoqda' : `+${fmtSum(REFERRAL_BONUS)}`}
                    </div>
                  </div>
                );
              })}
            </div>
            {!stats?.canInviteMore && (
              <div style={{ background: 'var(--green-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--green)' }}>
                🏆 Siz maksimal {MAX_REFERRALS} ta taklif limitiga yetdingiz!
              </div>
            )}
          </div>

          {/* Qanday ishlaydi */}
          <div style={s.card}>
            <div style={s.label}>Qanday ishlaydi?</div>
            {[
              { icon: '🔗', title: 'Havolangizni yuboring', desc: "Do'stingizga shaxsiy referral havolangizni yuboring" },
              { icon: '🎉', title: `Ikkalangiz ${REFERRAL_DISCOUNT}% chegirma!`, desc: `Siz ham, do'stingiz ham to'lovda ${REFERRAL_DISCOUNT}% chegirma oladi` },
              { icon: '💰', title: `Keyingi to'lovda ${REFERRAL_DISCOUNT}% chegirma`, desc: `Ikki tomonga ${fmtSum(DISCOUNT_AMOUNT)} tejaladi` },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Referrallar ro'yxati */}
          {stats?.referrals?.length > 0 && (
            <div style={s.card}>
              <div style={s.label}>Taklif qilganlarim ({stats.referrals.length}/{MAX_REFERRALS})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.referrals.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: r.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: r.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>
                      {r.referredName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{r.referredName || "Noma'lum"}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>Sana: {new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</span>
                        {(() => {
                          if (r.freeExpire) {
                            return (
                              <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
                                🎁 Bepul premium: {new Date(r.freeExpire).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })} gacha
                              </span>
                            );
                          }
                          const created = new Date(r.createdAt);
                          const now = new Date();
                          const diffMs = now - created;
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          if (diffDays < 7) {
                            return (
                              <span style={{ color: '#29B6F6', fontWeight: 600 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
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

          {/* CTA */}
          {stats?.canInviteMore && (
            <div style={{ border: '2px dashed var(--border)', borderRadius: 16, padding: '20px', textAlign: 'center', background: 'var(--blue-bg)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Yana {stats.remainingSlots} ta do'stingizni taklif qiling!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
                Har biri to'laganda {fmtSum(REFERRAL_BONUS)} bonus olasiz
              </div>
              <button onClick={shareReferral} style={{ ...s.primaryBtn, width: '100%' }}>
                <Gift size={15} /> Hoziroq taklif qilish
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const s = {
  card: { background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 18, padding: '18px 16px' },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  copyBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg3)', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' },
  primaryBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', borderRadius: 14, background: '#29B6F6', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 14, background: 'var(--bg2)', border: '1.5px solid var(--border)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text2)' },
};
