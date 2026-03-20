import fs from "fs";
import path from "path";
import sharp from "sharp";
import { pipeline } from "stream/promises";

export const uploadImage = (folderName = "default") => {
  return async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      // ✅ FILE SIZE LIMIT (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: "File too large (max 5MB)" }, 400);
      }

      const uploadDir = path.join(process.cwd(), "uploads", folderName);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);

      // ✅ STREAMING PIPELINE (NO MEMORY SPIKE)
      await pipeline(
        file.stream(),
        sharp()
          .resize({ width: 1024 })
          .jpeg({ quality: 70, mozjpeg: true }),
        fs.createWriteStream(filepath)
      );

      console.log("Saved:", `/uploads/${folderName}/${filename}`);

      return c.json({
        success: true,
        path: `/uploads/${folderName}/${filename}`,
      });

    } catch (err) {
      console.error("Upload Error:", err);
      return c.json({ error: "Upload failed" }, 500);
    }
  };
};