export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OffsetMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
