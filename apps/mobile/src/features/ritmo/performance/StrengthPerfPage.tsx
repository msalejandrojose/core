import { useState } from 'react';
import { formatNumber } from '../format';
import { SectionHeader, Segmented } from '../ui/kit';
import { PERIOD_OPTIONS, PERIOD_TEXT, SIGNAL_LABEL, STATUS_LABEL, STATUS_TONE, pct, shortDay } from './labels';
import { perfApi, type ExerciseAnalysis, type Period } from './perf.api';
import { Chip, Columns, Empty, Estimated, PerfPage, Tile } from './ui';
import { usePerf } from './usePerf';

const kg = (v: number | null) => (v === null ? '—' : formatNumber(v, v % 1 ? 1 : 0));

function ExerciseCard({ ex }: { ex: ExerciseAnalysis }) {
  const [open, setOpen] = useState(false);
  const ev = ex.plateau.evidence;
  const series = ex.history.slice(-12).map((p) => p.e1rm ?? p.maxReps);
  return (
    <article className="perf__card">
      <button type="button" className="perf__card-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="rk-row__main">
          <span className="perf__rec-title">{ex.name}</span>
          <span className="rk-row__sub perf__wrap">
            {ex.period.sessions} {ex.period.sessions === 1 ? 'sesión' : 'sesiones'} en el periodo · {formatNumber(Math.round(ex.period.volumeKg))} kg
            {ex.period.changePct !== null ? ` · 1RM ${pct(ex.period.changePct)}` : ''}
          </span>
        </span>
        <Chip tone={STATUS_TONE[ex.plateau.status]}>{STATUS_LABEL[ex.plateau.status]}</Chip>
      </button>
      <div className="perf__kv">
        <span>
          <b>
            <strong>{kg(ex.currentE1rm)}</strong> kg
          </b>
          <em>
            1RM actual <Estimated />
          </em>
        </span>
        <span>
          <b>
            <strong>{kg(ex.heaviestKg)}</strong> kg
          </b>
          <em>Carga más alta</em>
        </span>
        <span>
          <strong>{ex.bestSet ? `${ex.bestSet.reps} × ${kg(ex.bestSet.weightKg)}` : '—'}</strong>
          <em>Mejor serie</em>
        </span>
      </div>
      {open ? (
        <div className="perf__card-body">
          {series.length > 1 ? (
            <>
              <Columns values={series} label={`Evolución de ${ex.name} en sus últimas ${series.length} sesiones`} />
              <span className="rk-row__sub">{ev.metric === 'E1RM' ? '1RM estimado por sesión' : 'Repeticiones máximas por sesión'}</span>
            </>
          ) : null}
          <dl className="perf__dl">
            <div>
              <dt>Mejor 1RM estimado</dt>
              <dd>{ex.bestE1rm ? `${kg(ex.bestE1rm.value)} kg · ${shortDay(ex.bestE1rm.day)}` : '—'}</dd>
            </div>
            <div>
              <dt>En el periodo</dt>
              <dd>
                {ex.period.firstE1rm === null ? '—' : `${kg(ex.period.firstE1rm)} → ${kg(ex.period.lastE1rm)} kg`} · mejor {kg(ex.period.bestE1rm)}
              </dd>
            </div>
            <div>
              <dt>Histórico</dt>
              <dd>
                {ex.sessions} sesiones · última el {shortDay(ex.lastDay)}
              </dd>
            </div>
            <div>
              <dt>Últimas 8 semanas</dt>
              <dd>
                {ev.sessions} sesiones · {kg(ev.baselineMedian)} → {kg(ev.recentMedian)} ({pct(ev.changePct)})
              </dd>
            </div>
            <div>
              <dt>Tendencia</dt>
              <dd>{ev.trendPctPerWeek === null ? '—' : `${pct(ev.trendPctPerWeek, 2)} por semana`}</dd>
            </div>
            <div>
              <dt>Repeticiones · volumen</dt>
              <dd>
                {pct(ev.repsChangePct)} · {pct(ev.volumeChangePct)}
              </dd>
            </div>
            <div>
              <dt>Volumen total</dt>
              <dd>{formatNumber(Math.round(ex.totalVolumeKg))} kg</dd>
            </div>
          </dl>
          <div className="perf__signals">
            {ex.plateau.signals.map((s) => (
              <span key={s}>{SIGNAL_LABEL[s] ?? s}</span>
            ))}
          </div>
          {ex.rirCoverage < 0.5 ? (
            <p className="rk-row__sub perf__wrap">Pocas series con RIR: el 1RM asume que fueron al fallo y queda por debajo del real.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Fuerza por ejercicio (StrengthEngine). */
export default function StrengthPerfPage() {
  const [period, setPeriod] = useState<Period>('90d');
  const { data, error, reload } = usePerf(() => perfApi.strength(period), period);
  return (
    <PerfPage
      title="Fuerza"
      sub="Progresión por ejercicio"
      data={data}
      error={error}
      onRetry={reload}
      header={<Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} small />}
    >
      {(a) => {
        const shown = a.exercises.filter((ex) => ex.period.sessions > 0);
        return a.exercises.length ? (
          <>
            <div className="progress__tiles">
              <Tile label="Progresando" value={a.summary.PROGRESSING} note="ejercicios" />
              <Tile label="Posible estancamiento" value={a.summary.POTENTIAL_PLATEAU} note="ejercicios" />
              <Tile label="En retroceso" value={a.summary.REGRESSION} note="ejercicios" />
              <Tile label="Faltan datos" value={a.summary.INSUFFICIENT_DATA} note="menos de 4 sesiones o 3 semanas" />
            </div>
            <section className="rk-section" aria-labelledby="ejs">
              <SectionHeader id="ejs">Ejercicios</SectionHeader>
              {shown.length ? (
                <div className="perf__recs">
                  {shown.map((ex) => (
                    <ExerciseCard key={ex.exerciseId} ex={ex} />
                  ))}
                </div>
              ) : (
                <Empty>No hay sesiones de fuerza en {PERIOD_TEXT[period]}.</Empty>
              )}
              <p className="rk-note">
                El estado de cada ejercicio (progresa, estancado…) mira siempre las últimas 8 semanas, elijas el periodo que elijas. El 1RM se estima con Brzycki (hasta 10 repeticiones al fallo) y Epley (11–12); con series más largas no se estima. El estado compara las medianas de las últimas 8 semanas, así que una sesión mala no lo cambia.
              </p>
            </section>
          </>
        ) : (
          <Empty>Registra tus sesiones de fuerza con sus ejercicios y series (peso, repeticiones y RIR) para ver tu progresión.</Empty>
        );
      }}
    </PerfPage>
  );
}
