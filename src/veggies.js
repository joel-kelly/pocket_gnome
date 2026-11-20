// Little glazed veggies (for Beet the Clock and Mole Patrol) and the moles.
// Each model is centered on x/z = 0 and sits on y = 0.
import { VoxelModel, hash3 } from './voxel.js';

const LEAF = '#4f9a3f', LEAF_D = '#357a2e';
function tops(m, y, n = 3) {
  for (let i = 0; i < n; i++) {
    const [dx, dz] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]][i];
    for (let k = 0; k < 3; k++) m.set(dx, y + k, dz, k === 2 ? LEAF_D : LEAF);
  }
  return m;
}

export const VEGGIES = {
  beet: () => { const m = new VoxelModel(null); m.sphere(0.5, 1.8, 0.5, 2.2, (x, y) => (y < 1 ? '#6a1a3a' : '#9a2a5a'), 2); m.set(0, 0, 0, '#6a1a3a'); return tops(m, 4); },
  carrot: () => {
    const m = new VoxelModel(null);
    for (let y = 0; y < 5; y++) { const r = 0.6 + y * 0.35; m.cyl(0.5, 0.5, r, y, y + 1, y % 2 ? '#e8823a' : '#f0943e'); }
    return tops(m, 5, 5);
  },
  radish: () => { const m = new VoxelModel(null); m.sphere(0.5, 1.6, 0.5, 1.9, '#e04a6a'); m.set(0, 0, 0, '#fbf7ee'); return tops(m, 3); },
  cabbage: () => { const m = new VoxelModel(null); m.sphere(0.5, 2.2, 0.5, 2.9, (x, y, z) => (hash3(x, y, z) < 0.3 ? '#9ad87a' : '#6abf4a'), 2.4); return m; },
  pumpkin: () => {
    const m = new VoxelModel(null);
    m.sphere(0.5, 2, 0.5, 3.2, (x, y, z) => ((x + z) % 2 ? '#e8823a' : '#d8702a'), 2.2);
    m.set(0, 4, 0, '#5a7a2a'); m.set(0, 5, 0, '#5a7a2a');
    return m;
  },
  golden: () => { const m = new VoxelModel(null); m.sphere(0.5, 1.8, 0.5, 2.2, (x, y, z) => (hash3(x, y, z) < 0.2 ? '#fff2a0' : '#e2b93b'), 2); return tops(m, 4); },
};
export const VEGGIE_NAMES = ['beet', 'beet', 'carrot', 'radish', 'cabbage', 'pumpkin'];

// A friendly mole: round, brown, pink nose, little paws on the edge of its hole.
export function moleModel() {
  const m = new VoxelModel(null);
  m.sphere(0.5, 3, 0.5, 3.3, (x, y, z) => (z > 1 && y < 3 ? '#a8805a' : '#6a4a32'), 4);
  for (const [x, y, z] of [...m.each()]) if (y < 0) m.delete(x, y, z);
  m.sphere(0.5, 4.2, 3.8, 1.1, '#ff8aa8');           // nose
  m.set(-2, 5, 3, '#1c1a1a'); m.set(2, 5, 3, '#1c1a1a');  // eyes
  m.box(-3, 1, 3, -1, 2, 5, '#ffb0c0'); m.box(2, 1, 3, 4, 2, 5, '#ffb0c0'); // paws
  return m;
}

// A dark hole with a ring of dug-up soil.
export function holeModel() {
  const m = new VoxelModel(null);
  m.ring(0.5, 0.5, 3.6, 5.6, 0, 1, (x, y, z) => (hash3(x, y, z) < 0.4 ? '#6b4a30' : '#7a5a3a'));
  m.cyl(0.5, 0.5, 3.6, 0, 1, '#2a1a10');
  return m;
}

// A soil mound for the veggie patch.
export function plotModel() {
  const m = new VoxelModel(null);
  m.box(-2, 0, -2, 3, 1, 3, (x, y, z) => (hash3(x, y, z) < 0.4 ? '#5a3a20' : '#6b4a30'));
  return m;
}
