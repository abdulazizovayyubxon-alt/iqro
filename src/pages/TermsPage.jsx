import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>Foydalanish Shartlari</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.content}
      >
        <div style={s.iconWrap}>
          <FileText size={48} color="#29B6F6" />
        </div>

        <h2 style={s.heading}>1. Umumiy qoidalar</h2>
        <p style={s.text}>
          Ushbu Foydalanish shartlari (keyingi o'rinlarda "Shartlar") foydalanuvchilarning IQRO platformasidan (keyingi o'rinlarda "Platforma") foydalanish tartibini belgilaydi. Platformadan ro'yxatdan o'tish orqali Siz ushbu shartlarga to'liq rozi bo'lasiz.
        </p>

        <h2 style={s.heading}>2. Foydalanuvchining majburiyatlari</h2>
        <p style={s.text}>
          Foydalanuvchi quyidagilarga majburdir:
        </p>
        <ul style={s.list}>
          <li>Ro'yxatdan o'tishda aniq va to'g'ri ma'lumotlarni taqdim etish;</li>
          <li>Platformadan g'arazli maqsadlarda, xakerlik hujumlari yoki tizimga zarar yetkazadigan harakatlar uchun foydalanmaslik;</li>
          <li>O'z hisobi xavfsizligini ta'minlash va parolni uchinchi shaxslarga bermaslik;</li>
          <li>Boshqa foydalanuvchilarga nisbatan hurmat bilan munosabatda bo'lish.</li>
        </ul>

        <h2 style={s.heading}>3. Xizmatlar va To'lovlar</h2>
        <p style={s.text}>
          Platforma bepul (Trial) va pullik (Premium) xizmatlarni taklif etadi.
        </p>
        <ul style={s.list}>
          <li><b>Premium xizmatlar:</b> Qo'shimcha funksiyalar va testlar bazasiga to'liq kirish imkonini beradi.</li>
          <li><b>To'lovlar:</b> To'lovlar xavfsiz to'lov tizimlari orqali amalga oshiriladi. To'langan mablag'lar qaytarib berilmaydi (qonunchilikda ko'rsatilgan hollar bundan mustasno).</li>
        </ul>

        <h2 style={s.heading}>4. Mualliflik huquqi</h2>
        <p style={s.text}>
          Platformadagi barcha kontent (testlar, maqolalar, dizayn, logotip) IQRO platformasining intellektual mulki hisoblanadi. Kontentni ko'chirish, tarqatish yoki tijorat maqsadida foydalanish qat'iyan man etiladi.
        </p>

        <h2 style={s.heading}>5. Javobgarlikni cheklash</h2>
        <p style={s.text}>
          Platforma faqatgina tayyorgarlik ko'rish uchun yordamchi vosita hisoblanadi va real imtihonlardan 100% muvaffaqiyatli o'tishga kafolat bermaydi. Tizimda yuz berishi mumkin bo'lgan texnik uzilishlar uchun Platforma ma'muriyati harakat qilsa-da, uzluksiz ishlashiga mutlaq kafolat bermaydi.
        </p>

        <h2 style={s.heading}>6. Shartlarni o'zgartirish</h2>
        <p style={s.text}>
          Platforma ushbu Foydalanish shartlariga istalgan vaqtda o'zgartirishlar kiritishi mumkin. O'zgarishlar e'lon qilingan vaqtdan boshlab kuchga kiradi.
        </p>
      </motion.div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text)',
    paddingBottom: '80px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px', background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 10
  },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--text)',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center'
  },
  title: {
    fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center'
  },
  content: {
    padding: '24px 20px',
    maxWidth: 600, margin: '0 auto',
    lineHeight: 1.6,
  },
  iconWrap: {
    display: 'flex', justifyContent: 'center', marginBottom: 24,
    padding: 20, background: 'var(--bg2)', borderRadius: '50%', width: 88, height: 88, margin: '0 auto 24px'
  },
  heading: {
    fontSize: 18, fontWeight: 700, marginTop: 24, marginBottom: 12, color: 'var(--text)'
  },
  text: {
    fontSize: 15, color: 'var(--text2)', marginBottom: 16
  },
  list: {
    fontSize: 15, color: 'var(--text2)', paddingLeft: 20, marginBottom: 16
  }
};
