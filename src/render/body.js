// Drawn fallback fighter: the v2 paper-doll body ported to the v3 world and
// driven by `f.anim` ({ name, t }). Drawn in v2 units (a ~64-unit-tall doll)
// under ctx.scale(S) where S = body.h / 64, so the doll matches the hurtbox
// height (96 world px by default). Used whenever a fighter has no sprite
// sheet — the sprite path lives in draw.js. Reads only contract fields, all
// guarded, so a partially-built fighter never throws.

import { INK, PAPER, BRASS, shade } from './palette.js';

const DOLL_H = 64;                 // v2 doll height in its own units

// Pose numbers per anim — what the v2 states used to imply, now explicit.
export function poseFor(f) {
  const an = f.anim ?? { name: 'idle', t: f.animT ?? 0 };
  const t = an.t ?? 0, b = f.body ?? {};
  const p = { name: an.name, t, bob: 0, legSwing: 0, legTuck: 0, armLift: 0, rot: 0, alpha: 1, squashX: 1, squashY: 1, sit: false, hide: false };
  switch (an.name) {
    case 'run': p.bob = Math.sin(t * 0.32) * 1.4; p.legSwing = Math.sin(t * 0.32) * 4; break;
    case 'dash': p.bob = Math.sin(t * 0.5) * 1.6; p.legSwing = Math.sin(t * 0.5) * 5; p.rot = -(b.facing ?? 1) * 0.16; break;
    case 'jump': p.legTuck = 8; p.armLift = -6; break;
    case 'fall': p.legSwing = 3; p.armLift = -3; break;
    case 'fastfall': p.legTuck = 2; p.rot = (b.facing ?? 1) * 0.22; p.armLift = 4; break;
    case 'dodge': case 'airdodge':
      p.alpha = 0.5; p.rot = (b.facing ?? 1) * Math.min(1, t / 6) * 0.35;
      if (f.invulnerable && (t & 1)) p.alpha = 0.25;      // i-frame flicker
      break;
    case 'land': p.squashX = 1.12; p.squashY = 0.88; break;
    case 'hurt': p.rot = -(b.facing ?? 1) * 0.12; break;
    case 'launched': {
      const vx = b.vx ?? 0, vy = b.vy ?? 0;
      const dir = Math.sign(vx) || -(b.facing ?? 1);
      p.rot = -dir * (0.6 + Math.min(1.2, Math.hypot(vx, vy) * 0.04)) - dir * t * 0.03;
      p.legSwing = 4; p.armLift = -5;
      break;
    }
    case 'stagger': p.rot = (b.facing ?? 1) * 0.28 + Math.sin(t * 0.3) * 0.06; p.armLift = 3; break;
    case 'ko': p.hide = t > 22; break;
    case 'chair': p.sit = true; p.legTuck = 10; break;
    default: p.bob = Math.sin(t * 0.07) * 0.7;                // idle breathing
  }
  return p;
}

// Ink-burst KO: expanding blots, then nothing (the body hides after ~22f).
export function drawKoBurst(g, f) {
  const t = f.anim?.t ?? 0;
  if (t > 40) return;
  const k = Math.min(1, t / 14), fade = t < 26 ? 1 : Math.max(0, 1 - (t - 26) / 14);
  g.save();
  g.translate(f.x ?? 0, (f.y ?? 0) - (f.body?.h ?? 96) / 2);
  g.globalAlpha = fade;
  g.fillStyle = INK;
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + 0.3, r = (26 + (i % 3) * 18) * k;
    const s = (10 + (i % 4) * 4) * (1 - k * 0.4);
    g.fillRect(Math.round(Math.cos(a) * r - s / 2), Math.round(Math.sin(a) * r * 0.8 - s / 2), s, s);
  }
  g.fillStyle = PAPER;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 1, r = (40 + i * 8) * k;
    g.fillRect(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.8), 4, 4);
  }
  g.restore();
}

// The respawn office chair (v3: KO -> descend from centre-top on a chair).
export function drawChair(g, x, y, suit = '#33302e', facing = 1) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(facing < 0 ? -1 : 1, 1);                       // back rest behind the rider
  g.fillStyle = INK;
  g.fillRect(-2, 14, 4, 26);                             // stem
  g.fillRect(-26, 40, 52, 4);                            // base bar
  for (const cx of [-24, -12, 0, 12, 24]) { g.fillRect(cx - 3, 42, 6, 6); }   // casters
  g.fillStyle = shade(suit, -10);                        // seat
  g.fillRect(-24, 4, 48, 12);
  g.fillStyle = shade(suit, 6);                          // back rest (behind the body)
  g.fillRect(-26, -66, 12, 72);
  g.fillStyle = INK;
  g.fillRect(-27, -68, 14, 4); g.fillRect(-27, 4, 52, 2);
  g.restore();
}

