/** Degrees to radians */
export const DEG = Math.PI / 180;

/** Julian date of J2000.0 epoch (2000 Jan 1.5 TT) */
export const J2000 = 2451545.0;

/** Julian days per century */
export const JULIAN_CENTURY = 36525.0;

/** Mean obliquity of the ecliptic at J2000.0 (degrees) */
export const OBLIQUITY_J2000 = 23.4392911;

/** Normalize angle to [0, 360) degrees */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Normalize angle to [-π, π) radians */
export function normalizeRad(rad: number): number {
  return Math.atan2(Math.sin(rad), Math.cos(rad));
}
