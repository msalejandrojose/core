/** Unidades de KPI que expone el resumen del dashboard (DASH-01). */
export type KpiUnit = 'count' | 'bytes' | 'percent';

/**
 * Formatea el valor de un KPI para mostrarlo, según su unidad. Misma lógica que
 * el `KpiCardWidget` del backoffice para que un mismo KPI se lea igual en las
 * dos apps:
 * - `bytes`  → tamaño humano (B/KB/MB/…).
 * - `percent`→ fracción 0..1 a porcentaje con un decimal.
 * - resto (`count`) → número con separadores de miles (es-ES).
 *
 * `null`/`undefined` se muestran como guion (KPI sin dato).
 */
export function formatKpiValue(
  value: number | null | undefined,
  unit?: KpiUnit,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  switch (unit) {
    case 'bytes':
      return formatBytes(value);
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toLocaleString('es-ES');
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
