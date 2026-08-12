import { z } from 'zod';

export const PostStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']);
export type PostStatus = z.infer<typeof PostStatusSchema>;
export const POST_STATUSES = PostStatusSchema.options;

export function canPublish(from: PostStatus): boolean {
  return from === 'DRAFT' || from === 'SCHEDULED' || from === 'ARCHIVED' || from === 'PUBLISHED';
}

export function canArchive(from: PostStatus): boolean {
  return from !== 'ARCHIVED';
}

// Visible en el sitio público: PUBLISHED, o SCHEDULED cuya fecha ya venció.
export function isVisible(status: PostStatus, publishedAt: Date | null): boolean {
  if (status === 'PUBLISHED') return true;
  return status === 'SCHEDULED' && publishedAt !== null && publishedAt.getTime() <= Date.now();
}
