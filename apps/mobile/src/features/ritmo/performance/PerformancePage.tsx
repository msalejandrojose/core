import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatNumber } from '../format';
import { toast } from '@/lib/toast';
import { Chevron, Icon, SectionHeader, Segmented } from '../ui/kit';
import { PATHS } from '../ui/paths';
import {
  KIND_NAME,
  LOAD_STATUS,
  LOAD_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  TREND_LABEL,
  TREND_TONE,
  VERDICT_TEXT,
  minutes,
  pct,
  shortDay,
} from './labels';
import { perfApi, type Period, type PerfIndex, type Recommendation } from './perf.api';
import { Chip, Empty, PerfPage, Tile } from './ui';
import { usePerf } from './usePerf';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
  { value: '6m', label: '6 m' },
  { value: 'all', label: 'Todo' },
];

const PRIORITY_TONE = { HIGH: 'bad', MEDIUM: 'warn', LOW: 'muted', INFO: 'good' } as const;
const PRIORITY_LABEL = { HIGH: 'Importante', MEDIUM: 'A revisar', LOW: 'Sugerencia', INFO: 'Bien' } as const;

const SECTIONS = [
  { to: 'fuerza', title: 'Fuerza', sub: '1RM estimado, marcas y estancamientos', icon: PATHS.strength, tone: 'tint' },
  { to: 'musculos', title: 'Músculos', sub: 'Carga de entrenamiento por grupo muscular', icon: 'M7 4c-2 3-2 6 0 8 2 2 2 5 0 8M17 4c2 3 2 6 0 8-2 2-2 5 0 8M9 8h6M9 16h6', tone: 'food' },
  { to: 'cardio', title: 'Cardio', sub: 'Zonas, eficiencia y predicción de marcas', icon: PATHS.run, tone: 'activity' },
  { to: 'carga', title: 'Carga y descanso', sub: 'Carga reciente frente a la habitual', icon: 'M4 16l5-6 4 4 7-9', tone: 'gold' },
  { to: 'hibrido', title: 'Fuerza + cardio', sub: 'Equilibrio, pierna y evolución comparada', icon: 'M7 7h10M7 17h10M4 12h16', tone: 'dark' },
  { to: 'entrenos', title: 'Entrenos', sub: 'Tu historial: ver, editar o borrar', icon: 'M5 6h14M5 12h14M5 18h9', tone: 'tint' },
] as const;

function IndexTile({ label, index }: { label: string; index: PerfIndex }) {
  return (
    <button
      type="button"
      className="progress__tile perf__index"
      onClick={() => toast.info(label, index.formula)}
      aria-label={`${label}: ${index.value ?? 'sin datos'} sobre 100. Toca para ver cómo se calcula.`}
    >
      <span className="progress__tile-k">{label}</span>
      <span className="progress__tile-v">
        {index.value ?? '—'}
        <span> / 100</span>
      </span>
      <span className="progress__tile-n">Toca para ver la fórmula</span>
    </button>
  );
}

function Rec({ rec, onDismiss }: { rec: Recommendation; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="perf__rec">
      <button type="button" className="perf__rec-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="rk-row__main">
          <span className="perf__rec-title">{rec.title}</span>
          <span className="rk-row__sub">Detectado el {shortDay(rec.detectedOn)}</span>
        </span>
        <Chip tone={PRIORITY_TONE[rec.priority]}>{PRIORITY_LABEL[rec.priority]}</Chip>
      </button>
      {open ? (
        <div className="perf__rec-body">
          <p>{rec.explanation}</p>
          <span className="rk-row__sub">
            Datos del {shortDay(rec.period.from)} al {shortDay(rec.period.to)}
          </span>
          <button type="button" className="rk-textbtn" onClick={onDismiss}>
            Descartar
          </button>
        </div>
      ) : null}
    </article>
  );
}

