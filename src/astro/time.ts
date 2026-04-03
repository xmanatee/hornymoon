import { J2000, JULIAN_CENTURY, DEG, normalizeDeg } from "./constants";

/**
 * Convert a JS Date to Julian Date.
 * Uses the algorithm from Meeus, "Astronomical Algorithms" ch. 7.
 */
export function dateToJD(date: Date): number {
  let y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d +
    B -
    1524.5
  );
}

/** Julian centuries since J2000.0 */
export function julianCenturies(jd: number): number {
  return (jd - J2000) / JULIAN_CENTURY;
}

/**
 * Greenwich Mean Sidereal Time in degrees.
 * Meeus, ch. 12.
 */
export function gmst(jd: number): number {
  const T = julianCenturies(jd);
  const theta =
    280.46061837 +
    360.98564736629 * (jd - J2000) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normalizeDeg(theta);
}

/** Local sidereal time in radians for a given longitude (degrees) */
export function localSiderealTime(jd: number, lonDeg: number): number {
  return normalizeDeg(gmst(jd) + lonDeg) * DEG;
}
