// Stage events (the office events, rethought for v3's platform fights). Each is
// data + small behaviour hooks; src/engine/events.js schedules and telegraphs
// them. Coordinates are world px on world.stage (slab = main slab, y = its top).
// Rules (BALANCE.md philosophy 5): telegraphed >= 1 s, kb <= 6, never toward
// a blast zone, symmetric or dodgeable, rewards are meter-only.
// Design rule for this set: every event gives the fight a PLACE or a REASON to
// move — contested pickups, a room to hold, new routes, ground to cede — and
// the fighting never stops for it (no freezes, no mashing).
// Hooks: canRoll(ctx) gates the roll · ready(ctx) gates telegraph -> live ·
// start/update/end/abort · drawWorld (camera space) · drawUI (960x540).
// `stages` limits an event to the stages it belongs to (omitted = everywhere).

import { geometryOf } from './stages.js';

const PAPER = '#f2e9d8', INK = '#2b2620', BRICK = '#c4452e', NAVY = '#27425f', BRASS = '#c9a227', GREEN = '#3f5a40';

const onSlab = (f, slab) => f.state === 'normal' && f.grounded && Math.abs(f.y - slab.y) < 3 && f.x >= slab.x && f.x <= slab.x + slab.w;
const bothOnSlab = ({ world, slab }) => world.fighters.every(f => onSlab(f, slab));
const midX = (slab) => slab.x + slab.w / 2;
const standingOn = (f, s) => f.grounded && !f.chair && Math.abs(f.y - s.y) < 4 && f.x >= s.x - 6 && f.x <= s.x + s.w + 6;
const art = (ctx, name) => ctx.director?.art?.get?.(name) ?? null;
// the highest platform near the middle of the stage (the natural "high ground"), else the slab
function centrePerch(stage, slab) {
  const mid = midX(slab);
  const near = stage.platforms.filter(p => Math.abs(p.x + p.w / 2 - mid) < slab.w * 0.2);
  return near.sort((a, b) => a.y - b.y)[0] || slab;
}
function room(data, i, slab) {
  const s = data.rooms[i];
  data.s = s; data.w = Math.min(s.w, 170); data.x = s === slab ? midX(slab) : s.x + s.w / 2;
}
const pips = (c, x, y, n, of, col) => { for (let i = 0; i < of; i++) { c.fillStyle = INK; c.fillRect(x + i * 18 - 1, y - 1, 14, 14); c.fillStyle = i < n ? col : PAPER; c.fillRect(x + i * 18, y, 12, 12); } };

