// Woodland critters for the Crumpet Café.
// Each critter is centered on x/z = 0, sits on y = 0 and faces +z.
// `head` is roughly how tall the critter is (for order bubbles and trays).
import { VoxelModel, hash3 } from './voxel.js';

const EYE = '#1c1a1a', NOSE = '#3a2420', PINK = '#ff9ab0', WHITE = '#fbf7ee';
const trim = (m) => { for (const [x, y, z] of [...m.each()]) if (y < 0) m.delete(x, y, z); return m; };
const eyes = (m, y, z, dx = 2) => { m.set(-dx, y, z, EYE); m.set(dx - 1, y, z, EYE); m.set(-dx, y + 1, z - 1, WHITE); m.set(dx - 1, y + 1, z - 1, WHITE); };

function squirrel() {
  const fur = '#c8692e', furD = '#a8541f', belly = '#f3d8b0';
  const m = new VoxelModel(null);
  m.sphere(0.5, 4.5, 0.5, 3.4, (x, y, z) => (z >= 2 && y < 7 ? belly : fur), 4.2);
  m.sphere(0.5, 10.5, 1, 3, fur, 2.8);
  m.sphere(0.5, 9.8, 3.6, 1.4, belly, 1.2);       // muzzle
  m.set(0, 10, 4, NOSE);
  eyes(m, 11, 3);
  for (const x of [-2, 2]) { m.set(x - (x > 0 ? 1 : 0), 13, 0, fur); m.set(x - (x > 0 ? 1 : 0), 14, 0, furD); } // ears
  // the big fluffy tail curling up behind
  for (let i = 0; i < 7; i++) {
    const y = 2 + i * 2, z = -5 - Math.sin(i * 0.5) * 2;
    m.sphere(0.5, y, z, 2.4 + (i > 2 && i < 6 ? 0.5 : 0), (x, yy, zz) => (hash3(x, yy, zz) < 0.3 ? furD : fur), 1.8);
  }
  m.box(-3, 0, 1, -1, 1, 3, furD); m.box(2, 0, 1, 4, 1, 3, furD); // feet
  return { model: trim(m), head: 15 };
}

function hedgehog() {
  const spike = '#6a4a30', spikeL = '#8a6a48', face = '#f0d6b0';
  const m = new VoxelModel(null);
  m.sphere(0.5, 4, 0, 5, (x, y, z) => (hash3(x, y, z) < 0.4 ? spikeL : spike), 4.4);
  // spiky bits on the back
  for (const [x, y, z] of [...m.each()]) if (z < 1 && hash3(x, y, z + 7) < 0.18) m.set(x + Math.sign(x), y + 1, z - 1, spike);
  m.sphere(0.5, 3.8, 4, 2.8, face, 2.6);          // face
  m.sphere(0.5, 3.2, 6.4, 1.2, face, 1);           // snout
  m.set(0, 3, 7, NOSE);
  eyes(m, 5, 5);
  m.box(-3, 0, 2, -1, 1, 4, face); m.box(2, 0, 2, 4, 1, 4, face);
  return { model: trim(m), head: 10 };
}

function bunny() {
  const fur = '#d8d2c8', furL = '#f2eee6';
  const m = new VoxelModel(null);
  m.sphere(0.5, 4, 0, 3.6, (x, y, z) => (z >= 2 ? furL : fur), 4);
  m.sphere(0.5, 10, 1, 3, fur, 2.8);
  m.sphere(0.5, 9.2, 3.4, 1.5, furL, 1.2);
  m.set(0, 9, 4, PINK);
  eyes(m, 11, 3);
  for (const x of [-2, 1]) for (let y = 12; y < 19; y++) { m.set(x, y, 0, fur); m.set(x + 1, y, 0, fur); m.set(x + (x < 0 ? 1 : 0), y, 1, y > 12 && y < 18 ? PINK : fur); }
  m.sphere(0.5, 3, -4, 1.6, WHITE);                // cotton tail
  m.box(-3, 0, 1, -1, 1, 4, fur); m.box(2, 0, 1, 4, 1, 4, fur);
  return { model: trim(m), head: 18 };
}

function frog() {
  const g = '#5aa84a', gD = '#3f8a35', belly = '#d8ecb0';
  const m = new VoxelModel(null);
  m.sphere(0.5, 3.4, 0.5, 4.4, (x, y, z) => (z >= 3 && y < 4 ? belly : hash3(x, y, z) < 0.15 ? gD : g), 3.4);
  for (const x of [-2.5, 3.5]) { m.sphere(x, 6.6, 2, 1.6, g); }
  m.set(-3, 7, 3, EYE); m.set(3, 7, 3, EYE); m.set(-3, 8, 2, WHITE); m.set(3, 8, 2, WHITE);
  for (let x = -2; x < 3; x++) m.set(x, 4, 5, '#2a5a24');   // big smile
  m.box(-5, 0, 2, -2, 1, 5, gD); m.box(3, 0, 2, 6, 1, 5, gD);
  return { model: trim(m), head: 9 };
}

function mouse() {
  const fur = '#9a948c', furL = '#d8d0c4';
  const m = new VoxelModel(null);
  m.sphere(0.5, 3.5, 0, 3, (x, y, z) => (z >= 2 ? furL : fur), 3.5);
  m.sphere(0.5, 8.4, 1, 2.6, fur, 2.4);
  m.sphere(0.5, 7.8, 3.4, 1.2, furL, 1);
  m.set(0, 8, 4, PINK);
  eyes(m, 9, 3);
  // big round ears: fur outside, pink inside
  for (const cx of [-3, 3]) for (let x = cx - 2; x <= cx + 2; x++) for (let y = 9; y <= 14; y++) {
    const d = Math.hypot(x - cx, y - 11.5);
    if (d <= 2.6) { m.set(x, y, 0, fur); if (d <= 1.6) m.set(x, y, 1, PINK); }
  }
  for (let i = 0; i < 6; i++) m.set(0, 1 + Math.round(Math.sin(i) * 1.2), -3 - i, PINK); // tail
  m.box(-2, 0, 1, 0, 1, 3, PINK); m.box(1, 0, 1, 3, 1, 3, PINK);
  return { model: trim(m), head: 13 };
}

export const CRITTERS = [
  { id: 'squirrel', name: 'Squirrel', build: squirrel, likes: ['acorncookie', 'muffin', 'crumpet'] },
  { id: 'hedgehog', name: 'Hedgehog', build: hedgehog, likes: ['berrytart', 'soup', 'dewtea'] },
  { id: 'bunny', name: 'Bunny', build: bunny, likes: ['crumpet', 'dewtea', 'lemonade'] },
  { id: 'frog', name: 'Frog', build: frog, likes: ['dandelionpop', 'soup', 'lemonade'] },
  { id: 'mouse', name: 'Mouse', build: mouse, likes: ['crumpet', 'honeytoast', 'berrytart'] },
];
