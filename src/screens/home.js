// Home: the garden. Stats, care actions, poking, and idle gnome life.
import * as THREE from '../../vendor/three.module.min.js';
import { h, button, openPanel, setPanelBody, closePanel, panelOpen, modalOpen, toast } from '../ui.js';
import { STAT_INFO } from '../state.js';
import { sfx, setSoundEnabled, soundEnabled } from '../audio.js';
import { getItem, getModel } from '../items.js';
import { buildGlazed, disposeGlazed } from '../voxel.js';
import { thumbnail } from '../world.js';
import { LINES, pick } from '../lines.js';
import { openShop } from './shop.js';
import { openWardrobe } from './wardrobe.js';
import { openGarden } from './garden.js';
import { openParent } from './parent.js';
import { openGames } from './games.js';
import { BirdBathLife } from '../birdbath.js';

// Spots on the lawn the gnome likes to hop over to.
const STROLL = [[-14, 6], [12, 8], [-6, -10], [8, -6], [0, 14], [-20, -4], [18, -2]];

export class HomeScreen {
  constructor(game) {
    this.game = game;
    this.hud = document.getElementById('hud');
    this.busy = false;
    this.t = 0;
    this.idleAt = 6;
    this.chatAt = 22;
    this.pokes = [];
    this.raycaster = new THREE.Raycaster();
    game.S.onChange(() => this.refresh());
    this.bath = new BirdBathLife(game);
    document.getElementById('game').addEventListener('pointerdown', (e) => this.onCanvasClick(e));
  }
  get state() { return this.game.state; }

  enter(args = {}) {
    const { world, gnome } = this.game;
    world.active = null;
    world.setView(panelOpen() ? 'side' : 'home');
    if (gnome.object.parent !== world.scene) world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    gnome.object.visible = true;
    gnome.overlay = null;
    this.busy = false;
    this.build();
    this.hud.classList.remove('hidden');
    this.game.applyPaint();
    this.game.applyDecor();
    this.game.applyMood();
    if (args.greet) {
      setTimeout(() => {
        const needy = this.game.S.neediest();
        this.game.line(needy === 'hunger' ? 'greetHungry' : 'greet', 5);
        gnome.act(needy ? 'slump' : 'cheer');
      }, 600);
    }
    if (args.say) setTimeout(() => this.game.say(args.say, 6), 500);
  }
  exit() { this.hud.classList.add('hidden'); this.bath.hide(); }

  // ---------- HUD ----------
  build() {
    const s = this.state;
    this.acornEl = h('div', { class: 'acorns', title: 'Acorns to spend at Gnome Depot' }, h('span', { class: 'ico' }, '🌰'), h('span', { class: 'amt' }, s.acorns));
    const soundBtn = button(soundEnabled() ? '🔊' : '🔇', () => {
      s.settings.sound = !s.settings.sound;
      setSoundEnabled(s.settings.sound);
      this.game.S.save();
      soundBtn.textContent = s.settings.sound ? '🔊' : '🔇';
    }, 'small');
    soundBtn.title = 'Sound on or off';
    const top = h('div', { class: 'topbar' },
      h('div', { class: 'nameplate' }, s.gnomeName),
      this.acornEl,
      h('div', { class: 'spacer' }),
      soundBtn, this.holdButton('Grown-ups', () => openParent(this.game)));

    this.statEls = {};
    const stats = h('div', { class: 'stats' });
    for (const [k, info] of Object.entries(STAT_INFO)) {
      const fill = h('div', { class: 'fill' });
      stats.append(h('div', { class: 'stat' }, h('span', { class: 'ico' }, info.icon), h('span', { class: 'lbl' }, info.label), h('div', { class: 'bar' }, fill)));
      this.statEls[k] = fill;
    }
    const act = (emo, label, fn, cls = '') => h('button', { class: `btn act ${cls}`, onclick: () => { sfx.click(); fn(); } }, h('span', { class: 'emo' }, emo), label);
    const actions = h('div', { class: 'actions' },
      act('⌨️', 'Type & Play!', () => openGames(this.game), 'play'),
      act('🍓', 'Feed', () => this.openFeed()),
      act('🏪', 'Gnome Depot', () => openShop(this.game)),
      act('🎩', 'Wardrobe', () => openWardrobe(this.game)),
      act('🌻', 'Garden', () => openGarden(this.game)),
      act('🧹', 'Tidy Up', () => this.tidy()),
    );
    this.hud.innerHTML = '';
    this.hud.append(top, actions, stats);
    this.refresh();
  }

