export const MAX_UPCOMING = 3;

export function blocksOverlap(a: { startsAtUtc: string; endsAtUtc: string }, b: { startsAtUtc: string; endsAtUtc: string }): boolean {
  return a.startsAtUtc < b.endsAtUtc && b.startsAtUtc < a.endsAtUtc;
}

export function canCancel(startsAtUtc: string, now: Date, windowHours = 24): boolean {
  const msBefore = new Date(startsAtUtc).getTime() - now.getTime();
  return msBefore >= windowHours * 3600_000;
}

export function isInFuture(instantIso: string, now: Date): boolean {
  return new Date(instantIso).getTime() > now.getTime();
}