export const EVENTS = [
  {
    // Contested pickups. Five signature pages flutter down onto mirrored spots;
    // touch one to sign it (+6 meter). First to sign three closes the deal (+15).
    id: 'deal',
    name: 'DEAL DEADLINE',
    banner: 'DEAL DEADLINE!',
    sub: 'the signature pages are coming down — sign three first',
    sound: 'klaxon',
    telegraph: 80,
    weight: 3,
    maxFrames: 560,
    start({ world, slab, data, stage }) {
      const mid = midX(slab), perch = centrePerch(stage, slab);
      const spots = [
        { x: mid, s: perch },
        { x: mid - slab.w * 0.14, s: slab }, { x: mid + slab.w * 0.14, s: slab },
        { x: mid - slab.w * 0.34, s: slab }, { x: mid + slab.w * 0.34, s: slab },
      ];
      data.pages = spots.map((p, i) => ({ x: p.x, s: p.s, y: p.s.y - 280 - i * 30, landed: false, taken: -1, wob: i * 1.7 }));
      data.signed = [0, 0];
      data.done = -1;
    },
    update({ world, data, fx, audio, t }) {
      for (const p of data.pages) {
        if (p.taken >= 0) continue;
        if (!p.landed) { p.y = Math.min(p.s.y - 8, p.y + 3.2); p.landed = p.y >= p.s.y - 8; continue; }
        world.fighters.forEach((f, i) => {
          if (p.taken >= 0 || f.chair || f.state === 'ko') return;
          if (Math.abs(f.x - p.x) > 30 || Math.abs(f.y - p.s.y) > 70) return;
          p.taken = i; data.signed[i]++;
          f.gainMeter(6);                                     // meter only — events never heal
          fx.text(p.x, p.s.y - 90, `SIGNED ${data.signed[i]}/3`, i ? BRICK : NAVY);
          audio.play('pop');
        });
      }
      const winner = data.signed.findIndex(n => n >= 3);
      if (winner >= 0) {
        const f = world.fighters[winner];
        f.gainMeter(15);
        fx.banner('DEAL CLOSED!', { dur: 70, sub: `${f.cfg.name} +15 meter`, color: GREEN });
        audio.play('heal');
        return true;
      }
      if (data.pages.every(p => p.taken >= 0) || t > 520) { fx.banner('DEAL LAPSED', { dur: 50, sub: 'nobody got three signatures' }); return true; }
      return false;
    },
    drawWorld(ctx, c) {
      const { data, t } = ctx;
      const img = art(ctx, 'ev-page');
      for (const p of data.pages || []) {
        if (p.taken >= 0) continue;
        if (!p.landed) { c.fillStyle = 'rgba(43,38,32,0.25)'; c.fillRect(Math.round(p.x - 14), p.s.y - 3, 28, 3); }   // where it lands
        const sway = p.landed ? 0 : Math.sin(t * 0.12 + p.wob) * 10, bob = p.landed ? Math.sin(t * 0.1 + p.wob) * 2 : 0;
        const x = Math.round(p.x + sway), y = Math.round(p.y + bob);
        if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, x - 18, y - 44, 36, 44); continue; }
        c.fillStyle = INK; c.fillRect(x - 15, y - 41, 30, 40);
        c.fillStyle = PAPER; c.fillRect(x - 13, y - 39, 26, 36);
        c.fillStyle = '#b8ad93'; for (let k = 0; k < 4; k++) c.fillRect(x - 9, y - 33 + k * 6, 18, 2);
        c.fillStyle = NAVY; c.fillRect(x - 9, y - 10, 12, 2); c.fillRect(x + 2, y - 13, 2, 5);   // the signature line
      }
    },
    drawUI({ world, data }, c) {
      if (!data.signed) return;
      world.fighters.forEach((f, i) => pips(c, i ? 830 : 76, 112, data.signed[i], 3, i ? BRICK : NAVY));
    },
  },
  {
    // King of the hill. The IC room lights up on the centre high ground (or moves
    // between the side platforms where there is none): stand
    // in it alone to bank votes; the majority after 5.5 s is APPROVED (+22 meter).
    id: 'ic',
    name: 'INVESTMENT COMMITTEE',
    banner: 'INVESTMENT COMMITTEE!',
    sub: 'hold the room alone to win the vote',
    sound: 'bell',
    telegraph: 80,
    weight: 3,
    maxFrames: 400,
    start({ slab, stage, data, world }) {
      // the centre high ground if there is one; otherwise the room moves between
      // the two mirrored side platforms halfway through (left or right first)
      const perch = centrePerch(stage, slab), mid = midX(slab);
      const sides = stage.platforms.filter(p => Math.abs(p.x + p.w / 2 - mid) > slab.w * 0.2).sort((a, b) => a.x - b.x);
      data.rooms = perch !== slab || sides.length < 2 ? [perch] : (world.rng() < 0.5 ? [sides[0], sides[sides.length - 1]] : [sides[sides.length - 1], sides[0]]);
      data.votes = [0, 0]; data.contested = false;
      room(data, 0, slab);
    },
    update({ world, data, fx, audio, t, slab }) {
      if (data.rooms.length > 1 && t === 165) { room(data, 1, slab); fx.text(data.x, data.s.y - 170, 'ROOM MOVED', BRASS); }
      const inRoom = world.fighters.map(f => f.state !== 'ko' && !f.chair && standingOn(f, data.s) && Math.abs(f.x - data.x) <= data.w / 2);
      data.contested = inRoom[0] && inRoom[1];
      if (t > 30 && !data.contested) inRoom.forEach((on, i) => { if (on) data.votes[i]++; });
      if (t < 330) return false;
      const [a, b] = data.votes, w = a === b || Math.max(a, b) < 45 ? -1 : (a > b ? 0 : 1);
      if (w < 0) fx.banner('DEFERRED', { dur: 50, sub: 'no majority — back to the office' });
      else {
        world.fighters[w].gainMeter(22);
        fx.banner('APPROVED!', { dur: 70, sub: `${world.fighters[w].cfg.name} +22 meter`, color: GREEN });
        audio.play('heal');
      }
      return true;
    },
    drawWorld({ data, t }, c) {
      if (!data.s) return;
      const x0 = Math.round(data.x - data.w / 2), top = data.s.y, H = 150;
      c.fillStyle = data.contested ? 'rgba(196,69,46,0.16)' : 'rgba(201,162,39,0.16)';
      c.fillRect(x0, top - H, data.w, H);                      // the glass room
      c.fillStyle = INK;
      c.fillRect(x0, top - H, 4, H); c.fillRect(x0 + data.w - 4, top - H, 4, H); c.fillRect(x0, top - H, data.w, 4);
      c.fillStyle = PAPER; c.fillRect(x0 + data.w / 2 - 34, top - H - 22, 68, 20);   // door sign
      c.fillStyle = INK; c.font = "700 12px 'Silkscreen'"; c.textAlign = 'center';
      c.fillText(data.contested ? 'CONTESTED' : 'IC ROOM', x0 + data.w / 2, top - H - 8);
    },
    drawUI({ world, data, t }, c) {
      if (!data.votes) return;
      const total = 330 - 30, left = Math.max(0, Math.ceil((330 - t) / 60));
      world.fighters.forEach((f, i) => {
        const x = i ? 600 : 240, k = Math.min(1, data.votes[i] / (total * 0.6));
        c.fillStyle = INK; c.fillRect(x - 2, 108, 124, 16);
        c.fillStyle = PAPER; c.fillRect(x, 110, 120, 12);
        c.fillStyle = i ? BRICK : NAVY; c.fillRect(x, 110, 120 * k, 12);
      });
      c.font = "700 16px 'Silkscreen'"; c.textAlign = 'center'; c.fillStyle = INK;
      c.fillText(`VOTE IN ${left}`, 480, 122);
    },
  },
  {
    // New routes. A crane lowers two scaffold decks over the stage for ~9 s
    // (soft platforms, mirrored), then lifts them out — blinking first.
    id: 'site',
    name: 'SITE VISIT',
    banner: 'SITE VISIT!',
    sub: 'scaffolding going up — new ground for nine seconds',
    sound: 'klaxon',
    telegraph: 80,
    weight: 2,
    maxFrames: 900,
    start({ world, slab, stage, data }) {
      data.home = world.stage;
      const w = 170, mid = midX(slab);
      let y = slab.y - 200;
      const xs = [slab.x + slab.w * 0.16, slab.x + slab.w * 0.84 - w];   // over the stage, not the lips: routes, not recovery ledges
      const clash = (yy) => stage.platforms.some(p => Math.abs(p.y - yy) < 60 && xs.some(x => x < p.x + p.w && x + w > p.x));
      for (let k = 0; k < 4 && clash(y); k++) y -= 70;
      data.decks = xs.map(x => ({ x, y, w, scaffold: true }));
      data.drop = 60; data.stay = 540; data.lift = 60;
      data.mid = mid;
    },
    update({ world, data, t }) {
      if (t === data.drop) world.stage = { ...data.home, platforms: [...data.home.platforms, ...data.decks] };   // solid once landed
      if (t === data.drop + data.stay) world.stage = data.home;                                              // gone before it rises
      return t >= data.drop + data.stay + data.lift;
    },
    end({ world, data }) { if (data.home) world.stage = data.home; },
    drawWorld(ctx, c) {
      const { data, t } = ctx;
      if (!data.decks) return;
      const img = art(ctx, 'ev-scaffold');
      for (const d of data.decks) {
        let off = 0;
        if (t < data.drop) off = -(1 - t / data.drop) * 420;
        else if (t > data.drop + data.stay) off = -((t - data.drop - data.stay) / data.lift) * 420;
        const blink = t > data.drop + data.stay - 90 && t <= data.drop + data.stay && ((t >> 3) & 1);
        if (blink) continue;
        const y = Math.round(d.y + off);
        if (img) {                                                                         // Higgsfield deck: top edge = walkable top
          const h = Math.round(img.height * (d.w / img.width)), hook = Math.round(h * 0.465);   // plank top sits 46.5 % down the art
          c.fillStyle = '#4a443c'; c.fillRect(d.x + d.w / 2 - 2, y - hook - 900, 4, 900);
          c.imageSmoothingEnabled = false; c.drawImage(img, d.x, y - hook, d.w, h);
          continue;
        }
        c.fillStyle = '#4a443c'; c.fillRect(d.x + d.w / 2 - 2, y - 900, 4, 870);         // crane cable
        c.fillStyle = BRASS; c.fillRect(d.x + d.w / 2 - 10, y - 34, 20, 10);               // hook block
        c.fillStyle = INK; c.fillRect(d.x + 10, y - 26, 3, 26); c.fillRect(d.x + d.w - 13, y - 26, 3, 26);
        c.fillRect(d.x + 10, y - 26, d.w - 20, 3);                                         // slings
        c.fillStyle = INK; c.fillRect(d.x, y - 2, d.w, 14);
        c.fillStyle = '#b07c3a'; c.fillRect(d.x + 2, y, d.w - 4, 10);                      // planks
        c.fillStyle = '#8a5f2a'; for (let k = 16; k < d.w; k += 22) c.fillRect(d.x + k, y, 2, 10);
        c.fillStyle = '#9aa0a6'; c.fillRect(d.x + 6, y + 12, 4, 34); c.fillRect(d.x + d.w - 10, y + 12, 4, 34);   // tube legs
        c.fillStyle = BRICK; c.fillRect(d.x + 6, y + 30, d.w - 12, 3);                     // hazard rail
      }
    },
  },
  {
    // Ground to cede. The sprinklers soak one half of the floor (grounded
    // fighters there are slowed), then the other half — symmetric by turns.
    id: 'sprinkler',
    name: 'SPRINKLER TEST',
    banner: 'SPRINKLER TEST!',
    sub: 'facilities are testing the system — stay dry',
    sound: 'alarm',
    stages: ['office', 'pub'],
    telegraph: 80,
    weight: 3,
    maxFrames: 700,
    start({ world, data }) { data.first = world.rng() < 0.5 ? -1 : 1; data.half = 300; data.soaked = new Set(); },
    update({ world, slab, data, fx, t }) {
      const side = t < data.half ? data.first : -data.first, mid = midX(slab);
      for (const f of world.fighters) {
        if (f.chair || f.state === 'ko' || !f.grounded) continue;
        const wet = Math.sign(f.x - mid) === side;
        if (!wet) { data.soaked.delete(f); continue; }
        if (!f.hasStatus('slow') || f.statuses.get('slow').dur < 10) f.applyStatus('slow', 24);
        if (!data.soaked.has(f)) { data.soaked.add(f); fx.text(f.x, f.y - 120, 'SOAKED!', NAVY); }
      }
      if (t === data.half) data.soaked.clear();
      return t >= data.half * 2;
    },
    drawWorld({ slab, data, t, stage }, c) {
      if (data.first === undefined) return;
      const side = t < data.half ? data.first : -data.first, mid = midX(slab);
      const x0 = side < 0 ? stage.cameraBounds.x : mid, x1 = side < 0 ? mid : stage.cameraBounds.x + stage.cameraBounds.w;
      c.fillStyle = 'rgba(157,184,217,0.14)'; c.fillRect(x0, stage.cameraBounds.y, x1 - x0, slab.y - stage.cameraBounds.y);
      c.fillStyle = '#9db8d9';
      for (let i = 0; i < 70; i++) {                              // falling drops
        const x = x0 + ((i * 97) % Math.max(1, x1 - x0)), y = stage.cameraBounds.y + ((i * 53 + t * 9) % (slab.y - stage.cameraBounds.y));
        c.fillRect(Math.round(x), Math.round(y), 3, 10);
      }
      c.fillStyle = 'rgba(157,184,217,0.6)'; c.fillRect(Math.max(slab.x, x0), slab.y - 3, Math.min(slab.x + slab.w, x1) - Math.max(slab.x, x0), 4);   // wet sheen
    },
    drawUI({ data, t }, c) {
      const side = data.first === undefined ? null : (t < data.half ? data.first : -data.first);
      if (side === null) return;
      c.font = "700 18px 'Silkscreen'"; c.textAlign = 'center'; c.fillStyle = NAVY;
      c.fillText(side < 0 ? '◀ WET SIDE' : 'WET SIDE ▶', 480, 122);
    },
  },
  crosswind({ id: 'gust', stages: ['rooftop'], name: 'CROSSWIND', banner: 'CROSSWIND!', sub: 'the gusts blow anyone airborne back to the middle', sound: 'wave', kind: 'wind' }),
  crosswind({ id: 'train', stages: ['tube'], name: 'TRAIN APPROACHING', banner: 'TRAIN APPROACHING!', sub: 'the draught pulls anyone airborne to the middle', sound: 'jet', kind: 'train' }),
  {
    id: 'berlin',
    name: 'BERLIN TRIP',
    banner: "MIKE'S OFF TO BERLIN!",
    sub: 'home turf incoming',
    sound: 'jet',
    telegraph: 90,
    weight: 4,
    oncePerMatch: true,
    requiresCharacter: 'mike',
    maxFrames: 800,
    canRoll: bothOnSlab,
    ready: bothOnSlab,                                     // only while both stand on the main slab
    abort({ fx }) { fx.banner('FLIGHT CANCELLED', { dur: 60, sub: 'nobody made the gate' }); },
    start({ world, data, director, fx }) {
      data.from = world.stage;
      data.dur = 720;
      world.setStage(geometryOf('berlin'));                // crossfade: equivalent footing on the gate slab
      director.stageOverride = 'berlin';
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.applyStatus('berlin', data.dur);
      fx.banner('WILLKOMMEN!', { dur: 70, sub: 'Mike: +damage, +speed', color: NAVY });
    },
    update({ data, t }) { return t >= data.dur; },
    end({ director, world, data, fx }) {
      if (data.from) world.setStage(data.from);            // and back the same way
      director.stageOverride = null;
      director.stageFade = 28;
      const mike = world.fighters.find(f => f.cfg.id === 'mike');
      mike?.clearStatus('berlin');
      fx.banner('AND HE’S BACK', { dur: 60, sub: 'cheap flights, somehow', color: INK });
    },
    drawUI({ t }, c) {
      if (t > 80) return;                                  // boarding-pass swoosh during the telegraph
      const x = -260 + t * 16;
      c.save();
      c.translate(x, 120); c.rotate(-0.06);
      c.fillStyle = INK; c.fillRect(4, 4, 240, 80);
      c.fillStyle = PAPER; c.fillRect(0, 0, 240, 80);
      c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(0, 0, 240, 80);
      c.fillStyle = BRICK; c.fillRect(0, 0, 240, 18);
      c.fillStyle = PAPER; c.font = "700 13px 'Silkscreen'"; c.textAlign = 'left';
      c.fillText('BOARDING PASS', 8, 14);
      c.fillStyle = INK; c.font = "700 22px 'Pixelify Sans'";
      c.fillText('MAN → BER', 12, 48);
      c.font = "600 13px 'Barlow Condensed'"; c.fillStyle = BRASS;
      c.fillText('MIKE · SEAT 1A · GATE: ALWAYS', 12, 68);
      c.restore();
    },
  },
];

