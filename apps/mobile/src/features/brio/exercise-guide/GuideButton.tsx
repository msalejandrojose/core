import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import './exercise-guide.css';

/** Botón redondo «i» para abrir la ficha de un ejercicio. */
export function GuideButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" className="exguide__btn" aria-label={`Cómo se hace: ${name}`} onClick={onClick}>
      <Icon d={PATHS.info} size={18} stroke={2.2} />
    </button>
  );
}
