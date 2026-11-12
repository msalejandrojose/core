import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { formatKcal, formatNumber, todayIn } from '../format';
import { useRitmoStore } from '../ritmo.store';
import { Chevron, ExampleTag, Icon, LargeTitle, Segmented } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { ErrorState, SkeletonList } from '@/components/ux';
import { avgOf, dayBuckets, isoWeek, lastWeightIn, monthBuckets, weekBuckets, type Bucket } from './stats';
import { useProgress } from './useProgress';
import { weightGoal } from './goals';
import './progress.css';

type Range = 'w' | 'm' | 'q';
const RANGES: { value: Range; label: string; days: number; period: string }[] = [
  { value: 'w', label: '7 días', days: 7, period: 'en 7 días' },
  { value: 'm', label: '4 semanas', days: 28, period: 'en 4 semanas' },
  { value: 'q', label: '3 meses', days: 92, period: 'en 3 meses' },
];

const W = 326;
const H = 96;
const PAD = 10;

/**
 * Progreso (lienzo "Progreso"): metas, evolución y más. Peso y balance
 * calórico son tuyos; lo "gastado" se estima con tu gasto diario (TDEE) más
 * lo que entrenas. Sueño, FC, VFC, VO2 máx. y pasos llegarán con Garmin o
 * Salud: hasta entonces enseñan el ejemplo del diseño, marcado.
 */
