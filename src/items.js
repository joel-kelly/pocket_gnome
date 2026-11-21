// Built-in items. Every item is a little voxel model drawn in its slot's grid
// (see SLOTS in gnomeModel.js). Wearables are trimmed so they never poke into
// the gnome's body.
import { VoxelModel, hash3 } from './voxel.js';
import { SLOTS, gnomeCells } from './gnomeModel.js';

const C = {
  straw: '#e8c97a', strawD: '#c9a24f', red: '#d23c3a', redD: '#a8282e', black: '#2a2628', white: '#fbf7ee',
  gold: '#e2b93b', goldD: '#b8902a', pink: '#f19bc0', yellow: '#f4d03f', blue: '#4a7ad8', blueL: '#8fd0f0',
  green: '#4f9a3f', greenD: '#357a2e', leaf: '#5aa84a', brown: '#7a4a24', brownL: '#a8703c', cream: '#f3e8d0',
  gray: '#9a968e', grayD: '#6e6a64', purple: '#8a5ad8', orange: '#e8823a', teal: '#2f9e9a', lilac: '#c9a8ee',
};
const grid = (slot) => new VoxelModel([...SLOTS[slot].size]);
const r = (x, y, z) => hash3(x, y, z);

// ---------------- HATS (center x 8, z 7.5; brim at y 1-2) ----------------
function sunHat() {
  const m = grid('head');
  m.cyl(8, 7.5, 7.6, 1, 2, (x, y, z) => (r(x, y, z) < 0.25 ? C.strawD : C.straw));
  m.cyl(8, 7.5, 4.6, 2, 6, (x, y, z) => (r(x, y, z) < 0.25 ? C.strawD : C.straw));
  m.ring(8, 7.5, 3.6, 4.8, 2, 3, C.red);
  m.set(12, 3, 9, C.yellow); m.set(12, 3, 10, C.white); m.set(13, 3, 9, C.white);
  return m;
}
function topHat() {
  const m = grid('head');
  m.cyl(8, 7.5, 6.4, 1, 2, C.black);
  m.cyl(8, 7.5, 4.3, 2, 11, C.black);
  m.ring(8, 7.5, 3.3, 4.5, 2, 4, C.purple);
  return m;
}
function flowerCrown() {
  const m = grid('head');
  m.ring(8, 7.5, 3.4, 5.2, 2, 3, (x, y, z) => (r(x, y, z) < 0.4 ? C.greenD : C.leaf));
  const cols = [C.pink, C.yellow, C.white, C.lilac];
  let i = 0;
  for (const [x, y, z] of [...m.each()]) if ((x * 3 + z * 5) % 7 === 0) m.set(x, y + 1, z, cols[i++ % 4]);
  return m;
}
function mushroomCap() {
  const m = grid('head');
  m.sphere(8, 1.5, 7.5, 7, (x, y, z) => (r(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2)) < 0.2 ? C.white : C.red), 6);
  for (const [x, y, z] of [...m.each()]) if (y < 1) m.delete(x, y, z);
  return m;
}
function beanie() {
  const m = grid('head');
  m.sphere(8, 1, 7.5, 5.2, (x, y) => (Math.floor(y / 2) % 2 ? C.teal : C.white), 6.5);
  for (const [x, y, z] of [...m.each()]) if (y < 1) m.delete(x, y, z);
  m.sphere(8, 8.5, 7.5, 1.8, C.white);
  return m;
}
function acornCap() {
  const m = grid('head');
  m.sphere(8, 1, 7.5, 5.6, (x, y, z) => ((x + z + y) % 2 ? '#8a5a2e' : '#a8703c'), 4.5);
  for (const [x, y, z] of [...m.each()]) if (y < 1) m.delete(x, y, z);
  m.box(8, 5, 7, 9, 8, 8, C.brown);
  m.set(9, 8, 7, C.brown);
  return m;
}
function crown() {
  const m = grid('head');
  m.ring(8, 7.5, 3.4, 5, 1, 4, C.gold);
  m.ring(8, 7.5, 3.4, 5, 4, 6, (x, y, z) => {
    const a = Math.atan2(z + 0.5 - 7.5, x + 0.5 - 8);
    return Math.round((a / Math.PI) * 5) % 2 === 0 ? C.gold : null;
  });
  for (const [x, y, z, c] of [...m.each()]) if (!c) m.delete(x, y, z);
  m.paint((x, y, z) => (y === 2 && r(x, y, z) < 0.35 ? (r(z, x, y) < 0.5 ? C.red : C.blue) : null));
  return m;
}

