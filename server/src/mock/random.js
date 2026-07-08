// Deterministic PRNG (mulberry32) so mock data is stable across restarts
// within a day: same seed → same numbers. Seeded by day index so the
// "history" stays consistent while today keeps moving forward.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dayIndex(date = new Date()) {
  return Math.floor(date.getTime() / 86_400_000);
}

export function rngForDay(offsetFromToday, salt = 0) {
  return mulberry32((dayIndex() - offsetFromToday) * 2654435761 + salt);
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function isoDay(offsetFromToday) {
  const d = new Date(Date.now() - offsetFromToday * 86_400_000);
  return d.toISOString().slice(0, 10);
}
