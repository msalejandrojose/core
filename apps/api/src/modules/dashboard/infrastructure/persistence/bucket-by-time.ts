import type { Granularity, KpiSeriesPoint } from '../../application/kpi-definition';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function truncate(date: Date, granularity: Granularity): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours();

  switch (granularity) {
    case 'hour':
      return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:00:00Z`;
    case 'day':
      return `${y}-${pad(m)}-${pad(d)}`;
    case 'week': {
      // Monday of the ISO week containing `date`
      const tmp = new Date(date);
      const dow = tmp.getUTCDay() || 7; // 1=Mon … 7=Sun
      tmp.setUTCDate(d - dow + 1);
      return `${tmp.getUTCFullYear()}-${pad(tmp.getUTCMonth() + 1)}-${pad(tmp.getUTCDate())}`;
    }
    case 'month':
      return `${y}-${pad(m)}`;
  }
}

function advance(bucket: string, granularity: Granularity): string {
  switch (granularity) {
    case 'hour': {
      const d = new Date(bucket);
      d.setUTCHours(d.getUTCHours() + 1);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00Z`;
    }
    case 'day': {
      const d = new Date(`${bucket}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    case 'week': {
      const d = new Date(`${bucket}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    case 'month': {
      const [year, month] = bucket.split('-').map(Number) as [number, number];
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return `${nextYear}-${pad(nextMonth)}`;
    }
  }
}

/**
 * Distributes an array of Date values into time buckets and returns a dense
 * series (including zero-count buckets) spanning from `from` to `to`.
 */
export function bucketByTime(
  dates: Date[],
  from: Date,
  to: Date,
  granularity: Granularity,
): KpiSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = truncate(d, granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: KpiSeriesPoint[] = [];
  let cur = truncate(from, granularity);
  const end = truncate(to, granularity);

  while (cur <= end) {
    points.push({ t: cur, v: counts.get(cur) ?? 0 });
    cur = advance(cur, granularity);
  }

  return points;
}