// ---------------- FACE (eyes at x 4 and 7, y 2-3; glasses at z 2) ----------------
function rims(m, color, lens) {
  for (const cx of [4, 7]) {
    for (const [dx, dy] of [[-1, 0], [-1, 1], [1, 0], [1, 1], [0, -1], [0, 2]]) m.set(cx + dx, 2 + dy, 2, color);
    if (lens) { m.set(cx, 2, 2, lens); m.set(cx, 3, 2, lens); }
  }
  m.set(5, 3, 2, color); m.set(6, 3, 2, color);
  m.set(2, 3, 1, color); m.set(9, 3, 1, color); m.set(2, 3, 0, color); m.set(9, 3, 0, color);
  return m;
}
const spectacles = () => rims(grid('face'), C.gold);
const sunglasses = () => rims(grid('face'), C.black, '#1e2a3a');
const heartGlasses = () => rims(grid('face'), '#ff5a8a');
function monocle() {
  const m = grid('face');
  for (const [dx, dy] of [[-1, 0], [-1, 1], [1, 0], [1, 1], [0, -1], [0, 2]]) m.set(7 + dx, 2 + dy, 2, C.gold);
  for (let y = 0; y < 2; y++) m.set(8, y, 3, C.goldD);
  return m;
}

// ---------------- NECK (center x 8, z 7.5; collar at y 3-4) ----------------
function scarf() {
  const m = grid('neck');
  m.ring(8, 7.5, 3.2, 5.6, 2, 5, (x, y, z) => (Math.floor((x + z) / 2) % 2 ? C.red : C.white));
  m.box(11, 0, 11, 13, 3, 13, (x, y) => (y % 2 ? C.red : C.white));
  return m;
}
function lei() {
  const m = grid('neck');
  const cols = [C.pink, C.yellow, C.orange, C.white, C.lilac];
  m.ring(8, 7.5, 3.6, 5.6, 3, 4, (x, y, z) => cols[Math.floor(r(x, y, z) * cols.length)]);
  return m;
}

// ---------------- HOLDING (hands at x 3-5 and 11-13, y 6-8; in front: z 2+) ----------------
function lantern() {
  const m = grid('hand');
  const brass = '#b8902a';
  m.box(11, 0, 4, 14, 1, 7, brass);
  m.box(11, 1, 4, 14, 4, 7, (x, y, z) => ((x === 11 || x === 13) && (z === 4 || z === 6) ? brass : '#ffd86a'));
  m.box(11, 4, 4, 14, 5, 7, brass);
  m.set(12, 5, 5, brass); m.set(12, 6, 5, brass); m.set(12, 7, 4, brass);
  return m;
}
function wateringCan() {
  const m = grid('hand');
  m.cyl(4, 6, 2.6, 0, 5, C.teal);
  m.box(2, 5, 5, 7, 6, 6, C.teal); // handle
  for (let i = 0; i < 4; i++) m.set(4, 2 + i, 9 - Math.min(i, 0), C.teal);
  for (let i = 0; i < 4; i++) m.set(4, 2 + i, 8 + Math.floor(i / 2), C.teal);
  m.set(4, 6, 9, C.gray); m.set(3, 6, 9, C.gray); m.set(5, 6, 9, C.gray);
  return m;
}
function fishingRod() {
  const m = grid('hand');
  for (let i = 0; i <= 11; i++) m.set(12 + Math.floor(i / 4), 6 + i, 3 + Math.floor(i / 2), C.brownL);
  m.set(12, 6, 4, C.gray); m.set(12, 5, 4, C.gray);
  for (let y = 9; y < 17; y++) m.set(15, y, 9, '#e8e8e8');
  m.set(15, 8, 9, C.red); m.set(15, 7, 9, C.white);
  return m;
}
function bouquet() {
  const m = grid('hand');
  for (let y = 3; y < 8; y++) m.set(8, y, 5, C.greenD), m.set(7, y, 5, C.green);
  m.sphere(7.5, 9.5, 5.5, 2.6, (x, y, z) => [C.pink, C.yellow, C.white, C.lilac, C.red][Math.floor(r(x, y, z) * 5)], 2.2);
  m.box(6, 6, 4, 10, 7, 7, C.lilac); // ribbon
  return m;
}
function shovel() {
  const m = grid('hand');
  for (let y = 5; y < 16; y++) m.set(13, y, 4, C.brownL);
  m.box(12, 15, 4, 15, 16, 5, C.brown);
  m.box(12, 0, 3, 15, 5, 6, (x, y) => (y === 4 ? C.grayD : C.gray));
  return m;
}

// ---------------- BACK (body's back at z ~4; items at z 0-4) ----------------
function backpack() {
  const m = grid('back');
  m.box(5, 4, 1, 13, 12, 4, (x, y, z) => (y > 9 ? C.brown : '#c9622e'));
  m.box(6, 5, 0, 12, 8, 1, '#a8501e');
  m.set(9, 9, 0, C.gold);
  m.box(5, 11, 4, 6, 13, 5, C.brown); m.box(12, 11, 4, 13, 13, 5, C.brown);
  m.cyl(9, 2.5, 2, 12, 13, '#4f8a35'); // a leek sticking out!
  for (let y = 13; y < 17; y++) m.set(9, y, 2, y > 14 ? '#4f8a35' : C.cream);
  return m;
}
function wings() {
  const m = grid('back');
  for (const side of [-1, 1]) {
    for (let x = 0; x < 9; x++) for (let y = 3; y < 18; y++) {
      const dx = x + 0.5, top = (dx - 5) ** 2 / 26 + (y - 13) ** 2 / 16 < 1, bot = (dx - 4) ** 2 / 14 + (y - 6) ** 2 / 9 < 1;
      if (!top && !bot) continue;
      const wx = side < 0 ? 8 - x : 9 + x;
      const edge = r(wx, y, 0) < 0.1;
      m.set(wx, y, 3, edge ? C.white : top ? C.lilac : C.pink);
    }
  }
  return m;
}
function cape() {
  const m = grid('back');
  for (let y = 0; y < 13; y++) {
    const w = 4 + Math.floor((13 - y) / 3);
    m.box(9 - w, y, 3, 9 + w, y + 1, 4, y === 12 ? C.gold : C.red);
  }
  return m;
}

