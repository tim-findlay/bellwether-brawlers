// The fight screen (v3): FightWorld + Camera + EventDirector with the match
// flow (intro, stock banners, game over -> results), pause/help overlay and
// the juice. The world itself also runs headless in dev/sim.js.

import { songFor } from '../data/music.js';
import { FightWorld } from '../engine/combat.js';
import { Camera } from '../engine/camera.js';
import { EventDirector } from '../engine/events.js';
import { PlayerController, P1MAP, P2MAP } from '../engine/input.js';
import { AIController } from '../engine/ai.js';
import { byId } from '../data/characters.js';
import { stageById, geometryOf } from '../data/stages.js';
import { EVENTS } from '../data/events.js';
import { drawHUD } from '../render/hud.js';
import { drawHelp, HELP_TABS } from './help.js';
import { drawMoveList } from './movelist.js';
import { ComboTracker } from '../engine/practice.js';
import { plaque, text, menuList, hints, header, makeNav, F, INK, PAPER, BRICK, BRASS, MUTED, NAVY } from '../render/ui.js';

const PAUSE_ITEMS = [{ label: 'RESUME' }, { label: 'MOVE LIST' }, { label: 'HOW TO PLAY' }, { label: 'RESTART MATCH' }, { label: 'QUIT TO MENU' }];

const INTRO_FRAMES = 90;
const OUTRO_FRAMES = 150;

