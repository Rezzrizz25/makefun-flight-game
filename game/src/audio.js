// audio.js — all sound is synthesised live with WebAudio: no audio files,
// no network. An engine drone that follows the throttle, wind noise, a ring
// chime, a landing jingle and a crash thud. Silent until the first key or
// click, as browsers require.

export function makeAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    started: false,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') void this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        // Engine: two detuned sawtooth oscillators through a low-pass filter.
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.value = 58;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        this.engineOsc.connect(filter);
        osc2.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
        osc2.start();
        this.osc2 = osc2;
        // Wind: looped white noise whose level follows airspeed.
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        noise.loop = true;
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 600;
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.0;
        noise.connect(windFilter);
        windFilter.connect(this.windGain);
        this.windGain.connect(this.ctx.destination);
        noise.start();
        this.started = true;
      } catch {
        this.ctx = null;
      }
    },

    // Called every frame while flying: engine pitch and wind follow the plane.
    update(throttle, speed, flying) {
      if (!this.ctx || this.muted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        if (this.windGain) this.windGain.gain.value = 0;
        return;
      }
      const t = this.ctx.currentTime;
      const level = flying ? 0.02 + (throttle / 100) * 0.045 : 0;
      this.engineGain.gain.setTargetAtTime(level, t, 0.1);
      const freq = 52 + throttle * 0.9;
      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
      this.osc2.frequency.setTargetAtTime(freq * 1.03, t, 0.1);
      this.windGain.gain.setTargetAtTime(flying ? Math.min(0.05, (speed / 200) * 0.05) : 0, t, 0.15);
    },

    tone(freq, dur, type, vol, when = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },

    ring() {
      this.tone(880, 0.35, 'sine', 0.16);
      this.tone(1318, 0.45, 'sine', 0.14, 0.07);
    },

    boost() {
      this.tone(220, 0.3, 'triangle', 0.12);
      this.tone(330, 0.3, 'triangle', 0.1, 0.08);
    },

    thud() {
      this.tone(70, 0.25, 'sine', 0.3);
    },

    crash() {
      this.tone(55, 0.8, 'sawtooth', 0.25);
      this.tone(40, 1.0, 'sine', 0.3, 0.05);
    },

    land() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.14, i * 0.11));
    },

    win() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.15, i * 0.13));
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.windGain) this.windGain.gain.value = 0;
      return this.muted;
    },
  };
  return audio;
}
