// PRACTICE ARENA: your fighter against a dummy, no match to lose. Stocks never
// run out; meter and cooldowns can be infinite; the dummy stands, walks, jumps,
// fights back (CPU) or is driven by a second player; its composure can be held
// at full, half or empty (launches grow as it empties) and resets once a combo
// ends. A combo counter tells true combos from dropped ones, the last hit shows
// its damage, launch speed and frame advantage, and hitboxes can be drawn.
// Hotkeys (P1 keys never use them): R reset · T dummy · B hitboxes · M move list.
// Everything else lives in the pause menu (Esc / a pad's Back or Start).

import { FightWorld } from '../engine/combat.js';
import { Camera } from '../engine/camera.js';
import { EventDirector } from '../engine/events.js';
import { PlayerController, P1MAP, P2MAP } from '../engine/input.js';
import { AIController } from '../engine/ai.js';
import { ComboTracker, DummyController, DUMMY_MODES, DUMMY_LABEL } from '../engine/practice.js';
import { byId } from '../data/characters.js';
import { stageById, geometryOf } from '../data/stages.js';
import { EVENTS } from '../data/events.js';
import { drawHUD } from '../render/hud.js';
import { drawMoveList, frames } from './movelist.js';
import { ROUTES, HIT_STEPS, stepMatches } from '../data/combos.js';
import { plaque, text, chip, hints, makeNav, F, INK, PAPER, BRICK, NAVY, BRASS, GREEN, MUTED } from '../render/ui.js';

const OPTS = [
  { key: 'dummy', label: 'DUMMY', opts: DUMMY_MODES.map(m => [m, DUMMY_LABEL[m]]) },
  { key: 'gauge', label: 'DUMMY COMPOSURE', opts: [['full', 'FULL'], ['half', 'HALF'], ['empty', 'EMPTY'], ['keep', 'LET IT DRAIN']] },
  { key: 'meter', label: 'METER', opts: [[true, 'INFINITE'], [false, 'NORMAL']] },
  { key: 'cooldowns', label: 'COOLDOWNS', opts: [[true, 'OFF'], [false, 'NORMAL']] },
  { key: 'boxes', label: 'HITBOXES', opts: [[false, 'HIDE'], [true, 'SHOW']] },
  { key: 'events', label: 'OFFICE EVENTS', opts: [[false, 'OFF'], [true, 'ON']] },
];
const ACTIONS = ['RESUME', 'MOVE LIST', 'RESET POSITIONS', 'CHANGE FIGHTERS', 'QUIT TO MENU'];
const ROWS = [{ act: 'RESUME' }, ...OPTS.map(o => ({ opt: o })), ...ACTIONS.slice(1).map(a => ({ act: a }))];
const RESET_AFTER = 70;
const STEP_LABEL = (st) => ({ jump: 'JUMP', chase: 'DODGE', air: 'ANY AIR' }[st] || `${st.endsWith('Air') ? 'AIR ' : ''}${{ n: '', s: '→', d: '↓', u: '↑' }[st[0]]}${st.endsWith('Heavy') ? 'HEAVY' : 'LIGHT'}`);                          // frames a free, untouched dummy waits before its composure resets

