// Sound recipes (v3 sound pass). Each sound is a stack of layers the engine
// (src/engine/audio.js) voices: `osc` (pitch-swept oscillator, optional
// lowpass `lp`), `noise` (filtered noise, swept f0 -> f1) and `fm` (bell /
// metal). vol is peak gain, dur seconds, delay seconds. `vary` is the random
// pitch spread per play (repeats never sound mechanical); `gap` the
// anti-stacking window. Warm and physical, not chiptune: thumps have a sine
// body, cracks are short high noise, whooshes are swept band noise.

const osc = (o) => ({ kind: 'osc', ...o });
const noise = (o) => ({ kind: 'noise', ...o });
const fm = (o) => ({ kind: 'fm', ...o });

export const SFX = {
  // ---- menus: soft wooden clicks and two-note confirms
  menuMove:    { vary: 0.03, layers: [osc({ type: 'triangle', f0: 660, f1: 620, dur: 0.05, vol: 0.07 }), noise({ filter: 'highpass', f0: 5000, dur: 0.012, vol: 0.05 })] },
  menuConfirm: { vary: 0, layers: [osc({ type: 'triangle', f0: 523, dur: 0.09, vol: 0.09 }), osc({ type: 'triangle', f0: 784, dur: 0.16, vol: 0.09, delay: 0.07 }), noise({ filter: 'highpass', f0: 4500, dur: 0.015, vol: 0.05 })] },
  menuBack:    { vary: 0, layers: [osc({ type: 'triangle', f0: 523, f1: 392, dur: 0.12, vol: 0.08 })] },

  // ---- hits: crack + sine thump (+ crunch and low body for heavies)
  hitLight: { vary: 0.08, layers: [
    noise({ filter: 'highpass', f0: 2600, dur: 0.035, vol: 0.2 }),
    osc({ f0: 230, f1: 85, dur: 0.08, vol: 0.28 }),
    noise({ filter: 'bandpass', f0: 900, dur: 0.05, vol: 0.08 }),
  ] },
  hitHeavy: { vary: 0.06, layers: [
    noise({ filter: 'bandpass', f0: 1600, f1: 500, dur: 0.09, vol: 0.3, crunch: true }),
    osc({ f0: 150, f1: 40, dur: 0.24, vol: 0.5 }),
    osc({ type: 'square', f0: 95, f1: 48, dur: 0.12, vol: 0.07, lp: 700 }),
    noise({ filter: 'lowpass', f0: 500, dur: 0.26, vol: 0.14 }),
  ] },
  block:  { vary: 0.05, layers: [fm({ f0: 330, ratio: 1.41, index: 3, dur: 0.2, vol: 0.1 }), noise({ filter: 'highpass', f0: 3000, dur: 0.03, vol: 0.1 })] },   // armor clank
  parry:  { vary: 0.02, layers: [fm({ f0: 880, ratio: 1.5, index: 2, dur: 0.4, vol: 0.12 }), osc({ f0: 1760, dur: 0.12, vol: 0.05 }), noise({ filter: 'highpass', f0: 4000, dur: 0.02, vol: 0.08 })] },
  ko:     { vary: 0.03, gap: 0.2, layers: [
    osc({ f0: 95, f1: 28, dur: 0.7, vol: 0.55 }),
    noise({ filter: 'lowpass', f0: 900, f1: 180, dur: 0.8, vol: 0.3, crunch: true }),
    osc({ type: 'sawtooth', f0: 220, f1: 55, dur: 0.45, vol: 0.06, lp: 900 }),
  ] },

  spike:     { vary: 0.04, layers: [osc({ f0: 90, f1: 38, dur: 0.18, vol: 0.4 }), noise({ filter: 'lowpass', f0: 400, dur: 0.1, vol: 0.18, crunch: true })] },   // the downward thunk
  stockLost: { vary: 0, gap: 0.5, layers: [osc({ type: 'triangle', f0: 392, dur: 0.14, vol: 0.08, delay: 0.25 }), osc({ type: 'triangle', f0: 311, dur: 0.14, vol: 0.08, delay: 0.4 }), osc({ type: 'triangle', f0: 262, dur: 0.4, vol: 0.09, delay: 0.55 })] },
  chair:     { vary: 0, gap: 0.5, layers: [osc({ type: 'triangle', f0: 880, f1: 440, dur: 0.9, vol: 0.035, attack: 0.3 }), noise({ filter: 'bandpass', f0: 600, f1: 300, dur: 0.9, vol: 0.02, attack: 0.3 })] },   // respawn chair descending

  // ---- swings & motion: swept band noise, quieter than any hit
  whiff:      { vary: 0.08, layers: [noise({ f0: 1400, f1: 2800, dur: 0.07, vol: 0.05, attack: 0.02 })] },
  swingLight: { vary: 0.1, layers: [noise({ f0: 900, f1: 2600, q: 1.2, dur: 0.09, vol: 0.075, attack: 0.025 })] },
  swingHeavy: { vary: 0.08, layers: [noise({ f0: 450, f1: 1900, q: 1.1, dur: 0.17, vol: 0.11, attack: 0.05 }), osc({ type: 'triangle', f0: 110, f1: 90, dur: 0.12, vol: 0.03 })] },
  lunge:      { vary: 0.08, layers: [noise({ f0: 380, f1: 2400, q: 1, dur: 0.24, vol: 0.11, attack: 0.07 }), osc({ type: 'triangle', f0: 170, f1: 250, dur: 0.16, vol: 0.03 })] },
  dash:       { vary: 0.1, layers: [noise({ f0: 1500, f1: 3200, dur: 0.09, vol: 0.055, attack: 0.015 })] },
  jump:       { vary: 0.08, layers: [osc({ type: 'triangle', f0: 240, f1: 430, dur: 0.07, vol: 0.05 }), noise({ filter: 'highpass', f0: 3200, dur: 0.03, vol: 0.03 })] },
  airJump:    { vary: 0.08, layers: [osc({ type: 'triangle', f0: 330, f1: 580, dur: 0.06, vol: 0.045 }), noise({ f0: 2000, f1: 3200, dur: 0.06, vol: 0.03 })] },
  land:       { vary: 0.1, layers: [osc({ f0: 125, f1: 55, dur: 0.07, vol: 0.14 }), noise({ filter: 'lowpass', f0: 700, dur: 0.06, vol: 0.07 })] },   // gain scales with the fall
  dodge:      { vary: 0.08, layers: [noise({ f0: 2600, f1: 800, q: 1.2, dur: 0.14, vol: 0.06, attack: 0.03 })] },
  ledge:      { vary: 0.05, layers: [osc({ type: 'square', f0: 720, f1: 660, dur: 0.03, vol: 0.035, lp: 2400 }), noise({ filter: 'highpass', f0: 3500, dur: 0.02, vol: 0.05 })] },
  slip:       { vary: 0.05, layers: [osc({ type: 'triangle', f0: 1000, f1: 300, dur: 0.18, vol: 0.09 }), noise({ filter: 'lowpass', f0: 600, dur: 0.12, vol: 0.08, delay: 0.14 })] },

  // ---- specials & supers
  special:    { vary: 0.04, layers: [osc({ type: 'triangle', f0: 320, f1: 640, dur: 0.14, vol: 0.1 }), noise({ f0: 1000, f1: 2600, dur: 0.1, vol: 0.04 })] },
  teleport:   { vary: 0.03, layers: [osc({ f0: 1300, f1: 220, dur: 0.14, vol: 0.08 }), noise({ filter: 'highpass', f0: 6000, f1: 1500, dur: 0.14, vol: 0.05 })] },
  grab:       { vary: 0.04, layers: [noise({ filter: 'lowpass', f0: 600, dur: 0.08, vol: 0.14 }), osc({ type: 'sawtooth', f0: 110, f1: 55, dur: 0.22, vol: 0.1, delay: 0.07, lp: 600 })] },
  superReady: { vary: 0, gap: 0.3, layers: [fm({ f0: 1047, ratio: 2, index: 1.2, dur: 0.3, vol: 0.07 }), fm({ f0: 1568, ratio: 2, index: 1.2, dur: 0.4, vol: 0.07, delay: 0.09 })] },
  superGo:    { vary: 0, gap: 0.3, layers: [
    noise({ f0: 300, f1: 3200, dur: 0.45, vol: 0.12, attack: 0.2 }),
    osc({ type: 'sawtooth', f0: 110, f1: 440, dur: 0.4, vol: 0.07, lp: 1400 }),
    osc({ f0: 55, dur: 0.55, vol: 0.18 }),
  ] },
  burn:       { vary: 0.1, layers: [noise({ filter: 'lowpass', f0: 800, dur: 0.18, vol: 0.05 })] },
  heal:       { vary: 0, layers: [osc({ type: 'triangle', f0: 523, f1: 659, dur: 0.1, vol: 0.07 }), osc({ type: 'triangle', f0: 784, dur: 0.12, vol: 0.06, delay: 0.09 })] },
  pop:        { vary: 0.06, layers: [osc({ type: 'triangle', f0: 300, f1: 520, dur: 0.06, vol: 0.08 })] },

  // ---- match flow & events
  roundGo: { vary: 0, gap: 0.5, layers: [
    osc({ type: 'sawtooth', f0: 392, dur: 0.1, vol: 0.07, lp: 1800 }), osc({ type: 'sawtooth', f0: 392, dur: 0.1, vol: 0.07, lp: 1800, delay: 0.13 }),
    osc({ type: 'sawtooth', f0: 587, dur: 0.28, vol: 0.09, lp: 2200, delay: 0.26 }), osc({ f0: 147, dur: 0.3, vol: 0.12, delay: 0.26 }),
  ] },
  klaxon:  { vary: 0, gap: 0.4, layers: [osc({ type: 'square', f0: 660, f1: 440, dur: 0.18, vol: 0.08, lp: 2000 }), osc({ type: 'square', f0: 660, f1: 440, dur: 0.18, vol: 0.08, lp: 2000, delay: 0.22 })] },
  mash:    { vary: 0.05, layers: [osc({ type: 'triangle', f0: 700, f1: 740, dur: 0.03, vol: 0.05 })] },
  wave:    { vary: 0, layers: [noise({ filter: 'lowpass', f0: 300, f1: 900, dur: 0.5, vol: 0.1, attack: 0.2 })] },
  bikeBell:{ vary: 0, layers: [fm({ f0: 1568, ratio: 2.2, index: 1, dur: 0.12, vol: 0.07 }), fm({ f0: 1568, ratio: 2.2, index: 1, dur: 0.14, vol: 0.07, delay: 0.1 })] },
  alarm:   { vary: 0, gap: 0.5, layers: [0, 0.15, 0.3].map(d => osc({ type: 'square', f0: 880, dur: 0.1, vol: 0.07, lp: 2400, delay: d })) },
  bell:    { vary: 0, gap: 0.5, layers: [fm({ f0: 1175, ratio: 1.41, index: 1.5, dur: 0.9, vol: 0.1 }), fm({ f0: 587, ratio: 1.41, index: 1, dur: 1.1, vol: 0.07 })] },
  jet:     { vary: 0, gap: 0.5, layers: [noise({ filter: 'lowpass', f0: 250, f1: 900, dur: 0.7, vol: 0.12, attack: 0.25 }), osc({ type: 'sawtooth', f0: 180, f1: 600, dur: 0.6, vol: 0.04, lp: 900 })] },
};
