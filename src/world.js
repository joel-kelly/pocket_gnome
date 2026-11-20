// Renderer, the gnome's garden, cameras, and item thumbnails.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/addons/RoomEnvironment.js';
import { VoxelModel, buildMesh, buildGlazed, disposeGlazed, hash3 } from './voxel.js';
import { Gnome } from './gnome.js';
import { FX } from './fx.js';

// Camera framings. target = point to look at, pos = camera position.
const VIEWS = {
  home:  { pos: [0, 27, 98],   target: [0, 14, 0] },
  side:  { pos: [24, 25, 92],  target: [24, 13, 0] },  // gnome on the left, panel on the right
  type:  { pos: [0, 34, 150],  target: [0, -3, 0] },   // gnome up top, typing pad below
  decor: { pos: [20, 44, 150], target: [20, 6, -8] },  // the whole garden, left of the panel
};

// Where garden decor can go (center of the item's footprint). Nearest spots first.
export const DECOR_SPOTS = [
  { name: 'Front left', pos: [-25, 0, 10] },
  { name: 'Front right', pos: [26, 0, 10] },
  { name: 'Back left', pos: [-18, 0, -18] },
  { name: 'Back right', pos: [21, 0, -16] },
  { name: 'Far left', pos: [-44, 0, 2] },
  { name: 'Far right', pos: [45, 0, 0] },
];
export const DECOR_SCALE = 0.8;

