import { DateTime } from "luxon";

export function wallTimeToUtcIso(localDateTime: string, zone: string): string {
  const dt = DateTime.fromISO(localDateTime, { zone });
  if (!dt.isValid) throw new Error(`Invalid wall time ${localDateTime} / ${zone}`);
  return dt.toUTC().toISO({ suppressMilliseconds: false })!;
}

export function addMinutesIso(utcIso: string, minutes: number): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).plus({ minutes }).toISO()!;
}

export function formatInZone(utcIso: string, zone: string, fmt = "EEE MMM d, h:mm a ZZZZ"): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone).toFormat(fmt);
}

export function weekBoundsUtc(referenceUtcIso: string, zone: string): { fromUtc: string; toUtc: string } {
  const ref = DateTime.fromISO(referenceUtcIso, { zone: "utc" }).setZone(zone);
  const start = ref.startOf("week");
  const end = start.plus({ weeks: 1 });
  return { fromUtc: start.toUTC().toISO()!, toUtc: end.toUTC().toISO()! };
}
