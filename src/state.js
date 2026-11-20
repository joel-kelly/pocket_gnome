// Game state + saving (in the browser's localStorage).
import { DEFAULT_PAINT } from './gnomeModel.js';

const KEY = 'pocketGnome.save.v1';

// How fast stats drop, in points per hour (stats go 0..100).
// Tuned so ~10-15 minutes of daily play keeps the gnome happy.
export const DECAY_PER_HOUR = { hunger: 5, thirst: 6, tidy: 3, joy: 4 };
export const STAT_INFO = {
  hunger: { label: 'Tummy', icon: '🍓' },
  thirst: { label: 'Thirst', icon: '💧' },
  tidy: { label: 'Tidy', icon: '🧹' },
  joy: { label: 'Joy', icon: '🌼' },
};

export function newState() {
  return {
    version: 1,
    created: Date.now(),
    lastTick: Date.now(),
    onboarded: false,
    placed: false,          // has done (or skipped) the placement check
    kidName: 'Friend',
    gnomeName: 'Gnorman',
    paint: { ...DEFAULT_PAINT },
    acorns: 30,
    totalAcorns: 0,
    stats: { hunger: 70, thirst: 70, tidy: 75, joy: 70 },
    pantry: { berrytart: 1, dewtea: 1 },
    owned: ['birdbath'],
    paints: [],             // paint pots bought at Gnome Depot (unlock colors)
    equipped: {},
    decor: ['birdbath'],    // item id in each garden spot (null = empty)
    keys: {},               // per-key practice records (see typing/engine.js)
    stage: 1,               // typing stage unlocked so far
    lastLessonStage: 0,     // newest stage whose "meet the new keys" lesson was done
    best: { astro: 0 },
    autoPace: {},           // per-game pace when Game pace is on auto (1 = normal)
    history: [],
    settings: { sound: true, keySeconds: 1.0, maxStage: 'auto', hints: 'auto', pace: 'auto' },
  };
}

let state = null;
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? fromSaved(JSON.parse(raw)) : newState();
  } catch (e) {
    console.warn('Could not load save', e);
    state = newState();
  }
  tick();
  return state;
}

// Fill in anything an older save is missing.
function fromSaved(data) {
  const fresh = newState();
  const s = { ...fresh, ...data };
  s.settings = { ...fresh.settings, ...(data.settings || {}) };
  s.paint = { ...DEFAULT_PAINT, ...(data.paint || {}) };
  s.stats = { ...fresh.stats, ...(data.stats || {}) };
  s.best = { ...fresh.best, ...(data.best || {}) };
  return s;
}

export function get() { return state; }

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
  listeners.forEach((fn) => fn(state));
}
export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Save failed', e); }
}
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Apply time-based decay.
export function tick(now = Date.now()) {
  const hours = Math.max(0, (now - state.lastTick) / 3600000);
  state.lastTick = now;
  for (const [k, rate] of Object.entries(DECAY_PER_HOUR)) {
    state.stats[k] = Math.max(0, state.stats[k] - rate * hours);
  }
}

export function addStat(k, amount) {
  state.stats[k] = Math.max(0, Math.min(100, state.stats[k] + amount));
  save();
}

export function addAcorns(n) {
  state.acorns += n;
  if (n > 0) state.totalAcorns += n;
  save();
}

export function moodFromStats() {
  const s = state.stats;
  const avg = (s.hunger + s.thirst + s.tidy + s.joy) / 4;
  if (Math.min(s.hunger, s.thirst, s.tidy, s.joy) < 25 || avg < 40) return 'sad';
  if (avg > 75) return 'happy';
  return 'neutral';
}
export function neediest() {
  const low = Object.entries(state.stats).sort((a, b) => a[1] - b[1])[0];
  return low[1] < 25 ? low[0] : null;
}

export function exportSave() { return JSON.stringify(state, null, 1); }
export function importSave(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.stats || !('gnomeName' in data)) throw new Error('Not a Pocket Gnome save file');
  state = fromSaved(data);
  saveNow();
  return state;
}
export function resetSave() {
  state = newState();
  saveNow();
  return state;
}