const LITTER_MAX = 70;

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// Soft sky: a vertical gradient texture.
export function skyTexture(top, mid, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top); g.addColorStop(0.65, mid); g.addColorStop(1, bottom);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sun, sky light and soft reflections for the glaze.
export function addLights(scene, renderer, { sunPos = [40, 70, 50], shadowSize = 70 } = {}) {
  const hemi = new THREE.HemisphereLight('#eaf6ff', '#6b8a4c', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dd', 2.5);
  sun.position.set(...sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 1, far: 260 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  return { hemi, sun };
}

// A little flower: stem plus a cross of petals around a yellow middle.
export function flower(m, x, z, color, h = 2) {
  for (let y = 0; y < h; y++) m.set(x, y, z, '#4f8a35');
  m.set(x, h, z, '#f4d03f');
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m.set(x + dx, h, z + dz, color);
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = makeRenderer(canvas);
    this.scene = new THREE.Scene();
    this.daySky = skyTexture('#9fd0ee', '#d4ecf0', '#eef6e2');
    this.nightSky = skyTexture('#141a3a', '#2a3466', '#4a5a7a');
    this.scene.background = this.daySky;
    this.scene.fog = new THREE.Fog('#dcefe9', 190, 420);
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 900);
    this.view = 'home';
    this.camPos = new THREE.Vector3(...VIEWS.home.pos);
    this.camTarget = new THREE.Vector3(...VIEWS.home.target);
    const L = addLights(this.scene, this.renderer);
    this.sun = L.sun; this.hemi = L.hemi;
    this.buildGarden();
    this.decor = [];
    this.decorGroup = new THREE.Group();
    this.scene.add(this.decorGroup);
    this.gnome = new Gnome();
    this.scene.add(this.gnome.object);
    this.fx = new FX(this.scene);
    this.active = null; // optional override {scene, camera, fx}
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildGarden() {
    const g = new THREE.Group();
    // Lawn with mowing stripes and a stepping-stone path to the toadstool house.
    const lawn = new VoxelModel(null);
    const stone = (x, z) => {
      for (const [sx, sz] of [[-6, 34], [-12, 26], [-20, 19], [-27, 12], [-33, 4], [-37, -5]]) {
        if ((x - sx) ** 2 / 9 + (z - sz) ** 2 / 5 < 1) return true;
      }
      return false;
    };
    lawn.box(-110, -2, -70, 110, 0, 60, (x, y, z) => {
      if (y === -2) return '#7a5a3a';
      if (stone(x, z)) return hash3(x, 0, z) < 0.5 ? '#b8b3a8' : '#a9a49a';
      const stripe = Math.floor((x + 200) / 9) % 2;
      const r = hash3(x, 1, z);
      return stripe ? (r < 0.3 ? '#6aa84c' : '#74b453') : (r < 0.3 ? '#62a046' : '#6aac4b');
    });
    const lawnMesh = buildMesh(lawn, { jitter: 0.06 });
    lawnMesh.receiveShadow = true;
    lawnMesh.castShadow = false;
    g.add(lawnMesh);

    // A big lawn under everything, so the grass never runs out at the edge of the view.
    const meadow = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshLambertMaterial({ color: '#68a849' }));
    meadow.rotation.x = -Math.PI / 2;
    meadow.position.y = -0.05;
    meadow.receiveShadow = true;
    g.add(meadow);

    // Back: a hedge, a picket fence and a flower bed.
    const back = new VoxelModel(null);
    back.box(-110, 0, -66, 110, 13, -58, (x, y, z) => {
      const r = hash3(x, y, z);
      return y > 10 && r < 0.25 ? null : r < 0.3 ? '#3f7a34' : r < 0.7 ? '#4a8a3c' : '#2f6a2c';
    });
    for (const [x, y, z, c] of [...back.each()]) if (!c) back.delete(x, y, z);
    for (let x = -108; x < 108; x += 4) back.box(x, 0, -54, x + 2, 11, -53, '#f3eee2');
    for (let x = -108; x < 108; x += 4) back.set(x, 11, -54, '#f3eee2'), back.set(x + 1, 11, -54, null);
    for (const [x, y, z, c] of [...back.each()]) if (!c) back.delete(x, y, z);
    back.box(-110, 3, -54, 110, 4, -53, '#e9e2d0');
    back.box(-110, 8, -54, 110, 9, -53, '#e9e2d0');
    back.box(-110, 0, -52, 110, 1, -44, '#6b4a30'); // soil
    const petals = ['#f19bc0', '#ffffff', '#e8513a', '#9a7ae0', '#ffb347', '#f4d03f'];
    for (let x = -106; x < 106; x += 3) {
      const z = -50 + Math.floor(hash3(x, 2, 0) * 5);
      flower(back, x, z, petals[Math.floor(hash3(x, 3, 0) * petals.length)], 2 + Math.floor(hash3(x, 4, 0) * 3));
    }
    const backMesh = buildMesh(back, { jitter: 0.08 });
    backMesh.receiveShadow = true;
    g.add(backMesh);

    // The gnome's toadstool house (back left) and an apple tree (back right).
    const house = new VoxelModel(null);
    const hx = -46, hz = -30;
    house.cyl(hx, hz, 7, 0, 15, (x, y, z) => (hash3(x, y, z) < 0.2 ? '#e9dcc0' : '#f3e8d0'));
    house.sphere(hx, 15, hz, 13, (x, y, z) => (hash3(Math.floor(x / 3), Math.floor(y / 3), Math.floor(z / 3)) < 0.18 ? '#fbf7ee' : '#d23c3a'), 7);
    for (const [x, y, z] of [...house.each()]) if (y < 13 && house.get(x, y, z) !== '#e9dcc0' && house.get(x, y, z) !== '#f3e8d0') house.delete(x, y, z);
    house.box(hx - 2, 0, hz + 6, hx + 2, 7, hz + 8, '#7a4a24'); // door
    house.set(hx + 1, 3, hz + 8, '#e2b93b');
    house.box(hx + 3, 8, hz + 5, hx + 6, 11, hz + 7, '#8fd0f0'); // window
    house.box(hx - 1, 15, hz + 4, hx + 1, 22, hz + 6, '#8a6a5a'); // chimney
    const houseMesh = buildMesh(house, { jitter: 0.05 });
    houseMesh.receiveShadow = true;
    g.add(houseMesh);
    this.chimney = new THREE.Vector3(hx, 23, hz + 5);

    const tree = new VoxelModel(null);
    const tx = 52, tz = -36;
    tree.box(tx - 2, 0, tz - 2, tx + 2, 22, tz + 2, '#7a5230');
    tree.sphere(tx, 28, tz, 13, (x, y, z) => {
      const r = hash3(x, y, z);
      return r < 0.04 ? '#d8403a' : r < 0.35 ? '#3f8a36' : r < 0.75 ? '#4f9a3f' : '#357a2e';
    }, 10);
    const treeMesh = buildMesh(tree, { jitter: 0.06 });
    treeMesh.receiveShadow = true;
    g.add(treeMesh);

    // Leaf litter: shows up when the garden gets untidy.
    const leafGeo = new THREE.BoxGeometry(1.4, 0.3, 1);
    const leafMat = new THREE.MeshLambertMaterial();
    this.litter = new THREE.InstancedMesh(leafGeo, leafMat, LITTER_MAX);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    const cols = ['#c9822e', '#a8642a', '#d8a33a', '#8a6a2a', '#b5522a'];
    for (let i = 0; i < LITTER_MAX; i++) {
      const x = (hash3(i, 1, 7) - 0.5) * 120, z = -40 + hash3(i, 2, 7) * 80;
      q.setFromEuler(new THREE.Euler(0, hash3(i, 3, 7) * 6, 0));
      m.compose(new THREE.Vector3(x, 0.15, z), q, new THREE.Vector3(1, 1, 1));
      this.litter.setMatrixAt(i, m);
      this.litter.setColorAt(i, c.set(cols[i % cols.length]));
    }
    this.litter.count = 0;
    g.add(this.litter);

    this.garden = g;
    this.scene.add(g);
  }

  // 0 = spotless, 1 = leaves everywhere
  setMess(amount) { this.litter.count = Math.round(LITTER_MAX * Math.max(0, Math.min(1, amount))); }

  // list[i] = { id, model, anim } for decor spot i, or null.
  setDecor(list) {
    for (let i = 0; i < DECOR_SPOTS.length; i++) {
      const want = list[i] || null;
      const have = this.decor[i];
      if (have && want && have.id === want.id && have.model === want.model) continue;
      if (have) { this.decorGroup.remove(have.group); disposeGlazed(have.mesh); this.decor[i] = null; }
      if (!want) continue;
      const grp = new THREE.Group();
      grp.position.set(...DECOR_SPOTS[i].pos);
      const [sx, , sz] = want.model.size;
      const mesh = buildGlazed(want.model, { offset: [-sx / 2, 0, -sz / 2] });
      grp.add(mesh);
      this.decorGroup.add(grp);
      this.decor[i] = { ...want, spot: i, group: grp, mesh, top: mesh.boundingBox.max.y, t: Math.random() * 10, poke: 0 };
    }
  }
  decorHit(raycaster) {
    const hit = raycaster.intersectObject(this.decorGroup, true)[0];
    const spot = hit ? this.decor.findIndex((d) => d && d.mesh === hit.object) : -1;
    return spot >= 0 ? { spot, distance: hit.distance } : null;
  }
  decorTop(i, extra = 0) {
    const d = this.decor[i];
    return d.group.position.clone().add(new THREE.Vector3(0, d.top * DECOR_SCALE + extra, 0));
  }
  pokeDecor(i) { if (this.decor[i]) this.decor[i].poke = 0.8; }
  updateDecor(dt) {
    for (const d of this.decor) {
      if (!d) continue;
      d.t += dt;
      let sx = 1, sy = 1, rz = 0, ry = 0;
      if (d.anim === 'sway') rz = 0.05 * Math.sin(d.t * 0.9);
      if (d.anim === 'bob') sy += 0.03 * Math.sin(d.t * 1.8);
      if (d.anim === 'squish') { const w = Math.sin(d.t * 2.6); sy += 0.06 * w; sx -= 0.03 * w; }
      if (d.anim === 'turn') ry = d.t * 0.6;
      if (d.poke > 0) {
        d.poke = Math.max(0, d.poke - dt);
        const k = d.poke / 0.8;
        sy *= 1 + 0.18 * Math.sin(d.poke * 30) * k;
        sx *= 1 - 0.1 * Math.sin(d.poke * 30) * k;
      }
      d.group.scale.set(sx * DECOR_SCALE, sy * DECOR_SCALE, sx * DECOR_SCALE);
      d.group.rotation.set(0, ry, rz);
    }
  }

  get activeCamera() { return this.active?.camera || this.camera; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    for (const cam of [this.camera, this.active?.camera]) {
      if (!cam) continue;
      cam.aspect = w / h;
      // Narrow windows: pull the camera's view wider so the gnome still fits.
      cam.fov = w / h < 1.3 ? 30 * (1.3 / (w / h)) ** 0.6 : 30;
      cam.updateProjectionMatrix();
    }
  }

  setView(name, instant = false) {
    this.view = name;
    if (instant) { this.camPos.set(...VIEWS[name].pos); this.camTarget.set(...VIEWS[name].target); }
  }

  update(dt) {
    const v = VIEWS[this.view];
    const k = 1 - Math.pow(0.02, dt);
    this.camPos.lerp(new THREE.Vector3(...v.pos), k);
    this.camTarget.lerp(new THREE.Vector3(...v.target), k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    this.gnome.update(dt);
    this.updateDecor(dt);
    this.fx.update(dt);
    // Real-world day and night
    const hr = new Date().getHours() + new Date().getMinutes() / 60;
    const day = hr > 7 && hr < 19.5;
    if (day !== this.isDay) {
      this.isDay = day;
      this.scene.background = day ? this.daySky : this.nightSky;
      this.scene.fog.color.set(day ? '#dcefe9' : '#2a3466');
      this.sun.intensity = day ? 2.5 : 0.7;
      this.sun.color.set(day ? '#fff3dd' : '#b8c4ff');
      this.hemi.intensity = day ? 1.1 : 0.55;
    }
  }

  render() {
    const a = this.active;
    this.renderer.render(a?.scene || this.scene, a?.camera || this.camera);
  }

  // CSS pixel position of a world point (for speech bubbles, popups).
  toScreen(v3, camera = this.activeCamera) {
    const p = v3.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, behind: p.z > 1 };
  }
}

