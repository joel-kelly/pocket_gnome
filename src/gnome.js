// The living gnome. It's one solid ceramic figure: all the life comes from
// moving the whole body (hops, squash and stretch, spins, tipping over) plus a
// hat that can fly off and painted eyes that blink.
import * as THREE from '../vendor/three.module.min.js';
import { buildGlazed, disposeGlazed } from './voxel.js';
import { buildGnome, buildMess, HAT_BASE, EYE_Y, SLOTS, DEFAULT_PAINT } from './gnomeModel.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const EDGE = 5.4;   // half the gnome's width: it tips over around its edge
const TIP_YAW = 2.25; // tips over backward-left, so it lands face-up

// A hop: crouch, stretch into the air, squash on landing.
function hop(o, t, H, a0 = 0.1, a1 = 0.48, d = 0.7) {
  let u = 0;
  if (t < a0) { const e = Math.sin((t / a0) * Math.PI / 2); o.sy *= 1 - 0.2 * e; o.sx *= 1 + 0.1 * e; }
  else if (t < a1) { u = (t - a0) / (a1 - a0); o.y += H * 4 * u * (1 - u); const s = 1 + 0.16 * (1 - u) * (1 - u); o.sy *= s; o.sx *= 1 / Math.sqrt(s); }
  else if (t < d) { u = 1; const w = (t - a1) / (d - a1); const s = Math.sin(w * Math.PI) * (1 - w * 0.4); o.sy *= 1 - 0.16 * s; o.sx *= 1 + 0.08 * s; }
  else u = 1;
  return u;
}

