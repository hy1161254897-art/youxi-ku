/* Original procedural soundtrack and soft interface sounds. Everything runs offline. */
(function () {
  'use strict';

  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value) || 0));

  class MahjongAudio {
    constructor() {
      this.context = null;
      this.musicEnabled = true;
      this.effectsEnabled = true;
      this.volume = .35;
      this._timer = null;
      this._destroyed = false;
      this._musicNodes = new Set();
      this._beat = 60 / 82;
      this._events = this._compose();
      this._visibility = () => this._handleVisibility();
      document.addEventListener('visibilitychange', this._visibility);
    }

    async unlock() {
      if (this._destroyed) return false;
      try {
        if (!this.context) {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) return false;
          this.context = new Context();
          this._buildGraph();
        }
        if (this.context.state === 'suspended') await this.context.resume();
        if (this.context.state === 'running' && this.musicEnabled && !document.hidden) this._startMusic();
        return this.context.state === 'running';
      } catch (_) {
        // Audio is optional; a browser denying playback must never prevent play.
        return false;
      }
    }

    _buildGraph() {
      const ctx = this.context;
      this._master = ctx.createGain();
      this._master.gain.value = this.volume;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = .005;
      compressor.release.value = .2;
      this._master.connect(compressor);
      compressor.connect(ctx.destination);

      this._music = ctx.createGain();
      this._music.gain.value = this.musicEnabled ? .78 : 0;
      this._music.connect(this._master);
      this._effects = ctx.createGain();
      this._effects.gain.value = this.effectsEnabled ? .7 : 0;
      this._effects.connect(this._master);

      // A short original stereo room impulse softens the plucked strings.
      const convolver = ctx.createConvolver();
      const length = Math.floor(ctx.sampleRate * 1.7);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      let seed = 19870419;
      for (let channel = 0; channel < 2; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          samples[i] = (seed / 2147483648 - 1) * Math.pow(1 - i / length, 3.4) * .32;
        }
      }
      convolver.buffer = impulse;
      this._reverbSend = ctx.createGain();
      this._reverbSend.gain.value = .23;
      this._reverbSend.connect(convolver);
      convolver.connect(this._music);
    }

    setMusic(enabled) {
      this.musicEnabled = Boolean(enabled);
      if (!this.context || this._destroyed) return;
      this._music.gain.setTargetAtTime(this.musicEnabled ? .78 : 0, this.context.currentTime, .08);
      if (this.musicEnabled && this.context.state === 'running' && !document.hidden) this._startMusic();
      else this._stopMusic();
    }

    setEffects(enabled) {
      this.effectsEnabled = Boolean(enabled);
      if (this._effects && !this._destroyed) this._effects.gain.setTargetAtTime(this.effectsEnabled ? .7 : 0, this.context.currentTime, .025);
    }

    setVolume(value) {
      this.volume = clamp(value, 0, 1);
      if (this._master && !this._destroyed) this._master.gain.setTargetAtTime(this.volume, this.context.currentTime, .045);
    }

    _compose() {
      // 32 bars at 82 BPM: four related eight-bar sections, about 94 seconds.
      // D-major pentatonic keeps every melodic turn spacious and consonant.
      const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81];
      const phrases = [
        [[0, 2, 1], [1.5, 3, .5], [2, 4, 1], [3.5, 3, .5], [4, 2, 1.5], [6, 1, .7], [7, 0, 1]],
        [[0, 1, .8], [1, 2, .8], [2.5, 3, 1], [4, 1, 1.5], [6, 0, 1.5]],
        [[0, 3, 1.5], [2, 4, .7], [3, 5, 1], [4.5, 4, .7], [5.5, 3, 1], [7, 2, 1]],
        [[0, 1, 1], [1.5, 3, .7], [3, 2, .8], [4, 1, 1], [6, 0, 2]],
        [[0, 5, 1], [1.5, 4, .8], [3, 3, 1], [4, 2, .8], [5.5, 3, .8], [7, 4, .8]],
        [[0, 3, 1.3], [2, 2, 1], [3.5, 1, .5], [4, 2, 1.5], [6, 0, 1.5]],
        [[0, 2, 1], [1, 3, .6], [2, 5, 1], [3.5, 4, .6], [4.5, 3, 1], [6, 1, 1.5]],
        [[0, 3, 1.5], [2, 2, 1], [4, 1, 1], [6, 0, 2]]
      ];
      const chords = [[50, 57, 66], [47, 54, 62], [43, 50, 59], [45, 52, 61]];
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 4, 3, 6, 5, 1, 7];
      const result = [];
      for (let pair = 0; pair < 16; pair += 1) {
        for (const [beat, degree, duration] of phrases[order[pair]]) {
          result.push({ beat: pair * 8 + beat, type: 'pluck', note: scale[degree], duration: duration * this._beat, level: .105, pan: -.12 });
        }
      }
      for (let bar = 0; bar < 32; bar += 1) {
        const chord = chords[Math.floor(bar / 2) % 4];
        result.push({ beat: bar * 4, type: 'pad', chord, duration: 4.4 * this._beat });
        result.push({ beat: bar * 4, type: 'bass', note: chord[0] - 12, duration: 2.7 * this._beat });
        for (let step = 0; step < 4; step += 1) {
          result.push({ beat: bar * 4 + step + .5, type: 'pluck', note: chord[[0, 1, 2, 1][step]] + 12, duration: 1.05, level: .024, pan: .24 });
        }
      }
      return result.sort((a, b) => a.beat - b.beat);
    }

    _startMusic() {
      if (this._timer || this._destroyed || !this.musicEnabled) return;
      this._cycleStart = this.context.currentTime + .12;
      this._eventIndex = 0;
      this._music.gain.setTargetAtTime(.78, this.context.currentTime, .15);
      this._schedule();
      this._timer = window.setInterval(() => this._schedule(), 100);
    }

    _schedule() {
      if (!this.context || this.context.state !== 'running') return;
      const now = this.context.currentTime;
      // Recover cleanly from a sleeping machine or heavily throttled tab.
      if (this._cycleStart + this._events[this._eventIndex].beat * this._beat < now - 1) {
        this._cycleStart = now + .12;
        this._eventIndex = 0;
      }
      while (true) {
        const event = this._events[this._eventIndex];
        const time = this._cycleStart + event.beat * this._beat;
        if (time > now + .32) break;
        if (time >= now - .03) {
          if (event.type === 'pluck') this._pluck(event.note, time, event.duration, event.level, event.pan, true);
          else if (event.type === 'pad') this._pad(event.chord, time, event.duration);
          else this._tone(event.note, time, event.duration, .026, 'sine', true);
        }
        this._eventIndex += 1;
        if (this._eventIndex >= this._events.length) {
          this._eventIndex = 0;
          this._cycleStart += 128 * this._beat;
        }
      }
    }

    _track(source, music) {
      if (music) this._musicNodes.add(source);
      source.onended = () => {
        this._musicNodes.delete(source);
        try { source.disconnect(); } catch (_) { /* already released */ }
      };
    }

    _pluck(note, time, duration, level, pan, music) {
      const ctx = this.context;
      const envelope = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, time);
      filter.frequency.exponentialRampToValueAtTime(950, time + Math.max(.15, duration));
      filter.Q.value = .35;
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.linearRampToValueAtTime(level, time + .008);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + Math.max(.18, duration * 1.6));
      envelope.connect(filter);
      let output = filter;
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        filter.connect(panner);
        output = panner;
      }
      output.connect(music ? this._music : this._effects);
      if (music) output.connect(this._reverbSend);
      for (let part = 0; part < 2; part += 1) {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.type = part ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(midi(note) * (part ? 2 : 1), time);
        partialGain.gain.value = part ? .17 : .83;
        osc.connect(partialGain);
        partialGain.connect(envelope);
        osc.start(time);
        osc.stop(time + Math.max(.18, duration * 1.6) + .03);
        this._track(osc, music);
      }
    }

    _tone(note, time, duration, level, type = 'sine', music = false) {
      const ctx = this.context;
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(midi(note), time);
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.linearRampToValueAtTime(level, time + .035);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      osc.connect(envelope);
      envelope.connect(music ? this._music : this._effects);
      osc.start(time);
      osc.stop(time + duration + .03);
      this._track(osc, music);
    }

    _pad(chord, time, duration) {
      const ctx = this.context;
      for (const note of chord) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = midi(note);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.linearRampToValueAtTime(.014, time + .8);
        gain.gain.setValueAtTime(.012, time + Math.max(.81, duration - .6));
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
        osc.connect(gain);
        gain.connect(this._music);
        osc.start(time);
        osc.stop(time + duration + .02);
        this._track(osc, true);
      }
    }

    _tap(time, pitch = 1250, level = .10) {
      const ctx = this.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, time);
      osc.frequency.exponentialRampToValueAtTime(pitch * .43, time + .045);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.linearRampToValueAtTime(level, time + .002);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .07);
      osc.connect(gain);
      gain.connect(this._effects);
      osc.start(time);
      osc.stop(time + .08);
      this._track(osc, false);
    }

    play(name) {
      if (!this.context || this._destroyed || !this.effectsEnabled || this.context.state !== 'running') return;
      const time = this.context.currentTime + .005;
      if (name === 'click') return this._tap(time, 960, .07);
      if (name === 'tile') {
        this._tap(time, 1600, .14);
        this._tap(time + .032, 1150, .055);
        return;
      }
      if (name === 'shuffle') {
        for (let i = 0; i < 12; i += 1) this._tap(time + i * .065, 750 + (i * 193 % 900), .035 + (i % 3) * .011);
        return;
      }
      const sequences = {
        peng: [69, 74],
        gang: [66, 69, 76],
        hu: [74, 78, 81, 86],
        win: [69, 74, 78, 81, 86, 81, 86],
        lose: [69, 66, 64, 62]
      };
      const notes = sequences[name];
      if (!notes) return;
      const spacing = name === 'win' ? .16 : name === 'lose' ? .21 : .12;
      notes.forEach((note, index) => this._pluck(note, time + index * spacing, index === notes.length - 1 ? .85 : .28, .11, 0, false));
    }

    _stopMusic() {
      if (this._timer) window.clearInterval(this._timer);
      this._timer = null;
      if (!this.context) return;
      for (const source of this._musicNodes) {
        try { source.stop(this.context.currentTime + .12); } catch (_) { /* stopped */ }
      }
      this._musicNodes.clear();
    }

    _handleVisibility() {
      if (!this.context || this._destroyed) return;
      if (document.hidden) {
        this._stopMusic();
        this.context.suspend().catch(() => {});
      } else {
        this.context.resume().then(() => {
          if (this.musicEnabled && !this._destroyed && !document.hidden) this._startMusic();
        }).catch(() => {});
      }
    }

    destroy() {
      if (this._destroyed) return;
      this._destroyed = true;
      this._stopMusic();
      document.removeEventListener('visibilitychange', this._visibility);
      if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    }
  }

  window.MahjongAudio = MahjongAudio;
})();
