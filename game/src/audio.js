// audio.js — all sound is synthesized with WebAudio: no audio files, so the
// game loads nothing over the network. Footsteps, pebble clatter, pickup
// chimes, the alert sting and the win arpeggio are short oscillator blips.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.pulseTimer = 0; // heartbeat that quickens as detection rises
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  blip(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Soft carpet step; louder and sharper when walking normally.
  footstep(sneaking) {
    this.blip(sneaking ? 190 : 140, 0.07, 'triangle', sneaking ? 0.05 : 0.11);
  }

  pebbleThrow() {
    this.blip(500, 0.09, 'sine', 0.12, 320);
  }

  pebbleLand() {
    this.blip(900, 0.05, 'square', 0.09);
    this.blip(700, 0.07, 'square', 0.08, null, 0.07);
    this.blip(1100, 0.04, 'square', 0.06, null, 0.14);
  }

  pickup() {
    this.blip(660, 0.1, 'sine', 0.18);
    this.blip(990, 0.16, 'sine', 0.18, null, 0.09);
  }

  suspicious() {
    this.blip(320, 0.22, 'sawtooth', 0.08, 420);
  }

  alert() {
    this.blip(220, 0.5, 'sawtooth', 0.16, 660);
    this.blip(330, 0.4, 'square', 0.1, 660, 0.12);
  }

  caught() {
    this.blip(440, 0.7, 'sawtooth', 0.16, 110);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.28, 'sine', 0.16, null, i * 0.12));
  }

  exitOpen() {
    this.blip(392, 0.18, 'sine', 0.14);
    this.blip(587, 0.24, 'sine', 0.14, null, 0.12);
  }

  // A low pulse while any guard is close to spotting you — the audio cue
  // that a near miss is happening. Call every frame with the max meter.
  heartbeat(dt, maxMeter) {
    if (!this.ctx || this.muted) return;
    if (maxMeter < 35) return;
    this.pulseTimer -= dt;
    if (this.pulseTimer <= 0) {
      this.blip(70, 0.14, 'sine', 0.22);
      // The hotter the meter, the faster the pulse.
      this.pulseTimer = 1.15 - (maxMeter / 100) * 0.75;
    }
  }
}