export default function ProgressPage() {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const [range, setRange] = useState<Range>('w');
  const cfg = RANGES.find((r) => r.value === range)!;
  const { data, error } = useProgress(cfg.days);
  const year = useProgress(365);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const buckets: Bucket[] = useMemo(
    () => (range === 'w' ? dayBuckets(today, 7) : range === 'm' ? weekBuckets(today, 4) : monthBuckets(today, 4)),
    [range, today],
  );

  const goal = profile && year.data ? weightGoal(profile, year.data.weights) : null;
  const tdee = profile?.tdeeKcal ?? null;

  // Peso: último del tramo, arrastrando el anterior si en ese tramo no hubo pesada.
  const weightSeries: (number | null)[] = [];
  if (data) {
    // Se parte de la última pesada ANTERIOR al periodo (del histórico del año):
    // sin ella la línea empezaría a mitad de gráfica.
    const before = year.data?.weights.filter((w) => w.day < buckets[0].from) ?? [];
    let prev: number | null = before.length ? before[before.length - 1].weightKg : null;
    for (const b of buckets) {
      const w: number | null = lastWeightIn(data.weights, b) ?? prev;
      weightSeries.push(w);
      prev = w;
    }
  }
  const known = weightSeries.filter((w): w is number => w !== null);
  const wNow = known.length ? known[known.length - 1] : (profile?.currentWeightKg ?? null);
  const wDelta = known.length > 1 ? known[known.length - 1] - known[0] : null;
  const wMax = known.length ? Math.max(...known) + 0.2 : 0;
  const wMin = known.length ? Math.min(...known) - 0.2 : 0;
  const colW = W / buckets.length;
  const points = weightSeries
    .map((w, i) =>
      w === null ? null : [Math.round(colW * i + colW / 2), Math.round(PAD + ((wMax - w) / (wMax - wMin || 1)) * (H - PAD * 2))],
    )
    .filter((p): p is number[] => p !== null);

  // Balance: ingeridas frente a gastadas estimadas (TDEE + entreno).
  const intake = buckets.map((b) => (data ? avgOf(data.days, b, (d) => d.kcalIn) : null));
  const burn = buckets.map((b) => (data && tdee !== null ? avgOf(data.days, b, (d) => tdee + d.kcalBurned) : null));
  const bMax = Math.max(1, ...intake.map((v) => v ?? 0), ...burn.map((v) => v ?? 0));
  const balances = intake.map((v, i) => (v !== null && burn[i] !== null ? v - burn[i]! : null)).filter((v): v is number => v !== null);
  const balanceAvg = balances.length ? Math.round(balances.reduce((s, v) => s + v, 0) / balances.length / 10) * 10 : null;

  const grid = { gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` };
  const barW = buckets.length > 4 ? 12 : 22;
  const sleep = range === 'w' ? [7.2, 6.5, 8.1, 7.8, 6.9, 7.4, 7.2] : [6.9, 7.1, 7.2, 7.1];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen progress">
          <div className="progress__top">
            <Link to="/tabs/settings" className="rk-textbtn">
              <Icon d={PATHS.sync} size={18} />
              Conexiones
            </Link>
          </div>
          <LargeTitle sub="Tus registros en Ritmo">Progreso</LargeTitle>

          <h2 className="progress__h2">Tus metas</h2>
          <div className="progress__list">
            <Link to="/tabs/progress/objetivos" className="progress__link">
              <span className="progress__ic progress__ic--activity" aria-hidden="true">
                <Icon d="M12 4a8 8 0 1 0 .01 0M12 8a4 4 0 1 0 .01 0" size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Objetivos</span>
                <span className="rk-row__sub">
                  {goal ? `${formatNumber(goal.target, 1)} kg · ${goal.etaLabel}` : 'Fija tu peso objetivo'}
                </span>
              </span>
              {goal ? <span className="rk-row__value">{goal.pct} %</span> : null}
              <Chevron />
            </Link>
            <Link to="/tabs/progress/rendimiento" className="progress__link">
              <span className="progress__ic progress__ic--tint" aria-hidden="true">
                <Icon d="M4 16l5-6 4 4 7-9" size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Rendimiento</span>
                <span className="rk-row__sub">Fuerza, cardio, carga y recomendaciones</span>
              </span>
              <Chevron />
            </Link>
            <Link to="/tabs/progress/informe" className="progress__link">
              <span className="progress__ic progress__ic--food" aria-hidden="true">
                <Icon d="M5 20V11M12 20V4M19 20v-7" size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Informe vs. objetivos</span>
                <span className="rk-row__sub">Ejercicio, calorías y comidas · día a año</span>
              </span>
              <Chevron />
            </Link>
            <Link to="/tabs/progress/resumen" className="progress__link">
              <span className="progress__ic progress__ic--tint" aria-hidden="true">
                <Icon d="M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Resumen semanal</span>
                <span className="rk-row__sub">Semana {isoWeek(today) - 1} · la de esta, el domingo</span>
              </span>
              <Chevron />
            </Link>
          </div>

          <h2 className="progress__h2">Tu evolución</h2>
          <Segmented label="Periodo" value={range} onChange={setRange} options={RANGES} />

          {error ? (
            <ErrorState message="No se pudo cargar tu progreso." />
          ) : !data ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <section aria-label="Peso" className="progress__card">
                <div className="progress__card-head">
                  <span className="progress__card-title progress__card-title--sleep">
                    <Icon d={PATHS.scale} size={16} stroke={2.2} />
                    Peso
                  </span>
                  <span className="progress__source">Tus pesadas</span>
                </div>
                <div className="progress__metric">
                  <span className="ritmo-metric">{wNow !== null ? formatNumber(wNow, 1) : '—'}</span>
                  <span className="progress__unit">kg</span>
                  {wDelta !== null ? (
                    <span className="progress__delta">
                      {wDelta > 0 ? '+' : ''}
                      {formatNumber(wDelta, 1)} kg {cfg.period}
                    </span>
                  ) : null}
                </div>
                {points.length > 1 ? (
                  <svg
                    role="img"
                    aria-label={`Peso de ${formatNumber(known[0], 1)} a ${formatNumber(known[known.length - 1], 1)} kg ${cfg.period}`}
                    width="100%"
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                  >
                    <path d={`M0 24H${W}M0 48H${W}M0 72H${W}`} stroke="var(--ritmo-bg)" strokeWidth="1" />
                    <polyline
                      points={points.map((p) => p.join(',')).join(' ')}
                      fill="none"
                      stroke="var(--ritmo-sleep)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={points[points.length - 1][0]}
                      cy={points[points.length - 1][1]}
                      r="4.5"
                      fill="var(--ritmo-sleep)"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <p className="rk-note progress__empty">Registra tu peso más de una vez para ver la tendencia.</p>
                )}
                <div className="progress__labels" style={grid}>
                  {buckets.map((b) => (
                    <span key={b.from}>{b.label}</span>
                  ))}
                </div>
              </section>

              <section aria-label="Balance calórico" className="progress__card">
                <div className="progress__card-head">
                  <span className="progress__card-title progress__card-title--food">
                    <Icon d="M12 3c2 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-5 1-8z" size={16} stroke={2.2} />
                    Balance calórico
                  </span>
                  <span className="progress__source">App · gasto estimado</span>
                </div>
                <div className="progress__metric">
                  <span className="ritmo-metric">
                    {balanceAvg !== null ? `${balanceAvg > 0 ? '+' : ''}${formatNumber(balanceAvg)}` : '—'}
                  </span>
                  <span className="progress__unit">kcal/día de media</span>
                </div>
                <div className="progress__bars" style={grid} aria-hidden="true">
                  {buckets.map((b, i) => (
                    <div key={b.from} className="progress__bar-col">
                      <span
                        style={{ width: barW, height: Math.round(((intake[i] ?? 0) / bMax) * 92), background: 'var(--ritmo-food)' }}
                      />
                      <span
                        style={{ width: barW, height: Math.round(((burn[i] ?? 0) / bMax) * 92), background: 'var(--ritmo-activity)' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="progress__labels" style={grid}>
                  {buckets.map((b) => (
                    <span key={b.from}>{b.label}</span>
                  ))}
                </div>
                <div className="progress__legend">
                  <span>
                    <i style={{ background: 'var(--ritmo-food)' }} />
                    Ingeridas
                  </span>
                  <span>
                    <i style={{ background: 'var(--ritmo-activity)' }} />
                    Gastadas
                  </span>
                </div>
              </section>

              <section aria-label="Sueño" className="progress__card">
                <div className="progress__card-head">
                  <span className="progress__card-title progress__card-title--sleep">
                    <Icon d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" size={16} stroke={2.2} />
                    Sueño
                  </span>
                  <ExampleTag />
                </div>
                <div className="progress__metric">
                  <span className="ritmo-metric">7 h 12</span>
                  <span className="progress__unit">de media</span>
                </div>
                <div className="progress__bars" style={{ gridTemplateColumns: `repeat(${sleep.length}, minmax(0, 1fr))` }} aria-hidden="true">
                  {sleep.map((h, i) => (
                    <div key={i} className="progress__bar-col progress__bar-col--short">
                      <span
                        style={{
                          width: sleep.length > 4 ? 26 : 44,
                          height: Math.round((h / 9) * 72),
                          borderRadius: 6,
                          background: h >= 7 ? 'var(--ritmo-sleep)' : '#B9B8F0',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="rk-note progress__empty">Llegará con Garmin o Apple Salud.</p>
              </section>

              <section aria-label="Más indicadores" className="progress__tiles">
                {[
                  { k: 'FC en reposo', v: '52', u: 'lpm', n: '−2 vs. mes anterior', c: 'heart' },
                  { k: 'VFC', v: '58', u: 'ms', n: 'En tu rango', c: 'heart' },
                  { k: 'VO2 máx.', v: '51', u: '', n: '+1 este mes', c: 'activity' },
                  { k: 'Pasos', v: '9.140', u: '', n: 'Media diaria', c: 'activity' },
                ].map((t) => (
                  <div key={t.k} className="progress__tile">
                    <span className={`progress__tile-k progress__tile-k--${t.c}`}>{t.k}</span>
                    <span className="progress__tile-v">
                      {t.v} {t.u ? <span>{t.u}</span> : null}
                    </span>
                    <span className="progress__tile-n">
                      <ExampleTag /> {t.n}
                    </span>
                  </div>
                ))}
              </section>
            </>
          )}

          <h2 className="progress__h2">Más</h2>
          <div className="progress__list">
            <Link to="/tabs/progress/medallas" className="progress__link">
              <span className="progress__ic progress__ic--gold" aria-hidden="true">
                <Icon d="M8 2l2 7M16 2l-2 7M12 9a6 6 0 1 0 .01 0" size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Medallas</span>
                <span className="rk-row__sub">Nueva: Compra en equipo · 7 de 12</span>
              </span>
              <Chevron />
            </Link>
            <Link to="/tabs/progress/digestion" className="progress__link">
              <span className="progress__ic progress__ic--earth" aria-hidden="true">
                <Icon d={PATHS.leaf} size={18} stroke={2.2} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Digestión</span>
                <span className="rk-row__sub">Escala de Bristol</span>
              </span>
              <Chevron />
            </Link>
            <Link to="/tabs/progress/anual" className="progress__link">
              <span className="progress__ic progress__ic--dark" aria-hidden="true">
                <Icon d="M12 4a8 8 0 1 1-7.4 5" size={18} stroke={2.6} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Tu {today.slice(0, 4)} en Ritmo</span>
                <span className="rk-row__sub">Tu año en historias · se abre en diciembre</span>
              </span>
              <Chevron />
            </Link>
          </div>
          {tdee === null ? (
            <p className="rk-note">Completa tu perfil para estimar lo que gastas cada día.</p>
          ) : (
            <p className="rk-note">Lo gastado es tu gasto diario estimado ({formatKcal(tdee)} kcal) más lo que entrenas.</p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