export function makePractice(G) {
  let world, events, camera, params, stage, combo, t, paused, row, showList, flash, freeT = [0, 0];
  const trials = new Map();                      // fighter id -> Set of route ids landed (this session)
  const o = { dummy: 'stand', gauge: 'full', meter: true, cooldowns: true, boxes: false, events: false };
  const nav = makeNav(G);

  const me = () => world.fighters[0], dummy = () => world.fighters[1];
  const targets = () => world.fighters.filter(f => f.state !== 'ko').map(f => ({ x: f.x, y: f.y - 48 }));

  function controllerFor(mode) {
    if (mode === 'cpu') return new AIController('easy', G.rng);
    if (mode === 'p2') return new PlayerController(G.input, P2MAP);
    return new DummyController(mode);
  }
  function setDummy(mode) { o.dummy = mode; dummy().controller = controllerFor(mode); note(`DUMMY: ${DUMMY_LABEL[mode]}`); }
  function gaugeTarget(f) { return o.gauge === 'half' ? f.maxGauge * 0.5 : o.gauge === 'empty' ? 0 : f.maxGauge; }
  function note(s) { flash = { s, t: 0 }; }

  function build() {
    const cfgs = [byId(params.p1), byId(params.p2)];
    world = new FightWorld({ cfgs, controllers: [new PlayerController(G.input, P1MAP), controllerFor(o.dummy)], stage: geometryOf(stage.id), fx: G.fx, audio: G.audio, rng: G.rng, settings: G.settings });
    events = new EventDirector(world, EVENTS, { enabled: o.events, difficulty: 'normal', stageId: stage.id });
    events.art = G.uiArt;
    combo = new ComboTracker(world, me(), dummy());
    const done = trials.get(params.p1) || new Set(); trials.set(params.p1, done);
    combo.onHit = (moves) => {                   // a trial is landed when its hits end this true combo, in order
      for (const r of ROUTES) {
        if (done.has(r.id)) continue;
        const need = HIT_STEPS(r), tail = moves.slice(-need.length);
        if (tail.length === need.length && need.every((st, i) => stepMatches(me().cfg, st, tail[i]))) { done.add(r.id); note(`${r.name.toUpperCase()} ✓`); G.audio.play('heal'); }
      }
    };
    camera = new Camera(960, 540, world.stage.cameraBounds);
    camera.update(targets()); camera.update(targets());
    if (o.gauge !== 'keep') dummy().gauge = gaugeTarget(dummy());
  }

  function reset() {
    const slab = world.stage.slabs[0], mid = slab.x + slab.w / 2;
    world.fighters.forEach((f, i) => {
      f.chair = null; f.state = 'normal'; f.attack = null; f.landLag = 0; f.statuses.clear();
      const b = f.body; b.x = mid + (i ? 140 : -140); b.y = slab.y; b.vx = 0; b.vy = 0; b.grounded = true; b.stun = 0;
      f.body.facing = i ? -1 : 1;
      f.gauge = i ? (o.gauge === 'keep' ? f.maxGauge : gaugeTarget(f)) : f.maxGauge;
    });
    world.projectiles = []; world.zones = []; world.strikes = []; world.hazards = []; world.assists = [];
    note('RESET');
  }

  return {
    enter(p) {
      params = p; stage = stageById(p.stageId) || stageById('office');
      t = 0; paused = false; row = 0; showList = false; flash = null;
      build();
      this.world = world; this.combo = combo;          // dev: inspectable from the drive harness
      G.fx.banner('PRACTICE ARENA', { dur: 70, sub: 'Esc for options · M move list · R reset', color: NAVY });
    },

    update() {
      t++;
      if (flash) flash.t++;
      if (paused) { this.updatePause(); return; }
      if (G.input.backPressed() || G.input.startPressed?.()) { paused = true; row = 0; G.audio.play('menuBack'); return; }
      if (G.input.keyPressed('KeyR')) reset();
      if (G.input.keyPressed('KeyT')) setDummy(DUMMY_MODES[(DUMMY_MODES.indexOf(o.dummy) + 1) % DUMMY_MODES.length]);
      if (G.input.keyPressed('KeyB')) { o.boxes = !o.boxes; note(o.boxes ? 'HITBOXES ON' : 'HITBOXES OFF'); }
      if (G.input.keyPressed('KeyM')) showList = !showList;
      if (G.fx.frozen()) return;                                   // hitstop

      const [a, d] = world.fighters;
      for (const f of world.fighters) {
        if (o.meter) f.meter = 100;
        if (o.cooldowns) { f.cd.s1 = 0; f.cd.s2 = 0; }
      }
      for (const f of world.fighters) f.controller.update?.(f, world);
      world.update();
      if (o.events) events.update();
      combo.update();
      world.events.length = 0;                                     // KOs don't end anything here…
      for (const f of world.fighters) if (f.stocks < 3) f.stocks = 3;   // …stocks never run out
      // composure: back to the chosen level (you: full) once a fighter has been free for a beat
      world.fighters.forEach((f, i) => { freeT[i] = f.actionable ? freeT[i] + 1 : 0; });
      if (o.gauge !== 'keep' && combo.hits === 0 && freeT[1] >= RESET_AFTER) d.gauge = gaugeTarget(d);
      if (freeT[0] >= RESET_AFTER) a.gauge = a.maxGauge;
      camera.update(targets());
    },

    updatePause() {
      const { dx, dy } = nav();
      if (G.input.backPressed() || G.input.startPressed?.()) { paused = false; G.audio.play('menuConfirm'); return; }
      if (dy) { row = (row + dy + ROWS.length) % ROWS.length; G.audio.play('menuMove'); }
      const r = ROWS[row], ok = G.input.confirmPressed() || G.input.keyPressed('Space');
      if (r.opt && (dx || ok)) {
        const opts = r.opt.opts, cur = opts.findIndex(([v]) => v === o[r.opt.key]);
        const next = opts[(Math.max(0, cur) + (dx || 1) + opts.length) % opts.length][0];
        if (r.opt.key === 'dummy') setDummy(next);
        else { o[r.opt.key] = next; if (r.opt.key === 'events') { events.enabled = next; if (!next && events.active) events.finish(); } }
        G.audio.play('menuMove');
        return;
      }
      if (!ok || !r.act) return;
      G.audio.play('menuConfirm');
      if (r.act === 'RESUME') paused = false;
      else if (r.act === 'MOVE LIST') { showList = true; paused = false; }
      else if (r.act === 'RESET POSITIONS') { reset(); paused = false; }
      else if (r.act === 'CHANGE FIGHTERS') G.go('select', { mode: 'practice', keep: [params.p1, params.p2] });
      else G.go('menu');
    },

    draw() {
      const c = G.renderer.ctx;
      G.renderer.renderFight({ world, stage, camera, fx: G.fx, t, sprites: G.sprites, heads: G.heads, stageArt: G.stageArt, events });
      if (o.boxes) this.drawBoxes(c);
      drawHUD(c, world, camera, { t, sprites: G.sprites });
      if (o.events) events.drawUI(c);
      G.fx.drawUI(c, camera);
      this.drawPanel(c);
      if (showList && !paused) drawMoveList(c, me().cfg, { cur: me().attack?.move || null });
      if (paused) this.drawPause(c);
    },

    // hurtboxes (blue), live hitboxes (red), projectiles (brass) — world space
    drawBoxes(c) {
      camera.apply(c);
      const box = (b, col, fill) => {
        if (!b) return;
        c.fillStyle = fill; c.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      };
      for (const f of world.fighters) {
        if (f.state === 'ko' || f.chair) continue;
        box(f.hurtbox(), NAVY, 'rgba(39,66,95,0.12)');
        box(f.hitbox(), BRICK, 'rgba(196,69,46,0.3)');
      }
      for (const p of world.projectiles) box({ x: p.x, y: p.y, w: p.w, h: p.h }, BRASS, 'rgba(201,162,39,0.25)');
      Camera.reset(c);
    },

    drawPanel(c) {
      const a = me(), d = dummy(), L = combo.last;
      // combo counter, top centre under the plates
      if (combo.hits > 1) {
        text(c, `${combo.hits} HITS`, 480, 132, { font: F.logo(40), color: BRICK });
        text(c, `${Math.round(combo.dmg)} damage · true combo`, 480, 154, { font: F.body(17, 700), color: INK });
      } else if (combo.ended && world.frame - combo.endedAt < 100 && combo.ended.hits > 1) {
        text(c, `${combo.ended.hits} HIT COMBO!`, 480, 132, { font: F.logo(34), color: GREEN });
        text(c, `${Math.round(combo.ended.dmg)} damage`, 480, 154, { font: F.body(17, 700), color: INK });
      }
      if (combo.dropped && world.frame - combo.dropped.at < 90)
        text(c, `DROPPED — they were free for ${combo.dropped.gap}f`, 480, 180, { font: F.body(18, 700), color: BRICK });

      // bottom-left card: the last move you threw and the last hit that landed
      const m = a.attack?.move || this._lastMove;
      if (a.attack) this._lastMove = a.attack.move;
      plaque(c, 16, 404, 372, 118, { fill: PAPER, shadow: 5 });
      c.fillStyle = INK; c.fillRect(19, 407, 366, 24);
      text(c, 'PRACTICE', 30, 424, { font: F.mono(11), color: PAPER, align: 'left' });
      text(c, `DUMMY: ${DUMMY_LABEL[o.dummy]} · ${o.gauge === 'keep' ? 'DRAINS' : o.gauge.toUpperCase() + ' COMPOSURE'}`, 376, 424, { font: F.mono(10), color: '#d9ceb4', align: 'right' });
      text(c, m ? m.name : 'Throw something…', 30, 452, { font: F.head(19), align: 'left', color: INK });
      text(c, m ? frames(m) : 'R reset · T dummy · B hitboxes · M move list', 30, 472, { font: F.body(15), align: 'left', color: MUTED });
      if (L) {
        const adv = combo.adv == null ? '' : ` · ${combo.adv >= 0 ? '+' : ''}${combo.adv}f on hit`;
        text(c, `LAST HIT ${L.name}: ${Math.round(L.dmg)} dmg · launch ${L.kb.toFixed(1)}${adv}`, 30, 494, { font: F.body(15, 700), align: 'left', color: NAVY });
        text(c, `best combo ${combo.best} · dummy ${Math.round((1 - d.gauge / d.maxGauge) * 100)}% empty (${L.kb >= 17 ? 'KILL-CLASS' : 'launch grows as it empties'})`, 30, 512, { font: F.body(13), align: 'left', color: MUTED });
      }
      if (flash && flash.t < 60) chip(c, flash.s, 944, 380, BRASS, { align: 'right' });
      this.drawTrials(c);
    },

    // bottom-right card: the universal routes (src/data/combos.js) as trials
    drawTrials(c) {
      const done = trials.get(params.p1) || new Set(), x = 572, y = 404, w = 372;
      plaque(c, x, y, w, 118, { fill: PAPER, shadow: 5 });
      c.fillStyle = INK; c.fillRect(x + 3, y + 3, w - 6, 24);
      text(c, 'COMBO TRIALS', x + 14, y + 20, { font: F.mono(11), color: PAPER, align: 'left' });
      text(c, `${done.size}/${ROUTES.length} · M: move list`, x + w - 12, y + 20, { font: F.mono(10), color: '#d9ceb4', align: 'right' });
      ROUTES.forEach((r, i) => {
        const ry = y + 44 + i * 17, ok = done.has(r.id);
        c.fillStyle = ok ? GREEN : '#e6dcc4'; c.fillRect(x + 12, ry - 10, 12, 12);
        if (ok) text(c, '✓', x + 18, ry, { font: F.mono(10), color: PAPER });
        text(c, r.name, x + 32, ry, { font: F.head(14), align: 'left', color: ok ? GREEN : INK });
        text(c, r.steps.map(STEP_LABEL).join(' › '), x + w - 12, ry, { font: F.body(13), align: 'right', color: MUTED });
      });
    },

    drawPause(c) {
      c.fillStyle = 'rgba(43,38,32,0.62)'; c.fillRect(0, 0, 960, 540);
      const x = 230, y = 56, w = 500, h = 30;
      plaque(c, x - 20, y - 16, w + 40, 60 + ROWS.length * (h + 4) + 20, { fill: PAPER, shadow: 8 });
      text(c, 'PRACTICE OPTIONS', 480, y + 20, { font: F.head(28), color: INK });
      ROWS.forEach((r, i) => {
        const sel = i === row, ry = y + 44 + i * (h + 4);
        plaque(c, x, ry, w, h, { fill: sel ? INK : '#fbf6ea', shadow: sel ? 0 : 2, lw: 2 });
        text(c, r.opt ? r.opt.label : r.act, x + 16, ry + 21, { font: F.head(18), align: 'left', color: sel ? PAPER : INK });
        if (r.opt) {
          const cur = r.opt.opts.find(([v]) => v === o[r.opt.key]);
          chip(c, `◀ ${cur ? cur[1] : '?'} ▶`, x + w - 12, ry + 6, sel ? BRASS : NAVY, { align: 'right' });
        }
      });
      hints(c, [[['W', 'S'], 'Move'], [['A', 'D'], 'Change'], [['ENTER', 'F'], 'Select'], ['ESC', 'Resume']], 524, { color: PAPER });
    },
  };
}
