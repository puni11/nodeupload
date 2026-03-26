import fs from "fs";
import path from "path";
import sharp from "sharp";
import Busboy from "busboy";
import crypto from "crypto";
import { pipeline } from "stream/promises";

sharp.cache(false);
sharp.concurrency(1);

export const uploadImage = (folderName = "default") => {
  return async (req, res) => {
    const processUpload = () =>
      new Promise((resolve, reject) => {
        const busboy = Busboy({
          headers: req.headers,
          limits: {
            fileSize: 5 * 1024 * 1024,
            files: 1,
          },
        });

        let fileSaved = false;
        let filePathResponse = "";
        const processingPromises = [];

        busboy.on("file", async (fieldname, file, info) => {
          try {
            const { filename, mimeType } = info;

            // ✅ Quick filter (fast reject)
            const isImageMime =
              mimeType && mimeType.startsWith("image/");
            const isImageExt =
              /\.(jpg|jpeg|png|webp)$/i.test(filename);

            if (!isImageMime && !isImageExt) {
              file.resume();
              return reject({
                status: 400,
                message: "Only image files allowed",
              });
            }

            const uploadDir = path.join(process.cwd(), "uploads", folderName);
            await fs.promises.mkdir(uploadDir, { recursive: true });

            const uniqueName = `${Date.now()}-${crypto
              .randomBytes(6)
              .toString("hex")}.jpg`;

            const filepath = path.join(uploadDir, uniqueName);
            filePathResponse = `/uploads/${folderName}/${uniqueName}`;

            // ❗ File size protection
            file.on("limit", () => {
              file.unpipe();
              file.resume();
              reject({
                status: 400,
                message: "File size exceeds 5MB",
              });
            });

            // ✅ FINAL VALIDATION (REAL CHECK)
            const transformer = sharp({
              failOn: "error", // will throw if not real image
              sequentialRead: true,
            })
              .resize({
                width: 1024,
                withoutEnlargement: true,
                fastShrinkOnLoad: true,
              })
              .jpeg({
                quality: 75,
                progressive: true,
              });

            const work = pipeline(
              file,
              transformer,
              fs.createWriteStream(filepath)
            ).catch(() => {
              reject({
                status: 400,
                message: "Invalid image file",
              });
            });

            processingPromises.push(work);
            fileSaved = true;
          } catch (err) {
            reject({ status: 500, message: "Upload failed" });
          }
        });

        busboy.on("filesLimit", () =>
          reject({ status: 400, message: "Too many files" })
        );

        busboy.on("partsLimit", () =>
          reject({ status: 400, message: "Too many parts" })
        );

        busboy.on("error", (err) =>
          reject({ status: 500, message: err.message })
        );

        busboy.on("finish", async () => {
          try {
            await Promise.all(processingPromises);

            if (!fileSaved) {
              return reject({
                status: 400,
                message: "No file uploaded",
              });
            }

            resolve(filePathResponse);
          } catch (err) {
            reject({
              status: 500,
              message: "Image processing failed",
            });
          }
        });

        req.pipe(busboy);
      });

    try {
      const result = await processUpload();

      return res.json({
        success: true,
        path: result,
      });
    } catch (err) {
      console.error("Upload Error:", err);

      return res.status(err.status || 500).json({
        success: false,
        error: err.message || "Upload failed",
      });
    }
  };
};