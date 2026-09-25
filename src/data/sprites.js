// Sprite-sheet manifest (Phase 3 sprite contract). One entry per fighter id;
// each anim names a sheet at assets/sprites/<id>/<anim>.png laid out as a
// grid of `cell`-px squares filled left-to-right, top-to-bottom with `frames`
// cells (`cols` = ceil(sqrt(frames)) unless given). Sheets face RIGHT; the
// renderer mirrors for facing === -1. A missing PNG (or a missing id here)
// falls back to the drawn body — the headshot drop-in rule applies.

// Generated through Higgsfield (gpt-image strips, see docs/superpowers/plans/
// 2026-09-25-phase3-revamp.md): 6-frame idle/jump/attack, 8-frame run; the
// kit-rethink pass added a per-fighter heavy swing, a signature special pose
// and a 4-frame hurt recoil. `key` is the frame at full extension / release:
// render/moves.js holds it through the move's active frames, so the picture
// peaks when the hitbox is live. A missing strip falls back to `attack`/idle.
const KIT = (over = {}) => mergeKit({
  idle:    { frames: 6, fps: 6,  loop: true },
  run:     { frames: 8, fps: 14, loop: true },
  jump:    { frames: 6, fps: 12, loop: false },
  attack:  { frames: 6, fps: 16, loop: false, key: 3 },
  heavy:   { frames: 6, fps: 14, loop: false, key: 3, cell: 80 },   // 80 px cells: room for the swing,
  special: { frames: 6, fps: 14, loop: false, key: 3, cell: 80 },   // same pixel scale as the 64 px sheets
  hurt:    { frames: 4, fps: 14, loop: false },
}, over);
const mergeKit = (base, over) => Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { ...v, ...over[k] }]));

// `scale` is the fighter's art height relative to the 96 px hurtbox (render
// only: hitboxes, hurtboxes and physics never read it). The sheets are all
// normalised to the same cell height, so this is where Abi is drawn a touch
// shorter than Tim and Mike (broad, plus a hard hat) is brought back in line.
export const SPRITES = {
  ben:    { cell: 64, anims: KIT() },
  tim:    { cell: 64, anims: KIT() },
  adrian: { cell: 64, anims: KIT() },
  richy:  { cell: 64, anims: KIT() },
  nick:   { cell: 64, anims: KIT() },
  abi:    { cell: 64, scale: 0.93, anims: KIT() },
  mike:   { cell: 64, scale: 0.96, anims: KIT({ special: { key: 4 } }) },   // his special peaks on the ground slam
  seelye: { cell: 64, anims: KIT() },
};

export const SPRITE_SCALE = 1.5;   // 64 px cell -> 96 world px (= MovementBody.h)
export const SPRITE_ANIMS = ['idle', 'run', 'jump', 'attack', 'heavy', 'special', 'hurt'];
