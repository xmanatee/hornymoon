import L from "leaflet";

/**
 * Initialize the Leaflet map with a dark-themed tile layer.
 * CartoDB Dark Matter provides a clean, astronomy-friendly background.
 */
export function createMap(containerId: string): L.Map {
  const map = L.map(containerId, {
    center: [20, 0],
    zoom: 2,
    minZoom: 1,
    maxZoom: 10,
    worldCopyJump: true,
    zoomControl: true,
  });

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
        '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);

  return map;
}
