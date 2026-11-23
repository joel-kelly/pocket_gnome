// Crumpet Café: the gnome runs a little café under a toadstool. Woodland
// critters queue up at the counter and say their order ("two crumpets
// please"). Type the order and the gnome serves it. Quick, clean service
// earns tips. Critters who wait too long get grumpy and leave. How many can
// you serve before closing time?
import * as THREE from '../../vendor/three.module.min.js';
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, buildGlazed, disposeGlazed, hash3 } from '../voxel.js';
import { addLights, skyTexture, flower } from '../world.js';
import { FX } from '../fx.js';
import { getModel } from '../items.js';
import { CRITTERS } from '../critters.js';
import { TextPicker } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';
import { pace, tunePace } from '../pace.js';

const ROUND_SECONDS = 120;
// The counter runs front to back. The gnome stands on its left; customers
// line up on its right, with the queue going back toward the woods.
const GNOME_AT = [-11, 0, -3];
const GNOME_TURN = 0.9;
const COUNTER_TOP = 9;
const SERVE_AT = new THREE.Vector3(-1, COUNTER_TOP, 2);  // where the gnome puts the order down
const SPOTS = [[9, 3], [12, -10], [15, -23]];             // the queue, front first
const ENTRANCE = [24, -60];
const EXIT = [34, 40];
const WALK_SPEED = 20;

// ---------- the menu, and making orders out of it ----------
// Countable things ("two crumpets") and things that come in a cup/bowl/glass.
const MENU = [
  { id: 'crumpet', one: 'crumpet', many: 'crumpets', extras: ['with jam', 'with butter', 'with honey'] },
  { id: 'muffin', one: 'acorn muffin', many: 'acorn muffins' },
  { id: 'berrytart', one: 'berry tart', many: 'berry tarts' },
  { id: 'acorncookie', one: 'acorn cookie', many: 'acorn cookies' },
  { id: 'soup', unit: ['bowl', 'bowls'], what: 'mushroom soup' },
  { id: 'honeytoast', unit: ['slice', 'slices'], what: 'honey toast' },
  { id: 'dewtea', unit: ['cup', 'cups'], what: 'dewdrop tea', short: 'tea' },
  { id: 'lemonade', unit: ['glass', 'glasses'], what: 'lemonade' },
  { id: 'dandelionpop', unit: ['bottle', 'bottles'], what: 'dandelion pop' },
];
const QTY = [['a', 1], ['a', 1], ['one', 1], ['two', 2], ['three', 3]];
const pickOf = (a) => a[Math.floor(Math.random() * a.length)];

function orderPart(item) {
  const [word, n] = pickOf(QTY);
  if (item.unit) {
    if (n === 1 && Math.random() < 0.35) return { text: item.short && Math.random() < 0.5 ? `some ${item.short}` : item.what, n: 1 };
    return { text: `${word} ${item.unit[n > 1 ? 1 : 0]} of ${item.what}`, n };
  }
  const thing = n > 1 ? item.many : item.one;
  let text = `${word === 'a' && /^[aeiou]/.test(thing) ? 'an' : word} ${thing}`;
  if (item.extras && Math.random() < 0.35) text += ' ' + pickOf(item.extras);
  return { text, n };
}

