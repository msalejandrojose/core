import { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { Chevron, EmptyCard, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { GoalSheet } from './GoalSheet';
import { planApi, usePlanWeekData, type PlanDay, type PlanTemplate } from './plan.api';
import { LOAD_CLASS, LOAD_LABEL, dayFull, dayLetter, dayMeta, dayNumber, dayShort, fmtMinutes, shiftDay, weekRange } from './plan-labels';
import { usePlanTemplates } from './usePlanTemplates';
import './plan.css';

const CALENDAR = 'M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z';

function StatusIcon({ day }: { day: PlanDay }) {
  const st = day.status;
  if (st === 'DONE' || (st !== 'TODAY' && day.actual))
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="var(--brio-activity)" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (st === 'TODAY')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--brio-tint)" strokeWidth="2" />
        <circle cx="12" cy="12" r="5" fill="var(--brio-tint)" />
      </svg>
    );
  if (st === 'PLANNED')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--brio-border-strong)" strokeWidth="2" />
      </svg>
    );
  if (st === 'MISSED' || st === 'SKIPPED')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brio-chevron)" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8" />
      </svg>
    );
  if (st === 'REST')
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brio-chevron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" fill="var(--brio-border-strong)" />
    </svg>
  );
}

const titleOf = (d: PlanDay) => d.planned?.title ?? d.actual?.title ?? 'Día libre';

