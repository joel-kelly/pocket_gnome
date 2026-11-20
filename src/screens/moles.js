// Mole Patrol: an arcade-style mole board with 9 holes. Moles pop up with a
// word sign in front of their hole. Type the word and the squeaky mallet bonks
// the mole back down. The mole that's been up the
// longest is always the one to type, so there's no picking. Moles left waiting
// too long nibble a carrot. Keep at least one carrot until the moles give up!
import * as THREE from '../../vendor/three.module.min.js';
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, buildGlazed, hash3 } from '../voxel.js';
import { addLights, skyTexture } from '../world.js';
import { FX } from '../fx.js';
import { VEGGIES, moleModel } from '../veggies.js';
import { TextPicker } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';
import { pace, tunePace } from '../pace.js';

const GAP_X = 16, GAP_Z = 20;
const HOLES = [];
for (const z of [-GAP_Z, 0, GAP_Z]) for (const x of [-GAP_X, 0, GAP_X]) HOLES.push([x, z]);
const HOLE_R = 4.8;
const MALLET_L = 13;   // handle length
const MALLET_P = 9.5;  // pivot height: the head lands on a popped-up mole's head
const CARROTS = 5;
const ROUND_SECONDS = 120; // hold out this long and the moles give up
const HIDE_Y = -16; // below the hole floor, out of sight

