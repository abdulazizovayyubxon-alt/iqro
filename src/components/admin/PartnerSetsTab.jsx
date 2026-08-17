/**
 * PartnerSetsTab.jsx — Admin panel: hamkor ustozning YOPIQ haftalik
 * diagnostika to'plamlari.
 *
 * Tuzilish (firestore.rules bilan bir xil):
 *   partnerSets/{setId}                    → metama'lumot
 *   partnerSets/{setId}/content/questions  → savollar massivi (bitta hujjat)
 *
 * Savollar nega bitta hujjatda: hafta ochilganda 1 ta o'qish sarflanadi,
 * 35 ta emas. Firestore kvotasi bu loyihada asosiy xarajat.
 *
 * O'qish huquqi qoidalarda shu promokodni TASDIQLAGAN guruh a'zolariga
 * bog'langan — ya'ni to'plam guruhdan tashqarida ko'rinmaydi.
 */
import React, { useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ToastContext } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS } from '../../data/mockData';
import { CalendarDays, RefreshCw, Lock, Upload } from 'lucide-react';
import { logAdminAction } from '../../services/adminLog';
import { sanaMatni } from '../../services/partnerSets';

/** Hujjat ID'si: kod + hafta tartibi — o'qiladigan va takrorlanmaydigan */
const setIdYasa = (code, order) =>
  `${String(code).toLowerCase().replace(/[^a-z0-9]/g, '')}_h${order}`;

/**
 * Joylashtirilgan JSON'ni tekshiradi.
 *
 * Bu tekshiruv ATAYIN qattiq: noto'g'ri `correct` indeksi ustozlarga XATO
 * javobni to'g'ri deb ko'rsatadi va buni hech kim sezmaydi. Shuning uchun
 * xato bo'lsa saqlashga umuman yo'l qo'yilmaydi va nechanchi savol ekani
 * aytiladi.
 */
function savollarniTekshir(matn) {
  let parsed;
  try {
    parsed = JSON.parse(matn);
  } catch {
    return { ok: false, error: 'JSON formati buzuq — matnni to‘liq nusxalaganingizni tekshiring' };
  }
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: 'Savollar massivi topilmadi (`questions` maydoni yoki massivning o‘zi kerak)' };
  }

  const toza = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const nom = q.n ? `${q.n}-test` : `${i + 1}-savol`;
    if (!q || typeof q.q !== 'string' || !q.q.trim()) {
      return { ok: false, error: `${nom}: savol matni yo‘q` };
    }
    if (!Array.isArray(q.opts) || q.opts.length < 2) {
      return { ok: false, error: `${nom}: kamida 2 ta variant bo‘lishi kerak` };
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.opts.length) {
      return { ok: false, error: `${nom}: to‘g‘ri javob indeksi xato (${q.correct})` };
    }
    // Faqat kerakli maydonlar saqlanadi — `confidence`, `_izoh` kabi ish
    // maydonlari hujjat hajmini bekorga oshiradi.
    toza.push({
      q: q.q.trim(),
      opts: q.opts.map((o) => String(o)),
      correct: q.correct,
      ...(q.explanation ? { explanation: String(q.explanation) } : {}),
      ...(q.image ? { image: String(q.image) } : {}),
    });
  }

  // Firestore hujjati chegarasi — 1 MB. Chegaraga yaqinlashsa oldindan aytamiz,
  // aks holda saqlash paytida tushunarsiz xato chiqadi.
  const hajm = new Blob([JSON.stringify(toza)]).size;
  if (hajm > 900_000) {
    return { ok: false, error: `To‘plam juda katta (${Math.round(hajm / 1024)} KB). Chegara ~900 KB.` };
  }

  return { ok: true, questions: toza, hajm };
}

