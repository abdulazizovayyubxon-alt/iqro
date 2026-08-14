import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { ToastContext } from '../context/ToastContext';
import { fetchPartnerStats, PARTNER_ERRORS } from '../services/partner';
import {
  Users, TrendingUp, CheckCircle2, Share2, Copy, Check,
  Search, Award, Zap, Calendar, Flame, RefreshCw,
  Ticket, ArrowUpRight, Sparkles, UserCheck, Activity, ShieldAlert
} from 'lucide-react';

const readinessColor = (v) =>
  v == null ? 'var(--text3)' : v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)';

const readinessBg = (v) =>
  v == null ? 'var(--bg3)' : v >= 70 ? 'var(--green-bg)' : v >= 50 ? 'var(--amber-bg)' : 'rgba(239,68,68,0.1)';

export default function PartnerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { showToast } = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { promo, summary, members }
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminLookupCode, setAdminLookupCode] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('chqbt'); // default 'chqbt' ustoz fani bo'yicha
  const [visibleCount, setVisibleCount] = useState(25);

  const partnerCode = user?.partnerCode || (user?.role === 'partner' ? user?.uid : null);

  const loadStats = useCallback(async (customCode = null) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const codeToFetch = customCode || adminLookupCode || partnerCode;
      const res = await fetchPartnerStats(codeToFetch);

      if (res.ok) {
        setData(res);
      } else {
        const msg = PARTNER_ERRORS[res.error] || "Statistikani yuklashda xatolik yuz berdi";
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Internet aloqasini tekshiring");
    }
    setLoading(false);
  }, [adminLookupCode, partnerCode, showToast]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, loadStats]);

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast("Promokod nusxalandi!", 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast("Nusxalashda xatolik", 'error');
    }
  };

  const handleCopyShareLink = async (code) => {
    if (!code) return;
    const shareUrl = `${window.location.origin}/referral?promo=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast("Taklif havolasi nusxalandi!", 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast("Nusxalashda xatolik", 'error');
    }
  };

  const handleTelegramShare = (code, campaignName) => {
    if (!code) return;
    const shareUrl = `${window.location.origin}/referral?promo=${encodeURIComponent(code)}`;
    const text = `Assalomu alaykum, ustozlar! 🎓\n\n${campaignName || 'Attestatsiya'} bo'yicha maxsus testlar platformasidan foydalanish uchun bizning maxsus promokodimiz: 👉 **${code}**\n\nPlatformaga kirib ushbu kodni kiriting va imkoniyatlardan bepul foydalaning!`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  // Qidiruv bo'yicha filtrlash
  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!searchQuery.trim()) return data.members;
    const q = searchQuery.toLowerCase().trim();
    return data.members.filter(m =>
      (m.displayName && m.displayName.toLowerCase().includes(q)) ||
      (m.shortId && m.shortId.toLowerCase().includes(q))
    );
  }, [data?.members, searchQuery]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 14px 100px' }}>
      
      {/* ── Sarlavha paneli ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{
          padding: '24px 20px',
          borderRadius: 20,
          marginBottom: 20,
          background: 'linear-gradient(135deg, rgba(14,151,224,0.08) 0%, rgba(16,185,129,0.05) 100%)',
          border: '1.5px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--blue-bg)', color: 'var(--accent)', padding: '4px 12px', borderRadius: 20, fontSize: 'var(--fs-xs)', fontWeight: 800, marginBottom: 8, border: '1px solid rgba(14,151,224,0.2)' }}>
              <Sparkles size={14} /> HAMKOR BOSHQARUV PORTALI
            </div>
            <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 900, color: 'var(--text)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              {data?.promo?.partnerName || 'Hamkor Ustoz Kabineti'}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', margin: 0 }}>
              {data?.promo?.campaign || 'Attestatsiyaga tayyorgarlik guruhi faollik va natijalar monitoringi'}
            </p>
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={() => loadStats()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Yangilash
          </button>
        </div>

        {/* Super Admin qidiruv paneli (faqat bosh admin uchun) */}
        {isAdmin && (
          <div style={{ marginTop: 4, padding: '12px 14px', background: 'var(--bg2)', borderRadius: 14, border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> Super Admin: Hamkor kodini tekshirish
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="admin-input admin-input--code"
                placeholder="Masalan: MIRONSHOH"
                value={adminLookupCode}
                onChange={e => setAdminLookupCode(e.target.value.toUpperCase())}
                style={{ maxWidth: 220, textTransform: 'uppercase' }}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => loadStats(adminLookupCode)}
                disabled={!adminLookupCode.trim() || loading}
              >
                Ko'rish
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Yuklanish yoki Xatolik holati ── */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600 }}>Statistika yuklanmoqda...</div>
        </div>
      )}

      {errorMsg && !data && (
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', borderRadius: 20, color: 'var(--text2)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>{errorMsg}</div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', maxWidth: 450, margin: '0 auto 16px' }}>
            Sizga biriktirilgan promokod mavjudligini yoki admin tomonidan huquq berilganini tasdiqlang.
          </p>
          <button className="btn btn-sm btn-outline" onClick={() => loadStats()}>Qayta urinish</button>
        </div>
      )}

      {/* ── Asosiy ma'lumotlar bloki ── */}
      {data && (
        <>
          {/* ── Fan tanlash (Filter) ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>
              Statistika ko'rinishi:
            </div>
            <div style={{ display: 'inline-flex', background: 'var(--bg2)', padding: 4, borderRadius: 12, border: '1.5px solid var(--border)', gap: 4 }}>
              <button
                className={`btn btn-sm ${subjectFilter === 'chqbt' ? 'btn-primary' : 'btn-outline'}`}
                style={{ border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-xs)', fontWeight: 700 }}
                onClick={() => setSubjectFilter('chqbt')}
              >
                🎖️ CHQBT fani
              </button>
              <button
                className={`btn btn-sm ${subjectFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-xs)', fontWeight: 700 }}
                onClick={() => setSubjectFilter('all')}
              >
                🌐 Barcha fanlar
              </button>
            </div>
          </div>

          {/* ── 1. Metrika kartalari (Summary Cards) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            
            {/* Jami a'zolar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="glass-panel"
              style={{ padding: '18px 16px', borderRadius: 16, border: '1.5px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Jami qo'shilganlar
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                {data.summary?.totalMembers ?? 0}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                Promokodni kiritgan ustozlar
              </div>
            </motion.div>

            {/* 7 kunlik faollar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-panel"
              style={{ padding: '18px 16px', borderRadius: 16, border: '1.5px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Faol ustozlar
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--green-bg)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>
                {data.summary?.active7d ?? 0}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                Oxirgi 7 kunda test ishlaganlar
              </div>
            </motion.div>

            {/* Yechilgan savollar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="glass-panel"
              style={{ padding: '18px 16px', borderRadius: 16, border: '1.5px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                  {subjectFilter === 'chqbt' ? 'CHQBT savollari' : 'Jami savollar'}
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                {subjectFilter === 'chqbt'
                  ? (data.summary?.chqbtTotalAnswered ? data.summary.chqbtTotalAnswered.toLocaleString('uz-UZ') : 0)
                  : (data.summary?.totalAnswered ? data.summary.totalAnswered.toLocaleString('uz-UZ') : 0)}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                {subjectFilter === 'chqbt' ? 'CHQBT bo\'yicha yechilgan' : 'Guruh jami javoblari'}
              </div>
            </motion.div>

            {/* O'rtacha o'zlashtirish */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-panel"
              style={{ padding: '18px 16px', borderRadius: 16, border: '1.5px solid var(--border)' }}
            >
              {(() => {
                const acc = subjectFilter === 'chqbt' ? data.summary?.chqbtAvgAccuracy : data.summary?.avgAccuracy;
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                        {subjectFilter === 'chqbt' ? 'CHQBT aniqligi' : 'Jami aniqlik'}
                      </span>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: readinessBg(acc), color: readinessColor(acc), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: readinessColor(acc), lineHeight: 1 }}>
                      {acc != null ? `${acc}%` : '—'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                      {subjectFilter === 'chqbt' ? 'CHQBT o\'zlashtirish foizi' : 'Guruh umumiy o\'zlashtirishi'}
                    </div>
                  </>
                );
              })()}
            </motion.div>

          </div>

          {/* ── 2. Promokod va Ulashish bloki ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: 20,
              marginBottom: 24,
              border: '1.5px solid var(--border)',
              background: 'var(--bg2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Guruh a'zolari uchun maxsus promokod
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                  Ushbu kod orqali kirgan ustozlar toifa mavsumida platformadan bepul foydalanishadi.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleTelegramShare(data.promo.code, data.promo.campaign)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#229ED9', borderColor: '#229ED9', color: '#fff' }}
                >
                  <Share2 size={14} /> Telegramga ulashish
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Kod ko'rinishi */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--bg)',
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1.5px solid var(--accent)',
                  flex: '1 1 240px',
                }}
              >
                <Ticket size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, letterSpacing: 1.5, color: 'var(--text)', fontFamily: 'monospace' }}>
                  {data.promo?.code}
                </span>
              </div>

              {/* Kodni nusxalash tugmasi */}
              <button
                className="btn btn-md btn-outline"
                onClick={() => handleCopyCode(data.promo?.code)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copiedCode ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                {copiedCode ? 'Nusxalandi!' : 'Kodni nusxalash'}
              </button>

              {/* Havolani nusxalash tugmasi */}
              <button
                className="btn btn-md btn-outline"
                onClick={() => handleCopyShareLink(data.promo?.code)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copiedLink ? <Check size={16} style={{ color: 'var(--green)' }} /> : <ArrowUpRight size={16} />}
                {copiedLink ? 'Havola olindi!' : 'Havola nusxalash'}
              </button>
            </div>
          </motion.div>

          {/* ── 3. Guruh Ustozlari Ro'yxati / Monitoring ── */}
          <div className="glass-panel" style={{ padding: '20px', borderRadius: 20, border: '1.5px solid var(--border)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={18} style={{ color: 'var(--green)' }} />
                  Guruh Ustozlari Faolligi ({filteredMembers.length})
                </h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', margin: 0 }}>
                  A'zolarning test topshirish jarayoni va natijalari
                </p>
              </div>

              {/* Qidiruv inputi */}
              <div style={{ position: 'relative', minWidth: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type="text"
                  placeholder="Ism yoki ID bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 30px',
                    borderRadius: 10,
                    fontSize: 'var(--fs-xs)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* A'zolar ro'yxati jadvali */}
            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
                <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                  {searchQuery ? "Qidiruv bo'yicha hech kim topilmadi" : "Hozircha promokod orqali hech kim kirmagan"}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', marginTop: 4 }}>
                  Guruhga promokodni ulashsangiz, a'zolar bu yerda aks etadi.
                </div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--fs-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--text3)', fontSize: 'var(--fs-xs)', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 8px' }}>Ustoz</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {subjectFilter === 'chqbt' ? 'CHQBT savol' : 'Yechilgan'}
                        </th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {subjectFilter === 'chqbt' ? 'CHQBT aniqlik' : 'Aniqlik'}
                        </th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Tayyorlik</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Oxirgi faollik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.slice(0, visibleCount).map((m, idx) => {
                        const joinDate = m.redeemedAt ? new Date(m.redeemedAt).toLocaleDateString('uz-UZ') : '—';
                        const answeredCount = subjectFilter === 'chqbt' ? m.chqbtAnswered : m.answered;
                        const accuracyVal = subjectFilter === 'chqbt' ? m.chqbtAccuracy : m.accuracy;

                        return (
                          <tr
                            key={m.uid || idx}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              transition: 'background 0.2s',
                            }}
                          >
                            {/* Ustoz ma'lumotlari */}
                            <td style={{ padding: '12px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 'var(--fs-xs)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {m.displayName ? m.displayName.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    {m.displayName || 'Ustoz'}
                                  </div>
                                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {m.shortId && <span>ID: {m.shortId}</span>}
                                    <span>•</span>
                                    <span>Qo'shildi: {joinDate}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Yechilgan savollar */}
                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>
                              {answeredCount > 0 ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Zap size={13} style={{ color: 'var(--amber)' }} />
                                  {answeredCount}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text3)' }}>0</span>
                              )}
                            </td>

                            {/* Aniqlik */}
                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 800, color: readinessColor(accuracyVal) }}>
                              {accuracyVal != null ? `${accuracyVal}%` : '—'}
                            </td>

                            {/* Tayyorlik bali */}
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              {m.readiness != null ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                    fontSize: 'var(--fs-xs)',
                                    fontWeight: 800,
                                    background: readinessBg(m.readiness),
                                    color: readinessColor(m.readiness),
                                  }}
                                >
                                  {m.readiness}%
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text3)', fontSize: 'var(--fs-xs)' }}>Boshlanmagan</span>
                              )}
                            </td>

                            {/* Oxirgi faollik */}
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: 'var(--text3)' }}>
                              {m.lastActiveAt ? (
                                <div>{new Date(m.lastActiveAt).toLocaleDateString('uz-UZ')}</div>
                              ) : (
                                <span>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Yana yuklash tugmasi (Pagination) */}
                {filteredMembers.length > visibleCount && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => setVisibleCount(c => c + 25)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      Yana 25 ta ko'rsatish ({filteredMembers.length - visibleCount} ta qoldi)
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </>
      )}

    </div>
  );
}
