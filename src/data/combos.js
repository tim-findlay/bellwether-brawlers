// The combo blueprint (DESIGN.md "Combos"): the universal routes every fighter
// carries, the way every Brawlhalla weapon has its bread-and-butter strings.
// Each route is a list of steps; the hits must land as a TRUE combo (no gap
// longer than PHYS.POST_STUN_LOCK) on a standing dummy while its composure is
// inside `window` (emptiness 0 = full, 1 = empty; launches grow as it empties,
// so every route has a range where it works). tests/combos.test.mjs runs every
// route for every fighter; `node src/dev/combos.js` prints the matrix — a new
// fighter ships when it passes. The practice arena lists them as trials.
//
// Steps: nLight sLight dLight · nHeavy sHeavy dHeavy · nAir sAir uAir dAir (hits)
//        air (any aerial — whatever direction you happen to hold) · jump · chase
//        (movement, no hit). "s" = toward the opponent.

export const ROUTES = [
  { id: 'jab', name: 'Jab String', steps: ['nLight', 'sLight'], window: [0, 0.6],
    how: 'Light, then toward + Light the moment it connects.' },
  { id: 'confirm', name: 'Confirm', steps: ['nLight', 'sHeavy'], window: [0, 0.6],
    how: 'Light, then toward + Heavy: a signature off a jab. The kill route late on.' },
  { id: 'popup', name: 'Pop-Up', steps: ['dLight', 'jump', 'air'], window: [0, 0.4],
    how: 'Down + Light pops them up and they hang there — jump after them and hit any air attack.' },
  { id: 'chase', name: 'Chase', steps: ['sLight', 'chase', 'sAir'], window: [0, 0.4],
    how: 'Toward + Light, Dodge to chase them, toward + Light in the air.' },
  { id: 'jumpin', name: 'Jump-In', steps: ['nAir', 'nLight'], window: [0, 0.6], air: true,
    how: 'Jump at them, Light on the way down, then Light again as you land.' },
];

// step -> the move it throws, from an expanded kit
export function moveFor(cfg, step) {
  const L = cfg.lights || {}, S = cfg.sigs || {}, A = cfg.aerials || {};
  return {
    nLight: L.n, sLight: L.s, dLight: L.d, nHeavy: S.n, sHeavy: S.s, dHeavy: S.d,
    nAir: A.n, sAir: A.s, uAir: A.u, dAir: A.d, air: A.n,
  }[step] || null;
}
export const HIT_STEPS = (r) => r.steps.filter(s => s !== 'jump' && s !== 'chase');
const ANY_AIR = ['nAir', 'uAir', 'sAir', 'dAir'];
// does a landed move satisfy a step? ('air' takes any aerial)
export function stepMatches(cfg, step, move) {
  return step === 'air' ? ANY_AIR.some(s => moveFor(cfg, s) === move) : moveFor(cfg, step) === move;
}
