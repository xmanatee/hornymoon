/** Equatorial coordinates (right ascension, declination) in radians */
export interface Equatorial {
  ra: number;
  dec: number;
}

/** Horizontal coordinates (altitude, azimuth) in radians */
export interface Horizontal {
  alt: number;
  az: number;
}

/** Geographic coordinates in degrees */
export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Result of crescent analysis for a single observer location */
export interface CrescentInfo {
  /** Crescent tilt angle χ (chi) in radians — 0 = bright limb at top, π = at bottom */
  tilt: number;
  /** How "horizontal" the crescent is: 0 = perfectly horizontal, 1 = perfectly vertical */
  verticality: number;
  /** Moon altitude in radians */
  moonAlt: number;
  /** Sun altitude in radians */
  sunAlt: number;
  /** Illumination fraction 0..1 */
  illumination: number;
  /** Classification */
  type: "upper" | "lower" | "side" | "invisible";
}

/** Grid computation result for the renderer */
export interface GridResult {
  width: number;
  height: number;
  south: number;
  west: number;
  resolution: number;
  cells: CrescentInfo[];
}
