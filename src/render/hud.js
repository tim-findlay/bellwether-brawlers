// Fight HUD: paper-and-ink health/meter bars, cooldown pips, status callouts.
// Drawn at full resolution (960x540); world coords are doubled.

const INK = '#2b2620';
const PAPER = '#f2e9d8';

export function drawHUD(c, world, { roundTimer, wins, roundNum }) {
  const [a, b] = world.fighters;
  drawBar(c, a, 30, false);
  drawBar(c, b, 930 - 360, true);

  // timer plate
  c.fillStyle = INK; c.fillRect(442, 18, 76, 52);
  c.fillStyle = PAPER; c.fillRect(446, 22, 68, 44);
  c.fillStyle = roundTimer < 600 ? '#c4452e' : INK;
  c.font = "700 30px 'Silkscreen'";
  c.textAlign = 'center';
  c.fillText(String(Math.max(0, Math.ceil(roundTimer / 60))).padStart(2, '0'), 480, 56);

  // round pips
  for (let i = 0; i < 2; i++) {
    pip(c, 414 - i * 18, 64, wins[0] > i);
    pip(c, 546 + i * 18, 64, wins[1] > i);
  }

  drawStatusTags(c, a);
  drawStatusTags(c, b);
}

function drawBar(c, f, x, flip) {
  const W = 360, H = 22;
  // plate
  c.fillStyle = INK; c.fillRect(x - 4, 18, W + 8, 58);
  c.fillStyle = PAPER; c.fillRect(x - 1, 21, W + 2, 52);
  // hp
  c.fillStyle = '#d8cfba'; c.fillRect(x, 24, W, H);
  const pct = Math.max(0, f.hp / f.maxhp);
  const fw = W * pct;
  c.fillStyle = pct > 0.5 ? '#3f5a40' : pct > 0.25 ? '#c9a227' : '#c4452e';
  c.fillRect(flip ? x + W - fw : x, 24, fw, H);
  c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(x, 24, W, H);
  // name
  c.fillStyle = INK;
  c.font = "700 17px 'Pixelify Sans'";
  c.textAlign = flip ? 'right' : 'left';
  c.fillText(`${f.cfg.name} · ${f.cfg.title}`, flip ? x + W - 4 : x + 4, 64);
  // meter
  const mw = W * 0.62;
  const mx = flip ? x + W - mw : x;
  c.fillStyle = '#d8cfba'; c.fillRect(mx, 50, mw, 8);
  const mf = mw * (f.meter / 100);
  c.fillStyle = f.meter >= 100 ? '#c9a227' : '#27425f';
  c.fillRect(flip ? mx + mw - mf : mx, 50, mf, 8);
  c.strokeRect(mx, 50, mw, 8);
  if (f.meter >= 100 && (f.world.frame & 16) === 0) {
    c.fillStyle = '#c9a227';
    c.font = "700 11px 'Silkscreen'";
    c.textAlign = flip ? 'left' : 'right';
    c.fillText('SUPER READY', flip ? x + 2 : x + W - 2, 58);
  }
  // special cooldown pips (padlocked while silenced)
  const silenced = f.hasStatus('silence');
  ['s1', 's2'].forEach((slot, i) => {
    const px = flip ? x + W - 14 - i * 18 : x + 2 + i * 18;
    const ready = f.cd[slot] <= 0 && !silenced;
    c.fillStyle = ready ? '#3f5a40' : '#b4a98e';
    c.fillRect(px, 80, 14, 8);
    if (!ready && !silenced) {
      const m = f.cfg[slot];
      c.fillStyle = '#6e6450';
      c.fillRect(px, 80, 14 * (1 - f.cd[slot] / m.cooldown), 8);
    }
    c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(px, 80, 14, 8);
    if (silenced) {
      c.fillStyle = '#c4452e';
      c.font = "700 9px 'Silkscreen'";
      c.textAlign = 'center';
      c.fillText('X', px + 7, 88);
    }
  });
}

function pip(c, x, y, on) {
  c.fillStyle = on ? '#c4452e' : '#d8cfba';
  c.fillRect(x - 6, y - 6, 12, 12);
  c.strokeStyle = INK; c.lineWidth = 2;
  c.strokeRect(x - 6, y - 6, 12, 12);
}

// Word callouts + duration bars above the fighter's head — statuses are never
// icon-only (design review: words on screen for casual players).
const STATUS_LABEL = {
  reversed: ['REVERSED!', '#c4452e'],
  silence: ['SPECIALS LOCKED', '#c4452e'],
  slow: ['SLOWED', '#27425f'],
  haste: ['FAST', '#3f5a40'],
  burn: ['BURNING', '#c4452e'],
  lien: ['LIEN', '#c9a227'],
  dmgUp: ['+DMG', '#c9a227'],
  regen: ['LAST ORDERS', '#3f5a40'],
  berlin: ['HOME TURF', '#27425f'],
};

function drawStatusTags(c, f) {
  let row = 0;
  for (const [name, s] of f.statuses) {
    const def = STATUS_LABEL[name];
    if (!def) continue;
    const x = f.x * 2, y = (f.y - 58 - (f.cfg.body.height || 1) * 14) * 2 - row * 18;
    c.font = "700 10px 'Silkscreen'";
    c.textAlign = 'center';
    c.fillStyle = INK;
    c.fillText(def[0], x + 1, y + 1);
    c.fillStyle = def[1];
    c.fillText(def[0], x, y);
    // duration bar
    c.fillStyle = INK; c.fillRect(x - 16, y + 3, 32, 3);
    c.fillStyle = def[1]; c.fillRect(x - 15, y + 4, 30 * (s.dur / s.max), 1);
    row++;
  }
  if (f.controller.reversed && !f.hasStatus('reversed')) f.controller.reversed = false;
}
