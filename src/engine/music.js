// Music: a tiny step sequencer that plays the song data in src/data/music.js
// through the Audio music bus. It runs on the AudioContext clock (25 ms tick,
// 120 ms lookahead) — never on the game loop, so it can't touch gameplay
// timing. Songs are chord loops + 16-step patterns per instrument; `min`
// layers only play when the intensity (0..1, set by the fight: last stock)
// reaches them. A song with `once` plays through and stops (the victory
// jingle). Everything degrades to silence when audio is off or blocked.

import { SONGS, INSTRUMENTS, chordNotes } from '../data/music.js';

const LOOKAHEAD = 0.12, TICK_MS = 25;

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.song = null; this.id = null;
    this.intensity = 0;
    this.step = 0; this.nextT = 0; this.timer = null;
  }

  // Idempotent: asking for the song that's already playing does nothing.
  play(id) {
    if (id === this.id) return;
    this.id = id; this.song = SONGS[id] || null; this.step = 0; this.nextT = 0;
    if (!this.timer && typeof setInterval === 'function') this.timer = setInterval(() => this._tick(), TICK_MS);
  }
  stop() { this.id = null; this.song = null; }
  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

  _tick() {
    const a = this.audio;
    if (!this.song || !a.running || !a.musicOn) { this.nextT = 0; return; }
    const ctx = a.ctx, s = this.song, stepDur = 60 / s.bpm / 4;
    if (this.nextT < ctx.currentTime) this.nextT = ctx.currentTime + 0.05;      // (re)start just ahead of now
    const total = s.chords.length * 16;
    while (this.nextT < ctx.currentTime + LOOKAHEAD) {
      if (s.once && this.step >= total) { this.stop(); return; }
      const i = this.step % total, bar = Math.floor(i / 16), st = i % 16;
      const swing = st % 2 === 1 ? (s.swing || 0) * stepDur : 0;
      this._playStep(s, bar, st, this.nextT + swing, stepDur);
      this.step++; this.nextT += stepDur;
    }
  }

  _playStep(s, bar, st, t, stepDur) {
    const chord = s.chords[bar % s.chords.length];
    for (const tr of s.tracks) {
      if ((tr.min || 0) > this.intensity) continue;
      const pat = Array.isArray(tr.pattern) ? tr.pattern[bar % tr.pattern.length] : tr.pattern;
      const ch = pat[st];
      if (!ch || ch === '.' || ch === '-') continue;
      const inst = INSTRUMENTS[tr.inst];
      if (!inst) continue;
      const len = (tr.len || 1) * stepDur;
      if (inst.drum) { this._voice(inst.layers, t, tr.vol ?? 1, 1); continue; }
      const notes = chordNotes(chord, tr.octave ?? 4);
      let freqs;
      if (ch === 'c') freqs = notes;                                           // full chord
      else { const k = '1357'.indexOf(ch); freqs = [k >= 0 ? notes[Math.min(k, notes.length - 1)] : ch === '8' ? notes[0] * 2 : notes[0]]; }
      for (const f of freqs) this._voice(inst.layers, t, (tr.vol ?? 1) / Math.sqrt(freqs.length), f / 440, len);
    }
  }

  // instrument layers are sfx-style voices written at A440 and pitch-scaled
  _voice(layers, t, gain, pitch, len) {
    const a = this.audio;
    for (const L of layers) a.voice(len && !L.fixed ? { ...L, dur: Math.max(L.dur || 0.1, len) } : L, t, gain, pitch, a.music);
  }
}
