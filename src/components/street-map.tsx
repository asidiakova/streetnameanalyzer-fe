"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const SLOVAKIA_CENTER: [number, number] = [19.15, 48.74];
const DEFAULT_ZOOM = 8;

const STREETS_SOURCE_ID = "streets";
const STREETS_LAYER_ID = "streets-layer";
const STREETS_HIGHLIGHT_LAYER_ID = "streets-highlight";

const TILES_URL = process.env.NEXT_PUBLIC_STREETS_TILES_URL;
const SOURCE_LAYER =
  process.env.NEXT_PUBLIC_STREETS_SOURCE_LAYER ?? "streets";

const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://demotiles.maplibre.org/style.json";

const HIGHLIGHT_COLOR = "rgba(230,57,70,0.55)";
const HIGHLIGHT_WIDTH = 4;
const DEFAULT_STREET_COLOR = "rgba(100, 100, 100, 0.1)";
const DEFAULT_STREET_WIDTH = 2;

const EMPTY_NAME_FILTER: maplibregl.FilterSpecification = ["in", "name", ""];
const FOCUS_PADDING = 80;

// ~100 m at Slovakia's latitude; used to cluster nearby segments into
// navigable "locations" (one street may span multiple locations).
const CLUSTER_MARGIN_DEG = 0.0009;

type ClustersIndex = Map<string, maplibregl.LngLatBounds[]>;

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch]);
}

function coordsFromGeometry(geom: GeoJSON.Geometry | null): number[][] {
  if (!geom) return [];
  if (geom.type === "Point") return [geom.coordinates];
  if (geom.type === "LineString") return geom.coordinates;
  if (geom.type === "MultiLineString") return geom.coordinates.flat();
  if (geom.type === "Polygon") return geom.coordinates.flat();
  if (geom.type === "MultiPolygon") return geom.coordinates.flat(2);
  return [];
}

function boundsNear(
  a: maplibregl.LngLatBounds,
  b: maplibregl.LngLatBounds,
  margin: number
): boolean {
  return !(
    a.getEast() + margin < b.getWest() ||
    b.getEast() + margin < a.getWest() ||
    a.getNorth() + margin < b.getSouth() ||
    b.getNorth() + margin < a.getSouth()
  );
}

function mergeOverlappingBounds(
  input: maplibregl.LngLatBounds[],
  margin: number
): maplibregl.LngLatBounds[] {
  if (input.length <= 1) return [...input];

  const parent = input.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  for (let i = 0; i < input.length; i++) {
    for (let j = i + 1; j < input.length; j++) {
      if (boundsNear(input[i], input[j], margin)) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groups = new Map<number, maplibregl.LngLatBounds>();
  for (let i = 0; i < input.length; i++) {
    const root = find(i);
    const existing = groups.get(root);
    if (existing) {
      existing.extend(input[i].getSouthWest());
      existing.extend(input[i].getNorthEast());
    } else {
      groups.set(
        root,
        new maplibregl.LngLatBounds(
          input[i].getSouthWest(),
          input[i].getNorthEast()
        )
      );
    }
  }

  return Array.from(groups.values());
}

function buildClustersIndex(
  map: maplibregl.Map,
  sourceId: string,
  sourceLayer: string
): ClustersIndex {
  const features = map.querySourceFeatures(sourceId, {
    sourceLayer,
    filter: ["has", "name"],
  });

  const byName = new Map<string, maplibregl.LngLatBounds[]>();
  for (const f of features) {
    const name = f.properties?.name as string;
    if (!name) continue;
    const coords = coordsFromGeometry(f.geometry);
    if (coords.length === 0) continue;

    const fb = new maplibregl.LngLatBounds(
      coords[0] as [number, number],
      coords[0] as [number, number]
    );
    for (let i = 1; i < coords.length; i++) {
      fb.extend(coords[i] as [number, number]);
    }

    const arr = byName.get(name);
    if (arr) arr.push(fb);
    else byName.set(name, [fb]);
  }

  const index: ClustersIndex = new Map();
  for (const [name, bounds] of byName) {
    index.set(name, mergeOverlappingBounds(bounds, CLUSTER_MARGIN_DEG));
  }
  return index;
}

function clustersForVariants(
  index: ClustersIndex,
  variants: string[]
): maplibregl.LngLatBounds[] {
  const all: maplibregl.LngLatBounds[] = [];
  for (const v of variants) {
    const perName = index.get(v);
    if (perName) all.push(...perName);
  }
  return mergeOverlappingBounds(all, CLUSTER_MARGIN_DEG);
}

export type StreetMapProps = {
  selectedVariants?: string[] | null;
  focusClusterIndex?: number;
  focusTrigger?: number;
  onClusterCountChangeAction?: (count: number) => void;
  className?: string;
};

export function StreetMap({
  selectedVariants = null,
  focusClusterIndex,
  focusTrigger,
  onClusterCountChangeAction,
  className = "",
}: StreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const indexRef = useRef<ClustersIndex | null>(null);
  const clustersRef = useRef<maplibregl.LngLatBounds[]>([]);
  const [indexReady, setIndexReady] = useState(false);

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

        map.once("idle", () => {
          indexRef.current = buildClustersIndex(
            map,
            STREETS_SOURCE_ID,
            SOURCE_LAYER
          );
          setIndexReady(true);
        });
      }
    });

    map.on("click", handleFeatureClick);

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current?.remove();
      indexRef.current = null;
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

  useEffect(() => {
    if (!indexReady || !indexRef.current || !selectedVariants?.length) {
      clustersRef.current = [];
      onClusterCountChangeAction?.(0);
      return;
    }

    clustersRef.current = clustersForVariants(
      indexRef.current,
      selectedVariants
    );
    onClusterCountChangeAction?.(clustersRef.current.length);
  }, [selectedVariants, indexReady, onClusterCountChangeAction]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusClusterIndex == null || focusClusterIndex < 0) return;
    const cluster = clustersRef.current[focusClusterIndex];
    if (cluster)
      map.fitBounds(cluster, { padding: FOCUS_PADDING, maxZoom: 16 });
  }, [focusTrigger, focusClusterIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-100 ${className}`}
    />
  );
}
