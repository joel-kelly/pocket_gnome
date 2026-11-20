// Life at the bird bath: a little fountain bubbles away, and every so often
// Gerald the pigeon flutters down to the rim, sips, splashes, coos and annoys
// the gnome. Click him and he flaps off.
import * as THREE from '../vendor/three.module.min.js';
import { sfx } from './audio.js';
import { buildGerald } from './gerald.js';
import { DECOR_SCALE } from './world.js';

const WATER_Y = 11 * DECOR_SCALE;   // top of the water in the bowl
const SPOUT_Y = 13 * DECOR_SCALE;
const RIM = 6 * DECOR_SCALE;
const GERALD_SCALE = 0.7;
const rand = (a, b) => a + Math.random() * (b - a);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class BirdBathLife {
  constructor(game) {
    this.game = game;
    const g = buildGerald();
    this.gerald = g.group;
    this.flap = g.flap;
    this.gerald.scale.setScalar(GERALD_SCALE);
    this.gerald.visible = false;
    game.world.scene.add(this.gerald);
    this.t = 0;
    this.dropAt = 0;
    this.state = 'away';
    this.nextVisit = 14; // seconds until Gerald's first visit
  }

  // The bird bath's spot in the garden, or null if it isn't out.
  spot() {
    const d = this.game.world.decor.find((x) => x && x.id === 'birdbath');
    return d && this.game.world.decorGroup.visible ? d.group.position : null;
  }

  update(dt, { calm = true } = {}) {
    this.t += dt;
    const at = this.spot();
    const { fx } = this.game;
    if (!at) { this.gerald.visible = false; this.state = 'away'; return; }
    // fountain: a gentle arc of droplets
    if (this.t > this.dropAt) {
      this.dropAt = this.t + 0.09;
      const a = Math.random() * Math.PI * 2;
      fx.cube(new THREE.Vector3(at.x, SPOUT_Y, at.z), Math.random() < 0.5 ? '#8fd0f0' : '#cfeeff', {
        vel: new THREE.Vector3(Math.cos(a) * rand(1, 2.5), rand(7, 10), Math.sin(a) * rand(1, 2.5)), gravity: -32, life: 0.6, s0: 0.45, s1: 0.3, drag: 1,
      });
    }
    this.updateGerald(dt, at, calm);
  }

  // Where Gerald perches: the back of the rim, facing out over the water toward us.
  perch(at) { return new THREE.Vector3(at.x, WATER_Y, at.z - RIM); }

  updateGerald(dt, at, calm) {
    const s = this.state;
    const g = this.gerald;
    this.st = (this.st || 0) + dt;
    if (s === 'away') {
      g.visible = false;
      this.nextVisit -= dt;
      if (this.nextVisit <= 0 && calm) {
        this.state = 'in'; this.st = 0;
        this.from = new THREE.Vector3(at.x + 70, 60, at.z - 40);
        g.visible = true;
      }
      return;
    }
    const perch = this.perch(at);
    if (s === 'in' || s === 'out') {
      const dur = s === 'in' ? 2.6 : 2.0;
      const k = Math.min(1, this.st / dur);
      const a = s === 'in' ? this.from : perch, b = s === 'in' ? perch : this.to;
      const e = s === 'in' ? ease(k) : k * k;
      g.position.lerpVectors(a, b, e);
      g.position.y += Math.sin(k * Math.PI) * 10;
      g.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z), 0);
      this.flap(0.9 * Math.sin(this.t * 22));
      if (k >= 1) {
        if (s === 'in') this.land();
        else { this.state = 'away'; this.nextVisit = rand(35, 70); }
      }
      return;
    }
    // perched: bob about, and every couple of seconds sip, splash or coo
    g.position.copy(perch);
    g.rotation.set(0, 0, 0);
    this.flap(0);
    this.doing = this.doing || null;
    if (!this.doing && this.st > this.nextMove) this.startMove();
    if (this.doing) {
      const d = this.doing;
      d.t += dt;
      const k = Math.min(1, d.t / d.dur);
      if (d.kind === 'sip') g.rotation.x = 0.7 * Math.sin(k * Math.PI);
      if (d.kind === 'splash') { this.flap(1 * Math.sin(d.t * 30)); g.position.y += Math.abs(Math.sin(d.t * 15)) * 0.8; }
      if (d.kind === 'coo') g.scale.setScalar(GERALD_SCALE * (1 + 0.08 * Math.sin(k * Math.PI)));
      if (k >= 1) { this.doing = null; g.scale.setScalar(GERALD_SCALE); this.nextMove = this.st + rand(1.5, 3); }
    } else g.position.y += 0.15 * Math.abs(Math.sin(this.t * 3));
    if (this.st > this.stay) this.leave(false);
  }

  land() {
    const { fx, gnome } = this.game;
    this.state = 'perch'; this.st = 0;
    this.stay = rand(10, 16);
    this.nextMove = 1;
    sfx.tap();
    sfx.coo();
    fx.word(this.gerald.position.clone().add(new THREE.Vector3(0, 8, 0)), 'Coo!');
    if (!gnome.busy) gnome.act('shake');
    this.game.line('geraldArrive', 4);
  }

  startMove() {
    const { fx } = this.game;
    const kind = ['sip', 'sip', 'splash', 'coo'][Math.floor(Math.random() * 4)];
    this.doing = { kind, t: 0, dur: kind === 'splash' ? 1.0 : kind === 'sip' ? 0.8 : 0.6 };
    const water = this.gerald.position.clone().add(new THREE.Vector3(0, 0.5, 3));
    if (kind === 'sip') { setTimeout(() => sfx.gulp(), 300); fx.splash(water, 3); }
    if (kind === 'splash') { sfx.splash(); fx.splash(water, 14); }
    if (kind === 'coo') { sfx.coo(); fx.word(this.gerald.position.clone().add(new THREE.Vector3(0, 8, 0)), 'Coo!'); }
  }

  // Off he goes (shooed = the kid clicked him).
  leave(shooed) {
    if (this.state !== 'perch') return;
    this.state = 'out'; this.st = 0;
    this.doing = null;
    this.gerald.scale.setScalar(GERALD_SCALE);
    this.to = this.gerald.position.clone().add(new THREE.Vector3(-80, 70, -30));
    sfx.whoosh();
    if (shooed) {
      sfx.coo();
      this.game.fx.word(this.gerald.position.clone().add(new THREE.Vector3(0, 8, 0)), 'Coo?!');
      this.game.line('geraldShoo', 3);
      this.game.gnome.act('hop');
    } else this.game.line('geraldLeave', 3.5);
  }

  // Did a click hit Gerald? Returns the distance, or null.
  hit(raycaster) {
    if (!this.gerald.visible) return null;
    const h = raycaster.intersectObject(this.gerald, true)[0];
    return h ? h.distance : null;
  }

  hide() { this.gerald.visible = false; this.state = 'away'; this.nextVisit = Math.max(this.nextVisit, 10); }
}
