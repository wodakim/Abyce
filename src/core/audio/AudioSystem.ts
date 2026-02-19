// src/core/audio/AudioSystem.ts

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
      // AudioContext must be resumed on user interaction
      // We lazily initialize or rely on external trigger
  }

  public init() {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
          this.ctx = new AudioContextClass();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.5; // Master volume
          this.masterGain.connect(this.ctx.destination);

          this.startAmbience();
      }
  }

  public resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
      } else if (!this.ctx) {
          this.init();
      }
  }

  public playEatSound(size: number) {
      if (!this.ctx || !this.masterGain) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Pitch based on size: smaller = higher pitch
      // Base freq 400Hz
      const freq = 400 + 1000 / (size + 1);
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + 0.1);

      osc.type = 'sine';

      // Envelope
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);

      // Cleanup happens automatically by GC when nodes disconnect/stop, standard WebAudio
  }

  private startAmbience() {
      if (!this.ctx || !this.masterGain) return;

      // Brown noise approximation or low sine drone
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200; // Deep rumble

      const gain = this.ctx.createGain();
      gain.gain.value = 0.1; // Quiet background

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
  }
}

let lastOut = 0;
export const audioSystem = new AudioSystem();