// Each action: dur (seconds), pose(t, o) adds to the pose, events: [[time, name]].
export const ACTIONS = {
  hop: { dur: 0.7, pose(t, o) { hop(o, t, 5); }, events: [[0.5, 'tap']] },
  bigHop: { dur: 1.0, pose(t, o) { hop(o, t, 10, 0.13, 0.75, 1.0); }, events: [[0.76, 'tap']] },
  spin: {
    dur: 1.15,
    pose(t, o) { const u = hop(o, t, 7, 0.13, 0.82, 1.15); o.rotY += Math.PI * 2 * ease(clamp01(u)); if (t > 0.2 && t < 0.85) o.eyes = 'happy'; },
    events: [[0.83, 'tap'], [0.9, 'chime']],
  },
  cheer: {
    dur: 1.2,
    pose(t, o) { if (t < 0.6) hop(o, t, 4, 0.08, 0.4, 0.6); else hop(o, t - 0.6, 6, 0.08, 0.45, 0.6); o.eyes = 'happy'; },
    events: [[0.42, 'tap'], [1.05, 'tap']],
  },
  shake: { dur: 0.8, pose(t, o) { const k = 1 - t / 0.8; o.rotZ += 0.13 * Math.sin(t * 55) * k; o.x += 0.45 * Math.sin(t * 47 + 1) * k; }, events: [[0.02, 'rattle']] },
  shiver: { dur: 1.0, pose(t, o) { const k = Math.min(1, t * 6, (1 - t) * 6); o.rotZ += 0.05 * Math.sin(t * 80) * k; o.sx *= 1 - 0.03 * k; } },
  nod: { dur: 0.8, pose(t, o) { o.rotX += 0.14 * Math.max(0, Math.sin((t / 0.8) * Math.PI * 2)) * (1 - t / 0.8); } },
  wobble: {
    dur: 1.4,
    pose(t, o) { const k = Math.min(1, t * 5, (1.4 - t) * 5); o.rotZ += 0.1 * Math.sin(t * 13) * k; o.y += 0.6 * Math.abs(Math.sin(t * 13)) * k; o.eyes = 'happy'; },
  },
  lookAround: { dur: 2.4, pose(t, o) { o.rotY += 0.6 * Math.sin((t / 2.4) * Math.PI * 2); } },
  slump: {
    dur: 2.2,
    pose(t, o) { const k = Math.min(1, t * 3, (2.2 - t) * 3); o.sy *= 1 - 0.08 * k; o.rotX += 0.12 * k; o.eyes = 'sad'; },
  },
  freeze: { dur: 0.9, pose(t, o) { o.stiff = true; o.sx *= 1.02; o.sy *= 1.03; o.eyes = 'wide'; }, events: [[0, 'clink']] },
  hiccup: {
    dur: 0.5,
    pose(t, o) { const u = clamp01(t / 0.3); o.y += 1.8 * 4 * u * (1 - u); o.sy *= 1 + 0.08 * Math.sin(u * Math.PI); o.eyes = 'wide'; },
    events: [[0.03, 'hic']],
  },
  eat: {
    dur: 1.2,
    pose(t, o) { o.sy *= 1 - 0.04 * Math.abs(Math.sin(t * 16)); o.rotX += 0.04 * Math.sin(t * 16); o.eyes = 'happy'; },
    events: [[0.05, 'chomp']],
  },
  sweep: {
    dur: 2.6,
    pose(t, o) { const k = Math.min(1, t * 4, (2.6 - t) * 4); o.rotY += 0.55 * Math.sin(t * 6) * k; o.rotZ += 0.07 * Math.sin(t * 6) * k; o.y += 0.5 * Math.abs(Math.sin(t * 6)) * k; },
    events: [[0.3, 'swish'], [0.82, 'swish'], [1.35, 'swish'], [1.88, 'swish']],
  },
  polish: {
    dur: 1.3,
    pose(t, o) { const k = Math.min(1, t * 6, (1.3 - t) * 6); o.rotY += 0.08 * Math.sin(t * 40) * k; o.eyes = 'happy'; },
    events: [[0.1, 'squeak'], [0.6, 'squeak']],
  },
  sneeze: {
    dur: 2.0,
    pose(t, o) {
      if (t < 0.55) { const u = t / 0.55; o.rotX -= 0.2 * ease(u); o.sy *= 1 + 0.07 * ease(u); o.eyeScale = 1 - 0.7 * u; }
      else if (t < 1.0) { const u = (t - 0.55) / 0.45; const snap = Math.exp(-u * 5) * Math.cos(u * 14); o.rotX += 0.26 * snap; o.sy *= 1 - 0.1 * Math.max(0, snap); if (u < 0.4) o.eyes = 'shut'; }
      if (t > 0.58 && t < 1.5) { const u = (t - 0.58) / 0.92; o.hatY += 8 * 4 * u * (1 - u); o.hatRX -= Math.PI * 2 * ease(u); o.hatX += 1.2 * Math.sin(u * Math.PI); }
      else if (t >= 1.5 && t < 1.8) { const w = (t - 1.5) / 0.3; o.sy *= 1 - 0.07 * Math.sin(w * Math.PI); o.hatRZ += 0.12 * Math.sin(w * Math.PI * 2) * (1 - w); }
    },
    events: [[0.58, 'achoo'], [1.5, 'clink']],
  },
  oops: {
    dur: 3.0,
    pose(t, o) {
      const LIE = 1.25;
      if (t < 0.18) o.rotZ += 0.06 * Math.sin(t * 40);
      else if (t < 0.62) { const u = (t - 0.18) / 0.44; o.tipA = LIE * u * u; o.eyeScale = 1 - u; }
      else if (t < 0.88) { const w = (t - 0.62) / 0.26; o.tipA = LIE - 0.16 * Math.sin(w * Math.PI) * (1 - w * 0.3); o.eyes = 'shut'; o.hatX += 2.2 * ease(w); o.hatRZ -= 0.5 * ease(w); }
      else if (t < 1.55) { o.tipA = LIE; o.hatX += 2.2; o.hatRZ -= 0.5; o.eyes = Math.sin((t - 0.88) * 9) > 0.3 ? 'shut' : 'open'; }
      else {
        const w = (t - 1.55) / 1.45, s = w * 1.45;
        o.tipA = LIE * Math.exp(-3.6 * s) * Math.cos(7 * s) * (1 - w * 0.15);
        const back = 1 - ease(clamp01(w * 3));
        o.hatX += 2.2 * back; o.hatRZ -= 0.5 * back;
      }
    },
    events: [[0.62, 'clonk'], [1.75, 'clink'], [2.0, 'clink']],
  },
  // A little stumble: like oops, but catches itself before falling.
  totter: {
    dur: 1.1,
    pose(t, o) { o.tipA = 0.28 * Math.exp(-3 * t) * Math.sin(t * 11); if (t < 0.4) o.eyes = 'wide'; },
    events: [[0.12, 'clink']],
  },
};

