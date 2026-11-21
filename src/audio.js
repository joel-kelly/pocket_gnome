// All sounds are made in code with the Web Audio API. No sound files needed.
// The gnome is ceramic, so lots of clinks and clonks.
let ctx = null, master = null, enabled = true, noiseBuf = null, unlocked = false;

function ac() {
  if (!unlocked) return null;
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSoundEnabled(on) { enabled = on; }
export function soundEnabled() { return enabled; }
export function unlockAudio() { unlocked = true; if (enabled) ac(); }

function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.2, delay = 0, attack = 0.005 }) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack, vol, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise({ dur = 0.2, vol = 0.2, delay = 0, filter = 'lowpass', f0 = 800, f1 = f0, q = 1, attack = 0.01 }) {
  const c = enabled && ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  env(g, t, attack, vol, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const sfx = {
  // ceramic
  tap() { tone({ f0: 1900, dur: 0.12, vol: 0.06 }); tone({ f0: 2850, dur: 0.08, vol: 0.03 }); },
  clink() { tone({ f0: 2600, dur: 0.35, vol: 0.1 }); tone({ f0: 3920, dur: 0.22, vol: 0.05 }); tone({ type: 'triangle', f0: 1300, dur: 0.1, vol: 0.04 }); },
  clonk() { tone({ type: 'triangle', f0: 520, f1: 300, dur: 0.18, vol: 0.22 }); tone({ f0: 1750, dur: 0.3, vol: 0.09 }); tone({ f0: 2630, dur: 0.2, vol: 0.05, delay: 0.02 }); },
  bonk() { tone({ type: 'triangle', f0: 420, f1: 140, dur: 0.12, vol: 0.3 }); noise({ dur: 0.05, vol: 0.25, filter: 'bandpass', f0: 1800, q: 1 }); },
  rattle() { for (let i = 0; i < 9; i++) tone({ f0: 2200 + Math.random() * 900, dur: 0.05, vol: 0.04, delay: i * 0.075 }); },
  chime() { tone({ f0: 1568, dur: 0.25, vol: 0.06 }); tone({ f0: 2093, dur: 0.35, vol: 0.06, delay: 0.08 }); },
  // body noises (the polite kind)
  achoo() { noise({ dur: 0.35, vol: 0.45, filter: 'bandpass', f0: 2600, f1: 1500, q: 0.8 }); tone({ type: 'triangle', f0: 330, f1: 200, dur: 0.25, vol: 0.12 }); },
  hic() { tone({ type: 'triangle', f0: 500, f1: 900, dur: 0.07, vol: 0.18 }); noise({ dur: 0.05, vol: 0.08, filter: 'bandpass', f0: 1800, q: 2 }); },
  chomp() { for (let i = 0; i < 4; i++) noise({ dur: 0.06, vol: 0.2, delay: i * 0.16, filter: 'bandpass', f0: 1500, f1: 600, q: 2 }); },
  gulp() { tone({ f0: 300, f1: 120, dur: 0.15, vol: 0.28 }); tone({ f0: 280, f1: 110, dur: 0.15, vol: 0.28, delay: 0.25 }); },
  swish() { noise({ dur: 0.28, vol: 0.18, filter: 'bandpass', f0: 900, f1: 3200, q: 1.5, attack: 0.05 }); },
  squeak() { tone({ type: 'triangle', f0: 1400, f1: 2100, dur: 0.09, vol: 0.06 }); tone({ type: 'triangle', f0: 2100, f1: 1500, dur: 0.09, vol: 0.06, delay: 0.1 }); },
  snore() { noise({ dur: 0.9, vol: 0.08, f0: 300, f1: 500, attack: 0.4 }); },
  // typing
  key(n = 0) { tone({ type: 'triangle', f0: 880 + (n % 5) * 60, dur: 0.035, vol: 0.05 }); noise({ dur: 0.02, vol: 0.03, filter: 'highpass', f0: 3000 }); },
  wrongKey() { tone({ type: 'triangle', f0: 180, f1: 140, dur: 0.12, vol: 0.14 }); },
  word(combo = 0) {
    const step = Math.min(combo, 12);
    const base = 660 * Math.pow(2, step / 12);
    tone({ type: 'triangle', f0: base, dur: 0.1, vol: 0.07 });
    tone({ type: 'triangle', f0: base * 1.5, dur: 0.16, vol: 0.06, delay: 0.06 });
  },
  combo(n) { [0, 4, 7, 12].forEach((s, i) => tone({ type: 'triangle', f0: 523 * Math.pow(2, (s + Math.min(n, 20) / 2) / 12), dur: 0.1, vol: 0.08, delay: i * 0.06 })); },
  // money and fanfare
  acorn() { tone({ type: 'triangle', f0: 880, dur: 0.06, vol: 0.1 }); tone({ type: 'triangle', f0: 1175, dur: 0.12, vol: 0.1, delay: 0.06 }); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.15, delay: i * 0.07 })); },
  fanfare() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.12, delay: [0, 0.12, 0.24, 0.36, 0.6, 0.72, 0.84, 1.0][i] })); },
  unlock() {
    [0, 4, 7, 11, 14, 19].forEach((s, i) => tone({ f0: 659 * Math.pow(2, s / 12), dur: 0.5, vol: 0.06, delay: i * 0.09 }));
    tone({ f0: 2637, dur: 0.8, vol: 0.03, delay: 0.55 });
  },
  click() { tone({ type: 'triangle', f0: 700, dur: 0.03, vol: 0.05 }); },
  place() { tone({ type: 'triangle', f0: 400, f1: 600, dur: 0.06, vol: 0.13 }); sfx.tap(); },
  remove() { tone({ type: 'triangle', f0: 500, f1: 250, dur: 0.07, vol: 0.13 }); },
  splash() { noise({ dur: 0.6, vol: 0.22, filter: 'bandpass', f0: 2500, f1: 600, q: 1 }); },
  whoosh() { noise({ dur: 0.5, vol: 0.18, filter: 'bandpass', f0: 300, f1: 2500, q: 2 }); },
  tick() { tone({ type: 'triangle', f0: 1200, dur: 0.03, vol: 0.05 }); },
  go() { tone({ type: 'triangle', f0: 880, dur: 0.3, vol: 0.12 }); },
  // balloons
  puff() { noise({ dur: 0.18, vol: 0.12, filter: 'bandpass', f0: 600, f1: 1400, q: 1.2 }); },
  wheeze() { tone({ type: 'sawtooth', f0: 900, f1: 500, dur: 0.35, vol: 0.03 }); noise({ dur: 0.35, vol: 0.06, filter: 'bandpass', f0: 2200, f1: 900, q: 4 }); },
  pop() { noise({ dur: 0.08, vol: 0.4, filter: 'highpass', f0: 800 }); tone({ f0: 300, f1: 80, dur: 0.1, vol: 0.2 }); },
  // racing
  light() { tone({ type: 'square', f0: 440, dur: 0.18, vol: 0.05 }); },
  lightsOut() { tone({ type: 'square', f0: 880, dur: 0.4, vol: 0.06 }); tone({ type: 'triangle', f0: 1320, dur: 0.4, vol: 0.05 }); },
  vroom() { tone({ type: 'sawtooth', f0: 110, f1: 420, dur: 0.45, vol: 0.06 }); noise({ dur: 0.4, vol: 0.06, filter: 'bandpass', f0: 300, f1: 1400, q: 1.5 }); },
  sputter() { for (let i = 0; i < 3; i++) noise({ dur: 0.05, vol: 0.12, delay: i * 0.08, filter: 'lowpass', f0: 500 }); },
  cheer() {
    noise({ dur: 1.4, vol: 0.09, filter: 'bandpass', f0: 1100, f1: 1600, q: 0.7, attack: 0.25 });
    for (let i = 0; i < 6; i++) tone({ type: 'triangle', f0: 900 + Math.random() * 900, f1: 1400 + Math.random() * 900, dur: 0.12, vol: 0.03, delay: 0.1 + Math.random() * 0.8 });
  },
  coo() { tone({ f0: 330, f1: 290, dur: 0.22, vol: 0.12 }); tone({ f0: 300, f1: 260, dur: 0.3, vol: 0.12, delay: 0.28 }); },
  // The gnome's talking voice: low, warm, a bit wobbly (grandpa energy).
  babble(text, pitch = 1) {
    let d = 0;
    for (const ch of text.slice(0, 44)) {
      if (/[a-z]/i.test(ch)) {
        const v = (ch.toLowerCase().charCodeAt(0) - 97) / 26;
        tone({ type: 'triangle', f0: (150 + v * 120) * pitch, f1: (130 + v * 100) * pitch, dur: 0.05, vol: 0.06, delay: d });
      }
      d += 0.038;
    }
  },
};

// The race car's engine: a low hum whose pitch follows the car's speed.
let eng = null;
export const engine = {
  start() {
    const c = enabled && ac();
    if (!c || eng) return;
    const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = 55; o2.frequency.value = 27.5;
    f.type = 'lowpass'; f.frequency.value = 400;
    g.gain.value = 0.0001;
    o.connect(f); o2.connect(f); f.connect(g).connect(master);
    o.start(); o2.start();
    eng = { o, o2, f, g };
  },
  // k: 0 (idle) .. 1 (flat out)
  set(k) {
    if (!eng) return;
    const t = ctx.currentTime, f0 = 50 + k * 190;
    eng.o.frequency.setTargetAtTime(f0, t, 0.08);
    eng.o2.frequency.setTargetAtTime(f0 * 0.502, t, 0.08);
    eng.f.frequency.setTargetAtTime(280 + k * 1500, t, 0.1);
    eng.g.gain.setTargetAtTime(0.02 + k * 0.035, t, 0.1);
  },
  stop() {
    if (!eng) return;
    const t = ctx.currentTime;
    eng.g.gain.setTargetAtTime(0.0001, t, 0.08);
    eng.o.stop(t + 0.5); eng.o2.stop(t + 0.5);
    eng = null;
  },
};
