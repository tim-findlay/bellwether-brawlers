// ?art=<stageId> — render harness (dev-only, dynamically imported). Draws a
// real stage through a real Camera with two STUB fighters that satisfy the
// plan's Fighter contract, cycling through every anim name, plus sample
// world objects, world-space FX and the v3 HUD. Nothing here touches the
// engine: it exists so the renderer can be eyeballed before combat lands.
//   1/2/3/4 stage · A next anim · Arrows nudge camera · H toggle HUD
//   B toggle blast/camera hints · P pause the anim cycle · S sprites on/off
//   Z spread the fighters apart (camera zooms out to the bounds)
// From the console: __G.screens.art.setAnim('run') / setStage('pub') / freeze.

import { Camera } from '../engine/camera.js';
import { stageById, geometryOf, STAGE_IDS_V3 } from '../data/stages.js';
import { byId } from '../data/characters.js';
import { drawHUD } from '../render/hud.js';

export const ANIM_NAMES = ['idle', 'run', 'dash', 'jump', 'fall', 'fastfall', 'dodge', 'airdodge',
  'attack', 'land', 'hurt', 'launched', 'stagger', 'ko', 'chair'];
const AIR = new Set(['jump', 'fall', 'fastfall', 'airdodge', 'launched']);
const CYCLE = 90;

function stubFighter(cfg, side, spawn) {
  const f = {
    cfg, side, controller: null, world: null,
    body: { x: spawn.x, y: spawn.y, vx: 0, vy: 0, facing: side === 0 ? 1 : -1, grounded: true, onPlatform: false,
            state: 'idle', stateT: 0, fastFalling: false, airJumps: 1, airDodgeOk: true, stun: 0, w: 36, h: 96 },
    gauge: side === 0 ? cfg.stats.hp * 0.8 : cfg.stats.hp * 0.3, maxGauge: cfg.stats.hp,
    meter: side === 0 ? 100 : 42, meterFlash: false,
    cd: { s1: 0, s2: side === 0 ? 90 : 0 },
    statuses: new Map(side === 0 ? [['slow', { dur: 90, max: 120, data: {} }]] : [['silence', { dur: 100, max: 210, data: {} }], ['lien', { dur: 300, max: 480, data: {} }]]),
    stocks: 3 - side, state: 'normal', stateT: 0, chair: null,
    attack: null, landLag: 0, hurtFlash: 0, animT: 0,
    invulnerable: false, actionable: true,
    _anim: { name: 'idle', t: 0 },
    get x() { return this.body.x; }, get y() { return this.body.y; },
    get facing() { return this.body.facing; }, get grounded() { return this.body.grounded; },
    get airborne() { return !this.body.grounded; },
    get anim() { return this._anim; },
    hitbox() { return null; },
    hurtbox() { return { x: this.body.x, y: this.body.y - this.body.h / 2, w: this.body.w, h: this.body.h }; },
    takeHit() { return 'miss'; },
  };
  return f;
}

