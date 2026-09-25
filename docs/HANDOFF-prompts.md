# Higgsfield prompt templates (Phase 3c art pass)

Replace `{OUTFIT}` with the fighter's outfit line from the table below. Strips use `gpt_image_2_5`, 16:9, with the fighter's big-head base job ID as `medias: [{ role: "image_references", value: <base job id> }]`.

## Shared style tail (every strip ends with this)

```
chunky 16-bit pixel art, 64-pixel-tall character grid feel with clean hand-placed pixels and no anti-aliasing, bold dark-ink outlines and flat posterized shading in two tones, warm paper-and-ink palette: muted navy, brick red, brass yellow, olive green and cream on characters, daylight office mood with flat ambient light and no glow or bloom, high contrast readable silhouettes, consistent side-view perspective across all assets, on a solid uniform bright magenta background, no grid lines, no frame borders, no shadows on the background, no ground plane, no text, no numbers, no watermark
```

## Strip openers

Each opener is followed by: `the identical character in every cell (same outfit, same colours, and the SAME stylised proportions as the reference: an oversized head about one third of the total height, compact body, short limbs; {OUTFIT}), side view facing right, ...`

- **idle (6 frames):** `pixel art sprite sheet strip of the character from the reference image: exactly 6 frames of a subtle idle breathing animation laid out in ONE horizontal row of 6 equal-width cells,` … `in a relaxed fighting-ready stance, feet planted on the same baseline in every cell, only a slight rise and fall of the chest and shoulders and a small sway of the arms from frame to frame, each frame fully visible with clear empty margin between cells and nothing cropped,`
- **run (8 frames):** `exactly 8 frames of a fast running cycle laid out in ONE horizontal row of 8 equal-width cells,` … `feet on the same baseline in every cell, legs and arms in different phases of the run stride from frame to frame (contact, recoil, passing, high-point, repeated for the other leg), each frame fully visible with clear empty margin between cells and nothing cropped,`
- **jump (6 frames):** `exactly 6 frames of a jump animation laid out in ONE horizontal row of 6 equal-width cells,` … `the sequence: crouched anticipation, launching upward with legs tucked, rising with arms raised, apex with body stretched, falling with legs splayed and arms out, landing crouch, every frame drawn at the same scale with the character fully visible, clear empty margin between cells and nothing cropped,`
- **attack (6 frames):** `exactly 6 frames of a fast melee attack animation laid out in ONE horizontal row of 6 equal-width cells,` … `the sequence: stance, wind-up with the fist drawn back, step in, full extension of a straight right punch at head height, follow-through, recover to stance, feet on the same baseline in every cell, every frame drawn at the same scale with the character fully visible, clear empty margin between cells and nothing cropped,`

## Outfit lines (remaining fighters)

| Fighter | `{OUTFIT}` |
|---|---|
| Nick | slim navy suit, white open-collar shirt, clean white sneakers, dark hair in a tall quiff, clean-shaven, empty hands |
| Mike | fit, athletic, broad-shouldered build with no belly, dark work jacket under an orange hi-vis vest, yellow hard hat, grey hair, red-and-white football scarf, empty hands |
| Abi | long straight blonde hair past the shoulders, fitted brick-red blazer over a cream blouse, crisp white trousers, flat black shoes, no bag, empty hands |
| Seelye | charcoal-grey two-piece suit, white shirt, olive-green tie, short neat dark-brown hair, clean-shaven, brown leather shoes, empty hands |

## Stage prompts used (for re-rolls)

- **Far backdrop.** Start with `the FAR background layer of a side-scrolling platform-fighter stage: <scene>, ... sitting far behind the play area with atmospheric perspective: detail softened and simplified, contrast lowered, colours muted and lightened as if seen through daylight haze, the lower-middle band of the frame left as plain open <floor> with no objects so a floating arena and the fighters can be drawn in front and stay readable, no objects in the near foreground, horizon around the lower third, empty of people, no text ...`. End with the stage style tail.
- **Arena piece.** Start with `a single wide floating arena platform for a side-scrolling platform fighter, in the spirit of a Brawlhalla stage piece: <chunk of the scene> torn out and floating in the air, <surface> on its flat top, <sides>, <underside> tapering underneath, side view exactly straight-on, the flat walkable top surface runs the full width along the very top edge of the object with nothing standing on it, the object is a wide low chunk about three times wider than tall and fills the frame width, ... isolated on a solid uniform bright magenta background ...`.
