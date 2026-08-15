import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { ToastContext } from '../context/ToastContext';
import { fetchPartnerStats, PARTNER_ERRORS } from '../services/partner';
import { SUBJECTS } from '../data/mockData';
import { APP_URL } from '../config';
import {
  Users, TrendingUp, Share2, Copy, Check, Search, Zap, RefreshCw,
  Ticket, ArrowUpRight, Sparkles, UserCheck, Activity, ShieldAlert, BookOpen,
  HelpCircle, ChevronDown, Link2, AlertCircle
} from 'lucide-react';

const GUIDE_KEY = 'zehin_partner_guide';

const readinessColor = (v) =>
  v == null ? 'var(--text3)' : v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)';

const readinessBg = (v) =>
  v == null ? 'var(--bg3)' : v >= 70 ? 'var(--green-bg)' : v >= 50 ? 'var(--amber-bg)' : 'rgba(239,68,68,0.1)';

export default function PartnerPage() {
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
  const [availablePromos, setAvailablePromos] = useState([]);
  const [visibleCount, setVisibleCount] = useState(25);
  // Qo'llanma birinchi kirishda OCHIQ turadi — hamkor ustoz havola qanday
  // ishlashini bilmasa, guruhini noto'g'ri yo'naltiradi. Yopgandan keyin
  // tanlov eslab qolinadi.
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem(GUIDE_KEY) !== 'closed'; } catch { return true; }
  });

  const toggleGuide = () => {
    setGuideOpen(prev => {
      try { localStorage.setItem(GUIDE_KEY, prev ? 'closed' : 'open'); } catch { /* private rejim */ }
      return !prev;
    });
  };

  // ⚠️ HAMKOR AUDITI 2026-08-15: ilgari bu yerda `user?.uid` zaxira kod
  // sifatida yuborilardi. Server kelgan qatorni promokod deb qabul qiladi
  // (`toUpperCase()` + hujjat ID), ya'ni uid hech qachon topilmay
  // «promokod topilmadi» chiqardi VA serverning o'z qidiruvini
  // (`promoCodes.where('partnerUid','==',uid)`) bloklab qo'yardi — u faqat
  // kod BO'SH bo'lganda ishlaydi. Endi kodsiz hamkor serverga topib beriladi.
  const partnerCode = user?.partnerCode || null;

  // `adminLookupCode` ni loadStats ichida REF orqali o'qiymiz. Sabab: u
  // useCallback bog'liqligida bo'lsa, muvaffaqiyatli yuklashdan keyingi
  // `setAdminLookupCode(...)` loadStats identifikatorini yangilab, uni
  // kuzatayotgan useEffect'ni QAYTA ishga tushirardi — ya'ni sahifa har
  // ochilganda statistika IKKI MARTA to'liq yuklanardi (promokod + barcha
  // redemption + a'zo boshiga 2 ta hujjat). Kvota bo'yicha bu eng qimmat
  // so'rovimiz edi.
  const adminLookupRef = useRef('');
  useEffect(() => { adminLookupRef.current = adminLookupCode; }, [adminLookupCode]);

  // ⚠️ `showToast` ToastContext'da memoizatsiya QILINMAGAN (har renderда yangi
  // funksiya). U loadStats bog'liqligida turgani uchun HALQA hosil bo'lardi:
  // yuklash xato → toast ko'rsatiladi → context qayta render → yangi showToast
  // → yangi loadStats → useEffect qayta ishga tushadi → yana yuklash → yana
  // xato… Ya'ni bitta xato /api/partner ga to'xtovsiz so'rov yog'dirardi
  // (rate-limit 30/daq ga urilib, xato matni ham o'zgarardi). Ref orqali
  // o'qiymiz — funksiya doim eng yangisi, lekin bog'liqlik o'zgarmaydi.
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });
  // Promokodlar ro'yxati (admin tanlagichi) faqat BIR MARTA so'raladi.
  const promoListRequestedRef = useRef(false);

  const loadStats = useCallback(async (customCode = null) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const codeToFetch = customCode || adminLookupRef.current || partnerCode;
      const withPromoList = isAdmin && !promoListRequestedRef.current;
      if (withPromoList) promoListRequestedRef.current = true;
      const res = await fetchPartnerStats(codeToFetch, { withPromoList });

      // `?.length` SHART: server ro'yxatni so'ralmaganda bo'sh massiv ham
      // qaytarishi mumkin — u holda mavjud tanlagichni tozalab yubormaymiz.
      if (res.allPartnerPromos?.length) {
        setAvailablePromos(res.allPartnerPromos);
      }

      if (res.ok) {
        setData(res);
        // Yangi kod/yangi ro'yxat — «Yana 25 ta» hisoblagichi ham qaytadan
        // boshlansin, aks holda boshqa hamkorga o'tganda ro'yxat allaqachon
        // ochilgan holatda ko'rinardi.
        setVisibleCount(25);
        if (res.promo?.code && !adminLookupRef.current) {
          setAdminLookupCode(res.promo.code);
        }
      } else {
        const msg = PARTNER_ERRORS[res.error] || "Statistikani yuklashda xatolik yuz berdi";
        setErrorMsg(msg);
        showToastRef.current?.(msg, 'error');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Internet aloqasini tekshiring");
    }
    setLoading(false);
  }, [partnerCode, isAdmin]);

  useEffect(() => {
    if (user?.uid) {
      loadStats();
    }
    // `user` obyekti AuthContext'da har yangilanishda qayta yaratiladi —
    // to'liq obyektga bog'lansak, statistika keraksiz qayta yuklanardi.
  }, [user?.uid, loadStats]);

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

  // ── Taklif havolasi ──
  // ⚠️ Ilgari havola `/referral?promo=KOD` edi va u HECH NARSA qilmasdi:
  // `?promo=` ni butun ilovada hech kim o'qimasdi, `/referral` esa tizimga
  // kirmaganlar uchun yopiq (login sahifasiga tushardi) — ya'ni havola bilan
  // kelgan odam guruhga qo'shilmasdan qolaverardi va hamkor panelida faqat
  // kodni QO'LDA yozganlar ko'rinardi.
  // Endi `/?promo=KOD`: kod AuthContext'da yuklanish paytida ilib olinadi,
  // ro'yxatdan o'tgach PartnerJoinCard bir bosishlik tasdiq so'raydi.
  // Lokal muhitda origin `localhost` bo'ladi — nusxalangan havola boshqa
  // qurilmada ochilmaydi, shuning uchun referral.js kabi APP_URL ga tushamiz.
  const buildPartnerLink = (code) => {
    let base = window.location.origin;
    if (base.includes('localhost') || base.includes('127.0.0.1')) base = APP_URL;
    return `${base}/?promo=${encodeURIComponent(code)}`;
  };

  const handleCopyShareLink = async (code) => {
    if (!code) return;
    const shareUrl = buildPartnerLink(code);
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
    const shareUrl = buildPartnerLink(code);
    // Matn ham yangilandi: asosiy yo'l endi HAVOLA (kod avtomatik taklif
    // qilinadi), kod esa zaxira — uni qo'lda kiritish ham ishlaydi.
    const text = `Assalomu alaykum, ustozlar! 🎓\n\n${campaignName || 'Attestatsiya'} bo'yicha maxsus testlar platformasiga quyidagi havola orqali qo'shiling — ro'yxatdan o'tganingizdan so'ng guruhga qo'shilish taklifi o'zi chiqadi.\n\nHavola ochilmasa, platformaga kirib promokodni qo'lda kiriting: 👉 ${code}`;
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

  // ── Hamkorga biriktirilgan fan ──
  // Ilgari bu yerda «CHQBT / Barcha fanlar» tugmachalari turardi va CHQBT
  // kodda qotib yozilgan edi. Endi fanni SERVER aytadi (kodga yoki hamkor
  // profiliga biriktirilgan), tanlagich esa umuman kerak emas: hamkor o'z
  // guruhini o'z fani bo'yicha ko'radi. Fan biriktirilmagan bo'lsa — jami
  // ko'rsatkichlar ko'rsatiladi, "barchasi" degan nom ishlatilmaydi.
  const subjectMeta = data?.subject ? SUBJECTS.find(s => s.id === data.subject) : null;
  const subjectLabel = subjectMeta?.name || null;
  const hasSubject = !!data?.subject;

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
              {data?.promo?.partnerName || (isAdmin ? 'Hamkorlar boshqaruvi' : 'Hamkor Ustoz Kabineti')}
            </h1>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', margin: 0 }}>
              {data?.promo?.campaign || 'Attestatsiyaga tayyorgarlik guruhi faollik va natijalar monitoringi'}
            </p>
            {/* Biriktirilgan fan — hisobotdagi barcha fan ko'rsatkichlari
                aynan shu fanga tegishli, shuning uchun u yuqorida turadi. */}
            {subjectLabel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--green-bg)', color: 'var(--green)', padding: '3px 10px', borderRadius: 20, fontSize: 'var(--fs-xs)', fontWeight: 800 }}>
                <BookOpen size={13} /> {subjectLabel}
              </div>
            )}
          </div>

          <button
            className="btn btn-sm btn-outline"
            onClick={() => loadStats(adminLookupCode)}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Yangilash
          </button>
        </div>

        {/* Super Admin qidiruv va tanlov paneli */}
        {isAdmin && (
          <div style={{ marginTop: 4, padding: '12px 14px', background: 'var(--bg2)', borderRadius: 14, border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> Super Admin: Hamkor kodini tanlash yoki kiritish
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {availablePromos.length > 0 && (
                <select
                  className="admin-input"
                  style={{ maxWidth: 260, fontSize: 'var(--fs-xs)', fontWeight: 700 }}
                  value={data?.promo?.code || adminLookupCode}
                  onChange={(e) => {
                    setAdminLookupCode(e.target.value);
                    loadStats(e.target.value);
                  }}
                >
                  {availablePromos.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.code} {p.partnerName ? `(${p.partnerName})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <input
                className="admin-input admin-input--code"
                placeholder="Masalan: MIRONSHOH"
                value={adminLookupCode}
                onChange={e => setAdminLookupCode(e.target.value.toUpperCase())}
                style={{ maxWidth: 180, textTransform: 'uppercase' }}
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

      {/* ── Yuklanish holati ── */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600 }}>Statistika yuklanmoqda...</div>
        </div>
      )}

      {/* ── Xatolik yoki promokod topilmagan holati ── */}
      {errorMsg && !data && (
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', borderRadius: 20, color: 'var(--text2)', marginBottom: 20 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{errorMsg}</div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', maxWidth: 450, margin: '0 auto 16px' }}>
            {isAdmin
              ? "Yuqoridagi maydonga mavjud hamkor promokodini kiriting yoki Admin paneldan yangi promokod yarating."
              : "Sizga biriktirilgan promokod mavjudligini yoki admin tomonidan huquq berilganini tasdiqlang."}
          </p>
          <button className="btn btn-sm btn-outline" onClick={() => loadStats()}>Qayta urinish</button>
        </div>
      )}

      {/* Yangilash muvaffaqiyatsiz bo'lsa, ekranda ESKI ma'lumot qoladi.
          Ilgari bu haqda faqat bir lahzalik toast aytardi — ustoz eskirgan
          raqamlarni joriy deb o'qishi mumkin edi. */}
      {errorMsg && data && (
        <div className="glass-panel" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 14, border: '1.5px solid var(--amber)', color: 'var(--text2)', fontSize: 'var(--fs-xs)' }}>
          ⚠️ {errorMsg} — quyidagi ma'lumot oxirgi muvaffaqiyatli yuklashdan.
        </div>
      )}

      {/* ── Asosiy ma'lumotlar bloki ── */}
      {data && (
        <>
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
                  {hasSubject ? `${subjectLabel} savollari` : 'Jami savollar'}
                </span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} />
                </div>
              </div>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                {(() => {
                  const n = hasSubject ? data.summary?.subjectTotalAnswered : data.summary?.totalAnswered;
                  return n ? n.toLocaleString('uz-UZ') : 0;
                })()}
              </div>
              <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                {hasSubject ? `${subjectLabel} bo'yicha yechilgan` : 'Guruh jami javoblari'}
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
                const acc = hasSubject ? data.summary?.subjectAvgAccuracy : data.summary?.avgAccuracy;
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                        {hasSubject ? `${subjectLabel} aniqligi` : 'Jami aniqlik'}
                      </span>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: readinessBg(acc), color: readinessColor(acc), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color: readinessColor(acc), lineHeight: 1 }}>
                      {acc != null ? `${acc}%` : '—'}
                    </div>
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 6 }}>
                      {hasSubject ? `${subjectLabel} o'zlashtirish foizi` : 'Guruh umumiy o\'zlashtirishi'}
                    </div>
                  </>
                );
              })()}
            </motion.div>

          </div>

          {/* ── 2. Promokod va Ulashish bloki ──
              `data.promo` NULL bo'lishi mumkin: hali bironta promokod
              yaratilmagan platformada admin uchun server `ok: true, promo: null`
              qaytaradi. Ilgari blok baribir chizilardi va «Telegramga ulashish»
              tugmasi `data.promo.code` da qulardi (TypeError → oq ekran). */}
          {data.promo && (
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
          )}

          {/* ── 2b. QO'LLANMA: havola va promokod qanday ishlaydi ──
              Hamkor ustoz uchun yozilgan, dasturchi uchun emas. Sabab: guruhga
              qo'shilish oqimi ikki bosqichli (havola → tasdiq) va buni bilmagan
              ustoz «havolani bosdim, nega ro'yxatda yo'qman?» deb qoladi. */}
          {data.promo && (
          <div className="glass-panel" style={{ borderRadius: 16, marginBottom: 24, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <button
              onClick={toggleGuide}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 18px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <HelpCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--fs-base)', fontWeight: 800, color: 'var(--text)' }}>
                Havola va promokod qanday ishlaydi?
              </span>
              <ChevronDown
                size={18}
                style={{
                  color: 'var(--text3)', flexShrink: 0,
                  transform: guideOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {guideOpen && (
              <div style={{ padding: '0 18px 18px', fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.6 }}>

                {/* 1-yo'l: havola */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Link2 size={15} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 800, color: 'var(--text)' }}>1-yo'l — havola (tavsiya etiladi)</span>
                </div>
                <ol style={{ margin: '0 0 18px', paddingLeft: 22 }}>
                  <li>Yuqoridagi <b>«Havola nusxalash»</b> tugmasini bosing (yoki <b>«Telegramga ulashish»</b>).</li>
                  <li>Havolani guruhingizga tashlang.</li>
                  <li>Ustoz havolani bosadi va ro'yxatdan o'tadi.</li>
                  <li>
                    Ro'yxatdan o'tgach, uning bosh sahifasida <b>«{data.promo.partnerName || 'Hamkor ustoz'} guruhiga
                    qo'shilasizmi?»</b> degan taklif chiqadi.
                  </li>
                  <li>U <b>«Qo'shilaman»</b> ni bosgach, quyidagi ro'yxatda paydo bo'ladi.</li>
                </ol>

                {/* 2-yo'l: kod */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Ticket size={15} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 800, color: 'var(--text)' }}>2-yo'l — promokod (zaxira)</span>
                </div>
                <p style={{ margin: '0 0 18px' }}>
                  Kodni og'zaki yoki qog'ozda bergan bo'lsangiz, ustoz ilovada:
                  <b> Menyu → «Do'stni taklif qilish»</b> → sahifaning pastidagi
                  <b> «Promo-kodingiz bormi?»</b> maydoniga <b>{data.promo.code}</b> kodini kiritadi.
                </p>

                {/* Muhim eslatmalar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <AlertCircle size={15} style={{ color: 'var(--amber)' }} />
                  <span style={{ fontWeight: 800, color: 'var(--text)' }}>Bilib qo'ying</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                  <li>
                    <b>Havolani bosishning o'zi yetarli emas</b> — ustoz taklifni tasdiqlashi shart. Tasdiqlashdan
                    oldin unga natijalari sizga ko'rinishi haqida ochiq aytiladi.
                  </li>
                  <li>Ro'yxatda faqat <b>tasdiqlaganlar</b> ko'rinadi. Havolani bosib, tasdiqlamaganlar ko'rinmaydi.</li>
                  <li>
                    Har bir ustoz kodni <b>faqat bir marta</b> ishlata oladi va buni qaytarib bo'lmaydi — shuning uchun
                    havolani faqat o'z guruhingizga tarqating.
                  </li>
                  <li>
                    Ustozlar nima olishadi:{' '}
                    <b>
                      {data.promo.type === 'percent'
                        ? `keyingi to'lovga ${data.promo.value}% chegirma`
                        : `${data.promo.value} kun bepul foydalanish`}
                    </b>.
                  </li>
                  <li>Yangi qo'shilgan ustoz darhol ko'rinmasa — yuqoridagi <b>«Yangilash»</b> tugmasini bosing.</li>
                </ul>
              </div>
            )}
          </div>
          )}

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
                {/* Server bir hisobotda ko'pi bilan `maxMembers` a'zoni o'qiydi
                    (Firestore kvotasi). Chegaraga urilgan bo'lsak — aytamiz. */}
                {data.truncated && (
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--amber)', margin: '4px 0 0', fontWeight: 700 }}>
                    ⚠️ Faqat birinchi {data.maxMembers} a'zo ko'rsatilmoqda
                    {data.promo?.usedCount ? ` (kod jami ${data.promo.usedCount} marta ishlatilgan)` : ''} —
                    quyidagi jamlanma shu qismga tegishli.
                  </p>
                )}
              </div>

              {/* Qidiruv inputi */}
              <div style={{ position: 'relative', minWidth: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type="text"
                  placeholder="Ism yoki ID bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setVisibleCount(25); }}
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
                          {hasSubject ? `${subjectLabel} savol` : 'Yechilgan'}
                        </th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {hasSubject ? `${subjectLabel} aniqlik` : 'Aniqlik'}
                        </th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Tayyorlik</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Oxirgi faollik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.slice(0, visibleCount).map((m, idx) => {
                        const joinDate = m.redeemedAt ? new Date(m.redeemedAt).toLocaleDateString('uz-UZ') : '—';
                        const answeredCount = hasSubject ? m.subjectAnswered : m.answered;
                        const accuracyVal = hasSubject ? m.subjectAccuracy : m.accuracy;

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
