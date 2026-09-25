// Game feel: hitstop, screenshake, slow-mo, particles, floating text, banners.
// v3: particles and floaters live in WORLD px. drawWorld(ctx) is called
// inside the camera transform (particles are world objects — no zoom
// compensation); drawUI(ctx, camera) projects floaters through
// camera.worldToScreen and draws banners/flash in 960x540 screen space.

const VIEW_W = 960, VIEW_H = 540;

export class FX {
  constructor(audio) {
    this.audio = audio;
    this.freeze = 0;          // hitstop frames remaining
    this.shakeMag = 0;
    this.shakeFrames = 0;
    this.shakeScale = 1;      // Settings > Screen shake (cosmetic only; 0 = off)
    this.slowFrames = 0;
    this.slowScale = 1;
    this.particles = [];
    this.bursts = [];         // comic impact stars (world px)
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

  // Screenshake offset in SCREEN px (rides camera.apply's shake args). `mag`
  // keeps its v2 meaning (buffer px), hence the x2.
  camera() {
    if (this.shakeFrames <= 0 || !this.shakeScale) return { x: 0, y: 0 };
    const m = this.shakeMag * 2 * (this.shakeFrames > 4 ? 1 : this.shakeFrames / 4);
    return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m * 0.6 };
  }

  // Particle emitters take WORLD coords; speeds/sizes are world px (v2 x2).
  spark(x, y, color, n = 6, spd = 1.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = spd * 2 * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, g: 0.16, life: 14 + (Math.random() * 8 | 0), color, size: Math.random() < 0.4 ? 4 : 2 });
    }
  }

  // Comic impact: a jagged paper star with an ink rim and radial speed lines,
  // popping out over a few frames. `dir` (+1/-1) leans the lines with the hit.
  burst(x, y, { big = false, dir = 0, color = '#c4452e' } = {}) {
    this.bursts.push({ x, y, t: 0, dur: big ? 11 : 7, big, dir, color, rot: Math.random() * Math.PI });
  }

  dust(x, y, color = '#cbbfa6', n = 4) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() * 20 - 10), y, vx: (Math.random() - 0.5) * 1.6, vy: -0.6 - Math.random() * 0.8, g: 0.02, life: 18 + (Math.random() * 10 | 0), color, size: 4 });
    }
  }

  ember(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() * 28 - 14), y: y - Math.random() * 8, vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random(), g: -0.01, life: 22 + (Math.random() * 12 | 0), color: Math.random() < 0.5 ? '#d8762e' : '#b3402e', size: Math.random() < 0.3 ? 4 : 2 });
    }
  }

  confetti(x, y, n = 14) {
    const cols = ['#c4452e', '#c9a227', '#27425f', '#3f5a40', '#f2e9d8'];
    for (let i = 0; i < n; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 4, g: 0.18, life: 40 + (Math.random() * 30 | 0), color: cols[i % cols.length], size: 4 });
    }
  }

  // Floating combat text at WORLD coords (projected on the UI layer).
  text(x, y, str, color = '#f2e9d8') {
    this.floaters.push({ x, y, str, color, t: 0, dur: 45 });
  }

  banner(text, { sub = '', dur = 110, color = '#2b2620', bg = '#f2e9d8', sound = null } = {}) {
    this.banners.push({ text, sub, t: 0, dur, color, bg });
    if (sound) this.audio?.play?.(sound);
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
    for (const b of this.bursts) b.t++;
    this.bursts = this.bursts.filter(b => b.t < b.dur);
    for (const f of this.floaters) { f.t++; f.y -= 0.7; }
    this.floaters = this.floaters.filter(f => f.t < f.dur);
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter(b => b.t < b.dur);
  }

  // Inside the camera transform: world objects, world px.
  drawWorld(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / 10);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const b of this.bursts) drawBurst(ctx, b);
  }

  // Screen space (identity transform). `camera` projects the floaters; with
  // no camera they are treated as already-screen coords.
  drawUI(ctx, camera = null) {
    for (const f of this.floaters) {
      const a = f.t < 8 ? f.t / 8 : f.t > f.dur - 12 ? (f.dur - f.t) / 12 : 1;
      const s = camera?.worldToScreen ? camera.worldToScreen(f.x, f.y) : { x: f.x, y: f.y };
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = "12px 'Silkscreen'";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2b2620';
      ctx.fillText(f.str, Math.round(s.x) + 1, Math.round(s.y) + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.str, Math.round(s.x), Math.round(s.y));
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
      const x = VIEW_W / 2 - w / 2;
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
      ctx.fillText(b.text, VIEW_W / 2, y);
      if (b.sub) {
        ctx.font = "600 17px 'Barlow Condensed'";
        ctx.fillStyle = '#5a5246';
        ctx.fillText(b.sub, VIEW_W / 2, y + 26);
      }
      ctx.restore();
    }
    // full-screen flash (KO, super)
    if (this.flashFrames > 0) {
      ctx.globalAlpha = this.flashFrames / 10;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
}

function drawBurst(ctx, b) {
  const k = b.t / b.dur, R = (b.big ? 46 : 28) * (0.55 + 0.6 * easeOut(Math.min(1, k * 1.6))), pts = b.big ? 10 : 8;
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
  ctx.fillStyle = '#2b2620';                                   // radial speed lines
  for (let i = 0; i < 8; i++) {
    const a = b.rot + i * Math.PI / 4 + b.dir * 0.2, r0 = R * 0.9, r1 = R * (1.35 + 0.25 * (i % 2));
    ctx.save(); ctx.rotate(a); ctx.fillRect(r0, -1.5, r1 - r0, 3); ctx.restore();
  }
  const star = (r, inner) => {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = b.rot + (i / (pts * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  star(R, 0.5); ctx.fillStyle = '#2b2620'; ctx.fill();
  star(R - 4, 0.48); ctx.fillStyle = '#f2e9d8'; ctx.fill();
  star(R * 0.5, 0.55); ctx.fillStyle = b.color; ctx.fill();
  ctx.restore();
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
