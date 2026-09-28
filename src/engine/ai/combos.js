// CPU combos: when a route starter (src/data/combos.js) lands, the CPU may play
// the rest of that route out — the same steps a player presses, each the first
// frame it is possible (aerials when the swing would connect). Harder CPUs go
// for it more often; the Confirm (the kill route) is preferred once the target
// is past half empty. Never started off-stage (the loiter rule, ai.test.mjs).

import { PHYS } from '../../data/physics.js';
import { ROUTES, moveFor } from '../../data/combos.js';
import { cancelOpen, chaseOpen } from '../combo.js';
import { meleeHits } from './tactics.js';
import { isOffStage } from './nav.js';

const GROUND_ROUTES = ROUTES.filter(r => !r.air);
const CHANCE = { easy: 0.2, normal: 0.5, hard: 0.85, stall: 0.4, camp: 0.4 };
const AIR = new Set(['nAir', 'sAir', 'uAir', 'dAir', 'air']);

// which step name a landed move is (for this fighter's kit)
function stepOf(cfg, move) {
  for (const s of ['nLight', 'sLight', 'dLight']) if (moveFor(cfg, s) === move) return s;
  return null;
}

export function comboStep(ai, f, opp, world) {
  const a = f.attack;
  if (!ai.route && a?.hasHit && !a.aiRouted && f.grounded) {
    a.aiRouted = true;
    const first = stepOf(f.cfg, a.move), empt = 1 - opp.gauge / opp.maxGauge;
    const options = first ? GROUND_ROUTES.filter(r => r.steps[0] === first && empt >= r.window[0] && empt <= r.window[1] + 0.05) : [];
    if (options.length && !isOffStage(world.stage, f) && ai.rng() < (CHANCE[ai.profileName] ?? 0.5)) {
      const confirm = options.find(r => r.id === 'confirm');
      const r = confirm && empt > 0.5 ? confirm : options[Math.floor(ai.rng() * options.length)];
      ai.route = { r, k: 1, t: 0 };
    }
  }
  const R = ai.route;
  if (!R) return;
  R.t++;
  const step = R.r.steps[R.k];
  if (!step || R.t > 45 || opp.state === 'ko' || opp.chair || f.state !== 'normal') { ai.route = null; return; }
  const b = f.body, dir = Math.sign(opp.x - f.x) || f.facing, toward = dir > 0 ? 'right' : 'left';
  const free = f.actionable || (a && cancelOpen(f)) || (b.state === 'chase' && b.stateT >= PHYS.CHASE_CANCEL_FROM);
  const m = moveFor(f.cfg, step);
  if (step === 'jump') {
    if (free && b.grounded) { ai.helds.add(toward); ai.press('up'); next(R); }
  } else if (step === 'chase') {
    if (chaseOpen(f)) { ai.helds.add(toward); ai.helds.add('up'); ai.press('dodge'); next(R); }
  } else if (AIR.has(step)) {
    ai.helds.add(toward);                                         // drift in while waiting for the swing
    const aim = step === 'air' ? (opp.y < f.y - 40 ? 'u' : 'n') : step[0];   // any aerial: up-air if they're above
    if (free && !b.grounded && (meleeHits(f, moveFor(f.cfg, aim + 'Air'), opp, aim, 6) || b.vy > 2)) {
      ai.aim = aim; ai.aimDir = dir; ai.aimUntil = ai.frame + PHYS.INPUT_BUFFER;
      ai.press('light'); next(R);
    }
  } else if (free && b.grounded) {
    ai.gAim = step[0]; ai.gAimDir = dir; ai.gAimUntil = ai.frame + PHYS.INPUT_BUFFER;   // 'n' clears any held direction
    ai.press(step.endsWith('Heavy') ? 'heavy' : 'light'); next(R);
  }
  if (R.k >= R.r.steps.length) ai.route = null;
}

function next(R) { R.k++; R.t = 0; }
