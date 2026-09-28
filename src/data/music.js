// Music data (v3 sound pass), played by src/engine/music.js. One loop per
// stage in its own idiom — office bossa, pub folk shuffle, rooftop breeze,
// tube drive, palace harpsichord, Berlin minimal — plus the menu theme and a
// victory jingle. Warm acoustic-ish timbres, soft drums: daylight, not neon.
//
// A song: bpm, optional swing (0..0.5 of a 16th), chords (one per bar) and
// tracks { inst, pattern, octave, vol, len, min }. A pattern is 16 steps per
// bar (a string, or an array of strings cycled per bar): '.' rest, 'x' hit
// (drums), 'c' the whole chord, '1' '3' '5' '7' chord tones, '8' the root an
// octave up. `len` holds a note for that many steps; `min` is the intensity
// (0..1) a track needs before it plays — the fight raises it on a last stock.

const osc = (o) => ({ kind: 'osc', ...o });
const noise = (o) => ({ kind: 'noise', ...o });
const fm = (o) => ({ kind: 'fm', ...o });

// Pitched instruments are written at A440 and pitch-scaled per note.
export const INSTRUMENTS = {
  epiano: { layers: [osc({ f0: 440, dur: 0.9, vol: 0.085, attack: 0.008 }), fm({ f0: 440, ratio: 1, index: 0.7, dur: 0.45, vol: 0.03 }), osc({ type: 'triangle', f0: 880, dur: 0.3, vol: 0.015 })] },
  bass:   { layers: [osc({ type: 'triangle', f0: 440, dur: 0.32, vol: 0.17, lp: 900 }), osc({ f0: 440, dur: 0.36, vol: 0.12 })] },
  pluck:  { layers: [osc({ type: 'square', f0: 440, dur: 0.18, vol: 0.03, lp: 1700 }), osc({ type: 'triangle', f0: 440, dur: 0.22, vol: 0.045 })] },
  harpsi: { layers: [osc({ type: 'sawtooth', f0: 440, dur: 0.26, vol: 0.03, lp: 3200 }), osc({ type: 'square', f0: 880, dur: 0.07, vol: 0.012, lp: 3200 })] },
  pad:    { layers: [osc({ type: 'sawtooth', f0: 440, dur: 1.8, attack: 0.45, vol: 0.022, lp: 850, detune: -9 }), osc({ type: 'sawtooth', f0: 440, dur: 1.8, attack: 0.45, vol: 0.022, lp: 850, detune: 9 })] },
  kick:   { drum: true, layers: [osc({ f0: 125, f1: 45, dur: 0.17, vol: 0.45 }), noise({ filter: 'lowpass', f0: 1000, dur: 0.02, vol: 0.05 })] },
  snare:  { drum: true, layers: [noise({ f0: 1800, dur: 0.13, vol: 0.11 }), osc({ type: 'triangle', f0: 190, f1: 150, dur: 0.06, vol: 0.05 })] },
  rim:    { drum: true, layers: [noise({ filter: 'highpass', f0: 2600, dur: 0.025, vol: 0.07 }), osc({ type: 'square', f0: 820, dur: 0.015, vol: 0.02, lp: 3000 })] },
  hat:    { drum: true, layers: [noise({ filter: 'highpass', f0: 7200, dur: 0.035, vol: 0.04 })] },
  shaker: { drum: true, layers: [noise({ filter: 'highpass', f0: 5200, dur: 0.05, vol: 0.028, attack: 0.015 })] },
  tamb:   { drum: true, layers: [noise({ filter: 'highpass', f0: 6200, dur: 0.09, vol: 0.032 }), fm({ f0: 3100, ratio: 1.3, index: 1, dur: 0.05, vol: 0.008 })] },
};

