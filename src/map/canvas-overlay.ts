import L from "leaflet";
import type { GridResult } from "../types";

/**
 * Custom Leaflet layer that renders crescent zones on a canvas overlay.
 * Uses direct pixel manipulation via ImageData for maximum performance.
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

    const pane = map.getPane("overlayPane")!;
    pane.appendChild(this._canvas);

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

  /** Update the grid data and trigger a redraw */
  setGridResult(result: GridResult): void {
    this._gridResult = result;
    this._redraw();
  }

  private _resize(): void {
    const map = this._map;
    if (!map || !this._canvas) return;

    const size = map.getSize();
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

    // Position canvas to match the map's origin
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    const ctx = this._ctx;
    ctx.clearRect(0, 0, size.x, size.y);

    const grid = this._gridResult;
    const imageData = ctx.createImageData(size.x, size.y);
    const data = imageData.data;

    // For each grid cell, paint the corresponding pixels
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.cells[row * grid.width + col];
        if (cell.type === "invisible" || cell.type === "side") continue;

        const lat = grid.south + (grid.height - 1 - row) * grid.resolution;
        const lon = grid.west + col * grid.resolution;

        // Map geographic bounds of this cell to pixel coordinates
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

        // Color based on type
        // Upper crescent (bright limb up): warm amber
        // Lower crescent (bright limb down, "wet moon"): cool blue
        let r: number, g: number, b: number;
        if (cell.type === "upper") {
          r = 255;
          g = 180;
          b = 50;
        } else {
          r = 80;
          g = 160;
          b = 255;
        }

        // Alpha based on how "horizontal" the crescent is
        // verticality = |sin(chi)|: 0 = perfectly horizontal, 1 = vertical
        // We want high alpha when verticality is low
        const strength = 1 - cell.verticality / Math.sin(30 * (Math.PI / 180));
        const moonAltFactor = Math.min(1, cell.moonAlt / (10 * (Math.PI / 180)));
        const alpha = Math.floor(
          Math.max(0, Math.min(255, strength * moonAltFactor * 180))
        );

        if (alpha <= 0) continue;

        for (let py = py0; py <= py1; py++) {
          for (let px = px0; px <= px1; px++) {
            const idx = (py * size.x + px) * 4;
            // Additive blending for overlapping cells
            data[idx] = Math.min(255, data[idx] + r * (alpha / 255));
            data[idx + 1] = Math.min(255, data[idx + 1] + g * (alpha / 255));
            data[idx + 2] = Math.min(255, data[idx + 2] + b * (alpha / 255));
            data[idx + 3] = Math.min(255, data[idx + 3] + alpha);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
