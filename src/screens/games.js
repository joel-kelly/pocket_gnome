// "Type & Play": progress toward the next keys, the games, and practice.
import { h, button, openPanel, closePanel, modal } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGES, MAX_STAGE, GNOME_ROW_STAGE, KEY_ROWS, FINGERS, fingerOf, keysUpTo } from '../typing/keys.js';
import { stageProgress, checkUnlock, keyRecord, currentStage, SOLID } from '../typing/engine.js';
import { needKeyboardNote } from './home.js';

// The games. Each unlocks at a typing stage; ones without a screen are still to come.
export const GAMES = [
  { id: 'astro', emo: '🎈', name: 'Astrognome', stage: 1, what: 'Type to keep the balloons full. How high can you fly?', best: (s) => `Best: ${s.best.astro || 0} m` },
  { id: 'beet', emo: '🥕', name: 'Beet the Clock', stage: 6, what: 'Every word plants a veggie. How big a harvest can you grow in 60 seconds?', best: (s) => `Biggest harvest: ${s.best.beet || 0}` },
  { id: 'race', emo: '🏎️', name: 'Grand Gnome Prix', stage: 8, what: 'A one-minute speed test on the race track. How many words a minute can you type? Win trophies for the garden!', best: (s) => `Top speed: ${s.best.race || 0} WPM` },
  { id: 'moles', emo: '🐹', name: 'Mole Patrol', stage: 10, what: 'Moles pop up holding words. Type to boop them before they nibble the carrots!', best: (s) => `Most moles booped: ${s.best.moles || 0}` },
  { id: 'cafe', emo: '☕', name: 'Crumpet Café', stage: 13, what: 'Woodland critters line up for snacks. Type their orders before they get grumpy!', best: (s) => `Most critters served: ${s.best.cafe || 0}` },
  { emo: '✏️', name: 'Gnomework', stage: 15, what: 'Fix the typos in a letter to Grandgnome.' },
];

const keyName = (k) => (k === ';' ? ';' : k === 'Shift' ? 'Shift' : k.toUpperCase());
export const keyList = (keys) => keys.map(keyName).join(keys.length > 2 ? ', ' : ' and ');

// A small keyboard picture: unlocked keys colored by how solid they are.
export function miniKeyboard(state, { highlight = [] } = {}) {
  const unlocked = new Set(keysUpTo(currentStage(state)));
  const kb = h('div', { class: 'mini-kb' });
  for (const row of KEY_ROWS.slice(0, 3)) {
    const r = h('div', { class: 'mk-row' });
    for (const [id] of row) {
      if (id.startsWith('Shift')) continue;
      const rec = keyRecord(state, id);
      const open = unlocked.has(id);
      const lvl = !open ? 'locked' : rec.box >= 4 ? 'l4' : rec.box >= SOLID ? 'l3' : rec.seen ? 'l1' : 'l0';
      r.append(h('span', { class: `mk ${lvl}${highlight.includes(id) ? ' hl' : ''}`, title: open ? `${keyName(id)}: level ${rec.box} of 5` : 'Not unlocked yet' }, keyName(id)));
    }
    kb.append(r);
  }
  return kb;
}

