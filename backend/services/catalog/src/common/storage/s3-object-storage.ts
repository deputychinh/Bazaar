import {
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';
import { IMAGE_UPLOAD_TTL_SECONDS } from '../../constants/image.constant.js';
import type { PresignedUpload, StoredObject } from '../../interfaces/storage.interface.js';

import { ObjectStorage } from './object-storage.js';

/**
 * S3 API adapter. Server calls use the internal endpoint; upload URLs are signed for the
 * public endpoint so browsers can reach them.
 */
@Injectable()
export class S3ObjectStorage extends ObjectStorage {
  private readonly internal: S3Client;
  private readonly public: S3Client;
  private readonly bucket: string;

  public constructor(config: AppConfig) {
    super();
    const { env } = config;
    const { STORAGE_ACCESS_KEY: accessKeyId, STORAGE_SECRET_KEY: secretAccessKey } = env;
    // No static keys → the SDK's default chain (EKS Pod Identity on AWS).
    const credentials =
      accessKeyId === undefined || secretAccessKey === undefined
        ? {}
        : { credentials: { accessKeyId, secretAccessKey } };
    const common = {
      region: env.STORAGE_REGION,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
      ...credentials,
    };
    this.internal = new S3Client({ ...common, endpoint: env.STORAGE_ENDPOINT });
    this.public = new S3Client({ ...common, endpoint: env.STORAGE_PUBLIC_URL });
    this.bucket = env.STORAGE_BUCKET_IMAGES;
  }

  public async presignUpload(key: string, contentType: string): Promise<PresignedUpload> {
    const uploadUrl = await getSignedUrl(
      this.public,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: IMAGE_UPLOAD_TTL_SECONDS },
    );
    return {
      uploadUrl,
      key,
      expiresInSeconds: IMAGE_UPLOAD_TTL_SECONDS,
      headers: { 'content-type': contentType },
    };
  }

  public async head(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.internal.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { sizeBytes: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
    } catch (error) {
      if (error instanceof NotFound) {
        return null;
      }
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    await this.internal.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
