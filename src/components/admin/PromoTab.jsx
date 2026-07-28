/**
 * PromoTab.jsx — Admin panel: promo-kodlar boshqaruvi
 * Yaratish (percent/days/team), ro'yxat, faol/o'chiq, o'chirish.
 * Firestore rules: promoCodes faqat admin uchun ochiq;
 * foydalanuvchi redemption FAQAT api/redeem-promo.js orqali.
 */
import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContext } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Plus, Trash2, Users, RefreshCw } from 'lucide-react';

const TYPE_LABELS = {
  percent: { label: 'Chegirma (%)', icon: '🏷️', desc: "Keyingi to'lovdan foiz chegirma" },
  days: { label: 'Pro kunlar', icon: '⏰', desc: 'Darhol Pro kunlar beradi' },
  team: { label: 'Maktab paketi', icon: '🏫', desc: "Jamoaviy kod — har o'qituvchi o'zi kiritadi" },
};

const genCode = (prefix = 'IQRO') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${suffix}`;
};

export default function PromoTab() {
  const { showToast } = useContext(ToastContext);
  const { user } = useAuth();

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: 20,
    maxUses: 50,
    expiresAt: '',
    campaign: '',
  });

  const loadPromos = async () => {
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
  };

  useEffect(() => { loadPromos(); }, []);

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

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const maxUses = Number(form.maxUses);

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      showToast("Kod 3-32 belgi: harf, raqam, - yoki _", 'error');
      return;
    }
    if (!value || value <= 0 || (form.type === 'percent' && value > 100)) {
      showToast("Qiymat noto'g'ri (foiz uchun 1-100)", 'error');
      return;
    }
    if (!maxUses || maxUses <= 0) {
      showToast("Limit noto'g'ri", 'error');
      return;
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
        usedBy: [],
        expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59').toISOString() : null,
        campaign: form.campaign.trim() || null,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || null,
      });
      showToast(`Promo-kod yaratildi: ${code} ✅`, 'success');
      setForm({ code: '', type: 'percent', value: 20, maxUses: 50, expiresAt: '', campaign: '' });
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
    } catch (e) {
      showToast('Xatolik', 'error');
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`"${promo.id}" kodini o'chirasizmi? (${promo.usedCount || 0} marta ishlatilgan)`)) return;
    try {
      await deleteDoc(doc(db, 'promoCodes', promo.id));
      setPromos(prev => prev.filter(p => p.id !== promo.id));
      showToast("O'chirildi", 'info');
    } catch (e) {
      showToast('Xatolik', 'error');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 'var(--fs-base)',
    border: '1.5px solid var(--border)', background: 'var(--bg2)',
    color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)', marginBottom: 5, display: 'block', textTransform: 'uppercase' };

  return (
    <div>
      {/* ═══ YARATISH FORMASI ═══ */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
            <Ticket size={18} style={{ color: 'var(--accent)' }} /> Yangi promo-kod
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={applyTeamPreset}
            title="Maktab paketi: 365 kun, 30 o'rin"
          >
            🏫 Maktab paketi shabloni
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Kod</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="IQRO-XXXXX"
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
            <label style={labelStyle}>Turi</label>
            <select
              style={inputStyle}
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value, value: e.target.value === 'percent' ? 20 : e.target.value === 'team' ? 365 : 30 }))}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{form.type === 'percent' ? 'Chegirma (%)' : 'Kunlar soni'}</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              max={form.type === 'percent' ? 100 : 3660}
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Limit (necha kishi)</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Muddati (ixtiyoriy)</label>
            <input
              style={inputStyle}
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Kampaniya (ixtiyoriy)</label>
            <input
              style={inputStyle}
              value={form.campaign}
              onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))}
              placeholder="masalan: maktab-25, sentyabr"
            />
          </div>
        </div>

        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginBottom: 12 }}>
          {TYPE_LABELS[form.type].desc}
          {form.type === 'team' && " — sotuv Telegram orqali kelishilgach, kodni maktabga bering; har o'qituvchi Pro oynasida o'zi kiritadi."}
        </div>

        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          <Plus size={16} /> {creating ? 'Yaratilmoqda...' : 'Yaratish'}
        </button>
      </div>

      {/* ═══ RO'YXAT ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Yuklanmoqda...</div>
      ) : promos.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 'var(--fs-9xl)', marginBottom: 10 }}>🎟️</div>
          Hozircha promo-kodlar yo'q
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {promos.map(p => {
            const t = TYPE_LABELS[p.type] || TYPE_LABELS.percent;
            const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
            const isFull = (p.usedCount || 0) >= (p.maxUses || 1);
            return (
              <div key={p.id} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.active && !isExpired ? 1 : 0.55 }}>
                <div style={{ fontSize: 'var(--fs-3xl)' }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)', letterSpacing: 1, fontFamily: 'monospace' }}>
                    {p.id}
                    {isExpired && <span style={{ marginLeft: 8, fontSize: 'var(--fs-2xs)', color: 'var(--red)', fontWeight: 700 }}>MUDDATI TUGAGAN</span>}
                    {isFull && <span style={{ marginLeft: 8, fontSize: 'var(--fs-2xs)', color: 'var(--amber)', fontWeight: 700 }}>LIMIT TUGAGAN</span>}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                    {p.type === 'percent' ? `-${p.value}% chegirma` : `+${p.value} kun premium`}
                    {p.campaign && ` · ${p.campaign}`}
                    {p.expiresAt && ` · ${new Date(p.expiresAt).toLocaleDateString('uz-UZ')} gacha`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-md)', fontWeight: 700, color: isFull ? 'var(--amber)' : 'var(--text2)' }}>
                  <Users size={14} /> {p.usedCount || 0}/{p.maxUses}
                </div>
                <button
                  className={`btn btn-sm ${p.active ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => toggleActive(p)}
                >
                  {p.active ? 'Faol' : "O'chiq"}
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  style={{ color: 'var(--red)' }}
                  onClick={() => handleDelete(p)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
