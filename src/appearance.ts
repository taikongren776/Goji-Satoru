/** The appearance commits at hand contact; an interruption preserves that state. */
export class EyeTransition {
  visible = false;
  target = false;
  elapsed = 0;
  active = false;
  readonly duration = 2.4;

  start(visible: boolean): boolean {
    if (this.active || this.visible === visible) return false;
    this.target = visible; this.elapsed = 0; this.active = true;
    return true;
  }
  get clip(): string { return this.target ? 'RevealEyes' : 'CoverEyes'; }
  get contact(): number { return this.target ? .92 : 1.32; }
  advance(delta: number): boolean {
    if (!this.active || !Number.isFinite(delta) || delta < 0) return false;
    this.elapsed = Math.min(this.duration, this.elapsed + delta);
    if (this.elapsed >= this.contact) this.visible = this.target;
    return this.elapsed === this.duration;
  }
  finish(): void { this.visible = this.target; this.active = false; }
  cancel(): void { this.active = false; this.target = this.visible; this.elapsed = 0; }
}