export function makeArt(G) {
  let stage, geo, camera, world, t = 0, animIdx = 0, animT = 0;
  const nudge = { x: 0, y: 0 };
  let hud = true, hints = true, frozen = false, useSprites = true, spread = false;

  function setStage(id) {
    const sid = geometryOf(id) ? id : 'office';
    stage = stageById(sid); geo = geometryOf(sid);
    camera = new Camera(960, 540, geo.cameraBounds);
    const [s0, s1] = geo.spawns;
    const f1 = stubFighter(byId('tim'), 0, s0), f2 = stubFighter(byId('mike'), 1, s1);
    const slab = geo.slabs[0], plat = geo.platforms[0];
    world = {
      stage: geo, fighters: [f1, f2], frame: 0,
      projectiles: [
        { x: s0.x + 90, y: s0.y - 60, vx: 3, vy: 0, w: 20, h: 12, shape: 'football', color: '#8b5e34', owner: f1, t: 0 },
        { x: s0.x + 140, y: s0.y - 90, vx: 3, vy: 0, w: 24, h: 18, shape: 'email', color: '#ddd5c2', owner: f1, t: 0 },
        { x: s0.x + 190, y: s0.y - 30, vx: 3, vy: 0, w: 16, h: 52, shape: 'candle', color: '#3f5a40', owner: f1, t: 0 },
        { x: s1.x - 90, y: s1.y - 70, vx: -3, vy: 0, w: 16, h: 12, shape: 'card', color: '#b9a16b', owner: f2, t: 0 },
        { x: s1.x - 130, y: s1.y - 110, vx: -3, vy: 0, w: 12, h: 10, shape: 'glass', color: '#b04a6e', owner: f2, t: 0 },
        { x: s1.x - 170, y: s1.y - 50, vx: -3, vy: 0, w: 18, h: 18, shape: 'bomb', color: '#6b4226', owner: f2, t: 0 },
      ],
      zones: [
        { type: 'coffee', x: slab.x + slab.w / 2, y: slab.y, w: 92, h: 8, life: 200, max: 260 },
        { type: 'ember', x: plat.x + plat.w / 2, y: plat.y, w: 128, h: 12, life: 200, max: 260 },
        { type: 'smoke', x: slab.x + slab.w - 60, y: slab.y, w: 140, h: 110, life: 200, max: 300 },
      ],
      strikes: [
        { x: slab.x + 30, y: slab.y, w: 40, h: 140, delay: 40, color: '#3f5a40', marker: true },
        { x: slab.x + slab.w - 30, y: slab.y, w: 40, h: 140, delay: 0, color: '#3f5a40', marker: false },
      ],
      hazards: [
        { type: 'bike', x: slab.x - 40, y: slab.y - 18, w: 32, h: 32, vx: 3 },
        { type: 'ball', x: plat.x + plat.w / 2 + 60, y: plat.y - 30, w: 56, h: 56, vx: 0 },
      ],
    };
    G.fx.banner(stage.name, { dur: 70, sub: 'render harness' });
    nudge.x = nudge.y = 0;
  }

  function applyAnim(f, name, at) {
    const b = f.body;
    f._anim = { name, t: at };
    b.grounded = !AIR.has(name) && name !== 'chair';
    f.state = name === 'ko' ? 'ko' : name === 'chair' ? 'chair' : name === 'hurt' || name === 'launched' ? 'hitstun' : name === 'stagger' ? 'stagger' : 'normal';
    f.attack = null; f.chair = null; f.hurtFlash = 0; f.invulnerable = false;
    b.vx = 0; b.vy = 0;
    if (name === 'attack') {
      const m = f.cfg.light;
      f.attack = { slot: 'light', move: m, frame: at % (m.startup + m.active + m.recover), hasHit: false, fired: false, aerial: false, aim: null };
    } else if (name === 'launched') { b.vx = -b.facing * 9; b.vy = -5; f.hurtFlash = at < 6 ? 6 - at : 0; }
    else if (name === 'hurt') f.hurtFlash = at < 8 ? 8 - at : 0;
    else if (name === 'dodge' || name === 'airdodge') f.invulnerable = at >= 2 && at <= 13;
    else if (name === 'chair') {
      const y0 = geo.cameraBounds.y + 40, k = Math.min(1, at / 60);
      f.chair = { t: at, x: geo.respawn.x + (f.side ? 90 : -90), y: y0 + (geo.respawn.y - y0) * k, y0 };
      b.x = f.chair.x; b.y = f.chair.y;
    } else if (name === 'run' || name === 'dash') b.vx = b.facing * (name === 'dash' ? 5.5 : 3);
    if (name !== 'chair') {
      const slab = geo.slabs[0], hi = geo.platforms.reduce((a, p) => p.y < a.y ? p : a, geo.platforms[0]);
      const home = spread ? (f.side ? { x: hi.x + hi.w / 2, y: hi.y } : { x: slab.x + 30, y: slab.y }) : geo.spawns[f.side];
      b.x = home.x; b.y = home.y - (AIR.has(name) ? 70 : 0);
    }
  }

  function step() {
    if (!frozen) { animT++; if (animT >= CYCLE) { animT = 0; animIdx = (animIdx + 1) % ANIM_NAMES.length; kick(); } }
    const name = ANIM_NAMES[animIdx];
    for (const f of world.fighters) applyAnim(f, name, animT);
    for (const s of world.statuses ?? []) s.dur = Math.max(0, s.dur - 1);
    for (const f of world.fighters) for (const [, s] of f.statuses) { s.dur = s.dur > 1 ? s.dur - 1 : s.max; }
    for (const p of world.projectiles) { p.x += p.vx; p.t++; if (p.x < geo.blast.left || p.x > geo.blast.right) p.x = p.vx > 0 ? geo.spawns[0].x : geo.spawns[1].x; }
    const bike = world.hazards[0], slab = geo.slabs[0];
    bike.x += bike.vx; if (bike.x > slab.x + slab.w + 40) bike.x = slab.x - 40;
    world.strikes[0].delay = 40 - (t % 80 > 40 ? 40 : t % 80);
    if (t % 6 === 0) G.fx.ember(world.zones[1].x + (Math.random() - 0.5) * world.zones[1].w, world.zones[1].y, 1);
    world.frame = t;
  }

  // one-shot FX so effects.js gets exercised in world space
  function kick() {
    const name = ANIM_NAMES[animIdx], f = world.fighters[0];
    if (name === 'hurt') { G.fx.spark(f.x, f.y - 60, '#c4452e', 8); G.fx.text(f.x, f.y - 110, '-8', '#c4452e'); G.fx.hitstop(4); }
    if (name === 'launched') { G.fx.shake(5, 12); G.fx.text(f.x, f.y - 120, 'LAUNCHED', '#c9a227'); }
    if (name === 'ko') { G.fx.flash('#f2e9d8', 8); G.fx.shake(6, 14); G.fx.text(f.x, f.y - 120, 'STOCK LOST!', '#c4452e'); }
    if (name === 'land') G.fx.dust(f.x, f.y);
    if (name === 'attack') G.fx.text(f.x, f.y - 120, f.cfg.light.name.toUpperCase(), '#27425f');
  }

  return {
    enter(p) { t = 0; animIdx = 0; animT = 0; setStage(p?.stageId ?? 'office'); },
    setAnim(name) { const i = ANIM_NAMES.indexOf(name); if (i >= 0) { animIdx = i; animT = 0; kick(); } },
    setStage, get frozen() { return frozen; }, set frozen(v) { frozen = !!v; },
    get spread() { return spread; }, set spread(v) { spread = !!v; },
    get anim() { return ANIM_NAMES[animIdx]; },
    update() {
      t++;
      STAGE_IDS_V3.forEach((id, i) => { if (G.input.keyPressed(`Digit${i + 1}`)) setStage(id); });
      if (G.input.keyPressed('KeyA')) { animIdx = (animIdx + 1) % ANIM_NAMES.length; animT = 0; kick(); }
      if (G.input.keyPressed('KeyH')) hud = !hud;
      if (G.input.keyPressed('KeyB')) hints = !hints;
      if (G.input.keyPressed('KeyP')) frozen = !frozen;
      if (G.input.keyPressed('KeyS')) useSprites = !useSprites;
      if (G.input.keyPressed('KeyZ')) spread = !spread;
      if (G.input.keyHeld('ArrowLeft')) nudge.x -= 8;
      if (G.input.keyHeld('ArrowRight')) nudge.x += 8;
      if (G.input.keyHeld('ArrowUp')) nudge.y -= 8;
      if (G.input.keyHeld('ArrowDown')) nudge.y += 8;
      if (G.input.backPressed()) G.go('title');
      step();
      camera.update(world.fighters.map(f => ({ x: f.x + nudge.x, y: f.y - 48 + nudge.y })));
    },
    draw() {
      G.renderer.renderFight({ world, stage, camera, fx: G.fx, t, sprites: useSprites ? G.sprites : null, heads: G.heads, stageArt: G.stageArt, debug: hints });
      const c = G.renderer.ctx;
      c.fillStyle = 'rgba(242,233,216,0.85)'; c.fillRect(8, 440, 420, 92);   // readout under the HUD/arrows
      c.fillStyle = '#2b2620'; c.font = '13px monospace'; c.textAlign = 'left';
      [`?art=${stage.id}  anim: ${ANIM_NAMES[animIdx]} (${animT})  zoom ${camera.zoom.toFixed(2)}${frozen ? '  [PAUSED]' : ''}`,
       `sprites: ${useSprites ? (G.sprites?.get?.('tim') ? 'tim sheet loaded' : 'none loaded -> drawn bodies') : 'OFF'}   backdrop: ${G.stageArt?.get?.(stage.id) ? 'png' : 'procedural'}`,
       '[1-4] stage  [A] next anim  [P] pause cycle  [H] hud  [B] hints  [S] sprites  [Z] spread',
       '[arrows] nudge camera  [Esc] title',
      ].forEach((r, i) => c.fillText(r, 16, 460 + i * 18));
      if (hud) drawHUD(c, world, camera, { t });
      G.fx.drawUI(c, camera);
    },
  };
}
