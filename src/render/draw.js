// World renderer: draws the fight onto a 480x270 buffer, blits it 2x with
// smoothing off for the lightly-pixelated look. Fighter bodies are drawn,
// heads are photos (circular, pre-pixelated) with cartoon fallback.

import { GROUND_Y } from '../engine/fighter.js';
import { drawStage, stageById } from '../data/stages.js';

export const WORLD_W = 480;
export const WORLD_H = 270;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.buf = document.createElement('canvas');
    this.buf.width = WORLD_W;
    this.buf.height = WORLD_H;
    this.wctx = this.buf.getContext('2d');
  }

  // Full fight frame: world buffer -> main canvas; UI drawn by caller after.
  renderFight({ world, stageId, t, fx, events, heads }) {
    const w = this.wctx;
    const stage = stageById(events?.stageOverride || stageId);
    const mid = (world.fighters[0].x + world.fighters[1].x) / 2;
    const par = (mid - WORLD_W / 2) * 0.08;

    drawStage(w, stage, t, par);
    this.drawZones(w, world, t);
    this.drawStrikes(w, world, t);
    events?.drawWorld(w);
    for (const f of [...world.fighters].sort((a, b) => a.y - b.y)) {
      this.drawFighter(w, f, heads.get(f.cfg.id));
    }
    this.drawHazards(w, world, t);
    this.drawProjectiles(w, world, t);
    fx.drawWorld(w);

    const cam = fx.camera();
    const c = this.ctx;
    c.fillStyle = '#2b2620';
    c.fillRect(0, 0, 960, 540);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.buf, cam.x * 2, cam.y * 2, 960, 540);
    // stage transition fade (Berlin)
    if (events?.stageFade > 0) {
      c.globalAlpha = Math.min(1, events.stageFade / 14);
      c.fillStyle = '#f2e9d8';
      c.fillRect(0, 0, 960, 540);
      c.globalAlpha = 1;
    }
  }

  // ---- fighters ----------------------------------------------------------

  drawFighter(g, f, head) {
    const b = f.cfg.body;
    const hScale = b.height || 1;
    const flash = f.hurtFlash > 0 && (f.hurtFlash % 2 === 0);
    const suit = flash ? '#ffffff' : b.suit;
    const trim = flash ? '#ffffff' : b.trim;
    const skin = flash ? '#ffffff' : b.skin;

    g.save();
    g.translate(f.x | 0, f.y | 0);

    // shadow
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(-10, -1, 20, 3);

    const ko = f.state === 'ko';
    if (ko) { g.rotate(-f.facing * Math.PI / 2); g.translate(0, -4); }
    const kd = f.state === 'knockdown' || f.state === 'getup';
    if (kd) { g.rotate(-f.facing * Math.PI / 2.4); g.translate(2, -3); }

    const bob = f.state === 'walk' ? Math.sin(f.animT * 0.32) * 1.4 : Math.sin(f.animT * 0.07) * 0.7;
    const legSwing = f.state === 'walk' ? Math.sin(f.animT * 0.32) * 4 : 0;
    const torsoH = 22 * hScale, torsoTop = -22 - torsoH + bob;

    // legs
    g.fillStyle = shade(suit, -24);
    g.fillRect(-6 + legSwing / 2, -22, 4, 22);
    g.fillRect(2 - legSwing / 2, -22, 4, 22);
    // feet (Nick's white sneakers)
    g.fillStyle = b.extras?.includes('sneakers') ? '#f0ede4' : shade(suit, -40);
    g.fillRect(-7 + legSwing / 2, -3, 6, 3);
    g.fillRect(1 - legSwing / 2, -3, 6, 3);

    // torso
    g.fillStyle = suit;
    g.fillRect(-9, torsoTop, 18, torsoH);
    if (b.extras?.includes('hivis')) {
      g.fillStyle = flash ? '#fff' : '#e8a33d';
      g.fillRect(-9, torsoTop + 3, 18, 5);
      g.fillRect(-9, torsoTop + 12, 18, 3);
    }
    if (b.extras?.includes('sweater')) {
      g.fillStyle = flash ? '#fff' : shade(b.suit, 36);
      g.fillRect(-9, torsoTop, 18, 7);
      g.fillStyle = flash ? '#fff' : '#f2e9d8';
      g.fillRect(-3, torsoTop, 6, 4);                          // collar
    }
    if (b.extras?.includes('apron')) {
      g.fillStyle = flash ? '#fff' : shade(b.suit, -18);
      g.fillRect(-6, torsoTop + 8, 12, torsoH - 8);
      g.fillRect(-1, torsoTop + 2, 2, 6);
    }
    if (b.extras?.includes('tie')) {
      g.fillStyle = trim;
      g.fillRect(-1, torsoTop + 2, 3, 14);
    }

    // arms — front arm extends with the active attack
    let armExt = 0;
    if (f.attack && f.state === 'attack') {
      const m = f.attack.move, fr = f.attack.frame;
      const tt = fr < m.startup ? fr / m.startup
        : fr < m.startup + (m.active || 0) ? 1
        : Math.max(0, 1 - (fr - m.startup - (m.active || 0)) / m.recover);
      armExt = tt * ((m.range || 26) * 0.62);
    }
    const armY = torsoTop + 6;
    g.fillStyle = shade(suit, 14);
    g.fillRect(f.facing > 0 ? -11 : 7, armY, 4, 12);            // back arm
    const fx2 = f.facing * (6 + armExt);
    g.fillRect(Math.min(0, fx2) - (f.facing > 0 ? -4 : 4), armY - 1, Math.abs(fx2) + 4, 4); // front arm
    g.fillStyle = skin;
    g.fillRect(fx2 + (f.facing > 0 ? 2 : -5), armY - 1, 4, 4);  // fist
    if (b.extras?.includes('watch')) {
      g.fillStyle = flash ? '#fff' : '#c9a227';
      g.fillRect(fx2 * 0.6 + (f.facing > 0 ? 0 : -3), armY, 2, 3);
    }

    // parry / catch stance pose marker
    if (f.state === 'parry' || f.state === 'catch') {
      g.fillStyle = '#f2e9d8';
      g.fillRect(f.facing * 10 - 3, armY - 6, 7, 9);
      g.fillStyle = '#2b2620';
      g.fillRect(f.facing * 10 - 1, armY - 4, 3, 1);
      g.fillRect(f.facing * 10 - 1, armY - 1, 3, 1);
    }

    // head
    const headY = torsoTop - 9;
    if (head?.fight) {
      g.drawImage(head.fight, -11, headY - 11, 22, 22);
    } else {
      this.cartoonHead(g, f, skin, headY, flash);
    }
    if (b.extras?.includes('hardhat')) {
      g.fillStyle = flash ? '#fff' : '#e8c83d';
      g.fillRect(-9, headY - 12, 18, 5);
      g.fillRect(-11, headY - 8, 22, 2);
    }
    if (ko && head?.fight) {
      g.fillStyle = '#2b2620';
      g.font = '8px monospace';
      g.fillText('✕', 4, headY - 4);
    }

    // block shield
    if (f.blocking) {
      g.fillStyle = 'rgba(242,233,216,0.55)';
      g.fillRect(f.facing > 0 ? 10 : -16, torsoTop - 4, 6, torsoH + 8);
      g.fillStyle = '#2b2620';
      g.fillRect(f.facing > 0 ? 15 : -17, torsoTop - 4, 2, torsoH + 8);
    }

    // Nick's Lifetime Platinum: brass card frame, no glow
    if (f.hasStatus('noMeter')) {
      g.strokeStyle = '#c9a227';
      g.lineWidth = 2;
      g.strokeRect(-14, headY - 15, 28, -torsoTop + 15 + 22);
    }

    g.restore();
  }

  cartoonHead(g, f, skin, headY, flash) {
    const hair = flash ? '#ffffff' : f.cfg.body.hair.color;
    const style = f.cfg.body.hair.style;
    g.fillStyle = skin;
    g.fillRect(-7, headY - 8, 14, 15);
    g.fillStyle = hair;
    if (style === 'bob') {
      g.fillRect(-9, headY - 10, 18, 6);
      g.fillRect(-9, headY - 6, 3, 12);
      g.fillRect(6, headY - 6, 3, 12);
    } else if (style === 'cap') {
      g.fillRect(-8, headY - 11, 16, 5);
      g.fillRect(f.facing > 0 ? 2 : -12, headY - 8, 10, 2);    // brim
    } else if (style === 'beard') {
      g.fillRect(-8, headY - 10, 16, 4);
      g.fillRect(-7, headY + 2, 14, 5);                        // beard
    } else if (style === 'quiff') {
      g.fillRect(-8, headY - 12, 16, 6);
      g.fillRect(f.facing * 3 - 3, headY - 14, 7, 3);
    } else if (style === 'grey') {
      g.fillRect(-8, headY - 10, 16, 4);
    } else {                                                   // side part
      g.fillRect(-8, headY - 10, 16, 5);
    }
    // eyes
    g.fillStyle = '#1a1a1a';
    if (f.state === 'ko') {
      g.fillRect(f.facing * 3 - 1, headY - 2, 3, 1);
      g.fillRect(f.facing * 3 - 1, headY, 3, 1);
    } else {
      g.fillRect(f.facing * 3, headY - 2, 2, 2);
    }
  }

  // ---- world objects -------------------------------------------------------

  drawProjectiles(g, world, t) {
    for (const p of world.projectiles) {
      g.save();
      g.translate(p.x | 0, p.y | 0);
      g.fillStyle = p.color;
      if (p.shape === 'football') {
        g.fillRect(-5, -3, 10, 6);
        g.fillStyle = '#f2e9d8';
        g.fillRect(-2, -1, 4, 1);
      } else if (p.shape === 'email') {
        g.fillRect(-6, -4, 12, 9);
        g.strokeStyle = '#2b2620'; g.lineWidth = 1;
        g.strokeRect(-6, -4, 12, 9);
        g.beginPath(); g.moveTo(-6, -4); g.lineTo(0, 1); g.lineTo(6, -4); g.stroke();
        if ((t & 8) === 0) { g.fillStyle = '#c4452e'; g.fillRect(3, -7, 4, 4); }   // dithered "1 new"
      } else if (p.shape === 'candle') {
        g.fillRect(-4, -p.h / 2, 8, p.h);
        g.fillRect(-1, -p.h / 2 - 4, 2, 4);
        g.fillRect(-1, p.h / 2, 2, 4);
      } else if (p.shape === 'card') {
        g.fillRect(-4, -3, 8, 6);
        g.fillStyle = '#f2e9d8'; g.fillRect(-2, -1, 2, 2);
      } else if (p.shape === 'glass') {
        g.fillRect(-3, -4, 6, 5);
        g.fillStyle = '#ddd5c2'; g.fillRect(-1, 1, 2, 3);
      } else if (p.shape === 'bomb') {
        g.fillRect(-4, -4, 9, 9);
        g.fillStyle = '#c4452e'; g.fillRect(2, -6, 2, 2);
      } else {
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      g.restore();
    }
  }

  drawZones(g, world, t) {
    for (const z of world.zones) {
      if (z.type === 'coffee') {
        g.fillStyle = 'rgba(90,58,38,0.8)';
        g.fillRect(z.x - z.w / 2, GROUND_Y - 1, z.w, 4);
        g.fillStyle = 'rgba(122,80,52,0.8)';
        g.fillRect(z.x - z.w / 2 + 4, GROUND_Y - 3, z.w - 8, 3);
      } else if (z.type === 'ember') {
        g.fillStyle = 'rgba(180,90,40,0.5)';
        g.fillRect(z.x - z.w / 2, GROUND_Y - 3, z.w, 6);
        for (let i = 0; i < 4; i++) {
          if (((t >> 2) + i) % 2) {
            g.fillStyle = '#d8762e';
            g.fillRect(z.x - z.w / 2 + 6 + i * 12, GROUND_Y - 5 - (t / 4 + i * 3) % 6, 2, 2);
          }
        }
      } else if (z.type === 'smoke') {
        g.fillStyle = 'rgba(120,114,104,0.45)';
        for (let i = 0; i < 6; i++) {
          const sh = 50 - i * 4;
          g.fillRect(z.x - z.w / 2 + i * (z.w / 6), GROUND_Y - sh - ((t / 6 + i * 5) % 8), z.w / 6 - 2, sh);
        }
      }
    }
  }

  drawStrikes(g, world, t) {
    for (const s of world.strikes) {
      if (s.delay > 0) {
        const pulse = (t % 16) < 8;
        g.fillStyle = pulse ? '#c4452e' : '#8a3522';
        g.fillRect(s.x - 8, GROUND_Y - 3, 16, 3);
        g.fillRect(s.x - 2, GROUND_Y - 8, 4, 4);
      } else {
        g.fillStyle = s.color || '#3f5a40';
        g.fillRect(s.x - s.w / 2, GROUND_Y - s.h, s.w, s.h);
        g.fillStyle = '#f2e9d8';
        g.fillRect(s.x - s.w / 2 + 2, GROUND_Y - s.h + 2, 3, s.h - 4);
      }
    }
  }

  drawHazards(g, world, t) {
    for (const h of world.hazards) {
      g.save();
      g.translate(h.x | 0, h.y | 0);
      if (h.type === 'bike') {
        g.fillStyle = '#2b2620';
        g.beginPath(); g.arc(-5, 5, 4, 0, Math.PI * 2); g.arc(6, 5, 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c4452e'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-5, 5); g.lineTo(0, -3); g.lineTo(6, 5); g.moveTo(0, -3); g.lineTo(-2, -6); g.stroke();
        g.fillStyle = '#2b2620'; g.fillRect(-4, -8, 6, 2);
      } else if (h.type === 'ball') {
        g.strokeStyle = '#4a443c'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -h.y); g.lineTo(0, -10); g.stroke();
        g.fillStyle = '#4a443c';
        g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5d564c';
        g.beginPath(); g.arc(-4, -4, 5, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  }
}

export function shade(hex, amt) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, gr = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); gr = Math.max(0, Math.min(255, gr)); b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) + (r << 16) + (gr << 8) + b).toString(16).slice(1);
}
