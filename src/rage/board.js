// Gnomageddon's leaderboard: talks to the Cloudflare Worker in /leaderboard,
// or keeps scores in this browser if no LEADERBOARD_URL is set (see config.js).
//
// A score row: { id, initials, score, wpm, acc, secs, series, place, at }
import { LEADERBOARD_URL } from './config.js';

// Speed and accuracy in one number: WPM x accuracy squared.
// 80 WPM at 95% scores 72; 80 WPM at 85% only 58. Mistakes hurt.
// (The Worker works this out again itself, so keep the two in step.)
export function scoreOf(wpm, acc) {
  return Math.round(wpm * (acc / 100) ** 2);
}
export const LENGTHS = [30, 60, 120];
export const cleanInitials = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);

const base = () => LEADERBOARD_URL.replace(/\/+$/, '');
export const online = () => !!base();

async function api(path, opts = {}) {
  const res = await fetch(base() + path, { ...opts, headers: { 'content-type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Leaderboard said ${res.status}`);
  return body;
}

// ---------- scores that couldn't be sent (offline): kept and sent next time ----------
const PENDING = 'pocketGnome.rage.pending.v1';
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
async function flushPending() {
  const list = readJSON(PENDING, []);
  if (!list.length) return;
  const left = [];
  for (const e of list) {
    try { await api('/api/scores', { method: 'POST', body: JSON.stringify(e) }); } catch { left.push(e); }
  }
  writeJSON(PENDING, left);
}
export const pendingCount = () => readJSON(PENDING, []).length;

// ---------- this-browser-only board ----------
const LOCAL = 'pocketGnome.rage.scores.v1';
const local = {
  all: () => readJSON(LOCAL, []),
  submit(e) {
    const rows = this.all();
    const mine = rows.filter((r) => r.initials === e.initials && r.secs === e.secs);
    const prevBest = mine.reduce((b, r) => (!b || r.score > b.score ? r : b), null);
    const entry = { ...e, id: (rows.at(-1)?.id || 0) + 1, at: Date.now() };
    rows.push(entry);
    writeJSON(LOCAL, rows);
    const same = rows.filter((r) => r.secs === e.secs);
    return { entry, rank: same.filter((r) => r.score > entry.score).length + 1, of: same.length, prevBest, isBest: !prevBest || entry.score > prevBest.score };
  },
  top(secs, limit) {
    return { rows: this.all().filter((r) => !secs || r.secs === secs).sort((a, b) => b.score - a.score || b.wpm - a.wpm || a.at - b.at).slice(0, limit) };
  },
  history(initials, limit) {
    const rows = this.all().filter((r) => r.initials === initials).sort((a, b) => b.at - a.at);
    return { initials, rows: rows.slice(0, limit), stats: statsOf(rows) };
  },
};
function statsOf(rows) {
  const best = {};
  for (const r of rows) if (!best[r.secs] || r.score > best[r.secs].score) best[r.secs] = r;
  return { races: rows.length, best };
}

// ---------- the API the game uses ----------
// Post a finished race. Resolves { entry, rank, of, prevBest, isBest }, or { queued: true } if offline.
export async function submitScore({ initials, wpm, acc, secs, series, place }) {
  const e = { initials: cleanInitials(initials), wpm, acc, secs, series, place, score: scoreOf(wpm, acc) };
  if (!online()) return local.submit(e);
  await flushPending();
  try {
    return await api('/api/scores', { method: 'POST', body: JSON.stringify(e) });
  } catch (err) {
    if (err instanceof TypeError) { // network trouble: keep it for later
      writeJSON(PENDING, [...readJSON(PENDING, []), e]);
      return { queued: true, entry: e };
    }
    throw err;
  }
}
// The best races. secs = 0 for every length.
export async function topScores(secs = 0, limit = 15) {
  if (!online()) return local.top(secs, limit);
  return api(`/api/top?secs=${secs}&limit=${limit}`);
}
// Everything one set of initials has done, newest first, plus their bests per race length.
export async function history(initials, limit = 30) {
  const i = cleanInitials(initials);
  if (!online()) return local.history(i, limit);
  return api(`/api/history?initials=${encodeURIComponent(i)}&limit=${limit}`);
}
