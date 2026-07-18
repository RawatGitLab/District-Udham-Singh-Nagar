import { useEffect, useState, useMemo } from "react";
import { GisFeature, LayerConfig, BaseMap } from "./types";
import Sidebar from "./components/Sidebar";
import MapComponent from "./components/MapComponent";
import AttributeTable from "./components/AttributeTable";
import { 
  Database, 
  Layers, 
  MapPin, 
  Compass, 
  Globe, 
  Eye, 
  VolumeX, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Info,
  ServerCrash
} from "lucide-react";

export default function App() {
  const [features, setFeatures] = useState<GisFeature[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map & Interaction state
  const [activeBaseMap, setActiveBaseMap] = useState<string>("satellite");
  const [selectedFeature, setSelectedFeature] = useState<GisFeature | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<GisFeature | null>(null);
  const [isTableCollapsed, setIsTableCollapsed] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [resetCounter, setResetCounter] = useState<number>(0);

  // Dynamic Measurement state (Distance & Area)
  const [measureMode, setMeasureMode] = useState<"none" | "distance" | "area">("none");
  const [measurePoints, setMeasurePoints] = useState<{ lat: number; lng: number }[]>([]);

  // Standard Basemaps (free of credentials)
  const baseMaps: BaseMap[] = useMemo(() => [
    {
      id: "osm",
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      thumbnail: "",
      desc: "Standard road map style"
    },
    {
      id: "light",
      name: "CartoDB Light",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      thumbnail: "",
      desc: "Minimalist grayscale background"
    },
    {
      id: "dark",
      name: "CartoDB Dark",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      thumbnail: "",
      desc: "High-contrast dark canvas"
    },
    {
      id: "satellite",
      name: "Esri Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      thumbnail: "",
      desc: "Global high-res satellite photos"
    },
    {
      id: "terrain",
      name: "Esri Terrain",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, USGS, NPS',
      thumbnail: "",
      desc: "Topographic outline contouring"
    },
    {
      id: "bhuvan",
      name: "ISRO Bhuvan",
      url: "/api/bhuvan-tiles/{z}/{x}/{y}",
      attribution: 'Tiles &copy; ISRO Bhuvan &mdash; NRSC, Government of India',
      thumbnail: "",
      desc: "Indian National Geospatial Platform"
    }
  ], []);

  // Fetch geographic features from backend Express server (connecting to MongoDB Atlas)
  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/features");
      if (!response.ok) {
        throw new Error(`Failed to load features from MongoDB database: Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Unknown database fetching error");
      }

      const gisFeatures: GisFeature[] = data.features || [];
      setFeatures(gisFeatures);
      
      // Auto-classify layers dynamically from the features loaded
      buildLayerConfiguration(gisFeatures);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while fetching GIS data from Atlas.");
      setLoading(false);
    }
  };

  // Analyze features to identify unique layers, geometry types, and assign aesthetic styling
  const buildLayerConfiguration = (loadedFeatures: GisFeature[]) => {
    const layerCounts: Record<string, number> = {};
    const layerTypes: Record<string, "point" | "linestring" | "polygon" | "unknown"> = {};

    loadedFeatures.forEach((feat) => {
      // Find layer property dynamically
      const layerName = 
        feat.properties.layer || 
        feat.properties.Layer || 
        feat.properties.LAYER || 
        "General Feature";
        
      layerCounts[layerName] = (layerCounts[layerName] || 0) + 1;
      
      if (layerName === "USN-Landuse-Agriculture") {
        console.log("DEBUG: Found feature for USN-Landuse-Agriculture");
      }
      // Classify geometry type
      const geomType = feat.geometry?.type;
      if (geomType) {
        if (geomType.toLowerCase().includes("point")) {
          layerTypes[layerName] = "point";
        } else if (geomType.toLowerCase().includes("line")) {
          layerTypes[layerName] = "linestring";
        } else if (geomType.toLowerCase().includes("polygon")) {
          layerTypes[layerName] = "polygon";
        } else if (!layerTypes[layerName]) {
          layerTypes[layerName] = "unknown";
        }
      } else if (!layerTypes[layerName]) {
        layerTypes[layerName] = "unknown";
      }
    });

    // Create sorted layer config array
    const layerNames = Object.keys(layerCounts);
    
    // Sort layers to make outer structures (boundaries) go below details (rivers, villages)
    // Polygons must go first in layers configuration so that Leaflet layers renders them at the bottom index (to avoid overlay blocking village clicks!)
    // Points (villages) should render on top
    const sortPriority = (name: string, type: string) => {
      if (type === "polygon") return 1;
      if (type === "linestring") return 2;
      if (type === "point") return 3;
      return 4;
    };

    layerNames.sort((a, b) => sortPriority(a, layerTypes[a]) - sortPriority(b, layerTypes[b]));

    const configuration: LayerConfig[] = layerNames.map((name, index) => {
      const type = layerTypes[name] || "unknown";
      
      // Determine elegant theme coloring based on standard GIS mapping schemas
      let color = "#6366f1"; // default indigo
      let fillColor = "#818cf8";
      let weight = 2;
      let opacity = 0.85;
      let fillOpacity = 0.4;

      const lowerName = name.toLowerCase();
      if (lowerName.includes("village")) {
        color = "#ec4899"; // bright pink villages selector
        fillColor = "#f472b6";
        weight = 1.5;
        opacity = 0.95;
      } else if (lowerName.includes("river") || lowerName.includes("canal") || lowerName.includes("water")) {
        color = "#0ea5e9"; // stream sky blue
        fillColor = "#38bdf8";
        weight = 2.5;
        opacity = 1.0;
        fillOpacity = 0.1;
      } else if (lowerName.includes("district") || lowerName.includes("boundary")) {
        color = "#a16207"; // Golden brown outline
        fillColor = "#fbbf24"; // Mustard polygon fill
        weight = 2.5;
        opacity = 0.9;
        fillOpacity = 0.55; // Solid background core
      } else if (lowerName.includes("block")) {
        color = "#c2410c"; // Rust dark
        fillColor = "#fdba74"; // Peach block
        weight = 2.0;
        opacity = 0.8;
        fillOpacity = 0.25;
      } else if (lowerName.includes("tehsil") || lowerName.includes("tahsil")) {
        color = "#15803d"; // Deep forest green
        fillColor = "#86efac"; // Mint tehsil
        weight = 2.0;
        opacity = 0.85;
        fillOpacity = 0.3;
      } else {
        // Dynamic palette for any other shapefile imported
        const hue = (index * 137.5) % 360; 
        color = `hsl(${hue}, 70%, 45%)`;
        fillColor = `hsl(${hue}, 70%, 65%)`;
      }

      // Overriding for polygon layers (hollow, no fill, only white boundary color)
      if (type === "polygon") {
        color = "#ffffff";
        fillColor = "transparent";
        fillOpacity = 0;
      }

      return {
        id: `layer-${index}-${name.replace(/\s+/g, '-')}`,
        name: name,
        visible: name.toLowerCase() === "usn-district-boundary",
        type: type,
        color: color,
        fillColor: fillColor,
        opacity: opacity,
        fillOpacity: fillOpacity,
        weight: weight,
        itemCount: layerCounts[name]
      };
    });

    setLayers(configuration);
  };

  // Handle sidebar interactivity toggles
  const toggleLayer = (id: string) => {
    setLayers((prev) => {
      const layerToToggle = prev.find((l) => l.id === id);

      // If the layer is going to be hidden and has the selected feature, clear the selection
      if (layerToToggle && layerToToggle.visible && selectedFeature) {
        const featLayerName =
          selectedFeature.properties.layer ||
          selectedFeature.properties.Layer ||
          selectedFeature.properties.LAYER;

        if (featLayerName === layerToToggle.name) {
          setSelectedFeature(null);
        }
      }

      return prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    });
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity: opacity } : l))
    );
  };

  const updateLayerColor = (id: string, color: string) => {
    setLayers((prev) => {
      return prev.map((l) => {
        if (l.id === id) {
          // If the fill color was same as color, update it too
          return { 
            ...l, 
            color: color, 
            fillColor: color 
          };
        }
        return l;
      });
    });
  };

  const handleResetToExtent = () => {
    setSelectedFeature(null);
    setHoveredFeature(null);
    setMeasureMode("none");
    setMeasurePoints([]);
    setResetCounter((prev) => prev + 1);
    // Restore initial state: only district boundary visible, polygons hollow white
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: l.name.toLowerCase() === "usn-district-boundary",
        color: l.type === "polygon" ? "#ffffff" : l.color,
        fillColor: l.type === "polygon" ? "transparent" : l.fillColor,
        fillOpacity: l.type === "polygon" ? 0 : l.fillOpacity,
        opacity: l.type === "polygon" && l.name.toLowerCase().includes("tehsil") ? 0.85 : 0.9,
      }))
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* Visual Navigation Header */}
      <header className="h-14 bg-slate-900 text-slate-100 px-4 flex items-center justify-between border-b border-slate-950 shrink-0 select-none shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm flex items-center justify-center">
            <Compass className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-white uppercase">District Udham Singh Nagar</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                Live Server
              </span>
            </div>
            <h2 className="text-base font-bold tracking-tight text-slate-200">A Geographic Perspective</h2>
          </div>
        </div>

        {/* Global summary specs */}
        <div className="hidden md:flex items-center space-x-4 text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Layers: <strong className="text-white font-mono">{layers.length}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded">
            <Database className="w-3.5 h-3.5 text-pink-400" />
            <span>Entities: <strong className="text-white font-mono">{features.length}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Core GIS Workspace Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        {loading ? (
          <div className="absolute inset-x-0 inset-y-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 select-none font-sans">
            <div className="bg-slate-800 border border-slate-700/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Synchronizing Spatial Shapefiles</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connecting securely to database. Downloading geographical boundaries, river streams, and villages of <span className="text-indigo-400 font-semibold">Udham&nbsp;Singh&nbsp;Nagar</span>...
              </p>
              
              {/* Spinning status indicator */}
              <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mt-6">
                <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-pulse" />
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-2 uppercase tracking-widest">Awaiting MongoDB Stream</span>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-x-0 inset-y-0 bg-slate-950 flex flex-col items-center justify-center z-[100] p-6 text-center select-none font-sans">
            <div className="bg-slate-900 border border-red-500/20 max-w-md p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <ServerCrash className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Database Connection Failed</h3>
              <p className="text-xs text-red-400/90 font-mono bg-red-950/20 border border-red-900/35 p-3 rounded-md mt-3 mb-4 text-left leading-relaxed break-words w-full">
                {error}
              </p>
              <p className="text-xs text-slate-400 leading-normal max-w-sm">
                Ensure that your Atlas Cluster allows connection requests, and that your collection contains valid GeoJSON shapefiles.
              </p>
              <button
                onClick={fetchFeatures}
                className="mt-6 font-semibold text-xs bg-indigo-600 font-sans hover:bg-indigo-500 text-white px-5 py-2 rounded-lg shadow-md hover:shadow-indigo-500/10 transition-all duration-150"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left Sidebar - Layer Configs and Basemaps */}
            <Sidebar
              layers={layers}
              toggleLayer={toggleLayer}
              updateLayerOpacity={updateLayerOpacity}
              updateLayerColor={updateLayerColor}
              activeBaseMap={activeBaseMap}
              setBaseMap={setActiveBaseMap}
              baseMaps={baseMaps}
              onReset={handleResetToExtent}
              totalFeatures={features.length}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              measureMode={measureMode}
              setMeasureMode={setMeasureMode}
              measurePoints={measurePoints}
              setMeasurePoints={setMeasurePoints}
            />

            {/* Center Map Workboard */}
            <MapComponent
              features={features}
              layers={layers}
              activeBaseMap={activeBaseMap}
              baseMaps={baseMaps}
              selectedFeature={selectedFeature}
              onFeatureSelect={setSelectedFeature}
              hoveredFeature={hoveredFeature}
              setHoveredFeature={setHoveredFeature}
              isTableCollapsed={isTableCollapsed}
              setIsTableCollapsed={setIsTableCollapsed}
              isSidebarCollapsed={isSidebarCollapsed}
              measureMode={measureMode}
              measurePoints={measurePoints}
              setMeasurePoints={setMeasurePoints}
              resetCounter={resetCounter}
            />

            {/* Right Pane Attribute Table */}
            <AttributeTable
              features={features}
              layers={layers}
              selectedFeature={selectedFeature}
              onFeatureSelect={setSelectedFeature}
              isCollapsed={isTableCollapsed}
              setIsCollapsed={setIsTableCollapsed}
            />
          </>
        )}
      </main>
    </div>
  );
}
