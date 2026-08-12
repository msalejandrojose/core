import { apiFetch } from './api';

export interface BlogCategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  coverImageId: string | null;
  coverImageUrl: string | null;
  viewCount: number;
  category: BlogCategoryRef | null;
  tags: BlogTag[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost extends BlogPostSummary {
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  author: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

interface ListPostsOptions {
  cursor?: string;
  limit?: number;
  categorySlug?: string;
  tagSlug?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function getPublishedPosts(
  opts: ListPostsOptions = {},
): Promise<CursorPage<BlogPostSummary>> {
  const query = buildQuery({
    cursor: opts.cursor,
    limit: opts.limit,
    categorySlug: opts.categorySlug,
    tagSlug: opts.tagSlug,
  });
  return apiFetch<CursorPage<BlogPostSummary>>(`/blog/public/posts${query}`);
}

// Trae TODOS los posts publicados recorriendo el cursor. Pensado para build
// time (SSG): un solo fetch inicial por deploy, no hay coste en runtime.
export async function getAllPublishedPosts(
  opts: Omit<ListPostsOptions, 'cursor'> = {},
): Promise<BlogPostSummary[]> {
  const posts: BlogPostSummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await getPublishedPosts({ ...opts, cursor, limit: 50 });
    posts.push(...page.data);
    cursor = page.meta.hasMore ? (page.meta.nextCursor ?? undefined) : undefined;
  } while (cursor);
  return posts;
}

export async function getPublishedPost(slug: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(`/blog/public/posts/${encodeURIComponent(slug)}`);
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  return apiFetch<BlogCategory[]>('/blog/public/categories');
}

export async function getBlogTags(): Promise<BlogTag[]> {
  return apiFetch<BlogTag[]>('/blog/public/tags');
}
