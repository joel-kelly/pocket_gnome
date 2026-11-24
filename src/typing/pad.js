// The typing card used by every typing game: the line to type (on a little
// wooden garden sign), a peek at the next line, and an on-screen keyboard
// that shows which finger to use. Keyboard hints fade as keys get solid.
//
// Typing works like a real typing test: a wrong key shows what you actually
// typed (in red) and moves on. Backspace goes back so you can fix it
// (Ctrl/Alt+Backspace takes back a whole word). Fixing a mistake wins back
// half its accuracy, but the time it takes slows your speed.
import { h } from '../ui.js';
import { KEY_ROWS, ROW_OFFSET, FINGERS, fingerOf, keyForChar, shiftFor, keysUpTo } from './keys.js';
import { recordKey, hintDelay, currentStage } from './engine.js';

// Keys that should never do their browser thing while typing (scrolling, quick find).
const SWALLOW = new Set([' ', "'", '/', 'Backspace', 'Tab']);

export class TypePad {
  /**
   * opts.state: the save (keys get recorded there)
   * opts.stage: stage being practiced (for which keys look unlocked)
   * opts.onKey({ ok, ch, secs, timed }), opts.onWord({ word, secs, clean, right }), opts.onLine(), opts.onBack()
   *   onWord fires once per word, when you first type past its end. clean: no mistakes in it, ever. right: no mistakes left in it.
   * opts.mustFix: true if a line only counts once every letter is right (Mole Patrol, the café)
   * opts.record: false to not count keys toward levels (e.g. the placement check keeps its own score)
   * opts.hints: false for no finger hints; opts.keyboard: false to hide the on-screen keyboard (grown-up mode)
   * opts.skipWord: true to let you get back on track after slipping (grown-up mode): a space mid-word jumps
   *   to the next word (the letters skipped count as mistakes), a stray space at the start of a word is ignored,
   *   and typing on past the end of a line without its space carries on into the next line.
   */
  constructor(opts) {
    this.opts = opts;
    this.state = opts.state;
    this.stage = opts.stage ?? currentStage(this.state);
    this.el = h('div', { class: 'typepad' });
    this.sign = h('div', { class: 'tp-sign' });
    this.lineEl = h('div', { class: 'tp-line' });
    this.nextEl = h('div', { class: 'tp-next' });
    this.sign.append(this.lineEl, this.nextEl);
    this.hintEl = h('div', { class: 'tp-hint' }, ' ');
    this.capsEl = h('div', { class: 'tp-caps hidden' }, '⇪ Caps Lock is on! Press it to turn it off.');
    this.kb = this.buildKeyboard();
    this.el.append(this.sign, this.capsEl);
    if (opts.hints !== false) this.el.append(this.hintEl);
    if (opts.keyboard !== false) this.el.append(this.kb);
    this.text = '';
    this.nextText = '';
    this.i = 0;
    this.typed = [];
    this.stats = { right: 0, wrong: 0, start: 0, last: 0, words: 0, cleanWords: 0 };
    this.tot = { clean: 0, fixed: 0, bad: 0 }; // positions from lines already left behind
    this.paused = false;
  }

  buildKeyboard() {
    const unlocked = new Set(keysUpTo(this.stage));
    const shiftOn = unlocked.has('Shift');
    const kb = h('div', { class: 'kb' });
    this.keyEls = {};
    KEY_ROWS.forEach((row, ri) => {
      const r = h('div', { class: 'kb-row', style: { marginLeft: `calc(${ROW_OFFSET[ri]} * (var(--key) + 5px))` } });
      for (const [id, label, w] of row) {
        const fid = fingerOf(id);
        const isShift = id.startsWith('Shift');
        const open = id === ' ' || id === 'Backspace' || unlocked.has(id) || (isShift && shiftOn);
        const k = h('div', {
          class: 'kb-key' + (open ? '' : ' locked') + (id === 'f' || id === 'j' ? ' bump' : '') + (isShift ? ' shift' : ''),
          style: { width: `calc(${w || 1} * var(--key) + ${((w || 1) - 1) * 5}px)`, '--fc': fid ? FINGERS[fid].color : '#ddd' },
        }, label ?? (id === ';' ? ';' : id.toUpperCase()));
        this.keyEls[id] = k;
        r.append(k);
      }
      kb.append(r);
    });
    return kb;
  }

