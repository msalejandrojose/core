import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  AgentToolRegistry,
  type AgentTool,
} from '../../../agents/application/tool-registry';
import { GetDaySummaryUseCase } from '../../application/use-cases/get-day-summary.use-case';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.use-case';
import { ListActivityTypesUseCase } from '../../application/use-cases/list-activity-types.use-case';
import { LogActivitySessionUseCase } from '../../application/use-cases/log-activity-session.use-case';
import { LogMealEntryUseCase } from '../../application/use-cases/log-meal-entry.use-case';
import { SearchFoodsUseCase } from '../../application/use-cases/search-foods.use-case';
import {
  CompletePlannedDayUseCase,
  GetPlanWeekUseCase,
  SetPlannedDayUseCase,
  fromTemplate,
} from '../../application/use-cases/plan.use-cases';
import type { PlannedSessionData } from '../../application/ports/brio-plan-repository.port';
import {
  ACTIVITY_KINDS,
  type ActivityKind,
} from '../../domain/entities/performance.entity';
import type { PlanLoad } from '../../domain/entities/plan.entity';
import { PLAN_TEMPLATES } from '../../domain/services/plan';
import { GetRecoveryUseCase } from '../../application/use-cases/recovery.use-cases';
import { GetRecentHealthUseCase } from '../../application/use-cases/garmin.use-cases';
import { GetProgressUseCase } from '../../application/use-cases/get-progress.use-case';
import { GetPerformanceSummaryUseCase } from '../../application/use-cases/get-performance-summary.use-case';
import { DigestionUseCases } from '../../application/use-cases/digestion.use-cases';
import { LogWeightUseCase } from '../../application/use-cases/log-weight.use-case';
import { DeleteMealEntryUseCase } from '../../application/use-cases/delete-meal-entry.use-case';
import { CreateRecipeUseCase } from '../../application/use-cases/create-recipe.use-case';
import type { MealType } from '../../domain/entities/meal-entry.entity';
import {
  PERFORMANCE_PERIODS,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import { summarizeHealth, summarizeProgress } from './agent-summaries';
import { dayInTimezone } from '../../domain/services/calendar';

const MEALS: MealType[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
const PLAN_LOADS: PlanLoad[] = ['REST', 'LOW', 'MEDIUM', 'HIGH'];
const DAY = { type: 'string', description: 'Día YYYY-MM-DD. Si falta, hoy.' };

const str = (v: unknown) =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const numOr = (v: unknown, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : d;

/**
 * Herramientas de Brío para los agentes de IA: leer el día, el perfil, el plan
 * y la recuperación, buscar alimentos y apuntar comidas y entrenos. Siempre
 * actúan sobre la persona que habla con el agente.
 */
@Injectable()
export class BrioAgentTools implements OnModuleInit {
  constructor(
    private readonly registry: AgentToolRegistry,
    private readonly day: GetDaySummaryUseCase,
    private readonly profile: GetMyProfileUseCase,
    private readonly foods: SearchFoodsUseCase,
    private readonly logMeal: LogMealEntryUseCase,
    private readonly activityTypes: ListActivityTypesUseCase,
    private readonly logActivity: LogActivitySessionUseCase,
    private readonly planWeek: GetPlanWeekUseCase,
    private readonly setPlanDay: SetPlannedDayUseCase,
    private readonly completePlanDay: CompletePlannedDayUseCase,
    private readonly recovery: GetRecoveryUseCase,
    private readonly health: GetRecentHealthUseCase,
    private readonly progress: GetProgressUseCase,
    private readonly performance: GetPerformanceSummaryUseCase,
    private readonly digestion: DigestionUseCases,
    private readonly logWeight: LogWeightUseCase,
    private readonly deleteMeal: DeleteMealEntryUseCase,
    private readonly createRecipe: CreateRecipeUseCase,
  ) {}

  onModuleInit(): void {
    for (const tool of this.tools()) this.registry.register(tool);
  }

  private tools(): AgentTool[] {
    return [
      {
        code: 'brio_get_day',
        label: 'Ver el día (comidas, entrenos y kcal)',
        description:
          'Resumen de un día de la persona: kcal comidas, objetivo, gastadas entrenando, macros y lo que ha comido y entrenado.',
        parameters: {
          type: 'object',
          properties: { day: DAY },
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const s = await this.day.execute(ctx.userId, str(args.day));
          return {
            day: s.day,
            kcalIn: s.log.kcalIn,
            kcalTarget: s.log.kcalTarget,
            kcalBurned: s.log.kcalBurned,
            proteinG: s.log.proteinG,
            carbsG: s.log.carbsG,
            fatG: s.log.fatG,
            weightKg: s.log.weightKg,
            meals: s.meals.map((m) => ({
              entryId: m.id,
              meal: m.mealType,
              name: m.name,
              grams: m.quantityG,
              kcal: m.kcal,
            })),
            workouts: s.sessions.map((w) => ({
              type: w.activityTypeName,
              minutes: Math.round(w.durationSec / 60),
              kcal: w.kcalBurned,
              distanceKm: w.distanceM
                ? Math.round(w.distanceM / 100) / 10
                : null,
            })),
          };
        },
      },
      {
        code: 'brio_get_profile',
        label: 'Ver el perfil y los objetivos',
        description:
          'Perfil de la persona: objetivo, kcal y macros diarios, peso actual, altura, actividad.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        run: async (_args, ctx) => {
          const { profile, currentWeightKg } = await this.profile.execute(
            ctx.userId,
          );
          return {
            goal: profile.goalType,
            dailyKcalTarget: profile.dailyKcalTarget,
            proteinTargetG: profile.proteinTargetG,
            carbsTargetG: profile.carbsTargetG,
            fatTargetG: profile.fatTargetG,
            currentWeightKg,
            sex: profile.sex,
            birthDate: profile.birthDate,
          };
        },
      },
      {
        code: 'brio_search_foods',
        label: 'Buscar alimentos',
        description:
          'Busca en el catálogo de alimentos (platos típicos incluidos). Devuelve id, nombre, kcal por 100 g y raciones. Úsala antes de apuntar una comida para tener el foodId.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Texto a buscar, p. ej. "tostada".',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const found = await this.foods.execute({
            userId: ctx.userId,
            query: str(args.query) ?? '',
            limit: 8,
          });
          return found.map((f) => ({
            foodId: f.id,
            name: f.name,
            kcalPer100: f.kcalPer100,
            servings: f.servings.map((s) => ({
              servingId: s.id,
              label: s.label,
              grams: s.grams,
            })),
          }));
        },
      },
      {
        code: 'brio_log_meal',
        label: 'Apuntar una comida',
        description:
          'Apunta algo que ha comido la persona. Con foodId (de brio_search_foods) y, si hay, servingId y quantity en raciones; o sin catálogo con customName y kcal. mealType: BREAKFAST, LUNCH, SNACK o DINNER. Confirma con la persona antes de apuntar si no está claro.',
        parameters: {
          type: 'object',
          properties: {
            mealType: { type: 'string', enum: MEALS },
            day: DAY,
            foodId: { type: 'string' },
            servingId: { type: 'string' },
            quantity: {
              type: 'number',
              description: 'Raciones si hay servingId; si no, gramos.',
            },
            customName: { type: 'string' },
            kcal: { type: 'number' },
          },
          required: ['mealType'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const mealType = MEALS.includes(args.mealType as MealType)
            ? (args.mealType as MealType)
            : 'LUNCH';
          const foodId = str(args.foodId);
          const servingId = str(args.servingId);
          const entry = await this.logMeal.execute({
            userId: ctx.userId,
            loggedOn: str(args.day) ?? dayInTimezone(new Date(), ctx.timeZone),
            mealType,
            foodId,
            servingId,
            quantity: numOr(args.quantity, foodId ? (servingId ? 1 : 100) : 1),
            customName: str(args.customName),
            kcal: typeof args.kcal === 'number' ? args.kcal : undefined,
          });
          return {
            ok: true,
            logged: {
              entryId: entry.id,
              name: entry.name,
              kcal: entry.kcal,
              meal: entry.mealType,
              day: entry.loggedOn,
            },
          };
        },
      },
      {
        code: 'brio_list_activity_types',
        label: 'Ver los tipos de entreno',
        description:
          'Tipos de actividad con su id (correr, fuerza, bici…). Úsala antes de apuntar un entreno.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        run: async (_args, ctx) =>
          (await this.activityTypes.execute(ctx.userId)).map((t) => ({
            activityTypeId: t.id,
            name: t.name,
            kind: t.kind,
          })),
      },
      {
        code: 'brio_log_workout',
        label: 'Apuntar un entreno',
        description:
          'Apunta un entreno hecho: activityTypeId (de brio_list_activity_types), minutos y, si se sabe, distancia en km y esfuerzo (RPE 1-10). Las kcal se calculan solas.',
        parameters: {
          type: 'object',
          properties: {
            activityTypeId: { type: 'string' },
            durationMinutes: { type: 'number' },
            distanceKm: { type: 'number' },
            rpe: { type: 'number' },
            day: DAY,
            notes: { type: 'string' },
          },
          required: ['activityTypeId', 'durationMinutes'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const day = str(args.day);
          const startedAt = day ? new Date(`${day}T12:00:00Z`) : new Date();
          const rpe =
            typeof args.rpe === 'number'
              ? Math.min(10, Math.max(1, Math.round(args.rpe)))
              : null;
          const session = await this.logActivity.execute({
            userId: ctx.userId,
            activityTypeId: str(args.activityTypeId) ?? '',
            startedAt,
            durationSec: Math.max(
              60,
              Math.round(numOr(args.durationMinutes, 30) * 60),
            ),
            distanceM:
              typeof args.distanceKm === 'number'
                ? Math.round(args.distanceKm * 1000)
                : null,
            avgHeartRate: null,
            rpe,
            effort: null,
            notes: str(args.notes) ?? null,
          });
          return {
            ok: true,
            logged: {
              type: session.activityTypeName,
              minutes: Math.round(session.durationSec / 60),
              kcal: session.kcalBurned,
            },
          };
        },
      },
      {
        code: 'brio_get_plan_week',
        label: 'Ver el plan de la semana',
        description:
          'Plan de entrenos de la semana y las kcal de cada día según su carga.',
        parameters: {
          type: 'object',
          properties: { day: DAY },
          additionalProperties: false,
        },
        run: async (args, ctx) =>
          this.planWeek.execute(ctx.userId, str(args.day) ?? null),
      },
      {
        code: 'brio_set_plan_day',
        label: 'Planificar la sesión de un día',
        description:
          'Pone la sesión de entreno de un día del plan (sustituye la que hubiera; confirma antes de pisar una ya planificada). ' +
          `Con «template» se parte de una plantilla (${PLAN_TEMPLATES.map((t) => `${t.code} = ${t.title}`).join('; ')}) y el resto de campos la ajustan; ` +
          'sin plantilla hacen falta kind, title y load. Para un día de descanso, template «rest».',
        parameters: {
          type: 'object',
          properties: {
            day: { type: 'string', description: 'Día YYYY-MM-DD.' },
            template: {
              type: 'string',
              enum: PLAN_TEMPLATES.map((t) => t.code),
            },
            kind: { type: 'string', enum: [...ACTIVITY_KINDS] },
            title: {
              type: 'string',
              description: 'Nombre corto, p. ej. «Series 5 × 1000 m».',
            },
            load: {
              type: 'string',
              enum: [...PLAN_LOADS],
              description: 'Carga: mueve las kcal de ese día.',
            },
            startTime: { type: 'string', description: 'Hora HH:MM.' },
            durationMin: { type: 'number' },
            distanceKm: { type: 'number' },
            targetPace: {
              type: 'string',
              description: 'Ritmo objetivo por km, m:ss (p. ej. 4:45).',
            },
            notes: {
              type: 'string',
              description: 'Detalle: calentamiento, series, ejercicios…',
            },
          },
          required: ['day'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const day = str(args.day);
          if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day))
            return { error: 'day debe ser YYYY-MM-DD.' };
          const kind = ACTIVITY_KINDS.includes(args.kind as ActivityKind)
            ? (args.kind as ActivityKind)
            : undefined;
          const load = PLAN_LOADS.includes(args.load as PlanLoad)
            ? (args.load as PlanLoad)
            : undefined;
          const changes: Partial<PlannedSessionData> = {};
          if (kind) changes.kind = kind;
          if (str(args.title)) changes.title = str(args.title)!.slice(0, 120);
          if (load) changes.load = load;
          const time = str(args.startTime);
          if (time) {
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
              return { error: 'startTime debe ser HH:MM.' };
            changes.startTime = time;
          }
          if (typeof args.durationMin === 'number')
            changes.plannedDurationMin = Math.max(
              1,
              Math.min(720, Math.round(args.durationMin)),
            );
          if (typeof args.distanceKm === 'number')
            changes.plannedDistanceM = Math.max(
              0,
              Math.round(args.distanceKm * 1000),
            );
          const pace = str(args.targetPace);
          if (pace) {
            const m = /^(\d{1,2}):([0-5]\d)$/.exec(pace);
            const sec = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
            if (sec < 120 || sec > 1200)
              return { error: 'targetPace entre 2:00 y 20:00 por km.' };
            changes.targetPaceSecPerKm = sec;
          }
          if (typeof args.notes === 'string')
            changes.notes = args.notes.trim().slice(0, 500) || null;

          const template = str(args.template);
          let data: PlannedSessionData | null;
          if (template) {
            data = fromTemplate(template, changes);
            if (!data) return { error: 'Plantilla desconocida.' };
          } else {
            if (!kind || !changes.title || !load)
              return { error: 'Sin plantilla hacen falta kind, title y load.' };
            data = {
              kind,
              templateCode: null,
              title: changes.title,
              load,
              startTime: null,
              plannedDurationMin: null,
              plannedDistanceM: null,
              targetPaceSecPerKm: null,
              structure: null,
              notes: null,
              ...changes,
            };
          }
          const s = await this.setPlanDay.execute(ctx.userId, day, data);
          return {
            ok: true,
            planned: {
              day: s.day,
              title: s.title,
              kind: s.kind,
              load: s.load,
              startTime: s.startTime,
              durationMin: s.plannedDurationMin,
            },
          };
        },
      },
      {
        code: 'brio_complete_plan_day',
        label: 'Marcar una sesión del plan como hecha',
        description:
          'Marca la sesión planificada de un día como hecha (o la desmarca), con notas de cómo fue. Con done=false y skipped=true la deja como saltada a propósito.',
        parameters: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              description: 'Día YYYY-MM-DD. Si falta, hoy.',
            },
            done: {
              type: 'boolean',
              description: 'true = hecha (por defecto); false = desmarcar.',
            },
            skipped: {
              type: 'boolean',
              description: 'Con done=false: se decidió no hacerla.',
            },
            notes: {
              type: 'string',
              description: 'Cómo fue, en palabras de la persona.',
            },
          },
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const day = str(args.day) ?? dayInTimezone(new Date(), ctx.timeZone);
          const done = args.done !== false;
          try {
            const s = await this.completePlanDay.execute(ctx.userId, day, {
              done,
              skipped: !done && args.skipped === true,
              actualNotes:
                typeof args.notes === 'string'
                  ? args.notes.trim().slice(0, 500) || null
                  : null,
            });
            return {
              ok: true,
              day: s.day,
              title: s.title,
              state: s.completedAt
                ? 'hecha'
                : s.skipped
                  ? 'saltada'
                  : 'pendiente',
            };
          } catch (e) {
            const msg = e instanceof Error ? e.message : '';
            return {
              error: msg.includes('NOT_FOUND')
                ? `El ${day} no tiene ninguna sesión planificada.`
                : 'No se pudo marcar la sesión.',
            };
          }
        },
      },
      {
        code: 'brio_get_recovery',
        label: 'Ver la recuperación',
        description:
          'Nota de recuperación de hoy (sueño, pulso, carga) y lo que toca mañana.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        run: async (_args, ctx) => this.recovery.execute(ctx.userId),
      },
      {
        code: 'brio_get_health',
        label: 'Ver la salud del reloj (sueño, pulso, VFC)',
        description:
          'Datos de salud del reloj de las últimas 2 semanas: horas de sueño y sueño profundo, puntuación de sueño, pulso en reposo, variabilidad (HRV), pasos, estrés y body battery; y sueño, HRV y pulso frente a su media. connected=false si no tiene reloj conectado.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        run: async (_args, ctx) =>
          summarizeHealth(await this.health.execute(ctx.userId)),
      },
      {
        code: 'brio_get_progress',
        label: 'Ver el progreso (peso, comida y entrenos)',
        description:
          'Resumen de los últimos N días (7-90): evolución del peso, media de kcal comidas frente al objetivo, proteína media, días pasados de kcal y entrenos hechos.',
        parameters: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: 'Días hacia atrás, de 7 a 90. Por defecto 30.',
            },
          },
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const days = Math.min(
            90,
            Math.max(7, Math.round(numOr(args.days, 30))),
          );
          return summarizeProgress(
            await this.progress.execute({ userId: ctx.userId, days }),
          );
        },
      },
      {
        code: 'brio_get_performance',
        label: 'Ver el rendimiento (fuerza, cardio, fatiga)',
        description:
          'Resumen de rendimiento del periodo: progresión de fuerza, cardio, fatiga, músculos trabajados y recomendaciones del motor de Brío. period: 7d, 30d, 90d, 6m o all.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: [...PERFORMANCE_PERIODS] },
          },
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const period = PERFORMANCE_PERIODS.includes(
            args.period as PerformancePeriod,
          )
            ? (args.period as PerformancePeriod)
            : '30d';
          return this.performance.execute(ctx.userId, period);
        },
      },
      {
        code: 'brio_get_digestion',
        label: 'Ver la digestión',
        description:
          'Deposiciones registradas (escala de Bristol 1-7): veces al día, % de tipo normal (3-5), días sin y días con su tipo. period: WEEK, MONTH o YEAR.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['WEEK', 'MONTH', 'YEAR'] },
          },
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const period = ['WEEK', 'MONTH', 'YEAR'].includes(
            args.period as string,
          )
            ? (args.period as 'WEEK' | 'MONTH' | 'YEAR')
            : 'WEEK';
          const view = await this.digestion.view(ctx.userId, period);
          return { summary: view.summary, days: view.days };
        },
      },
      {
        code: 'brio_log_weight',
        label: 'Apuntar el peso',
        description:
          'Apunta una pesada de la persona (kg). Úsala cuando te diga su peso o mande la foto de la báscula. Recalcula sus objetivos de kcal. Una pesada por día: si ya había una ese día, la sustituye.',
        parameters: {
          type: 'object',
          properties: {
            weightKg: {
              type: 'number',
              description: 'Peso en kg, p. ej. 78.4.',
            },
            day: DAY,
            bodyFatPct: {
              type: 'number',
              description: '% de grasa si la báscula lo da.',
            },
            waistCm: { type: 'number' },
          },
          required: ['weightKg'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const kg = numOr(args.weightKg, 0);
          if (kg < 25 || kg > 350)
            return { error: 'Peso fuera de rango (25–350 kg).' };
          const fat =
            typeof args.bodyFatPct === 'number' ? args.bodyFatPct : null;
          const waist = typeof args.waistCm === 'number' ? args.waistCm : null;
          const m = await this.logWeight.execute({
            userId: ctx.userId,
            measuredOn:
              str(args.day) ?? dayInTimezone(new Date(), ctx.timeZone),
            weightKg: Math.round(kg * 10) / 10,
            bodyFatPct: fat,
            waistCm: waist,
            notes: null,
          });
          return {
            ok: true,
            logged: { weightKg: m.weightKg, day: m.measuredOn },
          };
        },
      },
      {
        code: 'brio_delete_meal',
        label: 'Borrar una comida apuntada',
        description:
          'Borra una comida que estaba apuntada (entryId de brio_get_day o de brio_log_meal). Úsala para corregir: si la persona dice que algo está mal, bórralo y apunta lo correcto.',
        parameters: {
          type: 'object',
          properties: { entryId: { type: 'string' } },
          required: ['entryId'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const id = str(args.entryId);
          if (!id) return { error: 'Falta entryId.' };
          await this.deleteMeal.execute(id, ctx.userId);
          return { ok: true };
        },
      },
      {
        code: 'brio_create_recipe',
        label: 'Crear una receta',
        description:
          'Guarda una receta de la persona como alimento propio, con sus ingredientes (foodId de brio_search_foods y gramos de cada uno) y cuántas raciones salen. Calcula kcal y macros por ración. Después se puede apuntar con brio_log_meal (foodId de la receta). Si falta algún ingrediente en el catálogo, usa el más parecido y dilo.',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Nombre de la receta, p. ej. «Lentejas de mi madre».',
            },
            servings: {
              type: 'number',
              description: 'Raciones que salen. Por defecto 1.',
            },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  foodId: { type: 'string' },
                  grams: { type: 'number' },
                },
                required: ['foodId', 'grams'],
                additionalProperties: false,
              },
            },
          },
          required: ['name', 'ingredients'],
          additionalProperties: false,
        },
        run: async (args, ctx) => {
          const name = str(args.name);
          const list = Array.isArray(args.ingredients) ? args.ingredients : [];
          const ingredients = list
            .map((i) => i as { foodId?: unknown; grams?: unknown })
            .filter(
              (i) =>
                typeof i.foodId === 'string' && typeof i.grams === 'number',
            )
            .map((i) => ({
              foodId: i.foodId as string,
              grams: i.grams as number,
            }))
            .slice(0, 30);
          if (!name || ingredients.length === 0)
            return {
              error:
                'Hace falta un nombre y al menos un ingrediente con gramos.',
            };
          const { food, nutrition } = await this.createRecipe.execute({
            userId: ctx.userId,
            name,
            servings: numOr(args.servings, 1),
            ingredients,
          });
          return {
            ok: true,
            recipe: {
              foodId: food.id,
              servingId: food.servings[0]?.id,
              name: food.name,
              servingGrams: nutrition.servingGrams,
              perServing: nutrition.perServing,
            },
          };
        },
      },
    ];
  }
}
