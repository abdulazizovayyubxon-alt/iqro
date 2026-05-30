import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={s.title}>Maxfiylik Siyosati</h1>
        <div style={{ width: 24 }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={s.content}
      >
        <div style={s.iconWrap}>
          <Shield size={48} color="#29B6F6" />
        </div>

        <h2 style={s.heading}>1. Umumiy qoidalar</h2>
        <p style={s.text}>
          Ushbu Maxfiylik siyosati IQRO platformasi (keyingi o'rinlarda "Platforma") tomonidan foydalanuvchilarning shaxsiy ma'lumotlarini qanday yig'ish, saqlash, ishlatish va himoya qilish tartibini belgilaydi. Platformadan foydalanish orqali Siz ushbu siyosat shartlariga rozi bo'lasiz.
        </p>

        <h2 style={s.heading}>2. Yig'iladigan ma'lumotlar</h2>
        <p style={s.text}>
          Biz quyidagi ma'lumotlarni yig'ishimiz mumkin:
        </p>
        <ul style={s.list}>
          <li>Ism, familiya va profil rasmi;</li>
          <li>Telefon raqami va elektron pochta manzili;</li>
          <li>Telegram ID (agar bot orqali kirgan bo'lsangiz);</li>
          <li>Platformadagi faollik, test natijalari va statistikangiz.</li>
        </ul>

        <h2 style={s.heading}>3. Ma'lumotlardan qanday foydalanamiz?</h2>
        <p style={s.text}>
          Sizning ma'lumotlaringiz faqat quyidagi maqsadlarda ishlatiladi:
        </p>
        <ul style={s.list}>
          <li>Shaxsiy kabinetingizni yaratish va xavfsizligini ta'minlash;</li>
          <li>Sizga mos testlar va xizmatlarni taqdim etish;</li>
          <li>Reyting (Leaderboard) tizimida ishtirokingizni ko'rsatish (faqat ism va rasm chiqadi, telefon raqamingiz to'liq sir saqlanadi);</li>
          <li>Platforma yangiliklari, to'lov xabarlari haqida sizni ogohlantirish.</li>
        </ul>

        <h2 style={s.heading}>4. Uchinchi shaxslarga uzatish</h2>
        <p style={s.text}>
          Foydalanuvchilarning shaxsiy ma'lumotlari uchinchi shaxslarga sotilmaydi yoki ijaraga berilmaydi. Faqat qonun hujjatlarida ko'zda tutilgan majburiy holatlardagina huquqni muhofaza qiluvchi organlarga taqdim etilishi mumkin.
        </p>

        <h2 style={s.heading}>5. Ma'lumotlarni o'chirish</h2>
        <p style={s.text}>
          Siz istalgan vaqtda o'z hisobingizni va barcha shaxsiy ma'lumotlaringizni o'chirish huquqiga egasiz. 
          Buning uchun Platformaning <b>Profil</b> sahifasidagi "Hisobni o'chirish" tugmasidan foydalanishingiz yoki tizimga kirmasdan turib <Link to="/delete-account" style={{ color: '#29B6F6', textDecoration: 'underline' }}>bu yerda</Link> hisobni o'chirish so'rovini yuborishingiz mumkin.
        </p>

        <h2 style={s.heading}>6. Xavfsizlik</h2>
        <p style={s.text}>
          Biz sizning ma'lumotlaringizni ruxsatsiz kirish, o'zgartirish, yo'q qilish yoki oshkor qilishdan himoya qilish uchun zamonaviy texnik va tashkiliy xavfsizlik choralarini ko'ramiz (jumladan, Firebase tomonidan taqdim etilgan eng yuqori himoya tizimlari qo'llaniladi).
        </p>

        <h2 style={s.heading}>7. O'zgarishlar kiritish</h2>
        <p style={s.text}>
          Platforma rahbariyati ushbu Maxfiylik siyosatiga istalgan vaqtda o'zgartirishlar kiritish huquqini saqlab qoladi. Har qanday o'zgarishlar ushbu sahifada e'lon qilinadi.
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
