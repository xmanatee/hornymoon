import { sunPosition } from "../astro/sun";
import { moonPosition } from "../astro/moon";
import { computeCrescent } from "../astro/crescent";
import { dateToJD } from "../astro/time";
import type { GridResult } from "../types";

/**
 * Compute crescent visibility for a grid of points on Earth.
 *
 * The grid resolution adapts to the zoom level:
 * - Low zoom: coarse grid (fast, whole-world overview)
 * - High zoom: fine grid (detailed, regional view)
 *
 * Sun/Moon positions are computed once (they're the same for all observers)
 * and only the observer-dependent transforms run per grid point.
 */
export function computeGrid(date: Date, zoom: number): GridResult {
  const jd = dateToJD(date);

  // Geocentric positions — same for all observers
  const sun = sunPosition(jd);
  const moon = moonPosition(jd);

  // Adaptive resolution
  let resolution: number;
  if (zoom <= 2) resolution = 4;
  else if (zoom <= 4) resolution = 2;
  else if (zoom <= 6) resolution = 1;
  else resolution = 0.5;

  const south = -90;
  const west = -180;
  const height = Math.floor(180 / resolution) + 1;
  const width = Math.floor(360 / resolution) + 1;

  const cells = new Array(height * width);

  for (let row = 0; row < height; row++) {
    const lat = south + (height - 1 - row) * resolution;
    for (let col = 0; col < width; col++) {
      const lon = west + col * resolution;
      cells[row * width + col] = computeCrescent(sun, moon, jd, lat, lon);
    }
  }

  return { width, height, south, west, resolution, cells };
}
