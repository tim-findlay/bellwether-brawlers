import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchState, STOCKS, CHAIR_DESCENT, RESPAWN_CAP } from '../src/engine/match.js';
import { geometryOf } from '../src/data/stages.js';

const MID = { runMax: 3.1, jumpImpulse: 11, fallMax: 11, weight: 1.0 };
export const IDLE = Object.freeze({
  left: false, right: false, down: false, downTapped: false,
  jump: false, dodge: false, dashLeft: false, dashRight: false,
});
const STAGE = geometryOf('office');
const newMatch = () => new MatchState(STAGE, [MID, MID]);
const step = (m, i0 = IDLE, i1 = IDLE, n = 1) => { for (let k = 0; k < n; k++) m.update([{ ...IDLE, ...i0 }, { ...IDLE, ...i1 }]); };

test('a fresh match: 3 stocks each, both bodies on their spawns, not over', () => {
  const m = newMatch();
  assert.equal(m.players[0].stocks, STOCKS);
  assert.equal(m.players[1].stocks, STOCKS);
  assert.equal(m.players[0].body.x, STAGE.spawns[0].x);
  assert.equal(m.over, false);
});

test('crossing a blast zone costs exactly one stock and starts the chair', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;              // teleport out
  step(m);
  assert.equal(m.players[0].stocks, STOCKS - 1);
  assert.ok(m.players[0].respawn, 'riding the chair');
  step(m, IDLE, IDLE, 5);                                  // out body is parked — no double count
  assert.equal(m.players[0].stocks, STOCKS - 1);
});

test('the survivor keeps playing while the other rides the chair', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);
  const x1 = m.players[1].body.x;
  step(m, IDLE, { right: true }, 30);
  assert.ok(m.players[1].body.x > x1, 'P2 still moves');
});
