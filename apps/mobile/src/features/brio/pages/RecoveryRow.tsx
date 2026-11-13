import { Link } from 'react-router-dom';
import { Chevron } from '../ui/kit';
import { LEVEL_LABEL, optionText, useRecovery } from './recovery.api';

/** Fila "Recuperación" de Hoy: la puntuación y, si conviene, qué mirar de mañana. */
export function RecoveryRow() {
  const { data } = useRecovery();
  if (!data || data.score === null || !data.level) return null;
  const recommended = data.options.find((o) => o.recommended);
  const sub =
    recommended && recommended.id !== 'KEEP'
      ? `Para mañana: ${optionText(recommended, data).title.toLowerCase()}`
      : data.hasHealthData
        ? 'Según tu reloj y tu carga'
        : 'Según tu carga de entrenamiento';
  return (
    <Link to="/tabs/today/recuperacion" className="today-row">
      <span className="today-recovery" aria-hidden="true">
        {data.score}
      </span>
      <span className="rk-row__main">
        <span className="today-row__title">Recuperación {LEVEL_LABEL[data.level].toLowerCase()}</span>
        <span className="rk-row__sub">{sub}</span>
      </span>
      <Chevron />
    </Link>
  );
}
