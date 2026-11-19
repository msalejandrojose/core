import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError, type BrioProfile } from '../api';
import { useBrioStore } from '../brio.store';
import { formatNumber } from '../format';
import { dailyDeltaKcal, etaLabel, goalSummary } from '../progress/weight-goal';
import { Chevron, Icon, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useRegisterStore } from '../register.store';
import { MEAL_LABEL, menuApi, type Meal, type MenuWeek } from './menu.api';
import { usePlanWeekData, type PlanLoad } from './plan.api';
import { LOAD_CLASS, LOAD_LABEL, dayFull, dayLetter, dayNumber, fmtMinutes } from './plan-labels';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

const kcal = (n: number) => formatNumber(n);

const BAR: Record<PlanLoad, string> = {
  HIGH: 'var(--brio-food)',
  MEDIUM: 'var(--brio-activity)',
  LOW: 'var(--brio-info)',
  REST: 'var(--brio-border-strong)',
};
/**
 * De dónde salen las calorías: tu objetivo de peso (peso meta + ritmo). No se
 * elige aquí: se fija en Progreso → Objetivos y esta tarjeta lleva allí.
 */
function GoalCard({ profile }: { profile: BrioProfile | null }) {
  if (!profile) return null;
  const g = goalSummary(profile);
  const tdee = profile.tdeeKcal;
  const delta = g.deltaKcal ?? dailyDeltaKcal(g.weeklyKg);
  const kg = (n: number) => formatNumber(n, Number.isInteger(n) ? 0 : 1);
  const pace = `${g.weeklyKg < 0 ? '−' : '+'}${formatNumber(Math.abs(g.weeklyKg), 2)} kg/semana`;
  const vsTdee =
    tdee === null
      ? null
      : delta === 0
        ? `Comes lo que gastas: ${kcal(tdee)} kcal.`
        : `${kcal(Math.abs(delta))} kcal/día ${delta < 0 ? 'por debajo' : 'por encima'} de tu gasto (${kcal(tdee)}).`;
  const title =
    g.kind === 'none'
      ? 'Sin objetivo de peso'
      : g.kind === 'maintain'
        ? `Mantener ${kg(g.targetKg ?? 0)} kg`
        : `${g.kind === 'lose' ? 'Bajar' : 'Subir'} a ${kg(g.targetKg ?? 0)} kg`;
  const sub =
    g.kind === 'none'
      ? 'Comes para mantener tu peso. Fija un peso objetivo y las calorías se ajustan solas.'
      : g.kind === 'maintain' || g.weeklyKg === 0
        ? (vsTdee ?? 'Comes lo que gastas.')
        : [[pace, g.etaWeeks ? `llegas hacia el ${etaLabel(g.etaWeeks)}` : null].filter(Boolean).join(' · '), vsTdee]
            .filter(Boolean)
            .join('\n');

  return (
    <Link
      to="/tabs/progress/objetivos/nuevo"
      className={`diet__goal${g.kind === 'none' ? ' is-empty' : ''}`}
      aria-label={`Tu objetivo: ${title}. ${sub.replace('\n', ' ')} ${g.kind === 'none' ? 'Fijar objetivo' : 'Cambiar objetivo'}`}
    >
      <span className="diet__goal-icon" aria-hidden="true">
        <Icon d={PATHS.scale} size={20} />
      </span>
      <span className="rk-row__main">
        <span className="diet__goal-label">Tu objetivo</span>
        <span className="diet__goal-title">{title}</span>
        <span className="diet__goal-sub">{sub}</span>
      </span>
      {g.kind === 'none' ? <span className="diet__goal-action">Fijar</span> : null}
      <Chevron />
    </Link>
  );
}

/**
 * Comida (antes «Dieta y menú»). Las calorías de cada día salen de tu objetivo
 * de peso (la tarjeta «Tu objetivo», que se cambia en Objetivos) y de la carga
 * de tu plan; el menú se ajusta a ellas.
 */
