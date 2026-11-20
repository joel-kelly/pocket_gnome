// The typing card used by every typing game: the line to type (on a little
// wooden garden sign), a peek at the next line, and an on-screen keyboard
// that shows which finger to use. Keyboard hints fade as keys get solid.
import { h } from '../ui.js';
import { KEY_ROWS, ROW_OFFSET, FINGERS, fingerOf, keyForChar, shiftFor, keysUpTo } from './keys.js';
import { recordKey, hintDelay, currentStage } from './engine.js';

// Keys that should never do their browser thing while typing (scrolling, quick find).
const SWALLOW = new Set([' ', "'", '/', 'Backspace', 'Tab']);

export class TypePad {
  /**
   * opts.state: the save (keys get recorded there)
   * opts.stage: stage being practiced (for which keys look unlocked)
   * opts.onKey({ ok, ch, secs, timed }), opts.onWord({ word, secs, clean }), opts.onLine()
   * opts.record: false to not count keys toward levels (e.g. the placement check keeps its own score)
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
    this.el.append(this.sign, this.capsEl, this.hintEl, this.kb);
    this.text = '';
    this.i = 0;
    this.stats = { right: 0, wrong: 0, chars: 0, start: 0, last: 0, words: 0, cleanWords: 0 };
    this.paused = false;
  }

  buildKeyboard() {
    const unlocked = new Set(keysUpTo(this.stage));
    const shiftOn = unlocked.has('Shift');
    const kb = h('div', { class: 'kb' });
    this.keyEls = {};
    KEY_ROWS.forEach((row, ri) => {
      const r = h('div', { class: 'kb-row', style: { marginLeft: ROW_OFFSET[ri] * 2.6 + 'em' } });
      for (const [id, label, w] of row) {
        const fid = fingerOf(id);
        const isShift = id.startsWith('Shift');
        const open = id === ' ' || unlocked.has(id) || (isShift && shiftOn);
        const k = h('div', {
          class: 'kb-key' + (open ? '' : ' locked') + (id === 'f' || id === 'j' ? ' bump' : ''),
          style: { width: (w || 1) * 2.4 + 'em', '--fc': fid ? FINGERS[fid].color : '#ddd' },
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
    this.text = text;
    this.i = 0;
    this.mistakeHere = false;
    this.lineStart = performance.now();
    this.wordStart = this.lineStart;
    this.wordClean = true;
    this.lineEl.replaceChildren(...[...text].map((c) => h('span', { class: 'ch' + (c === ' ' ? ' sp' : '') }, c === ' ' ? '·' : c)));
    this.nextEl.textContent = next;
    this.mark();
  }
  setNext(next) { this.nextEl.textContent = next; }
  get done() { return this.i >= this.text.length; }
  get expected() { return this.text[this.i]; }

  mark() {
    const spans = this.lineEl.children;
    for (let j = 0; j < spans.length; j++) spans[j].className = 'ch' + (this.text[j] === ' ' ? ' sp' : '') + (j < this.i ? ' done' : j === this.i ? ' cur' : '');
    this.clearHint();
    if (this.done) return;
    const ch = this.expected;
    const delay = hintDelay(this.state, keyForChar(ch));
    if (delay === 0) this.showHint();
    else if (Number.isFinite(delay)) this.hintTimer = setTimeout(() => this.showHint(), delay * 1000);
  }

  showHint() {
    if (this.done) return;
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
  clearHint() {
    clearTimeout(this.hintTimer);
    for (const el of Object.values(this.keyEls)) el.classList.remove('glow');
    this.hintEl.classList.remove('on');
  }

  // Handle a keydown. Returns true if it was a typing key.
  key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (SWALLOW.has(e.key)) e.preventDefault();
    this.capsEl.classList.toggle('hidden', !e.getModifierState?.('CapsLock'));
    if (this.paused || this.done || e.key.length !== 1) return false;
    e.preventDefault();
    const now = performance.now();
    const ch = this.expected;
    const ok = e.key === ch;
    const k = keyForChar(ch);
    const secs = (now - (this.stats.last || this.lineStart)) / 1000;
    if (!this.stats.start) this.stats.start = now;
    const press = this.keyEls[e.key.toLowerCase()];
    if (press) { press.classList.remove('press'); void press.offsetWidth; press.classList.add('press'); }
    if (ok) {
      // A press counts for speed unless it's the first of the line, came after a mistake, or after a long pause.
      const timed = this.i > 0 && !this.mistakeHere && secs < 4;
      if (this.opts.record !== false) {
        recordKey(this.state, k, true, secs, timed);
        if (/[A-Z]/.test(ch)) recordKey(this.state, 'Shift', true, secs, timed);
      }
      this.stats.right++;
      this.stats.chars++;
      this.stats.last = now;
      this.mistakeHere = false;
      this.i++;
      this.opts.onKey?.({ ok: true, ch, secs, timed });
      if (ch === ' ' || this.done) this.finishWord(now);
      this.mark();
      if (this.done) this.opts.onLine?.();
    } else {
      if (!this.mistakeHere && this.opts.record !== false) {
        recordKey(this.state, k, false);
        if (/[A-Z]/.test(ch) && e.key === ch.toLowerCase()) recordKey(this.state, 'Shift', false);
      }
      if (!this.mistakeHere) this.stats.wrong++;
      this.mistakeHere = true;
      this.wordClean = false;
      const cur = this.lineEl.children[this.i];
      if (cur) { cur.classList.remove('oops'); void cur.offsetWidth; cur.classList.add('oops'); }
      this.showHint();
      this.opts.onKey?.({ ok: false, ch, typed: e.key, secs });
    }
    return true;
  }

  finishWord(now) {
    // The word just finished: from the last space (or line start) to here.
    const before = this.text.slice(0, this.i).trimEnd();
    const word = before.slice(before.lastIndexOf(' ') + 1);
    if (word) {
      this.stats.words++;
      if (this.wordClean) this.stats.cleanWords++;
      this.opts.onWord?.({ word, secs: (now - this.wordStart) / 1000, clean: this.wordClean });
    }
    this.wordStart = now;
    this.wordClean = true;
  }

  // Words per minute (5 characters = 1 word) and accuracy so far.
  get wpm() {
    const mins = (this.stats.last - this.stats.start) / 60000;
    return mins > 0.05 ? Math.round(this.stats.chars / 5 / mins) : 0;
  }
  get accuracy() {
    const t = this.stats.right + this.stats.wrong;
    return t ? Math.round((this.stats.right / t) * 100) : 100;
  }

  pause(on = true) { this.paused = on; if (on) this.clearHint(); else this.mark(); }
  destroy() { this.clearHint(); this.el.remove(); }
}