  // Show a new line (and optionally a peek at the next one).
  setText(text, next = '') {
    const t = this.lineTally();
    for (const k in t) this.tot[k] += t[k];
    this.text = text;
    this.i = 0;
    this.typed = [];        // what was typed at each position
    this.missed = [];       // positions that ever had a wrong key
    this.recR = []; this.recW = []; // positions already counted toward key levels
    this.untimed = false;   // the last thing pressed was a wrong key or Backspace
    this.complete = false;
    this.wordsDone = 0;
    this.lineStart = performance.now();
    this.wordStart = this.lineStart;
    this.lineEl.replaceChildren(...[...text].map((c) => h('span', { class: 'ch' + (c === ' ' ? ' sp' : '') }, c === ' ' ? '·' : c)));
    this.nextText = next;
    this.nextEl.textContent = next;
    this.mark();
  }
  setNext(next) { this.nextText = next; this.nextEl.textContent = next; }
  get done() { return this.i >= this.text.length; }
  get expected() { return this.text[this.i]; }

  mark() {
    const spans = this.lineEl.children;
    for (let j = 0; j < spans.length; j++) {
      const want = this.text[j], got = j < this.i ? this.typed[j] : want;
      const bad = got !== want;
      spans[j].className = 'ch' + (want === ' ' && !bad ? ' sp' : '') + (j < this.i ? (bad ? ' bad' : ' done') : j === this.i ? ' cur' : '');
      const show = got == null ? (want === ' ' ? '_' : want) : got === ' ' ? (bad ? '_' : '·') : got;
      if (spans[j].textContent !== show) spans[j].textContent = show;
    }
    this.clearHint();
    if (this.opts.hints === false) return;
    if ((this.i > 0 && this.typed[this.i - 1] !== this.text[this.i - 1]) || (this.done && !this.complete)) { this.showFix(); return; }
    if (this.done) return;
    const ch = this.expected;
    const delay = hintDelay(this.state, keyForChar(ch));
    if (delay === 0) this.showHint();
    else if (Number.isFinite(delay)) this.hintTimer = setTimeout(() => this.showHint(), delay * 1000);
  }

  showHint() {
    if (this.done || this.opts.hints === false) return;
    const ch = this.expected;
    const key = keyForChar(ch);
    const els = [this.keyEls[key]];
    const cap = /[A-Z]/.test(ch);
    if (cap) els.push(this.keyEls[shiftFor(ch)]);
    for (const el of els) el?.classList.add('glow');
    const finger = FINGERS[fingerOf(key)]?.name;
    const what = ch === ' ' ? 'the space bar' : `<b>${cap ? ch : key === ';' ? ';' : key.toUpperCase()}</b>`;
    this.hintEl.innerHTML = cap
      ? `Hold <b>Shift</b> with your ${FINGERS[fingerOf(shiftFor(ch))].name}, then press ${what} with your ${finger}`
      : `Press ${what} with your <b>${finger}</b>`;
    this.hintEl.classList.add('on');
  }
  // After a mistake: point at Backspace.
  showFix() {
    this.keyEls.Backspace?.classList.add('glow');
    this.hintEl.innerHTML = this.done
      ? 'Fix the red letters: press <b>Backspace</b> with your right pinky'
      : this.opts.mustFix ? 'Oops! Press <b>Backspace</b> to fix it' : 'Oops! Press <b>Backspace</b> to fix it, or keep going';
    this.hintEl.classList.add('on');
  }
  clearHint() {
    clearTimeout(this.hintTimer);
    for (const el of Object.values(this.keyEls)) el.classList.remove('glow');
    this.hintEl.classList.remove('on');
  }

