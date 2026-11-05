import { config } from "@/config";
import { AppError, ExternalServiceError } from "@/util/errors";
import { logger } from "@/util/logger";
import { v2 as cloudinary } from "cloudinary";

import crypto from "crypto";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

// Storage service backed by Cloudinary. The class name and `s3Service` export
// are kept for backwards compatibility with existing imports.
export class S3Service {
  private cloudName: string;

  constructor() {
    this.cloudName = config.cloudinary.cloudName;
  }

  private generateUniqueId(userId: string, prefix: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString("hex");
    return `${prefix}/${userId}/${timestamp}-${randomString}`;
  }

  private async uploadBuffer(
    fileBuffer: Buffer,
    publicId: string,
    mimeType: string,
    context: Record<string, string> = {}
  ): Promise<UploadResult> {
    const dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
      context,
    });

    return {
      url: result.secure_url,
      key: result.public_id,
      bucket: this.cloudName,
    };
  }

  // upload original photo
  async uploadOriginalPhoto(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      const publicId = this.generateUniqueId(userId, "headshots/originals");
      const result = await this.uploadBuffer(fileBuffer, publicId, mimeType, {
        userId,
        uploadedAt: new Date().toISOString(),
      });

      logger.info(`Uploaded original photo to Cloudinary`, result);
      return result;
    } catch (error) {
      logger.error(`Failed to upload original photo to Cloudinary`, error);
      throw new ExternalServiceError(
        "Cloudinary",
        `Failed to upload original photo`
      );
    }
  }

  // upload a generated headshot
  async uploadGeneratedHeadshot(
    userId: string,
    fileBuffer: Buffer,
    style: string,
    mimeType: string = "image/png"
  ): Promise<UploadResult> {
    try {
      const publicId = this.generateUniqueId(
        userId,
        `headshots/generated/${style}`
      );
      const result = await this.uploadBuffer(fileBuffer, publicId, mimeType, {
        userId,
        style,
        generatedAt: new Date().toISOString(),
      });

      logger.info(`Generated headshot uploaded to Cloudinary: ${result.key}`);
      return result;
    } catch (error) {
      logger.error("Failed to upload generated headshot to Cloudinary:", error);
      throw new Error("Failed to upload generated headshot to storage");
    }
  }

  // Cloudinary assets are public CDN URLs, so this returns the delivery URL for
  // the given public_id. The expiresIn arg is kept for signature compatibility.
  async getSignedUrl(key: string, _expiresIn: number = 3600): Promise<string> {
    if (!key || key.trim() === "") {
      logger.error(`Invalid url key`);
      throw new AppError("Invalid url key", 400);
    }
    return cloudinary.url(key, { secure: true, resource_type: "image" });
  }

  // Download an image from a URL (or a data: URI) into a Buffer.
  async downloadFromUrl(url: string): Promise<Buffer> {
    try {
      if (url.startsWith("data:")) {
        const base64 = url.split(",")[1] ?? "";
        return Buffer.from(base64, "base64");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error(`Failed to download image from url`, error);
      throw new ExternalServiceError("Cloudinary", `Failed to download image`);
    }
  }

  // delete a single asset by its public_id
  async deleteFile(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key, { resource_type: "image" });
      logger.info(`Deleted asset from Cloudinary: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete asset from Cloudinary: ${key}`, error);
      throw new ExternalServiceError("Cloudinary", `Failed to delete asset`);
    }
  }

  // delete multiple assets
  async deleteFiles(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    try {
      await Promise.all(keys.map((key) => this.deleteFile(key)));
    } catch (error) {
      logger.error(`Failed to delete assets from Cloudinary`, error);
      throw new ExternalServiceError("Cloudinary", `Failed to delete assets`);
    }
  }
}

export const s3Service = new S3Service();
