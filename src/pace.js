// How urgent the games feel (1 = normal; smaller = more time to think).
// "auto" starts at normal and quietly slows a game down a step after a round
// where she clearly struggled, then creeps back up as she does well.
// Grown-ups can pin one pace for every game instead.
const PACES = { relaxed: 0.7, moderate: 1, aggressive: 1.25 };

export function pace(state, game) {
  const p = state.settings.pace || 'auto';
  return PACES[p] ?? state.autoPace?.[game] ?? 1;
}

// result: 'struggled' | 'ok' | 'great'
export function tunePace(state, game, result) {
  if ((state.settings.pace || 'auto') !== 'auto') return;
  const cur = state.autoPace?.[game] ?? 1;
  const next = result === 'struggled' ? Math.max(0.6, cur - 0.1) : result === 'great' ? Math.min(1, cur + 0.05) : cur;
  state.autoPace = { ...(state.autoPace || {}), [game]: next };
}
