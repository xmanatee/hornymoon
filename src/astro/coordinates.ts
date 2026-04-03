import { DEG } from "./constants";
import { localSiderealTime } from "./time";
import type { Equatorial, Horizontal } from "../types";

/**
 * Convert equatorial coordinates to horizontal (alt/az) for an observer.
 *
 * @param eq  — equatorial coordinates (RA, Dec in radians)
 * @param jd  — Julian date
 * @param lat — observer latitude in degrees
 * @param lon — observer longitude in degrees
 */
export function equatorialToHorizontal(
  eq: Equatorial,
  jd: number,
  lat: number,
  lon: number
): Horizontal {
  const lst = localSiderealTime(jd, lon);
  const H = lst - eq.ra; // hour angle (radians)

  const latRad = lat * DEG;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinDec = Math.sin(eq.dec);
  const cosDec = Math.cos(eq.dec);
  const cosH = Math.cos(H);
  const sinH = Math.sin(H);

  const alt = Math.asin(sinLat * sinDec + cosLat * cosDec * cosH);
  const az = Math.atan2(-cosDec * sinH, sinDec * cosLat - cosDec * sinLat * cosH);

  return { alt, az };
}

/**
 * Parallactic angle: the angle between celestial north and zenith
 * at the object's position, measured from north through east.
 *
 * This tells us how the celestial coordinate frame is rotated
 * relative to the observer's local vertical.
 */
export function parallacticAngle(
  eq: Equatorial,
  jd: number,
  lat: number,
  lon: number
): number {
  const lst = localSiderealTime(jd, lon);
  const H = lst - eq.ra;

  const latRad = lat * DEG;

  return Math.atan2(
    Math.sin(H),
    Math.tan(latRad) * Math.cos(eq.dec) - Math.sin(eq.dec) * Math.cos(H)
  );
}
