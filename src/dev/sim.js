// CPU-vs-CPU balance harness (v3). Dev-only: dynamically imported via ?sim=N,
// or run under node: `node src/dev/sim.js 10`. BALANCE.md "Sim methodology":
// Normal AI, hazards ON, all 56 ordered pairings x N across the five
// selectable stages, seeded RNG, 3 stocks, frame cap 10,800 with the
// tie-break rule (stocks, then gauge; a dead heat is half a win each and the
// match is flagged). Prints the win matrix, aggregates and the FIVE ship
// gates; results land in window.__SIM_RESULTS (browser) or stdout (node).
//
// Gate definitions, operational:
//  1 band       every fighter's aggregate win rate in [42, 58] %
//  2 anti-camp  `camp` profile vs `normal`, aggregate <= 55 %
//  3 anti-stall `stall` profile vs `normal`, aggregate <= 45 %
//  4 engagement flagged matches < 2 %: a gap > 720 frames between "hit
//               interactions" (a fighter-sourced takeHit that connects, or a
//               stock loss — hazard shoves don't count), or combined VOLUNTARY
//               off-stage time > 25 % of match frames (frames airborne with no
//               surface below during an excursion the fighter began on its own,
//               i.e. it left the stage with stun 0 — a launch and the honest
//               recovery after it are not loitering), or the frame cap
//  5 recovery   stocks lost with the double jump unspent while "within
//               recovery range" < 10 % of all stocks lost. Recovery range:
//               at ANY actionable tick of the fatal off-stage excursion
//               (stun 0, not dodging/attacking), nav.flightSim says a double
//               jump (now, or on reaching slab level) plus drift toward the
//               stage — credited a 60 px air-dodge budget when that was
//               unspent — would have crossed a stage surface from above.
//               Top-blast deaths are excluded (jumps can't help there).

import { FightWorld } from '../engine/combat.js';
import { EventDirector } from '../engine/events.js';
import { AIController } from '../engine/ai.js';
import { CHARACTERS } from '../data/characters.js';
import { EVENTS } from '../data/events.js';
import { geometryOf, SELECTABLE_STAGES } from '../data/stages.js';
import { flightSim, isOffStage } from '../engine/ai/nav.js';

export const FRAME_CAP = 10800;
const HIT_GAP = 720, LOITER_FRAC = 0.25, DODGE_BUDGET = 60;

class NullFX {
  hitstop() {} shake() {} slowmo() {} flash() {} spark() {} dust() {} ember() {}
  confetti() {} text() {} banner() {} bannerActive() { return false; }
  update() {} camera() { return { x: 0, y: 0 }; } timeScale() { return 1; }
  frozen() { return false; } drawWorld() {} drawUI() {}
}
const nullAudio = { play() {}, setEnabled() {}, ensure() { return false; } };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Could this off-stage body still have made it home with what it has left?
function recoverable(f, stage) {
  const b = f.body;
  if (b.airJumps <= 0) return false;
  const slab = stage.slabs[0];
  const dir = b.x < slab.x + slab.w / 2 ? 1 : -1;
  const extraX = b.airDodgeOk ? DODGE_BUDGET : 0;
  return !!flightSim(b, dir, stage, { jump: 'level', extraX }).lands || !!flightSim(b, dir, stage, { jump: 'now', extraX }).lands;
}

