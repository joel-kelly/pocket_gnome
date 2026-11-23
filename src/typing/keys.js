// The keyboard: stages of keys, which finger presses which key, and the layout
// for the on-screen keyboard.

// Stages follow the fingers outward from Gnome Row (the home row).
export const STAGES = [
  { keys: ['f', 'j'], name: 'F and J', tip: 'Find the little bumps on F and J. Your pointer fingers live there!' },
  { keys: ['d', 'k'], name: 'D and K', tip: 'Middle fingers rest on D and K, right next door.' },
  { keys: ['s', 'l'], name: 'S and L', tip: 'Ring fingers on S and L.' },
  { keys: ['a', ';'], name: 'A and ;', tip: 'Pinkies on A and the semicolon. That\'s all of Gnome Row!' },
  { keys: ['g', 'h'], name: 'G and H', tip: 'Pointer fingers stretch to the middle for G and H.' },
  { keys: ['e', 'i'], name: 'E and I', tip: 'Middle fingers reach up for E and I.' },
  { keys: ['r', 'u'], name: 'R and U', tip: 'Pointer fingers reach up for R and U.' },
  { keys: ['t', 'o'], name: 'T and O', tip: 'Left pointer stretches up to T. Right ring finger reaches up to O.' },
  { keys: ['n', 'c'], name: 'N and C', tip: 'Down to the bottom row: right pointer for N, left middle for C.' },
  { keys: ['w', 'm'], name: 'W and M', tip: 'Left ring finger up to W. Right pointer down to M.' },
  { keys: ['y', 'p'], name: 'Y and P', tip: 'Right pointer stretches up to Y. Right pinky up to P.' },
  { keys: ['b', 'v'], name: 'B and V', tip: 'Left pointer reaches down for V and B.' },
  { keys: ['q', 'z', 'x'], name: 'Q, Z and X', tip: 'The rare ones! Left pinky for Q and Z, left ring finger for X.' },
  { keys: ['Shift'], name: 'Capital letters', tip: 'Hold Shift with your pinky on the OTHER hand, then press the letter.' },
  { keys: ['.', ','], name: 'Periods and commas', tip: 'Right ring finger for the period. Right middle finger for the comma.' },
];
export const MAX_STAGE = STAGES.length;
export const GNOME_ROW_STAGE = 4;

// Every key up to and including a stage.
export function keysUpTo(stage) {
  const out = [];
  for (let i = 0; i < Math.min(stage, MAX_STAGE); i++) out.push(...STAGES[i].keys);
  return out;
}
export function stageOfKey(k) {
  const i = STAGES.findIndex((s) => s.keys.includes(k));
  return i < 0 ? null : i + 1;
}

export const FINGERS = {
  Lpinky: { name: 'left pinky', color: '#f6b8c8' },
  Lring: { name: 'left ring finger', color: '#f8d29a' },
  Lmiddle: { name: 'left middle finger', color: '#f4ec9a' },
  Lindex: { name: 'left pointer finger', color: '#b8e6a8' },
  Rindex: { name: 'right pointer finger', color: '#a8dcd8' },
  Rmiddle: { name: 'right middle finger', color: '#b0c8f4' },
  Rring: { name: 'right ring finger', color: '#cfb8f4' },
  Rpinky: { name: 'right pinky', color: '#f4b8e8' },
  thumb: { name: 'thumb', color: '#e2e0da' },
};
const F = {};
const assign = (finger, keys) => { for (const k of keys) F[k] = finger; };
assign('Lpinky', ['q', 'a', 'z', '`', '1', 'Tab', 'CapsLock', 'ShiftLeft']);
assign('Lring', ['w', 's', 'x', '2']);
assign('Lmiddle', ['e', 'd', 'c', '3']);
assign('Lindex', ['r', 'f', 'v', 't', 'g', 'b', '4', '5']);
assign('Rindex', ['y', 'h', 'n', 'u', 'j', 'm', '6', '7']);
assign('Rmiddle', ['i', 'k', ',', '8']);
assign('Rring', ['o', 'l', '.', '9']);
assign('Rpinky', ['p', ';', '/', "'", '[', ']', '0', '-', '=', 'Enter', 'ShiftRight', 'Backspace']);
assign('thumb', [' ']);
export const fingerOf = (k) => F[k.length === 1 ? k.toLowerCase() : k] || null;
export const isLeftHand = (k) => (fingerOf(k) || '').startsWith('L');

// On-screen keyboard rows. Each key: [id, label, width]. id = the character typed.
export const KEY_ROWS = [
  [['q'], ['w'], ['e'], ['r'], ['t'], ['y'], ['u'], ['i'], ['o'], ['p'], ['Backspace', 'Back', 1.6]],
  [['a'], ['s'], ['d'], ['f'], ['g'], ['h'], ['j'], ['k'], ['l'], [';']],
  [['ShiftLeft', '⇧', 1.6], ['z'], ['x'], ['c'], ['v'], ['b'], ['n'], ['m'], [','], ['.'], ['ShiftRight', '⇧', 1.6]],
  [[' ', '', 6]],
];
// Row offsets in key widths, like a real keyboard.
export const ROW_OFFSET = [0, 0.3, -0.5, 2];

// The key a character needs (capitals need a letter plus Shift).
export function keyForChar(ch) {
  if (ch === ' ') return ' ';
  if (/[A-Z]/.test(ch)) return ch.toLowerCase();
  return ch;
}
// The Shift key to use for a capital: the one on the other hand.
export function shiftFor(ch) { return isLeftHand(ch.toLowerCase()) ? 'ShiftRight' : 'ShiftLeft'; }
