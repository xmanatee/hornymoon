import { createMap } from "./map/setup";
import { CrescentCanvasLayer } from "./map/canvas-overlay";
import { computeGrid } from "./map/renderer";
import { createControls, createLegend, createInfoPanel } from "./ui/controls";
import { createTimeline } from "./ui/timeline";
import { findNearestCrescentDate } from "./astro/find-crescent";

let currentDate = new Date();
let lastZoom = -1;
let debounceTimer: number | null = null;

const map = createMap("map");
const crescentLayer = new CrescentCanvasLayer();
crescentLayer.addTo(map);

// Controls (top bar)
const controls = createControls(document.getElementById("controls")!, {
  onDateChange: (date) => {
    currentDate = date;
    timeline.setDate(date);
    recompute();
  },
});

// Legend
createLegend(document.getElementById("legend")!);

// Info panel (click-to-inspect)
const infoPanel = createInfoPanel(document.getElementById("info-panel")!);
map.on("click", (e: L.LeafletMouseEvent) => {
  infoPanel.show(e.latlng.lat, e.latlng.lng, currentDate);
});

// Timeline (bottom bar)
const timeline = createTimeline(document.getElementById("timeline")!, {
  onDateChange: (date) => {
    currentDate = date;
    controls.setDateSilent(date);
    recompute();
  },
});

// Recompute on zoom change
map.on("zoomend", () => {
  const zoom = map.getZoom();
  if (zoom !== lastZoom) {
    lastZoom = zoom;
    recompute();
  }
});

function recompute(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    const grid = computeGrid(currentDate, map.getZoom());
    crescentLayer.setGridResult(grid);
  }, 50);
}

// Start at the nearest crescent date
const initialDate = findNearestCrescentDate(new Date());
controls.setDate(initialDate);
timeline.setDate(initialDate);
