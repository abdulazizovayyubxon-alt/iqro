import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { ToastContext } from '../context/ToastContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';
import { motion } from 'framer-motion';
import { 
  User, Phone, Calendar, Landmark, Settings, LogOut, Trash2, 
  ChevronRight, Save, Edit3, ArrowLeft, Shield, Sparkles, HelpCircle,
  Moon, Sun
} from 'lucide-react';

const GOALS = [
  { id: 'second_category', badge: '🥈', title: 'Ikkinchi toifa' },
  { id: 'first_category',  badge: '🥇', title: 'Birinchi toifa' },
  { id: 'highest_category',badge: '🏆', title: 'Oliy toifa' },
  { id: 'professional',    badge: '🎯', title: 'Kasbiy sertifikat uchun' },
];

const SUBJECTS = [
  { id: 'chqbt', badge: 'Q', title: 'CHQBT' },
  { id: 'art',   badge: 'S', title: 'Tasviriy San\'at' },
  { id: 'multi', badge: '✦', title: 'Bir nechta fan' },
];

const GENDERS = [
  { id: 'male', label: 'Erkak' },
  { id: 'female', label: 'Ayol' }
];

const ProfilePage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { state, updateState } = useContext(AppContext);
  const { showToast } = useContext(ToastContext);

  // Profil tahrirlash holatlari
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [goal, setGoal] = useState('');
  const [subject, setSubject] = useState('');
  const [phone, setPhone] = useState('');
  
  // Tizim sozlamalari
  const [examDate, setExamDate] = useState(() => {
    const saved = localStorage.getItem('CUSTOM_EXAM_DATE');
    if (saved) return saved.split('T')[0];
    return '';
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Firestore'dan qo'shimcha profil ma'lumotlarini yuklash
    const loadProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setName(data.displayName || user.displayName || '');
          setGender(data.gender || '');
          setBirthDate(data.birthDate || '');
          setGoal(data.onboardingGoal || '');
          setSubject(data.onboardingSubject || '');
          setPhone(data.phone || user.email?.split('@')[0] || '');
        } else {
          setName(user.displayName || '');
        }
      } catch (err) {
        console.error("Profilni yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Ism va familiyani kiritish shart", "error");
      return;
    }
    
    setSaving(true);
    try {
      // 1. Firebase Auth profilini yangilash
      if (auth.currentUser && name !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      
      // 2. Firestore dagi user hujjatini yangilash
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: name,
        gender,
        birthDate,
        onboardingGoal: goal,
        onboardingSubject: subject,
      });

      // AppContext dagi activeCategory ni ham moslashtiramiz agar fan o'zgargan bo'lsa
      if (subject && subject !== 'multi' && state.activeCategory !== subject) {
        updateState({ activeCategory: subject });
      }

      // 3. Imtihon sanasini saqlash
      if (examDate) {
        localStorage.setItem('CUSTOM_EXAM_DATE', new Date(examDate).toISOString());
        window.dispatchEvent(new Event('storage'));
      } else {
        localStorage.removeItem('CUSTOM_EXAM_DATE');
        window.dispatchEvent(new Event('storage'));
      }

      showToast("Profil muvaffaqiyatli saqlandi!", "success");
    } catch (err) {
      console.error("Profilni saqlashda xatolik:", err);
      showToast("Xatolik yuz berdi, qayta urinib ko'ring", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Tizimdan chiqishni tasdiqlaysizmi?")) {
      await logout();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yuklanmoqda...</span>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Profil ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 40px' }}
    >
      {/* Back Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            background: 'var(--bg3)', border: '1px solid var(--border)', 
            borderRadius: 12, width: 40, height: 40, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', color: 'var(--text)' 
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Mening profilim</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>Shaxsiy ma'lumotlar va sozlamalar</p>
        </div>
      </div>

      {/* User Card */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: 20, 
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          color: '#fff', fontSize: 24, fontWeight: 800, flexShrink: 0
        }}>
          {name ? name.substring(0, 2).toUpperCase() : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{name || 'Foydalanuvchi'}</span>
            {user?.isPremium && (
              <span style={{ 
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)', 
                color: '#fff', fontSize: 10, fontWeight: 800, 
                padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3
              }}>
                <Sparkles size={10} /> PREMIUM
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Phone size={12} /> {phone ? `+${phone}` : 'Raqam kiritilmagan'}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Shaxsiy ma'lumotlar sektsiyasi */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} style={{ color: 'var(--blue)' }} /> Shaxsiy ma'lumotlar
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ism va Familiya */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Ism va familiya</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ism va familiyangizni kiriting"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, 
                  border: '1.5px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            {/* Jins */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Jins</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {GENDERS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGender(g.id)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      border: gender === g.id ? '2px solid var(--blue)' : '1.5px solid var(--border)',
                      background: gender === g.id ? 'var(--blue-bg)' : 'var(--bg2)',
                      color: gender === g.id ? 'var(--blue)' : 'var(--text2)',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s'
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tug'ilgan sana */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Tug'ilgan sana</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, 
                    border: '1.5px solid var(--border)', background: 'var(--bg3)',
                    color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tayyorgarlik maqsadlari sektsiyasi */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={18} style={{ color: 'var(--accent)' }} /> Tayyorgarlik sozlamalari
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fan */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Tayyorgarlik fani</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, 
                  border: '1.5px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                  outline: 'none', appearance: 'none', cursor: 'pointer'
                }}
              >
                <option value="">Tanlang...</option>
                {SUBJECTS.map(s => (
                  <option key={s.id} value={s.id}>{s.badge} {s.title}</option>
                ))}
              </select>
            </div>

            {/* Maqsad */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Kanal / Maqsad toifasi</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, 
                  border: '1.5px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                  outline: 'none', appearance: 'none', cursor: 'pointer'
                }}
              >
                <option value="">Tanlang...</option>
                {GOALS.map(g => (
                  <option key={g.id} value={g.id}>{g.badge} {g.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tizim sozlamalari */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--blue)' }} /> Tizim sozlamalari
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tungi rejim */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'block' }}>Tungi rejim</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Ilova interfeysi ko'rinishini o'zgartirish</span>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                onClick={toggleTheme}
                style={{ padding: '8px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'dark' ? 'Yoqilgan' : 'O\'chirilgan'}
              </button>
            </div>

            {/* Imtihon sanasi */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Imtihon sanasi (Kalkulyator uchun)</label>
              <input 
                type="date" 
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, 
                  border: '1.5px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>
                Ushbu sana asosida platformaning yuqori burchagida imtihongacha qolgan kunlar ko'rsatiladi.
              </span>
            </div>
          </div>
        </div>

        {/* Tizim sozlamalari va logout */}
        <div className="glass-panel" style={{ padding: '12px 24px' }}>
          <div 
            onClick={() => navigate('/referral')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sparkles size={18} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Do'stlarni taklif qilish (Referral)</span>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
          </div>

          <div 
            onClick={handleLogout}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px 0', cursor: 'pointer' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LogOut size={18} style={{ color: 'var(--red)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Tizimdan chiqish</span>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--red)', opacity: 0.5 }} />
          </div>
        </div>

        {/* Saqlash tugmasi */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: 'var(--blue)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 16,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
            opacity: saving ? 0.7 : 1
          }}
        >
          <Save size={18} />
          {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
        </button>

      </form>
    </motion.div>
  );
};

export default ProfilePage;