// ---------------- SNACKS (10 grid) ----------------
function berryTart() {
  const m = grid('snack');
  m.cyl(5, 5, 4.6, 0, 2, '#d9a35a'); m.cyl(5, 5, 3.6, 1, 2, '#8a2a4a');
  for (const [x, z, c] of [[3, 4, '#c83a5a'], [6, 3, '#3a4ab0'], [5, 6, '#c83a5a'], [7, 6, '#3a4ab0'], [4, 7, '#e8524a']]) m.set(x, 2, z, c);
  return m;
}
function mushroomSoup() {
  const m = grid('snack');
  m.cyl(5, 5, 4.5, 0, 3, C.white); m.cyl(5, 5, 3.6, 2, 3, '#c9a27a');
  m.set(4, 3, 4, '#8a6a4a'); m.set(6, 3, 6, '#8a6a4a');
  return m;
}
function crumpet() {
  const m = grid('snack');
  m.cyl(5, 5, 3.8, 0, 2, (x, y, z) => (y === 0 ? '#a8703c' : '#d9a35a'));
  // the famous holes on top, and a pat of butter
  m.paint((x, y, z, c) => (y === 1 && r(x, y, z) < 0.3 ? '#b8834a' : null));
  m.box(4, 2, 4, 6, 3, 6, '#f8e27a');
  return m;
}
function acornMuffin() {
  const m = grid('snack');
  m.sphere(5, 3.5, 5, 3.6, (x, y, z) => (r(x, y, z) < 0.15 ? '#5a3a1e' : '#a8703c'), 2.5); // muffin top
  for (const [x, y, z] of [...m.each()]) if (y < 3) m.delete(x, y, z);
  m.cone(5, 5, 2.6, 3.2, 0, 3, (x, y, z) => ((x + z) % 2 ? '#e8c97a' : '#d8b860'));       // paper cup
  m.set(5, 6, 5, '#7a4a24'); m.set(5, 7, 5, '#5a7a2a'); // acorn cap on top
  return m;
}
function acornCookie() {
  const m = grid('snack');
  m.cyl(5, 5, 4.5, 0, 2, '#d9a35a');
  for (const [x, z] of [[3, 3], [6, 4], [4, 6], [7, 7], [5, 2]]) m.set(x, 2, z, '#5a3a1e');
  return m;
}
function honeyToast() {
  const m = grid('snack');
  m.box(1, 0, 2, 9, 2, 8, '#d9a35a'); m.box(2, 1, 3, 8, 2, 7, '#f0d090');
  m.box(3, 2, 3, 7, 3, 6, '#f2b632'); m.set(5, 2, 6, '#f2b632');
  return m;
}
function radish() {
  const m = grid('snack');
  m.sphere(5, 3, 5, 3, '#e04a6a');
  m.set(5, 0, 5, C.white);
  for (const [x, z] of [[4, 5], [6, 5], [5, 4], [5, 6]]) for (let y = 6; y < 9; y++) m.set(x, y, z, C.green);
  return m;
}
function teaCup() {
  const m = grid('snack');
  m.cyl(5, 5, 4.4, 0, 1, C.white);
  m.cyl(5, 5, 3, 1, 5, (x, y) => (y === 3 ? C.pink : C.white)); m.cyl(5, 5, 2.2, 4, 5, '#c8a050');
  m.box(8, 2, 5, 9, 4, 6, C.white);
  return m;
}
function lemonade() {
  const m = grid('snack');
  m.cyl(5, 5, 2.6, 0, 7, (x, y) => (y > 5 ? '#dff4ff' : '#fff27a'));
  m.set(7, 7, 5, '#f4d03f'); m.set(7, 6, 5, '#f4d03f');
  m.set(5, 7, 5, C.red); m.set(5, 8, 5, C.red); m.set(5, 9, 6, C.red);
  return m;
}
function dandelionPop() {
  const m = grid('snack');
  m.cyl(5, 5, 2.4, 0, 6, '#6ab04a'); m.cyl(5, 5, 1.2, 6, 8, '#6ab04a');
  m.cyl(5, 5, 1.3, 8, 9, C.gold);
  m.box(3, 2, 7, 8, 4, 8, C.yellow);
  return m;
}
function rainwater() {
  const m = grid('snack');
  m.cyl(5, 5, 3, 0, 5, (x, y, z) => (y === 4 ? '#8fd0f0' : '#bfe6f8'));
  m.ring(5, 5, 2.6, 3.4, 0, 6, '#9ab0c0');
  return m;
}

