import type { StrengthSet } from '../entities/performance.entity';

/** Un ejercicio de una plantilla: cuántas series y con qué referencia. */
export interface TemplateExercise {
  exerciseId: string;
  /** Series de trabajo previstas. */
  sets: number;
  /** Repeticiones y carga de referencia (de la última vez), si las hay. */
  reps: number | null;
  weightKg: number | null;
}

export const MAX_TEMPLATE_EXERCISES = 30;
export const MAX_TEMPLATE_SETS = 20;

/**
 * Ejercicios de una plantilla a partir de las series de un entreno, en el
 * orden en que se hicieron. Cuenta solo las series de trabajo y toma como
 * referencia la más pesada (con sus repeticiones). Si un ejercicio sale dos
 * veces en el entreno, se queda la primera.
 */
export function templateExercisesFrom(sets: StrengthSet[]): TemplateExercise[] {
  const blocks = new Map<number, StrengthSet[]>();
  for (const s of [...sets].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder || a.setOrder - b.setOrder,
  )) {
    blocks.set(s.exerciseOrder, [...(blocks.get(s.exerciseOrder) ?? []), s]);
  }
  const out: TemplateExercise[] = [];
  for (const block of blocks.values()) {
    if (out.some((e) => e.exerciseId === block[0].exerciseId)) continue;
    const working = block.filter((s) => !s.isWarmup);
    const ref = (working.length ? working : block).reduce((best, s) =>
      s.weightKg > best.weightKg ||
      (s.weightKg === best.weightKg && s.reps > best.reps)
        ? s
        : best,
    );
    out.push({
      exerciseId: block[0].exerciseId,
      sets: Math.min(MAX_TEMPLATE_SETS, Math.max(1, working.length)),
      reps: ref.reps > 0 ? ref.reps : null,
      weightKg: ref.weightKg > 0 ? ref.weightKg : null,
    });
    if (out.length === MAX_TEMPLATE_EXERCISES) break;
  }
  return out;
}
