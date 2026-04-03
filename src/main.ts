import { createMap } from "./map/setup";
import { CrescentCanvasLayer } from "./map/canvas-overlay";
import { computeGrid } from "./map/renderer";
import { createControls, createLegend, createInfoPanel } from "./ui/controls";
import { findNearestCrescentDate } from "./astro/find-crescent";

let currentDate = new Date();
let lastZoom = -1;
let debounceTimer: number | null = null;

const map = createMap("map");
const crescentLayer = new CrescentCanvasLayer();
crescentLayer.addTo(map);

const controls = createControls(document.getElementById("controls")!, {
  onDateChange: (date) => {
    currentDate = date;
    recompute();
  },
});

createLegend(document.getElementById("legend")!);
const infoPanel = createInfoPanel(document.getElementById("info-panel")!);

map.on("click", (e: L.LeafletMouseEvent) => {
  infoPanel.show(e.latlng.lat, e.latlng.lng, currentDate);
});

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
  }, 100);
}

// If today has no visible crescent, jump to the nearest date that does
const initialDate = findNearestCrescentDate(new Date());
controls.setDate(initialDate);