export function makeFight(G) {
  let world, events, camera, params, stage;
  let phase, phaseT, paused, t, ko, shownOverride = null;
  let pIdx = 0, pPage = 'list', pTab = 0, pSide = 0;
  let combos = [];                                   // [P1's combos on P2, P2's on P1] — the room should see them
  const pAnim = [];
  const nav = makeNav(G);

  function targets() {
    return world.fighters.filter(f => f.state !== 'ko').map(f => ({ x: f.x, y: f.y - 48 }));
  }

  return {
    enter(p) {
      params = p;
      stage = stageById(p.stageId) || stageById('office');
      const cfgs = [byId(p.p1), byId(p.p2)];
      // who drives each side: a tournament names them (c1/c2: 'human' | 'cpu'); otherwise P1 is a
      // player and P2 is a player in local versus, a CPU in versus CPU
      const ctl = (who, map) => (who === 'cpu' ? new AIController(G.settings.difficulty, G.rng) : new PlayerController(G.input, map));
      const c1 = ctl(p.c1 || 'human', P1MAP);
      const c2 = ctl(p.c2 || (p.mode === '2p' ? 'human' : 'cpu'), P2MAP);
      world = new FightWorld({ cfgs, controllers: [c1, c2], stage: geometryOf(stage.id), fx: G.fx, audio: G.audio, rng: G.rng, settings: G.settings });
      events = new EventDirector(world, EVENTS, { enabled: G.settings.events, difficulty: G.settings.difficulty, stageId: params.stageId });
      events.art = G.uiArt;                                  // event props (assets/ui/ev-*.png), optional
      if (G.devEvent) events.force(G.devEvent);
      camera = new Camera(960, 540, world.stage.cameraBounds);
      camera.update(targets()); camera.update(targets());
      combos = [new ComboTracker(world, world.fighters[0], world.fighters[1]), new ComboTracker(world, world.fighters[1], world.fighters[0])];
      phase = 'intro'; phaseT = 0; paused = false; t = 0; ko = null; shownOverride = null;
      G.audio.play('roundGo');
    },

    update() {
      t++;
      if (params.demo && t > 20 && G.input.anyPressed()) { G.go('title'); return; }   // attract mode: any key hands the TV back
      if (paused) { this.updatePause(); return; }
      if (G.input.pausePressed() && phase !== 'outro') {   // Esc, or a pad's Create / Options (○ is heavy here)
        paused = true; pIdx = 0; pPage = 'list'; G.audio.play('menuBack');
        return;
      }

      if (phase === 'intro') {
        phaseT++;
        for (const f of world.fighters) f.animT++;
        camera.update(targets());
        if (phaseT >= INTRO_FRAMES) phase = 'fight';
        return;
      }

      if (phase === 'fight') {
        if (G.fx.frozen()) return;                    // hitstop
        for (const f of world.fighters) f.controller.update?.(f, world);
        world.update();
        for (const k of combos) k.update();
        events.update();
        for (const f of world.fighters) if (f.hasStatus('noMeter') && t % 20 === 0) G.fx.confetti(f.x, f.y - 90, 3);
        for (const ev of world.events.splice(0)) {
          if (ev.type === 'ko') {
            const loser = world.fighters[ev.player];
            G.audio.play('ko'); G.audio.play('stockLost');
            G.fx.shake(5, 12); G.fx.flash('#f2e9d8', 6);
            G.fx.banner(ev.stocksLeft === 1 ? 'LAST STOCK!' : 'STOCK LOST!', { dur: 60, sub: `${loser.cfg.name} · ${ev.stocksLeft} left` });
          } else if (ev.type === 'gameover') {
            phase = 'outro'; phaseT = 0; ko = ev;
            G.audio.play('bell');
            G.fx.slowmo(0.3, 50); G.fx.flash('#f2e9d8', 8); G.fx.shake(6, 16);
            G.fx.banner(ev.winner < 0 ? 'DRAW!' : 'GAME!', { dur: 120, sub: ev.winner < 0 ? 'double ring-out' : `${world.fighters[ev.winner].cfg.name} takes it` });
          }
        }
        G.music?.setIntensity(world.fighters.some(f => f.stocks === 1) ? 1 : 0);   // last stock: the extra layers come in
        if (events.stageOverride !== shownOverride) {          // Berlin swap: re-bound the camera to the new geometry
          shownOverride = events.stageOverride;
          G.music?.play(songFor('fight', { ...params, stageId: events.stageOverride || params.stageId }));
          const old = camera;
          camera = new Camera(960, 540, world.stage.cameraBounds);
          camera.x = old.x; camera.y = old.y; camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, old.zoom));
        }
        camera.update(targets());
        return;
      }

      if (phase === 'outro') {
        phaseT++;
        for (const f of world.fighters) f.animT++;
        camera.update(targets());
        if (phaseT >= OUTRO_FRAMES) {
          if (params.demo) { G.go('title'); return; }                      // exhibitions never touch the records
          if (ko.winner < 0) { G.go(params.tour ? 'splash' : 'select', params.tour ? params : { mode: params.mode }); return; }   // a tournament replays a draw
          const winner = world.fighters[ko.winner], loser = world.fighters[1 - ko.winner];
          G.scores[winner.cfg.id] = (G.scores[winner.cfg.id] || 0) + 1;
          G.saveScores();
          G.go('results', { ...params, winnerId: winner.cfg.id, loserId: loser.cfg.id, stocks: winner.stocks, winnerSide: ko.winner });
        }
      }
    },

    updatePause() {
      const { dx, dy } = nav();
      const ok = G.input.confirmPressed();
      if (pPage === 'moves') {                                   // ← → flips between the two fighters
        if (dx) { pSide = 1 - pSide; G.audio.play('menuMove'); }
        if (ok || G.input.backPressed()) { pPage = 'list'; G.audio.play('menuBack'); }
        return;
      }
      if (pPage === 'help') {
        if (dx) { const n = HELP_TABS.length - 1; pTab = (pTab + dx + n) % n; G.audio.play('menuMove'); }   // TV SETUP (last) is menu-only
        if (ok || G.input.backPressed()) { pPage = 'list'; G.audio.play('menuBack'); }
        return;
      }
      if (G.input.backPressed()) { paused = false; G.audio.play('menuConfirm'); return; }
      if (G.input.keyPressed('KeyQ')) { G.go('menu'); return; }
      if (dy) { pIdx = (pIdx + dy + PAUSE_ITEMS.length) % PAUSE_ITEMS.length; G.audio.play('menuMove'); }
      if (ok) {
        G.audio.play('menuConfirm');
        if (pIdx === 0) paused = false;
        else if (pIdx === 1) { pPage = 'moves'; pSide = 0; }
        else if (pIdx === 2) { pPage = 'help'; pTab = 0; }
        else if (pIdx === 3) G.go('fight', params);
        else G.go('menu');
      }
    },

    drawPause(c) {
      c.fillStyle = 'rgba(43,38,32,0.62)'; c.fillRect(0, 0, 960, 540);
      if (pPage === 'moves') {
        drawMoveList(c, world.fighters[pSide].cfg, { hint: `P${pSide + 1} · ← → other fighter · ESC back` });
        return;
      }
      if (pPage === 'help') {
        c.fillStyle = PAPER; c.fillRect(0, 0, 960, 540);
        header(c, 'HOW TO PLAY', { sub: 'PAUSED' });
        drawHelp(c, pTab);
        hints(c, [[['←', '→'], 'Tab'], [['ESC', '○'], 'Back']], 520);
        return;
      }
      plaque(c, 300, 96, 360, 380, { fill: PAPER, shadow: 8 });
      c.fillStyle = INK; c.fillRect(303, 99, 354, 52);
      c.fillStyle = BRASS; c.fillRect(303, 151, 354, 4);
      text(c, 'PAUSED', 480, 136, { font: F.head(32), color: PAPER });
      menuList(c, PAUSE_ITEMS, pIdx, 340, 170, { w: 280, h: 46, gap: 10, anim: pAnim });
      hints(c, [[['W', 'S'], 'Move'], [['ENTER', '✕'], 'Select'], ['ESC', 'Resume']], 500, { color: PAPER });
    },

    draw() {
      const c = G.renderer.ctx;
      const shownStage = events.stageOverride ? stageById(events.stageOverride) : stage;
      G.renderer.renderFight({ world, stage: shownStage, camera, fx: G.fx, t, sprites: G.sprites, heads: G.heads, stageArt: G.stageArt, events });
      drawHUD(c, world, camera, { t, sprites: G.sprites });
      events.drawUI(c);
      G.fx.drawUI(c, camera);
      combos.forEach((k, i) => {                          // "3 HITS" under the attacker's plate, "4 HIT COMBO!" when it ends
        const live = k.hits >= 2, done = !live && k.ended?.hits >= 3 && world.frame - k.endedAt < 70;
        if (!live && !done) return;
        const x = i ? 780 : 180, n = live ? k.hits : k.ended.hits;
        text(c, live ? `${n} HITS` : `${n} HIT COMBO!`, x, 128, { font: F.logo(live ? 24 : 28), color: i ? BRICK : NAVY });
        if (done) text(c, `${Math.round(k.ended.dmg)} damage`, x, 148, { font: F.body(15, 700), color: INK });
      });

      // first-timer strip: each human's keys for the first seconds of the match (the room has never seen them)
      const hintT = phase === 'intro' ? 0 : t - INTRO_FRAMES;
      if (!params.demo && (phase === 'intro' || (phase === 'fight' && hintT < 420))) {
        c.globalAlpha = hintT > 360 ? (420 - hintT) / 60 : 1;
        world.fighters.forEach((f, i) => {
          if (f.controller.isCPU) return;
          const keys = i ? '← ↑ ↓ → move · K light · L heavy · ; \' specials · / dodge · ENTER super' : 'W A S D move · F light · G heavy · H J specials · V dodge · SPACE super';
          const x = i ? 486 : 14, w = 460;
          plaque(c, x, 490, w, 24, { fill: INK, shadow: 0, lw: 0 });
          text(c, `P${i + 1}  ${keys}`, x + w / 2, 507, { font: F.body(13, 700), color: PAPER });
        });
        c.globalAlpha = 1;
      }
      if (phase === 'intro' && phaseT > 30) {
        const go = phaseT > INTRO_FRAMES - 30, k = go ? Math.min(1, (phaseT - (INTRO_FRAMES - 30)) / 6) : Math.min(1, (phaseT - 30) / 6);
        const word = go ? 'FIGHT!' : 'READY?';
        c.save(); c.translate(480, 290); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        c.font = F.logo(go ? 84 : 60); c.textAlign = 'center';
        for (let d = 6; d > 0; d--) { c.fillStyle = INK; c.fillText(word, d, d); }
        c.fillStyle = go ? BRICK : PAPER; c.fillText(word, 0, 0);
        c.restore();
      }
      if (params.demo && (t >> 5) % 2 === 0) {              // the attract-mode strip
        plaque(c, 330, 486, 300, 32, { fill: INK, shadow: 0 });
        text(c, 'EXHIBITION · PRESS ANY KEY', 480, 508, { font: F.head(18), color: PAPER });
      }
      if (paused) this.drawPause(c);
    },
  };
}
