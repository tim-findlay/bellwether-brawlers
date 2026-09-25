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
import { drawHelp, HELP_TABS } from './help.js';
import { plaque, text, menuList, hints, header, makeNav, F, INK, PAPER, BRICK, BRASS, MUTED } from '../render/ui.js';

const PAUSE_ITEMS = [{ label: 'RESUME' }, { label: 'HOW TO PLAY' }, { label: 'RESTART MATCH' }, { label: 'QUIT TO MENU' }];

const INTRO_FRAMES = 90;
const OUTRO_FRAMES = 150;

export function makeFight(G) {
  let world, events, camera, params, stage;
  let phase, phaseT, paused, t, ko, shownOverride = null;
  let pIdx = 0, pPage = 'list', pTab = 0;
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
      const c1 = new PlayerController(G.input, P1MAP);
      const c2 = p.mode === '2p' ? new PlayerController(G.input, P2MAP) : new AIController(G.settings.difficulty, G.rng);
      world = new FightWorld({ cfgs, controllers: [c1, c2], stage: geometryOf(stage.id), fx: G.fx, audio: G.audio, rng: G.rng, settings: G.settings });
      events = new EventDirector(world, EVENTS, { enabled: G.settings.events, difficulty: G.settings.difficulty, stageId: params.stageId });
      events.art = G.uiArt;                                  // event props (assets/ui/ev-*.png), optional
      if (G.devEvent) events.force(G.devEvent);
      camera = new Camera(960, 540, world.stage.cameraBounds);
      camera.update(targets()); camera.update(targets());
      phase = 'intro'; phaseT = 0; paused = false; t = 0; ko = null; shownOverride = null;
      G.audio.play('roundGo');
    },

    update() {
      t++;
      if (paused) { this.updatePause(); return; }
      if (G.input.backPressed() && phase !== 'outro') {
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

    updatePause() {
      const { dx, dy } = nav();
      const ok = G.input.confirmPressed();
      if (pPage === 'help') {
        if (dx) { pTab = (pTab + dx + HELP_TABS.length) % HELP_TABS.length; G.audio.play('menuMove'); }
        if (ok || G.input.backPressed()) { pPage = 'list'; G.audio.play('menuBack'); }
        return;
      }
      if (G.input.backPressed()) { paused = false; G.audio.play('menuConfirm'); return; }
      if (G.input.keyPressed('KeyQ')) { G.go('menu'); return; }
      if (dy) { pIdx = (pIdx + dy + PAUSE_ITEMS.length) % PAUSE_ITEMS.length; G.audio.play('menuMove'); }
      if (ok) {
        G.audio.play('menuConfirm');
        if (pIdx === 0) paused = false;
        else if (pIdx === 1) { pPage = 'help'; pTab = 0; }
        else if (pIdx === 2) G.go('fight', params);
        else G.go('menu');
      }
    },

    drawPause(c) {
      c.fillStyle = 'rgba(43,38,32,0.62)'; c.fillRect(0, 0, 960, 540);
      if (pPage === 'help') {
        c.fillStyle = PAPER; c.fillRect(0, 0, 960, 540);
        header(c, 'HOW TO PLAY', { sub: 'PAUSED' });
        drawHelp(c, pTab);
        hints(c, [[['←', '→'], 'Tab'], ['ESC', 'Back']], 520);
        return;
      }
      plaque(c, 300, 110, 360, 330, { fill: PAPER, shadow: 8 });
      c.fillStyle = INK; c.fillRect(303, 113, 354, 52);
      c.fillStyle = BRASS; c.fillRect(303, 165, 354, 4);
      text(c, 'PAUSED', 480, 150, { font: F.head(32), color: PAPER });
      menuList(c, PAUSE_ITEMS, pIdx, 340, 190, { w: 280, h: 46, gap: 12, anim: pAnim });
      hints(c, [[['W', 'S'], 'Move'], [['ENTER', 'F'], 'Select'], ['ESC', 'Resume']], 500, { color: PAPER });
    },

    draw() {
      const c = G.renderer.ctx;
      const shownStage = events.stageOverride ? stageById(events.stageOverride) : stage;
      G.renderer.renderFight({ world, stage: shownStage, camera, fx: G.fx, t, sprites: G.sprites, heads: G.heads, stageArt: G.stageArt, events });
      drawHUD(c, world, camera, { t, sprites: G.sprites });
      events.drawUI(c);
      G.fx.drawUI(c, camera);

      if (phase === 'intro' && phaseT > 30) {
        const go = phaseT > INTRO_FRAMES - 30, k = go ? Math.min(1, (phaseT - (INTRO_FRAMES - 30)) / 6) : Math.min(1, (phaseT - 30) / 6);
        const word = go ? 'FIGHT!' : 'READY?';
        c.save(); c.translate(480, 290); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        c.font = F.logo(go ? 84 : 60); c.textAlign = 'center';
        for (let d = 6; d > 0; d--) { c.fillStyle = INK; c.fillText(word, d, d); }
        c.fillStyle = go ? BRICK : PAPER; c.fillText(word, 0, 0);
        c.restore();
      }
      if (paused) this.drawPause(c);
    },
  };
}
