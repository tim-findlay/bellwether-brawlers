// Combo lab (dev): runs the blueprint routes (src/data/combos.js) frame-perfect
// for any fighter against a standing dummy and reports whether each one lands
// as a TRUE combo across its composure window. Headless; used by
// tests/combos.test.mjs and runnable directly:
//   node src/dev/combos.js            — every fighter × every route
//   node src/dev/combos.js adrian     — one fighter, with the step log

import { FightWorld } from '../engine/combat.js';
import { ComboTracker, DummyController } from '../engine/practice.js';
import { cancelOpen, chaseOpen } from '../engine/combo.js';
import { ROUTES, moveFor, HIT_STEPS } from '../data/combos.js';
import { geometryOf } from '../data/stages.js';
import { byId, CHARACTERS } from '../data/characters.js';
import { PHYS } from '../data/physics.js';

const fx = new Proxy({}, { get: () => () => {} });
const BUF = PHYS.INPUT_BUFFER;

// A controller that presses exactly what the route says, the first frame it can.
class RouteBot {
  constructor() { this.t = 0; this.pend = {}; this.hold = new Set(); this.reversed = false; this.isCPU = true; }
  update() { this.t++; }
  press(a) { this.pend[a] = this.t; }
  buffered(a) { const p = this.pend[a]; return p !== undefined && this.t - p <= BUF; }
  consume(a) { delete this.pend[a]; }
  held(a) { return this.hold.has(a); }
  pressed() { return false; }
  intent() {
    return { left: this.hold.has('left'), right: this.hold.has('right'), down: this.hold.has('down'), downTapped: false,
      jump: this.buffered('up'), dodge: this.buffered('dodge'), dashLeft: false, dashRight: false };
  }
}

const AIR = new Set(['nAir', 'sAir', 'uAir', 'dAir', 'air']);
function aimHolds(bot, step, dir) {
  bot.hold.clear();
  const k = step[0];
  if (k === 's') bot.hold.add(dir > 0 ? 'right' : 'left');
  if (k === 'd') bot.hold.add('down');
  if (k === 'u') bot.hold.add('up');
}

export function runRoute(attId, route, emptiness = 0, dummyId = 'tim', { log = false, delays = [] } = {}) {
  const bot = new RouteBot();
  const cfgOf = (x) => (typeof x === 'string' ? byId(x) : x);   // an id, or a whole (expanded) fighter — a new one on the drawing board
  const w = new FightWorld({ cfgs: [cfgOf(attId), cfgOf(dummyId)], controllers: [bot, new DummyController('stand')],
    stage: geometryOf('palace'), fx, audio: { play() {} }, rng: () => 0.5, settings: {} });
  for (let i = 0; i < 5; i++) w.update();
  const [a, d] = w.fighters, slab = w.stage.slabs[0], mid = slab.x + slab.w / 2;
  a.body.x = mid - 60; a.body.facing = 1;
  d.body.x = a.body.x + (route.air ? 110 : (moveFor(a.cfg, route.steps[0])?.range ?? 60) * 0.5 + 30);
  d.body.facing = -1;
  d.gauge = d.maxGauge * (1 - emptiness);
  const combo = new ComboTracker(w, a, d), trace = [];
  const dir = () => (Math.sign(d.x - a.x) || 1);
  let k = 0, waitT = 0, airT = 0, readyT = -1;
  if (route.air) {                                          // a jump-in: start falling in from above and behind them
    d.body.x = a.body.x + 60;
    a.body.y = slab.y - 120; a.body.vy = 0; a.body.grounded = false; a.body.onPlatform = false; a.body._setState('air');
    bot.hold.add('right');
  }
  for (let f = 0; f < 420; f++) {
    const step = route.steps[k];
    if (step) {
      waitT++;
      const m = moveFor(a.cfg, step), b = a.body;
      const inChase = b.state === 'chase' && b.stateT >= PHYS.CHASE_CANCEL_FROM;
      const free = a.actionable || (a.attack && cancelOpen(a)) || inChase;
      if (!b.grounded) airT++; else airT = 0;
      let can = false;
      if (step === 'jump') can = free && b.grounded;
      else if (step === 'chase') can = chaseOpen(a);
      else if (AIR.has(step)) can = free && !b.grounded;
      else can = free && b.grounded;
      if (can && readyT < 0) readyT = 0;
      const go = can && readyT >= (delays[k] || 0);            // a player times the step: `delays` = frames held back
      if (readyT >= 0) readyT++;
      if (go) {
        readyT = -1;
        if (step === 'jump') { bot.hold.clear(); bot.hold.add(dir() > 0 ? 'right' : 'left'); bot.press('up'); }
        else if (step === 'chase') { bot.hold.clear(); bot.hold.add(dir() > 0 ? 'right' : 'left'); bot.hold.add('up'); bot.press('dodge'); }
        else { aimHolds(bot, step, dir()); bot.press(m?.kind === 'aerial' || step.endsWith('Light') || step.endsWith('Air') ? 'light' : 'heavy'); }
        if (log) trace.push(`${w.frame}: ${step}`);
        k++; waitT = 0;
      } else if (waitT > 90) break;                       // the step never became possible
    } else if (!bot.buffered('light') && !bot.buffered('heavy')) bot.hold.clear();
    for (const f2 of w.fighters) f2.controller.update?.(f2, w);
    w.update(); combo.update();
    if (log && f < 60) trace.push(`  f${w.frame} a(${Math.round(a.x)},${Math.round(a.y)} ${a.body.state}${a.attack ? ' ' + a.attack.move.name + '@' + a.attack.frame : ''}) d(${Math.round(d.x)},${Math.round(d.y)} ${d.state} stun${d.body.stun}) hits${combo.hits}`);
  }
  const need = HIT_STEPS(route).length;
  return { ok: combo.best >= need && k === route.steps.length, best: combo.best, need, drop: combo.dropped?.gap ?? null, trace };
}