export function openGames(game) {
  const s = game.state;
  const p = stageProgress(s);
  const stage = p.stage;
  game.world.setView('side');
  const needsLesson = (s.lastLessonStage || 0) < stage;
  const nowLearning = STAGES[stage - 1];

  const progress = h('div', { class: 'progress-card' },
    h('div', { class: 'pc-head' }, h('b', {}, `Stage ${stage} of ${MAX_STAGE}`), h('span', {}, `Learning: ${keyList(nowLearning.keys)}`)),
    miniKeyboard(s, { highlight: nowLearning.keys }),
    p.next
      ? h('div', {},
        h('div', { class: 'bar big' }, h('div', { class: 'fill', style: { width: Math.round(p.pct * 100) + '%' } })),
        h('p', { class: 'small' }, p.shaky.length
          ? `Get ${keyList(p.shaky)} solid to unlock ${keyList(STAGES[stage].keys)}! (${p.solid} of ${p.total} keys solid)`
          : p.ready ? `All set! Finish one more round to unlock ${keyList(STAGES[stage].keys)}!`
            : `${p.solid} of ${p.needed} keys solid. Keep going to unlock ${keyList(STAGES[stage].keys)}!`))
      : h('p', { class: 'small' }, stage >= MAX_STAGE ? 'You have every key! Now it\'s all about speed and accuracy.' : 'A grown-up picked this stage.'),
    needsLesson ? button(`✨ Meet your new keys: ${keyList(nowLearning.keys)}`, () => { closePanel(); game.go('lesson', { stage, mode: 'lesson' }); }, 'gold wide') : null);

  const card = (gm) => {
    const open = gm.id && stage >= gm.stage;
    if (!open) {
      return h('div', { class: 'game-card locked' }, h('span', { class: 'gemo' }, gm.emo),
        h('span', { class: 'gtxt' }, h('b', {}, gm.name), h('span', {}, gm.what),
          h('span', { class: 'best' }, !gm.id ? (stage >= gm.stage ? 'Coming soon!' : `🔒 Stage ${gm.stage} · coming soon`) : `🔒 Unlocks at stage ${gm.stage} (${STAGES[gm.stage - 1].name})`)));
    }
    return h('button', { class: 'game-card', onclick: () => { sfx.click(); closePanel(); game.go(gm.id); } },
      h('span', { class: 'gemo' }, gm.emo),
      h('span', { class: 'gtxt' }, h('b', {}, gm.name), h('span', {}, gm.what), h('span', { class: 'best' }, gm.best(s))));
  };
  const practice = h('button', { class: 'game-card', onclick: () => { sfx.click(); closePanel(); game.go('lesson', { stage, mode: 'practice' }); } },
    h('span', { class: 'gemo' }, '📜'),
    h('span', { class: 'gtxt' }, h('b', {}, 'Practice Scrolls'), h('span', {}, 'Five calm lines of practice. No rush, no balloons.')));
  const playable = GAMES.filter((gm) => gm.id && stage >= gm.stage);
  const later = GAMES.filter((gm) => !(gm.id && stage >= gm.stage));
  // The placement check sits on top until it's done (or skipped). Until then, practice starts at F and J.
  const check = s.placed ? null : h('button', { class: 'game-card check', onclick: () => { sfx.click(); closePanel(); game.go('placement'); } },
    h('span', { class: 'gemo' }, '🎯'),
    h('span', { class: 'gtxt' }, h('b', {}, 'Already know some keys?'), h('span', {}, 'Learned typing at school? Show me what your fingers know and skip ahead!')));
  const games = h('div', { class: 'game-list' }, check, ...playable.map(card), practice, ...later.map(card));

  openPanel('Type & Play', h('div', {}, needKeyboardNote(), progress, games), { onClose: () => game.world.setView('home') });
}

// After any typing round: check for newly unlocked keys and celebrate.
export function afterRound(game) {
  const s = game.state;
  const next = checkUnlock(s);
  game.S.save();
  if (!next) return false;
  const st = STAGES[next - 1];
  const gnomeRow = next - 1 === GNOME_ROW_STAGE;
  setTimeout(() => {
    sfx.unlock();
    game.gnome.act('cheer');
    const fingers = st.keys.filter((k) => k.length === 1).map((k) => h('span', { class: 'finger-chip', style: { background: FINGERS[fingerOf(k)].color } }, `${keyName(k)}: ${FINGERS[fingerOf(k)].name}`));
    const m = modal(h('div', { class: 'unlock' },
      gnomeRow ? h('div', { class: 'big-banner' }, '🏡 GNOME ROW COMPLETE! 🏡') : null,
      h('h2', {}, `New keys: ${keyList(st.keys)}!`),
      h('p', {}, st.tip),
      h('div', { class: 'chips' }, fingers),
      ...GAMES.filter((gm) => gm.id && gm.stage === next).map((gm) => h('div', { class: 'big-banner' }, `${gm.emo} New game: ${gm.name}!`)),
      miniKeyboard(s, { highlight: st.keys }),
      h('div', { class: 'row' },
        button('Later', () => m.close(), 'small'),
        button('Meet them!', () => { m.close(); game.go('lesson', { stage: next, mode: 'lesson' }); }, 'gold big'))));
    game.line(gnomeRow ? 'gnomeRow' : 'newKeys', 5);
  }, 900);
  return true;
}
