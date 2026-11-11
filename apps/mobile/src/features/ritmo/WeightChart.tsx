interface WeightChartProps {
  points: { day: string; weightKg: number }[];
  /** Peso objetivo, si lo hay: se pinta como línea de referencia. */
  targetKg?: number | null;
}

const WIDTH = 320;
const HEIGHT = 160;
const PADDING = { top: 12, right: 8, bottom: 20, left: 34 };

/**
 * Serie de peso. SVG a mano, con `viewBox` y `preserveAspectRatio` para que
 * escale al ancho del móvil sin recalcular nada en JS.
 *
 * Sin librería de gráficas a propósito: es una polilínea con dos etiquetas de
 * eje, y cualquier librería pesaría más que toda esta feature.
 *
 * El eje Y NO arranca en cero: en una serie de peso, 0 kg aplasta la curva y
 * esconde justamente lo que interesa (variaciones de 1-2 kg). Se usa el rango
 * de los datos con un margen, y un mínimo de 2 kg de recorrido para que una
 * serie plana no se vea como una montaña.
 */
export function WeightChart({ points, targetKg }: WeightChartProps) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.weightKg);
  const rawMin = Math.min(...values, targetKg ?? Infinity);
  const rawMax = Math.max(...values, targetKg ?? -Infinity);
  // El span mínimo de 2 kg se reparte alrededor del centro: si solo se
  // acolchara por fuera, con datos planos ambas etiquetas redondearían igual.
  const span = Math.max(rawMax - rawMin, 2);
  const mid = (rawMin + rawMax) / 2;
  const min = mid - span / 2 - span * 0.15;
  const max = mid + span / 2 + span * 0.15;

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) =>
    PADDING.left +
    (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (value: number) =>
    PADDING.top + (1 - (value - min) / (max - min)) * innerH;

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.weightKg).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${(
    PADDING.top + innerH
  ).toFixed(1)} L${x(0).toFixed(1)} ${(PADDING.top + innerH).toFixed(1)} Z`;

  return (
    <svg
      className="ritmo-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Evolución del peso: de ${values[0].toFixed(1)} a ${values[
        values.length - 1
      ].toFixed(1)} kilos`}
    >
      <line
        className="ritmo-chart__grid"
        x1={PADDING.left}
        x2={WIDTH - PADDING.right}
        y1={PADDING.top + innerH}
        y2={PADDING.top + innerH}
      />
      {targetKg ? (
        <line
          className="ritmo-chart__grid"
          strokeDasharray="3 3"
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={y(targetKg)}
          y2={y(targetKg)}
        />
      ) : null}

      <path className="ritmo-chart__area" d={area} />
      <path className="ritmo-chart__line" d={line} />

      {/* Solo el último punto lleva marca: marcar todos convierte la curva en
          ruido cuando hay 30 pesadas. */}
      <circle
        className="ritmo-chart__dot"
        cx={x(points.length - 1)}
        cy={y(values[values.length - 1])}
        r={3.5}
      />

      <text className="ritmo-chart__axis" x={2} y={PADDING.top + 4}>
        {max.toFixed(0)}
      </text>
      <text className="ritmo-chart__axis" x={2} y={PADDING.top + innerH}>
        {min.toFixed(0)}
      </text>
    </svg>
  );
}
