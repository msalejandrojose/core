import { useState } from 'react';
import { formatNumber } from '../format';
import { SectionHeader, Segmented } from '../ui/kit';
import { MUSCLE_NAME, TREND_LABEL, TREND_TONE, pct, shortDay } from './labels';
import { perfApi, type MuscleAnalysis } from './perf.api';
import { Bar, Chip, Columns, Empty, PerfPage } from './ui';
import { usePerf } from './usePerf';

type Win = 'last7' | 'last30' | 'last90';
const WINDOWS: { value: Win; label: string }[] = [
  { value: 'last7', label: '7 días' },
  { value: 'last30', label: '30 días' },
  { value: 'last90', label: '90 días' },
];

/** Color de la carga relativa: de gris (nada) al color de actividad (lo más trabajado). */
const heat = (v: number) => (v === 0 ? 'var(--ritmo-border)' : `color-mix(in srgb, var(--ritmo-activity) ${Math.round(25 + v * 75)}%, var(--ritmo-surface))`);

function MuscleRow({ m, win, max }: { m: MuscleAnalysis; win: Win; max: number }) {
  const [open, setOpen] = useState(false);
  const w = m[win];
  return (
    <div className="perf__muscle">
      <button type="button" className="perf__muscle-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="perf__dot" style={{ background: heat(max ? w.weightedSets / max : 0) }} aria-hidden="true" />
        <span className="rk-row__main">
          <span className="rk-row__title">{MUSCLE_NAME[m.muscle] ?? m.muscle}</span>
          <Bar value={max ? w.weightedSets / max : 0} color="var(--ritmo-activity)" />
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
  const { data, error, reload } = usePerf(() => perfApi.muscles());
  const [win, setWin] = useState<Win>('last7');
  return (
    <PerfPage
      title="Músculos"
      sub="Carga de entrenamiento por grupo"
      data={data}
      error={error}
      onRetry={reload}
      header={<Segmented label="Periodo" value={win} onChange={setWin} options={WINDOWS} />}
    >
      {(a) => {
        const any = a.muscles.some((m) => m.allTime.weightedSets > 0);
        if (!any) return <Empty>Registra ejercicios y series en tus sesiones de fuerza para ver cómo repartes el trabajo.</Empty>;
        const max = Math.max(...a.muscles.map((m) => m[win].weightedSets));
        const sorted = [...a.muscles].sort((x, y) => y[win].weightedSets - x[win].weightedSets);
        return (
          <section className="rk-section" aria-labelledby="mapa">
            <SectionHeader id="mapa">Reparto del trabajo</SectionHeader>
            <div className="perf__muscles">
              {sorted.map((m) => (
                <MuscleRow key={m.muscle} m={m} win={win} max={max} />
              ))}
            </div>
            <p className="rk-note">
              Una serie cuenta 1 para el músculo principal, 0,5 para el secundario y 0,25 para el indirecto. Esto mide cuánto has entrenado cada grupo, no cuánto ha crecido ni si está recuperado.
            </p>
          </section>
        );
      }}
    </PerfPage>
  );
}
