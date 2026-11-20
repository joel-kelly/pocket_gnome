// Lessons ("meet your new keys") and Practice Scrolls: calm typing in the
// garden, no timer. The gnome cheers you on.
import { h, button } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGES } from '../typing/keys.js';
import { TextPicker, lessonLines } from '../typing/engine.js';
import { TypePad } from '../typing/pad.js';
import { afterRound, keyList } from './games.js';

export class LessonScreen {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screen');
  }
  get state() { return this.game.state; }

  enter({ stage, mode = 'practice' } = {}) {
    const { world, gnome } = this.game;
    world.active = null;
    world.setView('type');
    if (gnome.object.parent !== world.scene) world.scene.add(gnome.object);
    gnome.object.position.set(0, 0, 0);
    gnome.object.rotation.set(0, 0, 0);
    this.stage = stage;
    this.mode = mode;
    const st = STAGES[stage - 1];
    this.lines = mode === 'lesson' ? lessonLines(this.state, stage) : (() => { const p = new TextPicker(this.state, { stage }); return [1, 2, 3, 4, 5].map(() => p.line(20)); })();
    this.lineNo = 0;
    this.wrongRow = 0;
    this.phase = 'play';
    this.pad = new TypePad({
      state: this.state, stage,
      onKey: (k) => this.onPadKey(k),
      onWord: (w) => { if (w.clean && Math.random() < 0.25) gnome.act('hop'); },
      onLine: () => this.nextLine(),
    });
    this.dots = h('div', { class: 'dots' }, ...this.lines.map(() => h('span', { class: 'dot' })));
    this.card = h('div', { class: 'type-card' },
      h('div', { class: 'tc-head' },
        h('div', { class: 'tc-title' }, mode === 'lesson' ? `✨ Meet ${keyList(st.keys)}` : '📜 Practice Scroll'),
        this.dots,
        button('Done for now', () => this.game.go('home'), 'small')),
      mode === 'lesson' ? h('p', { class: 'tc-tip' }, st.tip) : null,
      this.pad.el);
    this.root.replaceChildren(h('div', { class: 'type-screen' }, this.card));
    this.pad.setText(this.lines[0], this.lines[1] || '');
    this.markDots();
    this.game.say(mode === 'lesson' ? 'New keys! Slow and steady wins the race. Just ask any snail!' : "Nice and steady. We've got all the thyme in the world!", 4);
  }
  exit() { this.pad?.destroy(); this.root.innerHTML = ''; }

  markDots() {
    [...this.dots.children].forEach((d, i) => { d.className = 'dot' + (i < this.lineNo ? ' done' : i === this.lineNo ? ' cur' : ''); });
  }

  // Raw keyboard input (from main.js)
  onKey(e) {
    if (this.phase === 'done') {
      if (e.key === 'Enter') this.game.go('lesson', { stage: this.stage, mode: 'practice' });
      if (e.key === 'Escape') this.game.go('home');
      return;
    }
    if (e.key === 'Escape') { this.game.go('home'); return; }
    this.pad.key(e);
  }

  // A key result from the typing pad
  onPadKey({ ok }) {
    const { gnome } = this.game;
    if (ok) { sfx.key(this.pad.i); this.wrongRow = 0; return; }
    sfx.wrongKey();
    this.wrongRow++;
    if (this.wrongRow >= 3) { this.wrongRow = 0; gnome.act('oops'); this.game.line('typeWrong', 1.5); }
    else if (!gnome.busy) gnome.act('totter');
  }

  nextLine() {
    const { gnome, fx } = this.game;
    this.lineNo++;
    this.markDots();
    sfx.word(this.lineNo * 2);
    if (this.lineNo >= this.lines.length) return this.finish();
    gnome.act('hop');
    if (this.lineNo === Math.floor(this.lines.length / 2)) this.game.line('typeGreat', 2);
    fx.sparkles(gnome.headTop(), 4);
    this.pad.setText(this.lines[this.lineNo], this.lines[this.lineNo + 1] || '');
  }

  finish() {
    const { gnome, fx, S } = this.game;
    const s = this.state;
    this.phase = 'done';
    const acorns = 4 + this.lines.length;
    S.addAcorns(acorns);
    S.addStat('joy', 5);
    if (this.mode === 'lesson') s.lastLessonStage = Math.max(s.lastLessonStage || 0, this.stage);
    s.history.push({ t: Date.now(), game: this.mode, words: this.pad.stats.words, acc: this.pad.accuracy, wpm: this.pad.wpm, score: 0 });
    if (s.history.length > 200) s.history.shift();
    S.save();
    sfx.fanfare();
    gnome.act('spin');
    fx.confetti(gnome.headTop(), 30);
    this.game.line('typeGreat', 3);
    this.pad.pause();
    this.card.replaceChildren(h('div', { class: 'results' },
      h('h2', {}, this.mode === 'lesson' ? 'Lesson done!' : 'Scroll finished!'),
      h('div', { class: 'res-grid' },
        h('div', {}, 'Accuracy', h('b', {}, this.pad.accuracy + '%')),
        h('div', {}, 'Words per minute', h('b', {}, this.pad.wpm || '-')),
        h('div', { class: 'gold' }, 'Acorns', h('b', {}, `🌰 ${acorns}`))),
      h('div', { class: 'row' },
        button('Practice more (Enter)', () => this.game.go('lesson', { stage: this.stage, mode: 'practice' }), ''),
        button('Home (Esc)', () => this.game.go('home'), 'gold'))));
    afterRound(this.game);
  }
}
