import type { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import { PATHS } from './paths';
import './kit.css';

/**
 * Piezas que se repiten en todas las pantallas del diseño de Ritmo, con la
 * misma anatomía que el lienzo: enlaces de volver en `tint`, título grande,
 * barra de hoja "Cancelar · Título · Acción", cabeceras de sección, contador
 * ±, buscador, segmentado, interruptor y anillo. Cada pantalla compone esto
 * en vez de repetir estilos.
 */

/* ------------------------------- Iconos ---------------------------------- */

/** Icono de trazo del diseño: 24×24, extremos redondeados, `currentColor`. */
export function Icon({
  d,
  size = 22,
  stroke = 2,
  fill = 'none',
  className,
}: {
  d: string;
  size?: number;
  stroke?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}


export function Chevron() {
  return <Icon d={PATHS.forward} size={13} stroke={3} className="rk-chevron" />;
}

/* ----------------------------- Navegación -------------------------------- */

/** "‹ Hoy": vuelve atrás si hay historial, si no a `fallback`. */
export function BackLink({ label, fallback }: { label: string; fallback: string }) {
  const history = useHistory();
  return (
    <button
      type="button"
      className="rk-back"
      onClick={() => (history.length > 1 ? history.goBack() : history.replace(fallback))}
    >
      <Icon d={PATHS.back} size={20} stroke={2.4} />
      {label}
    </button>
  );
}

/** Fila superior de una pantalla: volver a la izquierda y acciones a la derecha. */
export function NavRow({ back, actions }: { back?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rk-navrow">
      <div>{back}</div>
      <div className="rk-navrow__actions">{actions}</div>
    </div>
  );
}

export function LargeTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="rk-title">
      <h1>{children}</h1>
      {sub ? <span className="rk-title__sub">{sub}</span> : null}
    </header>
  );
}

/** Barra de hoja modal: asa, "Cancelar · Título · Acción". */
export function SheetBar({
  title,
  onCancel,
  cancelLabel = 'Cancelar',
  action,
}: {
  title: string;
  onCancel: () => void;
  cancelLabel?: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div className="rk-sheetbar">
      <button type="button" className="rk-textbtn" onClick={onCancel}>
        {cancelLabel}
      </button>
      <span className="rk-sheetbar__title">{title}</span>
      {action ? (
        <button
          type="button"
          className="rk-textbtn rk-textbtn--strong rk-sheetbar__end"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

export function SectionHeader({ children, id, action }: { children: ReactNode; id?: string; action?: ReactNode }) {
  return (
    <div className="rk-sechead">
      <h2 id={id}>{children}</h2>
      {action}
    </div>
  );
}

/* ------------------------------ Controles -------------------------------- */

export function Stepper({
  value,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  value: ReactNode;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <div className="rk-stepper">
      <button type="button" aria-label={minusLabel} onClick={onMinus}>
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label={plusLabel} onClick={onPlus}>
        +
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  small,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
}) {
  return (
    <div
      className={`rk-seg${small ? ' rk-seg--small' : ''}`}
      role="group"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  autoFocus,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="rk-search">
      <Icon d={PATHS.search} size={17} stroke={2.4} />
      <span className="rk-visually-hidden">{label}</span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

/** Interruptor del DS (51×31, verde `activity` encendido). */
export function Switch({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`rk-switch${on ? ' rk-switch--on' : ''}`}>
      <span />
    </span>
  );
}

/** Casilla redonda del diseño: círculo gris vacío o relleno con check. */
export function CheckCircle({ on, color = 'var(--ritmo-tint)' }: { on: boolean; color?: string }) {
  return on ? (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={color} />
      <path d={PATHS.check} fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--ritmo-border-strong)" strokeWidth="1.8" />
    </svg>
  );
}

/** Anillo de progreso (viewBox 104, radio 42), arco desde arriba. */
export function Ring({
  size,
  ratio,
  color,
  stroke = 14,
  radius = 42,
  children,
  label,
}: {
  size: number;
  ratio: number;
  color: string;
  stroke?: number;
  radius?: number;
  children?: ReactNode;
  label?: string;
}) {
  const c = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, ratio)) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 104 104"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: 'none' }}
    >
      <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--ritmo-bg)" strokeWidth={stroke} />
      {dash > 0 ? (
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 52 52)"
        />
      ) : null}
      {children}
    </svg>
  );
}

/**
 * Marca de "datos de ejemplo" para los bloques que aún no tienen fuente real
 * (Garmin, plan, recetas…). Sin ella, una cifra inventada se leería como tuya.
 */
export function ExampleTag() {
  return <span className="rk-example">Ejemplo</span>;
}