// One match. Returns { score: [a, b] (1/0 or 0.5 each), frames, capped, flags, stocksLost, dishonest, stuck, nan, events }.
export function runMatch(cfgA, cfgB, stageId, rng, profiles = ['normal', 'normal']) {
  const controllers = [new AIController(profiles[0], rng), new AIController(profiles[1], rng)];
  const world = new FightWorld({ cfgs: [cfgA, cfgB], controllers, stage: geometryOf(stageId), fx: new NullFX(), audio: nullAudio, rng, settings: { events: true } });
  const director = new EventDirector(world, EVENTS, { enabled: true, difficulty: 'normal', stageId });
  const F = world.fighters;
  let frames = 0, lastHit = 0, maxGap = 0, loiter = 0, stocksLost = 0, dishonest = 0, nan = false;
  const excursion = [false, false];              // "recovery was possible" during the current off-stage trip
  const offNow = [false, false], voluntary = [false, false];   // left the stage on purpose (stun 0) vs launched
  const stuckT = [0, 0]; let stuck = null;
  const snap = F.map(() => ({ y: 0, top: false }));
  // "hit interaction" = a fighter-sourced takeHit that connects. Hazards are the
  // only sources with kbScale 0 (legacy hazard shoves); burn and event effects write
  // the gauge directly and never count.
  for (const f of F) {
    const orig = f.takeHit.bind(f);
    f.takeHit = (o) => { const r = orig(o); if (r !== 'miss' && (o.kbScale ?? 5) !== 0) lastHit = frames; return r; };
  }

  while (!world.over && frames < FRAME_CAP) {
    F.forEach((f, i) => {
      f.controller.update(f, world);
      snap[i].top = f.y < world.stage.blast.top + 40;
      const off = !f.chair && f.state !== 'ko' && isOffStage(world.stage, f);
      if (off && !offNow[i]) voluntary[i] = f.body.stun === 0 && f.state === 'normal';
      offNow[i] = off;
      if (off) {
        if (voluntary[i] && f.body.stun === 0) loiter++;
        if (f.state === 'normal' && f.body.stun === 0 && !f.body.dodging && !f.attack && !excursion[i] && recoverable(f, world.stage)) excursion[i] = true;
      } else excursion[i] = false;
    });
    world.update(); director.update(); frames++;
    F.forEach((f, i) => {
      if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) nan = true;
      stuckT[i] = (f.state === 'grabbed' || f.state === 'frozen') ? stuckT[i] + 1 : 0;
      if (stuckT[i] > 400 && !stuck) stuck = `${f.cfg.id} ${f.state} for ${stuckT[i]}f at ${frames}`;
    });
    for (const e of world.events.splice(0)) {
      if (e.type !== 'ko') continue;
      stocksLost++; lastHit = frames;
      const f = F[e.player];
      if (excursion[e.player] && f.body.airJumps > 0 && !snap[e.player].top) dishonest++;
      excursion[e.player] = false;
    }
    maxGap = Math.max(maxGap, frames - lastHit);
  }
  if (world.over && world.winner < 0) { for (const f of F) stocksLost++; }   // double KO: both final stocks fell
  let score;
  const capped = !world.over;
  if (!capped) score = world.winner < 0 ? [0.5, 0.5] : world.winner === 0 ? [1, 0] : [0, 1];
  else if (F[0].stocks !== F[1].stocks) score = F[0].stocks > F[1].stocks ? [1, 0] : [0, 1];
  else if (F[0].gauge !== F[1].gauge) score = F[0].gauge > F[1].gauge ? [1, 0] : [0, 1];
  else score = [0.5, 0.5];
  const flags = [];
  if (capped) flags.push('cap');
  if (maxGap > HIT_GAP) flags.push('gap');
  if (loiter > frames * LOITER_FRAC) flags.push('loiter');
  return { score, frames, capped, flags, stocksLost, dishonest, stuck, nan, events: director.fired.slice() };
}

