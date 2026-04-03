import L from "leaflet";
import { TILT_THRESHOLD_RAD } from "../astro/crescent";
import type { GridResult } from "../types";

const TILT_THRESHOLD_SIN = Math.sin(TILT_THRESHOLD_RAD);
const MAX_ALPHA = 180;
const MOON_ALT_FULL_OPACITY = 10 * (Math.PI / 180);

/**
 * Custom Leaflet layer that renders crescent zones on a canvas overlay.
 * Uses direct pixel manipulation via ImageData for performance.
 */
export class CrescentCanvasLayer extends L.Layer {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _gridResult: GridResult | null = null;

  onAdd(map: L.Map): this {
    this._canvas = L.DomUtil.create(
      "canvas",
      "crescent-canvas-overlay"
    ) as HTMLCanvasElement;
    this._canvas.style.position = "absolute";
    this._canvas.style.pointerEvents = "none";
    this._canvas.style.zIndex = "400";

    map.getPane("overlayPane")!.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d")!;

    map.on("moveend zoomend resize", this._redraw, this);
    this._resize();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off("moveend zoomend resize", this._redraw, this);
    if (this._canvas?.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    return this;
  }

  setGridResult(result: GridResult): void {
    this._gridResult = result;
    this._redraw();
  }

  private _resize(): void {
    if (!this._map || !this._canvas) return;
    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    this._redraw();
  }

  private _redraw(): void {
    const map = this._map;
    if (!map || !this._canvas || !this._ctx || !this._gridResult) return;

    const size = map.getSize();
    if (this._canvas.width !== size.x || this._canvas.height !== size.y) {
      this._canvas.width = size.x;
      this._canvas.height = size.y;
    }

    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    const ctx = this._ctx;
    ctx.clearRect(0, 0, size.x, size.y);

    const grid = this._gridResult;
    const imageData = ctx.createImageData(size.x, size.y);
    const data = imageData.data;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.cells[row * grid.width + col];
        if (cell.type === "invisible" || cell.type === "side") continue;

        const lat = grid.south + (grid.height - 1 - row) * grid.resolution;
        const lon = grid.west + col * grid.resolution;

        const nw = map.latLngToContainerPoint([
          lat + grid.resolution / 2,
          lon - grid.resolution / 2,
        ]);
        const se = map.latLngToContainerPoint([
          lat - grid.resolution / 2,
          lon + grid.resolution / 2,
        ]);

        const px0 = Math.max(0, Math.floor(nw.x));
        const py0 = Math.max(0, Math.floor(nw.y));
        const px1 = Math.min(size.x - 1, Math.ceil(se.x));
        const py1 = Math.min(size.y - 1, Math.ceil(se.y));
        if (px1 < 0 || py1 < 0 || px0 >= size.x || py0 >= size.y) continue;

        // Upper crescent: warm amber. Lower crescent (wet moon): cool blue.
        const [r, g, b] =
          cell.type === "upper" ? [255, 180, 50] : [80, 160, 255];

        const strength = 1 - cell.verticality / TILT_THRESHOLD_SIN;
        const moonAltFactor = Math.min(1, cell.moonAlt / MOON_ALT_FULL_OPACITY);
        const alpha = Math.floor(
          Math.max(0, Math.min(255, strength * moonAltFactor * MAX_ALPHA))
        );
        if (alpha <= 0) continue;

        const alphaFrac = alpha / 255;
        for (let py = py0; py <= py1; py++) {
          for (let px = px0; px <= px1; px++) {
            const idx = (py * size.x + px) * 4;
            data[idx] = Math.min(255, data[idx] + r * alphaFrac);
            data[idx + 1] = Math.min(255, data[idx + 1] + g * alphaFrac);
            data[idx + 2] = Math.min(255, data[idx + 2] + b * alphaFrac);
            data[idx + 3] = Math.min(255, data[idx + 3] + alpha);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
