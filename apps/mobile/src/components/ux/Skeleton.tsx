import type { CSSProperties } from 'react';
import './skeleton.css';

interface SkeletonProps {
  /** Alto de la barra en px (default 16). */
  height?: number;
  /** Ancho CSS (default 100%). Útil para simular líneas de distinta longitud. */
  width?: string | number;
  /** Radio del borde en px (default 6). Usa `9999` para círculos/avatares. */
  radius?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * Barra de carga (shimmer) sobre superficie. Es la primitiva base del DS para el
 * rendimiento percibido: nunca spinner a pantalla completa, siempre skeletons
 * que anticipan la forma del contenido (DS §1b). Colócala dentro de un
 * `SkeletonGroup` (o `.core-group`) para que herede la superficie `card`.
 */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = 6,
  style,
  className,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`core-skeleton${className ? ` ${className}` : ''}`}
      style={{ height, width, borderRadius: radius, ...style }}
    />
  );
}

interface SkeletonListProps {
  /** Número de filas skeleton (default 4). */
  rows?: number;
}

/**
 * Grupo de filas skeleton sobre una tarjeta agrupada, imitando un `IonList`
 * inset mientras carga. Sustituye a los bloques skeleton inline que se repetían
 * en la home y el inbox.
 */
export function SkeletonList({ rows = 4 }: SkeletonListProps) {
  return (
    <div
      className="core-group"
      style={{ padding: '4px 0' }}
      role="status"
      aria-label="Cargando…"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px',
          }}
        >
          <Skeleton height={36} width={36} radius={12} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <Skeleton height={15} width={`${65 - i * 6}%`} />
            <Skeleton height={12} width={`${40 + i * 5}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}
