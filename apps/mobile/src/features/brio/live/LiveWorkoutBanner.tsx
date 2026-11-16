import { Link } from 'react-router-dom';
import { clock, progress } from './live-workout';
import { useLiveStore } from './live.store';
import { useNow } from './useNow';
import './live.css';

/** Aviso en Hoy si hay un entreno a medias: vuelve a él con un toque. */
export function LiveWorkoutBanner() {
  const workout = useLiveStore((s) => s.workout);
  const now = useNow();
  if (!workout) return null;
  const p = progress(workout);
  return (
    <Link to="/tabs/today/entreno" className="live-banner">
      <span className="live-banner__dot" aria-hidden="true" />
      <span className="rk-row__main">
        <span className="live-banner__title">Entreno en curso · {workout.name}</span>
        <span className="live-banner__sub">
          {clock(now - workout.startedAt)} · {p.done}/{p.total} series
        </span>
      </span>
      <span className="live-banner__go">Seguir</span>
    </Link>
  );
}
