export interface Clock { now(): Date; }
export const SystemClock: Clock = { now: () => new Date() };
export class FixedClock implements Clock {
  constructor(private iso: string) {}
  now() { return new Date(this.iso); }
}
