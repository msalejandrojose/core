import { Link } from 'react-router-dom';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { MUSCLE_NAME } from '../performance/labels';
import { BackLink, Chevron, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import { kindLabel, routineSummary } from './routine-draft';
import { useRoutines } from './routines.api';
import '../sheets/sheets.css';
import './routines.css';

/**
 * Mis rutinas: los entrenos que repites. Las de gimnasio se mandan a Hevy y las
 * de cardio se hacen con el reloj; las dos se eligen al registrar un entreno.
 */
export default function RoutinesPage() {
  const { routines, reload } = useRoutines();
  useIonViewWillEnter(reload);

  const gym = (routines ?? []).filter((r) => r.kind === 'STRENGTH');
  const cardio = (routines ?? []).filter((r) => r.kind !== 'STRENGTH');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Perfil" fallback="/tabs/settings" />}
            actions={
              <Link to="/tabs/settings/rutinas/nueva" className="rk-textbtn rk-textbtn--strong">
                Nueva
              </Link>
            }
          />
          <LargeTitle sub="Los entrenos que repites. Elígelos al registrar un entreno.">Rutinas</LargeTitle>

          {routines === null ? (
            <p className="rk-note">Cargando…</p>
          ) : !routines.length ? (
            <div className="routine__empty">
              <p>
                Crea tu primera rutina: por ejemplo «Torso A» con press banca, press inclinado y remo, o «Rodaje Z2» de 45 minutos.
              </p>
              <Link to="/tabs/settings/rutinas/nueva" className="rk-btn">
                Crear rutina
              </Link>
            </div>
          ) : (
            <>
              {[
                { id: 'gym', title: 'Gimnasio · con Hevy', items: gym },
                { id: 'cardio', title: 'Cardio · con el reloj', items: cardio },
              ]
                .filter((g) => g.items.length)
                .map((g) => (
                  <section key={g.id} className="rk-section" aria-labelledby={`r-${g.id}`}>
                    <SectionHeader id={`r-${g.id}`}>{g.title}</SectionHeader>
                    <div className="rk-list">
                      {g.items.map((r) => (
                        <Link key={r.id} to={`/tabs/settings/rutinas/${r.id}`} className="rk-row routine__row">
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
                          <Chevron />
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
