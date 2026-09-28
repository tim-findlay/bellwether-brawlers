// Office tournament: bracket logic (src/screens/bracket.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBracket, nextMatch, recordWin, champion, matchSides, sideToEntrant, roundName, roundCount } from '../src/screens/bracket.js';

const E = (ids, humans = []) => ids.map(id => ({ id, human: humans.includes(id) }));
const STAGES = ['office', 'pub', 'rooftop', 'tube', 'palace'];

test('an 8-entrant bracket plays 7 matches over three rounds to one champion', () => {
  const b = makeBracket(E(['ben', 'tim', 'adrian', 'richy', 'nick', 'abi', 'mike', 'seelye']), STAGES);
  assert.equal(roundCount(b), 3);
  assert.deepEqual(b.rounds[0].map(m => [m.a, m.b]), [[0, 1], [2, 3], [4, 5], [6, 7]], 'seeded 1v2, 3v4, …');
  let played = 0;
  for (let n; (n = nextMatch(b)); played++) recordWin(b, n.r, n.m, b.rounds[n.r][n.m].a);   // the higher seed always wins
  assert.equal(played, 7);
  assert.equal(champion(b), 0);
  assert.deepEqual(b.rounds.map((r, i) => roundName(b, i)), ['QUARTER-FINALS', 'SEMI-FINALS', 'FINAL']);
  assert.deepEqual(b.rounds[1].map(m => [m.a, m.b]), [[0, 2], [4, 6]], 'winners meet in bracket order');
});

test('a 4-entrant bracket is semis then a final; no champion until the final is played', () => {
  const b = makeBracket(E(['ben', 'tim', 'abi', 'mike']), STAGES);
  recordWin(b, 0, 0, 1); assert.equal(b.rounds.length, 1, 'next round opens only when this one is complete');
  recordWin(b, 0, 1, 3); assert.equal(b.rounds.length, 2);
  assert.equal(champion(b), null);
  assert.deepEqual([b.rounds[1][0].a, b.rounds[1][0].b], [1, 3]);
  recordWin(b, 1, 0, 3);
  assert.equal(champion(b), 3); assert.equal(nextMatch(b), null);
});

test('only 4 or 8 entrants, and only a player in the match can win it', () => {
  assert.throws(() => makeBracket(E(['ben', 'tim', 'abi']), STAGES));
  const b = makeBracket(E(['ben', 'tim', 'abi', 'mike']), STAGES);
  assert.throws(() => recordWin(b, 0, 0, 2));
});

test('a human entrant always takes the P1 side; two humans are P1 v P2; mirror matches resolve by side', () => {
  const b = makeBracket(E(['ben', 'tim', 'abi', 'abi'], ['tim']), STAGES);
  const s = matchSides(b, 0, 0);
  assert.equal(s.p1, 'tim'); assert.equal(s.c1, 'human'); assert.equal(s.c2, 'cpu'); assert.equal(s.swap, true);
  assert.equal(sideToEntrant(b, 0, 0, 0), 1, 'side 0 won = the human entrant (index 1)');
  const mirror = matchSides(b, 0, 1);
  assert.equal(mirror.p1, 'abi'); assert.equal(mirror.p2, 'abi'); assert.equal(mirror.c1, 'cpu');
  assert.equal(sideToEntrant(b, 0, 1, 1), 3, 'mirror match: the side, not the fighter id, names the winner');
  const two = makeBracket(E(['ben', 'tim', 'abi', 'mike'], ['ben', 'tim']), STAGES);
  const t = matchSides(two, 0, 0);
  assert.deepEqual([t.c1, t.c2, t.swap], ['human', 'human', false]);
});

test('matches rotate through the stages', () => {
  const b = makeBracket(E(['ben', 'tim', 'adrian', 'richy', 'nick', 'abi', 'mike', 'seelye']), STAGES);
  assert.deepEqual(b.rounds[0].map(m => m.stageId), ['office', 'pub', 'rooftop', 'tube']);
});
