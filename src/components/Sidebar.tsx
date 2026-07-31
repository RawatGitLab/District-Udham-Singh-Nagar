import React, { useState, useMemo } from "react";
import { Layers, Globe, Sliders, CheckSquare, Square, Check, RotateCcw, Database, ChevronDown, ChevronRight, Minimize2, Maximize2, Ruler, Trash2, Undo, Building2, Droplet, GraduationCap, Heart, Shield, Waves, Trees } from "lucide-react";
import { LayerConfig, BaseMap } from "../types";

const CATEGORY_METADATA: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  "ADMINISTRATIVE LAYER": { icon: Layers, color: "text-blue-500" },
  "URBAN DEVELOPMENT (CANTONMENT / TOWNS)": { icon: Building2, color: "text-purple-500" },
  "IRRIGATION": { icon: Droplet, color: "text-sky-500" },
  "EDUCATION LAYER": { icon: GraduationCap, color: "text-violet-500" },
  "HEALTH LAYER (HOSPITALS)": { icon: Heart, color: "text-rose-500" },
  "POLICE LAYER": { icon: Shield, color: "text-blue-500" },
  "RIVER LAYER": { icon: Waves, color: "text-teal-500" },
  "LAND-USE LAYER": { icon: Trees, color: "text-emerald-500" },
  "OTHER LAYERS": { icon: Sliders, color: "text-slate-500" }
};

interface SidebarProps {
  layers: LayerConfig[];
  toggleLayer: (id: string) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  updateLayerColor: (id: string, color: string) => void;
  activeBaseMap: string;
  setBaseMap: (id: string) => void;
  baseMaps: BaseMap[];
  onReset: () => void;
  totalFeatures: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  
  // Measurement state passing
  measureMode: "none" | "distance" | "area";
  setMeasureMode: (mode: "none" | "distance" | "area") => void;
  measurePoints: { lat: number; lng: number }[];
  setMeasurePoints: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }[]>>;
}

