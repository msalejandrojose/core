import { useRef, useState, type ReactNode } from 'react';
import { swipeStep } from './day-swipe';
import { tapSuccess } from '../haptics';

interface DaySwipeProps {
  /** Día de los datos que se enseñan: al llegar los del nuevo, entran desde ese lado. */
  day: string;
  /** No se puede ir más allá de hoy. */
  canGoNext: boolean;
  onStep: (delta: -1 | 1) => void;
  children: ReactNode;
}

/**
 * Envoltorio que deja deslizar su contenido para cambiar de día: hacia la
 * derecha, el anterior; hacia la izquierda, el siguiente. Sigue al dedo
 * mientras arrastras y, si no hay día siguiente, se resiste como un tope.
 * El scroll vertical de la pantalla no se toca (`touch-action: pan-y`).
 */
export function DaySwipe({ day, canGoNext, onStep, children }: DaySwipeProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const [dx, setDx] = useState(0);
  const [enter, setEnter] = useState<'left' | 'right' | null>(null);

  function end(x: number, y: number) {
    const s = start.current;
    start.current = null;
    horizontal.current = false;
    setDx(0);
    if (!s) return;
    const step = swipeStep(x - s.x, y - s.y);
    if (!step || (step === 1 && !canGoNext)) return;
    setEnter(step === 1 ? 'right' : 'left');
    void tapSuccess();
    onStep(step);
  }

  return (
    <div
      className="day-swipe"
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        const s = start.current;
        if (!s) return;
        const t = e.touches[0];
        const mx = t.clientX - s.x;
        const my = t.clientY - s.y;
        if (!horizontal.current && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) horizontal.current = true;
        if (!horizontal.current) return;
        // Hacia el futuro sin día siguiente: tope con resistencia.
        const blocked = mx < 0 && !canGoNext;
        setDx(blocked ? mx / 6 : mx / 2.5);
      }}
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        end(t.clientX, t.clientY);
      }}
      onTouchCancel={() => {
        start.current = null;
        horizontal.current = false;
        setDx(0);
      }}
    >
      <div
        key={day}
        className={`day-swipe__inner${dx ? ' is-dragging' : ''}${enter ? ` enter-${enter}` : ''}`}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onAnimationEnd={() => setEnter(null)}
      >
        {children}
      </div>
    </div>
  );
}
