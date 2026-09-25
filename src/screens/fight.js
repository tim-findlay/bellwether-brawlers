// The fight screen (v3): FightWorld + Camera + EventDirector with the match
// flow (intro, stock banners, game over -> results), pause/help overlay and
// the juice. The world itself also runs headless in dev/sim.js.

import { FightWorld } from '../engine/combat.js';
import { Camera } from '../engine/camera.js';
import { EventDirector } from '../engine/events.js';
import { PlayerController, P1MAP, P2MAP } from '../engine/input.js';
import { AIController } from '../engine/ai.js';
import { byId } from '../data/characters.js';
import { stageById, geometryOf } from '../data/stages.js';
import { EVENTS } from '../data/events.js';
import { drawHUD } from '../render/hud.js';
import { drawHelp, paperBG } from './menu.js';

const INTRO_FRAMES = 90;
const OUTRO_FRAMES = 150;

export function makeFight(G) {
  let world, events, camera, params, stage;
  let phase, phaseT, paused, t, ko, shownOverride = null;

  function targets() {
    return world.fighters.filter(f => f.state !== 'ko').map(f => ({ x: f.x, y: f.y - 48 }));
  }

  return {
    enter(p) {
      params = p;
      stage = stageById(p.stageId) || stageById('office');
      const cfgs = [byId(p.p1), byId(p.p2)];
      const c1 = new PlayerController(G.input, P1MAP);
      const c2 = p.mode === '2p' ? new PlayerController(G.input, P2MAP) : new AIController(G.settings.difficulty, G.rng);
      world = new FightWorld({ cfgs, controllers: [c1, c2], stage: geometryOf(stage.id), fx: G.fx, audio: G.audio, rng: G.rng, settings: G.settings });
      events = new EventDirector(world, EVENTS, { enabled: G.settings.events, difficulty: G.settings.difficulty });
      if (G.devEvent) events.force(G.devEvent);
      camera = new Camera(960, 540, world.stage.cameraBounds);
      camera.update(targets()); camera.update(targets());
      phase = 'intro'; phaseT = 0; paused = false; t = 0; ko = null; shownOverride = null;
      G.fx.banner(`${cfgs[0].name} vs ${cfgs[1].name}`, { dur: 80, sub: `${stage.name} · 3 stocks · ring-outs only` });
      G.audio.play('roundGo');
    },

    update() {
      t++;
      if (G.input.backPressed()) {
        if (phase === 'fight') { paused = !paused; G.audio.play(paused ? 'menuBack' : 'menuConfirm'); }
        else if (paused) paused = false;
      }
      if (paused) { if (G.input.keyPressed('KeyQ')) G.go('menu'); return; }

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
        events.update();
        for (const f of world.fighters) if (f.hasStatus('noMeter') && t % 20 === 0) G.fx.confetti(f.x, f.y - 90, 3);
        for (const ev of world.events.splice(0)) {
          if (ev.type === 'ko') {
            const loser = world.fighters[ev.player];
            G.audio.play('ko');
            G.fx.shake(5, 12); G.fx.flash('#f2e9d8', 6);
            G.fx.banner(ev.stocksLeft === 1 ? 'LAST STOCK!' : 'STOCK LOST!', { dur: 60, sub: `${loser.cfg.name} · ${ev.stocksLeft} left` });
          } else if (ev.type === 'gameover') {
            phase = 'outro'; phaseT = 0; ko = ev;
            G.audio.play('bell');
            G.fx.slowmo(0.3, 50); G.fx.flash('#f2e9d8', 8); G.fx.shake(6, 16);
            G.fx.banner(ev.winner < 0 ? 'DRAW!' : 'GAME!', { dur: 120, sub: ev.winner < 0 ? 'double ring-out' : `${world.fighters[ev.winner].cfg.name} takes it` });
          }
        }
        if (events.stageOverride !== shownOverride) {          // Berlin swap: re-bound the camera to the new geometry
          shownOverride = events.stageOverride;
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
          if (ko.winner < 0) { G.go('select', { mode: params.mode }); return; }
          const winner = world.fighters[ko.winner], loser = world.fighters[1 - ko.winner];
          G.scores[winner.cfg.id] = (G.scores[winner.cfg.id] || 0) + 1;
          G.saveScores();
          G.go('results', { ...params, winnerId: winner.cfg.id, loserId: loser.cfg.id, stocks: winner.stocks });
        }
      }
    },

    draw() {
      const c = G.renderer.ctx;
      const shownStage = events.stageOverride ? stageById(events.stageOverride) : stage;
      G.renderer.renderFight({ world, stage: shownStage, camera, fx: G.fx, t, sprites: G.sprites, heads: G.heads, stageArt: G.stageArt, events });
      drawHUD(c, world, camera, { t });
      events.drawUI(c);
      G.fx.drawUI(c, camera);

      if (phase === 'intro' && phaseT > INTRO_FRAMES - 40) {
        c.font = "700 44px 'Pixelify Sans'"; c.textAlign = 'center';
        c.fillStyle = '#2b2620'; c.fillText('FIGHT!', 482, 302);
        c.fillStyle = '#c4452e'; c.fillText('FIGHT!', 480, 300);
      }
      if (paused) {
        c.fillStyle = 'rgba(242,233,216,0.94)'; c.fillRect(0, 0, 960, 540);
        paperBG(c);
        drawHelp(c);
        c.fillStyle = '#c4452e'; c.font = "700 20px 'Pixelify Sans'"; c.textAlign = 'center';
        c.fillText('PAUSED — ESC resume · Q quit to menu', 480, 525);
      }
    },
  };
}