  holdButton(label, fn) {
    const prog = h('div', { class: 'prog' });
    const b = h('button', { class: 'btn small holdbtn', title: 'Press and hold' }, label, prog);
    let timer = null, start = 0, raf = 0;
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); prog.style.width = '0'; };
    b.addEventListener('pointerdown', () => {
      start = performance.now();
      const step = () => { prog.style.width = Math.min(100, (performance.now() - start) / 12) + '%'; raf = requestAnimationFrame(step); };
      step();
      timer = setTimeout(() => { stop(); fn(); }, 1200);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    return b;
  }

  refresh() {
    if (!this.acornEl) return;
    const s = this.state;
    const amt = this.acornEl.querySelector('.amt');
    if (amt.textContent !== String(s.acorns)) {
      amt.textContent = s.acorns;
      this.acornEl.classList.remove('bump'); void this.acornEl.offsetWidth; this.acornEl.classList.add('bump');
    }
    for (const [k, el] of Object.entries(this.statEls || {})) {
      const v = s.stats[k];
      el.style.width = v + '%';
      el.className = 'fill' + (v < 25 ? ' low' : v < 50 ? ' mid' : '');
    }
  }

  second() {
    this.refresh();
    if (!this.busy) this.game.applyMood();
  }

  // ---------- idle life ----------
  update(dt) {
    this.t += dt;
    const { gnome } = this.game;
    this.bath.update(dt, { calm: !this.busy && !modalOpen() });
    if (this.busy || modalOpen() || gnome.busy) return;
    if (this.t > this.idleAt) {
      this.idleAt = this.t + 7 + Math.random() * 9;
      const r = Math.random();
      const home = panelOpen() ? [0, 0] : null;
      if (r < 0.25 && !home) {
        const [x, z] = STROLL[Math.floor(Math.random() * STROLL.length)];
        gnome.walkTo(x, z).then(() => this.game.wait(2 + Math.random() * 3)).then(() => { if (!this.busy) gnome.walkTo(0, 0); });
      } else if (r < 0.32) gnome.act('sneeze');
      else if (r < 0.4 && this.state.stats.tidy < 60) gnome.act('sweep');
      else gnome.act(['hop', 'lookAround', 'wobble', 'nod', 'hop', 'lookAround'][Math.floor(Math.random() * 6)]);
    }
    if (this.t > this.chatAt) {
      this.chatAt = this.t + 18 + Math.random() * 22;
      const needy = this.game.S.neediest();
      this.game.line(needy ? { hunger: 'hungry', thirst: 'thirsty', tidy: 'untidy', joy: 'bored' }[needy] : Math.random() < 0.25 ? 'happy' : 'idle');
    }
  }

  onKey(e) {
    if (e.key === 'Escape') closePanel();
  }

  // ---------- poking ----------
  onCanvasClick(e) {
    if (this.game.screen !== this || modalOpen()) return;
    const { world, gnome } = this.game;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, world.camera);
    const hitG = this.raycaster.intersectObject(gnome.object, true)[0];
    const ger = this.bath.hit(this.raycaster);
    if (ger != null && (!hitG || ger < hitG.distance)) { this.bath.leave(true); return; }
    const decor = world.decorHit(this.raycaster);
    if (decor && (!hitG || decor.distance < hitG.distance)) this.pokeDecor(decor.spot);
    else if (hitG) this.poke();
  }

  pokeDecor(i) {
    const { world, gnome, fx } = this.game;
    const d = world.decor[i];
    const it = d && getItem(d.id);
    if (!it) return;
    world.pokeDecor(i);
    const top = world.decorTop(i, 1);
    switch (it.poke) {
      case 'splash': sfx.splash(); fx.splash(top); break;
      case 'pollen': sfx.swish(); fx.pollen(top, 18); if (!gnome.busy) setTimeout(() => gnome.act('sneeze'), 500); break;
      case 'notes': sfx.chime(); fx.notes(top); break;
      case 'none': sfx.tap(); break;
      default: sfx.chime(); fx.sparkles(top, 6);
    }
    if (this.busy) return;
    gnome.emote('happy', 1.6);
    if (!gnome.busy) gnome.act('nod');
    this.game.say(pick(it.lines || LINES.decorPoke, this.game.vars()), 3.5);
    this.idleAt = this.t + 6;
    this.chatAt = Math.max(this.chatAt, this.t + 10);
  }

  poke() {
    if (this.busy) return;
    const { gnome } = this.game;
    const now = Date.now();
    this.pokes = this.pokes.filter((t) => now - t < 60000);
    this.pokes.push(now);
    if (this.pokes.length <= 6) this.game.S.addStat('joy', 2);
    const r = Math.random();
    gnome.stop();
    if (r < 0.12) { gnome.act('oops').then(() => this.game.line('pokeOops', 3)); }
    else if (r < 0.24) { gnome.act('sneeze').then(() => this.game.line('pokeSneeze', 2.5)); }
    else if (r < 0.44) { gnome.act('spin'); this.game.line('poke', 2.5); }
    else if (r < 0.6) { gnome.act('wobble'); this.game.line('poke', 2.5); }
    else { gnome.act('hop'); gnome.emote('happy', 1.2); this.game.line('poke', 2.5); }
    this.idleAt = this.t + 8;
  }

  // ---------- feeding ----------
  openFeed() {
    const { world } = this.game;
    world.setView('side');
    const render = () => {
      const pantry = this.state.pantry;
      const ids = Object.keys(pantry).filter((id) => pantry[id] > 0 && getItem(id));
      if (!ids.length) {
        return h('div', { class: 'empty' }, 'The pantry is empty!', h('br'), 'Buy snacks at Gnome Depot.', h('br'), h('br'),
          button('Go to Gnome Depot', () => { closePanel(); openShop(this.game, 'snack'); }, 'gold'));
      }
      const grid = h('div', { class: 'grid' });
      for (const id of ids) {
        const it = getItem(id);
        grid.append(h('button', { class: 'card', onclick: () => this.feed(id, () => setPanelBody(render())) },
          h('span', { class: 'count' }, '×' + pantry[id]),
          h('img', { src: thumbnail(getModel(id), id), alt: '' }),
          h('div', { class: 'nm' }, it.name),
          h('div', { class: 'pr' }, it.kind === 'drink' ? `💧 +${it.thirst}` : `🍓 +${it.hunger}`)));
      }
      return h('div', {}, h('p', { class: 'panel-note' }, 'Click a snack to give it to ' + this.state.gnomeName + '.'), grid);
    };
    openPanel('Snack Time', render(), { onClose: () => world.setView('home') });
  }

  async feed(id, after) {
    if (this.busy) return;
    const { gnome, world, fx, S } = this.game;
    const s = this.state;
    const it = getItem(id);
    if (!it || !(s.pantry[id] > 0)) return;
    s.pantry[id]--;
    if (s.pantry[id] <= 0) delete s.pantry[id];
    S.save();
    after?.();
    this.busy = true;
    gnome.stop();
    await gnome.walkTo(0, 0);
    const wasFull = it.kind === 'food' && s.stats.hunger > 90;
    // toss the snack up to the gnome's mouth
    const mesh = buildGlazed(getModel(id), { offset: [-5, -3, -5] });
    world.scene.add(mesh);
    const start = gnome.mouth().add(new THREE.Vector3(26, -14, 26));
    mesh.position.copy(start);
    mesh.scale.setScalar(0.7);
    sfx.whoosh();
    gnome.emote('wide', 0.6);
    await new Promise((res) => this.game.tween(0.55, (p) => {
      mesh.position.lerpVectors(start, gnome.mouth(), p);
      mesh.position.y += Math.sin(p * Math.PI) * 12;
      mesh.rotation.y = p * 5; mesh.rotation.x = p * 3;
      mesh.scale.setScalar(0.7 - p * 0.3);
    }, res));
    gnome.act('eat');
    if (it.kind === 'drink') sfx.gulp();
    fx.crumbs(gnome.mouth(), it.kind === 'drink' ? '#8fd0f0' : '#d9a35a');
    await new Promise((res) => this.game.tween(1.0, (p) => {
      mesh.position.copy(gnome.mouth());
      mesh.scale.setScalar(Math.max(0.01, 0.4 * (1 - p)));
    }, res));
    world.scene.remove(mesh);
    disposeGlazed(mesh);
    S.addStat('hunger', it.hunger || 0);
    S.addStat('thirst', it.thirst || 0);
    this.game.line(wasFull ? 'full' : it.kind === 'drink' ? 'drink' : 'eat', 2.5);
    fx.hearts(gnome.headTop(), 3);
    await this.game.wait(1.2);
    if (it.hiccup) {
      for (let i = 0; i < 4; i++) { await gnome.act('hiccup'); await this.game.wait(0.5); }
      this.game.say('Hic! ...Excuse me! Hic!', 2.5);
    }
    this.busy = false;
    this.game.applyMood();
  }

  // ---------- tidying (the gnome loves this) ----------
  async tidy() {
    if (this.busy) return;
    const { gnome, world, fx, S } = this.game;
    closePanel();
    world.setView('home');
    this.busy = true;
    gnome.stop();
    await gnome.walkTo(0, 0);
    if (this.state.stats.tidy > 90) {
      this.game.line('tidyAlready', 3);
      gnome.act('polish');
      fx.sparkles(gnome.headTop(), 8);
      S.addStat('joy', 2);
      await this.game.wait(1.5);
      this.busy = false;
      return;
    }
    this.game.line('tidyStart', 2.5);
    const from = this.state.stats.tidy;
    gnome.act('sweep');
    for (let i = 0; i < 4; i++) {
      fx.leaves(new THREE.Vector3((Math.random() - 0.5) * 70, 0, (Math.random() - 0.5) * 40), 8, 12);
      world.setMess(((60 - (from + (100 - from) * (i + 1) / 4)) / 60));
      await this.game.wait(0.6);
    }
    gnome.setMessy(false);
    await gnome.act('polish');
    fx.sparkles(gnome.headTop(), 10);
    S.addStat('tidy', 100);
    S.addStat('joy', 6);
    this.game.line('tidyDone', 3);
    await gnome.act('cheer');
    this.busy = false;
    this.game.applyMood();
  }
}

export function needKeyboardNote() {
  return matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches
    ? h('p', { class: 'kb-note' }, '⌨️ The typing games need a real keyboard. Plug one in, or play on a computer!')
    : null;
}
export { toast };