// ---------------- GARDEN DECOR (24 grid, centered at x 12, z 12) ----------------
function birdbath() {
  const m = grid('decor');
  m.cyl(12, 12, 4, 0, 2, C.gray);
  m.cyl(12, 12, 2, 2, 9, C.gray);
  m.cyl(12, 12, 7, 9, 11, '#b8b3a8');
  m.cyl(12, 12, 5.6, 10, 11, '#8fd0f0');
  m.cyl(12, 12, 1.2, 10, 13, '#cfcac0'); // little fountain spout
  m.set(11, 13, 11, '#8fd0f0');
  return m;
}
function toadstool() {
  const m = grid('decor');
  m.cyl(12, 12, 2.4, 0, 7, C.cream);
  m.sphere(12, 7, 12, 6.5, (x, y, z) => (r(Math.floor(x / 2), y, Math.floor(z / 2)) < 0.22 ? C.white : C.red), 4);
  for (const [x, y, z] of [...m.each()]) if (y < 7 && m.get(x, y, z) !== C.cream) m.delete(x, y, z);
  return m;
}
function sunflower() {
  const m = grid('decor');
  for (let y = 0; y < 16; y++) m.set(12, y, 12, C.greenD);
  m.box(13, 6, 12, 16, 7, 14, C.green); m.box(9, 9, 11, 12, 10, 13, C.green);
  for (let x = 6; x < 19; x++) for (let y = 14; y < 24; y++) {
    const d = (x + 0.5 - 12.5) ** 2 + (y + 0.5 - 19) ** 2;
    if (d < 6.5) m.set(x, y, 13, (x + y) % 2 ? '#5a3a1e' : '#7a4a24');
    else if (d < 25) m.set(x, y, 13, r(x, y, 1) < 0.3 ? '#f2b632' : C.yellow);
  }
  return m;
}
function pinwheel() {
  const m = grid('decor');
  for (let y = 0; y < 15; y++) m.set(12, y, 12, C.white);
  const cols = [C.red, C.blue, C.yellow, C.green];
  for (let q = 0; q < 4; q++) for (let i = 0; i < 4; i++) for (let j = 0; j <= i; j++) {
    const [dx, dy] = [[i, j], [-j, i], [-i, -j], [j, -i]][q];
    m.set(12 + dx + (q === 1 || q === 2 ? -1 : 0), 17 + dy + (q >= 2 ? -1 : 0), 13, cols[q]);
  }
  return m;
}
function petPebble() {
  const m = grid('decor');
  m.sphere(12, 2.2, 12, 4.2, (x, y, z) => (r(x, y, z) < 0.3 ? '#9a968e' : '#b0aba2'), 3);
  for (const [x, y, z] of [...m.each()]) if (y < 0) m.delete(x, y, z);
  m.set(10, 3, 15, C.white); m.set(13, 3, 15, C.white); m.set(10, 3, 16, C.black); m.set(13, 3, 16, C.black);
  return m;
}
function frogPond() {
  const m = grid('decor');
  m.cyl(12, 12, 9, 0, 1, '#5a8ab0');
  m.cyl(12, 12, 8, 0, 1, '#6aa8d0');
  m.cyl(10, 11, 3, 1, 2, '#4f9a3f');
  m.sphere(10, 3.2, 11, 2, '#6abf4a', 1.7);
  m.set(9, 4, 12, C.white); m.set(11, 4, 12, C.white); m.set(9, 4, 13, C.black); m.set(11, 4, 13, C.black);
  m.set(15, 1, 15, C.pink); m.set(16, 1, 15, C.white); m.set(15, 1, 14, C.white);
  return m;
}
function flamingo() {
  const m = grid('decor');
  m.box(11, 0, 12, 12, 9, 13, C.pink); m.box(13, 0, 12, 14, 9, 13, C.pink);
  m.sphere(12.5, 11.5, 12, 3.4, '#ff8ab8', 2.4);
  for (let y = 13; y < 19; y++) m.set(13 + (y > 16 ? 1 : 0), y, 13, '#ff8ab8');
  m.box(13, 19, 12, 16, 21, 15, '#ff8ab8');
  m.set(16, 20, 14, C.black); m.set(17, 20, 14, C.black); m.set(15, 20, 15, C.black);
  return m;
}
function wishingWell() {
  const m = grid('decor');
  m.ring(12, 12, 4.4, 7, 0, 6, (x, y, z) => ((x + y + z) % 3 ? '#b8b3a8' : '#9a968e'));
  m.cyl(12, 12, 4.4, 4, 5, '#4a7ab0');
  for (const x of [5, 18]) m.box(x, 6, 11, x + 1, 16, 13, C.brown);
  for (let x = 4; x < 21; x++) { const h = 16 + Math.round(3 - Math.abs(x - 12) * 0.5); m.box(x, h - 1, 8, x + 1, h, 16, C.red); }
  m.box(12, 10, 12, 13, 13, 13, C.grayD);
  return m;
}
function birdhouse() {
  const m = grid('decor');
  for (let y = 0; y < 12; y++) m.set(12, y, 12, C.brown);
  m.box(8, 12, 9, 17, 19, 16, C.blue);
  for (let y = 19; y < 23; y++) { const w = 22 - y; m.box(12 - w - 1, y, 8, 13 + w, y + 1, 17, C.red); }
  m.box(11, 14, 16, 14, 17, 17, C.black);
  m.set(12, 13, 17, C.brownL);
  return m;
}

