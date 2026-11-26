import { Link } from 'react-router-dom';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { MUSCLE_NAME } from '../performance/labels';
import { BackLink, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import { RoutineTemplates } from './RoutineTemplates';
import { kindLabel, routineSummary } from './routine-draft';
import { useRoutines } from './routines.api';
import { useStartRoutine } from './use-start-routine';
import '../sheets/sheets.css';
import './routines.css';

/**
 * Mis rutinas: los entrenos que repites. Las de gimnasio se mandan a Hevy y las
 * de cardio se hacen con el reloj; las dos se eligen al registrar un entreno.
 */
export default function RoutinesPage() {
  const { routines, reload } = useRoutines();
  const { start, busy } = useStartRoutine();
  useIonViewWillEnter(reload);

  const gym = (routines ?? []).filter((r) => r.kind === 'STRENGTH');
  const cardio = (routines ?? []).filter((r) => r.kind !== 'STRENGTH');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Entrenos" fallback="/tabs/entrenos" />}
            actions={
              <Link to="/tabs/entrenos/rutinas/nueva" className="rk-textbtn rk-textbtn--strong">
                Nueva
              </Link>
            }
          />
          <LargeTitle sub="Los entrenos que repites. Toca «Empezar» para hacer la sesión ya.">Rutinas</LargeTitle>

          {routines === null ? (
            <p className="rk-note">Cargando…</p>
          ) : !routines.length ? (
            <div className="routine__empty">
              <p>
                Crea tu primera rutina —«Torso A» con press banca y remo, o «Rodaje Z2» de 45 minutos— o empieza con una plantilla de HYROX o híbrida.
              </p>
              <Link to="/tabs/entrenos/rutinas/nueva" className="rk-btn">
                Crear rutina
              </Link>
            </div>
          ) : (
            <>
              {[
                { id: 'gym', title: 'Gimnasio e híbrido', items: gym },
                { id: 'cardio', title: 'Cardio · con el reloj', items: cardio },
              ]
                .filter((g) => g.items.length)
                .map((g) => (
                  <section key={g.id} className="rk-section" aria-labelledby={`r-${g.id}`}>
                    <SectionHeader id={`r-${g.id}`}>{g.title}</SectionHeader>
                    <div className="rk-list">
                      {g.items.map((r) => (
                        <div key={r.id} className="rk-row routine__row routine__row--start">
                          <Link to={`/tabs/entrenos/rutinas/${r.id}`} className="routine__row-link">
                            <span className="rk-row__main">
                              <span className="rk-row__title">{r.name}</span>
                              <span className="rk-row__sub">
                                {r.kind === 'STRENGTH' ? '' : `${kindLabel(r.kind)} · `}
                                {routineSummary(r) || 'Sin detalles'}
                              </span>
                              {r.muscles.length ? (
                                <span className="routine__muscles">
                                  {r.muscles
                                    .filter((m) => m.share >= 0.08)
                                    .slice(0, 4)
                                    .map((m) => (
                                      <span key={m.muscle} className={`routine__muscle${m.primary ? ' is-main' : ''}`}>
                                        {MUSCLE_NAME[m.muscle] ?? m.muscle} {Math.round(m.share * 100)} %
                                      </span>
                                    ))}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                          <button
                            type="button"
                            className="routine__start"
                            disabled={busy}
                            aria-label={`Empezar «${r.name}»`}
                            onClick={() => void start(r)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" />
                            </svg>
                            Empezar
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </>
          )}

          <RoutineTemplates />
        </div>
      </IonContent>
    </IonPage>
  );
}
