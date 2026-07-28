import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { joinSchool, fetchSchoolStats, SCHOOL_ERRORS } from '../services/school';
import { SUPPORT_URL } from '../config';
import {
  School, Users, TrendingUp, ShieldCheck, LogIn, Send,
  AlertTriangle, EyeOff, CheckCircle2, Building2, Loader2,
} from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 11, fontSize: 'var(--fs-base)',
  border: '1.5px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text3)',
  marginBottom: 5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.3,
};

// ── Jamlanma katakchasi ────────────────────────────────────────────────────
const StatBox = ({ value, label, color = 'var(--text)' }) => (
  <div className="glass-panel" style={{ flex: '1 1 92px', minWidth: 92, padding: '13px 8px', textAlign: 'center' }}>
    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
    <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600, color: 'var(--text3)', marginTop: 5 }}>{label}</div>
  </div>
);

const readinessColor = (v) =>
  v == null ? 'var(--text3)' : v >= 70 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)';

const SchoolPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useContext(ToastContext);

  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState(null);
  // report != null → foydalanuvchi maktab admini (server ruxsat bergan)
  const [report, setReport] = useState(null);     // { school, members, summary }
  const [schoolName, setSchoolName] = useState(null);

  // Qo'shilish formasi
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(true);
  const [joining, setJoining] = useState(false);

  // Korporativ so'rov formasi
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ schoolName: '', region: '', phone: '', teachers: 30, note: '' });
  const [sending, setSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const loadMembership = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      const sid = uSnap.exists() ? uSnap.data().schoolId || null : null;
      setSchoolId(sid);
      setSchoolName(uSnap.exists() ? uSnap.data().schoolName || null : null);

      if (sid) {
        // Hisobot faqat maktab adminiga beriladi — server o'zi tekshiradi
        const res = await fetchSchoolStats(sid);
        if (res.ok) {
          setReport(res);
          setSchoolName(res.school?.name || null);
        }
      }
    } catch (e) {
      console.error('Maktab ma\'lumotini yuklashda xatolik:', e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadMembership(); }, [loadMembership]);

  const handleJoin = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) { showToast(SCHOOL_ERRORS.invalid_code_format, 'error'); return; }
    setJoining(true);
    const res = await joinSchool(clean, consent);
    setJoining(false);
    if (!res.ok) {
      showToast(SCHOOL_ERRORS[res.error] || SCHOOL_ERRORS.server_error, 'error');
      return;
    }
    showToast(
      res.premiumGrantedUntil
        ? t('school.joinedWithPremium', { school: res.schoolName || '' })
        : t('school.joined', { school: res.schoolName || '' }),
      'success'
    );
    setCode('');
    loadMembership();
  };

  const handleRequest = async () => {
    if (!reqForm.schoolName.trim() || !reqForm.phone.trim()) {
      showToast(t('school.reqRequired'), 'error');
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, 'schoolRequests'), {
        uid: user.uid,
        contactName: user.displayName || null,
        email: user.email || null,
        schoolName: reqForm.schoolName.trim(),
        region: reqForm.region.trim() || null,
        phone: reqForm.phone.trim(),
        teachers: Number(reqForm.teachers) || null,
        note: reqForm.note.trim() || null,
        status: 'new',
        createdAt: new Date().toISOString(),
      });
      setRequestSent(true);
      setShowRequest(false);
      showToast(t('school.reqSent'), 'success');
    } catch (e) {
      console.error(e);
      showToast(SCHOOL_ERRORS.server_error, 'error');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text3)', gap: 10 }}>
        <Loader2 size={18} className="spin" /> {t('common.loading')}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 32px' }}
    >
      <h1 style={{ fontSize: 'var(--fs-6xl)', fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>
        {t('school.title')}
      </h1>
      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text3)', marginBottom: 20 }}>
        {t('school.subtitle')}
      </p>

      {/* ══════════ MAKTAB ADMINI — BOSHQARUV PANELI ══════════ */}
      {report?.ok && (
        <>
          <div className="glass-panel" style={{ padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <School size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--text)' }}>{report.school.name}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                  {[report.school.region, report.school.district].filter(Boolean).join(', ') || t('school.noRegion')}
                  {' · '}
                  {t('school.seatsUsed', { used: report.school.memberCount, seats: report.school.seats || '∞' })}
                </div>
              </div>
            </div>
            {report.school.subscriptionUntil && (
              <div style={{
                marginTop: 12, padding: '8px 11px', borderRadius: 10,
                background: new Date(report.school.subscriptionUntil) > new Date() ? 'var(--green-bg)' : 'var(--red-bg)',
                color: new Date(report.school.subscriptionUntil) > new Date() ? 'var(--green)' : 'var(--red)',
                fontSize: 'var(--fs-sm)', fontWeight: 700,
              }}>
                {t('school.subscriptionUntil', {
                  date: new Date(report.school.subscriptionUntil).toLocaleDateString('uz-UZ'),
                })}
              </div>
            )}
          </div>

          {/* Jamlanma */}
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatBox value={report.summary.total} label={t('school.stTeachers')} />
            <StatBox value={report.summary.active7d} label={t('school.stActive')} color="var(--accent)" />
            <StatBox
              value={report.summary.avgReadiness != null ? `${report.summary.avgReadiness}%` : '—'}
              label={t('school.stReadiness')}
              color={readinessColor(report.summary.avgReadiness)}
            />
            <StatBox value={report.summary.needsSupport} label={t('school.stSupport')} color="var(--amber)" />
          </div>

          {/* Maxfiylik eslatmasi — ma'muriyat nimani ko'ra oladi */}
          <div style={{
            display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 13px',
            borderRadius: 12, background: 'var(--bg3)', marginBottom: 18,
            fontSize: 'var(--fs-xs)', color: 'var(--text2)', lineHeight: 1.55,
          }}>
            <ShieldCheck size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <span>{t('school.privacyNote')}</span>
          </div>

          {/* O'qituvchilar ro'yxati — tayyorligi past birinchi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>
            <Users size={17} style={{ color: 'var(--accent)' }} /> {t('school.membersTitle')}
          </div>

          {report.members.length === 0 ? (
            <div className="glass-panel" style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 'var(--fs-md)' }}>
              {t('school.membersEmpty')}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '4px 0' }}>
              {report.members.map((m, i) => (
                <div
                  key={m.uid}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px',
                    borderBottom: i === report.members.length - 1 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--bg3)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text2)',
                  }}>
                    {(m.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.displayName || t('school.unnamed')}
                    </div>
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--text3)', marginTop: 2 }}>
                      {m.hidden
                        ? t('school.hiddenRow')
                        : t('school.memberMeta', {
                          answered: m.answered || 0,
                          acc: m.accuracy != null ? `${m.accuracy}%` : '—',
                          streak: m.dailyStreak || 0,
                        })}
                    </div>
                  </div>
                  {m.hidden ? (
                    <EyeOff size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontSize: 'var(--fs-base)', fontWeight: 800, color: readinessColor(m.readiness) }}>
                        {m.readiness != null ? `${m.readiness}%` : '—'}
                      </div>
                      <div style={{ fontSize: 'var(--fs-3xs)', color: 'var(--text3)', fontWeight: 600 }}>
                        {t('school.readinessShort')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {report.summary.needsSupport > 0 && (
            <div style={{
              display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 14,
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--amber-bg)', fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.55,
            }}>
              <AlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
              <span>{t('school.supportHint', { count: report.summary.needsSupport })}</span>
            </div>
          )}
        </>
      )}

      {/* ══════════ A'ZO (oddiy o'qituvchi) ══════════ */}
      {schoolId && !report?.ok && (
        <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--green)' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>
                {schoolName || t('school.memberTitle')}
              </div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', marginTop: 2 }}>
                {t('school.memberDesc')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ QO'SHILISH (a'zo bo'lmaganlar) ══════════ */}
      {!schoolId && (
        <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>
            <LogIn size={17} style={{ color: 'var(--accent)' }} /> {t('school.joinTitle')}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', margin: '0 0 14px', lineHeight: 1.55 }}>
            {t('school.joinDesc')}
          </p>

          <label style={labelStyle}>{t('school.codeLabel')}</label>
          <input
            style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1.5, fontFamily: 'monospace' }}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="MAKTAB-XXXXX"
            maxLength={32}
          />

          <label style={{
            display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 13,
            fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--accent)' }}
            />
            <span>{t('school.consent')}</span>
          </label>

          <button
            className="btn btn-primary"
            style={{ marginTop: 14, width: '100%' }}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? t('common.loading') : t('school.joinBtn')}
          </button>
        </div>
      )}

      {/* ══════════ B2B — MAKTAB UCHUN PAKET ══════════ */}
      {!report?.ok && (
        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text)' }}>
            <Building2 size={17} style={{ color: 'var(--accent)' }} /> {t('school.b2bTitle')}
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text3)', margin: '0 0 14px', lineHeight: 1.6 }}>
            {t('school.b2bDesc')}
          </p>

          <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['b2bPoint1', 'b2bPoint2', 'b2bPoint3'].map(k => (
              <li key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.5 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                {t(`school.${k}`)}
              </li>
            ))}
          </ul>

          {requestSent ? (
            <div style={{
              padding: '12px 14px', borderRadius: 11, background: 'var(--green-bg)',
              color: 'var(--green)', fontSize: 'var(--fs-sm)', fontWeight: 700,
            }}>
              {t('school.reqSentBox')}
            </div>
          ) : !showRequest ? (
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowRequest(true)}>
                <Send size={15} /> {t('school.reqOpen')}
              </button>
              <a className="btn btn-outline" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                {t('school.reqTelegram')}
              </a>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 11 }}>
              <div>
                <label style={labelStyle}>{t('school.reqSchool')}</label>
                <input style={inputStyle} value={reqForm.schoolName}
                  onChange={e => setReqForm(f => ({ ...f, schoolName: e.target.value }))}
                  placeholder={t('school.reqSchoolPh')} maxLength={120} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
                <div>
                  <label style={labelStyle}>{t('school.reqRegion')}</label>
                  <input style={inputStyle} value={reqForm.region}
                    onChange={e => setReqForm(f => ({ ...f, region: e.target.value }))}
                    placeholder={t('school.reqRegionPh')} maxLength={80} />
                </div>
                <div>
                  <label style={labelStyle}>{t('school.reqPhone')}</label>
                  <input style={inputStyle} value={reqForm.phone}
                    onChange={e => setReqForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+998 __ ___ __ __" maxLength={20} />
                </div>
                <div>
                  <label style={labelStyle}>{t('school.reqTeachers')}</label>
                  <input style={inputStyle} type="number" min="1" max="2000" value={reqForm.teachers}
                    onChange={e => setReqForm(f => ({ ...f, teachers: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t('school.reqNote')}</label>
                <input style={inputStyle} value={reqForm.note}
                  onChange={e => setReqForm(f => ({ ...f, note: e.target.value }))}
                  placeholder={t('school.reqNotePh')} maxLength={300} />
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <button className="btn btn-primary" onClick={handleRequest} disabled={sending}>
                  <Send size={15} /> {sending ? t('common.loading') : t('school.reqSubmit')}
                </button>
                <button className="btn btn-outline" onClick={() => setShowRequest(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ma'muriyat uchun o'sish ko'rsatkichi eslatmasi */}
      {report?.ok && (
        <div style={{
          display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 18,
          padding: '12px 14px', borderRadius: 12, background: 'var(--blue-bg)',
          fontSize: 'var(--fs-sm)', color: 'var(--text2)', lineHeight: 1.55,
        }}>
          <TrendingUp size={15} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
          <span>{t('school.adminHint')}</span>
        </div>
      )}
    </motion.div>
  );
};

export default SchoolPage;
