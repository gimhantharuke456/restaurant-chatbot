import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET ?? "";
const CDN_BASE = process.env.AWS_S3_CDN_URL ?? `https://${BUCKET}.s3.amazonaws.com`;

const buildKey = (folder: string, originalName: string) => {
  const ext = originalName.split(".").pop() ?? "jpg";
  return `${folder}/${randomUUID()}.${ext}`;
};

export const generatePresignedUrl = async (folder: string, filename: string, contentType: string) => {
  const key = buildKey(folder, filename);
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  const fileUrl = `${CDN_BASE}/${key}`;
  return { uploadUrl, fileUrl, key };
};

export const uploadBuffer = async (buffer: Buffer, folder: string, filename: string, contentType: string) => {
  const key = buildKey(folder, filename);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
  return { fileUrl: `${CDN_BASE}/${key}`, key };
};

export const deleteFile = async (key: string) => {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};
