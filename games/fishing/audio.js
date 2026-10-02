/* 小贺渔场 · Original procedural music and arcade sound design. */
(() => {
  'use strict';

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+n) ? +n : lo));
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  class FishingAudio {
    constructor() {
      this.musicEnabled = true;
      this.sfxEnabled = true;
      this.musicVolume = 0.35;
      this.sfxVolume = 0.65;
      this.paused = false;
      this.ctx = null;
      this.destroyed = false;
      this._voices = new Set();
      this._last = Object.create(null);
      this._timer = null;
      this._step = 0;
      this._nextStep = 0;
      this._stepDuration = 60 / 112 / 4;
      this._voiceLimit = 88;
      this._unlocking = null;
    }

    // Call from a pointer/key gesture. All other methods are safe before unlock.
    async unlock() {
      if (this.destroyed) return false;
      if (this._unlocking) return this._unlocking;
      const attempt = (async () => {
        try {
          if (!this.ctx) this._init();
          if (!this.ctx) return false;
          if (this.ctx.state === 'suspended') await this.ctx.resume();
          if (this.destroyed || this.ctx.state !== 'running') return false;
          this._volumes();
          this._startMusic();
          return true;
        } catch (_) {
          return false;
        }
      })();
      this._unlocking = attempt;
      try {
        return await attempt;
      } finally {
        if (this._unlocking === attempt) this._unlocking = null;
      }
    }

    _init() {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      const ctx = this.ctx = new Context({ latencyHint: 'interactive' });
      this.master = ctx.createGain();
      this.music = ctx.createGain();
      this.sfx = ctx.createGain();
      this.music.gain.value = 0;
      this.sfx.gain.value = 0;
      this.master.gain.value = this._hidden() ? 0 : 0.85;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 14;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.16;
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 28;
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(highpass).connect(limiter).connect(ctx.destination);

      // Short stereo room adds sparkle without obscuring repeated cannon shots.
      const room = ctx.createConvolver();
      const roomLength = Math.ceil(ctx.sampleRate * 1.35);
      const impulse = ctx.createBuffer(2, roomLength, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        let state = 9103 + ch * 4127;
        let low = 0;
        for (let i = 0; i < roomLength; i++) {
          state = (Math.imul(state, 1664525) + 1013904223) | 0;
          const white = ((state >>> 0) / 2147483648 - 1);
          low = low * 0.6 + white * 0.4;
          data[i] = low * Math.pow(1 - i / roomLength, 3.1) * (i > 0.012 * ctx.sampleRate ? 0.5 : 0);
        }
      }
      room.buffer = impulse;
      const musicSend = ctx.createGain();
      const sfxSend = ctx.createGain();
      const roomOut = ctx.createGain();
      musicSend.gain.value = 0.2;
      sfxSend.gain.value = 0.12;
      roomOut.gain.value = 0.65;
      this.music.connect(musicSend).connect(room);
      this.sfx.connect(sfxSend).connect(room);
      room.connect(roomOut).connect(this.master);

      const delay = ctx.createDelay(1);
      const delaySend = ctx.createGain();
      const feedback = ctx.createGain();
      const delayFilter = ctx.createBiquadFilter();
      delay.delayTime.value = this._stepDuration * 3;
      delaySend.gain.value = 0.105;
      feedback.gain.value = 0.22;
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 3300;
      this.music.connect(delaySend).connect(delay);
      delay.connect(delayFilter).connect(feedback).connect(delay);
      delayFilter.connect(this.master);

      this._noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const noise = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
      this._volumes();
    }

    _smooth(param, value, seconds = 0.025) {
      if (!this.ctx || this.ctx.state === 'closed') return;
      const now = this.ctx.currentTime;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, seconds);
    }

    _volumes() {
      if (!this.ctx || !this.music) return;
      this._smooth(this.music.gain, this.musicEnabled && !this.paused ? this.musicVolume * 0.8 : 0);
      this._smooth(this.sfx.gain, this.sfxEnabled ? this.sfxVolume : 0);
      this._smooth(this.master.gain, this._hidden() ? 0 : 0.85, 0.012);
    }

    setMusic(enabled) {
      this.musicEnabled = !!enabled;
      this._volumes();
      if (this.musicEnabled) this._startMusic();
      else this._stopMusic();
    }

    setSfx(enabled) {
      this.sfxEnabled = !!enabled;
      this._volumes();
      if (!this.sfxEnabled) this._stopVoices('sfx');
    }

    setMusicVolume(volume) {
      this.musicVolume = clamp(volume, 0, 1);
      this._volumes();
    }

    setSfxVolume(volume) {
      this.sfxVolume = clamp(volume, 0, 1);
      this._volumes();
    }

    setPaused(paused) {
      const next = !!paused;
      this.paused = next;
      this._volumes();
      if (next) {
        this._stopMusic();
        // Dialogs pause the soundtrack, while clicks, recharge and previews remain audible.
        // A hidden tab silences everything, including any already scheduled celebration.
        if (this._hidden()) this._stopVoices('sfx');
      } else {
        this._startMusic();
      }
    }

    _hidden() {
      return typeof document !== 'undefined' && document.hidden;
    }

    _ready(group) {
      return !this.destroyed && !this._hidden() && this.ctx && this.ctx.state === 'running'
        && (group === 'music' ? this.musicEnabled && !this.paused : this.sfxEnabled);
    }

    _gate(name, seconds) {
      if (!this._ready('sfx')) return false;
      const now = this.ctx.currentTime;
      if (this._last[name] !== undefined && now - this._last[name] < seconds) return false;
      this._last[name] = now;
      return true;
    }

    _envelope(gain, at, duration, amplitude, attack, sustain) {
      gain.setValueAtTime(0.0001, at);
      gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), at + attack);
      if (sustain) gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude * 0.68), at + duration * 0.54);
      gain.exponentialRampToValueAtTime(0.0001, at + duration);
    }

    _voice(group, at, duration, amplitude, options = {}) {
      if (!this._ready(group) || this._voices.size >= this._voiceLimit) return null;
      const ctx = this.ctx;
      at = Math.max(ctx.currentTime + 0.001, at);
      duration = Math.max(0.025, duration);
      const envelope = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (pan.pan) pan.pan.value = clamp(options.pan || 0, -1, 1);
      this._envelope(envelope.gain, at, duration, amplitude, options.attack || 0.004, options.sustain);
      let filter = null;
      if (options.filter) {
        filter = ctx.createBiquadFilter();
        filter.type = options.filter.type || 'lowpass';
        filter.frequency.setValueAtTime(options.filter.frequency || 4000, at);
        filter.Q.value = options.filter.q || 0.5;
        if (options.filter.end) filter.frequency.exponentialRampToValueAtTime(options.filter.end, at + duration);
        envelope.connect(filter).connect(pan);
      } else envelope.connect(pan);
      pan.connect(group === 'music' ? this.music : this.sfx);
      const record = { group, nodes: [], envelope, pan, filter, at, end: at + duration + 0.03 };
      this._voices.add(record);
      return record;
    }

    _track(record, source) {
      if (!record) return;
      record.nodes.push(source);
      source.onended = () => {
        try { source.disconnect(); } catch (_) { /* Already disconnected. */ }
        record.nodes = record.nodes.filter(item => item !== source);
        if (!record.nodes.length) {
          this._voices.delete(record);
          for (const node of [record.envelope, record.pan, record.filter]) {
            try { if (node) node.disconnect(); } catch (_) { /* Already disconnected. */ }
          }
        }
      };
      source.start(record.at);
      source.stop(record.end);
    }

    _tone(frequency, at, duration, amplitude, options = {}) {
      const group = options.group || 'sfx';
      const record = this._voice(group, at, duration, amplitude, options);
      if (!record) return;
      const partials = options.partials || [{ ratio: 1, level: 1, type: options.type || 'sine' }];
      for (const partial of partials) {
        const osc = this.ctx.createOscillator();
        const weight = this.ctx.createGain();
        osc.type = partial.type || 'sine';
        const ratio = partial.ratio || 1;
        osc.frequency.setValueAtTime(Math.max(15, frequency * ratio), record.at);
        if (options.end) osc.frequency.exponentialRampToValueAtTime(Math.max(15, options.end * ratio), record.at + duration * 0.9);
        osc.detune.value = partial.detune || 0;
        weight.gain.value = partial.level === undefined ? 1 : partial.level;
        osc.connect(weight).connect(record.envelope);
        const cleanup = () => { try { weight.disconnect(); } catch (_) { /* No-op. */ } };
        this._track(record, osc);
        const onended = osc.onended;
        osc.onended = () => { cleanup(); onended(); };
      }
    }

    _noise(at, duration, amplitude, frequency, options = {}) {
      const record = this._voice(options.group || 'sfx', at, duration, amplitude, {
        ...options, filter: { type: options.type || 'highpass', frequency, q: options.q || 0.6, end: options.end }
      });
      if (!record) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this._noiseBuffer;
      source.loop = true;
      source.connect(record.envelope);
      this._track(record, source);
    }

    _stopVoices(group) {
      if (!this.ctx) return;
      const at = this.ctx.currentTime;
      for (const voice of this._voices) {
        if (voice.group !== group) continue;
        voice.envelope.gain.cancelScheduledValues(at);
        voice.envelope.gain.setTargetAtTime(0.0001, at, 0.007);
        for (const source of voice.nodes) {
          try { source.stop(at + 0.04); } catch (_) { /* Source ended already. */ }
        }
      }
    }

    _startMusic() {
      if (!this._ready('music') || this._timer !== null) return;
      this._nextStep = this.ctx.currentTime + 0.075;
      // Start on a whole beat after a pause so bass and melody stay together.
      this._step = Math.ceil(this._step / 4) * 4;
      this._scheduleMusic();
      this._timer = window.setInterval(() => this._scheduleMusic(), 30);
    }

    _stopMusic() {
      if (this._timer !== null) window.clearInterval(this._timer);
      this._timer = null;
      this._stopVoices('music');
    }

    _scheduleMusic() {
      if (!this._ready('music')) return;
      const now = this.ctx.currentTime;
      if (this._nextStep < now - 0.25) this._nextStep = now + 0.03;
      let count = 0;
      while (this._nextStep < now + 0.16 && count++ < 8) {
        this._musicStep(this._step, this._nextStep);
        this._nextStep += this._stepDuration;
        this._step = (this._step + 1) % 256;
      }
    }

    _musicStep(step, at) {
      const bar = Math.floor(step / 16);
      const beat = step % 16;
      const chords = [
        [48, 60, 64, 67, 69], [53, 60, 65, 69, 72], [45, 60, 64, 67, 71], [43, 59, 62, 67, 69],
        [48, 60, 64, 67, 72], [53, 60, 64, 65, 69], [50, 60, 62, 65, 69], [43, 59, 62, 67, 71],
        [45, 60, 64, 67, 71], [53, 60, 65, 69, 72], [48, 60, 64, 67, 69], [43, 59, 62, 67, 69],
        [53, 60, 65, 69, 72], [50, 60, 62, 65, 69], [43, 59, 62, 67, 71], [48, 60, 64, 67, 72]
      ];
      const phrases = [
        [76, 0, 79, 0, 81, 79, 0, 76, 0, 74, 0, 72, 0, 76, 79, 0],
        [77, 0, 81, 0, 84, 0, 81, 79, 0, 77, 0, 76, 0, 74, 0, 0],
        [76, 0, 79, 81, 0, 84, 0, 83, 0, 81, 0, 79, 76, 0, 0, 0],
        [74, 0, 79, 0, 83, 0, 81, 79, 0, 74, 0, 71, 0, 74, 0, 0],
        [72, 0, 76, 0, 79, 0, 84, 0, 83, 81, 0, 79, 0, 76, 0, 0],
        [81, 0, 79, 0, 77, 76, 0, 72, 0, 77, 0, 81, 84, 0, 0, 0],
        [77, 0, 81, 0, 79, 0, 77, 76, 0, 74, 0, 72, 0, 74, 77, 0],
        [79, 0, 0, 83, 0, 81, 0, 79, 0, 74, 0, 71, 74, 0, 0, 0],
        [81, 0, 84, 0, 88, 0, 84, 83, 0, 81, 0, 79, 0, 76, 0, 0],
        [84, 0, 81, 0, 77, 0, 81, 0, 79, 77, 0, 76, 0, 72, 0, 0],
        [79, 0, 76, 0, 72, 0, 76, 79, 0, 84, 0, 83, 0, 81, 79, 0],
        [83, 0, 81, 0, 79, 0, 74, 0, 71, 74, 0, 79, 0, 83, 0, 0],
        [81, 0, 84, 0, 89, 0, 88, 84, 0, 81, 0, 79, 0, 77, 0, 0],
        [77, 0, 81, 0, 86, 0, 84, 81, 0, 79, 0, 77, 0, 74, 0, 0],
        [79, 0, 83, 0, 86, 0, 83, 81, 0, 79, 0, 77, 76, 0, 74, 0],
        [76, 0, 79, 0, 84, 0, 0, 0, 79, 0, 76, 0, 72, 0, 0, 0]
      ];
      const chord = chords[bar];
      const opts = { group: 'music' };
      const melody = phrases[bar][beat];
      if (melody) {
        this._tone(midi(melody), at, 0.39, 0.16, {
          ...opts, pan: Math.sin(bar * 1.3) * 0.25,
          partials: [
            { ratio: 1, level: 0.74 }, { ratio: 2, level: 0.14 },
            { ratio: 3.01, level: 0.075 }, { ratio: 4.02, level: 0.025 }
          ]
        });
        // A quiet glass octave makes the second half feel brighter.
        if (bar >= 8 && beat % 4 === 0) this._tone(midi(melody + 12), at + 0.007, 0.5, 0.035, { ...opts, pan: -0.4 });
      }
      if ([2, 6, 10, 14].includes(beat)) {
        chord.slice(1).forEach((note, i) => this._tone(midi(note), at + i * 0.005, 0.16, 0.028, {
          ...opts, pan: i % 2 ? 0.4 : -0.4, type: 'triangle', filter: { frequency: 2400 }
        }));
      }
      if ([0, 6, 8, 14].includes(beat)) {
        const bass = chord[0] - 12 + (beat === 6 ? 7 : beat === 14 ? 12 : 0);
        this._tone(midi(bass), at, beat % 8 === 0 ? 0.35 : 0.22, 0.27, {
          ...opts, attack: 0.012,
          partials: [{ ratio: 1, level: 0.8 }, { ratio: 2, level: 0.2, type: 'triangle' }]
        });
      }
      if ([0, 8].includes(beat) || (bar % 4 === 3 && beat === 11)) {
        this._tone(115, at, 0.17, 0.35, { ...opts, end: 42 });
        this._noise(at, 0.025, 0.032, 1500, opts);
      }
      if ([4, 12].includes(beat)) {
        this._noise(at, 0.08, 0.13, 2100, { ...opts, type: 'bandpass', q: 0.8, pan: -0.16 });
        this._tone(310, at, 0.045, 0.065, { ...opts, end: 175, type: 'triangle' });
      }
      if (beat % 2 === 0) this._noise(at, beat === 14 ? 0.075 : 0.035, beat % 4 ? 0.065 : 0.043, 6800, { ...opts, pan: 0.35 });
      if (beat % 2 === 1) this._noise(at, 0.045, 0.032, 4900, { ...opts, type: 'bandpass', q: 0.65, pan: -0.45 });
      if ([3, 7, 15].includes(beat)) this._tone(beat === 7 ? 520 : 670, at, 0.08, 0.038, {
        ...opts, end: beat === 7 ? 380 : 540, pan: -0.3, partials: [{ ratio: 1, level: 0.8 }, { ratio: 1.51, level: 0.18 }]
      });
      if (bar % 4 === 3 && beat >= 14) this._noise(at, 0.045, 0.055, 1700 + beat * 110, { ...opts, type: 'bandpass', pan: 0.2 });
    }

    shot(power = 1) {
      if (!this._gate('shot', 0.036)) return;
      const at = this.ctx.currentTime;
      const weight = Math.min(1, Math.log2(Math.max(1, +power || 1) + 1) / 8);
      // A heavy pressure wave, metallic ignition and short hot exhaust: a cannon shell.
      this._tone(176 - weight * 34, at, 0.18 + weight * 0.045, 0.43, { end: 35, type: 'sine' });
      this._tone(560 - weight * 130, at + 0.003, 0.047, 0.11, { end: 180, type: 'triangle', pan: (Math.random() - 0.5) * 0.1 });
      this._noise(at, 0.075, 0.2, 2100, { type: 'bandpass', q: 0.5, end: 620 });
      this._noise(at + 0.025, 0.12, 0.08, 760, { type: 'lowpass', end: 210 });
      this._tone(75, at + 0.018, 0.19, 0.095, { end: 38, type: 'sine' });
    }

    hit(tier = 1) {
      if (!this._gate('hit', 0.045)) return;
      const level = clamp(tier, 1, 4);
      const at = this.ctx.currentTime;
      this._noise(at, 0.13, 0.14, 2300, { type: 'bandpass', end: 620, q: .8, pan: (Math.random() - 0.5) * 0.4 });
      this._tone(510 + level * 85, at, 0.058, 0.092, { end: 160 + level * 35 });
      this._tone(96, at, 0.14 + level * .018, 0.1 + level * .015, { end: 36 });
    }

    _coin(note, at, amplitude = 0.12, pan = 0) {
      this._tone(midi(note), at, 0.25, amplitude, {
        pan, partials: [{ ratio: 1, level: 0.82 }, { ratio: 2, level: 0.12 }, { ratio: 3.5, level: 0.03 }]
      });
      this._tone(midi(note + 12), at + 0.035, 0.14, amplitude * 0.27, { pan });
    }

    capture(tier = 1, combo = 1) {
      const level = Math.round(clamp(tier, 1, 4));
      if (!this._gate(`capture${level}`, level === 4 ? 0.75 : level === 3 ? 0.22 : 0.095)) return;
      const at = this.ctx.currentTime + 0.008;
      const lift = Math.min(5, Math.floor(Math.max(0, combo - 1) / 5));
      const root = 72 + [0, 2, 4, 7, 9, 12][lift];
      this._noise(at, 0.11 + level * 0.015, 0.1, 2900, { type: 'bandpass', end: 8200, pan: -0.1 });
      if (level === 1) {
        this._coin(root + 7, at, 0.14, -0.15);
        this._coin(root + 12, at + 0.085, 0.13, 0.15);
      } else if (level === 2) {
        [0, 4, 7, 12].forEach((note, i) => this._coin(root + note, at + i * 0.058, 0.115, -0.35 + i * 0.23));
        this._tone(midi(root - 24), at, 0.4, 0.17, { end: midi(root - 12), type: 'sine' });
      } else if (level === 3) {
        [0, 4, 7, 12, 16, 19].forEach((note, i) => this._coin(root + note, at + i * 0.065, 0.115, Math.sin(i * 2) * 0.5));
        [0, 4, 7].forEach((note, i) => this._tone(midi(root - 12 + note), at + 0.21, 0.75, 0.08, {
          type: 'triangle', sustain: true, attack: 0.025, pan: (i - 1) * 0.28,
          partials: [{ ratio: 1, type: 'triangle', level: 0.78 }, { ratio: 2, level: 0.12 }]
        }));
        this._tone(130, at, 0.22, 0.3, { end: 43 });
      } else {
        this._fanfare(at, root - 12);
      }
    }

    _fanfare(at, root = 60) {
      this._tone(145, at, 0.48, 0.42, { end: 38 });
      this._noise(at, 0.65, 0.15, 4700, { type: 'highpass', pan: 0.1 });
      [0, 7, 12, 16, 19, 24].forEach((note, i) => {
        this._tone(midi(root + note), at + i * 0.1, 0.39, 0.13, {
          attack: 0.015, type: 'triangle', pan: Math.sin(i) * 0.25,
          partials: [{ ratio: 1, type: 'triangle', level: 0.8 }, { ratio: 2, level: 0.16 }]
        });
      });
      [0, 4, 7, 12].forEach((note, i) => {
        this._tone(midi(root + note), at + 0.68, 1.4, 0.09, {
          attack: 0.04, sustain: true, pan: (i - 1.5) * 0.24,
          partials: [{ ratio: 1, type: 'triangle', level: 0.73 }, { ratio: 1, type: 'sine', level: 0.2, detune: 7 }]
        });
      });
      for (let i = 0; i < 15; i++) {
        this._coin(root + 24 + [0, 4, 7, 12, 7, 4][i % 6], at + 0.48 + i * 0.084, 0.065 + (i % 3) * 0.008, Math.sin(i * 2.2) * 0.7);
      }
    }

    skill(name = '') {
      if (!this._gate('skill', 0.15)) return;
      const at = this.ctx.currentTime;
      const freezing = /freeze|ice|冰|冷/i.test(String(name));
      const lightning = /lightning|laser|雷|电|激光/i.test(String(name));
      const rage = /rage|fury|狂暴|爆发/i.test(String(name));
      if (freezing) {
        this._noise(at, 0.6, 0.15, 3400, { type: 'highpass', end: 10000 });
        [84, 91, 96, 103, 108].forEach((note, i) => this._coin(note, at + i * 0.065, 0.09, (i - 2) * 0.25));
      } else if (rage) {
        // A fast turbine charge, three ignition flares, then a solid low-end punch.
        this._tone(130, at, 0.24, 0.14, {
          end: 1040, attack: 0.008, type: 'sawtooth',
          filter: { frequency: 850, end: 4200, q: 0.75 }, pan: -0.1
        });
        this._noise(at, 0.28, 0.19, 1100, { type: 'bandpass', end: 6000, q: 0.7 });
        [0, 0.05, 0.1].forEach((offset, i) => {
          this._tone(230 + i * 150, at + offset, 0.065, 0.13, { end: 95 + i * 70, type: 'triangle', pan: (i - 1) * 0.2 });
        });
        this._tone(145, at + 0.2, 0.31, 0.39, { end: 38 });
        [72, 79, 84].forEach((note, i) => this._tone(midi(note), at + 0.21 + i * 0.026, 0.21, 0.07, {
          type: 'triangle', pan: (i - 1) * 0.3
        }));
      } else if (lightning) {
        this._tone(210, at, 0.5, 0.18, { end: 1700, type: 'sawtooth', filter: { frequency: 2000, end: 600 }, pan: -0.1 });
        this._noise(at, 0.25, 0.25, 1700, { type: 'bandpass', q: 1, end: 5500 });
        this._tone(90, at, 0.23, 0.36, { end: 35 });
      } else {
        [60, 64, 67, 72, 76, 79, 84].forEach((note, i) => this._tone(midi(note), at + i * 0.036, 0.28, 0.115, { type: 'triangle', pan: (i - 3) * 0.1 }));
        this._noise(at, 0.3, 0.12, 1500, { type: 'bandpass', end: 6500 });
        this._tone(85, at + 0.18, 0.25, 0.27, { end: 38 });
      }
    }

    boss() {
      if (!this._gate('boss', 2)) return;
      const at = this.ctx.currentTime;
      [48, 55, 60].forEach((note, i) => this._tone(midi(note), at + i * 0.16, 0.7, 0.17, {
        type: 'triangle', sustain: true, attack: 0.03, filter: { frequency: 1400 }
      }));
      this._noise(at, 0.6, 0.13, 4800, { type: 'highpass' });
      [0, 0.22, 0.44].forEach(offset => this._tone(160, at + offset, 0.22, 0.3, { end: 45 }));
      [72, 79, 84].forEach((note, i) => this._coin(note, at + 0.62 + i * 0.09, 0.12, (i - 1) * 0.4));
    }

    wave() {
      if (!this._gate('wave', 1)) return;
      const at = this.ctx.currentTime;
      this._noise(at, 1.1, 0.15, 1000, { type: 'bandpass', end: 4400, attack: 0.12, pan: -0.3 });
      [72, 76, 79, 84, 88].forEach((note, i) => this._coin(note, at + 0.12 + i * 0.1, 0.1, (i - 2) * 0.22));
    }

    click() {
      if (!this._gate('click', 0.055)) return;
      const at = this.ctx.currentTime;
      this._tone(760, at, 0.045, 0.105, { end: 1050, type: 'sine' });
      this._tone(1520, at + 0.008, 0.05, 0.025);
    }

    recharge() {
      if (!this._gate('recharge', 0.35)) return;
      const at = this.ctx.currentTime;
      [72, 76, 79, 84, 88, 91, 96].forEach((note, i) => this._coin(note, at + i * 0.072, 0.13, Math.sin(i * 2) * 0.4));
      [60, 64, 67].forEach(note => this._tone(midi(note), at + 0.32, 0.65, 0.075, { type: 'triangle', attack: 0.03, sustain: true }));
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this._stopMusic();
      this._stopVoices('sfx');
      if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
      this._voices.clear();
    }
  }

  window.FishingAudio = FishingAudio;
})();
