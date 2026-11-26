import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SWIPE_ACTION_W, swipeRelease } from './done-workout';

/**
 * Fila que se desliza a la izquierda para dejar ver «Eliminar», como en iOS.
 * Deslizar casi hasta el final borra sin más; soltar a medias deja el botón
 * a la vista. El scroll vertical sigue funcionando (`touch-action: pan-y`) y un
 * arrastre no cuenta como toque en la fila.
 */
export function SwipeRow({
  children,
  onDelete,
  label = 'Eliminar',
  disabled = false,
}: {
  children: ReactNode;
  onDelete: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const row = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'x' | 'y' | null>(null);
  const dragged = useRef(false);
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);

  // Al tocar fuera, se vuelve a cerrar.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function reset() {
    start.current = null;
    axis.current = null;
    setDx(0);
  }

  const offset = (open ? -SWIPE_ACTION_W : 0) + dx;

  return (
    <div ref={row} className={`swipe-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="swipe-row__action"
        style={{ width: Math.max(SWIPE_ACTION_W, -offset) }}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        onClick={() => {
          setOpen(false);
          onDelete();
        }}
      >
        {label}
      </button>
      <div
        className={`swipe-row__content${dx ? ' is-dragging' : ''}`}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onTouchStart={(e) => {
          if (disabled) return;
          const t = e.touches[0];
          start.current = { x: t.clientX, y: t.clientY };
          axis.current = null;
          dragged.current = false;
        }}
        onTouchMove={(e) => {
          const s = start.current;
          if (!s) return;
          const t = e.touches[0];
          const mx = t.clientX - s.x;
          const my = t.clientY - s.y;
          if (!axis.current && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
            axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
          }
          if (axis.current !== 'x') return;
          dragged.current = true;
          // Hacia la derecha solo se puede cerrar; más allá, con resistencia.
          const base = open ? -SWIPE_ACTION_W : 0;
          const next = base + mx;
          setDx((next > 0 ? next / 4 : next) - base);
        }}
        onTouchEnd={() => {
          if (axis.current === 'x') {
            const result = swipeRelease(dx, row.current?.offsetWidth ?? 0, open);
            if (result === 'delete') {
              setOpen(false);
              onDelete();
            } else setOpen(result === 'open');
          }
          reset();
        }}
        onTouchCancel={reset}
        onClickCapture={(e) => {
          // Un arrastre no abre la fila; y con el botón a la vista, tocar la cierra.
          if (dragged.current || open) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
            if (open) setOpen(false);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
