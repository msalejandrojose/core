import { useEffect, useMemo, useState } from 'react';
import { ExerciseFigure } from './ExerciseFigure';
import { partsFor } from './parts';
import { phase, poseAt, solvePose, type Motion } from './motion';
import { motionFor } from './motions';
import './exercise-guide.css';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Avance del movimiento (0 a 1) en bucle mientras está montado y en marcha. */
function useLoop(motion: Motion | null, running: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!motion || !running) return;
    const ms = motion.ms ?? 3000;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setT(phase((now - start) / ms));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motion, running]);
  return t;
}

interface Props {
  code: string | null;
  /** Músculos principales, para resaltarlos en la figura. */
  primary: string[];
  /** Nombre del ejercicio, para el texto alternativo. */
  name: string;
}

/**
 * Figura que hace el ejercicio en bucle. Con «reducir movimiento» activado se
 * ven quietas las dos posiciones: inicio y final.
 */
export function ExerciseAnimation({ code, primary, name }: Props) {
  const motion = motionFor(code);
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const t = useLoop(motion, !reduced && !paused);
  const hot = useMemo(() => partsFor(primary), [primary]);

  if (!motion) return null;
  const view = motion.view ?? 'side';
  const label = `Animación de cómo se hace: ${name}`;

  if (reduced) {
    return (
      <div className="exanim exanim--still" role="img" aria-label={label}>
        <figure>
          <ExerciseFigure frame={solvePose(motion.a, view)} motion={motion} hot={hot} />
          <figcaption>Inicio</figcaption>
        </figure>
        <figure>
          <ExerciseFigure frame={solvePose(motion.b, view)} motion={motion} hot={hot} />
          <figcaption>Final</figcaption>
        </figure>
      </div>
    );
  }

  return (
    <div className="exanim">
      <button
        type="button"
        className="exanim__stage"
        aria-label={paused ? `${label}. En pausa; toca para reanudar.` : `${label}. Toca para pausar.`}
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
      >
        <ExerciseFigure frame={solvePose(poseAt(motion, t), view)} motion={motion} hot={hot} />
        {paused ? <span className="exanim__paused">En pausa</span> : null}
      </button>
    </div>
  );
}
