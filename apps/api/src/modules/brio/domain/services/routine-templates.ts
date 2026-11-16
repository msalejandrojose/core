import type { RoutineInput } from './routine';

/**
 * Plantillas de rutina listas para usar: preparación HYROX y sesiones
 * híbridas (fuerza + motor). Los pesos son los de la categoría Open masculina
 * de HYROX; al crear la rutina se pueden cambiar.
 */

export interface TemplateItem {
  /** Código del ejercicio del catálogo. */
  code: string;
  sets: number;
  reps?: number;
  distanceM?: number;
  durationSec?: number;
  calories?: number;
  weightKg?: number;
  restSec?: number;
  /** Superserie (mismo número = se alternan). */
  group?: number;
}

export interface RoutineTemplate {
  code: string;
  name: string;
  description: string;
  plannedDurationMin: number;
  notes: string;
  items: TemplateItem[];
}

const run = (m: number, group?: number): TemplateItem => ({
  code: 'running',
  sets: 1,
  distanceM: m,
  group,
});

export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  {
    code: 'hyrox-sim',
    name: 'HYROX · simulación completa',
    description:
      '8 × (1 km de carrera + estación), del tirón y en el orden de la competición.',
    plannedDurationMin: 90,
    notes:
      'Sin descanso entre carrera y estación. Pesos de la categoría Open masculina: ajústalos a la tuya.',
    items: [
      run(1000, 1),
      { code: 'ski_erg', sets: 1, distanceM: 1000, group: 1 },
      run(1000, 1),
      { code: 'sled_push', sets: 1, distanceM: 50, weightKg: 152, group: 1 },
      run(1000, 1),
      { code: 'sled_pull', sets: 1, distanceM: 50, weightKg: 103, group: 1 },
      run(1000, 1),
      { code: 'burpee_broad_jump', sets: 1, distanceM: 80, group: 1 },
      run(1000, 1),
      { code: 'rowing_machine', sets: 1, distanceM: 1000, group: 1 },
      run(1000, 1),
      { code: 'farmers_walk', sets: 1, distanceM: 200, weightKg: 24, group: 1 },
      run(1000, 1),
      {
        code: 'sandbag_lunges',
        sets: 1,
        distanceM: 100,
        weightKg: 20,
        group: 1,
      },
      run(1000, 1),
      { code: 'wall_ball', sets: 1, reps: 100, weightKg: 6, group: 1 },
    ],
  },
  {
    code: 'hyrox-compromised',
    name: 'HYROX · carrera comprometida',
    description:
      'Correr con las piernas cargadas: carrera + wall balls y carrera + trineo.',
    plannedDurationMin: 55,
    notes: 'Descansa al acabar cada vuelta, no entre la carrera y la estación.',
    items: [
      { code: 'running', sets: 4, distanceM: 1000, group: 1 },
      {
        code: 'wall_ball',
        sets: 4,
        reps: 25,
        weightKg: 6,
        restSec: 90,
        group: 1,
      },
      { code: 'running', sets: 3, distanceM: 500, group: 2 },
      {
        code: 'sled_push',
        sets: 3,
        distanceM: 25,
        weightKg: 102,
        restSec: 90,
        group: 2,
      },
    ],
  },
  {
    code: 'hyrox-stations',
    name: 'HYROX · estaciones',
    description:
      'Fuerza específica de las estaciones: trineos, zancadas, granjero, wall balls y burpees.',
    plannedDurationMin: 60,
    notes:
      'Técnica y ritmo de competición; el trineo un poco más pesado que en carrera.',
    items: [
      {
        code: 'sled_push',
        sets: 4,
        distanceM: 25,
        weightKg: 152,
        restSec: 120,
      },
      {
        code: 'sled_pull',
        sets: 4,
        distanceM: 25,
        weightKg: 103,
        restSec: 120,
      },
      {
        code: 'sandbag_lunges',
        sets: 3,
        distanceM: 50,
        weightKg: 20,
        restSec: 90,
      },
      {
        code: 'farmers_walk',
        sets: 3,
        distanceM: 100,
        weightKg: 24,
        restSec: 90,
      },
      {
        code: 'wall_ball',
        sets: 3,
        reps: 20,
        weightKg: 6,
        restSec: 60,
        group: 1,
      },
      {
        code: 'burpee_broad_jump',
        sets: 3,
        distanceM: 20,
        restSec: 90,
        group: 1,
      },
    ],
  },
  {
    code: 'hybrid-strength-intervals',
    name: 'Híbrido · fuerza + intervalos',
    description: 'Básicos pesados y luego intervalos de remo y assault bike.',
    plannedDurationMin: 70,
    notes: 'Fuerza primero, con descansos largos; los intervalos, a tope.',
    items: [
      { code: 'back_squat', sets: 4, reps: 6, restSec: 150 },
      { code: 'bench_press', sets: 4, reps: 6, restSec: 150 },
      { code: 'barbell_row', sets: 3, reps: 8, restSec: 90 },
      { code: 'rowing_machine', sets: 4, distanceM: 500, group: 1 },
      { code: 'assault_bike', sets: 4, calories: 15, restSec: 60, group: 1 },
    ],
  },
  {
    code: 'hybrid-full-body',
    name: 'Híbrido · cuerpo entero + motor',
    description: 'Peso muerto, empuje y tirón, y para acabar SkiErg y plancha.',
    plannedDurationMin: 60,
    notes: 'Buen día para combinar con un rodaje suave al día siguiente.',
    items: [
      { code: 'deadlift', sets: 3, reps: 5, restSec: 150 },
      {
        code: 'dumbbell_shoulder_press',
        sets: 3,
        reps: 10,
        restSec: 90,
        group: 1,
      },
      { code: 'pull_up', sets: 3, reps: 8, restSec: 90, group: 1 },
      { code: 'ski_erg', sets: 4, distanceM: 250, restSec: 60 },
      { code: 'plank', sets: 3, durationSec: 60, restSec: 45 },
    ],
  },
];

export const templateByCode = (code: string) =>
  ROUTINE_TEMPLATES.find((t) => t.code === code) ?? null;

/** Rutina a partir de la plantilla; null si falta algún ejercicio del catálogo. */
export function routineFromTemplate(
  t: RoutineTemplate,
  idOf: (code: string) => string | undefined,
): RoutineInput | null {
  const exercises = t.items.map((i) => {
    const exerciseId = idOf(i.code);
    return exerciseId
      ? {
          exerciseId,
          sets: i.sets,
          reps: i.reps ?? 1,
          weightKg: i.weightKg ?? null,
          restSec: i.restSec ?? null,
          supersetGroup: i.group ?? null,
          distanceM: i.distanceM ?? null,
          durationSec: i.durationSec ?? null,
          calories: i.calories ?? null,
        }
      : null;
  });
  if (exercises.some((e) => e === null)) return null;
  return {
    name: t.name,
    kind: 'STRENGTH',
    notes: t.notes,
    plannedDurationMin: t.plannedDurationMin,
    exercises: exercises as NonNullable<(typeof exercises)[number]>[],
  };
}
