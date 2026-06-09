// The fight screen: wraps FightWorld with round/match flow, events, pause,
// HUD and all the juice. The world itself also runs headless in dev/sim.js.

import { FightWorld } from '../engine/combat.js';
import { EventDirector } from '../engine/events.js';
import { PlayerController, P1MAP, P2MAP } from '../engine/input.js';
import { AIController } from '../engine/ai.js';
import { byId } from '../data/characters.js';
import { EVENTS } from '../data/events.js';
import { drawHUD } from '../render/hud.js';
import { drawHelp, paperBG } from './menu.js';

const ROUND_FRAMES = 3600;

export function makeFight(G) {
  let world, events, params;
  let phase, phaseT, roundNum, wins, roundTimer, paused, t;

  function startRound() {
    world.resetRound();
    events.roundStart();
    roundTimer = ROUND_FRAMES;
    phase = 'intro';
    phaseT = 0;
    G.fx.banner(`ROUND ${roundNum}`, { dur: 80, sub: roundNum === 1 ? `${world.fighters[0].cfg.name} vs ${world.fighters[1].cfg.name}` : '' });
    G.audio.play('roundGo');
  }

  function endRound(winnerIdx, reason) {
    phase = 'roundend';
    phaseT = 0;
    if (winnerIdx >= 0) {
      wins[winnerIdx]++;
      const w = world.fighters[winnerIdx];
      G.fx.banner(reason === 'ko' ? 'KO!' : 'TIME!', { dur: 90, sub: `${w.cfg.name} takes round ${roundNum}` });
      if (reason === 'ko') { G.fx.slowmo(0.25, 60); G.fx.flash('#f2e9d8', 8); G.fx.shake(5, 14); }
      G.audio.play('ko');
    } else {
      G.fx.banner('DRAW', { dur: 90, sub: 'extra round!' });
    }
  }

  return {
    enter(p) {
      params = p;
      const cfgs = [byId(p.p1), byId(p.p2)];
      const c1 = new PlayerController(G.input, P1MAP);
      const c2 = p.mode === '2p' ? new PlayerController(G.input, P2MAP) : new AIController(G.settings.difficulty, G.rng);
      world = new FightWorld({ cfgs, controllers: [c1, c2], fx: G.fx, audio: G.audio, rng: G.rng, settings: G.settings });
      events = new EventDirector(world, EVENTS, { enabled: G.settings.events, difficulty: G.settings.difficulty });
      if (G.devEvent) events.force(G.devEvent);
      roundNum = 1;
      wins = [0, 0];
      paused = false;
      t = 0;
      startRound();
    },

    update() {
      t++;
      if (G.input.backPressed()) {
        if (phase === 'fight') { paused = !paused; G.audio.play(paused ? 'menuBack' : 'menuConfirm'); }
        else if (paused) paused = false;
      }
      if (paused) {
        if (G.input.keyPressed('KeyQ')) G.go('menu');
        return;
      }

      if (phase === 'intro') {
        phaseT++;
        for (const f of world.fighters) f.animT++;
        if (phaseT >= 80) { phase = 'fight'; }
        return;
      }

      if (phase === 'fight') {
        if (G.fx.frozen()) return;                    // hitstop
        for (const f of world.fighters) f.controller.update?.(f, world);
        world.update();
        events.update(roundTimer);
        // platinum confetti ticks (no glow, just paper)
        for (const f of world.fighters) {
          if (f.hasStatus('noMeter') && t % 20 === 0) G.fx.confetti(f.x, f.y - 44, 3);
        }
        roundTimer--;
        const [a, b] = world.fighters;
        if (a.state === 'ko' || b.state === 'ko') {
          endRound(a.state === 'ko' ? 1 : 0, 'ko');
        } else if (roundTimer <= 0) {
          const pa = a.hp / a.maxhp, pb = b.hp / b.maxhp;     // timeout: % of max HP
          endRound(pa === pb ? -1 : pa > pb ? 0 : 1, 'time');
        }
        return;
      }

      if (phase === 'roundend') {
        phaseT++;
        for (const f of world.fighters) f.update();
        if (phaseT >= 130) {
          if (wins[0] >= 2 || wins[1] >= 2) {
            const wi = wins[0] >= 2 ? 0 : 1;
            const winner = world.fighters[wi];
            G.scores[winner.cfg.id] = (G.scores[winner.cfg.id] || 0) + 1;
            G.saveScores();
            G.go('results', { ...params, winnerId: winner.cfg.id, loserId: world.fighters[1 - wi].cfg.id, wins });
          } else {
            roundNum++;
            startRound();
          }
        }
      }
    },

    draw() {
      G.renderer.renderFight({ world, stageId: params.stageId, t, fx: G.fx, events, heads: G.heads });
      const c = G.renderer.ctx;
      drawHUD(c, world, { roundTimer, wins, roundNum });
      events.drawUI(c);
      G.fx.drawUI(c);

      if (phase === 'intro' && phaseT > 50) {
        c.font = "700 44px 'Pixelify Sans'";
        c.textAlign = 'center';
        c.fillStyle = '#c4452e';
        c.fillText('FIGHT!', 480, 300);
      }
      if (paused) {
        c.fillStyle = 'rgba(242,233,216,0.94)';
        c.fillRect(0, 0, 960, 540);
        paperBG(c);
        drawHelp(c);
        c.fillStyle = '#c4452e';
        c.font = "700 20px 'Pixelify Sans'";
        c.textAlign = 'center';
        c.fillText('PAUSED — ESC resume · Q quit to menu', 480, 525);
      }
    },
  };
}
