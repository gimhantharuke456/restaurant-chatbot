import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as uploadService from "./upload.service.js";

const ALLOWED_FOLDERS = ["avatars", "reviews", "restaurants", "menu"] as const;
type Folder = typeof ALLOWED_FOLDERS[number];

export const getPresignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const { filename, contentType, folder = "reviews" } = req.body as {
    filename: string;
    contentType: string;
    folder?: string;
  };

  if (!filename || !contentType) {
    res.status(400).json({ error: "filename and contentType are required" });
    return;
  }
  if (!ALLOWED_FOLDERS.includes(folder as Folder)) {
    res.status(400).json({ error: `folder must be one of: ${ALLOWED_FOLDERS.join(", ")}` });
    return;
  }
  if (!contentType.startsWith("image/")) {
    res.status(400).json({ error: "Only image content types are allowed" });
    return;
  }

  const result = await uploadService.generatePresignedUrl(folder, filename, contentType);
  res.json(result);
};

export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const folder = (req.body.folder as string) ?? "reviews";
  if (!ALLOWED_FOLDERS.includes(folder as Folder)) {
    res.status(400).json({ error: `folder must be one of: ${ALLOWED_FOLDERS.join(", ")}` });
    return;
  }

  const result = await uploadService.uploadBuffer(
    req.file.buffer,
    folder,
    req.file.originalname,
    req.file.mimetype,
  );
  res.status(201).json(result);
};
