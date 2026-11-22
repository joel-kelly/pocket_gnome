// GNOMAGEDDON: the secret grown-up version of the Grand Gnome Prix.
// Type the secret code on the garden screen (see rage/config.js) to get here.
//
// Same track and the same rule (your car only moves on the right key), but:
// spiked cars at dusk, rude critters, full sentences with capitals and
// punctuation, no hints or on-screen keyboard, and a shared leaderboard by initials.
// Nothing here touches the kid's save: no key levels, acorns, trophies or history.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, modal } from '../ui.js';
import { sfx } from '../audio.js';
import { RaceScreen, RACE_LENGTHS, ordinal, MEDAL } from './race.js';
import { SERIES, getSeries, SentenceFeed } from '../rage/sentences.js';
import { submitScore, topScores, history as getHistory, scoreOf, cleanInitials, online, LENGTHS } from '../rage/board.js';

const LINE_WIDTH = 44; // characters per line on the sign
const PREFS = 'pocketGnome.rage.v1';
function loadPrefs() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PREFS)) || {}; } catch { /* fresh start */ }
  return { initials: cleanInitials(p.initials), series: getSeries(p.series).id, secs: LENGTHS.includes(p.secs) ? p.secs : 60 };
}

const LOOK = {
  sky: ['#2a1640', '#a8405a', '#f39a4a'], fog: '#7a4058', meadow: '#5a6a2e', asphalt: '#3c3b42',
  kerb: '#ffc81e', line: '#ffc81e', barrier: '#1d1b1e', roof: '#2a2628', spiky: true,
  sign: { text: 'GNOMAGEDDON', bg: '#1d1b1e', fg: '#ff4a2e' },
  gantry: { text: 'GNOMAGEDDON', bg: '#1d1b1e', fg: '#ffc81e' },
  banners: [
    ['NO REFUNDS', { bg: '#1d1b1e', fg: '#ffc81e', border: '#ff4a2e' }],
    ['SPIKES R US', { bg: '#ffc81e', fg: '#1d1b1e', border: '#1d1b1e' }],
    ['ANGER MGMT DROPOUTS', { bg: '#ff4a2e', fg: '#fbf7ee', border: '#1d1b1e' }],
    ['CRUMPETS OF WRATH', { bg: '#3a2a4a', fg: '#ff9ae0', border: '#ff9ae0' }],
  ],
};

const RIVALS = [
  { id: 'hedgehog', emo: '🦔', name: 'Pincushion', body: '#3b4a2a', accent: '#ff7a1a', num: 2, wave: 3 },
  { id: 'squirrel', emo: '🐿️', name: 'Nutcase', body: '#6a1e22', accent: '#ffc81e', num: 3, wave: 2 },
  { id: 'bunny', emo: '🐰', name: 'Hare Trigger', body: '#2a2440', accent: '#ff3df0', num: 4, wave: 2 },
];

