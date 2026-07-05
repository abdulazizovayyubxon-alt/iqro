// Badge (Yutuq) tizimi — shartlar va ta'riflari

const sumTotalAnswered = (stats) => {
  if (!stats) return 0;
  return Object.keys(stats).reduce((sum, key) => {
    const cat = stats[key];
    return sum + (cat?.totalAnswered || 0);
  }, 0);
};

const getMaxStreak = (stats) => {
  if (!stats) return 0;
  return Object.keys(stats).reduce((max, key) => {
    const cat = stats[key];
    return Math.max(max, cat?.maxStreak || 0);
  }, 0);
};

const hasAccuracy = (stats, minQuestions, minPct) => {
  if (!stats) return false;
  return Object.keys(stats).some(key => {
    const cat = stats[key];
    if (!cat || !cat.totalAnswered || cat.totalAnswered < minQuestions) return false;
    const pct = Math.round((cat.totalCorrect / cat.totalAnswered) * 100);
    return pct >= minPct;
  });
};

export const BADGES = [
  {
    id: 'first_step',
    icon: '🌱',
    name: 'Birinchi Qadam',
    desc: 'Birinchi savolga javob berdi',
    condition: (stats) => sumTotalAnswered(stats) >= 1,
    color: '#10B981',
    xp: 10
  },
  {
    id: 'ten_answers',
    icon: '🔟',
    name: "O'ntalik",
    desc: "Jami 10 ta savolga javob berdi",
    condition: (stats) => sumTotalAnswered(stats) >= 10,
    color: '#3B82F6',
    xp: 25
  },
  {
    id: 'fifty_answers',
    icon: '🎯',
    name: "Ellik Nishon",
    desc: "Jami 50 ta savolga javob berdi",
    condition: (stats) => sumTotalAnswered(stats) >= 50,
    color: '#8B5CF6',
    xp: 50
  },
  {
    id: 'hundred_answers',
    icon: '💯',
    name: "Yuztalik",
    desc: "Jami 100 ta savolga javob berdi",
    condition: (stats) => sumTotalAnswered(stats) >= 100,
    color: '#F59E0B',
    xp: 100
  },
  {
    id: 'five_hundred',
    icon: '🚀',
    name: "Kosmik",
    desc: "Jami 500 ta savolga javob berdi",
    condition: (stats) => sumTotalAnswered(stats) >= 500,
    color: '#EF4444',
    xp: 300
  },
  {
    id: 'one_thousand',
    icon: '👑',
    name: "Mingboshi",
    desc: "Jami 1000 ta savolga javob berdi",
    condition: (stats) => sumTotalAnswered(stats) >= 1000,
    color: '#D97706',
    xp: 500
  },
  {
    id: 'streak_5',
    icon: '🔥',
    name: "Alanga",
    desc: "5 ta savolni ketma-ket to'g'ri yechdi",
    condition: (stats) => getMaxStreak(stats) >= 5,
    color: '#F97316',
    xp: 30
  },
  {
    id: 'streak_10',
    icon: '⚡',
    name: "Chaqmoq",
    desc: "10 ta savolni ketma-ket to'g'ri yechdi",
    condition: (stats) => getMaxStreak(stats) >= 10,
    color: '#FBBF24',
    xp: 75
  },
  {
    id: 'streak_25',
    icon: '🌟',
    name: "Yulduz",
    desc: "25 ta savolni ketma-ket to'g'ri yechdi",
    condition: (stats) => getMaxStreak(stats) >= 25,
    color: '#F59E0B',
    xp: 200
  },
  {
    id: 'streak_50',
    icon: '🛡️',
    name: "Tafakkur",
    desc: "50 ta savolni ketma-ket to'g'ri yechdi",
    condition: (stats) => getMaxStreak(stats) >= 50,
    color: '#8B5CF6',
    xp: 400
  },
  {
    id: 'accuracy_80',
    icon: '🎓',
    name: "Talaba",
    desc: "80% va undan yuqori aniqlik bilan javob berdi",
    condition: (stats) => hasAccuracy(stats, 20, 80),
    color: '#6366F1',
    xp: 150
  },
  {
    id: 'accuracy_90',
    icon: '🏆',
    name: "Ustoz",
    desc: "90% va undan yuqori aniqlik bilan javob berdi",
    condition: (stats) => hasAccuracy(stats, 30, 90),
    color: '#F59E0B',
    xp: 300
  },
  {
    id: 'accuracy_95',
    icon: '🏛️',
    name: "Akademik",
    desc: "95% va undan yuqori aniqlik bilan javob berdi",
    condition: (stats) => hasAccuracy(stats, 50, 95),
    color: '#10B981',
    xp: 500
  },
  {
    id: 'daily_3day',
    icon: '📅',
    name: "Metodik",
    desc: "3 kun ketma-ket kunlik maqsadni bajardi",
    condition: (_stats, state) => (state?.dailyStreak || 0) >= 3,
    color: '#3B82F6',
    xp: 100
  },
  {
    id: 'daily_7day',
    icon: '⏳',
    name: "Chidamli",
    desc: "7 kun ketma-ket kunlik maqsadni bajardi",
    condition: (_stats, state) => (state?.dailyStreak || 0) >= 7,
    color: '#10B981',
    xp: 250
  },
  {
    id: 'daily_15day',
    icon: '🏔️',
    name: "Lider",
    desc: "15 kun ketma-ket kunlik maqsadni bajardi",
    condition: (_stats, state) => (state?.dailyStreak || 0) >= 15,
    color: '#F59E0B',
    xp: 500
  },
  {
    id: 'night_owl',
    icon: '🦉',
    name: "Tungi Boyqush",
    desc: "Kechasi soat 00:00 dan 05:00 gacha 10 ta savol yechdi",
    condition: (_stats, state) => (state?.nightQuestions || 0) >= 10,
    color: '#6366F1',
    xp: 100
  },
  {
    id: 'early_bird',
    icon: '🌅',
    name: "Erta Turar",
    desc: "Tonggi soat 05:00 dan 08:00 gacha 10 ta savol yechdi",
    condition: (_stats, state) => (state?.earlyQuestions || 0) >= 10,
    color: '#FBBF24',
    xp: 100
  },
  {
    id: 'speed_demon',
    icon: '🏹',
    name: "Chaqqon",
    desc: "Savollarga o'rtacha javob berish tezligi 15 soniyadan kam",
    condition: (_stats, state) => {
      const totalQ = state?.timeStats?.totalQuestions || 0;
      const totalT = state?.timeStats?.totalTime || 0;
      return totalQ >= 30 && (totalT / totalQ) < 15;
    },
    color: '#EF4444',
    xp: 150
  },
  {
    id: 'subject_chqbt_100',
    icon: '🎖️',
    name: "CHQBT Bilimdoni",
    desc: "CHQBT bo'limida 100 ta savol yechdi",
    condition: (stats) => (stats?.chqbt?.totalAnswered || 0) >= 100,
    color: '#10B981',
    xp: 120
  },
  {
    id: 'subject_tarix_100',
    icon: '📜',
    name: "Tarix Bilimdoni",
    desc: "Tarix bo'limida 100 ta savol yechdi",
    condition: (stats) => (stats?.tarix?.totalAnswered || 0) >= 100,
    color: '#F59E0B',
    xp: 120
  },
  {
    id: 'subject_til_100',
    icon: '✒️',
    name: "Ona Tili Bilimdoni",
    desc: "Ona tili bo'limida 100 ta savol yechdi",
    condition: (stats) => (stats?.til?.totalAnswered || 0) >= 100,
    color: '#EC4899',
    xp: 120
  },
  {
    id: 'subject_boshlangich_100',
    icon: '📊',
    name: "Boshlang'ich Bilimdoni",
    desc: "Boshlang'ich ta'lim bo'limida 100 ta savol yechdi",
    condition: (stats) => (stats?.boshlangich?.totalAnswered || 0) >= 100,
    color: '#3B82F6',
    xp: 120
  },
  {
    id: 'subject_info_100',
    icon: '💻',
    name: "Informatika Bilimdoni",
    desc: "Informatika bo'limida 100 ta savol yechdi",
    condition: (stats) => (stats?.info?.totalAnswered || 0) >= 100,
    color: '#06B6D4',
    xp: 120
  },
  {
    id: 'perfect_exam',
    icon: '🌟',
    name: "Yuz Foizlik",
    desc: "20+ talik testda 100% to'g'ri natija ko'rsatdi",
    condition: (_stats, state) => (state?.perfectExamsCount || 0) >= 1,
    color: '#10B981',
    xp: 250
  },
  {
    id: 'polymath',
    icon: '🧩',
    name: "Ko'p qirrali",
    desc: "Kamida 2 ta fandan 50 tadan ortiq savol yechdi",
    condition: (stats) => {
      if (!stats) return false;
      const count = Object.keys(stats).filter(k => (stats[k]?.totalAnswered || 0) >= 50).length;
      return count >= 2;
    },
    color: '#14B8A6',
    xp: 250
  },
  {
    id: 'no_mistakes',
    icon: '💎',
    name: "Mukammal",
    desc: "Testda 0 xato bilan yakunladi (kamida 10 savol)",
    condition: (stats) => getMaxStreak(stats) >= 10,
    color: '#06B6D4',
    xp: 200
  }
];

// Foydalanuvchi qaysi badge'larni qozonganligi
export const getEarnedBadges = (stats, state) => {
  return BADGES.filter(b => {
    try { return b.condition(stats, state); } catch { return false; }
  });
};

// Jami XP hisoblash
export const getTotalXP = (stats, state) => {
  return getEarnedBadges(stats, state).reduce((sum, b) => sum + b.xp, 0);
};

// XP ga qarab daraja
export const getLevel = (xp) => {
  if (xp >= 1000) return { level: 5, name: 'Grandmaster', color: '#F59E0B' };
  if (xp >= 500)  return { level: 4, name: 'Expert',       color: '#8B5CF6' };
  if (xp >= 200)  return { level: 3, name: 'Advanced',     color: '#3B82F6' };
  if (xp >= 75)   return { level: 2, name: 'Beginner',     color: '#10B981' };
  return               { level: 1, name: 'Yangi',         color: '#6B7280' };
};
