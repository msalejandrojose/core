import { formatNumber } from '../format';
import { useState } from 'react';
import { SectionHeader, Segmented } from '../ui/kit';
import { LOAD_STATUS, LOAD_TONE, MUSCLE_NAME, PERIOD_OPTIONS, PERIOD_TEXT, RECOVERY_LABEL, pct } from './labels';
import { perfApi, type Period } from './perf.api';
import { Chip, Columns, Empty, Estimated, PerfPage, Tile } from './ui';
import { usePerf } from './usePerf';

/** Carga y descanso (FatigueEngine). */
export default function LoadPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data, error, reload } = usePerf(() => perfApi.fatigue(period), period);
  return (
    <PerfPage
      title="Carga y descanso"
      sub="Fuerza y cardio juntas"
      data={data}
      error={error}
      onRetry={reload}
      header={<Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} small />}
    >
      {(a) =>
        a.dataQuality.sessions === 0 ? (
          <Empty>Registra entrenos con su esfuerzo (RPE) para ver tu carga.</Empty>
        ) : (
          <>
            <div className="rk-card perf__hero">
              <div className="perf__card-head">
                <span className="rk-row__main">
                  <span className="rk-row__sub perf__wrap">Carga reciente frente a la habitual</span>
                  <span className="perf__huge">{a.load.ratio === null ? '—' : `× ${formatNumber(a.load.ratio, 2)}`}</span>
                </span>
                <Chip tone={LOAD_TONE[a.load.status] ?? 'muted'}>{LOAD_STATUS[a.load.status] ?? a.load.status}</Chip>
              </div>
              <Columns values={a.load.weekly} label="Carga semanal de las últimas 8 semanas" />
              <span className="rk-row__sub perf__wrap">
                Carga semanal · 8 semanas. Esta semana {formatNumber(a.load.last7)} UA, la anterior {formatNumber(a.load.previous7)} ({pct(a.load.weekChangePct)}).
              </span>
            </div>

            <section className="rk-section" aria-labelledby="per">
              <SectionHeader id="per">En {PERIOD_TEXT[period]}</SectionHeader>
              <div className="progress__tiles">
                <Tile label="Sesiones" value={a.period.sessions} note={`${a.period.activeDays} días activos`} />
                <Tile label="Carga total" value={formatNumber(a.period.load)} unit="UA" note={`${formatNumber(a.period.avgWeeklyLoad)} por semana`} />
                <Tile label="Sesiones exigentes" value={a.period.demandingSessions} note="RPE 8 o más" />
                <Tile
                  label="Exigentes"
                  value={a.period.sessions ? `${Math.round((a.period.demandingSessions / a.period.sessions) * 100)} %` : '—'}
                  note="del total de sesiones"
                />
              </div>
            </section>

            <SectionHeader>Ahora mismo</SectionHeader>
            <div className="progress__tiles">
              <Tile label="Exigentes en 7 días" value={a.demanding.last7} note={`${a.demanding.maxConsecutiveDays} días seguidos como máximo`} />
              <Tile label="Días de descanso" value={a.rest.restDaysLast7} note="en los últimos 7" />
              <Tile label="Racha actual" value={a.rest.currentStreakDays} unit="días" note="entrenando sin parar" />
              <Tile
                label="Sesiones más juntas"
                value={a.rest.minHoursBetweenSessions === null ? '—' : formatNumber(a.rest.minHoursBetweenSessions, 0)}
                unit={a.rest.minHoursBetweenSessions === null ? undefined : 'h'}
                note="en los últimos 7 días"
              />
            </div>

            <section className="rk-section" aria-labelledby="rec">
              <SectionHeader id="rec" action={<Estimated />}>
                Lectura de la carga
              </SectionHeader>
              <div className="rk-card perf__metric">
                <strong>{RECOVERY_LABEL[a.estimatedRecovery.status] ?? a.estimatedRecovery.status}</strong>
                {a.estimatedRecovery.basis.map((b) => (
                  <span key={b} className="rk-row__sub perf__wrap">
                    {b}
                  </span>
                ))}
              </div>
            </section>

            <section className="rk-section" aria-labelledby="cv">
              <SectionHeader id="cv">Carga cardiovascular (TRIMP)</SectionHeader>
              {a.cardioLoad ? (
                <div className="rk-list">
                  <div className="rk-row perf__row">
                    <span className="rk-row__main rk-row__title">Últimos 7 días</span>
                    <span className="rk-row__value">{formatNumber(a.cardioLoad.last7, 0)}</span>
                  </div>
                  <div className="rk-row perf__row">
                    <span className="rk-row__main rk-row__title">7 días anteriores</span>
                    <span className="rk-row__value">{formatNumber(a.cardioLoad.previous7, 0)}</span>
                  </div>
                  {a.cardioLoad.sessionsWithoutHr ? (
                    <div className="rk-row perf__row rk-row__sub">{a.cardioLoad.sessionsWithoutHr} sesiones sin pulsaciones no cuentan aquí.</div>
                  ) : null}
                </div>
              ) : (
                <Empty>Indica tu FC máxima y en reposo (en Cardio) para calcularla.</Empty>
              )}
            </section>

            <section className="rk-section" aria-labelledby="deseq">
              <SectionHeader id="deseq">Reparto del trabajo de fuerza · 30 días</SectionHeader>
              <div className="rk-list">
                <div className="rk-row perf__row">
                  <span className="rk-row__main rk-row__title">Empuje / tirón</span>
                  <span className="rk-row__value">{a.imbalances.pushPullRatio === null ? '—' : formatNumber(a.imbalances.pushPullRatio, 2)}</span>
                </div>
                <div className="rk-row perf__row">
                  <span className="rk-row__main rk-row__title">Torso / pierna</span>
                  <span className="rk-row__value">{a.imbalances.upperLowerRatio === null ? '—' : formatNumber(a.imbalances.upperLowerRatio, 2)}</span>
                </div>
              </div>
              {a.imbalances.neglected.length ? (
                <p className="rk-note">Sin trabajar en 2 semanas o más: {a.imbalances.neglected.map((n) => (MUSCLE_NAME[n.muscle] ?? n.muscle).toLowerCase()).join(', ')}.</p>
              ) : null}
            </section>

            <p className="rk-note">
              La carga es esfuerzo (RPE) × minutos. {a.dataQuality.withRecordedRpe} de {a.dataQuality.sessions} sesiones tienen RPE apuntado; en {a.dataQuality.withEstimatedRpe} se deduce de la intensidad o del RIR
              {a.dataQuality.withoutLoad ? ` y ${a.dataQuality.withoutLoad} no cuentan por no tener ningún dato de esfuerzo` : ''}. Son indicadores de carga: no predicen lesiones ni miden la recuperación del cuerpo.
            </p>
          </>
        )
      }
    </PerfPage>
  );
}
