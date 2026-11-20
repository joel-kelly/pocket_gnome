// Typing practice engine. Works like Pocket Goblin's times-table engine, with
// keys instead of fact families:
// - Each key has a level ("box") from 0 (shaky) to 5 (mastered).
// - A right key pressed faster than the target time moves it up a level.
//   Right but slow: no change. Wrong: down 1 level.
// - Weak and slow keys come up more often in the words and spells.
// - The next stage unlocks when 70% of unlocked keys are solid (level 3+)
//   AND every key in the newest stage is solid.
import { STAGES, MAX_STAGE, keysUpTo } from './keys.js';
import { WORDS, SENTENCES } from './words.js';

export const SOLID = 3;
export const UNLOCK_SHARE = 0.7;
const BOX_WEIGHT = [7, 5, 3, 2, 1.2, 0.6];

export function keyRecord(state, k) {
  return (state.keys[k] ||= { seen: 0, right: 0, wrong: 0, avg: null, box: 0 });
}
export const target = (state) => state.settings.keySeconds || 1.0;

// The stage being practiced: auto (grows with mastery) or pinned by a grown-up.
export function currentStage(state) {
  const pin = state.settings.maxStage;
  if (pin && pin !== 'auto') return Math.min(MAX_STAGE, Number(pin));
  return Math.min(MAX_STAGE, Math.max(1, state.stage || 1));
}

// ok: right key? secs: time since the last key. timed: does this press count for speed?
export function recordKey(state, k, ok, secs = 0, timed = false) {
  const r = keyRecord(state, k);
  r.seen++;
  if (ok) {
    r.right++;
    if (timed) {
      r.avg = r.avg == null ? secs : r.avg * 0.8 + secs * 0.2;
      if (secs <= target(state)) r.box = Math.min(5, r.box + 1);
    }
  } else {
    r.wrong++;
    r.box = Math.max(0, r.box - 1);
  }
  return r;
}

export function stageProgress(state) {
  const stage = currentStage(state);
  const keys = keysUpTo(stage);
  const newest = STAGES[stage - 1].keys;
  const isSolid = (k) => keyRecord(state, k).box >= SOLID;
  const solid = keys.filter(isSolid).length;
  const needed = Math.ceil(keys.length * UNLOCK_SHARE);
  const newestSolid = newest.filter(isSolid).length;
  const auto = !state.settings.maxStage || state.settings.maxStage === 'auto';
  const ready = solid >= needed && newestSolid === newest.length;
  const pct = Math.min(1, (solid / needed) * 0.5 + (newestSolid / newest.length) * 0.5);
  return {
    stage, keys, newest, solid, needed, total: keys.length, newestSolid, newestTotal: newest.length,
    shaky: newest.filter((k) => !isSolid(k)),
    ready, pct, next: stage < MAX_STAGE && auto ? stage + 1 : null,
  };
}

// Call after a round. Returns the newly unlocked stage, or null.
export function checkUnlock(state) {
  const p = stageProgress(state);
  if (!p.next || !p.ready) return null;
  state.stage = p.next;
  return p.next;
}

// How long before the on-screen keyboard shows which key to press.
// New keys: right away. Solid keys: wait a moment so she can try from memory.
// Mastered keys: only after a mistake.
export function hintDelay(state, k) {
  const mode = state.settings.hints || 'auto';
  if (mode === 'always') return 0;
  if (mode === 'mistakes') return Infinity;
  const box = keyRecord(state, k).box;
  return box < SOLID ? 0 : box === SOLID ? 1.5 : Infinity;
}

// ---------- picking what to type ----------
const LETTER = /^[a-z;]$/;

export class TextPicker {
  // opts.stage: practice up to this stage. opts.focus: keys to practice extra.
  // opts.spells: share of gnome spells (0..1) once there are enough real words.
  constructor(state, opts = {}) {
    this.state = state;
    this.stage = opts.stage ?? currentStage(state);
    const keys = keysUpTo(this.stage);
    this.letters = keys.filter((k) => LETTER.test(k));
    this.letterSet = new Set(this.letters.filter((k) => k !== ';'));
    this.capitals = keys.includes('Shift');
    this.punct = keys.includes('.');
    this.focus = new Set(opts.focus || STAGES[this.stage - 1].keys.filter((k) => LETTER.test(k)));
    this.spellShare = opts.spells;
    this.maxLen = this.stage < 6 ? 5 : this.stage < 9 ? 6 : 8;
    this.words = WORDS.filter((w) => w.length <= this.maxLen && [...w].every((c) => this.letterSet.has(c)));
    this.sentences = SENTENCES.filter((s) => [...s.toLowerCase()].every((c) => this.letterSet.has(c) || c === ' ' || (this.punct && (c === '.' || c === ','))));
    this.recent = [];
  }

