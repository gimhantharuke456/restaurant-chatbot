import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.js";
import { getPresignedUrl, uploadFile } from "./upload.controller.js";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

router.use(authenticate);

// Returns a presigned PUT URL — frontend uploads directly to S3
router.post("/presign", getPresignedUrl);

// Server-side upload: receives multipart/form-data, streams to S3
router.post("/", upload.single("file"), uploadFile);

export default router;