// ---------- Thumbnails ----------
let thumb = null;
const thumbCache = new Map();
export function thumbnail(model, cacheKey) {
  if (cacheKey && thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  if (!thumb) {
    const c = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, preserveDrawingBuffer: true, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(96, 96, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8a9a70', 1.6));
    const d = new THREE.DirectionalLight('#fff6e8', 2.2);
    d.position.set(1, 2, 3);
    scene.add(d);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
    thumb = { renderer, scene, cam: new THREE.PerspectiveCamera(30, 1, 0.1, 500) };
  }
  const mesh = buildGlazed(model);
  const bb = mesh.boundingBox;
  const center = new THREE.Vector3(); bb.getCenter(center);
  const size = new THREE.Vector3(); bb.getSize(size);
  const r = Math.max(size.x, size.y, size.z, 1);
  thumb.cam.position.copy(center).addScaledVector(new THREE.Vector3(0.5, 0.45, 1).normalize(), r * 2.3);
  thumb.cam.lookAt(center);
  thumb.scene.add(mesh);
  thumb.renderer.render(thumb.scene, thumb.cam);
  thumb.scene.remove(mesh);
  disposeGlazed(mesh);
  const url = thumb.renderer.domElement.toDataURL();
  if (cacheKey) thumbCache.set(cacheKey, url);
  return url;
}
export function clearThumb(key) { thumbCache.delete(key); }
