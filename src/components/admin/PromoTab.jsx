/**
 * PromoTab.jsx — Admin panel: promo-kodlar, kampaniya konversiyasi va tushum tahlili
 * Yaratish (percent/days/team), havola nusxalash, kim ishlatganini ko'rish,
 * promo orqali tushgan real tushumni hisoblash, faol/o'chiq va o'chirish.
 * Firestore rules: promoCodes faqat admin uchun ochiq;
 * foydalanuvchi redemption FAQAT api/redeem-promo.js orqali.
 */
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, orderBy, limit, where, documentId,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContext } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket, Plus, Trash2, Users, RefreshCw, Copy, Check, Search, Download, Crown, X, TrendingUp,
} from 'lucide-react';
import { SUBJECTS } from '../../data/mockData';
import { CLICK_ENABLED } from '../../config';
import ConfirmDialog from '../shared/ConfirmDialog';
import { logAdminAction } from '../../services/adminLog';
import { useModalA11y } from '../../hooks/useModalA11y';
import { extractCleanPhone, formatPrettyPhone } from '../../utils/salesLeads';

const TYPE_LABELS = {
  percent: { label: 'Chegirma (%)', icon: '🏷️', desc: "Keyingi to'lovdan foiz chegirma" },
  days: { label: 'Pro kunlar', icon: '⏰', desc: 'Darhol Pro kunlar beradi' },
  team: { label: 'Maktab paketi', icon: '🏫', desc: "Jamoaviy kod — har o'qituvchi o'zi kiritadi" },
};

const genCode = (prefix = 'ZEHIN') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
};

const subjectName = (id) => SUBJECTS.find((s) => s.id === id)?.name || '';

