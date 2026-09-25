import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FightWorld } from '../src/engine/combat.js';
import { AIController, DIFFICULTY } from '../src/engine/ai.js';
import { geometryOf } from '../src/data/stages.js';
import { byId } from '../src/data/characters.js';
import { isOffStage } from '../src/engine/ai/nav.js';

// A controller that does nothing (a training dummy).
class Idle {
  constructor() { this.reversed = false; this.isCPU = true; }
  intent() { return { left: false, right: false, down: false, downTapped: false, jump: false, dodge: false, dashLeft: false, dashRight: false }; }
  buffered() { return false; } consume() {} held() { return false; } pressed() { return false; } update() {}
}
const stubFx = { text() {}, spark() {}, dust() {}, ember() {}, confetti() {}, banner() {}, flash() {}, hitstop() {}, shake() {}, slowmo() {} };
const stubAudio = { play() {} };
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mk = (a, b, stage = 'office', profiles = ['normal', null], seed = 1) => {
  const rng = mulberry32(seed);
  const c = profiles.map(p => (p ? new AIController(p, rng) : new Idle()));
  const w = new FightWorld({ cfgs: [byId(a), byId(b)], controllers: c, stage: geometryOf(stage), fx: stubFx, audio: stubAudio, rng, settings: {} });
  return { w, c };
};
const step = (w) => { for (const f of w.fighters) f.controller.update(f, w); w.update(); };
const run = (w, n) => { for (let i = 0; i < n; i++) step(w); };

test('a CPU dropped off-stage with its jumps recovers to a surface (every recovery class)', () => {
  for (const id of ['tim', 'mike', 'ben', 'nick', 'richy', 'adrian', 'abi', 'seelye']) {
    const { w } = mk(id, 'tim');
    run(w, 5);
    const f = w.fighters[0], slab = w.stage.slabs[0];
    f.body.x = slab.x - 150; f.body.y = slab.y - 30; f.body.vx = -3; f.body.vy = 2; f.body.grounded = false;
    let landed = false;
    for (let t = 0; t < 400 && !landed; t++) { step(w); landed = f.grounded && f.stocks === 3; }
    assert.ok(landed, `${id} makes it back (stocks ${f.stocks}, at ${f.x | 0},${f.y | 0})`);
  }
});

test('recovery never burns the double jump when drifting home is enough', () => {
  const { w } = mk('tim', 'mike');
  run(w, 5);
  const f = w.fighters[0], slab = w.stage.slabs[0];
  f.body.x = slab.x - 60; f.body.y = slab.y - 260; f.body.vx = 0; f.body.vy = 0; f.body.grounded = false;
  let sawOff = false;
  for (let t = 0; t < 200 && !f.grounded; t++) { step(w); sawOff = sawOff || isOffStage(w.stage, f); }
  assert.ok(sawOff, 'the setup really was off-stage');
  assert.equal(f.grounded, true);
  assert.equal(f.body.airJumps, 1, 'double jump still in hand on landing');
  assert.equal(f.stocks, 3);
});

test('a CPU never dashes in the air', () => {
  for (const [a, b] of [['nick', 'mike'], ['adrian', 'richy']]) {
    const { w, c } = mk(a, b, 'palace', ['normal', 'normal'], 7);
    let dashes = 0;
    for (let t = 0; t < 3000 && !w.over; t++) {
      for (const f of w.fighters) f.controller.update(f, w);
      for (const f of w.fighters) {
        const it = f.controller.intent(f);
        if (f.airborne) assert.ok(!it.dashLeft && !it.dashRight, `${f.cfg.id} dashed in the air at frame ${t}`);
        if (it.dashLeft || it.dashRight) dashes++;
      }
      w.update();
    }
    assert.ok(dashes > 0, `${a}/${b}: the CPUs do dash on the ground (${dashes})`);
    assert.ok(c.every(x => x.isCPU));
  }
});

test('a CPU jumps a telegraphed unparryable (the grab wind-up whiffs vs airborne)', () => {
  const { w, c } = mk('tim', 'mike', 'office', ['hard', null]);
  run(w, 5);
  const [tim, mike] = w.fighters;
  c[0].rng = () => 0.5;                                            // deterministic decision, no mistake roll
  c[0].queue.clear(); c[0].plan = { kind: 'wait' }; c[0].cool = 1; // next tick is a clean decision tick
  mike.body.x = tim.x + 60; mike.body.facing = -1;
  assert.ok(mike.startMove('s1'), 'Mike starts Scaffold Slam');
  let jumped = false;
  for (let t = 0; t < mike.cfg.s1.startup + 2; t++) { step(w); jumped = jumped || tim.airborne; }
  assert.ok(jumped, 'Tim left the ground before the grab fired');
  assert.notEqual(tim.state, 'grabbed');
});

test('difficulty profiles differ: reaction knobs are ordered and behaviour diverges from the same seed', () => {
  assert.ok(DIFFICULTY.easy.decide > DIFFICULTY.normal.decide && DIFFICULTY.normal.decide > DIFFICULTY.hard.decide);
  assert.ok(DIFFICULTY.easy.mistake > DIFFICULTY.normal.mistake && DIFFICULTY.normal.mistake > DIFFICULTY.hard.mistake);
  assert.ok(DIFFICULTY.hard.edgeGuard > DIFFICULTY.easy.edgeGuard);
  assert.ok(DIFFICULTY.stall.stall && DIFFICULTY.camp.camp, 'sim-only profiles are flagged');
  const trail = (profile) => {
    const { w } = mk('nick', 'ben', 'office', [profile, null], 3);
    const out = [];
    for (let t = 0; t < 600; t++) { step(w); if (t % 30 === 0) out.push(`${w.fighters[0].x | 0},${w.fighters[0].y | 0}`); }
    return out.join(' ');
  };
  assert.notEqual(trail('easy'), trail('hard'));
  assert.equal(new AIController('nonsense').profileName, 'normal', 'unknown names fall back to normal');
});

test('the stall profile loiters off-stage on purpose; the normal profile does not', () => {
  const loiter = (profile) => {
    const { w } = mk('tim', 'seelye', 'pub', [profile, 'normal'], 11);
    let off = 0;
    for (let t = 0; t < 2400 && !w.over; t++) { step(w); const f = w.fighters[0]; if (!f.chair && f.state === 'normal' && f.body.stun === 0 && isOffStage(w.stage, f)) off++; }
    return off;
  };
  assert.ok(loiter('stall') > loiter('normal'), 'stall bot spends more voluntary time off-stage');
});