// Main entry: the full doll. `head` is heads.get(id)?.fight (22px circle) or null.
export function drawFallbackBody(g, f, head) {
  const cfg = f.cfg ?? {}, b = cfg.body ?? {};
  const pose = poseFor(f);
  if (pose.hide) return;
  const S = (f.body?.h ?? 96) / DOLL_H;
  const facing = f.body?.facing ?? f.facing ?? 1;
  const hScale = b.height || 1;
  const flash = (f.hurtFlash ?? 0) > 0 && (f.hurtFlash % 2 === 0);
  const suit = flash ? '#ffffff' : (b.suit || '#33302e');
  const trim = flash ? '#ffffff' : (b.trim || BRASS);
  const skin = flash ? '#ffffff' : (b.skin || '#e8c39a');
  const x = f.x ?? f.body?.x ?? 0, y = f.y ?? f.body?.y ?? 0;

  if (pose.sit && f.chair) drawChair(g, f.chair.x ?? x, f.chair.y ?? y, b.suit || '#33302e', facing);

  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (f.body?.grounded && !pose.sit) {                  // contact shadow
    g.fillStyle = 'rgba(43,38,32,0.22)';
    g.fillRect(-14 * S, -2, 28 * S, 4);
  }
  g.rotate(pose.rot);
  g.scale(S * pose.squashX, S * pose.squashY);
  g.globalAlpha = pose.alpha;

  const bob = pose.bob, legSwing = pose.legSwing, tuck = pose.legTuck;
  const torsoH = 22 * hScale, torsoTop = -22 - torsoH + bob;

  // legs (tuck shortens them; sitting folds them forward); b.trousers overrides the suit shade
  g.fillStyle = b.trousers || shade(suit, -24);
  if (pose.sit) {
    g.fillRect(-6, -22, 12, 8);                            // thighs forward
    g.fillRect(facing > 0 ? 2 : -8, -18, 6, 18);           // shins down
  } else {
    g.fillRect(-6 + legSwing / 2, -22 + tuck, 4, 22 - tuck);
    g.fillRect(2 - legSwing / 2, -22 + tuck, 4, 22 - tuck);
  }
  // feet (Nick's white sneakers)
  g.fillStyle = b.extras?.includes('sneakers') ? '#f0ede4' : shade(suit, -40);
  if (!pose.sit) {
    g.fillRect(-7 + legSwing / 2, -3 - tuck, 6, 3);
    g.fillRect(1 - legSwing / 2, -3 - tuck, 6, 3);
  } else g.fillRect(facing > 0 ? 2 : -10, -3, 8, 3);

  // torso
  g.fillStyle = suit;
  g.fillRect(-9, torsoTop, 18, torsoH);
  if (b.extras?.includes('hivis')) {
    g.fillStyle = flash ? '#fff' : '#e8a33d';
    g.fillRect(-9, torsoTop + 3, 18, 5);
    g.fillRect(-9, torsoTop + 12, 18, 3);
  }
  if (b.extras?.includes('sweater')) {
    g.fillStyle = flash ? '#fff' : shade(b.suit || suit, 36);
    g.fillRect(-9, torsoTop, 18, 7);
    g.fillStyle = flash ? '#fff' : PAPER;
    g.fillRect(-3, torsoTop, 6, 4);                          // collar
  }
  if (b.extras?.includes('apron')) {
    g.fillStyle = flash ? '#fff' : shade(b.suit || suit, -18);
    g.fillRect(-6, torsoTop + 8, 12, torsoH - 8);
    g.fillRect(-1, torsoTop + 2, 2, 6);
  }
  if (b.extras?.includes('tie')) {
    g.fillStyle = trim;
    g.fillRect(-1, torsoTop + 2, 3, 14);
  }

  // arms — the front arm extends across the active attack's startup/active/recover
  let armExt = 0;
  const atk = f.attack;
  if (atk?.move && pose.name === 'attack') {
    const m = atk.move, fr = atk.frame ?? 0;
    const su = m.startup || 0, ac = m.active || 0, re = m.recover || 1;
    const tt = fr < su ? fr / Math.max(1, su) : fr < su + ac ? 1 : Math.max(0, 1 - (fr - su - ac) / re);
    armExt = tt * Math.min(40, ((m.range || 60) / S) * 0.62);   // range is world px
  }
  const armY = torsoTop + 6 + pose.armLift;
  g.fillStyle = shade(suit, 14);
  g.fillRect(facing > 0 ? -11 : 7, armY, 4, 12);            // back arm
  const fx2 = facing * (6 + armExt);
  g.fillRect(Math.min(0, fx2) - (facing > 0 ? -4 : 4), armY - 1, Math.abs(fx2) + 4, 4); // front arm
  g.fillStyle = skin;
  g.fillRect(fx2 + (facing > 0 ? 2 : -5), armY - 1, 4, 4);  // fist
  if (b.extras?.includes('watch')) {
    g.fillStyle = flash ? '#fff' : BRASS;
    g.fillRect(fx2 * 0.6 + (facing > 0 ? 0 : -3), armY, 2, 3);
  }

  // parry / catch stance marker (an open palm)
  const stance = atk?.move?.kind === 'parry' || atk?.move?.kind === 'catch';
  if (stance) {
    g.fillStyle = PAPER;
    g.fillRect(facing * 10 - 3, armY - 6, 7, 9);
    g.fillStyle = INK;
    g.fillRect(facing * 10 - 1, armY - 4, 3, 1);
    g.fillRect(facing * 10 - 1, armY - 1, 3, 1);
  }

  // head
  const headY = torsoTop - 9;
  if (head) g.drawImage(head, -11, headY - 11, 22, 22);
  else cartoonHead(g, f, b, facing, skin, headY, flash);
  if (b.extras?.includes('hardhat')) {
    g.fillStyle = flash ? '#fff' : '#e8c83d';
    g.fillRect(-9, headY - 12, 18, 5);
    g.fillRect(-11, headY - 8, 22, 2);
  }
  if (pose.name === 'ko' && head) {
    g.fillStyle = INK; g.font = '8px monospace'; g.fillText('✕', 4, headY - 4);
  }

  // Nick's Lifetime Platinum: brass card frame, no glow
  if (f.statuses?.has?.('noMeter')) {
    g.strokeStyle = BRASS; g.lineWidth = 2;
    g.strokeRect(-14, headY - 15, 28, -torsoTop + 15 + 22);
  }
  g.restore();
}

