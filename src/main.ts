import { createMap } from "./map/setup";
import { CrescentCanvasLayer } from "./map/canvas-overlay";
import { computeGrid } from "./map/renderer";
import { createControls, createLegend, createInfoPanel } from "./ui/controls";
import { computeCrescent } from "./astro/crescent";
import { sunPosition } from "./astro/sun";
import { moonPosition } from "./astro/moon";
import { dateToJD } from "./astro/time";

// State
let currentDate = new Date();
let debounceTimer: number | null = null;

// Initialize map
const map = createMap("map");
const crescentLayer = new CrescentCanvasLayer();
crescentLayer.addTo(map);

// Initialize UI
const controlsContainer = document.getElementById("controls")!;
const legendContainer = document.getElementById("legend")!;
const infoContainer = document.getElementById("info-panel")!;

const controls = createControls(controlsContainer, {
  onDateChange: (date) => {
    currentDate = date;
    updateVisualization();
  },
});

createLegend(legendContainer);
const infoPanel = createInfoPanel(infoContainer);

// Click-to-inspect
map.on("click", (e: L.LeafletMouseEvent) => {
  const { lat, lng } = e.latlng;
  infoPanel.show(lat, lng, currentDate);
});

/**
 * Recompute the grid and update the canvas overlay.
 * Debounced to avoid excessive computation during rapid interaction.
 */
function updateVisualization(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    const zoom = map.getZoom();
    const grid = computeGrid(currentDate, zoom);
    crescentLayer.setGridResult(grid);
  }, 100);
}

// Re-render on map movement
map.on("moveend zoomend", () => {
  updateVisualization();
});

// Initial render with current time
controls.setDate(currentDate);
