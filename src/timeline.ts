export type SkillId = 'blue' | 'red' | 'purple';
export type Phase = 'charge' | 'fusion' | 'release' | 'recover';
export interface SkillDefinition {
  id: SkillId;
  title: string;
  subtitle: string;
  english: string;
  duration: number;
  chargeUntil: number;
  releaseUntil: number;
  clip: string;
  color: number;
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  blue: { id: 'blue', title: '苍', subtitle: '术式顺转', english: 'BLUE', duration: 5, chargeUntil: 1.65, releaseUntil: 3.7, clip: 'CastBlue', color: 0x40baff },
  red: { id: 'red', title: '赫', subtitle: '术式反转', english: 'RED', duration: 4, chargeUntil: 1.4, releaseUntil: 2.6, clip: 'CastRed', color: 0xff365c },
  purple: { id: 'purple', title: '茈', subtitle: '虚式', english: 'HOLLOW PURPLE', duration: 8, chargeUntil: 4.6, releaseUntil: 6.55, clip: 'CastPurple', color: 0xba72ff },
};

/** One clock for animation, VFX, camera and sound. No independent setTimeouts. */
export class SkillTimeline {
  active: SkillId | null = null;
  elapsed = 0;

  start(id: SkillId): boolean {
    if (this.active !== null) return false;
    this.active = id;
    this.elapsed = 0;
    return true;
  }
  advance(delta: number): boolean {
    if (!this.active) return false;
    if (!Number.isFinite(delta) || delta < 0) return false;
    this.elapsed = Math.min(this.elapsed + delta, SKILLS[this.active].duration);
    return this.elapsed === SKILLS[this.active].duration;
  }
  get phase(): Phase | null {
    if (!this.active) return null;
    const config = SKILLS[this.active];
    if(this.active==='purple' && this.elapsed>=2.45 && this.elapsed<config.chargeUntil)return 'fusion';
    return this.elapsed < config.chargeUntil ? 'charge' : this.elapsed < config.releaseUntil ? 'release' : 'recover';
  }
  get progress(): number { return this.active ? this.elapsed / SKILLS[this.active].duration : 0; }
  reset(): void { this.active = null; this.elapsed = 0; }
}

export const clamp = (v: number, min = 0, max = 1): number => Math.max(min, Math.min(max, v));
export const ease = (v: number): number => { const t = clamp(v); return t * t * (3 - 2 * t); };
