import { Link } from 'react-router-dom';
import type { DaySummary, BrioProfile } from './api';
import { formatKcal } from './format';
import { useRegisterStore } from './register.store';
import { CheckCircle, Chevron, Ring } from './ui/kit';
import './today.css';

function notificationsOn(): boolean {
  return (
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
}

/**
 * Hoy · primer día (lienzo "Hoy · primer día"): cuatro pasos para empezar y
 * las kcal que tocan hoy. Cada paso se marca con datos reales: avisos
 * activados, primera comida registrada, objetivo calculado. Planificar la
 * semana se marcará cuando exista el plan.
 */
export function FirstDay({
  profile,
  summary,
}: {
  profile: BrioProfile | null;
  summary: DaySummary;
}) {
  const openRegister = useRegisterStore((s) => s.open);
  const target = profile?.dailyKcalTarget ?? null;

  const steps = [
    {
      title: 'Conecta tus datos',
      desc: 'Avisos, Salud y Garmin',
      done: notificationsOn(),
      to: '/alta/conectar',
    },
    {
      title: 'Registra tu primera comida',
      desc: 'Buscando o escribiendo lo que has comido',
      done: summary.meals.length > 0,
      onClick: () => openRegister('meal'),
    },
    {
      title: 'Fija un objetivo',
      desc: 'Peso y ritmo semanal',
      done: target !== null,
      to: '/tabs/progress/objetivos/nuevo',
    },
    {
      title: 'Planifica tu semana',
      desc: 'Elige tus entrenos y te sale la dieta',
      done: false,
      to: '/tabs/plan',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <section aria-labelledby="empieza" className="rk-hero firstday">
        <div className="today-now__text">
          <span id="empieza" className="today-now__title">
            Te damos la bienvenida a Brío
          </span>
          <span className="today-now__body">
            Cuatro pasos para que la app trabaje por ti. Llevas {doneCount} de
            4.
          </span>
        </div>
        <div className="firstday__bars" aria-hidden="true">
          {steps.map((s) => (
            <span key={s.title} className={s.done ? 'is-done' : undefined} />
          ))}
        </div>
        <ul className="firstday__steps">
          {steps.map((s) => {
            const inner = (
              <>
                <CheckCircle on={s.done} color="var(--brio-activity)" />
                <span className="rk-row__main">
                  <span
                    className={`firstday__title${s.done ? ' is-done' : ''}`}
                  >
                    {s.title}
                  </span>
                  <span className="rk-row__sub">{s.desc}</span>
                </span>
                {s.done ? null : <Chevron />}
              </>
            );
            return (
              <li key={s.title}>
                {s.to ? (
                  <Link to={s.to} className="firstday__step">
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="firstday__step"
                    onClick={s.onClick}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Calorías de hoy" className="today-row today-kcal">
        <Ring size={52} ratio={0} color="var(--brio-food)" />
        <span className="rk-row__main">
          <span className="today-kcal__value">
            {target !== null
              ? `${formatKcal(target)} kcal para hoy`
              : 'Tus kcal de hoy'}
          </span>
          <span className="firstday__note">
            {target !== null
              ? 'Calculado con tu perfil. Sube los días que entrenas.'
              : 'Completa tu perfil para calcularlas.'}
          </span>
        </span>
      </section>

      <p className="firstday__footer">
        Mañana esta pantalla te dirá qué toca en cada momento del día.
      </p>
    </>
  );
}
