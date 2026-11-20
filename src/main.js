import { World, DECOR_SPOTS } from './world.js';
import * as S from './state.js';
import { sfx, setSoundEnabled, unlockAudio } from './audio.js';
import { LINES, pick } from './lines.js';
import { getItem, getModel } from './items.js';
import { say, updateBubble, closePanel, modalOpen } from './ui.js';
import { HomeScreen } from './screens/home.js';
import { AstroScreen } from './screens/astro.js';
import { LessonScreen } from './screens/lesson.js';
import { PlacementScreen } from './screens/placement.js';
import { DepotScreen } from './screens/depot.js';

const state = S.load();
setSoundEnabled(state.settings.sound);

const world = new World(document.getElementById('game'));
const gnome = world.gnome;
gnome.setPaint(state.paint);

const tweens = [];

export const game = {
  world, gnome, fx: world.fx, S,
  get state() { return S.get(); },
  screen: null,
  screens: {},

  vars() { return { kid: S.get().kidName, gnome: S.get().gnomeName }; },
  line(key, seconds) { const l = pick(LINES[key], this.vars()); say(l, seconds); return l; },
  say,

  go(name, args) {
    closePanel();
    this.screen?.exit?.();
    this.screen = this.screens[name];
    this.screen.enter?.(args);
  },

  // ---- looks ----
  applyPaint(override) {
    gnome.setPaint({ ...S.get().paint, ...(override || {}) });
    this.applyOutfit();
  },
  applyOutfit(override = {}) {
    const eq = { ...S.get().equipped, ...override };
    const outfit = {};
    for (const slot of ['head', 'face', 'neck', 'hand', 'back']) outfit[slot] = eq[slot] ? getModel(eq[slot]) : null;
    gnome.setOutfit(outfit);
  },
  applyMood() {
    const s = S.get().stats;
    gnome.setMood(S.moodFromStats());
    gnome.setMessy(s.tidy < 35);
    world.setMess((60 - s.tidy) / 60);
  },

  // ---- garden decor ----
  // preview = { spot, id } shows an item in a spot without saving (Shop try-on).
  applyDecor(preview) {
    const ids = [...(S.get().decor || [])];
    if (preview) ids[preview.spot] = preview.id;
    world.setDecor(DECOR_SPOTS.map((_, i) => {
      const it = ids[i] && getItem(ids[i]);
      return it ? { id: it.id, model: getModel(it.id), anim: it.anim } : null;
    }));
  },
  decorSpotOf(id) { return (S.get().decor || []).indexOf(id); },
  freeDecorSpot() {
    const d = S.get().decor || [];
    for (let i = 0; i < DECOR_SPOTS.length; i++) if (!d[i] || !getItem(d[i])) return i;
    return -1;
  },
  placeDecor(id) {
    const s = S.get();
    const have = this.decorSpotOf(id);
    if (have >= 0) return have;
    const i = this.freeDecorSpot();
    if (i < 0) return -1;
    s.decor = [...(s.decor || [])];
    s.decor[i] = id;
    S.save();
    this.applyDecor();
    return i;
  },
  removeDecor(id) {
    const s = S.get();
    s.decor = (s.decor || []).map((d) => (d === id ? null : d));
    S.save();
    this.applyDecor();
  },

  tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); },
  wait(sec) { return new Promise((r) => setTimeout(r, sec * 1000)); },
};

// Sounds that go with the gnome's moves
gnome.on('tap', () => sfx.tap());
gnome.on('clink', () => sfx.clink());
gnome.on('clonk', () => sfx.clonk());
gnome.on('rattle', () => sfx.rattle());
gnome.on('chime', () => sfx.chime());
gnome.on('hic', () => { sfx.hic(); game.fx.bubbles(gnome.mouth(), 2); });
gnome.on('chomp', () => sfx.chomp());
gnome.on('swish', () => sfx.swish());
gnome.on('squeak', () => sfx.squeak());
gnome.on('achoo', () => { sfx.achoo(); game.fx.pollen(gnome.mouth()); });

game.screens.home = new HomeScreen(game);
game.screens.astro = new AstroScreen(game);
game.screens.lesson = new LessonScreen(game);
game.screens.placement = new PlacementScreen(game);
game.screens.depot = new DepotScreen(game);

game.applyOutfit();
game.applyMood();
game.applyDecor();

// ---------- input ----------
window.addEventListener('pointerdown', () => unlockAudio());
window.addEventListener('keydown', (e) => {
  unlockAudio();
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  // While a pop-up is open, keys belong to it: Enter presses its main button, Escape closes it.
  if (modalOpen()) {
    const box = document.querySelector('#modal-root .modal-wrap:last-child');
    if (e.key === 'Enter') { e.preventDefault(); box?.querySelector('.btn.gold')?.click(); }
    if (e.key === 'Escape') box?.querySelector('.btn.x')?.click();
    return;
  }
  game.screen?.onKey?.(e);
});

// ---------- main loop ----------
let last = performance.now();
let secAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  try { step(now); } catch (e) { console.error(e); }
}
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const p = Math.min(1, tw.t / tw.dur);
    tw.fn(p);
    if (p >= 1) { tweens.splice(i, 1); tw.done?.(); }
  }
  game.screen?.update?.(dt);
  world.update(dt);
  const top = gnome.object.visible ? world.toScreen(gnome.headTop()) : null;
  updateBubble(top && !top.behind && game.screen?.bubbleOK !== false ? top : null, (t) => sfx.babble(t));
  secAcc += dt;
  if (secAcc > 1) {
    secAcc = 0;
    S.tick();
    game.screen?.second?.();
  }
  world.render();
}

document.getElementById('loading').remove();
if (!state.onboarded) game.go('depot');
else if (!state.placed) game.go('placement');
else game.go('home', { greet: true });
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => S.saveNow());
document.addEventListener('visibilitychange', () => { if (document.hidden) S.saveNow(); });

// handy for debugging in the browser console
window.pocketGnome = game;
