// First time: Gnome Depot. In the clearance aisle stands one ordinary-looking
// garden gnome. Repaint it (it wakes up with the first brushstroke!), name it,
// take it home.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { VoxelModel, buildMesh, hash3 } from '../voxel.js';
import { Gnome } from '../gnome.js';
import { PAINTS, DEFAULT_PAINT, STYLES } from '../gnomeModel.js';
import { addLights } from '../world.js';
import { FX } from '../fx.js';

// The other (ordinary, not magical) gnomes on the shelf.
const NEIGHBORS = [
  { hat: '#3f9a4a', shirt: '#c8423a', beard: '#b9b6b0', skin: '#e0a97e', style: 'beard' },
  { hat: '#7a4bb8', shirt: '#e8b83a', beard: '#7a4a2a', skin: '#f1c29c', style: 'braids' },
];
const NAMES = ['Gnorman', 'Gnorbert', 'Gnelly', 'Gnoah', 'Gnancy', 'Gnatalie', 'Gnigel', 'Gnora', 'Gnicholas', 'Gnaomi', 'Pip', 'Bramble', 'Thistle', 'Clover', 'Pebble', 'Mossy'];
const PARTS = [['hat', 'Hat'], ['shirt', 'Shirt'], ['beard', 'Hair'], ['skin', 'Face']];

