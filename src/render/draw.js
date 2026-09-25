// v3 world compositor. The world draws at full canvas resolution through the
// Camera (world px, zoomed); the HUD/banners are drawn afterwards by the
// screen in 960x540 screen space. Fighters use their sprite sheet when one
// exists (anim mapping below), else the drawn fallback body (render/body.js).
// The 480x270 `buf`/`wctx` survive for the title backdrop + select previews.

import { Camera } from '../engine/camera.js';
import { drawStage, stageById } from '../data/stages.js';
import { SPRITE_SCALE } from '../data/sprites.js';
import { drawSprite, frameFor, hasAnim } from './sprites.js';
import { drawSky, drawStageWorld } from './stage.js';
import { drawFallbackBody, drawKoBurst, drawChair, poseFor } from './body.js';
import { drawProjectiles, drawZones, drawStrikes, drawHazards } from './objects.js';
import { animFor, attackFrame, aerialRot, drawMoveFX, recordTrail, drawLaunchTrail } from './moves.js';
import { INK, PAPER, shade } from './palette.js';

export { shade };
export const WORLD_W = 480;        // v2 buffer size — title/select previews only
export const WORLD_H = 270;
export const VIEW_W = 960;
export const VIEW_H = 540;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.buf.width = WORLD_W;
    this.buf.height = WORLD_H;
    this.wctx = this.buf.getContext('2d');
    // boot may hand these over once; renderFight args override per call
    this.sprites = null;           // Map id -> sheet | null (render/sprites.js)
    this.stageArt = null;          // Map stageId -> Image | null
    this.heads = null;             // Map id -> { fight, card } | null
  }

  // Full v3 frame: sky -> camera -> stage -> zones/strikes -> fighters ->
  // hazards -> projectiles -> world FX -> reset. HUD is the screen's job.
  // args: { world, stage | stageId, camera, fx, t, sprites, heads, stageArt, events, debug }
  renderFight(args) {
    if (!args?.camera) return this.renderLegacy(args);
    const { world, camera, fx, events } = args;
    const t = args.t ?? world?.frame ?? 0;
    const stage = typeof args.stage === 'string' ? stageById(args.stage)
      : args.stage || stageById(args.stageId) || stageById('office');
    const geometry = world?.stage ?? stage?.geometry;
    const sprites = args.sprites ?? this.sprites;
    const heads = args.heads ?? this.heads;
    const stageArt = args.stageArt ?? this.stageArt;
    const c = this.ctx;

    Camera.reset(c);
    drawSky(c, stage, VIEW_W, VIEW_H);
    const shake = fx?.camera?.() ?? { x: 0, y: 0 };
    camera.apply(c, shake.x, shake.y);

    drawStageWorld(c, stage, geometry, camera, t, { art: stageArt?.get?.(stage?.id) ?? null, slabArt: stageArt?.get?.(`${stage?.id}-slab`) ?? null, debug: !!args.debug });
    drawZones(c, world, t);
    drawStrikes(c, world, t);
    events?.drawWorld?.(c);
    const fighters = [...(world?.fighters ?? [])].sort((a, b) => (a.y ?? a.body?.y ?? 0) - (b.y ?? b.body?.y ?? 0));
    for (const f of fighters) this.drawFighter(c, f, sprites?.get?.(f.cfg?.id) ?? null, heads?.get?.(f.cfg?.id) ?? null);
    drawHazards(c, world, t);
    drawProjectiles(c, world, t);
    fx?.drawWorld?.(c);
    Camera.reset(c);
    if (events?.stageFade > 0) {                       // stage transition fade (Berlin)
      c.globalAlpha = Math.min(1, events.stageFade / 14);
      c.fillStyle = PAPER; c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalAlpha = 1;
    }
  }

  // ---- fighters ----------------------------------------------------------

  drawFighter(c, f, sheet, head) {
    if (!f) return;
    const name = f.anim?.name ?? 'idle';
    if (name === 'ko') { drawKoBurst(c, f); return; }
    if (!(sheet && this.drawSpriteFighter(c, f, sheet))) drawFallbackBody(c, f, head?.fight ?? null);
    drawMoveFX(c, f, f.animT ?? 0);                    // swing smear + wind-up tell (render/moves.js)
  }

  // Anim mapping (plan §Sprite contract). Returns false when the sheet lacks
  // what this pose needs, so the drawn body takes over.
  drawSpriteFighter(c, f, sheet) {
    const an = f.anim ?? { name: 'idle', t: 0 };
    const t = an.t ?? 0;
    const A = sheet.anims;
    const opts = {};
    let anim = 'idle', frame = 0;
    switch (an.name) {
      case 'idle': anim = 'idle'; frame = frameFor(A.idle, t); break;
      case 'run': anim = 'run'; frame = frameFor(A.run, t); break;
      case 'dash': anim = 'run'; frame = frameFor(A.run, t * 1.6); break;
      case 'jump': anim = 'jump'; frame = Math.min(Math.floor((A.jump?.frames ?? 1) * 0.4), Math.floor(t * (A.jump?.fps ?? 12) / 60)); break;
      case 'fall': case 'fastfall': {
        const n = A.jump?.frames ?? 1;
        anim = 'jump'; frame = Math.min(n - 1, Math.floor(n * 0.6) + Math.floor(t * (A.jump?.fps ?? 12) / 60));
        break;
      }
      case 'attack': {                                   // per-move strip, phase-synced to the hitbox
        anim = animFor(f);
        if (!hasAnim(sheet, anim)) anim = anim === 'jump' ? 'jump' : 'attack';
        if (anim === 'jump') frame = Math.min((A.jump?.frames ?? 1) - 1, Math.floor((A.jump?.frames ?? 1) * 0.4));
        else frame = attackFrame(f, A[anim]);
        opts.rot = aerialRot(f);
        break;
      }
      case 'land': anim = 'idle'; frame = 0; opts.squashX = 1.12; opts.squashY = 0.88; break;
      case 'ledge': {                                     // hanging: the jump sheet's apex frame, leaning into the lip
        const n = A.jump?.frames ?? 1;
        anim = 'jump'; frame = Math.min(n - 1, Math.floor(n * 0.4)); opts.rot = -(f.body?.facing ?? 1) * 0.12;
        break;
      }
      case 'dodge': case 'airdodge':
        anim = 'run'; frame = 3; opts.alpha = f.invulnerable && (t & 1) ? 0.25 : 0.5;
        break;
      case 'hurt':
        if (hasAnim(sheet, 'hurt')) { anim = 'hurt'; frame = Math.min(A.hurt.frames - 1, Math.floor(t * (A.hurt.fps ?? 14) / 60)); }
        else { anim = 'idle'; frame = 0; }
        if ((f.hurtFlash ?? 0) > 0 && f.hurtFlash % 2 === 0) opts.tint = '#ffffff';
        break;
      case 'launched': {
        anim = hasAnim(sheet, 'hurt') ? 'hurt' : 'idle'; frame = 0;
        const vx = f.body?.vx ?? 0, vy = f.body?.vy ?? 0, dir = Math.sign(vx) || -(f.body?.facing ?? 1);
        opts.rot = -dir * (0.6 + Math.min(1.2, Math.hypot(vx, vy) * 0.04)) - dir * t * 0.03;
        opts.tint = (f.hurtFlash ?? 0) > 0 && f.hurtFlash % 2 === 0 ? '#ffffff' : PAPER; opts.tintAlpha = opts.tint === PAPER ? 0.25 : 0.85;
        break;
      }
      case 'stagger': anim = hasAnim(sheet, 'hurt') ? 'hurt' : 'idle'; frame = anim === 'hurt' ? Math.min(A.hurt.frames - 1, 2) : 0; opts.rot = (f.body?.facing ?? 1) * 0.28 + Math.sin(t * 0.3) * 0.06; opts.tint = '#c9a227'; opts.tintAlpha = 0.25; break;
      case 'chair': anim = 'idle'; frame = 0; break;
      default: anim = 'idle'; frame = frameFor(A.idle, t);
    }
    if (!hasAnim(sheet, anim)) { if (!hasAnim(sheet, 'idle')) return false; anim = 'idle'; frame = 0; }
    const x = f.x ?? f.body?.x ?? 0, y = f.y ?? f.body?.y ?? 0;
    // one pixel scale for every strip (96 / 64 = SPRITE_SCALE): bigger cells (the 80 px heavy /
    // special strips) just leave room for raised arms and long reaches
    const scale = (f.body?.h ? f.body.h / (sheet.cell || 64) : SPRITE_SCALE) * (sheet.scale ?? 1);
    if (an.name === 'chair' && f.chair) drawChair(c, f.chair.x ?? x, f.chair.y ?? y, f.cfg?.body?.suit, f.body?.facing ?? 1);
    else if (f.body?.grounded) { c.fillStyle = 'rgba(43,38,32,0.22)'; c.fillRect(Math.round(x - 20), Math.round(y - 2), 40, 4); }
    const facing = f.body?.facing ?? f.facing ?? 1;
    if (an.name === 'launched') drawLaunchTrail(c, f, t);
    for (const g of recordTrail(f, { x, y, anim, frame, facing, scale, rot: opts.rot || 0 })) {   // afterimages (dash, lunge, teleport)
      drawSprite(c, sheet, g.anim, g.frame, g.x, g.y, g.facing, scale, { tint: PAPER, tintAlpha: 0.7, alpha: (g.puff ? 0.5 : 0.35) * g.life / (g.puff ? 16 : 8), rot: g.rot });
    }
    drawSprite(c, sheet, anim, frame, x, y, facing, scale, opts);
    return true;
  }

  // ---- v2 compatibility ---------------------------------------------------

  // The pre-camera call shape ({ world, stageId, ... }). The v2 fight screen is
  // being replaced; until then it gets the backdrop and an honest note rather
  // than a crash, so boot -> title -> select never breaks.
  renderLegacy(args = {}) {
    const stage = stageById(args.events?.stageOverride || args.stageId) || stageById('office');
    drawStage(this.wctx, stage, args.t ?? 0, 0);
    const c = this.ctx;
    Camera.reset(c);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.buf, 0, 0, VIEW_W, VIEW_H);
    c.fillStyle = INK; c.font = "700 14px 'Silkscreen'"; c.textAlign = 'center';
    c.fillText('v3 RENDERER: FIGHT SCREEN PENDING (pass a camera to renderFight)', 480, 300);
  }
}

export { poseFor };