export default function PartnerSetsTab() {
  const { showToast } = useContext(ToastContext);
  const { user } = useAuth();

  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    partnerCode: '',
    category: 'chqbt',
    title: '',
    order: 1,
    opensAt: '',
    json: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'partnerSets'));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) =>
        (a.partnerCode || '').localeCompare(b.partnerCode || '') || (a.order || 0) - (b.order || 0));
      setSets(list);
    } catch (e) {
      console.error(e);
      showToast("To'plamlarni yuklashda xatolik", 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saqla = async () => {
    const code = form.partnerCode.trim().toUpperCase();
    const title = form.title.trim();
    const order = Number(form.order);

    if (!code) return showToast('Hamkor promokodini kiriting', 'error');
    if (!title) return showToast("To'plam nomini kiriting", 'error');
    if (!Number.isInteger(order) || order < 1) return showToast('Tartib raqami 1 dan boshlanadi', 'error');

    const tekshir = savollarniTekshir(form.json);
    if (!tekshir.ok) return showToast(tekshir.error, 'error');

    const setId = setIdYasa(code, order);
    setSaving(true);
    try {
      // Promokod haqiqatan mavjudmi? Yo'q bo'lsa to'plamni HECH KIM ko'ra
      // olmaydi (qoidalar redemption hujjatiga qaraydi) — buni saqlashdan
      // oldin aytgan ma'qul, keyin «nega ko'rinmayapti?» deb qidirgandan ko'ra.
      const promo = await getDoc(doc(db, 'promoCodes', code));
      if (!promo.exists()) {
        showToast(`«${code}» promokodi topilmadi — avval Promo bo'limida yarating`, 'error');
        setSaving(false);
        return;
      }

      await setDoc(doc(db, 'partnerSets', setId), {
        partnerCode: code,
        category: form.category,
        title,
        order,
        // Bo'sh bo'lsa — darhol ochiq
        opensAt: form.opensAt || null,
        active: true,
        questionCount: tekshir.questions.length,
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || null,
      }, { merge: true });

      // `partnerCode` savollar hujjatida ham TAKRORLANADI — qoida ota hujjatni
      // `get()` bilan o'qishga majbur bo'lmasin (har ochishda qo'shimcha o'qish).
      await setDoc(doc(db, 'partnerSets', setId, 'content', 'questions'), {
        partnerCode: code,
        questions: tekshir.questions,
        updatedAt: new Date().toISOString(),
      });

      logAdminAction('partnerSet.save', setId, {
        kod: code, fan: form.category, savol: tekshir.questions.length, ochilish: form.opensAt || 'darhol',
      });
      showToast(`«${title}» saqlandi — ${tekshir.questions.length} ta savol ✅`, 'success');
      setForm((f) => ({ ...f, title: '', json: '', order: order + 1, opensAt: '' }));
      load();
    } catch (e) {
      console.error(e);
      showToast(e?.code === 'permission-denied' ? 'Ruxsat yo‘q — qoidalar deploy qilinganmi?' : 'Saqlashda xatolik', 'error');
    }
    setSaving(false);
  };

  const toggleActive = async (s) => {
    try {
      await updateDoc(doc(db, 'partnerSets', s.id), { active: !s.active });
      setSets((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
      logAdminAction('partnerSet.toggle', s.id, { holat: !s.active ? 'faol' : "o'chiq" });
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const sanaOzgartir = async (s, qiymat) => {
    try {
      await updateDoc(doc(db, 'partnerSets', s.id), { opensAt: qiymat || null });
      setSets((prev) => prev.map((x) => (x.id === s.id ? { ...x, opensAt: qiymat || null } : x)));
      logAdminAction('partnerSet.opensAt', s.id, { sana: qiymat || 'darhol' });
      showToast(qiymat ? `${sanaMatni(qiymat)} kuni ochiladi` : 'Darhol ochildi', 'success');
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const tekshiruv = form.json.trim() ? savollarniTekshir(form.json) : null;

  return (
    <div>
      {/* ── Yaratish/yangilash formasi ── */}
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CalendarDays size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: 800 }}>Haftalik to'plam qo'shish</h3>
        </div>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text3)', margin: '0 0 14px' }}>
          To'plam faqat shu promokodni tasdiqlagan guruh a'zolariga ko'rinadi. Bir xil kod va
          tartib raqami bilan qayta saqlansa — eskisi yangilanadi.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <div>
            <label className="admin-label">Hamkor promokodi</label>
            <input
              className="admin-input admin-input--code"
              placeholder="MIRONSHOH"
              value={form.partnerCode}
              onChange={(e) => setForm((f) => ({ ...f, partnerCode: e.target.value.toUpperCase() }))}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div>
            <label className="admin-label">Fan</label>
            <select
              className="admin-input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="admin-label">Tartib (hafta)</label>
            <input
              className="admin-input"
              type="number"
              min={1}
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
            />
          </div>
          <div>
            <label className="admin-label">Ochilish sanasi</label>
            <input
              className="admin-input"
              type="date"
              value={form.opensAt}
              onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="admin-label">To'plam nomi</label>
          <input
            className="admin-input"
            placeholder="1-hafta diagnostika"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="admin-label">Savollar (JSON)</label>
          <textarea
            className="admin-input"
            rows={8}
            placeholder='{"questions":[{"q":"...","opts":["A) ...","B) ..."],"correct":0,"explanation":"..."}]}'
            value={form.json}
            onChange={(e) => setForm((f) => ({ ...f, json: e.target.value }))}
            style={{ fontFamily: 'monospace', fontSize: 'var(--fs-2xs)', resize: 'vertical' }}
          />
          {tekshiruv && (
            <div style={{
              marginTop: 6, fontSize: 'var(--fs-xs)', fontWeight: 700,
              color: tekshiruv.ok ? 'var(--green)' : 'var(--red)',
            }}>
              {tekshiruv.ok
                ? `✓ ${tekshiruv.questions.length} ta savol tayyor (${Math.round(tekshiruv.hajm / 1024)} KB)`
                : `⚠️ ${tekshiruv.error}`}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={saqla}
          disabled={saving || !tekshiruv?.ok}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving || !tekshiruv?.ok ? 0.6 : 1 }}
        >
          {saving ? <RefreshCw size={15} className="spin" /> : <Upload size={15} />}
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>

      {/* ── Mavjud to'plamlar ── */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: 800 }}>
            Mavjud to'plamlar ({sets.length})
          </h3>
          <button className="btn btn-sm btn-outline" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Yangilash
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>Yuklanmoqda...</div>
        ) : sets.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>
            Hali to'plam yo'q. Yuqoridagi formadan qo'shing.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sets.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '12px 14px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: s.active ? 'var(--bg2)' : 'var(--bg3)',
                  opacity: s.active ? 1 : 0.65,
                }}
              >
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 'var(--fs-base)' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 2 }}>
                    {s.partnerCode} · {s.category} · {s.order}-hafta · {s.questionCount || 0} savol
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={13} style={{ color: 'var(--text3)' }} />
                  <input
                    className="admin-input"
                    type="date"
                    value={s.opensAt || ''}
                    onChange={(e) => sanaOzgartir(s, e.target.value)}
                    style={{ maxWidth: 150, fontSize: 'var(--fs-2xs)' }}
                  />
                </div>

                <button
                  className={`btn btn-sm ${s.active ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => toggleActive(s)}
                >
                  {s.active ? 'Faol' : "O'chiq"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
