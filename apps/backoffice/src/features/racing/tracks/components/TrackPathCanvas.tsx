import { Redo2, Undo2 } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TERRAIN_LABELS, type TrackCellRow, type TrackTheme } from '../../types';
import { validateTrackPath } from '../validate-track-path';

type Terrain = NonNullable<TrackCellRow['terrain']>;

// Ciclo de pintado: clicar una celda ya dibujada avanza al siguiente terreno.
// Ausente (asfalto) es el punto de partida y de llegada — no hace falta
// pintar nada para tener un circuito válido (TASK-272, criterio de done).
const TERRAIN_CYCLE: (Terrain | undefined)[] = [undefined, 'ICE', 'MUD', 'WATER'];

function nextTerrain(current?: Terrain): Terrain | undefined {
  const i = TERRAIN_CYCLE.indexOf(current);
  return TERRAIN_CYCLE[(i + 1) % TERRAIN_CYCLE.length];
}

const TERRAIN_FILL: Record<Terrain, string> = {
  ASPHALT: 'fill-primary',
  ICE: 'fill-cyan-400',
  MUD: 'fill-amber-800',
  WATER: 'fill-blue-500',
};

function terrainFill(terrain?: Terrain): string {
  return terrain ? TERRAIN_FILL[terrain] : 'fill-primary';
}

// Rango fijo del lienzo: sobra para cualquier circuito real (el más largo
// sembrado, "nevado", va de x:-6..0, y:-2..4) y evita la complejidad de un
// lienzo que crece dinámicamente.
const RANGE = 10;
const CELL = 26;
const SIZE = (RANGE * 2 + 1) * CELL;

function toScreen(n: number): number {
  return (n + RANGE) * CELL;
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function neighborsOf(cell: { x: number; y: number }) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];
}

const THEME_BACKGROUND: Record<TrackTheme, string> = {
  MEADOW: 'fill-green-50',
  SNOW: 'fill-sky-50',
};

const THEME_GRID_LINE: Record<TrackTheme, string> = {
  MEADOW: 'stroke-green-200',
  SNOW: 'stroke-sky-200',
};

interface TrackPathCanvasProps {
  path: TrackCellRow[];
  onChange: (path: TrackCellRow[]) => void;
  theme: TrackTheme;
}

