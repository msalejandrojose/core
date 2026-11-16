import { useRef } from 'react';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useDockStore } from './dock.store';

const HOLD_MS = 350;
const CANCEL_PX = 60;

/**
 * Botón central de la barra. Toque: abre el campo del coach. Mantener: sube y
 * escucha; al soltar se manda y, deslizando hacia abajo, se cancela.
 *
 * Como el + de antes, se marca `isTabButton` para que `IonTabBar` le deje su
 * hueco, y no usa el `onClick` que inyecta la barra (cambiaría de pestaña).
 */
export function CoachOrb({ tab }: { tab: string }) {
  const mode = useDockStore((s) => s.mode);
  const timer = useRef<number | undefined>(undefined);
  const startY = useRef(0);
  const held = useRef(false);

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (mode === 'sending') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      void useDockStore.getState().startListening();
    }, HOLD_MS);
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (held.current) useDockStore.getState().armCancel(e.clientY - startY.current > CANCEL_PX);
  };
  const up = () => {
    window.clearTimeout(timer.current);
    const dock = useDockStore.getState();
    if (held.current) {
      held.current = false;
      if (dock.mode === 'listening') void dock.finishListening();
      return;
    }
    if (dock.mode === 'typing') dock.close();
    else if (dock.mode === 'idle') dock.openComposer();
  };
  const cancel = () => {
    window.clearTimeout(timer.current);
    if (held.current) useDockStore.getState().close();
    held.current = false;
  };

  return (
    <button
      type="button"
      data-tab={tab}
      className={`brio-orb brio-orb--${mode}`}
      aria-label="Coach: toca para escribirle, mantén para hablarle"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="brio-orb__glass">
        <Icon d={PATHS.spark} size={22} stroke={2} />
      </span>
    </button>
  );
}
CoachOrb.isTabButton = true;
