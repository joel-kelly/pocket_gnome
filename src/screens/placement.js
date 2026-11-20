// Placement check: "Let's see what your fingers already know!"
// One short line per stage group. A line typed accurately and steadily marks
// those keys solid, so a kid who has practiced at school doesn't start at F and J.
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGES, MAX_STAGE, GNOME_ROW_STAGE, keysUpTo } from '../typing/keys.js';
import { TextPicker, keyRecord, SOLID } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { keyList } from './games.js';

const PASS_ACCURACY = 0.9;  // at most 1 slip in 10 keys
const PASS_SECONDS = 1.6;   // average time per key (steady, not speedy)

// Groups of stages to check, in order.
function blocks() {
  const out = [{ from: 1, to: GNOME_ROW_STAGE, name: 'Gnome Row' }];
  for (let st = GNOME_ROW_STAGE + 1; st <= MAX_STAGE; st++) out.push({ from: st, to: st, name: STAGES[st - 1].name });
  return out;
}

export class PlacementScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  enter() {
    const { world, gnome } = this.game;
    world.active = null;
    world.setView('type');
    if (gnome.object.parent !== world.scene) world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    this.blocks = blocks();
    this.bi = 0;
    this.phase = 'intro';
    this.card = h('div', { class: 'type-card' });
    this.root.replaceChildren(h('div', { class: 'type-screen' }, this.card));
    this.intro();
  }
  exit() { this.pad?.destroy(); this.root.innerHTML = ''; }

  intro() {
    const s = this.state;
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, `Let's see what your fingers already know, ${s.kidName}!`),
      h('p', {}, 'Type a few short lines. Take your time: getting the keys right matters more than going fast. If a line feels tricky, that\'s where we\'ll start practicing.'),
      h('p', { class: 'small' }, 'Put your pointer fingers on the little bumps on F and J. That\'s Gnome Row!'),
      h('div', { class: 'row' },
        button('Start from the very beginning', () => this.finish(1), 'small'),
        button("Let's go! (Enter)", () => this.startBlock(), 'gold big'))));
    this.game.say("Don't worry, it's not a test! It's a gnome-work check. No pressure. Well, a little gnome-pressure.", 6);
  }

  startBlock() {
    this.phase = 'play';
    const b = this.blocks[this.bi];
    const focus = [];
    for (let st = b.from; st <= b.to; st++) focus.push(...STAGES[st - 1].keys.filter((k) => /^[a-z;]$/.test(k)));
    const picker = new TextPicker(this.state, { stage: b.to, focus, spells: b.to <= GNOME_ROW_STAGE ? 0.3 : 0.05 });
    // Make sure every new letter shows up at least once.
    let text = '';
    for (let tries = 0; tries < 30; tries++) {
      text = picker.line(b.to >= 14 ? 22 : 18);
      if (focus.every((k) => text.toLowerCase().includes(k))) break;
    }
    if (b.to === 14 && !/[A-Z]/.test(text)) text = text[0].toUpperCase() + text.slice(1);
    this.score = { right: 0, wrong: 0, times: [] };
    this.pad?.destroy();
    this.pad = new TypePad({
      state: this.state, stage: b.to, record: false,
      onKey: (k) => this.onPadKey(k),
      onLine: () => this.blockDone(),
    });
    const dots = h('div', { class: 'dots' }, ...this.blocks.map((_, i) => h('span', { class: 'dot' + (i < this.bi ? ' done' : i === this.bi ? ' cur' : '') })));
    this.card.replaceChildren(
      h('div', { class: 'tc-head' }, h('div', { class: 'tc-title' }, `Checking: ${b.name}`), dots,
        button('Stop here', () => this.finish(b.from), 'small')),
      this.pad.el);
    this.pad.setText(text);
  }

  onPadKey({ ok, secs, timed }) {
    if (ok) {
      sfx.key(this.pad.i);
      this.score.right++;
      if (timed) this.score.times.push(secs);
    } else {
      sfx.wrongKey();
      this.score.wrong++;
      if (!this.game.gnome.busy) this.game.gnome.act('totter');
    }
  }

  blockDone() {
    const b = this.blocks[this.bi];
    const { right, wrong, times } = this.score;
    const acc = right / Math.max(1, right + wrong);
    const avg = times.length ? times.reduce((a, c) => a + c, 0) / times.length : 9;
    const pass = acc >= PASS_ACCURACY && avg <= PASS_SECONDS;
    if (!pass) return this.finish(b.from);
    // These keys look solid: count them as solid (level 3) so practice moves on.
    for (let st = b.from; st <= b.to; st++) for (const k of STAGES[st - 1].keys) {
      const r = keyRecord(this.state, k);
      r.box = Math.max(r.box, SOLID);
      r.seen = Math.max(r.seen, 1);
    }
    sfx.word(this.bi * 2);
    this.game.gnome.act('hop');
    this.game.fx.sparkles(this.game.gnome.headTop(), 5);
    this.bi++;
    if (this.bi >= this.blocks.length) return this.finish(MAX_STAGE);
    this.phase = 'between';
    this.game.say(['Splendid!', 'Easy peasy, lemon squeezy!', 'Key-rrific!', 'You nailed it! Like a tiny garden fence!'][this.bi % 4], 1.5);
    setTimeout(() => this.startBlock(), 700);
  }

  finish(stage) {
    const { S, gnome, fx } = this.game;
    const s = this.state;
    this.phase = 'done';
    this.pad?.pause();
    s.stage = Math.max(1, stage);
    s.placed = true;
    // The first stage's lesson only matters if we start there.
    s.lastLessonStage = s.stage - 1;
    S.addAcorns(10);
    S.save();
    sfx.fanfare();
    gnome.act('cheer');
    fx.confetti(gnome.headTop(), 30);
    const st = STAGES[s.stage - 1];
    const known = keysUpTo(s.stage - 1).filter((k) => k !== 'Shift' && k.length === 1);
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, s.stage > 1 ? `Wow! You already know ${known.length} keys!` : "Let's start at the very beginning!"),
      h('p', {}, s.stage > 1
        ? `We'll start practicing ${keyList(st.keys)}. Keys you already know will keep showing up too.`
        : 'We\'ll start with F and J: the keys with the little bumps. Every typist starts there!'),
      h('p', { class: 'small' }, 'You earned 🌰 10 acorns for trying. Spend them at Gnome Depot!'),
      h('div', { class: 'row' }, button('Back to the garden (Enter)', () => this.done(), 'gold big'))));
    this.game.say(s.stage > GNOME_ROW_STAGE ? 'You can already type Gnome Row! I gnome you could do it!' : "Every great typist starts with F and J. It's the root of it all! Like a carrot!", 6);
  }

  done() { this.game.go('home', { say: 'Try Type & Play to meet your new keys!' }); }

  onKey(e) {
    if (this.phase === 'intro') { if (e.key === 'Enter') this.startBlock(); return; }
    if (this.phase === 'done') { if (e.key === 'Enter') this.done(); return; }
    if (this.phase === 'play') this.pad.key(e);
  }
}
