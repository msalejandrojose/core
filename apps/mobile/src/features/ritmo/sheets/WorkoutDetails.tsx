import { useEffect, useRef, useState } from 'react';
import { Icon, SearchField, SectionHeader } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { perfApi, type Exercise } from '../performance/perf.api';
import { NewExerciseForm } from './NewExerciseForm';
import { usePreviousSets } from './usePreviousSets';
import {
  EMPTY_SET,
  bestSetLabel,
  clock,
  exerciseVolume,
  isExerciseDone,
  previousAsDraft,
  setLabel,
  type DraftCardio,
  type DraftExercise,
  type DraftSet,
} from './workout-draft';

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

/** Campo numérico de una serie: grande, tabular y con la referencia de la última vez de placeholder. */
function SetInput({
  label,
  value,
  onChange,
  placeholder,
  decimal,
  done,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  decimal?: boolean;
  done?: boolean;
}) {
  return (
    <label className={`lift__in${done ? ' is-done' : ''}`}>
      <span className="rk-visually-hidden">{label}</span>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        enterKeyHint="next"
        value={value}
        placeholder={placeholder}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
      />
    </label>
  );
}

const kg = (n: number) => `${Math.round(n).toLocaleString('es-ES')} kg`;
const REST_STEP = 15;
const REST_DEFAULT = 90;
const REST_MAX = 600;

export interface StrengthEditorProps {
  value: DraftExercise[];
  onChange: (next: DraftExercise[]) => void;
  /**
   * Modo en vivo: cada serie lleva su ✓ en vez de la ×, y al marcarla se avisa
   * con el descanso del ejercicio (en segundos, o null si no lo tiene).
   */
  live?: { onSetDone: (exercise: DraftExercise, restSec: number | null) => void };
  /** Solo compara con entrenos anteriores a esta fecha (al editar uno guardado). */
  previousBefore?: string | null;
}

/**
 * Ejercicios y series de una sesión de fuerza. Cada ejercicio es una tarjeta
 * con su resumen (series y volumen), una tabla Serie · Anterior · kg · Reps ·
 * RIR y, al pie, añadir serie y el descanso. Lo que hiciste la última vez sale
 * como referencia y se copia a la serie con un toque.
 */
