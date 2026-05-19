/**
 * ════════════════════════════════════════════════════════════
 *  IQRO PLATFORMA — Do'stlarni Taklif Qilish Sahifasi
 *  src/pages/ReferralPage.jsx
 * ════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Copy, Check, Users, Gift, Clock,
  Star, Share2, ChevronRight, Trophy, Zap, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import {
  getUserReferralCode,
  buildReferralLink,
  getReferralStats,
  MAX_REFERRALS,
  REFERRAL_BONUS,
  FREE_MONTH_DAYS,
  MONTHLY_PRICE,
  MAX_TOTAL_BONUS,
} from '../services/referral';

// ── Yordamchi: so'mni formatlash ──
const fmtSum = (n) => n.toLocaleString('uz-UZ') + " so'm";

// ── Status badge ──
const StatusBadge = ({ status }) => {
  if (status === 'paid') {
    return (
      <span style={{
        fontSize: '11px', fontWeight: 700,
        background: 'rgba(34,197,94,0.15)', color: '#22c55e',
        padding: '2px 10px', borderRadius: '20px', display: 'inline-flex',
        alignItems: 'center', gap: 4
      }}>
        <Check size={10} /> To'ladi
      </span>
    );
  }
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700,
      background: 'rgba(234,179,8,0.15)', color: '#eab308',
      padding: '2px 10px', borderRadius: '20px', display: 'inline-flex',
      alignItems: 'center', gap: 4
    }}>
      <Clock size={10} /> Kutilmoqda
    </span>
  );
};

// ── Progress bar ──
const ProgressBar = ({ value, max, color = 'var(--blue)' }) => (
  <div style={{
    width: '100%', height: 8, background: 'var(--bg3)',
    borderRadius: 8, overflow: 'hidden'
  }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{ height: '100%', background: color, borderRadius: 8 }}
    />
  </div>
);

// ── Asosiy komponent ──
export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [refCode, setRefCode] = useState('');
  const [refLink, setRefLink] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false); // 'code' | 'link' | false

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

  // ── Nusxa olish ──
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

  // ── Ulashish ──
  const shareReferral = async () => {
    const text = `🎓 IQRO Platformasiga qo'shiling!\n\nMen siz uchun 1 oylik bepul kirish yo'llab berdim.\n👉 ${refLink}\n\nYoki kod: ${refCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'IQRO Platform', text, url: refLink });
      } catch { /* bekor qilingan */ }
    } else {
      await copyToClipboard(text, 'link');
    }
  };

  // ── Telegram orqali ulashish ──
  const shareViaTelegram = () => {
    const text = encodeURIComponent(
      `🎓 IQRO Platformasiga qo'shiling! 1 oylik bepul kirish:\n${refLink}\nKod: ${refCode}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${text}`, '_blank');
  };

  if (!user) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
          <AlertCircle size={40} style={{ marginBottom: 12 }} />
          <div>Iltimos, avval tizimga kiring</div>
        </div>
      </div>
    );
  }

  const bonusProgress = stats ? (stats.paid * REFERRAL_BONUS) : 0;

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/')} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
            👥 Do'stlarni taklif qilish
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Taklif qiling — ikkalangiz yuting!
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Yuklanmoqda...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>

          {/* ── Qanday ishlaydi ── */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
              ⚡ Qanday ishlaydi?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  icon: '🔗',
                  title: "Havolangizni yuboring",
                  desc: "Do'stingizga shaxsiy referral havolangizni yuboring"
                },
                {
                  icon: '🎁',
                  title: `Do'stingiz ${FREE_MONTH_DAYS} kun bepul foydalanadi`,
                  desc: "Ro'yxatdan o'tgandan darhol 1 oylik premium kirish ochiladi"
                },
                {
                  icon: '💰',
                  title: `Do'stingiz to'laganda siz ${fmtSum(REFERRAL_BONUS)} bonus olasiz`,
                  desc: `Maksimal ${MAX_REFERRALS} ta = ${fmtSum(MAX_TOTAL_BONUS)} (1.5 oylik bepul!)`
                },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--blue-bg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Kod va havola ── */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
              🎫 Sizning referral ma'lumotlaringiz
            </div>

            {/* Kod */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Referral kodingiz</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg3)', borderRadius: 12, padding: '10px 14px'
              }}>
                <span style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: 4,
                  color: 'var(--blue)', fontFamily: 'monospace', flex: 1
                }}>
                  {refCode}
                </span>
                <button
                  className="btn btn-outline"
                  onClick={() => copyToClipboard(refCode, 'code')}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  {copied === 'code' ? <Check size={14} /> : <Copy size={14} />}
                  {copied === 'code' ? 'Nusxalandi' : 'Nusxa'}
                </button>
              </div>
            </div>

            {/* Havola */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Referral havolangiz</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg3)', borderRadius: 12, padding: '10px 14px'
              }}>
                <span style={{
                  fontSize: 12, color: 'var(--text2)', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {refLink}
                </span>
                <button
                  className="btn btn-outline"
                  onClick={() => copyToClipboard(refLink, 'link')}
                  style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                >
                  {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                  {copied === 'link' ? 'Nusxalandi' : 'Nusxa'}
                </button>
              </div>
            </div>

            {/* Ulashish tugmalari */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={shareReferral}
                style={{ flex: 1 }}
              >
                <Share2 size={15} /> Ulashish
              </button>
              <button
                className="btn btn-outline"
                onClick={shareViaTelegram}
                style={{ flex: 1, color: '#0088cc', borderColor: '#0088cc' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 6 }}>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.54l-2.95-.924c-.64-.203-.658-.64.136-.954l11.57-4.46c.538-.194 1.006.131.837.948l-.869.07z"/>
                </svg>
                Telegram
              </button>
            </div>
          </div>

          {/* ── Bonus progress ── */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                🏆 Bonus hisobingiz
              </div>
              <div style={{
                fontSize: 18, fontWeight: 900, color: 'var(--blue)'
              }}>
                {fmtSum(bonusProgress)}
              </div>
            </div>

            <ProgressBar
              value={stats?.paid || 0}
              max={MAX_REFERRALS}
              color="linear-gradient(90deg, var(--blue), #8b5cf6)"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
              <span>{stats?.paid || 0} ta to'ladi</span>
              <span>Maqsad: {MAX_REFERRALS} ta = {fmtSum(MAX_TOTAL_BONUS)}</span>
            </div>

            {/* Qadamlar */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {Array.from({ length: MAX_REFERRALS }).map((_, i) => {
                const isPaid = i < (stats?.paid || 0);
                const isPending = !isPaid && i < (stats?.total || 0);
                return (
                  <div key={i} style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                    background: isPaid
                      ? 'rgba(34,197,94,0.15)'
                      : isPending
                        ? 'rgba(234,179,8,0.15)'
                        : 'var(--bg3)',
                    border: `1.5px solid ${isPaid ? '#22c55e' : isPending ? '#eab308' : 'var(--border)'}`,
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>
                      {isPaid ? '✅' : isPending ? '⏳' : '👤'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isPaid ? '#22c55e' : isPending ? '#eab308' : 'var(--text3)' }}>
                      {isPaid ? fmtSum(REFERRAL_BONUS) : isPending ? "Kutilmoqda" : `+${fmtSum(REFERRAL_BONUS)}`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Limit to'lganda */}
            {!stats?.canInviteMore && (
              <div style={{
                marginTop: 12, padding: '10px 14px', background: 'rgba(34,197,94,0.1)',
                borderRadius: 10, fontSize: 13, color: '#22c55e',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Trophy size={16} />
                Siz maksimal {MAX_REFERRALS} ta taklif limitiga yetdingiz! 🎉
              </div>
            )}
          </div>

          {/* ── Referrallar ro'yxati ── */}
          {stats?.referrals?.length > 0 && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
                👥 Taklif qilganlarim ({stats.referrals.length}/{MAX_REFERRALS})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.referrals.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: 'var(--bg3)',
                      borderRadius: 10
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: r.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0
                    }}>
                      {r.referredName?.[0]?.toUpperCase() || '👤'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {r.referredName || "Noma'lum"}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {new Date(r.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={r.status} />
                      {r.status === 'paid' && (
                        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                          +{fmtSum(REFERRAL_BONUS)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Chaqiruv paneli (agar joy qolgan bo'lsa) ── */}
          {stats?.canInviteMore && (
            <motion.div
              className="glass-panel"
              style={{
                padding: 20, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
                border: '1.5px dashed var(--blue)'
              }}
              whileHover={{ scale: 1.01 }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Yana {stats.remainingSlots} ta do'stingizni taklif qiling!
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
                Har biri to'laganda {fmtSum(REFERRAL_BONUS)} bonus olasiz
              </div>
              <button className="btn btn-primary" onClick={shareReferral} style={{ width: '100%' }}>
                <Gift size={15} /> Hoziroq taklif qilish
              </button>
            </motion.div>
          )}

        </div>
      )}
    </motion.div>
  );
}
