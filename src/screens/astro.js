// Astrognome: the gnome rides a flowerpot carried by balloons. The balloons
// slowly lose air; every right key puffs them up, and finished words add more.
// Mistakes make a balloon wheeze. When the air runs out, out comes the umbrella.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, toast, floater } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, buildGlazed, hash3 } from '../voxel.js';
import { addLights, skyTexture, flower } from '../world.js';
import { FX } from '../fx.js';
import { ASTRO_ZONES, LINES, pick } from '../lines.js';
import { TextPicker, target } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';
import { pace, tunePace } from '../pace.js';
import { buildGerald } from '../gerald.js';

const SKY = [[0, '#9fd0ee'], [250, '#7ab8ea'], [500, '#4a78c8'], [700, '#24306e'], [900, '#0e1236'], [99999, '#05060f']];
const BALLOON_COLORS = ['#e8513a', '#f4d03f', '#4a8ae0', '#6abf4a', '#f19bc0', '#9a7ae0', '#ff9a3a', '#3ac0c0'];
const N_BALLOONS = 8;
const rand = (a, b) => a + Math.random() * (b - a);

export class AstroScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.built = false;
  }
  get state() { return this.game.state; }

  // ---------- the sky world (built once) ----------
  build() {
    this.built = true;
    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 2500);
    const L = addLights(scene, this.game.world.renderer, { sunPos: [40, 80, 60], shadowSize: 60 });
    this.sun = L.sun;
    scene.background = new THREE.Color(SKY[0][1]);
    this.fx = new FX(scene);

    // The garden far below
    const ground = new VoxelModel(null);
    ground.box(-160, -2, -120, 160, 0, 40, (x, y, z) => (hash3(x, 0, z) < 0.3 ? '#62a046' : '#6fae4f'));
    for (let x = -150; x < 150; x += 4) ground.box(x, 0, -60, x + 2, 10, -59, '#f3eee2');
    ground.box(-160, 3, -60, 160, 4, -59, '#e9e2d0');
    for (let x = -150; x < 150; x += 3) flower(ground, x, -56 + Math.floor(hash3(x, 1, 1) * 4), ['#f19bc0', '#ffffff', '#e8513a', '#9a7ae0'][Math.floor(hash3(x, 2, 2) * 4)], 2 + Math.floor(hash3(x, 3, 3) * 3));
    // houses with roofs, and trees
    for (const [hx, hz, roof] of [[-90, -95, '#b8402e'], [-30, -105, '#5a6a8a'], [60, -100, '#b8402e'], [120, -90, '#6a8a4a']]) {
      ground.box(hx - 14, 0, hz - 10, hx + 14, 22, hz + 10, (x, y) => (y % 6 === 0 ? '#e8dcc8' : '#f3ead8'));
      for (let y = 22; y < 34; y++) { const w = 34 - y; ground.box(hx - 16, y, hz - w, hx + 16, y + 1, hz + w, roof); }
      ground.box(hx - 3, 0, hz + 10, hx + 3, 10, hz + 11, '#7a4a24');
    }
    for (let i = 0; i < 14; i++) {
      const tx = Math.round(rand(-150, 150)), tz = Math.round(rand(-80, -45)), th = Math.round(rand(16, 30));
      ground.box(tx, 0, tz, tx + 2, th, tz + 2, '#7a5230');
      ground.sphere(tx + 1, th + 4, tz + 1, rand(6, 9), (x, y, z) => (hash3(x, y, z) < 0.3 ? '#3f8a36' : '#4f9a3f'), rand(5, 8));
    }
    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshLambertMaterial({ color: '#68a849' }));
    meadow.rotation.x = -Math.PI / 2;
    meadow.position.y = -0.05;
    scene.add(meadow);
    const groundMesh = buildMesh(ground, { jitter: 0.08 });
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Clouds
    const clouds = new VoxelModel(null);
    for (let i = 0; i < 40; i++) {
      const cx = rand(-120, 160), cy = rand(200, 720), cz = rand(-120, -30);
      for (let k = 0; k < 4; k++) clouds.sphere(cx + rand(-10, 10), cy + rand(-2, 2), cz + rand(-4, 4), rand(5, 10), '#ffffff', rand(3, 5));
    }
    scene.add(buildMesh(clouds, { jitter: 0.03, material: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.5 }) }));

    // Movers: birds, jets
    this.movers = [];
    const bird = new VoxelModel(null);
    bird.box(0, 0, 0, 4, 2, 2, '#5a5a6a'); bird.set(4, 1, 0, '#f2b632'); bird.set(4, 1, 1, '#f2b632');
    bird.box(1, 2, -2, 3, 3, 4, '#7a7a8a');
    const birdGeo = buildMesh(bird).geometry;
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(birdGeo, buildMesh(bird).material);
      m.position.set(rand(-100, 160), rand(150, 380), rand(-70, -20));
      this.movers.push({ obj: m, speed: rand(8, 18), flap: Math.random() * 6 });
      scene.add(m);
    }
    const jet = new VoxelModel(null);
    jet.box(0, 0, 0, 22, 4, 4, '#f4f1e6'); jet.box(22, 1, 1, 24, 3, 3, '#5fb6e8');
    jet.box(8, 1, -10, 13, 2, 14, '#4a7ad8'); jet.box(0, 4, 1, 3, 9, 3, '#4a7ad8');
    for (let i = 0; i < 4; i++) jet.set(5 + i * 4, 2, 4, '#5fb6e8');
    for (let i = 0; i < 4; i++) {
      const m = buildMesh(jet);
      m.position.set(rand(-120, 160), rand(580, 760), rand(-90, -40));
      this.movers.push({ obj: m, speed: rand(25, 40) });
      scene.add(m);
    }
    // Stars, the Moon and a little planet
    const pts = [];
    for (let i = 0; i < 1200; i++) pts.push(rand(-300, 360), rand(700, 2600), rand(-320, -90));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0 });
    scene.add(new THREE.Points(sg, this.starMat));
    const space = new VoxelModel(null);
    space.sphere(100, 1120, -120, 30, (x, y, z) => (hash3(Math.floor(x / 4), Math.floor(y / 4), Math.floor(z / 4)) < 0.25 ? '#c8c4a8' : '#f2ecc8'));
    space.sphere(-70, 1500, -140, 18, (x, y, z) => (hash3(x, Math.floor(y / 3), z) < 0.25 ? '#c86a9a' : '#e89ac0'));
    space.ring(-70, -140, 22, 30, 1500, 1501, '#f4d03f');
    scene.add(buildMesh(space));

    // Gerald the pigeon
    const ger = buildGerald();
    this.gerald = ger.group;
    this.gerFlap = ger.flap;
    this.gerald.visible = false;
    scene.add(this.gerald);

    // The flying flowerpot
    this.craft = new THREE.Group();
    scene.add(this.craft);
    const pot = new VoxelModel(null);
    pot.cone(0, 0, 6.5, 8, -9, 0, (x, y, z) => (y === -4 ? '#b8562a' : '#c9622e'));
    pot.ring(0, 0, 7, 9, -1, 1, '#d8703a');
    for (const [x, y, z] of [...pot.each()]) if (y > -8 && x * x + z * z < 30) pot.delete(x, y, z); // hollow
    this.pot = buildGlazed(pot);
    this.craft.add(this.pot);
    this.balloons = [];
    const lineMat = new THREE.LineBasicMaterial({ color: '#f4f1e6' });
    for (let i = 0; i < N_BALLOONS; i++) {
      const b = new VoxelModel(null);
      b.sphere(0, 0, 0, 3.4, BALLOON_COLORS[i], 4.1);
      b.set(0, -5, 0, BALLOON_COLORS[i]);
      const mesh = buildGlazed(b);
      const a = (i / N_BALLOONS) * Math.PI * 2;
      const home = new THREE.Vector3(Math.cos(a) * (i % 2 ? 9 : 5), 46 + (i % 3) * 4, Math.sin(a) * 6 - 2);
      mesh.position.copy(home);
      const anchor = new THREE.Vector3(Math.cos(a) * 7, 0.5, Math.sin(a) * 7);
      const geo = new THREE.BufferGeometry().setFromPoints([anchor, home.clone().add(new THREE.Vector3(0, -5, 0))]);
      const line = new THREE.Line(geo, lineMat);
      this.craft.add(mesh, line);
      this.balloons.push({ mesh, line, home, anchor, s: 1, wob: Math.random() * 6 });
    }
    // The emergency umbrella
    const um = new VoxelModel(null);
    um.sphere(0, 0, 0, 13, (x, y, z) => (Math.floor(Math.atan2(z, x) / (Math.PI / 4)) % 2 ? '#e8513a' : '#fbf7ee'), 6);
    for (const [x, y, z] of [...um.each()]) if (y < 0) um.delete(x, y, z);
    for (let y = -14; y < 0; y++) um.set(0, y, 0, '#5a3a1e');
    um.set(1, -14, 0, '#5a3a1e'); um.set(2, -13, 0, '#5a3a1e');
    this.umbrella = buildGlazed(um);
    this.umbrella.position.set(0, 40, 0);
    this.umbrella.visible = false;
    this.craft.add(this.umbrella);
  }

  // ---------- screen lifecycle ----------
  enter() {
    const { world, gnome } = this.game;
    if (!this.built) this.build();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.craft.add(gnome.object);
    gnome.object.position.set(0, -6, 0);
    gnome.object.rotation.set(0, 0, 0);
    gnome.overlay = (o, t) => { if (this.phase === 'play') { o.rotZ += 0.03 * Math.sin(t * 2); } };
    this.alt = 0; this.camY = 0; this.air = 60;
    this.phase = 'ready';
    this.buildUI();
    this.showReady();
    this.game.line('astroStart', 4);
  }
  exit() {
    const { world, gnome } = this.game;
    world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.overlay = null;
    world.active = null;
    world.resize();
    clearInterval(this.cdTimer);
    this.pad?.destroy();
    this.root.innerHTML = '';
    this.fx.clear();
  }

  buildUI() {
    this.airFill = h('div', { class: 'fill' });
    this.airLabel = h('div', { class: 't' }, 'AIR');
    this.altPill = h('div', { class: 'pill' }, '0 m');
    this.zonePill = h('div', { class: 'pill' }, ASTRO_ZONES[0].name);
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.astro || 0} m`);
    this.geraldEl = h('div', { class: 'gerald hidden' });
    this.card = h('div', { class: 'type-card astro' });
    this.root.replaceChildren(h('div', { class: 'type-screen' },
      h('div', { class: 'g-top' },
        h('div', { class: 'pill title' }, '🎈 ASTROGNOME'),
        h('div', { class: 'air-meter' }, this.airFill, this.airLabel),
        this.altPill, this.zonePill, this.bestPill,
        button('Quit', () => this.quit(), 'small red')),
      this.geraldEl,
      this.card));
  }

  showReady() {
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, 'Astrognome!'),
      h('p', {}, 'The balloons slowly lose air. Every right key puffs them up, and finishing a word adds even more. Typos make a balloon wheeze!'),
      h('p', {}, 'Run out of air and it\'s umbrella time. How high can you fly?'),
      h('p', { class: 'small' }, `Highest flight: ${this.state.best.astro || 0} m`),
      h('div', { class: 'row' }, button('Up, up and away! (Enter)', () => this.countdown(), 'gold big'))));
  }

  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.alt = 0; this.vel = 0; this.air = 60;
    this.umbrella.visible = false;
    this.balloons.forEach((b) => { b.mesh.visible = b.line.visible = true; });
    let n = 3;
    const show = () => this.card.replaceChildren(h('div', { class: 'countdown' }, n > 0 ? n : 'UP!'));
    show(); sfx.tick();
    this.cdTimer = setInterval(() => {
      n--; show();
      if (n > 0) { sfx.tick(); this.game.gnome.act('shiver'); }
      else { clearInterval(this.cdTimer); sfx.go(); setTimeout(() => this.start(), 300); }
    }, 650);
  }

  start() {
    const s = this.state;
    this.picker = new TextPicker(s);
    this.pace = pace(s, 'astro');
    this.flightT = 0; this.maxAlt = 0; this.zone = 0; this.lowWarned = false; this.quitted = false;
    this.air = 70; this.streak = 0; this.bestStreak = 0; this.wrongRow = 0;
    this.geraldAt = 0;
    this.boost = 0;
    this.phase = 'play';
    this.pad = new TypePad({
      state: s,
      onKey: (k) => this.onPadKey(k),
      onWord: (w) => this.onWord(w),
      onLine: () => this.nextLine(),
    });
    this.card.replaceChildren(this.pad.el);
    this.queue = [this.picker.line(24), this.picker.line(24)];
    this.pad.setText(this.queue[0], this.queue[1]);
  }

  nextLine() {
    this.queue.shift();
    this.queue.push(this.picker.line(24));
    this.pad.setText(this.queue[0], this.queue[1]);
  }

  onPadKey({ ok, secs, timed }) {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    if (ok) {
      sfx.key(this.pad.i);
      this.wrongRow = 0;
      const fast = timed && secs <= target(this.state);
      this.air = Math.min(100, this.air + (fast ? 2.4 : 1.7));
      if (fast && Math.random() < 0.3) this.puffAt(Math.floor(Math.random() * N_BALLOONS));
    } else {
      this.streak = 0;
      this.wrongRow++;
      this.air = Math.max(0, this.air - 3);
      sfx.wrongKey();
      sfx.wheeze();
      const b = this.balloons[Math.floor(Math.random() * N_BALLOONS)];
      b.wob = 1;
      if (this.wrongRow >= 3) { this.wrongRow = 0; gnome.act('shake'); this.game.line('astroWrong', 1.4); }
      else if (!gnome.busy) gnome.act('totter');
    }
  }

  onWord({ clean }) {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    this.streak = clean ? this.streak + 1 : 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const gain = 3 + (clean ? 2 : 0) + Math.min(5, this.streak * 0.5);
    this.air = Math.min(100, this.air + gain);
    this.boost = (this.boost || 0) + gain * 0.8;
    sfx.word(this.streak);
    sfx.puff();
    this.puffAt(Math.floor(Math.random() * N_BALLOONS));
    if (this.streak > 0 && this.streak % 5 === 0) {
      sfx.combo(this.streak);
      gnome.act('spin');
      this.fx.sparkles(gnome.headTop(), 8);
      const r = this.card.getBoundingClientRect();
      floater(r.left + r.width / 2, r.top - 10, `${this.streak} clean words in a row!`, '#3d7838');
    }
  }

  puffAt(i) {
    const b = this.balloons[i];
    b.s = Math.min(1.25, b.s + 0.15);
    const p = b.mesh.getWorldPosition(new THREE.Vector3());
    this.fx.puff(p, 3);
  }

  update(dt) {
    const t = performance.now() / 1000;
    const { gnome } = this.game;
    if (this.phase === 'play') {
      this.flightT += dt;
      // the balloons lose air faster the higher you go
      this.air -= (2.6 + this.alt / 380) * this.pace * dt;
      this.boost = (this.boost || 0) * Math.pow(0.92, dt * 60);
      const climb = 1 + Math.max(0, this.air) * 0.12 + this.boost * 0.4;
      this.alt += climb * dt;
      this.maxAlt = Math.max(this.maxAlt, this.alt);
      while (this.zone + 1 < ASTRO_ZONES.length && this.alt >= ASTRO_ZONES[this.zone + 1].alt) {
        this.zone++;
        toast(`🎈 ${ASTRO_ZONES[this.zone].name}!`);
        sfx.combo(this.zone * 2);
        this.game.line('astroZone', 2);
        this.zonePill.textContent = ASTRO_ZONES[this.zone].name;
      }
      if (this.air < 25 && !this.lowWarned) { this.lowWarned = true; this.game.line('astroLow', 2); gnome.emote('wide', 1.5); }
      if (this.air > 40) this.lowWarned = false;
      if (this.air <= 0) this.outOfAir();
      this.updateGerald(dt, t);
    } else if (this.phase === 'landing') {
      // float down under the umbrella (quickly, so nobody waits)
      const speed = Math.max(25, this.alt * 0.9);
      this.alt = Math.max(0, this.alt - speed * dt);
      if (this.alt <= 0 && !this.landed) { this.landed = true; gnome.act('hop'); sfx.clink(); setTimeout(() => this.showResults(), 400); }
    }
    // balloons: size follows the air, plus a little wobble
    const airK = Math.max(0, this.air) / 100;
    this.balloons.forEach((b, i) => {
      const want = this.phase === 'landing' || this.phase === 'results' ? 0 : Math.max(0, Math.min(1, airK * N_BALLOONS - i * 0.6));
      b.s += (Math.max(want, 0.0001) - b.s) * Math.min(1, dt * 4);
      b.wob = Math.max(0, (b.wob || 0) - dt * 1.5);
      const s = Math.max(0.001, b.s) * (1 + 0.15 * Math.sin(t * 30) * b.wob);
      b.mesh.scale.set(s, s * (1 - 0.1 * b.wob), s);
      b.mesh.position.copy(b.home).add(new THREE.Vector3(Math.sin(t * 1.3 + i) * 0.8, Math.sin(t * 1.7 + i * 2) * 0.6, 0));
      b.mesh.visible = b.s > 0.05;
      b.line.visible = b.mesh.visible;
    });
    // craft position and sway; camera follows
    this.craft.position.y = this.alt + 9;
    this.craft.rotation.z = 0.04 * Math.sin(t * 1.1);
    this.camY += ((this.alt) - this.camY) * Math.min(1, dt * 5);
    // The craft (pot to balloons) sits in the top half; the typing card covers the bottom.
    // The craft (pot to balloons) sits on the left; the typing card is on the right.
    this.camera.position.set(52, this.camY + 40, 190);
    this.camera.lookAt(52, this.camY + 33, 0);
    this.sun.position.set(40, this.alt + 80, 60);
    this.sun.target.position.set(0, this.alt, 0);
    this.scene.background.copy(this.skyColor(this.alt));
    this.starMat.opacity = Math.min(1, Math.max(0, (this.alt - 650) / 250));
    for (const m of this.movers) {
      m.obj.position.x += m.speed * dt;
      if (m.obj.position.x > 220) m.obj.position.x = -180;
      if (m.flap != null) m.obj.scale.y = 1 + 0.5 * Math.sin(t * 12 + m.flap);
    }
    this.fx.update(dt);
    if (this.airFill) {
      const a = Math.max(0, this.air);
      this.airFill.style.width = a + '%';
      this.airFill.classList.toggle('low', a < 25);
    }
    if (this.altPill) this.altPill.textContent = `${Math.floor(this.alt)} m`;
  }

  // Gerald the pigeon flies alongside in his part of the sky, heckling.
  updateGerald(dt, t) {
    const z = ASTRO_ZONES[this.zone].name;
    const show = z === "Gerald's Sky";
    this.gerald.visible = show;
    this.geraldEl.classList.toggle('hidden', !show);
    if (!show) return;
    this.gerald.position.set(-26 + 3 * Math.sin(t * 0.8), this.alt + 50 + 2 * Math.sin(t * 2.3), 6);
    this.gerald.rotation.y = 0.9;
    this.gerFlap(0.6 * Math.sin(t * 16));
    if (t > this.geraldAt) {
      this.geraldAt = t + 7;
      sfx.coo();
      this.geraldEl.textContent = '🐦 Gerald: ' + pick(LINES.gerald, this.game.vars());
      this.geraldEl.classList.remove('pop'); void this.geraldEl.offsetWidth; this.geraldEl.classList.add('pop');
    }
  }

  skyColor(alt) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const [a0, c0] = SKY[i], [a1, c1] = SKY[i + 1];
      if (alt <= a1) return new THREE.Color(c0).lerp(new THREE.Color(c1), (alt - a0) / (a1 - a0));
    }
    return new THREE.Color(SKY[SKY.length - 1][1]);
  }

  outOfAir() {
    if (this.phase !== 'play') return;
    const { gnome } = this.game;
    this.phase = 'landing';
    this.landed = false;
    this.air = 0;
    this.pad?.pause();
    this.gerald.visible = false;
    this.geraldEl.classList.add('hidden');
    sfx.pop();
    sfx.whoosh();
    this.umbrella.visible = true;
    gnome.emote('wide', 2);
    this.game.line('astroLand', 2.5);
    this.card.replaceChildren(h('div', { class: 'countdown small' }, '☂️ Umbrella time!'));
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.outOfAir(); }
    else this.game.go('home');
  }

  showResults() {
    const { gnome, S } = this.game;
    const s = this.state;
    this.phase = 'results';
    const height = Math.floor(this.maxAlt);
    const newBest = height > (s.best.astro || 0) && height > 0;
    let acorns = Math.round(height / 15) + Math.min(8, Math.floor(this.bestStreak / 3));
    if (newBest) { acorns += 10; s.best.astro = height; }
    S.addAcorns(acorns);
    s.history.push({ t: Date.now(), game: 'astro', words: this.pad.stats.words, acc: this.pad.accuracy, wpm: this.pad.wpm, score: height });
    if (s.history.length > 200) s.history.shift();
    if (!this.quitted && this.pad.stats.right >= 10) tunePace(s, 'astro', this.flightT < 35 ? 'struggled' : this.flightT >= 90 ? 'great' : 'ok');
    if (this.pad.stats.right > 0) S.addStat('joy', 12);
    S.save();
    this.bestPill.textContent = `Best: ${s.best.astro || 0} m`;
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, `${height} meters!`),
      h('p', {}, `You reached ${ASTRO_ZONES[this.zone].name}!`),
      newBest ? h('div', { class: 'res-best' }, 'NEW HEIGHT RECORD! +10 🌰') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Words', h('b', {}, this.pad.stats.words)),
        h('div', {}, 'Accuracy', h('b', {}, this.pad.accuracy + '%')),
        h('div', {}, 'Words per minute', h('b', {}, this.pad.wpm || '-')),
        h('div', {}, 'Clean words in a row', h('b', {}, this.bestStreak)),
        h('div', { class: 'gold' }, 'Acorns', h('b', {}, `🌰 ${acorns}`))),
      h('div', { class: 'row' },
        button('Fly again! (Enter)', () => this.countdown(), 'gold'),
        button('Home (Esc)', () => this.game.go('home'), ''))));
    gnome.emote(newBest ? 'happy' : 'open', 3);
    if (newBest) { sfx.fanfare(); this.game.line('newBest', 3); gnome.act('cheer'); }
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