// The full run. `log` receives lines; `tick` is awaited between pairings (UI yield).
export async function simulate(N, { seed = 1337, log = console.log, tick = null, progress = null } = {}) {
  const master = mulberry32(seed);
  const stages = SELECTABLE_STAGES.map(s => s.id);
  const n = CHARACTERS.length;
  const games = N;
  const winsVs = Array.from({ length: n }, () => Array(n).fill(0));
  const won = Array(n).fill(0), played = Array(n).fill(0);
  const T = { matches: 0, flagged: 0, capped: 0, stocksLost: 0, dishonest: 0, frames: 0, stuck: [], nan: 0, events: {}, byStage: {}, flaggedPairs: {} };
  const perStage = {};
  const gateGames = Math.max(2, (games / 2) | 0);
  const total = n * (n - 1) * (games + 2 * gateGames);
  let done = 0;

  log(`[sim] ${n * (n - 1) * games} matches (${games} per ordered pairing) + ${n * (n - 1) * gateGames} camp + ${n * (n - 1) * gateGames} stall, seed ${seed}, cap ${FRAME_CAP}f…`);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let k = 0; k < games; k++) {
        const stageId = stages[(k + i * 3 + j) % stages.length];
        const r = runMatch(CHARACTERS[i], CHARACTERS[j], stageId, mulberry32((master() * 4294967296) >>> 0));
        winsVs[i][j] += r.score[0];
        won[i] += r.score[0]; won[j] += r.score[1]; played[i]++; played[j]++;
        T.matches++; T.frames += r.frames; T.stocksLost += r.stocksLost; T.dishonest += r.dishonest;
        if (r.flags.length) { T.flagged++; const key = `${CHARACTERS[i].id}-${CHARACTERS[j].id}`; T.flaggedPairs[key] = (T.flaggedPairs[key] || '') + r.flags.map(x => x[0]).join(''); }
        if (r.capped) T.capped++;
        if (r.nan) T.nan++;
        if (r.stuck) T.stuck.push(`${CHARACTERS[i].id} vs ${CHARACTERS[j].id} on ${stageId}: ${r.stuck}`);
        for (const e of r.events) T.events[e] = (T.events[e] || 0) + 1;
        perStage[stageId] = perStage[stageId] || { games: 0, frames: 0, flagged: 0 };
        perStage[stageId].games++; perStage[stageId].frames += r.frames; if (r.flags.length) perStage[stageId].flagged++;
        done++;
      }
      if (progress) progress(done / total);
      if (tick) await tick();
    }
  }

  // gates 2/3: profile vs normal, both seats
  const profileRun = async (profile) => {
    let w = 0, p = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        for (let k = 0; k < gateGames; k++) {
          const stageId = stages[(k + i + j) % stages.length];
          const seat = k % 2;
          const r = runMatch(CHARACTERS[i], CHARACTERS[j], stageId, mulberry32((master() * 4294967296) >>> 0), seat === 0 ? [profile, 'normal'] : ['normal', profile]);
          w += r.score[seat]; p++; done++;
        }
        if (progress) progress(done / total);
      }
      if (tick) await tick();
    }
    return w / p;
  };
  const campWR = await profileRun('camp');
  const stallWR = await profileRun('stall');

  const agg = CHARACTERS.map((c, i) => ({ id: c.id, name: c.name, winRate: +((won[i] / played[i]) * 100).toFixed(1) }));
  const results = {
    seed, gamesPerPairing: games, matches: T.matches, seconds: +((Date.now() - t0) / 1000).toFixed(1),
    aggregate: agg,
    matrix: winsVs.map((row, i) => ({ id: CHARACTERS[i].id, vs: row.map((w, j) => i === j ? '-' : `${w}/${games}`) })),
    campWinRate: +(campWR * 100).toFixed(1),
    stallWinRate: +(stallWR * 100).toFixed(1),
    flaggedPct: +((T.flagged / T.matches) * 100).toFixed(2),
    cappedMatches: T.capped,
    dishonestPct: T.stocksLost ? +((T.dishonest / T.stocksLost) * 100).toFixed(2) : 0,
    stocksLost: T.stocksLost, dishonestDeaths: T.dishonest,
    avgFrames: Math.round(T.frames / T.matches),
    byStage: Object.fromEntries(Object.entries(perStage).map(([k, v]) => [k, { games: v.games, avgFrames: Math.round(v.frames / v.games), flagged: v.flagged }])),
    events: T.events, stuck: T.stuck, nanMatches: T.nan, flaggedPairs: T.flaggedPairs,
    gates: {},
  };
  results.gates = {
    band: agg.every(a => a.winRate >= 42 && a.winRate <= 58),
    camp: results.campWinRate <= 55,
    stall: results.stallWinRate <= 45,
    engagement: results.flaggedPct < 2,
    recovery: results.dishonestPct < 10,
  };
  printResults(results, log);
  return results;
}

