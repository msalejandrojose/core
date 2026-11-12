import { useState } from 'react';
import { isApiError } from '../api';
import { toast } from '@/lib/toast';
import { MUSCLE_NAME } from '../performance/labels';
import { perfApi, type Exercise } from '../performance/perf.api';

/** Peso de un músculo: sin trabajar → principal → secundario → indirecto. */
const CYCLE = [0, 1, 0.5, 0.25];
const LEVEL: Record<number, string> = { 1: 'Principal', 0.5: 'Secundario', 0.25: 'Indirecto' };

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
      <div className="workout__muscles" role="group" aria-label="Músculos que trabaja">
        {Object.keys(MUSCLE_NAME).map((m) => {
          const w = weights[m] ?? 0;
          return (
            <button
              key={m}
              type="button"
              className={`workout__muscle${w ? ` is-${w === 1 ? 'main' : w === 0.5 ? 'sec' : 'ind'}` : ''}`}
              aria-label={`${MUSCLE_NAME[m]}: ${w ? LEVEL[w] : 'no lo trabaja'}. Toca para cambiar.`}
              onClick={() => setWeights((s) => ({ ...s, [m]: CYCLE[(CYCLE.indexOf(w) + 1) % CYCLE.length] }))}
            >
              {MUSCLE_NAME[m]}
              {w ? <em>{LEVEL[w]}</em> : null}
            </button>
          );
        })}
      </div>
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
