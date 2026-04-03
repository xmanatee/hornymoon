import { createMap } from "./map/setup";
import { CrescentCanvasLayer } from "./map/canvas-overlay";
import { computeGrid } from "./map/renderer";
import { createTimeline } from "./ui/timeline";
import { createInfoOverlay } from "./ui/controls";
import { findNearestCrescentDate } from "./astro/find-crescent";

let currentDate = new Date();
let pendingRecompute = false;

const map = createMap("map");
const crescentLayer = new CrescentCanvasLayer();
crescentLayer.addTo(map);

// Info button + panel
const infoOverlay = createInfoOverlay(
  document.getElementById("info-btn")!,
  document.getElementById("info-panel")!
);

// Click-to-inspect
map.on("click", (e: L.LeafletMouseEvent) => {
  infoOverlay.showPoint(e.latlng.lat, e.latlng.lng, currentDate);
});

// Timeline
const timeline = createTimeline(document.getElementById("timeline")!, {
  onDateChange: (date) => {
    currentDate = date;
    scheduleRecompute();
  },
});

// Recompute on zoom
map.on("zoomend", () => scheduleRecompute());

function scheduleRecompute(): void {
  if (pendingRecompute) return;
  pendingRecompute = true;
  requestAnimationFrame(() => {
    pendingRecompute = false;
    const grid = computeGrid(currentDate, map.getZoom());
    crescentLayer.setGridResult(grid);
  });
}

// Start at nearest crescent date
const initialDate = findNearestCrescentDate(new Date());
timeline.setDate(initialDate);
