// Gerald the pigeon: the gnome's cheeky rival. Glazed, because he's a fancy pigeon.
// Faces +z, feet at y = 0. Flap the wings by rotating them around z.
import * as THREE from '../vendor/three.module.min.js';
import { VoxelModel, buildGlazed } from './voxel.js';

export function buildGerald() {
  const ger = new VoxelModel(null);
  ger.sphere(0, 4, 0, 3.4, '#8a8a9a', 2.8);
  ger.sphere(0, 8, 3, 2.2, '#7a7a8a');
  ger.box(-1, 7, 5, 1, 8, 7, '#f2b632');                       // beak
  ger.set(-2, 9, 4, '#1c1a1a'); ger.set(1, 9, 4, '#1c1a1a');   // eyes
  ger.box(-1, 6, 2, 1, 7, 4, '#4aa88a');                       // shiny neck
  ger.box(-1, 2, -5, 1, 4, -2, '#6a6a7a');                     // tail
  ger.box(-2, 0, 0, -1, 2, 1, '#f2a2a2'); ger.box(1, 0, 0, 2, 2, 1, '#f2a2a2'); // little pink feet
  const wings = [-1, 1].map((s) => {
    const w = new VoxelModel(null);
    w.box(0, 0, -3, 5, 1, 3, '#9a9aaa');
    const mesh = buildGlazed(w);
    mesh.position.set(s > 0 ? 2.5 : -2.5, 5, 0);
    mesh.scale.x = s;
    return mesh;
  });
  const group = new THREE.Group();
  group.add(buildGlazed(ger), ...wings);
  const flap = (amount) => wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * amount; });
  return { group, wings, flap };
}