export class Gnome {
  constructor() {
    this.object = new THREE.Group();        // place and turn the gnome with this
    this.yaw = new THREE.Group(); this.yaw.rotation.y = TIP_YAW;
    this.tip = new THREE.Group();
    this.offset = new THREE.Group();
    this.unyaw = new THREE.Group(); this.unyaw.rotation.y = -TIP_YAW;
    this.bounce = new THREE.Group();
    this.object.add(this.yaw); this.yaw.add(this.tip); this.tip.add(this.offset); this.offset.add(this.unyaw); this.unyaw.add(this.bounce);
    this.hatGroup = new THREE.Group();
    this.hatGroup.position.set(...HAT_BASE);
    this.bounce.add(this.hatGroup);
    this.hatHome = new THREE.Vector3(...HAT_BASE);
    this.slots = {};
    this.handlers = {};
    this.action = null;
    this.t = 0;
    this.blinkAt = 2;
    this.emoteUntil = 0;
    this.emoteEyes = null;
    this.mood = 'neutral';
    this.walk = null;
    this.overlay = null; // screens can add to the pose: fn(o, t)
    this.messMesh = buildGlazed(buildMess(), { offset: [-HAT_BASE[0], -HAT_BASE[1], -HAT_BASE[2]] });
    this.messMesh.visible = false;
    this.hatGroup.add(this.messMesh);
    this.setPaint(DEFAULT_PAINT);
  }

  on(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name) { for (const fn of this.handlers[name] || []) fn(); }

  setPaint(paint) {
    this.paint = { ...DEFAULT_PAINT, ...paint };
    const g = buildGnome(this.paint);
    if (this.bodyMesh) { this.bounce.remove(this.bodyMesh); disposeGlazed(this.bodyMesh); }
    if (this.hatMesh) { this.hatGroup.remove(this.hatMesh); disposeGlazed(this.hatMesh); }
    if (this.eyeGroup) this.bounce.remove(this.eyeGroup);
    this.bodyMesh = buildGlazed(g.body);
    this.bounce.add(this.bodyMesh);
    this.hatMesh = buildGlazed(g.hat, { offset: [-HAT_BASE[0], -HAT_BASE[1], -HAT_BASE[2]] });
    this.hatMesh.visible = !this.slots.head;
    this.hatGroup.add(this.hatMesh);
    // painted eyes: two little glossy blocks each, grouped so they can squish shut
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#1c1a1a', roughness: 0.15, clearcoat: 1 });
    const geo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    this.eyeGroup = new THREE.Group();
    this.eyes = g.eyes.map((e) => {
      const grp = new THREE.Group();
      grp.position.set(e.x + 0.5, EYE_Y, 0);
      for (const [y, z] of e.cells) {
        const b = new THREE.Mesh(geo, eyeMat);
        b.position.set(0, y + 0.5 - EYE_Y, z + 0.5);
        grp.add(b);
      }
      this.eyeGroup.add(grp);
      return grp;
    });
    this.bounce.add(this.eyeGroup);
  }

  // outfit = { head: VoxelModel|null, face, neck, hand, back }
  setOutfit(outfit = {}) {
    for (const slot of Object.keys(SLOTS)) {
      if (!(slot in outfit) && !this.slots[slot]) continue;
      const model = outfit[slot] || null;
      const have = this.slots[slot];
      if (have && have.model === model) continue;
      if (have) { have.mesh.parent.remove(have.mesh); disposeGlazed(have.mesh); delete this.slots[slot]; }
      if (!model) continue;
      const o = SLOTS[slot].origin;
      const onHat = slot === 'head';
      const off = onHat ? [o[0] - HAT_BASE[0], o[1] - HAT_BASE[1], o[2] - HAT_BASE[2]] : o;
      const mesh = buildGlazed(model, { offset: off });
      (onHat ? this.hatGroup : this.bounce).add(mesh);
      this.slots[slot] = { model, mesh };
    }
    this.hatMesh.visible = !this.slots.head;
  }

  setMessy(on) { this.messMesh.visible = !!on; }
  setMood(m) { this.mood = m; }

  get busy() { return !!this.action || !!this.walk; }

  act(name, opts = {}) {
    const def = ACTIONS[name];
    if (!def) return Promise.resolve();
    this.action?.resolve();
    return new Promise((resolve) => {
      this.action = { name, def, t: 0, fired: 0, resolve, speed: opts.speed || 1 };
    });
  }
  stop() { this.action?.resolve(); this.action = null; }

  // eyes: 'happy' | 'shut' | 'wide' | 'sad' | 'open'
  emote(eyes, seconds = 1.5) { this.emoteEyes = eyes; this.emoteUntil = this.t + seconds; }

  // Little hops over to a spot on the ground. Faces where it's going, then turns back.
  walkTo(x, z, { speed = 14, face = 0 } = {}) {
    this.walk?.resolve();
    const from = this.object.position.clone();
    const to = new THREE.Vector3(x, from.y, z);
    const dist = from.distanceTo(to);
    if (dist < 0.5) return Promise.resolve();
    return new Promise((resolve) => {
      this.walk = { from, to, t: 0, dur: dist / speed, heading: Math.atan2(to.x - from.x, to.z - from.z), face, resolve };
    });
  }

