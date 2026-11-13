/** Periodos que se pueden pedir a los motores de rendimiento. */
export const PERFORMANCE_PERIODS = ['7d', '30d', '90d', '6m', 'all'] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

const DAYS: Record<PerformancePeriod, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  all: null,
};

/** Días del periodo; null = histórico completo. */
export function periodDays(period: PerformancePeriod): number | null {
  return DAYS[period];
}