function printResults(r, log) {
  const ids = CHARACTERS.map(c => c.id.slice(0, 6).padStart(6));
  log(`[sim] ${r.matches} matches in ${r.seconds}s, avg ${r.avgFrames}f (${(r.avgFrames / 60).toFixed(0)}s); capped ${r.cappedMatches}; NaN ${r.nanMatches}; stuck ${r.stuck.length}`);
  log('[sim] matrix (row beats column, wins/games):');
  log('        ' + ids.join(' '));
  r.matrix.forEach(row => log(row.id.slice(0, 6).padEnd(8) + row.vs.map(v => String(v).padStart(6)).join(' ')));
  log('[sim] aggregate win rates:');
  for (const a of r.aggregate) log(`  ${a.id.padEnd(8)} ${a.winRate.toFixed(1)}%${a.winRate < 42 || a.winRate > 58 ? '  <-- outside 42-58' : ''}`);
  log(`[sim] per stage: ${Object.entries(r.byStage).map(([k, v]) => `${k} ${v.games}g avg ${v.avgFrames}f flagged ${v.flagged}`).join(' · ')}`);
  log(`[sim] events fired: ${Object.entries(r.events).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  for (const s of r.stuck.slice(0, 5)) log(`[sim] STUCK: ${s}`);
  const fp = Object.entries(r.flaggedPairs);
  if (fp.length) log(`[sim] flagged (c=cap g=gap l=loiter): ${fp.map(([k, v]) => `${k}:${v}`).join(' ')}`);
  const g = r.gates, P = (b) => (b ? 'PASS' : 'FAIL');
  log(`[sim] GATES: band=${P(g.band)} · camp=${r.campWinRate}% ${P(g.camp)} (<=55) · stall=${r.stallWinRate}% ${P(g.stall)} (<=45) · engagement flags=${r.flaggedPct}% ${P(g.engagement)} (<2) · recovery dishonest=${r.dishonestPct}% (${r.dishonestDeaths}/${r.stocksLost}) ${P(g.recovery)} (<10)`);
}

// ---- browser entry (?sim=N) ------------------------------------------------------
export async function runSim(N, G, { seed = 1337, log = console.log } = {}) {
  const results = await simulate(N, {
    seed, log,
    tick: () => new Promise(r => setTimeout(r, 0)),
    progress: (p) => drawProgress(G, p),
  });
  window.__SIM_RESULTS = results;
  let pre = document.getElementById('simout');
  if (!pre) { pre = document.createElement('pre'); pre.id = 'simout'; pre.style.display = 'none'; document.body.appendChild(pre); }
  pre.textContent = JSON.stringify(results);
  drawResults(G, results);
  return results;
}

function ctxOf(G) { return G.renderer?.ctx || G.canvas.getContext('2d'); }

function drawProgress(G, p) {
  const c = ctxOf(G);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#f2e9d8'; c.fillRect(0, 0, 960, 540);
  c.fillStyle = '#2b2620'; c.font = "700 26px 'Pixelify Sans'"; c.textAlign = 'center';
  c.fillText('BALANCE SIM RUNNING…', 480, 240);
  c.strokeStyle = '#2b2620'; c.lineWidth = 3; c.strokeRect(280, 270, 400, 22);
  c.fillStyle = '#c4452e'; c.fillRect(283, 273, 394 * p, 16);
}

function drawResults(G, r) {
  const c = ctxOf(G);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#f2e9d8'; c.fillRect(0, 0, 960, 540);
  c.fillStyle = '#2b2620'; c.font = "700 30px 'Pixelify Sans'"; c.textAlign = 'center';
  c.fillText('BALANCE SIM RESULTS', 480, 52);
  c.font = "700 15px 'Silkscreen'";
  r.aggregate.slice().sort((a, b) => b.winRate - a.winRate).forEach((a, i) => {
    const ok = a.winRate >= 42 && a.winRate <= 58;
    c.fillStyle = ok ? '#2b2620' : '#c4452e';
    c.textAlign = 'left'; c.fillText(a.name, 120, 100 + i * 30);
    c.textAlign = 'right'; c.fillText(`${a.winRate.toFixed(1)}%`, 330, 100 + i * 30);
  });
  const g = r.gates, P = (b) => (b ? 'PASS' : 'FAIL');
  const lines = [
    `BAND 42-58%  ${P(g.band)}`,
    `CAMP ${r.campWinRate}%  ${P(g.camp)}`,
    `STALL ${r.stallWinRate}%  ${P(g.stall)}`,
    `ENGAGEMENT FLAGS ${r.flaggedPct}%  ${P(g.engagement)}`,
    `RECOVERY DISHONEST ${r.dishonestPct}%  ${P(g.recovery)}`,
    `${r.matches} MATCHES · SEED ${r.seed} · ${r.seconds}s`,
  ];
  c.textAlign = 'left';
  lines.forEach((s, i) => { c.fillStyle = s.includes('FAIL') ? '#c4452e' : '#2b2620'; c.fillText(s, 420, 100 + i * 30); });
  c.font = "600 15px 'Barlow Condensed'"; c.fillStyle = '#5a5246'; c.textAlign = 'center';
  c.fillText('full matrix in the console and window.__SIM_RESULTS', 480, 500);
}

// ---- node entry: `node src/dev/sim.js N` ------------------------------------------
export function runHeadless(N, seed = 1337) { return simulate(N, { seed }); }

if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
  runHeadless(+process.argv[2] || 3, +process.argv[3] || 1337);
}
