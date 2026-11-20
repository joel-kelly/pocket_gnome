// Mole Patrol: moles pop out of holes holding little word signs. Type a mole's
// word to boop it (gently, on the nose) back down. The mole that's been up the
// longest is always the one to type, so there's no picking. Moles left waiting
// too long nibble a carrot. Keep at least one carrot until the moles give up!
import * as THREE from '../../vendor/three.module.min.js';
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { buildGlazed } from '../voxel.js';
import { VEGGIES, moleModel, holeModel } from '../veggies.js';
import { TextPicker } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';
import { enterGarden, leaveGarden } from './gardenRound.js';
import { pace, tunePace } from '../pace.js';

const HOLES = [[-12, -2], [2, -4], [16, -2], [-12, 14], [2, 12], [16, 14]];
const CARROTS = 5;
const ROUND_SECONDS = 120; // hold out this long and the moles give up
const HIDE_Y = -7;

export class MolesScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  build() {
    this.group = new THREE.Group();
    this.holes = HOLES.map(([x, z]) => {
      const hole = buildGlazed(holeModel());
      hole.position.set(x, 0, z);
      hole.receiveShadow = true;
      const mole = buildGlazed(moleModel());
      mole.position.set(x, HIDE_Y, z);
      this.group.add(hole, mole);
      return { x, z, mole, state: 'down', y: HIDE_Y, t: 0, word: '', since: 0, patience: 0, wait: 0 };
    });
    this.carrots = [];
    for (let i = 0; i < CARROTS; i++) {
      const c = buildGlazed(VEGGIES.carrot());
      c.position.set(-10 + i * 6.5, 0, 28);
      this.group.add(c);
      this.carrots.push(c);
    }
  }

  enter() {
    enterGarden(this.game, [2, 0, -20]);
    if (!this.group) this.build();
    this.game.world.scene.add(this.group);
    this.reset();
    this.phase = 'ready';
    this.signs = h('div', { class: 'mole-signs' });
    this.card = h('div', { class: 'type-card' });
    this.boopPill = h('div', { class: 'pill' }, '🔨 0');
    this.carrotPill = h('div', { class: 'pill' }, '🥕'.repeat(CARROTS));
    this.timePill = h('div', { class: 'pill' }, `⏱ ${ROUND_SECONDS}`);
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.moles || 0}`);
    this.root.replaceChildren(this.signs, h('div', { class: 'type-screen' },
      h('div', { class: 'g-top' }, h('div', { class: 'pill title' }, '🐹 MOLE PATROL'), this.carrotPill, this.boopPill, this.timePill, this.bestPill,
        button('Quit', () => this.quit(), 'small red')),
      this.card));
    this.holes.forEach((hl) => { hl.sign = h('div', { class: 'mole-sign hidden' }); this.signs.append(hl.sign); });
    this.showReady();
    this.game.line('moleStart', 4);
  }
  exit() {
    this.pad?.destroy();
    clearInterval(this.cdTimer);
    this.game.world.scene.remove(this.group);
    leaveGarden(this.game);
    this.root.innerHTML = '';
  }

  reset() {
    for (const hl of this.holes) { hl.state = 'down'; hl.y = HIDE_Y; hl.mole.position.y = HIDE_Y; hl.word = ''; }
    this.carrots.forEach((c) => { c.visible = true; });
    this.carrotsLeft = CARROTS;
  }

  showReady() {
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, 'Mole Patrol!'),
      h('p', {}, 'Moles are popping up all over the garden, and they\'re after our carrots! Each mole holds a word. Type it to boop the mole back down. The glowing mole is the one to type.'),
      h('p', {}, `A mole that waits too long nibbles a carrot. Keep a carrot safe for ${ROUND_SECONDS / 60} minutes and the moles give up!`),
      h('p', { class: 'small' }, `Most moles booped: ${this.state.best.moles || 0}`),
      h('div', { class: 'row' }, button('Start the patrol! (Enter)', () => this.countdown(), 'gold big'))));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.reset();
    this.updatePills();
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'GO!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--; show();
      if (n > 0) sfx.tick();
      else { clearInterval(this.cdTimer); sfx.go(); setTimeout(() => this.start(), 300); }
    }, 650);
  }

  start() {
    this.picker = new TextPicker(this.state);
    this.pace = pace(this.state, 'moles');
    this.elapsed = 0; this.boops = 0; this.streak = 0; this.bestStreak = 0; this.wrongRow = 0; this.quitted = false;
    this.lastWrong = 0;
    this.spawnAt = 0.5;
    this.target = null;
    this.phase = 'play';
    this.pad?.destroy();
    this.pad = new TypePad({
      state: this.state,
      onKey: (k) => this.onPadKey(k),
      onLine: () => this.boop(),
    });
    this.waitEl = h('div', { class: 'mole-wait' }, 'Watch the holes...');
    this.card.replaceChildren(this.waitEl, this.pad.el);
    this.pad.setText('');
    this.updatePills();
  }

  updatePills() {
    this.carrotPill.textContent = '🥕'.repeat(this.carrotsLeft) + '·'.repeat(CARROTS - this.carrotsLeft);
    this.boopPill.textContent = `🔨 ${this.boops || 0}`;
  }

  spawn() {
    const free = this.holes.filter((hl) => hl.state === 'down');
    if (!free.length) return;
    const hl = free[Math.floor(Math.random() * free.length)];
    const used = new Set(this.holes.filter((x) => x.state !== 'down').map((x) => x.word));
    let word = this.picker.word();
    for (let i = 0; i < 5 && used.has(word); i++) word = this.picker.word();
    hl.word = word;
    hl.state = 'rising';
    hl.t = 0;
    hl.since = this.elapsed;
    // Patience: longer words get more time; moles get a bit less patient as the round goes on.
    hl.patience = ((5.5 + word.length * 1.0) / this.pace) * (1 - Math.min(0.3, this.elapsed / 400));
    hl.wait = 0;
    sfx.tap();
  }

  upMoles() { return this.holes.filter((hl) => hl.state === 'up' || hl.state === 'rising').sort((a, b) => a.since - b.since); }

  // The mole to type is always the one that's been up the longest.
  pickTarget(force = false) {
    const next = this.upMoles()[0] || null;
    if (next === this.target && !force) return;
    this.target = next;
    this.pad.setText(next ? next.word : '');
    this.waitEl.textContent = next ? 'Type the glowing mole\'s word!' : 'Watch the holes...';
  }

  onPadKey({ ok }) {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    if (ok) { sfx.key(this.pad.i); this.wrongRow = 0; return; }
    sfx.wrongKey();
    this.streak = 0;
    this.wrongRow++;
    if (this.wrongRow >= 3) { this.wrongRow = 0; gnome.act('oops'); this.game.line('typeWrong', 2); }
    else if (!gnome.busy) gnome.act('totter');
  }

  boop() {
    const hl = this.target;
    if (!hl || this.phase !== 'play') return;
    const { fx, gnome } = this.game;
    hl.state = 'booped';
    hl.t = 0;
    this.boops++;
    this.streak = this.pad.stats.wrong === this.lastWrong ? this.streak + 1 : 1;
    this.lastWrong = this.pad.stats.wrong;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const top = new THREE.Vector3(hl.x, hl.y + 8, hl.z);
    fx.word(top, 'BOOP!');
    fx.sparkles(top, 5);
    sfx.word(this.streak);
    sfx.squeak();
    if (this.streak > 0 && this.streak % 5 === 0) { sfx.combo(this.streak); gnome.act('spin'); }
    else if (!gnome.busy) gnome.act('hop');
    if (Math.random() < 0.25) this.game.line('moleBoop', 2);
    this.updatePills();
    this.pickTarget(true);
  }

  // A mole waited too long and nibbles a carrot.
  steal(hl) {
    const { fx, gnome } = this.game;
    hl.state = 'stealing';
    hl.t = 0;
    const c = this.carrots[this.carrotsLeft - 1];
    if (c) { c.visible = false; fx.puff(c.position.clone().add(new THREE.Vector3(0, 3, 0)), 6, '#f0943e'); }
    this.carrotsLeft--;
    sfx.chomp();
    gnome.act('slump');
    this.game.line('moleStole', 2.5);
    this.updatePills();
    if (this.target === hl) this.pickTarget(true);
    if (this.carrotsLeft <= 0) this.finish(false);
  }

  update(dt) {
    const t = performance.now() / 1000;
    if (this.phase === 'play') {
      this.elapsed += dt;
      const left = ROUND_SECONDS - this.elapsed;
      this.timePill.textContent = `⏱ ${Math.max(0, Math.ceil(left))}`;
      if (left <= 0) return this.finish(true);
      // More moles, and more often, as the round goes on.
      const maxUp = this.elapsed < 25 ? 1 : this.elapsed < 60 ? 2 : 3;
      this.spawnAt -= dt;
      if (this.spawnAt <= 0 && this.upMoles().length < maxUp) {
        this.spawn();
        this.spawnAt = Math.max(1.5, 4 - this.elapsed * 0.02) / this.pace;
      }
      for (const hl of this.holes) {
        if (hl.state === 'up') { hl.wait += dt; if (hl.wait >= hl.patience) this.steal(hl); }
      }
      this.pickTarget();
    }
    // mole motion
    for (const hl of this.holes) {
      hl.t += dt;
      if (hl.state === 'rising') { hl.y = HIDE_Y + (0 - HIDE_Y) * Math.min(1, hl.t / 0.35); if (hl.t >= 0.35) { hl.state = 'up'; hl.t = 0; } }
      else if (hl.state === 'up') hl.y = 0.3 * Math.sin(t * 4 + hl.x);
      else if (hl.state === 'booped' || hl.state === 'stealing') {
        hl.y = Math.max(HIDE_Y, -hl.t * 30);
        if (hl.y <= HIDE_Y) { hl.state = 'down'; hl.word = ''; }
      }
      const squish = hl.state === 'booped' ? 1 - 0.3 * Math.max(0, 1 - hl.t * 4) : 1;
      hl.mole.position.y = hl.y;
      hl.mole.scale.set(1 / Math.sqrt(squish), squish, 1 / Math.sqrt(squish));
      this.placeSign(hl);
    }
  }

  // The word sign floats above each mole that's up.
  placeSign(hl) {
    const show = this.phase === 'play' && (hl.state === 'up' || hl.state === 'rising');
    hl.sign.classList.toggle('hidden', !show);
    if (!show) return;
    const p = this.game.world.toScreen(new THREE.Vector3(hl.x, hl.y + 9, hl.z));
    hl.sign.style.left = p.x + 'px';
    hl.sign.style.top = p.y + 'px';
    const isTarget = hl === this.target;
    const typed = isTarget ? this.pad.i : 0;
    const key = `${hl.word}|${typed}|${isTarget}`;
    if (hl.signKey !== key) {
      hl.signKey = key;
      hl.sign.className = 'mole-sign' + (isTarget ? ' target' : '');
      hl.sign.replaceChildren(h('span', { class: 'done' }, hl.word.slice(0, typed)), hl.word.slice(typed), h('div', { class: 'pat' }, h('i')));
    }
    const left = Math.max(0, 1 - hl.wait / hl.patience);
    const bar = hl.sign.querySelector('.pat i');
    bar.style.width = left * 100 + '%';
    bar.classList.toggle('low', left < 0.3);
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.finish(false); }
    else this.game.go('home');
  }

  finish(won) {
    if (this.phase !== 'play') return;
    const { gnome, S, fx } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.pad.pause();
    for (const hl of this.holes) if (hl.state !== 'down') { hl.state = 'booped'; hl.t = 0; }
    const newBest = this.boops > (s.best.moles || 0);
    let acorns = this.boops + (won ? 10 : 0);
    if (newBest && this.boops > 0) { acorns += 5; s.best.moles = this.boops; }
    S.addAcorns(acorns);
    s.history.push({ t: Date.now(), game: 'moles', words: this.pad.stats.words, acc: this.pad.accuracy, wpm: this.pad.wpm, score: this.boops });
    if (s.history.length > 200) s.history.shift();
    if (!this.quitted && this.pad.stats.right >= 10) tunePace(s, 'moles', won ? 'great' : this.elapsed < 45 ? 'struggled' : 'ok');
    if (this.pad.stats.right > 0) S.addStat('joy', 10);
    S.save();
    this.bestPill.textContent = `Best: ${s.best.moles || 0}`;
    if (won) { sfx.fanfare(); fx.confetti(gnome.headTop(), 30); gnome.act('cheer'); }
    else gnome.act(this.quitted ? 'nod' : 'slump');
    this.game.line(won ? 'moleWin' : newBest ? 'newBest' : 'moleEnd', 4);
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, won ? 'The moles gave up!' : this.quitted ? 'Patrol over!' : 'Out of carrots!'),
      h('p', {}, `You booped ${this.boops} mole${this.boops === 1 ? '' : 's'}${won ? ` and saved ${this.carrotsLeft} carrot${this.carrotsLeft === 1 ? '' : 's'}` : ''}!`),
      newBest && this.boops > 0 ? h('div', { class: 'res-best' }, 'MOST MOLES EVER! +5 🌰') : null,
      won ? h('div', { class: 'res-best' }, 'CARROTS SAVED! +10 🌰') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Moles booped', h('b', {}, this.boops)),
        h('div', {}, 'Accuracy', h('b', {}, this.pad.accuracy + '%')),
        h('div', {}, 'Words per minute', h('b', {}, this.pad.wpm || '-')),
        h('div', {}, 'Clean in a row', h('b', {}, this.bestStreak)),
        h('div', { class: 'gold' }, 'Acorns', h('b', {}, `🌰 ${acorns}`))),
      h('div', { class: 'row' },
        button('Patrol again! (Enter)', () => this.countdown(), 'gold'),
        button('Home (Esc)', () => this.game.go('home'), ''))));
    afterRound(this.game);
  }

  onKey(e) {
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter') { e.preventDefault(); this.countdown(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (this.phase !== 'play') return;
    if (e.key === 'Escape') { this.quit(); return; }
    this.pad.key(e);
  }
}
