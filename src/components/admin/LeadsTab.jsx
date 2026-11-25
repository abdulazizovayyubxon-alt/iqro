/**
 * LeadsTab.jsx — Sotuv CRM va «Issiq lidlar» bo'limi
 *
 * MAQSAD: Telegram / telefon orqali sotuvni 3–5 barobar tezlashtirish.
 * Foydalanuvchilarni bazadan tartibsiz qidirish o'rniga, sotib olish
 * ehtimoli eng yuqori bo'lgan ustozlarni avtomatik ajratib beradi:
 *   1) Promo-kod kiritib, hali to'lov qilmaganlar;
 *   2) Sinov muddati / 72 soatlik chegirma oynasi tugayotganlar;
 *   3) Pro muddati 7 kun ichida tugaydigan yoki yaqinda tugaganlar;
 *   4) Oxirgi 3 kunda faol test yechgan bepul foydalanuvchilar.
 *
 * KVOTA INZOMI:
 *   · Faqat shu tab ochilganda bir marta yuklanadi (sessiya davomida saqlanadi);
 *   · Barcha so'rovlar bitta maydonli (0 ta kompozit indeks talab qilinadi);
 *   · `userStats` faqat saralangan nomzodlar uchun 30 talik bo'laklarda o'qiladi.
 */
import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import {
  collection, query, where, limit, getDocs, doc, updateDoc, addDoc, documentId, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ToastContext } from '../../context/ToastContext';
import { SUBJECTS } from '../../data/mockData';
import { logAdminAction } from '../../services/adminLog';
import { withWriteTimeout, describeFirebaseError } from '../../utils/firebaseError';
import {
  LEAD_SEGMENTS,
  CRM_STATUSES,
  classifyLead,
  buildLeadPitch,
} from '../../utils/salesLeads';
import {
  Flame, Search, RefreshCw, Download, Copy, Check, Send, Crown, Phone, ExternalLink, Bell,
} from 'lucide-react';

const subjectName = (id) => SUBJECTS.find(s => s.id === id)?.name || '';

