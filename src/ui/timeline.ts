import { dateToJD } from "../astro/time";
import { sunPosition } from "../astro/sun";
import { moonPosition } from "../astro/moon";
import { illuminationFraction } from "../astro/crescent";

export interface TimelineCallbacks {
  onDateChange: (date: Date) => void;
}

/**
 * A draggable timeline bar at the bottom of the screen.
 * Spans 30 days centered on the given initial date.
 * Shows moon phase curve and day markers.
 * Supports mouse and touch drag for continuous scrubbing.
 */
export function createTimeline(
  container: HTMLElement,
  callbacks: TimelineCallbacks
): { setDate: (d: Date) => void; getRange: () => { start: Date; end: Date } } {
  const TOTAL_DAYS = 30;
  const HOURS_PER_DAY = 24;
  const TOTAL_HOURS = TOTAL_DAYS * HOURS_PER_DAY;

  let rangeStart: Date;
  let currentDate: Date;

  container.innerHTML = `
    <canvas id="timeline-canvas"></canvas>
    <div id="timeline-cursor"></div>
    <div id="timeline-date-label"></div>
  `;

  const canvas = container.querySelector("#timeline-canvas") as HTMLCanvasElement;
  const cursor = container.querySelector("#timeline-cursor") as HTMLElement;
  const dateLabel = container.querySelector("#timeline-date-label") as HTMLElement;
  const ctx = canvas.getContext("2d")!;

  let isDragging = false;

  function setRange(centerDate: Date): void {
    rangeStart = new Date(
      centerDate.getTime() - (TOTAL_DAYS / 2) * 86400_000
    );
  }

  function setDate(d: Date): void {
    currentDate = d;
    setRange(d);
    drawTimeline();
    updateCursor();
  }

  function hourToX(hour: number): number {
    return (hour / TOTAL_HOURS) * canvas.width;
  }

  function xToHour(x: number): number {
    return Math.round((x / canvas.width) * TOTAL_HOURS);
  }

  function drawTimeline(): void {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(10, 10, 20, 0.95)";
    ctx.fillRect(0, 0, w, h);

    // Draw illumination curve and crescent-availability indicator
    const phaseY = h * 0.35;
    const phaseH = h * 0.25;

    ctx.beginPath();
    for (let hour = 0; hour <= TOTAL_HOURS; hour += 2) {
      const date = new Date(rangeStart.getTime() + hour * 3600_000);
      const jd = dateToJD(date);
      const sun = sunPosition(jd);
      const moon = moonPosition(jd);
      const illum = illuminationFraction(sun, moon);

      const x = (hour / TOTAL_HOURS) * w;
      const y = phaseY + phaseH * (1 - illum);

      if (hour === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shade the crescent zone (illumination 0.5% to 40%)
    for (let hour = 0; hour < TOTAL_HOURS; hour += 2) {
      const date = new Date(rangeStart.getTime() + hour * 3600_000);
      const jd = dateToJD(date);
      const sun = sunPosition(jd);
      const moon = moonPosition(jd);
      const illum = illuminationFraction(sun, moon);

      if (illum >= 0.005 && illum <= 0.4) {
        const x = (hour / TOTAL_HOURS) * w;
        const xEnd = ((hour + 2) / TOTAL_HOURS) * w;
        ctx.fillStyle = "rgba(80, 160, 255, 0.15)";
        ctx.fillRect(x, 0, xEnd - x, h);
      }
    }

    // Day markers and labels
    for (let day = 0; day <= TOTAL_DAYS; day++) {
      const x = (day / TOTAL_DAYS) * w;
      const date = new Date(rangeStart.getTime() + day * 86400_000);
      const dayNum = date.getUTCDate();

      ctx.strokeStyle =
        dayNum === 1
          ? "rgba(255,255,255,0.4)"
          : "rgba(255,255,255,0.12)";
      ctx.lineWidth = dayNum === 1 ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Date labels every 5 days or on the 1st
      if (day % 5 === 0 || dayNum === 1) {
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const label =
          dayNum === 1
            ? months[date.getUTCMonth()]
            : String(dayNum);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, x, h - 4);
      }
    }
  }

  function updateCursor(): void {
    if (!currentDate || !rangeStart) return;
    const hoursOffset =
      (currentDate.getTime() - rangeStart.getTime()) / 3600_000;
    const fraction = hoursOffset / TOTAL_HOURS;
    const pct = Math.max(0, Math.min(100, fraction * 100));
    cursor.style.left = pct + "%";

    const pad = (n: number) => String(n).padStart(2, "0");
    dateLabel.textContent = `${currentDate.getUTCFullYear()}-${pad(currentDate.getUTCMonth() + 1)}-${pad(currentDate.getUTCDate())} ${pad(currentDate.getUTCHours())}:${pad(currentDate.getUTCMinutes())} UTC`;
    dateLabel.style.left = Math.max(5, Math.min(95, pct)) + "%";
  }

  function handlePointer(clientX: number): void {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    const hours = Math.round(fraction * TOTAL_HOURS);
    const newDate = new Date(rangeStart.getTime() + hours * 3600_000);
    currentDate = newDate;
    updateCursor();
    callbacks.onDateChange(newDate);
  }

  // Mouse events
  container.addEventListener("mousedown", (e) => {
    isDragging = true;
    handlePointer(e.clientX);
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging) handlePointer(e.clientX);
  });
  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Touch events
  container.addEventListener(
    "touchstart",
    (e) => {
      isDragging = true;
      handlePointer(e.touches[0].clientX);
      e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging) handlePointer(e.touches[0].clientX);
    },
    { passive: true }
  );
  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Resize handling
  let resizeTimer: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => drawTimeline(), 150);
  });

  return {
    setDate,
    getRange: () => ({
      start: rangeStart,
      end: new Date(rangeStart.getTime() + TOTAL_DAYS * 86400_000),
    }),
  };
}
