// Little particle effects: sparkles, hearts, leaves, pollen, crumbs, confetti.
import * as THREE from '../vendor/three.module.min.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const mats = new Map();
const mat = (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c })); return mats.get(c); };

// Emoji/text sprites drawn on a canvas once and reused.
const texCache = new Map();
function spriteTex(text) {
  if (!texCache.has(text)) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (text.length > 2) {
      x.font = '14px "Press Start 2P", monospace';
      x.lineWidth = 5; x.strokeStyle = '#ffffff'; x.strokeText(text, 32, 34);
      x.fillStyle = '#5a3a8a'; x.fillText(text, 32, 34);
    } else {
      x.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.fillText(text, 32, 36);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(text, t);
  }
  return texCache.get(text);
}
const rnd = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
  }

  add(obj, p) {
    obj.visible = !(p.delay > 0);
    this.scene.add(obj);
    this.parts.push({ obj, age: 0, gravity: 0, drag: 0.98, spin: 0, s0: 1, s1: 0, fade: false, vel: V(0, 0, 0), life: 1, ...p });
  }
  cube(pos, color, opts = {}) {
    const m = new THREE.Mesh(box, mat(color));
    m.position.copy(pos);
    this.add(m, opts);
  }
  sprite(pos, text, opts = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex(text), transparent: true, depthWrite: false }));
    s.position.copy(pos);
    this.add(s, { fade: true, ...opts });
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.delay > 0) { p.delay -= dt; if (p.delay <= 0) p.obj.visible = true; else continue; }
      p.age += dt;
      const k = Math.min(1, p.age / p.life);
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(Math.pow(p.drag, dt * 60));
      p.obj.position.addScaledVector(p.vel, dt);
      const s = p.s0 + (p.s1 - p.s0) * k;
      p.obj.scale.setScalar(Math.max(0.001, s));
      if (p.spin) { p.obj.rotation.x += p.spin * dt; p.obj.rotation.y += p.spin * 0.7 * dt; }
      if (p.fade && p.obj.material) p.obj.material.opacity = 1 - Math.max(0, (k - 0.6) / 0.4);
      if (k >= 1) {
        this.scene.remove(p.obj);
        if (p.obj.isSprite) p.obj.material.dispose();
        this.parts.splice(i, 1);
      }
    }
  }
  clear() { for (const p of this.parts) this.scene.remove(p.obj); this.parts = []; }

  // ---- presets ----
  sparkles(pos, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.sprite(pos.clone(), '✨', { vel: V(Math.cos(a) * 12, Math.sin(a) * 8 + 6, 3), life: 0.9, s0: 3.2, s1: 1, drag: 0.92 });
    }
  }
  hearts(pos, n = 4) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone().add(V(rnd(-6, 6), rnd(0, 3), 2)), '💖', { vel: V(rnd(-1.5, 1.5), 8 + rnd(0, 5), 0), life: 1.5, s0: 2.6, s1: 3.4, delay: i * 0.1 });
    }
  }
  notes(pos, n = 3) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone().add(V(rnd(-5, 5), 0, 2)), '🎵', { vel: V(rnd(-2, 2), 7, 0), life: 1.5, s0: 2.5, s1: 2.5, delay: i * 0.25 });
    }
  }
  word(pos, text, color) {
    this.sprite(pos.clone().add(V(0, 0, 3)), text, { vel: V(rnd(-1, 1), 7, 0), life: 1.2, s0: 6, s1: 7 });
  }
  pollen(pos, n = 14) {
    const cols = ['#ffe36a', '#fff4a8', '#ffd23a'];
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), cols[i % 3], { vel: V(rnd(-8, 8), rnd(-2, 6), rnd(6, 18)), drag: 0.9, life: 1.2, s0: 0.6, s1: 0, spin: 3 });
    }
  }
  leaves(pos, n = 10, spread = 10) {
    const cols = ['#c9822e', '#a8642a', '#d8a33a', '#b5522a', '#8a9a3a'];
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone().add(V(rnd(-spread, spread), rnd(0, 2), rnd(-spread / 2, spread / 2))), cols[i % cols.length], {
        vel: V(rnd(-10, 10), rnd(6, 14), rnd(-4, 6)), gravity: -14, drag: 0.95, life: 1.6, s0: 1, s1: 0.6, spin: 5, delay: Math.random() * 0.4,
      });
    }
  }
  crumbs(pos, color = '#d9a35a', n = 8) {
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), color, { vel: V(rnd(-6, 6), rnd(2, 8), rnd(2, 8)), gravity: -40, life: 0.9, s0: 0.6, s1: 0.4, spin: 6 });
    }
  }
  bubbles(pos, n = 5) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone().add(V(rnd(-3, 3), 0, 3)), '🫧', { vel: V(rnd(-2, 2), 6 + rnd(0, 3), 0), life: 1.3, s0: 1.5, s1: 3, delay: i * 0.12 });
    }
  }
  splash(pos, n = 12) {
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), i % 2 ? '#8fd0f0' : '#cfeeff', { vel: V(rnd(-10, 10), rnd(6, 16), rnd(0, 8)), gravity: -45, life: 0.9, s0: 0.7, s1: 0.3 });
    }
  }
  puff(pos, n = 6, color = '#ffffff') {
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), color, { vel: V(rnd(-5, 5), rnd(-3, 3), rnd(-2, 4)), drag: 0.88, life: 0.8, s0: 1.5, s1: 0, spin: 2 });
    }
  }
  confetti(pos, n = 40) {
    const cols = ['#ff6b8a', '#ffe14d', '#6fd0ff', '#8fdc3a', '#ff9ccf', '#a98bff'];
    for (let i = 0; i < n; i++) {
      this.cube(pos.clone(), cols[i % cols.length], {
        vel: V(rnd(-20, 20), rnd(15, 45), rnd(-10, 15)), gravity: -45, life: 1.8 + Math.random(), s0: 0.9, s1: 0.9, spin: 8, drag: 0.97,
      });
    }
  }
  acorns(pos, n = 5) {
    for (let i = 0; i < n; i++) {
      this.sprite(pos.clone(), '🌰', { vel: V(rnd(-7, 7), 14 + rnd(0, 8), 4), gravity: -40, life: 1.1, s0: 2.5, s1: 2.5 });
    }
  }
}
