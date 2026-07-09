import { ErrorState, Skeleton } from '@/components/ux';
import { formatKpiValue } from './format-kpi';
import { useDashboardSummary, type KpiItem } from './use-dashboard-summary';

/** Una tarjeta KPI: etiqueta muted arriba, valor grande con cifras tabulares. */
function KpiTile({ kpi }: { kpi: KpiItem }) {
  return (
    <div
      className="core-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--core-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {kpi.label}
      </span>
      <span
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--ion-text-color)',
        }}
      >
        {formatKpiValue(kpi.value, kpi.unit)}
      </span>
    </div>
  );
}

function KpiTilesSkeleton() {
  return (
    <div
      className="kpi-grid"
      role="status"
      aria-label="Cargando indicadores…"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="core-card"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <Skeleton height={12} width="60%" />
          <Skeleton height={24} width="45%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Rejilla de indicadores (KPIs) de la home. Resuelve sus propios estados:
 * skeleton mientras carga, error con reintento, y —si el usuario no tiene KPIs
 * visibles— no pinta nada para no ensuciar la pantalla. Encabeza el bloque con
 * una etiqueta de sección tipo iOS, salvo en el estado vacío.
 */
export function KpiTiles() {
  const { kpis, status, reload } = useDashboardSummary();

  if (status === 'ready' && kpis.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <p className="core-section-label">Resumen</p>

      {status === 'loading' ? (
        <KpiTilesSkeleton />
      ) : status === 'error' ? (
        <ErrorState
          message="No se pudieron cargar los indicadores."
          onRetry={() => void reload()}
        />
      ) : (
        <div
          className="kpi-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          {kpis.map((kpi) => (
            <KpiTile key={kpi.slug} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}