export const SONGS = {
  menu: { bpm: 92, swing: 0.14, chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'], tracks: [
    { inst: 'epiano', octave: 4, pattern: 'c......c..c.....', len: 3, vol: 0.9 },
    { inst: 'bass', octave: 2, pattern: '1.....5.8...5.3.' },
    { inst: 'kick', pattern: 'x.......x.x.....' },
    { inst: 'rim', pattern: '....x.......x...' },
    { inst: 'hat', pattern: 'x.x.x.x.x.x.x.x.', vol: 0.7 },
  ] },
  office: { bpm: 104, swing: 0.06, chords: ['Cmaj7', 'A7', 'Dm7', 'G7'], tracks: [          // bossa in the open-plan
    { inst: 'epiano', octave: 4, pattern: 'c..c..c...c..c..', len: 2 },
    { inst: 'bass', octave: 2, pattern: '1.....5.1.....5.' },
    { inst: 'kick', pattern: 'x.......x.......', vol: 0.8 },
    { inst: 'rim', pattern: '..x..x....x..x..' },
    { inst: 'shaker', pattern: 'x.xxx.xxx.xxx.xx', vol: 0.8 },
    { inst: 'pluck', octave: 5, pattern: '1.3.5.7.8.7.5.3.', min: 0.5, vol: 0.8 },
  ] },
  pub: { bpm: 116, swing: 0.22, chords: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G'], tracks: [   // folk session in the snug
    { inst: 'pluck', octave: 5, pattern: '1.3.5.3.1.3.5.8.' },
    { inst: 'bass', octave: 2, pattern: '1...5...1...5...' },
    { inst: 'kick', pattern: 'x.......x.......', vol: 0.8 },
    { inst: 'snare', pattern: '....x.......x...', vol: 0.7 },
    { inst: 'tamb', pattern: '..x...x...x...x.' },
    { inst: 'epiano', octave: 4, pattern: 'c.......c.......', len: 4, min: 0.5, vol: 0.6 },
  ] },
  rooftop: { bpm: 96, chords: ['Ebmaj7', 'Fm7', 'Gm7', 'Abmaj7'], tracks: [                // breezy, wide open
    { inst: 'pad', octave: 3, pattern: 'c...............', len: 16, vol: 0.9 },
    { inst: 'pluck', octave: 5, pattern: '1..3..5..7..5...' },
    { inst: 'bass', octave: 2, pattern: '1.......5.......' },
    { inst: 'kick', pattern: 'x.........x.....', vol: 0.8 },
    { inst: 'hat', pattern: '..x...x...x...x.', min: 0.4 },
  ] },
  tube: { bpm: 124, chords: ['Am', 'F', 'C', 'G'], tracks: [                                 // the Northern line at rush hour
    { inst: 'bass', octave: 2, pattern: '1.1.1.1.1.1.5.1.' },
    { inst: 'kick', pattern: 'x...x...x...x...' },
    { inst: 'snare', pattern: '....x.......x...', vol: 0.8 },
    { inst: 'hat', pattern: 'x.x.x.x.x.x.x.x.', vol: 0.8 },
    { inst: 'pluck', octave: 4, pattern: 'c..c..c.....c...', vol: 0.8 },
    { inst: 'hat', pattern: '.x.x.x.x.x.x.x.x', min: 0.5, vol: 0.6 },
  ] },
  palace: { bpm: 88, chords: ['Dm', 'A7', 'Dm', 'Gm', 'C', 'F', 'Bb', 'A7'], tracks: [         // a harpsichord in the state rooms
    { inst: 'harpsi', octave: 4, pattern: '1.3.5.8.5.3.1.3.' },
    { inst: 'bass', octave: 2, pattern: '1...1...5...1...', vol: 0.8 },
    { inst: 'harpsi', octave: 5, pattern: '8.......5.......', vol: 0.6 },
    { inst: 'kick', pattern: 'x.......x.......', min: 0.5, vol: 0.6 },
  ] },
  berlin: { bpm: 126, chords: ['Am7', 'Am7', 'Fmaj7', 'Fmaj7'], tracks: [                    // minimal, after hours
    { inst: 'kick', pattern: 'x...x...x...x...' },
    { inst: 'hat', pattern: '..x...x...x...x.' },
    { inst: 'bass', octave: 2, pattern: '..1...1...1...1.' },
    { inst: 'pluck', octave: 4, pattern: '1..5..8..5..3...', vol: 0.7 },
    { inst: 'rim', pattern: '....x.......x...', min: 0.5 },
  ] },
  boombap: { bpm: 90, swing: 0.3, chords: ['Am7', 'Am7', 'Dm7', 'Em7'], tracks: [            // DESIGN: Seelye in the match -> 90s boom-bap
    { inst: 'kick', pattern: 'x.........x.x...' },
    { inst: 'snare', pattern: '....x.......x...' },
    { inst: 'hat', pattern: 'x.x.x.x.x.x.x.x.', vol: 0.9 },
    { inst: 'shaker', pattern: '..x...x...x...x.', vol: 0.5 },
    { inst: 'bass', octave: 2, pattern: '1.....1...5.....' },
    { inst: 'epiano', octave: 4, pattern: 'c.......c..c....', len: 3, vol: 0.8 },
    { inst: 'pluck', octave: 5, pattern: '8...5...3...1...', min: 0.5, vol: 0.6 },
  ] },
  victory: { bpm: 132, once: true, chords: ['C', 'F', 'G', 'C'], tracks: [
    { inst: 'pluck', octave: 5, pattern: ['1.3.5.8.........', '1.3.5.8.........', '1.3.5.8.5.3.5.8.', '8...............'], len: 2 },
    { inst: 'epiano', octave: 4, pattern: 'c...............', len: 12 },
    { inst: 'bass', octave: 2, pattern: '1.......5.......' },
    { inst: 'kick', pattern: 'x.......x.......', vol: 0.7 },
  ] },
};

// Which song a screen wants. The fight passes its (possibly overridden) stage id.
export function songFor(screen, params = {}) {
  if (screen === 'fight') {
    if (params.p1 === 'seelye' || params.p2 === 'seelye') return 'boombap';        // DESIGN.md Audio: the whole soundtrack switches
    return SONGS[params.stageId] ? params.stageId : 'office';
  }
  if (screen === 'results') return 'victory';
  return 'menu';
}

// ---- chord spelling -----------------------------------------------------------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], m9: [0, 3, 7, 14], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus2: [0, 2, 7], '6': [0, 4, 7, 9] };
const cache = new Map();

// 'Ebmaj7' at octave 4 -> frequencies [root, third, fifth, (seventh)]
export function chordNotes(name, octave = 4) {
  const key = name + octave;
  if (cache.has(key)) return cache.get(key);
  const m = /^([A-G])([b#]?)(.*)$/.exec(name);
  const root = NOTE[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
  const midi = 12 * (octave + 1) + root;
  const out = (QUAL[m[3]] || QUAL['']).map(i => 440 * Math.pow(2, (midi + i - 69) / 12));
  cache.set(key, out);
  return out;
}
