/**
 * ════════════════════════════════════════════════════════════
 *  passwordPolicy.js — parol siyosati (sof mantiq)
 * ════════════════════════════════════════════════════════════
 *
 *  AuthContext.jsx ichidan AJRATILDI (audit 2026-08-05, 23-band):
 *  u `../firebase`ni import qilgani uchun test muhitida Firebase'ni ishga
 *  tushirishga urinardi va parol siyosatini unit test bilan qoplash imkonsiz
 *  edi. Bu modul HECH QANDAY tashqi bog'liqlikka ega emas.
 *
 *  Testlar: src/__tests__/passwordPolicy.test.js
 * ════════════════════════════════════════════════════════════
 */

// Taqiqlangan oddiy parollar ro'yxati (blacklist)
export const BLACKLISTED_PASSWORDS = [
  'parol123', 'password', 'admin', 'teacher', 'student',
  'qwerty', 'abc123', '123456', '12345678', 'iloveyou',
  'password1', 'letmein', 'welcome', 'monkey', 'dragon',
  '111111', '000000', 'football', 'master', 'login',
  'iqro123', 'iqro2024', 'iqro2025', 'iqro2026', 'test123',
  'parol', 'maxfiy', 'salom123', 'uzbek123'
];

// Ketma-ket belgilarni aniqlash (12345, abcde, qwerty)
const SEQUENTIAL_PATTERNS = [
  '0123456789', '9876543210',
  'abcdefghijklmnopqrstuvwxyz', 'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'
];

export const hasSequentialChars = (password, minLen = 4) => {
  const lower = password.toLowerCase();
  for (const seq of SEQUENTIAL_PATTERNS) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      if (lower.includes(seq.substring(i, i + minLen))) return true;
    }
  }
  return false;
};

// Takrorlanuvchi belgilarni aniqlash (aaaa, 1111)
export const hasRepeatedChars = (password, minRepeat = 4) => {
  for (let i = 0; i <= password.length - minRepeat; i++) {
    const char = password[i];
    let count = 1;
    for (let j = i + 1; j < password.length && password[j] === char; j++) {
      count++;
    }
    if (count >= minRepeat) return true;
  }
  return false;
};

// Parol kuchi ballini hisoblash — haqiqiy tekshiruvlar asosida
export const calculatePasswordStrength = (password, _username = '') => {
  if (!password) return { score: 0, level: 'none', label: '', checks: {} };

  const checks = {
    length: password.length >= 6,
    longer: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    digit: /\d/.test(password),
  };

  let score = 0;
  if (checks.length) score += 35;
  if (checks.longer) score += 20;
  if (checks.letter) score += 20;
  if (checks.digit) score += 25;

  // Zaif/oson topiladigan parollar ballini pasaytiramiz
  const lower = password.toLowerCase();
  const isBlacklisted = BLACKLISTED_PASSWORDS.includes(lower);
  if (isBlacklisted || hasSequentialChars(password) || hasRepeatedChars(password)) {
    score = Math.min(score, 25);
  }

  let level = 'weak';
  let label = 'Zaif parol';
  if (score >= 80) { level = 'strong'; label = 'Kuchli parol'; }
  else if (score >= 50) { level = 'medium'; label = "O'rtacha parol"; }
  else if (password.length < 6) { label = 'Kamida 6 belgi'; }

  return { score: Math.min(100, score), level, label, checks };
};

// Ro'yxatdan o'tishda parolni tekshirish — oson topiladigan parollarni rad etadi
export const validatePassword = (password) => {
  if (!password) return "Parolni kiritish shart.";
  if (password.length < 6) return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  if (BLACKLISTED_PASSWORDS.includes(password.toLowerCase())) {
    return "Bu parol juda oddiy va xavfsiz emas. Boshqa parol tanlang.";
  }
  if (hasRepeatedChars(password)) {
    return "Parolda bir xil belgilar ketma-ket takrorlanmasin (masalan: 1111).";
  }
  if (hasSequentialChars(password)) {
    return "Parol oddiy ketma-ketlikdan iborat bo'lmasin (masalan: 12345, qwerty).";
  }
  return null;
};