// A player's best attempt: ground steps go the first frame they can; air steps
// (and the chase) may be held back 0..MAX_DELAY frames — every timing is tried.
const MAX_DELAY = 16, TIMED = (s, i, r) => AIR.has(s) || s === 'chase' || s === 'jump' || (r.air && i > 0);
export function bestRun(attId, route, emptiness = 0, dummyId = 'tim') {
  const slots = route.steps.map((s, i) => (TIMED(s, i, route) ? i : -1)).filter(i => i >= 0);
  let best = null;
  const tryDelays = (j, delays) => {
    if (best?.ok) return;
    if (j === slots.length) { const r = runRoute(attId, route, emptiness, dummyId, { delays }); if (!best || r.best > best.best) best = { ...r, delays: [...delays] }; return; }
    for (let dly = 0; dly <= MAX_DELAY; dly += (slots.length > 1 ? 2 : 1)) { delays[slots[j]] = dly; tryDelays(j + 1, delays); if (best?.ok) return; }
  };
  tryDelays(0, []);
  return best;
}

// Human leniency: for each step, how many consecutive frames of lateness (0..24,
// from the first frame it's possible, the other steps at the best timing) still land
// the route. The feel target (BALANCE.md Combo doctrine): every step >= LENIENCY.
export const LENIENCY = 8;
export function leniency(attId, route, emptiness = 0, dummyId = 'tim') {
  const best = bestRun(attId, route, emptiness, dummyId);
  if (!best?.ok) return { ok: false, windows: [], best };
  const windows = route.steps.map((_, i) => {
    let n = 0;
    for (let dly = 0; dly <= 24; dly++) {
      const delays = [...best.delays]; delays[i] = (best.delays[i] || 0) + dly;
      if (runRoute(attId, route, emptiness, dummyId, { delays }).ok) n++; else break;
    }
    return n;
  });
  return { ok: Math.min(...windows) >= LENIENCY, windows, best };
}

// Does a fighter pass a route across its whole window? (sampled every 0.1)
export function routeHolds(attId, route, dummyId = 'tim') {
  const [lo, hi] = route.window, fails = [];
  for (let e = lo; e <= hi + 1e-9; e += 0.1) {
    const r = bestRun(attId, route, Math.round(e * 10) / 10, dummyId);
    if (!r.ok) fails.push({ e: Math.round(e * 100), best: r.best, need: r.need, drop: r.drop });
  }
  return { ok: fails.length === 0, fails };
}

if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('combos.js')) {
  if (process.argv[2] === 'lenient') {                  // node src/dev/combos.js lenient — frames of slack per step
    for (const c of CHARACTERS) console.log(c.id.padEnd(8), ROUTES.map(r => { const l = leniency(c.id, r); return `${r.id}:${l.windows.join('/') || 'x'}`; }).join('  '));
    process.exit(0);
  }
  const only = process.argv[2];
  const ids = only ? [only] : CHARACTERS.map(c => c.id);
  console.log('fighter  ' + ROUTES.map(r => r.id.padEnd(9)).join(''));
  for (const id of ids) {
    const cells = ROUTES.map(r => {
      const h = routeHolds(id, r);
      return (h.ok ? 'ok' : 'x ' + h.fails.map(f => `${f.e}%:${f.best}/${f.need}${f.drop != null ? 'd' + f.drop : ''}`).join(',')).slice(0, 8).padEnd(9);
    });
    console.log(id.padEnd(9) + cells.join(''));
    if (only) for (const r of ROUTES) for (const e of [r.window[0], r.window[1]]) {
      const b0 = bestRun(id, r, e, 'tim'), x = runRoute(id, r, e, 'tim', { log: true, delays: b0.delays });
      console.log(`  ${r.id} @${e * 100}%: ${x.best}/${x.need}${x.drop != null ? ' dropped ' + x.drop + 'f' : ''} · ${x.trace.join(' · ')}`);
    }
  }
}
