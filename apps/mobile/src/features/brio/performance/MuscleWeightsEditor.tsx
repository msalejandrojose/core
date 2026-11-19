import { useState } from 'react';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { MusclePicker } from '../sheets/MusclePicker';
import { perfApi, type Exercise } from './perf.api';
import '../sheets/sheets.css';

const toRecord = (e: Exercise) => Object.fromEntries(e.muscles.map((m) => [m.muscle, m.weight]));

/** Ajustar cuánto trabaja un ejercicio cada músculo (solo para ti en los del catálogo). */
export function MuscleWeightsEditor({ exercise, onSaved }: { exercise: Exercise; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>(toRecord(exercise));
  const [saving, setSaving] = useState(false);
  const muscles = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([muscle, weight]) => ({ muscle, weight }));
  const valid = muscles.some((m) => m.weight === 1);

  async function run(action: () => Promise<Exercise>, done: string) {
    setSaving(true);
    try {
      const saved = await action();
      setWeights(toRecord(saved));
      setEditing(false);
      onSaved();
      toast.success(done, 'Tus análisis de músculos ya usan estos pesos.');
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" className="rk-btn rk-btn--soft rk-btn--small" onClick={() => setEditing(true)}>
        Ajustar músculos
      </button>
    );
  }
  return (
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
          <button
            type="button"
            className="rk-btn rk-btn--soft rk-btn--small"
            onClick={() => {
              setEditing(false);
              setWeights(toRecord(exercise));
            }}
          >
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
      <p className="rk-note">
        Principal cuenta 1 serie, secundario 0,5 e indirecto 0,25. En los del catálogo el cambio es solo para ti y se
        aplica también a tus entrenos anteriores.
      </p>
    </div>
  );
}