export default function LeadsTab({ onGrantPro, onOpenUserCard, onExportCSV }) {
  const { showToast } = useContext(ToastContext);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const [segFilter, setSegFilter] = useState('all');
  const [crmFilter, setCrmFilter] = useState('open'); // 'all' | 'open' | 'new' | 'contacted' | 'thinking' | 'lost'
  const [subjFilter, setSubjFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [copiedId, setCopiedId] = useState(null);
  const [sendingOfferId, setSendingOfferId] = useState(null);
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  const loadLeads = useCallback(async ({ force = false } = {}) => {
    if (!force && loaded) return;
    setLoading(true);
    setError(null);
    try {
      const nowMs = Date.now();
      const since14d = new Date(nowMs - 14 * 86400000);
      const since3dIso = new Date(nowMs - 3 * 86400000).toISOString();

      // 5 ta bitta-maydonli so'rov — kompozit indeks UMUMAN kerak emas.
      const [recentSnap, promoSnap, proSnap, expiredPlanSnap, activeStatsSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'users'),
          where('createdAt', '>=', Timestamp.fromDate(since14d)),
          limit(200),
        )).catch(() => null),
        getDocs(query(
          collection(db, 'users'),
          where('promoDiscount.percent', '>', 0),
          limit(100),
        )).catch(() => null),
        getDocs(query(
          collection(db, 'users'),
          where('isPremium', '==', true),
          limit(300),
        )).catch(() => null),
        getDocs(query(
          collection(db, 'users'),
          where('premiumPlan', '==', 'expired'),
          limit(100),
        )).catch(() => null),
        getDocs(query(
          collection(db, 'userStats'),
          where('lastActiveAt', '>=', since3dIso),
          limit(150),
        )).catch(() => null),
      ]);

      const userMap = new Map();
      const statsMap = new Map();

      [recentSnap, promoSnap, proSnap, expiredPlanSnap].forEach((snap) => {
        snap?.docs.forEach((d) => {
          userMap.set(d.id, { id: d.id, ...d.data() });
        });
      });

      const missingUserIds = [];
      activeStatsSnap?.docs.forEach((d) => {
        statsMap.set(d.id, d.data());
        if (!userMap.has(d.id)) missingUserIds.push(d.id);
      });

      // So'nggi 3 kunda faol bo'lgan, lekin yuqoridagi so'rovlarga tushmagan
      // foydalanuvchilar profilini 30 talik bo'laklarda olamiz (≤90 ta chegara).
      const cappedMissingUsers = missingUserIds.slice(0, 90);
      for (let i = 0; i < cappedMissingUsers.length; i += 30) {
        const chunk = cappedMissingUsers.slice(i, i + 30);
        const us = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))).catch(() => null);
        us?.docs.forEach((d) => userMap.set(d.id, { id: d.id, ...d.data() }));
      }

      // Faqat sotuvga yaroqli nomzodlar uchun yetishmayotgan `userStats` ni olamiz (≤120 ta).
      const needStatsIds = [];
      for (const [uid, u] of userMap.entries()) {
        if (statsMap.has(uid)) continue;
        if (u.role === 'admin' || u.role === 'partner' || u.schoolId) continue;
        // Muddatsiz yoki uzoq muddatli Pro larni o'tkazib yuboramiz — kvota tejaladi
        if (u.isPremium) {
          const exp = u.premiumExpire ? new Date(u.premiumExpire).getTime() : Infinity;
          if (!Number.isNaN(exp) && exp - nowMs > 7 * 86400000) continue;
        }
        needStatsIds.push(uid);
      }

      const cappedNeedStats = needStatsIds.slice(0, 120);
      for (let i = 0; i < cappedNeedStats.length; i += 30) {
        const chunk = cappedNeedStats.slice(i, i + 30);
        const ss = await getDocs(query(collection(db, 'userStats'), where(documentId(), 'in', chunk))).catch(() => null);
        ss?.docs.forEach((d) => statsMap.set(d.id, d.data()));
      }

      const classified = [];
      for (const [uid, u] of userMap.entries()) {
        const item = classifyLead(u, statsMap.get(uid) || null, nowMs);
        if (item) classified.push(item);
      }

      classified.sort((a, b) => b.heatScore - a.heatScore || b.totalAnswered - a.totalAnswered);
      setLeads(classified);
      const notesInit = {};
      classified.forEach((l) => { if (l.crmNote) notesInit[l.id] = l.crmNote; });
      setNoteDrafts(notesInit);
      setLoaded(true);
    } catch (e) {
      console.error('Leads load error:', e);
      setError(describeFirebaseError(e));
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const counts = useMemo(() => {
    const c = { all: leads.length, promo_pending: 0, urgency: 0, pro_winback: 0, active_free: 0 };
    leads.forEach((l) => {
      if (l.segments.includes('promo_pending')) c.promo_pending += 1;
      if (l.segments.includes('urgency')) c.urgency += 1;
      if (l.segments.includes('expiring_pro') || l.segments.includes('expired_pro')) c.pro_winback += 1;
      if (l.segments.includes('active_free')) c.active_free += 1;
    });
    return c;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (segFilter === 'promo_pending' && !l.segments.includes('promo_pending')) return false;
      if (segFilter === 'urgency' && !l.segments.includes('urgency')) return false;
      if (segFilter === 'pro_winback' && !l.segments.includes('expiring_pro') && !l.segments.includes('expired_pro')) return false;
      if (segFilter === 'active_free' && !l.segments.includes('active_free')) return false;

      if (crmFilter === 'open' && (l.crmStatus === 'lost' || l.crmStatus === 'won')) return false;
      if (crmFilter !== 'all' && crmFilter !== 'open' && l.crmStatus !== crmFilter) return false;

      if (subjFilter !== 'all' && (l.subject || 'none') !== subjFilter) return false;

      if (q) {
        const hay = [l.displayName, l.phone, l.prettyPhone, l.shortId, l.email, l.promoCode]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, segFilter, crmFilter, subjFilter, search]);

  const handleCopyPitch = async (lead) => {
    const text = buildLeadPitch(lead, subjectName(lead.subject));
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(lead.id);
      setTimeout(() => setCopiedId((cur) => (cur === lead.id ? null : cur)), 2500);
      showToast('📋 Tayyor sotuv xabari nusxalandi — Telegramga tashlang!', 'success');
    } catch {
      showToast("Nusxalab bo'lmadi", 'error');
    }
  };

  const handleUpdateCrm = async (lead, nextStatus, customNote) => {
    const note = customNote !== undefined ? customNote : (noteDrafts[lead.id] ?? lead.crmNote ?? '');
    setSavingNoteId(lead.id);
    try {
      const nowIso = new Date().toISOString();
      const patch = {
        crmStatus: nextStatus,
        crmNote: String(note || '').trim().slice(0, 300),
        crmContactedAt: nowIso,
      };
      await withWriteTimeout(updateDoc(doc(db, 'users', lead.id), patch));
      setLeads((prev) => prev.map((x) => (
        x.id === lead.id
          ? { ...x, ...patch, user: { ...x.user, ...patch } }
          : x
      )));
      logAdminAction('lead.update_status', lead.id, { holat: nextStatus, izoh: patch.crmNote || null });
      showToast('CRM holati saqlandi ✅', 'success');
    } catch (e) {
      showToast(describeFirebaseError(e), 'error');
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleSendInAppOffer = async (lead) => {
    if (sendingOfferId) return;
    setSendingOfferId(lead.id);
    try {
      const message = buildLeadPitch(lead, subjectName(lead.subject));
      const nowIso = new Date().toISOString();
      const title = lead.primarySegment === 'promo_pending'
        ? `🎟️ ${lead.promoCode} chegirmangiz kutmoqda!`
        : lead.primarySegment === 'expiring_pro'
          ? '⏳ Pro obunangiz tez orada tugaydi'
          : '🚀 Attestatsiyaga to\'liq tayyorlaning!';

      await withWriteTimeout(addDoc(collection(db, 'users', lead.id, 'notifications'), {
        title,
        message,
        type: 'info',
        read: false,
        date: nowIso,
        createdAt: nowIso,
      }));

      // Best-effort qisqa push (Play anti-steering talabiga mos — aloqa manzilisiz)
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              action: 'push',
              title,
              body: "Ilovadagi bildirishnomangizni ochib maxsus taklif bilan tanishing.",
              target: lead.id,
            }),
            signal: AbortSignal.timeout(8000),
          });
        }
      } catch { /* zararsiz */ }

      if (lead.crmStatus === 'new') {
        await updateDoc(doc(db, 'users', lead.id), {
          crmStatus: 'contacted',
          crmContactedAt: nowIso,
        }).catch(() => {});
        setLeads((prev) => prev.map((x) => (
          x.id === lead.id ? { ...x, crmStatus: 'contacted', crmContactedAt: nowIso } : x
        )));
      }

      logAdminAction('lead.send_offer', lead.id, { segment: lead.primarySegment });
      showToast(`🔔 ${lead.displayName} ga shaxsiy taklif yuborildi!`, 'success');
    } catch (e) {
      showToast(describeFirebaseError(e), 'error');
    } finally {
      setSendingOfferId(null);
    }
  };

  const handleExport = () => {
    if (!onExportCSV || !filteredLeads.length) return;
    onExportCSV(
      'issiq_lidlar_crm',
      ['ID', 'Ism', 'Telefon', 'Fan', 'Segment', 'Ball', 'Yechgan savol', 'Aniqlik %', 'Chegirma / Bonus', 'CRM Holati', 'Izoh'],
      filteredLeads.map((l) => [
        l.shortId || l.id,
        l.displayName,
        l.phone ? `+${l.phone}` : '',
        subjectName(l.subject) || '',
        LEAD_SEGMENTS[l.primarySegment]?.label || l.primarySegment,
        l.heatScore,
        l.totalAnswered,
        l.accuracy ?? '',
        [
          l.promoCode ? `${l.promoCode} (-${l.promoPercent}%)` : '',
          l.referralPct > 0 ? `Ref -${l.referralPct}%` : '',
          l.referralBonus > 0 ? `Bonus ${l.referralBonus}` : '',
        ].filter(Boolean).join(' / '),
        CRM_STATUSES.find((s) => s.key === l.crmStatus)?.label || l.crmStatus,
        l.crmNote || '',
      ]),
    );
  };

  return (
    <div className="admin-stack-l">
      <div className="admin-row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="admin-section-title admin-section-title--flush">
          <Flame size={18} style={{ color: 'var(--amber)' }} /> Sotuv CRM · Issiq lidlar ({filteredLeads.length})
        </div>
        <div className="admin-row--tight">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleExport}
            disabled={!filteredLeads.length}
            title="Sotuv ro'yxatini CSV formatida yuklab olish"
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => loadLeads({ force: true })}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Tahlil qilinmoqda...' : 'Yangilash'}
          </button>
        </div>
      </div>

      <div className="admin-info-box">
        <div className="admin-info-text">
          Bu bo&apos;lim <strong>hozir xarid qilish ehtimoli eng baland</strong> ustozlarni ball bo&apos;yicha saralaydi:
          promo-kod kiritib to&apos;lamaganlar, sinov muddati tugayotgan faol ustozlar hamda obunasi tugayotgan Pro a&apos;zolar.
          Har qatordan bir bosishda <strong>tayyor sotuv xabarini nusxalash</strong>, <strong>Telegram ochish</strong>,
          <strong> ilova ichiga taklif yuborish</strong> yoki <strong>Pro yoqish</strong> mumkin.
        </div>
      </div>

      {/* ── Segment KPI kartalari (filtr sifatida ishlaydi) ── */}
      <div className="admin-stats-grid">
        {[
          { key: 'all', val: counts.all, lbl: 'Jami issiq lidlar', color: 'var(--blue)' },
          { key: 'promo_pending', val: counts.promo_pending, lbl: "🎟️ Promo kiritib to'lamagan", color: 'var(--amber)' },
          { key: 'urgency', val: counts.urgency, lbl: '🔥 Sinov / chegirma tugamoqda', color: 'var(--red)' },
          { key: 'pro_winback', val: counts.pro_winback, lbl: '⏳ Pro uzaytirish / Sobiq Pro', color: 'var(--accent)' },
          { key: 'active_free', val: counts.active_free, lbl: '⚡ Faol bepul ustozlar', color: 'var(--green)' },
        ].map((c) => (
          <button
            key={c.key}
            type="button"
            className="stat-box glass-panel"
            onClick={() => setSegFilter(c.key)}
            aria-pressed={segFilter === c.key}
            style={{
              cursor: 'pointer',
              font: 'inherit',
              outline: segFilter === c.key ? '2px solid var(--blue)' : 'none',
              outlineOffset: '-2px',
            }}
          >
            <div className="stat-box-val" style={{ color: c.color }}>{c.val}</div>
            <div className="stat-box-lbl">{c.lbl}</div>
          </button>
        ))}
      </div>

      {/* ── Filtr va qidiruv paneli ── */}
      <div className="admin-glass-filter-bar">
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            className="admin-search"
            placeholder="Ism, telefon, ID yoki promokod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-selects">
          <select
            className="admin-select"
            value={crmFilter}
            onChange={(e) => setCrmFilter(e.target.value)}
            aria-label="CRM holati filtri"
          >
            <option value="open">Ochiq lidlar (rad etmagan)</option>
            <option value="all">Barcha CRM holatlar</option>
            <option value="new">🆕 Faqat yangilar</option>
            <option value="contacted">📞 Bog&apos;lanilganlar</option>
            <option value="thinking">🤔 O&apos;ylayotganlar</option>
            <option value="lost">❌ Rad etganlar</option>
          </select>
          <select
            className="admin-select"
            value={subjFilter}
            onChange={(e) => setSubjFilter(e.target.value)}
            aria-label="Fan filtri"
          >
            <option value="all">Barcha fanlar</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="none">Fan tanlanmagan</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="admin-info-box admin-info-box--error">
          <div className="admin-info-text">{error}</div>
        </div>
      ) : loading && !loaded ? (
        <div className="admin-state-block">🔥 Issiq lidlar saralanmoqda...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          Tanlangan filtr bo&apos;yicha hozircha lid topilmadi.
        </div>
      ) : (
        <div className="admin-stack-s">
          {filteredLeads.slice(0, 120).map((l) => {
            const noteVal = noteDrafts[l.id] ?? l.crmNote ?? '';
            const noteChanged = noteVal.trim() !== (l.crmNote || '').trim();
            return (
              <div key={l.id} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 200, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-link-btn"
                        style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}
                        onClick={() => onOpenUserCard?.(l.user)}
                      >
                        {l.displayName}
                      </button>
                      {l.shortId && <span className="admin-chip admin-chip--muted">{l.shortId}</span>}
                      <span className={`admin-chip ${l.segmentChip}`}>{l.segmentLabel}</span>
                      <span className="admin-chip" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--amber)', fontWeight: 800 }}>
                        🔥 {l.heatScore} ball
                      </span>
                      {l.promoCode && (
                        <span className="admin-chip admin-chip--amber">
                          🎟️ {l.promoCode} (-{l.promoPercent}%)
                        </span>
                      )}
                      {l.referralPct > 0 && (
                        <span className="admin-chip admin-chip--green">
                          🎁 Taklif -{l.referralPct}%
                        </span>
                      )}
                      {l.referralBonus > 0 && (
                        <span className="admin-chip admin-chip--blue">
                          💰 {l.referralBonus.toLocaleString('uz-UZ')} so&apos;m bonus
                        </span>
                      )}
                    </div>

                    <div className="admin-meta-line" style={{ marginTop: 6 }}>
                      <span>📞 <strong>{l.prettyPhone}</strong></span>
                      <span>📘 {subjectName(l.subject) || 'Fan tanlanmagan'}</span>
                      <span>
                        📝 <strong>{l.totalAnswered} ta</strong> savol
                        {l.accuracy !== null ? ` (${l.accuracy}%)` : ''}
                      </span>
                      {l.lastActiveDays !== null && (
                        <span>
                          🕒 {l.lastActiveDays === 0 ? 'Bugun faol' : `${l.lastActiveDays} kun oldin`}
                        </span>
                      )}
                      {l.trialStatus === 'trial' && (
                        <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                          ⏳ Sinov: {l.trialDaysLeft} kun qoldi
                        </span>
                      )}
                      {l.trialStatus === 'urgency' && (
                        <span style={{ color: 'var(--red)', fontWeight: 700 }}>
                          ⚡ 72s chegirma oynasi!
                        </span>
                      )}
                      {l.proDaysLeft !== null && (
                        <span style={{ color: 'var(--blue)', fontWeight: 700 }}>
                          👑 Pro: {l.proDaysLeft} kun qoldi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Tezkor sotuv amallari ── */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => handleCopyPitch(l)}
                      title="Shaxsiylashtirilgan sotuv matnini nusxalash"
                    >
                      {copiedId === l.id ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === l.id ? 'Nusxalandi' : 'Sotuv matni'}
                    </button>

                    {l.phone && (
                      <>
                        <a
                          href={`https://t.me/+${l.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline"
                          title="Telegramda yozish"
                          style={{ textDecoration: 'none' }}
                        >
                          <ExternalLink size={14} /> Telegram
                        </a>
                        <a
                          href={`tel:+${l.phone}`}
                          className="btn btn-sm btn-outline admin-icon-btn"
                          title={`Qo'ng'iroq qilish: +${l.phone}`}
                          aria-label={`Qo'ng'iroq qilish: +${l.phone}`}
                          style={{ textDecoration: 'none' }}
                        >
                          <Phone size={14} />
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      disabled={sendingOfferId === l.id}
                      onClick={() => handleSendInAppOffer(l)}
                      title="Ilova ichiga shaxsiy taklif bildirishnomasi yuborish"
                    >
                      <Bell size={14} /> {sendingOfferId === l.id ? '...' : 'Taklif yuborish'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onGrantPro?.(l.user)}
                      title="To'lov qabul qilib Pro obunani yoqish"
                    >
                      <Crown size={14} /> Pro berish
                    </button>
                  </div>
                </div>

                {/* ── CRM holati va qisqa eslatma qatori ── */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <select
                    className="admin-select"
                    style={{ padding: '4px 10px', fontSize: 'var(--fs-xs)', minWidth: 155 }}
                    value={l.crmStatus}
                    disabled={savingNoteId === l.id}
                    onChange={(e) => handleUpdateCrm(l, e.target.value)}
                    aria-label={`${l.displayName} CRM holati`}
                  >
                    {CRM_STATUSES.map((st) => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>

                  <input
                    className="admin-input"
                    style={{ flex: 1, minWidth: 180, padding: '5px 10px', fontSize: 'var(--fs-xs)' }}
                    placeholder="Sotuv izohi (masalan: oylik chiqqanda oladi, 3 oylik so'radi)..."
                    value={noteVal}
                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && noteChanged) {
                        e.preventDefault();
                        handleUpdateCrm(l, l.crmStatus, noteVal);
                      }
                    }}
                  />

                  {noteChanged && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={savingNoteId === l.id}
                      onClick={() => handleUpdateCrm(l, l.crmStatus, noteVal)}
                    >
                      <Send size={12} /> Saqlash
                    </button>
                  )}

                  {l.crmContactedAt && (
                    <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)' }}>
                      Oxirgi aloqa: {new Date(l.crmContactedAt).toLocaleDateString('uz-UZ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredLeads.length > 120 && (
            <div className="admin-info-text" style={{ textAlign: 'center', padding: 10 }}>
              Eng issiq 120 ta lid ko&apos;rsatilmoqda (jami {filteredLeads.length} ta — qolganlarini CSV orqali olish mumkin).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
