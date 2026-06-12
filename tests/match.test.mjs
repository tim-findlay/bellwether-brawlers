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

test('chair: descends over CHAIR_DESCENT frames, releases on first act after arrival', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);                                                  // KO -> chair starts
  step(m, { jump: true }, IDLE, 10);                        // acting DURING descent: ignored
  assert.ok(m.players[0].respawn, 'still riding mid-descent');
  step(m, IDLE, IDLE, CHAIR_DESCENT);                       // arrive
  assert.ok(Math.abs(m.players[0].respawn.y - STAGE.respawn.y) < 1e-9, 'hovering at the respawn point');
  step(m, { jump: true });                                  // act -> release
  assert.equal(m.players[0].respawn, null);
  assert.equal(m.players[0].body.x, STAGE.respawn.x);
  assert.equal(m.players[0].stocks, STOCKS - 1);
});

test('chair: hard cap forces release with no input', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  step(m);
  step(m, IDLE, IDLE, RESPAWN_CAP + 1);
  assert.equal(m.players[0].respawn, null, 'released by the cap');
});

test('losing the last stock ends the match with the right winner', () => {
  const m = newMatch();
  m.players[1].stocks = 1;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, true);
  assert.equal(m.winner, 0);
  assert.deepEqual(m.events.at(-1), { type: 'gameover', winner: 0 });
  const x = m.players[0].body.x;
  step(m, { right: true }, IDLE, 10);                       // frozen after game over
  assert.equal(m.players[0].body.x, x);
});

test('same-tick double-KO on final stocks is a draw, one event', () => {
  const m = newMatch();
  m.players[0].stocks = 1; m.players[1].stocks = 1;
  m.players[0].body.x = STAGE.blast.left - 5;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, true);
  assert.equal(m.winner, -1);
  assert.deepEqual(m.events, [{ type: 'gameover', winner: -1 }]);
});

test('same-tick double-KO with stocks left costs one stock each, both ride chairs', () => {
  const m = newMatch();
  m.players[0].body.x = STAGE.blast.left - 5;
  m.players[1].body.x = STAGE.blast.right + 5;
  step(m);
  assert.equal(m.over, false);
  assert.equal(m.players[0].stocks, STOCKS - 1);
  assert.equal(m.players[1].stocks, STOCKS - 1);
  assert.ok(m.players[0].respawn && m.players[1].respawn);
  assert.deepEqual(m.events, [{ type: 'ko', player: 0 }, { type: 'ko', player: 1 }]);
});

test('mixed-stock double-KO: gameover is always the final event, winner correct', () => {
  for (const loser of [0, 1]) {
    const m = newMatch();
    m.players[loser].stocks = 1;
    m.players[0].body.x = STAGE.blast.left - 5;
    m.players[1].body.x = STAGE.blast.right + 5;
    step(m);
    assert.equal(m.over, true);
    assert.equal(m.winner, 1 - loser);
    assert.equal(m.events.at(-1).type, 'gameover');
  }
});
