import { Link } from 'react-router-dom';
import { Chevron, Icon } from '../ui/kit';

/** Progreso ya no es una pestaña (TASK-428): objetivos, peso, medallas e informes, desde Hoy. */
export function ProgressRow() {
  return (
    <div className="rk-list today-progress">
      <Link to="/tabs/progress" className="rk-row">
        <span className="today-progress__icon" aria-hidden="true">
          <Icon d="M5 20V11M12 20V5M19 20v-6" size={20} stroke={2.4} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Tu progreso</span>
          <span className="rk-row__sub">Objetivos, peso, medallas e informes</span>
        </span>
        <Chevron />
      </Link>
    </div>
  );
}
