// Game feel: hitstop, screenshake, slow-mo, particles, floating text, banners.
// World-space drawing happens on the 480x270 buffer; banners/floaters on the
// full-res UI layer.

import { WORLD_W, WORLD_H } from '../render/draw.js';

export class FX {
  constructor(audio) {
    this.audio = audio;
    this.freeze = 0;          // hitstop frames remaining
    this.shakeMag = 0;
    this.shakeFrames = 0;
    this.slowFrames = 0;
    this.slowScale = 1;
    this.particles = [];
    this.floaters = [];
    this.banners = [];        // {text, sub, t, dur, color}
    this.flashFrames = 0;
    this.flashColor = '#fff';
  }

  hitstop(frames) { this.freeze = Math.max(this.freeze, frames); }
  frozen() { return this.freeze > 0; }
  shake(mag, frames) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeFrames = Math.max(this.shakeFrames, frames); }
  slowmo(scale, frames) { this.slowScale = scale; this.slowFrames = frames; }
  timeScale() { return this.slowFrames > 0 ? this.slowScale : 1; }
  flash(color = '#fff', frames = 4) { this.flashColor = color; this.flashFrames = frames; }

  camera() {
    if (this.shakeFrames <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * (this.shakeFrames > 4 ? 1 : this.shakeFrames / 4);
    return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m * 0.6 };
  }

  spark(x, y, color, n = 6, spd = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = spd * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, g: 0.08, life: 14 + (Math.random() * 8 | 0), color, size: Math.random() < 0.4 ? 2 : 1 });
    }
  }

  dust(x, y, color = '#cbbfa6', n = 4) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() * 10 - 5), y, vx: (Math.random() - 0.5) * 0.8, vy: -0.3 - Math.random() * 0.4, g: 0.01, life: 18 + (Math.random() * 10 | 0), color, size: 2 });
    }
  }

  ember(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() * 14 - 7), y: y - Math.random() * 4, vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.5, g: -0.005, life: 22 + (Math.random() * 12 | 0), color: Math.random() < 0.5 ? '#d8762e' : '#b3402e', size: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  confetti(x, y, n = 14) {
    const cols = ['#c4452e', '#c9a227', '#27425f', '#3f5a40', '#f2e9d8'];
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -1.5 - Math.random() * 2, g: 0.09, life: 40 + (Math.random() * 30 | 0), color: cols[i % cols.length], size: 2 });
    }
  }

  // Floating combat text in world coords (drawn on UI layer at 2x).
  text(x, y, str, color = '#f2e9d8') {
    this.floaters.push({ x, y, str, color, t: 0, dur: 45 });
  }

  banner(text, { sub = '', dur = 110, color = '#2b2620', bg = '#f2e9d8', sound = null } = {}) {
    this.banners.push({ text, sub, t: 0, dur, color, bg });
    if (sound) this.audio.play(sound);
  }

  bannerActive() { return this.banners.length > 0; }

  update() {
    if (this.freeze > 0) { this.freeze--; return; } // particles freeze with the world for punchy hitstop
    if (this.shakeFrames > 0) this.shakeFrames--; else this.shakeMag = 0;
    if (this.slowFrames > 0) this.slowFrames--;
    if (this.flashFrames > 0) this.flashFrames--;
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floaters) { f.t++; f.y -= 0.35; }
    this.floaters = this.floaters.filter(f => f.t < f.dur);
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter(b => b.t < b.dur);
  }

  drawWorld(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 10);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawUI(ctx) {
    // floating text (world coords -> 2x screen)
    for (const f of this.floaters) {
      const a = f.t < 8 ? f.t / 8 : f.t > f.dur - 12 ? (f.dur - f.t) / 12 : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = "12px 'Silkscreen'";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2b2620';
      ctx.fillText(f.str, f.x * 2 + 1, f.y * 2 + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.str, f.x * 2, f.y * 2);
    }
    ctx.globalAlpha = 1;
    // banners — paper slab with ink text, slides in/out
    for (const b of this.banners) {
      const inT = 12, outT = 14;
      let k = 1;
      if (b.t < inT) k = easeOut(b.t / inT);
      else if (b.t > b.dur - outT) k = easeOut((b.dur - b.t) / outT);
      const y = 150;
      const w = Math.max(360, b.text.length * 26 + 80);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.2);
      const x = 480 - w / 2;
      ctx.fillStyle = '#2b2620';
      ctx.fillRect(x + 5, y - 37 + 5, w, b.sub ? 86 : 64);
      ctx.fillStyle = b.bg;
      ctx.fillRect(x, y - 37, w, b.sub ? 86 : 64);
      ctx.strokeStyle = '#2b2620';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 4, y - 33, w - 8, (b.sub ? 86 : 64) - 8);
      ctx.fillStyle = b.color;
      ctx.font = "700 30px 'Pixelify Sans'";
      ctx.textAlign = 'center';
      ctx.fillText(b.text, 480, y);
      if (b.sub) {
        ctx.font = "600 17px 'Barlow Condensed'";
        ctx.fillStyle = '#5a5246';
        ctx.fillText(b.sub, 480, y + 26);
      }
      ctx.restore();
    }
    // full-screen flash (KO, super)
    if (this.flashFrames > 0) {
      ctx.globalAlpha = this.flashFrames / 10;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, 960, 540);
      ctx.globalAlpha = 1;
    }
  }
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