function cartoonHead(g, f, b, facing, skin, headY, flash) {
  const hair = flash ? '#ffffff' : (b.hair?.color || '#4a3b2a');
  const style = b.hair?.style || 'side';
  g.fillStyle = skin;
  g.fillRect(-7, headY - 8, 14, 15);
  g.fillStyle = hair;
  if (style === 'bob') {
    g.fillRect(-9, headY - 10, 18, 6); g.fillRect(-9, headY - 6, 3, 12); g.fillRect(6, headY - 6, 3, 12);
  } else if (style === 'long') {                                  // past the shoulders, parted off the face
    g.fillRect(-9, headY - 10, 18, 6); g.fillRect(-10, headY - 6, 4, 22); g.fillRect(6, headY - 6, 4, 22);
  } else if (style === 'cap') {
    g.fillRect(-8, headY - 11, 16, 5); g.fillRect(facing > 0 ? 2 : -12, headY - 8, 10, 2);
  } else if (style === 'beard') {
    g.fillRect(-8, headY - 10, 16, 4); g.fillRect(-7, headY + 2, 14, 5);
  } else if (style === 'quiff') {
    g.fillRect(-8, headY - 12, 16, 6); g.fillRect(facing * 3 - 3, headY - 14, 7, 3);
  } else if (style === 'grey') {
    g.fillRect(-8, headY - 10, 16, 4);
  } else {
    g.fillRect(-8, headY - 10, 16, 5);
  }
  g.fillStyle = '#1a1a1a';
  if (f.anim?.name === 'ko' || f.state === 'ko') {
    g.fillRect(facing * 3 - 1, headY - 2, 3, 1); g.fillRect(facing * 3 - 1, headY, 3, 1);
  } else {
    g.fillRect(facing * 3, headY - 2, 2, 2);
  }
}
