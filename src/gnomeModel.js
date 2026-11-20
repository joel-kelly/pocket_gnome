// The gnome's ceramic body, built from blocks, plus the slots where items go.
// Coordinates: the gnome stands on y = 0, centered on x = 0, facing +z.
import { VoxelModel, hash3 } from './voxel.js';

// Starter paints (free). Paint pots from Gnome Depot add more colors.
export const PAINTS = {
  hat: { 'Tomato Red': '#c8323a', 'Bluebell': '#3a6fc4', 'Fern Green': '#3f9a4a', 'Plum': '#7a4bb8', 'Pumpkin': '#e57c2a', 'Rose': '#e46aa0' },
  shirt: { 'Cornflower': '#3b6fb6', 'Moss': '#4c9a4f', 'Brick': '#c8423a', 'Buttercup': '#e8b83a', 'Violet': '#7d58c2', 'Teal': '#2f9e9a' },
  beard: { 'Snowy': '#f5f2ec', 'Silver': '#b9b6b0', 'Ginger': '#d9773a', 'Chestnut': '#7a4a2a', 'Charcoal': '#3a3634', 'Lavender': '#c9b6ee' },
  skin: { 'Peach': '#f1c29c', 'Honey': '#e0a97e', 'Toffee': '#b9784f', 'Cocoa': '#7a4a30' },
  boots: { 'Leather': '#6b4426', 'Black': '#2e2a28', 'Red': '#a8323a', 'Green': '#3d6b3a' },
};
export const PAINT_PARTS = { hat: 'Hat', shirt: 'Shirt', beard: 'Hair', skin: 'Face', boots: 'Boots' };
// Hairstyles. ('beard' paint is the hair color for every style.)
export const STYLES = { beard: 'Beard', braids: 'Braids', bob: 'Bob' };
export const DEFAULT_PAINT = { hat: '#c8323a', shirt: '#3b6fb6', beard: '#f5f2ec', skin: '#f1c29c', boots: '#6b4426', hatPattern: 'none', shirtPattern: 'none', style: 'beard' };

const SMILE = '#b8485a', RIBBON = '#f19bc0';
const BELT = '#2b2622', BUCKLE = '#e2b93b', NOSE = '#e8927f', CHEEK = '#ee9f98', EYE = '#1c1a1a';
const darker = (hex, k = 0.82) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * k).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
};

// Patterns paint over a part (hat or shirt): white polka dots or stripes.
function patterned(base, pattern) {
  if (pattern === 'dots') return (x, y, z) => ((x + y * 2 + z * 3) % 5 === 0 && hash3(x, y, z) < 0.8 ? '#fbf7ee' : base);
  if (pattern === 'stripes') return (x, y) => (Math.floor(y / 2) % 2 ? '#fbf7ee' : base);
  if (pattern === 'stars') return (x, y, z) => (hash3(x, y, z) < 0.09 ? '#ffd84a' : base);
  return () => base;
}

function frontZ(m, x, y) {
  for (let z = 12; z > -12; z--) if (m.has(x, y, z)) return z;
  return null;
}

export const HAT_BASE = [0, 16, 0.5]; // where the hat sits (and spins from when it flies off)
export const EYE_Y = 15;              // center of the painted eyes

