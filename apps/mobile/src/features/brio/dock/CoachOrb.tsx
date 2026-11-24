import { useRef } from 'react';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useRegisterStore } from '../register.store';
import { useDockStore } from './dock.store';

const HOLD_MS = 350;
const CANCEL_PX = 60;
/** Deslizar hacia arriba desde el orbe también empieza a escuchar. */
const SWIPE_UP_PX = 24;

/**
 * El + del centro de la barra (TASK-428). Toque: abre «Registrar», la hoja de
 * accesos rápidos (comida, agua, entreno, peso… y el coach), sin teclado.
 * Mantener o deslizar hacia arriba: sube y escucha al coach; al soltar se
 * lleva a su chat y, deslizando hacia abajo, se cancela.
 *
 * Como el + de antes, se marca `isTabButton` para que `IonTabBar` le deje su
 * hueco, y no usa el `onClick` que inyecta la barra (cambiaría de pestaña).
 */
export function CoachOrb({ tab }: { tab: string }) {
  const mode = useDockStore((s) => s.mode);
  const timer = useRef<number | undefined>(undefined);
  const startY = useRef(0);
  const held = useRef(false);

  // El «soltar» se escucha también en la ventana: si el dedo sale del botón o
  // el sistema se queda la pulsación, la burbuja no se puede quedar abierta.
  const release = useRef<() => void>(() => undefined);

  const end = (cancelled: boolean) => {
    window.clearTimeout(timer.current);
    window.removeEventListener('pointerup', release.current);
    window.removeEventListener('pointercancel', release.current);
    const dock = useDockStore.getState();
    if (held.current) {
      held.current = false;
      if (cancelled) dock.close();
      else void dock.finishListening();
      return;
    }
    if (cancelled) return;
    if (dock.mode !== 'idle') {
      dock.close();
      return;
    }
    const register = useRegisterStore.getState();
    if (register.sheet === 'menu') register.close();
    else register.open('menu');
  };

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (mode === 'sending') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura también vale: está el respaldo de la ventana.
    }
    startY.current = e.clientY;
    held.current = false;
    release.current = () => end(false);
    window.addEventListener('pointerup', release.current, { once: true });
    window.addEventListener('pointercancel', release.current, { once: true });
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      held.current = true;
      void useDockStore.getState().startListening();
    }, HOLD_MS);
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!held.current && timer.current !== undefined && startY.current - e.clientY > SWIPE_UP_PX) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
      held.current = true;
      void useDockStore.getState().startListening();
      return;
    }
    if (held.current) useDockStore.getState().armCancel(e.clientY - startY.current > CANCEL_PX);
  };

  return (
    <button
      type="button"
      data-tab={tab}
      className={`brio-orb brio-orb--${mode}`}
      aria-label="Registrar: comida, agua, entreno, peso o coach. Mantén pulsado para hablar con el coach"
      onPointerDown={down}
      onPointerMove={move}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="brio-orb__glass">
        <Icon d={PATHS.plus} size={24} stroke={2.4} />
        <span className="brio-orb__mic" aria-hidden="true">
          <Icon d={PATHS.mic} size={9} stroke={2.6} />
        </span>
      </span>
    </button>
  );
}
CoachOrb.isTabButton = true;