  update(dt) {
    this.t += dt;
    const o = { x: 0, y: 0, z: 0, sx: 1, sy: 1, rotX: 0, rotY: 0, rotZ: 0, tipA: 0, hatX: 0, hatY: 0, hatRX: 0, hatRZ: 0, eyes: null, eyeScale: 1, stiff: false };
    // walking: tiny hops, turned toward where it's going
    if (this.walk) {
      const w = this.walk;
      w.t += dt;
      const p = clamp01(w.t / w.dur);
      this.object.position.lerpVectors(w.from, w.to, p);
      const turn = Math.min(1, w.t * 6);
      this.object.rotation.y = lerpAngle(this.object.rotation.y, w.heading, turn);
      const ph = (w.t / 0.32) % 1;
      o.y += 1.6 * 4 * ph * (1 - ph);
      o.sy *= 1 + 0.06 * Math.sin(ph * Math.PI);
      if (p >= 1) {
        this.walk = null;
        this.turnBack = { to: w.face, t: 0 };
        w.resolve();
      }
    } else if (this.turnBack) {
      this.turnBack.t += dt;
      this.object.rotation.y = lerpAngle(this.object.rotation.y, this.turnBack.to, Math.min(1, dt * 8));
      if (this.turnBack.t > 0.6) { this.object.rotation.y = this.turnBack.to; this.turnBack = null; }
    }
    // current action
    const a = this.action;
    if (a) {
      a.t += dt * a.speed;
      a.def.pose(Math.min(a.t, a.def.dur), o);
      const evs = a.def.events || [];
      while (a.fired < evs.length && a.t >= evs[a.fired][0]) this.emit(evs[a.fired++][1]);
      if (a.t >= a.def.dur) { this.action = null; a.resolve(); }
    }
    this.overlay?.(o, this.t);
    // A statue (unpainted, at Gnome Depot) doesn't breathe or blink. Yet.
    if (this.statue) { o.stiff = true; o.eyes = o.eyes || 'open'; this.blinkAt = this.t + 1; }
    // moods
    if (this.mood === 'sad' && !a) { o.sy *= 0.97; o.rotX += 0.05; }
    // breathing
    if (!o.stiff) o.sy *= 1 + 0.01 * Math.sin(this.t * 2.2);
    // eyes: emote, then mood, then blinking
    let eyes = o.eyes || (this.t < this.emoteUntil ? this.emoteEyes : null) || (this.mood === 'sad' ? 'sad' : this.mood === 'happy' ? 'open' : 'open');
    if (this.t > this.blinkAt) {
      if (this.t > this.blinkAt + 0.13) this.blinkAt = this.t + 2 + Math.random() * 3.5;
      else if (eyes === 'open' || eyes === 'sad') eyes = 'shut';
    }
    this.applyEyes(eyes, o.eyeScale);
    // apply the pose
    const e = o.tipA >= 0 ? EDGE : -EDGE;
    this.tip.position.x = e; this.offset.position.x = -e; this.tip.rotation.z = -o.tipA;
    this.bounce.position.set(o.x, o.y, o.z);
    this.bounce.scale.set(o.sx, o.sy, o.sx);
    this.bounce.rotation.set(o.rotX, o.rotY, o.rotZ);
    this.hatGroup.position.set(this.hatHome.x + o.hatX, this.hatHome.y + o.hatY, this.hatHome.z);
    this.hatGroup.rotation.set(o.hatRX, 0, o.hatRZ);
    this.lastPose = o;
  }

  applyEyes(kind, scale = 1) {
    for (const eye of this.eyes) {
      let sy = 1, dy = 0, sx = 1;
      if (kind === 'shut') sy = 0.14;
      else if (kind === 'happy') { sy = 0.16; dy = 0.55; sx = 1.15; }
      else if (kind === 'wide') { sy = 1.2; sx = 1.15; }
      else if (kind === 'sad') { sy = 0.55; dy = -0.3; }
      eye.scale.set(sx, sy * scale, 1);
      eye.position.y = EYE_Y + dy;
    }
  }

  // ---- handy points in the world ----
  local(x, y, z) { return this.bounce.localToWorld(new THREE.Vector3(x, y, z)); }
  headTop() { this.object.updateMatrixWorld(true); return this.local(0, this.slots.head ? 29 : 31, -1); }
  mouth() { this.object.updateMatrixWorld(true); return this.local(0, 11.5, 6); }
  hatTop() { this.object.updateMatrixWorld(true); return this.hatGroup.localToWorld(new THREE.Vector3(0, 14, -3)); }
}

function lerpAngle(a, b, k) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}