  // Handle a keydown. Returns true if it was a typing key.
  key(e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (!this.paused && !e.metaKey) this.backspace(e.ctrlKey || e.altKey);
      return true;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (SWALLOW.has(e.key)) e.preventDefault();
    this.capsEl.classList.toggle('hidden', !e.getModifierState?.('CapsLock'));
    if (this.paused || this.complete || e.key.length !== 1) return false;
    e.preventDefault();
    if (this.done) { this.oops(this.i - 1); return true; } // at the end with red letters left (mustFix): fix them first
    const now = performance.now();
    if (this.opts.skipWord && !this.resync(e, now)) return true;
    const j = this.i;
    const ch = this.text[j];
    const ok = e.key === ch;
    const k = keyForChar(ch);
    const secs = (now - (this.stats.last || this.lineStart)) / 1000;
    if (!this.stats.start) this.stats.start = now;
    this.press(this.keyEls[e.key.toLowerCase()]);
    const rec = this.opts.record !== false;
    this.typed[j] = e.key;
    this.stats.last = now;
    this.i++;
    if (ok) {
      // A press counts for speed unless it's the first of the line, or came after a mistake, a Backspace or a long pause.
      const timed = j > 0 && !this.missed[j] && !this.untimed && secs < 4;
      if (rec && !this.recR[j]) {
        this.recR[j] = true;
        recordKey(this.state, k, true, secs, timed);
        if (/[A-Z]/.test(ch)) recordKey(this.state, 'Shift', true, secs, timed);
      }
      this.stats.right++;
      this.untimed = false;
      this.opts.onKey?.({ ok: true, ch, secs, timed });
    } else {
      if (rec && !this.recW[j]) {
        this.recW[j] = true;
        recordKey(this.state, k, false);
        if (/[A-Z]/.test(ch) && e.key === ch.toLowerCase()) recordKey(this.state, 'Shift', false);
      }
      this.missed[j] = true;
      this.stats.wrong++;
      this.untimed = true;
      this.opts.onKey?.({ ok: false, ch, typed: e.key, secs });
    }
    if (ch === ' ' || this.done) this.finishWord(now);
    this.mark();
    if (!ok) this.oops(j);
    this.checkLine();
    return true;
  }

  // skipWord mode: get back onto the right letter after a slip. Returns false if the key is used up.
  resync(e, now) {
    const j = this.i, ch = this.text[j];
    if (e.key === ' ' && ch !== ' ') {
      if (j === 0 || this.text[j - 1] === ' ') return false; // stray space at the start of a word (e.g. after an extra letter): ignore it
      const sp = this.text.indexOf(' ', j);
      this.skipTo(sp < 0 ? this.text.length : sp, now);   // space mid-word: skip the rest of the word
      if (this.done) { this.finishWord(now); this.mark(); this.checkLine(); return false; }
      return true; // now the space lines up with the text's space
    }
    if (ch === ' ' && j === this.text.length - 1 && e.key === this.nextText[0]) {
      // typed on past the end of the line without its space: count the space as missed and carry on into the next line
      this.skipTo(this.text.length, now);
      this.finishWord(now);
      this.mark();
      this.checkLine();
      return !this.done && this.i === 0;
    }
    return true;
  }
  // Jump the cursor forward to `to`, counting every letter jumped over as a mistake.
  skipTo(to, now) {
    const from = this.i;
    if (to <= from) return;
    const rec = this.opts.record !== false;
    for (let j = from; j < to; j++) {
      if (rec && !this.recW[j]) { this.recW[j] = true; recordKey(this.state, keyForChar(this.text[j]), false); }
      this.typed[j] = null; // nothing typed here (shown as the letter you missed, in red)
      this.missed[j] = true;
      this.stats.wrong++;
    }
    this.i = to;
    this.stats.last = now;
    if (!this.stats.start) this.stats.start = now;
    this.untimed = true;
    this.opts.onKey?.({ ok: false, ch: this.text[from], typed: null, secs: 0 });
    for (let j = from; j < to; j++) this.oops(j);
  }