// ---------------- RACE PRIZES (won at the Grand Gnome Prix, never sold) ----------------
// Tiny 3x5 pixel digits for podium numbers.
const DIGITS = { 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'] };
function digit(m, n, x0, y0, z, color) {
  DIGITS[n].forEach((row, i) => [...row].forEach((b, j) => { if (b === '1') m.set(x0 + j, y0 + 4 - i, z, color); }));
}
function checkerFlag() {
  const m = grid('decor');
  m.cyl(8, 12, 2.6, 0, 1, C.grayD);
  for (let y = 1; y < 22; y++) m.set(7, y, 11, C.white), m.set(8, y, 11, '#d8d4cc');
  m.sphere(8, 22.5, 11.5, 1.4, C.gold);
  // the flag, with a little ripple in it
  for (let x = 9; x < 21; x++) for (let y = 12; y < 21; y++) {
    const z = 11 + Math.round(Math.sin((x - 9) * 0.7) * 0.8);
    m.set(x, y + (x > 16 ? -1 : 0), z, (Math.floor((x - 9) / 2) + Math.floor(y / 2)) % 2 ? C.black : C.white);
  }
  return m;
}
// A trophy cup on a little wooden plinth with a nameplate.
function cup(metal, metalD, { tall = 0, gem = null } = {}) {
  return () => {
    const m = grid('decor');
    m.box(6, 0, 6, 18, 4, 18, (x, y) => (y === 3 ? '#6a4220' : '#8a5a30'));
    m.box(9, 1, 18, 15, 3, 19, metal);                                  // nameplate
    m.cone(12, 12, 3.6, 2, 4, 6, metalD);                                // foot
    m.cyl(12, 12, 1.2, 6, 9 + tall, metal);                              // stem
    m.cone(12, 12, 2.4, 6.4, 9 + tall, 17 + tall * 2, (x, y, z) => (y === 12 + tall ? metalD : metal)); // bowl
    for (const [x, y, z] of [...m.each()]) if (y >= 15 + tall * 2 && Math.hypot(x + 0.5 - 12, z + 0.5 - 12) < 4.6) m.delete(x, y, z);
    m.cyl(12, 12, 4.6, 14 + tall * 2, 15 + tall * 2, metalD);            // shine inside
    const y0 = 9 + tall, y1 = 17 + tall * 2;
    const bowlR = (y) => 2.4 + ((6.4 - 2.4) * (y - y0)) / (y1 - y0 - 1);
    for (const sx of [-1, 1]) {                                          // handles, joined to the bowl
      const hx = sx < 0 ? 4 : 19, yb = 11 + tall, yt = 15 + tall;
      for (let y = yb; y <= yt; y++) m.set(hx, y, 12, metal);
      for (const y of [yb, yt]) {
        const edge = Math.floor(12 + sx * (bowlR(y) - 0.5));
        for (let x = Math.min(edge, hx); x <= Math.max(edge, hx); x++) m.set(x, y, 12, metal);
      }
    }
    if (gem) { m.set(11, 12 + tall, 18, gem); m.set(12, 12 + tall, 18, gem); m.set(11, 13 + tall, 18, gem); m.set(12, 13 + tall, 18, gem); }
    return m;
  };
}
function podium() {
  const m = grid('decor');
  const block = (x0, x1, top, color, n) => {
    m.box(x0, 0, 7, x1, top, 17, (x, y) => (y === top - 1 ? color : C.white));
    digit(m, n, Math.floor((x0 + x1) / 2) - 1, Math.max(1, top - 7), 17, C.blue);
  };
  block(8, 16, 10, C.gold, 1);
  block(1, 8, 7, '#c9ced8', 2);
  block(16, 23, 5, '#c98a4a', 3);
  m.cone(12, 12, 1.8, 0.6, 10, 15, C.gold);                            // a gold star-ish spire for the winner
  m.box(10, 13, 11, 15, 14, 13, C.gold);
  return m;
}
function miniRacer() {
  const m = grid('decor');
  const body = C.red, CARBON = C.black;
  m.box(3, 1, 9, 21, 2, 15, CARBON);                                   // floor
  for (let x = 12; x < 22; x++) { const t = (x - 12) / 10; m.box(x, 2, 11, x + 1, 5 - Math.round(t * 2), 13, body); } // nose
  m.box(5, 2, 9, 13, 5, 15, body);                                     // body
  m.box(7, 5, 10, 9, 8, 14, C.cream);                                  // a tiny gnome driver...
  m.box(7, 8, 10, 9, 11, 14, C.red); m.box(7, 11, 11, 8, 13, 13, C.red); // ...in a red pointy hat
  m.box(3, 5, 11, 6, 7, 13, body);                                     // engine cover
  m.box(1, 7, 8, 4, 8, 16, body); m.box(2, 2, 11, 3, 7, 13, CARBON);   // rear wing
  m.box(20, 1, 8, 23, 2, 16, body);                                    // front wing
  for (const [x, r] of [[5, 2.6], [18, 2.2]]) for (const z of [7, 15]) {
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const d = Math.hypot(dx, dy);
      if (d <= r) for (let dz = 0; dz < 2; dz++) m.set(x + dx, Math.round(r) + dy, z + dz, d < 1.2 ? C.gold : CARBON);
    }
  }
  m.cyl(12, 12, 3, 0, 1, C.grayD);                                     // display stand
  return m;
}
function lightningTrophy() {
  const m = grid('decor');
  m.box(6, 0, 7, 18, 4, 17, (x, y) => (y === 3 ? '#2b3270' : '#3a4490'));
  m.box(9, 1, 17, 15, 3, 18, C.gold);
  // a big golden lightning bolt: down-left, a kink back right, down-left again
  const seg = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      m.box(x - 1, y, 11, x + 2, y + 1, 13, (i + y) % 4 ? C.gold : C.yellow);
    }
  };
  seg(15, 22, 10, 13);
  seg(10, 13, 15, 13);
  seg(15, 13, 10, 4);
  m.sphere(16, 23.5, 12, 1.2, '#fff6c8');
  return m;
}

