import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { KpiUnit } from './format-kpi';

/** Un KPI del resumen del dashboard (`GET /dashboard/summary`, DASH-01). */
export interface KpiItem {
  slug: string;
  label: string;
  value: number;
  unit?: KpiUnit;
  format?: 'integer' | 'decimal';
}

type Status = 'loading' | 'ready' | 'error';

export interface UseDashboardSummary {
  kpis: KpiItem[];
  status: Status;
  reload: () => Promise<void>;
}

/**
 * Resumen de KPIs para la home. Consume el endpoint precomputado
 * `GET /dashboard/summary`, que ya devuelve etiqueta + valor por KPI (una sola
 * llamada, sin catálogo + batch aparte).
 *
 * El schema OpenAPI tipado no incluye las rutas de dashboard en este paquete
 * (igual que en el backoffice), así que accedemos al cliente con un cast
 * puntual. El patrón de estado (load/reload) es el mismo del inbox.
 */
export function useDashboardSummary(): UseDashboardSummary {
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data, error } = await (
        apiClient as unknown as {
          GET: (path: string) => Promise<{
            data?: { kpis?: KpiItem[] };
            error?: unknown;
          }>;
        }
      ).GET('/dashboard/summary');
      if (error || !data) {
        setStatus('error');
        return;
      }
      setKpis(data.kpis ?? []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { kpis, status, reload: load };
}
