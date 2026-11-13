import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { MEAL_ORDER, longDate, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { BackLink, LargeTitle, NavRow, Ring, SectionHeader, Segmented } from '../ui/kit';
import { ErrorState, SkeletonList } from '@/components/ux';
import { STATUS_LABEL, buildReport, type Status } from './report';
import { isoWeek, mondayOf, monthBuckets, shiftDay, weekBuckets, avgOf, dayBuckets } from './stats';
import { useProgress } from './useProgress';
import './progress.css';

type Period = 'dia' | 'semana' | 'mes' | 'anio';
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const BAR: Record<Status, string> = {
  ok: 'var(--brio-activity)',
  near: 'var(--brio-food)',
  low: 'var(--brio-heart)',
  pending: 'var(--brio-chevron)',
};
const CHIP: Record<Status, string> = {
  ok: 'brio-chip brio-chip--done',
  near: 'brio-chip brio-chip--near',
  low: 'brio-chip brio-chip--below',
  pending: 'brio-chip brio-chip--ongoing',
};
/** Reparto orientativo del objetivo del día entre comidas, para la gráfica de Día. */
const MEAL_SHARE = { BREAKFAST: 0.25, LUNCH: 0.35, SNACK: 0.1, DINNER: 0.3 } as const;

/**
 * Informe vs. objetivos (lienzo "Informe"): día, semana, mes o año contra tus
 * objetivos de kcal, proteína y registro. Todo sale de tus datos.
 */
export default function ReportPage() {
  const profile = useBrioStore((s) => s.profile);
  const profileStatus = useBrioStore((s) => s.profileStatus);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const summary = useBrioStore((s) => s.summary);
  const dayStatus = useBrioStore((s) => s.dayStatus);
  const loadDay = useBrioStore((s) => s.loadDay);
  const [period, setPeriod] = useState<Period>('semana');
  // 365: el máximo que acepta la API (un año).
  const { data, error } = useProgress(365);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
    if (dayStatus === 'idle') void loadDay();
  }, [profileStatus, loadProfile, dayStatus, loadDay]);

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const [y, m] = today.split('-').map(Number);
  const from =
    period === 'dia' ? today : period === 'semana' ? mondayOf(today) : period === 'mes' ? `${today.slice(0, 7)}-01` : `${y}-01-01`;
  const elapsed = Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000) + 1;
  const days = data?.days.filter((d) => d.day >= from && d.day <= today) ?? [];
  const groups = data ? buildReport(days, profile, elapsed, true).filter((g) => g.items.length) : [];
  const all = groups.flatMap((g) => g.items).filter((i) => i.target !== 'sin plan aún');
  const ok = all.filter((i) => i.status === 'ok').length;

  const sub =
    period === 'dia'
      ? `Hoy, ${longDate(today)}`
      : period === 'semana'
        ? `Semana ${isoWeek(today)} · en curso`
        : period === 'mes'
          ? `${MONTHS[m - 1].charAt(0).toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`
          : `${y} · de enero a hoy`;

  // Gráfica: comidas del día, días de la semana, semanas del mes o meses del año.
  let cols: { label: string; value: number | null; target: number | null }[] = [];
  if (period === 'dia') {
    const target = summary?.totals.kcalTarget ?? null;
    cols = MEAL_ORDER.map((t) => ({
      label: { BREAKFAST: 'Desay.', LUNCH: 'Comida', SNACK: 'Merien.', DINNER: 'Cena' }[t],
      value: summary?.meals.filter((e) => e.mealType === t).reduce((s, e) => s + e.kcal, 0) ?? 0,
      target: target !== null ? target * MEAL_SHARE[t] : null,
    }));
  } else if (data) {
    const buckets =
      period === 'semana'
        ? dayBuckets(shiftDay(mondayOf(today), 6), 7)
        : period === 'mes'
          ? weekBuckets(today, 5).filter((b) => b.to >= from)
          : monthBuckets(today, m);
    cols = buckets.map((b) => ({
      label: b.label,
      value: b.from > today ? null : avgOf(data.days, b, (d) => d.kcalIn),
      target: avgOf(data.days, b, (d) => d.kcalTarget ?? 0) ?? profile?.dailyKcalTarget ?? null,
    }));
  }
  const max = Math.max(1, ...cols.map((c) => Math.max(c.value ?? 0, c.target ?? 0))) * 1.05;
  const bw = cols.length > 7 ? 14 : cols.length > 5 ? 22 : 34;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Progreso" fallback="/tabs/progress" />}
            actions={
              <Link to="/tabs/progress/objetivos" className="rk-textbtn">
                Objetivos
              </Link>
            }
          />
          <LargeTitle sub={sub}>Informe</LargeTitle>
          <Segmented
            label="Periodo"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'dia', label: 'Día' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mes' },
              { value: 'anio', label: 'Año' },
            ]}
          />

          {error ? (
            <ErrorState message="No se pudo cargar el informe." />
          ) : !data ? (
            <SkeletonList rows={4} />
          ) : (
            <>
              <section aria-label="Objetivos cumplidos" className="rk-card report__score">
                <Ring size={56} ratio={all.length ? ok / all.length : 0} color="var(--brio-activity)" />
                <div>
                  <strong>
                    {ok} de {all.length} objetivos cumplidos
                  </strong>
                  <span className="rk-row__sub">
                    {period === 'dia' ? 'El día aún no ha terminado' : 'Con tus objetivos de kcal, proteína y registro'}
                  </span>
                </div>
              </section>

              <section aria-label="Calorías frente a objetivo" className="progress__card">
                <span className="progress__card-title">
                  {period === 'dia' ? 'Calorías por comida' : period === 'semana' ? 'Calorías por día' : period === 'mes' ? 'Media diaria por semana' : 'Media diaria por mes'}
                </span>
                <div className="progress__labels" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }} aria-hidden="true">
                  {cols.map((c, i) => (
                    <div key={i} className="report__chart">
                      <i
                        style={{
                          width: bw,
                          height: Math.round(((c.value ?? 0) / max) * 118),
                          background: c.value ? (c.target && Math.abs(c.value - c.target) / c.target <= 0.1 ? 'var(--brio-food)' : '#FFC27A') : 'transparent',
                        }}
                      />
                      {c.target ? (
                        <span
                          className="report__mark"
                          style={{ bottom: Math.round((c.target / max) * 118), width: bw + 10, marginLeft: -(bw + 10) / 2 }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="progress__labels" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
                  {cols.map((c, i) => (
                    <span key={i}>{c.label}</span>
                  ))}
                </div>
                <div className="progress__legend">
                  <span>
                    <i style={{ background: 'var(--brio-food)' }} />
                    Ingeridas
                  </span>
                  <span>
                    <i style={{ width: 12, height: 3, background: 'var(--brio-ink)' }} />
                    Objetivo
                  </span>
                </div>
              </section>

              {groups.map((g) => (
                <section key={g.title} className="rk-section">
                  <SectionHeader>{g.title}</SectionHeader>
                  <div className="rk-list">
                    {g.items.map((it) => (
                      <div key={it.label} className="report__item">
                        <div className="report__line">
                          <span>{it.label}</span>
                          <span>{it.value}</span>
                        </div>
                        <div className="report__meta">
                          <div className="habit__bar" aria-hidden="true">
                            <span style={{ width: `${Math.max(0, Math.min(100, it.pct))}%`, background: BAR[it.status] }} />
                          </div>
                          <span>{it.target}</span>
                          {it.target !== 'sin plan aún' ? <span className={CHIP[it.status]}>{STATUS_LABEL[it.status]}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <p className="rk-note">El ejercicio se comparará con tu plan cuando lo tengas. Los días sin comidas registradas no cuentan en las medias.</p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
