import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PlannedSessionData } from '../../application/ports/ritmo-plan-repository.port';
import {
  fromTemplate,
  type CompletePlannedDayUseCase,
  type GetPlanWeekUseCase,
  type PlanWeek,
  type SetPlannedDayUseCase,
} from '../../application/use-cases/plan.use-cases';
import { ACTIVITY_KINDS } from '../../domain/entities/performance.entity';
import type { PlannedSession } from '../../domain/entities/plan.entity';
import { PLAN_TEMPLATES } from '../../domain/services/plan';

/**
 * Servidor MCP de Brío (ritmo): deja que una IA externa gestione el plan de
 * entreno del usuario hablando con él. Se crea uno por petición, ya atado al
 * usuario del token OAuth: las tools no reciben (ni pueden elegir) usuario.
 */
export interface RitmoMcpDeps {
  getWeek: GetPlanWeekUseCase;
  setDay: SetPlannedDayUseCase;
  completeDay: CompletePlannedDayUseCase;
}

const DAY = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Fecha no válida');

const LOADS = ['REST', 'LOW', 'MEDIUM', 'HIGH'] as const;
const LOAD_ES: Record<(typeof LOADS)[number], string> = {
  REST: 'descanso',
  LOW: 'baja',
  MEDIUM: 'media',
  HIGH: 'alta',
};
const KIND_ES: Record<string, string> = {
  STRENGTH: 'fuerza',
  RUN: 'carrera',
  CYCLE: 'bici',
  WALK: 'caminar',
  HIKE: 'senderismo',
  SWIM: 'natación',
  ELLIPTICAL: 'elíptica',
  OTHER_CARDIO: 'cardio',
  OTHER: 'otro',
};
const STATUS_ES: Record<string, string> = {
  DONE: 'hecha ✓',
  TODAY: 'hoy, pendiente',
  PLANNED: 'pendiente',
  MISSED: 'no hecha',
  SKIPPED: 'saltada',
  REST: 'descanso',
};
const WEEKDAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const TEMPLATE_CODES = PLAN_TEMPLATES.map((t) => t.code) as [
  string,
  ...string[],
];

const weekday = (day: string) =>
  WEEKDAY[new Date(`${day}T12:00:00Z`).getUTCDay()];