// ---------------- PAINT POTS (unlock new paint colors and patterns) ----------------
function paintPot(color, pattern) {
  return () => {
    const m = grid('paint');
    m.cyl(5, 5, 3.6, 0, 5, (x, y, z) => (pattern === 'dots' && (x + y * 2 + z) % 4 === 0 ? C.white : pattern === 'stripes' && y % 2 ? C.white : pattern === 'stars' && r(x, y, z) < 0.2 ? C.yellow : '#c9ced8'));
    m.cyl(5, 5, 3, 4, 5, color);
    m.ring(5, 5, 3, 3.8, 5, 6, '#9a9fa8');
    for (let x = 2; x < 9; x++) m.set(x, 7, 5, C.grayD);
    return m;
  };
}

// ---------------- the catalog ----------------
const W = (id, name, slot, price, desc, build) => ({ id, name, slot, kind: 'wear', price, desc, build });
const F = (id, name, price, desc, build, opts) => ({ id, name, slot: 'snack', kind: opts.thirst > opts.hunger ? 'drink' : 'food', price, desc, build, hiccup: 0, ...opts });
const D = (id, name, price, desc, build, opts = {}) => ({ id, name, slot: 'decor', kind: 'decor', price, desc, build, ...opts });
// Prizes are decor with a WPM to beat instead of a price.
const R = (id, name, wpm, desc, build, opts = {}) => ({ id, name, slot: 'decor', kind: 'decor', price: 0, prize: { wpm }, desc, build, ...opts });
const P = (id, name, price, desc, opts) => ({ id, name, slot: 'paint', kind: 'paint', price, desc, build: paintPot(opts.color || '#e2b93b', opts.pattern), ...opts });

