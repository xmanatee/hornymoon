import { dateToJD } from "../astro/time";
import { sunPosition } from "../astro/sun";
import { moonPosition } from "../astro/moon";
import { illuminationFraction } from "../astro/crescent";

export interface TimelineCallbacks {
  onDateChange: (date: Date) => void;
}

const TOTAL_DAYS = 60;
const PX_PER_HOUR = 8;
const HOURS = TOTAL_DAYS * 24;
const STRIP_WIDTH = HOURS * PX_PER_HOUR;

/**
 * Horizontally scrollable timeline strip.
 * The strip is much wider than the viewport — scroll left/right to move through time.
 * A fixed center cursor marks the selected time.
 */
export function createTimeline(
  container: HTMLElement,
  callbacks: TimelineCallbacks
): { setDate: (d: Date) => void } {
  let rangeStart: Date;
  let currentDate: Date;
  let suppressScrollHandler = false;

  container.innerHTML = `
    <div class="tl-scroll">
      <canvas class="tl-canvas"></canvas>
    </div>
    <div class="tl-cursor"></div>
    <div class="tl-label"></div>
  `;

  const scrollEl = container.querySelector(".tl-scroll") as HTMLElement;
  const canvas = container.querySelector(".tl-canvas") as HTMLCanvasElement;
  const label = container.querySelector(".tl-label") as HTMLElement;
  const ctx = canvas.getContext("2d")!;

  function setDate(d: Date): void {
    currentDate = d;
    rangeStart = new Date(d.getTime() - (TOTAL_DAYS / 2) * 86400_000);
    drawStrip();
    scrollToDate(d);
    updateLabel();
  }

  function drawStrip(): void {
    const dpr = window.devicePixelRatio || 1;
    const h = container.getBoundingClientRect().height;
    canvas.width = STRIP_WIDTH * dpr;
    canvas.height = h * dpr;
    canvas.style.width = STRIP_WIDTH + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, STRIP_WIDTH, h);

    // Illumination curve (precompute at 6-hour steps for speed)
    const curveY0 = h * 0.25;
    const curveH = h * 0.35;

    // Background shading for crescent-phase regions
    for (let hr = 0; hr < HOURS; hr += 4) {
      const d = new Date(rangeStart.getTime() + hr * 3600_000);
      const jd = dateToJD(d);
      const illum = illuminationFraction(sunPosition(jd), moonPosition(jd));
      if (illum >= 0.005 && illum <= 0.45) {
        const x = hr * PX_PER_HOUR;
        ctx.fillStyle = "rgba(80, 160, 255, 0.12)";
        ctx.fillRect(x, 0, 4 * PX_PER_HOUR, h);
      }
    }

    // Illumination curve
    ctx.beginPath();
    for (let hr = 0; hr <= HOURS; hr += 3) {
      const d = new Date(rangeStart.getTime() + hr * 3600_000);
      const jd = dateToJD(d);
      const illum = illuminationFraction(sunPosition(jd), moonPosition(jd));
      const x = hr * PX_PER_HOUR;
      const y = curveY0 + curveH * (1 - illum);
      if (hr === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Day markers
    for (let day = 0; day <= TOTAL_DAYS; day++) {
      const x = day * 24 * PX_PER_HOUR;
      const d = new Date(rangeStart.getTime() + day * 86400_000);
      const dayNum = d.getUTCDate();

      ctx.strokeStyle = dayNum === 1
        ? "rgba(255,255,255,0.35)"
        : "rgba(255,255,255,0.08)";
      ctx.lineWidth = dayNum === 1 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Labels
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let text: string;
      if (dayNum === 1) {
        text = months[d.getUTCMonth()];
      } else if (day % 3 === 0) {
        text = String(dayNum);
      } else {
        continue;
      }
      ctx.fillStyle = dayNum === 1
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.35)";
      ctx.font = `${dayNum === 1 ? 11 : 10}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(text, x, h - 3);
    }
  }

  function scrollToDate(d: Date): void {
    const hoursFromStart = (d.getTime() - rangeStart.getTime()) / 3600_000;
    const targetX = hoursFromStart * PX_PER_HOUR;
    const viewW = scrollEl.clientWidth;
    suppressScrollHandler = true;
    scrollEl.scrollLeft = targetX - viewW / 2;
    requestAnimationFrame(() => { suppressScrollHandler = false; });
  }

  function dateFromScroll(): Date {
    const viewW = scrollEl.clientWidth;
    const centerX = scrollEl.scrollLeft + viewW / 2;
    const hours = centerX / PX_PER_HOUR;
    return new Date(rangeStart.getTime() + hours * 3600_000);
  }

  function updateLabel(): void {
    if (!currentDate) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = currentDate;
    label.textContent =
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}  ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  }

  // On scroll → update date
  scrollEl.addEventListener("scroll", () => {
    if (suppressScrollHandler) return;
    currentDate = dateFromScroll();
    updateLabel();
    callbacks.onDateChange(currentDate);
  }, { passive: true });

  // Redraw on resize
  let resizeRaf: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      drawStrip();
      if (currentDate) scrollToDate(currentDate);
    });
  });

  return { setDate };
}