// One order: one or two things, maybe a "please". Only uses unlocked keys,
// and leans toward orders full of the keys that need practice.
export function makeOrder(picker, critter, { maxLen = 24, two = 0 } = {}) {
  const ok = (t) => [...t].every((c) => c === ' ' || picker.letterSet.has(c));
  let best = null, bestScore = -1;
  for (let tries = 0; tries < 30; tries++) {
    const fav = pickOf(critter.likes);
    const first = (Math.random() < 0.45 && MENU.find((m) => m.id === fav)) || pickOf(MENU);
    const parts = [{ ...orderPart(first), id: first.id }];
    if (Math.random() < two) {
      const second = pickOf(MENU.filter((m) => m !== first));
      parts.push({ ...orderPart(second), id: second.id });
    }
    let text = parts.map((p) => p.text).join(' and ');
    const please = Math.random() < 0.55;
    if (please) text += ' please';
    if (!ok(text) || text.length > maxLen) continue;
    let sum = 0, max = 0;
    for (const c of text) if (c !== ' ') { const w = picker.weight(c); sum += w; max = Math.max(max, w); }
    const score = (max + sum / text.length) * (0.6 + Math.random() * 0.8);
    if (score > bestScore) { bestScore = score; best = { text, please, items: parts.map((p) => ({ id: p.id, n: p.n })) }; }
  }
  if (!best) best = { text: 'a crumpet', please: false, items: [{ id: 'crumpet', n: 1 }] };
  // Capitals and punctuation once those keys are unlocked.
  if (picker.capitals && Math.random() < 0.7) best.text = best.text[0].toUpperCase() + best.text.slice(1);
  if (picker.punct) {
    if (best.please && Math.random() < 0.6) best.text = best.text.replace(/ please$/, ', please');
    if (Math.random() < 0.7) best.text += '.';
  }
  return best;
}

// ---------- models ----------

