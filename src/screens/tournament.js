// Office tournament: set up a 4- or 8-entrant bracket (any fighter, each a
// player or a CPU), then play it out through the normal VS splash -> fight ->
// results flow (results offers CONTINUE, which lands back here with the
// winning side). CPU-vs-CPU matches can be watched or simmed instantly. The
// champion's cup goes on the records board (G.cups). Bracket logic: ./bracket.js.

import { CHARACTERS, byId } from '../data/characters.js';
import { STAGES, stageById, geometryOf } from '../data/stages.js';
import { FightWorld } from '../engine/combat.js';
import { AIController } from '../engine/ai.js';
import { makeBracket, nextMatch, recordWin, champion, matchSides, sideToEntrant, roundName, roundCount } from './bracket.js';
import {
  backdrop, header, plaque, text, chip, stamp, hints, fighter, floorShadow, trophy, makeNav,
  F, INK, PAPER, BRICK, NAVY, BRASS, CARD, MUTED, RULE,
} from '../render/ui.js';

const STAGE_IDS = STAGES.filter(s => s.selectable).map(s => s.id);
const IDS = CHARACTERS.map(c => c.id);
const QUIET = new Proxy({}, { get: () => () => {} });     // a simmed match needs fx/audio shapes, not output
const SIM_CAP = 10800;                                     // 3 minutes, like the balance sim

