'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, X } from 'lucide-react';
import { BASEMAP_STYLE, UTTARAKHAND_BOUNDS } from '@/features/map/constants';
import type { TourismGuide } from '../pilgrim-schemas';

type Place = TourismGuide['destinations'][number];

const directionsUrl = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;

export function TourismMap({ guide }: { guide: TourismGuide }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const [mode, setMode] = useState<'pilgrimage' | 'attractions'>('pilgrimage');
  const [selected, setSelected] = useState<Place | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;
    let disposed = false;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE as unknown as StyleSpecification,
        bounds: UTTARAKHAND_BOUNDS,
        fitBoundsOptions: { padding: 36 },
        maxBounds: [
          [76.2, 27.8],
          [81.4, 31.8],
        ],
        maxZoom: 14,
        attributionControl: false,
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;
      map.once('load', () => {
        if (!disposed) setMapReady(true);
      });
    } catch {
      setFailed(true);
    }
    return () => {
      disposed = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    setSelected(null);

    const places: Place[] =
      mode === 'pilgrimage'
        ? [
            ...guide.charDham.map((place) => ({
              ...place,
              category: 'Char Dham',
              summary: place.access,
            })),
            ...guide.pilgrimages,
          ]
        : guide.destinations;

    const markers: maplibregl.Marker[] = [];
    for (const place of places) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show ${place.name}`);
      button.className =
        'group relative h-12 w-12 overflow-hidden rounded-full border-[3px] border-white bg-sky-700 text-xs font-bold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2';
      // MapLibre positions the marker with an inline transform. Keep sizing explicit and
      // never transform this outer element, otherwise hover styles can move the marker.
      button.style.width = '48px';
      button.style.height = '48px';
      button.textContent = place.name
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('');
      const image = document.createElement('img');
      image.src = place.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.className =
        'absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105';
      image.addEventListener('error', () => image.remove(), { once: true });
      button.appendChild(image);
      button.addEventListener('click', () => {
        setSelected(place);
        map.easeTo({
          center: [place.lng, place.lat],
          zoom: Math.max(map.getZoom(), 8),
          duration: 500,
        });
      });
      markers.push(
        new maplibregl.Marker({ element: button, anchor: 'bottom' })
          .setLngLat([place.lng, place.lat])
          .addTo(map)
      );
    }
    markerRefs.current = markers;

    map.fitBounds(UTTARAKHAND_BOUNDS, { padding: 36, duration: 500 });
    return () => {
      markers.forEach((marker) => marker.remove());
      if (markerRefs.current === markers) markerRefs.current = [];
    };
  }, [guide, mapReady, mode]);

  if (failed) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        The interactive map is unavailable in this browser. Destination cards and directions remain
        available below.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Choose a map</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select an image marker for details and directions.
          </p>
        </div>
        <div className="flex rounded-lg bg-muted p-1" aria-label="Tourism map category">
          <button
            type="button"
            onClick={() => setMode('pilgrimage')}
            aria-pressed={mode === 'pilgrimage'}
            className={`min-h-10 rounded-md px-3 text-xs font-semibold transition ${mode === 'pilgrimage' ? 'bg-surface text-text-light shadow-sm' : 'text-muted-foreground hover:text-text-light'}`}
          >
            Pilgrimage places
          </button>
          <button
            type="button"
            onClick={() => setMode('attractions')}
            aria-pressed={mode === 'attractions'}
            className={`min-h-10 rounded-md px-3 text-xs font-semibold transition ${mode === 'attractions' ? 'bg-surface text-text-light shadow-sm' : 'text-muted-foreground hover:text-text-light'}`}
          >
            Other attractions
          </button>
        </div>
      </div>
      <div className="relative h-[32rem] sm:h-[38rem]">
        <div ref={containerRef} className="h-full w-full" />
        {!mapReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm text-muted-foreground">
            {visible ? 'Loading map and place markers…' : 'Map loads as you approach this section…'}
          </div>
        ) : null}
        {selected ? (
          <article className="absolute inset-x-3 bottom-3 z-10 overflow-hidden rounded-xl border border-border bg-surface/95 shadow-xl backdrop-blur sm:inset-x-auto sm:left-3 sm:w-80">
            <div className="flex gap-3 p-3">
              {/* Marker imagery is delivered by the official tourism host and varies at runtime. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.imageUrl} alt="" className="h-20 w-24 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                      {selected.category}
                    </p>
                    <h4 className="mt-1 font-semibold">{selected.name}</h4>
                  </div>
                  <button
                    type="button"
                    aria-label="Close place details"
                    onClick={() => setSelected(null)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{selected.district}</p>
              </div>
            </div>
            <div className="flex border-t border-border">
              <a
                href={directionsUrl(selected.mapDestination)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 flex-1 items-center justify-center gap-2 text-sm font-semibold text-accent hover:bg-surface-hover"
              >
                <Navigation className="size-4" />
                Directions
              </a>
              <a
                href={selected.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 flex-1 items-center justify-center border-l border-border text-sm font-semibold hover:bg-surface-hover"
              >
                Official page
              </a>
            </div>
          </article>
        ) : null}
        <p className="absolute bottom-0 right-0 bg-surface/85 px-2 py-1 text-[10px] text-muted-foreground">
          © OpenStreetMap contributors · photos: Uttarakhand Tourism, Unsplash
        </p>
      </div>
    </div>
  );
}
