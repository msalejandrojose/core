import { useEffect, useState } from 'react';
import { SearchField, SectionHeader } from '../ui/kit';
import { perfApi, type Exercise } from '../performance/perf.api';
import type { DraftCardio, DraftExercise, DraftSet } from './workout-draft';

function NumField({
  label,
  value,
  onChange,
  placeholder,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  decimal?: boolean;
}) {
  return (
    <label className="workout__num">
      <span className="rk-visually-hidden">{label}</span>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
      />
    </label>
  );
}

/** Ejercicios y series de una sesión de fuerza. */
export function StrengthEditor({
  value,
  onChange,
}: {
  value: DraftExercise[];
  onChange: (next: DraftExercise[]) => void;
}) {
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (picking && catalog === null) {
      perfApi.exercises().then(setCatalog).catch(() => setCatalog([]));
    }
  }, [picking, catalog]);

  const patch = (i: number, sets: DraftSet[]) =>
    onChange(value.map((e, j) => (j === i ? { ...e, sets } : e)));
  const q = query.trim().toLowerCase();
  const matches = (catalog ?? []).filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);

  return (
    <section className="rk-section" aria-labelledby="ejercicios">
      <SectionHeader id="ejercicios">Ejercicios y series</SectionHeader>

      {value.map((ex, i) => (
        <div key={`${ex.exerciseId}-${i}`} className="rk-list workout__exercise">
          <div className="rk-row">
            <span className="rk-row__main rk-row__title">{ex.name}</span>
            <button type="button" className="rk-textbtn" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Quitar
            </button>
          </div>
          <div className="workout__sets-head" aria-hidden="true">
            <span />
            <span>{ex.bodyweight ? 'Lastre kg' : 'kg'}</span>
            <span>Reps</span>
            <span>RIR</span>
            <span />
          </div>
          {ex.sets.map((s, k) => {
            const set = (field: keyof DraftSet, v: string) =>
              patch(i, ex.sets.map((x, y) => (y === k ? { ...x, [field]: v } : x)));
            return (
              <div key={k} className="workout__set">
                <span className="workout__set-n">{k + 1}</span>
                <NumField label={`Serie ${k + 1}, peso en kilos`} value={s.weight} onChange={(v) => set('weight', v)} placeholder={ex.bodyweight ? '0' : '—'} decimal />
                <NumField label={`Serie ${k + 1}, repeticiones`} value={s.reps} onChange={(v) => set('reps', v)} placeholder="—" />
                <NumField label={`Serie ${k + 1}, repeticiones en reserva`} value={s.rir} onChange={(v) => set('rir', v)} placeholder="—" />
                <button
                  type="button"
                  className="workout__set-x"
                  aria-label={`Quitar la serie ${k + 1}`}
                  disabled={ex.sets.length === 1}
                  onClick={() => patch(i, ex.sets.filter((_, y) => y !== k))}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="rk-row workout__add"
            onClick={() => patch(i, [...ex.sets, { ...ex.sets[ex.sets.length - 1] }])}
          >
            Añadir serie
          </button>
        </div>
      ))}

      {picking ? (
        <div className="workout__picker">
          <SearchField label="Buscar ejercicio" placeholder="Buscar ejercicio" value={query} onChange={setQuery} autoFocus />
          <div className="rk-list">
            {matches.map((e) => (
              <button
                key={e.id}
                type="button"
                className="rk-row workout__pick"
                onClick={() => {
                  onChange([
                    ...value,
                    { exerciseId: e.id, name: e.name, bodyweight: e.isBodyweight, sets: [{ weight: '', reps: '', rir: '' }] },
                  ]);
                  setPicking(false);
                  setQuery('');
                }}
              >
                {e.name}
              </button>
            ))}
            {catalog !== null && !matches.length ? (
              <div className="rk-row rk-row__sub">No hay ejercicios con ese nombre.</div>
            ) : null}
          </div>
        </div>
      ) : (
        <button type="button" className="rk-tilebtn workout__add-ex" onClick={() => setPicking(true)}>
          Añadir ejercicio
        </button>
      )}
      <p className="rk-note">Opcional. Con las series se calculan tu fuerza, tus marcas y la carga por músculo. RIR = repeticiones que te quedaban.</p>
    </section>
  );
}

/** Datos opcionales de una sesión de cardio. */
export function CardioFields({ value, onChange }: { value: DraftCardio; onChange: (next: DraftCardio) => void }) {
  const row = (label: string, field: keyof DraftCardio, unit: string, decimal = false) => (
    <div className="rk-row workout__row">
      <span className="rk-row__main rk-row__title">{label}</span>
      <NumField label={label} value={value[field]} onChange={(v) => onChange({ ...value, [field]: v })} placeholder="—" decimal={decimal} />
      <span className="workout__unit">{unit}</span>
    </div>
  );
  return (
    <section className="rk-section" aria-labelledby="cardio-datos">
      <SectionHeader id="cardio-datos">Datos de la sesión</SectionHeader>
      <div className="rk-list">
        {row('Distancia', 'distanceKm', 'km', true)}
        {row('FC media', 'avgHr', 'ppm')}
        {row('FC máxima', 'maxHr', 'ppm')}
        {row('Desnivel', 'elevation', 'm')}
      </div>
      <p className="rk-note">Opcional. Con distancia y pulsaciones se calculan tu ritmo, tu eficiencia y tus zonas.</p>
    </section>
  );
}
