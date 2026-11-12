import { useEffect, useState } from 'react';
import { SearchField, SectionHeader } from '../ui/kit';
import { perfApi, type Exercise } from '../performance/perf.api';
import { NewExerciseForm } from './NewExerciseForm';
import { EMPTY_SET, type DraftCardio, type DraftExercise, type DraftSet } from './workout-draft';

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
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (picking && catalog === null) {
      perfApi.exercises().then(setCatalog).catch(() => setCatalog([]));
    }
  }, [picking, catalog]);

  const patch = (i: number, changes: Partial<DraftExercise>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...changes } : e)));
  const add = (e: Exercise) => {
    onChange([...value, { exerciseId: e.id, name: e.name, bodyweight: e.isBodyweight, rest: '', sets: [{ ...EMPTY_SET }] }]);
    setPicking(false);
    setCreating(false);
    setQuery('');
  };
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
            const set = (changes: Partial<DraftSet>) =>
              patch(i, { sets: ex.sets.map((x, y) => (y === k ? { ...x, ...changes } : x)) });
            // Las de calentamiento no llevan número: la numeración es de las series de trabajo.
            const n = ex.sets.slice(0, k + 1).filter((x) => !x.warmup).length;
            return (
              <div key={k} className="workout__set">
                <button
                  type="button"
                  className={`workout__set-n${s.warmup ? ' is-warmup' : ''}`}
                  aria-pressed={s.warmup}
                  aria-label={s.warmup ? 'Serie de calentamiento. Toca para contarla como serie de trabajo.' : `Serie ${n}. Toca para marcarla como calentamiento.`}
                  onClick={() => set({ warmup: !s.warmup })}
                >
                  {s.warmup ? 'C' : n}
                </button>
                <NumField label={`Serie ${k + 1}, peso en kilos`} value={s.weight} onChange={(v) => set({ weight: v })} placeholder={ex.bodyweight ? '0' : '—'} decimal />
                <NumField label={`Serie ${k + 1}, repeticiones`} value={s.reps} onChange={(v) => set({ reps: v })} placeholder="—" />
                <NumField label={`Serie ${k + 1}, repeticiones en reserva`} value={s.rir} onChange={(v) => set({ rir: v })} placeholder="—" />
                <button
                  type="button"
                  className="workout__set-x"
                  aria-label={`Quitar la serie ${k + 1}`}
                  disabled={ex.sets.length === 1}
                  onClick={() => patch(i, { sets: ex.sets.filter((_, y) => y !== k) })}
                >
                  ×
                </button>
              </div>
            );
          })}
          <div className="rk-row workout__row workout__rest">
            <span className="rk-row__main rk-row__title">Descanso entre series</span>
            <NumField label="Descanso entre series, en segundos" value={ex.rest} onChange={(v) => patch(i, { rest: v })} placeholder="—" />
            <span className="workout__unit">s</span>
          </div>
          <button
            type="button"
            className="rk-row workout__add"
            onClick={() => patch(i, { sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1], warmup: false }] })}
          >
            Añadir serie
          </button>
        </div>
      ))}

      {creating ? (
        <NewExerciseForm
          initialName={query.trim()}
          onCancel={() => setCreating(false)}
          onCreated={(e) => {
            setCatalog((c) => (c ? [...c, e] : c));
            add(e);
          }}
        />
      ) : picking ? (
        <div className="workout__picker">
          <SearchField label="Buscar ejercicio" placeholder="Buscar ejercicio" value={query} onChange={setQuery} autoFocus />
          <div className="rk-list">
            {matches.map((e) => (
              <button key={e.id} type="button" className="rk-row workout__pick" onClick={() => add(e)}>
                {e.name}
              </button>
            ))}
            <button type="button" className="rk-row workout__pick workout__pick--new" onClick={() => setCreating(true)}>
              {q ? `Crear «${query.trim()}»` : 'Crear un ejercicio propio'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="rk-tilebtn workout__add-ex" onClick={() => setPicking(true)}>
          Añadir ejercicio
        </button>
      )}
      <p className="rk-note">
        Opcional. RIR = repeticiones que te quedaban. Toca el número de una serie para marcarla como calentamiento (C): no cuenta para marcas ni volumen.
      </p>
    </section>
  );
}

/** Datos opcionales de una sesión de cardio. */
export function CardioFields({ value, onChange }: { value: DraftCardio; onChange: (next: DraftCardio) => void }) {
  const [zonesOpen, setZonesOpen] = useState(value.zones.some((z) => z !== ''));
  const row = (label: string, field: Exclude<keyof DraftCardio, 'zones'>, unit: string, decimal = false) => (
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
        {row('Cadencia', 'cadence', '/min')}
        <button type="button" className="rk-row workout__add workout__zones-toggle" aria-expanded={zonesOpen} onClick={() => setZonesOpen((v) => !v)}>
          {zonesOpen ? 'Ocultar tiempo por zona' : 'Añadir tiempo por zona'}
        </button>
        {zonesOpen ? (
          <div className="workout__zones">
            {value.zones.map((z, i) => (
              <label key={i} className="workout__zone">
                <span>Z{i + 1}</span>
                <NumField
                  label={`Minutos en zona ${i + 1}`}
                  value={z}
                  onChange={(v) => onChange({ ...value, zones: value.zones.map((x, j) => (j === i ? v : x)) })}
                  placeholder="min"
                  decimal
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <p className="rk-note">Opcional. Cadencia en pasos o pedaladas por minuto. El tiempo por zona, en minutos, si tu reloj te lo da.</p>
    </section>
  );
}
