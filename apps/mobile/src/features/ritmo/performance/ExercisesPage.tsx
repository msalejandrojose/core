import { useState } from 'react';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { MusclePicker } from '../sheets/MusclePicker';
import { SearchField } from '../ui/kit';
import { MUSCLE_NAME } from './labels';
import { perfApi, type Exercise } from './perf.api';
import { Chip, Empty, PerfPage } from './ui';
import { usePerf } from './usePerf';
import '../sheets/sheets.css';

const LEVEL: Record<number, string> = { 1: 'principal', 0.5: 'secundario', 0.25: 'indirecto' };
const toRecord = (e: Exercise) => Object.fromEntries(e.muscles.map((m) => [m.muscle, m.weight]));
const summary = (e: Exercise) =>
  e.muscles.map((m) => `${MUSCLE_NAME[m.muscle] ?? m.muscle} (${LEVEL[m.weight] ?? m.weight})`).join(', ');

function ExerciseRow({ exercise, onSaved }: { exercise: Exercise; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>(toRecord(exercise));
  const [saving, setSaving] = useState(false);
  const own = exercise.ownerUserId !== null;
  const muscles = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([muscle, weight]) => ({ muscle, weight }));
  const valid = muscles.some((m) => m.weight === 1);

  async function run(action: () => Promise<Exercise>, done: string) {
    setSaving(true);
    try {
      const saved = await action();
      setWeights(toRecord(saved));
      setOpen(false);
      onSaved();
      toast.success(done, 'Tus análisis de músculos ya usan estos pesos.');
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="perf__card">
      <button type="button" className="perf__card-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="rk-row__main">
          <span className="perf__rec-title">{exercise.name}</span>
          <span className="rk-row__sub perf__wrap">{summary(exercise)}</span>
        </span>
        {own ? <Chip tone="tint">Propio</Chip> : exercise.customized ? <Chip tone="warn">Ajustado</Chip> : null}
      </button>
      {open ? (
        <div className="perf__card-body">
          <MusclePicker value={weights} onChange={setWeights} />
          <div className="workout__newex-actions">
            {exercise.customized ? (
              <button
                type="button"
                className="rk-btn rk-btn--soft rk-btn--small"
                disabled={saving}
                onClick={() => void run(() => perfApi.resetExerciseMuscles(exercise.id), 'Pesos del catálogo restaurados')}
              >
                Volver al catálogo
              </button>
            ) : (
              <button type="button" className="rk-btn rk-btn--soft rk-btn--small" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            )}
            <button
              type="button"
              className="rk-btn rk-btn--small"
              disabled={!valid || saving}
              onClick={() => void run(() => perfApi.setExerciseMuscles(exercise.id, muscles), 'Pesos guardados')}
            >
              Guardar
            </button>
          </div>
          {!valid ? <span className="rk-row__sub perf__wrap">Hace falta al menos un músculo principal.</span> : null}
        </div>
      ) : null}
    </article>
  );
}

/** Ajustar cuánto trabaja cada ejercicio cada músculo. */
export default function ExercisesPage() {
  const { data, error, reload } = usePerf(() => perfApi.exercises());
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <PerfPage
      title="Ejercicios"
      sub="Qué músculos trabaja cada uno"
      back={{ label: 'Músculos', to: '/tabs/progress/rendimiento/musculos' }}
      data={data}
      error={error}
      onRetry={reload}
      header={<SearchField label="Buscar ejercicio" placeholder="Buscar ejercicio" value={query} onChange={setQuery} />}
    >
      {(list) => {
        const shown = list.filter((e) => e.name.toLowerCase().includes(q));
        return (
          <>
            {shown.length ? (
              <div className="perf__recs">
                {shown.map((e) => (
                  <ExerciseRow key={`${e.id}-${e.customized}-${e.muscles.length}`} exercise={e} onSaved={reload} />
                ))}
              </div>
            ) : (
              <Empty>No hay ejercicios con ese nombre.</Empty>
            )}
            <p className="rk-note">
              Toca un ejercicio y marca cada músculo como principal (cuenta 1 serie), secundario (0,5) o indirecto (0,25). En los del catálogo el cambio es solo para ti y se aplica también a tus entrenos anteriores.
            </p>
          </>
        );
      }}
    </PerfPage>
  );
}
