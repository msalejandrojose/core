import type { Granularity } from '@core/shared-types';

export type { Granularity };

export interface Range {
  /** ISO date string (YYYY-MM-DD) */
  from: string;
  /** ISO date string (YYYY-MM-DD) */
  to: string;
}

export interface KpiSeriesPoint {
  /** Bucket start truncated to the requested granularity. */
  t: string;
  /** Count for the bucket, or null if unavailable. */
  v: number | null;
}

export interface KpiDefinition {
  /** Unique dot-separated identifier, e.g. 'users.total'. */
  slug: string;
  label: string;
  description?: string;
  /** Logical grouping for the UI. */
  category: string;
  unit: 'count' | 'bytes' | 'percent' | 'currency' | 'duration_ms';
  format?: 'integer' | 'decimal' | 'compact';
  /** 'scalar' for direct DB queries; 'computed' for derived expressions. */
  kind?: 'scalar' | 'computed';
  /** Returns the current aggregate value. */
  scalar: () => Promise<number | null>;
  /** Optional: time-series breakdown over a date range. */
  series?: (range: Range, granularity: Granularity) => Promise<KpiSeriesPoint[]>;
}