export class DepotScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
    this.built = false;
  }
  get state() { return this.game.state; }

  build() {
    this.built = true;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9dcc4');
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 600);
    this.camera.position.set(20, 24, 84);
    this.camera.lookAt(20, 13, 0);
    addLights(scene, this.game.world.renderer, { sunPos: [30, 60, 60], shadowSize: 60 });
    this.fx = new FX(scene);
    const m = new VoxelModel(null);
    // floor and a pegboard wall
    m.box(-90, -12, -30, 110, -11, 40, (x, y, z) => (hash3(x, 0, z) < 0.5 ? '#b8ab94' : '#c4b8a0'));
    m.box(-90, -11, -32, 110, 50, -30, (x, y) => ((x % 4 === 0 && y % 4 === 0) ? '#a8916e' : '#d8c29c'));
    // the shelf the gnomes stand on
    m.box(-70, -2, -10, 80, 0, 10, (x, y, z) => (hash3(x, y, 1) < 0.3 ? '#9a6a3a' : '#a8743f'));
    for (const x of [-68, -20, 30, 78]) m.box(x, -11, -8, x + 2, -2, 8, '#7a5230');
    // pots and a watering can for sale on the shelf
    for (const [x, c] of [[-56, '#c9622e'], [-50, '#b8562a'], [52, '#c9622e'], [60, '#3a8a7a']]) m.cone(x, 0, 3, 3.8, 0, 6, c);
    const mesh = buildMesh(m, { jitter: 0.06 });
    mesh.receiveShadow = true;
    scene.add(mesh);
    // two other (ordinary, not magical) gnomes still for sale
    for (const [i, [x, rot]] of [[-22, 0.3], [-40, 0.15]].entries()) {
      const g = new Gnome();
      g.setPaint(NEIGHBORS[i]);
      g.statue = true;
      g.object.position.set(x, 0, -2);
      g.object.rotation.y = rot;
      g.update(0);
      scene.add(g.object);
    }
  }

  enter() {
    const { world, gnome } = this.game;
    if (!this.built) this.build();
    world.active = { scene: this.scene, camera: this.camera };
    world.resize();
    this.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    gnome.statue = true;
    this.paint = { ...DEFAULT_PAINT };
    gnome.setPaint(this.paint);
    this.game.applyOutfit();
    this.render();
  }
  exit() {
    const { world, gnome } = this.game;
    gnome.statue = false;
    world.scene.add(gnome.object);
    world.active = null;
    world.resize();
    this.root.innerHTML = '';
  }

  render() {
    const s = this.state;
    this.kid = h('input', { id: 'kid-name', type: 'text', maxlength: 16, placeholder: 'Your name', value: s.kidName === 'Friend' ? '' : s.kidName });
    this.name = h('input', { id: 'gnome-name', type: 'text', maxlength: 16, placeholder: 'Gnome name' });
    const dice = button('🎲', () => { this.name.value = NAMES[Math.floor(Math.random() * NAMES.length)]; }, 'small');
    dice.title = 'Pick a name for me';
    const rows = PARTS.map(([part, label]) => {
      const row = h('div', { class: 'swatches' });
      for (const [nm, hex] of Object.entries(PAINTS[part])) {
        const sw = h('button', { class: 'swatch' + (this.paint[part] === hex ? ' on' : ''), title: nm, style: { background: hex }, onclick: () => this.dab(part, hex, row, sw) });
        row.append(sw);
      }
      return h('div', { class: 'paint-row' }, h('span', { class: 'lbl' }, label), row);
    });
    const styles = h('div', { class: 'patterns' }, ...Object.entries(STYLES).map(([id, label]) => h('button', {
      class: 'tab' + (this.paint.style === id ? ' on' : ''),
      onclick: (e) => { styles.querySelectorAll('.tab').forEach((t) => t.classList.remove('on')); e.currentTarget.classList.add('on'); this.setStyle(id); },
    }, label)));
    this.root.replaceChildren(h('div', { class: 'depot-card' },
      h('div', { class: 'sign' }, 'GNOME DEPOT'),
      h('p', {}, 'Down the clearance aisle, between the flowerpots, stands one little garden gnome. It looks ordinary. It is NOT ordinary. Give it a fresh coat of paint and see what happens...'),
      h('label', { for: 'kid-name' }, "What's YOUR name?"), this.kid,
      h('label', {}, 'Paint your gnome'), h('div', { class: 'paint-row' }, h('span', { class: 'lbl' }, 'Style'), styles), ...rows,
      h('label', { for: 'gnome-name' }, 'Name your gnome'), h('div', { class: 'name-row' }, this.name, dice),
      h('div', { class: 'row' }, button('Take it home! 🏡', () => this.takeHome(), 'gold big'))));
    this.tag = h('div', { class: 'price-tag' }, 'CLEARANCE', h('small', {}, 'free to a good home'));
    this.root.append(this.tag);
    setTimeout(() => this.kid.focus(), 50);
  }

  setStyle(id) {
    this.paint.style = id;
    this.game.gnome.setPaint(this.paint);
    sfx.place();
    if (this.game.gnome.statue) this.wake(); else this.game.gnome.act('hop');
  }

  async dab(part, hex, row, sw) {
    const { gnome } = this.game;
    row.querySelectorAll('.swatch').forEach((el) => el.classList.remove('on'));
    sw.classList.add('on');

    this.paint[part] = hex;
    if (part === 'shirt') this.paint.boots = DEFAULT_PAINT.boots;
    gnome.setPaint(this.paint);
    sfx.place();
    this.fx.sparkles(gnome.headTop(), 6);
    if (gnome.statue) this.wake();
    else {
      gnome.act('hop');
      if (Math.random() < 0.4) this.game.say(['Ooh, I\'m tickled pink! Or whatever color that is!', 'Paint-astic!', 'That\'s a hue-ge improvement!', 'Dye-namite choice!'][Math.floor(Math.random() * 3)], 2.5);
    }
  }

  // The magic moment: the first brushstroke wakes the gnome up.
  async wake() {
    const { gnome } = this.game;
    gnome.statue = false;
    sfx.unlock();
    await gnome.act('shake');
    gnome.act('cheer');
    this.game.say("Oh! Oh my gnome-ness! That tickles! Hello there!", 4);
  }

  takeHome() {
    const { S, gnome } = this.game;
    const s = this.state;
    s.kidName = this.kid.value.trim() || 'Friend';
    s.gnomeName = this.name.value.trim() || NAMES[Math.floor(Math.random() * NAMES.length)];
    s.paint = { ...this.paint };
    s.onboarded = true;
    S.save();
    gnome.statue = false;
    gnome.setPaint(s.paint);
    sfx.fanfare();
    this.game.go('placement');
    setTimeout(() => this.game.say(`There's no place like gnome! Thanks for picking me, ${s.kidName}. I'm ${s.gnomeName}!`, 6), 300);
  }

  update(dt) {
    this.fx.update(dt);
    // keep the price tag under the gnome's feet
    if (this.tag) {
      const p = this.game.world.toScreen(new THREE.Vector3(0, -1.5, 10), this.camera);
      this.tag.style.left = p.x + 'px';
      this.tag.style.top = p.y + 'px';
    }
  }

  onKey(e) { if (e.key === 'Enter') this.takeHome(); }
}
