import { computeCrescent, illuminationFraction } from "../astro/crescent";
import { sunPosition } from "../astro/sun";
import { moonPosition } from "../astro/moon";
import { dateToJD } from "../astro/time";

/**
 * Info toggle button (top-right) + flyout panel with legend and click-inspect data.
 */
export function createInfoOverlay(infoBtn: HTMLElement, panel: HTMLElement): {
  showPoint: (lat: number, lon: number, date: Date) => void;
  hidePoint: () => void;
} {
  let panelOpen = false;

  panel.innerHTML = `
    <div class="panel-legend">
      <div class="legend-row"><span class="swatch swatch-lower"></span> Horizontal crescent ("wet moon")</div>
      <div class="legend-row"><span class="swatch swatch-fade"></span> Brighter = more horizontal</div>
      <div class="legend-hint">Zone marks where the crescent appears as a bowl — on the Sun-Earth-Moon plane during twilight.</div>
    </div>
    <div class="panel-point" style="display:none"></div>
  `;

  const pointEl = panel.querySelector(".panel-point") as HTMLElement;

  infoBtn.addEventListener("click", () => {
    panelOpen = !panelOpen;
    panel.classList.toggle("open", panelOpen);
    infoBtn.classList.toggle("active", panelOpen);
  });

  function showPoint(lat: number, lon: number, date: Date): void {
    const jd = dateToJD(date);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const info = computeCrescent(sun, moon, jd, lat, lon);
    const illum = illuminationFraction(sun, moon);

    const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1);

    pointEl.innerHTML = `
      <div class="point-title">${lat.toFixed(2)}°, ${lon.toFixed(2)}°</div>
      <div>Type: <strong>${info.type}</strong></div>
      <div>Tilt: ${toDeg(info.tilt)}°</div>
      <div>Moon alt: ${toDeg(info.moonAlt)}° &nbsp; Sun alt: ${toDeg(info.sunAlt)}°</div>
      <div>Illumination: ${(illum * 100).toFixed(1)}%</div>
    `;
    pointEl.style.display = "block";

    if (!panelOpen) {
      panelOpen = true;
      panel.classList.add("open");
      infoBtn.classList.add("active");
    }
  }

  function hidePoint(): void {
    pointEl.style.display = "none";
  }

  return { showPoint, hidePoint };
}