export default function Sidebar({
  layers,
  toggleLayer,
  updateLayerOpacity,
  updateLayerColor,
  activeBaseMap,
  setBaseMap,
  baseMaps,
  onReset,
  totalFeatures,
  isCollapsed,
  setIsCollapsed,
  measureMode,
  setMeasureMode,
  measurePoints,
  setMeasurePoints
}: SidebarProps) {
  const [isLayersCollapsed, setIsLayersCollapsed] = useState<boolean>(true);
  const [isBaseMapCollapsed, setIsBaseMapCollapsed] = useState<boolean>(true);
  const [isMeasureCollapsed, setIsMeasureCollapsed] = useState<boolean>(true);

  // Grouped categories collapsed state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    "ADMINISTRATIVE LAYER": false,
    "URBAN DEVELOPMENT (CANTONMENT / TOWNS)": true,
    "IRRIGATION": true,
    "EDUCATION LAYER": true,
    "HEALTH LAYER (HOSPITALS)": true,
    "POLICE LAYER": true,
    "RIVER LAYER": true,
    "LAND-USE LAYER": true,
    "OTHER LAYERS": true,
  });

  // Group layers into detailed categories
  const groupedLayers = useMemo(() => {
    const groups: Record<string, LayerConfig[]> = {
      "ADMINISTRATIVE LAYER": [],
      "URBAN DEVELOPMENT (CANTONMENT / TOWNS)": [],
      "IRRIGATION": [],
      "EDUCATION LAYER": [],
      "HEALTH LAYER (HOSPITALS)": [],
      "POLICE LAYER": [],
      "RIVER LAYER": [],
      "LAND-USE LAYER": [],
      "OTHER LAYERS": []
    };

    layers.forEach(layer => {
      const lower = layer.name.toLowerCase();
      
      // Specifically route health / hospital layers first, so words like "district" in hospital names don't misclassify them as administrative
      if (
        lower.includes("hospital") ||
        lower.includes("health") ||
        lower.includes("medical") ||
        lower.includes("clinic") ||
        lower.includes("phc") ||
        lower.includes("chc") ||
        lower.includes("dispensary")
      ) {
        groups["HEALTH LAYER (HOSPITALS)"].push(layer);
      } 
      // Specifically route Land-use layers first so they don't get misclassified by "town" or other keywords
      else if (
        lower.includes("landuse") ||
        lower.includes("land-use") ||
        lower.includes("agriculture") ||
        lower.includes("forest") ||
        lower.includes("vegetation") ||
        lower.includes("barren")
      ) {
        groups["LAND-USE LAYER"].push(layer);
      }
      // Specifically route Nagar Panchayat / Nagar Palika/ Cantonment layers to Urban Development
      else if (
        lower.includes("nagar-panchayat") ||
        lower.includes("nagar_panchayat") ||
        (lower.includes("nagar") && lower.includes("panchayat")) ||
        lower.includes("cantonment") ||
        lower.includes("cantenment") ||
        lower.includes("town") ||
        lower.includes("urban") ||
        lower.includes("city") ||
        lower.includes("municipal") ||
        lower.includes("nagar") ||
        lower.includes("residential")
      ) {
        groups["URBAN DEVELOPMENT (CANTONMENT / TOWNS)"].push(layer);
      } 
      // Administrative layers (District, Tehsil, Block, Ward, Boundary)
      else if (
        lower.includes("district") ||
        lower.includes("boundary") ||
        lower.includes("tehsil") ||
        lower.includes("tahsil") ||
        lower.includes("block") ||
        lower.includes("panchayat") ||
        lower.includes("ward")
      ) {
        groups["ADMINISTRATIVE LAYER"].push(layer);
      } 
      // Irrigation layers
      else if (
        lower.includes("irrigation") ||
        lower.includes("canal") ||
        lower.includes("tubewell") ||
        lower.includes("tube well") ||
        lower.includes("dam") ||
        lower.includes("reservoir") ||
        lower.includes("water supply")
      ) {
        groups["IRRIGATION"].push(layer);
      } else if (
        lower.includes("education") ||
        lower.includes("school") ||
        lower.includes("college") ||
        lower.includes("university") ||
        lower.includes("primary_school")
      ) {
        groups["EDUCATION LAYER"].push(layer);
      } else if (
        lower.includes("police") ||
        lower.includes("chowki") ||
        lower.includes("station") ||
        lower.includes("thana")
      ) {
        groups["POLICE LAYER"].push(layer);
      } else if (
        lower.includes("river") ||
        lower.includes("stream") ||
        lower.includes("drain") ||
        lower.includes("waterbody") ||
        lower.includes("lake") ||
        lower.includes("pond")
      ) {
        groups["RIVER LAYER"].push(layer);
      } else {
        groups["OTHER LAYERS"].push(layer);
      }
    });

    return groups;
  }, [layers]);

  // Pure JS Haversine distance helper (meters)
  const getHaversineDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Cumulative distance calculator
  const totalDistanceMeters = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      total += getHaversineDistance(measurePoints[i], measurePoints[i + 1]);
    }
    return total;
  }, [measurePoints]);

  // Shoelace planar polygon area projection calculation (square meters)
  const polygonAreaSqMeters = useMemo(() => {
    if (measurePoints.length < 3) return 0;
    
    // Find centroid
    let avgLat = 0;
    let avgLng = 0;
    measurePoints.forEach(p => {
      avgLat += p.lat;
      avgLng += p.lng;
    });
    const refLat = (avgLat / measurePoints.length) * Math.PI / 180;
    
    const R = 6371000;
    const projected = measurePoints.map(p => {
      const x = p.lng * Math.PI / 180 * R * Math.cos(refLat);
      const y = p.lat * Math.PI / 180 * R;
      return { x, y };
    });
    
    let area = 0;
    const n = projected.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += projected[i].x * projected[j].y;
      area -= projected[j].x * projected[i].y;
    }
    
    return Math.abs(area) / 2;
  }, [measurePoints]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters.toFixed(1)} meters`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatArea = (sqMeters: number) => {
    if (sqMeters < 100000) return `${sqMeters.toFixed(1)} m²`;
    const hectares = sqMeters / 10000;
    const sqKm = sqMeters / 1000000;
    return `${sqKm.toFixed(3)} km² (${hectares.toFixed(1)} Ha)`;
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center pt-16 pb-4 h-full shrink-0 shadow-sm font-sans transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Open Map Controller"
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition duration-150 mt-4 mb-8 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="vertical-text text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 font-sans select-none whitespace-nowrap origin-center rotate-90 mt-16 leading-none flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          Basemaps & Layers
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col h-full shrink-0 shadow-sm font-sans transition-colors duration-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">Geo Spatial Server</h1>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">MongoDB Database</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            title="Reset Map State"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition duration-150 border border-transparent cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize Panel"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition duration-150 border border-transparent cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Layer Manager */}
        <div className="space-y-3">
          <button
            onClick={() => setIsLayersCollapsed(!isLayersCollapsed)}
            className="flex items-center justify-between pt-1 w-full text-left bg-transparent border-0 p-0 focus:outline-none group cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Layers ({layers.length})
              {isLayersCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
              )}
            </span>
            {!isLayersCollapsed && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold px-1.5 py-0.5 rounded-full">
                {totalFeatures} Loaded
              </span>
            )}
          </button>

          {!isLayersCollapsed && (
            <div className="space-y-3.5">
              {layers.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                  No layers found in database.
                </div>
              ) : (
                [
                  "ADMINISTRATIVE LAYER",
                  "URBAN DEVELOPMENT (CANTONMENT / TOWNS)",
                  "IRRIGATION",
                  "EDUCATION LAYER",
                  "HEALTH LAYER (HOSPITALS)",
                  "POLICE LAYER",
                  "RIVER LAYER",
                  "LAND-USE LAYER",
                  "OTHER LAYERS"
                ].map((category) => {
                  const catLayers = groupedLayers[category] || [];
                  if (catLayers.length === 0) return null;

                  const Meta = CATEGORY_METADATA[category] || CATEGORY_METADATA["OTHER LAYERS"];
                  const CategoryIcon = Meta.icon;
                  const iconColor = Meta.color;
                  const isCollapsed = collapsedCategories[category];

                  return (
                    <div key={category} className="space-y-2">
                      {/* Collapsible Card Button */}
                      <button
                        onClick={() =>
                          setCollapsedCategories((prev) => ({
                            ...prev,
                            [category]: !prev[category],
                          }))
                        }
                        className={`w-full flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border rounded-xl shadow-sm transition-all duration-150 group cursor-pointer focus:outline-none ${
                          !isCollapsed ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/10 bg-slate-50/10 dark:bg-slate-800/80" : "border-slate-200 dark:border-slate-700/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CategoryIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${iconColor}`} />
                          <span className={`text-[11px] font-extrabold tracking-wider uppercase truncate ${
                            !isCollapsed ? "text-indigo-900 dark:text-indigo-300 font-black" : "text-slate-700 dark:text-slate-200"
                          }`}>
                            {category} ({catLayers.length})
                          </span>
                        </div>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>

                      {/* Expanded Layer Items */}
                      {!isCollapsed && (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in slide-in-from-top-1 duration-150">
                          {catLayers.map((layer) => (
                            <div key={layer.id} className="p-3 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  {/* Interactive toggle */}
                                  <button
                                    onClick={() => toggleLayer(layer.id)}
                                    className={`p-1 rounded-md transition duration-150 ${
                                      layer.visible 
                                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80" 
                                        : "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                                    }`}
                                  >
                                    {layer.visible ? (
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Dynamic Geometry Indicator & Name */}
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    {/* Legend Badge representation */}
                                    {layer.type === "point" && (
                                      <span 
                                        className="w-3 h-3 rounded-full border border-white dark:border-slate-700 inline-block shadow-sm shrink-0" 
                                        style={{ backgroundColor: layer.color }}
                                      />
                                    )}
                                    {layer.type === "linestring" && (
                                      <span 
                                        className="w-4 h-1 rounded inline-block shrink-0" 
                                        style={{ backgroundColor: layer.color }}
                                      />
                                    )}
                                    {layer.type === "polygon" && (
                                      <span 
                                        className="w-3.5 h-3.5 rounded border shadow-inner inline-block shrink-0" 
                                        style={{ 
                                          borderColor: layer.color, 
                                          backgroundColor: layer.fillOpacity === 0 ? "transparent" : `${layer.fillColor}${Math.round(layer.fillOpacity * 255).toString(16).padStart(2, '0')}` 
                                        }}
                                      />
                                    )}
                                    {layer.type === "unknown" && (
                                      <span className="w-3 h-3 bg-slate-300 dark:bg-slate-600 border border-slate-400 dark:border-slate-500 inline-block shrink-0" />
                                    )}

                                    <span className={`text-xs font-semibold ${layer.visible ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'} truncate`} title={layer.name}>
                                      {layer.name}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Sub-controls: Color & Opacity */}
                              {layer.visible && (
                                <div className="flex items-center gap-3 pl-8 pb-1 pt-0.5">
                                  {/* Color Picker Indicator */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="color"
                                      id={`color-${layer.id}`}
                                      value={layer.color}
                                      onChange={(e) => updateLayerColor(layer.id, e.target.value)}
                                      className="w-4 h-4 rounded cursor-pointer border border-slate-300 dark:border-slate-600 p-0 block bg-transparent"
                                      title="Change layer color"
                                    />
                                  </div>

                                  {/* Opacity slider */}
                                  <div className="flex items-center gap-1.5 flex-1 select-none">
                                    <Sliders className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.05"
                                      value={layer.opacity}
                                      onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                                      className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                                      title="Adjust transparency"
                                    />
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono w-6 text-right">
                                      {Math.round(layer.opacity * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Base Map Gallery */}
        <div className="space-y-3">
          <button
            onClick={() => setIsBaseMapCollapsed(!isBaseMapCollapsed)}
            className="flex items-center justify-between w-full text-left bg-transparent border-0 p-0 focus:outline-none group cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pt-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Base Map Gallery
              {isBaseMapCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" />
              )}
            </span>
          </button>

          {!isBaseMapCollapsed && (
            <div className="grid grid-cols-2 gap-2">
              {baseMaps.map((map) => {
                const isSelected = activeBaseMap === map.id;
                return (
                  <button
                    key={map.id}
                    onClick={() => setBaseMap(map.id)}
                    className={`group relative text-left rounded-lg overflow-hidden border p-2 transition-all duration-200 ${
                      isSelected 
                        ? "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40" 
                        : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750"
                    }`}
                  >
                    <div className="h-14 w-full rounded-md mb-1.5 overflow-hidden border border-slate-100 dark:border-slate-700 flex items-center justify-center relative">
                      {map.id === "osm" && (
                        <div className="absolute inset-0 bg-sky-50 dark:bg-slate-900 grid grid-cols-4 grid-rows-4 opacity-75">
                          <div className="border-b border-r border-emerald-100/40 bg-emerald-50 dark:bg-emerald-950/40"></div>
                          <div className="border-b border-r border-emerald-100/40"></div>
                          <div className="border-b border-r border-emerald-100/40"></div>
                          <div className="border-b border-emerald-100/40 bg-sky-100 dark:bg-slate-800"></div>
                          <div className="border-b border-r border-emerald-100/40"></div>
                          <div className="border-b border-r border-teal-50 bg-indigo-50 dark:bg-indigo-950/40"></div>
                          <div className="border-b border-r border-emerald-100/40"></div>
                          <div className="border-b border-emerald-100/40"></div>
                          <div className="border-r border-emerald-100/40"></div>
                          <div className="border-r border-emerald-100/40 bg-emerald-50 dark:bg-emerald-950/40"></div>
                          <div className="border-r border-emerald-100/40"></div>
                          <div className="bg-sky-50 dark:bg-slate-900"></div>
                        </div>
                      )}
                      {map.id === "light" && <div className="absolute inset-0 bg-slate-50 dark:bg-slate-200 border-r border-b border-slate-100" />}
                      {map.id === "dark" && <div className="absolute inset-0 bg-slate-900 border-r border-b border-slate-800" />}
                      {map.id === "satellite" && (
                        <div className="absolute inset-0 bg-emerald-950 flex flex-col">
                          <div className="flex-1 bg-emerald-900/60" />
                          <div className="h-4 bg-sky-900/40" />
                        </div>
                      )}
                      {map.id === "terrain" && (
                        <div className="absolute inset-0 bg-stone-100 dark:bg-stone-900 flex items-center justify-center opacity-90 overflow-hidden">
                          <span className="text-stone-300 dark:text-stone-600 text-[8px] font-mono select-none">〽️ Contour Lines</span>
                        </div>
                      )}
                      {map.id === "bhuvan" && (
                        <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col justify-between overflow-hidden opacity-90">
                          <div className="h-4 bg-amber-500/70" />
                          <div className="flex-1 bg-white dark:bg-slate-900 flex items-center justify-center">
                            <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-sans select-none">🇮🇳 ISRO</span>
                          </div>
                          <div className="h-4 bg-emerald-600/70" />
                        </div>
                      )}
                      
                      {isSelected && (
                        <span className="absolute top-1 right-1 bg-indigo-600 text-white p-0.5 rounded-full shadow-md z-10 transition duration-150">
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        </span>
                      )}

                      <span className="text-[10px] font-mono leading-none font-bold text-slate-400 dark:text-slate-300 absolute bottom-1 right-1.5 bg-white/80 dark:bg-black/60 px-1 py-0.5 rounded">
                        {map.id.toUpperCase()}
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold block truncate leading-tight ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {map.name}
                    </span>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 line-clamp-1 leading-snug">
                      {map.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spatial Measurement Tools Section */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setIsMeasureCollapsed(!isMeasureCollapsed)}
            className="flex items-center justify-between w-full text-left bg-transparent border-0 p-0 focus:outline-none group cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Ruler className="w-4 h-4 text-rose-500 animate-pulse" />
              Spatial Measurements
              {isMeasureCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" />
              )}
            </span>
            {measurePoints.length > 0 && !isMeasureCollapsed && (
              <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold px-1.5 py-0.5 rounded-full font-mono">
                {measurePoints.length} Pt{measurePoints.length > 1 ? "s" : ""}
              </span>
            )}
          </button>

          {!isMeasureCollapsed && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-3.5 space-y-4">
              {/* Tool Selection */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newMode = measureMode === "distance" ? "none" : "distance";
                    setMeasureMode(newMode);
                    setMeasurePoints([]);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition duration-150 cursor-pointer ${
                    measureMode === "distance"
                      ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/10 font-bold"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 font-medium"
                  }`}
                >
                  <Ruler className="w-4 h-4 mb-1 text-rose-500" />
                  <span className="text-[10px]">Measure Line</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newMode = measureMode === "area" ? "none" : "area";
                    setMeasureMode(newMode);
                    setMeasurePoints([]);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition duration-150 cursor-pointer ${
                    measureMode === "area"
                      ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/10 font-bold"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 font-medium"
                  }`}
                >
                  <span className="text-xs mb-1 font-mono leading-none">⬡</span>
                  <span className="text-[10px]/none">Measure Area</span>
                </button>
              </div>

              {/* Status and instruction helpers */}
              {measureMode === "none" ? (
                <div className="text-center p-3 py-4 bg-slate-50 dark:bg-slate-850/60 rounded-lg border border-slate-100/70 dark:border-slate-700/60">
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 font-semibold leading-normal">
                    Select a tool above, then click anywhere on the map to start measuring length or area.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-700 p-3 rounded-lg space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 block font-mono">
                      Live Computation
                    </span>
                    
                    {measureMode === "distance" && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Cumulative Distance:</span>
                        <div className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight leading-none">
                          {formatDistance(totalDistanceMeters)}
                        </div>
                      </div>
                    )}

                    {measureMode === "area" && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Enclosed Area:</span>
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
                          {measurePoints.length >= 3 ? formatArea(polygonAreaSqMeters) : "Place ≥ 3 points"}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block leading-normal pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      {measurePoints.length === 0 
                        ? "📍 Click on map to place starting vertex."
                        : `📍 Placed ${measurePoints.length} vertices. Continue clicking map.`}
                    </span>
                  </div>

                  {/* Actions for active items */}
                  {measurePoints.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMeasurePoints((prev) => prev.slice(0, -1))}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md text-[10px] font-bold transition cursor-pointer"
                      >
                        <Undo className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        Undo Point
                      </button>

                      <button
                        type="button"
                        onClick={() => setMeasurePoints([])}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 rounded-md text-[10px] font-bold transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer Banner */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-md p-2 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex justify-between">
            <span>State Code (Uttarakhand):</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">05</span>
          </div>
          <div className="flex justify-between">
            <span>District (Udham Singh Nagar):</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">067</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
