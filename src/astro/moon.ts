import { DEG, normalizeDeg, OBLIQUITY_J2000 } from "./constants";
import { julianCenturies } from "./time";
import type { Equatorial } from "../types";

/**
 * Compute the Moon's geocentric equatorial coordinates (RA, Dec).
 *
 * Simplified lunar theory using the principal periodic terms from
 * Meeus, "Astronomical Algorithms", ch. 47.
 * Accuracy: ~10 arcminutes in longitude, ~5 arcminutes in latitude.
 */
export function moonPosition(jd: number): Equatorial {
  const T = julianCenturies(jd);

  // Fundamental arguments (degrees)
  const Lp = normalizeDeg(218.3165 + 481267.8813 * T); // Mean longitude
  const D = normalizeDeg(297.8502 + 445267.1115 * T); // Mean elongation
  const M = normalizeDeg(357.5291 + 35999.0503 * T); // Sun's mean anomaly
  const Mp = normalizeDeg(134.9634 + 477198.8676 * T); // Moon's mean anomaly
  const F = normalizeDeg(93.272 + 483202.0175 * T); // Argument of latitude

  const Drad = D * DEG;
  const Mrad = M * DEG;
  const Mprad = Mp * DEG;
  const Frad = F * DEG;

  // Sum of principal longitude terms (degrees)
  const dLon =
    6.289 * Math.sin(Mprad) +
    1.274 * Math.sin(2 * Drad - Mprad) +
    0.658 * Math.sin(2 * Drad) +
    0.214 * Math.sin(2 * Mprad) +
    -0.186 * Math.sin(Mrad) +
    -0.114 * Math.sin(2 * Frad) +
    0.059 * Math.sin(2 * Drad - 2 * Mprad) +
    0.057 * Math.sin(2 * Drad - Mrad - Mprad) +
    0.053 * Math.sin(2 * Drad + Mprad) +
    0.046 * Math.sin(2 * Drad - Mrad) +
    -0.041 * Math.sin(Mrad - Mprad) +
    -0.035 * Math.sin(Drad) +
    -0.031 * Math.sin(Mrad + Mprad) +
    0.015 * Math.sin(2 * Drad - 2 * Frad) +
    -0.012 * Math.sin(Mprad - 2 * Frad);

  // Ecliptic longitude (degrees)
  const lambdaMoon = normalizeDeg(Lp + dLon);

  // Sum of principal latitude terms (degrees)
  const betaMoon =
    5.128 * Math.sin(Frad) +
    0.281 * Math.sin(Mprad + Frad) +
    0.278 * Math.sin(Mprad - Frad) +
    0.173 * Math.sin(2 * Drad - Frad) +
    0.055 * Math.sin(2 * Drad - Mprad + Frad) +
    0.046 * Math.sin(2 * Drad - Mprad - Frad) +
    0.033 * Math.sin(2 * Drad + Frad) +
    0.017 * Math.sin(2 * Mprad + Frad);

  // Convert ecliptic → equatorial
  const lambdaRad = lambdaMoon * DEG;
  const betaRad = betaMoon * DEG;
  const epsRad = OBLIQUITY_J2000 * DEG; // simplified: ignore T correction for Moon

  const ra = Math.atan2(
    Math.cos(epsRad) * Math.sin(lambdaRad) * Math.cos(betaRad) -
      Math.sin(epsRad) * Math.sin(betaRad),
    Math.cos(lambdaRad) * Math.cos(betaRad)
  );

  const dec = Math.asin(
    Math.sin(epsRad) * Math.sin(lambdaRad) * Math.cos(betaRad) +
      Math.cos(epsRad) * Math.sin(betaRad)
  );

  return { ra, dec };
}