export function StrengthEditor({ value, onChange, live, previousBefore = null }: StrengthEditorProps) {
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const previous = usePreviousSets(
    value.map((e) => e.exerciseId),
    previousBefore,
  );
  /** En vivo: ejercicios hechos que se han vuelto a desplegar (por `exerciseId-índice`). */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const cards = useRef(new Map<number, HTMLElement>());
  const cardKey = (ex: DraftExercise, i: number) => `${ex.exerciseId}-${i}`;
  const toggle = (k: string, open: boolean) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (open) next.add(k);
      else next.delete(k);
      return next;
    });

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

  const card = (ex: DraftExercise, i: number) => {
    const prev = previous[ex.exerciseId];
    const working = ex.sets.filter((s) => !s.warmup).length;
    const doneCount = ex.sets.filter((s) => s.done && !s.warmup).length;
    const volume = exerciseVolume(live ? { ...ex, sets: ex.sets.filter((s) => s.done) } : ex);
    const restSec = ex.rest === '' ? null : Number(ex.rest);
    const setRest = (sec: number | null) => patch(i, { rest: sec === null ? '' : String(sec) });
    const meta = [
      live ? `${doneCount} de ${working} ${working === 1 ? 'serie' : 'series'}` : `${working} ${working === 1 ? 'serie' : 'series'}`,
      volume > 0 ? kg(volume) : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <article
        key={cardKey(ex, i)}
        ref={(el) => {
          if (el) cards.current.set(i, el);
          else cards.current.delete(i);
        }}
        className="lift"
        aria-labelledby={`lift-${i}`}
      >
        <header className="lift__head">
          <span className="lift__icon" aria-hidden="true">
            <Icon d={PATHS.strength} size={20} />
          </span>
          <span className="lift__title">
            <h3 id={`lift-${i}`}>{ex.name}</h3>
            <span className="lift__meta">{meta}</span>
          </span>
          {live && isExerciseDone(ex) ? (
            <button
              type="button"
              className="rk-iconbtn lift__fold"
              aria-label={`Plegar ${ex.name}`}
              aria-expanded="true"
              onClick={() => toggle(cardKey(ex, i), false)}
            >
              <Icon d={PATHS.forward} size={16} stroke={2.6} />
            </button>
          ) : null}
          <button
            type="button"
            className="rk-iconbtn lift__remove"
            aria-label={`Quitar ${ex.name}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <Icon d={PATHS.trash} size={19} />
          </button>
        </header>

        <div className="lift__grid lift__grid--head" aria-hidden="true">
          <span>Serie</span>
          <span className="lift__prevcol">Anterior</span>
          <span>{ex.bodyweight ? '+kg' : 'kg'}</span>
          <span>Reps</span>
          <span>RIR</span>
          <span>{live ? <Icon d={PATHS.check} size={16} stroke={2.6} /> : null}</span>
        </div>

        {ex.sets.map((s, k) => {
          const set = (changes: Partial<DraftSet>) =>
            patch(i, { sets: ex.sets.map((x, y) => (y === k ? { ...x, ...changes } : x)) });
          // Las de calentamiento no llevan número: la numeración es de las series de trabajo.
          const n = ex.sets.slice(0, k + 1).filter((x) => !x.warmup).length;
          // Se empareja calentamiento con calentamiento y trabajo con trabajo.
          const nth = ex.sets.slice(0, k).filter((x) => x.warmup === s.warmup).length;
          const p = prev?.filter((x) => x.isWarmup === s.warmup)[nth] ?? null;
          const ref = p ? previousAsDraft(p) : null;
          // La referencia como placeholder solo en vivo, donde el ✓ la rellena;
          // al registrar parecería un dato apuntado y no se guardaría.
          const hint = live ? ref : null;
          const canDone = (s.reps || ref?.reps || '') !== '';
          const name = s.warmup ? 'Calentamiento' : `Serie ${n}`;
          return (
            <div key={k} className={`lift__grid lift__set${s.done ? ' is-done' : ''}${s.warmup ? ' is-warmup' : ''}`}>
              <button
                type="button"
                className="lift__n"
                aria-pressed={s.warmup}
                aria-label={s.warmup ? 'Serie de calentamiento. Toca para contarla como serie de trabajo.' : `Serie ${n}. Toca para marcarla como calentamiento.`}
                onClick={() => set({ warmup: !s.warmup })}
              >
                {s.warmup ? 'C' : n}
              </button>
              {p && ref ? (
                <button
                  type="button"
                  className="lift__prev lift__prevcol"
                  aria-label={`Anterior: ${setLabel(p, ex.bodyweight)}. Toca para copiarla en ${name.toLowerCase()}.`}
                  onClick={() => set(ref)}
                >
                  {setLabel(p, ex.bodyweight)}
                </button>
              ) : (
                <span className="lift__prev lift__prevcol is-empty" aria-hidden="true">
                  {prev === undefined ? '' : '—'}
                </span>
              )}
              <SetInput label={`${name}, peso en kilos`} value={s.weight} onChange={(v) => set({ weight: v })} placeholder={hint?.weight ?? (ex.bodyweight ? '0' : '—')} decimal done={s.done} />
              <SetInput label={`${name}, repeticiones`} value={s.reps} onChange={(v) => set({ reps: v })} placeholder={hint?.reps ?? '—'} done={s.done} />
              <SetInput label={`${name}, repeticiones en reserva`} value={s.rir} onChange={(v) => set({ rir: v })} placeholder={hint?.rir || '—'} done={s.done} />
              {live ? (
                <button
                  type="button"
                  className="lift__check"
                  aria-pressed={!!s.done}
                  aria-label={s.done ? `${name} hecha. Toca para desmarcarla.` : `Marcar ${name.toLowerCase()} como hecha`}
                  disabled={!s.done && !canDone}
                  onClick={() => {
                    if (s.done) return set({ done: false });
                    // Lo que no se tecleó se toma de la última vez, como en el placeholder.
                    const filled = {
                      weight: s.weight || ref?.weight || '',
                      reps: s.reps || ref?.reps || '',
                      rir: s.rir || ref?.rir || '',
                    };
                    const next = { ...ex, sets: ex.sets.map((x, y) => (y === k ? { ...x, ...filled, done: true } : x)) };
                    patch(i, { sets: next.sets });
                    live.onSetDone(next, restSec);
                    if (isExerciseDone(next)) {
                      // Hecho: se pliega arriba y la pantalla va al siguiente pendiente.
                      toggle(cardKey(ex, i), false);
                      const pending = value.map((_, j) => j).filter((j) => j !== i && !isExerciseDone(value[j]));
                      const target = pending.find((j) => j > i) ?? pending[0];
                      if (target !== undefined) {
                        window.setTimeout(() => cards.current.get(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                      }
                    }
                  }}
                >
                  <Icon d={PATHS.check} size={18} stroke={2.6} />
                </button>
              ) : (
                <button
                  type="button"
                  className="lift__x"
                  aria-label={`Quitar ${name.toLowerCase()}`}
                  disabled={ex.sets.length === 1}
                  onClick={() => patch(i, { sets: ex.sets.filter((_, y) => y !== k) })}
                >
                  <Icon d={PATHS.plus} size={16} stroke={2.2} className="lift__x-icon" />
                </button>
              )}
            </div>
          );
        })}

        <footer className="lift__foot">
          <button
            type="button"
            className="lift__add"
            onClick={() => {
              const last = ex.sets[ex.sets.length - 1];
              patch(i, { sets: [...ex.sets, { ...last, warmup: false, done: false }] });
            }}
          >
            <Icon d={PATHS.plus} size={16} stroke={2.4} />
            Añadir serie
          </button>
          {live && ex.sets.length > 1 && !ex.sets[ex.sets.length - 1].done ? (
            <button
              type="button"
              className="lift__undo"
              aria-label="Quitar la última serie"
              onClick={() => patch(i, { sets: ex.sets.slice(0, -1) })}
            >
              −
            </button>
          ) : null}
          <div className="lift__rest" role="group" aria-label="Descanso entre series">
            <Icon d={PATHS.timer} size={16} />
            <button
              type="button"
              aria-label="Quince segundos menos de descanso"
              disabled={restSec === null}
              onClick={() => setRest(restSec !== null && restSec > REST_STEP ? restSec - REST_STEP : null)}
            >
              −
            </button>
            <span aria-live="polite">{restSec === null ? 'Descanso' : clock(restSec)}</span>
            <button
              type="button"
              aria-label="Quince segundos más de descanso"
              onClick={() => setRest(restSec === null ? REST_DEFAULT : Math.min(REST_MAX, restSec + REST_STEP))}
            >
              +
            </button>
          </div>
        </footer>
      </article>
    );
  };

  /** Fila plegada de un ejercicio hecho: nombre, resumen y su mejor serie. */
  const folded = (ex: DraftExercise, i: number) => {
    const working = ex.sets.filter((s) => !s.warmup).length;
    const volume = exerciseVolume(ex);
    const best = bestSetLabel(ex);
    const meta = [`${working} ${working === 1 ? 'serie' : 'series'}`, volume > 0 ? kg(volume) : null, best ? `mejor ${best}` : null]
      .filter(Boolean)
      .join(' · ');
    return (
      <button
        key={cardKey(ex, i)}
        type="button"
        className="lift-folded"
        aria-expanded="false"
        aria-label={`${ex.name}, hecho: ${meta}. Toca para desplegarlo.`}
        onClick={() => toggle(cardKey(ex, i), true)}
      >
        <span className="lift-folded__check" aria-hidden="true">
          <Icon d={PATHS.check} size={18} stroke={2.8} />
        </span>
        <span className="lift-folded__text">
          <span className="lift-folded__name">{ex.name}</span>
          <span className="lift-folded__meta">{meta}</span>
        </span>
        <Icon d={PATHS.forward} size={14} stroke={2.6} className="lift-folded__chev" />
      </button>
    );
  };

  // En vivo, lo hecho sube arriba (plegado salvo que se despliegue) y lo
  // pendiente queda debajo. Solo cambia cómo se ve: el orden guardado es el real.
  const indices = value.map((_, i) => i);
  const doneIdx = live ? indices.filter((i) => isExerciseDone(value[i])) : [];
  const todoIdx = live ? indices.filter((i) => !isExerciseDone(value[i])) : indices;

  return (
    <section className="rk-section" aria-labelledby="ejercicios">
      {doneIdx.length > 0 ? (
        <>
          <SectionHeader
            id="hechos"
            action={<span className="lift-group__count">{doneIdx.length} de {value.length}</span>}
          >
            Hechos
          </SectionHeader>
          <div className="lift-group" role="group" aria-labelledby="hechos">
            {doneIdx.map((i) => (expanded.has(cardKey(value[i], i)) ? card(value[i], i) : folded(value[i], i)))}
          </div>
        </>
      ) : null}

      <SectionHeader id="ejercicios">{doneIdx.length > 0 ? 'Por hacer' : 'Ejercicios y series'}</SectionHeader>
      {todoIdx.map((i) => card(value[i], i))}
      {live && doneIdx.length > 0 && todoIdx.length === 0 ? (
        <p className="lift-allset">Todo hecho. Añade otro ejercicio o pulsa Terminar.</p>
      ) : null}

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
          <Icon d={PATHS.plus} size={18} stroke={2.4} />
          Añadir ejercicio
        </button>
      )}
      <p className="rk-note">
        {live
          ? 'Marca cada serie con ✓ al acabarla: arranca el descanso. Si dejas un campo vacío, se usa lo de la última vez. Al terminar un ejercicio se pliega arriba, en Hechos. Toca el número de una serie para marcarla como calentamiento (C).'
          : 'Opcional. RIR = repeticiones que te quedaban. Toca «Anterior» para copiar lo de la última vez, y el número de una serie para marcarla como calentamiento (C): no cuenta para marcas ni volumen.'}
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
