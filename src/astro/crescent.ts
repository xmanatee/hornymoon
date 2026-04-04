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

/** Max illumination fraction to count as a crescent */
const MAX_ILLUMINATION = 0.5;

/** Min illumination to be visible at all */
const MIN_ILLUMINATION = 0.005;

/** Max sun altitude (radians) — sun must be near or below horizon */
const MAX_SUN_ALT = -1 * (Math.PI / 180);

/** Min moon altitude (radians) — must be above horizon */
const MIN_MOON_ALT = 0;

/**
 * Threshold angle (radians) for classifying crescent as "upper" or "lower".
 * |sin(tilt)| < sin(threshold) means the crescent is near-horizontal.
 * 15° is a focused band around the Sun-Earth-Moon plane.
 */
export const TILT_THRESHOLD_RAD = 15 * (Math.PI / 180);

/**
 * Compute crescent information for a single observer location.
 *
 * The crescent tilt angle chi = PA - q, where:
 * - PA is the position angle of the bright limb (Sun direction from Moon)
 * - q is the parallactic angle (how celestial north is tilted from zenith)
 *
 * chi ~ 0: bright limb faces upward -> "upper crescent"
 * chi ~ pi: bright limb faces downward -> "lower crescent" (wet moon)
 * chi ~ pi/2 or 3pi/2: standard sideways crescent
 */
export function computeCrescent(
  sun: Equatorial,
  moon: Equatorial,
  jd: number,
  lat: number,
  lon: number
): CrescentInfo {
  const moonHoriz = equatorialToHorizontal(moon, jd, lat, lon);
  const sunHoriz = equatorialToHorizontal(sun, jd, lat, lon);
  const illum = illuminationFraction(sun, moon);

  const invisible: CrescentInfo = {
    tilt: 0,
    verticality: 0,
    moonAlt: moonHoriz.alt,
    sunAlt: sunHoriz.alt,
    illumination: illum,
    type: "invisible",
  };

  if (moonHoriz.alt < MIN_MOON_ALT) return invisible;
  if (sunHoriz.alt > MAX_SUN_ALT) return invisible;
  if (illum < MIN_ILLUMINATION || illum > MAX_ILLUMINATION) return invisible;

  const PA = brightLimbPA(sun, moon);
  const q = parallacticAngle(moon, jd, lat, lon);
  const chi = PA - q;

  const sinChi = Math.sin(chi);
  const cosChi = Math.cos(chi);
  const verticality = Math.abs(sinChi);

  let type: CrescentInfo["type"];
  if (verticality < Math.sin(TILT_THRESHOLD_RAD)) {
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
