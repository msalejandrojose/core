import { z } from 'zod';

export const StorageDriverNameSchema = z.enum(['LOCAL', 'S3', 'GCS']);
export type StorageDriverName = z.infer<typeof StorageDriverNameSchema>;

export const StoredFileStatusSchema = z.enum(['PENDING', 'READY']);
export type StoredFileStatus = z.infer<typeof StoredFileStatusSchema>;
