// Beet the Clock: 60 seconds in the veggie patch. Every word plants a seed that
// pops up as a veggie. Fast words grow big ones; five clean words in a row grow
// a golden beet. Fill the patch and the gnome harvests it so you can keep going.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, buildGlazed, disposeGlazed } from '../voxel.js';
import { VEGGIES, VEGGIE_NAMES, plotModel } from '../veggies.js';
import { TextPicker, target } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';
import { enterGarden, leaveGarden } from './gardenRound.js';

const ROUND_SECONDS = 60;
const COLS = 6, ROWS = 4, GAP = 6;
const X0 = -13, Z0 = 0; // first plot (back left)
const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

export class BeetScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.models = {};
  }
  get state() { return this.game.state; }

  buildPatch() {
    const soil = new VoxelModel(null);
    this.plots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = X0 + c * GAP, z = Z0 + r * GAP;
      for (const [px, py, pz, col] of plotModel().each()) soil.set(px + x, py - 1, pz + z, col);
      this.plots.push({ x, z, veg: null });
    }
    this.patch = new THREE.Group();
    const mesh = buildMesh(soil, { jitter: 0.08 });
    mesh.receiveShadow = true;
    this.patch.add(mesh);
    this.patch.position.y = 0.05;
  }

  model(name) { return (this.models[name] ||= VEGGIES[name]()); }

  enter() {
    enterGarden(this.game, [2, 0, -14]);
    if (!this.patch) this.buildPatch();
    this.game.world.scene.add(this.patch);
    this.clearPatch();
    this.phase = 'ready';
    this.card = h('div', { class: 'type-card' });
    this.timePill = h('div', { class: 'pill' }, `⏱ ${ROUND_SECONDS}`);
    this.countPill = h('div', { class: 'pill' }, '🥕 0');
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.beet || 0}`);
    this.root.replaceChildren(h('div', { class: 'type-screen' },
      h('div', { class: 'g-top' }, h('div', { class: 'pill title' }, '🥕 BEET THE CLOCK'), this.timePill, this.countPill, this.bestPill,
        button('Quit', () => this.quit(), 'small red')),
      this.card));
    this.showReady();
    this.game.line('beetStart', 4);
  }
  exit() {
    this.pad?.destroy();
    clearInterval(this.cdTimer);
    this.clearPatch();
    this.game.world.scene.remove(this.patch);
    leaveGarden(this.game);
    this.root.innerHTML = '';
  }

  clearPatch() {
    for (const p of this.plots || []) {
      if (p.veg) { this.game.world.scene.remove(p.veg.mesh); disposeGlazed(p.veg.mesh); p.veg = null; }
    }
  }

  showReady() {
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, 'Beet the Clock!'),
      h('p', {}, 'You have 60 seconds. Every word you type plants a seed, and up pops a veggie! Quick words grow BIG veggies. Five clean words in a row grow a golden beet.'),
      h('p', { class: 'small' }, `Biggest harvest: ${this.state.best.beet || 0} veggies`),
      h('div', { class: 'row' }, button('Ready, set, GROW! (Enter)', () => this.countdown(), 'gold big'))));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.clearPatch();
    this.countPill.textContent = '🥕 0';
    this.timePill.textContent = `⏱ ${ROUND_SECONDS}`;
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'GROW!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--; show();
      if (n > 0) sfx.tick();
      else { clearInterval(this.cdTimer); sfx.go(); setTimeout(() => this.start(), 300); }
    }, 650);
  }

  start() {
    this.picker = new TextPicker(this.state);
    this.timeLeft = ROUND_SECONDS;
    this.grown = 0; this.golden = 0; this.streak = 0; this.bestStreak = 0; this.wrongRow = 0; this.quitted = false;
    this.next = 0;
    this.phase = 'play';
    this.pad?.destroy();
    this.pad = new TypePad({
      state: this.state,
      onKey: (k) => this.onPadKey(k),
      onWord: (w) => this.plant(w),
      onLine: () => this.nextLine(),
    });
    this.card.replaceChildren(this.pad.el);
    this.queue = [this.picker.line(22), this.picker.line(22)];
    this.pad.setText(this.queue[0], this.queue[1]);
  }
  nextLine() {
    this.queue.shift();
    this.queue.push(this.picker.line(22));
    this.pad.setText(this.queue[0], this.queue[1]);
  }

  onPadKey({ ok }) {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    if (ok) { sfx.key(this.pad.i); this.wrongRow = 0; return; }
    sfx.wrongKey();
    this.wrongRow++;
    if (this.wrongRow >= 3) { this.wrongRow = 0; gnome.act('oops'); this.game.line('typeWrong', 2); }
    else if (!gnome.busy) gnome.act('totter');
  }

  // A finished word plants the next seed.
  plant({ word, secs, clean }) {
    if (this.phase !== 'play') return;
    const { gnome, fx, world } = this.game;
    this.streak = clean ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (this.next >= this.plots.length) this.harvest();
    const plot = this.plots[this.next++];
    const gold = this.streak > 0 && this.streak % 5 === 0;
    const name = gold ? 'golden' : VEGGIE_NAMES[Math.floor(Math.random() * VEGGIE_NAMES.length)];
    // Quick words (per letter) grow bigger veggies.
    const perKey = secs / Math.max(1, word.length + 1);
    const size = gold ? 1.35 : perKey <= target(this.state) * 0.6 ? 1.3 : perKey <= target(this.state) ? 1.1 : 0.9;
    const mesh = buildGlazed(this.model(name));
    mesh.position.set(plot.x, 0, plot.z);
    mesh.scale.setScalar(0.001);
    mesh.rotation.y = Math.random() * 6;
    world.scene.add(mesh);
    plot.veg = { mesh, t: 0, size };
    this.grown++;
    if (gold) this.golden++;
    this.countPill.textContent = `🥕 ${this.grown}`;
    fx.crumbs(new THREE.Vector3(plot.x, 1, plot.z), '#6b4a30', 6);
    sfx.word(this.streak);
    if (gold) {
      sfx.combo(this.streak);
      fx.sparkles(new THREE.Vector3(plot.x, 4, plot.z), 8);
      gnome.act('spin');
      this.game.line('beetGolden', 2.5);
    } else if (!gnome.busy) gnome.act('hop');
    if (!gold && Math.random() < 0.12) this.game.line('beetGrow', 2);
  }

  // The patch is full: pull everything up and start again.
  harvest() {
    const { fx, gnome } = this.game;
    for (const p of this.plots) if (p.veg) fx.puff(new THREE.Vector3(p.x, 2, p.z), 2, '#9ad87a');
    this.clearPatch();
    this.next = 0;
    sfx.buy();
    gnome.act('cheer');
    toast('🧺 Harvest! The patch is ready for more!');
  }

  update(dt) {
    for (const p of this.plots || []) {
      const v = p.veg;
      if (!v) continue;
      v.t += dt;
      const k = Math.min(1, v.t / 0.6);
      v.mesh.scale.setScalar(Math.max(0.001, v.size * easeOutBack(k)));
      v.mesh.rotation.z = 0.05 * Math.sin(v.t * 2 + p.x);
    }
    if (this.phase === 'play') {
      this.timeLeft -= dt;
      this.timePill.textContent = `⏱ ${Math.max(0, Math.ceil(this.timeLeft))}`;
      this.timePill.classList.toggle('hot', this.timeLeft < 10);
      if (this.timeLeft <= 0) this.finish();
    }
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.finish(); }
    else this.game.go('home');
  }

  finish() {
    if (this.phase !== 'play') return;
    const { gnome, S, fx } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.pad.pause();
    const newBest = this.grown > (s.best.beet || 0);
    let acorns = this.grown + this.golden * 2;
    if (newBest && this.grown > 0) { acorns += 8; s.best.beet = this.grown; }
    S.addAcorns(acorns);
    s.history.push({ t: Date.now(), game: 'beet', words: this.pad.stats.words, acc: this.pad.accuracy, wpm: this.pad.wpm, score: this.grown });
    if (s.history.length > 200) s.history.shift();
    if (this.pad.stats.right > 0) S.addStat('joy', 10);
    S.save();
    this.bestPill.textContent = `Best: ${s.best.beet || 0}`;
    sfx.fanfare();
    fx.confetti(gnome.headTop(), 30);
    gnome.act('cheer');
    this.game.line(newBest ? 'newBest' : 'beetEnd', 4);
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, this.quitted ? 'Harvest time!' : "Time's up!"),
      h('p', {}, `You grew ${this.grown} veggies${this.golden ? `, including ${this.golden} golden beet${this.golden > 1 ? 's' : ''}` : ''}!`),
      newBest && this.grown > 0 ? h('div', { class: 'res-best' }, 'BIGGEST HARVEST EVER! +8 🌰') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Veggies', h('b', {}, this.grown)),
        h('div', {}, 'Accuracy', h('b', {}, this.pad.accuracy + '%')),
        h('div', {}, 'Words per minute', h('b', {}, this.pad.wpm || '-')),
        h('div', {}, 'Clean in a row', h('b', {}, this.bestStreak)),
        h('div', { class: 'gold' }, 'Acorns', h('b', {}, `🌰 ${acorns}`))),
      h('div', { class: 'row' },
        button('Grow again! (Enter)', () => this.countdown(), 'gold'),
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
