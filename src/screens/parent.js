// Grown-ups corner: keyboard heatmap, progress, settings, history, save backup.
import { h, button, modal, toast } from '../ui.js';
import { STAGES, MAX_STAGE, KEY_ROWS, ROW_OFFSET, GNOME_ROW_STAGE } from '../typing/keys.js';
import { stageProgress, keyRecord, currentStage, SOLID, target } from '../typing/engine.js';
import { keysUpTo } from '../typing/keys.js';
import { keyList } from './games.js';

function heatColor(r, fast) {
  if (!r.seen) return '#e9e4d8';
  if (r.box >= 4 && (r.avg ?? 9) <= fast) return '#3aa83a';
  if (r.box >= SOLID) return '#8fdc3a';
  if (r.box >= 2) return '#ffe14d';
  if (r.box >= 1) return '#ffab4a';
  return '#ff7b6b';
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Put the kid on a stage. Earlier keys become solid; the stage's own keys
// drop just below solid so they get practiced before the next keys unlock.
function setStage(s, n) {
  for (let st = 1; st < n; st++) for (const k of STAGES[st - 1].keys) {
    const r = keyRecord(s, k);
    r.box = Math.max(r.box, SOLID);
    r.seen = Math.max(r.seen, 1);
  }
  for (const k of STAGES[n - 1].keys) { const r = keyRecord(s, k); r.box = Math.min(r.box, SOLID - 1); }
  if (n !== s.stage) s.lastLessonStage = n - 1;
  s.stage = n;
  if (s.settings.maxStage && s.settings.maxStage !== 'auto') s.settings.maxStage = n;
  s.placed = true;
}

export function openParent(game) {
  const { S } = game;
  const s = game.state;
  const fast = target(s);
  const p = stageProgress(s);
  const unlocked = new Set(keysUpTo(currentStage(s)));
  const reopen = () => { m.close(); openParent(game); };
  const saved = () => { S.save(); toast('Saved!'); };

  // Keyboard heatmap: each key colored by its level; number = average seconds per press.
  const heat = h('div', { class: 'heat-kb' });
  KEY_ROWS.forEach((row, ri) => {
    const r = h('div', { class: 'kb-row', style: { marginLeft: ROW_OFFSET[ri] * 2.6 + 'em' } });
    for (const [id, label, w] of row) {
      const key = id.startsWith('Shift') ? 'Shift' : id;
      const rec = keyRecord(s, key);
      const open = unlocked.has(key) || id === ' ';
      const tip = open ? `${label || id.toUpperCase() || 'Space'}: ${rec.right} right, ${rec.wrong} slips, level ${rec.box}/5${rec.avg ? `, avg ${rec.avg.toFixed(2)}s` : ''}` : 'Not unlocked yet';
      r.append(h('div', { class: 'hk' + (open ? '' : ' locked') + (key === 'Shift' ? ' shift' : ''), title: tip, style: { width: (w || 1) * 2.4 + 'em', background: open && id !== ' ' ? heatColor(rec, fast) : '' } },
        h('b', {}, id === ' ' ? 'space' : label || id.toUpperCase()), open && rec.avg ? h('small', {}, rec.avg.toFixed(1)) : null));
    }
    heat.append(r);
  });

  // Stage: jump straight to any set of keys. Keys before it count as learned.
  const pinned = s.settings.maxStage && s.settings.maxStage !== 'auto';
  const cur = currentStage(s);
  const stageSel = h('select', { id: 'set-stage' },
    ...STAGES.map((st, i) => h('option', { value: i + 1, selected: cur === i + 1 },
      `Stage ${i + 1}: ${st.name}${i === 0 ? ' (the very beginning)' : i + 1 === GNOME_ROW_STAGE ? ' (finishes Gnome Row)' : ''}`)));
  stageSel.onchange = () => { setStage(s, Number(stageSel.value)); saved(); reopen(); };
  const growSel = h('select', { id: 'set-grow' },
    h('option', { value: 'auto', selected: !pinned }, 'Move on to new keys automatically once these are solid'),
    h('option', { value: 'stay', selected: pinned }, 'Stay on this stage until I change it'));
  growSel.onchange = () => { s.settings.maxStage = growSel.value === 'auto' ? 'auto' : currentStage(s); if (growSel.value === 'auto') s.stage = cur; saved(); reopen(); };
  const speedSel = h('select', { id: 'set-speed' }, ...[[1.4, 'Gentle (1.4 s)'], [1.0, 'Normal (1.0 s, default)'], [0.75, 'Brisk (0.75 s)'], [0.5, 'Speedy (0.5 s)']]
    .map(([v, l]) => h('option', { value: v, selected: v === fast }, l)));
  speedSel.onchange = () => { s.settings.keySeconds = Number(speedSel.value); saved(); };
  const hintSel = h('select', { id: 'set-hints' }, ...[['auto', 'Auto: fade as keys get solid'], ['always', 'Always show the next key'], ['mistakes', 'Only after a mistake']]
    .map(([v, l]) => h('option', { value: v, selected: (s.settings.hints || 'auto') === v }, l)));
  hintSel.onchange = () => { s.settings.hints = hintSel.value; saved(); };
  const paceSel = h('select', { id: 'set-pace' }, ...[
    ['auto', `Auto: starts normal, slows down after rough rounds (now Astrognome ${Math.round((s.autoPace?.astro ?? 1) * 100)}%, Mole Patrol ${Math.round((s.autoPace?.moles ?? 1) * 100)}%, Crumpet Café ${Math.round((s.autoPace?.cafe ?? 1) * 100)}%)`],
    ['relaxed', 'Relaxed (70%)'], ['moderate', 'Normal'], ['aggressive', 'Challenge (125%)']]
    .map(([v, l]) => h('option', { value: v, selected: (s.settings.pace || 'auto') === v }, l)));
  paceSel.onchange = () => { s.settings.pace = paceSel.value; saved(); };

  const hist = h('table', { class: 'hist' }, h('tr', {}, ...['When', 'Game', 'Words', 'Accuracy', 'WPM', 'Score'].map((t) => h('th', {}, t))));
  for (const r of s.history.slice(-10).reverse()) {
    hist.append(h('tr', {},
      h('td', {}, new Date(r.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })),
      h('td', {}, { astro: '🎈 Astrognome', beet: '🥕 Beet the Clock', moles: '🐹 Mole Patrol', cafe: '☕ Crumpet Café', race: '🏎️ Grand Gnome Prix', lesson: '✨ Lesson', practice: '📜 Practice' }[r.game] || r.game),
      h('td', {}, r.words), h('td', {}, r.acc + '%'), h('td', {}, r.wpm || '-'), h('td', {}, !r.score ? '' : r.game === 'astro' ? r.score + ' m' : r.game === 'beet' ? r.score + ' veggies' : r.game === 'moles' ? r.score + ' moles' : r.game === 'cafe' ? r.score + ' critters' : r.game === 'race' ? r.score + ' WPM' : r.score)));
  }

  const kidIn = h('input', { id: 'set-kid', type: 'text', maxlength: 16, value: s.kidName });
  const gnomeIn = h('input', { id: 'set-gnome', type: 'text', maxlength: 16, value: s.gnomeName });
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  fileIn.onchange = async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try { S.importSave(await f.text()); location.reload(); } catch (e) { toast('That file did not work: ' + e.message); }
  };

  const m = modal(h('div', { class: 'parent' },
    h('h2', {}, 'Grown-ups Corner'),
    h('p', {}, `Each key has a level from 0 to 5. A right key pressed in under ${fast} s moves it up; a slip moves it down one. Small numbers are the average seconds per press. Keys at level 3+ count as solid.`),
    heat,
    h('div', { class: 'legend' }, ...[['#3aa83a', 'Mastered'], ['#8fdc3a', 'Solid'], ['#ffe14d', 'Getting there'], ['#ffab4a', 'Just started'], ['#ff7b6b', 'Needs practice'], ['#e9e4d8', 'Not tried yet']]
      .map(([c, l]) => h('span', {}, h('i', { style: { background: c } }), l))),
    h('p', { class: 'strong' }, p.next
      ? `Stage ${p.stage} of ${MAX_STAGE} (${STAGES[p.stage - 1].name}). ${keyList(STAGES[p.stage].keys)} unlock when ${p.needed} of ${p.total} keys are solid (${p.solid} so far) and every newest key is solid${p.shaky.length ? ` (still shaky: ${keyList(p.shaky)})` : ''}.`
      : `Stage ${p.stage} of ${MAX_STAGE}.`),
    h('label', {}, 'Recent rounds'),
    s.history.length ? hist : h('p', {}, 'No rounds played yet.'),
    h('label', { for: 'set-stage' }, 'Which keys to practice'), stageSel,
    h('p', { class: 'small' }, 'Keys from earlier stages count as learned. Picking an earlier stage keeps all key records, but your kid will need to get that stage\'s keys solid again to move on.'),
    h('label', { for: 'set-grow' }, 'When those keys are solid'), growSel,
    h('label', { for: 'set-speed' }, '"Fast" target time per key (faster presses level a key up)'), speedSel,
    h('label', { for: 'set-hints' }, 'On-screen keyboard hints'), hintSel,
    h('label', { for: 'set-pace' }, 'Game pace (Astrognome balloons, Mole Patrol moles, Crumpet Café critters)'), paceSel,
    h('label', {}, 'Placement check'),
    h('div', { class: 'row left' }, button('Run the placement check again', () => { m.close(); game.go('placement'); }, 'small')),
    h('label', { for: 'set-kid' }, 'Names'),
    h('div', { class: 'row left' }, kidIn, gnomeIn, button('Save names', () => { s.kidName = kidIn.value.trim() || s.kidName; s.gnomeName = gnomeIn.value.trim() || s.gnomeName; S.save(); toast('Saved!'); game.go('home'); }, 'small')),
    h('label', {}, 'Save file (progress lives in this browser)'),
    h('div', { class: 'row left' },
      button('Download backup', () => download(`pocket-gnome-save-${new Date().toISOString().slice(0, 10)}.json`, S.exportSave()), 'small blue'),
      button('Load backup', () => fileIn.click(), 'small'), fileIn),
    h('label', {}, 'Testing helpers'),
    h('div', { class: 'row left' },
      button('+100 acorns', () => { S.addAcorns(100); toast('+100 acorns'); }, 'small gold'),
      button('Fill all stats', () => { Object.keys(s.stats).forEach((k) => (s.stats[k] = 100)); S.save(); game.applyMood(); toast('Stats full'); }, 'small green'),
      button('Make gnome needy', () => { s.stats = { hunger: 15, thirst: 20, tidy: 10, joy: 20 }; S.save(); game.applyMood(); toast('Uh oh'); }, 'small'),
      button('Start over (erase!)', () => {
        if (confirm('Erase EVERYTHING and start over? (Download a backup first if unsure.)')) { S.resetSave(); location.reload(); }
      }, 'small red')),
  ));
}
