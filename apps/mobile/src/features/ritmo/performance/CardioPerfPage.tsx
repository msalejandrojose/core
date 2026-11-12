import { useEffect, useState } from 'react';
import { formatNumber } from '../format';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { SectionHeader, Segmented } from '../ui/kit';
import {
  KIND_NAME,
  ORIGIN_NAME,
  RACE_NAME,
  SIGNAL_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  clock,
  minutes,
  pace,
  pct,
  shortDay,
} from './labels';
import { perfApi, type HeartConfig, type MeasuredOrEstimated, type Period } from './perf.api';
import { Bar, Chip, Empty, Estimated, PerfPage } from './ui';
import { Measurements } from './Measurements';
import { usePerf } from './usePerf';
import '../sheets/sheets.css';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
  { value: '6m', label: '6 m' },
  { value: 'all', label: 'Todo' },
];
const ZONE_COLOR = ['var(--ritmo-info)', 'var(--ritmo-activity)', 'var(--ritmo-gold)', 'var(--ritmo-food)', 'var(--ritmo-heart)'];
const METHODS: { value: HeartConfig['method']; label: string }[] = [
  { value: 'MAX_HR', label: '% FC máxima' },
  { value: 'HR_RESERVE', label: 'Reserva' },
  { value: 'CUSTOM', label: 'A mano' },
];

