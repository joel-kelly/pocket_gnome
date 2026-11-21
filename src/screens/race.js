// Grand Gnome Prix: a one-minute typing speed test on a race track.
// The gnome drives an open-wheel racer, and the car only moves when you type
// the right keys, so its speed IS your typing speed. Three critter rivals race
// alongside at steady speeds set from your best. Woodland critters cheer from
// the grandstand. Type fast (and carefully) to win trophies for the garden.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button } from '../ui.js';
import { sfx, engine } from '../audio.js';
import { VoxelModel, buildMesh, buildGeometry, hash3, voxelMaterial } from '../voxel.js';
import { addLights, skyTexture, flower, thumbnail } from '../world.js';
import { FX } from '../fx.js';
import { CRITTERS } from '../critters.js';
import { buildGerald } from '../gerald.js';
import { PRIZES, getModel } from '../items.js';
import { TextPicker } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound } from './games.js';

const RACE_SECONDS = 60;
const PER_CHAR = 60;           // track units per correct key. 1 wpm = 5 keys a minute = 5 units a second.
const PER_WPM = PER_CHAR * 5 / 60;
export const PRIZE_ACCURACY = 85; // trophies need a careful race, not just a fast one
const TILE = 960;               // the scenery repeats every TILE units
const LAP = 2400;               // a start/finish gantry every LAP units
const START_LINE = 46;
const LANES = [0, -27, -54, -81]; // you're in the near lane
const TRACK_NEAR = 18, TRACK_FAR = -96;
const METERS = 10;              // track units per meter (for the gaps on the leaderboard)

// The rivals. k: their speed compared to your best.
const RIVALS = [
  { id: 'hedgehog', emo: '🦔', name: 'Hedgehog', k: 0.75, body: '#3f9a4a', accent: '#f4d03f', num: 2, wave: 3 },
  { id: 'squirrel', emo: '🐿️', name: 'Squirrel', k: 1.0, body: '#e8823a', accent: '#fbf7ee', num: 3, wave: 2 },
  { id: 'bunny', emo: '🐰', name: 'Bunny', k: 1.15, body: '#8a5ad8', accent: '#f19bc0', num: 4, wave: 2 },
];
export function rivalSpeeds(best) {
  const base = best > 0 ? best : 12;
  return RIVALS.map((r) => Math.max(5, Math.round(base * r.k) + (r.k > 1 ? 1 : 0)));
}
const ordinal = (n) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
const MEDAL = ['🥇', '🥈', '🥉', '🏁'];

// ---------- models ----------
const CARBON = '#2a2628', SILVER = '#c9ced8', GOLD = '#e2b93b', WHITE = '#fbf7ee';
const DIGITS = {
  1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'],
};

// An open-wheel racer facing +x, centered on z = 0, sitting on y = 0. Wheels are separate (they spin).
// The driver sits in the cockpit at COCKPIT.
const COCKPIT = [-3, 2, 0];
function carBody(main, accent, num) {
  const m = new VoxelModel(null);
  m.box(-30, 1, -8, 31, 2, 8, CARBON);                                   // floor
  // nose: tapers and drops from the cockpit to the front wing, with a stripe down the middle
  for (let x = 6; x < 34; x++) {
    const t = (x - 6) / 27;
    const hw = Math.round(5 - 2.4 * t), top = Math.round(9 - 4.5 * t);
    m.box(x, 2, -hw, x + 1, top, hw, (xx, y, z) => (y === top - 1 && (z === -1 || z === 0) ? accent : main));
  }
  // the tub around the cockpit
  m.box(-12, 2, -7, 6, 10, 7, (x, y) => (y === 9 ? accent : main));
  for (const [x, y, z] of [...m.each()]) {
    if (y >= 4 && x >= -10 && x <= 4 && Math.hypot(x + 0.5 - COCKPIT[0], z + 0.5) < 6.3) m.delete(x, y, z);
  }
  m.box(-10, 3, -6, 4, 4, 6, '#3a3436');                                  // the seat
  // mirrors on little stalks
  for (const z of [-8, 7]) { m.set(4, 10, z, CARBON); m.set(4, 11, z, SILVER); m.set(5, 11, z, SILVER); }
  // airbox (behind the driver's head) and engine cover tapering to the back
  m.box(-19, 2, -4, -10, 14, 4, (x, y) => (y === 13 ? accent : main));
  m.box(-10, 11, -2, -9, 13, 2, CARBON);                                  // the air intake
  for (let x = -31; x < -19; x++) {
    const t = (-19 - x) / 12;
    const hw = Math.round(4 - t * 2), top = Math.round(12 - t * 6);
    m.box(x, 2, -hw, x + 1, top, hw, main);
  }
  // sidepods, with dark intakes at the front and a number roundel on each side
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 7 : -10, z1 = s > 0 ? 10 : -7;
    m.box(-16, 2, z0, 4, 8, z1, (x, y) => (x === 3 && y > 3 && y < 7 ? CARBON : y === 7 ? accent : main));
    const zf = s > 0 ? 10 : -11;
    for (let x = -10; x <= -2; x++) for (let y = 2; y <= 7; y++) if (Math.hypot(x + 0.5 + 6, y + 0.5 - 5) < 3) m.set(x, y, zf, WHITE);
    DIGITS[num].forEach((row, i) => [...row].forEach((b, j) => { if (b === '1') m.set(s > 0 ? -7 + j : -5 - j, 7 - i, zf + s, CARBON); }));
  }
  // suspension arms out to the wheels
  for (const s of [-1, 1]) {
    m.box(19, 5, s > 0 ? 4 : -9, 23, 6, s > 0 ? 9 : -4, CARBON);
    m.box(-22, 6, s > 0 ? 4 : -10, -18, 7, s > 0 ? 10 : -4, CARBON);
  }
  // front wing: two elements and endplates
  m.box(29, 1, -16, 38, 2, 16, main);
  m.box(33, 2, -16, 38, 3, 16, accent);
  for (const z of [-16, 15]) m.box(29, 1, z, 38, 5, z + 1, CARBON);
  // rear wing on a pillar, with endplates
  m.box(-37, 15, -14, -29, 17, 14, main);
  m.box(-36, 17, -14, -32, 18, 14, accent);
  for (const z of [-15, 14]) m.box(-38, 7, z, -28, 19, z + 1, (x, y) => (y > 15 ? accent : main));
  m.box(-34, 7, -1, -32, 15, 1, CARBON);
  m.box(-33, 1, -8, -30, 5, 8, CARBON);                                   // diffuser
  m.box(-32, 6, -1, -31, 8, 1, '#4a4446');                                // exhaust
  m.set(-32, 3, 0, '#ff4a3a'); m.set(-32, 3, -1, '#ff4a3a');              // rain light
  return m;
}
// A big chunky wheel around its axle (the z axis), centered at the origin, outside face toward +z.
// The tire stays put and only the rim spins: a spinning blocky circle looks wobbly.
function wheelModels(R, W, stripe) {
  const tire = new VoxelModel(null), rim = new VoxelModel(null);
  const r0 = Math.ceil(R), RIM = R - 2.2;
  for (let x = -r0; x < r0; x++) for (let y = -r0; y < r0; y++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d > R) continue;
    const a = Math.atan2(y + 0.5, x + 0.5);
    for (let z = -W / 2; z < W / 2; z++) {
      if (d > R - 1.1) tire.set(x, y, z, Math.floor(a / (Math.PI / 8)) % 2 ? '#3a3436' : CARBON);   // chunky tread
      else if (d > RIM) tire.set(x, y, z, z === W / 2 - 1 ? stripe : CARBON);                         // sidewall with a stripe
      else if (z === -W / 2) tire.set(x, y, z, CARBON);                                                // backing, so you can't see through
    }
    if (d <= RIM - 0.4) rim.set(x, y, W / 2 - 1, d < 1.3 ? GOLD : Math.floor((a + Math.PI) / (Math.PI / 3)) % 2 ? SILVER : '#8a909a'); // spokes
    if (d < 1.3) rim.set(x, y, W / 2, GOLD);                                                          // hub cap
  }
  return { tire, rim };
}
const WHEELS = [
  { x: 21, R: 6.2, W: 6, z: 12 }, { x: 21, R: 6.2, W: 6, z: -12 },
  { x: -20, R: 7.4, W: 8, z: 14 }, { x: -20, R: 7.4, W: 8, z: -14 },
];