const pace = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}/km`;

function describeSession(s: PlannedSession): string {
  const bits = [
    s.title,
    KIND_ES[s.kind] ?? s.kind,
    s.load !== 'REST' ? `carga ${LOAD_ES[s.load]}` : null,
    s.startTime ? `a las ${s.startTime}` : null,
    s.plannedDurationMin ? `${s.plannedDurationMin} min` : null,
    s.plannedDistanceM
      ? `${Math.round(s.plannedDistanceM / 100) / 10} km`
      : null,
    s.targetPaceSecPerKm ? `ritmo ${pace(s.targetPaceSecPerKm)}` : null,
  ].filter(Boolean);
  return bits.join(' · ') + (s.notes ? ` — ${s.notes}` : '');
}

/** Resumen de la semana en texto, para que el modelo lo lea de un vistazo. */
export function weekText(w: PlanWeek): string {
  const lines = [
    `Semana ${w.isoWeek}: del ${w.from} al ${w.to}. Hoy es ${w.today} (${weekday(w.today)}).`,
  ];
  if (w.plan) {
    const race = w.plan.raceDate
      ? `, carrera el ${w.plan.raceDate}${w.plan.daysToRace !== null ? ` (faltan ${w.plan.daysToRace} días)` : ''}`
      : '';
    lines.push(`Objetivo: ${w.plan.name}${race}.`);
  }
  for (const d of w.days) {
    const head = `- ${weekday(d.day)} ${d.day}`;
    if (!d.planned) {
      lines.push(
        `${head}: sin sesión${d.actual ? ` (entrenó: ${d.actual.title}, ${Math.round(d.actual.durationSec / 60)} min)` : ''}.`,
      );
      continue;
    }
    const done =
      d.status === 'DONE' && d.actual ? ` con «${d.actual.title}»` : '';
    const notes = d.planned.actualNotes
      ? ` Notas: ${d.planned.actualNotes}`
      : '';
    lines.push(
      `${head}: ${describeSession(d.planned)} [${STATUS_ES[d.status] ?? d.status}${done}]${notes}`,
    );
  }
  const s = w.summary;
  lines.push(
    `Resumen: ${s.done} de ${s.planned} sesiones hechas, ${s.missed} sin hacer, ${s.plannedMinutes} min planificados.`,
  );
  return lines.join('\n');
}

const text = (t: string, isError = false) => ({
  content: [{ type: 'text' as const, text: t }],
  ...(isError ? { isError: true } : {}),
});
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Error inesperado.';

export function buildRitmoMcpServer(
  userId: string,
  deps: RitmoMcpDeps,
): McpServer {
  const server = new McpServer(
    { name: 'brio-ritmo', title: 'Brío · plan de entreno', version: '1.0.0' },
    {
      instructions:
        'Gestiona el plan de entreno del usuario en Brío. Las fechas van en YYYY-MM-DD, en la zona horaria del usuario; ' +
        'llama primero a listar_plan para saber qué día es hoy y qué hay planificado. Cada día tiene como mucho una sesión: ' +
        'crear_sesion sustituye la que hubiera. Confirma con el usuario antes de sobrescribir una sesión ya planificada.',
    },
  );

  server.registerTool(
    'listar_plan',
    {
      title: 'Ver la semana del plan',
      description:
        'Devuelve la semana de entreno (lunes a domingo): la sesión planificada de cada día, si está hecha, saltada o pendiente, ' +
        'lo que se entrenó de verdad, el objetivo (carrera) y un resumen. Sin «semana», la semana actual.',
      inputSchema: {
        semana: DAY.optional().describe(
          'Cualquier día (YYYY-MM-DD) de la semana que quieres ver. Por defecto, la actual.',
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ semana }) => {
      try {
        const week = await deps.getWeek.execute(userId, semana ?? null);
        return {
          ...text(weekText(week)),
          structuredContent: { ...week },
        };
      } catch (e) {
        return text(`No se pudo leer el plan: ${message(e)}`, true);
      }
    },
  );

  server.registerTool(
    'crear_sesion',
    {
      title: 'Planificar una sesión',
      description:
        'Pone la sesión de entreno de un día (sustituye la que hubiera). Dos formas: con «plantilla» ' +
        `(${PLAN_TEMPLATES.map((t) => `${t.code} = ${t.title}`).join('; ')}), ajustando lo que haga falta con el resto de campos; ` +
        'o sin plantilla, indicando como mínimo tipo, titulo y carga. Para un día de descanso usa la plantilla «rest».',
      inputSchema: {
        dia: DAY.describe('Día de la sesión, YYYY-MM-DD.'),
        plantilla: z
          .enum(TEMPLATE_CODES)
          .optional()
          .describe('Código de plantilla de partida.'),
        tipo: z
          .enum(ACTIVITY_KINDS)
          .optional()
          .describe(
            'Disciplina: STRENGTH, RUN, CYCLE, WALK, HIKE, SWIM, ELLIPTICAL, OTHER_CARDIO u OTHER.',
          ),
        titulo: z
          .string()
          .min(2)
          .max(120)
          .optional()
          .describe('Nombre corto, p. ej. «Series 5 × 1000 m».'),
        carga: z
          .enum(LOADS)
          .optional()
          .describe(
            'Carga prevista: REST, LOW, MEDIUM o HIGH. Mueve las calorías de ese día.',
          ),
        hora: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional()
          .describe('Hora de inicio HH:MM.'),
        duracion_min: z
          .number()
          .int()
          .min(1)
          .max(720)
          .optional()
          .describe('Duración prevista en minutos.'),
        distancia_km: z
          .number()
          .min(0)
          .max(1000)
          .optional()
          .describe('Distancia prevista en km.'),
        ritmo_objetivo: z
          .string()
          .regex(/^\d{1,2}:[0-5]\d$/)
          .optional()
          .describe('Ritmo objetivo por km, m:ss (p. ej. 4:45).'),
        notas: z
          .string()
          .max(500)
          .optional()
          .describe('Detalle: calentamiento, series, ejercicios…'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (a) => {
      try {
        const changes: Partial<PlannedSessionData> = {};
        if (a.tipo) changes.kind = a.tipo;
        if (a.titulo) changes.title = a.titulo.trim();
        if (a.carga) changes.load = a.carga;
        if (a.hora) changes.startTime = a.hora;
        if (a.duracion_min !== undefined)
          changes.plannedDurationMin = a.duracion_min;
        if (a.distancia_km !== undefined)
          changes.plannedDistanceM = Math.round(a.distancia_km * 1000);
        if (a.ritmo_objetivo) {
          const [m, s] = a.ritmo_objetivo.split(':').map(Number);
          const sec = m * 60 + s;
          if (sec < 120 || sec > 1200)
            return text(
              'El ritmo objetivo tiene que estar entre 2:00 y 20:00 por km.',
              true,
            );
          changes.targetPaceSecPerKm = sec;
        }
        if (a.notas !== undefined) changes.notes = a.notas.trim() || null;

        let data: PlannedSessionData | null;
        if (a.plantilla) {
          data = fromTemplate(a.plantilla, changes);
        } else {
          if (!a.tipo || !a.titulo || !a.carga) {
            return text(
              'Sin plantilla hacen falta tipo, titulo y carga.',
              true,
            );
          }
          data = {
            kind: a.tipo,
            templateCode: null,
            title: a.titulo.trim(),
            load: a.carga,
            startTime: null,
            plannedDurationMin: null,
            plannedDistanceM: null,
            targetPaceSecPerKm: null,
            structure: null,
            notes: null,
            ...changes,
          };
        }
        if (!data) return text('Plantilla desconocida.', true);
        const saved = await deps.setDay.execute(userId, a.dia, data);
        return {
          ...text(
            `Planificado para el ${weekday(saved.day)} ${saved.day}: ${describeSession(saved)}.`,
          ),
          structuredContent: { ...saved },
        };
      } catch (e) {
        return text(`No se pudo planificar: ${message(e)}`, true);
      }
    },
  );

  server.registerTool(
    'marcar_completada',
    {
      title: 'Marcar una sesión como hecha',
      description:
        'Marca la sesión planificada de un día como hecha (o la desmarca), con notas opcionales de cómo fue. ' +
        'Con hecha=false y saltada=true la deja como saltada a propósito. El día tiene que tener una sesión planificada.',
      inputSchema: {
        dia: DAY.describe('Día de la sesión, YYYY-MM-DD.'),
        hecha: z
          .boolean()
          .default(true)
          .describe('true = hecha; false = desmarcar.'),
        saltada: z
          .boolean()
          .optional()
          .describe('Con hecha=false: se decidió no hacerla.'),
        notas: z
          .string()
          .max(500)
          .optional()
          .describe(
            'Cómo fue, en palabras del usuario: «8 km a 5:10, buenas piernas».',
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ dia, hecha, saltada, notas }) => {
      try {
        const s = await deps.completeDay.execute(userId, dia, {
          done: hecha,
          skipped: !hecha && !!saltada,
          actualNotes: notas ?? null,
        });
        const state = s.completedAt
          ? 'hecha ✓'
          : s.skipped
            ? 'saltada'
            : 'pendiente';
        return {
          ...text(
            `${s.title} del ${weekday(s.day)} ${s.day}: ${state}.${s.actualNotes ? ` Notas: ${s.actualNotes}` : ''}`,
          ),
          structuredContent: { ...s },
        };
      } catch (e) {
        const msg = message(e);
        return text(
          msg.includes('NOT_FOUND')
            ? `El ${dia} no tiene ninguna sesión planificada.`
            : `No se pudo marcar: ${msg}`,
          true,
        );
      }
    },
  );

  return server;
}
