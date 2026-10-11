import { z } from 'zod';

import { MAX_IMAGE_BYTES } from '../../../constants/image.constant.js';
import { ImageContentType } from '../../../enums/image-content-type.enum.js';

export const uploadRequestSchema = z.object({
  contentType: z.enum(ImageContentType).meta({ id: 'ImageContentType' }),
  sizeBytes: z.number().int().min(1).max(MAX_IMAGE_BYTES),
});
export type UploadRequestDto = z.infer<typeof uploadRequestSchema>;

export const uploadResponseSchema = z.object({
  uploadUrl: z.url(),
  key: z.string(),
  expiresInSeconds: z.number().int(),
  headers: z.record(z.string(), z.string()),
});

export const attachImageSchema = z.object({
  key: z.string().min(1).max(300),
  alt: z
    .object({ en: z.string().trim().min(1).max(200), vi: z.string().trim().max(200).optional() })
    .optional(),
});
export type AttachImageDto = z.infer<typeof attachImageSchema>;

export const removeImageQuerySchema = z.object({ key: z.string().min(1).max(300) });
export type RemoveImageQuery = z.infer<typeof removeImageQuerySchema>;