// Cars have far too many blocks to glaze one by one, so they're one shiny shell (like car paint).
const paintMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
const glazeLike = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
const tireMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.4 });
const shiny = (model, mat) => { const m = new THREE.Mesh(buildGeometry(model, { jitter: 0.03 }), mat); m.castShadow = true; m.receiveShadow = true; return m; };
function buildCar(main, accent, num) {
  const group = new THREE.Group();
  const lean = new THREE.Group();           // tilts and bounces; the wheels stay on the road
  group.add(lean);
  const body = shiny(carBody(main, accent, num), paintMat);
  lean.add(body);
  const wheels = WHEELS.map((w) => {
    const { tire, rim } = wheelModels(w.R, w.W, accent === WHITE ? '#e2b93b' : accent);
    const holder = new THREE.Group();
    holder.position.set(w.x, w.R, w.z);
    if (w.z < 0) holder.scale.z = -1;       // far-side wheels face the other way
    const tireMesh = shiny(tire, tireMat), mesh = shiny(rim, paintMat);
    holder.add(tireMesh, mesh);
    group.add(holder);
    return { mesh, tire: tireMesh, R: w.R };
  });
  const seat = new THREE.Group();
  seat.position.set(...COCKPIT);
  seat.rotation.y = Math.PI / 2;            // drivers face +z; the car faces +x
  lean.add(seat);
  return { group, lean, body, wheels, seat };
}
function disposeCar(car) {
  if (!car) return;
  car.body.geometry.dispose();
  for (const w of car.wheels) { w.mesh.geometry.dispose(); w.tire.geometry.dispose(); }
  car.driver?.geometry.dispose();
}

