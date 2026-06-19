/**
 * Kosmetik liga/divizion darajalari — umumiy ball asosida.
 * Faqat klient tomonida (backend yo'q): reyting va profilda nishon sifatida.
 * Ko'tarilish/tushish mantig'i yo'q — sof bezak/motivatsiya.
 */
export const LEAGUES = [
  { id: 'bronze',   name: 'Bronza',  min: 0,    icon: '🥉', color: '#B45309' },
  { id: 'silver',   name: 'Kumush',  min: 300,  icon: '🥈', color: '#9CA3AF' },
  { id: 'gold',     name: 'Oltin',   min: 1000, icon: '🥇', color: '#F59E0B' },
  { id: 'platinum', name: 'Platina', min: 3000, icon: '💠', color: '#22D3EE' },
  { id: 'diamond',  name: 'Olmos',   min: 8000, icon: '💎', color: '#60A5FA' },
];

// Berilgan ballga mos joriy liga
export function getLeague(score) {
  const s = score || 0;
  let current = LEAGUES[0];
  for (const l of LEAGUES) {
    if (s >= l.min) current = l;
  }
  return current;
}

// Keyingi liga (eng yuqorida bo'lsa null)
export function nextLeague(score) {
  const s = score || 0;
  return LEAGUES.find(l => s < l.min) || null;
}

// Joriy liga ichidagi keyingi darajaga progress (0..1)
export function leagueProgress(score) {
  const s = score || 0;
  const cur = getLeague(s);
  const nxt = nextLeague(s);
  if (!nxt) return 1;
  const span = nxt.min - cur.min;
  return span > 0 ? Math.min(1, Math.max(0, (s - cur.min) / span)) : 1;
}
