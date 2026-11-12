import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { formatNumber, todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { BackLink, ExampleTag, Icon, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { SkeletonList } from '@/components/ux';
import { weightGoal } from './goals';
import { mondayOf } from './stats';
import { useProgress } from './useProgress';
import './progress.css';

function signed(v: number): string {
  return `${v > 0 ? '+' : ''}${formatNumber(v, 2)}`;
}

/**
 * Objetivos (lienzo "Objetivos"). El de peso es tuyo (perfil y pesadas) y el
 * hábito de proteína sale de tus comidas de esta semana. La carrera y los
 * hábitos de sueño y pasos llegarán con el plan e integraciones: ejemplo.
 */
export default function GoalsPage() {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const { data } = useProgress(365);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const goal = profile && data ? weightGoal(profile, data.weights) : null;
  const monday = mondayOf(today);
  const week = data?.days.filter((d) => d.day >= monday) ?? [];
  const proteinTarget = profile?.proteinTargetG ?? null;
  const proteinDays = proteinTarget ? week.filter((d) => d.proteinG >= proteinTarget).length : 0;
  const elapsed = Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${monday}T12:00:00Z`).getTime()) / 86_400_000) + 1;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Progreso" fallback="/tabs/progress" />}
            actions={
              <Link to="/tabs/progress/objetivos/nuevo" className="rk-iconbtn" aria-label="Nuevo objetivo">
                <Icon d={PATHS.plus} size={22} stroke={2.2} />
              </Link>
            }
          />
          <LargeTitle>Objetivos</LargeTitle>

          {!profile || !data ? (
            <SkeletonList rows={3} />
          ) : goal ? (
            <section aria-label="Objetivo de peso" className="rk-card goal">
              <div className="goal__head">
                <span className="goal__kind goal__kind--sleep">Peso</span>
                <span>{goal.etaLabel}</span>
              </div>
              <div className="progress__metric">
                <span className="ritmo-metric">{formatNumber(goal.current, 1)} kg</span>
                <span className="progress__unit">
                  de {formatNumber(goal.start, 1)} a {formatNumber(goal.target, 1)}
                </span>
              </div>
              <div>
                <div className="goal__track" aria-hidden="true">
                  <div style={{ width: `${goal.pct}%`, background: 'var(--ritmo-sleep)' }} />
                </div>
                <div className="goal__legend" style={{ marginTop: 6 }}>
                  <span>{goal.pct} % conseguido</span>
                  <span>faltan {formatNumber(goal.left, 1)} kg</span>
                </div>
              </div>
              <div className="goal__foot">
                <span>
                  Tu ritmo: {signed(goal.planned)} kg/sem
                  {goal.actual !== null ? ` · vas a ${signed(goal.actual)} kg/sem` : ''}
                </span>
                {goal.actual !== null ? (
                  Math.sign(goal.actual) === Math.sign(goal.planned) && Math.abs(goal.actual) >= Math.abs(goal.planned) * 0.8 ? (
                    <span className="goal__verdict goal__verdict--ok">Vas al ritmo previsto</span>
                  ) : (
                    <span className="goal__verdict goal__verdict--near">Por debajo del ritmo: revisa tus registros de esta semana</span>
                  )
                ) : (
                  <span className="rk-row__sub">Pésate cada semana para ver a qué ritmo vas.</span>
                )}
              </div>
            </section>
          ) : (
            <section className="rk-card goal">
              <span className="goal__kind goal__kind--sleep">Peso</span>
              <span className="ritmo-callout">Aún no tienes peso objetivo.</span>
              <Link to="/tabs/progress/objetivos/nuevo" className="rk-btn rk-btn--soft rk-btn--small">
                Fijar objetivo de peso
              </Link>
            </section>
          )}

          <section aria-label="Objetivo de carrera" className="rk-card goal">
            <div className="goal__head">
              <span className="goal__kind goal__kind--food">Carrera 10K</span>
              <ExampleTag />
            </div>
            <div className="goal__duo">
              <div>
                <span>Objetivo</span>
                <span>45:00</span>
              </div>
              <div>
                <span>Predicción hoy</span>
                <span>46:20</span>
              </div>
            </div>
            <div className="goal__phases" aria-label="Fases del plan">
              {['Base', 'Construcción', 'Específico', 'Afinar'].map((p, i) => (
                <div key={p} className={i === 0 ? 'is-on' : undefined}>
                  <i aria-hidden="true" />
                  {p}
                </div>
              ))}
            </div>
            <span className="goal__foot">Llegará con el plan de entrenamiento.</span>
          </section>

          <section className="rk-section" aria-labelledby="habitos">
            <SectionHeader id="habitos">Hábitos · esta semana</SectionHeader>
            <div className="rk-list">
              <div className="habit">
                <span className="habit__main">
                  <span>{proteinTarget ? `${proteinTarget} g de proteína` : 'Proteína'}</span>
                  <span className="habit__bar" aria-hidden="true">
                    <span style={{ width: `${(proteinDays / 7) * 100}%`, background: 'var(--ritmo-ink)' }} />
                  </span>
                </span>
                <span className="rk-row__value">
                  {proteinDays}/{elapsed}
                </span>
              </div>
              <div className="habit">
                <span className="habit__main">
                  <span>
                    Dormir 7 h <ExampleTag />
                  </span>
                  <span className="habit__bar" aria-hidden="true">
                    <span style={{ width: '71%', background: 'var(--ritmo-sleep)' }} />
                  </span>
                </span>
                <span className="rk-row__value">5/7</span>
              </div>
              <div className="habit">
                <span className="habit__main">
                  <span>
                    10.000 pasos <ExampleTag />
                  </span>
                  <span className="habit__bar" aria-hidden="true">
                    <span style={{ width: '43%', background: 'var(--ritmo-activity)' }} />
                  </span>
                </span>
                <span className="rk-row__value">3/7</span>
              </div>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