export default function DietPage() {
  const { profile } = usePlanWeek();
  const { data } = usePlanWeekData();
  const [selDay, setSelDay] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuWeek | null>(null);

  useEffect(() => {
    let alive = true;
    menuApi
      .week()
      .then((m) => alive && setMenu(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const prot = profile?.proteinTargetG ?? 150;
  const days = (data?.days ?? []).map((d, i) => {
    const diet = data?.diet?.[i];
    const load: PlanLoad = diet?.load ?? d.planned?.load ?? 'REST';
    const k = diet?.kcalTarget ?? profile?.dailyKcalTarget ?? 2400;
    return { date: d.day, n: dayNumber(d.day), letter: dayLetter(d.day), full: dayFull(d.day), load, k, planned: d.planned };
  });
  if (!days.length) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-screen plan">
            <header className="rk-title">
              <h1>Comida</h1>
            </header>
            <FoodShortcuts />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const sel = Math.max(0, days.findIndex((d) => d.date === (selDay ?? data?.today)));
  const cur = days[sel];
  const max = Math.max(...days.map((d) => d.k));
  const min = Math.min(...days.map((d) => d.k)) - 400;
  // El menú viene ajustado al objetivo guardado; si previsualizas otro objetivo, la diferencia se ve en «de X kcal».
  const meals = menu?.days?.find((d) => d.day === cur.date)?.meals ?? [];

  async function swap(meal: Meal) {
    try {
      setMenu(await menuApi.swap(cur.date, meal));
    } catch (e) {
      toast.error('No se pudo cambiar', isApiError(e) ? e.message : undefined);
    }
  }
  const total = meals.reduce((s, m) => s + m.kcal, 0);
  const t = cur.k;
  const diff = total - t;
  const fits = Math.abs(diff) <= t * 0.05;
  const fat = Math.round((t * 0.25) / 9);
  const carbs = Math.round((t - prot * 4 - fat * 9) / 4);
  const session = cur.planned
    ? cur.planned.plannedDurationMin
      ? `${cur.planned.title} · ${fmtMinutes(cur.planned.plannedDurationMin)}`
      : cur.planned.title
    : 'Sin sesión planificada';

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            actions={
              <>
                <Link to="/tabs/comida/compra" aria-label="Lista de la compra" className="rk-iconbtn">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6M10 21h.01M17 21h.01" />
                  </svg>
                </Link>
              </>
            }
          />
          <header className="rk-title">
            <h1>Comida</h1>
            <span className="rk-title__sub plan__sub">
              Semana del {days[0].n} al {days[6].n} · calorías según tu objetivo y la carga de tu plan
            </span>
          </header>

          <FoodShortcuts />

          <h2 className="food-hub__h2">Menú de la semana</h2>

          <GoalCard profile={profile} />

          <section aria-label="Calorías por día" className="diet__chart">
            <div role="tablist" aria-label="Días" className="diet__days">
              {days.map((d, i) => {
                const k = d.k;
                const on = i === sel;
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-label={`${d.full} ${d.n}: objetivo ${kcal(k)} kcal`}
                    className={`diet__day${on ? ' is-sel' : ''}`}
                    onClick={() => setSelDay(d.date)}
                  >
                    <span className="diet__day-k">{(k / 1000).toFixed(1).replace('.', ',')}</span>
                    <span
                      className="diet__bar"
                      aria-hidden="true"
                      style={{ height: Math.round(24 + ((k - min) / Math.max(1, max - min)) * 60), background: BAR[d.load] }}
                    />
                    <span className="diet__day-letter">{d.letter}</span>
                  </button>
                );
              })}
            </div>
            <div className="diet__legend" aria-hidden="true">
              <span>
                <span style={{ background: BAR.HIGH }} />
                Carga alta
              </span>
              <span>
                <span style={{ background: BAR.MEDIUM }} />
                Media
              </span>
              <span>
                <span style={{ background: BAR.LOW }} />
                Baja
              </span>
            </div>
          </section>

          <section aria-label="Día seleccionado" className="diet__card">
            <div className="diet__card-head">
              <div className="rk-row__main">
                <span className="diet__card-day">
                  {days[sel].full[0].toUpperCase() + days[sel].full.slice(1)} {days[sel].n}
                </span>
                <span className="rk-row__sub">{session}</span>
              </div>
              <span className={`plan__load ${LOAD_CLASS[cur.load]}`}>
                {cur.load === 'REST' ? 'Descanso' : `Carga ${LOAD_LABEL[cur.load].toLowerCase()}`}
              </span>
            </div>
            <div className="diet__total">
              <span>
                <span className="diet__total-n">{kcal(total)}</span>
                <span className="rk-row__sub"> de {kcal(t)} kcal</span>
              </span>
              <span className={`diet__fit${fits ? ' is-ok' : ''}`}>
                {fits ? '✓ Ajustado' : `${diff > 0 ? '+' : '−'}${kcal(Math.abs(diff))} kcal`}
              </span>
            </div>
            <span className="rk-row__sub">
              Proteína {prot} g · hidratos {carbs} g · grasas {fat} g
            </span>
          </section>

          <div className="rk-sechead">
            <h2>Menú del día</h2>
          </div>
          <ul aria-label="Menú del día" className="rk-list">
            {meals.map((m) => (
              <li key={m.meal} className="rk-row diet__meal">
                <span className="rk-row__main">
                  <span className="diet__meal-name">{MEAL_LABEL[m.meal]}</span>
                  <span className="rk-row__title">{m.name}</span>
                  <span className="rk-row__sub diet__ingredients">{m.ingredients.map((i) => `${i.name.toLowerCase()} ${i.amount}`).join(' · ')}</span>
                  <span className="rk-row__sub">
                    {kcal(m.kcal)} kcal · {m.proteinG} g de proteína
                  </span>
                </span>
                <button type="button" className="diet__swap" aria-label={`Cambiar ${MEAL_LABEL[m.meal].toLowerCase()}`} onClick={() => void swap(m.meal)}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h13l-3-3M20 17H7l3 3" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <p className="rk-note">Las raciones están ajustadas a las calorías del día. Los valores son aproximados.</p>

          <Link to="/tabs/comida/compra" className="plan__btn">
            Ver la lista de la compra
          </Link>
        </div>
      </IonContent>
    </IonPage>
  );
}

/**
 * Arriba de la pestaña Comida: lo de hoy, las recetas y la compra, a un toque.
 * El menú de la semana (con su objetivo por día) va debajo.
 */
function FoodShortcuts() {
  const summary = useBrioStore((s) => s.summary);
  const open = useRegisterStore((s) => s.open);
  const left = summary?.totals.kcalRemaining;
  return (
    <div className="rk-list food-hub">
      <button type="button" className="rk-row" onClick={() => open('meal')}>
        <span className="food-hub__icon is-tint" aria-hidden="true">
          <Icon d={PATHS.plus} size={20} stroke={2.4} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Añadir comida</span>
          <span className="rk-row__sub">
            {left != null ? `Hoy te quedan ${formatNumber(Math.max(0, Math.round(left)))} kcal` : 'Apunta lo que has comido'}
          </span>
        </span>
        <Chevron />
      </button>
      <Link to="/tabs/today/comida" className="rk-row">
        <span className="food-hub__icon" aria-hidden="true">
          <Icon d={PATHS.fork} size={20} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Lo que has comido hoy</span>
          <span className="rk-row__sub">Comidas, macros y digestión del día</span>
        </span>
        <Chevron />
      </Link>
      <Link to="/tabs/comida/recetas" className="rk-row">
        <span className="food-hub__icon" aria-hidden="true">
          <Icon d={PATHS.book} size={20} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Mis recetas</span>
          <span className="rk-row__sub">Las tuyas, con kcal por ración</span>
        </span>
        <Chevron />
      </Link>
      <Link to="/tabs/comida/compra" className="rk-row">
        <span className="food-hub__icon" aria-hidden="true">
          <Icon d={PATHS.cart} size={20} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Lista de la compra</span>
          <span className="rk-row__sub">Sale del menú de la semana</span>
        </span>
        <Chevron />
      </Link>
    </div>
  );
}
