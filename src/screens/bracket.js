// Office tournament bracket (pure logic, no canvas): single elimination over 4
// or 8 entrants, seeded in the order given (1v2, 3v4, …). Each entrant is
// { id, human }. Screens drive it; tests/tournament.test.mjs covers it.

export const ROUND_NAMES = { 8: ['QUARTER-FINALS', 'SEMI-FINALS', 'FINAL'], 4: ['SEMI-FINALS', 'FINAL'] };

export function makeBracket(entrants, stageIds) {
  if (entrants.length !== 4 && entrants.length !== 8) throw new Error('a bracket takes 4 or 8 entrants');
  const b = { entrants: entrants.map(e => ({ ...e })), stageIds: [...stageIds], rounds: [] };
  b.rounds.push(pairs(b, entrants.map((_, i) => i), 0));
  return b;
}

function pairs(b, idx, r) {
  const out = [];
  for (let m = 0; m * 2 < idx.length; m++) out.push({ a: idx[m * 2], b: idx[m * 2 + 1], w: null, stageId: b.stageIds[(r * 4 + m) % b.stageIds.length] });
  return out;
}

export const roundCount = (b) => Math.log2(b.entrants.length);
export const roundName = (b, r) => ROUND_NAMES[b.entrants.length][r];

// The next unplayed match, or null when the bracket is done.
export function nextMatch(b) {
  for (let r = 0; r < b.rounds.length; r++)
    for (let m = 0; m < b.rounds[r].length; m++) if (b.rounds[r][m].w === null) return { r, m };
  return null;
}

// Record the winner (an entrant index) and open the next round once this one is complete.
export function recordWin(b, r, m, winner) {
  const mt = b.rounds[r][m];
  if (winner !== mt.a && winner !== mt.b) throw new Error('the winner must be in the match');
  mt.w = winner;
  const done = b.rounds[r].every(x => x.w !== null);
  if (done && r === b.rounds.length - 1 && r < roundCount(b) - 1) b.rounds.push(pairs(b, b.rounds[r].map(x => x.w), r + 1));
}

export function champion(b) {
  const last = b.rounds[roundCount(b) - 1];
  return last && last[0].w !== null ? last[0].w : null;
}

// Fight params for a match: a human entrant always gets the P1 side; two humans
// are P1 vs P2; two CPUs play each other. `swap` says whether side 0 is `b`.
export function matchSides(b, r, m) {
  const mt = b.rounds[r][m], A = b.entrants[mt.a], B = b.entrants[mt.b];
  const swap = !A.human && B.human;
  const [s0, s1] = swap ? [mt.b, mt.a] : [mt.a, mt.b];
  const e0 = b.entrants[s0], e1 = b.entrants[s1];
  return { swap, sides: [s0, s1], p1: e0.id, p2: e1.id, c1: e0.human ? 'human' : 'cpu', c2: e1.human ? 'human' : 'cpu', stageId: mt.stageId };
}

// Which entrant won, given the winning fight side (0 = P1 side).
export const sideToEntrant = (b, r, m, side) => matchSides(b, r, m).sides[side];
