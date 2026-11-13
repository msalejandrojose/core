import { useState } from 'react';
import { formatNumber } from '../format';
import { SectionHeader, Segmented } from '../ui/kit';
import { MUSCLE_NAME, PERIOD_OPTIONS, TREND_LABEL, TREND_TONE, pct, shortDay } from './labels';
import { perfApi, type MuscleAnalysis, type Period } from './perf.api';
import { MuscleMap } from './MuscleMap';
import { Link } from 'react-router-dom';
import { Chevron } from '../ui/kit';
import { Bar, Chip, Columns, Empty, PerfPage } from './ui';
import { usePerf } from './usePerf';

/** Color de la carga relativa: de gris (nada) al color de actividad (lo más trabajado). */
const heat = (v: number) => (v === 0 ? 'var(--brio-border)' : `color-mix(in srgb, var(--brio-activity) ${Math.round(25 + v * 75)}%, var(--brio-surface))`);

function MuscleRow({ m, max, defaultOpen = false }: { m: MuscleAnalysis; max: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const w = m.period;
  return (
    <div className="perf__muscle">
      <button type="button" className="perf__muscle-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="perf__dot" style={{ background: heat(max ? w.weightedSets / max : 0) }} aria-hidden="true" />
        <span className="rk-row__main">
          <span className="rk-row__title">{MUSCLE_NAME[m.muscle] ?? m.muscle}</span>
          <Bar value={max ? w.weightedSets / max : 0} color="var(--brio-activity)" />
        </span>
        <span className="rk-row__value">{formatNumber(w.weightedSets, 1)} series</span>
      </button>
      {open ? (
        <div className="perf__card-body">
          <Columns values={m.weeklySets} label={`Series semanales de ${MUSCLE_NAME[m.muscle]} en 12 semanas`} />
          <span className="rk-row__sub">Series por semana · 12 semanas</span>
          <dl className="perf__dl">
            <div>
              <dt>Series directas · ponderadas</dt>
              <dd>
                {w.directSets} · {formatNumber(w.weightedSets, 1)}
              </dd>
            </div>
            <div>
              <dt>Volumen</dt>
              <dd>{formatNumber(Math.round(w.volumeKg))} kg</dd>
            </div>
            <div>
              <dt>Frecuencia</dt>
              <dd>
                {formatNumber(m.weeklyFrequency, 1)} sesiones por semana · {w.sessions} en el periodo
              </dd>
            </div>
            <div>
              <dt>Volumen semanal</dt>
              <dd>
                <Chip tone={TREND_TONE[m.volumeTrend]}>{TREND_LABEL[m.volumeTrend]}</Chip> {pct(m.volumeChangePct)}
              </dd>
            </div>
            <div>
              <dt>Carga media</dt>
              <dd>
                {m.avgLoadKg === null ? '—' : `${formatNumber(m.avgLoadKg, 1)} kg`} · {TREND_LABEL[m.loadTrend]}
              </dd>
            </div>
            <div>
              <dt>Última sesión</dt>
              <dd>{m.lastTrainedDay ? `${shortDay(m.lastTrainedDay)} · hace ${m.daysSinceLast} días` : 'Sin registros'}</dd>
            </div>
            <div>
              <dt>Histórico</dt>
              <dd>
                {formatNumber(m.allTime.weightedSets, 0)} series · {formatNumber(Math.round(m.allTime.volumeKg))} kg
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

/** Carga por grupo muscular (MuscleEngine). */
export default function MusclesPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const { data, error, reload } = usePerf(() => perfApi.muscles(period), period);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <PerfPage
      title="Músculos"
      sub="Carga de entrenamiento por grupo"
      data={data}
      error={error}
      onRetry={reload}
      header={<Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} small />}
    >
      {(a) => {
        const any = a.muscles.some((m) => m.allTime.weightedSets > 0);
        if (!any) return <Empty>Registra ejercicios y series en tus sesiones de fuerza para ver cómo repartes el trabajo.</Empty>;
        const max = Math.max(...a.muscles.map((m) => m.period.weightedSets));
        const sorted = [...a.muscles].sort((x, y) => y.period.weightedSets - x.period.weightedSets);
        const picked = a.muscles.find((m) => m.muscle === selected) ?? null;
        return (
          <>
            <section className="rk-section" aria-labelledby="mapa">
              <SectionHeader id="mapa">Mapa muscular</SectionHeader>
              <div className="rk-card">
                <MuscleMap
                  values={Object.fromEntries(a.muscles.map((m) => [m.muscle, max ? m.period.weightedSets / max : 0]))}
                  describe={(muscle) => {
                    const m = a.muscles.find((x) => x.muscle === muscle);
                    return `${formatNumber(m?.period.weightedSets ?? 0, 1)} series`;
                  }}
                  selected={selected}
                  onSelect={(muscle) => setSelected((cur) => (cur === muscle ? null : muscle))}
                />
              </div>
              {picked ? (
                <div className="perf__muscles">
                  <MuscleRow key={picked.muscle} m={picked} max={max} defaultOpen />
                </div>
              ) : (
                <p className="rk-note">Toca un músculo para ver sus cifras. El color es su carga respecto al músculo que más has trabajado en el periodo.</p>
              )}
            </section>
          <section className="rk-section" aria-labelledby="reparto">
            <SectionHeader id="reparto">Reparto del trabajo</SectionHeader>
            <div className="perf__muscles">
              {sorted.map((m) => (
                <MuscleRow key={m.muscle} m={m} max={max} />
              ))}
            </div>
            <p className="rk-note">
              Una serie cuenta 1 para el músculo principal, 0,5 para el secundario y 0,25 para el indirecto. Esto mide cuánto has entrenado cada grupo, no cuánto ha crecido ni si está recuperado.
            </p>
          </section>
            <Link to="/tabs/progress/rendimiento/ejercicios" className="rk-row perf__entry">
              <span className="rk-row__main">
                <span className="rk-row__title">Ajustar ejercicios</span>
                <span className="rk-row__sub perf__wrap">Cambia qué músculos trabaja cada uno</span>
              </span>
              <Chevron />
            </Link>
          </>
        );
      }}
    </PerfPage>
  );
}
