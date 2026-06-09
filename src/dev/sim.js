// CPU-vs-CPU balance harness. Dev-only: dynamically imported via ?sim=N.
// Runs every ordered pairing N times headlessly (no rendering, no sound),
// prints a win-rate matrix and per-character aggregates, plus the stall-bot
// sanity gate from BALANCE.md. Results land in console, on the canvas, and
// in window.__SIM_RESULTS for automation.

import { FightWorld } from '../engine/combat.js';
import { EventDirector } from '../engine/events.js';
import { AIController } from '../engine/ai.js';
import { CHARACTERS } from '../data/characters.js';
import { EVENTS } from '../data/events.js';

const ROUND_FRAMES = 3600;

class NullFX {
  hitstop() {} shake() {} slowmo() {} flash() {} spark() {} dust() {} ember() {}
  confetti() {} text() {} banner() {} bannerActive() { return false; }
  update() {} camera() { return { x: 0, y: 0 }; } timeScale() { return 1; }
  frozen() { return false; } drawWorld() {} drawUI() {}
}
const nullAudio = { play() {}, setEnabled() {}, ensure() { return false; } };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function runMatch(cfgA, cfgB, rng, profiles = ['normal', 'normal']) {
  const controllers = [new AIController(profiles[0], rng), new AIController(profiles[1], rng)];
  const world = new FightWorld({
    cfgs: [cfgA, cfgB], controllers,
    fx: new NullFX(), audio: nullAudio, rng, settings: { events: true },
  });
  const events = new EventDirector(world, EVENTS, { enabled: true, difficulty: 'normal' });
  const wins = [0, 0];
  let rounds = 0;
  while (wins[0] < 2 && wins[1] < 2 && rounds < 9) {
    rounds++;
    world.resetRound();
    events.roundStart();
    let timer = ROUND_FRAMES;
    while (timer > 0) {
      for (const f of world.fighters) f.controller.update(f, world);
      world.update();
      events.update(timer);
      timer--;
      if (world.fighters.some(f => f.state === 'ko')) break;
    }
    const [a, b] = world.fighters;
    if (a.state === 'ko') wins[1]++;
    else if (b.state === 'ko') wins[0]++;
    else {
      const pa = a.hp / a.maxhp, pb = b.hp / b.maxhp;
      if (pa > pb) wins[0]++; else if (pb > pa) wins[1]++;   // % of max HP rule; true draw = extra round
    }
  }
  return wins[0] >= wins[1] ? 0 : 1;
}

export async function runSim(N, G, { seed = 1337, log = console.log } = {}) {
  const rng = mulberry32(seed);
  const n = CHARACTERS.length;
  const winsVs = Array.from({ length: n }, () => Array(n).fill(0));
  const games = N;
  const total = n * (n - 1) * games;
  let done = 0;

  log(`[sim] ${total} matches (${games} per ordered pairing), seed ${seed}…`);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let k = 0; k < games; k++) {
        const w = runMatch(CHARACTERS[i], CHARACTERS[j], rng);
        if (w === 0) winsVs[i][j]++;
        done++;
      }
      await new Promise(r => setTimeout(r, 0));      // keep the page responsive
      drawProgress(G, done / total);
    }
  }

  // aggregates
  const agg = CHARACTERS.map((c, i) => {
    let won = 0, played = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      won += winsVs[i][j] + (games - winsVs[j][i]);
      played += games * 2;
    }
    return { id: c.id, name: c.name, winRate: won / played };
  });

  // stall-bot gate: does running away beat fighting?
  let stallWon = 0, stallPlayed = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      for (let k = 0; k < Math.max(2, (games / 2) | 0); k++) {
        if (runMatch(CHARACTERS[i], CHARACTERS[j], rng, ['stall', 'normal']) === 0) stallWon++;
        stallPlayed++;
      }
    }
    await new Promise(r => setTimeout(r, 0));
  }
  const stallWR = stallWon / stallPlayed;

  const results = {
    seed, gamesPerPairing: games,
    aggregate: agg.map(a => ({ ...a, winRate: +(a.winRate * 100).toFixed(1) })),
    matrix: winsVs.map((row, i) => ({ id: CHARACTERS[i].id, vs: row.map((w, j) => i === j ? '-' : `${w}/${games}`) })),
    stallBotWinRate: +(stallWR * 100).toFixed(1),
    gates: {
      band: agg.every(a => a.winRate >= 0.42 && a.winRate <= 0.58),
      stall: stallWR <= 0.55,
    },
  };

  log('[sim] aggregate win rates:');
  if (console.table) console.table(results.aggregate);
  log('[sim] matrix (row beats column, wins/games):');
  if (console.table) console.table(results.matrix);
  log(`[sim] stall-bot win rate: ${results.stallBotWinRate}% (gate: <=55%)`);
  log(`[sim] GATES: band=${results.gates.band ? 'PASS' : 'FAIL'} stall=${results.gates.stall ? 'PASS' : 'FAIL'}`);
  window.__SIM_RESULTS = results;
  drawResults(G, results);
  return results;
}

function drawProgress(G, p) {
  const c = G.renderer.ctx;
  c.fillStyle = '#f2e9d8'; c.fillRect(0, 0, 960, 540);
  c.fillStyle = '#2b2620';
  c.font = "700 26px 'Pixelify Sans'"; c.textAlign = 'center';
  c.fillText('BALANCE SIM RUNNING…', 480, 240);
  c.strokeStyle = '#2b2620'; c.lineWidth = 3; c.strokeRect(280, 270, 400, 22);
  c.fillStyle = '#c4452e'; c.fillRect(283, 273, 394 * p, 16);
}

function drawResults(G, r) {
  const c = G.renderer.ctx;
  c.fillStyle = '#f2e9d8'; c.fillRect(0, 0, 960, 540);
  c.fillStyle = '#2b2620';
  c.font = "700 30px 'Pixelify Sans'"; c.textAlign = 'center';
  c.fillText('BALANCE SIM RESULTS', 480, 60);
  c.font = "700 16px 'Silkscreen'";
  r.aggregate
    .slice()
    .sort((a, b) => b.winRate - a.winRate)
    .forEach((a, i) => {
      const ok = a.winRate >= 42 && a.winRate <= 58;
      c.fillStyle = ok ? '#2b2620' : '#c4452e';
      c.textAlign = 'left';
      c.fillText(a.name.padEnd(8, ' '), 300, 120 + i * 36);
      c.textAlign = 'right';
      c.fillText(`${a.winRate.toFixed(1)}%`, 640, 120 + i * 36);
    });
  c.textAlign = 'center';
  c.fillStyle = r.gates.band && r.gates.stall ? '#3f5a40' : '#c4452e';
  c.fillText(`BAND ${r.gates.band ? 'PASS' : 'FAIL'} · STALL-BOT ${r.stallBotWinRate}% ${r.gates.stall ? 'PASS' : 'FAIL'}`, 480, 480);
}
