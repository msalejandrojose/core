import { formatGrams, ratio } from './format';
import type { DayTotals, RitmoProfile } from './api';

interface MacroBarsProps {
  totals: DayTotals;
  profile: RitmoProfile | null;
}

/**
 * Las tres barras de macros sobre su objetivo. Si el perfil no tiene objetivos
 * calculados (onboarding a medias) se muestran los gramos sin barra: un
 * progreso sobre un objetivo inexistente sería una barra que miente.
 */
export function MacroBars({ totals, profile }: MacroBarsProps) {
  const macros = [
    {
      key: 'protein',
      name: 'Proteína',
      value: totals.proteinG,
      target: profile?.proteinTargetG ?? null,
    },
    {
      key: 'carbs',
      name: 'Hidratos',
      value: totals.carbsG,
      target: profile?.carbsTargetG ?? null,
    },
    {
      key: 'fat',
      name: 'Grasa',
      value: totals.fatG,
      target: profile?.fatTargetG ?? null,
    },
  ];

  return (
    <div className="ritmo-macros">
      {macros.map((macro) => (
        <div key={macro.key} className={`ritmo-macro ritmo-macro--${macro.key}`}>
          <div className="ritmo-macro__head">
            <span className="ritmo-macro__name">{macro.name}</span>
            <span className="ritmo-macro__value">
              {macro.target
                ? `${Math.round(macro.value)} / ${macro.target} g`
                : formatGrams(macro.value)}
            </span>
          </div>
          <div className="ritmo-macro__track">
            <div
              className="ritmo-macro__fill"
              style={{ width: `${ratio(macro.value, macro.target) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