export class CafeScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.models = {};
  }
  get state() { return this.game.state; }

  build() {
    const scene = this.scene = new THREE.Scene();
    scene.background = skyTexture('#ffd8b0', '#f6e8d0', '#cfe0b0');
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 800);
    this.camera.position.set(3, 58, 132);
    this.camera.lookAt(3, 12, -14);
    addLights(scene, this.game.world.renderer, { sunPos: [40, 80, 60], shadowSize: 90 });
    this.fx = new FX(scene);

    // Mossy clearing with flowers and little toadstools.
    const g = new VoxelModel(null);
    g.box(-130, -2, -110, 130, -1, 70, (x, y, z) => (hash3(x, 0, z) < 0.3 ? '#62b04f' : hash3(x, 1, z) < 0.5 ? '#5aa84a' : '#579f45'));
    const petals = ['#f19bc0', '#ffffff', '#e8513a', '#9a7ae0', '#ffb347', '#6fb6ff'];
    for (let i = 0; i < 200; i++) {
      const x = Math.round((hash3(i, 1, 4) - 0.5) * 240), z = Math.round(-100 + hash3(i, 2, 4) * 165);
      if (x > -30 && x < 34 && z > -70 && z < 26) continue; // keep the café clear
      const r = hash3(i, 3, 4);
      if (r < 0.55) flower(g, x, z, petals[Math.floor(hash3(i, 4, 4) * petals.length)], 2 + Math.floor(r * 4));
      else if (r < 0.8) for (const [dx, hh] of [[0, 3], [1, 2], [-1, 2]]) for (let y = 0; y < hh; y++) g.set(x + dx, y - 1, z, y === hh - 1 ? '#7fcf5f' : '#4f9a3f');
      else {
        for (let y = -1; y < 2; y++) g.set(x, y, z, '#f3e8d0');
        g.cyl(x + 0.5, z + 0.5, 2.4, 2, 3, (xx, yy, zz) => (hash3(xx, yy, zz) < 0.25 ? '#ffffff' : '#d23c3a'));
      }
    }
    // The wooden deck the café sits on
    g.box(-26, -1, -32, 24, 0, 20, (x, y, z) => {
      const plank = Math.floor((z + 32) / 4);
      if ((z + 32) % 4 === 0) return '#8a5a30';
      return hash3(plank, 0, Math.floor(x / 9 + plank)) < 0.5 ? '#c99a62' : '#b8884f';
    });
    const ground = buildMesh(g, { jitter: 0.06 });
    ground.receiveShadow = true;
    scene.add(ground);

    // The café: a giant toadstool with a door and a round window, behind the counter.
    const t = new VoxelModel(null);
    const HX = -6, HZ = -50;
    t.cyl(HX, HZ, 11, 0, 30, (x, y, z) => (hash3(x, y, z) < 0.25 ? '#e8dcc0' : '#f3e8d0'));
    t.box(HX - 3, 0, HZ + 9, HX + 4, 11, HZ + 12, (x, y) => (y === 10 ? '#5a3a1e' : '#8a5a30'));       // door
    t.set(HX + 2, 5, HZ + 12, '#e2b93b');                                                                // door knob
    for (let x = HX + 3; x < HX + 10; x++) for (let y = 15; y < 22; y++) if (Math.hypot(x + 0.5 - (HX + 6.5), y + 0.5 - 18.5) < 3.3) t.set(x, y, HZ + 10 - Math.floor((x - HX - 3) / 3), Math.hypot(x + 0.5 - (HX + 6.5), y + 0.5 - 18.5) < 2.3 ? '#ffe9a8' : '#8a5a30');
    t.sphere(HX + 0.5, 30, HZ + 0.5, 21, (x, y, z) => (hash3(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3)) < 0.22 ? '#fbf7ee' : '#d23c3a'), 11);
    for (const [x, y, z] of [...t.each()]) if (y < 29 && Math.hypot(x + 0.5 - HX, z + 0.5 - HZ) > 11.5) t.delete(x, y, z);
    t.cyl(HX, HZ, 17, 29, 30, '#f0d8c0'); // gills under the cap
    // Chimney with a little curl of smoke (the smoke is FX)
    t.box(HX + 10, 36, HZ - 4, HX + 13, 43, HZ - 1, '#8a5a3a');
    const house = buildMesh(t, { jitter: 0.05 });
    house.receiveShadow = true;
    scene.add(house);
    this.chimney = new THREE.Vector3(HX + 11.5, 44, HZ - 2.5);

    // The counter, with a striped front, a teapot and a cake stand.
    const c = new VoxelModel(null);
    c.box(-4, 0, -16, 2, COUNTER_TOP, 9, (x, y, z) => {
      if (y === COUNTER_TOP - 1) return '#e8d4b0';
      if (x === 1 || z === 8) return Math.floor((x + z + 20) / 3) % 2 ? '#e8b4c8' : '#fbf7ee';
      return '#a8743f';
    });
    const counter = buildMesh(c, { jitter: 0.04 });
    counter.receiveShadow = true;
    scene.add(counter);
    const pot = new VoxelModel(null);
    pot.sphere(0.5, 3, 0.5, 3.2, (x, y, z) => (y === 3 ? '#fbf7ee' : '#6fa8dc'), 2.8);
    for (const [x, y, z] of [...pot.each()]) if (y < 0) pot.delete(x, y, z);
    pot.set(0, 6, 0, '#fbf7ee'); pot.set(4, 3, 0, '#6fa8dc'); pot.set(5, 4, 0, '#6fa8dc'); pot.set(-3, 2, 0, '#6fa8dc'); pot.set(-4, 3, 0, '#6fa8dc'); pot.set(-4, 4, 0, '#6fa8dc');
    const teapot = buildGlazed(pot);
    teapot.position.set(-1, COUNTER_TOP, -12);
    teapot.rotation.y = 1.4;
    scene.add(teapot);
    const stand = new VoxelModel(null);
    stand.cyl(0.5, 0.5, 3.6, 0, 1, '#fbf7ee'); stand.set(0, 1, 0, '#e2b93b'); stand.set(0, 2, 0, '#e2b93b');
    stand.cyl(0.5, 0.5, 2.6, 3, 4, '#fbf7ee');
    const sc = getModel('crumpet');
    const standMesh = new THREE.Group();
    standMesh.add(buildGlazed(stand));
    for (const [dx, dz, y] of [[-1.5, 0, 1], [1.5, 0, 1], [0, 0, 4]]) {
      const cm = buildGlazed(sc, { offset: [-5, 0, -5] });
      cm.scale.setScalar(0.45); cm.position.set(dx, y, dz);
      standMesh.add(cm);
    }
    standMesh.position.set(-1, COUNTER_TOP, -5);
    scene.add(standMesh);
    this.stand = standMesh;

    // A chalkboard sign out front
    const b = new VoxelModel(null);
    b.box(0, 0, 0, 1, 12, 1, '#8a5a30'); b.box(7, 0, 0, 8, 12, 1, '#8a5a30');
    b.box(0, 5, 1, 8, 12, 2, (x, y) => (y === 5 || y === 11 || x === 0 || x === 7 ? '#8a5a30' : '#2f3a34'));
    for (const [x, y] of [[2, 9], [3, 9], [4, 9], [5, 9], [2, 7], [3, 7], [4, 7]]) b.set(x, y, 2, '#fbf7ee');
    const sign = buildMesh(b);
    sign.position.set(16, 0, 12);
    sign.rotation.y = -0.4;
    scene.add(sign);

    // Critter models (one of each; customers are copies)
    for (const cr of CRITTERS) this.models[cr.id] = cr.build();
  }

  enter() {
    const { world, gnome } = this.game;
    if (!this.scene) this.build();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(gnome.object);
    gnome.stop();
    gnome.walk = null;
    gnome.object.position.set(...GNOME_AT);
    gnome.object.rotation.set(0, GNOME_TURN, 0);
    this.customers = [];
    this.trays = [];
    this.phase = 'ready';
    this.bubbles = h('div', { class: 'cafe-bubbles' });
    this.card = h('div', { class: 'type-card' });
    this.servedPill = h('div', { class: 'pill' }, '☕ 0');
    this.tipPill = h('div', { class: 'pill' }, '🌰 0');
    this.timePill = h('div', { class: 'pill' }, `⏱ ${ROUND_SECONDS}`);
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.cafe || 0}`);
    this.root.replaceChildren(this.bubbles, h('div', { class: 'type-screen' },
      h('div', { class: 'g-top' }, h('div', { class: 'pill title' }, '☕ CRUMPET CAFÉ'), this.servedPill, this.tipPill, this.timePill, this.bestPill,
        button('Quit', () => this.quit(), 'small red')),
      this.card));
    this.showReady();
    this.game.line('cafeStart', 4);
  }
  exit() {
    const { world, gnome } = this.game;
    this.pad?.destroy();
    clearInterval(this.cdTimer);
    this.clearCustomers();
    world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    this.camera.clearViewOffset();
    world.active = null;
    world.resize();
    this.fx.clear();
    this.root.innerHTML = '';
  }

  clearCustomers() {
    for (const c of this.customers || []) { this.scene.remove(c.group); disposeGlazed(c.mesh); c.bubble?.remove(); }
    for (const t of this.trays || []) this.removeTray(t);
    this.customers = [];
    this.trays = [];
  }

  showReady() {
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, 'Crumpet Café!'),
      h('p', {}, 'The café is open, and hungry woodland critters are lining up! Each one tells you their order. Type it, and the gnome serves it up.'),
      h('p', {}, 'Quick, careful typing earns tips. Critters who wait too long get grumpy and leave. How many can you serve before closing time?'),
      h('p', { class: 'small' }, `Most critters served: ${this.state.best.cafe || 0}`),
      h('div', { class: 'row' }, button('Open the café! (Enter)', () => this.countdown(), 'gold big'))));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.clearCustomers();
    this.served = 0; this.grumpy = 0; this.tips = 0;
    this.updatePills();
    this.timePill.textContent = `⏱ ${ROUND_SECONDS}`;
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'OPEN!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--; show();
      if (n > 0) sfx.tick();
      else { clearInterval(this.cdTimer); sfx.go(); setTimeout(() => this.start(), 300); }
    }, 650);
  }

  start() {
    this.picker = new TextPicker(this.state);
    this.pace = pace(this.state, 'cafe');
    this.elapsed = 0; this.served = 0; this.grumpy = 0; this.tips = 0;
    this.streak = 0; this.bestStreak = 0; this.wrongRow = 0; this.quitted = false;
    this.spawnAt = 0.2;
    this.front = null;
    this.phase = 'play';
    this.pad?.destroy();
    this.pad = new TypePad({
      state: this.state,
      onKey: (k) => this.onPadKey(k),
      onLine: () => this.serve(),
      mustFix: true, // the order (or the mole's word) has to be right
    });
    this.waitEl = h('div', { class: 'mole-wait' }, 'Here comes a customer...');
    this.card.replaceChildren(this.waitEl, this.pad.el);
    this.pad.setText('');
    this.updatePills();
  }

  updatePills() {
    this.servedPill.textContent = `☕ ${this.served || 0}`;
    this.tipPill.textContent = `🌰 ${this.tips || 0}`;
  }

  // ---------- customers ----------
  queue() { return this.customers.filter((c) => c.state !== 'leaving' && c.state !== 'served' && c.state !== 'grumpy'); }

  spawn() {
    const inLine = new Set(this.queue().map((c) => c.def.id));
    const choices = CRITTERS.filter((cr) => !inLine.has(cr.id));
    const def = pickOf(choices.length ? choices : CRITTERS);
    const { model, head } = this.models[def.id];
    const group = new THREE.Group();
    const mesh = buildGlazed(model);
    group.add(mesh);
    group.position.set(ENTRANCE[0], 0, ENTRANCE[1]);
    this.scene.add(group);
    const bubble = h('div', { class: 'cafe-order hidden' });
    this.bubbles.append(bubble);
    // Orders get a little longer as the day goes on.
    const maxLen = this.elapsed < 25 ? 22 : this.elapsed < 60 ? 30 : 36;
    const two = this.elapsed < 25 ? 0 : this.elapsed < 60 ? 0.25 : 0.45;
    const order = makeOrder(this.picker, def, { maxLen, two });
    const c = { def, group, mesh, head, bubble, order, state: 'walking', t: 0, hopT: Math.random(), wait: 0, patience: 1, spot: -1, path: [] };
    this.customers.push(c);
    this.placeInLine();
  }

  // Everyone in line walks up to their spot (front first).
  placeInLine() {
    this.queue().forEach((c, i) => {
      if (c.spot === i) return;
      c.spot = i;
      c.path = [SPOTS[i]];
      if (c.state === 'waiting' || c.state === 'ordering') c.state = 'walking';
    });
  }

  // The front customer has reached the counter: they say their order.
  startOrder(c) {
    c.state = 'ordering';
    c.wait = 0;
    // Patience: plenty of time for each letter, a bit less as the day gets busy.
    c.patience = ((6 + c.order.text.length * 1.1) / this.pace) * (1 - Math.min(0.2, this.elapsed / 600));
    this.front = c;
    this.pad.setText(c.order.text);
    this.waitEl.textContent = `The ${c.def.name.toLowerCase()} would like...`;
    sfx.babble(c.order.text, 1.5);
  }

  onPadKey({ ok }) {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    if (ok) { sfx.key(this.pad.i); this.wrongRow = 0; return; }
    sfx.wrongKey();
    this.wrongRow++;
    if (this.front) this.front.huh = 0.4;
    if (this.wrongRow >= 3) { this.wrongRow = 0; gnome.act('oops'); this.game.line('typeWrong', 2); }
    else if (!gnome.busy) gnome.act('totter');
  }

  // Order typed: the gnome puts it on the counter and it pops onto the critter's tray.
  serve() {
    const c = this.front;
    if (!c || this.phase !== 'play') return;
    const { gnome } = this.game;
    this.front = null;
    c.state = 'served';
    c.t = 0;
    c.bubble.classList.add('hidden');
    const clean = this.pad.stats.wrong === (this.lastWrong ?? 0);
    this.lastWrong = this.pad.stats.wrong;
    const quick = c.wait < c.patience * 0.5;
    this.streak = clean ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const tip = 1 + (quick ? 1 : 0) + (clean ? 1 : 0);
    this.tips += tip;
    this.served++;
    this.updatePills();
    // The order, on a little tray
    const tray = new THREE.Group();
    const plate = new VoxelModel(null);
    plate.cyl(0.5, 0.5, 4.2, 0, 1, '#fbf7ee');
    tray.add(buildGlazed(plate));
    const things = [];
    for (const it of c.order.items) for (let i = 0; i < Math.min(3, it.n); i++) things.push(it.id);
    things.slice(0, 4).forEach((id, i, all) => {
      const m = buildGlazed(getModel(id), { offset: [-5, 0, -5] });
      m.scale.setScalar(0.42);
      const a = (i / all.length) * Math.PI * 2;
      const r = all.length > 1 ? 1.9 : 0;
      m.position.set(Math.cos(a) * r, 1, Math.sin(a) * r);
      tray.add(m);
    });
    tray.position.copy(SERVE_AT);
    this.scene.add(tray);
    this.trays.push({ tray, c, t: -0.25 });
    gnome.act(this.streak > 0 && this.streak % 5 === 0 ? 'spin' : 'hop');
    sfx.word(this.streak);
    sfx.place();
    this.fx.sparkles(SERVE_AT.clone().add(new THREE.Vector3(0, 3, 0)), 6);
    if (this.streak > 0 && this.streak % 5 === 0) { sfx.combo(this.streak); this.game.line('cafeStreak', 2.5); }
    else if (Math.random() < 0.3) this.game.line('cafeServe', 2);
    setTimeout(() => {
      if (this.phase !== 'play' && this.phase !== 'results') return;
      const top = c.group.position.clone().add(new THREE.Vector3(0, c.head + 2, 0));
      this.fx.hearts(top, 3);
      this.fx.acorns(top, tip);
      sfx.acorn();
    }, 450);
    this.waitEl.textContent = this.queue().length ? 'Next, please!' : 'Waiting for the next customer...';
    this.pad.setText('');
    this.placeInLine();
  }

  // Waited too long: a grumpy huff, and off they go.
  huff(c) {
    c.state = 'grumpy';
    c.t = 0;
    c.bubble.classList.add('hidden');
    if (this.front === c) this.front = null;
    this.grumpy++;
    this.streak = 0;
    this.fx.puff(c.group.position.clone().add(new THREE.Vector3(0, c.head + 2, 0)), 6, '#8a8a8a');
    sfx.wheeze();
    this.game.line('cafeGrumpy', 2.5);
    this.pad.setText('');
    this.waitEl.textContent = 'Oh no, too slow! Next, please!';
    this.placeInLine();
  }

  removeTray(t) {
    this.scene.remove(t.tray);
    t.tray.traverse((o) => o.isInstancedMesh && disposeGlazed(o));
  }

  update(dt) {
    const time = performance.now() / 1000;
    if (this.phase === 'play') {
      this.elapsed += dt;
      const left = ROUND_SECONDS - this.elapsed;
      this.timePill.textContent = `⏱ ${Math.max(0, Math.ceil(left))}`;
      this.timePill.classList.toggle('hot', left < 10);
      if (left <= 0) return this.finish();
      const maxLine = this.elapsed < 20 ? 1 : this.elapsed < 60 ? 2 : 3;
      this.spawnAt -= dt;
      if (this.spawnAt <= 0 && this.queue().length < maxLine) {
        this.spawn();
        this.spawnAt = 3.5 / this.pace;
      }
      const f = this.front;
      if (f && f.state === 'ordering') { f.wait += dt; if (f.wait >= f.patience) this.huff(f); }
    }
    // customers move
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.t += dt;
      const p = c.group.position;
      let moving = false;
      if (c.path.length) {
        const [tx, tz] = c.path[0];
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        const step = WALK_SPEED * dt;
        if (d <= step) {
          p.x = tx; p.z = tz; c.path.shift();
        } else {
          p.x += (dx / d) * step; p.z += (dz / d) * step;
          moving = true;
          const want = Math.atan2(dx, dz);
          c.group.rotation.y += angleDiff(want, c.group.rotation.y) * Math.min(1, dt * 10);
        }
      }
      if (!moving) {
        // face the gnome, turned a little toward us so we can see their face
        const want = 0.6 * Math.atan2(GNOME_AT[0] - p.x, GNOME_AT[2] - p.z);
        c.group.rotation.y += angleDiff(want, c.group.rotation.y) * Math.min(1, dt * 8);
      }
      if (c.state === 'walking' && !c.path.length) {
        c.state = 'waiting';
        if (c.spot === 0 && this.phase === 'play' && !this.front) this.startOrder(c);
      }
      if (c.state === 'waiting' && c.spot === 0 && this.phase === 'play' && !this.front) this.startOrder(c);
      if ((c.state === 'served' && c.t > 1.1) || (c.state === 'grumpy' && c.t > 0.8)) {
        c.state = 'leaving';
        c.path = [EXIT];
      }
      if (c.state === 'leaving' && !c.path.length) {
        this.scene.remove(c.group); disposeGlazed(c.mesh); c.bubble.remove();
        this.customers.splice(i, 1);
        continue;
      }
      // hops while walking, a happy bounce when served, a shake when grumpy
      let y = 0, sq = 1, rz = 0;
      if (moving) { c.hopT += dt / 0.3; const ph = c.hopT % 1; y = 1.4 * 4 * ph * (1 - ph); sq = 1 + 0.05 * Math.sin(ph * Math.PI); }
      else if (c.state === 'served') { const k = Math.min(1, c.t / 0.6); y = 3 * Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k); }
      else if (c.state === 'grumpy') rz = 0.15 * Math.sin(c.t * 40) * (1 - c.t / 0.8);
      else sq = 1 + 0.02 * Math.sin(time * 3 + i);
      c.huh = Math.max(0, (c.huh || 0) - dt);
      if (c.huh) rz += 0.1 * Math.sin(c.huh * 40);
      c.mesh.position.y = y;
      c.mesh.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      c.mesh.rotation.z = rz;
      this.placeBubble(c);
    }
    // trays: hop from the counter to the critter, then ride along on its head
    for (let i = this.trays.length - 1; i >= 0; i--) {
      const t = this.trays[i];
      t.t += dt;
      const top = t.c.group.position.clone().add(new THREE.Vector3(0, t.c.head + 0.5 + t.c.mesh.position.y, 0));
      if (t.t < 0) continue;
      if (t.t < 0.5) {
        const k = t.t / 0.5;
        t.tray.position.lerpVectors(SERVE_AT, top, k);
        t.tray.position.y += Math.sin(k * Math.PI) * 8;
      } else t.tray.position.copy(top);
      if (!this.customers.includes(t.c)) { this.removeTray(t); this.trays.splice(i, 1); }
    }
    // a little smoke from the chimney
    this.smokeAt = (this.smokeAt || 0) - dt;
    if (this.smokeAt <= 0) {
      this.smokeAt = 0.7;
      this.fx.cube(this.chimney.clone(), '#f4f0ea', { vel: new THREE.Vector3(2 + Math.random() * 2, 5, 0), drag: 0.99, life: 2.4, s0: 1.2, s1: 3, spin: 1 });
    }
    this.fx.update(dt);
    this.frame();
  }

  // Keep the café in the space left of the typing card.
  frame() {
    const w = innerWidth, hgt = innerHeight;
    const card = this.card?.getBoundingClientRect();
    const right = card && card.width ? card.left : w;
    const shift = w / 2 - right / 2;
    const v = this.camera.view;
    if (!v || v.offsetX !== shift || v.fullWidth !== w || v.fullHeight !== hgt) this.camera.setViewOffset(w, hgt, shift, 0, w, hgt);
  }

  // The front customer's order, in a speech bubble over their head.
  placeBubble(c) {
    const show = this.phase === 'play' && c === this.front && c.state === 'ordering';
    c.bubble.classList.toggle('hidden', !show);
    if (!show) return;
    const p = this.game.world.toScreen(c.group.position.clone().add(new THREE.Vector3(0, c.head + 3, 0)), this.camera);
    c.bubble.style.left = p.x + 'px';
    c.bubble.style.top = p.y + 'px';
    const typed = this.pad.progress;
    const key = `${c.order.text}|${typed}`;
    if (c.bubbleKey !== key) {
      c.bubbleKey = key;
      c.bubble.replaceChildren(h('span', { class: 'done' }, c.order.text.slice(0, typed)), c.order.text.slice(typed), h('div', { class: 'pat' }, h('i')));
    }
    const left = Math.max(0, 1 - c.wait / c.patience);
    const bar = c.bubble.querySelector('.pat i');
    bar.style.width = left * 100 + '%';
    bar.classList.toggle('low', left < 0.3);
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.finish(); }
    else this.game.go('home');
  }

  finish() {
    if (this.phase !== 'play') return;
    const { S, gnome } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.pad.pause();
    this.front = null;
    // Closing time: everyone still waiting heads home (happily: the gnome hands out free crumpets).
    for (const c of this.customers) if (c.state !== 'leaving') { c.state = 'leaving'; c.path = [EXIT]; c.bubble.classList.add('hidden'); }
    const newBest = this.served > (s.best.cafe || 0);
    let acorns = this.tips;
    if (newBest && this.served > 0) { acorns += 5; s.best.cafe = this.served; }
    S.addAcorns(acorns);
    s.history.push({ t: Date.now(), game: 'cafe', words: this.pad.stats.words, acc: this.pad.accuracy, wpm: this.pad.wpm, score: this.served });
    if (s.history.length > 200) s.history.shift();
    const visitors = this.served + this.grumpy;
    if (!this.quitted && visitors >= 3) tunePace(s, 'cafe', this.grumpy === 0 ? 'great' : this.grumpy > this.served ? 'struggled' : 'ok');
    if (this.pad.stats.right > 0) S.addStat('joy', 10);
    S.save();
    this.bestPill.textContent = `Best: ${s.best.cafe || 0}`;
    // Café rating: how many visitors left happy, out of 5 stars.
    const stars = visitors ? Math.max(1, Math.round((this.served / visitors) * 5)) : 0;
    sfx.fanfare();
    this.fx.confetti(gnome.headTop(), 30);
    gnome.act('cheer');
    this.game.line(newBest ? 'newBest' : 'cafeEnd', 4);
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, this.quitted ? 'Café closed!' : 'Closing time!'),
      h('p', {}, `You served ${this.served} critter${this.served === 1 ? '' : 's'}${this.grumpy ? ` (${this.grumpy} left grumpy)` : ''}!`),
      visitors ? h('div', { class: 'cafe-stars', title: `${stars} of 5 stars` }, '★'.repeat(stars) + '☆'.repeat(5 - stars)) : null,
      newBest && this.served > 0 ? h('div', { class: 'res-best' }, 'MOST CRITTERS EVER! +5 🌰') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Critters served', h('b', {}, this.served)),
        h('div', {}, 'Accuracy', h('b', {}, this.pad.accuracy + '%')),
        h('div', {}, 'Words per minute', h('b', {}, this.pad.wpm || '-')),
        h('div', {}, 'Clean in a row', h('b', {}, this.bestStreak)),
        h('div', { class: 'gold' }, 'Tips', h('b', {}, `🌰 ${acorns}`))),
      h('div', { class: 'row' },
        button('Open again! (Enter)', () => this.countdown(), 'gold'),
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

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
