export const POST_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

/** Fila del listado de posts (versión resumida, sin `content`). */
export interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: PostStatus;
  publishedAt: string | null;
  category: { id: string; slug: string; name: string } | null;
  tags: { id: string; slug: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
}

export interface TagRow {
  id: string;
  slug: string;
  name: string;
}
