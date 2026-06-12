// Camera — pure framing math for the v3 world. Follows targets, zooms to fit,
// eases, clamps to per-stage cameraBounds, and converts world<->screen.
// Screenshake composes via apply()'s offset args; it never moves this.x/y.

export class Camera {
  constructor(viewW, viewH, bounds, opts = {}) {
    this.viewW = viewW; this.viewH = viewH;
    this.bounds = bounds;                       // world rect the camera may show
    this.pad = opts.pad ?? 150;                 // world px kept around targets
    // cover-fit: at full zoom-out the view stays INSIDE the bounds (no stray
    // space past the camera box on either axis)
    this.minZoom = opts.minZoom ?? Math.max(viewW / bounds.w, viewH / bounds.h);
    this.maxZoom = opts.maxZoom ?? 1.15;
    this.ease = opts.ease ?? 0.12;              // per-frame lerp factor
    this.x = bounds.x + bounds.w / 2;
    this.y = bounds.y + bounds.h / 2;
    this.zoom = this.minZoom;
  }

  // Desired framing for target points; pure, no state change.
  target(points) {
    if (!points.length) return { x: this.x, y: this.y, zoom: this.zoom };  // never NaN-poison the lerp
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const w = (maxX - minX) + this.pad * 2;
    const h = (maxY - minY) + this.pad * 2;
    const fit = Math.min(this.viewW / w, this.viewH / h);
    const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, fit));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
  }

  update(points) {
    const t = this.target(points);
    this.zoom += (t.zoom - this.zoom) * this.ease;
    this.x += (t.x - this.x) * this.ease;
    this.y += (t.y - this.y) * this.ease;
    this._clamp();
  }

  _clamp() {
    const b = this.bounds;
    const halfW = this.viewW / 2 / this.zoom, halfH = this.viewH / 2 / this.zoom;
    this.x = halfW * 2 >= b.w ? b.x + b.w / 2
      : Math.min(Math.max(this.x, b.x + halfW), b.x + b.w - halfW);
    this.y = halfH * 2 >= b.h ? b.y + b.h / 2
      : Math.min(Math.max(this.y, b.y + halfH), b.y + b.h - halfH);
  }

  worldToScreen(wx, wy) {
    return { x: (wx - this.x) * this.zoom + this.viewW / 2,
             y: (wy - this.y) * this.zoom + this.viewH / 2 };
  }
  screenToWorld(sx, sy) {
    return { x: (sx - this.viewW / 2) / this.zoom + this.x,
             y: (sy - this.viewH / 2) / this.zoom + this.y };
  }

  // World-space drawing transform; screenshake rides as a screen-space offset.
  apply(ctx, shakeX = 0, shakeY = 0) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom,
      this.viewW / 2 - this.x * this.zoom + shakeX,
      this.viewH / 2 - this.y * this.zoom + shakeY);
  }
  static reset(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
}
