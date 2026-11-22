// Gnomageddon leaderboard API.
//   POST /api/scores                  { initials, wpm, acc, secs, series, place } -> { entry, rank, of, prevBest, isBest }
//   GET  /api/top?secs=60&limit=15    -> { rows }            (secs=0 for every race length)
//   GET  /api/history?initials=ABC    -> { initials, rows, stats: { races, best: { 30: row, 60: row, ... } } }
// No accounts: it's for a few friends, and anyone can post as any initials.

const LENGTHS = [30, 60, 120];
const COLS = 'id, initials, score, wpm, acc, secs, series, place, at';

// Keep in step with scoreOf() in src/rage/board.js.
const scoreOf = (wpm, acc) => Math.round(wpm * (acc / 100) ** 2);

function cors(env) {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}
const json = (env, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(env) } });
const bad = (env, error) => json(env, { error }, 400);

const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const cleanInitials = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
const limitOf = (url, d, max) => Math.max(1, Math.min(max, parseInt(url.searchParams.get('limit') || d, 10) || d));

async function postScore(req, env) {
  let b;
  try { b = await req.json(); } catch { return bad(env, 'Send JSON.'); }
  const initials = cleanInitials(b.initials);
  if (!initials) return bad(env, 'Initials needed (1-3 letters).');
  if (!intIn(b.wpm, 0, 300)) return bad(env, 'wpm should be a whole number from 0 to 300.');
  if (!intIn(b.acc, 0, 100)) return bad(env, 'acc should be a whole number from 0 to 100.');
  if (!LENGTHS.includes(b.secs)) return bad(env, `secs should be one of ${LENGTHS.join(', ')}.`);
  const series = String(b.series || 'mix').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'mix';
  const place = intIn(b.place, 1, 4) ? b.place : null;
  const score = scoreOf(b.wpm, b.acc);

  const prevBest = await env.DB.prepare(`SELECT ${COLS} FROM scores WHERE initials = ? AND secs = ? ORDER BY score DESC, at ASC LIMIT 1`)
    .bind(initials, b.secs).first();
  const entry = await env.DB.prepare(`INSERT INTO scores (initials, score, wpm, acc, secs, series, place, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${COLS}`)
    .bind(initials, score, b.wpm, b.acc, b.secs, series, place, Date.now()).first();
  const { better, total } = await env.DB.prepare('SELECT SUM(score > ?) AS better, COUNT(*) AS total FROM scores WHERE secs = ?')
    .bind(score, b.secs).first();
  return json(env, { entry, rank: (better || 0) + 1, of: total, prevBest, isBest: !prevBest || score > prevBest.score });
}

async function top(url, env) {
  const secs = parseInt(url.searchParams.get('secs') || '0', 10) || 0;
  const limit = limitOf(url, 15, 100);
  const q = secs
    ? env.DB.prepare(`SELECT ${COLS} FROM scores WHERE secs = ? ORDER BY score DESC, wpm DESC, at ASC LIMIT ?`).bind(secs, limit)
    : env.DB.prepare(`SELECT ${COLS} FROM scores ORDER BY score DESC, wpm DESC, at ASC LIMIT ?`).bind(limit);
  const { results } = await q.all();
  return json(env, { rows: results });
}

async function history(url, env) {
  const initials = cleanInitials(url.searchParams.get('initials'));
  if (!initials) return bad(env, 'Which initials?');
  const limit = limitOf(url, 30, 200);
  const [{ results: rows }, { results: bests }, count] = await Promise.all([
    env.DB.prepare(`SELECT ${COLS} FROM scores WHERE initials = ? ORDER BY at DESC LIMIT ?`).bind(initials, limit).all(),
    // the best race at each length (ties go to the earliest)
    env.DB.prepare(`SELECT ${COLS} FROM scores s WHERE initials = ?1 AND id = (
        SELECT id FROM scores WHERE initials = ?1 AND secs = s.secs ORDER BY score DESC, at ASC LIMIT 1)`).bind(initials).all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE initials = ?').bind(initials).first(),
  ]);
  const best = Object.fromEntries(bests.map((r) => [r.secs, r]));
  return json(env, { initials, rows, stats: { races: count.n, best } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });
    try {
      if (url.pathname === '/api/scores' && req.method === 'POST') return await postScore(req, env);
      if (url.pathname === '/api/top' && req.method === 'GET') return await top(url, env);
      if (url.pathname === '/api/history' && req.method === 'GET') return await history(url, env);
      if (url.pathname === '/') return json(env, { ok: true, name: 'Gnomageddon leaderboard' });
      return json(env, { error: 'Not found' }, 404);
    } catch (e) {
      console.error(e);
      return json(env, { error: 'Something went wrong on the leaderboard.' }, 500);
    }
  },
};
