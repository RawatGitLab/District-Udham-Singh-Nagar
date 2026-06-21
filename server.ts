import express from "express";
import path from "path";
import { MongoClient } from "mongodb";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://varunrawatmailbox2507_db_user:GYVPiF8LG4HIbsSF@cluster0.8xfepsq.mongodb.net/?appName=Cluster0";
const MONGODB_DB = process.env.MONGODB_DB || "Shapefile";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "UdhanSinghNagar";

let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    try {
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      console.log("Connected to MongoDB Atlas successfully.");
    } catch (error) {
      console.error("MongoDB Connection Error:", error);
      throw error;
    }
  }
  return mongoClient;
}

// Enable JSON parser
app.use(express.json());

// API: Debug MongoDB schema
app.get("/api/debug", async (req, res) => {
  try {
    const client = await getMongoClient();
    const db = client.db(MONGODB_DB);
    const collection = db.collection(MONGODB_COLLECTION);
    
    // Get total document count
    const totalCount = await collection.countDocuments();
    
    // Fetch a sample of 5 documents to inspect
    const sample = await collection.find({}).limit(5).toArray();
    
    // Analyze fields and distinct layers/types if present
    const distinctLayers = await collection.distinct("properties.layer").catch(() => []);
    const alternativeLayers = await collection.distinct("properties.Layer").catch(() => []);
    const rawDistinctLayers = await collection.distinct("layer").catch(() => []);
    
    res.json({
      success: true,
      totalCount,
      sample,
      detectedLayers: {
        propertiesLayer: distinctLayers,
        properties_capLayer: alternativeLayers,
        rootLayer: rawDistinctLayers
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  }
});

// API: Get all features
app.get("/api/features", async (req, res) => {
  try {
    const client = await getMongoClient();
    const db = client.db(MONGODB_DB);
    const collection = db.collection(MONGODB_COLLECTION);
    
    // Fetch all geographical features in the collection
    const rawFeatures = await collection.find({}).toArray();
    
    const features: any[] = [];
    
    rawFeatures.forEach((doc, docIdx) => {
      // Each doc is usually a FeatureCollection containing an array of Feature documents
      const layerName = doc.name || doc.Layer || "Unassigned";
      
      if (Array.isArray(doc.features)) {
        doc.features.forEach((feat: any, featIdx: number) => {
          features.push({
            id: feat.id || `${doc._id.toString()}-${featIdx}`,
            type: "Feature",
            geometry: feat.geometry,
            properties: {
              ...feat.properties,
              layer: layerName,
              name: feat.properties?.name || feat.properties?.Name || feat.properties?.village_name || feat.properties?.Village_Name || ""
            }
          });
        });
      } else if (doc.type === "Feature" || (doc.geometry && doc.properties)) {
        features.push({
          id: doc._id.toString(),
          type: "Feature",
          geometry: doc.geometry,
          properties: {
            ...doc.properties,
            layer: doc.layer || doc.Layer || "Unassigned",
            name: doc.properties?.name || doc.properties?.Name || doc.properties?.village_name || doc.properties?.Village_Name || ""
          }
        });
      } else {
        // Fallback for coordinates format
        const geometry = doc.geometry || (doc.coordinates ? { type: doc.geom_type || "Point", coordinates: doc.coordinates } : null);
        if (geometry) {
          features.push({
            id: doc._id.toString(),
            type: "Feature",
            geometry: geometry,
            properties: {
              ...doc,
              layer: doc.layer || doc.Layer || "Unassigned",
              name: doc.name || doc.Name || doc.village_name || doc.Village_Name || ""
            }
          });
        }
      }
    });
    
    res.json({
      success: true,
      count: features.length,
      features
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  }
});

// API: Proxy Bhuvan tiles to bypass mixed content (HTTP over HTTPS) or self-signed cert blocks
app.get("/api/bhuvan-tiles/:z/:x/:y", async (req, res) => {
  const { z, x, y } = req.params;
  
  // Use http to bypass SSL issues, since we fetch on the server and return securely to the client
  const bhuvanUrl = `http://bhuvan-vec1.nrsc.gov.in/bhuvan/gts/vector/${z}/${x}/${y}.png`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for quick failure/fallback

    const response = await fetch(bhuvanUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "http://bhuvan.nrsc.gov.in/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      return res.send(buffer);
    }
    
    // If Bhuvan tile server is down, fallback to OpenStreetMap
    console.warn(`Bhuvan tile server returned status ${response.status}. Falling back to standard OSM tile.`);
    const fallbackUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const fallbackResponse = await fetch(fallbackUrl);
    if (fallbackResponse.ok) {
      const fallbackArray = await fallbackResponse.arrayBuffer();
      res.set("Content-Type", "image/png");
      return res.send(Buffer.from(fallbackArray));
    }
    res.status(502).send("Tile service unavailable");
  } catch (error) {
    // Graceful fallback to OpenStreetMap on connection error, timeout, or lookup failure
    try {
      const fallbackUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        const fallbackArray = await fallbackResponse.arrayBuffer();
        res.set("Content-Type", "image/png");
        return res.send(Buffer.from(fallbackArray));
      }
    } catch (e) {
      // Ignore
    }
    res.status(502).send("Error fetching tile");
  }
});

async function startServer() {
  // Vite dev server middleware integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://0.0.0.0:${PORT} debug ready at /api/debug`);
  });
}

startServer();
