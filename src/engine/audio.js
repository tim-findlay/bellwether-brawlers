// Audio (v3 sound pass). Everything is synthesised with WebAudio — no files
// (the repo has no licensed sound library to draw on). The engine owns the
// buses and the voice primitives; what each sound IS lives in
// src/data/sfx.js as layered recipes, and the music in src/data/music.js
// (played by engine/music.js). Lazy AudioContext: browsers need a gesture.
//
//   master -> compressor -> out;  sfx bus -> master;  music bus -> master
//   heavy layers can route through a soft-clip "crunch" before the sfx bus.

import { SFX } from '../data/sfx.js';

const NOISE_SECONDS = 2;
const MUSIC_GAIN = 0.22;   // metered offline: song peaks sit 2–5 dB under a light hit's, song RMS ~24 dB under

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;          // sound effects
    this.musicOn = true;
    this.master = null;
    this.last = new Map();        // name -> ctx time of the last play (anti-stacking)
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const c = this.ctx;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.18;
      this.master = c.createGain(); this.master.gain.value = 0.7;
      this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.gain.value = 2.2; this.sfx.connect(this.master);
      this.music = c.createGain(); this.music.gain.value = this.musicOn ? MUSIC_GAIN : 0; this.music.connect(this.master);
      this.crunch = c.createWaveShaper(); this.crunch.curve = softClip(2.2); this.crunch.connect(this.sfx);
      const len = c.sampleRate * NOISE_SECONDS;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; return false; }
    return true;
  }

  // call from a user gesture: creates / resumes the context so music can start
  unlock() { if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }

  setEnabled(on) { this.enabled = on; }
  setMusic(on) {
    this.musicOn = on;
    if (this.music) this.music.gain.setTargetAtTime(on ? MUSIC_GAIN : 0, this.ctx.currentTime, 0.1);
  }

  // play(name, { gain, pitch }) — gain scales every layer, pitch multiplies every frequency
  play(name, opts = {}) {
    const r = SFX[name];
    if (!r || !this.enabled || !this.ensure()) return;
    const t = this.ctx.currentTime;
    if (t - (this.last.get(name) ?? -1) < (r.gap ?? 0.03)) return;   // the same sound twice in 30 ms is one sound
    this.last.set(name, t);
    const vary = r.vary ?? 0.05, pitch = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * vary);
    for (const L of r.layers) this.voice(L, t, opts.gain ?? 1, pitch, this.sfx);
  }

  // One layer. osc: { f0, f1, dur, type, vol, attack, delay, lp }
  // noise: { dur, vol, filter, f0, f1, q, attack, delay }   fm: { f0, ratio, index, dur, vol, delay }
  voice(L, t0, gain, pitch, bus) {
    const c = this.ctx, t = t0 + (L.delay || 0), dur = L.dur || 0.1, vol = (L.vol ?? 0.1) * gain;
    const out = c.createGain();
    const att = Math.min(L.attack || 0.002, dur * 0.8);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(L.crunch ? this.crunch : bus);
    let src, tail = out;
    if (L.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = L.lp; f.connect(out); tail = f; }
    if (L.kind === 'noise') {
      src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = L.filter || 'bandpass'; f.Q.value = L.q ?? 0.9;
      f.frequency.setValueAtTime((L.f0 || 1200) * pitch, t);
      if (L.f1) f.frequency.exponentialRampToValueAtTime(L.f1 * pitch, t + dur);
      src.connect(f); f.connect(tail);
      src.start(t, Math.random() * Math.max(0, NOISE_SECONDS - dur - 0.05)); src.stop(t + dur + 0.02);
    } else if (L.kind === 'fm') {
      const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain();
      const f = (L.f0 || 440) * pitch;
      car.frequency.value = f; mod.frequency.value = f * (L.ratio || 1.4);
      mg.gain.setValueAtTime(f * (L.index || 2), t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur);
      mod.connect(mg); mg.connect(car.frequency); car.connect(tail);
      car.start(t); mod.start(t); car.stop(t + dur + 0.02); mod.stop(t + dur + 0.02);
    } else {
      src = c.createOscillator(); src.type = L.type || 'sine';
      src.frequency.setValueAtTime((L.f0 || 440) * pitch, t);
      if (L.f1) src.frequency.exponentialRampToValueAtTime(Math.max(20, L.f1 * pitch), t + dur);
      if (L.detune) src.detune.value = L.detune;
      src.connect(tail); src.start(t); src.stop(t + dur + 0.02);
    }
  }
}

function softClip(k) {
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(k * x) / Math.tanh(k); }
  return curve;
}
