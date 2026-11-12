import { useState } from 'react';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { perfApi, type Exercise } from '../performance/perf.api';
import { MusclePicker } from './MusclePicker';

/**
 * Crear un ejercicio propio: nombre y cuánto trabaja cada músculo. Cada toque
 * en un músculo pasa al siguiente nivel.
 */
export function NewExerciseForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [bodyweight, setBodyweight] = useState(false);
  const [saving, setSaving] = useState(false);

  const muscles = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([muscle, weight]) => ({ muscle, weight }));
  const valid = name.trim().length >= 2 && muscles.some((m) => m.weight === 1);

  async function save() {
    setSaving(true);
    try {
      const created = await perfApi.createExercise({
        name: name.trim(),
        isBodyweight: bodyweight,
        isCompound: muscles.length > 1,
        muscles,
      });
      onCreated(created);
    } catch (e) {
      toast.error('No se pudo crear el ejercicio', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="workout__newex">
      <label className="rk-search">
        <span className="rk-visually-hidden">Nombre del ejercicio</span>
        <input type="text" value={name} placeholder="Nombre del ejercicio" maxLength={120} onChange={(e) => setName(e.target.value)} />
      </label>
      <MusclePicker value={weights} onChange={setWeights} />
      <button type="button" aria-pressed={bodyweight} className="workout__chip" onClick={() => setBodyweight((v) => !v)}>
        Con peso corporal (dominadas, fondos…)
      </button>
      <p className="rk-note">Toca un músculo para marcarlo como principal; otra vez, secundario; otra, indirecto. Hace falta al menos uno principal.</p>
      <div className="workout__newex-actions">
        <button type="button" className="rk-btn rk-btn--soft rk-btn--small" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="rk-btn rk-btn--small" disabled={!valid || saving} onClick={() => void save()}>
          Crear ejercicio
        </button>
      </div>
    </div>
  );
}