export default function PromoTab({ onGrantPro, onOpenUserCard, onExportCSV }) {
  const { showToast } = useContext(ToastContext);
  const { user } = useAuth();

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Qidiruv va tur filtri
  const [promoSearch, setPromoSearch] = useState('');
  const [promoTypeFilter, setPromoTypeFilter] = useState('all'); // all | active | percent | days | team
  const [copiedCode, setCopiedCode] = useState(null);

  // Promo tushumi (ixtiyoriy yuklanadi — kvotani tejash uchun)
  const [revenueByCode, setRevenueByCode] = useState(null); // { [CODE]: { paidCount, totalRevenue, uids: Set } }
  const [revenueLoading, setRevenueLoading] = useState(false);

  // «Kimlar ishlatdi» oynasi
  const [redemptionsModal, setRedemptionsModal] = useState(null); // promo object
  const [redemptionsList, setRedemptionsList] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const redemptionsRef = useModalA11y(!!redemptionsModal, () => setRedemptionsModal(null));

  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: 20,
    maxUses: 50,
    expiresAt: '',
    campaign: '',
    partnerName: '',
    partnerUid: '',
    subject: '',
  });

  const loadPromos = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'promoCodes'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setPromos(list);
    } catch (e) {
      console.error(e);
      showToast('Promo-kodlarni yuklashda xatolik', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadPromos(); }, [loadPromos]);

  // Promo-kodlar orqali kelgan real pul tushumini hisoblash (payments + users.promoUsedOnPayment zaxirasi)
  const loadPromoRevenue = async () => {
    if (revenueLoading) return;
    setRevenueLoading(true);
    try {
      const paySnap = await getDocs(query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc'),
        limit(300),
      ));
      const successPays = paySnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.status === 'success' && Number(p.paidAmount) > 0);

      // Eski to'lovlarda `p.promoCode` yozilmagan bo'lishi mumkin — ular uchun `users/{uid}.promoUsedOnPayment` tekshiriladi
      const missingPromoUids = [...new Set(
        successPays.filter((p) => !p.promoCode && p.uid).map((p) => p.uid)
      )].slice(0, 120);

      const userPromoMap = new Map();
      for (let i = 0; i < missingPromoUids.length; i += 30) {
        const chunk = missingPromoUids.slice(i, i + 30);
        const us = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))).catch(() => null);
        us?.docs.forEach((d) => {
          const code = d.data()?.promoUsedOnPayment;
          if (code) userPromoMap.set(d.id, String(code).toUpperCase());
        });
      }

      const byCode = {};
      const attributedUserOnce = new Set();
      for (const p of successPays) {
        let code = p.promoCode ? String(p.promoCode).toUpperCase() : null;
        if (!code && p.uid && userPromoMap.has(p.uid) && !attributedUserOnce.has(p.uid)) {
          code = userPromoMap.get(p.uid);
          attributedUserOnce.add(p.uid);
        }
        if (!code) continue;
        if (!byCode[code]) byCode[code] = { paidCount: 0, totalRevenue: 0, uids: new Set() };
        byCode[code].paidCount += 1;
        byCode[code].totalRevenue += Number(p.paidAmount) || 0;
        if (p.uid) byCode[code].uids.add(p.uid);
      }

      setRevenueByCode(byCode);
      showToast('💰 Promo tushum va konversiya hisoblandi', 'success');
    } catch (e) {
      console.error('Promo revenue error:', e);
      showToast('Tushumni hisoblashda xatolik', 'error');
    } finally {
      setRevenueLoading(false);
    }
  };

  const openRedemptions = async (promo) => {
    setRedemptionsModal(promo);
    setRedemptionsList([]);
    setRedemptionsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'promoCodes', promo.id, 'redemptions'),
        limit(200),
      ));
      const rawMap = new Map();
      snap.docs.forEach((d) => rawMap.set(d.id, { uid: d.id, ...d.data() }));

      // Eski `usedBy` massividagi foydalanuvchilar ham qolib ketmasin
      if (Array.isArray(promo.usedBy)) {
        promo.usedBy.forEach((uid) => {
          if (uid && !rawMap.has(uid)) {
            rawMap.set(uid, { uid, displayName: null, redeemedAt: null, legacy: true });
          }
        });
      }

      const uids = [...rawMap.keys()].slice(0, 150);
      const userMap = new Map();
      for (let i = 0; i < uids.length; i += 30) {
        const chunk = uids.slice(i, i + 30);
        const us = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))).catch(() => null);
        us?.docs.forEach((d) => userMap.set(d.id, { id: d.id, ...d.data() }));
      }

      const enriched = Array.from(rawMap.values()).map((r) => {
        const u = userMap.get(r.uid) || null;
        const phoneDigits = u ? extractCleanPhone(u) : null;
        const paidThisCode = Boolean(
          u?.promoUsedOnPayment === promo.id
          || revenueByCode?.[promo.id]?.uids?.has(r.uid)
          || (promo.type === 'percent' && u?.premiumPlan === 'paid' && u?.isPremium)
        );
        const pendingThisCode = Boolean(
          promo.type === 'percent'
          && !paidThisCode
          && u?.promoDiscount?.code === promo.id
        );
        return {
          ...r,
          user: u,
          name: u?.displayName || r.displayName || '—',
          shortId: u?.shortId || null,
          phone: phoneDigits,
          prettyPhone: formatPrettyPhone(phoneDigits),
          subject: u?.subject || null,
          paidThisCode,
          pendingThisCode,
          removed: r.status === 'removed',
        };
      });

      enriched.sort((a, b) => (b.redeemedAt || '').localeCompare(a.redeemedAt || ''));
      setRedemptionsList(enriched);
    } catch (e) {
      console.error('Redemptions load error:', e);
      showToast("Ishlatganlar ro'yxatini yuklashda xatolik", 'error');
    } finally {
      setRedemptionsLoading(false);
    }
  };

  const copyPromoLink = async (code) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://zehin.uz';
    const url = `${origin}/?promo=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((cur) => (cur === code ? null : cur)), 2200);
      showToast(`🔗 Havola nusxalandi: ${url}`, 'success');
    } catch {
      showToast("Havolani nusxalab bo'lmadi", 'error');
    }
  };

  const applyTeamPreset = () => {
    setForm(f => ({
      ...f,
      type: 'team',
      value: 365,
      maxUses: 30,
      campaign: f.campaign || 'maktab-',
      code: f.code || genCode('MAKTAB'),
    }));
  };

  const applyPartnerPreset = () => {
    setForm(f => ({
      ...f,
      code: f.code || genCode('USTOZ'),
      type: 'days',
      value: 90,
      maxUses: 1000,
      partnerName: f.partnerName || '',
      campaign: f.campaign || '',
    }));
  };

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const maxUses = Number(form.maxUses);

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      showToast("Kod 3-32 belgi: harf, raqam, - yoki _", 'error');
      return;
    }
    if (!Number.isInteger(value) || value <= 0 || (form.type === 'percent' && value > 100) || (form.type !== 'percent' && value > 3660)) {
      showToast(form.type === 'percent' ? "Qiymat 1 dan 100 gacha butun son bo'lsin" : "Kunlar soni 1 dan 3660 gacha butun son bo'lsin", 'error');
      return;
    }
    if (!Number.isInteger(maxUses) || maxUses <= 0) {
      showToast("Limit musbat butun son bo'lsin", 'error');
      return;
    }
    if (form.expiresAt) {
      const exp = new Date(form.expiresAt + 'T23:59:59');
      if (isNaN(exp.getTime()) || exp < new Date()) {
        showToast("Amal qilish muddati kelajakdagi to'g'ri sana bo'lsin", 'error');
        return;
      }
    }

    setCreating(true);
    try {
      const ref = doc(db, 'promoCodes', code);
      const exists = await getDoc(ref);
      if (exists.exists()) {
        showToast('Bunday kod allaqachon mavjud', 'error');
        setCreating(false);
        return;
      }
      await setDoc(ref, {
        code,
        type: form.type,
        value,
        maxUses,
        usedCount: 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
        campaign: form.campaign.trim() || null,
        partnerName: form.partnerName.trim() || null,
        partnerUid: form.partnerUid.trim() || null,
        subject: form.subject || null,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || null,
      });
      logAdminAction('promo.create', code, { tur: form.type, qiymat: value, limit: maxUses, fan: form.subject || null });
      showToast(`Promo-kod yaratildi: ${code} ✅`, 'success');
      setForm({ code: '', type: 'percent', value: 20, maxUses: 50, expiresAt: '', campaign: '', partnerName: '', partnerUid: '', subject: '' });
      loadPromos();
    } catch (e) {
      console.error(e);
      showToast('Yaratishda xatolik', 'error');
    }
    setCreating(false);
  };

  const toggleActive = async (promo) => {
    try {
      await updateDoc(doc(db, 'promoCodes', promo.id), { active: !promo.active });
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, active: !promo.active } : p));
      logAdminAction('promo.toggle', promo.id, { holat: !promo.active ? 'faol' : "o'chiq" });
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const setPromoSubject = async (promo, subject) => {
    try {
      await updateDoc(doc(db, 'promoCodes', promo.id), { subject: subject || null });
      setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, subject: subject || null } : p));
      logAdminAction('promo.set_subject', promo.id, { fan: subject || null });
      showToast(subject ? 'Fan biriktirildi' : 'Fan olib tashlandi', 'success');
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(null);

  const requestDelete = (promo) => {
    if ((promo.usedCount || 0) > 0) {
      showToast(
        `"${promo.id}" ${promo.usedCount} marta ishlatilgan — o'chirish o'rniga «O'chiq» qiling`,
        'error'
      );
      return;
    }
    setConfirmDelete(promo);
  };

  const handleDelete = async (promo) => {
    try {
      await deleteDoc(doc(db, 'promoCodes', promo.id));
      setPromos(prev => prev.filter(p => p.id !== promo.id));
      logAdminAction('promo.delete', promo.id, { tur: promo.type, qiymat: promo.value });
      showToast("O'chirildi", 'info');
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const summary = useMemo(() => {
    const now = new Date();
    const activePromos = promos.filter((p) => p.active !== false && (!p.expiresAt || new Date(p.expiresAt) >= now)).length;
    const totalUsed = promos.reduce((s, p) => s + (Number(p.usedCount) || 0), 0);
    let totalRev = 0;
    let totalPaid = 0;
    if (revenueByCode) {
      Object.values(revenueByCode).forEach((r) => {
        totalRev += r.totalRevenue;
        totalPaid += r.paidCount;
      });
    }
    return { activePromos, totalUsed, totalRev, totalPaid };
  }, [promos, revenueByCode]);

  const visiblePromos = useMemo(() => {
    const q = promoSearch.trim().toLowerCase();
    const now = new Date();
    return promos.filter((p) => {
      const isExpired = p.expiresAt && new Date(p.expiresAt) < now;
      if (promoTypeFilter === 'active' && (!p.active || isExpired)) return false;
      if (promoTypeFilter === 'percent' && p.type !== 'percent') return false;
      if (promoTypeFilter === 'days' && p.type !== 'days') return false;
      if (promoTypeFilter === 'team' && p.type !== 'team') return false;
      if (q) {
        const hay = [p.id, p.partnerName, p.campaign, subjectName(p.subject)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [promos, promoSearch, promoTypeFilter]);

  const exportPromosCsv = () => {
    if (!onExportCSV || !visiblePromos.length) return;
    onExportCSV(
      'promo_kampaniyalar',
      ['Kod', 'Turi', 'Qiymati', 'Ishlatildi', 'Limit', 'Hamkor', 'Fan', 'Kampaniya', "To'lovlar soni", "Tushum (so'm)", 'Holati'],
      visiblePromos.map((p) => {
        const rev = revenueByCode?.[p.id];
        return [
          p.id,
          TYPE_LABELS[p.type]?.label || p.type,
          p.type === 'percent' ? `-${p.value}%` : `+${p.value} kun`,
          p.usedCount || 0,
          p.maxUses || 0,
          p.partnerName || '',
          subjectName(p.subject) || '',
          p.campaign || '',
          rev ? rev.paidCount : '',
          rev ? rev.totalRevenue : '',
          p.active ? 'Faol' : "O'chiq",
        ];
      }),
    );
  };

  return (
    <div>
      {/* ═══ MARKETING & ROI KO'RSATKICHLARI ═══ */}
      <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-box glass-panel">
          <div className="stat-box-val" style={{ color: 'var(--blue)' }}>
            {summary.activePromos} <span style={{ fontSize: '0.6em', color: 'var(--text3)' }}>/ {promos.length}</span>
          </div>
          <div className="stat-box-lbl">Faol promo-kodlar</div>
        </div>
        <div className="stat-box glass-panel">
          <div className="stat-box-val" style={{ color: 'var(--accent)' }}>
            {summary.totalUsed.toLocaleString('uz-UZ')}
          </div>
          <div className="stat-box-lbl">Jami faollashtirishlar</div>
        </div>
        <div className="stat-box glass-panel">
          <div className="stat-box-val" style={{ color: 'var(--green)' }}>
            {revenueByCode ? `${summary.totalRev.toLocaleString('uz-UZ')}` : '—'}
          </div>
          <div className="stat-box-lbl">
            {revenueByCode ? `Promo tushumi, so'm (${summary.totalPaid} ta to'lov)` : "Promo tushumi (hisoblash ↓)"}
          </div>
        </div>
      </div>

      {/* ═══ YARATISH FORMASI ═══ */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
            <Ticket size={18} style={{ color: 'var(--accent)' }} /> Yangi promo-kod
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={loadPromoRevenue}
              disabled={revenueLoading}
              title="Oxirgi to'lovlardan qaysi promo-kod qancha daromad keltirganini hisoblash"
            >
              <TrendingUp size={14} className={revenueLoading ? 'spin' : ''} />
              {revenueLoading ? 'Hisoblanmoqda...' : (revenueByCode ? 'Tushumni yangilash' : '💰 Tushumni hisoblash')}
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={applyPartnerPreset}
              title="Hamkor ustoz paketi: 90 kun, 1000 o'rin"
            >
              🤝 Hamkor ustoz shabloni
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={applyTeamPreset}
              title="Maktab paketi: 365 kun, 30 o'rin"
            >
              🏫 Maktab paketi shabloni
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="admin-label--caps">Kod</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="admin-input admin-input--code"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="ZEHIN-XXXXX"
                maxLength={32}
              />
              <button
                className="btn btn-sm btn-outline"
                style={{ flexShrink: 0 }}
                onClick={() => setForm(f => ({ ...f, code: genCode() }))}
                title="Tasodifiy kod"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="admin-label--caps">Turi</label>
            <select
              className="admin-input"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value, value: e.target.value === 'percent' ? 20 : e.target.value === 'team' ? 365 : 30 }))}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label--caps">{form.type === 'percent' ? 'Chegirma (%)' : 'Kunlar soni'}</label>
            <input
              className="admin-input"
              type="number"
              min="1"
              max={form.type === 'percent' ? 100 : 3660}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div>
            <label className="admin-label--caps">Limit (necha kishi)</label>
            <input
              className="admin-input"
              type="number"
              min="1"
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
            />
          </div>
          <div>
            <label className="admin-label--caps">Muddati (ixtiyoriy)</label>
            <input
              className="admin-input"
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <div>
            <label className="admin-label--caps">Kampaniya (ixtiyoriy)</label>
            <input
              className="admin-input"
              value={form.campaign}
              onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))}
              placeholder="masalan: maktab-25, sentyabr"
            />
          </div>
          <div>
            <label className="admin-label--caps">Hamkor ustoz ismi</label>
            <input
              className="admin-input"
              value={form.partnerName}
              onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))}
              placeholder="masalan: Mironshoh ustoz"
            />
          </div>
          <div>
            <label className="admin-label--caps">Hamkor fani</label>
            <select
              className="admin-input"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            >
              <option value="">— Fan biriktirilmagan —</option>
              {SUBJECTS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginBottom: 12 }}>
          «Hamkor fani» — hamkor ustoz o&apos;z panelida qaysi fan kesimida hisobot
          ko&apos;rishini belgilaydi. Bo&apos;sh qoldirilsa, hamkor profilidagi fan
          ishlatiladi; u ham bo&apos;lmasa, jami ko&apos;rsatkichlar ko&apos;rsatiladi.
        </div>

        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginBottom: 12 }}>
          {TYPE_LABELS[form.type].desc}
          {form.type === 'team' && " — sotuv Telegram orqali kelishilgach, kodni maktabga bering; har o'qituvchi Pro oynasida o'zi kiritadi."}
          {form.type === 'percent' && !CLICK_ENABLED && (
            <div style={{ marginTop: 6, color: 'var(--amber)', fontWeight: 700 }}>
              ⚠️ Eslatma: Click onlayn to&apos;lovi hozir o&apos;chiq — foizli chegirma Telegram orqali to&apos;lov qabul qilinganda qo&apos;llanadi.
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          <Plus size={16} /> {creating ? 'Yaratilmoqda...' : 'Yaratish'}
        </button>
      </div>

      {/* ═══ QIDIRUV VA FILTR ═══ */}
      {promos.length > 0 && (
        <div className="admin-glass-filter-bar" style={{ marginBottom: 14 }}>
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input
              className="admin-search"
              placeholder="Kod, hamkor ustoz yoki kampaniya bo'yicha qidirish..."
              value={promoSearch}
              onChange={(e) => setPromoSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              ['all', 'Barchasi'],
              ['active', '✅ Faol'],
              ['percent', '🏷️ Chegirma (%)'],
              ['days', '🤝 Kunlik / Hamkor'],
              ['team', '🏫 Maktab'],
            ].map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                className={`btn btn-sm ${promoTypeFilter === k ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setPromoTypeFilter(k)}
              >
                {lbl}
              </button>
            ))}
            {onExportCSV && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={exportPromosCsv}
                disabled={!visiblePromos.length}
                title="Kampaniyalarni CSV ga eksport qilish"
              >
                <Download size={14} /> CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ RO'YXAT ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Yuklanmoqda...</div>
      ) : promos.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 'var(--fs-9xl)', marginBottom: 10 }}>🎟️</div>
          Hozircha promo-kodlar yo&apos;q
        </div>
      ) : visiblePromos.length === 0 ? (
        <div className="glass-panel" style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
          Filtr bo&apos;yicha promo-kod topilmadi
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visiblePromos.map(p => {
            const t = TYPE_LABELS[p.type] || TYPE_LABELS.percent;
            const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
            const isFull = p.maxUses > 0 && (p.usedCount || 0) >= p.maxUses;
            const rev = revenueByCode?.[p.id];
            const convPct = rev && (p.usedCount || 0) > 0
              ? Math.min(100, Math.round((rev.paidCount / p.usedCount) * 100))
              : null;

            return (
              <div key={p.id} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.active && !isExpired ? 1 : 0.55 }}>
                <div style={{ fontSize: 'var(--fs-3xl)' }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)', letterSpacing: 1, fontFamily: 'monospace' }}>
                      {p.id}
                    </span>
                    {p.partnerName && <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--accent)', background: 'var(--blue-bg)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>🤝 {p.partnerName}</span>}
                    {isExpired && <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--red)', fontWeight: 700 }}>MUDDATI TUGAGAN</span>}
                    {isFull && <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--amber)', fontWeight: 700 }}>LIMIT TUGAGAN</span>}
                    {rev && rev.paidCount > 0 && (
                      <span className="admin-chip admin-chip--green" title="Shu kod orqali amalga oshgan to'lovlar">
                        💰 {rev.paidCount} to&apos;lov · {rev.totalRevenue.toLocaleString('uz-UZ')} so&apos;m
                        {convPct !== null ? ` (${convPct}%)` : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                    {p.type === 'percent' ? `-${p.value}% chegirma` : `+${p.value} kun premium`}
                    {p.campaign && ` · ${p.campaign}`}
                    {p.expiresAt && ` · ${new Date(p.expiresAt).toLocaleDateString('uz-UZ')} gacha`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', fontWeight: 700 }}>📘 Hamkor fani:</span>
                    <select
                      className="admin-input"
                      style={{ maxWidth: 200, fontSize: 'var(--fs-2xs)', padding: '4px 8px' }}
                      value={p.subject || ''}
                      onChange={e => setPromoSubject(p, e.target.value)}
                      aria-label={`${p.id} kodiga fan biriktirish`}
                    >
                      <option value="">— biriktirilmagan —</option>
                      {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Taklif havolasini 1 bosishda ko'chirish */}
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => copyPromoLink(p.id)}
                  title={`Reklama / hamkor havolasini nusxalash (?promo=${p.id})`}
                >
                  {copiedCode === p.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode === p.id ? 'Nusxalandi' : 'Havola'}
                </button>

                {/* Kimlar ishlatganini ko'rish tugmasi */}
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => openRedemptions(p)}
                  style={{ fontWeight: 700, color: isFull ? 'var(--amber)' : 'var(--text)' }}
                  title="Ushbu kodni kimlar ishlatgani va to'lov holatini ko'rish"
                >
                  <Users size={14} /> {p.usedCount || 0}/{p.maxUses}
                </button>

                <button
                  className={`btn btn-sm ${p.active ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => toggleActive(p)}
                >
                  {p.active ? 'Faol' : "O'chiq"}
                </button>
                <button
                  className="btn btn-sm btn-outline admin-btn-danger"
                  onClick={() => requestDelete(p)}
                  aria-label={`${p.id} kodini o'chirish`}
                  title={(p.usedCount || 0) > 0
                    ? "Ishlatilgan kodni o'chirib bo'lmaydi — «O'chiq» qiling"
                    : "O'chirish"}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ KIMLAR ISHLATGANI MODALI ═══ */}
      {redemptionsModal && (
        <div className="admin-modal-overlay" onClick={() => setRedemptionsModal(null)}>
          <div
            ref={redemptionsRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${redemptionsModal.id} kodini ishlatganlar`}
            tabIndex={-1}
            className="admin-modal-panel admin-modal-panel--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-row-between" style={{ marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--text)' }}>
                  🎟️ {redemptionsModal.id} — ishlatganlar ({redemptionsList.length})
                </h3>
                <div className="admin-info-text" style={{ marginTop: 2 }}>
                  {redemptionsModal.type === 'percent'
                    ? `-${redemptionsModal.value}% chegirma · Kim kodni kiritib to'lagani va kim hali kutayotgani`
                    : `+${redemptionsModal.value} kun Pro · Guruh a'zolari ro'yxati`}
                </div>
              </div>
              <div className="admin-row--tight">
                {onExportCSV && redemptionsList.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => onExportCSV(
                      `promo_${redemptionsModal.id}`,
                      ['ID', 'Ism', 'Telefon', 'Fan', 'Sana', 'Holat'],
                      redemptionsList.map((r) => [
                        r.shortId || r.uid,
                        r.name,
                        r.phone ? `+${r.phone}` : '',
                        subjectName(r.subject) || '',
                        r.redeemedAt ? new Date(r.redeemedAt).toLocaleString('uz-UZ') : '',
                        r.removed ? 'Chiqarilgan' : r.paidThisCode ? "To'lov qilgan" : r.pendingThisCode ? 'Chegirma kutmoqda' : 'Faollashtirgan',
                      ]),
                    )}
                  >
                    <Download size={14} /> CSV
                  </button>
                )}
                <button className="admin-icon-btn" onClick={() => setRedemptionsModal(null)} aria-label="Yopish">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {redemptionsLoading ? (
                <div className="admin-state-block">Yuklanmoqda...</div>
              ) : redemptionsList.length === 0 ? (
                <div className="admin-state-block">Bu kodni hali hech kim ishlatmagan.</div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Foydalanuvchi</th>
                        <th>Telefon</th>
                        <th>Fan</th>
                        <th>Faollashtirgan</th>
                        <th>Holati</th>
                        {onGrantPro && <th>Amal</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {redemptionsList.map((r) => (
                        <tr key={r.uid}>
                          <td>
                            {r.user && onOpenUserCard ? (
                              <button
                                type="button"
                                className="admin-link-btn"
                                style={{ fontWeight: 700, color: 'var(--text)' }}
                                onClick={() => { setRedemptionsModal(null); onOpenUserCard(r.user); }}
                              >
                                {r.name}
                              </button>
                            ) : (
                              <div style={{ fontWeight: 700 }}>{r.name}</div>
                            )}
                            <div className="admin-td-sub">{r.shortId || r.uid.slice(0, 8)}</div>
                          </td>
                          <td className="admin-td-sub">{r.prettyPhone}</td>
                          <td className="admin-td-sub">{subjectName(r.subject) || '—'}</td>
                          <td className="admin-td-sub">
                            {r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString('uz-UZ') : '—'}
                          </td>
                          <td>
                            {r.removed ? (
                              <span className="admin-chip admin-chip--red">🚫 Chiqarilgan</span>
                            ) : r.paidThisCode ? (
                              <span className="admin-chip admin-chip--green">✅ To&apos;lov qilgan</span>
                            ) : r.pendingThisCode ? (
                              <span className="admin-chip admin-chip--amber">⏳ To&apos;lov kutmoqda</span>
                            ) : (
                              <span className="admin-chip admin-chip--blue">🎁 Faollashtirgan</span>
                            )}
                          </td>
                          {onGrantPro && (
                            <td>
                              {r.user && !r.paidThisCode && !r.removed && redemptionsModal.type === 'percent' && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => { const u = r.user; setRedemptionsModal(null); onGrantPro(u); }}
                                >
                                  <Crown size={13} /> Pro berish
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`"${confirmDelete?.id}" kodini o'chirasizmi?`}
        text="Bu kod hali hech kim tomonidan ishlatilmagan, shuning uchun o'chirish xavfsiz."
        confirmLabel="O'chirish"
        cancelLabel="Bekor qilish"
        danger
        onConfirm={() => { const p = confirmDelete; setConfirmDelete(null); handleDelete(p); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
