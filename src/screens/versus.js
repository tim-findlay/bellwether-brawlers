// v3 match screen (Phase 2): MovementBody + MatchState + Camera on real stage
// geometry. Dev-flagged via ?graybox=<stageId> for now; becomes the fight
// screen when Phase 3 ports the characters. Stage art is geometry-fidelity —
// the real paint arrives with the rig.

import { MatchState } from '../engine/match.js';
import { Camera } from '../engine/camera.js';
import { P1MAP, P2MAP, PlayerController, buildIntent } from '../engine/input.js';
import { stageById, geometryOf } from '../data/stages.js';
import { PRESETS, drawBody } from '../dev/graybox.js';

const PAPER = '#f2e9d8', INK = '#2b2620', NAVY = '#27425f', BRICK = '#c4452e', BRASS = '#c9a227';

export function makeVersus(G) {
  const c = G.canvas.getContext('2d');
  const ctl1 = new PlayerController(G.input, P1MAP);
  const ctl2 = new PlayerController(G.input, P2MAP);
  let stage, geo, match, camera, banner = null, paused = false;

  const start = (stageId) => {
    const id = geometryOf(stageId) ? stageId : 'office';   // bogus ?graybox=<id> falls back
    stage = stageById(id);
    geo = geometryOf(id);
    match = new MatchState(geo, [PRESETS[2], PRESETS[2]]);
    camera = new Camera(960, 540, geo.cameraBounds);
    banner = { text: stage.name, t: 90 };
  };

  const targets = () => match.players.map(p =>
    p.respawn ? { x: p.respawn.x, y: p.respawn.y } : { x: p.body.x, y: p.body.y - 48 });

  return {
    enter(p) { paused = false; start(p?.stageId ?? 'office'); },
    update() {
      if (G.input.backPressed()) paused = !paused;
      if (paused) { if (G.input.keyPressed('KeyQ')) G.go('title'); return; }
      if (match.over && G.input.keyPressed('KeyR')) start(stage.id);
      const i1 = buildIntent(ctl1, G.input, P1MAP);
      const i2 = buildIntent(ctl2, G.input, P2MAP);
      match.update([i1, i2]);
      [ctl1, ctl2].forEach((ctl, i) => {
        const p = match.players[i];
        if (p.respawn) return;                 // parked body: its consumed* flags are stale
        if (p.body.consumedJump) ctl.consume('up');
        if (p.body.consumedDodge) ctl.consume('dodge');
      });
      for (const ev of match.events.splice(0)) {
        if (ev.type === 'ko') { G.fx.shake(5, 12); banner = { text: 'STOCK LOST!', t: 70 }; G.audio.play('ko'); }
        if (ev.type === 'gameover') { banner = { text: ev.winner < 0 ? 'DRAW!' : `GAME! P${ev.winner + 1} WINS`, t: 9999 }; G.audio.play('bell'); }
      }
      camera.update(targets());
      if (banner && banner.t > 0) banner.t--;
    },
    draw() {
      // sky
      const grad = c.createLinearGradient(0, 0, 0, 540);
      grad.addColorStop(0, stage.sky[0]); grad.addColorStop(1, stage.sky[1]);
      Camera.reset(c);
      c.fillStyle = grad; c.fillRect(0, 0, 960, 540);
      // world
      const shake = G.fx.camera();
      camera.apply(c, shake.x * 2, shake.y * 2);
      c.strokeStyle = BRICK; c.setLineDash([10, 8]); c.lineWidth = 3 / camera.zoom;
      c.strokeRect(geo.blast.left, geo.blast.top, geo.blast.right - geo.blast.left, geo.blast.bottom - geo.blast.top);
      c.setLineDash([]);
      c.fillStyle = stage.groundFill;
      for (const s of geo.slabs) { c.fillRect(s.x, s.y, s.w, s.h); c.strokeStyle = INK; c.lineWidth = 2 / camera.zoom; c.strokeRect(s.x, s.y, s.w, s.h); }
      c.fillStyle = INK;
      for (const p of geo.platforms) c.fillRect(p.x, p.y, p.w, 6);
      match.players.forEach((p, i) => {
        const color = i === 0 ? NAVY : BRICK;
        if (p.respawn) {                       // the office chair
          c.fillStyle = INK;
          c.fillRect(p.respawn.x - 22, p.respawn.y + 4, 44, 8);
          c.fillRect(p.respawn.x - 3, p.respawn.y + 12, 6, 16);
          c.fillStyle = color; c.globalAlpha = 0.85;
          c.fillRect(p.respawn.x - 18, p.respawn.y - 92, 36, 96);
          c.globalAlpha = 1;
        } else drawBody(c, p.body, color);
      });
      Camera.reset(c);
      this.drawHud();
    },
    drawHud() {
      // off-screen arrows
      match.players.forEach((p, i) => {
        if (p.respawn) return;
        const s = camera.worldToScreen(p.body.x, p.body.y - 48);
        if (s.x >= 0 && s.x <= 960 && s.y >= 0 && s.y <= 540) return;
        const ax = Math.min(930, Math.max(30, s.x)), ay = Math.min(510, Math.max(30, s.y));
        c.fillStyle = i === 0 ? NAVY : BRICK;
        c.beginPath(); c.arc(ax, ay, 12, 0, Math.PI * 2); c.fill();
        c.fillStyle = PAPER; c.font = 'bold 13px monospace'; c.textAlign = 'center';
        c.fillText(`P${i + 1}`, ax, ay + 4);
      });
      // plates: composure bar (full until Phase 3) + stock pips
      match.players.forEach((p, i) => {
        const x = i === 0 ? 30 : 930 - 300;
        c.fillStyle = PAPER; c.fillRect(x, 18, 300, 54);
        c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, 18, 300, 54);
        c.fillStyle = '#3f5a40'; c.fillRect(x + 8, 26, 284, 16);   // full gauge (combat = Phase 3)
        for (let s = 0; s < 3; s++) {                              // desk-chair stock pips
          const px = x + 12 + s * 24, py = 52;
          c.fillStyle = s < p.stocks ? INK : 'rgba(43,38,32,0.25)';
          c.fillRect(px, py, 14, 10); c.fillRect(px + 5, py + 10, 4, 5);
        }
        c.fillStyle = INK; c.font = 'bold 13px monospace'; c.textAlign = i === 0 ? 'left' : 'right';
        c.fillText(`P${i + 1}`, i === 0 ? x + 8 : x + 292, 14);
      });
      if (banner && banner.t > 0) {
        c.fillStyle = PAPER; c.fillRect(330, 88, 300, 46);
        c.strokeStyle = INK; c.strokeRect(330, 88, 300, 46);
        c.fillStyle = INK; c.font = 'bold 20px monospace'; c.textAlign = 'center';
        c.fillText(banner.text, 480, 118);
      }
      if (match.over) {
        c.fillStyle = INK; c.font = '14px monospace'; c.textAlign = 'center';
        c.fillText('[R] rematch   [Esc] pause -> [Q] quit', 480, 520);
      }
      if (paused) {
        c.fillStyle = 'rgba(43,38,32,0.55)'; c.fillRect(0, 0, 960, 540);
        c.fillStyle = PAPER; c.font = 'bold 22px monospace'; c.textAlign = 'center';
        c.fillText('PAUSED — [Q] quit, [Esc] resume', 480, 270);
      }
    },
  };
}
