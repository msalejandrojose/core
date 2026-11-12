import { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { Chevron, ExampleTag, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { LOAD_CLASS, TEMPLATES, fmtMinutes, metaOf, statusOf, usePlanStore, type TemplateId } from './plan-data';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

function StatusIcon({ status }: { status: ReturnType<typeof statusOf> }) {
  if (status === 'done')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="var(--ritmo-activity)" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === 'today')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--ritmo-tint)" strokeWidth="2" />
        <circle cx="12" cy="12" r="5" fill="var(--ritmo-tint)" />
      </svg>
    );
  if (status === 'planned')
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--ritmo-border-strong)" strokeWidth="2" />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ritmo-chevron)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

/** Plan (lienzo "Plan (con modo editar)"): la semana de entrenos y su edición. */
export default function PlanPage() {
  const history = useHistory();
  const { days, week: weekNo, range, todayIdx } = usePlanWeek();
  const week = usePlanStore((s) => s.week);
  const setDay = usePlanStore((s) => s.setDay);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState(Math.min(6, Math.max(0, todayIdx + 1)));

  const counted = week.filter((t) => TEMPLATES[t].dur && t !== 'mov');
  const done = week.filter((t, i) => statusOf(i, todayIdx, t) === 'done' && TEMPLATES[t].dur && t !== 'mov').length;
  const total = week.reduce((s, t) => s + TEMPLATES[t].dur, 0);

  function toggleEdit() {
    if (editing) toast.info('Plan guardado en esta sesión', 'Enviar rutinas a Hevy y al reloj llegará con las conexiones.');
    setEditing((v) => !v);
  }

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
              <button type="button" aria-pressed={editing} className="rk-textbtn rk-textbtn--strong" onClick={toggleEdit}>
                {editing ? 'Listo' : 'Editar'}
              </button>
            }
          />
          <header className="rk-title">
            <h1>Plan</h1>
            <span className="rk-title__sub plan__sub">
              Semana {weekNo} · {range} · {done} de {counted.length} sesiones · {fmtMinutes(total)} <ExampleTag />
            </span>
          </header>

          <div role="list" aria-label="Días de la semana" className="plan__strip">
            {days.map((d, i) => {
              const t = TEMPLATES[week[i]];
              const st = statusOf(i, todayIdx, week[i]);
              const dot = t.dur ? (st === 'done' ? 'is-done' : st === 'planned' || st === 'today' ? 'is-planned' : '') : '';
              return (
                <div role="listitem" key={d.date} className="plan__strip-day">
                  <span className="plan__strip-letter">{d.letter}</span>
                  <span className={`plan__strip-n${i === todayIdx ? ' is-today' : ''}`}>{d.n}</span>
                  <span className={`plan__dot ${dot}`} aria-hidden="true" />
                </div>
              );
            })}
          </div>

          {!editing ? (
            <ul aria-label="Sesiones de la semana" className="rk-list plan__rows">
              {days.map((d, i) => {
                const t = week[i];
                const st = statusOf(i, todayIdx, t);
                const detail = t === 'fsup' && st === 'done' ? '/tabs/plan/fuerza' : null;
                const body = (
                  <>
                    <span className="rk-row__main">
                      <span className="plan__row-title">{TEMPLATES[t].name}</span>
                      <span className="rk-row__sub">{metaOf(t, st)}</span>
                    </span>
                    <span className={`plan__row-day${i === todayIdx ? ' is-today' : ''}`}>
                      {i === todayIdx ? 'Hoy' : `${d.short} ${d.n}`}
                    </span>
                    {detail ? <Chevron /> : null}
                  </>
                );
                return (
                  <li key={d.date} className="plan__row">
                    <span className="plan__row-icon" aria-hidden="true">
                      <StatusIcon status={st} />
                    </span>
                    {detail ? (
                      <Link to={detail} className="plan__row-cell">
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className="plan__row-cell" onClick={() => history.push(`/tabs/plan/sesion/${i}`)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <>
              <div className="plan__edit">
                {days.map((d, i) => {
                  const t = TEMPLATES[week[i]];
                  return (
                    <button
                      key={d.date}
                      type="button"
                      aria-pressed={i === sel}
                      className={`plan__edit-row${i === sel ? ' is-sel' : ''}`}
                      onClick={() => setSel(i)}
                    >
                      <span className="plan__edit-day">
                        {d.short} {d.n}
                      </span>
                      <span className="rk-row__main">
                        <span className="plan__row-title">{t.name}</span>
                        <span className="rk-row__sub">{t.dur ? fmtMinutes(t.dur) : 'Sin entrenamiento'}</span>
                      </span>
                      <span className={`plan__load ${LOAD_CLASS[t.load]}`}>{t.load}</span>
                    </button>
                  );
                })}
              </div>
              <section className="rk-section" aria-labelledby="tpl">
                <div className="rk-sechead">
                  <h2 id="tpl">Poner el {days[sel].full}</h2>
                </div>
                <div className="plan__chips">
                  {(Object.keys(TEMPLATES) as TemplateId[]).map((k) => {
                    const tpl = TEMPLATES[k];
                    const on = week[sel] === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={on}
                        className={`plan__chip${on ? ' is-on' : ''}`}
                        onClick={() => setDay(sel, k)}
                      >
                        {tpl.chip}
                        {tpl.dur ? ` · ${tpl.dur}′` : ''}
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="plan__edit-actions">
                <Link to={`/tabs/plan/sesion/${sel}`} className="plan__btn">
                  Detalles del día
                </Link>
                <Link to="/tabs/plan/dieta" className="plan__btn plan__btn--primary">
                  Ajustar dieta
                </Link>
              </div>
              <p className="rk-note">Cuando conectes Hevy y tu reloj, al pulsar Listo la fuerza se creará como rutina en Hevy y las carreras irán al reloj.</p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
