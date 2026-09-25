// Sprite-sheet manifest (Phase 3 sprite contract). One entry per fighter id;
// each anim names a sheet at assets/sprites/<id>/<anim>.png laid out as a
// grid of `cell`-px squares filled left-to-right, top-to-bottom with `frames`
// cells (`cols` = ceil(sqrt(frames)) unless given). Sheets face RIGHT; the
// renderer mirrors for facing === -1. A missing PNG (or a missing id here)
// falls back to the drawn body — the headshot drop-in rule applies.

const KIT = () => ({
  idle:   { frames: 8,  fps: 8,  loop: true },
  run:    { frames: 10, fps: 14, loop: true },
  jump:   { frames: 8,  fps: 12, loop: false },
  attack: { frames: 10, fps: 16, loop: false },
});

export const SPRITES = {
  ben:    { cell: 64, anims: KIT() },
  tim:    { cell: 64, anims: KIT() },
  adrian: { cell: 64, anims: KIT() },
  richy:  { cell: 64, anims: KIT() },
  nick:   { cell: 64, anims: KIT() },
  abi:    { cell: 64, anims: KIT() },
  mike:   { cell: 64, anims: KIT() },
  seelye: { cell: 64, anims: KIT() },
};

export const SPRITE_SCALE = 1.5;   // 64 px cell -> 96 world px (= MovementBody.h)
export const SPRITE_ANIMS = ['idle', 'run', 'jump', 'attack'];
