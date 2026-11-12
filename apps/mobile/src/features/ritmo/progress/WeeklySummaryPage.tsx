import { useEffect } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { formatDuration, formatNumber, todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { BackLink, ExampleTag, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import { SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import { isoWeek, mondayOf, shiftDay } from './stats';
import { useProgress } from './useProgress';
import './progress.css';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const short = (day: string) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

/**
 * Resumen semanal (lienzo "Resumen semanal") de la última semana cerrada,
 * de lunes a domingo, con tus datos. "Lo que ha ido bien" y "A mejorar" se
 * deciden con reglas sobre esos datos; el sueño y la propuesta de la semana
 * siguiente llegarán con Garmin y el plan.
 */
export default function WeeklySummaryPage() {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const { data } = useProgress(28);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const from = shiftDay(mondayOf(today), -7);
  const to = shiftDay(from, 6);
  const week = data?.days.filter((d) => d.day >= from && d.day <= to) ?? [];
  const weights = data?.weights.filter((w) => w.day <= to) ?? [];
  const inWeek = weights.filter((w) => w.day >= from);
  const before = weights.filter((w) => w.day < from).pop();
  const wStart = before?.weightKg ?? inWeek[0]?.weightKg ?? null;
  const wEnd = inWeek[inWeek.length - 1]?.weightKg ?? null;
  const wDelta = wStart !== null && wEnd !== null ? wEnd - wStart : null;

  const sessions = week.reduce((s, d) => s + d.sessions, 0);
  const minutes = week.reduce((s, d) => s + d.activeMinutes, 0);
  const logged = week.filter((d) => d.mealsLogged > 0);
  const full = week.filter((d) => d.mealsLogged >= 3).length;
  const tdee = profile?.tdeeKcal ?? null;
  const target = profile?.dailyKcalTarget ?? null;
  const balance =
    tdee !== null && logged.length ? logged.reduce((s, d) => s + d.kcalIn - (tdee + d.kcalBurned), 0) / logged.length : null;
  const goalBalance = tdee !== null && target !== null ? target - tdee : null;
  const proteinT = profile?.proteinTargetG ?? null;
  const proteinDays = proteinT ? week.filter((d) => d.proteinG >= proteinT).length : 0;

  const good: string[] = [];
  const better: string[] = [];
  if (full >= 6) good.push(`Registraste todas las comidas ${full} de 7 días.`);
  else better.push(`Faltan comidas por registrar ${7 - full} de 7 días.`);
  if (balance !== null && goalBalance !== null) {
    if (Math.abs(balance - goalBalance) <= 150) good.push('Balance estable, cerca del que pide tu objetivo.');
    else better.push(`Balance medio de ${formatNumber(Math.round(balance / 10) * 10)} kcal frente a ${formatNumber(Math.round(goalBalance / 10) * 10)} del objetivo.`);
  }
  if (proteinT) {
    if (proteinDays >= 5) good.push(`Proteína en objetivo ${proteinDays} de 7 días.`);
    else better.push(`Proteína baja: ${proteinDays} de 7 días por encima de ${proteinT} g.`);
  }
  if (sessions >= 3) good.push(`${sessions} entrenos registrados.`);
  else if (sessions > 0) better.push(`Solo ${sessions} ${sessions === 1 ? 'entreno' : 'entrenos'} esta semana.`);
  const goodWeek = good.length >= better.length;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Progreso" fallback="/tabs/progress" />} />
          <LargeTitle sub={`Semana ${isoWeek(from)} · ${short(from)} – ${short(to)}`}>Resumen semanal</LargeTitle>

          {!data ? (
            <SkeletonList rows={4} />
          ) : (
            <>
              <span className={`ritmo-chip ${goodWeek ? 'ritmo-chip--done' : 'ritmo-chip--near'} weekly__badge`}>
                {goodWeek ? 'Buena semana' : 'Semana a mejorar'}
              </span>
              <div className="weekly__grid">
                <div className="progress__tile">
                  <span className="progress__tile-k progress__tile-k--activity">Entrenos</span>
                  <span className="progress__tile-v">{sessions}</span>
                  <span className="progress__tile-n">{minutes ? formatDuration(minutes * 60) : 'sin entrenos'}</span>
                </div>
                <div className="progress__tile">
                  <span className="progress__tile-k" style={{ color: 'var(--ritmo-sleep-ink)' }}>
                    Peso
                  </span>
                  <span className="progress__tile-v">
                    {wDelta !== null ? `${wDelta > 0 ? '+' : ''}${formatNumber(wDelta, 1)} kg` : '—'}
                  </span>
                  <span className="progress__tile-n">
                    {wStart !== null && wEnd !== null ? `${formatNumber(wStart, 1)} → ${formatNumber(wEnd, 1)}` : 'sin pesadas'}
                  </span>
                </div>
                <div className="progress__tile">
                  <span className="progress__tile-k" style={{ color: 'var(--ritmo-food-ink)' }}>
                    Balance medio
                  </span>
                  <span className="progress__tile-v">
                    {balance !== null ? `${balance > 0 ? '+' : ''}${formatNumber(Math.round(balance / 10) * 10)}` : '—'}
                  </span>
                  <span className="progress__tile-n">
                    kcal/día{goalBalance !== null ? ` · objetivo ${formatNumber(Math.round(goalBalance / 10) * 10)}` : ''}
                  </span>
                </div>
                <div className="progress__tile">
                  <span className="progress__tile-k" style={{ color: 'var(--ritmo-sleep-ink)' }}>
                    Sueño medio
                  </span>
                  <span className="progress__tile-v">7 h 10</span>
                  <span className="progress__tile-n">
                    <ExampleTag /> con Garmin
                  </span>
                </div>
              </div>

              <div className="rk-list">
                <div className="rk-row">
                  <span className="rk-row__main rk-row__title">Comidas registradas</span>
                  <span className="rk-row__value">{full} de 7 días</span>
                </div>
                {proteinT ? (
                  <div className="rk-row">
                    <span className="rk-row__main rk-row__title">Proteína en objetivo</span>
                    <span className="rk-row__value">{proteinDays} de 7 días</span>
                  </div>
                ) : null}
              </div>

              {good.length ? (
                <section className="rk-section">
                  <SectionHeader>Lo que ha ido bien</SectionHeader>
                  <div className="rk-card">
                    <ul className="weekly__notes">
                      {good.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}
              {better.length ? (
                <section className="rk-section">
                  <SectionHeader>A mejorar</SectionHeader>
                  <div className="rk-card">
                    <ul className="weekly__notes">
                      {better.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              ) : null}

              <section className="rk-section">
                <SectionHeader action={<ExampleTag />}>Propuesta para la semana {isoWeek(today)}</SectionHeader>
                <div className="rk-card newgoal__impact">
                  <p>6 sesiones · tirada larga de 70 a 80 min · +100 kcal los días de carga alta · yogur griego en las meriendas de descanso.</p>
                  <button
                    type="button"
                    className="rk-btn rk-btn--small"
                    onClick={() => toast.info('Llegará con el plan', 'La propuesta se aplicará a tu plan de entrenamiento.')}
                  >
                    Usar esta propuesta
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