export class MolesScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  build() {
    const scene = this.scene = new THREE.Scene();
    scene.background = skyTexture('#9fd0ee', '#cfe8d8', '#6aac4b');
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 800);
    this.camera.position.set(0, 150, 118);
    this.camera.lookAt(0, -4, 6);
    addLights(scene, this.game.world.renderer, { sunPos: [30, 80, 50], shadowSize: 110 });
    this.fx = new FX(scene);

    // The lawn around the board: a pixel-grass texture plus tufts, flowers and molehills.
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const cx = c.getContext('2d');
    const greens = ['#5aa84a', '#62b04f', '#4f9a3f', '#6abf55', '#579f45'];
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      cx.fillStyle = greens[Math.floor(hash3(x, y, 3) * greens.length)];
      cx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ map: tex }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = -12;
    lawn.receiveShadow = true;
    scene.add(lawn);
    const deco = new VoxelModel(null);
    const petals = ['#f19bc0', '#ffffff', '#e8513a', '#9a7ae0', '#ffb347', '#6fb6ff'];
    for (let i = 0; i < 260; i++) {
      const x = Math.round((hash3(i, 1, 9) - 0.5) * 300), z = Math.round((hash3(i, 2, 9) - 0.5) * 240);
      if (Math.abs(x) < 33 && z > -34 && z < 46) continue; // keep clear of the board
      const r = hash3(i, 3, 9), y0 = -12;
      if (r < 0.45) { // grass tuft
        for (const [dx, h] of [[0, 3], [1, 2], [-1, 2]]) for (let y = 0; y < h; y++) deco.set(x + dx, y0 + y, z, y === h - 1 ? '#7fcf5f' : '#4f9a3f');
      } else if (r < 0.8) { // flower
        for (let y = 0; y < 3; y++) deco.set(x, y0 + y, z, '#3f8a35');
        const col = petals[Math.floor(hash3(i, 4, 9) * petals.length)];
        deco.set(x, y0 + 3, z, '#f4d03f');
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) deco.set(x + dx, y0 + 3, z + dz, col);
      } else if (r < 0.9) { // toadstool
        for (let y = 0; y < 2; y++) deco.set(x, y0 + y, z, '#f3e8d0');
        deco.cyl(x + 0.5, z + 0.5, 2.2, y0 + 2, y0 + 3, (xx, yy, zz) => (hash3(xx, yy, zz) < 0.25 ? '#ffffff' : '#d23c3a'));
        deco.set(x, y0 + 3, z, '#d23c3a');
      } else { // molehill
        deco.sphere(x + 0.5, y0, z + 0.5, 4.5, (xx, yy, zz) => (hash3(xx, yy, zz) < 0.4 ? '#6b4a30' : '#7a5a3a'), 2.5);
      }
    }
    for (const [x, y, z] of [...deco.each()]) if (y < -12) deco.delete(x, y, z);
    const decoMesh = buildMesh(deco, { jitter: 0.06 });
    decoMesh.receiveShadow = true;
    scene.add(decoMesh);

    // The board: green felt on top, painted wood around the edge, a hole for each mole.
    const b = new VoxelModel(null);
    const W = 27, D0 = -28, D1 = 40;
    b.box(-W, -12, D0, W, 0, D1, (x, y, z) => {
      const edge = x <= -W + 2 || x >= W - 3 || z <= D0 + 2 || z >= D1 - 3;
      if (y === -1) return edge ? (Math.floor((x + z) / 3) % 2 ? '#c8323a' : '#f4d03f') : (hash3(x, 0, z) < 0.3 ? '#4f9a3f' : '#5aa84a');
      return Math.floor(y / 3) % 2 ? '#8a5a30' : '#a8743f';
    });
    for (const [hx, hz] of HOLES) for (let x = hx - 6; x <= hx + 6; x++) for (let z = hz - 6; z <= hz + 6; z++) {
      const d = Math.hypot(x + 0.5 - hx, z + 0.5 - hz);
      if (d <= HOLE_R) for (let y = -11; y < 0; y++) b.delete(x, y, z);
      else if (d <= HOLE_R + 1.2) b.set(x, 0, z, hash3(x, 1, z) < 0.4 ? '#6b4a30' : '#7a5a3a'); // dirt rim
    }
    for (const [hx, hz] of HOLES) b.cyl(hx, hz, HOLE_R + 0.5, -12, -11, '#1a120a'); // dark hole bottoms
    const board = buildMesh(b, { jitter: 0.05 });
    board.receiveShadow = true;
    scene.add(board);

    this.holes = HOLES.map(([x, z]) => {
      const mole = buildGlazed(moleModel());
      mole.position.set(x, HIDE_Y, z);
      scene.add(mole);
      return { x, z, mole, state: 'down', y: HIDE_Y, t: 0, word: '', since: 0, patience: 0, wait: 0 };
    });
    this.carrots = [];
    for (let i = 0; i < CARROTS; i++) {
      const c = buildGlazed(VEGGIES.carrot());
      c.position.set(-18 + i * 9, 0, 33);
      c.rotation.z = 0.15;
      scene.add(c);
      this.carrots.push(c);
    }

    // The squeaky toy mallet. Pivot at the grip; the head points along -x.
    const mm = new VoxelModel(null);
    mm.box(-MALLET_L, -1, -1, 0, 1, 1, (x) => (x > -4 ? '#c8323a' : '#e8c97a'));
    for (let x = -MALLET_L - 5; x <= -MALLET_L + 4; x++) for (let y = -4; y <= 3; y++) for (let z = -4; z <= 3; z++) {
      const dx = x + 0.5 + MALLET_L + 0.5, dy = y + 0.5;
      if (Math.abs(dx) <= 4.5 && Math.hypot(dy, z + 0.5) <= 3.1) mm.set(x, y, z, Math.abs(dx) > 3.5 ? '#f4d03f' : '#e8513a');
    }
    this.mallet = new THREE.Group();
    this.mallet.add(buildGlazed(mm));
    scene.add(this.mallet);
    this.mal = { x: 0, z: 0, lift: 0.9, strike: null };
  }

  enter() {
    if (!this.scene) this.build();
    this.game.world.active = { scene: this.scene, camera: this.camera };
    this.game.world.resize();
    this.bubbleOK = false; // the gnome isn't on screen here
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
    this.camera.clearViewOffset();
    this.game.world.active = null;
    this.game.world.resize();
    this.fx.clear();
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
      h('p', {}, 'Moles are popping up all over the garden, and they\'re after our carrots! Each mole has a word sign. Type the word and the mallet bonks the mole back down. The glowing sign is the one to type.'),
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
    if (ok) { sfx.key(this.pad.i); return; }
    sfx.wrongKey();
    this.streak = 0;
    // the waiting mole giggles at the typo
    if (this.target) this.target.giggle = 0.4;
  }

  // Word typed: swing the mallet. The mole goes down when the mallet lands (see bonk).
  boop() {
    const hl = this.target;
    if (!hl || this.phase !== 'play') return;
    hl.state = 'bonking';
    hl.t = 0;
    this.boops++;
    this.streak = this.pad.stats.wrong === this.lastWrong ? this.streak + 1 : 1;
    this.lastWrong = this.pad.stats.wrong;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    // Jump the mallet straight over this mole and swing.
    this.mal.x = hl.x; this.mal.z = hl.z;
    this.mal.strike = { hl, t: 0, hit: false };
    sfx.whoosh();
    this.updatePills();
    this.pickTarget(true);
  }

  // The mallet lands on the mole's head.
  bonk(hl) {
    const fx = this.fx;
    hl.state = 'booped';
    hl.t = 0;
    sfx.bonk();
    sfx.squeak();
    sfx.word(this.streak);
    const head = new THREE.Vector3(hl.x, 7, hl.z);
    const stars = ['#ffe14d', '#fff4a8', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fx.cube(head.clone(), stars[i % 3], { vel: new THREE.Vector3(Math.cos(a) * 16, 6 + Math.random() * 6, Math.sin(a) * 16), gravity: -30, drag: 0.92, life: 0.6, s0: 1.1, s1: 0.2, spin: 8 });
    }
    if (this.streak > 0 && this.streak % 5 === 0) { sfx.combo(this.streak); this.fx.confetti(head, 20); }
  }

  // A mole waited too long and nibbles a carrot.
  steal(hl) {
    const fx = this.fx;
    hl.state = 'stealing';
    hl.t = 0;
    const c = this.carrots[this.carrotsLeft - 1];
    if (c) { c.visible = false; fx.puff(c.position.clone().add(new THREE.Vector3(0, 3, 0)), 6, '#f0943e'); }
    this.carrotsLeft--;
    sfx.chomp();
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
      if (hl.state === 'rising') { hl.y = HIDE_Y + (0 - HIDE_Y) * Math.sin(Math.min(1, hl.t / 0.3) * Math.PI / 2); if (hl.t >= 0.3) { hl.state = 'up'; hl.t = 0; } }
      else if (hl.state === 'up') hl.y = 0.3 * Math.sin(t * 4 + hl.x);
      else if (hl.state === 'bonking') hl.y = 0;
      else if (hl.state === 'booped' || hl.state === 'stealing') {
        hl.y = hl.state === 'booped' && hl.t < 0.12 ? 0 : Math.max(HIDE_Y, -(hl.t - (hl.state === 'booped' ? 0.12 : 0)) * 70);
        if (hl.y <= HIDE_Y) { hl.state = 'down'; hl.word = ''; }
      }
      hl.giggle = Math.max(0, (hl.giggle || 0) - dt);
      const squish = hl.state === 'booped' ? 1 - 0.45 * Math.max(0, 1 - hl.t * 3) : 1 + 0.08 * Math.sin(hl.giggle * 40) * (hl.giggle / 0.4);
      hl.mole.position.y = hl.y;
      hl.mole.scale.set(1 / Math.sqrt(squish), squish, 1 / Math.sqrt(squish));
      this.placeSign(hl);
    }
    this.updateMallet(dt, t);
    this.fx.update(dt);
    this.frame();
  }

  // The mallet hovers over the mole to type, and swings down when a word is done.
  updateMallet(dt, t) {
    const M = this.mal;
    const g = this.mallet;
    const s = M.strike;
    let lift;
    if (s) {
      s.t += dt;
      if (s.t < 0.09) lift = 0.95 * (1 - s.t / 0.09);                     // swing down
      else if (s.t < 0.2) { lift = 0; if (!s.hit) { s.hit = true; this.bonk(s.hl); } } // whack!
      else if (s.t < 0.45) lift = 0.95 * ((s.t - 0.2) / 0.25);              // back up
      else { M.strike = null; lift = 0.95; }
    } else {
      const tgt = this.target;
      if (tgt) { M.x += (tgt.x - M.x) * Math.min(1, dt * 10); M.z += (tgt.z - M.z) * Math.min(1, dt * 10); }
      lift = 0.95 + 0.05 * Math.sin(t * 3);
    }
    g.visible = this.phase === 'play' || !!s;
    g.position.set(M.x + MALLET_L + 0.5, MALLET_P, M.z);
    g.rotation.set(0, 0, -lift);
  }

  // Keep the board in the space left of the typing card.
  frame() {
    const w = innerWidth, h = innerHeight;
    const card = this.card?.getBoundingClientRect();
    const right = card && card.width ? card.left : w;
    const shift = w / 2 - right / 2;
    const v = this.camera.view;
    if (!v || v.offsetX !== shift || v.fullWidth !== w || v.fullHeight !== h) this.camera.setViewOffset(w, h, shift, 0, w, h);
  }

  // Each mole that's up has its word sign in front of its hole.
  placeSign(hl) {
    const show = this.phase === 'play' && (hl.state === 'up' || hl.state === 'rising');
    hl.sign.classList.toggle('hidden', !show);
    if (!show) return;
    const p = this.game.world.toScreen(new THREE.Vector3(hl.x, 0, hl.z + HOLE_R + 1.5), this.camera);
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
    const { S } = this.game;
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
    if (won) { sfx.fanfare(); this.fx.confetti(new THREE.Vector3(0, 10, 0), 50); }
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
