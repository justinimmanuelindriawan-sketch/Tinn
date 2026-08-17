import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const SETTINGS_FILE = path.join(process.cwd(), "settings-db.json");

// Helper to read settings
function readSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading settings file:", e);
    }
  }
  return { scriptUrl: "", appName: "EduConnect", folderId: "", adminUsername: "admin", adminPassword: "admin", schoolLogoUrl: "", tahunPelajaran: "2025/2026", schoolName: "" };
}

// Helper to write settings
function writeSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing settings file:", e);
  }
}

// API Routes
app.get("/api/settings", (req, res) => {
  res.json(readSettings());
});

app.post("/api/settings", (req, res) => {
  const current = readSettings();
  const updated = { ...current, ...req.body };
  writeSettings(updated);
  res.json({ success: true, settings: updated });
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
