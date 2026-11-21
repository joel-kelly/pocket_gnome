// Gnome Depot: spend acorns on snacks, hats, paint and garden decor. Try before you buy!
import { h, button, openPanel, setPanelBody, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { shopItems, getItem, getModel } from '../items.js';
import { SLOTS, WEAR_SLOTS } from '../gnomeModel.js';
import { thumbnail } from '../world.js';

const TABS = ['snack', ...WEAR_SLOTS, 'paint', 'decor'];

export function openShop(game, startTab = 'snack') {
  const { world, gnome, S } = game;
  let tab = startTab;
  let sel = null;
  game.line('buy', 2.5);

  const owns = (it) => (it.kind === 'paint' ? game.state.paints.includes(it.id) : (it.kind === 'wear' || it.kind === 'decor') && game.state.owned.includes(it.id));

  // Show an item on the gnome (or in the garden) without buying it.
  const tryOn = (id) => {
    const it = id && getItem(id);
    game.applyPaint(it?.kind === 'paint' ? (it.pattern ? { hatPattern: it.pattern, hat: it.color } : { hat: it.color }) : null);
    if (it?.kind === 'wear') { game.applyOutfit({ [it.slot]: id }); gnome.act('spin'); }
    if (it?.kind === 'paint') gnome.act('hop');
    if (it?.kind === 'decor' && game.decorSpotOf(id) < 0) {
      const spot = Math.max(0, game.freeDecorSpot());
      game.applyDecor({ spot, id });
      world.pokeDecor(spot);
    } else game.applyDecor();
  };

  const buy = (id) => {
    const s = game.state;
    const it = getItem(id);
    if (s.acorns < it.price) {
      sfx.wrongKey();
      gnome.act('shake');
      game.line('broke', 2.5);
      return;
    }
    S.addAcorns(-it.price);
    sfx.buy();
    world.fx.confetti(gnome.headTop(), 30);
    gnome.act('cheer');
    if (it.kind === 'wear') {
      s.owned.push(id);
      s.equipped[it.slot] = id;
      game.applyOutfit();
      toast(`You got the ${it.name}! ${s.gnomeName} is wearing it.`);
      game.line('newOutfit', 3);
    } else if (it.kind === 'decor') {
      s.owned.push(id);
      const spot = game.placeDecor(id);
      toast(spot >= 0 ? `You got the ${it.name}! It's in the garden.` : `You got the ${it.name}! The garden is full, so use Garden to swap things around.`);
      game.line('newDecor', 3);
    } else if (it.kind === 'paint') {
      s.paints.push(id);
      game.applyPaint();
      toast(`You got ${it.name}! Use Wardrobe → Paint to use it.`);
      game.line('painted', 3);
    } else {
      s.pantry[id] = (s.pantry[id] || 0) + 1;
      toast(`${it.name} added to the pantry!`);
    }
    S.save();
    render();
  };

  const tabs = () => h('div', { class: 'tabs' }, ...TABS.map((slot) => h('button', {
    class: 'tab' + (tab === slot ? ' on' : ''),
    onclick: () => { tab = slot; sel = null; tryOn(null); setView(); sfx.click(); render(); },
  }, `${SLOTS[slot].icon} ${SLOTS[slot].label}`)));

  const render = () => {
    const s = game.state;
    const items = shopItems().filter((it) => it.slot === tab).sort((a, b) => a.price - b.price);
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const owned = owns(it);
      grid.append(h('button', { class: 'card' + (sel === it.id ? ' sel' : ''), onclick: () => { sel = it.id; sfx.click(); tryOn(it.id); render(); } },
        it.kind !== 'wear' && s.pantry[it.id] ? h('span', { class: 'count' }, '×' + s.pantry[it.id]) : null,
        h('img', { src: thumbnail(getModel(it.id), it.id), alt: '' }),
        h('div', { class: 'nm' }, it.name),
        h('div', { class: 'pr' + (owned ? ' owned' : '') }, owned ? 'OWNED ✓' : `🌰 ${it.price}`)));
    }
    let foot = h('div', { class: 'empty' }, 'Click something to try it out!');
    if (sel) {
      const it = getItem(sel);
      const owned = owns(it);
      const btns = h('div', { class: 'btns' });
      if (owned && it.kind === 'decor') {
        const out = game.decorSpotOf(it.id) >= 0;
        btns.append(button(out ? 'In the garden!' : 'Put it out', () => {
          if (out) return;
          if (game.placeDecor(it.id) < 0) { toast('The garden is full! Use Garden to put something away.'); return; }
          world.pokeDecor(game.decorSpotOf(it.id)); game.line('newDecor'); render();
        }, 'green'));
      } else if (owned && it.kind === 'wear') {
        btns.append(button(s.equipped[it.slot] === it.id ? 'Wearing it!' : 'Wear it', () => {
          s.equipped[it.slot] = it.id; S.save(); game.applyOutfit(); gnome.act('spin'); game.line('newOutfit'); render();
        }, 'green'));
      } else if (owned) {
        btns.append(h('span', { class: 'small' }, 'Use it in Wardrobe → Paint'));
      } else {
        btns.append(button(`Buy 🌰 ${it.price}`, () => buy(it.id), s.acorns >= it.price ? 'gold' : ''));
      }
      const fx = it.kind === 'drink' ? `💧 +${it.thirst} thirst` : it.kind === 'food' ? `🍓 +${it.hunger} tummy` : '';
      foot = h('div', { class: 'detail' },
        h('img', { src: thumbnail(getModel(it.id), it.id), alt: '' }),
        h('div', { class: 'txt' }, h('h3', {}, it.name), h('p', {}, it.desc), fx ? h('p', { class: 'fxline' }, fx) : null),
        btns);
    }
    setPanelBody(h('div', {}, tabs(), grid), foot);
  };

  const setView = () => world.setView(tab === 'decor' ? 'decor' : 'side');
  setView();
  const acornEl = h('span', { class: 'shop-acorns' }, game.state.acorns);
  openPanel('Gnome Depot', h('div'), {
    onClose: () => { game.applyPaint(); game.applyDecor(); world.setView('home'); unsub(); },
    extraHead: h('div', { class: 'acorns mini' }, '🌰 ', acornEl),
  });
  const unsub = S.onChange(() => { acornEl.textContent = game.state.acorns; });
  render();
}