  // Go back one letter, or (word = true) back to the start of the word.
  backspace(word) {
    if (this.complete || this.i === 0) return;
    let to = this.i - 1;
    if (word) {
      to = this.i;
      while (to > 0 && this.text[to - 1] === ' ') to--;
      while (to > 0 && this.text[to - 1] !== ' ') to--;
    }
    while (this.i > to) this.typed[--this.i] = undefined;
    this.untimed = true;
    this.press(this.keyEls.Backspace);
    this.opts.onBack?.();
    this.mark();
  }

  press(el) { if (el) { el.classList.remove('press'); void el.offsetWidth; el.classList.add('press'); } }
  oops(j) {
    const el = this.lineEl.children[j];
    if (el) { el.classList.remove('oops'); void el.offsetWidth; el.classList.add('oops'); }
  }

  // The line is done when you reach the end (and, with mustFix, when nothing is red).
  checkLine() {
    if (!this.done || this.complete || !this.text.length) return;
    if (this.opts.mustFix && this.typed.some((c, j) => c !== this.text[j])) return;
    this.complete = true;
    this.clearHint();
    this.opts.onLine?.();
  }

  finishWord(now) {
    // The word just finished: from the last space (or line start) to here. Each word only counts once,
    // so backing up over it and typing it again doesn't count it twice.
    const end = this.i;
    const idx = (this.text.slice(0, end - 1).match(/ /g) || []).length;
    if (idx < this.wordsDone) return;
    this.wordsDone = idx + 1;
    const from = this.text.lastIndexOf(' ', end - 2) + 1;
    const word = this.text.slice(from, end).trim();
    if (word) {
      let clean = true, right = true;
      for (let j = from; j < end; j++) { if (this.missed[j]) clean = false; if (this.typed[j] !== this.text[j]) right = false; }
      this.stats.words++;
      if (clean) this.stats.cleanWords++;
      this.opts.onWord?.({ word, secs: (now - this.wordStart) / 1000, clean, right });
    }
    this.wordStart = now;
  }

  // How the letters typed so far on this line stand: right first time, fixed, or still wrong.
  lineTally() {
    const t = { clean: 0, fixed: 0, bad: 0 };
    for (let j = 0; j < this.i; j++) {
      if (this.typed[j] !== this.text[j]) t.bad++;
      else if (this.missed[j]) t.fixed++;
      else t.clean++;
    }
    return t;
  }
  // Letters that are right right now (all lines). This is what speed counts.
  get net() {
    const t = this.lineTally();
    return this.tot.clean + this.tot.fixed + t.clean + t.fixed;
  }
  // How many letters at the start of the line are right (for word signs in the games).
  get progress() {
    let j = 0;
    while (j < this.i && this.typed[j] === this.text[j]) j++;
    return j;
  }

  // Words per minute (5 characters = 1 word), counting only letters that are right.
  get wpm() {
    const mins = (this.stats.last - this.stats.start) / 60000;
    return mins > 0.05 ? Math.round(this.net / 5 / mins) : 0;
  }
  // Accuracy: letters right first time count fully, mistakes you fixed count half, mistakes left in count zero.
  get accuracy() {
    const t = this.lineTally();
    const clean = this.tot.clean + t.clean, fixed = this.tot.fixed + t.fixed, bad = this.tot.bad + t.bad;
    const all = clean + fixed + bad;
    return all ? Math.round(((clean + fixed / 2) / all) * 100) : 100;
  }

  pause(on = true) { this.paused = on; if (on) this.clearHint(); else this.mark(); }
  destroy() { this.clearHint(); this.el.remove(); }
}
