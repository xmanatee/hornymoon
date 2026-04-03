import { DEG, normalizeDeg, OBLIQUITY_J2000 } from "./constants";
import { julianCenturies } from "./time";
import type { Equatorial } from "../types";

/**
 * Compute the Sun's geocentric equatorial coordinates (RA, Dec).
 *
 * Uses a simplified solar position algorithm accurate to ~1 arcminute.
 * Based on Meeus, "Astronomical Algorithms", ch. 25 (low accuracy).
 */
export function sunPosition(jd: number): Equatorial {
  const T = julianCenturies(jd);

  // Geometric mean longitude of the Sun (degrees)
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);

  // Mean anomaly of the Sun (degrees)
  const M = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * DEG;

  // Equation of center (degrees)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude (degrees)
  const lambda = normalizeDeg(L0 + C);

  // Apparent longitude — correct for nutation & aberration (~-0.00569 - 0.00478*sin(Ω))
  const omega = normalizeDeg(125.04 - 1934.136 * T);
  const lambdaApp = lambda - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  // Obliquity of the ecliptic (degrees), corrected
  const epsilon =
    OBLIQUITY_J2000 -
    0.013004167 * T -
    0.00000016389 * T * T +
    0.0000005036 * T * T * T +
    0.00256 * Math.cos(omega * DEG);

  const lambdaRad = lambdaApp * DEG;
  const epsRad = epsilon * DEG;

  // Equatorial coordinates
  const ra = Math.atan2(
    Math.cos(epsRad) * Math.sin(lambdaRad),
    Math.cos(lambdaRad)
  );
  const dec = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad));

  return { ra, dec };
}