export function makeTournament(G) {
  let phase = 'setup', t = 0, size = 8, row = 0, flash = 0, slots;
  const nav = makeNav(G);
  const reset = () => { slots = IDS.map((id, i) => ({ id, human: i === 0 })); row = 0; };
  reset();
  const rows = () => size + 3;                              // size, the slots, shuffle, start
  const confirm = () => G.input.confirmPressed();

  function start() {
    G.tour = { b: makeBracket(slots.slice(0, size), STAGE_IDS), pending: null };
    phase = 'bracket'; t = 0;
    G.audio.play('roundGo');
  }
  function play() {
    const b = G.tour.b, n = nextMatch(b), s = matchSides(b, n.r, n.m);
    G.tour.pending = n;
    G.go('splash', { mode: 'tour', tour: true, p1: s.p1, p2: s.p2, c1: s.c1, c2: s.c2, stageId: s.stageId });
  }
  // CPU v CPU: fight it out headless at the chosen difficulty; a timeout goes to stocks, then composure
  function sim() {
    const b = G.tour.b, n = nextMatch(b), s = matchSides(b, n.r, n.m), rng = G.rng;
    const ctl = [new AIController(G.settings.difficulty, rng), new AIController(G.settings.difficulty, rng)];
    const w = new FightWorld({ cfgs: [byId(s.p1), byId(s.p2)], controllers: ctl, stage: geometryOf(s.stageId), fx: QUIET, audio: QUIET, rng, settings: {} });
    for (let i = 0; i < SIM_CAP && !w.over; i++) { for (const f of w.fighters) f.controller.update(f, w); w.update(); }
    const [f0, f1] = w.fighters;
    const side = w.over && w.winner >= 0 ? w.winner
      : f0.stocks !== f1.stocks ? (f0.stocks > f1.stocks ? 0 : 1) : (f0.gauge / f0.maxGauge >= f1.gauge / f1.maxGauge ? 0 : 1);
    const wid = side === 0 ? s.p1 : s.p2;                    // a simmed match is still a match settled on this machine
    G.scores[wid] = (G.scores[wid] || 0) + 1; G.saveScores();
    result(side);
    G.audio.play('bell');
  }
  function result(side) {
    const b = G.tour.b, { r, m } = nextMatch(b), e = sideToEntrant(b, r, m, side);
    recordWin(b, r, m, e);
    G.tour.pending = null; flash = 40;
    const ch = champion(b);
    if (ch !== null) {
      const id = b.entrants[ch].id;
      G.cups[id] = (G.cups[id] || 0) + 1; G.saveCups();
      phase = 'champ'; t = 0;
    }
  }

  return {
    enter(p = {}) {
      t = 0;
      if (p.winnerSide != null && G.tour?.pending) { phase = 'bracket'; result(p.winnerSide); }
      else phase = G.tour && champion(G.tour.b) === null ? 'bracket' : 'setup';
      if (phase === 'setup') { G.tour = null; row = Math.min(row, rows() - 1); }
    },

    update() {
      t++; if (flash > 0) flash--;
      if (t < 12) return;
      if (phase === 'setup') return this.updateSetup();
      if (phase === 'champ') {
        if (t > 60 && (confirm() || G.input.backPressed())) { G.audio.play('menuConfirm'); G.tour = null; G.go('menu'); }
        return;
      }
      const n = nextMatch(G.tour.b), s = n && matchSides(G.tour.b, n.r, n.m), cpuOnly = s && s.c1 === 'cpu' && s.c2 === 'cpu';
      if (G.input.keyPressed('Space') && cpuOnly) sim();
      else if (confirm() || G.input.keyPressed('Space')) { G.audio.play('menuConfirm'); play(); }
      else if (G.input.keyPressed('KeyR')) { G.audio.play('menuBack'); G.tour = null; phase = 'setup'; }
      else if (G.input.backPressed()) { G.audio.play('menuBack'); G.go('menu'); }
    },

    updateSetup() {
      const { dx, dy } = nav();
      if (dy) { row = (row + dy + rows()) % rows(); G.audio.play('menuMove'); }
      const slot = row - 1;
      if (row === 0 && dx) { size = size === 8 ? 4 : 8; G.audio.play('menuMove'); }
      else if (slot >= 0 && slot < size && dx) {
        const s = slots[slot]; s.id = IDS[(IDS.indexOf(s.id) + dx + IDS.length) % IDS.length]; G.audio.play('menuMove');
      }
      if (confirm() || G.input.keyPressed('Space')) {
        if (slot >= 0 && slot < size) { slots[slot].human = !slots[slot].human; G.audio.play('pop'); }
        else if (row === size + 1) {                           // shuffle the seeds
          for (let i = size - 1; i > 0; i--) { const j = Math.floor(G.rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
          G.audio.play('menuConfirm');
        } else if (row === size + 2) start();
      }
      if (G.input.backPressed()) { G.audio.play('menuBack'); G.go('menu'); }
    },

    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(c, G, stageById(phase === 'champ' ? 'palace' : 'office'), t, { wash: 0.8 });
      if (phase === 'setup') this.drawSetup(c);
      else if (phase === 'bracket') this.drawBracket(c);
      else this.drawChamp(c);
    },

    drawSetup(c) {
      header(c, 'OFFICE TOURNAMENT', { sub: 'single elimination · one cup' });
      const sel0 = row === 0;
      plaque(c, 60, 90, 840, 42, { fill: sel0 ? INK : CARD, shadow: sel0 ? 0 : 4 });
      text(c, 'BRACKET', 84, 118, { font: F.head(20), align: 'left', color: sel0 ? PAPER : INK });
      [[4, '4 ENTRANTS'], [8, '8 ENTRANTS']].forEach(([n, label], i) => {
        const x = 700 + i * 96, on = size === n;
        c.fillStyle = on ? (sel0 ? BRASS : NAVY) : (sel0 ? '#4a4239' : '#e6dcc4'); c.fillRect(x, 100, 90, 24);
        text(c, label, x + 45, 117, { font: F.mono(11), color: on ? PAPER : (sel0 ? '#b8ad93' : MUTED) });
      });
      // first-round matches, one per line: seed 2k v seed 2k+1
      for (let i = 0; i < size; i++) {
        const k = i >> 1, left = i % 2 === 0, x = left ? 60 : 530, y = 146 + k * 66, sel = row === i + 1, s = slots[i], cfg = byId(s.id);
        plaque(c, x, y, 370, 58, { fill: sel ? INK : CARD, shadow: sel ? 0 : 4 });
        fighter(c, G, cfg, x + 36, y + 55, 0.78, { t: t + i * 9, facing: left ? 1 : -1 });
        text(c, `#${i + 1}`, x + 76, y + 22, { font: F.mono(11), align: 'left', color: sel ? '#b8ad93' : MUTED });
        text(c, cfg.name, x + 76, y + 44, { font: F.head(22), align: 'left', color: sel ? PAPER : INK });
        chip(c, s.human ? 'PLAYER' : 'CPU', x + 356, y + 21, s.human ? BRICK : NAVY, { align: 'right' });
        if (left) text(c, 'V', 480, y + 38, { font: F.head(24), color: INK });
      }
      const by = 146 + (size / 2) * 66 + 8;
      [['SHUFFLE SEEDS', size + 1], ['START', size + 2]].forEach(([label, r], i) => {
        const sel = row === r, x = 270 + i * 230;
        plaque(c, x, by - (sel ? 3 : 0), 200, 42, { fill: sel ? BRICK : CARD, shadow: sel ? 6 : 4 });
        text(c, label, x + 100, by + 28 - (sel ? 3 : 0), { font: F.head(20), color: sel ? PAPER : INK });
      });
      const humans = slots.slice(0, size).filter(s => s.human).length;
      text(c, humans ? `${humans} player${humans > 1 ? 's' : ''}: a lone player is always P1; two players meeting take P1 and P2` : 'All CPUs: watch it or sim it', 480, 492, { font: F.body(15), color: MUTED });
      hints(c, [[['W', 'S'], 'Move'], [['A', 'D'], 'Fighter / size'], ['ENTER', 'Player / CPU'], [['ESC', '○'], 'Back']], 522);
    },

    drawBracket(c) {
      const b = G.tour.b, R = roundCount(b), n = nextMatch(b), s = n && matchSides(b, n.r, n.m);
      header(c, 'THE BRACKET', { sub: n ? `${roundName(b, n.r)} · ${stageById(s.stageId)?.name ?? ''}` : '' });
      const colW = 840 / (R + 1), top = 100, span = 360, bw = colW - 30;
      const yOf = (r, m) => top + span * (m + 0.5) / b.rounds[0].length * Math.pow(2, r);
      for (let r = 0; r < R; r++) {
        const count = b.entrants.length >> (r + 1), x = 60 + r * colW;
        text(c, roundName(b, r), x + bw / 2, top - 8, { font: F.mono(11), color: MUTED });
        for (let m = 0; m < count; m++) {
          const mt = b.rounds[r]?.[m], y = yOf(r, m), live = n && n.r === r && n.m === m;
          if (live) { c.fillStyle = (t >> 4) & 1 ? BRASS : '#e3c86a'; c.fillRect(x - 5, y - 33, bw + 10, 66); }
          [mt?.a, mt?.b].forEach((e, k) => {
            const yy = y - 29 + k * 30, ent = e != null ? b.entrants[e] : null, won = mt?.w != null && mt.w === e, lost = mt?.w != null && mt.w !== e;
            plaque(c, x, yy, bw, 26, { fill: won ? INK : CARD, shadow: 2, lw: 2 });
            text(c, ent ? byId(ent.id).name : '—', x + 10, yy + 19, { font: F.head(16), align: 'left', color: won ? PAPER : lost ? RULE : INK });
            if (ent?.human) chip(c, 'P', x + bw - 6, yy + 5, BRICK, { align: 'right', font: F.mono(9) });
            if (lost) { c.fillStyle = RULE; c.fillRect(x + 8, yy + 13, Math.min(bw - 30, 90), 2); }
          });
          if (r < R - 1) { c.fillStyle = INK; c.fillRect(x + bw, y, 15, 2); c.fillRect(x + bw + 14, Math.min(y, yOf(r + 1, m >> 1)), 2, Math.abs(yOf(r + 1, m >> 1) - y) + 2); c.fillRect(x + bw + 14, yOf(r + 1, m >> 1), 16, 2); }
        }
      }
      const cx = 60 + R * colW + bw / 2, ch = champion(b);
      trophy(c, G, cx, top + span / 2 - 30, 84);
      text(c, ch != null ? byId(b.entrants[ch].id).name : 'THE CUP', cx, top + span / 2 + 72, { font: F.head(20), color: ch != null ? INK : MUTED });
      if (flash > 0) stamp(c, 'RESULT IN', 480, 300, { color: BRICK, size: 30, alpha: Math.min(1, flash / 20) });
      const cpuOnly = s && s.c1 === 'cpu' && s.c2 === 'cpu';
      if (s) text(c, `NEXT: ${byId(s.p1).name} (${s.c1 === 'cpu' ? 'CPU' : 'P1'})  v  ${byId(s.p2).name} (${s.c2 === 'cpu' ? 'CPU' : 'P2'})`, 480, 488, { font: F.head(20), color: INK });
      hints(c, [['ENTER', cpuOnly ? 'Watch' : 'Play'], ...(cpuOnly ? [['SPACE', 'Sim it']] : []), ['R', 'New bracket'], ['ESC', 'Menu']], 522);
    },

    drawChamp(c) {
      const b = G.tour.b, e = b.entrants[champion(b)], cfg = byId(e.id), cups = G.cups[e.id] || 0;
      floorShadow(c, 330, 430, 150);
      fighter(c, G, cfg, 330, 430, 4.4, { anim: 'win', t, facing: 1 });
      trophy(c, G, 650, 170, 120);
      text(c, cfg.name, 650, 318, { font: F.head(56), color: INK });
      stamp(c, 'OFFICE CHAMPION', 650, 382, { color: BRICK, size: 32 });
      text(c, `${cups} cup${cups === 1 ? '' : 's'} on this machine`, 650, 446, { font: F.body(18), color: MUTED });
      hints(c, [['ENTER', 'Main menu']], 522);
    },
  };
}
