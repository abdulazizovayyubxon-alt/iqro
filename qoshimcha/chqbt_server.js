/**
 * 🚀 CHQBT PLATFORM - PRODUCTION SERVER
 * 
 * SETUP:
 * 1. npm install express cors dotenv
 * 2. Faylni server.js deb saqlang
 * 3. node server.js deb ishga tushiring
 * 4. http://localhost:5000 dan test qiling
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(cors());

// ============= QUESTIONS DATABASE (JSON'dan) =============
const questionsDB = require('./chqbt_questions_database.json');

// ============= FOYDALANUVCHILAR DATABASE (Memory'da) =============
let users = [];
let testResults = [];
let userProfiles = [];

// ============= API ENDPOINTS =============

/**
 * 1️⃣ FOYDALANUVCHI REGISTER
 */
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone, examDate, targetScore } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }
    
    const userId = `user_${Date.now()}_${Math.random()}`;
    
    const newUser = {
      id: userId,
      name,
      email,
      password, // Haqiqiy loyihada bcrypt ishlating!
      phone,
      examDate,
      targetScore: targetScore || 70,
      registeredAt: new Date(),
      currentStreak: 0,
      totalTestsCompleted: 0,
      averageScore: 0,
      weakAreas: []
    };
    
    users.push(newUser);
    
    // Learner profile yaratish
    const profile = {
      userId,
      learningStyle: 'visual',
      studyHoursPerDay: 4,
      preferredTestDifficulty: 'medium',
      strongAreas: [],
      weakAreas: [],
      recommendedTopics: []
    };
    
    userProfiles.push(profile);
    
    res.json({
      success: true,
      message: "✅ Ro'yxatdan o'tdingiz!",
      userId,
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2️⃣ LOGIN
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: '❌ Email yoki parol noto\'g\'ri' });
    }
    
    res.json({
      success: true,
      message: '✅ Login muvaffaqiyatli',
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        examDate: user.examDate,
        targetScore: user.targetScore,
        currentStreak: user.currentStreak,
        averageScore: user.averageScore
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3️⃣ ADAPTIVE SAVOLLAR OLISH
 */
app.get('/api/questions/:section', (req, res) => {
  try {
    const { section } = req.params;
    const { userId, difficulty = 'medium', count = 10 } = req.query;
    
    // Database'dan savollar olish
    const sectionData = questionsDB.sections[section];
    
    if (!sectionData) {
      return res.status(404).json({ error: `❌ ${section} bo'limi topilmadi` });
    }
    
    // User profili olish
    const userProfile = userProfiles.find(p => p.userId === userId);
    
    // Zaif joylarga qarab difficulty oshirish
    let adjustedDifficulty = difficulty;
    if (userProfile && userProfile.weakAreas.includes(section)) {
      adjustedDifficulty = 'hard'; // Zaif joyda qiyin savol
    }
    
    // Savollarni difficulty bo'yicha filtrlash
    let filteredQuestions = sectionData.questions.filter(q => q.difficulty === adjustedDifficulty);
    
    // Agar yetarli savol bo'lmasa, boshqa difficulty'dan olish
    if (filteredQuestions.length < count) {
      const otherDifficulty = adjustedDifficulty === 'hard' ? 'medium' : 'easy';
      const additionalQuestions = sectionData.questions.filter(q => q.difficulty === otherDifficulty);
      filteredQuestions = [...filteredQuestions, ...additionalQuestions];
    }
    
    // Aralashtirib bo'lish
    const shuffled = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, count);
    
    // Javoblarni bermang (faqat savollar)
    const questionsWithoutAnswers = shuffled.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      examTip: q.examTip,
      mnemonic: q.mnemonic
    }));
    
    res.json({
      success: true,
      section,
      difficulty: adjustedDifficulty,
      questions: questionsWithoutAnswers,
      totalQuestions: questionsWithoutAnswers.length,
      estimatedTime: `${Math.round(questionsWithoutAnswers.length * 2.4)} minut`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4️⃣ TEST NATIJALARINI SAQLASH VA ANALIZ QILISH
 */
app.post('/api/test-result', (req, res) => {
  try {
    const { userId, section, answers, totalQuestions, timeSpent } = req.body;
    
    const sectionData = questionsDB.sections[section];
    
    // Javoblarni tekshirish
    let correctCount = 0;
    let wrongQuestions = [];
    
    for (const [qId, selectedIdx] of Object.entries(answers)) {
      const question = sectionData.questions.find(q => q.id === qId);
      if (question) {
        if (question.correctAnswer === parseInt(selectedIdx)) {
          correctCount++;
        } else {
          wrongQuestions.push({
            questionId: qId,
            selected: selectedIdx,
            correct: question.correctAnswer,
            question: question.question,
            explanation: question.explanation,
            category: question.category
          });
        }
      }
    }
    
    // Ball hisoblash (2 ball har javob)
    const score = correctCount * 2;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // Natija saqla
    const testResult = {
      userId,
      section,
      totalQuestions,
      correctAnswers: correctCount,
      score,
      percentage,
      timeSpent,
      difficulty: percentage > 80 ? 'easy' : percentage > 60 ? 'medium' : 'hard',
      wrongQuestions,
      completedAt: new Date()
    };
    
    testResults.push(testResult);
    
    // User statistikasini yangilash
    const user = users.find(u => u.id === userId);
    if (user) {
      user.totalTestsCompleted += 1;
      user.averageScore = 
        (user.averageScore * (user.totalTestsCompleted - 1) + percentage) / 
        user.totalTestsCompleted;
      user.lastActive = new Date();
      
      // Streakni yangilash
      if (percentage >= 70) {
        user.currentStreak += 1;
      } else {
        user.currentStreak = 0;
      }
      
      // Zaif joylarni aniqlash
      if (wrongQuestions.length > 0) {
        const categoryErrors = {};
        wrongQuestions.forEach(w => {
          const cat = w.category;
          categoryErrors[cat] = (categoryErrors[cat] || 0) + 1;
        });
        
        const weakCategories = Object.keys(categoryErrors).sort((a, b) => categoryErrors[b] - categoryErrors[a]);
        user.weakAreas = [...new Set([...user.weakAreas, ...weakCategories])];
      }
    }
    
    // AI Tavsiyalar
    const recommendations = generateRecommendations(user, testResult, wrongQuestions);
    
    res.json({
      success: true,
      testResult: {
        correctAnswers: correctCount,
        totalQuestions,
        percentage,
        score,
        timeSpent: `${Math.floor(timeSpent / 60)}:${String(timeSpent % 60).padStart(2, '0')}`,
        passed: percentage >= 70,
        feedback: getFeedback(percentage)
      },
      wrongQuestions: wrongQuestions.slice(0, 5),
      recommendations,
      nextAction: getNextAction(percentage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 5️⃣ DASHBOARD
 */
app.get('/api/dashboard/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }
    
    const userTests = testResults.filter(r => r.userId === userId).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // Bo'lim bo'yicha statistika
    const sectionStats = {};
    
    Object.keys(questionsDB.sections).forEach(section => {
      const sectionResults = userTests.filter(r => r.section === section);
      if (sectionResults.length > 0) {
        const avgPercentage = sectionResults.reduce((sum, r) => sum + r.percentage, 0) / sectionResults.length;
        sectionStats[section] = {
          testCount: sectionResults.length,
          averagePercentage: Math.round(avgPercentage),
          lastScore: sectionResults[0].percentage,
          trend: avgPercentage >= 70 ? '📈' : avgPercentage >= 50 ? '➡️' : '📉'
        };
      } else {
        sectionStats[section] = {
          testCount: 0,
          averagePercentage: 0,
          lastScore: 0,
          trend: '⏳'
        };
      }
    });
    
    const daysLeft = Math.ceil((new Date(user.examDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      user: {
        name: user.name,
        examDate: user.examDate,
        targetScore: user.targetScore,
        currentScore: Math.round(user.averageScore),
        currentStreak: user.currentStreak,
        totalTestsCompleted: user.totalTestsCompleted,
        daysLeft: Math.max(0, daysLeft),
        needsImprovement: Math.max(0, user.targetScore - user.averageScore)
      },
      sectionStats,
      weakAreas: user.weakAreas.slice(0, 3),
      recentTests: userTests.slice(0, 5).map(r => ({
        section: r.section,
        score: r.percentage,
        date: r.completedAt,
        passed: r.percentage >= 70
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 6️⃣ ADAPTIVE TEST GENERATOR
 */
app.post('/api/generate-adaptive-test', (req, res) => {
  try {
    const { userId, section } = req.body;
    const user = users.find(u => u.id === userId);
    const sectionData = questionsDB.sections[section];
    
    if (!sectionData) {
      return res.status(404).json({ error: `${section} topilmadi` });
    }
    
    // Zaif joylar qiyin, kuchli joylar oson
    let difficulties = { easy: 2, medium: 3, hard: 5 };
    
    if (user && user.weakAreas.includes(section)) {
      difficulties = { easy: 2, medium: 3, hard: 5 }; // 50% qiyin
    }
    
    // Har difficulty darajasidan savol olish
    const questions = [];
    
    Object.entries(difficulties).forEach(([diff, count]) => {
      const sectionQuestions = sectionData.questions.filter(q => q.difficulty === diff).slice(0, count);
      questions.push(...sectionQuestions);
    });
    
    // Aralashtirib bo'lish
    const shuffled = questions.sort(() => Math.random() - 0.5);
    
    const questionsWithoutAnswers = shuffled.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      examTip: q.examTip
    }));
    
    res.json({
      success: true,
      testId: `test_${Date.now()}`,
      section,
      questions: questionsWithoutAnswers,
      totalQuestions: questionsWithoutAnswers.length,
      adaptiveLevel: user && user.weakAreas.includes(section) ? '🔴 QIYIN' : '🟡 O\'RTA',
      estimatedTime: `${Math.round(questionsWithoutAnswers.length * 2.4)} minut`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 7️⃣ 11-KUNLIK STUDY PLAN
 */
app.get('/api/study-plan/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }
    
    const examDate = new Date(user.examDate);
    const now = new Date();
    const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
    
    const studyPlan = [];
    const sections = ['otish', 'taktika', 'fv', 'tibbiyot', 'pedagogika', 'nizomlar'];
    
    for (let day = 1; day <= Math.min(Math.max(daysLeft, 1), 11); day++) {
      const sectionIndex = (day - 1) % sections.length;
      const planDate = new Date(now.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
      
      studyPlan.push({
        day,
        date: planDate.toLocaleDateString('uz-UZ'),
        section: sections[sectionIndex],
        dailyGoal: 50,
        type: day <= 3 ? '📖 Learning' : day <= 10 ? '✍️ Practice' : '🔄 Revision',
        status: day <= 1 ? '🟢 Bugun' : day <= 3 ? '🟡 Tezda' : '⚪ Keyincha'
      });
    }
    
    res.json({
      success: true,
      examDate: user.examDate,
      daysLeft: Math.max(0, daysLeft),
      studyPlan,
      totalQuestionsNeeded: Math.max(daysLeft, 1) * 50,
      recommendedDailyHours: user.averageScore < 60 ? 6 : 4,
      examStrategy: {
        currentScore: Math.round(user.averageScore),
        targetScore: user.targetScore,
        needsImprovement: Math.max(0, user.targetScore - user.averageScore),
        recommendation: user.averageScore >= 80 ? '✅ Maintenance mode' : 
                       user.averageScore >= 70 ? '📚 Normal study' : 
                       '🔥 INTENSIVE MODE'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= HELPER FUNCTIONS =============

function getFeedback(percentage) {
  if (percentage >= 90) return "🏆 AJOYIB NATIJA!";
  if (percentage >= 80) return "✅ YAXSHI! Davom eting";
  if (percentage >= 70) return "📚 YETARLI! Takrorlang";
  if (percentage >= 60) return "⚠️ O'RTA natija";
  return "🔴 Ko'proq o'qish kerak";
}

function getNextAction(percentage) {
  if (percentage >= 70) return { type: 'new_section', message: '▶️ Keyingi bo\'limga o\'tish' };
  if (percentage >= 50) return { type: 'focused_repeat', message: '🔄 Noto\'g\'ri savollani takrorlash' };
  return { type: 'review_basics', message: '📖 Asoslarni qayta o\'qish' };
}

function generateRecommendations(user, testResult, wrongQuestions) {
  const recommendations = [];
  
  // 1. Zaif joylar bo'yicha qiyin testlar
  if (user && user.weakAreas.length > 0) {
    recommendations.push({
      type: 'focused_practice',
      title: `⚠️ Zaif joylarni chuqurlashtirish: ${user.weakAreas[0]}`,
      description: `Siz bu bo'limda ko'p xatolik qilasiz. Imtihonda muhim!`,
      priority: 'high'
    });
  }
  
  // 2. Ketma-ketlik rag'baltiri
  if (user && user.currentStreak >= 3) {
    recommendations.push({
      type: 'motivation',
      title: `🔥 ${user.currentStreak} kunlik ketma-ketlik!`,
      description: 'Davom eting, siz juda yaxshi ketasiz!',
      priority: 'medium'
    });
  }
  
  // 3. Imtihonga qolgan vaqt
  if (user && user.averageScore < 70) {
    recommendations.push({
      type: 'urgent',
      title: '🚨 URGENTI: Kuchli tayyorgarlik kerak!',
      description: `Hozirgi ball ${Math.round(user.averageScore)}%. 70% maqsad!`,
      priority: 'critical'
    });
  }
  
  // 4. Vaqt optimize
  if (testResult.timeSpent > totalQuestions * 3) {
    recommendations.push({
      type: 'speed_up',
      title: '⚡ Vaqtni tejang',
      description: 'Imtihonda har savol uchun 1.8 minut optimal',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

// ============= UTILITY ENDPOINTS =============

app.get('/api/health', (req, res) => {
  res.json({ status: '✅ Server ishlamyapti', timestamp: new Date() });
});

app.get('/api/sections', (req, res) => {
  const sections = Object.entries(questionsDB.sections).map(([key, value]) => ({
    id: key,
    name: value.name,
    icon: value.icon,
    totalQuestions: value.totalQuestions
  }));
  
  res.json({ success: true, sections });
});

// ============= ERROR HANDLING =============
app.use((err, req, res, next) => {
  console.error('❌ Server xatosi:', err.message);
  res.status(500).json({ error: 'Server xatosi: ' + err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: '404 - Topilmadi' });
});

// ============= SERVER START =============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 CHQBT PLATFORM SERVER ISHLAMYAPTI  ║
╠════════════════════════════════════════╣
║  🌐 URL: http://localhost:${PORT}             ║
║  📊 Questions: 300+                   ║
║  📚 Sections: 6 ta                    ║
║  ✅ Health: /api/health               ║
║  📋 Sections: /api/sections           ║
╚════════════════════════════════════════╝
  `);
  console.log('💡 Test: http://localhost:' + PORT + '/api/health');
});

module.exports = app;
