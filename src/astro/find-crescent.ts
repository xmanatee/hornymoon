import { dateToJD } from "./time";
import { sunPosition } from "./sun";
import { moonPosition } from "./moon";
import { illuminationFraction } from "./crescent";

/**
 * Find the nearest date (searching forward and backward) where the Moon
 * is in a crescent phase (illumination between 2% and 40%).
 *
 * Searches in 12-hour steps up to 30 days in each direction.
 */
export function findNearestCrescentDate(from: Date): Date {
  const jd0 = dateToJD(from);
  const sun0 = sunPosition(jd0);
  const moon0 = moonPosition(jd0);
  const illum0 = illuminationFraction(sun0, moon0);

  if (illum0 >= 0.02 && illum0 <= 0.40) return from;

  const STEP_MS = 12 * 3600_000;
  const MAX_STEPS = 60; // 30 days

  for (let i = 1; i <= MAX_STEPS; i++) {
    for (const dir of [1, -1]) {
      const candidate = new Date(from.getTime() + dir * i * STEP_MS);
      const jd = dateToJD(candidate);
      const sun = sunPosition(jd);
      const moon = moonPosition(jd);
      const illum = illuminationFraction(sun, moon);
      if (illum >= 0.02 && illum <= 0.40) return candidate;
    }
  }

  return from;
}
