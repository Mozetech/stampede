// ElevenLabs-generated soundtrack and effects, decoded into WebAudio buffers.
// Falls back to tiny synthesized blips if a file is missing so the game never goes silent.
import { save } from './store.js';

const SFX = ['hop', 'coin', 'crash', 'honk', 'splash', 'buy', 'eagle', 'whoosh', 'stampede', 'record'];
const MUSIC = ['theme', 'menu'];
const base = `${import.meta.env.BASE_URL}audio/`;

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.music = {};
    this.current = null;
    this.unlocked = false;
    this.coinStreak = 0;
    this.coinAt = 0;
  }
  // Must be called from a user gesture.
  async unlock() {
    if (this.unlocked) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    this.unlocked = true;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    this.sfxGain.gain.value = save.sfx ? 0.9 : 0;
    this.musicGain.gain.value = save.music ? 0.55 : 0;
    await Promise.all([...SFX, ...MUSIC].map((n) => this.loadBuffer(n)));
    if (this.pendingMusic) this.playMusic(this.pendingMusic);
  }
  async loadBuffer(name) {
    try {
      const res = await fetch(`${base}${name}.mp3`);
      if (!res.ok) throw new Error(res.status);
      const arr = await res.arrayBuffer();
      this.buffers[name] = await this.ctx.decodeAudioData(arr);
    } catch (e) { this.buffers[name] = null; }
  }
  play(name, { rate = 1, vol = 1, detune = 0 } = {}) {
    if (!this.ctx || !save.sfx) return;
    const buf = this.buffers[name];
    if (!buf) return this.synth(name, rate);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.detune.value = detune;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(this.sfxGain);
    src.start();
  }
  hop() { this.play('hop', { rate: 1 + Math.random() * 0.15 - 0.05, vol: 0.7 }); }
  coin() {
    const now = performance.now();
    this.coinStreak = now - this.coinAt < 1500 ? Math.min(this.coinStreak + 1, 8) : 0;
    this.coinAt = now;
    this.play('coin', { detune: this.coinStreak * 100, vol: 0.8 });
  }
  synth(name, rate = 1) {
    const ctx = this.ctx; const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(this.sfxGain);
    const table = { hop: [420, 620, 0.08], coin: [880, 1320, 0.12], crash: [200, 60, 0.3], splash: [300, 120, 0.25], honk: [330, 330, 0.15], buy: [600, 900, 0.2], whoosh: [200, 500, 0.1], record: [523, 1046, 0.4], eagle: [900, 400, 0.4], stampede: [80, 60, 0.5] };
    const [f0, f1, d] = table[name] || [440, 440, 0.1];
    o.type = name === 'crash' || name === 'stampede' ? 'sawtooth' : 'square';
    o.frequency.setValueAtTime(f0 * rate, t); o.frequency.exponentialRampToValueAtTime(f1 * rate, t + d);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  }
  playMusic(name) {
    if (!this.ctx) { this.pendingMusic = name; return; }
    if (this.current?.name === name) return;
    const buf = this.buffers[name];
    this.stopMusic(0.8);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 1.2);
    src.connect(g); g.connect(this.musicGain);
    src.start();
    this.current = { name, src, g };
  }
  stopMusic(fade = 0.5) {
    const c = this.current; if (!c) return;
    const t = this.ctx.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(Math.max(0.001, c.g.gain.value), t);
    c.g.gain.exponentialRampToValueAtTime(0.001, t + fade);
    c.src.stop(t + fade + 0.05);
    this.current = null;
  }
  duck(on) { // soften music during game-over
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.linearRampToValueAtTime(save.music ? (on ? 0.25 : 0.55) : 0, t + 0.4);
  }
  applySettings() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = save.sfx ? 0.9 : 0;
    this.musicGain.gain.value = save.music ? 0.55 : 0;
  }
}
export const audio = new AudioSystem();
