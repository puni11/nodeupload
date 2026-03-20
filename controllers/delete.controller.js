import fs from "fs";
import path from "path";

export const deleteImage = (baseFolder = "default") => {
  return async (req, res) => {
    try {
      const { file } = req.body; // filename only

      if (!file) {
        return res.status(400).json({ error: "File name required" });
      }

      // 🚫 prevent path traversal (security)
      if (file.includes("..")) {
        return res.status(400).json({ error: "Invalid file path" });
      }

      const filePath = path.join(
        process.cwd(),
        "uploads",
        baseFolder,
        file
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      fs.unlinkSync(filePath);

      return res.json({
        success: true,
        message: "File deleted successfully",
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Delete failed" });
    }
  };
};