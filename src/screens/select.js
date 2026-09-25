// Character select → stage select. The roster strip shows every fighter as
// they play (idle sprite, drawn body as the fallback); two player panels show
// the hovered or locked fighter large with stats and moves. Versus CPU: P1
// picks their fighter, then the opponent. Local Versus: both players pick at
// once on their own keys (P1 WASD + F, P2 arrows + K). Then the arena
// carousel, built from the real stage art, and on to the VS splash.

import { CHARACTERS } from '../data/characters.js';
import { SELECTABLE_STAGES } from '../data/stages.js';
import {
  backdrop, header, plaque, text, chip, stamp, hints, fighter, floorShadow, statBar, statFrac, vsBadge,
  stageThumb, stageMap, makeNav, P1_DIRS, P2_DIRS, confirmP1, confirmP2, wrap,
  F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, CARD, MUTED, RULE, SIDE,
} from '../render/ui.js';

const N = CHARACTERS.length;
const TILE = 104, TGAP = 8, TX = (960 - (N * TILE + (N - 1) * TGAP)) / 2, TY = 90;
const READY_HOLD = 36;                      // frames the READY stamps show before the arena pick

export function makeSelect(G) {
  let mode = 'cpu', phase = 'fighters', t = 0, readyT = 0, lastMover = 0;
  let cursor = [0, 1], locked = [false, false], lockT = [0, 0];
  let stageIdx = 0, stageT = 0;
  const navAny = makeNav(G), navP1 = makeNav(G, P1_DIRS), navP2 = makeNav(G, P2_DIRS);

  const active = () => (mode === 'cpu' ? (locked[0] ? 1 : 0) : -1);

  function move(side, dx) {
    if (!dx || locked[side]) return;
    cursor[side] = (cursor[side] + dx + N) % N;
    lastMover = side;
    G.audio.play('menuMove');
  }
  function lock(side) {
    if (locked[side]) return;
    locked[side] = true; lockT[side] = 0; lastMover = side;
    G.audio.play('menuConfirm');
  }
  function unlockLast() {
    const side = locked[1] ? 1 : locked[0] ? 0 : -1;
    if (side < 0) return false;
    locked[side] = false; readyT = 0;
    G.audio.play('menuBack');
    return true;
  }
  function randomFor(side) {
    if (locked[side]) return;
    cursor[side] = Math.floor(G.rng() * N); lastMover = side;
    G.audio.play('pop');
  }

  return {
    enter(params) {
      mode = params?.mode || 'cpu';
      phase = 'fighters'; t = 0; readyT = 0;
      locked = [false, false]; lockT = [0, 0];
      if (params?.keep) { cursor = [CHARACTERS.findIndex(c => c.id === params.keep[0]), CHARACTERS.findIndex(c => c.id === params.keep[1])]; }
      else cursor = [0, 1];
    },

    update() {
      t++; lockT[0]++; lockT[1]++;
      if (phase === 'fighters') this.updateFighters();
      else this.updateStage();
    },

    updateFighters() {
      if (mode === 'cpu') {
        const side = active(), { dx } = navAny();
        move(side, dx);
        if (G.input.keyPressed('KeyR')) randomFor(side);
        if (G.input.confirmPressed() || G.input.keyPressed('Space')) lock(side);
      } else {
        move(0, navP1().dx); move(1, navP2().dx);
        if (G.input.keyPressed('KeyR')) randomFor(0);
        if (G.input.keyPressed('Backslash')) randomFor(1);
        if (confirmP1(G)) lock(0);
        if (confirmP2(G)) lock(1);
      }
      if (G.input.backPressed() && !unlockLast()) { G.audio.play('menuBack'); G.go('menu'); return; }
      if (locked[0] && locked[1]) {
        if (++readyT >= READY_HOLD) { phase = 'stage'; stageT = 0; G.audio.play('menuConfirm'); }
      } else readyT = 0;
    },

    updateStage() {
      stageT++;
      const { dx } = navAny();
      if (dx) { stageIdx = (stageIdx + dx + SELECTABLE_STAGES.length) % SELECTABLE_STAGES.length; stageT = 0; G.audio.play('menuMove'); }
      if (G.input.keyPressed('KeyR')) { stageIdx = Math.floor(G.rng() * SELECTABLE_STAGES.length); stageT = 0; G.audio.play('pop'); }
      if (G.input.confirmPressed() || G.input.keyPressed('Space')) {
        G.audio.play('menuConfirm');
        G.go('splash', { mode, p1: CHARACTERS[cursor[0]].id, p2: CHARACTERS[cursor[1]].id, stageId: SELECTABLE_STAGES[stageIdx].id });
        return;
      }
      if (G.input.backPressed()) { phase = 'fighters'; locked[1] = false; readyT = 0; G.audio.play('menuBack'); }
    },

    draw() {
      const c = G.renderer.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (phase === 'fighters') this.drawFighters(c);
      else this.drawStage(c);
    },

    // ---- fighter select --------------------------------------------------------

    drawFighters(c) {
      backdrop(c, G, SELECTABLE_STAGES[0], t, { wash: 0.78 });
      header(c, 'CHOOSE YOUR FIGHTER', { sub: mode === 'cpu' ? 'VERSUS CPU' : 'LOCAL VERSUS' });

      CHARACTERS.forEach((cfg, i) => {
        const x = TX + i * (TILE + TGAP), y = TY;
        const on = [0, 1].filter(s => cursor[s] === i && (mode === '2p' || s <= Math.max(0, active())));
        plaque(c, x, y, TILE, TILE, { fill: on.length ? '#efe3c2' : CARD, shadow: 4, lw: 2 });
        c.fillStyle = '#e9dfc7'; c.fillRect(x + 4, y + 4, TILE - 8, TILE - 26);
        fighter(c, G, cfg, x + TILE / 2, y + TILE - 20, 1.25, { t: t + i * 11 });
        c.fillStyle = INK; c.fillRect(x + 2, y + TILE - 22, TILE - 4, 20);
        text(c, cfg.name, x + TILE / 2, y + TILE - 7, { font: F.head(15), color: PAPER });
        for (const s of on) {
          const col = SIDE[s];
          c.strokeStyle = col; c.lineWidth = 5;
          const inset = s === 1 && on.length === 2 ? 6 : 0;
          c.strokeRect(x - 3 + inset, y - 3 + inset, TILE + 6 - inset * 2, TILE + 6 - inset * 2);
          chip(c, s === 0 ? 'P1' : mode === 'cpu' ? 'CPU' : 'P2', s === 0 ? x - 3 : x + TILE + 3, y - 20, col, { align: s === 0 ? 'left' : 'right' });
        }
      });

      this.panel(c, 0, 30);
      this.panel(c, 1, 510);
      vsBadge(c, G, 480, 342, 92, 99);

      const who = CHARACTERS[cursor[lastMover]];
      plaque(c, 30, 488, 900, 26, { fill: INK, shadow: 0, lw: 0 });
      text(c, `HOW TO BEAT ${who.name}: ${who.tip}`, 480, 506, { font: F.body(15), color: PAPER });
      const keys = mode === 'cpu'
        ? [[['A', 'D'], 'Choose'], [['ENTER', 'F'], 'Lock in'], ['R', 'Random'], ['ESC', 'Back']]
        : [[['A', 'D'], 'P1'], ['F', 'Lock'], [['←', '→'], 'P2'], ['K', 'Lock'], [['R', '\\'], 'Random'], ['ESC', 'Back']];
      hints(c, keys, 532);
    },

    panel(c, side, x) {
      const w = 420, y = 214, h = 266;
      const col = SIDE[side];
      const waiting = mode === 'cpu' && side === 1 && !locked[0];
      const cfg = CHARACTERS[cursor[side]];
      plaque(c, x, y, w, h, { fill: CARD, shadow: 6 });
      c.fillStyle = col; c.fillRect(x + 3, y + 3, w - 6, 8);

      // fighter stand: P1 on the left of the panel, P2 on the right, facing in
      const sx = side === 0 ? x + 16 : x + w - 176;
      c.fillStyle = '#ece2cb'; c.fillRect(sx, y + 20, 160, 234);
      c.fillStyle = RULE; c.fillRect(sx, y + 242, 160, 12);
      const cx = sx + 80, fy = y + 244;
      if (waiting) {
        const ghost = CHARACTERS[((t / 12) | 0) % N];
        fighter(c, G, ghost, cx, fy, 3.1, { t, facing: -1, tint: INK });
        text(c, '?', cx, y + 140, { font: F.head(64), color: PAPER });
      } else {
        floorShadow(c, cx, fy - 2, 80);
        const atk = locked[side] && lockT[side] < 26;
        fighter(c, G, cfg, cx, fy, 3.1, { anim: atk ? 'attack' : 'idle', t: atk ? lockT[side] : t, facing: side === 0 ? 1 : -1 });
      }

      // info column
      const ix = side === 0 ? x + 192 : x + 16, iw = 212;
      const tag = side === 0 ? 'PLAYER 1' : mode === 'cpu' ? 'CPU OPPONENT' : 'PLAYER 2';
      chip(c, tag, ix, y + 22, col);
      if (waiting) {
        text(c, 'WAITING…', ix, y + 84, { font: F.head(28), align: 'left', color: MUTED });
        wrap(c, 'Lock in your fighter, then choose who you want to fight.', iw, F.body(17)).forEach((ln, i) =>
          text(c, ln, ix, y + 116 + i * 22, { font: F.body(17), align: 'left', color: MUTED }));
        return;
      }
      text(c, cfg.name, ix, y + 76, { font: F.head(34), align: 'left' });
      text(c, cfg.title, ix, y + 96, { font: F.mono(10), align: 'left', color: col });
      text(c, cfg.archetype, ix, y + 116, { font: F.body(16), align: 'left', color: MUTED });
      const st = cfg.stats;
      statBar(c, ix, y + 128, iw, 'COMPOSURE', statFrac(CHARACTERS, 'gauge', st.gauge), GREEN);
      statBar(c, ix, y + 146, iw, 'SPEED', statFrac(CHARACTERS, 'runMax', st.runMax), NAVY);
      statBar(c, ix, y + 164, iw, 'AIR', statFrac(CHARACTERS, 'jumpImpulse', st.jumpImpulse), BRASS);
      statBar(c, ix, y + 182, iw, 'WEIGHT', statFrac(CHARACTERS, 'weight', st.weight), BRICK);
      text(c, 'SPECIALS', ix, y + 210, { font: F.mono(9), align: 'left', color: MUTED });
      text(c, `${cfg.s1.name} · ${cfg.s2.name}`, ix, y + 229, { font: F.body(15, 700), align: 'left' });
      text(c, 'SUPER', ix, y + 248, { font: F.mono(9), align: 'left', color: MUTED });
      text(c, cfg.super.name.toUpperCase(), ix + 44, y + 249, { font: F.head(15), align: 'left', color: col });
      if (locked[side]) stamp(c, 'READY!', x + w / 2, y + 150, { color: col, size: 34, rot: side ? 0.1 : -0.1, alpha: Math.min(1, lockT[side] / 6) });
    },

    // ---- stage select -----------------------------------------------------------

    drawStage(c) {
      const S = SELECTABLE_STAGES, st = S[stageIdx];
      backdrop(c, G, st, t, { wash: 0.7 });
      header(c, 'CHOOSE YOUR ARENA', { sub: `${stageIdx + 1} / ${S.length}` });

      // neighbours
      const prev = S[(stageIdx - 1 + S.length) % S.length], next = S[(stageIdx + 1) % S.length];
      for (const [s, x] of [[prev, 34], [next, 796]]) {
        plaque(c, x, 150, 130, 80, { fill: INK, shadow: 4, lw: 0 });
        stageThumb(c, G, s, x + 4, 154, 122, 69, t);
        c.globalAlpha = 0.35; c.fillStyle = PAPER; c.fillRect(x + 4, 154, 122, 69); c.globalAlpha = 1;
        text(c, s.name, x + 65, 248, { font: F.mono(9), color: INK });
      }
      text(c, '◀', 190, 262, { font: F.body(40, 700), color: INK });
      text(c, '▶', 770, 262, { font: F.body(40, 700), color: INK });

      // the pick: zoom-in on change
      const k = Math.min(1, stageT / 10), w = 500 + 40 * k, h = Math.round(w * 9 / 16);
      const px = 480 - w / 2, py = 96 + (22 - 22 * k) / 2;
      plaque(c, px - 6, py - 6, w + 12, h + 12, { fill: INK, shadow: 7, lw: 0 });
      stageThumb(c, G, st, px, py, w, h, t);

      // name, blurb, layout map
      plaque(c, 210, 414, 540, 70, { fill: CARD, shadow: 5 });
      text(c, st.name, 230, 446, { font: F.head(28), align: 'left' });
      text(c, st.blurb, 230, 470, { font: F.body(17), align: 'left', color: MUTED });
      c.fillStyle = '#efe7d3'; c.fillRect(592, 420, 150, 58);
      stageMap(c, st.id, 596, 424, 142, 50);
      S.forEach((_, i) => { c.fillStyle = i === stageIdx ? BRICK : RULE; c.fillRect(480 - S.length * 9 + i * 18, 492, 12, 6); });

      // the two fighters waiting either side
      const a = CHARACTERS[cursor[0]], b = CHARACTERS[cursor[1]];
      floorShadow(c, 96, 478, 70); floorShadow(c, 864, 478, 70);
      fighter(c, G, a, 96, 478, 2.3, { t, facing: 1 });
      fighter(c, G, b, 864, 478, 2.3, { t: t + 17, facing: -1 });
      chip(c, 'P1', 96, 300, NAVY, { align: 'center' });
      chip(c, mode === 'cpu' ? 'CPU' : 'P2', 864, 300, BRICK, { align: 'center' });

      hints(c, [[['A', 'D'], 'Choose'], [['ENTER', 'F'], 'Fight!'], ['R', 'Random'], ['ESC', 'Back']], 528);
    },
  };
}