/** Plan (lienzo "Plan (con modo editar)"): la semana de entrenos, su objetivo y su edición. */
export default function PlanPage() {
  const history = useHistory();
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const { data, error, reload } = usePlanWeekData(anchor);
  const templates = usePlanTemplates();
  const [editing, setEditing] = useState(false);
  const [selDay, setSelDay] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try {
      await action();
      if (ok) toast.success(ok);
      reload();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const days = data?.days ?? [];
  const sel = days.find((d) => d.day === selDay) ?? days.find((d) => d.day === data?.today) ?? days[0];
  const isThisWeek = !!data && data.today >= data.from && data.today <= data.to;
  const empty = !!data && days.every((d) => !d.planned);
  const goal = data?.plan ?? null;

  async function fillSafe(mode: 'TEMPLATE' | 'COPY_PREVIOUS') {
    if (!data) return;
    setBusy(true);
    try {
      const r = await planApi.fill(data.from, mode);
      if (r.written) toast.success('Semana planificada');
      else toast.info('Nada que copiar', 'La semana anterior no tiene sesiones planificadas.');
      reload();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const pick = (tpl: PlanTemplate) => sel && void run(() => planApi.setDay(sel.day, { templateCode: tpl.code }));

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            back={
              <Link to="/tabs/plan/dieta" className="rk-textbtn plan__navlink">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={PATHS.fork} />
                </svg>
                Dieta y menú
              </Link>
            }
            actions={
              <button type="button" aria-pressed={editing} className="rk-textbtn rk-textbtn--strong" disabled={!data} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Listo' : 'Editar'}
              </button>
            }
          />
          <header className="rk-title">
            <h1>Plan</h1>
            {data ? (
              <span className="rk-title__sub plan__sub">
                {data.summary.planned
                  ? `${data.summary.done} de ${data.summary.planned} sesiones · ${fmtMinutes(data.summary.plannedMinutes)}`
                  : 'Sin sesiones planificadas'}
              </span>
            ) : null}
          </header>

          {error ? <p className="rk-note">No se pudo cargar el plan. Comprueba la conexión y vuelve a intentarlo.</p> : null}

          {data ? (
            <>
              <div className="plan__weeknav">
                <button type="button" aria-label="Semana anterior" className="rk-iconbtn" onClick={() => setAnchor(shiftDay(data.from, -7))}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <button type="button" className="plan__weeknav-label" disabled={isThisWeek} onClick={() => setAnchor(undefined)}>
                  <span>
                    Semana {data.isoWeek} · {weekRange(data.from, data.to)}
                  </span>
                  {!isThisWeek ? <span className="plan__weeknav-back">Volver a esta semana</span> : null}
                </button>
                <button type="button" aria-label="Semana siguiente" className="rk-iconbtn" onClick={() => setAnchor(shiftDay(data.from, 7))}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div role="list" aria-label="Días de la semana" className="plan__strip">
                {days.map((d) => {
                  const dot = d.status === 'DONE' || d.actual ? 'is-done' : d.status === 'PLANNED' || d.status === 'TODAY' ? 'is-planned' : '';
                  return (
                    <div role="listitem" key={d.day} className="plan__strip-day">
                      <span className="plan__strip-letter">{dayLetter(d.day)}</span>
                      <span className={`plan__strip-n${d.day === data.today ? ' is-today' : ''}`}>{dayNumber(d.day)}</span>
                      <span className={`plan__dot ${dot}`} aria-hidden="true" />
                    </div>
                  );
                })}
              </div>

              {!editing ? (
                <>
                  <div className="rk-list">
                    <button type="button" className="rk-row plan__goal" onClick={() => setGoalOpen(true)}>
                      <span className="rk-row__main">
                        <span className="rk-row__title">{goal ? goal.name : 'Añadir un objetivo'}</span>
                        <span className="rk-row__sub">
                          {goal
                            ? goal.daysToRace == null
                              ? 'Sin fecha de carrera'
                              : goal.daysToRace > 0
                                ? `Faltan ${goal.daysToRace} días · ${goal.weeksToRace} semanas`
                                : goal.daysToRace === 0
                                  ? 'Es hoy'
                                  : 'La carrera ya pasó'
                            : 'Una carrera o una fecha para la cuenta atrás'}
                        </span>
                      </span>
                      <Chevron />
                    </button>
                  </div>

                  {empty ? (
                    <EmptyCard
                      tone="activity"
                      icon={CALENDAR}
                      title="Esta semana aún no tiene plan"
                      text="Empieza con la semana tipo o repite la anterior. Luego puedes cambiar cada día."
                      primary={{ label: 'Usar plantilla', onClick: () => void fillSafe('TEMPLATE') }}
                      secondary={{ label: 'Repetir semana anterior', onClick: () => void fillSafe('COPY_PREVIOUS') }}
                    />
                  ) : null}

                  {!empty || days.some((d) => d.actual) ? (
                    <ul aria-label="Sesiones de la semana" className="rk-list plan__rows">
                      {days.map((d) => {
                        const isToday = d.day === data.today;
                        return (
                          <li key={d.day} className="plan__row">
                            <span className="plan__row-icon" aria-hidden="true">
                              <StatusIcon day={d} />
                            </span>
                            <button type="button" className="plan__row-cell" onClick={() => history.push(`/tabs/plan/sesion/${d.day}`)}>
                              <span className="rk-row__main">
                                <span className="plan__row-title">{titleOf(d)}</span>
                                <span className="rk-row__sub">{dayMeta(d)}</span>
                              </span>
                              <span className={`plan__row-day${isToday ? ' is-today' : ''}`}>
                                {isToday ? 'Hoy' : `${dayShort(d.day)} ${dayNumber(d.day)}`}
                              </span>
                              <Chevron />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </>
              ) : sel ? (
                <>
                  <div className="plan__edit">
                    {days.map((d) => (
                      <button
                        key={d.day}
                        type="button"
                        aria-pressed={d.day === sel.day}
                        className={`plan__edit-row${d.day === sel.day ? ' is-sel' : ''}`}
                        onClick={() => setSelDay(d.day)}
                      >
                        <span className="plan__edit-day">
                          {dayShort(d.day)} {dayNumber(d.day)}
                        </span>
                        <span className="rk-row__main">
                          <span className="plan__row-title">{d.planned?.title ?? 'Sin plan'}</span>
                          <span className="rk-row__sub">
                            {d.planned?.plannedDurationMin ? fmtMinutes(d.planned.plannedDurationMin) : d.planned ? 'Sin entrenamiento' : 'Elige una sesión abajo'}
                          </span>
                        </span>
                        {d.planned ? <span className={`plan__load ${LOAD_CLASS[d.planned.load]}`}>{LOAD_LABEL[d.planned.load]}</span> : null}
                      </button>
                    ))}
                  </div>
                  <section className="rk-section" aria-labelledby="tpl">
                    <div className="rk-sechead">
                      <h2 id="tpl">Poner el {dayFull(sel.day)}</h2>
                    </div>
                    <div className="plan__chips">
                      {templates.map((tpl) => {
                        const on = sel.planned?.templateCode === tpl.code;
                        return (
                          <button key={tpl.code} type="button" aria-pressed={on} disabled={busy} className={`plan__chip${on ? ' is-on' : ''}`} onClick={() => pick(tpl)}>
                            {tpl.short}
                            {tpl.durationMin ? ` · ${tpl.durationMin}′` : ''}
                          </button>
                        );
                      })}
                      {sel.planned ? (
                        <button type="button" disabled={busy} className="plan__chip plan__chip--clear" onClick={() => void run(() => planApi.clearDay(sel.day))}>
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </section>
                  <div className="plan__edit-actions">
                    <Link to={`/tabs/plan/sesion/${sel.day}`} className="plan__btn">
                      Detalles del día
                    </Link>
                    <Link to="/tabs/plan/dieta" className="plan__btn plan__btn--primary">
                      Ajustar dieta
                    </Link>
                  </div>
                  <p className="rk-note">Los cambios se guardan al momento. La dieta de cada día se ajusta a la carga de su sesión.</p>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        <GoalSheet isOpen={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSaved={reload} />
      </IonContent>
    </IonPage>
  );
}
