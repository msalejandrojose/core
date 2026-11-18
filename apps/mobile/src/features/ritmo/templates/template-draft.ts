import type { DraftExercise } from '../sheets/workout-draft';
import type { SaveTemplateBody, WorkoutTemplate } from '../templates.api';

const decimal = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Ejercicios de un entreno nuevo a partir de una plantilla, con la carga y las reps de referencia ya puestas. */
export function draftFromTemplate(t: WorkoutTemplate): DraftExercise[] {
  return t.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    bodyweight: e.isBodyweight,
    rest: '',
    sets: Array.from({ length: Math.max(1, e.sets) }, () => ({
      weight: e.weightKg !== null ? decimal(e.weightKg) : '',
      reps: e.reps !== null ? String(e.reps) : '',
      rir: '',
      warmup: false,
    })),
  }));
}

/**
 * Plantilla a partir de lo que hay apuntado en el entreno: series de trabajo
 * de cada ejercicio y, como referencia, la serie más pesada. Un ejercicio que
 * aparece dos veces cuenta una.
 */
export function templateBodyFromDraft(name: string, drafts: DraftExercise[]): SaveTemplateBody {
  const seen = new Set<string>();
  const exercises: SaveTemplateBody['exercises'] = [];
  for (const d of drafts) {
    if (seen.has(d.exerciseId)) continue;
    seen.add(d.exerciseId);
    const working = d.sets.filter((s) => !s.warmup);
    const filled = working
      .map((s) => ({ weight: num(s.weight) ?? 0, reps: num(s.reps) }))
      .filter((s) => s.reps !== null && s.reps >= 1);
    const ref = filled.reduce<{ weight: number; reps: number | null } | null>(
      (best, s) => (!best || s.weight > best.weight || (s.weight === best.weight && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best),
      null,
    );
    exercises.push({
      exerciseId: d.exerciseId,
      sets: Math.min(20, Math.max(1, working.length)),
      ...(ref?.reps ? { reps: Math.min(200, Math.round(ref.reps)) } : {}),
      ...(ref && ref.weight > 0 ? { weightKg: Math.min(1000, Math.round(ref.weight * 100) / 100) } : {}),
    });
  }
  return { name: name.trim(), exercises: exercises.slice(0, 30) };
}

/** "4 × 10 · 66 kg" */
export function templateExerciseLine(e: WorkoutTemplate['exercises'][number]): string {
  const sets = `${e.sets} × ${e.reps ?? '—'}`;
  return e.weightKg ? `${sets} · ${decimal(e.weightKg)} kg` : sets;
}
