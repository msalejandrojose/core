import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError, type BrioProfile } from '../api';
import { useBrioStore } from '../brio.store';
import { formatNumber } from '../format';
import { dailyDeltaKcal, etaLabel, goalSummary } from '../progress/weight-goal';
import { Chevron, Icon, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useRegisterStore } from '../register.store';
import { MEAL_LABEL, menuApi, type MenuMeal, type MenuWeek } from './menu.api';
import { isPlanned } from './plan-meal';
import { usePlanWeekData, type PlanLoad } from './plan.api';
import { WeekNav } from './WeekNav';
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
 * Comida (antes «Dieta y menú»). Arriba, la semana: las calorías de cada día
 * (salen de tu objetivo de peso y de la carga de tu plan) y, al tocar un día,
 * lo que vas a comer en cada comida. Una comida sin elegir es un hueco con «+».
 * Debajo, los accesos (añadir comida, lo de hoy, recetas, compra) y tu objetivo.
 */
export default function DietPage() {
  const { profile } = usePlanWeek();
  // Semana que se ve: undefined = la actual; si no, un día de la semana elegida.
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const { data } = usePlanWeekData(anchor);
  const [selDay, setSelDay] = useState<string | null>(null);
  const changeWeek = (day: string | undefined) => {
    setAnchor(day);
    setSelDay(day ?? null);
  };
  const [menu, setMenu] = useState<MenuWeek | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshDay = useBrioStore((s) => s.refreshDay);

  useEffect(() => {
    let alive = true;
    menuApi
      .week(anchor)
      .then((m) => alive && setMenu(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [anchor]);
  // Al volver de «Añadir al menú» se recarga para enseñar lo que se puso.
  useIonViewWillEnter(() => {
    menuApi
      .week(anchor)
      .then(setMenu)
      .catch(() => undefined);
  }, [anchor]);
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
  const plannedCount = (day: string) => menu?.days?.find((d) => d.day === day)?.meals.filter(isPlanned).length ?? 0;
  const shoppingPath = `/tabs/comida/compra${data && !(data.today >= data.from && data.today <= data.to) ? `?semana=${data.from}` : ''}`;

  async function act(action: () => Promise<MenuWeek | void>, fail: string, ok?: string) {
    setBusy(true);
    try {
      const next = await action();
      if (next) setMenu(next);
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(fail, isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }
  const removeItem = (id: string) => act(() => menuApi.removeItem(id, cur.date), 'No se pudo quitar');
  const logMeal = (m: MenuMeal) =>
    act(
      async () => {
        await menuApi.logMeal(cur.date, m.meal);
        if (cur.date === data?.today) await refreshDay();
      },
      'No se pudo apuntar',
      `${MEAL_LABEL[m.meal]} apuntada en tu diario`,
    );
  const canLog = cur.date <= (data?.today ?? '');
  // Solo cuenta lo que has elegido: las comidas vacías no suman nada.
  const total = meals.filter(isPlanned).reduce((s, m) => s + m.kcal, 0);
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
              <Link to={shoppingPath} aria-label="Lista de la compra" className="rk-iconbtn">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6M10 21h.01M17 21h.01" />
                </svg>
              </Link>
            }
          />
          <header className="rk-title">
            <h1>Comida</h1>
            <span className="rk-title__sub plan__sub">Toca un día para ver y elegir lo que vas a comer</span>
          </header>

          {data ? <WeekNav from={data.from} to={data.to} today={data.today} isoWeek={data.isoWeek} onChange={changeWeek} /> : null}

          <section aria-label="Calorías por día" className="diet__chart">
            <div role="tablist" aria-label="Días" className="diet__days">
              {days.map((d, i) => {
                const k = d.k;
                const on = i === sel;
                const count = plannedCount(d.date);
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-label={`${d.full} ${d.n}: objetivo ${kcal(k)} kcal${count ? `, ${count} de 4 comidas elegidas` : ', sin comidas elegidas'}`}
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
                    <span className={`diet__day-dot${count ? ' is-on' : ''}${count === 4 ? ' is-full' : ''}`} aria-hidden="true" />
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
              <span>
                <span className="diet__legend-dot" />
                Con comidas elegidas
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
                {total === 0 ? 'Sin elegir' : fits ? '✓ Ajustado' : diff < 0 ? `Faltan ${kcal(-diff)} kcal` : `+${kcal(diff)} kcal`}
              </span>
            </div>
            <span className="rk-row__sub">
              Proteína {prot} g · hidratos {carbs} g · grasas {fat} g
            </span>
          </section>

          <ul aria-label="Lo que vas a comer" className="rk-list diet__meals">
            {meals.map((m) => {
              const mine = isPlanned(m);
              const label = MEAL_LABEL[m.meal];
              const addPath = `/tabs/comida/menu/${cur.date}/${m.meal}`;
              if (!mine) {
                return (
                  <li key={m.meal}>
                    <Link to={addPath} className="rk-row diet__meal diet__meal--empty" aria-label={`Elegir qué vas a comer en ${label.toLowerCase()}`}>
                      <span className="rk-row__main">
                        <span className="diet__meal-name">{label}</span>
                        <span className="rk-row__sub">Toca para elegir plato o receta</span>
                      </span>
                      <span className="diet__plus" aria-hidden="true">
                        <Icon d={PATHS.plus} size={20} stroke={2.4} />
                      </span>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={m.meal} className="rk-row diet__meal">
                  <span className="rk-row__main">
                    <span className="diet__meal-name">{label}</span>
                    <ul className="diet__items" aria-label={`Lo que has puesto en ${label.toLowerCase()}`}>
                      {m.items!.map((i) => (
                        <li key={i.id} className="diet__item">
                          <span className="rk-row__main">
                            <span className="rk-row__title">{i.name}</span>
                            <span className="rk-row__sub">
                              {i.amount} · {kcal(i.kcal)} kcal
                            </span>
                          </span>
                          <button type="button" className="diet__item-x" aria-label={`Quitar ${i.name}`} disabled={busy} onClick={() => void removeItem(i.id)}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    <span className="rk-row__sub">
                      {kcal(m.kcal)} kcal · {formatNumber(Math.round(m.proteinG))} g de proteína
                    </span>
                    <span className="diet__meal-actions">
                      <Link to={addPath} className="diet__action" aria-label={`Añadir algo más a ${label.toLowerCase()}`}>
                        + Añadir más
                      </Link>
                      {canLog ? (
                        <button type="button" className="diet__action" disabled={busy} onClick={() => void logMeal(m)}>
                          Lo he comido
                        </button>
                      ) : null}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <FoodShortcuts shoppingPath={shoppingPath} />

          <GoalCard profile={profile} />
          <p className="rk-note">Las calorías de cada día salen de tu objetivo de peso y de la carga de tu plan de entrenos. Los valores son aproximados.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}

/**
 * Debajo del menú de la semana: añadir lo de hoy, las recetas y la compra, a un toque.
 */
function FoodShortcuts({ shoppingPath = '/tabs/comida/compra' }: { shoppingPath?: string }) {
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
      <Link to={shoppingPath} className="rk-row">
        <span className="food-hub__icon" aria-hidden="true">
          <Icon d={PATHS.cart} size={20} />
        </span>
        <span className="rk-row__main">
          <span className="rk-row__title">Lista de la compra</span>
          <span className="rk-row__sub">Lo que has elegido esta semana</span>
        </span>
        <Chevron />
      </Link>
    </div>
  );
}