/** FC máxima, en reposo y método: de aquí salen las zonas y el TRIMP. */
function HeartForm({ onSaved }: { onSaved: () => void }) {
  const [max, setMax] = useState('');
  const [rest, setRest] = useState('');
  const [method, setMethod] = useState<HeartConfig['method']>('MAX_HR');
  /** Límite superior de Z1..Z4, en ppm (método «A mano»). */
  const [custom, setCustom] = useState(['', '', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    perfApi
      .heartConfig()
      .then((c) => {
        setMax(c.maxHr ? String(c.maxHr) : '');
        setRest(c.restingHr ? String(c.restingHr) : '');
        setMethod(c.method);
        if (c.customZones?.length === 4) setCustom(c.customZones.map(String));
      })
      .catch(() => undefined);
  }, []);

  const maxN = Number(max);
  const restN = Number(rest);
  const restOk = rest === '' || (restN >= 25 && restN <= 120);
  const zones = custom.map(Number);
  // Cuatro límites en ppm, de menor a mayor, y por debajo de la FC máxima si se ha dado.
  const customOk =
    custom.every((z) => z !== '') &&
    zones.every((z, i) => z >= 40 && z <= 240 && (i === 0 || z > zones[i - 1])) &&
    (max === '' || zones[3] < maxN);
  const maxOk = maxN >= 100 && maxN <= 240;
  const valid =
    method === 'CUSTOM'
      ? customOk && (max === '' || maxOk) && restOk
      : maxOk && (method === 'MAX_HR' ? restOk : rest !== '' && restOk);

  async function save() {
    setSaving(true);
    try {
      await perfApi.saveHeartConfig({
        method,
        ...(max ? { maxHr: maxN } : {}),
        ...(rest ? { restingHr: restN } : {}),
        ...(method === 'CUSTOM' ? { customZones: zones } : {}),
      });
      toast.success('Guardado', 'Tus zonas ya están recalculadas.');
      onSaved();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void) => (
    <div className="rk-row workout__row">
      <span className="rk-row__main rk-row__title">{label}</span>
      <label className="workout__num">
        <span className="rk-visually-hidden">{label}</span>
        <input type="text" inputMode="numeric" value={value} placeholder="—" onChange={(e) => set(e.target.value.replace(/\D/g, ''))} />
      </label>
      <span className="workout__unit">ppm</span>
    </div>
  );

  return (
    <section className="rk-section" aria-labelledby="fc">
      <SectionHeader id="fc">Tu frecuencia cardíaca</SectionHeader>
      <div className="rk-list">
        {field('FC máxima', max, setMax)}
        {field('FC en reposo', rest, setRest)}
      </div>
      <Segmented label="Método de zonas" value={method} onChange={setMethod} options={METHODS} />
      {method === 'CUSTOM' ? (
        <div className="rk-list">
          {custom.map((z, i) => (
            <div key={i} className="rk-row workout__row">
              <span className="rk-row__main rk-row__title">
                Z{i + 1} llega hasta
              </span>
              <label className="workout__num">
                <span className="rk-visually-hidden">Límite superior de la zona {i + 1}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={z}
                  placeholder="—"
                  onChange={(e) => setCustom((c) => c.map((x, j) => (j === i ? e.target.value.replace(/\D/g, '') : x)))}
                />
              </label>
              <span className="workout__unit">ppm</span>
            </div>
          ))}
        </div>
      ) : null}
      <button type="button" className="rk-btn rk-btn--small" disabled={!valid || saving} onClick={() => void save()}>
        Guardar
      </button>
      <p className="rk-note">
        {method === 'CUSTOM'
          ? 'Pon dónde acaba cada zona, de menor a mayor. La Z5 va desde el último límite hasta tu FC máxima.'
          : 'La reserva cardíaca (Karvonen) necesita también la FC en reposo.'}{' '}
        Con la FC máxima y la de reposo se calcula además tu carga cardiovascular.
      </p>
    </section>
  );
}

function Metric({ title, unit, m, format }: { title: string; unit: string; m: MeasuredOrEstimated; format: (v: number) => string }) {
  return (
    <div className="perf__card">
      <span className="perf__rec-title">{title}</span>
      {m.measured ? (
        <div className="perf__metric">
          <strong>
            {format(m.measured.value)} <span>{unit}</span>
          </strong>
          <span className="rk-row__sub perf__wrap">
            Medido · {ORIGIN_NAME[m.measured.origin] ?? m.measured.origin}
            {m.measured.sourceLabel ? ` (${m.measured.sourceLabel})` : ''} · {shortDay(m.measured.measuredOn)}
            {m.measured.heartRate ? ` · ${m.measured.heartRate} ppm` : ''}
          </span>
        </div>
      ) : null}
      {m.estimated ? (
        <div className="perf__metric">
          <strong>
            {format(m.estimated.value)} <span>{unit}</span> <Estimated />
          </strong>
          <span className="rk-row__sub perf__wrap">
            {m.estimated.method} · desde tu sesión del {shortDay(m.estimated.basisDay)}
            {m.estimated.heartRate ? ` · ${m.estimated.heartRate} ppm` : ''}
          </span>
          {m.estimated.caveats.map((c) => (
            <span key={c} className="rk-row__sub perf__wrap">
              {c}
            </span>
          ))}
        </div>
      ) : (
        <span className="rk-row__sub perf__wrap">{m.measured ? 'Sin estimación propia: ' : ''}{m.noEstimateReason}</span>
      )}
    </div>
  );
}

/** Cardio (CardioEngine): zonas, evolución, predicciones, VO2max y umbral. */
export default function CardioPerfPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data, error, reload } = usePerf(() => perfApi.cardio(period), period);
  return (
    <PerfPage
      title="Cardio"
      sub="Ritmo, pulsaciones y marcas"
      data={data}
      error={error}
      onRetry={reload}
      header={<Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIODS} small />}
    >
      {(a) => {
        const zoneTotal = a.timeInZones.seconds.reduce((x, y) => x + y, 0);
        return (
          <>
            {a.byKind.length ? (
              <section className="rk-section" aria-labelledby="disc">
                <SectionHeader id="disc">Por disciplina</SectionHeader>
                <div className="rk-list">
                  {a.byKind.map((k) => (
                    <div key={k.kind} className="rk-row perf__row">
                      <span className="rk-row__main">
                        <span className="rk-row__title">{KIND_NAME[k.kind] ?? k.kind}</span>
                        <span className="rk-row__sub perf__wrap">
                          {k.sessions} sesiones · {formatNumber(k.distanceM / 1000, 1)} km · {minutes(k.durationSec)}
                          {k.avgHeartRate ? ` · ${k.avgHeartRate} ppm` : ''}
                        </span>
                      </span>
                      <span className="rk-row__value">{k.kind === 'CYCLE' ? (k.avgSpeedKmh ? `${formatNumber(k.avgSpeedKmh, 1)} km/h` : '—') : `${pace(k.avgPaceSecPerKm)} /km`}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <Empty>No hay sesiones de cardio en este periodo.</Empty>
            )}

            {a.plateaus.length ? (
              <section className="rk-section" aria-labelledby="evo">
                <SectionHeader id="evo">Evolución · últimas 12 semanas</SectionHeader>
                <div className="perf__recs">
                  {a.plateaus.map((p) => (
                    <div key={p.kind} className="perf__card">
                      <div className="perf__card-head">
                        <span className="rk-row__main">
                          <span className="perf__rec-title">{KIND_NAME[p.kind] ?? p.kind}</span>
                          <span className="rk-row__sub perf__wrap">
                            {p.evidence.sessions} sesiones comparables · {p.evidence.metric === 'EFFICIENCY' ? 'eficiencia aeróbica' : 'velocidad'} {pct(p.evidence.changePct)}
                          </span>
                        </span>
                        <Chip tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip>
                      </div>
                      {p.evidence.baselinePaceSecPerKm !== null ? (
                        <span className="rk-row__sub perf__wrap">
                          Ritmo {pace(p.evidence.baselinePaceSecPerKm)} → {pace(p.evidence.recentPaceSecPerKm)} /km
                          {p.evidence.hrShiftAtSimilarPace !== null ? ` · ${p.evidence.hrShiftAtSimilarPace > 0 ? '+' : ''}${formatNumber(p.evidence.hrShiftAtSimilarPace, 0)} ppm a ritmo similar` : ''}
                        </span>
                      ) : null}
                      <div className="perf__signals">
                        {p.signals.map((s) => (
                          <span key={s}>{SIGNAL_LABEL[s] ?? s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="rk-note">Solo se comparan sesiones de 20 minutos o más y sin desnivel fuerte. La eficiencia aeróbica es velocidad por pulsación: mejorarla es ir más rápido a las mismas pulsaciones.</p>
              </section>
            ) : null}

            <section className="rk-section" aria-labelledby="zonas">
              <SectionHeader id="zonas">Zonas cardíacas</SectionHeader>
              {a.zones ? (
                <div className="rk-card perf__zones">
                  {a.zones.map((z, i) => (
                    <div key={z.zone} className="perf__zone">
                      <span className="perf__zone-n">Z{z.zone}</span>
                      <span className="rk-row__main">
                        <Bar value={zoneTotal ? a.timeInZones.seconds[i] / zoneTotal : 0} color={ZONE_COLOR[i]} />
                        <span className="rk-row__sub">
                          {z.min}–{z.max ?? '…'} ppm
                        </span>
                      </span>
                      <span className="rk-row__value">{minutes(a.timeInZones.seconds[i])}</span>
                    </div>
                  ))}
                  {a.timeInZones.estimatedSec ? (
                    <span className="rk-row__sub perf__wrap">
                      <Estimated /> {minutes(a.timeInZones.estimatedSec)} asignados por la FC media de la sesión, sin desglose del dispositivo.
                    </span>
                  ) : null}
                </div>
              ) : (
                <Empty>Indica tu FC máxima para calcular tus zonas.</Empty>
              )}
            </section>

            <HeartForm onSaved={reload} />

            <section className="rk-section" aria-labelledby="pred">
              <SectionHeader id="pred">Predicción de marcas</SectionHeader>
              {a.predictions ? (
                <>
                  <div className="rk-list">
                    {a.predictions.predictions.map((p) => (
                      <div key={p.race} className="rk-row perf__row">
                        <span className="rk-row__main">
                          <span className="rk-row__title">{RACE_NAME[p.race] ?? p.race}</span>
                          <span className="rk-row__sub">
                            Entre {clock(p.lowSec)} y {clock(p.highSec)} · ±{p.uncertaintyPct} %{p.extrapolated ? ' · distancia lejos de la base' : ''}
                          </span>
                        </span>
                        <span className="rk-row__value perf__big">{clock(p.timeSec)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="rk-note">
                    <Estimated /> Con Riegel, desde tu carrera de {formatNumber(a.predictions.basis.distanceM / 1000, 1)} km en {clock(a.predictions.basis.durationSec)} del {shortDay(a.predictions.basis.day)}. {a.predictions.assumptions.join(' ')}
                  </p>
                </>
              ) : (
                <Empty>Hace falta una carrera de 3 km o más, en llano, de los últimos 90 días.</Empty>
              )}
            </section>

            <section className="rk-section" aria-labelledby="fisio">
              <SectionHeader id="fisio">VO2max y umbral</SectionHeader>
              <div className="perf__recs">
                <Metric title="VO2max" unit="ml/kg/min" m={a.vo2max} format={(v) => formatNumber(v, 1)} />
                <Metric title="Umbral de lactato" unit="/km" m={a.lactateThreshold} format={(v) => pace(v)} />
              </div>
            </section>

            <Measurements onChange={reload} />
          </>
        );
      }}
    </PerfPage>
  );
}
