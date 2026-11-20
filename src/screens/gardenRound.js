// Typing games played right in the garden: clear the lawn (decor and leaves
// step aside), stand the gnome somewhere, and put it all back afterward.
export function enterGarden(game, gnomeAt = [0, 0, 0]) {
  const { world, gnome } = game;
  world.active = null;
  world.setView('patch');
  world.decorGroup.visible = false;
  world.litter.visible = false;
  if (gnome.object.parent !== world.scene) world.scene.add(gnome.object);
  gnome.stop();
  gnome.walk = null;
  gnome.object.position.set(...gnomeAt);
  gnome.object.rotation.set(0, 0, 0);
}

export function leaveGarden(game) {
  const { world, gnome } = game;
  world.decorGroup.visible = true;
  world.litter.visible = true;
  gnome.object.position.set(0, 0, 0);
  gnome.overlay = null;
}
