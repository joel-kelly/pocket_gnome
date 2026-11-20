// Wardrobe: put on and take off what you own, and repaint the gnome.
import { h, button, openPanel, setPanelBody } from '../ui.js';
import { sfx } from '../audio.js';
import { allItems, getItem, getModel } from '../items.js';
import { SLOTS, WEAR_SLOTS, PAINTS, PAINT_PARTS, STYLES } from '../gnomeModel.js';
import { thumbnail } from '../world.js';
import { openShop } from './shop.js';

export function openWardrobe(game) {
  const { world, gnome, S } = game;
  let tab = 'paint';

  const paint = (part, value, key = part) => {
    const s = game.state;
    s.paint = { ...s.paint, [key]: value };
    S.save();
    game.applyPaint();
    sfx.place();
    world.fx.sparkles(gnome.headTop(), 5);
    if (!gnome.busy) gnome.act('hop');
    if (Math.random() < 0.3) game.line('painted', 2.5);
    render();
  };

  const paintTab = () => {
    const s = game.state;
    const bought = s.paints.map(getItem).filter(Boolean);
    const extraColors = bought.filter((p) => !p.pattern);
    const patterns = bought.filter((p) => p.pattern);
    const rows = Object.entries(PAINT_PARTS).map(([part, label]) => {
      const sw = h('div', { class: 'swatches' });
      const colors = [...Object.entries(PAINTS[part]), ...(part === 'skin' ? [] : extraColors.map((p) => [p.name, p.color]))];
      for (const [nm, hex] of colors) {
        sw.append(h('button', { class: 'swatch' + (s.paint[part] === hex ? ' on' : ''), title: nm, style: { background: hex }, onclick: () => paint(part, hex) }));
      }
      let pat = null;
      if ((part === 'hat' || part === 'shirt') && patterns.length) {
        const key = part + 'Pattern';
        pat = h('div', { class: 'patterns' },
          ...[['none', 'Plain'], ...patterns.map((p) => [p.pattern, p.name])].map(([v, nm]) => h('button', {
            class: 'tab' + ((s.paint[key] || 'none') === v ? ' on' : ''), onclick: () => paint(part, v, key),
          }, nm)));
      }
      return h('div', { class: 'paint-row' }, h('span', { class: 'lbl' }, label), h('div', {}, sw, pat));
    });
    const style = h('div', { class: 'paint-row' }, h('span', { class: 'lbl' }, 'Style'), h('div', { class: 'patterns' },
      ...Object.entries(STYLES).map(([id, label]) => h('button', { class: 'tab' + ((s.paint.style || 'beard') === id ? ' on' : ''), onclick: () => paint('style', id) }, label))));
    return h('div', {},
      style,
      ...rows,
      h('p', { class: 'small' }, 'More colors and patterns at Gnome Depot!', ' ', button('Go shopping', () => openShop(game, 'paint'), 'small')));
  };

  const slotTab = () => {
    const s = game.state;
    const items = allItems().filter((it) => it.slot === tab && s.owned.includes(it.id));
    if (!items.length) {
      return h('div', { class: 'empty' }, `No ${SLOTS[tab].label.toLowerCase()} yet!`, h('br'),
        button('Shop at Gnome Depot', () => openShop(game, tab), 'gold'));
    }
    const grid = h('div', { class: 'grid' });
    const wearing = s.equipped[tab];
    grid.append(h('button', { class: 'card' + (!wearing ? ' sel' : ''), onclick: () => { delete s.equipped[tab]; S.save(); game.applyOutfit(); sfx.remove(); render(); } },
      h('div', { class: 'none-ico' }, '🚫'), h('div', { class: 'nm' }, tab === 'head' ? 'Classic hat' : 'Nothing')));
    for (const it of items) {
      grid.append(h('button', {
        class: 'card' + (wearing === it.id ? ' sel' : ''),
        onclick: () => { s.equipped[tab] = it.id; S.save(); game.applyOutfit(); sfx.place(); gnome.act('spin'); game.line('newOutfit', 2.5); render(); },
      }, h('img', { src: thumbnail(getModel(it.id), it.id), alt: '' }), h('div', { class: 'nm' }, it.name)));
    }
    return grid;
  };

  const render = () => {
    const tabs = h('div', { class: 'tabs' }, ...['paint', ...WEAR_SLOTS].map((slot) => h('button', {
      class: 'tab' + (tab === slot ? ' on' : ''), onclick: () => { tab = slot; sfx.click(); render(); },
    }, `${SLOTS[slot].icon} ${SLOTS[slot].label}`)));
    setPanelBody(h('div', {}, tabs, tab === 'paint' ? paintTab() : slotTab()));
  };

  world.setView('side');
  openPanel('Wardrobe', h('div'), { onClose: () => world.setView('home') });
  render();
}
