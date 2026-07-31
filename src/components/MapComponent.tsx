import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import { GisFeature, LayerConfig, BaseMap } from "../types";
import { Maximize2, Move, Search, X, MapPin } from "lucide-react";

interface MapComponentProps {
  features: GisFeature[];
  layers: LayerConfig[];
  activeBaseMap: string;
  baseMaps: BaseMap[];
  selectedFeature: GisFeature | null;
  onFeatureSelect: (feature: GisFeature | null) => void;
  hoveredFeature: GisFeature | null;
  setHoveredFeature: (feature: GisFeature | null) => void;
  isTableCollapsed: boolean;
  setIsTableCollapsed: (collapsed: boolean) => void;
  isSidebarCollapsed: boolean;
  measureMode: "none" | "distance" | "area";
  measurePoints: { lat: number; lng: number }[];
  setMeasurePoints: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }[]>>;
  resetCounter: number;
}

export default function MapComponent({
  features,
  layers,
  activeBaseMap,
  baseMaps,
  selectedFeature,
  onFeatureSelect,
  hoveredFeature,
  setHoveredFeature,
  isTableCollapsed,
  setIsTableCollapsed,
  isSidebarCollapsed,
  measureMode,
  measurePoints,
  setMeasurePoints,
  resetCounter
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const geojsonLayersRef = useRef<Record<string, L.GeoJSON>>({});
  const selectionHighlightRef = useRef<L.Layer | null>(null);
  const measureGroupRef = useRef<L.FeatureGroup | null>(null);
  const hasInitiallyFitBoundsRef = useRef<boolean>(false);

  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(9);

  // Search feature state
  const [mapSearchQuery, setMapSearchQuery] = useState<string>("");
  const [showMapSuggestions, setShowMapSuggestions] = useState<boolean>(false);

  // Compute suggestions from loaded GIS features
  const filteredSearchFeatures = useMemo(() => {
    if (!mapSearchQuery.trim()) return [];
    const query = mapSearchQuery.toLowerCase();
    const matches: GisFeature[] = [];
    const seenNames = new Set<string>();

    for (const feat of features) {
      const name = feat.properties.name || feat.properties.Name || feat.properties.village_name || feat.properties.Village_Name || "";
      if (name && typeof name === "string") {
        const lowerName = name.toLowerCase();
        if (lowerName.includes(query) && !seenNames.has(lowerName)) {
          seenNames.add(lowerName);
          matches.push(feat);
          if (matches.length >= 8) break;
        }
      }
    }
    return matches;
  }, [features, mapSearchQuery]);

  // 1. Initialize Map Instance (Only Once)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Udham Singh Nagar, Uttarakhand, India
    const map = L.map(mapContainerRef.current, {
      center: [29.01, 79.42],
      zoom: 9.5,
      zoomControl: false, // Custom position
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

    mapInstanceRef.current = map;
    setZoomLevel(map.getZoom());

    // Event listener for mousemove (show geographic coordinates)
    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      setMouseCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    });

    map.on("zoomend", () => {
      setZoomLevel(map.getZoom());
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update Basemap Tile Layer dynamically when activeBaseMap changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const currentBase = baseMaps.find((b) => b.id === activeBaseMap);
    if (currentBase) {
      const tile = L.tileLayer(currentBase.url, {
        attribution: currentBase.attribution,
        maxZoom: 19,
      });
      tile.addTo(map);
      tileLayerRef.current = tile;
    }
  }, [activeBaseMap, baseMaps]);

  // Reset fit-bounds lock when features or resetCounter changes
  useEffect(() => {
    hasInitiallyFitBoundsRef.current = false;
  }, [features, resetCounter]);

  // 3. Populate and styling GIS layers from database
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous vector layers
    Object.keys(geojsonLayersRef.current).forEach((layerId) => {
      map.removeLayer(geojsonLayersRef.current[layerId]);
    });
    geojsonLayersRef.current = {};

    // For each layer configuration
    layers.forEach((layerConf) => {
      if (!layerConf.visible) return;

      // Filter features matching this layer (case-insensitive)
      const layerFeatures = features.filter(
        (f) =>
          [f.properties.layer, f.properties.Layer, f.properties.LAYER].some(
            val => val && val.toLowerCase() === layerConf.name.toLowerCase()
          )
      );

      if (layerFeatures.length === 0) return;

      // Group these into a single Leaflet GeoJSON layer
      const geoJsonData: any = {
        type: "FeatureCollection",
        features: layerFeatures,
      };

      const geoJsonLayer = L.geoJSON(geoJsonData, {
        interactive: measureMode === "none",
        style: (feature: any) => {
          const geomType = feature?.geometry?.type?.toLowerCase() || "";
          const isPolygon = layerConf.type === "polygon" || geomType.includes("polygon");
          const isLine = layerConf.type === "linestring" || geomType.includes("line");

          if (isPolygon) {
            return {
              color: layerConf.color,
              fillColor: layerConf.fillColor || layerConf.color,
              weight: layerConf.weight,
              opacity: layerConf.opacity,
              fillOpacity: layerConf.fillOpacity ? (layerConf.fillOpacity * layerConf.opacity) : 0.15,
              fill: true,
            };
          } else if (isLine) {
            return {
              color: layerConf.color,
              fillColor: "transparent",
              weight: layerConf.weight,
              opacity: layerConf.opacity,
              fillOpacity: 0,
              fill: false,
            };
          } else {
            return {
              color: layerConf.color,
              fillColor: layerConf.fillColor || layerConf.color,
              weight: layerConf.weight,
              opacity: layerConf.opacity,
              fillOpacity: layerConf.fillOpacity ? (layerConf.fillOpacity * layerConf.opacity) : 0.4,
              fill: true,
            };
          }
        },
        pointToLayer: (feature: any, latlng: L.LatLng) => {
          return L.circleMarker(latlng, {
            radius: layerConf.name.toLowerCase().includes("village") ? 4.5 : 6,
            color: "#ffffff",
            fillColor: layerConf.color,
            weight: 1.2,
            opacity: 1,
            fillOpacity: layerConf.opacity,
          });
        },
        onEachFeature: (feature: any, layer: L.Layer) => {
          // Binding standard tooltips / popups
          const name = feature.properties.name || feature.properties.Name || feature.properties.village_name || feature.properties.Village_Name || "Unlabeled Feature";
          
          layer.bindTooltip(`
            <div class="px-2 py-1 font-sans text-xs">
              <strong class="text-indigo-900 block">${name}</strong>
              <span class="text-[10px] text-slate-500 font-mono">${layerConf.name}</span>
            </div>
          `, { sticky: true, opacity: 0.9 });

          // Mouse Hover styling
          layer.on({
            mouseover: () => {
              setHoveredFeature(feature);
              if (layer instanceof L.Path) {
                const geomType = feature?.geometry?.type?.toLowerCase() || "";
                const isPoly = layerConf.type === "polygon" || geomType.includes("polygon");

                if (isPoly) {
                  layer.setStyle({
                    weight: layerConf.weight + 2,
                    color: "#f59e0b", // Golden boundary accent
                    fillColor: layerConf.fillColor || layerConf.color || "#f59e0b",
                    fillOpacity: 0.45, // Highlight whole inside polygon area
                    fill: true,
                  });
                  if ((layer as any).bringToFront) {
                    (layer as any).bringToFront();
                  }
                } else if (layerConf.type === "linestring" || geomType.includes("line")) {
                  layer.setStyle({
                    weight: layerConf.weight + 2.5,
                    color: "#f59e0b",
                  });
                } else {
                  layer.setStyle({
                    weight: layerConf.weight + 1.5,
                    color: "#eab308",
                    fillOpacity: Math.min((layerConf.fillOpacity || 0.4) + 0.3, 0.9),
                  });
                }
              }
            },
            mouseout: () => {
              setHoveredFeature(null);
              if (geojsonLayersRef.current[layerConf.id]) {
                geojsonLayersRef.current[layerConf.id].resetStyle(layer);
              }
            },
            click: (e: L.LeafletMouseEvent) => {
              onFeatureSelect(feature);
              setIsTableCollapsed(false);
              if (e.originalEvent && e.originalEvent.target && typeof (e.originalEvent.target as any).blur === "function") {
                (e.originalEvent.target as any).blur();
              }
              L.DomEvent.stopPropagation(e);
            },
          });
        },
      });

      geoJsonLayer.addTo(map);
      geojsonLayersRef.current[layerConf.id] = geoJsonLayer;
    });

    // Make map bounds responsive to features loaded (only on initial search or reset to avoid jarring navigation)
    if (features.length > 0 && !hasInitiallyFitBoundsRef.current) {
      try {
        const dummyGroup = new L.FeatureGroup(Object.values(geojsonLayersRef.current) as L.Layer[]);
        const bounds = dummyGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
          hasInitiallyFitBoundsRef.current = true;
        }
      } catch (err) {
        console.warn("Could not calculate bounds:", err);
      }
    }
  }, [features, layers, onFeatureSelect, setHoveredFeature, measureMode]);

  // 4. Handle Programmatic Highlighting when selectedFeature changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectionHighlightRef.current) {
      map.removeLayer(selectionHighlightRef.current);
      selectionHighlightRef.current = null;
    }

    if (!selectedFeature) {
      setMapSearchQuery("");
      return;
    }

    // Update spatial search input to match active selected element
    const label = selectedFeature.properties.name || selectedFeature.properties.Name || selectedFeature.properties.village_name || selectedFeature.properties.Village_Name || "";
    setMapSearchQuery(label);

    try {
      // Find the geometry and create a high contrast highlight above it
      const highlightLayer = L.geoJSON(selectedFeature as any, {
        interactive: false,
        style: {
          color: "#dc2626", // Deep Red
          fillColor: "#fecaca",
          weight: 4,
          opacity: 1,
          fillOpacity: 0.5,
        },
        pointToLayer: (feature: any, latlng: L.LatLng) => {
          return L.circle(latlng, {
            radius: 80, // larger indicator circle
            color: "#dc2626",
            fillColor: "#ef4444",
            weight: 3,
            fillOpacity: 0.4,
          });
        },
      });

      highlightLayer.addTo(map);
      selectionHighlightRef.current = highlightLayer;

      // Pan to selected item
      const bounds = highlightLayer.getBounds();
      if (bounds.isValid()) {
        const center = bounds.getCenter();
        if (selectedFeature.geometry.type === "Point") {
          map.setView(center, Math.max(map.getZoom(), 12), { animate: true });
        } else {
          map.fitBounds(bounds, { padding: [100, 100], maxZoom: 13, animate: true });
        }
      }
        } catch (err) {
      console.warn("Failed to highlight feature:", err);
    }
  }, [selectedFeature]);

  // 4.1 Render active measurement polylines/polygons/points
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Create the measurement group if it doesn't exist
    if (!measureGroupRef.current) {
      measureGroupRef.current = L.featureGroup().addTo(map);
    } else {
      measureGroupRef.current.clearLayers();
    }

    const group = measureGroupRef.current;
    if (measureMode === "none") return;

    const latlngs = measurePoints.map((p) => L.latLng(p.lat, p.lng));

    // 1. Draw connecting line segments/polygons
    if (latlngs.length > 0) {
      if (measureMode === "distance") {
        // Draw polyline
        const polylinePoints = [...latlngs];
        if (mouseCoords) {
          polylinePoints.push(L.latLng(mouseCoords.lat, mouseCoords.lng));
        }
        
        if (polylinePoints.length >= 2) {
          L.polyline(polylinePoints, {
            color: "#e11d48", // rose-600
            dashArray: "6, 8",
            weight: 3.5,
            opacity: 0.9,
          }).addTo(group);
        }
      } else if (measureMode === "area") {
        // Draw polygon
        const polygonPoints = [...latlngs];
        if (mouseCoords) {
          polygonPoints.push(L.latLng(mouseCoords.lat, mouseCoords.lng));
        }
        
        if (polygonPoints.length >= 2) {
          L.polygon(polygonPoints, {
            color: "#059669", // emerald-600
            fillColor: "#10b981", // emerald-500
            fillOpacity: 0.25,
            dashArray: "6, 8",
            weight: 3.5,
            opacity: 0.9,
          }).addTo(group);
        }
      }

      // 2. Add markers at each vertex with custom numbered tooltips
      latlngs.forEach((latlng, idx) => {
        const marker = L.circleMarker(latlng, {
          radius: 7,
          color: "#ffffff",
          fillColor: measureMode === "distance" ? "#e11d48" : "#059669",
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
        }).addTo(group);

        // Bind informative tooltips/labels
        let tooltipText = "";
        if (measureMode === "distance") {
          if (idx === 0) {
            tooltipText = "<b>Start</b>";
          } else {
            // Find haversine distance up to this point
            let subDistance = 0;
            for (let i = 0; i < idx; i++) {
              subDistance += latlngs[i].distanceTo(latlngs[i + 1]);
            }
            const displayDist = subDistance < 1000 
              ? `${subDistance.toFixed(1)} m`
              : `${(subDistance / 1000).toFixed(2)} km`;
            
            tooltipText = `<b>Pt ${idx + 1}:</b> +${displayDist}`;
          }
        } else {
          tooltipText = `<b>Vertex ${idx + 1}</b>`;
        }

        marker.bindTooltip(tooltipText, {
          permanent: true,
          direction: "top",
          className: "bg-white text-slate-800 font-sans text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 shadow-sm select-none",
          offset: [0, -5],
        });
      });

      // 3. For Area, draw a dynamic center metric tooltip if we have at least 3 points
      if (measureMode === "area" && latlngs.length >= 3) {
        // Flat planar centroid calculation
        let totalLat = 0;
        let totalLng = 0;
        latlngs.forEach((ll) => {
          totalLat += ll.lat;
          totalLng += ll.lng;
        });
        const centroid = L.latLng(totalLat / latlngs.length, totalLng / latlngs.length);

        // Compute area using the formula
        let avgLat = 0;
        latlngs.forEach(ll => avgLat += ll.lat);
        const refLat = (avgLat / latlngs.length) * Math.PI / 180;
        
        const R = 6371000;
        const projected = latlngs.map(ll => {
          const x = ll.lng * Math.PI / 180 * R * Math.cos(refLat);
          const y = ll.lat * Math.PI / 180 * R;
          return { x, y };
        });
        
        // Shoelace
        let area = 0;
        const n = projected.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += projected[i].x * projected[j].y;
          area -= projected[j].x * projected[i].y;
        }
        const areaSqMeters = Math.abs(area) / 2;
        const displayArea = areaSqMeters < 100000
          ? `${areaSqMeters.toFixed(1)} m²`
          : `${(areaSqMeters / 1000000).toFixed(2)} km²`;

        // Render central area overlay
        L.marker(centroid, {
          icon: L.divIcon({
            className: "bg-transparent border-0 flex items-center justify-center pointer-events-none",
            html: `
              <div class="bg-emerald-950/90 text-emerald-100 font-sans text-[10px] font-bold py-1 px-2 rounded border border-emerald-500 shadow-md whitespace-nowrap min-w-0 select-none">
                📐 Area: ${displayArea}
              </div>
            `,
            iconSize: [120, 24],
          }),
        }).addTo(group);
      }
    }
  }, [measurePoints, measureMode, mouseCoords]);

  // 4.2 Listener for map clicks (measurement mode or clicking outside features)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (measureMode !== "none") {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        setMeasurePoints((prev) => [...prev, newPoint]);
      } else {
        // Deactivate hover effect & clear active feature selection when clicking outside polygons
        setHoveredFeature(null);
        onFeatureSelect(null);
        Object.values(geojsonLayersRef.current).forEach((gLayer: any) => {
          if (gLayer && typeof gLayer.resetStyle === "function") {
            gLayer.resetStyle();
          }
        });
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [measureMode, setMeasurePoints, setHoveredFeature, onFeatureSelect]);

  // 5. Invalidate map layout size dynamically on container state toggles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    // Invalidate immediately
    map.invalidateSize();
    
    // Invalidate size once transitions wrap up
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 320);

    return () => clearTimeout(timer);
  }, [isTableCollapsed, isSidebarCollapsed]);

  // Map Controls: Pan to Udham Singh Nagar Bounds
  const handleZoomToDistrict = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const activeGeoJsons = Object.values(geojsonLayersRef.current);
      if (activeGeoJsons.length > 0) {
        const group = new L.FeatureGroup(activeGeoJsons as L.Layer[]);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], animate: true });
          return;
        }
      }
    } catch (e) {}

    // Fallback static center
    map.setView([29.01, 79.42], 10, { animate: true });
  };

  return (
    <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col h-full min-w-0">
      {/* Map Element */}
      <div id="gis-map" ref={mapContainerRef} className={`flex-1 w-full h-full z-0 pointer-events-auto ${measureMode !== "none" ? "cursor-crosshair" : ""}`} />

      {/* Floating Coordinate Status Bar */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-sm px-3 py-1.5 rounded-md flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>X (Lng): <strong className="text-slate-800 dark:text-slate-100">{mouseCoords?.lng ?? "---"}</strong></span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>Y (Lat): <strong className="text-slate-800 dark:text-slate-100">{mouseCoords?.lat ?? "---"}</strong></span>
        </div>
        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Zoom: <span className="text-indigo-600 dark:text-indigo-400">{zoomLevel}</span>
        </div>
      </div>

      {/* Map Action Overlay Button */}
      <div className="absolute top-4 right-14 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleZoomToDistrict}
          title="Zoom to Full District Extent"
          className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-sm font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-150"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fit District Extent</span>
        </button>
      </div>

      {/* Floating Spatial Search Bar */}
      <div className="absolute top-4 left-4 z-[1001] w-80 font-sans">
        <div className="relative flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg shadow-md transition-shadow duration-200 focus-within:shadow-lg focus-within:border-indigo-400">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            className="w-full text-xs pl-9 pr-8 py-2.5 bg-transparent rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 font-semibold focus:outline-none"
            placeholder="Search villages / boundaries..."
            value={mapSearchQuery}
            onChange={(e) => {
              setMapSearchQuery(e.target.value);
              setShowMapSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (mapSearchQuery.length > 0) {
                setShowMapSuggestions(true);
              }
            }}
          />
          {mapSearchQuery ? (
            <button
              onClick={() => {
                setMapSearchQuery("");
                setShowMapSuggestions(false);
              }}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-3 text-[9px] font-bold text-slate-300 dark:text-slate-600 pointer-events-none tracking-widest font-mono select-none">GIS</span>
          )}
        </div>

        {/* Suggestion Dropdown Panel */}
        {showMapSuggestions && filteredSearchFeatures.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto z-[1002] divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSearchFeatures.map((feat) => {
              const name = feat.properties.name || feat.properties.Name || feat.properties.village_name || feat.properties.Village_Name || "Unlabeled";
              const layerName = feat.properties.layer || feat.properties.Layer || feat.properties.LAYER || "Boundary";
              
              return (
                <button
                  key={feat.id}
                  onClick={() => {
                    setMapSearchQuery(name);
                    setShowMapSuggestions(false);
                    onFeatureSelect(feat);
                    setIsTableCollapsed(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/70 active:bg-indigo-100 dark:active:bg-indigo-900 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center justify-between gap-1 border-none bg-transparent cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                    <span className="truncate text-slate-800 dark:text-slate-100 font-semibold">{name}</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded font-mono shrink-0">
                    {layerName.replace("USN-", "").replace("-Boundary", "")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