// Text on a canvas, for banners and billboards.
function textTexture(text, { bg = '#d23c3a', fg = '#fbf7ee', w = 512, h = 96, size = 34, check = false, border = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (check) {
    const s = h / 4;
    for (let i = 0; i < w / s; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { x.fillStyle = '#2a2628'; x.fillRect(i * s, j * s, s, s); }
    x.fillStyle = bg; x.fillRect(h * 0.6, h * 0.18, w - h * 1.2, h * 0.64);
  }
  if (border) { x.strokeStyle = border; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${size}px "Press Start 2P", monospace`;
  x.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function banner(text, width, height, opts) {
  const mat = new THREE.MeshLambertMaterial({ map: textTexture(text, opts) });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function tree(m, x, z, r) {
  const hgt = Math.round(r * 1.2);
  m.box(x - 1, 0, z - 1, x + 1, hgt, z + 1, '#7a5230');
  m.sphere(x, hgt + r * 0.6, z, r, (xx, y, zz) => { const q = hash3(xx, y, zz); return q < 0.3 ? '#3f8a36' : q < 0.7 ? '#4f9a3f' : '#357a2e'; }, r * 0.85);
}
function toadstool(m, x, z, r) {
  const STEM = '#f3e8d0';
  m.cyl(x, z, r * 0.35, 0, r, STEM);
  m.sphere(x, r, z, r, (xx, y, zz) => (hash3(Math.floor(xx / 2), y, Math.floor(zz / 2)) < 0.22 ? WHITE : '#d23c3a'), r * 0.6);
  for (const [xx, y, zz, c] of [...m.each()]) if (y < r && c !== STEM && Math.abs(xx - x) <= r + 1 && Math.abs(zz - z) <= r + 1) m.delete(xx, y, zz); // flat underneath
}
function tireStack(m, x, z, n, band) {
  for (let i = 0; i < n; i++) m.ring(x, z, 1.3, 3.2, i * 2, i * 2 + 2, i % 2 ? band : CARBON);
}

export class RaceScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  build() {
    const scene = this.scene = new THREE.Scene();
    scene.background = skyTexture('#8cc6ee', '#d6ecf2', '#eef4e0');
    scene.fog = new THREE.Fog('#dcefe9', 380, 1000);
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 1400);
    this.camera.position.set(72, 66, 222);
    this.camera.lookAt(4, 6, -36);
    this.camHome = this.camera.position.clone();
    const L = addLights(scene, this.game.world.renderer, { sunPos: [60, 110, 80], shadowSize: 80 });
    L.sun.target.position.set(0, 0, -10);
    this.fx = new FX(scene);

    // Grass everywhere, and the track (the moving parts are in the scenery tiles).
    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000), new THREE.MeshLambertMaterial({ color: '#68a849' }));
    meadow.rotation.x = -Math.PI / 2; meadow.position.y = -0.1; meadow.receiveShadow = true;
    scene.add(meadow);
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(4000, TRACK_NEAR - TRACK_FAR), new THREE.MeshLambertMaterial({ color: '#61656d' }));
    asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(0, -0.05, (TRACK_NEAR + TRACK_FAR) / 2); asphalt.receiveShadow = true;
    scene.add(asphalt);

    this.tiles = [0, 1, 2].map(() => this.buildTile());
    for (const t of this.tiles) scene.add(t.group);
    this.gantry = this.buildGantry();
    scene.add(this.gantry);

    // Gerald, who is NOT a registered racer.
    this.gerald = buildGerald();
    this.gerald.group.scale.setScalar(1.6);
    this.gerald.group.rotation.y = -Math.PI / 2;
    this.gerald.group.visible = false;
    scene.add(this.gerald.group);

    // Speed streaks that whoosh past when you're going fast.
    const sMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    this.streakMat = sMat;
    this.streaks = [];
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 0.35), sMat);
      s.position.set((Math.random() - 0.5) * 300, 3 + Math.random() * 30, -30 + Math.random() * 70);
      s.userData.len = 10 + Math.random() * 22;
      scene.add(s);
      this.streaks.push(s);
    }

    // Rival cars, each with a critter at the wheel.
    this.crit = Object.fromEntries(CRITTERS.map((c) => [c.id, c.build()]));
    this.rivalCars = RIVALS.map((r, i) => {
      const car = buildCar(r.body, r.accent, r.num);
      const { model, head } = this.crit[r.id];
      const driver = shiny(model, glazeLike);
      driver.scale.setScalar(1.25);
      driver.position.y = Math.max(0, 19 - head * 1.25);
      car.seat.add(driver);
      car.driver = driver;
      car.group.position.z = LANES[i + 1];
      scene.add(car.group);
      return car;
    });
  }

  // ---------- scenery ----------
  // One stretch of track side: kerbs, lane lines, tire stacks and flowers on the near side;
  // a grandstand full of critters, billboards, toadstools and trees on the far side.
  // The same geometry is shared by every copy.
  buildTile() {
    if (!this.tileGeo) {
      const m = new VoxelModel(null);
      // kerbs and lane lines
      for (let x = 0; x < TILE; x++) {
        const c = Math.floor(x / 8) % 2 ? '#e8402e' : WHITE;
        for (let z = TRACK_NEAR; z < TRACK_NEAR + 4; z++) m.set(x, -1, z, c);
        for (let z = TRACK_FAR - 4; z < TRACK_FAR; z++) m.set(x, -1, z, c);
        if (x % 40 < 16) for (const lz of [-13, -39, -65]) m.set(x, -1, lz, '#f3f0e6');
      }
      // near side: grass verge with tire stacks, hay bales, cones and flowers
      for (let x = 0; x < TILE; x += 2) for (let z = TRACK_NEAR + 4; z < 70; z += 2) {
        const r = hash3(x, 5, z);
        if (r < 0.012) flower(m, x, z, ['#f19bc0', '#ffffff', '#ffb347', '#9a7ae0', '#f4d03f'][Math.floor(hash3(x, 6, z) * 5)], 1 + Math.floor(r * 200));
      }
      for (let x = 40; x < TILE; x += 150) {
        tireStack(m, x, 30, 3, '#e8402e'); tireStack(m, x + 7, 30, 3, WHITE); tireStack(m, x + 3.5, 36, 2, '#3a6fc4');
        m.box(x + 60, 0, 28, x + 70, 5, 34, (xx, y) => (y % 2 ? '#e8c97a' : '#d8b860')); // hay bale
        m.cone(x + 100, 31, 1.8, 0.4, 0, 5, (xx, y) => (y === 2 ? WHITE : '#ff8a2a'));  // cone
      }
      // far side: a striped barrier wall
      m.box(0, 0, TRACK_FAR - 8, TILE, 5, TRACK_FAR - 5, (x, y) => (y === 4 ? WHITE : Math.floor(x / 16) % 2 ? '#e8402e' : WHITE));
      // The far scenery is big and simple, so it's built from double-size blocks (half the coordinates).
      const B = new VoxelModel(null);
      // the grandstand: wooden tiers stepping up and back, a back wall and a stripy roof
      const S0 = 20, S1 = 260, Z0 = (TRACK_FAR - 14) / 2;
      this.standTiers = [];
      [2, 4, 7, 9].forEach((top, i) => {
        const z1 = Z0 - i * 5;
        B.box(S0, 0, z1 - 5, S1, top, z1, (x, y) => (y === top - 1 ? (Math.floor(x / 3) % 2 ? '#c99a62' : '#b8884f') : '#8a5a30'));
        this.standTiers.push({ top: top * 2, z: (z1 - 2.5) * 2 });
      });
      const ZB = Z0 - 20;
      B.box(S0, 0, ZB - 1, S1, 20, ZB, (x, y) => (y > 18 ? '#6a4220' : '#7a4a24'));
      for (let x = S0; x < S1; x += 20) B.box(x, 0, Z0 - 1, x + 1, 20, Z0, '#6a4220'); // roof posts
      B.box(S0 - 2, 20, ZB - 1, S1 + 2, 21, Z0 + 2, (x) => (Math.floor(x / 5) % 2 ? '#d23c3a' : WHITE));
      for (let x = S0 - 2; x < S1 + 2; x++) if (x % 5 < 2) B.set(x, 19, Z0 + 1, Math.floor(x / 5) % 2 ? '#d23c3a' : WHITE); // scalloped edge
      for (let x = S0 + 10; x < S1; x += 30) { // flags on the roof
        for (let y = 21; y < 28; y++) B.set(x, y, ZB + 2, '#d8d4cc');
        B.box(x + 1, 25, ZB + 2, x + 5, 28, ZB + 3, ['#f4d03f', '#3a6fc4', '#3f9a4a', '#e8402e'][Math.floor(x / 30) % 4]);
      }
      // the rest of the far side: giant toadstools, billboards and lots of trees
      for (let x = 280; x < TILE / 2 - 10; x += 35) toadstool(B, x + Math.floor(hash3(x, 1, 1) * 15), (TRACK_FAR - 34) / 2 - Math.floor(hash3(x, 2, 1) * 15), 3.5 + Math.floor(hash3(x, 3, 1) * 3));
      for (let x = 0; x < TILE / 2; x += 18) tree(B, x + Math.floor(hash3(x, 1, 2) * 7), -95 - Math.floor(hash3(x, 2, 2) * 30), 5 + Math.floor(hash3(x, 3, 2) * 4));
      for (const bx of [310, 400]) for (const px of [bx, bx + 44]) B.box(px, 0, (TRACK_FAR - 26) / 2, px + 1, 19, (TRACK_FAR - 24) / 2, '#6a4220');
      this.bigGeo = buildGeometry(B, { jitter: 0.06 });
      this.tileGeo = buildGeometry(m, { jitter: 0.06 });
      // Crowd critters: one geometry per kind, shared by every seat.
      this.crowdGeo = Object.fromEntries(CRITTERS.map((c) => { const g = buildGeometry(c.build().model, { jitter: 0.05 }); return [c.id, g]; }));
      this.banners = [
        ['GNOME DEPOT', { bg: '#d23c3a', fg: '#fbf7ee', border: '#f4d03f' }],
        ['CRUMPET CAFE', { bg: '#f3e8d0', fg: '#6a4220', border: '#8a5a30' }],
        ['DANDELION POP', { bg: '#f4d03f', fg: '#2f6a2c', border: '#3f9a4a' }],
        ['ACORN BANK', { bg: '#3a6fc4', fg: '#fbf7ee', border: '#fbf7ee' }],
      ];
    }
    const group = new THREE.Group();
    const scenery = new THREE.Mesh(this.tileGeo, voxelMaterial);
    scenery.receiveShadow = true; scenery.castShadow = true;
    const big = new THREE.Mesh(this.bigGeo, voxelMaterial);
    big.scale.setScalar(2);
    big.receiveShadow = true; big.castShadow = true;
    group.add(scenery, big);
    // the big sign on the grandstand roof, ads on the wall and billboards
    const sign = banner('GRAND GNOME PRIX', 200, 18, { w: 1024, h: 92, size: 44, bg: '#2a2628', fg: '#f4d03f', check: true });
    sign.position.set(280, 51, -147);
    group.add(sign);
    for (let i = 0; i < 8; i++) {
      const [text, o] = this.banners[i % this.banners.length];
      const b = banner(text, 70, 5, { ...o, w: 512, h: 40, size: 22 });
      b.position.set(70 + i * 115, 2.6, TRACK_FAR - 4.9);
      group.add(b);
    }
    [[620, 0], [800, 2]].forEach(([bx, k]) => {
      const [text, o] = this.banners[k];
      const b = banner(text, 84, 18, { ...o, w: 512, h: 110, size: 34 });
      b.position.set(bx + 45, 28, TRACK_FAR - 23.8);
      group.add(b);
    });
    // the crowd
    const crowd = [];
    const rnd = (i, k) => hash3(i, k, 77);
    let n = 0;
    this.standTiers.forEach((tier, ti) => {
      for (let x = 52; x < 512; x += 15) {
        n++;
        if (rnd(n, 1) < 0.12) continue; // a few empty seats
        const kind = CRITTERS[Math.floor(rnd(n, 2) * CRITTERS.length)];
        const mesh = new THREE.Mesh(this.crowdGeo[kind.id], voxelMaterial);
        const sc = 0.85 + rnd(n, 4) * 0.25;
        mesh.scale.setScalar(sc);
        mesh.position.set(x + rnd(n, 3) * 5, tier.top, tier.z);
        mesh.rotation.y = (rnd(n, 5) - 0.5) * 0.6;
        mesh.userData = { base: tier.top, phase: rnd(n, 6) * 10, rate: 7 + rnd(n, 7) * 5, tier: ti };
        group.add(mesh);
        crowd.push(mesh);
      }
    });
    // picnic spectators on the toadstools
    for (let i = 0; i < 6; i++) {
      const kind = CRITTERS[i % CRITTERS.length];
      const mesh = new THREE.Mesh(this.crowdGeo[kind.id], voxelMaterial);
      mesh.position.set(575 + i * 62, 0, TRACK_FAR - 16 - (i % 2) * 6);
      mesh.userData = { base: 0, phase: i * 1.7, rate: 8, tier: 0 };
      group.add(mesh);
      crowd.push(mesh);
    }
    return { group, crowd };
  }

  buildGantry() {
    const g = new THREE.Group();
    const m = new VoxelModel(null);
    const Z1 = TRACK_NEAR + 6, Z0 = TRACK_FAR - 6;
    // only a pillar on the far side, so it never blocks the view of the cars
    m.box(-3, 0, Z0 - 6, 3, 50, Z0, '#d8d4cc');
    m.box(-3, 46, Z0 - 6, 3, 50, TRACK_NEAR - 4, '#2a2628');
    for (let z = Z0; z < Z0 + 30; z++) m.set(0, 45 - Math.floor((z - Z0) / 2), z, '#d8d4cc'); // a brace
    for (let z = TRACK_FAR; z < TRACK_NEAR; z++) for (let x = -6; x < 0; x++) m.set(x, -1, z, (Math.floor(z / 3) + Math.floor(x / 3)) % 2 ? '#2a2628' : WHITE); // the line
    const mesh = buildMesh(m, { jitter: 0.04 });
    mesh.receiveShadow = true;
    g.add(mesh);
    const sign = banner('GRAND GNOME PRIX', 110, 13, { w: 1024, h: 120, size: 50, bg: '#d23c3a', fg: '#fbf7ee', check: true });
    sign.rotation.y = Math.PI / 2;
    sign.position.set(3.1, 40, (Z0 + TRACK_NEAR - 4) / 2);
    g.add(sign);
    return g;
  }

  // ---------- entering and leaving ----------
  enter() {
    const { world, gnome } = this.game;
    if (!this.scene) this.build();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    // The gnome's car is painted like its hat.
    const p = this.state.paint;
    const carKey = `${p.hat}|${p.shirt}`;
    if (this.carKey !== carKey) {
      if (this.car) { this.scene.remove(this.car.group); disposeCar(this.car); }
      const accent = p.hat.toLowerCase() === p.shirt.toLowerCase() ? WHITE : p.shirt;
      this.car = buildCar(p.hat, accent, 1);
      this.carKey = carKey;
      this.scene.add(this.car.group);
    }
    gnome.stop();
    gnome.walk = null;
    this.car.seat.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    gnome.object.scale.setScalar(1.25);    // a big gnome in a little car reads better from up here

    this.phase = 'ready';
    this.resetRace();
    this.tags = h('div', { class: 'race-tags' });
    this.tagEls = RIVALS.map((r) => { const el = h('div', { class: 'race-tag hidden' }); this.tags.append(el); return el; });
    this.card = h('div', { class: 'type-card race' });
    this.timePill = h('div', { class: 'pill' }, `⏱ ${RACE_SECONDS}`);
    this.lapPill = h('div', { class: 'pill' }, '🏁 Lap 1');
    this.bestPill = h('div', { class: 'pill' }, `Best: ${this.state.best.race || 0} WPM`);
    this.board = h('div', { class: 'race-board' });
    this.speedo = h('div', { class: 'speedo' }, h('div', { class: 'sp-dial' }), h('div', { class: 'sp-needle' }), h('div', { class: 'sp-num' }, '0'), h('div', { class: 'sp-unit' }, 'WPM'));
    this.root.replaceChildren(this.tags, this.board, this.speedo, h('div', { class: 'type-screen race' },
      h('div', { class: 'g-top' }, h('div', { class: 'pill title' }, '🏎️ GRAND GNOME PRIX'), this.timePill, this.lapPill, this.bestPill,
        button('Quit', () => this.quit(), 'small red')),
      this.card));
    this.speedoShown = null;
    this.showReady();
    this.updateBoard(true);
    this.setSpeedo(0);
    this.game.line('raceStart', 4);
  }
  exit() {
    const { world, gnome } = this.game;
    this.pad?.destroy();
    this.pad = null;
    clearTimeout(this.lightTimer);
    engine.stop();
    world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    gnome.object.scale.setScalar(1);
    this.camera.clearViewOffset();
    world.active = null;
    world.resize();
    this.fx.clear();
    this.root.innerHTML = '';
  }

  resetRace() {
    this.elapsed = 0;
    this.chars = 0;          // right keys this race
    this.dist = 0;           // where the car is drawn (chases chars * PER_CHAR)
    this.speed = 0;
    this.keyTimes = [];
    this.lap = 1;
    this.cleanRun = 0;
    this.wrongRow = 0;
    this.quitted = false;
    this.cheer = 0;
    this.wobble = 0;
    this.geraldAt = 18 + Math.random() * 10;
    this.geraldT = -1;
    const speeds = rivalSpeeds(this.state.best.race || 0);
    this.rivals = RIVALS.map((r, i) => ({ ...r, wpm: speeds[i], dist: 0, car: this.rivalCars[i] }));
    this.ahead = this.rivals.map(() => false);
  }

  showReady() {
    const best = this.state.best.race || 0;
    this.card.replaceChildren(h('div', { class: 'intro' },
      h('h2', {}, 'Grand Gnome Prix!'),
      h('p', {}, 'One minute, flat out! Your car only goes when you type the right keys, so the faster you type, the faster you zoom.'),
      h('p', { class: 'small' }, `Race the critters: ${this.rivals.map((r) => `${r.emo} ${r.name} (${r.wpm} WPM)`).join(', ')}. Win trophies for your garden by typing fast with at least ${PRIZE_ACCURACY}% accuracy.`),
      this.shelf(),
      h('p', { class: 'small' }, best ? `Your top speed: ${best} WPM${this.state.best.raceAcc ? ` (${this.state.best.raceAcc}% accuracy)` : ''}` : 'No top speed yet. Set one!'),
      h('div', { class: 'row' }, button('Start your engines! (Enter)', () => this.countdown(), 'gold big'))));
  }

  // All the race trophies: the ones you've won are shiny, the rest say how fast to go.
  shelf(fresh = []) {
    const s = this.state;
    return h('div', { class: 'prize-shelf' }, ...PRIZES.map((it) => {
      const have = s.owned.includes(it.id);
      return h('div', { class: 'prize' + (have ? '' : ' locked') + (fresh.includes(it.id) ? ' fresh' : ''), title: have ? `${it.name}: ${it.desc}` : `Type ${it.prize.wpm} WPM to win the ${it.name}` },
        h('img', { src: thumbnail(getModel(it.id), it.id), alt: '' }),
        h('span', {}, have ? it.name : `${it.prize.wpm} WPM`));
    }));
  }

  // F1 start lights: five reds come on one by one, then all go out. GO!
  countdown() {
    if (this.phase !== 'ready' && this.phase !== 'results') return;
    this.phase = 'countdown';
    this.resetRace();
    this.pad?.destroy();
    this.pad = null;
    this.fx.clear();
    this.timePill.textContent = `⏱ ${RACE_SECONDS}`;
    this.timePill.classList.remove('hot');
    this.lapPill.textContent = '🏁 Lap 1';
    this.updateBoard(true);
    const lights = [0, 1, 2, 3, 4].map(() => h('i'));
    const note = h('div', { class: 'mole-wait' }, 'Fingers on Gnome Row... wait for the lights to go out!');
    this.card.replaceChildren(h('div', { class: 'start-lights' }, ...lights), note);
    engine.start();
    engine.set(0.05);
    let n = 0;
    const step = () => {
      if (this.phase !== 'countdown') return;
      if (n < 5) {
        lights[n].classList.add('on');
        sfx.light();
        engine.set(0.1 + n * 0.08);
        n++;
        this.lightTimer = setTimeout(step, n < 5 ? 700 : 700 + Math.random() * 700);
      } else {
        for (const l of lights) { l.classList.remove('on'); l.classList.add('go'); }
        sfx.lightsOut();
        this.start();
      }
    };
    this.lightTimer = setTimeout(step, 600);
  }

  start() {
    this.picker = new TextPicker(this.state);
    this.phase = 'play';
    this.startTime = performance.now(); // a speed test runs on the real clock, even if frames are slow
    this.pad = new TypePad({
      state: this.state,
      onKey: (k) => this.onPadKey(k),
      onWord: (w) => this.onWord(w),
      onLine: () => this.nextLine(),
    });
    this.card.replaceChildren(this.pad.el);
    this.lineNext = this.picker.line(24);
    this.nextLine();
    this.game.say('GO GO GO!', 1.5);
  }
  nextLine() {
    const now = this.lineNext;
    this.lineNext = this.picker.line(24);
    this.pad.setText(now, this.lineNext);
  }

  onPadKey({ ok }) {
    if (this.phase !== 'play') return;
    if (ok) {
      this.chars++;
      this.keyTimes.push(this.elapsed);
      this.wrongRow = 0;
      sfx.key(this.pad.i);
      return;
    }
    // A wrong key: the engine sputters and the car wobbles (and doesn't go anywhere).
    sfx.wrongKey();
    sfx.sputter();
    this.wobble = 0.35;
    this.cleanRun = 0;
    this.fx.puff(this.car.group.localToWorld(new THREE.Vector3(-33, 8, 0)), 4, '#5a5a5a');
    this.wrongRow++;
    if (this.wrongRow >= 3) { this.wrongRow = 0; this.game.line('typeWrong', 2); }
    if (!this.game.gnome.busy) this.game.gnome.act('shake');
  }
  onWord({ clean }) {
    if (this.phase !== 'play') return;
    this.cleanRun = clean ? this.cleanRun + 1 : 0;
    if (this.cleanRun > 0 && this.cleanRun % 10 === 0) {
      // Ten clean words in a row: a little turbo flame (just for show; your speed is your speed).
      sfx.combo(this.cleanRun / 2);
      this.turbo = 0.8;
      this.fx.word(this.car.group.localToWorld(new THREE.Vector3(0, 36, 0)), 'TURBO!', '#e8823a');
      this.game.gnome.act('hop');
      this.game.line('raceTurbo', 2);
    }
  }

  // Typing speed right now: right keys in the last few seconds.
  liveWpm() {
    const win = Math.max(2, Math.min(5, this.elapsed));
    const since = this.elapsed - win;
    while (this.keyTimes.length && this.keyTimes[0] < since) this.keyTimes.shift();
    return this.keyTimes.length / 5 / (win / 60);
  }
  rivalDist(r, t) {
    // Steady on average, with a little surge and fade so it looks like racing.
    const v = r.wpm * PER_WPM;
    return v * t + v * 0.9 * Math.sin((2 * Math.PI * r.wave * t) / RACE_SECONDS);
  }

  update(dt) {
    const time = performance.now() / 1000;
    if (this.phase === 'play') {
      this.elapsed = (performance.now() - this.startTime) / 1000;
      const left = RACE_SECONDS - this.elapsed;
      this.timePill.textContent = `⏱ ${Math.max(0, Math.ceil(left))}`;
      this.timePill.classList.toggle('hot', left < 10);
      for (const r of this.rivals) r.dist = this.rivalDist(r, Math.min(this.elapsed, RACE_SECONDS));
      if (left <= 0) { this.elapsed = RACE_SECONDS; this.finish(); }
    } else if (this.phase === 'results') {
      // After the flag everyone rolls to a stop.
      for (const r of this.rivals) { r.roll = (r.roll ?? r.wpm * PER_WPM) * Math.pow(0.3, dt); r.dist += r.roll * dt; }
    }
    // The car chases where your typing has got it to.
    const target = this.chars * PER_CHAR + (this.phase === 'results' ? this.coast || 0 : 0);
    if (this.phase === 'results') this.coast = (this.coast || 0) + (this.coastV = (this.coastV ?? this.speed) * Math.pow(0.3, dt)) * dt;
    const prev = this.dist;
    this.dist += (target - this.dist) * (1 - Math.exp(-dt * 3.5));
    this.speed = dt > 0 ? (this.dist - prev) / dt : 0;
    const k = Math.min(1, this.speed / (60 * PER_WPM));
    if (this.phase === 'play') engine.set(0.06 + k * 0.94);
    else if (this.phase === 'results') { if (k < 0.02) engine.stop(); else engine.set(k * 0.6); }

    // overtakes
    if (this.phase === 'play') {
      this.rivals.forEach((r, i) => {
        const ahead = this.dist > r.dist + 8;
        const behind = this.dist < r.dist - 8;
        if (ahead && !this.ahead[i]) { this.ahead[i] = true; if (this.elapsed > 2) { sfx.vroom(); this.cheer = 1.2; sfx.cheer(); if (Math.random() < 0.6) this.game.line('raceOvertake', 2); } }
        else if (behind && this.ahead[i]) { this.ahead[i] = false; if (Math.random() < 0.4) this.game.line('racePassed', 2); }
      });
    }
    // laps
    const lap = Math.max(1, Math.floor((this.dist - START_LINE) / LAP) + 1);
    if (lap !== this.lap && this.phase !== 'countdown' && this.phase !== 'ready') {
      this.lap = lap;
      this.lapPill.textContent = `🏁 Lap ${lap}`;
      this.lapPill.classList.remove('pop'); void this.lapPill.offsetWidth; this.lapPill.classList.add('pop');
      sfx.chime();
      this.cheer = 1.5;
    }

    this.moveWorld(dt, time, k);
    this.setSpeedo(this.phase === 'play' ? this.liveWpm() : this.phase === 'results' ? this.finalWpm : 0);
    if (Math.floor(time * 5) !== this.boardTick) { this.boardTick = Math.floor(time * 5); this.updateBoard(); }
    this.fx.update(dt);
    this.frame();
    this.placeTags();
  }

  moveWorld(dt, time, k) {
    const d = this.dist;
    // scenery tiles: three copies leapfrogging along
    const base = Math.floor(d / TILE);
    this.tiles.forEach((t, i) => { t.group.position.x = (base - 1 + i) * TILE - d; });
    // the gantry at the next (or last) start/finish line
    const lapN = Math.round((d - START_LINE) / LAP);
    this.gantry.position.x = START_LINE + lapN * LAP - d;
    // the crowd bounces, more when you're fast and lots when something exciting happens
    this.cheer = Math.max(0, this.cheer - dt);
    const amp = 0.4 + k * 2.2 + this.cheer * 2;
    for (const t of this.tiles) {
      if (Math.abs(t.group.position.x + TILE / 2) > TILE) continue;
      for (const c of t.crowd) {
        const u = c.userData;
        c.position.y = u.base + amp * Math.abs(Math.sin(time * u.rate * 0.5 + u.phase));
      }
    }
    // my car: wheels spin, a little road buzz, a tilt when speeding up, a wobble after a mistake
    const car = this.car;
    for (const w of car.wheels) w.mesh.rotation.z -= (this.speed / w.R) * dt;
    this.wobble = Math.max(0, this.wobble - dt);
    this.accel = (this.accel || 0) * 0.9 + ((this.speed - (this.lastSpeed || 0)) / Math.max(dt, 0.001)) * 0.1;
    this.lastSpeed = this.speed;
    car.lean.position.y = 0.12 * k * Math.sin(time * 50);
    car.lean.rotation.z = Math.max(-0.03, Math.min(0.03, this.accel * 0.0001));
    car.lean.rotation.x = this.wobble > 0 ? 0.04 * Math.sin(this.wobble * 50) : 0;
    // rivals, where they are compared to me
    this.rivals.forEach((r) => {
      const x = r.dist - d;
      r.car.group.visible = Math.abs(x) < 500;
      r.car.group.position.x = x;
      const rv = this.phase === 'play' ? r.wpm * PER_WPM * (1 + 0.9 * (2 * Math.PI * r.wave / RACE_SECONDS) * Math.cos((2 * Math.PI * r.wave * this.elapsed) / RACE_SECONDS)) : this.phase === 'results' ? (r.roll || 0) : 0;
      for (const w of r.car.wheels) w.mesh.rotation.z -= (rv / w.R) * dt;
      r.car.lean.position.y = 0.1 * Math.min(1, rv / 200) * Math.sin(time * 47 + r.num);
      r.car.driver.rotation.z = 0.04 * Math.sin(time * 3 + r.num);
    });
    // dust from the back wheels, and the turbo flame
    this.dustAt = (this.dustAt || 0) - dt * k * 18;
    if (this.dustAt <= 0 && k > 0.05) {
      this.dustAt = 1;
      for (const z of [14, -14]) this.fx.cube(new THREE.Vector3(-28, 0.6, z), '#e4ddd0', { vel: new THREE.Vector3(-20 - this.speed * 0.3, 1 + Math.random() * 2, (Math.random() - 0.5) * 4), drag: 0.93, life: 0.45, s0: 0.8, s1: 2.2, spin: 2 });
    }
    this.turbo = Math.max(0, (this.turbo || 0) - dt);
    if (this.turbo > 0) {
      for (let i = 0; i < 2; i++) this.fx.cube(new THREE.Vector3(-33, 7, 0), Math.random() < 0.5 ? '#ffb347' : '#ff5a3a', { vel: new THREE.Vector3(-40 - Math.random() * 20, Math.random() * 4, (Math.random() - 0.5) * 4), drag: 0.9, life: 0.35, s0: 1.6, s1: 0.2 });
    }
    // speed streaks
    this.streakMat.opacity = Math.max(0, (k - 0.25) * 0.7);
    for (const s of this.streaks) {
      s.position.x -= (this.speed * 2.2 + 60) * dt;
      s.scale.x = s.userData.len * (0.4 + k);
      if (s.position.x < -170) { s.position.x = 170 + Math.random() * 60; s.position.y = 3 + Math.random() * 30; s.position.z = -30 + Math.random() * 70; }
    }
    // Gerald pops by now and then, flapping very hard to keep up
    if (this.phase === 'play') {
      this.geraldAt -= dt;
      if (this.geraldAt <= 0 && this.geraldT < 0) { this.geraldT = 0; this.geraldAt = 22 + Math.random() * 14; this.gerald.group.visible = true; sfx.coo(); if (Math.random() < 0.6) this.game.line('raceGerald', 2.5); }
    }
    if (this.geraldT >= 0) {
      this.geraldT += dt;
      const g = this.gerald.group;
      g.position.set(-150 + this.geraldT * 45, 44 + Math.sin(this.geraldT * 3) * 3, -30);
      this.gerald.flap(0.6 * Math.sin(this.geraldT * 28));
      if (this.geraldT > 7) { this.geraldT = -1; g.visible = false; }
    }
    // a gentle camera shake when flat out
    const shake = k > 0.5 ? (k - 0.5) * 0.5 : 0;
    this.camera.position.set(this.camHome.x + Math.sin(time * 37) * shake, this.camHome.y + Math.sin(time * 43) * shake, this.camHome.z);
  }

  // Keep the track in the space above the typing card.
  frame() {
    const w = innerWidth, hgt = innerHeight;
    const card = this.card?.getBoundingClientRect();
    const top = card && card.height ? card.top : hgt;
    const shift = Math.round(hgt / 2 - (60 + top) / 2);
    const v = this.camera.view;
    if (!v || v.offsetY !== shift || v.fullWidth !== w || v.fullHeight !== hgt) this.camera.setViewOffset(w, hgt, 0, shift, w, hgt);
    this.cardTop = top;
  }

  setSpeedo(wpm) {
    const max = Math.max(60, Math.ceil(((this.state.best.race || 0) * 1.4) / 20) * 20);
    const show = Math.round(wpm);
    if (show === this.speedoShown && max === this.speedoMax) return;
    this.speedoShown = show; this.speedoMax = max;
    const f = Math.min(1, wpm / max);
    this.speedo.style.setProperty('--f', f);
    this.speedo.querySelector('.sp-num').textContent = show;
    this.speedo.classList.toggle('fast', f > 0.66);
  }

  // Who's winning: everyone sorted by how far they've gone, with gaps in meters.
  standings() {
    const me = { me: true, emo: '🍄', name: this.state.gnomeName || 'You', dist: this.phase === 'results' ? this.chars * PER_CHAR : this.dist };
    const all = [me, ...this.rivals.map((r) => ({ emo: r.emo, name: r.name, dist: this.phase === 'results' ? r.final ?? r.dist : r.dist, wpm: r.wpm }))];
    return all.sort((a, b) => b.dist - a.dist);
  }
  updateBoard(force) {
    const rows = this.standings();
    const me = rows.find((r) => r.me);
    const key = rows.map((r) => r.name + Math.round((r.dist - me.dist) / METERS)).join('|');
    if (!force && key === this.boardKey) return;
    this.boardKey = key;
    this.board.replaceChildren(...rows.map((r, i) => h('div', { class: 'rb-row' + (r.me ? ' me' : '') },
      h('b', {}, i + 1), h('span', { class: 'rb-emo' }, r.emo), h('span', { class: 'rb-name' }, r.me ? `${r.name} (you)` : r.name),
      h('span', { class: 'rb-gap' }, r.me ? '' : (() => { const g = Math.round((r.dist - me.dist) / METERS); return g === 0 ? 'level' : g > 0 ? `+${g} m` : `${g} m`; })()))));
  }

  // Name tags over the rival cars when they're on screen.
  placeTags() {
    const placed = [];
    this.rivals.forEach((r, i) => {
      const el = this.tagEls[i];
      const p = this.game.world.toScreen(r.car.group.position.clone().add(new THREE.Vector3(0, 26, 0)), this.camera);
      const show = r.car.group.visible && !p.behind && p.x > 40 && p.x < innerWidth - 40 && p.y > 70 && p.y < (this.cardTop || innerHeight) - 10 && this.phase !== 'ready';
      el.classList.toggle('hidden', !show);
      if (!show) return;
      const text = `${r.emo} ${r.name} · ${r.wpm} WPM`;
      if (el.textContent !== text) el.textContent = text;
      // nudge tags up so bunched-up cars don't stack their tags on top of each other
      let y = p.y;
      for (const q of placed) if (Math.abs(q.x - p.x) < 190 && Math.abs(q.y - y) < 30) y = q.y - 30;
      placed.push({ x: p.x, y });
      el.style.left = p.x + 'px';
      el.style.top = y + 'px';
    });
  }

  quit() {
    if (this.phase === 'play') { this.quitted = true; this.finish(); }
    else if (this.phase === 'countdown') { clearTimeout(this.lightTimer); engine.stop(); this.phase = 'ready'; this.showReady(); }
    else this.game.go('home');
  }

  finish() {
    if (this.phase !== 'play') return;
    const { S, gnome } = this.game;
    const s = this.state;
    this.phase = 'results';
    this.pad.pause();
    this.coast = 0; this.coastV = null;
    const secs = Math.max(1, this.elapsed);
    const wpm = Math.round(this.chars / 5 / (secs / 60));
    const acc = this.pad.accuracy;
    this.finalWpm = wpm;
    for (const r of this.rivals) { r.final = this.rivalDist(r, secs); r.roll = null; }
    const rows = this.standings();
    const place = rows.findIndex((r) => r.me) + 1;
    const full = !this.quitted;
    // records and prizes (only for a full minute)
    const oldBest = s.best.race || 0;
    const newBest = full && wpm > oldBest;
    if (newBest) { s.best.race = wpm; s.best.raceAcc = acc; }
    const careful = acc >= PRIZE_ACCURACY;
    const won = full && careful ? PRIZES.filter((p) => wpm >= p.prize.wpm && !s.owned.includes(p.id)) : [];
    const missed = full && !careful ? PRIZES.filter((p) => wpm >= p.prize.wpm && !s.owned.includes(p.id)) : [];
    for (const p of won) s.owned.push(p.id);
    const placed = won.map((p) => this.game.placeDecor(p.id));
    let acorns = full ? Math.round(wpm / 2) + [6, 4, 2, 1][place - 1] + (newBest ? 5 : 0) : Math.round(wpm / 4);
    if (this.chars === 0) acorns = 0;
    S.addAcorns(acorns);
    s.history.push({ t: Date.now(), game: 'race', words: this.pad.stats.words, acc, wpm, score: wpm });
    if (s.history.length > 200) s.history.shift();
    if (this.pad.stats.right > 0) S.addStat('joy', 10);
    S.save();
    this.bestPill.textContent = `Best: ${s.best.race || 0} WPM`;
    this.updateBoard(true);
    // the checkered flag!
    sfx.fanfare();
    if (place === 1 || newBest || won.length) { sfx.cheer(); this.cheer = 4; }
    this.fx.confetti(gnome.headTop(), 40);
    gnome.act('cheer');
    this.game.line(won.length ? 'racePrize' : newBest ? 'newBest' : place === 1 ? 'raceWin' : 'raceEnd', 4);
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, this.quitted ? 'Pit stop!' : `${MEDAL[place - 1]} ${ordinal(place)} place!`),
      h('div', { class: 'race-wpm' }, h('b', {}, wpm), ' WPM'),
      newBest ? h('div', { class: 'res-best' }, `NEW TOP SPEED! (was ${oldBest}) +5 🌰`) : null,
      this.quitted ? h('p', { class: 'small' }, 'Top speeds and trophies only count for a full minute.') : null,
      h('div', { class: 'res-grid' },
        h('div', {}, 'Accuracy', h('b', {}, acc + '%')),
        h('div', {}, 'Finished', h('b', {}, `${ordinal(place)} of ${rows.length}`)),
        h('div', { class: 'gold' }, 'Prize money', h('b', {}, `🌰 ${acorns}`))),
      won.length ? h('div', { class: 'prize-won' },
        h('b', {}, won.length > 1 ? `You won ${won.length} trophies!` : `You won the ${won[0].name}!`),
        h('span', {}, placed.every((i) => i >= 0) ? 'They\'re in your garden now.' : 'The garden is full, so use Garden to put them out.')) : null,
      missed.length ? h('p', { class: 'small' }, `So fast! But trophies need ${PRIZE_ACCURACY}% accuracy (you had ${acc}%). Slow down a tiny bit and you'll win the ${missed[0].name}!`) : null,
      this.shelf(won.map((p) => p.id)),
      h('div', { class: 'row' },
        button('Race again! (Enter)', () => this.countdown(), 'gold'),
        button('Home (Esc)', () => this.game.go('home'), ''))));
    afterRound(this.game);
  }

  onKey(e) {
    if (this.phase === 'ready' || this.phase === 'results') {
      if (e.key === 'Enter') { e.preventDefault(); this.countdown(); }
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (e.key === 'Escape') { this.quit(); return; }
    if (this.phase === 'countdown') { if (e.key.length === 1) e.preventDefault(); return; } // no jump starts!
    if (this.phase !== 'play') return;
    this.pad.key(e);
  }
}
