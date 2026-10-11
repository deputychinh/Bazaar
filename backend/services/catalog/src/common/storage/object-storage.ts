import type { PresignedUpload, StoredObject } from '../../interfaces/storage.interface.js';

/** Port to the image bucket (adapter: S3ObjectStorage — RustFS locally, S3 in production). */
export abstract class ObjectStorage {
  public abstract presignUpload(key: string, contentType: string): Promise<PresignedUpload>;

  public abstract head(key: string): Promise<StoredObject | null>;

  public abstract delete(key: string): Promise<void>;
}
