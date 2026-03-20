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
app.use(express.json()); // 🔥 IMPORTANT
app.use(express.urlencoded({ extended: true }));

// ✅ CORS
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ✅ Serve uploads
app.use("/uploads", express.static(uploadDir));

// ✅ Health check
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 Upload Server Running</h1>
    <p>Use /inspector APIs</p>
  `);
});

// ✅ Routes
app.use("/inspector", inspector);

// 🚀 Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});