// Air pushes toward centre stage (never toward a blast zone): only actionable
// airborne fighters drift, 1.4 px/f — a recovery gets easier, a jump-in gets
// harder, launches are untouched (stun > 0).
function crosswind(o) {
  return {
    id: o.id, name: o.name, banner: o.banner, sub: o.sub, sound: o.sound, stages: o.stages,
    telegraph: 90, weight: 3, maxFrames: 360,
    start({ data }) { data.dur = 300; },
    update({ world, slab, data, t }) {
      const mid = midX(slab);
      for (const f of world.fighters) {
        if (f.chair || f.state !== 'normal' || f.grounded || f.body.stun > 0) continue;
        const dir = Math.sign(mid - f.x);
        if (Math.abs(mid - f.x) > 20) f.body.x += dir * 1.4;
      }
      return t >= data.dur;
    },
    drawWorld(ctx, c) {
      const { slab, stage, t } = ctx;
      const mid = midX(slab), B = stage.cameraBounds, img = o.kind === 'train' ? art(ctx, 'ev-train') : null;
      if (img) {                                                  // Higgsfield carriages, coupled, blurring past behind the platform
        const h = 150, w = Math.round(img.width * (h / img.height)), n = 4, tx = B.x + ((t * 38) % (B.w + n * w)) - n * w;
        c.globalAlpha = 0.8; c.imageSmoothingEnabled = false;
        for (let k = 0; k < n; k++) c.drawImage(img, tx + k * w, slab.y - h - 6, w, h);
        c.globalAlpha = 1;
      } else if (o.kind === 'train') {                            // the train blurs past behind the platform
        const tx = B.x + ((t * 38) % (B.w + 1400)) - 1400;
        c.fillStyle = 'rgba(39,66,95,0.55)'; c.fillRect(tx, slab.y - 130, 1400, 96);
        c.fillStyle = 'rgba(242,233,216,0.5)'; for (let k = 40; k < 1400; k += 120) c.fillRect(tx + k, slab.y - 110, 70, 28);
        c.fillStyle = 'rgba(196,69,46,0.6)'; c.fillRect(tx, slab.y - 60, 1400, 6);
      }
      c.fillStyle = 'rgba(242,233,216,0.7)';                        // wind lines, both sides pointing inward
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1, y = B.y + 80 + ((i * 67) % (B.h - 200));
        const span = (B.w / 2) * ((i * 37 + t * 6) % 100) / 100;
        const x = side < 0 ? B.x + span : B.x + B.w - span;
        if (Math.abs(x - mid) > 60) c.fillRect(Math.round(x), Math.round(y), 40, 3);
      }
    },
    drawUI({ t }, c) {
      if (t > 60) return;
      c.font = "700 30px 'Pixelify Sans'"; c.textAlign = 'center'; c.fillStyle = NAVY;
      c.fillText('→ →  ●  ← ←', 480, 240);
    },
  };
}
