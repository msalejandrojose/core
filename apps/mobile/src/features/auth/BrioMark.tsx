/** Icono de Brío del diseño: arco verde sobre cuadrado oscuro. */
export function BrioMark({ size = 88 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: 'var(--brio-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="3" strokeLinecap="round">
        <path d="M12 4a8 8 0 1 1-7.4 5" />
      </svg>
    </span>
  );
}
