import { useEffect, useRef, useState } from 'react';
import { useIslandStore, type IslandToast, type ToastKind } from '@/lib/toast';
import './island-toaster.css';

/** Forma de arriba del móvil, deducida del safe-area: isla, notch o nada. */
type Cutout = 'island' | 'notch' | 'none';

function detectCutout(): Cutout {
  if (typeof document === 'undefined') return 'none';
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(probe);
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  // iPhone con Dynamic Island: 54–62 pt; con notch: 44–50 pt.
  if (top >= 51) return 'island';
  if (top >= 40) return 'notch';
  return 'none';
}

const ICON: Record<ToastKind, string> = {
  success: 'M5 12.5l4.5 4.5L19 7.5',
  error: 'M7 7l10 10M17 7L7 17',
  warning: 'M12 6v8M12 18h.01',
  info: 'M12 11v6M12 7h.01',
};

const LABEL: Record<ToastKind, string> = {
  success: 'Hecho',
  error: 'Error',
  warning: 'Aviso',
  info: 'Información',
};

/**
 * Avisos de arriba que salen de la Dynamic Island (o del notch): una píldora
 * negra que crece desde la forma del móvil, enseña el mensaje y vuelve a
 * encogerse. Se cierra sola, al tocarla o deslizándola hacia arriba.
 */
export function IslandToaster() {
  const current = useIslandStore((s) => s.current);
  const dismiss = useIslandStore((s) => s.dismiss);
  const [cutout] = useState(detectCutout);
  const [item, setItem] = useState<IslandToast | null>(null);
  const [open, setOpen] = useState(false);
  const startY = useRef<number | null>(null);

  // Entra el nuevo (o cambia el texto si ya estaba abierta); al quitarse, se encoge.
  useEffect(() => {
    if (current) {
      setItem(current);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
    const t = window.setTimeout(() => setItem(null), 420);
    return () => window.clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => dismiss(current.id), current.duration);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);

  if (!item) return null;

  return (
    <div
      className={`island island--${cutout}${open ? ' is-open' : ''}`}
      role={item.kind === 'error' ? 'alert' : 'status'}
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      onClick={() => dismiss(item.id)}
      onTouchStart={(e) => {
        startY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const s = startY.current;
        startY.current = null;
        if (s !== null && s - e.changedTouches[0].clientY > 20) dismiss(item.id);
      }}
    >
      <div className="island__body" key={item.id}>
        <span className={`island__icon island__icon--${item.kind}`} aria-label={LABEL[item.kind]}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICON[item.kind]} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="island__text">
          <span className="island__title">{item.title}</span>
          {item.description ? <span className="island__desc">{item.description}</span> : null}
        </span>
      </div>
    </div>
  );
}
