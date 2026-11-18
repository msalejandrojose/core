import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Segmented } from '../ui/kit';
import { formatNumber } from '../format';
import { perfApi, type ExerciseAnalysis, type Period } from '../performance/perf.api';
import './exercise-progress.css';

type Range = Extract<Period, '30d' | '90d' | '6m' | '1y'>;
const RANGES: { value: Range; label: string }[] = [
  { value: '30d', label: '1 mes' },
  { value: '90d', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 año' },
];
const RANGE_TEXT: Record<Range, string> = {
  '30d': 'en el último mes',
  '90d': 'en 3 meses',
  '6m': 'en 6 meses',
  '1y': 'en un año',
};

type Point = ExerciseAnalysis['history'][number];

const dayDate = (day: string) => new Date(`${day}T12:00:00`);
const shortDay = (day: string) => dayDate(day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const monthLabel = (day: string) => dayDate(day).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
const kg = (n: number) => `${formatNumber(n, n % 1 ? 1 : 0)} kg`;

/** Escala "bonita" para el eje: límites redondos y 3 marcas. */
function niceScale(values: number[], floorZero: boolean): { min: number; max: number; ticks: number[] } {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (floorZero) lo = 0;
  if (hi === lo) {
    hi += hi === 0 ? 1 : Math.abs(hi) * 0.1;
    lo = floorZero ? 0 : lo - Math.abs(lo) * 0.1;
  }
  const raw = (hi - lo) / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const min = Math.floor(lo / step) * step;
  const max = Math.max(min + 2 * step, Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
}

function useWidth(fallback = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return { ref, width };
}

const H = 132;
const PAD = { top: 12, right: 10, bottom: 22, left: 34 };

/**
 * Una línea en el tiempo. Los dos gráficos de la ficha comparten el eje de
 * fechas y la sesión señalada, pero cada uno tiene su escala (nunca dos ejes
 * en el mismo gráfico).
 */
function LineChart({
  points,
  value,
  format,
  title,
  floorZero,
  active,
  onActive,
}: {
  points: Point[];
  value: (p: Point) => number;
  format: (n: number) => string;
  title: string;
  floorZero: boolean;
  active: number | null;
  onActive: (i: number | null) => void;
}) {
  const { ref, width } = useWidth();
  const titleId = useId();
  const t0 = dayDate(points[0].day).getTime();
  const t1 = dayDate(points[points.length - 1].day).getTime();
  const span = Math.max(1, t1 - t0);
  const innerW = Math.max(40, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const values = points.map(value);
  const scale = niceScale(values, floorZero);
  const x = (p: Point) =>
    PAD.left + (points.length === 1 ? innerW / 2 : ((dayDate(p.day).getTime() - t0) / span) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(values[i]).toFixed(1)}`).join('');
  const area = `${path}L${x(points[points.length - 1]).toFixed(1)},${PAD.top + innerH}L${x(points[0]).toFixed(1)},${PAD.top + innerH}Z`;

  // Etiquetas de mes: una por mes como mucho y sin pisarse.
  const monthTicks: { x: number; label: string }[] = [];
  for (const p of points) {
    const px = x(p);
    const label = monthLabel(p.day);
    const last = monthTicks[monthTicks.length - 1];
    if (last && (last.label === label || px - last.x < 44)) continue;
    monthTicks.push({ x: px, label });
  }

  function pick(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i += 1)
      if (Math.abs(x(points[i]) - px) < Math.abs(x(points[best]) - px)) best = i;
    onActive(best);
  }

  const a = active !== null ? points[active] : null;
  return (
    <figure className="exprog__chart" aria-labelledby={titleId}>
      <figcaption id={titleId} className="exprog__chart-title">
        {title}
      </figcaption>
      <div ref={ref}>
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="exprog__svg"
          aria-hidden="true"
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onActive(null)}
        >
          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="exprog__grid" />
              <text x={PAD.left - 6} y={y(t)} className="exprog__tick" textAnchor="end" dominantBaseline="middle">
                {formatNumber(t, t % 1 ? 1 : 0)}
              </text>
            </g>
          ))}
          {monthTicks.map((m) => (
            <text key={`${m.label}${m.x}`} x={m.x} y={H - 6} className="exprog__tick" textAnchor="middle">
              {m.label}
            </text>
          ))}
          <path d={area} className="exprog__area" />
          <path d={path} className="exprog__line" />
          {points.length <= 40
            ? points.map((p, i) => <circle key={i} cx={x(p)} cy={y(values[i])} r={2.5} className="exprog__dot" />)
            : null}
          {a ? (
            <g>
              <line x1={x(a)} x2={x(a)} y1={PAD.top} y2={PAD.top + innerH} className="exprog__cross" />
              <circle cx={x(a)} cy={y(value(a))} r={5} className="exprog__marker" />
            </g>
          ) : (
            <circle
              cx={x(points[points.length - 1])}
              cy={y(values[values.length - 1])}
              r={4.5}
              className="exprog__marker"
            />
          )}
          {/* Zona táctil más grande que la línea. */}
          <rect x={PAD.left - 8} y={0} width={innerW + 16} height={H} fill="transparent" />
        </svg>
      </div>
      <span className="rk-visually-hidden">{format(values[values.length - 1])} en la última sesión.</span>
    </figure>
  );
}

/** Evolución de la carga y de las repeticiones de un ejercicio, con selector de periodo. */
export function ExerciseProgress({ exerciseId, isBodyweight }: { exerciseId: string; isBodyweight: boolean }) {
  const [range, setRange] = useState<Range>('90d');
  const [data, setData] = useState<ExerciseAnalysis | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    setError(false);
    setActive(null);
    perfApi
      .exerciseHistory(exerciseId, range)
      .then((r) => alive && setData(r.analysis))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [exerciseId, range]);

  const points = data?.history ?? [];
  const showWeight = !isBodyweight || points.some((p) => p.topWeightKg > 0);
  const first = points[0];
  const last = points[points.length - 1];
  const shown = active !== null ? points[active] : last;
  const delta = first && last && points.length > 1 ? last.topWeightKg - first.topWeightKg : null;

  return (
    <section className="exprog" aria-label="Tu evolución en este ejercicio">
      <h3 className="exguide__h">Tu evolución</h3>
      <Segmented label="Periodo" value={range} onChange={setRange} options={RANGES} small />

      {error ? (
        <p className="exguide__empty">No se ha podido cargar tu historial. Prueba otra vez en un rato.</p>
      ) : data === undefined ? (
        <div className="exprog__loading" aria-busy="true" aria-label="Cargando tu historial" />
      ) : !points.length ? (
        <p className="exguide__empty">
          {data ? `No lo has hecho ${RANGE_TEXT[range]}. Prueba con un periodo más largo.` : 'Aún no has registrado este ejercicio. Cuando lo hagas, aquí verás cómo progresas.'}
        </p>
      ) : (
        <>
          <div className="exprog__readout" aria-live="polite">
            <span className="exprog__readout-day">{active !== null ? shortDay(shown!.day) : 'Última sesión'}</span>
            {showWeight ? <span className="exprog__readout-v">{kg(shown!.topWeightKg)}</span> : null}
            <span className="exprog__readout-v">{shown!.totalReps} reps</span>
            <span className="exprog__readout-s">
              {shown!.workingSets} {shown!.workingSets === 1 ? 'serie' : 'series'}
            </span>
          </div>
          {delta !== null && showWeight ? (
            <p className="exprog__delta">
              {delta === 0
                ? `Misma carga ${RANGE_TEXT[range]}`
                : `${delta > 0 ? '+' : '−'}${kg(Math.abs(delta))} de carga ${RANGE_TEXT[range]}`}
              {' · '}
              {points.length} {points.length === 1 ? 'sesión' : 'sesiones'}
            </p>
          ) : (
            <p className="exprog__delta">
              {points.length} {points.length === 1 ? 'sesión' : 'sesiones'} {RANGE_TEXT[range]}
            </p>
          )}
          {showWeight ? (
            <LineChart
              points={points}
              value={(p) => p.topWeightKg}
              format={kg}
              title="Carga más alta (kg)"
              floorZero={false}
              active={active}
              onActive={setActive}
            />
          ) : null}
          <LineChart
            points={points}
            value={(p) => p.totalReps}
            format={(n) => `${n} repeticiones`}
            title="Repeticiones por sesión"
            floorZero
            active={active}
            onActive={setActive}
          />
          <button type="button" className="rk-textbtn exprog__table-btn" aria-expanded={table} onClick={() => setTable((v) => !v)}>
            {table ? 'Ocultar la tabla' : 'Ver como tabla'}
          </button>
          {table ? (
            <table className="exprog__table">
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  {showWeight ? <th scope="col">Carga máx.</th> : null}
                  <th scope="col">Reps</th>
                  <th scope="col">Series</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p, i) => (
                  <tr key={`${p.day}-${i}`}>
                    <td>{shortDay(p.day)}</td>
                    {showWeight ? <td>{kg(p.topWeightKg)}</td> : null}
                    <td>{p.totalReps}</td>
                    <td>{p.workingSets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </section>
  );
}
