import { illuminationFraction, computeCrescent } from "../astro/crescent";
import { sunPosition } from "../astro/sun";
import { moonPosition } from "../astro/moon";
import { dateToJD } from "../astro/time";

export interface ControlsCallbacks {
  onDateChange: (date: Date) => void;
}

/**
 * Build the control panel: date/time picker, step buttons, animation, and phase display.
 */
export function createControls(
  container: HTMLElement,
  callbacks: ControlsCallbacks
): { setDate: (d: Date) => void } {
  container.innerHTML = `
    <div class="controls-row">
      <button id="btn-back-day" title="−1 day">◀◀</button>
      <button id="btn-back-hour" title="−1 hour">◀</button>
      <input type="datetime-local" id="datetime-input" />
      <button id="btn-fwd-hour" title="+1 hour">▶</button>
      <button id="btn-fwd-day" title="+1 day">▶▶</button>
      <button id="btn-now" title="Now">⦿</button>
      <button id="btn-play" title="Animate">▷</button>
    </div>
    <div class="controls-row">
      <span id="phase-display"></span>
    </div>
  `;

  const input = container.querySelector("#datetime-input") as HTMLInputElement;
  const phaseDisplay = container.querySelector("#phase-display") as HTMLElement;

  let currentDate = new Date();
  let animationId: number | null = null;

  function setDate(d: Date): void {
    currentDate = d;
    // Format for datetime-local input (local time)
    const pad = (n: number) => String(n).padStart(2, "0");
    input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    updatePhaseDisplay();
    callbacks.onDateChange(d);
  }

  function updatePhaseDisplay(): void {
    const jd = dateToJD(currentDate);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const illum = illuminationFraction(sun, moon);
    const pct = (illum * 100).toFixed(1);

    // Simple moon phase emoji
    let emoji: string;
    if (illum < 0.05) emoji = "🌑";
    else if (illum < 0.35) emoji = "🌒";
    else if (illum < 0.65) emoji = "🌓";
    else if (illum < 0.95) emoji = "🌔";
    else emoji = "🌕";

    phaseDisplay.textContent = `${emoji} ${pct}% illuminated`;
  }

  function stepHours(hours: number): void {
    const d = new Date(currentDate.getTime() + hours * 3600_000);
    setDate(d);
  }

  // Event listeners
  input.addEventListener("change", () => {
    const d = new Date(input.value);
    if (!isNaN(d.getTime())) setDate(d);
  });

  container.querySelector("#btn-back-day")!.addEventListener("click", () => stepHours(-24));
  container.querySelector("#btn-back-hour")!.addEventListener("click", () => stepHours(-1));
  container.querySelector("#btn-fwd-hour")!.addEventListener("click", () => stepHours(1));
  container.querySelector("#btn-fwd-day")!.addEventListener("click", () => stepHours(24));
  container.querySelector("#btn-now")!.addEventListener("click", () => setDate(new Date()));

  const playBtn = container.querySelector("#btn-play") as HTMLButtonElement;
  playBtn.addEventListener("click", () => {
    if (animationId !== null) {
      clearInterval(animationId);
      animationId = null;
      playBtn.textContent = "▷";
    } else {
      playBtn.textContent = "⏸";
      animationId = window.setInterval(() => stepHours(1), 500);
    }
  });

  return { setDate };
}

/**
 * Build the legend panel explaining the color scheme.
 */
export function createLegend(container: HTMLElement): void {
  container.innerHTML = `
    <div class="legend-title">Crescent Orientation</div>
    <div class="legend-item">
      <span class="legend-swatch legend-upper"></span>
      <span>Upper crescent (bright limb up) ☽̃</span>
    </div>
    <div class="legend-item">
      <span class="legend-swatch legend-lower"></span>
      <span>Lower crescent — "wet moon" (bright limb down) ☽</span>
    </div>
    <div class="legend-item">
      <span class="legend-swatch legend-fade"></span>
      <span>Gradient = certainty (solid → edge of zone)</span>
    </div>
  `;
}

/**
 * Info panel for click-to-inspect.
 */
export function createInfoPanel(container: HTMLElement): {
  show: (lat: number, lon: number, date: Date) => void;
  hide: () => void;
} {
  function show(lat: number, lon: number, date: Date): void {
    const jd = dateToJD(date);
    const sun = sunPosition(jd);
    const moon = moonPosition(jd);
    const info = computeCrescent(sun, moon, jd, lat, lon);

    const tiltDeg = ((info.tilt * 180) / Math.PI).toFixed(1);
    const moonAltDeg = ((info.moonAlt * 180) / Math.PI).toFixed(1);
    const sunAltDeg = ((info.sunAlt * 180) / Math.PI).toFixed(1);
    const illumPct = (info.illumination * 100).toFixed(1);

    container.innerHTML = `
      <button class="info-close" aria-label="Close">&times;</button>
      <div class="info-content">
        <div class="info-title">📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</div>
        <div>Type: <strong>${info.type}</strong></div>
        <div>Tilt: ${tiltDeg}°</div>
        <div>Moon alt: ${moonAltDeg}°</div>
        <div>Sun alt: ${sunAltDeg}°</div>
        <div>Illumination: ${illumPct}%</div>
      </div>
    `;
    container.style.display = "block";
    container.querySelector(".info-close")!.addEventListener("click", (e) => {
      e.stopPropagation();
      hide();
    });
  }

  function hide(): void {
    container.style.display = "none";
  }

  return { show, hide };
}
