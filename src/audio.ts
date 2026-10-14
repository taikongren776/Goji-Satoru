import { SKILLS } from './timeline';
import type { SkillId } from './timeline';

/** Original synthesized audio. A single user-activated AudioContext; mute by default. */
export class TechniqueAudio {
  muted = true;
  private context?: AudioContext;
  private gain?: GainNode;
  private tone?: OscillatorNode;
  private overtone?: OscillatorNode;
  private noise?: AudioBufferSourceNode;
  private filter?: BiquadFilterNode;
  private quiet?: GainNode;
  private id: SkillId | null = null;

  async unlock(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch { this.muted = true; return false; }
  }
  start(id: SkillId): void {
    this.stop(); this.id = id;
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    this.gain = ctx.createGain(); this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass';
    this.filter.frequency.value = 650; this.filter.Q.value = .5;
    this.filter.connect(this.gain);
    this.tone = ctx.createOscillator(); this.tone.type = 'sine';
    this.tone.connect(this.filter); this.tone.start();
    this.overtone = ctx.createOscillator(); this.overtone.type = 'triangle';
    const quiet = ctx.createGain(); this.quiet=quiet; quiet.gain.value = .17;
    this.overtone.connect(quiet); quiet.connect(this.filter); this.overtone.start();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let sample = 0;
    for (let i = 0; i < data.length; i++) { sample = (sample + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = sample * 2; }
    this.noise = ctx.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true;
    this.noise.connect(this.filter); this.noise.start();
  }
  update(time: number): void {
    if (!this.id || !this.context || !this.gain || !this.tone || !this.overtone || !this.filter) return;
    const d = SKILLS[this.id];
    const charge = Math.min(1, time / d.chargeUntil);
    const tail = Math.max(0, 1 - Math.max(0, time - d.releaseUntil) / (d.duration - d.releaseUntil));
    const release = time >= d.chargeUntil;
    const now = this.context.currentTime;
    const base = this.id === 'blue' ? 82 : this.id === 'red' ? 62 : 49;
    this.tone.frequency.setTargetAtTime(release ? base * (1 + Math.exp(-(time - d.chargeUntil) * 6) * 4) : base * (1 + charge * 2), now, .04);
    this.overtone.frequency.setTargetAtTime(base * (3 + charge * 4), now, .06);
    this.filter.frequency.setTargetAtTime(release ? 1300 : 300 + charge * 500, now, .05);
    this.gain.gain.setTargetAtTime(this.muted ? 0 : (release ? .075 : .028 * charge) * tail, now, .03);
  }
  stop(): void {
    for (const node of [this.tone, this.overtone, this.noise]) {
      try { node?.stop(); } catch { /* An already stopped voice needs no further action. */ }
      node?.disconnect();
    }
    this.gain?.disconnect(); this.filter?.disconnect();this.quiet?.disconnect();this.quiet=undefined;
    this.tone = this.overtone = undefined; this.noise = undefined;
    this.gain = undefined; this.filter = undefined; this.id = null;
  }
  dispose():void {this.stop();void this.context?.close();this.context=undefined;}
}
