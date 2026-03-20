import fs from "fs";
import path from "path";
import sharp from "sharp";
import Busboy from "busboy";
import { pipeline } from "stream/promises";

// --- 🚀 PERFORMANCE & MEMORY OPTIMIZATIONS ---
// Disable Sharp's internal cache to save RAM on your VPS
sharp.cache(false); 
// Force Sharp to use only 1 CPU thread (prevents VPS throttling and OOM)
sharp.concurrency(1);

export const uploadImage = (folderName = "default") => {
  return async (req, res) => {
    
    // Using a Promise wrapper to ensure we wait for the file to finish saving
    const processUpload = () => new Promise((resolve, reject) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: { 
          fileSize: 5 * 1024 * 1024, // 5MB Limit
          files: 1                    // Only 1 file at a time
        },
      });

      let filePathResponse = "";
      let processingPromises = [];

      busboy.on("file", (fieldname, file, info) => {
        const { filename, mimeType } = info;

        // 1. Validate File Type
        const isImage = (mimeType && mimeType.startsWith("image/")) ||
                        /\.(jpg|jpeg|png|webp)$/i.test(filename);

        if (!isImage) {
          file.resume(); // Discard the file data
          return reject({ status: 400, message: "Only image files allowed" });
        }

        // 2. Setup Directory
        const uploadDir = path.join(process.cwd(), "uploads", folderName);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const name = `${Date.now()}.jpg`;
        const filepath = path.join(uploadDir, name);
        filePathResponse = `/uploads/${folderName}/${name}`;

        // 3. High-Performance Image Processing
        const work = pipeline(
          file,
          sharp({ 
            failOn: 'none', // Don't crash on slightly corrupted images
            sequentialRead: true // Better for streaming/memory
          })
            .resize({ 
              width: 1024, 
              withoutEnlargement: true,
              fastShrinkOnLoad: true // ⚡ Speed boost: downsamples during load
            })
            .jpeg({ 
              quality: 75, 
              progressive: true, 
              mozjpeg: false // ⚡ Speed boost: Mozjpeg is too slow for small VPS
            }),
          fs.createWriteStream(filepath)
        ).catch(err => {
            console.error("Sharp/Pipeline Error:", err);
            throw err;
        });
        
        processingPromises.push(work);
      });

      // Busboy triggers 'finish' once the request stream is done reading
      busboy.on("finish", async () => {
        try {
          // IMPORTANT: Wait for all Sharp pipelines to actually finish writing to disk
          await Promise.all(processingPromises);
          
          if (!filePathResponse) {
            return reject({ status: 400, message: "No file uploaded" });
          }

          resolve(filePathResponse);
        } catch (err) {
          reject({ status: 500, message: "Image processing failed" });
        }
      });

      busboy.on("error", (err) => reject({ status: 500, message: err.message }));
      
      // Start the stream
      req.pipe(busboy);
    });

    try {
      const pathResult = await processUpload();
      // Success response only after the file is confirmed on disk
      return res.json({ 
        success: true, 
        path: pathResult 
      });
    } catch (err) {
      console.error("Upload Logic Error:", err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  };
};