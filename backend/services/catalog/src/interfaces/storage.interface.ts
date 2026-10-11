export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
  /** Headers the client must send with the PUT. */
  headers: Record<string, string>;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string | null;
}