/** Rendimiento: resumen del periodo, recomendaciones y acceso a cada motor. */
export default function PerformancePage() {
  const [period, setPeriod] = useState<Period>('30d');
  const summary = usePerf(() => perfApi.summary(period), period);
  // Se piden todas y se separan aquí: las descartadas se pueden recuperar.
  const recs = usePerf(() => perfApi.allRecommendations());
  const active = recs.data?.filter((r) => r.status === 'ACTIVE') ?? null;
  const dismissed = recs.data?.filter((r) => r.status === 'DISMISSED') ?? [];
  const [showDismissed, setShowDismissed] = useState(false);

  async function dismiss(rec: Recommendation) {
    try {
      await perfApi.dismiss(rec.id);
      recs.reload();
      toast.success('Descartada', 'Puedes recuperarla abajo, en Descartadas.');
    } catch {
      toast.error('No se pudo descartar');
    }
  }

  async function restore(rec: Recommendation) {
    try {
      await perfApi.restore(rec.id);
      recs.reload();
    } catch {
      toast.error('No se pudo recuperar');
    }
  }

  return (
    <PerfPage
      title="Rendimiento"
      sub="Calculado con lo que registras"
      back={{ label: 'Progreso', to: '/tabs/progress' }}
      data={summary.data}
      error={summary.error}
      onRetry={summary.reload}
      header={<Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIODS} small />}
    >
      {(s) => (
        <>
          {s.dataQuality.level === 'NONE' ? (
            <Empty>Aún no hay entrenos. Regístralos con el + (con sus series y pulsaciones si puedes) y aquí verás tu evolución.</Empty>
          ) : (
            <>
              <div className="progress__tiles">
                <Tile label="Sesiones" value={s.totals.sessions} note={`${s.totals.strengthSessions} de fuerza · ${s.totals.cardioSessions} de cardio`} />
                <Tile label="Tiempo" value={minutes(s.totals.durationSec)} note={`${s.totals.activeDays} días activos`} />
                <Tile label="Volumen de fuerza" value={formatNumber(Math.round(s.totals.strengthVolumeKg))} unit="kg" note={`${s.totals.workingSets} series`} />
                <Tile label="Distancia" value={formatNumber(s.totals.cardioDistanceM / 1000, 1)} unit="km" note="En cardio" />
              </div>

              <section className="rk-section" aria-labelledby="evo">
                <SectionHeader id="evo">Evolución</SectionHeader>
                <div className="rk-list">
                  <div className="rk-row perf__row">
                    <span className="rk-row__main">
                      <span className="rk-row__title">Fuerza</span>
                      <span className="rk-row__sub">
                        {s.strength.byStatus.PROGRESSING} en progreso · {s.strength.byStatus.POTENTIAL_PLATEAU} estancados · {s.strength.byStatus.REGRESSION} a la baja
                      </span>
                    </span>
                    <Chip tone={TREND_TONE[s.strength.trend]}>{TREND_LABEL[s.strength.trend]}</Chip>
                  </div>
                  <div className="rk-row perf__row">
                    <span className="rk-row__main">
                      <span className="rk-row__title">Cardio{s.cardio.kind ? ` · ${KIND_NAME[s.cardio.kind] ?? s.cardio.kind}` : ''}</span>
                      <span className="rk-row__sub">{s.cardio.changePct === null ? 'Sin sesiones comparables suficientes' : `${pct(s.cardio.changePct)} en 12 semanas`}</span>
                    </span>
                    <Chip tone={TREND_TONE[s.cardio.trend]}>{TREND_LABEL[s.cardio.trend]}</Chip>
                  </div>
                  <div className="rk-row perf__row">
                    <span className="rk-row__main">
                      <span className="rk-row__title">Carga</span>
                      <span className="rk-row__sub">
                        {s.load.ratio === null ? 'Reciente frente a habitual' : `${formatNumber(s.load.ratio, 2)} veces la habitual`} · {s.load.demandingLast7} exigentes en 7 días
                      </span>
                    </span>
                    <Chip tone={LOAD_TONE[s.load.status] ?? 'muted'}>{LOAD_STATUS[s.load.status] ?? s.load.status}</Chip>
                  </div>
                </div>
                <p className="rk-note">{VERDICT_TEXT[s.hybrid.verdict] ?? ''}</p>
              </section>

              {s.plateaus.length ? (
                <section className="rk-section" aria-labelledby="est">
                  <SectionHeader id="est">Estancamientos detectados</SectionHeader>
                  <div className="rk-list">
                    {s.plateaus.map((p) => (
                      <div key={`${p.discipline}-${p.subject}`} className="rk-row perf__row">
                        <span className="rk-row__main">
                          <span className="rk-row__title">{p.name}</span>
                          <span className="rk-row__sub">
                            {p.sessions} sesiones · {pct(p.changePct)}
                          </span>
                        </span>
                        <Chip tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rk-section" aria-labelledby="ind">
                <SectionHeader id="ind">Índices</SectionHeader>
                <div className="progress__tiles">
                  <IndexTile label="Constancia" index={s.indices.consistency} />
                  <IndexTile label="Progreso de fuerza" index={s.indices.strengthProgress} />
                  <IndexTile label="Progreso de cardio" index={s.indices.cardioProgress} />
                  <IndexTile label="Equilibrio de carga" index={s.indices.loadBalance} />
                </div>
                <p className="rk-note">Son una ayuda de lectura. Las cifras reales están en cada sección.</p>
              </section>
            </>
          )}

          <section className="rk-section" aria-labelledby="recs">
            <SectionHeader id="recs">Recomendaciones</SectionHeader>
            {active?.length ? (
              <div className="perf__recs">
                {active.map((r) => (
                  <Rec key={r.id} rec={r} onDismiss={() => void dismiss(r)} />
                ))}
              </div>
            ) : (
              <Empty>{recs.error ? 'No se pudieron cargar.' : active ? 'Nada que señalar ahora mismo.' : 'Cargando…'}</Empty>
            )}
            {dismissed.length ? (
              <>
                <button type="button" className="rk-textbtn perf__toggle" aria-expanded={showDismissed} onClick={() => setShowDismissed((v) => !v)}>
                  {showDismissed ? 'Ocultar descartadas' : `Ver descartadas (${dismissed.length})`}
                </button>
                {showDismissed ? (
                  <div className="rk-list">
                    {dismissed.map((r) => (
                      <div key={r.id} className="rk-row perf__row">
                        <span className="rk-row__main">
                          <span className="rk-row__title perf__wrap">{r.title}</span>
                          <span className="rk-row__sub">Detectado el {shortDay(r.detectedOn)}</span>
                        </span>
                        <button type="button" className="rk-textbtn" onClick={() => void restore(r)}>
                          Recuperar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            <p className="rk-note">Salen de reglas fijas sobre tus datos. Son sugerencias de entrenamiento, no consejo médico.</p>
          </section>

          <section className="rk-section" aria-labelledby="det">
            <SectionHeader id="det">En detalle</SectionHeader>
            <div className="progress__list">
              {SECTIONS.map((sec) => (
                <Link key={sec.to} to={`/tabs/progress/rendimiento/${sec.to}`} className="progress__link">
                  <span className={`progress__ic progress__ic--${sec.tone}`} aria-hidden="true">
                    <Icon d={sec.icon} size={18} stroke={2.2} />
                  </span>
                  <span className="rk-row__main">
                    <span className="rk-row__title">{sec.title}</span>
                    <span className="rk-row__sub">{sec.sub}</span>
                  </span>
                  <Chevron />
                </Link>
              ))}
            </div>
          </section>

          {s.dataQuality.missing.length ? (
            <section className="rk-section" aria-labelledby="falta">
              <SectionHeader id="falta">Para afinar el análisis</SectionHeader>
              <ul className="rk-card perf__missing">
                {s.dataQuality.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </PerfPage>
  );
}
