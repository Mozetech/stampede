// Persistent save: coins, garage, hi-scores, settings. Everything lives in localStorage.
const KEY = 'stampede.save.v1';

const DEFAULTS = () => ({
  coins: 0,
  owned: ['runabout'],
  selected: 'runabout',
  scores: [],          // [{ score, car, name, date }]
  best: 0,
  runs: 0,
  totalCoins: 0,
  music: true,
  sfx: true,
  name: '',
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const data = { ...DEFAULTS(), ...JSON.parse(raw) };
    if (!data.owned.includes('runabout')) data.owned.push('runabout');
    if (!data.owned.includes(data.selected)) data.selected = 'runabout';
    return data;
  } catch { return DEFAULTS(); }
}

export const save = load();

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode etc. */ }
}

export function addCoins(n) { save.coins += n; save.totalCoins += n; persist(); }

export function buyCar(id, price) {
  if (save.owned.includes(id) || save.coins < price) return false;
  save.coins -= price;
  save.owned.push(id);
  save.selected = id;
  persist();
  return true;
}
export function selectCar(id) { if (save.owned.includes(id)) { save.selected = id; persist(); } }

// Returns the rank (0-based) if the score made the top 10, else -1.
export function recordScore(score, carId, name) {
  save.runs += 1;
  if (score > save.best) save.best = score;
  const entry = { score, car: carId, name: name || save.name || '', date: Date.now() };
  save.scores.push(entry);
  save.scores.sort((a, b) => b.score - a.score || a.date - b.date);
  save.scores = save.scores.slice(0, 10);
  persist();
  return save.scores.indexOf(entry);
}
export function setName(name) { save.name = name; for (const s of save.scores) if (!s.name) s.name = name; persist(); }
export function setSetting(k, v) { save[k] = v; persist(); }
export function resetAll() { Object.assign(save, DEFAULTS()); persist(); }
