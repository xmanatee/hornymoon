import { equatorialToHorizontal, parallacticAngle } from "./coordinates";
import type { Equatorial, CrescentInfo } from "../types";

/**
 * Position angle of the Sun relative to the Moon, measured from
 * celestial north through east. This is the direction of the
 * midpoint of the Moon's bright (illuminated) limb.
 *
 * Meeus, ch. 48.
 */
export function brightLimbPA(sun: Equatorial, moon: Equatorial): number {
  const dRA = sun.ra - moon.ra;
  return Math.atan2(
    Math.cos(sun.dec) * Math.sin(dRA),
    Math.sin(sun.dec) * Math.cos(moon.dec) -
      Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(dRA)
  );
}

/**
 * Illumination fraction of the Moon (0 = new, 1 = full).
 * Based on the elongation between Sun and Moon.
 */
export function illuminationFraction(sun: Equatorial, moon: Equatorial): number {
  const elongation = Math.acos(
    Math.sin(sun.dec) * Math.sin(moon.dec) +
      Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(sun.ra - moon.ra)
  );
  return (1 - Math.cos(elongation)) / 2;
}

/** Threshold for crescent visibility (max illumination fraction) */
const MAX_ILLUMINATION = 0.5;

/** Minimum illumination to be visible at all */
const MIN_ILLUMINATION = 0.005;

/** Maximum sun altitude (radians) for crescent to be visible — civil twilight */
const MAX_SUN_ALT = 6 * (Math.PI / 180);

/** Minimum moon altitude (radians) — slightly below horizon for refraction */
const MIN_MOON_ALT = -1 * (Math.PI / 180);

/**
 * Threshold angle (radians) for classifying crescent as "upper" or "lower".
 * |sin(tilt)| < sin(threshold) → horizontal crescent.
 * 30° is a generous zone that captures the visually noticeable effect.
 */
const TILT_THRESHOLD = 30 * (Math.PI / 180);

/**
 * Compute crescent information for a single observer location.
 *
 * The key insight: the crescent tilt angle χ = PA - q, where:
 * - PA is the position angle of the bright limb (Sun direction from Moon)
 * - q is the parallactic angle (how celestial north is tilted from zenith)
 *
 * When χ ≈ 0 or 2π, the bright limb faces upward → "upper crescent"
 * When χ ≈ π, the bright limb faces downward → "lower crescent" (wet moon / bowl)
 * When χ ≈ π/2 or 3π/2, it's a standard sideways crescent
 */
export function computeCrescent(
  sun: Equatorial,
  moon: Equatorial,
  jd: number,
  lat: number,
  lon: number
): CrescentInfo {
  const moonHoriz = equatorialToHorizontal(moon, jd, lat, lon);

  // Quick check: Moon below horizon → invisible
  if (moonHoriz.alt < MIN_MOON_ALT) {
    return {
      tilt: 0,
      verticality: 0,
      moonAlt: moonHoriz.alt,
      sunAlt: 0,
      illumination: 0,
      type: "invisible",
    };
  }

  const sunHoriz = equatorialToHorizontal(sun, jd, lat, lon);

  // Check sun altitude — crescent only visible during twilight or night
  if (sunHoriz.alt > MAX_SUN_ALT) {
    return {
      tilt: 0,
      verticality: 0,
      moonAlt: moonHoriz.alt,
      sunAlt: sunHoriz.alt,
      illumination: 0,
      type: "invisible",
    };
  }

  const illum = illuminationFraction(sun, moon);

  // Check illumination — must be in crescent phase
  if (illum < MIN_ILLUMINATION || illum > MAX_ILLUMINATION) {
    return {
      tilt: 0,
      verticality: 0,
      moonAlt: moonHoriz.alt,
      sunAlt: sunHoriz.alt,
      illumination: illum,
      type: "invisible",
    };
  }

  // Position angle of bright limb (celestial frame)
  const PA = brightLimbPA(sun, moon);

  // Parallactic angle at the Moon's position
  const q = parallacticAngle(moon, jd, lat, lon);

  // Crescent tilt: angle of bright limb relative to local zenith
  const chi = PA - q;

  // sin(χ) measures how "sideways" the crescent is
  // 0 = perfectly vertical (upper or lower), ±1 = perfectly sideways
  const sinChi = Math.sin(chi);
  const cosChi = Math.cos(chi);
  const verticality = Math.abs(sinChi); // 0 = horizontal crescent, 1 = vertical

  let type: CrescentInfo["type"];
  if (verticality < Math.sin(TILT_THRESHOLD)) {
    // Crescent is near horizontal — classify as upper or lower
    type = cosChi > 0 ? "upper" : "lower";
  } else {
    type = "side";
  }

  return {
    tilt: chi,
    verticality,
    moonAlt: moonHoriz.alt,
    sunAlt: sunHoriz.alt,
    illumination: illum,
    type,
  };
}
