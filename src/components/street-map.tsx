"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const SLOVAKIA_CENTER: [number, number] = [19.15, 48.74];
const DEFAULT_ZOOM = 8;

const STREETS_SOURCE_ID = "streets";
const STREETS_LAYER_ID = "streets-layer";
const STREETS_HIGHLIGHT_LAYER_ID = "streets-highlight";

const TILES_URL = process.env.NEXT_PUBLIC_STREETS_TILES_URL;
const SOURCE_LAYER =
  process.env.NEXT_PUBLIC_STREETS_SOURCE_LAYER ?? "public.planet_osm_line";

const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://demotiles.maplibre.org/style.json";

const HIGHLIGHT_COLOR = "rgba(230,57,70,0.55)";
const HIGHLIGHT_WIDTH = 4;
const DEFAULT_STREET_COLOR = "rgba(100, 100, 100, 0.1)";
const DEFAULT_STREET_WIDTH = 2;

const EMPTY_NAME_FILTER: maplibregl.FilterSpecification = ["in", "name", ""];

export type StreetMapProps = {
  selectedVariants?: string[] | null;
  className?: string;
};

export function StreetMap({
  selectedVariants = null,
  className = "",
}: StreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const handleFeatureClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [STREETS_LAYER_ID, STREETS_HIGHLIGHT_LAYER_ID],
      });
      if (features.length === 0) {
        popupRef.current?.remove();
        return;
      }

      const feature = features[0];
      const name = (feature.properties?.name as string) ?? "Street";

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true })
        .setLngLat(e.lngLat)
        .setHTML(`<div class="p-1 font-medium">${escapeHtml(name)}</div>`)
        .addTo(map);
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE,
      center: SLOVAKIA_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    map.on("load", () => {
      if (TILES_URL) {
        map.addSource(STREETS_SOURCE_ID, {
          type: "vector",
          tiles: [TILES_URL],
        });

        map.addLayer({
          id: STREETS_LAYER_ID,
          type: "line",
          source: STREETS_SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          filter: ["has", "name"],
          paint: {
            "line-color": DEFAULT_STREET_COLOR,
            "line-width": DEFAULT_STREET_WIDTH,
          },
        });

        map.addLayer({
          id: STREETS_HIGHLIGHT_LAYER_ID,
          type: "line",
          source: STREETS_SOURCE_ID,
          "source-layer": SOURCE_LAYER,
          filter: EMPTY_NAME_FILTER,
          paint: {
            "line-color": HIGHLIGHT_COLOR,
            "line-width": HIGHLIGHT_WIDTH,
          },
        });
      }
    });

    map.on("click", handleFeatureClick);

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current?.remove();
    };
  }, [handleFeatureClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(STREETS_HIGHLIGHT_LAYER_ID)) return;

    const filter: maplibregl.FilterSpecification =
      (selectedVariants?.length ?? 0) > 0
        ? ["in", "name", ...(selectedVariants ?? [])]
        : EMPTY_NAME_FILTER;

    map.setFilter(STREETS_HIGHLIGHT_LAYER_ID, filter);
  }, [selectedVariants]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[400px] ${className}`}
    />
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
