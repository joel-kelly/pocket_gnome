// Garden: put decor out in the garden, or put it away.
import { h, button, openPanel, setPanelBody, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getModel } from '../items.js';
import { thumbnail, DECOR_SPOTS } from '../world.js';
import { openShop } from './shop.js';

export function openGarden(game) {
  const { world, S } = game;
  const render = () => {
    const s = game.state;
    const items = allItems().filter((it) => it.kind === 'decor' && s.owned.includes(it.id));
    const out = (s.decor || []).filter(Boolean).length;
    const grid = h('div', { class: 'grid' });
    for (const it of items) {
      const spot = game.decorSpotOf(it.id);
      grid.append(h('button', {
        class: 'card' + (spot >= 0 ? ' sel' : ''),
        onclick: () => {
          if (spot >= 0) { game.removeDecor(it.id); sfx.remove(); }
          else if (game.placeDecor(it.id) < 0) { toast('The garden is full! Put something away first.'); return; }
          else { sfx.place(); world.pokeDecor(game.decorSpotOf(it.id)); game.line('newDecor', 2.5); }
          render();
        },
      }, h('img', { src: thumbnail(getModel(it.id), it.id), alt: '' }), h('div', { class: 'nm' }, it.name), h('div', { class: 'pr' }, spot >= 0 ? 'In the garden' : 'Put out')));
    }
    setPanelBody(h('div', {},
      h('p', { class: 'panel-note' }, `Click something to put it out or put it away. (${out} of ${DECOR_SPOTS.length} spots used)`),
      grid,
      h('p', { class: 'small' }, button('Shop for garden things', () => openShop(game, 'decor'), 'small'))));
  };
  world.setView('decor');
  openPanel('Garden', h('div'), { onClose: () => world.setView('home') });
  render();
}