const TAUNTS = {
  raceStart: [
    'Ladies, gentlemen, and assorted vermin: start your engines.',
    'I have been fired in a kiln hotter than this competition.',
    'Tonight we ride. Politely, but with spikes.',
    'Somebody is going home in a flowerpot, and it is not me.',
  ],
  raceOvertake: ['Eat my glaze!', 'Ceramic beats fur. Every time.', 'Move, or be moved.', 'Did somebody order a pancake?', 'Keep up, roadkill!', 'Excuse me. Pardon. Coming through. SMASH.'],
  racePassed: ['Oh, it is ON now.', 'That was a mistake, rodent.', 'Adding you to my diary of grudges.', 'Enjoy the lead. It is a rental.', 'Fine. FINE.'],
  typeWrong: ['Fingers! We have spikes to maintain!', 'Who taught you to type, a pigeon?', 'The RIGHT keys. With feeling.', 'Is your keyboard upside down?'],
  raceTurbo: ['NITRO! Smell that? Victory and burnt toast.', 'Full send!', 'Unleash the hounds! Metaphorically.', 'MAXIMUM GNOME!'],
  raceGerald: ['GERALD, THIS IS A CLOSED CIRCUIT.', 'Gerald is not a licensed competitor.', 'Somebody revoke that pigeon\'s licence.'],
  raceWin: ['Bow before the gnome.', 'Victory tastes like crumpets and spite.', 'And THAT is how you parallel park at 200 miles an hour.'],
  raceEnd: ['I demand a recount.', 'The spikes were not sharp enough. Noted.', 'I let them win. Strategically. For morale.'],
  newBest: ['New personal best! Somebody frame those fingers.', 'Fastest I have ever been, and I once fell off a shelf.'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const SMASH_WORDS = ['SMASH!', 'CRUNCH!', 'BONK!', 'RUDE!', 'WRECKED!', 'KAPOW!'];
const lenLabel = (secs) => RACE_LENGTHS.find((l) => l.secs === secs)?.label || `${secs} sec`;
const when = (at) => new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// A little table: cols = [[heading, row => cell], ...]
function table(rows, cols, { hi, empty = 'Nothing here yet.', onRow } = {}) {
  if (!rows.length) return h('p', { class: 'small' }, empty);
  return h('table', { class: 'rage-table' },
    h('thead', {}, h('tr', {}, ...cols.map(([t]) => h('th', {}, t)))),
    h('tbody', {}, ...rows.map((r, i) => h('tr', {
      class: (hi != null && r.id === hi ? 'hi' : '') + (onRow ? ' click' : ''),
      onclick: onRow ? () => onRow(r) : null,
    }, ...cols.map(([, f]) => h('td', {}, f(r, i)))))));
}
const TOP_COLS = [
  ['#', (r, i) => i + 1],
  ['Who', (r) => h('b', {}, r.initials)],
  ['Score', (r) => h('b', {}, r.score)],
  ['WPM', (r) => r.wpm],
  ['Acc', (r) => `${r.acc}%`],
  ['Length', (r) => lenLabel(r.secs)],
  ['Text', (r) => getSeries(r.series).name],
  ['When', (r) => when(r.at)],
];
const HISTORY_COLS = [
  ['When', (r) => when(r.at)],
  ['Length', (r) => lenLabel(r.secs)],
  ['Score', (r) => h('b', {}, r.score)],
  ['WPM', (r) => r.wpm],
  ['Acc', (r) => `${r.acc}%`],
  ['Place', (r) => (r.place ? MEDAL[r.place - 1] : '')],
  ['Text', (r) => getSeries(r.series).name],
];

export class RageScreen extends RaceScreen {
  // ---------- the hooks RaceScreen gives us ----------
  get look() { return LOOK; }
  get rivalDefs() { return RIVALS; }
  get title() { return '🔥 GNOMAGEDDON'; }
  get lightsNote() { return 'Hands on the keys. Wait for the lights. Then show no mercy.'; }
  get raceSecs() { return this.prefs.secs; }
  saveLength(secs) { this.prefs.secs = secs; this.savePrefs(); this.refreshBest(); }
  lengthTip() { return ''; }
  bestText() { return `${this.prefs.initials || '???'} best: ${this.myBest ? `${this.myBest.score} pts` : '-'}`; }
  rivalBase() { return this.myBest?.wpm || 45; }
  speedoTop() { return Math.max(100, Math.ceil(((this.myBest?.wpm || 0) * 1.4) / 20) * 20); }
  myName() { return this.prefs.initials || 'Driver'; }
  carPaint() { return ['#1d1b1e', this.state.paint.hat]; }
  padOpts() { return { record: false, hints: false, keyboard: false }; }
  taunt(key, secs) { const l = TAUNTS[key]; if (l) this.game.say(pick(l), secs); }

  savePrefs() { try { localStorage.setItem(PREFS, JSON.stringify(this.prefs)); } catch { /* fine */ } }

  build() {
    super.build();
    // dusk light
    this.lights.sun.color.set('#ffb48a');
    this.lights.hemi.color.set('#d8a0c8');
    this.lights.hemi.groundColor.set('#4a3a2a');
  }

  enter(args) {
    this.prefs = loadPrefs();
    this.myBest = null;
    document.body.classList.add('rage-mode');
    super.enter(args);
    this.game.applyOutfit({ face: 'sunglasses' }); // obviously
    this.refreshBest();
  }
  exit() {
    super.exit();
    document.body.classList.remove('rage-mode');
    this.modal?.close();
    this.game.applyOutfit();
  }
  // Back to the garden (or wherever this browser's kid was up to).
  leave() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    const s = this.state;
    this.game.go(!s.onboarded ? 'depot' : !s.placed ? 'placement' : 'home');
  }

  // This driver's best at this race length (sets the rivals' speeds and the Best pill).
  refreshBest() {
    const who = this.prefs.initials, secs = this.raceSecs;
    if (!who) { this.myBest = null; this.bestPill.textContent = this.bestText(); return; }
    getHistory(who, 1).then((res) => {
      if (who !== this.prefs.initials || secs !== this.raceSecs) return;
      this.myBest = res.stats?.best?.[secs] || null;
      this.bestPill.textContent = this.bestText();
    }).catch(() => {});
  }

  // ---------- before the race ----------
  showReady() {
    const p = this.prefs;
    const input = this.initialsInput = h('input', {
      type: 'text', class: 'rage-initials', maxlength: 3, value: p.initials, placeholder: '???', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your initials',
    });
    input.addEventListener('input', () => {
      input.value = cleanInitials(input.value);
      p.initials = input.value;
      this.savePrefs();
      this.refreshBest();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); this.countdown(); }
      if (e.key === 'Escape') input.blur();
    });
    const blurb = h('p', { class: 'small rage-blurb' }, getSeries(p.series).blurb);
    const tabs = h('div', { class: 'tabs rage-series' }, ...SERIES.map((s) => h('button', {
      class: 'tab' + (s.id === p.series ? ' on' : ''), title: s.blurb,
      onclick: () => {
        sfx.click();
        p.series = s.id; this.savePrefs();
        tabs.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('on', SERIES[i].id === s.id));
        blurb.textContent = s.blurb;
      },
    }, s.name)));
    this.card.replaceChildren(h('div', { class: 'intro rage-intro' },
      h('h2', {}, 'GNOMAGEDDON'),
      h('p', {}, 'Complete sentences. Capitals. Every comma. No hints, no keyboard map, no mercy. Your car only moves on the right key, and mistakes wreck your accuracy.'),
      h('div', { class: 'rage-driver' }, h('label', {}, 'Driver'), input),
      tabs, blurb,
      this.lengthPicker(),
      h('p', { class: 'small' }, `Score = WPM × accuracy². 80 WPM at 95% scores ${scoreOf(80, 95)}; at 85% it's only ${scoreOf(80, 85)}. ${online() ? 'Every finished race goes on the leaderboard.' : 'Scores are saved in this browser only, until the leaderboard is set up (see leaderboard/README.md).'}`),
      h('div', { class: 'row' },
        button('Start your engines! (Enter)', () => this.countdown(), 'gold big'),
        button('🏆 Leaderboard (L)', () => this.openBoard(), ''),
        button('Garden (Esc)', () => this.leave(), ''))));
    if (!p.initials) setTimeout(() => input.focus(), 50);
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    if (!this.prefs.initials) {
      this.game.say('Initials first, hotshot.', 2);
      if (this.phase === 'results') { this.phase = 'ready'; this.showReady(); }
      this.initialsInput?.focus();
      this.initialsInput?.classList.remove('oops'); void this.initialsInput?.offsetWidth; this.initialsInput?.classList.add('oops');
      return;
    }
    document.activeElement?.blur?.(); // keys belong to the race now, not the initials box
    super.countdown();
  }

  // ---------- the text ----------
  beginText() {
    this.feed = new SentenceFeed(this.prefs.series, LINE_WIDTH);
    this.srcEl = h('div', { class: 'rage-src' });
    this.card.prepend(this.srcEl);
    this.lineNext = this.feed.next();
    this.nextLine();
  }
  nextLine() {
    const now = this.lineNext;
    this.lineNext = this.feed.next();
    this.pad.setText(now.text, this.lineNext.text);
    this.srcEl.textContent = now.src || getSeries(this.prefs.series).name;
  }

  // ---------- carnage ----------
  overtook(r) {
    sfx.vroom(); sfx.bonk(); sfx.cheer();
    this.cheer = 1.6;
    this.sparks(new THREE.Vector3(10, 6, r.car.group.position.z / 2), 18);
    this.fx.word(r.car.group.position.clone().add(new THREE.Vector3(0, 34, 0)), pick(SMASH_WORDS), '#ff4a2e');
    r.jolt = 0.6;
    this.shake = 0.35;
    if (Math.random() < 0.7) this.taunt('raceOvertake', 2);
  }
  gotPassed(r) {
    sfx.bonk();
    this.sparks(new THREE.Vector3(0, 6, r.car.group.position.z / 2), 10);
    this.wobble = 0.35;
    this.shake = 0.25;
    if (Math.random() < 0.5) this.taunt('racePassed', 2);
  }
  sparks(pos, n) {
    for (let i = 0; i < n; i++) {
      this.fx.cube(pos, pick(['#ffd23f', '#ff8a2a', '#fff4c0', '#ff4a2e']), {
        vel: new THREE.Vector3((Math.random() - 0.3) * 90, 15 + Math.random() * 35, (Math.random() - 0.5) * 50),
        gravity: -140, drag: 0.96, life: 0.55 + Math.random() * 0.3, s0: 1.3, s1: 0.2, spin: 8,
      });
    }
  }

  update(dt) {
    super.update(dt);
    const k = Math.min(1, this.speed / 300);
    // rivals rock after a smash
    for (const r of this.rivals) {
      r.jolt = Math.max(0, (r.jolt || 0) - dt);
      r.car.lean.rotation.x = r.jolt > 0 ? 0.14 * r.jolt * Math.sin(r.jolt * 45) : 0;
    }
    // the camera takes a hit too
    this.shake = Math.max(0, (this.shake || 0) - dt);
    if (this.shake > 0) { this.camera.position.x += (Math.random() - 0.5) * 8 * this.shake; this.camera.position.y += (Math.random() - 0.5) * 8 * this.shake; }
    // exhaust flames, bigger the faster you go
    if (this.phase === 'play' && k > 0.1) {
      this.flameAt = (this.flameAt || 0) - dt * (6 + k * 30);
      if (this.flameAt <= 0) {
        this.flameAt = 1;
        this.fx.cube(new THREE.Vector3(-33, 7, 0), Math.random() < 0.5 ? '#ffb347' : '#ff5a3a', { vel: new THREE.Vector3(-30 - k * 40, 2 + Math.random() * 4, (Math.random() - 0.5) * 4), drag: 0.9, life: 0.3, s0: 0.6 + k * 1.2, s1: 0.1 });
      }
    }
  }

  // ---------- the flag ----------
  finish() {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    this.phase = 'results';
    this.pad.pause();
    this.coast = 0; this.coastV = null;
    const secs = Math.max(1, this.elapsed);
    const wpm = Math.round(this.chars / 5 / (secs / 60));
    const acc = this.pad.accuracy;
    const score = scoreOf(wpm, acc);
    this.finalWpm = wpm;
    for (const r of this.rivals) { r.final = this.rivalDist(r, secs); r.roll = null; }
    const rows = this.standings();
    const place = rows.findIndex((r) => r.me) + 1;
    const logged = !this.quitted && this.chars > 0;
    this.updateBoard(true);
    sfx.fanfare();
    if (place === 1) { sfx.cheer(); this.cheer = 4; }
    this.fx.confetti(gnome.headTop(), 40);
    gnome.act('cheer');
    this.taunt(place === 1 ? 'raceWin' : 'raceEnd', 4);

    const status = h('div', { class: 'rage-status' }, logged ? 'Posting to the leaderboard...' : this.quitted ? 'Quitters don\'t make the leaderboard.' : 'No keys, no score.');
    const boards = h('div', { class: 'rage-boards' });
    this.card.replaceChildren(h('div', { class: 'results rage-results' },
      h('h2', {}, this.quitted ? 'Pit stop!' : `${MEDAL[place - 1]} ${ordinal(place)} place, ${this.prefs.initials}!`),
      h('div', { class: 'race-wpm' }, h('b', {}, score), ' pts'),
      h('div', { class: 'res-grid' },
        h('div', {}, 'Speed', h('b', {}, `${wpm} WPM`)),
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Finished', h('b', {}, `${ordinal(place)} of ${rows.length}`)),
        h('div', {}, 'Race', h('b', {}, lenLabel(this.secs)))),
      status, boards,
      this.lengthPicker(),
      h('div', { class: 'row' },
        button('Race again! (Enter)', () => this.countdown(), 'gold'),
        button('Change driver or text', () => { this.phase = 'ready'; this.showReady(); }, ''),
        button('🏆 Leaderboard (L)', () => this.openBoard(), ''),
        button('Garden (Esc)', () => this.leave(), ''))));

    const who = this.prefs.initials;
    const show = (id) => this.fillBoards(boards, who, id);
    if (!logged) { show(null); return; }
    submitScore({ initials: who, wpm, acc, secs: this.secs, series: this.prefs.series, place }).then((res) => {
      if (res.queued) { status.textContent = 'Couldn\'t reach the leaderboard. Saved; it\'ll post after your next race.'; show(null); return; }
      const best = res.isBest
        ? (res.prevBest ? ` NEW PERSONAL BEST (was ${res.prevBest.score})!` : ' First race on the board!')
        : ` Your best: ${res.prevBest.score}.`;
      status.replaceChildren(h('b', {}, `#${res.rank} of ${res.of}`), ` all-time at ${lenLabel(this.secs)}.${best}`);
      status.classList.toggle('pb', res.isBest);
      if (res.isBest && res.prevBest) { sfx.cheer(); this.cheer = 4; this.taunt('newBest', 4); }
      if (res.isBest) { this.myBest = res.entry; this.bestPill.textContent = this.bestText(); }
      show(res.entry.id);
    }).catch((e) => { status.textContent = `Couldn't post the score: ${e.message}`; show(null); });
  }

  // Top 10 at this length next to this driver's last 10.
  fillBoards(el, who, hi) {
    const secs = this.secs;
    Promise.all([topScores(secs, 10), getHistory(who, 10)]).then(([top, mine]) => {
      el.replaceChildren(
        h('div', {}, h('h3', {}, `Top 10 · ${lenLabel(secs)}`), table(top.rows, TOP_COLS.filter(([t]) => t !== 'Length' && t !== 'When'), { hi })),
        h('div', {}, h('h3', {}, mine.rows.length === 1 ? `${who}'s last race` : `${who}'s last ${mine.rows.length} races`), table(mine.rows, HISTORY_COLS.filter(([t]) => t !== 'Text'), { hi })));
    }).catch((e) => el.replaceChildren(h('p', { class: 'small' }, `Couldn't load the leaderboard: ${e.message}`)));
  }

  // The full leaderboard: top scores by length, and anyone's history (click a row).
  openBoard() {
    if (this.modal) return;
    let secs = this.raceSecs, who = this.prefs.initials;
    const topEl = h('div'), histEl = h('div');
    const lens = [[0, 'All'], ...LENGTHS.map((s) => [s, lenLabel(s)])];
    const tabs = h('div', { class: 'tabs' }, ...lens.map(([s, label]) => h('button', {
      class: 'tab' + (s === secs ? ' on' : ''),
      onclick: () => { sfx.click(); secs = s; tabs.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('on', lens[i][0] === s)); loadTop(); },
    }, label)));
    const loadTop = () => {
      topEl.replaceChildren(h('p', { class: 'small' }, 'Loading...'));
      topScores(secs, 25).then((res) => topEl.replaceChildren(table(res.rows, TOP_COLS, { onRow: (r) => { who = r.initials; loadHist(); } })))
        .catch((e) => topEl.replaceChildren(h('p', { class: 'small' }, `Couldn't load: ${e.message}`)));
    };
    const loadHist = () => {
      if (!who) { histEl.replaceChildren(h('p', { class: 'small' }, 'Click a row to see that driver\'s races.')); return; }
      histEl.replaceChildren(h('p', { class: 'small' }, 'Loading...'));
      getHistory(who, 30).then((res) => {
        const bests = LENGTHS.map((s) => res.stats.best[s]).filter(Boolean);
        histEl.replaceChildren(
          h('h3', {}, `${who}: ${res.stats.races} race${res.stats.races === 1 ? '' : 's'}`),
          bests.length ? h('p', { class: 'small' }, 'Bests: ' + bests.map((b) => `${lenLabel(b.secs)} ${b.score} pts (${b.wpm} WPM, ${b.acc}%)`).join(' · ')) : null,
          table(res.rows, HISTORY_COLS, { empty: `No races for ${who} yet.` }));
      }).catch((e) => histEl.replaceChildren(h('p', { class: 'small' }, `Couldn't load: ${e.message}`)));
    };
    this.modal = modal(h('div', { class: 'rage-board-modal' },
      h('h2', {}, '🏆 GNOMAGEDDON LEADERBOARD'),
      h('p', { class: 'small' }, online() ? 'Everyone\'s best races. Score = WPM × accuracy².' : 'This browser only, for now. Score = WPM × accuracy².'),
      tabs, topEl, histEl), { onClose: () => { this.modal = null; } });
    loadTop(); loadHist();
  }

  // ---------- keys ----------
  quit() {
    if (this.phase === 'play' || this.phase === 'countdown') super.quit();
    else this.leave();
  }
  onKey(e) {
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Escape') { this.leave(); return; }
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); this.openBoard(); return; }
    }
    super.onKey(e);
  }
}