// Editor de trazado celda a celda. Las reglas de bucle cerrado, pasos
// ortogonales y sin repetir celda se garantizan POR CONSTRUCCIÓN: solo se
// puede clicar una celda vacía adyacente a la última para AÑADIRLA — nunca
// una diagonal, un salto o una ya usada. Lo único que puede fallar al cerrar
// el bucle es que la celda de salida no quede en recta (`validateTrackPath`
// lo detecta igual que el dominio del servidor).
//
// Pintar terreno (TASK-272) no es un paso aparte: clicar una celda que YA
// está en el trazado avanza su terreno al siguiente del ciclo (asfalto →
// hielo → barro → agua → asfalto), en vez de añadirla de nuevo.
export function TrackPathCanvas({ path, onChange, theme }: TrackPathCanvasProps) {
  const used = useMemo(() => new Set(path.map(cellKey)), [path]);

  const candidates = useMemo(() => {
    if (path.length === 0) return null; // cualquier celda vale para empezar
    const last = path[path.length - 1];
    return new Set(
      neighborsOf(last)
        .filter((n) => !used.has(cellKey(n)))
        .map(cellKey),
    );
  }, [path, used]);

  const validation = validateTrackPath(path);
  const status = describeDrawingState(path, validation);

  function handleCellClick(cell: { x: number; y: number }) {
    const key = cellKey(cell);
    if (used.has(key)) {
      onChange(
        path.map((c) =>
          cellKey(c) === key ? { ...c, terrain: nextTerrain(c.terrain) } : c,
        ),
      );
      return;
    }
    if (path.length > 0 && !candidates?.has(key)) return; // no adyacente
    onChange([...path, cell]);
  }

  function undo() {
    onChange(path.slice(0, -1));
  }

  function clear() {
    onChange([]);
  }

  const cells: { x: number; y: number }[] = [];
  for (let x = -RANGE; x <= RANGE; x++) {
    for (let y = -RANGE; y <= RANGE; y++) cells.push({ x, y });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-sm',
            validation.ok ? 'text-green-700' : 'text-muted-foreground',
          )}
        >
          {status}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={path.length === 0}
          >
            <Undo2 size={14} />
            Deshacer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={path.length === 0}
          >
            <Redo2 size={14} className="rotate-180" />
            Limpiar
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={THEME_BACKGROUND[theme]}
        >
          {cells.map((cell) => {
            const key = cellKey(cell);
            const isUsed = used.has(key);
            const isCandidate = !isUsed && (path.length === 0 || candidates?.has(key));
            return (
              <rect
                key={key}
                x={toScreen(cell.x)}
                y={toScreen(cell.y)}
                width={CELL}
                height={CELL}
                className={cn(
                  THEME_GRID_LINE[theme],
                  'cursor-pointer transition-colors',
                  isCandidate ? 'fill-primary/15 hover:fill-primary/30' : 'fill-transparent',
                )}
                strokeWidth={0.5}
                onClick={() => handleCellClick(cell)}
              />
            );
          })}

          {path.length > 1 && (
            <polyline
              points={path
                .map((c) => `${toScreen(c.x) + CELL / 2},${toScreen(c.y) + CELL / 2}`)
                .join(' ')}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {validation.ok && path.length > 1 && (
            <line
              x1={toScreen(path[path.length - 1].x) + CELL / 2}
              y1={toScreen(path[path.length - 1].y) + CELL / 2}
              x2={toScreen(path[0].x) + CELL / 2}
              y2={toScreen(path[0].y) + CELL / 2}
              className="stroke-primary"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}

          {path.map((cell, index) => (
            <g key={cellKey(cell)}>
              <circle
                cx={toScreen(cell.x) + CELL / 2}
                cy={toScreen(cell.y) + CELL / 2}
                r={CELL / 2 - 3}
                className={terrainFill(cell.terrain)}
              />
              {index === 0 && (
                <circle
                  cx={toScreen(cell.x) + CELL / 2}
                  cy={toScreen(cell.y) + CELL / 2}
                  r={CELL / 2 - 1.5}
                  fill="none"
                  className="stroke-amber-500"
                  strokeWidth={2}
                />
              )}
              <text
                x={toScreen(cell.x) + CELL / 2}
                y={toScreen(cell.y) + CELL / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white text-[10px] font-medium select-none"
              >
                {index}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="text-muted-foreground space-y-1 text-xs">
        <p>
          Clic en una celda vacía para añadirla al trazado. Clic en una celda
          ya dibujada para cambiar su terreno (asfalto por defecto). La celda
          con el anillo{' '}
          <span className="font-medium text-amber-600">ámbar</span> es la
          meta.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {(Object.entries(TERRAIN_LABELS) as [Terrain, string][]).map(
            ([terrain, label]) => (
              <span key={terrain} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block size-3 rounded-full',
                    TERRAIN_FILL[terrain],
                  )}
                />
                {label}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function describeDrawingState(
  path: TrackCellRow[],
  validation: ReturnType<typeof validateTrackPath>,
): string {
  if (path.length === 0) return 'Haz clic en una celda para empezar a dibujar.';
  if (path.length < 4) {
    return `Añade al menos ${4 - path.length} celda(s) más para poder cerrar el bucle.`;
  }
  if (validation.ok) return `✓ Trazado válido (${path.length} celdas).`;

  const last = path[path.length - 1];
  const first = path[0];
  const closingStep = Math.abs(first.x - last.x) + Math.abs(first.y - last.y);
  if (closingStep !== 1) {
    return 'Sigue dibujando y cierra el bucle junto a la celda 0 (la meta).';
  }
  return 'La meta no queda en recta al cerrar aquí — deshaz la última celda y prueba otro camino.';
}
