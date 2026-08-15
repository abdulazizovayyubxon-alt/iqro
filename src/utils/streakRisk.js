// Zanjir xavfi — «bugun bajarilmasa uziladi» holati.
//
// NEGA KERAK: ilova zanjirni faqat U SAQLANGANDAN KEYIN ko'rsatardi (Yutuqlar
// sahifasidagi «N kun» chipi). Ya'ni foydalanuvchi yo'qotish arafasida
// turganini hech qachon bilmasdi — eng kuchli undovchi ishlatilmay qolardi.
//
// Sof funksiya: faqat state'dan o'qiydi, hech narsa yozmaydi.
// AppContext'dagi `advanceDailyStreak` bilan bir xil kun mantig'i.

/** Ikki toDateString() qiymati orasidagi to'liq kun farqi (AppContext bilan bir xil) */
const dayDiff = (fromStr, toStr) => {
  const a = new Date(fromStr); const b = new Date(toStr);
  if (isNaN(a) || isNaN(b)) return Infinity;
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

/** Zanjir haqida ogohlantirish uchun eng kichik uzunlik (1 kun uchun bu shovqin) */
export const RISK_MIN_STREAK = 2;

/** Kun tugashiga shuncha soat qolganda holat «shoshilinch» deb belgilanadi */
export const RISK_URGENT_HOURS = 6;

/**
 * @param {object} state AppContext holati
 * @param {Date}   now   sinov uchun (default — hozir)
 * @returns {null | {
 *   streak: number,     // xavf ostidagi zanjir uzunligi
 *   remaining: number,  // maqsadgacha qolgan savollar
 *   answered: number,   // bugun yechilgani
 *   target: number,     // bugungi maqsad
 *   hoursLeft: number,  // kun tugashiga qolgan soat
 *   urgent: boolean,    // kechqurun — ohang qattiqroq
 *   usesFreeze: boolean // bugun bajarilmasa zaxira muzlatish sarflanadi
 * }}
 */
export function streakRisk(state, now = new Date()) {
  const streak = state?.dailyStreak || 0;
  if (streak < RISK_MIN_STREAK) return null;

  const today = now.toDateString();
  const dg = state?.dailyGoal?.date === today ? state.dailyGoal : null;

  // Bugun maqsad bajarilgan — zanjir allaqachon xavfsiz
  if (dg?.completed) return null;

  // Oxirgi bajarilgan kunga qarab holatni ajratamiz:
  //   0 — bugun bajarilgan (yuqorida qaytdik), 1 — kecha (klassik xavf),
  //   2 — bir kun o'tkazilgan (bugun bajarilsa muzlatish sarflanadi),
  //   >2 — zanjir aslida allaqachon uzilgan, ogohlantirish yolg'on bo'lardi.
  const diff = state?.lastGoalDate ? dayDiff(state.lastGoalDate, today) : Infinity;
  if (diff > 2) return null;
  if (diff === 2 && (state?.streakFreezes ?? 0) <= 0) return null;

  const target = dg?.target || state?.dailyGoal?.target || 20;
  const answered = dg?.answered || 0;
  const remaining = Math.max(1, target - answered);
  const hoursLeft = Math.max(1, 24 - now.getHours());

  return {
    streak,
    remaining,
    answered,
    target,
    hoursLeft,
    urgent: hoursLeft <= RISK_URGENT_HOURS,
    usesFreeze: diff === 2,
  };
}

export default streakRisk;
