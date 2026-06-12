// Phase-1 movement playground (?graybox). Dev-only, dynamically imported.
// Draws straight to the 960x540 canvas — no v2 pixel buffer (v3 render path).
// Tuning loop: edit src/data/physics.js -> reload. 1/2/3 = body presets,
// R = reset both bodies. P2 keys drive the second body (the "dummy").

import { MovementBody } from '../engine/movement.js';
import { P1MAP, P2MAP, PlayerController, buildIntent } from '../engine/input.js';

const PAPER = '#f2e9d8', INK = '#2b2620', NAVY = '#27425f', BRICK = '#c4452e', BRASS = '#c9a227';

export function drawBody(c, b, color) {
  c.fillStyle = color;
  c.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
  c.fillStyle = b.invulnerable() ? BRASS : INK;    // facing tick / i-frame flag
  c.fillRect(b.x + b.facing * (b.w / 2 - 3), b.y - b.h + 12, 6, 10);
}

export const GRAYBOX_STAGE = {
  slabs: [{ x: 230, y: 380, w: 500, h: 70 }],
  // Low plats sit 110px up: a MID single jump rises ~104.5 — deliberately just
  // short, per DESIGN ("soft platforms reachable with jump -> double-jump").
  // If the playtest wants single-jump plats, lower these, don't buff jumps.
  platforms: [{ x: 290, y: 270, w: 140 }, { x: 530, y: 270, w: 140 }, { x: 410, y: 175, w: 140 }],
  // Blast lines sit INSIDE the 960x540 canvas so the dashed border is actually
  // visible — there is no camera until Phase 2. Real stages get bigger margins.
  blast: { left: 30, right: 930, top: 25, bottom: 515 },
  spawn: { x: 480, y: 380 },
};

export const PRESETS = {
  1: { name: 'FLOATY (nick-ish)', runMax: 3.7, jumpImpulse: 12, fallMax: 9, weight: 0.85 },
  2: { name: 'MID (tim-ish)',     runMax: 3.1, jumpImpulse: 11, fallMax: 11, weight: 1.0 },
  3: { name: 'HEAVY (mike-ish)',  runMax: 2.4, jumpImpulse: 10, fallMax: 13, weight: 1.45 },
};

export function makeGraybox(G) {
  const c = G.canvas.getContext('2d');
  const ctl1 = new PlayerController(G.input, P1MAP);
  const ctl2 = new PlayerController(G.input, P2MAP);
  let b1, b2, preset = 2, koFlash = 0;

  const reset = () => {
    b1 = new MovementBody(PRESETS[preset], { x: 400, y: 380 });
    b2 = new MovementBody(PRESETS[2], { x: 560, y: 380 });
  };

  const drive = (body, ctl, map) => {
    const intent = buildIntent(ctl, G.input, map);
    body.update(intent, GRAYBOX_STAGE);
    if (body.consumedJump) ctl.consume('up');
    if (body.consumedDodge) ctl.consume('dodge');
    if (body.out) {                                  // ring-out: instant respawn (stocks = Phase 2)
      koFlash = 8;
      const s = body.stats;
      Object.assign(body, new MovementBody(s, GRAYBOX_STAGE.spawn));
    }
  };

  return {
    enter() { reset(); },
    update() {
      for (const k of [1, 2, 3]) if (G.input.keyPressed(`Digit${k}`)) { preset = k; reset(); }
      if (G.input.keyPressed('KeyR')) reset();
      drive(b1, ctl1, P1MAP);
      drive(b2, ctl2, P2MAP);
      if (koFlash > 0) koFlash--;
    },
    draw() {
      c.fillStyle = koFlash > 0 ? '#fff7e6' : PAPER;
      c.fillRect(0, 0, 960, 540);
      // blast zones
      c.strokeStyle = BRICK; c.setLineDash([8, 6]); c.lineWidth = 2;
      const z = GRAYBOX_STAGE.blast;
      c.strokeRect(z.left, z.top, z.right - z.left, z.bottom - z.top);
      c.setLineDash([]);
      // surfaces
      c.fillStyle = '#b9b1a2';
      for (const s of GRAYBOX_STAGE.slabs) c.fillRect(s.x, s.y, s.w, s.h);
      c.fillStyle = INK;
      for (const p of GRAYBOX_STAGE.platforms) c.fillRect(p.x, p.y, p.w, 5);
      drawBody(c, b2, BRICK);
      drawBody(c, b1, NAVY);
      // debug readout
      c.fillStyle = INK; c.font = '14px monospace'; c.textAlign = 'left';
      const rows = [
        `P1 ${PRESETS[preset].name}  state:${b1.state}  vx:${b1.vx.toFixed(2)} vy:${b1.vy.toFixed(2)}`,
        `grounded:${b1.grounded} plat:${b1.onPlatform} airJumps:${b1.airJumps} airDodge:${b1.airDodgeOk}`,
        `dashCd:${b1.dashCd} dodgeCd:${b1.dodgeCd} coyote:${b1.coyoteT} fastFall:${b1.fastFalling}`,
        `[1/2/3] preset  [R] reset  — tune src/data/physics.js and reload`,
      ];
      rows.forEach((r, i) => c.fillText(r, 16, 22 + i * 18));
    },
  };
}