  weight(k) {
    const r = keyRecord(this.state, k);
    let w = BOX_WEIGHT[r.box];
    if (r.avg != null && r.avg > target(this.state)) w *= 1.4;
    if (this.focus.has(k)) w *= 2;
    return w;
  }
  pickKey(from = this.letters) {
    const ws = from.map((k) => this.weight(k));
    let x = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < from.length; i++) { x -= ws[i]; if (x <= 0) return from[i]; }
    return from[from.length - 1];
  }

  // A "gnome spell": a made-up word from the unlocked keys, heavy on weak keys.
  spell() {
    const n = 2 + Math.floor(Math.random() * (this.letters.length > 6 ? 3 : 2));
    let s = '';
    const vowels = this.letters.filter((k) => 'aeiou'.includes(k));
    for (let i = 0; i < n; i++) {
      let k;
      let tries = 0;
      do {
        // With vowels around, every other letter is a vowel so spells sound like words.
        k = vowels.length && i % 2 === 1 && Math.random() < 0.75 ? this.pickKey(vowels) : this.pickKey();
      } while (tries++ < 6 && s.length >= 2 && s[s.length - 1] === k && s[s.length - 2] === k);
      s += k;
    }
    return s;
  }

  realWord() {
    let best = null, bestScore = -1;
    for (let i = 0; i < 40; i++) {
      const w = this.words[Math.floor(Math.random() * this.words.length)];
      if (this.recent.includes(w)) continue;
      let sum = 0, max = 0;
      for (const c of w) { const x = this.weight(c); sum += x; max = Math.max(max, x); }
      const score = (max + sum / w.length) * (0.6 + Math.random() * 0.8);
      if (score > bestScore) { bestScore = score; best = w; }
    }
    return best || this.words[0];
  }

  word() {
    const share = this.spellShare ?? (this.words.length >= 60 ? 0.12 : this.words.length >= 15 ? 0.35 : 1);
    // Keys that never show up in real words (like ;) only get practiced in spells.
    const w = this.words.length && Math.random() >= share ? this.realWord() : this.spell();
    this.recent.push(w);
    if (this.recent.length > 10) this.recent.shift();
    return w;
  }

  // A line to type: words with spaces, about `len` characters long.
  line(len = 22) {
    if (this.punct && this.sentences.length && Math.random() < 0.35) {
      const s = this.sentences[Math.floor(Math.random() * this.sentences.length)];
      if (!this.recent.includes(s)) { this.recent.push(s); return s; }
    }
    const words = [];
    let n = 0;
    while (n < len || words.length < 2) {
      const w = this.word();
      words.push(w);
      n += w.length + 1;
    }
    if (this.capitals && Math.random() < 0.6) words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    if (this.capitals && Math.random() < 0.3) { const i = 1 + Math.floor(Math.random() * (words.length - 1)); words[i] = words[i][0].toUpperCase() + words[i].slice(1); }
    if (this.punct) {
      if (words.length > 2 && Math.random() < 0.4) words[1] += ',';
      if (Math.random() < 0.7) words[words.length - 1] += '.';
    }
    return words.join(' ');
  }
}

// Practice lines for meeting brand-new keys: drill, mix, then real words.
export function lessonLines(state, stage) {
  const newKeys = STAGES[stage - 1].keys.filter((k) => LETTER.test(k));
  if (!newKeys.length) {
    // Shift or punctuation stages: whole lines with capitals and periods.
    const p = new TextPicker(state, { stage });
    return [p.line(18), p.line(20), p.line(22)];
  }
  const home = stage <= 4 ? keysUpTo(stage).filter((k) => LETTER.test(k)) : ['f', 'j', 'd', 'k'];
  const drill = [];
  for (let i = 0; i < 5; i++) {
    const a = newKeys[i % newKeys.length], b = newKeys[(i + 1) % newKeys.length];
    const h = home[Math.floor(Math.random() * home.length)];
    drill.push(i % 2 ? a + a + b : a + h + a);
  }
  const mix = new TextPicker(state, { stage, focus: newKeys, spells: 1 });
  const real = new TextPicker(state, { stage, focus: newKeys });
  const realWords = real.words.filter((w) => newKeys.some((k) => w.includes(k)));
  const words = [];
  for (let i = 0; i < 5; i++) words.push(realWords.length >= 4 ? realWords[Math.floor(Math.random() * realWords.length)] : mix.spell());
  return [drill.join(' '), [mix.spell(), mix.spell(), mix.spell(), mix.spell(), mix.spell()].join(' '), words.join(' ')];
}
