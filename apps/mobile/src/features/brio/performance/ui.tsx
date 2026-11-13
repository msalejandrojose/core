import type { ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { ErrorState, SkeletonList } from '@/components/ux';
import { BackLink, LargeTitle, NavRow } from '../ui/kit';
import '../progress/progress.css';
import './performance.css';

type Tone = 'good' | 'warn' | 'bad' | 'muted' | 'tint';

/** Etiqueta de estado (progresando, estancado…). */
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`perf__chip perf__chip--${tone}`}>{children}</span>;
}

/** Marca lo que es una estimación, igual que «Ejemplo» marca los datos de muestra. */
export function Estimated() {
  return <span className="perf__est">Estimación</span>;
}

/** Tesela de cifra, con el mismo estilo que las de Progreso. */
export function Tile({ label, value, unit, note }: { label: string; value: ReactNode; unit?: string; note?: ReactNode }) {
  return (
    <div className="progress__tile">
      <span className="progress__tile-k">{label}</span>
      <span className="progress__tile-v">
        {value}
        {unit ? <span> {unit}</span> : null}
      </span>
      {note ? <span className="progress__tile-n">{note}</span> : null}
    </div>
  );
}

/** Barra horizontal de 0 a 1. */
export function Bar({ value, color = 'var(--brio-tint)' }: { value: number; color?: string }) {
  return (
    <div className="perf__bar" aria-hidden="true">
      <div style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
    </div>
  );
}

/** Columnas verticales (semanas). La última va resaltada. */
export function Columns({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="perf__cols" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span
          key={i}
          className={i === values.length - 1 ? 'is-last' : undefined}
          style={{ height: `${Math.max(3, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

/** Página de rendimiento: navegación, título y los estados de carga y error. */
export function PerfPage<T>({
  title,
  sub,
  back = { label: 'Rendimiento', to: '/tabs/progress/rendimiento' },
  data,
  error,
  onRetry,
  header,
  children,
}: {
  title: string;
  sub?: string;
  back?: { label: string; to: string };
  data: T | null;
  error: boolean;
  onRetry: () => void;
  header?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen perf">
          <NavRow back={<BackLink label={back.label} fallback={back.to} />} />
          <LargeTitle sub={sub}>{title}</LargeTitle>
          {header}
          {error ? (
            <div className="rk-card">
              <ErrorState message="No se pudo cargar. Comprueba la conexión." onRetry={onRetry} />
            </div>
          ) : data === null ? (
            <SkeletonList rows={4} />
          ) : (
            children(data)
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Bloque vacío con una frase, para cuando aún no hay datos. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rk-card perf__empty">{children}</p>;
}
