import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import inspector from "./routes/inspector.routes.js";

const app = express();
const PORT = 3000;

// ✅ Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Middleware
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ✅ CORS - Updated to allow ALL origins
app.use(cors({
  origin: "*",               // 🔥 Allows any website/frontend to access this API
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // Added Authorization just in case
}));

// ✅ Serve uploads with Caching (Helps VPS Performance)
app.use("/uploads", express.static(uploadDir, {
  maxAge: '1d', // Tells browsers to cache images for 1 day
  etag: true
}));

// ✅ Health check
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 Upload Server Running</h1>
    <p>API is active on /inspector</p>
  `);
});

// ✅ Routes
app.use("/inspector", inspector);

// 🚀 Start server
// We use 0.0.0.0 to ensure it listens on all network interfaces inside Docker
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});