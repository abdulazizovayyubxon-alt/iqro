/**
 * SchoolsTab.jsx — Admin panel: maktablar (B2B) boshqaruvi.
 *
 * Bu yerda maktab YARATILADI (o'rinlar soni + obuna muddati), qo'shilish kodi
 * beriladi va maktab admini biriktiriladi. O'qituvchilarning qo'shilishi esa
 * FAQAT server orqali (api/school.js) — o'rinlar soni va dublikat a'zolik
 * tranzaksiyada tekshiriladi.
 *
 * Firestore rules: schools/* yozuv faqat platforma adminida.
 */
import React, { useState, useEffect, useContext } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
  query, where, limit, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContext } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { syncSchoolPremium, SCHOOL_ERRORS } from '../../services/school';
import {
  School, Plus, Trash2, Users, RefreshCw, Copy, Inbox, UserPlus, Zap,
} from 'lucide-react';

const genJoinCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MAKTAB-${s}`;
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 'var(--fs-base)',
  border: '1.5px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)',
  marginBottom: 5, display: 'block', textTransform: 'uppercase',
};

// Bir yildan keyingi sana — default obuna muddati
const defaultUntil = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export default function SchoolsTab() {
  const { showToast } = useContext(ToastContext);
  const { user } = useAuth();

  const [schools, setSchools] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [form, setForm] = useState({
    name: '', region: '', district: '',
    seats: 30, until: defaultUntil(), joinCode: genJoinCode(), adminEmail: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [sSnap, rSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(query(collection(db, 'schoolRequests'), orderBy('createdAt', 'desc'), limit(50))).catch(() => null),
      ]);
      const list = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setSchools(list);
      setRequests(rSnap ? rSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
    } catch (e) {
      console.error(e);
      showToast('Maktablarni yuklashda xatolik', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Email bo'yicha foydalanuvchini topish (maktab adminini biriktirish uchun)
  const findUidByEmail = async (email) => {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()), limit(1)));
    return snap.empty ? null : snap.docs[0].id;
  };

  const handleCreate = async () => {
    const name = form.name.trim();
    const joinCode = form.joinCode.trim().toUpperCase();
    const seats = Number(form.seats);

    if (name.length < 3) { showToast('Maktab nomi juda qisqa', 'error'); return; }
    if (!/^[A-Z0-9_-]{4,32}$/.test(joinCode)) { showToast('Kod 4-32 belgi: harf, raqam, - yoki _', 'error'); return; }
    if (!seats || seats < 1) { showToast("O'rinlar soni noto'g'ri", 'error'); return; }

    setCreating(true);
    try {
      // Kod takrorlanmasligi kerak — qo'shilish aynan shu kod bo'yicha topadi
      const dup = await getDocs(query(collection(db, 'schools'), where('joinCode', '==', joinCode), limit(1)));
      if (!dup.empty) {
        showToast('Bunday qo\'shilish kodi allaqachon mavjud', 'error');
        setCreating(false);
        return;
      }

      let adminUids = [];
      if (form.adminEmail.trim()) {
        const uid = await findUidByEmail(form.adminEmail);
        if (!uid) {
          showToast('Bu email bilan foydalanuvchi topilmadi — avval ro\'yxatdan o\'tsin', 'error');
          setCreating(false);
          return;
        }
        adminUids = [uid];
      }

      const ref = doc(collection(db, 'schools'));
      const payload = {
        name,
        region: form.region.trim() || null,
        district: form.district.trim() || null,
        joinCode,
        seats,
        memberCount: 0,
        adminUids,
        subscriptionUntil: form.until ? new Date(form.until + 'T23:59:59').toISOString() : null,
        plan: 'b2b',
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || null,
      };
      await setDoc(ref, payload);

      // Maktab admini o'z panelini ko'rishi uchun profiliga biriktiramiz
      if (adminUids[0]) {
        await setDoc(doc(db, 'users', adminUids[0]), { schoolId: ref.id, schoolName: name }, { merge: true });
      }

      showToast(`Maktab yaratildi: ${name} ✅`, 'success');
      setForm({ name: '', region: '', district: '', seats: 30, until: defaultUntil(), joinCode: genJoinCode(), adminEmail: '' });
      load();
    } catch (e) {
      console.error(e);
      showToast('Yaratishda xatolik', 'error');
    }
    setCreating(false);
  };

  const toggleActive = async (s) => {
    try {
      await updateDoc(doc(db, 'schools', s.id), { active: !s.active });
      setSchools(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x));
    } catch { showToast('Xatolik', 'error'); }
  };

  const handleDelete = async (s) => {
    // A'zolari bor maktabni o'chirish MUMKIN EMAS: Firestore subkolleksiyani
    // kaskad o'chirmaydi va o'qituvchilarning users/{uid}.schoolId maydoni
    // mavjud bo'lmagan maktabga ishora qilib qolardi (panel «topilmadi» beradi).
    // To'g'ri yo'l — «O'chiq» holatiga o'tkazish: yangi qo'shilish to'xtaydi,
    // mavjud a'zolar va ularning Pro muddati saqlanadi.
    if ((s.memberCount || 0) > 0) {
      showToast(`"${s.name}" da ${s.memberCount} a'zo bor — o'chirish o'rniga «O'chiq» qiling`, 'error');
      return;
    }
    if (!window.confirm(`"${s.name}" maktabini o'chirasizmi? (a'zolar yo'q)`)) return;
    try {
      await deleteDoc(doc(db, 'schools', s.id));
      setSchools(prev => prev.filter(x => x.id !== s.id));
      showToast("O'chirildi", 'info');
    } catch { showToast('Xatolik', 'error'); }
  };

  // Obunani mavjud a'zolarga tarqatish (server, Admin SDK)
  const handleSync = async (s) => {
    setBusyId(s.id);
    const res = await syncSchoolPremium(s.id);
    setBusyId(null);
    if (!res.ok) { showToast(SCHOOL_ERRORS[res.error] || 'Xatolik', 'error'); return; }
    showToast(`Pro berildi: ${res.granted} ta · o'zgarmadi: ${res.skipped} ta`, 'success');
  };

  const extendYear = async (s) => {
    const base = s.subscriptionUntil && new Date(s.subscriptionUntil) > new Date()
      ? new Date(s.subscriptionUntil) : new Date();
    base.setFullYear(base.getFullYear() + 1);
    try {
      await updateDoc(doc(db, 'schools', s.id), { subscriptionUntil: base.toISOString() });
      setSchools(prev => prev.map(x => x.id === s.id ? { ...x, subscriptionUntil: base.toISOString() } : x));
      showToast("Obuna 1 yilga uzaytirildi — endi «Pro tarqatish» tugmasini bosing", 'success');
    } catch { showToast('Xatolik', 'error'); }
  };

  const addAdmin = async (s) => {
    const email = window.prompt(`"${s.name}" uchun maktab admini emaili:`);
    if (!email) return;
    try {
      const uid = await findUidByEmail(email);
      if (!uid) { showToast('Foydalanuvchi topilmadi', 'error'); return; }
      const next = Array.from(new Set([...(s.adminUids || []), uid]));
      await updateDoc(doc(db, 'schools', s.id), { adminUids: next });
      await setDoc(doc(db, 'users', uid), { schoolId: s.id, schoolName: s.name }, { merge: true });
      setSchools(prev => prev.map(x => x.id === s.id ? { ...x, adminUids: next } : x));
      showToast('Maktab admini biriktirildi', 'success');
    } catch (e) {
      console.error(e);
      showToast('Xatolik', 'error');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code)
      .then(() => showToast('Kod nusxalandi', 'info'))
      .catch(() => {});
  };

  const setReqStatus = async (r, status) => {
    try {
      await updateDoc(doc(db, 'schoolRequests', r.id), { status });
      setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status } : x));
    } catch { showToast('Xatolik', 'error'); }
  };

  const newRequests = requests.filter(r => r.status === 'new').length;

  return (
    <div>
      {/* ═══ YARATISH ═══ */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)', marginBottom: 16 }}>
          <School size={18} style={{ color: 'var(--accent)' }} /> Yangi maktab (B2B paket)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Maktab nomi</label>
            <input style={inputStyle} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="masalan: 24-umumta'lim maktabi" maxLength={120} />
          </div>
          <div>
            <label style={labelStyle}>Viloyat</label>
            <input style={inputStyle} value={form.region}
              onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              placeholder="Toshkent viloyati" maxLength={80} />
          </div>
          <div>
            <label style={labelStyle}>Tuman</label>
            <input style={inputStyle} value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              placeholder="Chirchiq" maxLength={80} />
          </div>
          <div>
            <label style={labelStyle}>O'rinlar soni</label>
            <input style={inputStyle} type="number" min="1" max="2000" value={form.seats}
              onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Obuna muddati</label>
            <input style={inputStyle} type="date" value={form.until}
              onChange={e => setForm(f => ({ ...f, until: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Qo'shilish kodi</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}
                value={form.joinCode}
                onChange={e => setForm(f => ({ ...f, joinCode: e.target.value.toUpperCase() }))}
                maxLength={32}
              />
              <button className="btn btn-sm btn-outline" style={{ flexShrink: 0 }}
                onClick={() => setForm(f => ({ ...f, joinCode: genJoinCode() }))} title="Tasodifiy kod">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Maktab admini (email, ixtiyoriy)</label>
            <input style={inputStyle} value={form.adminEmail}
              onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
              placeholder="direktor@example.com" maxLength={120} />
          </div>
        </div>

        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginBottom: 12, lineHeight: 1.55 }}>
          Kodni maktabga bering — har o'qituvchi «Maktab» bo'limida o'zi kiritadi va obuna muddati
          avtomatik beriladi. Muddat keyinroq uzaytirilsa, mavjud a'zolarga «Pro tarqatish» tugmasi orqali qo'llanadi.
        </div>

        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          <Plus size={16} /> {creating ? 'Yaratilmoqda...' : 'Yaratish'}
        </button>
      </div>

      {/* ═══ SO'ROVLAR (B2B murojaatlar) ═══ */}
      {requests.length > 0 && (
        <div className="glass-panel" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 'var(--fs-base)', color: 'var(--text)', marginBottom: 12 }}>
            <Inbox size={17} style={{ color: 'var(--amber)' }} /> Maktab so'rovlari
            {newRequests > 0 && (
              <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 'var(--fs-xs)', fontWeight: 800 }}>
                {newRequests}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => (
              <div key={r.id} style={{
                padding: '10px 12px', borderRadius: 10, background: 'var(--bg2)',
                border: '1px solid var(--border)', opacity: r.status === 'new' ? 1 : 0.6,
              }}>
                <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)' }}>
                  {r.schoolName} {r.region ? `· ${r.region}` : ''}
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', marginTop: 3 }}>
                  {r.contactName || '—'} · {r.phone} · {r.teachers || '?'} o'qituvchi
                  {r.note ? ` · ${r.note}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {r.status === 'new' && (
                    <button className="btn btn-sm btn-outline" onClick={() => setReqStatus(r, 'contacted')}>
                      Bog'lanildi
                    </button>
                  )}
                  {r.status !== 'closed' && (
                    <button className="btn btn-sm btn-outline" onClick={() => setReqStatus(r, 'closed')}>
                      Yopish
                    </button>
                  )}
                  <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MAKTABLAR RO'YXATI ═══ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Yuklanmoqda...</div>
      ) : schools.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <School size={34} style={{ marginBottom: 10, opacity: 0.5 }} />
          <div>Hozircha maktablar yo'q</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {schools.map(s => {
            const until = s.subscriptionUntil ? new Date(s.subscriptionUntil) : null;
            const expired = until && until < new Date();
            const full = (s.memberCount || 0) >= (s.seats || 0);
            return (
              <div key={s.id} className="glass-panel" style={{ padding: '14px 16px', opacity: s.active === false ? 0.55 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
                      {s.name}
                      {expired && <span style={{ marginLeft: 8, fontSize: 'var(--fs-2xs)', color: 'var(--red)', fontWeight: 700 }}>MUDDATI TUGAGAN</span>}
                      {full && <span style={{ marginLeft: 8, fontSize: 'var(--fs-2xs)', color: 'var(--amber)', fontWeight: 700 }}>O'RINLAR TO'LGAN</span>}
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                      {[s.region, s.district].filter(Boolean).join(', ') || '—'}
                      {until && ` · ${until.toLocaleDateString('uz-UZ')} gacha`}
                      {(s.adminUids?.length || 0) > 0 && ` · ${s.adminUids.length} admin`}
                    </div>
                  </div>

                  <button
                    onClick={() => copyCode(s.joinCode)}
                    title="Kodni nusxalash"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                      borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg2)',
                      color: 'var(--text)', fontFamily: 'monospace', fontWeight: 700,
                      fontSize: 'var(--fs-md)', letterSpacing: 1, cursor: 'pointer',
                    }}
                  >
                    {s.joinCode} <Copy size={13} style={{ color: 'var(--text3)' }} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-md)', fontWeight: 700, color: full ? 'var(--amber)' : 'var(--text2)' }}>
                    <Users size={14} /> {s.memberCount || 0}/{s.seats || '∞'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 11, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => extendYear(s)}>
                    +1 yil
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => handleSync(s)} disabled={busyId === s.id}>
                    <Zap size={13} /> {busyId === s.id ? '...' : 'Pro tarqatish'}
                  </button>
                  <button className="btn btn-sm btn-outline" onClick={() => addAdmin(s)}>
                    <UserPlus size={13} /> Admin
                  </button>
                  <button className={`btn btn-sm ${s.active !== false ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleActive(s)}>
                    {s.active !== false ? 'Faol' : "O'chiq"}
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ color: 'var(--red)' }} onClick={() => handleDelete(s)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