export const BUILTIN = [
  W('sunhat', 'Straw Sun Hat', 'head', 35, 'For sunny days and very important naps.', sunHat),
  W('beanie', 'Bobble Beanie', 'head', 30, 'Knitted by Grandgnome. One bobble, no regrets.', beanie),
  W('flowercrown', 'Flower Crown', 'head', 45, 'Smells lovely. Bees think so too.', flowerCrown),
  W('acorncap', 'Acorn Cap', 'head', 25, 'The squirrels want it back.', acornCap),
  W('mushcap', 'Mushroom Cap', 'head', 55, 'Fun-gi fashion.', mushroomCap),
  W('tophat', 'Fancy Top Hat', 'head', 80, 'Indeed. Quite. Rather.', topHat),
  W('crown', 'Garden Crown', 'head', 150, 'For the Gnome King (or Queen) of the Garden.', crown),
  W('spectacles', 'Reading Spectacles', 'face', 30, 'For reading very small books.', spectacles),
  W('sunglasses', 'Cool Shades', 'face', 40, 'Too cool to be glazed. (Still glazed.)', sunglasses),
  W('heartglasses', 'Rose-Tinted Specs', 'face', 45, 'Everything looks lovely now.', heartGlasses),
  W('monocle', 'Monocle', 'face', 60, 'Splendid. Simply splendid.', monocle),
  W('scarf', 'Cozy Scarf', 'neck', 30, 'Red and white, like a candy cane.', scarf),
  W('lei', 'Flower Lei', 'neck', 40, 'Aloha from the vegetable patch.', lei),
  W('lantern', 'Garden Lantern', 'hand', 45, 'Lights the way to the snack cupboard.', lantern),
  W('wateringcan', 'Watering Can', 'hand', 30, 'Tiny can, giant responsibility.', wateringCan),
  W('fishingrod', 'Fishing Rod', 'hand', 50, 'Has never caught a fish. Has caught a boot.', fishingRod),
  W('bouquet', 'Bouquet', 'hand', 40, 'For you! (Not you, Gerald.)', bouquet),
  W('shovel', 'Tiny Shovel', 'hand', 35, 'Dig it.', shovel),
  W('backpack', 'Adventure Backpack', 'back', 50, 'Packed: one leek, emergency puns.', backpack),
  W('wings', 'Butterfly Wings', 'back', 120, 'Flutter flutter. Still can\'t fly. Use balloons.', wings),
  W('cape', 'Hero Cape', 'back', 70, 'Super Gnome, defender of flowerbeds!', cape),

  F('berrytart', 'Berry Tart', 8, 'Fresh from the bramble patch.', berryTart, { hunger: 35, thirst: 0 }),
  F('acorncookie', 'Acorn Cookie', 5, 'Crunchy. Squirrel-approved.', acornCookie, { hunger: 25, thirst: 0 }),
  F('crumpet', 'Crumpet', 6, 'Warm, buttery, full of little holes. The Crumpet Café special.', crumpet, { hunger: 30, thirst: 0 }),
  F('muffin', 'Acorn Muffin', 7, 'Baked with real acorns. Squirrels line up for these.', acornMuffin, { hunger: 35, thirst: 0 }),
  F('radish', 'Crunchy Radish', 3, 'Straight from the veggie patch.', radish, { hunger: 20, thirst: 5 }),
  F('soup', 'Mushroom Soup', 10, 'Warm and cozy. Not made of friends.', mushroomSoup, { hunger: 45, thirst: 10 }),
  F('honeytoast', 'Honey Toast', 9, 'Bees made the honey. Bees are very kind.', honeyToast, { hunger: 40, thirst: 0 }),
  F('dewtea', 'Dewdrop Tea', 5, 'Collected at sunrise, one drop at a time.', teaCup, { hunger: 0, thirst: 35 }),
  F('rainwater', 'Fresh Rainwater', 3, 'Free from the sky. (Still costs 3 acorns.)', rainwater, { hunger: 0, thirst: 30 }),
  F('lemonade', 'Lemonade', 7, 'Sweet, sour, and very yellow.', lemonade, { hunger: 5, thirst: 45 }),
  F('dandelionpop', 'Dandelion Pop', 6, 'Extremely fizzy. Hic!', dandelionPop, { hunger: 0, thirst: 40, hiccup: 1 }),

  D('birdbath', 'Bird Bath', 20, 'With a bubbling fountain. A splashy spot for birds. (Not you, Gerald.)', birdbath, {
    poke: 'splash', lines: ['Splish splash!', "It's a little fountain! I'm bubbling with excitement!", 'So refreshing! Just don\'t tell Gerald it\'s here.'],
  }),
  D('toadstool', 'Toadstool Stool', 25, 'A comfy seat. Just the right size.', toadstool, {
    poke: 'sparkle', lines: ['Perfect for sitting! If I could bend.', 'Fun-gi to have around!', "It's a mush-room with a view."],
  }),
  D('sunflower', 'Giant Sunflower', 35, 'Taller than a gnome. Not hard.', sunflower, {
    anim: 'sway', poke: 'pollen', lines: ['Achoo! Lovely flower, though.', "It's always looking on the bright side!", 'It follows the sun. I follow snacks.'],
  }),
  D('pinwheel', 'Pinwheel', 20, 'Whirly! Twirly!', pinwheel, {
    anim: 'turn', poke: 'sparkle', lines: ['Wheee! Whirly!', 'It never gets dizzy. I do.', 'Round and round it goes!'],
  }),
  D('pebble', 'Pet Pebble', 15, 'Very well behaved. Never runs away.', petPebble, {
    poke: 'none', lines: ['Pebbles says hi! ...Pebbles is shy.', "Who's a good pebble? You are!", 'Pebbles did a trick! (She sat.)'],
  }),
  D('frogpond', 'Frog Pond', 60, 'Comes with Sir Hops-a-Lot, a very polite frog.', frogPond, {
    anim: 'squish', poke: 'splash', lines: ['Ribbit! Sir Hops-a-Lot says hello.', 'He told me a joke. It was toad-ally hilarious.', 'Hop hop!'],
  }),
  D('flamingo', 'Lawn Flamingo', 40, 'A fellow lawn ornament. Suspiciously pink.', flamingo, {
    poke: 'sparkle', lines: ["I don't trust him. He stands on one leg. Show-off.", 'He thinks he\'s the fanciest ornament. He is wrong.', 'We have a friendly rivalry.'],
  }),
  D('wishingwell', 'Wishing Well', 90, 'Toss in an acorn and make a wish!', wishingWell, {
    poke: 'sparkle', lines: ['I wished for more puns. It worked.', 'Make a wish! ...Did you wish for snacks? Me too.', 'Well, well, well!'],
  }),
  D('birdhouse', 'Bird House', 50, 'A cozy home for birds. Gerald has applied.', birdhouse, {
    anim: 'bob', poke: 'notes', lines: ['Tweet tweet!', 'Gerald wanted to move in. The answer was no.', 'Cozy little place!'],
  }),

  // Race prizes: won at the Grand Gnome Prix by typing fast (and carefully). Can't be bought.
  R('checkerflag', 'Checkered Flag', 10, 'You typed 10 words a minute at the Grand Gnome Prix!', checkerFlag, {
    anim: 'sway', poke: 'sparkle', lines: ['The checkered flag! That means we WON. Or the race is over. Same thing.', 'Flap flap! It flutters like a racing heart!', 'Ten words a minute! Gnome-body could catch us!'],
  }),
  R('bronzecup', 'Bronze Cup', 15, 'For typing 15 words a minute at the Grand Gnome Prix.', cup('#c98a4a', '#a06a32'), {
    poke: 'sparkle', lines: ['Bronze! That\'s bronze-tastic!', 'I polish it every morning. I\'m a very tidy champion.', 'Fifteen words a minute! Vroom!'],
  }),
  R('silvercup', 'Silver Cup', 20, 'For typing 20 words a minute at the Grand Gnome Prix.', cup('#c9ced8', '#9aa0aa', { tall: 1 }), {
    poke: 'sparkle', lines: ['Silver! Shiny as my glaze!', 'Twenty words a minute! Tell all your friends!', 'Every cloud has a silver lining. Every garden has a silver CUP.'],
  }),
  R('goldcup', 'Golden Cup', 30, 'For typing 30 words a minute at the Grand Gnome Prix. A real champion!', cup('#e2b93b', '#b8902a', { tall: 2, gem: '#d23c3a' }), {
    poke: 'sparkle', lines: ['GOLD! We are the champions, my friend!', 'Thirty words a minute! That\'s faster than a squirrel with a deadline!', 'I can see my reflection in it. Handsome devil.'],
  }),
  R('podium', "Winner's Podium", 40, 'For typing 40 words a minute. Number one, every time!', podium, {
    poke: 'sparkle', lines: ['First place! I\'d stand on top, but I\'m already very tall. For a gnome.', 'Forty words a minute! The crowd goes wild!', 'Second place is just the first loser. Kidding! Everybody gets a crumpet.'],
  }),
  R('miniracer', 'Little Racer', 50, 'A model of the champion\'s car, for typing 50 words a minute!', miniRacer, {
    anim: 'bob', poke: 'sparkle', lines: ['Vroom vroom! It\'s a little me, in a little car!', 'Fifty words a minute! You\'re a typing rocket!', 'It goes zero to sixty in... well, it doesn\'t go. It\'s a statue. Like me!'],
  }),
  R('lightning', 'Lightning Fingers', 60, 'The fastest prize of all: 60 words a minute! Your fingers are lightning!', lightningTrophy, {
    anim: 'bob', poke: 'sparkle', lines: ['LIGHTNING FINGERS! Sixty words a minute! Shocking!', 'This trophy is electrifying!', 'Bolt from the blue! Nobody types faster than us!'],
  }),

  P('goldpaint', 'Golden Glaze', 60, 'Shiny gold paint for any part of your gnome.', { color: '#e2b93b' }),
  P('midnightpaint', 'Midnight Blue', 30, 'Deep, dark, dreamy blue.', { color: '#2b3270' }),
  P('mintpaint', 'Mint Green', 30, 'Fresh as a garden morning.', { color: '#8fd8b8' }),
  P('bubblegumpaint', 'Bubblegum Pink', 30, 'Sweet and pink.', { color: '#ff9ccf' }),
  P('sunsetpaint', 'Sunset Orange', 30, 'The color of a lovely evening.', { color: '#ff8a5c' }),
  P('dotspaint', 'Polka Dots', 45, 'White dots for your hat or shirt.', { pattern: 'dots', color: '#d23c3a' }),
  P('stripespaint', 'Stripes', 45, 'Stripy hat or shirt. Very dashing.', { pattern: 'stripes', color: '#3a6fc4' }),
  P('starspaint', 'Starry', 55, 'Little golden stars for your hat or shirt.', { pattern: 'stars', color: '#2b3270' }),
];

// ---------------- registry ----------------
const registry = new Map(BUILTIN.map((it) => [it.id, it]));
const modelCache = new Map();
export function allItems() { return [...registry.values()]; }
export function getItem(id) { return registry.get(id); }
// Things you can buy at Gnome Depot (prizes have to be won).
export function shopItems() { return allItems().filter((it) => !it.prize); }
// Race prizes, slowest first.
export const PRIZES = BUILTIN.filter((it) => it.prize).sort((a, b) => a.prize.wpm - b.prize.wpm);

// Wearables: drop any block that would sit inside the gnome's body.
function fit(model, slot) {
  if (!['head', 'face', 'neck', 'hand', 'back'].includes(slot)) return model;
  const body = gnomeCells();
  const o = SLOTS[slot].origin;
  for (const [x, y, z] of [...model.each()]) {
    const k = `${x + o[0]},${y + o[1]},${z + o[2]}`;
    if (body.has(k)) model.delete(x, y, z);
  }
  return model;
}
export function getModel(id) {
  const it = registry.get(id);
  if (!it) return null;
  if (!modelCache.has(id)) modelCache.set(id, fit(it.build(), it.slot));
  return modelCache.get(id);
}
