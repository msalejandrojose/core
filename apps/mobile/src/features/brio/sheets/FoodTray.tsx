import type { ReactNode } from 'react';
import { formatKcal } from '../format';
import type { RelogItem } from '../relog';
import { FoodIcon } from '../ui/food-icons';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';

export interface TrayItem extends RelogItem {
  key: string;
}

/** Suma de kcal y macros de lo elegido. */
export function trayTotals(items: TrayItem[]) {
  return items.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.proteinG, carbs: t.carbs + i.carbsG, fat: t.fat + i.fatG }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Bandeja con lo que vas a añadir (TASK-432): cada alimento con su cantidad,
 * kcal, ración (−/+) y una ✕ para quitarlo, y abajo el total con los macros.
 */
export function FoodTray({
  title,
  items,
  portionFor,
  onRemove,
  onClear,
}: {
  title: string;
  items: TrayItem[];
  portionFor?: (it: TrayItem) => ReactNode;
  onRemove: (key: string) => void;
  onClear?: () => void;
}) {
  const t = trayTotals(items);
  return (
    <section className="addfood__tray" aria-labelledby="bandeja">
      <div className="addfood__tray-head">
        <span id="bandeja" className="addfood__tray-title">
          {title}
        </span>
        {onClear ? (
          <button type="button" className="rk-textbtn" onClick={onClear}>
            Vaciar
          </button>
        ) : null}
      </div>
      <ul className="addfood__tray-list">
        {items.map((it) => (
          <li key={it.key} className="addfood__tray-item">
            <FoodIcon name={it.name} size={36} />
            <span className="rk-row__main">
              <span className="rk-row__title">{it.name}</span>
              <span className="rk-row__sub">
                {it.foodId || it.quantityG > 1 ? `${formatKcal(it.quantityG)} g · ` : ''}
                {formatKcal(it.kcal)} kcal
              </span>
            </span>
            {portionFor?.(it)}
            <button type="button" className="addfood__tray-remove" aria-label={`Quitar ${it.name}`} onClick={() => onRemove(it.key)}>
              <Icon d={PATHS.close} size={14} stroke={2.6} />
            </button>
          </li>
        ))}
      </ul>
      <div className="addfood__tray-total" aria-label={`Total: ${formatKcal(t.kcal)} kcal`}>
        <span>
          <strong>{formatKcal(t.kcal)}</strong> kcal
        </span>
        <span>P {formatKcal(t.protein)} g</span>
        <span>HC {formatKcal(t.carbs)} g</span>
        <span>G {formatKcal(t.fat)} g</span>
      </div>
    </section>
  );
}
