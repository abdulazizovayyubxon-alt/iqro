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
    id: 'art_explorer',
    icon: '🎨',
    name: "San'at Tadqiqotchisi",
    desc: "San'at bo'limida 20 ta savol yechdi",
    condition: (stats) => (stats?.art?.totalAnswered || 0) >= 20,
    color: '#A855F7',
    xp: 50
  },
  {
    id: 'no_mistakes',
    icon: '💎',
    name: "Mukammal",
    desc: "Testda 0 xato bilan yakunladi (kamida 10 savol)",
    condition: (_stats, _topicStats) => {
      // Bu badge faqat test natijasida beriladi, shuning uchun alohida tekshiriladi
      return false;
    },
    color: '#06B6D4',
    xp: 200
  },
];

// Foydalanuvchi qaysi badge'larni qozonganligi
export const getEarnedBadges = (stats) => {
  return BADGES.filter(b => {
    try { return b.condition(stats); } catch { return false; }
  });
};

// Jami XP hisoblash
export const getTotalXP = (stats) => {
  return getEarnedBadges(stats).reduce((sum, b) => sum + b.xp, 0);
};

// XP ga qarab daraja
export const getLevel = (xp) => {
  if (xp >= 1000) return { level: 5, name: 'Grandmaster', color: '#F59E0B' };
  if (xp >= 500)  return { level: 4, name: 'Expert',       color: '#8B5CF6' };
  if (xp >= 200)  return { level: 3, name: 'Advanced',     color: '#3B82F6' };
  if (xp >= 75)   return { level: 2, name: 'Beginner',     color: '#10B981' };
  return               { level: 1, name: 'Yangi',         color: '#6B7280' };
};
