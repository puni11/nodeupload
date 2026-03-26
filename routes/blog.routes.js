import express from "express";
import { uploadImage } from "../controllers/upload.controller.js";
import { deleteImage } from "../controllers/delete.controller.js";

const router = express.Router();

// ✅ Dashboard
router.get("/", (req, res) => {
  res.send("Blog Dashboard");
});

// ✅ Upload
router.post("/upload/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("yes");

    // call your controller (adapted for express)
    await uploadImage(`blog/${userId}`)(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ✅ Delete
router.delete("/delete/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await deleteImage(`blog/${userId}`)(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;