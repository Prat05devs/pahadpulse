import * as maplibregl from 'maplibre-gl';

/*
 * MapLibre 6 runs its tile parsing in a Web Worker and, inside a bundler, cannot find that
 * worker by itself: without this call every map stays blank with "Worker failed to load".
 * webpack turns this `new URL(…, import.meta.url)` into a same-origin URL for the copied
 * worker file (MapLibre's documented setup for webpack and Next.js). Map components import
 * MapLibre from here so the URL is always set before the first map is created.
 */
maplibregl.setWorkerUrl(
  new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString()
);

export { maplibregl };