// Builds { body, hat, eyes } for a paint job.
// eyes: [{ x, cells: [[y, z], ...] }] are left out of the body so they can blink.
export function buildGnome(paint = DEFAULT_PAINT) {
  const p = { ...DEFAULT_PAINT, ...paint };
  const body = new VoxelModel(null);
  // boots
  body.box(-5, 0, -2, -1, 2, 4, p.boots);
  body.box(1, 0, -2, 5, 2, 4, p.boots);
  // round body, a bit wider at the bottom
  const shirt = patterned(p.shirt, p.shirtPattern);
  for (let y = 2; y < 11; y++) {
    const r = 5.6 + (4.0 - 5.6) * (y - 2) / 8;
    for (let x = -7; x <= 7; x++) for (let z = -7; z <= 7; z++) {
      const dx = x + 0.5, dz = z + 0.5;
      if (dx * dx + dz * dz <= r * r) body.set(x, y, z, y === 5 ? BELT : shirt(x, y, z));
    }
  }
  for (const x of [-1, 0]) { const z = frontZ(body, x, 5); body.set(x, 5, z, BUCKLE); body.set(x, 5, z + 1, BUCKLE); }
  // arms folded on the tummy
  body.box(-6, 6, -1, -4, 10, 2, shirt);
  body.box(4, 6, -1, 6, 10, 2, shirt);
  body.box(-5, 6, 2, -3, 8, 4, p.skin);
  body.box(3, 6, 2, 5, 8, 4, p.skin);
  // head, then hair (a big beard, braids, or a bob), then the nose
  body.sphere(0, 13.5, 0.5, 4, p.skin);
  const hairCol = (x, y, z) => ((x + y) % 3 === 0 && hash3(x, y, z) < 0.5 ? darker(p.beard, 0.93) : p.beard);
  if (p.style === 'braids' || p.style === 'bob') {
    // hair peeking out under the hat, around the sides and back
    for (let x = -6; x <= 6; x++) for (let y = 12; y <= 16; y++) for (let z = -6; z <= 6; z++) {
      const dx = x + 0.5, dy = (y + 0.5 - 14) / 1.2, dz = z + 0.5 - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 3.6 && d < 5.1 && z < 2) body.set(x, y, z, hairCol(x, y, z));
    }
    if (p.style === 'braids') {
      for (const sx of [-5, 4]) {
        for (let y = 5; y < 13; y++) { body.set(sx, y, 0, hairCol(sx, y, 0)); body.set(sx, y, 1, hairCol(sx, y, 1)); }
        body.set(sx, 4, 0, RIBBON); body.set(sx, 4, 1, RIBBON);
        for (let y = 2; y < 4; y++) body.set(sx, y, 0, hairCol(sx, y, 0));
      }
    } else {
      // bob: fuller around the cheeks
      for (const sx of [-5, 4]) for (let y = 10; y < 14; y++) for (let z = -3; z < 2; z++) body.set(sx, y, z, hairCol(sx, y, z));
    }
  } else {
    for (let x = -6; x <= 6; x++) for (let y = 5; y <= 13; y++) for (let z = 1; z <= 7; z++) {
      const dx = (x + 0.5) / 4.7, dy = (y + 0.5 - 10.2) / 4.4, dz = (z + 0.5 - 2) / 4.7;
      if (dx * dx + dy * dy + dz * dz <= 1) body.set(x, y, z, hairCol(x, y, z));
    }
  }
  if (p.style === 'braids' || p.style === 'bob') body.sphere(0, 13.1, 4.3, 1.2, NOSE);
  else body.sphere(0, 12.6, 4.6, 1.5, NOSE);
  if (p.style === 'braids' || p.style === 'bob') {
    // a painted smile where the beard would be
    for (const [x, y] of [[-2, 12], [-1, 11], [0, 11], [1, 12]]) { const z = frontZ(body, x, y); if (z != null) body.set(x, y, z, SMILE); }
  }
  for (const x of [-3, 2]) { const z = frontZ(body, x, 13); if (z != null) body.set(x, 13, z, CHEEK); }
  // eyes are separate so they can blink
  const eyes = [];
  for (const x of [-2, 1]) {
    const cells = [];
    for (const y of [14, 15]) { const z = frontZ(body, x, y); body.delete(x, y, z); cells.push([y, z]); }
    eyes.push({ x, cells });
  }
  return { body, hat: buildHat(p), eyes };
}

// The classic pointy hat, leaning back toward its tip. Built around HAT_BASE.
export function buildHat(paint = DEFAULT_PAINT) {
  const p = { ...DEFAULT_PAINT, ...paint };
  const fill = patterned(p.hat, p.hatPattern);
  const hat = new VoxelModel(null);
  const H0 = 16, H1 = 30;
  for (let y = H0; y < H1; y++) {
    const t = (y - H0) / (H1 - H0 - 1);
    const r = 4.8 * (1 - t) + 0.55 * t;
    const cz = 0.5 - 3.2 * t * t;
    for (let x = -6; x <= 6; x++) for (let z = -8; z <= 7; z++) {
      const dx = x + 0.5, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) hat.set(x, y, z, y === H0 ? darker(p.hat) : fill(x, y, z));
    }
  }
  return hat;
}

// Leaves and a cobweb that stick to an untidy gnome's hat.
export function buildMess() {
  const m = new VoxelModel(null);
  const leaf = ['#c9822e', '#a8642a', '#d8a33a', '#8a9a3a'];
  [[-4, 18, 2], [3, 17, 3], [2, 21, 0], [-2, 24, -1], [4, 19, -2]].forEach(([x, y, z], i) => {
    m.set(x, y, z, leaf[i % 4]); m.set(x + 1, y, z, leaf[i % 4]); m.set(x, y + 1, z, leaf[(i + 1) % 4]);
  });
  return m;
}

// Item slots. Each item is drawn in its slot's own little grid; origin = where
// the grid's corner sits on the gnome. 'hat' items ride on the hat (so they fly
// off in a sneeze) and replace the pointy hat.
export const SLOTS = {
  head:  { label: 'Hats',      icon: '🎩', origin: [-8, 15, -7], size: [16, 14, 15] },
  face:  { label: 'Face',      icon: '👓', origin: [-6, 12, 2],  size: [12, 6, 6] },
  neck:  { label: 'Neck',      icon: '🧣', origin: [-8, 7, -7],  size: [16, 6, 15] },
  hand:  { label: 'Holding',   icon: '🏮', origin: [-8, 0, 3],   size: [16, 18, 10] },
  back:  { label: 'Back',      icon: '🎒', origin: [-9, 2, -10], size: [18, 18, 5] },
  snack: { label: 'Snacks',    icon: '🍓', origin: [0, 0, 0],    size: [10, 10, 10] },
  decor: { label: 'Garden',    icon: '🌻', origin: [0, 0, 0],    size: [24, 24, 24] },
  paint: { label: 'Paint',     icon: '🎨', origin: [0, 0, 0],    size: [10, 10, 10] },
};
export const WEAR_SLOTS = ['head', 'face', 'neck', 'hand', 'back'];

// Cells of the gnome's body (for keeping items from poking inside it).
let bodyCells = null;
export function gnomeCells() {
  if (!bodyCells) {
    bodyCells = new Set();
    for (const style of Object.keys(STYLES)) for (const k of buildGnome({ style }).body.cells.keys()) bodyCells.add(k);
  }
  return bodyCells;
}
