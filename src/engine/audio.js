// All sound is synthesised with WebAudio — no external files.
// Lazy AudioContext (browsers require a user gesture first).

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { return false; }
    return true;
  }

  setEnabled(on) { this.enabled = on; }

  tone({ f0 = 440, f1 = f0, dur = 0.1, type = 'square', vol = 0.12, delay = 0 }) {
    if (!this.enabled || !this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.12, vol = 0.1, freq = 1200, delay = 0 }) {
    if (!this.enabled || !this.ensure()) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  play(name) {
    const fn = SFX[name];
    if (fn) fn(this);
  }
}

const SFX = {
  menuMove:   (a) => a.tone({ f0: 520, f1: 560, dur: 0.05, type: 'square', vol: 0.07 }),
  menuConfirm:(a) => { a.tone({ f0: 440, f1: 660, dur: 0.09, vol: 0.09 }); a.tone({ f0: 660, f1: 880, dur: 0.12, vol: 0.08, delay: 0.07 }); },
  menuBack:   (a) => a.tone({ f0: 420, f1: 260, dur: 0.1, vol: 0.07 }),
  hitLight:   (a) => { a.noise({ dur: 0.06, vol: 0.12, freq: 1800 }); a.tone({ f0: 240, f1: 160, dur: 0.06, vol: 0.1 }); },
  hitHeavy:   (a) => { a.noise({ dur: 0.12, vol: 0.16, freq: 900 }); a.tone({ f0: 150, f1: 70, dur: 0.16, type: 'sawtooth', vol: 0.14 }); },
  block:      (a) => a.tone({ f0: 90, f1: 80, dur: 0.07, type: 'sawtooth', vol: 0.1 }),
  whiff:      (a) => a.noise({ dur: 0.05, vol: 0.05, freq: 2400 }),
  special:    (a) => a.tone({ f0: 320, f1: 620, dur: 0.14, type: 'triangle', vol: 0.11 }),
  superReady: (a) => { a.tone({ f0: 523, dur: 0.08, vol: 0.08 }); a.tone({ f0: 784, dur: 0.14, vol: 0.08, delay: 0.08 }); },
  superGo:    (a) => { a.tone({ f0: 196, f1: 392, dur: 0.3, type: 'sawtooth', vol: 0.13 }); a.noise({ dur: 0.25, vol: 0.1, freq: 600, delay: 0.05 }); },
  parry:      (a) => { a.tone({ f0: 880, f1: 1320, dur: 0.09, vol: 0.1 }); a.tone({ f0: 1320, dur: 0.06, vol: 0.07, delay: 0.06 }); },
  teleport:   (a) => a.tone({ f0: 900, f1: 200, dur: 0.12, type: 'triangle', vol: 0.09 }),
  grab:       (a) => { a.noise({ dur: 0.08, vol: 0.12, freq: 500 }); a.tone({ f0: 110, f1: 60, dur: 0.2, type: 'sawtooth', vol: 0.13, delay: 0.08 }); },
  burn:       (a) => a.noise({ dur: 0.18, vol: 0.05, freq: 700 }),
  heal:       (a) => { a.tone({ f0: 523, f1: 659, dur: 0.1, type: 'triangle', vol: 0.08 }); a.tone({ f0: 784, dur: 0.1, vol: 0.07, delay: 0.09 }); },
  ko:         (a) => { a.tone({ f0: 200, f1: 50, dur: 0.5, type: 'sawtooth', vol: 0.16 }); a.noise({ dur: 0.4, vol: 0.14, freq: 400, delay: 0.05 }); },
  roundGo:    (a) => { a.tone({ f0: 392, dur: 0.09, vol: 0.1 }); a.tone({ f0: 392, dur: 0.09, vol: 0.1, delay: 0.12 }); a.tone({ f0: 587, dur: 0.2, vol: 0.12, delay: 0.24 }); },
  klaxon:     (a) => { a.tone({ f0: 660, f1: 440, dur: 0.18, type: 'square', vol: 0.12 }); a.tone({ f0: 660, f1: 440, dur: 0.18, type: 'square', vol: 0.12, delay: 0.22 }); },
  mash:       (a) => a.tone({ f0: 700, f1: 740, dur: 0.03, vol: 0.06 }),
  wave:       (a) => a.noise({ dur: 0.5, vol: 0.1, freq: 300 }),
  bikeBell:   (a) => { a.tone({ f0: 1568, dur: 0.07, vol: 0.09 }); a.tone({ f0: 1568, dur: 0.07, vol: 0.09, delay: 0.09 }); },
  alarm:      (a) => { for (let i = 0; i < 3; i++) a.tone({ f0: 880, f1: 880, dur: 0.1, type: 'square', vol: 0.09, delay: i * 0.15 }); },
  bell:       (a) => { a.tone({ f0: 1175, f1: 1170, dur: 0.4, type: 'triangle', vol: 0.12 }); a.tone({ f0: 587, f1: 585, dur: 0.5, type: 'triangle', vol: 0.08 }); },
  jet:        (a) => { a.noise({ dur: 0.7, vol: 0.12, freq: 250 }); a.tone({ f0: 180, f1: 600, dur: 0.6, type: 'sawtooth', vol: 0.06 }); },
  slip:       (a) => { a.tone({ f0: 1000, f1: 300, dur: 0.18, type: 'triangle', vol: 0.1 }); },
  pop:        (a) => a.tone({ f0: 300, f1: 500, dur: 0.06, type: 'square', vol: 0.08 }),
};
